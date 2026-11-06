#!/usr/bin/env python3
"""DriveSQ — four more Solihull pages from DVSA's official tables (_data/dvsa_extra.json, _data/dvsa_centres.json).
  top-driving-test-faults-solihull.html          DVSA top 10 faults 2025-26 (+ how the ranking moved) mapped to Solihull roads; self-check tool
  theory-test-pass-rates-near-solihull.html      theory pass rates at Birmingham, Coventry, Sutton Coldfield, Redditch, Stratford, Wolverhampton vs GB
  driving-test-attempts-solihull.html            pass rate by attempt number (GB) + local first-attempt vs overall + retake cost calculator
  driving-test-pass-rate-by-month-solihull.html  every centre's pass rate by calendar month, averaged over years of DVSA monthly data
Run after generate_dvsa_topics.py:  python3 generate_dvsa_more.py"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("tp", os.path.join(HERE, "generate_dvsa_topics.py"))
TP = importlib.util.module_from_spec(_s); _s.loader.exec_module(TP)
L, e, C, NAT, Y, ORDER, SHORT, COLS = TP.L, TP.e, TP.C, TP.NAT, TP.Y, TP.ORDER, TP.SHORT, TP.COLS
X = json.load(open(os.path.join(HERE, "_data/dvsa_extra.json"), encoding="utf-8"))
SQS = L.SQS
TODAY = "2026-11-09"
GBDATA = ("DVSA via GOV.UK — driving test and theory test data: cars (DRT112A, DRT121D, DRT121F)", "https://www.gov.uk/government/statistical-data-sets/driving-test-and-theory-test-data-cars")
TP.EXTRA_SRC.update({"gb": GBDATA, "retake": ("GOV.UK — driving test: if you fail", "https://www.gov.uk/driving-test/driving-test-faults-result"),
                     "cost": ("GOV.UK — driving test cost", "https://www.gov.uk/driving-test-cost"), "theory_book": ("GOV.UK — book your theory test", "https://www.gov.uk/book-theory-test"),
                     "theory_pass": ("GOV.UK — theory test pass mark and result", "https://www.gov.uk/theory-test/pass-mark-and-result")})
MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

# what each DVSA fault means, and where Solihull learners meet it (roads from SQ Driving School's Solihull road guides)
FAULTS = {
    "Junctions - observation": ("Not looking properly before emerging.", "Emerging from estate roads onto the A34 Stratford Road in Shirley and the A41 Warwick Road in Olton, where parked cars and bus stops hide traffic.", "a34-stratford-road-shirley", "A34 Stratford Road"),
    "Mirrors - change direction": ("Not checking mirrors before turning, changing lanes or pulling out.", "Lane changes on the A45 and A41 dual carriageways and on multi-lane roundabouts such as Stonebridge Island.", "stonebridge-island-a446-hs2-roundabout", "Stonebridge Island"),
    "Junctions - turning right": ("Poor judgement, position or speed when turning right.", "Right turns across oncoming traffic on the A34 and at the Blossomfield Road junctions.", "blossomfield-road-junction-signals", "Blossomfield Road junctions"),
    "Response to signs - traffic lights": ("Not reacting correctly to traffic lights.", "Signal-controlled junctions in Solihull town centre and along Blossomfield Road and Lode Lane.", "blossomfield-road-junction-signals", "Blossomfield Road signals"),
    "Control - steering": ("Steering too early, too late or erratically.", "Tight estate roads with parked cars on both sides, and mini-roundabouts in Shirley and Monkspath.", "roundabouts-solihull-learner-guide", "Solihull roundabouts"),
    "Move off - safely": ("Moving off without proper checks — including the blind spot.", "Pulling out from the kerb on busy roads like Lode Lane and Hobs Moat Road, and after the pull-up-on-the-right exercise.", "lode-lane-hobs-moat-road-bus-lanes", "Lode Lane & Hobs Moat Road"),
    "Response to signs - road markings": ("Ignoring lane arrows, box junctions or give-way lines.", "Lane arrows on the approaches to big roundabouts and the town-centre one-way streets.", "road-markings-solihull-learner-guide", "Solihull road markings"),
    "Response to signs - traffic signs": ("Missing speed limits, no-entry and other signs.", "Changing speed limits — 20 mph zones, 30 and 40 mph roads — and village limits around Knowle and Dorridge.", "solihull-speed-cameras-20mph-and-enforcement", "20 mph zones & speed limits"),
    "Positioning - normal driving": ("Driving too close to the kerb or the centre line, or straddling lanes.", "Bus lanes on Lode Lane and Hobs Moat Road, and lane choice on the A45 Coventry Road.", "lode-lane-hobs-moat-road-bus-lanes", "Bus lanes"),
    "Maintain progess - speed": ("Driving too slowly for the road and conditions (hesitancy).", "The 40 and 50 mph dual carriageways — A45, A41 and the new A4545 link road — where learners hold back.", "a45-coventry-road-airport-nec", "A45 Coventry Road"),
    "Use of speed": ("Driving too fast for the road or conditions.", "Wide boulevards like Cranmore Boulevard where speed creeps up, and village roads in the borough.", "hardest-and-easiest-roads-solihull-learners", "Hardest roads in Solihull"),
}


def fault_name(f): return f.replace(" - ", ": ").replace("progess", "progress")


# ───────────────────────── 1. faults ─────────────────────────
def faults():
    f = "top-driving-test-faults-solihull.html"
    per = X["faults"]; keys = sorted(per, key=lambda k: k[-4:], reverse=True)
    cur = per[keys[0]]
    prev = {n: i + 1 for i, n in enumerate(per[keys[1]])}
    old_key = next((k for k in keys if k.endswith("2016")), keys[-1]); old = {n: i + 1 for i, n in enumerate(per[old_key])}
    rows = "".join(f'<tr><td><b>{i + 1}</b></td><td>{e(fault_name(n))}</td><td>{("↑" if prev[n] > i + 1 else "↓" if prev[n] < i + 1 else "=") + " " + str(prev[n]) if n in prev else "new"}</td><td>{old.get(n, "—")}</td></tr>' for i, n in enumerate(cur))
    cards = "".join(
        f'<div class="sol-card reveal"><b>{i + 1}. {e(fault_name(n))}</b><span>{e(FAULTS.get(n, ("", "", "", ""))[0])}<br><b style="display:inline">In Solihull:</b> {e(FAULTS.get(n, ("", "", "", ""))[1])}'
        + (f' <a href="{SQS}{FAULTS[n][2]}.html">{e(FAULTS[n][3])} guide →</a>' if n in FAULTS else "") + "</span></div>" for i, n in enumerate(cur))
    tool = '<div class="sol-card reveal" style="padding:22px"><p style="font-weight:600">Tick the ones you\'re confident about on Solihull roads:</p><div id="fcList" style="display:grid;gap:6px"></div><div id="fcOut" class="mt-3"></div></div>'
    secs = [TP.kpis([(10, 0, "", "most common faults, DVSA 2025-26"), (len(keys), 0, "", "years of DVSA fault rankings"), (C["shirley"]["years"][Y]["p"], 1, "%", "Shirley pass rate 2025-26"), (NAT["years"][Y]["p"], 1, "%", "Great Britain pass rate")]),
            L.sec("top10", "DVSA's top 10", "The 10 most common driving test faults (2025-26)", "Across every car test in Great Britain, April 2025 to March 2026 — and where each one catches learners in Solihull.", f'<div class="sol-grid">{cards}</div>'),
            L.sec("check", "Self-check", "Which faults are you ready for?", "Be honest — the ones you leave unticked are what to work on next.", tool, alt=True),
            L.sec("moves", "How the ranking moved", "Top 10 faults: this year, last year and ten years ago", "",
                  f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>2025-26</th><th>Fault</th><th>2024-25 rank</th><th>{e(old_key[-9:])} rank</th></tr></thead><tbody>{rows}</tbody></table></div>'
                  f'<p class="sol-note mt-2">DVSA publishes the top 10 faults for every financial year back to {e(keys[-1][-9:])}. "Junctions: observation" has been number one in every year shown.</p>'),
            L.sec("fix", "Fix them", "How DriveSQ lessons target the top faults", "",
                  L.cards([("bi-signpost-split", "Practise on the real roads", "We use the junctions and roundabouts around your test centre, not just quiet estates."),
                           ("bi-clipboard-check", "Mock tests marked like DVSA", "Every fault recorded the way an examiner would, so you know exactly what to fix."),
                           ("bi-phone", "Skills tracked in your portal", "All 23 skills rated after each lesson in the free DriveSQ Student Portal."),
                           ("bi-calculator", "Would you have passed?", '<a href="driving-test-fault-counter.html">Try our fault counter</a> after a mock drive.')]) + TP.links(), alt=True),
            TP.sources(("gb",))]
    faqs = [("What is the most common reason for failing a driving test?", f"'Junctions: observation' — not looking properly before emerging — was the most common fault in 2025-26, according to DVSA, as it has been for years."),
            ("What are the top 10 driving test faults?", "In 2025-26: " + ", ".join(fault_name(n) for n in cur) + " (DVSA)."),
            ("Where do Solihull learners make these faults?", "Typically at busy junctions on the A34 Stratford Road and A41 Warwick Road, on multi-lane roundabouts, at signal junctions in the town centre and on the 40–50 mph dual carriageways.")]
    data = {"faults": [fault_name(n) for n in cur], "where": [FAULTS.get(n, ("", ""))[1] for n in cur]}
    script = """var box=document.getElementById('fcList');D.faults.forEach(function(n,i){var l=document.createElement('label');l.style.cssText='display:flex;gap:10px;align-items:center;padding:8px 12px;border:1px solid #eee;border-radius:10px;cursor:pointer';l.innerHTML='<input type="checkbox" data-i="'+i+'"> <span><b>'+(i+1)+'.</b> '+n+'</span>';box.appendChild(l);});
function u(){var c=[].slice.call(box.querySelectorAll('input')),ok=c.filter(function(x){return x.checked;}).length,todo=c.filter(function(x){return !x.checked;}).map(function(x){return +x.getAttribute('data-i');});
DSQCharts.bars(document.getElementById('fcOut'),[{label:'Confident',value:ok*10,hi:true},{label:'Still to work on',value:(10-ok)*10}],{unit:'%',max:100,digits:0});
var o=document.getElementById('fcOut');o.insertAdjacentHTML('beforeend',todo.length?'<p class="mt-3"><b>Next lesson focus:</b> '+D.faults[todo[0]]+' — '+D.where[todo[0]]+'</p><p><a class="dsqx-btn dsqx-btn--red" href="#book">Book a lesson on it</a></p>':'<p class="mt-3"><b>Great — sounds like mock-test time.</b> <a href="#book">Book a mock test</a>.</p>');
var nt=document.querySelector('#dsqInlineBookForm [name=notes]');if(nt&&todo.length&&(!nt.value||/^Want to work on/.test(nt.value)))nt.value='Want to work on: '+todo.slice(0,3).map(function(i){return D.faults[i];}).join(', ');}
box.addEventListener('change',u);u();"""
    hero = L.hero("Official DVSA data", '<span class="w">Top 10</span> <span class="w w--red">Test</span> <span class="w">Faults.</span>', "what fails driving tests — and where Solihull learners meet each one",
                  [("bi-list-ol", "DVSA 2025-26"), ("bi-signpost-split", "Solihull roads"), ("bi-check2-square", "Self-check")], [("red", "#top10", "bi-list-ol", "See the top 10"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, TP.build(f, "Top 10 test faults", "Top 10 Driving Test Faults 2026 (DVSA) — and Where Solihull Learners Make Them | DriveSQ",
                       "The 10 most common driving test faults in 2025-26 from DVSA, how the ranking has changed, and the Solihull roads and junctions where learners meet each one — with a self-check.",
                       "most common driving test faults, top 10 driving test faults, why people fail driving test, driving test faults solihull", hero, secs, faqs, data, script)


# ───────────────────────── 2. theory ─────────────────────────
def theory():
    f = "theory-test-pass-rates-near-solihull.html"
    T = X["theory"]; cs = [k for k in T if k != "GB"]
    cur = {k: T[k]["2025-26"] for k in cs if "2025-26" in T[k]}
    gb = T["GB"]["2025-26"]; years = sorted(T["Birmingham"])
    order = sorted(cur, key=lambda k: -cur[k]["p"])
    rows = "".join(f'<tr><td><b>{e(k)}</b></td><td>{cur[k]["p"]}%</td><td>{cur[k]["n"]:,}</td><td>{cur[k]["m"]}%</td><td>{cur[k]["f"]}%</td></tr>' for k in order)
    rows += f'<tr><td><b>Great Britain</b></td><td>{gb["p"]}%</td><td>{gb["n"]:,}</td><td>{gb["m"]}%</td><td>{gb["f"]}%</td></tr>'
    b = cur["Birmingham"]
    cols = ["#D10A11", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"]
    secs = [TP.kpis([(b["p"], 1, "%", "Birmingham theory pass rate 2025-26"), (b["n"], 0, "", "theory tests at Birmingham"), (cur["Coventry"]["p"], 1, "%", "Coventry"), (gb["p"], 1, "%", "Great Britain")]),
            L.sec("rank", "2025-26", "Theory test pass rates near Solihull", "Solihull's own theory centre closed, so learners here test at these centres.", TP.card("chTh")),
            L.sec("table", "The numbers", "Pass rates, tests, men and women (2025-26)", "", f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Theory centre</th><th>Pass rate</th><th>Tests</th><th>Men</th><th>Women</th></tr></thead><tbody>{rows}</tbody></table></div>', alt=True),
            L.sec("trend", "Trend", f"Since {years[0]}", "DVSA's by-centre theory figures under the current centre names start in 2022-23.", TP.card("chThT")),
            L.sec("pass", "Passing first time", "How to pass your theory test", "",
                  L.cards([("bi-journal-check", "Practise the real format", "50 questions in 57 minutes, pass mark 43 — then hazard perception, pass mark 44 out of 75."),
                           ("bi-phone", "700+ questions free", "Every DriveSQ learner gets the Student Portal: a full question bank and 14 mock tests."),
                           ("bi-camera-video", "Hazard perception", "Respond as soon as a hazard starts to develop — not before, and don't click repeatedly."),
                           ("bi-geo-alt", "Where to sit it", '<a href="theory-test-centre-near-solihull.html">Theory test centres near Solihull</a> — Birmingham, Coventry or Sutton Coldfield.')]) + TP.links(), alt=True),
            TP.sources(("gb", "theory_book", "theory_pass"))]
    faqs = [("What is the theory test pass rate in Birmingham?", f"{b['p']}% at Birmingham's theory test centre in 2025-26, from {b['n']:,} tests (DVSA). Great Britain's average was {gb['p']}%."),
            ("Which theory test centre near Solihull has the highest pass rate?", f"{order[0]}, at {cur[order[0]]['p']}% in 2025-26."),
            ("Do women pass the theory test more often?", f"Yes across Great Britain in 2025-26: women {gb['f']}%, men {gb['m']}% (DVSA).")]
    data = {"cur": {k: cur[k]["p"] for k in order}, "gb": gb["p"], "years": years, "trend": {k: [T[k].get(y, {}).get("p") for y in years] for k in order}, "gbt": [T["GB"].get(y, {}).get("p") for y in years], "cols": cols}
    script = """var it=Object.keys(D.cur).map(function(k,i){return{label:k,value:D.cur[k],hi:k==='Birmingham'};});it.push({label:'Great Britain',value:D.gb});DSQCharts.bars(document.getElementById('chTh'),it,{unit:'%',max:60});
var i=0,S=Object.keys(D.trend).map(function(k){return{name:k,color:D.cols[i++%6],pts:D.years.map(function(y,j){return[y.slice(2,4)+'/'+y.slice(5),D.trend[k][j]];})};});S.push({name:'Great Britain',color:'#111',dash:1,pts:D.years.map(function(y,j){return[y.slice(2,4)+'/'+y.slice(5),D.gbt[j]];})});DSQCharts.line(document.getElementById('chThT'),{label:'Theory pass rates',unit:'%',series:S});"""
    hero = L.hero("Official DVSA data", '<span class="w">Theory Test</span> <span class="w w--red">Pass</span> <span class="w">Rates.</span>', "Birmingham, Coventry, Sutton Coldfield and more — where Solihull learners sit the theory test",
                  [("bi-journal-check", "DVSA 2025-26"), ("bi-gender-ambiguous", "Men & women"), ("bi-graph-up", "Trend")], [("red", "#rank", "bi-bar-chart", "See the rates"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, TP.build(f, "Theory test pass rates", "Theory Test Pass Rates Near Solihull: Birmingham, Coventry & More (DVSA 2025-26) | DriveSQ",
                       f"Theory test pass rates at the centres Solihull learners use — Birmingham {b['p']}%, Coventry, Sutton Coldfield, Redditch, Stratford-upon-Avon and Wolverhampton — from DVSA 2025-26, with men vs women and trends.",
                       "theory test pass rate birmingham, theory test pass rate coventry, theory test solihull, sutton coldfield theory test pass rate", hero, secs, faqs, data, script)


# ───────────────────────── 3. attempts ─────────────────────────
def attempts():
    f = "driving-test-attempts-solihull.html"
    A = X["attempts_2526"]; ks = ["1", "2", "3", "4", "5", "6 or more"]
    tot_n = sum(A[k]["n"] for k in ks); tot_p = sum(A[k]["pass"] for k in ks)
    local = {k: ((C[k]["first"].get(Y) or {}).get("p"), C[k]["years"][Y]["p"]) for k in ORDER}
    rows = "".join(f'<tr><td>{k if k != "6 or more" else "6th or later"}</td><td>{A[k]["n"]:,}</td><td><b>{A[k]["p"]}%</b></td></tr>' for k in ks)
    tool = """<div class="sol-card reveal" style="padding:22px"><div class="row g-3"><div class="col-md-4"><label style="font-size:.85rem;display:block">Test slot<select id="rtDay" class="form-select"><option value="62">Weekday — £62</option><option value="75">Evening, weekend or bank holiday — £75</option></select></label></div>
<div class="col-md-4"><label style="font-size:.85rem;display:block">Warm-up / car hire on the day (£)<input id="rtCar" type="number" value="70" min="0" class="form-control"></label></div><div class="col-md-4"><label style="font-size:.85rem;display:block">Extra lessons before a retake (hours)<input id="rtH" type="number" value="4" min="0" class="form-control"></label></div></div>
<div class="sol-kpi mt-3"><div><b id="rtOne">£0</b><span>cost of each retake</span></div><div><b id="rtTwo">£0</b><span>if you needed two retakes</span></div></div><p class="sol-note mt-2 mb-0">At DriveSQ's £35/hr. Your instructor's car on test day is usually a 1–2 hour lesson. DVSA test fees from GOV.UK.</p></div>"""
    secs = [TP.kpis([(A["1"]["p"], 1, "%", "first attempts passed (GB 2025-26)"), (A["6 or more"]["p"], 1, "%", "6th-or-later attempts passed"), (round(100 * A["1"]["n"] / tot_n), 0, "%", "of tests were first attempts"), (local["shirley"][0], 1, "%", "first-attempt pass rate at Shirley")]),
            L.sec("attempt", "Every attempt", "Pass rate by attempt number (Great Britain, 2025-26)", "First and second attempts pass at about the same rate; from the fourth attempt it falls.", TP.card("chAt")),
            L.sec("table", "The numbers", "Tests and pass rates by attempt", "", f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Attempt</th><th>Tests</th><th>Pass rate</th></tr></thead><tbody>{rows}</tbody></table></div><p class="sol-note mt-2">DVSA publishes attempts for Great Britain only, not by test centre. All tests: {tot_n:,}, passes {tot_p:,}.</p>', alt=True),
            L.sec("local", "Near Solihull", "First attempts vs all tests at each centre (2025-26)", "Red: first-attempt pass rate. Grey: all tests.", TP.card("chLoc")),
            L.sec("cost", "Retake costs", "What does a retake cost?", "You must wait at least 10 working days before you can take another test.", tool, alt=True),
            L.sec("avoid", "Avoid the retake", "Give yourself the best first attempt", "",
                  L.cards([("bi-clipboard-check", "Book when ready, not when free", "Use our <a href=\"solihull-driving-test-readiness-check.html\">readiness check</a> and do a full mock first."),
                           ("bi-list-ol", "Know the top faults", '<a href="top-driving-test-faults-solihull.html">The 10 faults DVSA sees most</a> — and the Solihull roads where they happen.'),
                           ("bi-card-checklist", "Show me, tell me", '<a href="show-me-tell-me-questions-trainer.html">Practise all 21 questions</a>.'),
                           ("bi-hourglass-split", "Waits", '<a href="driving-test-waiting-times-solihull.html">Check the latest waiting times</a> before you book a retake.')]) + TP.links()),
            TP.sources(("gb", "retake", "cost"))]
    faqs = [("How many attempts does it take to pass a driving test?", f"Half of first attempts passed in 2025-26 ({A['1']['p']}%). Second attempts passed at {A['2']['p']}%, falling to {A['6 or more']['p']}% for sixth or later attempts (DVSA, Great Britain)."),
            ("How long do I have to wait to retake my driving test?", "At least 10 working days after your failed test, and then until an available date."),
            ("How much does a driving test retake cost?", "£62 on weekdays or £75 for evenings, weekends and bank holidays, plus your instructor's car and any extra lessons.")]
    data = {"att": [[k if k != "6 or more" else "6+", A[k]["p"]] for k in ks], "loc": {SHORT[k]: local[k] for k in ORDER}}
    script = """DSQCharts.bars(document.getElementById('chAt'),D.att.map(function(a,i){return{label:'Attempt '+a[0],value:a[1],hi:i===0};}),{unit:'%',max:60});
var it=[];Object.keys(D.loc).forEach(function(k){it.push({label:k+' — first attempt',value:D.loc[k][0],hi:true});it.push({label:k+' — all tests',value:D.loc[k][1]});});DSQCharts.bars(document.getElementById('chLoc'),it,{unit:'%',max:70});
function u(){var fee=+document.getElementById('rtDay').value,car=+document.getElementById('rtCar').value||0,h=+document.getElementById('rtH').value||0,one=fee+car+h*35;document.getElementById('rtOne').textContent='£'+one.toLocaleString('en-GB');document.getElementById('rtTwo').textContent='£'+(one*2).toLocaleString('en-GB');}
['rtDay','rtCar','rtH'].forEach(function(id){document.getElementById(id).addEventListener('input',u);document.getElementById(id).addEventListener('change',u);});u();"""
    hero = L.hero("Official DVSA data", '<span class="w">How Many</span> <span class="w w--red">Attempts?</span>', "pass rates by attempt number — and what a retake really costs",
                  [("bi-1-circle", "By attempt"), ("bi-geo-alt", "Solihull centres"), ("bi-calculator", "Retake cost")], [("red", "#attempt", "bi-bar-chart", "See the figures"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, TP.build(f, "Test attempts", "How Many Attempts to Pass a Driving Test? DVSA Data + Retake Costs | DriveSQ Solihull",
                       f"Driving test pass rates by attempt number from DVSA (first attempts {A['1']['p']}%), first-attempt rates at the seven centres Solihull learners use, and a retake cost calculator.",
                       "how many attempts to pass driving test, driving test retake cost, second attempt driving test pass rate, retake driving test solihull", hero, secs, faqs, data, script)


# ───────────────────────── 4. by calendar month (multi-year) ─────────────────────────
def by_month():
    f = "driving-test-pass-rate-by-month-solihull.html"
    M = X["months"]
    def avg(k, mon, skip=("2020", "2021")):
        v = [(r["n"], r["p"]) for lab, r in M[k].items() if lab.startswith(mon) and not any(s in lab for s in skip) and r["n"]]
        n = sum(a for a, _ in v); return (round(sum(a * p for a, p in v) / n, 1), len(v)) if n else (None, 0)
    grid = {k: {m: avg(k, m)[0] for m in MON} for k in ORDER}
    yrs = {k: max(avg(k, m)[1] for m in MON) for k in ORDER}
    best = {k: max(MON, key=lambda m: grid[k][m] or 0) for k in ORDER}; worst = {k: min(MON, key=lambda m: grid[k][m] or 99) for k in ORDER}
    def bg(v, k):
        vals = [x for x in grid[k].values() if x]; lo, hi = min(vals), max(vals); t = (v - lo) / (hi - lo) if hi > lo else .5
        return f"rgba(209,10,17,{0.06 + 0.6 * t:.2f})"
    head = "".join(f"<th>{m[:3]}</th>" for m in MON)
    body = "".join(f'<tr><td><a href="{TP.TC.fname(k)}">{e(SHORT[k])}</a></td>' + "".join(f'<td style="background:{bg(grid[k][m], k)};text-align:center">{grid[k][m]}</td>' for m in MON) + "</tr>" for k in ORDER)
    sh = "shirley"
    tool = '<div class="sol-card reveal" style="padding:22px"><div id="bmBtns" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div><div id="bmOut"></div><p id="bmNote" class="sol-note mt-2 mb-0"></p></div>'
    secs = [TP.kpis([(grid[sh][best[sh]], 1, "%", f"Shirley's best month on average: {best[sh]}"), (grid[sh][worst[sh]], 1, "%", f"its lowest: {worst[sh]}"), (yrs[sh], 0, "", "years of monthly data averaged"), (7, 0, "", "centres compared")]),
            L.sec("tool", "By centre", "Pass rate by calendar month at your test centre", "Average of every year DVSA publishes for that month, weighted by tests, leaving out the pandemic-disrupted 2020 and 2021.", tool),
            L.sec("heat", "Heatmap", "Every centre, every month", "Darker red = a better month for that centre (shading is per centre).",
                  f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th>{head}</tr></thead><tbody>{body}</tbody></table></div>', alt=True),
            L.sec("read", "Reading it", "What month should you book?", "",
                  L.cards([("bi-arrows-collapse", "The differences are small", "Typically a few points between a centre's best and worst month — far less than the effect of being properly ready."),
                           ("bi-calendar-heart", "Season still matters", '<a href="best-month-driving-test-solihull.html">Daylight, weather and school holidays</a> change how a month feels on the road.'),
                           ("bi-hourglass-split", "Waits decide more", 'With waits of 10–19 weeks, <a href="solihull-pass-by-date-planner.html">plan backwards</a> from the month you want.'),
                           ("bi-geo-alt", "Practise locally", "Whatever the month, lessons on your centre's roads are what move your odds.")]) + TP.links(), alt=True),
            TP.sources()]
    faqs = [("What is the best month to take a driving test at Shirley?", f"On DVSA's monthly figures (excluding 2020–21), {best[sh]} has averaged the highest pass rate at Shirley ({grid[sh][best[sh]]}%) and {worst[sh]} the lowest ({grid[sh][worst[sh]]}%)."),
            ("Do driving test pass rates change by month?", "A little — usually a few percentage points between a centre's best and worst month."),
            ("Where does this monthly data come from?", "DVSA's table of car driving test pass rates by month and test centre, published on GOV.UK.")]
    data = {"names": SHORT, "cols": COLS, "mon": [m[:3] for m in MON], "grid": {k: [grid[k][m] for m in MON] for k in ORDER}, "best": best, "yrs": yrs}
    script = """var b=document.getElementById('bmBtns'),cur='shirley';function draw(){var g=D.grid[cur],mx=Math.max.apply(null,g.filter(function(x){return x!=null;}));DSQCharts.bars(document.getElementById('bmOut'),D.mon.map(function(m,i){return{label:m,value:g[i],hi:g[i]===mx};}),{unit:'%',max:Math.max(70,mx+5)});
document.getElementById('bmNote').textContent=D.names[cur]+': best month on average '+D.best[cur]+'. Based on up to '+D.yrs[cur]+' years of DVSA monthly data.';[].forEach.call(b.children,function(x){x.className='dsqx-btn '+(x.getAttribute('data-k')===cur?'dsqx-btn--red':'dsqx-btn--ghost');});}
Object.keys(D.names).forEach(function(k){var x=document.createElement('button');x.type='button';x.setAttribute('data-k',k);x.textContent=D.names[k];x.onclick=function(){cur=k;draw();};b.appendChild(x);});draw();"""
    hero = L.hero("Official DVSA data", '<span class="w">Pass Rate</span> <span class="w w--red">by Month.</span>', "years of DVSA monthly data for every centre Solihull learners use",
                  [("bi-calendar3", "12 months × 7 centres"), ("bi-clock-history", "Years of data"), ("bi-sliders", "Pick your centre")], [("red", "#tool", "bi-bar-chart", "Pick your centre"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, TP.build(f, "Pass rate by month", "Driving Test Pass Rate by Month at Solihull Test Centres (DVSA, multi-year) | DriveSQ",
                       f"Which month has the best driving test pass rate at Shirley, Garretts Green, South Yardley, Kings Heath, Coventry, Redditch and Warwick — averaged over years of DVSA monthly data. Shirley's best: {best[sh]}.",
                       "best month driving test shirley, driving test pass rate by month, best time to take driving test birmingham, driving test month solihull", hero, secs, faqs, data, script)


PAGES = [faults, theory, attempts, by_month]


def main():
    out = dict(fn() for fn in PAGES)
    for f, h in out.items(): open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml"); x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{L.SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
