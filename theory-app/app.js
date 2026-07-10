/* ============================================================
   DriveSQ Theory — app.js
   Standalone, free theory-test practice app.
   Reuses the 700-question bank (theory-questions.js) and quiz
   mechanics already proven in the DriveSQ student portal, plus
   a lightweight gamification layer (XP, streaks, hearts, road map).
   ============================================================ */

const SB_URL='https://vwvbfqrlumvoabzkjxoa.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmJmcXJsdW12b2FiemtqeG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzQ4MzgsImV4cCI6MjA5Njc1MDgzOH0.c5UNle-sh1DYuyqaNYvG9r9ru74EMP89uhdteQu2qho';
const sb=window.supabase.createClient(SB_URL,SB_KEY);

/* ── Content ── */
const CATS=[
  {key:'rules',name:'Rules of the Road',icon:'bi-signpost-2-fill',color:'#3b82f6'},
  {key:'signs',name:'Road Signs & Markings',icon:'bi-sign-intersection-side-fill',color:'#22c55e'},
  {key:'safety',name:'Safety & Your Vehicle',icon:'bi-shield-check',color:'#F0B429'},
  {key:'hazards',name:'Hazard Awareness',icon:'bi-exclamation-triangle-fill',color:'#ef4444'},
  {key:'vulnerable',name:'Vulnerable Road Users',icon:'bi-people-fill',color:'#14b8a6'},
  {key:'vehicle',name:'Vehicle & Maintenance',icon:'bi-tools',color:'#a855f7'},
  {key:'motorway',name:'Motorway Driving',icon:'bi-signpost-split-fill',color:'#6366f1'},
  {key:'documents',name:'Documents & Penalties',icon:'bi-file-earmark-text-fill',color:'#f43f5e'}
];
const CAT_MAP=Object.fromEntries(CATS.map(c=>[c.key,c]));
const QUESTIONS_PER_TEST=50;
const PASS_MARK=43;
const TEST_TIME=57*60;
const TOTAL_MOCK_TESTS=14;
const HEARTS_MAX=3;
const HEARTS_REFILL_MS=4*60*60*1000;
const LEVELS=[
  {min:0,name:'Learner Permit'},
  {min:500,name:'Improving'},
  {min:1500,name:'Confident'},
  {min:3000,name:'Nearly There'},
  {min:5000,name:'Test Ready'}
];

/* ── Utils ── */
function esc(s){return(s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function pad2(n){return String(n).padStart(2,'0');}
function todayKey(){const d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function daysBetween(a,b){const da=new Date(a+'T00:00:00'),db=new Date(b+'T00:00:00');return Math.round((db-da)/86400000);}
function shuffleArr(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function $(id){return document.getElementById(id);}
function levelFor(xp){let lv=LEVELS[0];for(const l of LEVELS){if(xp>=l.min)lv=l;}return lv;}
function nextLevel(xp){return LEVELS.find(l=>l.min>xp)||null;}

let _tt;
function showToast(msg){const t=$('toast');if(!t)return;t.textContent=msg;clearTimeout(_tt);requestAnimationFrame(()=>t.classList.add('show'));_tt=setTimeout(()=>t.classList.remove('show'),2800);}

function haptic(pattern){if(state.settings.haptics&&navigator.vibrate)navigator.vibrate(pattern);}
let _actx=null;
function playTone(freq,dur){
  if(!state.settings.sound)return;
  try{
    _actx=_actx||new (window.AudioContext||window.webkitAudioContext)();
    const o=_actx.createOscillator(),g=_actx.createGain();
    o.type='sine';o.frequency.value=freq;
    g.gain.setValueAtTime(.08,_actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,_actx.currentTime+dur);
    o.connect(g);g.connect(_actx.destination);
    o.start();o.stop(_actx.currentTime+dur);
  }catch(e){}
}
function soundCorrect(){playTone(880,.18);haptic(30);}
function soundWrong(){playTone(220,.22);haptic([40,30,40]);}
function soundLevelUp(){playTone(660,.12);setTimeout(()=>playTone(990,.22),110);}

function xpFloat(amount){
  const el=document.createElement('div');
  el.className='xp-float';el.textContent='+'+amount+' XP';
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>el.remove(),1200);
}

/* ── State ── */
const STORE_KEY='dsqtheory_state_v1';
function loadState(){
  let s=null;
  try{s=JSON.parse(localStorage.getItem(STORE_KEY));}catch(e){}
  return Object.assign({
    xp:0,currentStreak:0,longestStreak:0,lastActiveDate:null,streakFreezes:0,
    attempts:[],mockResults:[],heartsExhausted:{},
    settings:{sound:true,haptics:true}
  },s||{});
}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state));}
let state=loadState();
let session=null; // supabase auth session

/* ── Gamification core ── */
function catStats(cat){
  const rows=state.attempts.filter(a=>a.cat===cat);
  const correct=rows.filter(a=>a.correct).length;
  return {correct,total:rows.length,pct:rows.length?Math.round(correct/rows.length*100):0};
}
function overallStats(){
  const total=state.attempts.length;
  const correct=state.attempts.filter(a=>a.correct).length;
  return {correct,total,pct:total?Math.round(correct/total*100):0};
}
function recordActivity(){
  const today=todayKey();
  if(state.lastActiveDate===today)return;
  if(state.lastActiveDate){
    const gap=daysBetween(state.lastActiveDate,today);
    if(gap===1){
      state.currentStreak+=1;
    }else if(gap===2&&state.streakFreezes>0){
      state.streakFreezes-=1;
      state.currentStreak+=1;
      showToast('Streak freeze used — your streak is safe ❄️');
    }else{
      state.currentStreak=1;
    }
  }else{
    state.currentStreak=1;
  }
  state.longestStreak=Math.max(state.longestStreak,state.currentStreak);
  if(state.currentStreak>0&&state.currentStreak%7===0)state.streakFreezes=Math.min(2,state.streakFreezes+1);
  state.lastActiveDate=today;
}
function addXP(amount){
  const before=levelFor(state.xp);
  state.xp+=amount;
  const after=levelFor(state.xp);
  xpFloat(amount);
  if(after.name!==before.name)setTimeout(()=>openLevelUp(after),700);
}
function recordAttempt(qid,cat,correct,mode,testNum){
  recordActivity();
  state.attempts.push({qid,cat,correct,mode,ts:Date.now()});
  const stats=catStats(cat);
  const weakBonus=stats.pct<50&&stats.total>3?5:0;
  if(correct)addXP((mode==='mock'?8:10)+weakBonus);
  saveState();
  if(session){
    sb.from('theory_attempts').insert([{user_id:session.user.id,question_id:qid,category:cat,mode,test_num:testNum||null,is_correct:correct}]).then(()=>{},()=>{});
  }
}
function syncStreakRemote(){
  if(!session)return;
  sb.from('theory_streaks').upsert([{
    user_id:session.user.id,xp:state.xp,current_streak:state.currentStreak,
    longest_streak:state.longestStreak,last_active_date:state.lastActiveDate,
    streak_freezes:state.streakFreezes,updated_at:new Date().toISOString()
  }],{onConflict:'user_id'}).then(()=>{},()=>{});
}

/* ── Hearts ── */
function heartsState(cat){
  const until=state.heartsExhausted[cat];
  if(until&&Date.now()<until)return{exhausted:true,until};
  return{exhausted:false,remaining:HEARTS_MAX};
}
function refillLabel(until){
  const ms=until-Date.now();if(ms<=0)return'ready now';
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
  return h>0?h+'h '+m+'m':m+'m';
}

/* ── Router ── */
let route={view:'home'};
function nav(view,params){route={view,...(params||{})};render();window.scrollTo(0,0);}

function render(){
  const root=$('appRoot');
  updateTopbar();
  updateBottomNav();
  if(route.view==='home')root.innerHTML=renderHomeView();
  else if(route.view==='mocks')root.innerHTML=renderMocksView();
  else if(route.view==='profile')root.innerHTML=renderProfileView();
  else if(route.view==='quiz')root.innerHTML=renderQuizView();
  else if(route.view==='results')root.innerHTML=renderResultsView();
}

function updateTopbar(){
  const lv=levelFor(state.xp);
  $('streakPill').innerHTML='<i class="bi bi-fire"></i>'+state.currentStreak;
  $('xpPill').innerHTML='<i class="bi bi-lightning-charge-fill"></i>'+state.xp;
}
function updateBottomNav(){
  ['home','mocks','profile'].forEach(v=>{
    const el=$('bn-'+v);if(el)el.classList.toggle('active',route.view===v||(route.view==='quiz'&&v==='home')||(route.view==='results'&&v==='home'));
  });
}

/* ── HOME VIEW ── */
function renderHomeView(){
  const os=overallStats();
  const lv=levelFor(state.xp);
  const nl=nextLevel(state.xp);
  let h='';
  h+='<div class="hero">';
  h+='<div class="hero-eyebrow"><i class="bi bi-signpost-2-fill"></i>Free · No paywall · Every question</div>';
  h+='<h1>Learn to pass your <em>theory test</em>, one road at a time.</h1>';
  h+='<p>700 original DVSA-style questions across 8 topics, 14 full mock exams, and a route that tracks exactly where you\'re strong — all completely free.</p>';
  h+='<div class="hero-cta"><button class="btn btn-primary" onclick="startPractice(\'all\')"><i class="bi bi-play-fill"></i>Start practising</button>';
  h+='<button class="btn btn-outline" onclick="nav(\'mocks\')"><i class="bi bi-clipboard-check"></i>Mock tests</button></div>';
  h+='<div class="hero-stats"><div><div class="hero-stat-num">'+os.total+'</div><div class="hero-stat-lbl">Answered</div></div>';
  h+='<div><div class="hero-stat-num">'+os.pct+'%</div><div class="hero-stat-lbl">Accuracy</div></div>';
  h+='<div><div class="hero-stat-num">'+state.currentStreak+'</div><div class="hero-stat-lbl">Day streak</div></div></div>';
  h+='</div>';

  if(!session){
    h+='<div class="card" style="border-color:rgba(240,180,41,.35);margin-bottom:6px">';
    h+='<div style="display:flex;gap:12px;align-items:flex-start">';
    h+='<i class="bi bi-cloud-arrow-up" style="font-size:1.3rem;color:var(--gold)"></i>';
    h+='<div style="flex:1"><div style="font-family:\'Oswald\',sans-serif;font-weight:600;font-size:.88rem;margin-bottom:3px">Save your progress</div>';
    h+='<div style="font-size:.78rem;color:var(--txt3);margin-bottom:10px">You\'re practising as a guest — your streak and XP live in this browser only. Sign in free to keep them on any device.</div>';
    h+='<button class="btn btn-gold" style="min-height:38px;padding:0 16px;font-size:.8rem" onclick="openAuth()">Sign in with email</button></div></div></div>';
  }

  h+='<div class="section-title"><i class="bi bi-map" style="color:var(--red)"></i>Your route</div>';
  h+='<div class="section-sub">'+lv.name+(nl?' · '+(nl.min-state.xp)+' XP to '+nl.name:' · Maximum level')+'</div>';
  h+='<div class="roadmap">';
  CATS.forEach(c=>{
    const st=catStats(c.key);
    const started=st.total>0;
    const mastered=st.total>=8&&st.pct>=80;
    h+='<div class="road-node '+(mastered?'mastered':(started?'started':''))+'" style="--cat-color:'+c.color+'" onclick="startPractice(\''+c.key+'\')">';
    h+='<div class="node-dot"><i class="bi '+c.icon+'"></i></div>';
    h+='<div class="node-info"><div class="node-title">'+esc(c.name)+'</div>';
    h+='<div class="node-sub">'+(started?st.correct+'/'+st.total+' correct so far':'Not started yet')+'</div>';
    h+='<div class="node-bar"><div class="node-bar-fill" style="width:'+st.pct+'%"></div></div></div>';
    h+='<i class="bi bi-chevron-right node-chev"></i></div>';
  });
  h+='</div>';

  h+='<div class="card" style="margin-top:26px;background:linear-gradient(135deg,rgba(209,10,17,.10),rgba(209,10,17,.03));border-color:rgba(209,10,17,.25)">';
  h+='<div style="font-family:\'Oswald\',sans-serif;font-weight:700;font-size:.92rem;margin-bottom:4px"><i class="bi bi-car-front-fill me-2" style="color:var(--red)"></i>Ready for real lessons?</div>';
  h+='<div style="font-size:.78rem;color:var(--txt3);margin-bottom:12px">Once your theory is solid, DriveSQ instructors across Manchester can get you test-ready behind the wheel.</div>';
  h+='<a class="btn btn-outline btn-block" href="https://www.drivesq.co.uk" style="text-decoration:none"><i class="bi bi-arrow-up-right"></i>Explore driving lessons</a></div>';

  return h;
}

/* ── MOCKS VIEW ── */
function renderMocksView(){
  const results={};
  state.mockResults.forEach(r=>{results[r.testNum]=r;});
  let h='<div class="section-title"><i class="bi bi-clipboard-check" style="color:var(--red)"></i>Mock Tests</div>';
  h+='<div class="section-sub">'+QUESTIONS_PER_TEST+' questions · '+Math.floor(TEST_TIME/60)+' minutes · Pass mark '+PASS_MARK+'/'+QUESTIONS_PER_TEST+' — same format as the real exam</div>';
  h+='<div class="mock-grid">';
  for(let t=1;t<=TOTAL_MOCK_TESTS;t++){
    const r=results[t];
    h+='<div class="mock-tile" onclick="startMockTest('+t+')">';
    h+='<div class="mt-num">'+t+'</div><div class="mt-range">Q'+(((t-1)*50)+1)+'–'+(t*50)+'</div>';
    if(r)h+='<div class="mt-badge '+(r.passed?'pass':'fail')+'">'+r.score+'/'+r.total+'</div>';
    h+='</div>';
  }
  h+='</div>';
  return h;
}

/* ── PROFILE VIEW ── */
function renderProfileView(){
  const os=overallStats();
  const lv=levelFor(state.xp);
  const nl=nextLevel(state.xp);
  const pctToNext=nl?Math.round((state.xp-lv.min)/(nl.min-lv.min)*100):100;
  let h='<div class="section-title"><i class="bi bi-person-circle" style="color:var(--red)"></i>Profile</div>';

  h+='<div class="card" style="text-align:center;padding:22px 16px">';
  h+='<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#c98f14);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-family:\'Oswald\',sans-serif;font-weight:700;font-size:1.4rem;color:#1a1200">'+(session?esc((session.user.email||'?')[0].toUpperCase()):'?')+'</div>';
  h+='<div style="font-family:\'Oswald\',sans-serif;font-weight:700;font-size:1rem">'+(session?esc(session.user.email):'Guest')+'</div>';
  h+='<div style="font-size:.76rem;color:var(--gold);margin-top:2px">'+lv.name+'</div>';
  h+='<div class="node-bar" style="margin-top:12px"><div class="node-bar-fill" style="width:'+pctToNext+'%;background:var(--gold)"></div></div>';
  h+='<div style="font-size:.68rem;color:var(--txt3);margin-top:6px">'+state.xp+' XP'+(nl?' · '+(nl.min-state.xp)+' to '+nl.name:' · Max level')+'</div>';
  if(!session)h+='<button class="btn btn-gold btn-block" style="margin-top:16px" onclick="openAuth()">Sign in to save progress</button>';
  else h+='<button class="btn btn-outline btn-block" style="margin-top:16px" onclick="signOut()">Sign out</button>';
  h+='</div>';

  h+='<div class="section-title" style="margin-top:24px"><i class="bi bi-bar-chart-fill" style="color:var(--red)"></i>Stats</div>';
  h+='<div class="card">';
  h+='<div class="breakdown-row"><span>Questions answered</span><b>'+os.total+'</b></div>';
  h+='<div class="breakdown-row"><span>Overall accuracy</span><b>'+os.pct+'%</b></div>';
  h+='<div class="breakdown-row"><span>Current streak</span><b>'+state.currentStreak+' day'+(state.currentStreak===1?'':'s')+'</b></div>';
  h+='<div class="breakdown-row"><span>Longest streak</span><b>'+state.longestStreak+' day'+(state.longestStreak===1?'':'s')+'</b></div>';
  h+='<div class="breakdown-row"><span>Streak freezes held</span><b>'+state.streakFreezes+' ❄️</b></div>';
  h+='<div class="breakdown-row"><span>Mock tests taken</span><b>'+state.mockResults.length+'</b></div>';
  h+='</div>';

  h+='<div class="section-title" style="margin-top:24px"><i class="bi bi-sliders" style="color:var(--red)"></i>Settings</div>';
  h+='<div class="card">';
  h+='<div class="mute-toggle"><span style="font-size:.86rem">Sound effects</span><div class="switch '+(state.settings.sound?'on':'')+'" onclick="toggleSetting(\'sound\')"></div></div>';
  h+='<div class="mute-toggle"><span style="font-size:.86rem">Vibration</span><div class="switch '+(state.settings.haptics?'on':'')+'" onclick="toggleSetting(\'haptics\')"></div></div>';
  h+='</div>';
  return h;
}
function toggleSetting(k){state.settings[k]=!state.settings[k];saveState();render();}

/* ── QUIZ (practice + mock) ── */
let quiz=null; // {mode, cat, testNum, questions, answers, current, hearts, exhausted, stats:{correct,wrong}, timer, timeLeft}

function startPractice(cat){
  const hs=heartsState(cat);
  const bank=window.THEORY_BANK||[];
  const pool=cat==='all'?shuffleArr(bank.slice()):shuffleArr(bank.filter(q=>q.cat===cat));
  if(!pool.length){showToast('Questions still loading — try again in a second.');return;}
  quiz={mode:'practice',cat,testNum:null,questions:pool,answers:new Array(pool.length).fill(-1),current:0,
    hearts:HEARTS_MAX,exhausted:hs.exhausted,exhaustedUntil:hs.until,stats:{correct:0,wrong:0},showingAnswer:false};
  nav('quiz');
}
function startMockTest(testNum){
  const bank=window.THEORY_BANK||[];
  const start=(testNum-1)*QUESTIONS_PER_TEST;
  const qs=bank.slice(start,start+QUESTIONS_PER_TEST);
  if(!qs.length){showToast('Questions still loading — try again in a second.');return;}
  quiz={mode:'mock',cat:null,testNum,questions:qs,answers:new Array(qs.length).fill(-1),current:0,
    hearts:null,exhausted:false,stats:{correct:0,wrong:0},showingAnswer:false,timeLeft:TEST_TIME};
  startMockTimer();
  nav('quiz');
}
let mockTimerHandle=null;
function startMockTimer(){
  clearInterval(mockTimerHandle);
  mockTimerHandle=setInterval(()=>{
    if(!quiz||quiz.mode!=='mock')return clearInterval(mockTimerHandle);
    quiz.timeLeft--;
    const disp=$('quizTimerDisp'),fill=$('quizTimerFill');
    if(disp)disp.textContent=pad2(Math.floor(quiz.timeLeft/60))+':'+pad2(quiz.timeLeft%60);
    if(fill)fill.style.width=(quiz.timeLeft/TEST_TIME*100)+'%';
    if(quiz.timeLeft<=0){clearInterval(mockTimerHandle);finishQuiz();}
  },1000);
}

function renderQuizView(){
  if(!quiz)return'<div class="center-pad">Nothing in progress.</div>';
  if(quiz.mode==='practice'&&quiz.exhausted)return renderRecharge();
  const q=quiz.questions[quiz.current];
  if(!q){finishQuiz();return'<div class="center-pad">Finishing up…</div>';}
  const cat=CAT_MAP[q.cat]||{name:q.cat,color:'#888'};
  let h='<div class="quiz-topbar">';
  h+='<button class="icon-btn" onclick="exitQuiz()"><i class="bi bi-x-lg"></i></button>';
  if(quiz.mode==='mock'){
    h+='<div style="flex:1"><div class="timer-bar"><div class="timer-fill" id="quizTimerFill" style="width:'+(quiz.timeLeft/TEST_TIME*100)+'%"></div></div></div>';
    h+='<span id="quizTimerDisp" style="font-family:\'Oswald\',sans-serif;font-weight:700;font-size:.86rem">'+pad2(Math.floor(quiz.timeLeft/60))+':'+pad2(quiz.timeLeft%60)+'</span>';
  }else{
    h+='<div class="hearts">'+Array.from({length:HEARTS_MAX}).map((_,i)=>'<i class="bi '+(i<quiz.hearts?'bi-heart-fill':'bi-heart spent')+'"></i>').join('')+'</div>';
    h+='<div style="flex:1;text-align:right;font-size:.72rem;color:var(--txt3)">'+quiz.stats.correct+' correct · '+quiz.stats.wrong+' wrong</div>';
  }
  h+='</div>';
  h+='<div class="d-flex align-items-center gap-2 mb-2" style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
  h+='<span class="cat-pill" style="background:'+cat.color+'22;color:'+cat.color+'">'+esc(cat.name)+'</span>';
  h+='<span style="font-size:.7rem;color:var(--txt3)">'+(quiz.current+1)+' of '+quiz.questions.length+'</span>';
  h+='</div>';
  h+='<div class="q-card">';
  h+='<div class="q-text">'+esc(q.q)+'</div>';
  q.opts.forEach((o,i)=>{
    h+='<div class="q-opt" id="qopt'+i+'" onclick="selectAnswer('+i+')"><div class="q-letter">'+['A','B','C','D'][i]+'</div><span>'+esc(o)+'</span></div>';
  });
  h+='</div>';
  h+='<div id="answerFb"></div>';
  h+='<div style="display:flex;gap:10px;margin-top:14px">';
  if(quiz.mode==='practice')h+='<button class="btn btn-primary btn-block hidden" id="checkBtn" onclick="checkPracticeAnswer()"><i class="bi bi-check-lg"></i>Check answer</button>';
  h+='<button class="btn btn-primary btn-block '+(quiz.mode==='practice'?'hidden':'hidden')+'" id="nextBtn" onclick="nextQuestion()">'+(quiz.current<quiz.questions.length-1?'Next question':'Finish')+'</button>';
  h+='</div>';
  return h;
}

function renderRecharge(){
  const label=refillLabel(quiz.exhaustedUntil);
  let h='<div class="recharge">';
  h+='<div class="rc-icon"><i class="bi bi-heart-fill"></i></div>';
  h+='<h3>Out of hearts for now</h3>';
  h+='<p>You\'ve had 3 goes at this topic. Come back in <b style="color:var(--txt)">'+label+'</b>, or jump into a different topic right now — nothing here is ever locked behind payment.</p>';
  h+='<button class="btn btn-outline btn-block" style="margin-bottom:8px" onclick="nav(\'home\')">Choose another topic</button>';
  h+='<button class="btn btn-ghost" onclick="exitQuiz()">Back</button>';
  h+='</div>';
  return h;
}

function selectAnswer(i){
  if(quiz.showingAnswer)return;
  quiz.answers[quiz.current]=i;
  document.querySelectorAll('.q-opt').forEach((el,idx)=>el.classList.toggle('selected',idx===i));
  if(quiz.mode==='practice'){$('checkBtn').classList.remove('hidden');}
  else{$('nextBtn').classList.remove('hidden');}
}

function checkPracticeAnswer(){
  const q=quiz.questions[quiz.current];
  const ans=quiz.answers[quiz.current];
  if(ans===-1){showToast('Pick an answer first.');return;}
  quiz.showingAnswer=true;
  const correct=ans===q.ans;
  if(correct){quiz.stats.correct++;soundCorrect();}else{quiz.stats.wrong++;quiz.hearts--;soundWrong();}
  recordAttempt(q.id,q.cat,correct,'practice',null);
  updateTopbar();
  document.querySelectorAll('.q-opt').forEach((el,i)=>{
    if(i===q.ans)el.classList.add('correct');else if(i===ans&&!correct)el.classList.add('wrong');
  });
  const fb=$('answerFb');
  let txt=correct?'Correct!':'Not quite — the answer is: '+q.opts[q.ans];
  if(q.exp)txt+=' — '+q.exp;
  fb.innerHTML='<div class="answer-fb '+(correct?'correct':'wrong')+'">'+esc(txt)+'</div>';
  $('checkBtn').classList.add('hidden');
  if(quiz.hearts<=0){
    state.heartsExhausted[quiz.cat]=Date.now()+HEARTS_REFILL_MS;saveState();
    $('nextBtn').textContent='See recharge';$('nextBtn').classList.remove('hidden');
    quiz.forceEndAfterThis=true;
  }else{
    $('nextBtn').classList.remove('hidden');
  }
}

function nextQuestion(){
  if(quiz.mode==='mock'&&quiz.answers[quiz.current]===-1&&quiz.current<quiz.questions.length-1){quiz.current++;render();return;}
  if(quiz.forceEndAfterThis){quiz.exhausted=true;render();return;}
  quiz.current++;
  if(quiz.current>=quiz.questions.length)finishQuiz();else render();
}

function exitQuiz(){
  clearInterval(mockTimerHandle);
  if(quiz&&quiz.mode==='mock'&&quiz.current>0){if(!confirm('Leave this mock test? Your progress on it will be lost.'))return;}
  quiz=null;nav('home');
}

function finishQuiz(){
  clearInterval(mockTimerHandle);
  const total=quiz.questions.length;
  let correct=0;
  const catScores={};
  const wrongOnes=[];
  quiz.questions.forEach((q,i)=>{
    const cn=(CAT_MAP[q.cat]||{name:q.cat}).name;
    catScores[cn]=catScores[cn]||{correct:0,total:0};
    catScores[cn].total++;
    const ok=quiz.answers[i]===q.ans;
    if(ok){correct++;catScores[cn].correct++;}else wrongOnes.push({q,userAns:quiz.answers[i]});
    if(quiz.mode==='mock')recordAttempt(q.id,q.cat,ok,'mock',quiz.testNum);
  });
  const passed=correct>=PASS_MARK;
  if(quiz.mode==='mock'){
    addXP(correct*8+(passed?100:0));
    const result={testNum:quiz.testNum,score:correct,total,passed,ts:Date.now()};
    state.mockResults=state.mockResults.filter(r=>r.testNum!==quiz.testNum);
    state.mockResults.push(result);
    saveState();
    if(session){
      sb.from('theory_mock_results').insert([{user_id:session.user.id,test_num:quiz.testNum,score:correct,total,passed}]).then(()=>{},()=>{});
    }
  }
  syncStreakRemote();
  quiz.result={correct,total,passed,catScores,wrongOnes};
  nav('results');
}

function renderResultsView(){
  if(!quiz||!quiz.result)return'<div class="center-pad">No results yet.</div>';
  const {correct,total,passed,catScores,wrongOnes}=quiz.result;
  let h='<div class="result-hero">';
  h+='<div class="result-emoji">'+(quiz.mode==='mock'?(passed?'🎉':'📚'):'✅')+'</div>';
  if(quiz.mode==='mock')h+='<div class="result-verdict" style="color:'+(passed?'var(--green)':'var(--miss)')+'">'+(passed?'PASS':'NOT YET')+'</div>';
  else h+='<div class="result-verdict">Practice complete</div>';
  h+='<div class="result-score">'+correct+'/'+total+'</div>';
  h+='<div class="result-sub">'+(quiz.mode==='mock'?(passed?'Well done — that\'s a pass mark.':'You need '+PASS_MARK+'/'+QUESTIONS_PER_TEST+' to pass. Keep going.'):Math.round(correct/total*100)+'% accuracy this session')+'</div>';
  h+='</div>';
  h+='<div class="card"><div style="font-family:\'Oswald\',sans-serif;font-weight:700;font-size:.86rem;margin-bottom:8px">Score by topic</div>';
  Object.keys(catScores).forEach(cn=>{
    const s=catScores[cn];
    h+='<div class="breakdown-row"><span>'+esc(cn)+'</span><b style="color:'+(s.correct/s.total>=.7?'var(--green)':'var(--miss)')+'">'+s.correct+'/'+s.total+'</b></div>';
  });
  h+='</div>';
  if(wrongOnes.length){
    h+='<div class="card" style="margin-top:10px"><div style="font-family:\'Oswald\',sans-serif;font-weight:700;font-size:.86rem;margin-bottom:8px">Review ('+wrongOnes.length+')</div>';
    wrongOnes.forEach(w=>{
      h+='<div class="wrong-item"><div class="wrong-q">'+esc(w.q.q)+'</div>';
      h+='<div class="wrong-your"><i class="bi bi-x me-1"></i>'+esc(w.q.opts[w.userAns]||'Not answered')+'</div>';
      h+='<div class="wrong-correct"><i class="bi bi-check me-1"></i>'+esc(w.q.opts[w.q.ans])+'</div>';
      if(w.q.exp)h+='<div class="wrong-exp">'+esc(w.q.exp)+'</div>';
      h+='</div>';
    });
    h+='</div>';
  }
  h+='<button class="btn btn-primary btn-block" style="margin-top:16px" onclick="quiz=null;nav(\''+(quiz.mode==='mock'?'mocks':'home')+'\')"><i class="bi bi-arrow-repeat"></i>'+(quiz.mode==='mock'?'Back to mock tests':'Back to your route')+'</button>';
  return h;
}

/* ── Level-up sheet ── */
function openLevelUp(level){
  soundLevelUp();haptic([30,40,30,40,60]);
  $('levelUpBody').innerHTML=
    '<div class="sheet-handle"></div>'+
    '<div style="text-align:center">'+
    '<div class="levelup-badge">🏁</div>'+
    '<div style="font-family:\'Oswald\',sans-serif;font-weight:700;font-size:1.2rem;margin-bottom:4px">Level up!</div>'+
    '<div style="color:var(--txt2);font-size:.9rem;margin-bottom:20px">You\'ve reached <b style="color:var(--gold)">'+esc(level.name)+'</b></div>'+
    '<button class="btn btn-primary btn-block" onclick="closeLevelUp()">Keep going</button></div>';
  $('levelUpOverlay').classList.add('open');
}
function closeLevelUp(){$('levelUpOverlay').classList.remove('open');}

/* ── Auth ── */
function openAuth(){$('authOverlay').classList.add('open');}
function closeAuth(){$('authOverlay').classList.remove('open');}
async function sendMagicLink(){
  const email=$('authEmail').value.trim();
  if(!email||!email.includes('@')){showToast('Enter a valid email address.');return;}
  const btn=$('authSendBtn');btn.disabled=true;btn.textContent='Sending…';
  const{error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});
  btn.disabled=false;btn.textContent='Send sign-in link';
  if(error){showToast('Could not send link — try again.');return;}
  $('authBody').innerHTML='<div class="sheet-handle"></div><div style="text-align:center;padding:10px 0"><i class="bi bi-envelope-check" style="font-size:2rem;color:var(--gold)"></i>'+
    '<div style="font-family:\'Oswald\',sans-serif;font-weight:700;margin:12px 0 4px">Check your inbox</div>'+
    '<div style="color:var(--txt3);font-size:.84rem;margin-bottom:18px">We sent a sign-in link to '+esc(email)+'. Open it on this device to finish signing in.</div>'+
    '<button class="btn btn-outline btn-block" onclick="closeAuth()">Close</button></div>';
}
async function signOut(){await sb.auth.signOut();session=null;showToast('Signed out.');render();}

async function mergeLocalIntoRemote(){
  if(!session)return;
  const{data:existing}=await sb.from('theory_streaks').select('*').eq('user_id',session.user.id).maybeSingle();
  if(!existing){
    await sb.from('theory_streaks').insert([{
      user_id:session.user.id,xp:state.xp,current_streak:state.currentStreak,longest_streak:state.longestStreak,
      last_active_date:state.lastActiveDate,streak_freezes:state.streakFreezes
    }]);
  }else{
    state.xp=Math.max(state.xp,existing.xp||0);
    state.longestStreak=Math.max(state.longestStreak,existing.longest_streak||0);
    state.currentStreak=existing.current_streak||state.currentStreak;
    state.lastActiveDate=existing.last_active_date||state.lastActiveDate;
    state.streakFreezes=existing.streak_freezes||state.streakFreezes;
    saveState();
  }
  const{data:remoteAttempts}=await sb.from('theory_attempts').select('question_id,category,is_correct').eq('user_id',session.user.id).limit(5000);
  if(remoteAttempts&&remoteAttempts.length){
    const remoteMapped=remoteAttempts.map(a=>({qid:a.question_id,cat:a.category,correct:a.is_correct,mode:'practice',ts:0}));
    state.attempts=remoteMapped.concat(state.attempts);
    saveState();
  }
  const{data:remoteMocks}=await sb.from('theory_mock_results').select('test_num,score,total,passed').eq('user_id',session.user.id);
  if(remoteMocks){
    const byTest={};
    remoteMocks.forEach(r=>{byTest[r.test_num]={testNum:r.test_num,score:r.score,total:r.total,passed:r.passed,ts:0};});
    state.mockResults.forEach(r=>{if(!byTest[r.testNum])byTest[r.testNum]=r;});
    state.mockResults=Object.values(byTest);
    saveState();
  }
}

sb.auth.onAuthStateChange((event,newSession)=>{
  session=newSession;
  if(event==='SIGNED_IN'){
    closeAuth();
    mergeLocalIntoRemote().then(()=>{showToast('Signed in — progress saved ✓');render();});
  }
  render();
});

/* ── Boot ── */
async function boot(){
  const{data}=await sb.auth.getSession();
  session=data.session;
  if(session)await mergeLocalIntoRemote();
  render();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/theory-app/sw.js').catch(()=>{});
  }
}
boot();
