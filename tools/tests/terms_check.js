const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:1400}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/terms.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1500);
const t=await p.evaluate(()=>({s2:document.getElementById('s2').innerText.replace(/\s+/g,' ').slice(0,420),s3:document.getElementById('s3').innerText.replace(/\s+/g,' ').slice(0,520),s11:document.getElementById('s11').innerText.replace(/\s+/g,' ').slice(0,520),upd:document.getElementById('lastUpdated').innerText,toc:[...document.querySelectorAll('a[href^="#s"]')].map(a=>a.getAttribute('href')).filter((v,i,a)=>a.indexOf(v)===i).length}));
console.log(JSON.stringify(t,null,1));await p.locator('#s11').screenshot({path:'/tmp/claude-0/terms11.png'});
// forms carry the terms note
await p.goto('http://localhost:8765/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);console.log('home form note:',await p.evaluate(()=>!!document.querySelector('.dsq-terms-note')));
await p.goto('http://localhost:8765/female-driving-instructors-didsbury-m20.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
await p.evaluate(()=>{const g=document.querySelector('[data-gear]');if(g)g.click();});await p.waitForTimeout(300);
console.log('errors:',errs.join('|')||'none');await b.close();})();
