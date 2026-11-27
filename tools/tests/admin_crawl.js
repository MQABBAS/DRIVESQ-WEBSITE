// Smoke-crawl admin.html: sign in (mocked), click every safe top-level button, record JavaScript errors.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});
const errs=[],reqs=[];p.on('pageerror',e=>errs.push('PAGEERROR '+e.message+' @'+(e.stack||'').split('\n')[1]));
p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|favicon|ERR_/.test(m.text()))errs.push('CONSOLE '+m.text().slice(0,200));});
const now=Date.now(),iso=d=>new Date(now-d*864e5).toISOString();
const DB={instructors:[{id:'i1',full_name:'Ann Instructor',phone:'07700900001',email:'a@x.com',status:'approved',instructor_model:'referral',area:'M1',created_at:iso(90),car_type:'Manual'},{id:'i2',full_name:'Bob Franchise',phone:'07700900002',email:'b@x.com',status:'approved',instructor_model:'franchise',area:'M2',created_at:iso(60),car_type:'Automatic'},{id:'i3',full_name:'Pending Pat',phone:'07700900003',email:'p@x.com',status:'pending',created_at:iso(2)}],
 referrals:[{id:'r1',instructor_id:'i1',student_name:'Stu One',student_phone:'07711000001',created_at:iso(5),amount:35,is_paid:false,is_cancelled:false,is_credit:false,admin_notes:'',notes:''},{id:'r2',instructor_id:'i1',student_name:'Stu Two',student_phone:'07711000002',created_at:iso(20),amount:35,is_paid:true,flag_color:'green'}],
 waiting_list:[{id:'w1',student_name:'Web Wendy',student_phone:'07722000001',postcode:'M20 4AB',lesson_type:'Manual',status:'waiting',notes:'[WEB] test',created_at:iso(1)}],
 student_accounts:[{id:'a1',full_name:'Stu One',phone:'07711000001',email:'s@x.com',status:'active',created_at:iso(5)}],
 student_profiles:[{id:'p1',instructor_id:'i1',full_name:'Stu One',phone:'07711000001',created_at:iso(5)}],
 lessons:[{id:'l1',instructor_id:'i1',student_name:'Stu One',lesson_date:new Date(now+864e5).toISOString().slice(0,10),start_time:'10:00',duration_hours:1,payment_received:35,created_at:iso(3)}]};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]||[];const single=(req.headers()['accept']||'').includes('pgrst.object');const m=req.method();if(m!=='GET')return r.fulfill({status:m==='POST'?201:204,contentType:'application/json',body:m==='POST'?'[]':''});let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));}return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.pathname.includes('/functions/v1/'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,version:'x',conversations:[],messages:[],days:{},leads:[],templates:[],items:[]})});
 if(u.pathname.includes('/auth/v1/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 return u.hostname==='localhost'?r.continue():r.fulfill({status:200,contentType:'text/plain',body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));window.confirm=()=>false;window.alert=()=>{};window.prompt=()=>null;window.open=()=>null;});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(6000);
console.log('LOAD ERRORS:',errs.length);errs.splice(0).forEach(e=>console.log('  ',e));
const SKIP=/delete|remove|logout|signout|clear|reset|send|publish|purge|wipe|block|unblock|approve|reject|decline|cancel|drop|pay|paid|save|submit|import|export|download|print|reassign|assign|toggle|mark|archive|restore|create|add|new|doLogin/i;
const names=await p.evaluate(()=>{const out=new Set();document.querySelectorAll('[onclick]').forEach(e=>{const m=(e.getAttribute('onclick')||'').match(/^\s*([A-Za-z_$][\w$.]*)\(\s*\)\s*;?\s*$/);if(m)out.add(m[1]);});return [...out];});
console.log('clickable zero-arg handlers:',names.length);
let tried=0;const bad={};
for(const n of names){if(SKIP.test(n))continue;tried++;
 const before=errs.length;
 await p.evaluate(n=>{try{const f=n.split('.').reduce((o,k)=>o&&o[k],window);if(typeof f==='function')f();else window.__missing=(window.__missing||[]).concat(n);}catch(e){window.__thrown=(window.__thrown||[]).concat(n+': '+e.message);}},n);
 await p.waitForTimeout(350);
 await p.evaluate(()=>{document.querySelectorAll('.modal.show,.modal-overlay,.overlay.open,[class*=modal][style*="display: flex"]').forEach(m=>{const c=m.querySelector('[onclick*=close],.btn-close,[data-bs-dismiss]');c&&c.click();});document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));});
 if(errs.length>before)bad[n]=errs.slice(before);
}
const extra=await p.evaluate(()=>({missing:window.__missing||[],thrown:window.__thrown||[]}));
console.log('tried',tried);console.log('NOT FUNCTIONS:',extra.missing.join(', ')||'none');console.log('THROWN:',extra.thrown.join('\n  ')||'none');
console.log('ERRORS BY HANDLER:');Object.entries(bad).forEach(([k,v])=>console.log(' ',k,'->',v.slice(0,2).join(' | ')));

const TABS='actions activity add analytics availability bulk calendar coverage dashboard email enquiries expenses feedback finance find followup freehour graph growth infoview instructors lessons map messages notes outreach pending progress-overview referrals requests revenue scorecard students today transfers waitlist'.split(' ');
const calls=TABS.map(t=>"switchTab('"+t+"')").concat(["viewInstr('i1')","viewInstr('i3')","openRefDetail('i1')","openRefDetail('i1',true)","openInstrReferrals('i1')","openEditForId('i1')","openMsgModal('i1')","openInstrReferrals('nope')","viewInstr('nope')","openRefStudentDetail('Stu One','i1')","openStudentDetail(0)","openEditForId('i2')","adminReassignStudent()"]);
const bad2={};
for(const c of calls){const before=errs.length;const r=await p.evaluate(async c=>{try{await eval(c);return null}catch(e){return e.message}},c);await p.waitForTimeout(500);
 await p.evaluate(()=>{document.querySelectorAll('.modal.show').forEach(m=>{const x=m.querySelector('.btn-close,[data-bs-dismiss]');x&&x.click();});});
 if(r||errs.length>before)bad2[c]=(r?['THROWN '+r]:[]).concat(errs.slice(before));}
console.log('DEEP CALLS:',calls.length);Object.entries(bad2).forEach(([k,v])=>console.log(' ',k,'->',v.slice(0,2).join(' | ')));
console.log(Object.keys(bad).length+Object.keys(bad2).length?'ISSUES':'CLEAN');await b.close();})();
