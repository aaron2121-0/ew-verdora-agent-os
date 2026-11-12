import {strict as assert} from 'node:assert';
const needed=['QA_AGENT_A_TOKEN','QA_AGENT_B_TOKEN','QA_OWNER_TOKEN','QA_NO_ROLE_TOKEN','QA_AGENT_A_ID','QA_AGENT_B_ID'];
const missing=needed.filter(k=>!process.env[k]);
if(missing.length){
 console.error('QA_FIXTURE_MISSING: configure GitHub Secrets '+missing.join(', ')+'. No real user tokens allowed.');
 process.exitCode=1;
}else if(process.env.QA_DEMO_FIXTURES_VERIFIED!=='true'){
 console.error('QA_FIXTURE_UNVERIFIED: GitHub variable QA_DEMO_FIXTURES_VERIFIED must be true after DB audit of dedicated is_demo=true test agents and the no-role identity.');
 process.exitCode=1;
}else{
 assert.notEqual(process.env.QA_AGENT_A_ID,process.env.QA_AGENT_B_ID,'Demo identities must differ');
 console.log('QA_DEMO_FIXTURES_VERIFIED: required isolated test identities provided; no secrets printed.');
}
