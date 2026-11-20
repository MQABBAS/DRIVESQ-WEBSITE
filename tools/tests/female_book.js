const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];
const posts=[];
for(const vp of [{width:1280,height:900,name:'desktop'},{width:390,height:844,name:'mobile'}]){
 const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
  if(u.hostname.includes('supabase.co')||u.hostname.includes('formspree')){if(req.method()==='POST')posts.push({url:u.pathname,body:req.postData()});return r.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(u.hostname==='localhost')return r.continue();return r.fulfill({status:200,body:''});});
 await p.goto('http://localhost:8765/female-driving-instructors-longsight-m12.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);
 console.log(vp.name,'form position before first h2:',await p.evaluate(()=>{const f=document.getElementById('dsqFemBook'),h=document.querySelector('h2');return !!(f.compareDocumentPosition(h)&Node.DOCUMENT_POSITION_FOLLOWING)}),'| title:',await p.title());
 // validation: next with empty
 await p.click('[data-go="2"]');console.log('  empty step1 error:',await p.evaluate(()=>(document.querySelector('#dsqFemBook .err')||{}).textContent));
 await p.fill('[name=name]','Sara Khan');await p.fill('[name=phone]','07700 900123');await p.fill('[name=email]','sara@example.com');await p.click('[data-go="2"]');
 await p.click('[data-gear="Automatic"]');await p.click('[data-pref="Female preferred"]');await p.selectOption('[name=exp]','Nervous driver, want a gentle start');await p.selectOption('[name=start]','Within 2 weeks');await p.click('[data-go="3"]');
 await p.fill('[name=pc]','m13 0pg');await p.click('.chip[data-t="Evenings"]');await p.fill('[name=notes]','Prefer after 6pm');
 await p.click('[data-send]');console.log('  no-consent error:',await p.evaluate(()=>(document.querySelector('#dsqFemBook .err')||{}).textContent));
 await p.check('[name=ok]');await p.click('[data-send]');await p.waitForTimeout(2500);
 console.log('  done screen:',await p.evaluate(()=>document.getElementById('dsqFemBook').innerText.replace(/\s+/g,' ').slice(0,200)));
 await p.screenshot({path:`/tmp/claude-0/dt/female-${vp.name}.png`,fullPage:false});
 await p.close();}
const wl=posts.find(x=>/waiting_list/.test(x.url));console.log('payload to waiting_list:',wl?wl.body.slice(0,700):'NONE');
console.log('errs',errs.slice(0,3));await b.close();})();
