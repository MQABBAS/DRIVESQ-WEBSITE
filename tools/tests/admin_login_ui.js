const {chromium}=require('playwright');const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const JWT=b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({sub:'u1',role:'authenticated',email:'admin-x@admin.drivesq.co.uk',app_metadata:{role:'admin'},exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})+'.sig';(async()=>{const b=await chromium.launch();let f=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)f++};
async function run(mode){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));let adminsRead=0,fnCalls=[];
 await p.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});
  if(u.pathname.endsWith('/functions/v1/admin-login')){const bd=r.request().postDataJSON();fnCalls.push(bd);if(mode==='missing')return r.fulfill({status:404,body:'{}'});
   const good=bd.password==='right';return r.fulfill({status:good?200:401,contentType:'application/json',body:JSON.stringify(good?{ok:true,email:bd.email,session:mode==='nosess'?null:{access_token:JWT,refresh_token:'rt',expires_in:3600}}:{ok:false,error:'Incorrect password.'})});}
  if(u.pathname.includes('/auth/v1/user'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'u1',aud:'authenticated',role:'authenticated',email:'admin-x@admin.drivesq.co.uk',app_metadata:{role:'admin'}})});
  if(u.pathname.startsWith('/rest/v1/admins')){adminsRead++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({email:'a@a.com',password_hash:Buffer.from('right').toString('base64')})});}
  if(u.pathname.startsWith('/rest/v1/'))return r.fulfill({status:200,contentType:'application/json',body:'[]'});
  if(u.pathname.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
  return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
 await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 await p.fill('#adminEmail','a@a.com');await p.fill('#adminPass','nope');await p.click('#loginBtn');await p.waitForTimeout(900);
 const err1=await p.evaluate(()=>document.getElementById('loginErr').textContent);
 await p.fill('#adminPass','right');await p.click('#loginBtn');await p.waitForTimeout(1500);
 const sess=await p.evaluate(()=>localStorage.getItem('dsq_admin_session'));const flag=await p.evaluate(()=>localStorage.getItem('dsq_admin_sbsess'));const hasTok=await p.evaluate(()=>Object.keys(localStorage).some(k=>/sb-.*auth-token/.test(k)));
 await p.close();return{flag,hasTok,err1,sess,adminsRead,fnCalls,errs};}
let r=await run('live');ok(/Incorrect/.test(r.err1),'wrong password shows the server message');ok(!!r.sess,'right password signs in');ok(r.adminsRead===0,'browser never reads the admins table when the function is live');ok(r.fnCalls.length===2,'function called each time');
ok(r.flag==='1'&&r.hasTok,'admin session stored in the browser');r=await run('nosess');ok(!!r.sess&&r.flag===null,'works without a session if the function could not make one');r=await run('missing');ok(!!r.sess,'falls back to old check only while the function is not deployed');ok(r.adminsRead>0,'(fallback read confirmed)');
{const p=await b.newPage();await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.href.includes('supabase-js'))return r.fulfill({path:'/tmp/claude-0/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'});if(u.pathname.startsWith('/rest/v1/'))return r.fulfill({status:200,contentType:'application/json',body:'[]'});return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
 await p.addInitScript(()=>{localStorage.setItem('dsq_admin_session',JSON.stringify({ok:true,ts:Date.now(),email:'a@a'}));localStorage.setItem('dsq_admin_sbsess','1');});
 await p.goto('http://localhost:8765/admin.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(3000);
 const gone=await p.evaluate(()=>localStorage.getItem('dsq_admin_session'));ok(gone===null,'returning admin with no stored session is sent back to sign in');await p.close();}
console.log(f?'FAILED':'ALL PASS');await b.close();})();
