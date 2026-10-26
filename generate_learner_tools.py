"""DriveSQ part 3 — six free learner tools for questions people search but rarely get a straight answer to:
when can I start driving (incl. 16 on PIP), would I have passed (fault counter), how much room to give horses and
cyclists, which lights to use, the cockpit drill, and manual or automatic after 2030. Each pairs with an SQ Driving
School guide and links to it; the SQ guides link back. Rules are from GOV.UK and the Highway Code.
Imported by generate_solihull_more.py (pages(M) is called from its main())."""
import json

SQG = "https://www.sqdrivingschool.com/guides/"
SRC = {
    "prov": ("GOV.UK — Apply for your first provisional driving licence", "https://www.gov.uk/apply-first-provisional-driving-licence"),
    "supervise": ("GOV.UK — Supervising a learner driver", "https://www.gov.uk/supervise-learner-driver"),
    "mobility": ("Driving Mobility — provisional drivers", "https://drivingmobility.org.uk/assessments/provisional-drivers"),
    "result": ("GOV.UK — Driving test: test result", "https://www.gov.uk/driving-test/test-result"),
    "hc_road": ("GOV.UK — The Highway Code: using the road (159 to 203)", "https://www.gov.uk/guidance/the-highway-code/using-the-road-159-to-203"),
    "hc_vuln": ("GOV.UK — The Highway Code: road users requiring extra care (204 to 225)", "https://www.gov.uk/guidance/the-highway-code/road-users-requiring-extra-care-204-to-225"),
    "hc_weather": ("GOV.UK — The Highway Code: adverse weather (226 to 237)", "https://www.gov.uk/guidance/the-highway-code/driving-in-adverse-weather-conditions-226-to-237"),
    "hc_lights": ("GOV.UK — The Highway Code: lights (113 to 116)", "https://www.gov.uk/guidance/the-highway-code/general-rules-techniques-and-advice-for-all-drivers-and-riders-103-to-158"),
    "lessons": ("GOV.UK — Driving lessons and learning to drive", "https://www.gov.uk/driving-lessons-learning-to-drive"),
    "zev": ("Fleet News — changes to the ZEV mandate (April 2025)", "https://www.fleetnews.co.uk/news/changes-to-zev-mandate-sale-of-hybrid-cars-and-vans-to-be-allowed"),
    "cats": ("GOV.UK — Driving licence categories", "https://www.gov.uk/driving-licence-categories"),
}
NEW = [("learner-driver-age-checker.html", "When can I start driving?", "Age checker"),
       ("driving-test-fault-counter.html", "Would I have passed?", "Fault counter"),
       ("passing-distance-guide.html", "Passing distance guide", "Passing distances"),
       ("which-lights-should-i-use.html", "Which lights should I use?", "Lights"),
       ("cockpit-drill-checklist.html", "Cockpit drill checklist", "Cockpit drill"),
       ("manual-or-automatic-decider.html", "Manual or automatic?", "Manual or auto")]


def sq(items):
    return '<div class="dsq-x">' + "".join(f'<a href="{SQG}{p}"><small>SQ Driving School</small><b>{t}</b><span>{d}</span></a>' for p, t, d in items) + "</div>"


def pages(M):
    sec, page, schema = M.section, M.page, M.tool_schema
    src = lambda keys: [SRC[k] for k in keys]
    NOTE = '<p class="note">Nothing you enter is saved or sent.</p>'
    out = {}

    # 1. age checker
    f = NEW[0][0]
    tool = """<div class="dt"><div class="g"><div><label for="ac-dob">Date of birth</label><input type="date" id="ac-dob"></div>
<div><label for="ac-pip">Enhanced rate PIP mobility?</label><select id="ac-pip"><option value="0">No</option><option value="1">Yes, or applied for</option></select></div>
<div><button type="button" id="ac-go">Show my dates</button></div></div><div class="out" id="ac-out" aria-live="polite"></div>""" + NOTE + """</div>
<script>(function(){function add(d,y,m){var x=new Date(d.getFullYear()+y,d.getMonth()+m,d.getDate());if(x.getDate()!==d.getDate())x=new Date(x.getFullYear(),x.getMonth(),0);return x;}
function fmt(d){return d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});}
document.getElementById('ac-go').addEventListener('click',function(){var v=document.getElementById('ac-dob').value,o=document.getElementById('ac-out');
if(!v){o.innerHTML='<p class="note">Enter your date of birth.</p>';return;}var p=v.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]),pip=document.getElementById('ac-pip').value==='1',now=new Date();
var rows=[['Apply for your provisional licence',add(d,15,9)],['Start driving a car with a supervisor or instructor',add(d,pip?16:17,0)],['Take your theory test',add(d,pip?16:17,0)],['Supervise a learner yourself (also needs 3 years with a full licence)',add(d,21,0)]];
o.innerHTML='<div class="k">'+rows.map(function(r){var ok=r[1]<=now;return '<div><b>'+(ok?'Now':fmt(r[1]))+'</b><span>'+r[0]+(ok?' — you\\'re old enough':'')+'</span></div>';}).join('')+'</div>'+(pip?'<p>With the enhanced rate of PIP mobility you can drive from 16. Declare any medical condition when you apply.</p>':'');});})();</script>"""
    body = sec("Free tool", "When can I <span class=\"tr\">start driving?</span>", "<p>Enter your date of birth to see when you can apply for a provisional licence, start lessons, take your theory test and, later, supervise a learner.</p>" + tool)
    body += sec("The rules", "UK learner <span class=\"tr\">age rules</span>", """<ul><li>Apply for a provisional licence from <b>15 years 9 months</b>.</li><li>Drive a car from <b>17</b> — or <b>16</b> if you get, or have applied for, the enhanced rate of the mobility component of PIP.</li><li>Your supervisor must be at least <b>21</b>, qualified to drive the car, and have held a full licence for <b>3 years</b>.</li></ul>""", alt=True)
    body += sec("Read more", "Guides from <span class=\"tr\">SQ Driving School</span>", sq([("driving-at-16-pip-mobility.html", "Driving at 16 with PIP", "Rules, assessments and adapted cars."), ("l-plates-and-p-plates-rules.html", "L plates and P plates", "The rules.")]))
    out[f] = page(f, "When Can I Start Driving? UK Learner Age Checker (incl. 16 with PIP) | DriveSQ",
                  "Free UK learner age checker: when you can apply for a provisional licence (15y 9m), start driving (17, or 16 with enhanced PIP mobility) and take your theory test.",
                  "when can i start driving, provisional licence age, driving at 16 pip, learner driver age uk", "When can I start driving?",
                  "Your provisional licence, first lesson and theory test dates — worked out from your birthday.", ["15y 9m provisional", "17 to drive", "16 with PIP"], body,
                  [("Can I drive at 16 in the UK?", "Only if you get, or have applied for, the enhanced rate of the mobility component of PIP."), ("When can I apply for a provisional licence?", "From 15 years and 9 months.")],
                  src(["prov", "mobility", "supervise"]), schema(f, "Learner driver age checker", "Works out UK learner driver dates from a date of birth."))

    # 2. fault counter
    f = NEW[1][0]
    tool = """<div class="dt"><div class="g"><div><label for="fc-m">Driving faults (minors)</label><input type="number" id="fc-m" min="0" max="60" value="0"></div>
<div><label for="fc-s">Serious faults</label><input type="number" id="fc-s" min="0" max="20" value="0"></div><div><label for="fc-d">Dangerous faults</label><input type="number" id="fc-d" min="0" max="20" value="0"></div>
<div><label for="fc-r">Most repeated minor</label><input type="number" id="fc-r" min="0" max="30" value="0" title="How many times your most common minor was marked"></div>
<div><button type="button" id="fc-go">Check result</button></div></div><div class="out" id="fc-out" aria-live="polite"></div>""" + NOTE + """</div>
<script>(function(){document.getElementById('fc-go').addEventListener('click',function(){var g=function(i){return Math.max(0,parseInt(document.getElementById(i).value||0,10));};
var m=g('fc-m'),s=g('fc-s'),d=g('fc-d'),r=g('fc-r'),o=document.getElementById('fc-out'),why=[];
if(d>0)why.push(d+' dangerous fault'+(d>1?'s':''));if(s>0)why.push(s+' serious fault'+(s>1?'s':''));if(m>15)why.push(m+' driving faults (the limit is 15)');
var pass=!why.length,warn=pass&&r>=4?'<p><b>Watch out:</b> the same minor marked '+r+' times can be turned into a serious fault if the examiner sees a pattern.</p>':'';
o.innerHTML='<div class="k"><div><b class="'+(pass?'best':'')+'">'+(pass?'Pass':'Fail')+'</b><span>result</span></div><div><b>'+m+'/15</b><span>driving faults</span></div></div>'+(pass?'':'<p>Because of: '+why.join(', ')+'.</p>')+warn;});})();</script>"""
    body = sec("Free tool", "Would I have <span class=\"tr\">passed?</span>", "<p>Enter the faults from your mock test (or your instructor's marking) to see if it would have been a pass under DVSA's rules.</p>" + tool)
    body += sec("How the test is marked", "Minor, serious and <span class=\"tr\">dangerous</span>", """<ul><li><b>Driving fault (minor):</b> not dangerous now, but could become serious if repeated. Up to 15 allowed.</li><li><b>Serious:</b> potentially dangerous. None allowed.</li><li><b>Dangerous:</b> actual danger. None allowed.</li></ul>""", alt=True)
    body += sec("Read more", "Fix your <span class=\"tr\">faults</span>", sq([("serious-and-dangerous-faults-explained.html", "Faults explained", "How minors become serious."), ("wrong-turn-on-driving-test.html", "Went the wrong way?", "Not a fault.")]))
    out[f] = page(f, "Would I Have Passed? Driving Test Fault Counter | DriveSQ",
                  "Free driving test fault counter: enter your minors, serious and dangerous faults and see if it's a pass (15 minors max, no serious or dangerous).",
                  "how many minors driving test, driving test fault counter, serious fault driving test, did i pass driving test", "Would I have passed?",
                  "Check a mock test result against DVSA's pass rules in seconds.", ["15 minors max", "0 serious", "0 dangerous"], body,
                  [("How many minors can you get and still pass?", "Up to 15 driving faults, with no serious or dangerous faults."), ("Can repeated minors fail you?", "Yes — the examiner can mark a repeated fault as serious if it shows a pattern.")],
                  src(["result"]), schema(f, "Driving test fault counter", "Checks a set of driving test faults against the pass rules."))

    # 3. passing distances
    f = NEW[2][0]
    data = {"cyclist": ["At least 1.5 metres at speeds up to 30 mph, and more space at higher speeds.", "Cyclists may ride in the middle of the lane on quiet roads, at junctions and on narrow roads — that's allowed."],
            "horse": ["Pass at under 10 mph and leave at least 2 metres.", "Don't sound your horn or rev your engine. If you can't give that space, wait behind."],
            "walker": ["At least 2 metres, at low speed.", "On country roads with no pavement, people are allowed to walk in the road — usually facing traffic."],
            "motorbike": ["Give as much room as you would a car.", "Check mirrors and blind spots for filtering motorbikes before changing lanes."]}
    tool = """<div class="dt"><div class="g"><div><label for="pd-u">Who are you passing?</label><select id="pd-u"><option value="cyclist">Cyclist</option><option value="horse">Horse rider or horse-drawn vehicle</option><option value="walker">Person walking in the road</option><option value="motorbike">Motorcyclist</option></select></div>
<div><button type="button" id="pd-go">Show me</button></div></div><div class="out" id="pd-out" aria-live="polite"></div></div>
<script>(function(){var D=""" + json.dumps(data) + """;document.getElementById('pd-go').addEventListener('click',function(){var x=D[document.getElementById('pd-u').value];document.getElementById('pd-out').innerHTML='<p><b>'+x[0]+'</b></p><p>'+x[1]+'</p><p class="note">If you can\\'t pass safely with that space, wait until you can.</p>';});})();</script>"""
    body = sec("Free tool", "How much room <span class=\"tr\">should I give?</span>", "<p>The Highway Code's passing distances, in one place.</p>" + tool)
    body += sec("Read more", "Country roads <span class=\"tr\">guide</span>", sq([("country-roads-horses-and-cyclists.html", "Country roads, horses and cyclists", "Bends, lanes and passing places."), ("blind-spot-checks.html", "Blind spot checks", "When and how.")]))
    out[f] = page(f, "How Much Room to Give Cyclists & Horses | Passing Distance Guide | DriveSQ",
                  "Highway Code passing distances: 1.5 m for cyclists up to 30 mph, 2 m and under 10 mph for horses, 2 m for people walking in the road.",
                  "passing distance cyclist, how to pass a horse driving, highway code 1.5 metres, passing horses 10mph", "How much room should I give?",
                  "Cyclists, horses, people walking and motorbikes — the Highway Code distances.", ["1.5 m cyclists", "2 m horses", "Under 10 mph"], body,
                  [("How much room should I give a cyclist?", "At least 1.5 metres at up to 30 mph, more at higher speeds."), ("How do I pass a horse?", "At under 10 mph, leaving at least 2 metres.")],
                  src(["hc_vuln", "hc_road"]), schema(f, "Passing distance guide", "Highway Code passing distances for vulnerable road users."))

    # 4. which lights
    f = NEW[3][0]
    tool = """<div class="dt"><div class="g"><div><label for="wl-t">Time</label><select id="wl-t"><option value="day">Daytime</option><option value="night">Night (sunset to sunrise)</option></select></div>
<div><label for="wl-v">How far can you see?</label><select id="wl-v"><option value="good">Clearly</option><option value="poor">Reduced, more than about 100 m</option><option value="fog">Less than about 100 m</option></select></div>
<div><label for="wl-s">Street lights?</label><select id="wl-s"><option value="lit">Lit street (usually 30 mph)</option><option value="unlit">Unlit road</option></select></div>
<div><button type="button" id="wl-go">Which lights?</button></div></div><div class="out" id="wl-out" aria-live="polite"></div></div>
<script>(function(){document.getElementById('wl-go').addEventListener('click',function(){var t=document.getElementById('wl-t').value,v=document.getElementById('wl-v').value,s=document.getElementById('wl-s').value,a=[];
if(t==='night'){a.push('Sidelights and number-plate lights on (required between sunset and sunrise).');a.push(v==='fog'?'Headlights on, dipped — not main beam.':s==='unlit'?'Headlights on. Use main beam when nothing is ahead or coming towards you, and dip it so you don\\'t dazzle others.':'Dipped headlights are good practice on lit streets — the law only requires headlights where there\\'s no street lighting.');}
if(v==='poor'||v==='fog')a.push('Dipped headlights on — visibility is reduced.');if(v==='fog')a.push('Fog lights allowed while visibility stays seriously reduced (generally under about 100 m). Don\\'t use main beam in fog.');else a.push('Fog lights OFF — they dazzle drivers behind and can hide your brake lights.');
if(t==='day'&&v==='good')a.unshift('No lights needed — many cars run daytime running lights automatically.');
document.getElementById('wl-out').innerHTML='<ul>'+a.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul>';});})();</script>"""
    body = sec("Free tool", "Which lights <span class=\"tr\">should I use?</span>", "<p>Pick the conditions and get the Highway Code answer.</p>" + tool)
    body += sec("Read more", "Fog and bad <span class=\"tr\">weather</span>", sq([("fog-and-headlights.html", "Driving in fog", "Lights, gaps and test-day cancellations."), ("driving-test-cancelled-what-now.html", "Test cancelled?", "Your rights.")]))
    out[f] = page(f, "Which Car Lights Should I Use? Fog Lights, Dipped & Main Beam | DriveSQ",
                  "Free tool: pick day or night, visibility and street lighting to see which lights the Highway Code says to use — dipped, main beam or fog lights.",
                  "when to use fog lights, dipped headlights rules, which lights to use at night, fog lights 100 metres", "Which lights should I use?",
                  "Dipped, main beam or fog lights — the Highway Code answer for any conditions.", ["Fog under ~100 m", "Dip for others", "Fog lights off after"], body,
                  [("When can I use fog lights?", "When visibility is seriously reduced — generally under about 100 metres — and you must switch them off when it improves."), ("Do I need headlights on lit streets at night?", "The law requires headlights at night except on roads with street lighting (usually 30 mph), but dipped headlights are good practice.")],
                  src(["hc_lights", "hc_weather"]), schema(f, "Which lights should I use?", "Highway Code guidance on car lights by conditions."))

    # 5. cockpit drill
    f = NEW[4][0]
    steps = [("Doors", "All shut — no warning light."), ("Seat", "Pedal fully down with a slight bend in the knee; back supported."), ("Steering", "Wrists rest on top of the wheel with your back on the seat."),
             ("Seatbelt", "On, flat, not twisted — passengers too."), ("Mirrors", "Interior frames the rear window; door mirrors show a sliver of your car."),
             ("Prepare", "Gear selected, find the bite (manual) or foot on the brake (automatic)."), ("Observe", "Mirrors and blind spot over your shoulder."), ("Move", "Only when safe — signal if it would help anyone.")]
    boxes = "".join(f'<label style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;color:#ddd"><input type="checkbox" class="cd" style="width:auto;margin-top:4px"><span><b>{a}</b> — {b}</span></label>' for a, b in steps)
    tool = f"""<div class="dt">{boxes}<div class="out" id="cd-out" aria-live="polite"></div></div>
<script>(function(){{var b=document.querySelectorAll('.cd'),o=document.getElementById('cd-out');function u(){{var n=0;b.forEach(function(x){{if(x.checked)n++;}});o.innerHTML=n===b.length?'<p class="best">All done — ready to drive.</p>':'<p class="note">'+n+' of '+b.length+' done.</p>';}}b.forEach(function(x){{x.addEventListener('change',u);}});u();}})();</script>"""
    body = sec("Free checklist", "Cockpit drill: <span class=\"tr\">DSSSM + POM</span>", "<p>Tick through it in the car (passenger's job if you're driving).</p>" + tool)
    body += sec("Read more", "First <span class=\"tr\">lessons</span>", sq([("cockpit-drill-dsssm.html", "The cockpit drill explained", "Step by step."), ("blind-spot-checks.html", "Blind spot checks", "When and how.")]))
    out[f] = page(f, "Cockpit Drill Checklist (DSSSM) | Interactive | DriveSQ",
                  "Interactive cockpit drill checklist for learner drivers: Doors, Seat, Steering, Seatbelt, Mirrors — then Prepare, Observe, Move.",
                  "cockpit drill, dsssm, cockpit drill checklist, pom driving, first driving lesson checklist", "Cockpit drill checklist",
                  "Doors, Seat, Steering, Seatbelt, Mirrors — then POM. Tick it off every time.", ["DSSSM", "POM", "30 seconds"], body,
                  [("What is the cockpit drill?", "Doors, Seat, Steering, Seatbelt, Mirrors — the checks before every drive."), ("What does POM mean?", "Prepare, Observe, Move.")],
                  src(["lessons", "hc_road"]), schema(f, "Cockpit drill checklist", "Interactive DSSSM and POM checklist."))

    # 6. manual or automatic
    f = NEW[5][0]
    qs = [("Will your first car be electric or hybrid?", 2, -1), ("Is clutch control holding you back, or do you want to pass sooner?", 2, 0), ("Might you drive manual vans or pool cars for work?", -2, 1),
          ("Will your first car be a cheap used car?", -1, 1), ("Will you hire cars abroad?", -1, 1)]
    qh = "".join(f'<div class="q"><p>{q}</p><div class="o"><label><input type="radio" name="ma{i}" value="{y}">Yes</label><label><input type="radio" name="ma{i}" value="{n}">No / not sure</label></div></div>' for i, (q, y, n) in enumerate(qs))
    tool = f"""<div class="dt">{qh}<div style="margin-top:12px"><button type="button" id="ma-go">Decide</button></div><div class="out" id="ma-out" aria-live="polite"></div>{NOTE}</div>
<script>(function(){{document.getElementById('ma-go').addEventListener('click',function(){{var s=0,n=0;for(var i=0;i<{len(qs)};i++){{var x=document.querySelector('input[name="ma'+i+'"]:checked');if(x){{n++;s+=+x.value;}}}}
var o=document.getElementById('ma-out');if(n<{len(qs)}){{o.innerHTML='<p class="note">Answer all {len(qs)} questions.</p>';return;}}
o.innerHTML=s>1?'<p><b class="best">Automatic</b> suits you. Remember an automatic licence only covers automatic cars (electric cars count).</p>':s<-1?'<p><b class="best">Manual</b> suits you — and your licence will cover automatics too.</p>':'<p><b>Either works.</b> Manual gives you a licence for both; automatic is usually quicker to learn.</p>';}});}})();</script>"""
    body = sec("60-second decider", "Manual or <span class=\"tr\">automatic?</span>", "<p>Five questions, one honest answer. Same price either way with DriveSQ and SQ Driving School.</p>" + tool)
    body += sec("The 2030 rule", "What the petrol ban <span class=\"tr\">means</span>", "<p>From 2030 new cars powered only by petrol or diesel can't be sold in the UK; hybrids with significant electric range can be sold until 2035. Used petrol and diesel cars can still be driven.</p>", alt=True)
    body += sec("Read more", "Manual vs <span class=\"tr\">automatic</span>", sq([("manual-or-automatic-2030-petrol-ban.html", "Manual or automatic after 2030?", "What the ban means for learners."), ("manual-vs-automatic.html", "Manual vs automatic", "The full comparison.")]))
    out[f] = page(f, "Should I Learn Manual or Automatic? 60-Second Decider (2030 Ban) | DriveSQ",
                  "Should you learn manual or automatic in 2026? Answer five questions — EVs, work vans, budget — and get an honest recommendation, plus what the 2030 ban means.",
                  "manual or automatic, should i learn manual or automatic, 2030 petrol ban learner, automatic licence", "Manual or automatic?",
                  "Five questions, one honest answer — with what the 2030 petrol ban means for learners.", ["5 questions", "Same price", "2030 explained"], body,
                  [("Will manual cars be banned?", "No — from 2030 new petrol- and diesel-only cars can't be sold, but used ones can still be driven."), ("Does an automatic licence cover electric cars?", "Yes.")],
                  src(["zev", "cats"]), schema(f, "Manual or automatic decider", "Helps learners choose between manual and automatic lessons."))
    return out
