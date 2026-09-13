import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const token=process.env.PACKAGE_TOKEN;
assert.ok(token?.startsWith('ghp_'));
const repo=process.env.GITHUB_REPOSITORY;
assert.ok(repo.startsWith('fabric-platform-e2e/fabric-consumer-'));
const name='fabric-native-events-'+(repo.includes('private')?'private':'public');
if(process.env.OPERATION==='restore-version') {
 const base='https://api.github.com/orgs/fabric-platform-e2e/packages/npm/'+name;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json'};
 const response=await fetch(base+'/versions',{headers});assert.equal(response.status,200);const versions=await response.json();const version=versions.find(v=>v.name==='1.0.0');assert.ok(version);
 const removed=await fetch(base+'/versions/'+version.id,{method:'DELETE',headers});assert.equal(removed.status,204);
 const restored=await fetch(base+'/versions/'+version.id+'/restore',{method:'POST',headers});assert.equal(restored.status,204);console.log('PACKAGE_VERSION_RESTORED',name,version.id);
} else if(process.env.OPERATION==='maven-snapshot') {
 const dir='.fabric-maven';mkdirSync(dir+'/content',{recursive:true});
 writeFileSync(dir+'/content/probe.txt','Fabric snapshot '+process.env.GITHUB_RUN_ID+'\n');
 writeFileSync(dir+'/settings.xml','<settings><servers><server><id>github</id><username>yeastyiodine0l</username><password>'+token+'</password></server></servers></settings>',{mode:0o600});
 const artifact=name+'-snapshot';
 writeFileSync(dir+'/pom.xml','<project><modelVersion>4.0.0</modelVersion><groupId>dev.actionsfabric</groupId><artifactId>'+artifact+'</artifactId><version>1.0-SNAPSHOT</version><distributionManagement><repository><id>github</id><url>https://maven.pkg.github.com/'+repo+'</url></repository></distributionManagement></project>');
 try {
  assert.equal(spawnSync('jar',['--create','--file',dir+'/probe.jar','-C',dir+'/content','.']).status,0);
  const r=spawnSync('mvn',['-B','-s',dir+'/settings.xml','org.apache.maven.plugins:maven-deploy-plugin:3.1.4:deploy-file','-Dfile='+dir+'/probe.jar','-DpomFile='+dir+'/pom.xml','-DrepositoryId=github','-Durl=https://maven.pkg.github.com/'+repo],{encoding:'utf8'});
  console.log((r.stdout??'').split(token).join('***'));console.log((r.stderr??'').split(token).join('***'));assert.equal(r.status,0,'Snapshot deployment failed');console.log('MAVEN_SNAPSHOT_DEPLOYED',artifact);
 } finally {rmSync(dir,{recursive:true,force:true});}
} else if(process.env.OPERATION.startsWith('container-')) {
 const dir='.fabric-container-build',auth='.fabric-container-auth';mkdirSync(dir,{recursive:true});mkdirSync(auth,{recursive:true});
 const env={...process.env,DOCKER_CONFIG:process.cwd()+'/'+auth};
 const image='ghcr.io/fabric-platform-e2e/'+name+'-container';
 function docker(args,input) {const r=spawnSync('docker',args,{env,input,encoding:'utf8'});if(r.status!==0)console.log((r.stderr??'').split(token).join('***'));assert.equal(r.status,0,'Container operation failed');}
 try {
  docker(['login','ghcr.io','--username','yeastyiodine0l','--password-stdin'],token);
  if(['container-publish','container-overwrite'].includes(process.env.OPERATION)) {
   writeFileSync(dir+'/Dockerfile','FROM scratch\nLABEL org.opencontainers.image.source="https://github.com/'+repo+'"\nCOPY artifact.txt /artifact.txt\n');writeFileSync(dir+'/artifact.txt','Fabric native event fixture '+process.env.GITHUB_RUN_ID+'\n');
   docker(['build','-t',image+':initial',dir]);docker(['push',image+':initial']);
  } else {docker(['pull',image+':initial']);docker(['tag',image+':initial',image+':updated']);docker(['push',image+':updated']);}
  console.log('INDEPENDENT_CONTAINER_OPERATION',process.env.OPERATION,image);
 } finally {rmSync(dir,{recursive:true,force:true});rmSync(auth,{recursive:true,force:true});}
} else if(process.env.OPERATION==='delete') {
 const r=await fetch('https://api.github.com/orgs/fabric-platform-e2e/packages/npm/'+name,{method:'DELETE',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
 assert.ok(r.status===204||r.status===404,'Package cleanup failed '+r.status);console.log('PACKAGE_CLEANED',name);
} else {
 const dir='.package-test';mkdirSync(dir,{recursive:true});
 const version=process.env.OPERATION==='publish'?'1.0.0':'1.0.1';
 writeFileSync(dir+'/package.json',JSON.stringify({name:'@fabric-platform-e2e/'+name,version,description:'Actions Fabric synthetic native event validation',main:'index.js',files:['index.js'],repository:{type:'git',url:'https://github.com/'+repo+'.git'},publishConfig:{registry:'https://npm.pkg.github.com'}}));
 writeFileSync(dir+'/index.js','module.exports = (a,b) => a+b;\n');
 writeFileSync(dir+'/.npmrc','//npm.pkg.github.com/:_authToken='+token+'\n');
 try {
  const args=process.env.OPERATION==='retag'?['dist-tag','add','@fabric-platform-e2e/'+name+'@1.0.0','fabric-stable','--registry=https://npm.pkg.github.com']:['publish','--registry=https://npm.pkg.github.com'];
  const r=spawnSync('npm',args,{cwd:dir,encoding:'utf8'});
  // Keep credentials out of diagnostics, including unexpected client errors.
  console.log((r.stdout??'').split(token).join('***'));console.log((r.stderr??'').split(token).join('***'));
  assert.equal(r.status,0,'Publishing failed');console.log('INDEPENDENT_PACKAGE_PUBLISHED',name,version);
 } finally {rmSync(dir,{recursive:true,force:true});}
}
