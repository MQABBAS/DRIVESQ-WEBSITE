const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const errs=[];let pass=0,fail=0;const ok=(c,m)=>{console.log(c?'PASS':'FAIL',m);c?pass++:fail++};
const base='http://localhost:8765/';
const ctx=await b.newContext({viewport:{width:390,height:900}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
const FNS=[];let fnResp={ok:true},fsOk=true;
await p.route('**/functions/v1/whatsapp',r=>{FNS.push(r.request().postDataJSON());r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(fnResp)})});
await p.route('https://formspree.io/**',r=>r.fulfill({status:fsOk?200:500,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":true}'}));
await p.route('**/*',r=>{const u=r.request().url();if(/fonts\.g|dsq-analytics|googletagmanager/.test(u))return r.fulfill({status:200,body:''});r.fallback()});
// ---------- booking wizard ----------
await p.goto(base+'adi-part-3-training-booking.html?from=adi-part-3-cost-calculator');await p.waitForTimeout(400);
ok(await p.locator('.step.on').getAttribute('data-step')==='1','starts on step 1');
await p.click('#next');ok(/choose where you are/i.test(await p.textContent('#err')),'step 1 will not continue without a choice');
await p.click('[data-stage*="trainee licence"]');await p.waitForTimeout(500);ok(await p.locator('.step.on').getAttribute('data-step')==='2','choosing a stage moves on by itself');
ok(await p.locator('#licStartWrap').isVisible(),'trainee licence stage shows the licence start date');
const t=new Date(),d1=new Date(t.getFullYear()-1,t.getMonth(),t.getDate()-3),iso=d=>d.toISOString().slice(0,10);
await p.fill('#p1',iso(d1));await p.dispatchEvent('#p1','change');ok(/within 2 years of passing Part 1/.test(await p.textContent('#liveP1')),'Part 1 date shows the live 2-year deadline');
const l1=new Date(t.getFullYear(),t.getMonth()-5,t.getDate()-20);await p.fill('#lic',iso(l1));await p.dispatchEvent('#lic','change');ok(/lasts 6 months/.test(await p.textContent('#liveLic')),'licence start shows the live expiry');
await p.selectOption('#tc','West Didsbury');await p.fill('#td',iso(new Date(t.getTime()+20*864e5)));
await p.click('#next');ok(await p.locator('.step.on').getAttribute('data-step')==='3','to step 3');
await p.click('[data-help="Risk management"]');await p.click('[data-help="A full mock Part 3"]');await p.click('#next');
await p.click('[data-av="Weekday evenings"]');await p.click('[data-urg="Within 2 to 4 weeks"]');await p.fill('#pc','m19 2ln');await p.click('#next');
ok(await p.locator('.step.on').getAttribute('data-step')==='5','to contact step');
await p.click('#next');ok(/enter your name/i.test(await p.textContent('#err')),'name is required');
await p.fill('#nm','Imran Ali');await p.fill('#ph','123');await p.click('#next');ok(/valid UK mobile/i.test(await p.textContent('#err')),'a bad phone is refused on screen');
await p.fill('#ph','07911 123456');await p.fill('#em','bad');await p.click('#next');ok(/email/i.test(await p.textContent('#err')),'a bad email is refused on screen');
await p.fill('#em','imran@example.com');await p.click('#next');ok(/tick the box/i.test(await p.textContent('#err')),'consent tick is required');
await p.check('#consent');await p.click('#next');ok(await p.locator('.step.on').getAttribute('data-step')==='6','to review step');
const sum=await p.textContent('#sum');ok(/Imran Ali/.test(sum)&&/West Didsbury/.test(sum)&&/Risk management, A full mock Part 3/.test(sum)&&/Weekday evenings/.test(sum),'the review shows what was entered');
await p.click('#next');await p.waitForTimeout(700);
const sent=FNS.pop();ok(sent&&sent.action==='adi_enquiry'&&sent.name==='Imran Ali'&&sent.phone==='07911 123456'&&sent.consent===true&&sent.test_centre==='West Didsbury'&&sent.help.length===2&&sent.attempts===0&&/from adi-part-3-cost-calculator/.test(sent.source)&&sent.website==='','the enquiry sent to the private endpoint has every field, the consent and the page it came from');
ok(await p.locator('.step.on').getAttribute('data-step')==='7'&&/Thank you, Imran/.test(await p.textContent('#doneH')),'thank-you screen');
ok(/wa\.me\/447352932003\?text=/.test(await p.getAttribute('#waDone','href'))&&/Imran%20Ali/.test(await p.getAttribute('#waDone','href')),'the WhatsApp button on the thank-you screen is pre-filled');
ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)),'no sideways scrolling on a phone');
await p.screenshot({path:'/tmp/claude-0/-home-user/a8c8ccfe-9b12-5e9c-89d0-adbeaace9e5e/scratchpad/adi-booking-done.png'});
// failure paths
await p.goto(base+'adi-part-3-training-booking.html');await p.click('[data-stage*="Still on Part 1"]');await p.waitForTimeout(400);for(let i=0;i<3;i++)await p.click('#next');await p.fill('#nm','Sara Khan');await p.fill('#ph','07922 000111');await p.check('#consent');await p.click('#next');
fnResp={ok:false,error:'save failed'};await p.click('#next');await p.waitForTimeout(700);ok(await p.locator('.step.on').getAttribute('data-step')==='7','if our system fails but the email backup works, the visitor still gets a thank-you');
await p.goto(base+'adi-part-3-training-booking.html');await p.click('[data-stage*="Still on Part 1"]');await p.waitForTimeout(400);for(let i=0;i<3;i++)await p.click('#next');await p.fill('#nm','Sara Khan');await p.fill('#ph','07922 000111');await p.check('#consent');await p.click('#next');
fsOk=false;await p.click('#next');await p.waitForTimeout(700);ok(await p.locator('.step.on').getAttribute('data-step')==='6'&&await p.locator('#sendWarn').isVisible()&&/WhatsApp/.test(await p.textContent('#sendWarn')),'if BOTH fail, the visitor is told and offered WhatsApp / phone instead of losing the enquiry');
// ---------- score calculator ----------
await p.goto(base+'adi-part-3-score-calculator.html');
const setAll=async(vals)=>{const its=p.locator('.sc .it');for(let i=0;i<17;i++)await its.nth(i).locator('button[data-v="'+vals[i]+'"]').click()};
await setAll(Array(17).fill(2));let v=await p.textContent('#verdict'),tot=await p.textContent('#tot');ok(tot.trim()==='34 / 51'&&/Grade B/.test(v)&&/3 marks above/.test(v),'all 2s = 34, Grade B, 3 above the pass mark');
await setAll([...Array(4).fill(3),...Array(5).fill(1),...Array(8).fill(3)]);v=await p.textContent('#verdict');tot=await p.textContent('#tot');ok(tot.trim()==='41 / 51'&&/Automatic fail on risk management/.test(v)&&/5 out of 15/.test(v),'41 total but risk management 5/15 = automatic fail');
await setAll([...Array(4).fill(3),...Array(5).fill(2),...Array(8).fill(3)]);v=await p.textContent('#verdict');tot=await p.textContent('#tot');ok(tot.trim()==='46 / 51'&&/Grade A/.test(v),'46 with risk management 10/15 = Grade A');
await setAll(Array(17).fill(1));v=await p.textContent('#verdict');ok(/Fail/.test(v)&&/14 more marks/.test(v),'all 1s = 17, fail, 14 more marks needed');
await setAll([...Array(4).fill(2),...Array(5).fill(2),...Array(8).fill(2)]);await p.check('#danger');v=await p.textContent('#verdict');ok(/immediate danger/.test(v)&&await p.locator('#res.fail').count()===1,'the danger stop is an automatic fail');
await p.uncheck('#danger');await p.click('#reset');ok(/0 of 17|Score all|areas scored/.test(await p.textContent('#verdict')),'clear resets');
ok(/wa\.me\/447352932003\?text=/.test(await p.getAttribute('#askUs','href')),'the ask-us link carries the scores');
// ---------- deadline calculator ----------
await p.goto(base+'adi-part-3-deadline-calculator.html');
const today=new Date(),P1=new Date(today.getFullYear()-1,today.getMonth(),today.getDate()),LIC=new Date(today.getFullYear(),today.getMonth()-4,today.getDate()),TD=new Date(today.getTime()+30*864e5);
await p.fill('#d1',iso(P1));await p.dispatchEvent('#d1','change');await p.fill('#d2',iso(LIC));await p.dispatchEvent('#d2','change');await p.fill('#d3',iso(TD));await p.dispatchEvent('#d3','change');await p.selectOption('#d4','2');
let o=await p.textContent('#out');
const exp1=new Date(P1.getFullYear()+2,P1.getMonth(),P1.getDate()).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
const exp2=new Date(LIC.getFullYear(),LIC.getMonth()+6,LIC.getDate()).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
ok(o.includes(exp1),'Part 1 + 2 years = '+exp1);ok(o.includes(exp2),'licence + 6 months = '+exp2);ok(/Extra training deadline/.test(o)&&/If you pass, apply for your first ADI badge by/.test(o)&&/used 2 attempts/.test(o),'extra training, badge deadline and the last-attempt warning all appear');
await p.fill('#d1','');await p.dispatchEvent('#d1','change');await p.fill('#d2','');await p.dispatchEvent('#d2','change');await p.fill('#d3','');await p.dispatchEvent('#d3','change');
// ---------- cost calculator ----------
await p.goto(base+'adi-part-3-cost-calculator.html');ok(/£743/.test(await p.textContent('#res')),'defaults add up to the official £743');
await p.fill('#a3','3');await p.fill('#a5','900');await p.waitForTimeout(100);const rr=await p.textContent('#res');ok(/£1,865/.test(rr)&&/£222/.test(rr),'3 Part 3 attempts + £900 training = £1,865, retake fees £222');
// ---------- layout on every new page ----------
for(const f of ['adi-part-3-training-booking','adi-part-3-score-calculator','adi-part-3-deadline-calculator','adi-part-3-cost-calculator','adi-part-3-report-form-explained','adi-part-3-pupil-and-lesson-theme-guide','adi-part-3-test-day-checklist','adi-part-3-training-manchester']){await p.goto(base+f+'.html');ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)),f+': no sideways scroll on a phone')}
await p.setViewportSize({width:1200,height:900});await p.goto(base+'adi-part-3-training-booking.html');await p.waitForTimeout(700);await p.screenshot({path:'/tmp/claude-0/-home-user/a8c8ccfe-9b12-5e9c-89d0-adbeaace9e5e/scratchpad/adi-booking-desktop.png'});
console.log('errs',errs);console.log(pass+' pass, '+fail+' fail');await b.close();})();
