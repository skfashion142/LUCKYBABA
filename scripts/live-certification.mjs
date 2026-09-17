import fs from 'node:fs';

const base=process.env.CERT_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
const report={timestamp:new Date().toISOString(),status:'NOT_RUN',checks:[],notes:[]};
function add(name,status,detail=''){report.checks.push({name,status,detail});}

if(!base){
  report.status='SKIPPED_NO_API_URL';
  report.notes.push('Set CERT_API_BASE_URL to a running deployment API and re-run to execute live /health and /ready smoke tests.');
  fs.writeFileSync('LIVE_CERTIFICATION.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  process.exit(0);
}

const url=String(base).replace(/\/$/,'');
async function hit(path){
  const res=await fetch(url+path,{headers:{accept:'application/json'}});
  const text=await res.text();
  let body=text; try{body=JSON.parse(text)}catch{}
  return {status:res.status,body};
}
try{
  const health=await hit('/health');
  add('/health',health.status===200?'PASS':'FAIL',JSON.stringify(health.body));
  const ready=await hit('/ready');
  add('/ready',ready.status===200?'PASS':'FAIL',JSON.stringify(ready.body));
  report.status=report.checks.every(x=>x.status==='PASS')?'PASS_LIVE_SMOKE':'FAIL_LIVE_SMOKE';
}catch(e){
  add('API reachable','FAIL',String(e?.message||e));
  report.status='FAIL_LIVE_SMOKE';
}
fs.writeFileSync('LIVE_CERTIFICATION.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
process.exit(report.status==='PASS_LIVE_SMOKE'?0:1);
