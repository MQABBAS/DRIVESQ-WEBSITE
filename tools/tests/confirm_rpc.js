const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();const calls=[];let f=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)f++};
await p.route('**/*',async r=>{const u=new URL(r.request().url());
 if(u.pathname.endsWith('/rpc/dsq_confirm_get')){calls.push(['get',r.request().postDataJSON()]);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r.request().postDataJSON().p_token==='goodtoken1'?{student_name:'Sam',student_phone:'0777',postcode:'M1',lesson_type:'Manual',confirm_status:'pending'}:null)});}
 if(u.pathname.endsWith('/rpc/dsq_confirm_set')){calls.push(['set',r.request().postDataJSON()]);return r.fulfill({status:200,contentType:'application/json',body:'true'});}
 if(u.pathname.startsWith('/rest/v1/waiting_list'))calls.push(['DIRECT TABLE ACCESS']);
 return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.goto('http://localhost:8765/confirm.html?token=goodtoken1&action=accept');await p.waitForTimeout(1500);
const t=await p.evaluate(()=>document.body.innerText);ok(/Student Accepted/.test(t)&&/Sam/.test(t),'accept shows the student');
ok(calls.some(c=>c[0]==='set'&&c[1].p_status==='accepted'),'accept saved through the routine');ok(!calls.some(c=>c[0]==='DIRECT TABLE ACCESS'),'never touches the table directly');
const p2=await b.newPage();await p2.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/rpc/dsq_confirm_get'))return r.fulfill({status:200,contentType:'application/json',body:'null'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p2.goto('http://localhost:8765/confirm.html?token=nope&action=accept');await p2.waitForTimeout(1200);ok(/not found/i.test(await p2.evaluate(()=>document.body.innerText)),'wrong token shows not found');
console.log(f?'FAILED':'ALL PASS');await b.close();})();
