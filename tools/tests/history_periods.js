const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:1100}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const now=new Date(),mk=(i,monthsAgo,paid,amt)=>{const d=new Date(now.getFullYear(),now.getMonth()-monthsAgo,10+i%10,12);return{id:'r'+i,instructor_id:'d',student_name:'Student '+i,student_phone:'0770'+i,created_at:d.toISOString(),amount:amt||25,is_paid:!!paid,paid_at:paid?d.toISOString():null,is_cancelled:false,is_credit:false,flag_color:'green',admin_notes:'1 Nov 2026 · ✅ Booked — confirmed by admin'};};
const refs=[];let i=0;[[0,3],[1,4],[2,5],[3,6],[4,3]].forEach(([mo,n])=>{for(let k=0;k<n;k++)refs.push(mk(i++,mo,k%2===0));});for(let k=0;k<1203;k++)refs.push(mk(i++,5+(k%20),true,25)); // >1000 old rows
const exps=[{id:'e1',expense_date:new Date(now.getFullYear(),now.getMonth()-1,5).toISOString().slice(0,10),amount:100,category:'Fuel'},{id:'e2',expense_date:new Date(now.getFullYear(),now.getMonth(),3).toISOString().slice(0,10),amount:40,category:'Fuel'}];
const DB={instructors:[{id:'d',full_name:'Dawood Khan',status:'approved'}],referrals:refs,expenses:exps,income_entries:[]};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];let rows=DB[t]||[];const m=req.method();if(m!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();if(t==='referrals'){const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);out=rows.slice(off,off+lim);} /* emulate the 1000-row cap */
  return r.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-'+(out.length-1)+'/'+rows.length},body:JSON.stringify(out)});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(8000);
await p.evaluate(()=>switchTab('referrals'));await p.waitForTimeout(2500);
console.log('loaded rows (should be 1218 incl >1000 old):',await p.evaluate(()=>_refData.length));
const lab=()=>p.evaluate(()=>document.getElementById('refPeriodLabel').innerText);
for(const per of ['week','lastweek','month','last','all']){await p.evaluate(x=>setRefPeriod(x),per);await p.waitForTimeout(400);console.log(per,'->',await lab());}
const pk=new Date(now.getFullYear(),now.getMonth()-3,1);const ym=pk.getFullYear()+'-'+String(pk.getMonth()+1).padStart(2,'0');
await p.evaluate(v=>setRefPeriod('pick',v),ym);await p.waitForTimeout(400);console.log('pick',ym,'->',await lab());
console.log('detail rows for picked month:',await p.evaluate(()=>{openRefDetail('d');return document.querySelectorAll('#refDetailBody tr, #refDetailList tr').length;}));
// accounting
await p.evaluate(()=>switchTab('expenses'));await p.waitForTimeout(2500);
for(const per of ['month','last','all']){await p.evaluate(x=>setAccPeriod(x),per);await p.waitForTimeout(400);console.log('acc',per,'label',await p.evaluate(()=>_periodLabel()),'|',await p.evaluate(()=>document.getElementById('accpanel-pl')?document.getElementById('accpanel-pl').innerText.replace(/\s+/g,' ').slice(0,140):''));}
await p.evaluate(v=>setAccPeriod('pick',v),ym);await p.waitForTimeout(400);console.log('acc pick',ym,await p.evaluate(()=>_periodLabel()));
for(const per of ['month','last']){await p.evaluate(x=>setAccPeriod(x),per);await p.waitForTimeout(500);console.log('KPI',per,await p.evaluate(()=>document.getElementById('panel-expenses').innerText.replace(/\s+/g,' ').match(/(INCOME|Income)[^A-Za-z]{0,3}£[\d.,]+|EXPENSES[^A-Za-z]{0,3}£[\d.,]+/g)));}
console.log('errs',errs.slice(0,4));await b.close();})();
