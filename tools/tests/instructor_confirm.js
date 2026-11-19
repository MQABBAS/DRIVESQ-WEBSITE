const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:1500}});const errs=[];
const now=new Date(),ago=n=>new Date(now-n*864e5),iso=d=>d.toISOString(),ymd=d=>d.toISOString().slice(0,10);
const R=(id,ins,ph,created,o={})=>Object.assign({id:'r'+id,instructor_id:ins,student_name:'Student '+id,student_phone:ph,created_at:iso(created),amount:25,is_paid:false,is_cancelled:false,is_credit:false,flag_color:null,admin_notes:''},o);
const DB={instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',instructor_model:'referral',phone:'07700900001'},{id:'f',full_name:'Fran Chise',status:'approved',instructor_model:'franchise',phone:'07700900002'}],
 referrals:[R('1','d','07700000001',ago(2)),R('2','d','07700000002',ago(5)),R('3','d','07700000003',ago(9)),R('4','f','07700000004',ago(3)),R('5','f','07700000005',ago(6)),R('6','d','07700000006',ago(45))],
 growth_settings:[],expenses:[],income_entries:[],admin_activity_log:[]};let seq=1;
const mock=async p=>{await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
  if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];const out=bd.map(x=>{if(t==='growth_settings'){const e=rows.find(y=>y.key===x.key);if(e){Object.assign(e,x);return e;}}const o=Object.assign({id:t.slice(0,3)+(seq++),created_at:new Date().toISOString()},x);rows.push(o);return o;});return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify(single?out[0]:out)});}
  if(m==='PATCH'){const id=(u.searchParams.get('id')||'').replace('eq.','');rows.filter(x=>String(x.id)===id).forEach(x=>Object.assign(x,req.postDataJSON()));return r.fulfill({status:204,body:''});}
  if(m==='DELETE'){const id=(u.searchParams.get('id')||'').replace('eq.','');DB[t]=rows.filter(x=>String(x.id)!==id);return r.fulfill({status:204,body:''});}
  let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));else if(v.startsWith('gte.'))out=out.filter(x=>String(x[k])>=v.slice(4));}
  const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);out=out.slice(off,off+lim);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});};
const instrPage=async(ins)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(ins.id+': '+e.message));await mock(p);await p.addInitScript(i=>{localStorage.setItem('dsq_instructor',JSON.stringify(i));},ins);await p.goto('http://localhost:8765/dashboard.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(6500);await p.evaluate(()=>loadConfirmCard());await p.waitForTimeout(1000);return p;};
// ---- referral instructor
const D=await instrPage({id:'d',name:'Dawood Khan',full_name:'Dawood Khan',badge:'1',type:'ADI',phone:'07700900001',email:'d@x.com',status:'approved',instructor_model:'referral'});
console.log('referral instructor buttons:',await D.evaluate(()=>[...document.querySelectorAll('#homeConfirmCard > div > div:nth-of-type(1) button')].slice(0,5).map(b=>b.innerText.replace(/\s+/g,' ')).join(' | ')),'| title:',await D.evaluate(()=>document.querySelector('#homeConfirmCard b').innerText));
console.log('rows shown (45-day-old excluded?):',await D.evaluate(()=>[...document.querySelectorAll('#homeConfirmCard b')].map(b=>b.innerText).join(', ')));
await D.evaluate(()=>confirmMark('r1','booked'));await D.waitForTimeout(900);
const r1=DB.referrals.find(r=>r.id==='r1');console.log('r1 after Booked:',r1.flag_color,r1.reply_status,'|',r1.admin_notes);
await D.evaluate(()=>confirmMark('r2','left'));await D.waitForTimeout(800);const r2=DB.referrals.find(r=>r.id==='r2');console.log('r2 after Left:',r2.flag_color,r2.reply_status,'|',r2.admin_notes);
await D.evaluate(()=>confirmMark('r3','later'));await D.waitForTimeout(700);console.log('r3 after Later:',DB.referrals.find(r=>r.id==='r3').flag_color,DB.referrals.find(r=>r.id==='r3').reply_status);
await D.evaluate(()=>confirmUndo('r1'));await D.waitForTimeout(700);console.log('r1 after Undo:',DB.referrals.find(r=>r.id==='r1').flag_color,JSON.stringify(DB.referrals.find(r=>r.id==='r1').admin_notes));
await D.evaluate(()=>confirmMark('r1','booked'));await D.waitForTimeout(700);
console.log('log entries by instructor:',DB.admin_activity_log.filter(l=>l.actor_role==='instructor').map(l=>l.action).join(','));
// ---- franchise instructor
const F=await instrPage({id:'f',name:'Fran Chise',full_name:'Fran Chise',badge:'2',type:'ADI',phone:'07700900002',email:'f@x.com',status:'approved',instructor_model:'franchise'});
console.log('franchise title:',await F.evaluate(()=>document.querySelector('#homeConfirmCard b').innerText),'| buttons per student:',await F.evaluate(()=>document.querySelectorAll('#homeConfirmCard > div > div:nth-of-type(1) button').length),'| labels:',await F.evaluate(()=>[...document.querySelectorAll('#homeConfirmCard button')].slice(0,3).map(b=>b.innerText.replace(/\s+/g,' ')).join(' | ')));
await F.evaluate(()=>confirmMark('r4','booked'));await F.waitForTimeout(800);console.log('franchise r4:',DB.referrals.find(r=>r.id==='r4').flag_color,DB.referrals.find(r=>r.id==='r4').reply_status);
// ---- admin
const A=await ctx.newPage();A.on('pageerror',e=>errs.push('admin: '+e.message));A.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));await mock(A);
await A.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await A.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await A.waitForTimeout(8000);
await A.evaluate(()=>loadReferrals());await A.waitForTimeout(1500);
console.log('admin counts instructor-confirmed as booked:',await A.evaluate(()=>['r1','r4','r2'].map(k=>k+'='+_refAdminBooked(_refData.find(r=>r.id===k))).join(' ')),'| statuses:',await A.evaluate(()=>['r1','r2','r3','r4'].map(k=>k+':'+DSQInsights.status(_refData.find(r=>r.id===k))).join(' ')));
console.log('note colours:',await A.evaluate(()=>_adminNoteHtml(_refData.find(r=>r.id==='r2').admin_notes).replace(/<[^>]*style="color:(#[0-9a-f]+)[^>]*>/g,'[$1]').replace(/<[^>]+>/g,'')));
// income / expense add on Graphs
await A.keyboard.press('g');await A.waitForTimeout(3000);
await A.evaluate(()=>DSQInsights.openMoney('income'));await A.evaluate(()=>{document.getElementById('gmA').value='80';document.getElementById('gmN').value='Cash lesson';document.querySelector('#gfMoney [data-s]').click();});await A.waitForTimeout(1800);
await A.evaluate(()=>DSQInsights.openMoney('expense'));await A.evaluate(()=>{document.getElementById('gmA').value='35.5';document.querySelector('#gfMoney [data-s]').click();});await A.waitForTimeout(1800);
console.log('income rows',DB.income_entries.length,'expense rows',DB.expenses.length,'| this month profit from graph:',await A.evaluate(()=>{const m=DSQInsights.monthData();const c=m[m.length-1];return c.income+' - '+c.expenses+' = '+c.profit;}));
console.log('money log:',DB.admin_activity_log.filter(l=>l.area==='income'||l.area==='expense').map(l=>l.summary).join(' || '));
// package change history
await A.evaluate(()=>{editingInstr=allInstrs.find(i=>i.id==='d');openEditModal();});await A.waitForTimeout(900);
await A.evaluate(()=>{const s=document.getElementById('edit-pkg');s.value='silver';document.getElementById('edit-pkg-note').value='Started on Silver';return DSQPkg.saveFromModal('d');});await A.waitForTimeout(500);
await A.evaluate(()=>{editingInstr=allInstrs.find(i=>i.id==='d');openEditModal();});await A.waitForTimeout(900);
await A.evaluate(()=>{const s=document.getElementById('edit-pkg');s.value='gold';document.getElementById('edit-pkg-note').value='Upgraded at their request';return DSQPkg.saveFromModal('d');});await A.waitForTimeout(500);
// profile: tracker + package history + activity log
await A.evaluate(()=>viewInstr('d'));await A.waitForTimeout(2500);
console.log('profile Bookings:',await A.evaluate(()=>document.getElementById('instrTrack-d').innerText.replace(/\s+/g,' ').slice(0,260)));
await A.evaluate(()=>DSQInsights.trackSet('d','p','week'));console.log('this week:',await A.evaluate(()=>document.getElementById('instrTrack-d').innerText.replace(/\s+/g,' ').slice(0,140)));
console.log('package history:',await A.evaluate(()=>document.getElementById('instrPkgHist-d').innerText.replace(/\s+/g,' ')));
console.log('activity log (instructor d):',await A.evaluate(()=>document.getElementById('instrLog-d').innerText.replace(/\s+/g,' ').slice(0,400)));
console.log('errs',errs.slice(0,5));await b.close();})();
