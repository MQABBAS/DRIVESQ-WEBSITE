const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:1300}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
const now=new Date(),ds=d=>d.toISOString().slice(0,10);
const wkMon=d=>{const m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));return m};
const lastMon=new Date(wkMon(now)-7*864e5),thisMon=wkMon(now);const mk=(n,inst,wk)=>Array.from({length:n},(_,i)=>({id:inst+'r'+wk.getTime()+i,instructor_id:inst,student_name:'S'+inst+i,student_phone:'07'+inst.charCodeAt(0)+i,created_at:new Date(+wk+864e5*1+i*3e6).toISOString(),flag_color:'green',reply_status:'booked',admin_notes:'✅ Booked — confirmed by admin',is_cancelled:false,is_credit:false,is_paid:false}));
const start=ds(new Date(now-40*864e5));
const DB={growth_settings:[{key:'packages',value:{tiers:{},by:{d:{tier:'platinum',fee:null,min:null,start,active:true},g:{tier:'gold',fee:null,min:null,start,active:true},s:{tier:'silver',fee:null,min:null,start,active:true},n:{tier:'normal',fee:45,min:null,start,active:true}}}}],
 instructors:['d:Dawood Platinum','g:Gina Gold','s:Sam Silver','n:Nina Normal'].map(x=>({id:x.split(':')[0],full_name:x.split(':')[1],status:'approved',instructor_model:'referral',created_at:'2026-01-05T10:00:00Z'})),
 referrals:[{id:'u1',instructor_id:'g',student_name:'Unsure Ulla',student_phone:'0711',created_at:new Date(now-5*864e5).toISOString(),flag_color:'purple',admin_notes:'',is_cancelled:false,is_credit:false,is_paid:false},{id:'p1',instructor_id:'g',student_name:'Pending Pat',student_phone:'0712',created_at:new Date(now-12*864e5).toISOString(),flag_color:null,admin_notes:'',is_cancelled:false,is_credit:false,is_paid:false}].concat(mk(4,'d',lastMon),mk(4,'g',lastMon),mk(1,'s',lastMon),mk(2,'n',lastMon)),instructor_weekly_fees:[],admin_attention:[{id:'a1',kind:'no_match',title:'Attention: no match for Far Fred (PR1 1AA)',detail:'nearest suitable instructor is 16.6 miles away',waiting_id:'w9',resolved:false,created_at:new Date().toISOString()},{id:'a2',kind:'declined_after',title:"Attention: Dawood Platinum can't cover Near Nora",detail:'They were already assigned.',referral_id:'r1',instructor_id:'d',resolved:false,created_at:new Date(Date.now()-3600e3).toISOString()}],waiting_list:[{id:'w9',student_name:'Far Fred',student_phone:'07700900111',postcode:'PR1 1AA',lesson_type:'Manual',status:'waiting',notes:'[WEB] Email: f@x.com',created_at:new Date().toISOString()}],auto_assign_jobs:[{id:'j1',waiting_id:'w9',state:'attention'}]};let seq=1;const WA=[];let WAST={ok:true,configured:{token:true,phone_id:true,verify_token:true,app_secret:true},ready:true,webhook_ready:true,phone:{display_phone_number:'+44 7700 900000',verified_name:'DriveSQ'},error:null};
await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.href.includes('chart.js'))return r.fulfill({path:'/tmp/claude-0/node_modules/chart.js/dist/chart.umd.js',contentType:'application/javascript'});
 if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];const rows=DB[t]=DB[t]||[];const m=req.method();const single=(req.headers()['accept']||'').includes('pgrst.object');
  if(m==='POST'){let bd=req.postDataJSON();bd=Array.isArray(bd)?bd:[bd];for(const x of bd){if(t==='instructor_weekly_fees'&&rows.some(y=>y.instructor_id===x.instructor_id&&y.week_start===x.week_start))return r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'23505',message:'duplicate key'})});if(t==='growth_settings'){const e=rows.find(y=>y.key===x.key);if(e){Object.assign(e,x);continue;}}rows.push(Object.assign({id:'id'+(seq++),created_at:new Date().toISOString()},x));}return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(m==='PATCH'){const id=(u.searchParams.get('id')||'').replace('eq.','');rows.filter(x=>String(x.id)===id).forEach(x=>Object.assign(x,req.postDataJSON()));return r.fulfill({status:204,body:''});}
  if(m!=='GET')return r.fulfill({status:204,body:''});
  let out=rows.slice();for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(v.startsWith('eq.'))out=out.filter(x=>String(x[k])===v.slice(3));}
  const off=+(u.searchParams.get('offset')||0),lim=Math.min(+(u.searchParams.get('limit')||1000),1000);out=out.slice(off,off+lim);
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(out[0]||null):out)});}
 if(u.pathname.endsWith('/functions/v1/whatsapp')){const bd=req.postDataJSON();WA.push(bd);if(bd.action==='auto_assign'&&bd.dry)return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,dry:true,results:[{student:'Near Nora',postcode:'M13 9AA',action:'assign',instructor:'Dawood',dist:0.4,score:61.2,top:[{name:'Dawood',dist:0.4,score:61.2},{name:'Sara',dist:2.8,score:40}]},{student:'Far Fred',postcode:'PR1 1AA',action:'attention',reason:'nearest suitable instructor is 16.6 miles away'}]})});if(bd.action==='auto_assign')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,summary:{assigned:1,offered:0,attention:1},results:[]})});if(bd.action==='status')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(WAST)});return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,id:'wamid.X',to:'44'})});}
 if(u.href.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
await p.addInitScript(()=>{localStorage.setItem('dsqm_key',JSON.stringify('k'));localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'t@t'}));});
await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(8000);

await p.waitForTimeout(2500);
console.log('attention badge:',await p.evaluate(()=>{const b=document.getElementById('attnBtn');return b?b.innerText+' | visible='+(getComputedStyle(b).display!=='none'):'NONE'}));
await p.evaluate(()=>{localStorage.removeItem('dsq_attn_seen');});await p.evaluate(()=>{window.__seenReset=1;});
console.log('toast on first load:',await p.evaluate(()=>/Attention required/i.test(document.body.innerText)));
await p.evaluate(()=>DSQAA.openAttention());await p.waitForTimeout(1200);
console.log('modal:',await p.evaluate(()=>document.getElementById('attnModal').innerText.replace(/\s+/g,' ').slice(0,420)));
// Open in Find & Assign
await p.evaluate(()=>{window.__wa=null;window.waitlistAssign=function(){window.__wa=[].slice.call(arguments).slice(0,5);};});
await p.evaluate(()=>DSQAA.openBooking('w9','a1'));await p.waitForTimeout(1000);
console.log('Find&Assign opened with:',JSON.stringify(await p.evaluate(()=>window.__wa)));
// resolve a2
await p.evaluate(()=>DSQAA.openAttention());await p.waitForTimeout(800);
await p.evaluate(()=>DSQAA.resolve('a2'));await p.waitForTimeout(600);
console.log('after resolve a2: count',await p.evaluate(()=>DSQAA._att().length),'| row resolved in DB:',DB.admin_attention.find(x=>x.id==='a2').resolved);
// retry a1 -> deletes the job and resolves
await p.evaluate(()=>DSQAA.retry('w9','a1'));await p.waitForTimeout(800);
console.log('after retry: badge hidden:',await p.evaluate(()=>getComputedStyle(document.getElementById('attnBtn')).display==='none'));
// settings: auto-assign block
await p.evaluate(()=>DSQWA.openSettings('auto'));await p.waitForTimeout(2000);
await p.evaluate(()=>DSQAA.readiness());await p.waitForTimeout(1500);
console.log('readiness:',await p.evaluate(()=>document.getElementById('aaOut').innerText.replace(/\s+/g,' ').slice(0,900)));
console.log('errs',errs.slice(0,4));await b.close();})();