const {chromium}=require('playwright');
const iso=d=>d.toISOString().slice(0,10),day=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d);};
const DB={instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',phone:'07700900001'}],
 student_profiles:[{id:'p1',instructor_id:'d',name:'Sara Ahmed',phone:'07700911001',status:'active'},{id:'p2',instructor_id:'d',name:'Bilal Khan',phone:'07700911002',status:'active'}],
 student_accounts:[{id:'acc1',instructor_id:'d',full_name:'Sara Ahmed',phone:'07700911001'}],
 lessons:[],student_credit_ledger:[],student_credit_settings:[],student_credit_history:[],admin_messages:[],student_messages:[],pending_notifications:[]};
let seq=1;const log=[];const ok=(c,m)=>{log.push((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
function applyFilters(rows,u){let out=rows.slice();
 for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;
  if(k==='or'){const conds=v.replace(/^\(|\)$/g,'').split(',').map(c=>c.split('.'));out=out.filter(r=>conds.some(c=>{const col=c[0],op=c[1],val=c.slice(2).join('.');return op==='eq'&&String(r[col])===val;}));continue;}
  if(v.startsWith('eq.'))out=out.filter(r=>String(r[k])===v.slice(3));
  else if(v.startsWith('in.(')){const a=v.slice(4,-1).split(',').map(z=>z.replace(/^"|"$/g,''));out=out.filter(r=>a.includes(String(r[k])));}
  else if(v==='is.null')out=out.filter(r=>r[k]==null);
  else if(v.startsWith('gte.'))out=out.filter(r=>String(r[k])>=v.slice(4));
  else if(v.startsWith('lte.'))out=out.filter(r=>String(r[k])<=v.slice(4));
  else if(v.startsWith('ilike.')){const pat=v.slice(6).replace(/%/g,'').toLowerCase();out=out.filter(r=>String(r[k]||'').toLowerCase().includes(pat));}
  else if(v.startsWith('neq.'))out=out.filter(r=>String(r[k])!==v.slice(4));}
 return out;}
async function mock(page){
 await page.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
  if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});
  if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
  if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
   if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];const out=[];
    for(const x of bd){if(t==='student_credit_ledger'&&x.lesson_id&&rows.some(y=>y.lesson_id===x.lesson_id))return r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'23505',message:'duplicate key value violates unique constraint'})});
     const o=Object.assign({id:t.slice(0,3)+(seq++),created_at:new Date().toISOString()},x);if(t==='student_credit_settings'&&rows.some(y=>y.student_key===x.student_key)){Object.assign(rows.find(y=>y.student_key===x.student_key),x);out.push(x);continue;}rows.push(o);out.push(o);}
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify(single?out[0]:out)});}
   if(m==='PATCH'){const f=applyFilters(rows,u);const bd=req.postDataJSON();f.forEach(x=>Object.assign(x,bd));return r.fulfill({status:204,body:''});}
   if(m==='DELETE'){const f=new Set(applyFilters(rows,u));DB[t]=rows.filter(x=>!f.has(x));return r.fulfill({status:204,body:''});}
   const out=applyFilters(rows,u);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
  if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
  return u.hostname==='localhost'&&!/\.mp4/.test(u.href)?r.continue():r.fulfill({status:200,body:''});});}
const led=()=>DB.student_credit_ledger;
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1366,height:1000}});
 const errs=[];const pg=async(url,init)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(url.split('/').pop()+': '+e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));await mock(p);if(init)await p.addInitScript(init);await p.goto('http://localhost:8765/'+url,{waitUntil:'domcontentloaded'});return p;};
 // ---------- ADMIN ----------
 const A=await pg('admin.html',()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
 await A.waitForTimeout(9000);
 const setv=async(p,id,v)=>p.evaluate(([i,x])=>{const e=document.getElementById(i);if(e)e.value=x;},[id,v]);
 // 1. admin adds Sara's block (paid to DriveSQ), switches on portal
 await A.evaluate(()=>loadStudentCredit({name:'Sara Ahmed',acctId:'acc1',profileId:'p1',instrId:'d'}));await A.waitForTimeout(700);
 await A.evaluate(()=>crForm('block'));await setv(A,'crHrs','10');await setv(A,'crAmt','330');await setv(A,'crPaidTo','drivesq');await setv(A,'crDate',day(-5));await A.evaluate(()=>crSave());await A.waitForTimeout(1200);
 ok(led().length===1&&led()[0].kind==='purchase'&&led()[0].paid_to==='drivesq'&&led()[0].instructor_id==='d','admin: Sara block saved with paid_to=drivesq and instructor linked');
 await A.evaluate(()=>crToggle(true));await A.waitForTimeout(500);
 ok(DB.student_credit_settings.some(x=>x.student_key==='acc1'&&x.show_on_portal===true),'admin: show-on-portal switch saved');
 // Bilal: profile only, no instructor id known -> must be healed
 await A.evaluate(()=>loadStudentCredit({name:'Bilal Khan',acctId:null,profileId:'p2',instrId:null}));await A.waitForTimeout(900);
 await A.evaluate(()=>crForm('block'));await setv(A,'crHrs','5');await setv(A,'crAmt','175');await setv(A,'crDate',day(-5));await A.evaluate(()=>crSave());await A.waitForTimeout(1200);
 const bb=led().find(x=>x.student_name==='Bilal Khan');ok(bb&&bb.instructor_id==='d','admin: Bilal block (no instructor known) got the instructor attached');
 // ---------- INSTRUCTOR ----------
 const I=await pg('dashboard.html',()=>{localStorage.setItem('dsq_instructor',JSON.stringify({id:'d',name:'Dawood Khan',full_name:'Dawood Khan',badge:'1',type:'ADI',phone:'07700900001',email:'d@x.com',status:'approved'}));});
 await I.waitForTimeout(8000);
 await I.evaluate(()=>switchTab('blocks'));await I.waitForTimeout(1800);
 const cards=()=>I.$$eval('#dqbTabBody .dqb-card',e=>e.map(x=>x.innerText.replace(/\s+/g,' ')));
 let c=await cards();ok(c.length===2,'instructor: sees both admin-added blocks ('+c.length+')');
 ok(c.some(x=>/Sara Ahmed/.test(x)&&/10 HRS LEFT/.test(x)&&/Student paid DriveSQ/.test(x)),'instructor: Sara 10h left + "paid DriveSQ" panel');
 ok(c.some(x=>/Bilal Khan/.test(x)&&/5 HRS LEFT/.test(x)),'instructor: Bilal 5h left');
 // 2. manual tick for Bilal today (1h), then calendar lesson the same day (should LINK, not double count)
 await I.evaluate(()=>{const st={name:'Bilal Khan',profId:'p2',accId:null};return DSQBlock._useHours(st,1,'',new Date().toISOString().slice(0,10));});await I.waitForTimeout(800);
 ok(led().filter(x=>x.student_name==='Bilal Khan'&&x.kind==='lesson').length===1,'instructor: manual tick recorded');
 // calendar lessons: Sara 2h yesterday, 1h in 2 days; Bilal 1h today
 await I.evaluate(([y,f,t])=>sb.from('lessons').insert([{id:'L1',instructor_id:'d',student_name:'Sara Ahmed',lesson_date:y,start_time:'10:00',duration_hours:2},{id:'L2',instructor_id:'d',student_name:'Sara Ahmed',lesson_date:f,start_time:'10:00',duration_hours:1},{id:'L3',instructor_id:'d',student_name:'Bilal Khan',lesson_date:t,start_time:'12:00',duration_hours:1}]),[day(-1),day(2),day(0)]);
 await I.waitForTimeout(4500);
 const sara=led().filter(x=>x.student_name==='Sara Ahmed'&&x.kind==='lesson'),bil=led().filter(x=>x.student_name==='Bilal Khan'&&x.kind==='lesson');
 ok(sara.length===2&&sara.every(x=>x.auto&&x.lesson_id),'calendar sync: Sara 2 lessons counted once each');
 ok(bil.length===1&&bil[0].lesson_id==='L3','calendar sync: Bilal same-day lesson LINKED to the manual tick (not double counted)');
 ok(await I.evaluate(()=>!!document.getElementById('dqbSnack')),'instructor: "block updated — edit / don\'t count it" message shown');
 await I.evaluate(()=>DSQBlock.load());c=await cards();
 ok(c.some(x=>/Sara Ahmed/.test(x)&&/7 HRS LEFT/.test(x)&&/Done 2h/.test(x)&&/Booked ahead 1h/.test(x)),'instructor: Sara done 2h / booked 1h / left 7h');
 ok(c.some(x=>/Bilal Khan/.test(x)&&/4 HRS LEFT/.test(x)),'instructor: Bilal 4h left');
 // 3. concurrency: add a lesson, then sync from admin + student + instructor at once -> one row only
 await I.evaluate(([d])=>sb.from('lessons').insert([{id:'L4',instructor_id:'d',student_name:'Sara Ahmed',lesson_date:d,start_time:'09:00',duration_hours:1.5}]),[day(0)]);
 // ---------- STUDENT ----------
 const S=await pg('student.html');await S.waitForTimeout(2500);
 await Promise.all([
  A.evaluate(()=>DSQBlock.syncFor({sb,st:{name:'Sara Ahmed',accId:'acc1',profId:'p1',instrId:'d'},role:'admin',actor:'Admin'})),
  S.evaluate(()=>DSQBlock.syncFor({sb,st:{name:'Sara Ahmed',accId:'acc1',profId:null,instrId:'d'},role:'student',actor:'Sara Ahmed'})),
  I.evaluate(()=>DSQBlock.syncAll({announce:false}))]);
 await I.waitForTimeout(1500);
 ok(led().filter(x=>x.lesson_id==='L4').length===1,'concurrency: admin + student + instructor syncing at once -> lesson counted exactly once');
 // student portal card
 await S.evaluate(async()=>{currentStudent={id:'acc1',name:'Sara Ahmed',instructor_id:'d'};instrData={full_name:'Dawood Khan',phone:'07700900001'};const h=document.getElementById('homeCreditCard');document.body.appendChild(h);h.classList.remove('hidden');await loadCredit();});
 await S.waitForTimeout(1500);
 const sc=await S.evaluate(()=>document.getElementById('homeCreditCard').innerText.replace(/\s+/g,' '));
 ok(/5\.5 HRS LEFT|5.5\s*HRS LEFT/i.test(sc)||/5\.5h/.test(sc),'student: Sara sees 5.5h left ('+sc.slice(0,120)+')');
 ok(/Done 3\.5h/.test(sc)&&/Booked ahead 1h/.test(sc),'student: done 3.5h (incl. today\'s lesson) / booked ahead 1h');
 // 4. admin releases payment for the past lesson
 await A.evaluate(()=>loadStudentCredit({name:'Sara Ahmed',acctId:'acc1',profileId:'p1',instrId:'d'}));await A.waitForTimeout(1200);
 const row=led().find(x=>x.lesson_id==='L1');await A.evaluate(id=>crRelease(id),row.id);await A.waitForTimeout(1200);
 ok(led().find(x=>x.lesson_id==='L1').payout_status==='released'&&DB.admin_messages.some(m=>/Payment released/.test(m.subject)),'admin: payment released for completed lesson + instructor notified');
 await I.evaluate(()=>switchTab('blocks'));await I.waitForTimeout(1500);c=await cards();
 ok(c.some(x=>/Sara Ahmed/.test(x)&&/released to you £66/i.test(x)),'instructor: sees "Released to you £66"');
 // 5. instructor chooses not to count a lesson; sync must not re-add it
 const before=led().find(x=>x.lesson_id==='L2');await I.evaluate(()=>{});
 await I.evaluate(async id=>{const row=DSQBlock._S.rows.find(r=>String(r.id)===String(id));const st={name:'Sara Ahmed',profId:'p1',accId:'acc1'};await sb.from('student_credit_ledger').update({hours:0,amount:0,excluded:true}).eq('id',id);},before.id);
 await I.evaluate(()=>DSQBlock.load().then(()=>DSQBlock.syncAll({announce:false})));await I.waitForTimeout(1200);
 ok(led().find(x=>x.lesson_id==='L2').excluded===true&&led().filter(x=>x.lesson_id==='L2').length===1,'instructor: "don\'t count" stays after the next calendar check');
 // 6. delete a calendar lesson -> hours go back
 const leftBefore=await I.evaluate(()=>DSQBlock.sumOf(DSQBlock._S.rows.filter(r=>r.student_name==='Sara Ahmed')).leftH);
 await I.evaluate(()=>sb.from('lessons').delete().eq('id','L4'));await I.waitForTimeout(4500);
 const leftAfter=await I.evaluate(async()=>{await DSQBlock.load();return DSQBlock.sumOf(DSQBlock._S.rows.filter(r=>r.student_name==='Sara Ahmed')).leftH;});
 ok(!led().some(x=>x.lesson_id==='L4')&&leftAfter===leftBefore+1.5,'calendar sync: lesson deleted from calendar -> 1.5h put back ('+leftBefore+' -> '+leftAfter+')');
 // 7. student reminder
 await S.evaluate(()=>document.getElementById('bkRemind').click());await S.waitForTimeout(900);
 ok(DB.student_messages.some(m=>/update my block hours/.test(m.message)),'student: reminder message reached the instructor');
 // 8. admin edit of a calendar row is protected from the calendar; admin delete of a calendar row = leave off
 await A.evaluate(()=>loadStudentCredit({name:'Sara Ahmed',acctId:'acc1',profileId:'p1',instrId:'d'}));await A.waitForTimeout(900);
 await A.evaluate(id=>crDelete(id),led().find(x=>x.lesson_id==='L1').id);await A.waitForTimeout(1200);
 ok(led().find(x=>x.lesson_id==='L1').excluded===true,'admin: deleting a calendar entry leaves it off the block (not re-added)');
 await I.evaluate(()=>DSQBlock.load().then(()=>DSQBlock.syncAll({announce:false})));await I.waitForTimeout(1000);
 ok(led().filter(x=>x.lesson_id==='L1').length===1&&led().find(x=>x.lesson_id==='L1').excluded===true,'calendar sync respects admin choice');
 // 9. consistency across the three views
 const adminLeft=await A.evaluate(async()=>{await loadStudentCredit({name:'Sara Ahmed',acctId:'acc1',profileId:'p1',instrId:'d'});return Math.round(_crCtx.rows.reduce((a,r)=>a+(+r.hours||0),0)*100)/100;});
 const instLeft=await I.evaluate(async()=>{await DSQBlock.load();return DSQBlock.sumOf(DSQBlock._S.rows.filter(r=>r.student_name==='Sara Ahmed')).leftH;});
 await S.evaluate(()=>loadCredit());await S.waitForTimeout(1200);const sc2=await S.evaluate(()=>document.getElementById('homeCreditCard').innerText.replace(/\s+/g,' '));
 const stuLeft=parseFloat((sc2.match(/([\d.]+) HRS LEFT/i)||[])[1]);
 ok(adminLeft===instLeft&&instLeft===stuLeft,'consistency: admin '+adminLeft+'h = instructor '+instLeft+'h = student '+stuLeft+'h');
 ok(DB.student_credit_history.length>=6,'history: '+DB.student_credit_history.length+' events logged ('+[...new Set(DB.student_credit_history.map(h=>h.actor_role))].join(', ')+')');
 ok(DB.admin_messages.some(m=>m.message_type==='block_booking'),'admin inbox: "block booking edited by instructor" message exists');
 console.log(log.join('\n'));console.log('page errors:',errs.slice(0,6));await b.close();})();
