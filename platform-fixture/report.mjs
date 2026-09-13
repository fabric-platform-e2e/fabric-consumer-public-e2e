import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { invoice } from './ledger.mjs';
const total = invoice([['19.99',3],['0.10',7]]);
const sourceHash = createHash('sha256').update(readFileSync('platform-fixture/ledger.mjs')).digest('hex');
const mode = process.argv[2];
if (mode === 'build') {
  const platforms = {linux:'actions-fabric-linux-x64',win32:'actions-fabric-windows-x64',darwin:'actions-fabric-macos-x64'};
  assert.equal(platforms[process.platform],process.env.EXPECTED_LABEL);
  assert.equal(process.arch,'x64');
  assert.equal(process.env.FABRIC_LEASE_ID, undefined);
  const expected = { total, sourceHash };
  if (process.env.EXPECT_HIT === 'true') {
    assert.equal(process.env.CACHE_HIT,'true');
    assert.deepEqual(JSON.parse(readFileSync('.platform-cache/invoice.json','utf8')), expected);
    console.log('PLATFORM_CACHE_RESTORED');
  } else { assert.notEqual(process.env.CACHE_HIT,'true'); mkdirSync('.platform-cache',{recursive:true});writeFileSync('.platform-cache/invoice.json',JSON.stringify(expected)); }
  mkdirSync('platform-results',{recursive:true});
  writeFileSync(`platform-results/${process.platform}.json`,JSON.stringify({...expected,platform:process.platform,arch:process.arch,repository:process.env.GITHUB_REPOSITORY,sha:process.env.GITHUB_SHA}));
  appendFileSync(process.env.GITHUB_OUTPUT,`verified=true\n`);
  console.log('PLATFORM_ASSERTIONS_PASSED',process.platform,total,sourceHash);
  await new Promise(r=>setTimeout(r,30000));
} else if (mode === 'verify') {
  const files = readdirSync('platform-results').filter(n=>n.endsWith('.json'));
  assert.equal(files.length,3);
  const reports=files.map(f=>JSON.parse(readFileSync('platform-results/'+f,'utf8')));
  assert.deepEqual(reports.map(r=>r.platform).sort(),['darwin','linux','win32']);
  for (const r of reports) { assert.equal(r.total,total); assert.equal(r.sourceHash,sourceHash); assert.equal(r.sha,process.env.GITHUB_SHA); assert.equal(r.repository,process.env.GITHUB_REPOSITORY); }
  console.log('CROSS_PLATFORM_ARTIFACTS_VERIFIED');
} else throw Error('Unknown fixture mode');
