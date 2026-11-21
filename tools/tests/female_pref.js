const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:1400}});const errs=[];let posts=[];
const mk=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route('**/*',async r=>{const req=r.request(),u=new URL(req.url());
 if(u.href.includes('/rest/v1/waiting_list')&&req.method()==='POST'){posts.push(JSON.parse(req.postData()||'{}'));return r.fulfill({status:201,body:''});}
 if(u.hostname==='formspree.io'||u.hostname.includes('functions')||u.pathname.includes('/functions/'))return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
 return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});return p;};
const fill=async(p,pc)=>{await p.evaluate((pc)=>{const f=document.querySelector('#dsqInlineBookForm')||document.querySelector('form[aria-label="Lesson booking form"]');const set=(n,v)=>{const e=f.querySelector('[name="'+n+'"]');if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};set('name','Pref Test');set('phone','07700900123');set('email','p@x.com');set('postcode',pc);const sv=f.querySelector('[name="service"]');if(sv){const o=[...sv.options].find(x=>x.value);if(o){sv.value=o.value;sv.dispatchEvent(new Event('change',{bubbles:true}));}}const t=f.querySelector('[name="times"]');if(t)t.checked=true;},pc);};
// 1. area page: choose 'female preferred' in the form, then submit
let p=await mk();await p.goto('http://localhost:8765/driving-lessons-altrincham.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
console.log('1. preference box shown:',await p.evaluate(()=>!!document.querySelector('#dsqInlineBookForm .dsq-pref-sel')),'| default:',await p.evaluate(()=>document.querySelector('.dsq-pref-sel')&&document.querySelector('.dsq-pref-sel').value));
await p.evaluate(()=>{const e=document.querySelector('#dsqInlineBookForm .dsq-pref-sel');e.value='prefer';e.dispatchEvent(new Event('change',{bubbles:true}));});await fill(p,'WA14 2AA');await p.evaluate(()=>{const f=document.querySelector('#dsqInlineBookForm');f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));});await p.waitForTimeout(2500);
console.log('   form message:',await p.evaluate(()=>(document.querySelector('.dsq-form-err')||document.querySelector('#dsqInlineBookMsg')||{innerText:''}).innerText.slice(0,160)),'| fields:',await p.evaluate(()=>[...document.querySelectorAll('#dsqInlineBookForm [name]')].map(e=>e.name+(e.required?'*':'')+(e.type==='checkbox'?'(cb)':'')).join(',')));console.log('   saved notes contain:',(posts.map(x=>x.notes||'').join('|').match(/FEMALE[A-Z ]+/)||['(none)'])[0],'| posts:',posts.length);
// 2. only-female
posts=[];p=await mk();await p.goto('http://localhost:8765/driving-lessons-altrincham.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
await p.evaluate(()=>{const e=document.querySelector('#dsqInlineBookForm .dsq-pref-sel');e.value='require';e.dispatchEvent(new Event('change',{bubbles:true}));});await fill(p,'WA14 2AA');await p.evaluate(()=>{const f=document.querySelector('#dsqInlineBookForm');f.requestSubmit?f.requestSubmit():0;});await p.waitForTimeout(2500);
console.log('2. female only ->',(posts.map(x=>x.notes||'').join('|').match(/FEMALE[A-Z ]+/)||['(none)'])[0]);
// 3. no preference -> nothing added
posts=[];p=await mk();await p.goto('http://localhost:8765/driving-lessons-altrincham.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
await fill(p,'WA14 2AA');await p.evaluate(()=>{const f=document.querySelector('#dsqInlineBookForm');f.requestSubmit?f.requestSubmit():0;});await p.waitForTimeout(2500);
console.log('3. no preference ->',(posts.map(x=>x.notes||'').join('|').match(/FEMALE[A-Z ]+/)||['(nothing added)'])[0],'| posts:',posts.length);
// 4. landing on a female page sets 'preferred' by itself; the main-site form on another page of the same visit keeps it
posts=[];p=await mk();await p.goto('http://localhost:8765/female-driving-instructors-didsbury-m20.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
console.log('4. after visiting a female page, stored preference:',await p.evaluate(()=>sessionStorage.getItem('dsq_instr_pref')));
await p.goto('http://localhost:8765/driving-lessons-altrincham.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
console.log('   on another page the box already says:',await p.evaluate(()=>document.querySelector('#dsqInlineBookForm .dsq-pref-sel').value));
await fill(p,'WA14 2AA');await p.evaluate(()=>{const f=document.querySelector('#dsqInlineBookForm');f.requestSubmit?f.requestSubmit():0;});await p.waitForTimeout(2500);
console.log('   saved ->',(posts.map(x=>x.notes||'').join('|').match(/FEMALE[A-Z ]+/)||['(none)'])[0]);
// 5. clicking a link to a female page
posts=[];p=await mk();await p.goto('http://localhost:8765/index.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2000);
const link=await p.evaluate(()=>{const a=document.querySelector('a[href*="female-driving-instructor"]');if(!a)return null;a.addEventListener('click',e=>e.preventDefault());a.click();return a.getAttribute('href')});
console.log('5. clicked female link',link,'-> stored:',await p.evaluate(()=>sessionStorage.getItem('dsq_instr_pref')));
console.log('errors:',errs.filter(e=>!/Chart|ResizeObserver/.test(e)).join(' | ')||'none');await b.close();})();
