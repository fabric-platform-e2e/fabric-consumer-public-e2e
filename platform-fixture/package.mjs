import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const token=process.env.PACKAGE_TOKEN;
assert.ok(token?.startsWith('ghp_'));
const repo=process.env.GITHUB_REPOSITORY;
assert.ok(repo.startsWith('fabric-platform-e2e/fabric-consumer-'));
const name='fabric-native-events-'+(repo.includes('private')?'private':'public');
if(process.env.OPERATION==='delete') {
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
