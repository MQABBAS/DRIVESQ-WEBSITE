const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:1500}});const errs=[];
const now=new Date(),ago=n=>new Date(now-n*864e5),iso=d=>d.toISOString(),ymd=d=>d.toISOString().slice(0,10);
const R=(id,ins,ph,created,o={})=>Object.assign({id:'r'+id,instructor_id:ins,student_name:'Student '+id,student_phone:ph,created_at:iso(created),amount:25,is_paid:false,is_cancelled:false,is_credit:false,flag_color:null,admin_notes:''},o);
const DB={instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',instructor_model:'referral',phone:'07700900001',email:'d@x.com',badge:'1',type:'ADI'}],
 referrals:[R('1','d','07700000001',ago(2),{flag_color:'green',reply_status:'booked',admin_notes:'✅ Booked — confirmed by admin'}),R('2','d','07700000002',ago(5),{flag_color:'green',admin_notes:'✅ Booked — confirmed by instructor'}),R('3','d','07700000003',ago(9),{flag_color:'green',reply_status:'booked',is_paid:true})],
 instructor_weekly_fees:[],growth_settings:[],expenses:[],income_entries:[],admin_activity_log:[]};let seq=1;
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
const A=await ctx.newPage();A.on('pageerror',e=>errs.push('admin: '+e.message));A.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));await mock(A);
await A.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await A.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await A.waitForTimeout(8000);
await A.evaluate(()=>{editingInstr=allInstrs.find(i=>i.id==='d');openBlockModal&&openBlockModal('d');});await A.waitForTimeout(600);
await A.evaluate(()=>confirmBlock('d'));await A.waitForTimeout(600);
console.log('blocked with no reason? status =',DB.instructors[0].status,'(want approved)');
await A.evaluate(()=>{document.getElementById('block-reason').value='Fees unpaid after 3 reminders';document.getElementById('block-show-reason').checked=true;});
await A.evaluate(()=>confirmBlock('d'));await A.waitForTimeout(1200);
console.log('after block: status',DB.instructors[0].status,'| record',JSON.stringify((DB.growth_settings.find(g=>g.key==='instructor_blocks')||{}).value));
const P=await instrPage({id:'d',name:'Dawood Khan',full_name:'Dawood Khan',badge:'1',type:'ADI',phone:'07700900001',email:'d@x.com',status:'suspended',instructor_model:'referral'});
console.log('blocked dashboard text:',(await P.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,500));
await A.evaluate(()=>unblockInstr('d'));await A.waitForTimeout(1000);
console.log('after unblock: status',DB.instructors[0].status,'| record',JSON.stringify((DB.growth_settings.find(g=>g.key==='instructor_blocks')||{}).value));
console.log('errors:',errs.filter(e=>!/loadConfirmCard/.test(e)).join(' | ')||'none');await b.close();})();
