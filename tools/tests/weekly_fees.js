const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:1300}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
const now=new Date(),ds=d=>d.toISOString().slice(0,10);
const DB={growth_settings:[{key:'packages',value:{tiers:{},by:{d:{tier:'platinum',fee:null,min:null,start:ds(new Date(now-30*864e5)),active:true},x:{tier:'normal',fee:45,min:null,start:ds(new Date(now-30*864e5)),active:true}}}},{key:'config',value:{franchiseDef:50,franchiseNew:60,newFrom:'2026-11-16',franchiseBy:{f2:55}}}],
 instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',instructor_model:'referral',created_at:'2026-01-05T10:00:00Z'},{id:'x',full_name:'Xavier Normal',status:'approved',instructor_model:'referral',created_at:'2026-01-05T10:00:00Z'},{id:'f1',full_name:'Fran One',status:'approved',instructor_model:'franchise',created_at:'2026-11-17T10:00:00Z'},{id:'f2',full_name:'Fran Two',status:'approved',instructor_model:'franchise',created_at:'2026-02-01T10:00:00Z'},{id:'f3',full_name:'Fran Three',status:'approved',instructor_model:'franchise',created_at:'2026-02-01T10:00:00Z'},{id:'r',full_name:'Ref Only',status:'approved',instructor_model:'referral'}],
 referrals:[],instructor_weekly_fees:[]};let seq=1;
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
  if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];for(const x of bd){if(t==='instructor_weekly_fees'&&rows.some(y=>y.instructor_id===x.instructor_id&&y.week_start===x.week_start))return r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'23505',message:'duplicate key'})});if(t==='growth_settings'){const e=rows.find(y=>y.key===x.key);if(e){Object.assign(e,x);continue;}}rows.push(Object.assign({id:'id'+(seq++),created_at:new Date().toISOString()},x));}return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(m==='PATCH'){const id=(u.searchParams.get('id')||'').replace('eq.','');rows.filter(x=>String(x.id)===id).forEach(x=>Object.assign(x,req.postDataJSON()));return r.fulfill({status:204,body:''});}
  if(m!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));}
  const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);out=out.slice(off,off+lim);
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(8000);
await p.evaluate(()=>switchTab('expenses'));await p.waitForTimeout(2500);
await p.evaluate(()=>setAccTab('fees'));await p.waitForTimeout(2500);
console.log('dbg pkgOf d:',JSON.stringify(await p.evaluate(async()=>{await DSQPkg.load(true);return {d:DSQPkg.pkgOf('d'),x:DSQPkg.pkgOf('x'),plans:(await DSQFees.plans()).map(z=>z.id+':'+z.plan+':'+z.fee),instrs:DSQ_ADMIN.instrs().map(i=>i.id)};})));const rows0=DB.instructor_weekly_fees.map(r=>r.instructor_id+':'+r.plan+':'+r.expected);console.log('rows for this week only (from=today):',rows0.sort().join(' | '));
// backfill 2 weeks
const from=ds(new Date(now-14*864e5));await p.evaluate(v=>DSQFees.setFrom(v),from);await p.waitForTimeout(2500);
console.log('after backfill rows:',DB.instructor_weekly_fees.length);
console.log('panel:',await p.evaluate(()=>document.getElementById('accFeesBody').innerText.replace(/\s+/g,' ').slice(0,700)));
// pay: mark all this week, one old week individually with custom amount
await p.evaluate(()=>DSQFees.markAll());await p.waitForTimeout(1500);
const old=DB.instructor_weekly_fees.find(r=>r.status==='unpaid'&&r.instructor_id==='d');await p.evaluate(id=>DSQFees.markPaid(id,true),old.id);await p.waitForTimeout(1200);
console.log('paid rows:',DB.instructor_weekly_fees.filter(r=>r.status==='paid').length,'of',DB.instructor_weekly_fees.length);
console.log('panel after:',await p.evaluate(()=>document.getElementById('accFeesBody').innerText.replace(/\s+/g,' ').slice(0,520)));
// accounting income
await p.evaluate(()=>{setAccPeriod('all');setAccTab('pl')});await p.waitForTimeout(800);
const paidTotal=DB.instructor_weekly_fees.filter(r=>r.status==='paid').reduce((a,r)=>a+r.amount_paid,0);
console.log('expected income from weekly fees £'+paidTotal,'| KPI:',await p.evaluate(()=>['kpi-income','kpi-income-sub'].map(i=>document.getElementById(i).textContent).join(' | ')));
await p.evaluate(()=>setAccTab('audit'));await p.waitForTimeout(600);console.log('audit weekly row:',await p.evaluate(()=>(document.getElementById('accAuditBody').innerText.match(/Franchise & package weekly fees[^£]*£[\d.,]+/)||[''])[0]));
await (await p.$('#accFeesBody')).screenshot({path:'/tmp/claude-0/dt/fees.png'}).catch(()=>{});
console.log('errs',errs.slice(0,4));await b.close();})();
