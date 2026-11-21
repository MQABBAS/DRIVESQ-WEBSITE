const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:1500}});const errs=[];
const now=new Date(),ago=n=>new Date(now-n*864e5),iso=d=>d.toISOString(),ymd=d=>d.toISOString().slice(0,10);
const R=(id,ins,ph,created,o={})=>Object.assign({id:'r'+id,instructor_id:ins,student_name:'Student '+id,student_phone:ph,created_at:iso(created),amount:25,is_paid:false,is_cancelled:false,is_credit:false,flag_color:null,admin_notes:''},o);
const note=a=>({admin_notes:a});
const DB={instructors:[{id:'d',full_name:'Dawood Khan',status:'approved',instructor_model:'referral',phone:'07700900001',email:'d@x.com',badge:'1',type:'ADI'},{id:'f',full_name:'Fran Chise',status:'approved',instructor_model:'franchise',phone:'07700900002',email:'f@x.com',badge:'2',type:'ADI'}],
 referrals:[R('1','d','0771',ago(5)),R('2','d','0772',ago(5),{flag_color:'green',reply_status:'booked'}),R('3','d','0773',ago(5),{flag_color:'green',reply_status:'booked',admin_notes:'✅ Booked — confirmed by admin'}),R('4','d','0774',ago(5),{flag_color:'green'}),R('5','d','0775',ago(5),{is_paid:true,flag_color:'green'}),
  R('6','f','0776',ago(5)),R('7','f','0777',ago(5),{flag_color:'green',admin_notes:'✅ Booked — confirmed by admin'})],
 growth_settings:[{key:'packages',value:{by:{f:{tier:'normal',fee:50,active:true}},tiers:{}}}],instructor_weekly_fees:[],lessons:[],admin_activity_log:[]};let seq=1;
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
const rows=async p=>p.evaluate(()=>_refAllData.map(r=>r.student_name+': '+_refInfo(r).state+' £'+_refInfo(r).amt).join(' | '));
const D=await instrPage({id:'d',name:'Dawood Khan',full_name:'Dawood Khan',badge:'1',type:'ADI',phone:'07700900001',email:'d@x.com',status:'approved',instructor_model:'referral'});
await D.evaluate(()=>loadRefData());await D.waitForTimeout(1500);
console.log('REFERRAL instructor:',await rows(D));
console.log('  counters:',await D.evaluate(()=>document.getElementById('sReferrals').innerText+' | '+document.getElementById('sReferralsSub').innerText));
await D.evaluate(()=>loadEarningsTab());await D.waitForTimeout(1500);console.log('  earnings owed:',await D.evaluate(()=>document.getElementById('earnCharges').innerText));
const F=await instrPage({id:'f',name:'Fran Chise',full_name:'Fran Chise',badge:'2',type:'ADI',phone:'07700900002',email:'f@x.com',status:'approved',instructor_model:'franchise'});
await F.evaluate(()=>loadRefData());await F.waitForTimeout(1500);
console.log('FRANCHISE instructor:',await rows(F));
console.log('  counters:',await F.evaluate(()=>document.getElementById('sReferrals').innerText+' | '+document.getElementById('sReferralsSub').innerText));
await F.evaluate(()=>loadEarningsTab());await F.waitForTimeout(1500);console.log('  earnings owed:',await F.evaluate(()=>document.getElementById('earnCharges').innerText));
console.log('  package card:',await F.evaluate(()=>document.getElementById('homePkgCard').innerText.replace(/\s+/g,' ')));
await F.evaluate(()=>_renderRefTab());console.log('  card text has £25:',await F.evaluate(()=>/£25/.test(document.getElementById('refTabList').innerText)),'| tab text:',await F.evaluate(()=>document.getElementById('refTabList').innerText.replace(/\s+/g,' ').slice(0,260)));
console.log('errors:',errs.filter(e=>!/loadConfirmCard/.test(e)).join(' | ')||'none');await b.close();})();
