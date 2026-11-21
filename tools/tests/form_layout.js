const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();const files=fs.readdirSync('../..').filter(f=>f.endsWith('.html')&&!/^admin|^dashboard|^student|^confirm|^404/.test(f));
let s=11;const rnd=()=>(s=s*16807%2147483647)/2147483647;const pick=['index.html','driving-lessons-altrincham.html'];while(pick.length<30)pick.push(files[Math.floor(rnd()*files.length)]);
const ctx=await b.newContext({viewport:{width:1000,height:1100}});const odd={};let n=0;
for(const f of [...new Set(pick)]){const p=await ctx.newPage();await p.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
 await p.goto('http://localhost:8765/'+f,{waitUntil:'domcontentloaded'}).catch(()=>{});await p.waitForTimeout(1800);
 const r=await p.evaluate(()=>[...document.querySelectorAll('.dsq-pref')].map(e=>{const pa=e.parentElement,cs=getComputedStyle(pa);return{disp:cs.display,dir:cs.flexDirection,wrap:cs.flexWrap,cols:cs.gridTemplateColumns&&cs.gridTemplateColumns.split(' ').length,w:Math.round(e.getBoundingClientRect().width),pw:Math.round(pa.getBoundingClientRect().width)}}));
 r.forEach(x=>{n++;const key=x.disp+'/'+x.dir+'/'+x.wrap;(odd[key]=odd[key]||[]).push(f+' w'+x.w+'/'+x.pw);});await p.close();}
console.log('boxes:',n);Object.keys(odd).forEach(k=>console.log(k,odd[k].length,odd[k].slice(0,3).join(' ; ')));await b.close();})();
