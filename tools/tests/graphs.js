const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1500}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
const now=new Date(),ago=n=>new Date(now-n*864e5),iso=d=>d.toISOString(),ymd=d=>d.toISOString().slice(0,10);
const MK='✅ Booked — confirmed by admin';
const R=(id,ph,created,o={})=>Object.assign({id:'r'+id,instructor_id:'d',student_name:'Student '+id,student_phone:ph,created_at:iso(created),amount:25,is_paid:false,is_cancelled:false,is_credit:false,flag_color:null,admin_notes:''},o);
const refs=[R('A','07700000001',ago(40),{flag_color:'green',admin_notes:'1 Oct 2026 · '+MK}),R('B','07700000002',ago(35),{is_paid:true,paid_at:iso(ago(30)),flag_color:'green',admin_notes:'1 Oct 2026 · '+MK}),R('C','07700000003',ago(20),{flag_color:'red'}),R('D','07700000004',ago(10),{flag_color:'purple'}),R('E','07700000005',ago(45)),R('F','07700000006',ago(3)),
 R('G','07700000007',ago(15),{flag_color:'purple',admin_notes:'x · 📨 Message sent [c:'+ymd(ago(5))+']'}),R('H','07700000008',ago(40),{flag_color:'purple',admin_notes:'x · 📨 Message sent [c:'+ymd(ago(20))+']'}),R('I','07700000009',ago(12),{is_cancelled:true}),
 R('J','07700000010',new Date(now.getFullYear(),8,10,12),{flag_color:'green',admin_notes:'1 Sep 2026 · '+MK})];
const DB={instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',phone:'07700900001'}],referrals:refs,expenses:[{id:'e1',expense_date:ymd(ago(20)),amount:120,category:'Fuel'},{id:'e2',expense_date:new Date(now.getFullYear(),8,15).toISOString().slice(0,10),amount:60,category:'Fuel'}],income_entries:[{id:'i1',income_date:ymd(ago(8)),amount:50,category:'Cash Payment'}],growth_settings:[]};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
  if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];bd.forEach(x=>{if(t==='growth_settings'){const e=rows.find(y=>y.key===x.key);if(e)Object.assign(e,x);else rows.push(x);}else rows.push(x);});return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(m==='PATCH'){const id=(u.searchParams.get('id')||'').replace('eq.','');rows.filter(x=>String(x.id)===id).forEach(x=>Object.assign(x,req.postDataJSON()));return r.fulfill({status:204,body:''});}
  if(m!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));}
  const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);out=out.slice(off,off+lim);
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(8000);
await p.evaluate(()=>{document.activeElement&&document.activeElement.blur();});
await p.keyboard.press('g');await p.waitForTimeout(3500);
console.log('G opens graphs:',await p.evaluate(()=>!document.getElementById('panel-graph').classList.contains('hidden')),'| charts drawn:',await p.evaluate(()=>!!document.getElementById('gfFin')&&!!document.getElementById('gfBook')));
console.log('auto-unsure E (no flag 45d):',DB.referrals.find(r=>r.id==='rE').flag_color,'|',DB.referrals.find(r=>r.id==='rE').admin_notes.slice(0,60),'| F (3d) untouched:',DB.referrals.find(r=>r.id==='rF').flag_color);
const st=await p.evaluate(()=>['A','B','C','D','E','F','G','H','I','J'].map(k=>k+':'+DSQInsights.status(_refData.find(r=>r.id==='r'+k))).join(' '));console.log('statuses:',st);
const G=await p.evaluate(()=>{const g=DSQInsights.groups();return {confirm:g.confirm.map(x=>x.r.id),waiting:g.waiting.map(x=>x.r.id),left:g.left.map(x=>x.r.id)};});console.log('groups:',JSON.stringify(G));
console.log('months:',await p.evaluate(()=>DSQInsights.monthData().map(m=>m.label+' ref='+m.referred+' booked='+m.cnt.booked+' no='+m.noBooking+' inc='+m.income+' exp='+m.expenses+' profit='+m.profit).join(' || ')));
// confirm booked from the Things-to-do list
await p.evaluate(()=>{document.querySelector('[data-do=book][data-id=rD]').click();});await p.waitForTimeout(900);
const D=DB.referrals.find(r=>r.id==='rD');console.log('D after ✅:',D.flag_color,'|',D.admin_notes,'| counts as booked:',await p.evaluate(()=>_refAdminBooked(_refData.find(r=>r.id==='rD'))));
// message flow for F
await p.evaluate(()=>DSQInsights.openMessage('rF'));await p.waitForTimeout(400);
console.log('modal student msg:',await p.evaluate(()=>document.getElementById('gfS').value.slice(0,90)));
await p.evaluate(()=>document.querySelector('#gfMsg [data-save]').click());await p.waitForTimeout(1200);
const F=DB.referrals.find(r=>r.id==='rF');console.log('F after message:',F.flag_color,F.is_contacted,'|',F.admin_notes);
const G2=await p.evaluate(()=>{const g=DSQInsights.groups();return {confirm:g.confirm.map(x=>x.r.id),waiting:g.waiting.map(x=>x.r.id),left:g.left.map(x=>x.r.id)};});console.log('groups now:',JSON.stringify(G2));
// import parser
console.log('parse:',JSON.stringify(await p.evaluate(()=>DSQInsights.parseList('Sara Ahmed  07700 900123  booked\nBilal Khan | 07700900456 | not booked\nnoise line\nZed 07700 000006 unsure'))));
await p.evaluate(()=>DSQInsights.openImport());await p.evaluate(()=>{document.getElementById('gfPaste').value='Student C 07700000003 booked\nStudent H 07700000008 not booked';document.querySelector('#gfImp [data-parse]').click();});await p.waitForTimeout(500);
console.log('import table:',await p.evaluate(()=>document.getElementById('gfImpTable').innerText.replace(/\s+/g,' ').slice(0,300)));
await p.evaluate(()=>document.querySelector('#gfImp [data-apply]').click());await p.waitForTimeout(1500);
console.log('after import C:',DB.referrals.find(r=>r.id==='rC').flag_color,DB.referrals.find(r=>r.id==='rC').admin_notes.split('\n').pop(),'| H:',DB.referrals.find(r=>r.id==='rH').flag_color);
// instructor note
await p.evaluate(async()=>{await DSQInsights.loadNotes();});await p.evaluate(()=>DSQInsights.editNote('d'));await p.waitForTimeout(300);
await p.evaluate(()=>{document.getElementById('gfNoteT').value='Only automatics, not before 10am';document.querySelector('#gfNote [data-s]').click();});await p.waitForTimeout(800);
console.log('note saved:',JSON.stringify(DB.growth_settings.find(g=>g.key==='instructor_notes').value.d.text),'| find card line:',await p.evaluate(()=>DSQInsights.noteLine('d').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')));
await (await p.$('#graphBody')).screenshot({path:'/tmp/claude-0/dt/graph.png'});
// J opens palette
await p.keyboard.press('j');await p.waitForTimeout(400);console.log('J opens jump:',await p.evaluate(()=>!!document.querySelector('.qa-pal.open')));
console.log('errs',errs.slice(0,5));await b.close();})();
