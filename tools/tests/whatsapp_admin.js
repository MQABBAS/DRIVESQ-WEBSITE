const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:1300}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
const now=new Date(),ds=d=>d.toISOString().slice(0,10);
const wkMon=d=>{const m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));return m};
const lastMon=new Date(wkMon(now)-7*864e5),thisMon=wkMon(now);const mk=(n,inst,wk)=>Array.from({length:n},(_,i)=>({id:inst+'r'+wk.getTime()+i,instructor_id:inst,student_name:'S'+inst+i,student_phone:'07'+inst.charCodeAt(0)+i,created_at:new Date(+wk+864e5*1+i*3e6).toISOString(),flag_color:'green',reply_status:'booked',admin_notes:'✅ Booked — confirmed by admin',is_cancelled:false,is_credit:false,is_paid:false}));
const start=ds(new Date(now-40*864e5));
const DB={growth_settings:[{key:'packages',value:{tiers:{},by:{d:{tier:'platinum',fee:null,min:null,start,active:true},g:{tier:'gold',fee:null,min:null,start,active:true},s:{tier:'silver',fee:null,min:null,start,active:true},n:{tier:'normal',fee:45,min:null,start,active:true}}}}],
 instructors:['d:Dawood Platinum','g:Gina Gold','s:Sam Silver','n:Nina Normal'].map(x=>({id:x.split(':')[0],full_name:x.split(':')[1],status:'approved',instructor_model:'referral',created_at:'2026-01-05T10:00:00Z'})),
 referrals:[{id:'u1',instructor_id:'g',student_name:'Unsure Ulla',student_phone:'0711',created_at:new Date(now-5*864e5).toISOString(),flag_color:'purple',admin_notes:'',is_cancelled:false,is_credit:false,is_paid:false},{id:'p1',instructor_id:'g',student_name:'Pending Pat',student_phone:'0712',created_at:new Date(now-12*864e5).toISOString(),flag_color:null,admin_notes:'',is_cancelled:false,is_credit:false,is_paid:false}].concat(mk(4,'d',lastMon),mk(4,'g',lastMon),mk(1,'s',lastMon),mk(2,'n',lastMon)),instructor_weekly_fees:[]};let seq=1;const WA=[];let WAST={ok:true,configured:{token:true,phone_id:true,verify_token:true,app_secret:true},ready:true,webhook_ready:true,phone:{display_phone_number:'+44 7700 900000',verified_name:'DriveSQ'},error:null};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
  if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];for(const x of bd){if(t==='instructor_weekly_fees'&&rows.some(y=>y.instructor_id===x.instructor_id&&y.week_start===x.week_start))return r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'23505',message:'duplicate key'})});if(t==='growth_settings'){const e=rows.find(y=>y.key===x.key);if(e){Object.assign(e,x);continue;}}rows.push(Object.assign({id:'id'+(seq++),created_at:new Date().toISOString()},x));}return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(m==='PATCH'){const id=(u.searchParams.get('id')||'').replace('eq.','');rows.filter(x=>String(x.id)===id).forEach(x=>Object.assign(x,req.postDataJSON()));return r.fulfill({status:204,body:''});}
  if(m!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));}
  const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);out=out.slice(off,off+lim);
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.pathname.endsWith('/functions/v1/whatsapp')){const bd=req.postDataJSON();WA.push(bd);if(bd.action==='status')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(WAST)});return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,id:'wamid.X',to:'44'})});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(8000);

await p.waitForTimeout(1500);
console.log('top-bar button:',await p.evaluate(()=>!!document.getElementById('waApiBtn')),'| dot colour (off):',await p.evaluate(()=>document.querySelector('#waApiBtn .wa-dot').style.background));
// settings: connected, switch OFF by default
await p.evaluate(()=>DSQWA.openSettings());await p.waitForTimeout(1500);
console.log('settings:',await p.evaluate(()=>document.getElementById('waSet').innerText.replace(/\s+/g,' ').slice(0,330)));
console.log('master default:',await p.evaluate(()=>document.getElementById('waMaster').checked));
// OFF: assign modal must show OFF and afterAssign must send nothing
await p.evaluate(()=>{document.getElementById('waSet').remove();openModal('assignModal');});await p.waitForTimeout(800);
console.log('assign modal (OFF):',await p.evaluate(()=>document.getElementById('waAutoBox').innerText.replace(/\s+/g,' ')));
const n0=WA.filter(x=>x.action==='send_template').length;
await p.evaluate(()=>DSQWA.afterAssign({refId:'r9',instrId:'d',instrName:'Dawood Khan',instrPhone:'07700 900111',student:{name:'Sara Khan',phone:'07700 900222',postcode:'M13 0PG',type:'Automatic',avail:'Evenings',addr:'1 Test St',notes:'Nervous'}}));await p.waitForTimeout(800);
console.log('sends while OFF:',WA.filter(x=>x.action==='send_template').length-n0);
// switch ON and save
await p.evaluate(()=>DSQWA.openSettings());await p.waitForTimeout(1200);
await p.evaluate(()=>{document.getElementById('waMaster').checked=true;DSQWA.saveSettings();});await p.waitForTimeout(800);
console.log('saved cfg row:',JSON.stringify(DB.growth_settings.find(x=>x.key==='whatsapp_cfg')&&DB.growth_settings.find(x=>x.key==='whatsapp_cfg').value),'| dot (on):',await p.evaluate(()=>document.querySelector('#waApiBtn .wa-dot').style.background));
await p.evaluate(()=>{document.getElementById('waSet')&&document.getElementById('waSet').remove();openModal('assignModal');});await p.waitForTimeout(800);
console.log('assign modal (ON):',await p.evaluate(()=>document.getElementById('waAutoBox').innerText.replace(/\s+/g,' ').slice(0,200)));
const arg={refId:'r9',instrId:'d',instrName:'Dawood Khan',instrPhone:'07700 900111',student:{name:'Sara Khan',phone:'07700 900222',postcode:'M13 0PG',type:'Automatic',avail:'Evenings',addr:'1 Test St',notes:'Nervous'}};
await p.evaluate(a=>DSQWA.afterAssign(a),arg);await p.waitForTimeout(1200);
const sent=WA.filter(x=>x.action==='send_template');console.log('sends while ON:',sent.length);
sent.forEach(x=>console.log('  ->',x.template,'to',x.to,'params',JSON.stringify(x.params).slice(0,160),'buttons',JSON.stringify(x.buttons||[])));
// untick student -> only instructor
WA.length=0;await p.evaluate(()=>{openModal('assignModal');});await p.waitForTimeout(700);
await p.evaluate(()=>{const e=document.getElementById('wa-auto-stu');if(e)e.checked=false;});
await p.evaluate(a=>DSQWA.afterAssign(a),arg);await p.waitForTimeout(1000);
console.log('with student unticked:',WA.filter(x=>x.action==='send_template').map(x=>x.template));
// not connected but ON -> nothing sent, warning
WAST={ok:true,configured:{token:false,phone_id:false},ready:false,error:null};await p.evaluate(()=>DSQWA.status(true));await p.waitForTimeout(500);WA.length=0;
await p.evaluate(()=>{openModal('assignModal');});await p.waitForTimeout(700);
await p.evaluate(a=>DSQWA.afterAssign(a),arg);await p.waitForTimeout(800);
console.log('not connected -> sends:',WA.filter(x=>x.action==='send_template').length,'| box:',await p.evaluate(()=>document.getElementById('waAutoBox').innerText.replace(/\s+/g,' ').slice(0,120)));
console.log('errs',errs.slice(0,4));await b.close();})();