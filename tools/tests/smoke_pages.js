const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();const files=fs.readdirSync('../..').filter(f=>f.endsWith('.html')&&!/^admin|^dashboard|^student|^confirm|^404/.test(f));
const pick=[];const rnd=(()=>{let s=7;return()=>(s=s*16807%2147483647)/2147483647})();while(pick.length<45)pick.push(files[Math.floor(rnd()*files.length)]);
['index.html','terms.html','female-driving-instructor-manchester.html','female-driving-instructors-didsbury-m20.html','driving-lessons-altrincham.html'].forEach(f=>pick.push(f));
const ctx=await b.newContext({viewport:{width:1100,height:1200}});let bad=0,noPref=0,withForm=0;
for(const f of [...new Set(pick)]){const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='localhost'?r.continue():r.fulfill({status:200,contentType:u.pathname.endsWith('.js')?'application/javascript':'text/plain',body:''});});
 await p.goto('http://localhost:8765/'+f,{waitUntil:'domcontentloaded'}).catch(()=>{});await p.waitForTimeout(1800);
 const info=await p.evaluate(()=>({forms:[...document.querySelectorAll('form')].filter(x=>x.querySelector('[name=phone],[name=tel]')&&!/join/i.test(x.id||'')&&!x.querySelector('[name=areas]')).length,pref:document.querySelectorAll('.dsq-pref-sel').length,terms:document.querySelectorAll('.dsq-terms-note').length}));
 const e=errs.filter(x=>!/Chart|ResizeObserver|Script error|is not defined: (bootstrap|gtag|dataLayer)/.test(x));
 if(info.forms){withForm++;if(!info.pref||!info.terms){noPref++;console.log('NO pref/terms box:',f,JSON.stringify(info));}}
 if(e.length){bad++;console.log('ERR',f,e.slice(0,2).join(' | ').slice(0,160));}
 await p.close();}
console.log('pages checked:',new Set(pick).size,'| with a learner form:',withForm,'| missing pref/terms box:',noPref,'| pages with JS errors:',bad);await b.close();})();
