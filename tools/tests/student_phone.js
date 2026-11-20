const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];
const stored=['+44 7700 900 123','07700900123','0044 7700-900-123','+44(0)7700 900123','(07700) 900 123','44 7700 900123','7700900123'];
const tries=['07700900123','+447700900123','+44 7700 900123','07700 900 123','447700900123','0044 7700900123','7700900123'];
let bad=0;
for(const st of stored){
  const p=await b.newPage();p.on('pageerror',e=>errs.push(e.message));
  const DB={student_accounts:[{id:'a1',instructor_id:'i1',full_name:'Stu Dent',phone:st,status:'active',student_code:'X'}],lessons:[],student_profiles:[]};
  await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
    if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});
    if(u.pathname.startsWith('/rest/v1/')){const t=u.pathname.split('/')[3];let rows=(DB[t]||[]).slice();const m=req.method();
      if(m!=='GET')return r.fulfill({status:200,contentType:'application/json',body:'[]'});
      for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;
        if(v.startsWith('eq.'))rows=rows.filter(x=>String(x[k])===v.slice(3));
        else if(v.startsWith('in.')){const l=v.slice(4,-1).split(',').map(z=>z.replace(/^"|"$/g,''));rows=rows.filter(x=>l.includes(String(x[k])));}
        else if(v.startsWith('ilike.')){const re=new RegExp('^'+v.slice(6).replace(/[.+()\[\]{}^$|\\]/g,'\\$&').replace(/%/g,'.*')+'$','i');rows=rows.filter(x=>re.test(String(x[k]||'')));}}
      const single=(req.headers()['accept']||'').includes('pgrst.object');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?(rows[0]||null):rows)});}
    return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
  await p.goto('http://localhost:8765/student.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);
  const res=[];
  for(const t of tries){
    const ok=await p.evaluate(async(t)=>{try{localStorage.clear();}catch(e){}
      showView('loginView');document.getElementById('loginPhone').value=t;
      await doLogin();await new Promise(r=>setTimeout(r,600));
      const err=document.getElementById('loginErr');return !(err&&!err.classList.contains('hidden'))&&!!(window.currentStudent||localStorage.getItem('dsq_student')||document.getElementById('authScreen').classList.contains('hidden'));},t).catch(e=>'ERR '+e.message.slice(0,60));
    res.push(ok===true?'✓':'✗'); if(ok!==true)bad++;
    await p.evaluate(()=>{try{location.reload}catch(e){}});
  }
  console.log(st.padEnd(22),res.join(' '));await p.close();
}
console.log('failures:',bad,'| errs',errs.slice(0,3));await b.close();})();
