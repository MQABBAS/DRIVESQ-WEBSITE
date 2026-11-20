const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1366,height:1300}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
const now=new Date(),ds=d=>d.toISOString().slice(0,10);
const old=n=>new Date(now-n*864e5).toISOString();const R=(id,ins,age,flag,reply)=>({id,instructor_id:ins,student_name:'St '+id,student_phone:'07'+id,created_at:old(age),flag_color:flag||null,reply_status:reply||null,admin_notes:'',is_cancelled:false,is_credit:false,is_paid:false});
const wkMon=d=>{const m=new Date(d);m.setHours(12,0,0,0);m.setDate(m.getDate()-((m.getDay()+6)%7));return m};
const lastMon=new Date(wkMon(now)-7*864e5),thisMon=wkMon(now);const mk=(n,inst,wk)=>Array.from({length:n},(_,i)=>({id:inst+'r'+wk.getTime()+i,instructor_id:inst,student_name:'S'+inst+i,student_phone:'07'+inst.charCodeAt(0)+i,created_at:new Date(+wk+864e5*1+i*3e6).toISOString(),flag_color:'green',reply_status:'booked',admin_notes:'✅ Booked — confirmed by admin',is_cancelled:false,is_credit:false,is_paid:false}));
const start=ds(new Date(now-40*864e5));
const DB={growth_settings:[{key:'packages',value:{tiers:{},by:{d:{tier:'platinum',fee:null,min:null,start,active:true},g:{tier:'gold',fee:null,min:null,start,active:true},s:{tier:'silver',fee:null,min:null,start,active:true},n:{tier:'normal',fee:45,min:null,start,active:true}}}}],
 instructors:['d:Dawood Platinum','g:Gina Gold','s:Sam Silver','n:Nina Normal'].map(x=>({id:x.split(':')[0],full_name:x.split(':')[1],status:'approved',instructor_model:'referral',created_at:'2026-01-05T10:00:00Z'})),
 referrals:[].concat(Array.from({length:9},(_,i)=>R('d'+i,'d',10+i)),Array.from({length:6},(_,i)=>R('g'+i,'g',8+i,i<5?'red':null)),Array.from({length:5},(_,i)=>R('s'+i,'s',9+i,i<2?'purple':null,i<2?'later':null)),Array.from({length:3},(_,i)=>R('n'+i,'n',1))),instructor_weekly_fees:[]};let seq=1;
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

await p.waitForTimeout(500);
await p.evaluate(()=>{_adminStudentCtx={accId:null,profileId:null,instrId:'d',name:'St d3'};});
await p.evaluate(()=>switchTab('students'));await p.waitForTimeout(500);
await p.evaluate(()=>adminOpenStudentReferral());await p.waitForTimeout(3000);
console.log('student->Referrals:',JSON.stringify(await p.evaluate(()=>({tab:!document.getElementById('panel-referrals').classList.contains('hidden'),search:document.getElementById('refSearch').value,label:document.getElementById('refPeriodLabel').innerText.slice(0,70),cards:document.getElementById('refInstrList').children.length,cardText:document.getElementById('refInstrList').innerText.replace(/\s+/g,' ').slice(0,90),modal:document.getElementById('refDetailInstrName').textContent+' '+document.getElementById('refDetailSub').innerText.slice(0,40)}))));
await p.evaluate(()=>{closeModal&&closeModal('refDetailModal');_adminStudentCtx={accId:null,profileId:null,instrId:null,name:'St s2'};});
await p.evaluate(()=>adminOpenStudentReferral());await p.waitForTimeout(2500);
console.log('no instructor on record:',JSON.stringify(await p.evaluate(()=>({search:document.getElementById('refSearch').value,cards:document.getElementById('refInstrList').children.length,cardText:document.getElementById('refInstrList').innerText.replace(/\s+/g,' ').slice(0,60)}))));
console.log('errs',errs.slice(0,4));await b.close();})();