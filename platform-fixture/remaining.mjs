import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const payload=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
assert.ok(process.env.GITHUB_REPOSITORY.startsWith('fabric-platform-e2e/'));
assert.ok(['schedule','release','check_run','registry_package'].includes(process.env.GITHUB_EVENT_NAME));
assert.equal(process.arch,'x64');
assert.equal(process.env.FABRIC_LEASE_ID,undefined);
console.log('REMAINING_EVENT_VALIDATED',JSON.stringify({event:process.env.GITHUB_EVENT_NAME,action:payload.action??'default',repository:process.env.GITHUB_REPOSITORY,platform:process.platform,arch:process.arch,schedule:payload.schedule,checkId:payload.check_run?.id,releaseId:payload.release?.id,packageId:payload.registry_package?.id}));
