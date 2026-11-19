const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:1100}});
const now=new Date();const mon=new Date(now);mon.setHours(12,0,0,0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));const wk=(n,k=0)=>{const d=new Date(mon);d.setDate(d.getDate()+7*n+k);return d.toISOString();};
const note='1 Nov 2026 · ✅ Booked — confirmed by admin';
const R=(id,ins,created)=>({id:'r'+id,instructor_id:ins,student_name:'S'+id,student_phone:'0770000'+id,created_at:created,amount:25,is_paid:false,is_cancelled:false,is_credit:false,flag_color:'green',admin_notes:note});
const refs=[];let i=1;
for(let k=0;k<4;k++)refs.push(R(i++,'d',wk(0,Math.min(k,Math.max(0,new Date().getDay()-1)))));       // d: 4 booked this week
for(let k=0;k<5;k++)refs.push(R(i++,'d',wk(-1,k)));                                                     // last week 5 (short of 7 by 2)
for(let n=1;n<=8;n++)for(let k=0;k<(n%3===0?6:14);k++)refs.push(R(i++,'x',wk(-n,k%6)));              // other instructor supplies the weekly volume
const DB={growth_settings:[],instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',instructor_model:'referral',phone:'07700900001'},{id:'x',full_name:'Xavier Other',status:'approved',instructor_model:'referral'}],referrals:refs};
const mockRoute=async p=>{await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
  if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];bd.forEach(x=>{if(t==='growth_settings'){const e=rows.find(y=>y.key===x.key);if(e)Object.assign(e,x);else rows.push(x);}else rows.push(x);});return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(m!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));else if(v.startsWith('gte.'))out=out.filter(x=>String(x[k])>=v.slice(4));}
  const off=+(u.searchParams.get('offset')||0),lim=+(u.searchParams.get('limit')||1000);if(t==='referrals')out=out.slice(off,off+Math.min(lim,1000));
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});};
const errs=[];
const A=await ctx.newPage();A.on('pageerror',e=>errs.push('admin: '+e.message));A.on('dialog',d=>d.accept());await mockRoute(A);
await A.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));localStorage.setItem('dsqe_cc_cfg',JSON.stringify({g:35,ig:13,start:'2026-11-15'}));});
await A.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await A.waitForTimeout(8000);
await A.evaluate(()=>switchTab('referrals'));await A.waitForTimeout(2500);
// edit modal: choose Platinum for Dawood
await A.evaluate(()=>{editingInstr=allInstrs.find(i=>i.id==='d');openEditModal();});await A.waitForTimeout(1200);
console.log('package select present:',await A.evaluate(()=>!!document.getElementById('edit-pkg')));
await A.evaluate(()=>{const s=document.getElementById('edit-pkg');s.value='platinum';s.dispatchEvent(new Event('change'));});await A.waitForTimeout(400);
console.log('safety text:',await A.evaluate(()=>document.getElementById('edit-pkg-safe').innerText.replace(/\s+/g,' ')));
await A.evaluate(()=>{document.getElementById('edit-pkg-start').value=new Date(Date.now()-14*864e5).toISOString().slice(0,10);return DSQPkg.saveFromModal('d');});await A.waitForTimeout(800);
const saved=DB.growth_settings.find(g=>g.key==='packages');console.log('saved packages for d:',JSON.stringify(saved&&saved.value.by));
await A.evaluate(()=>DSQPkg.openOverview());await A.waitForTimeout(800);
console.log('overview:',await A.evaluate(()=>document.getElementById('pkgOv').innerText.replace(/\s+/g,' ').slice(0,900)));
await (await A.$('#pkgOv > div')).screenshot({path:'/tmp/claude-0/dt/pkg.png'});
// priority ordering unit
console.log('prioritise (platinum within 5mi first):',await A.evaluate(()=>{const mk=(id,d)=>({instr:{id},dist:d});const out=DSQPkg.prioritise([mk('x',1),mk('d',3),mk('x2',2)]);return out.map(r=>r.instr.id).join(',');}),'| outside 5mi:',await A.evaluate(()=>DSQPkg.prioritise([{instr:{id:'x'},dist:1},{instr:{id:'d'},dist:7}]).map(r=>r.instr.id).join(',')));
console.log('card note:',await A.evaluate(()=>DSQPkg.cardNote({instr:{id:'d'},dist:3}).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')));
// instructor portal card
const I=await ctx.newPage();I.on('pageerror',e=>errs.push('instr: '+e.message));await mockRoute(I);
await I.addInitScript(()=>{localStorage.setItem('dsq_instructor',JSON.stringify({id:'d',name:'Dawood Khan',full_name:'Dawood Khan',badge:'1',type:'ADI',phone:'07700900001',email:'d@x.com',status:'approved'}));});
await I.goto('http://localhost:8765/dashboard.html',{waitUntil:'domcontentloaded'});await I.waitForTimeout(7000);await I.evaluate(()=>loadPkgCard());await I.waitForTimeout(1200);
console.log('instructor card:',await I.evaluate(()=>document.getElementById('homePkgCard').innerText.replace(/\s+/g,' ').slice(0,400)));

// Normal package for x (no guarantee)
await A.evaluate(()=>{editingInstr=allInstrs.find(i=>i.id==='x');openEditModal();});await A.waitForTimeout(900);
await A.evaluate(()=>{const s=document.getElementById('edit-pkg');s.value='normal';s.dispatchEvent(new Event('change'));document.getElementById('edit-pkg-fee').value='50';document.getElementById('edit-pkg-fee').dispatchEvent(new Event('input'));});await A.waitForTimeout(300);
console.log('normal msg:',await A.evaluate(()=>document.getElementById('edit-pkg-safe').innerText),'| min disabled:',await A.evaluate(()=>document.getElementById('edit-pkg-min').disabled));
await A.evaluate(()=>DSQPkg.saveFromModal('x'));await A.waitForTimeout(600);
console.log('saved x:',JSON.stringify(DB.growth_settings.find(g=>g.key==='packages').value.by.x));
await A.evaluate(()=>DSQPkg.openOverview());await A.waitForTimeout(500);
console.log('overview rows:',await A.evaluate(()=>[...document.querySelectorAll('#pkgOv tbody tr')].map(r=>r.innerText.replace(/\s+/g,' '))));
console.log('safety still counts only guarantees (committed):',await A.evaluate(()=>DSQPkg.safety(0).committed));
console.log('card note normal:',await A.evaluate(()=>DSQPkg.cardNote({instr:{id:'x'},dist:2}).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')));
const X=await ctx.newPage();X.on('pageerror',e=>errs.push('x: '+e.message));await mockRoute(X);
await X.addInitScript(()=>{localStorage.setItem('dsq_instructor',JSON.stringify({id:'x',name:'Xavier Other',full_name:'Xavier Other',badge:'2',type:'ADI',phone:'07700900002',email:'x@x.com',status:'approved'}));});
await X.goto('http://localhost:8765/dashboard.html',{waitUntil:'domcontentloaded'});await X.waitForTimeout(6500);await X.evaluate(()=>loadPkgCard());await X.waitForTimeout(1000);
console.log('normal instructor card:',await X.evaluate(()=>document.getElementById('homePkgCard').innerText.replace(/\s+/g,' ')));
console.log('errs',errs.slice(0,4));await b.close();})();
