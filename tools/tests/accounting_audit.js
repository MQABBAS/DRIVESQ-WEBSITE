const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:1200}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const now=new Date(),dt=(mo,day)=>new Date(now.getFullYear(),now.getMonth()-mo,day,12);const ds=d=>d.toISOString().slice(0,10);
const R=(id,ph,created,o={})=>Object.assign({id,instructor_id:'d',student_name:'S'+id,student_phone:ph,created_at:created.toISOString(),amount:25,is_paid:false,is_cancelled:false,is_credit:false,flag_color:'green',admin_notes:'1 Nov 2026 · ✅ Booked — confirmed by admin'},o);
const refs=[
 R(1,'07700000001',dt(2,10),{is_paid:true,paid_at:dt(1,5).toISOString()}),   // created 2 months ago, PAID last month -> counts LAST month (cash basis)
 R(2,'07700000002',dt(1,12),{is_paid:true,paid_at:dt(1,20).toISOString()}),  // last month
 R(3,'07700000003',dt(0,2),{is_paid:true,paid_at:dt(0,3).toISOString()}),    // this month
 R(4,'07700000004',dt(1,15),{amount:0}),                                      // booked, no fee -> issue
 R(5,'07700000005',dt(1,16),{is_paid:true,paid_at:null}),                     // paid no date -> issue
 R(6,'07700000006',dt(1,17),{is_paid:true,paid_at:dt(1,18).toISOString(),flag_color:null,admin_notes:''}), // paid not confirmed -> issue
 R(7,'07700000007',dt(1,18)),R(8,'07700000007',dt(1,19)),                      // duplicate
 R(9,'',dt(1,20)),                                                              // no phone
 R(10,'07700000010',dt(1,21),{is_cancelled:true}),
 R(11,'07700000011',dt(1,22),{instructor_id:'f',amount:25}),                    // franchise with fee -> issue
];
const led=[{id:'b1',student_name:'Sara',student_account_id:'acc1',instructor_id:'d',kind:'purchase',hours:10,amount:330,paid_to:'drivesq',entry_date:ds(dt(1,8)),created_at:dt(1,8).toISOString()},
 {id:'b2',student_name:'Sara',student_account_id:'acc1',instructor_id:'d',kind:'lesson',hours:-2,amount:-66,entry_date:ds(dt(1,9)),lesson_date:ds(dt(1,9)),payout_status:'released',payout_amount:60,payout_date:ds(dt(1,10)),created_at:dt(1,9).toISOString()},
 {id:'b3',student_name:'Zed',instructor_id:null,kind:'purchase',hours:10,amount:300,paid_to:'drivesq',entry_date:ds(dt(1,11)),created_at:dt(1,11).toISOString()},
 {id:'b4',student_name:'Direct',instructor_id:'d',kind:'purchase',hours:5,amount:175,paid_to:'instructor',entry_date:ds(dt(1,12)),created_at:dt(1,12).toISOString()}];
const wlRows=[{id:'w1',student_name:'NoSource Nina',student_phone:'07711111111',status:'waiting',notes:'[WEB]\nEmail: n@x.com',created_at:dt(0,1).toISOString()},{id:'w2',student_name:'Assigned Ali',student_phone:'07722222222',status:'assigned',assigned_instructor_id:'d',notes:'[WEB]\nSource: Google search',created_at:dt(0,1).toISOString()},{id:'w3',student_name:'S1',student_phone:'07700000001',status:'assigned',notes:'[WEB]\nSource: Google Ads',created_at:dt(0,1).toISOString()}];
const lessonRows=[{id:'L1',instructor_id:'d',student_name:'Taught Tom',lesson_date:ds(dt(0,1)),duration_hours:1},{id:'L2',instructor_id:'d',student_name:'S1',lesson_date:ds(dt(0,1)),duration_hours:1}];
const DB={waiting_list:wlRows,lessons:lessonRows,instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',instructor_model:'referral'},{id:'f',full_name:'Fran Chise',status:'approved',instructor_model:'franchise'}],referrals:refs,student_credit_ledger:led,
 expenses:[{id:'e1',expense_date:ds(dt(1,5)),amount:100,category:'Fuel'}],income_entries:[{id:'i1',income_date:ds(dt(1,6)),amount:50,category:'Cash Payment'}]};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];if(t==='student_credit_history')return r.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'42P01',message:'relation "public.student_credit_history" does not exist'})});const rows=DB[t]||[];if(req.method()!=='GET')return r.fulfill({status:204,body:''});const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows.slice(off,off+lim))});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(8000);
await p.evaluate(()=>switchTab('referrals'));await p.waitForTimeout(1500);
await p.evaluate(()=>switchTab('expenses'));await p.waitForTimeout(3000);
const kpi=async()=>p.evaluate(()=>['kpi-income','kpi-expenses','kpi-profit','kpi-income-sub','kpi-expenses-sub'].map(i=>i+'='+document.getElementById(i).textContent).join(' | '));
const exp={};
await p.evaluate(()=>setAccPeriod('last'));await p.waitForTimeout(500);console.log('LAST MONTH:',await kpi());
// expected last month: referrals paid last month: #1 25 + #2 25 + #5 25 (no date -> created last month) + #6 25 = 100 ; manual 50 ; blocks 330+300 = 630 ; income 780. expenses 100 + payout 60 = 160 ; profit 620
await p.evaluate(()=>setAccPeriod('month'));await p.waitForTimeout(500);console.log('THIS MONTH:',await kpi(),'(expect income 25)');
await p.evaluate(()=>setAccPeriod('last'));await p.evaluate(()=>setAccTab('audit'));await p.waitForTimeout(700);
const txt=await p.evaluate(()=>document.getElementById('accAuditBody').innerText.replace(/\s+/g,' '));
console.log('AUDIT:',txt.slice(0,1400));
console.log('badge:',await p.evaluate(()=>document.getElementById('auditBadge').textContent));
await p.evaluate(()=>{localStorage.setItem('dsq_acc_blocks','0');renderAccounting();});await p.waitForTimeout(400);console.log('BLOCKS OFF:',await kpi());
await p.evaluate(()=>{localStorage.removeItem('dsq_acc_blocks');renderAccounting();setAccTab('pl')});await p.waitForTimeout(500);
console.log('P&L table row (last month):',await p.evaluate(()=>[...document.querySelectorAll('#plTableBody tr')].slice(0,3).map(r=>r.innerText.replace(/\s+/g,' ').slice(0,90))));
await p.evaluate(()=>setAccTab('taxsum'));await p.waitForTimeout(400);console.log('tax gross income cards:',await p.evaluate(()=>(document.getElementById('taxSummaryContent').innerText.match(/Gross Income\s*£[\d.,]+/g)||[]).join(' | ')));
console.log('GAPS:',await p.evaluate(()=>document.getElementById('accGapBody').innerText.replace(/\s+/g,' ').slice(0,1500)));
console.log('errs',errs.slice(0,4));await b.close();})();
