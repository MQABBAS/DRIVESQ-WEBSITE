const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:900,height:1100},deviceScaleFactor:1});
for(const [f,sel,out] of [['driving-lessons-altrincham.html','#dsqInlineBookForm','f1'],['index.html','form[aria-label="Lesson booking form"]','f2']]){
 const p=await ctx.newPage();await p.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='localhost'?r.continue():r.fulfill({status:200,body:''});});
 await p.goto('http://localhost:8765/'+f,{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
 const el=await p.$(sel);if(el){await el.scrollIntoViewIfNeeded();await el.screenshot({path:'/tmp/claude-0/'+out+'.png'});console.log(out,'ok');}else console.log(out,'form not found');await p.close();}
await b.close();})();
