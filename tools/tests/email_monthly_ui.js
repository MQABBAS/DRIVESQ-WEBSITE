const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:1500}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const DB={growth_settings:[{key:'emailloop',value:{enabled:false,listTag:'__monthly_new__',perDay:30,hour:10,cooldownDays:30,keepMonths:3,monthlyDesigns:{'2026-11':{subject:'Block bookings save you money',body:'x'}},design:{subject:'Block bookings save you money',body:'x'}}},{key:'emailloop_monthly_state',value:{retired:[{month:'2026-10',students:34}],doneKeys:[],history:[]}}],email_contacts:[{id:'1',email:'a@x.com',email_key:'a@x.com',status:'subscribed',tags:['new-2026-11']},{id:'2',email:'b@x.com',email_key:'b@x.com',status:'subscribed',tags:['new-2026-10']}]};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const single=(req.headers()['accept']||'').includes('pgrst.object');if(req.method()!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();for(const [k,v] of u.searchParams){if(k==='key'&&v.startsWith('in.')){const ks=v.slice(4,-1).split(',').map(x=>x.replace(/"/g,''));out=out.filter(x=>ks.includes(x.key));}else if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));}
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(7000);
await p.evaluate(()=>{window.switchTab('email');});await p.waitForTimeout(2500);
await p.evaluate(()=>{const t=[...document.querySelectorAll('.dsqm-tabs [role=tab],.dsqm-tabs button')].find(x=>/loop/i.test(x.innerText)||/loop/.test(x.dataset.tab||''));if(t)t.click();});await p.waitForTimeout(2500);
console.log('monthly panel shown:',await p.evaluate(()=>{const e=document.body.innerText;const i=e.indexOf('oldest month is at the top');return i<0?'NOT FOUND':e.slice(i-60,i+520).replace(/\s+/g,' ')}));
console.log('errors:',errs.join(' | ')||'none');await b.close();})();
