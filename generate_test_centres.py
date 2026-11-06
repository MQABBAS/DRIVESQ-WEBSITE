#!/usr/bin/env python3
"""DriveSQ — official DVSA data pages for the 7 test centres Solihull learners use, plus a comparison hub.
Data: _data/dvsa_centres.json (built by build_dvsa_centres.py from DVSA's DRT122A-F tables on GOV.UK).
Each page: animated 19-year trend vs Great Britain, 2025-26 months, ages 17-25, first attempts, automatic,
waiting times since 2019, DVSA cancellations, a 'your figures' tool, hand-written local notes, booking form.
Run after generate_solihull_landing.py:  python3 generate_test_centres.py"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("land", os.path.join(HERE, "generate_solihull_landing.py"))
L = importlib.util.module_from_spec(_s); _s.loader.exec_module(L)
e, SQS = L.e, L.SQS
DATA = json.load(open(os.path.join(HERE, "_data/dvsa_centres.json"), encoding="utf-8"))
C, NAT = DATA["centres"], DATA["national"]
Y = "2025-26"
TODAY = "2026-11-08"
HUB = "solihull-driving-test-centres-data.html"
ORDER = ["shirley", "warwick", "redditch", "kings-heath", "garretts-green", "south-yardley", "coventry"]

INFO = {
    "shirley": {"short": "Shirley", "addr": "401 Stratford Road, Shirley, Solihull B90 4AA", "lat": 52.40429, "lon": -1.82203,
                "local": "Solihull's own test centre sits on the A34 Stratford Road in Shirley. Tests mix the busy Stratford Road corridor — bus stops, shop parking and multi-lane junctions — with the newer estates of Monkspath, Cranmore and Blythe Valley, where roundabouts and 30–40 mph link roads dominate. The M42 at junction 4 is close by.",
                "roads": ["Stratford Road (A34)", "Marshall Lake Road", "Cranmore Boulevard", "Monkspath Hall Road", "Dog Kennel Lane", "Blythe Valley roundabouts"],
                "areas": "Shirley, Monkspath, Dickens Heath, Cheswick Green, Solihull town centre, Knowle and Dorridge"},
    "garretts-green": {"short": "Garretts Green", "addr": "Granby Avenue, Garretts Green, Birmingham B33 0SD", "lat": 52.47267, "lon": -1.77128,
                       "local": "The busiest of the seven centres. It's in east Birmingham near the Solihull border, so tests use dense city roads — bus lanes, parked cars on terraced streets, the Coventry Road (A45) and big signal-controlled junctions — as well as quieter estate roads around Sheldon and Kitts Green.",
                       "roads": ["Garretts Green Lane", "Coventry Road (A45)", "Sheldon Heath Road", "Kitts Green Road", "Stechford Lane"],
                       "areas": "Chelmsley Wood, Kingshurst, Marston Green, Castle Bromwich, Sheldon and north Solihull"},
    "south-yardley": {"short": "South Yardley", "addr": "Clay Lane, South Yardley, Birmingham B26 1EA", "lat": 52.45396, "lon": -1.81010,
                      "local": "Close to Solihull's north-western edge. Routes take in the Coventry Road (A45) and the Outer Ring Road (A4040), large multi-lane roundabouts and junctions, and residential streets in Yardley, Sheldon and Acocks Green with plenty of parked cars.",
                      "roads": ["Clay Lane", "Coventry Road (A45)", "Outer Ring Road (A4040)", "Hobs Moat Road", "Church Road, Yardley"],
                      "areas": "Olton, Elmdon, Lyndon, Sheldon, Acocks Green and west Solihull"},
    "kings-heath": {"short": "Kings Heath", "addr": "955 Alcester Road South, Kings Heath, Birmingham B14 5JA", "lat": 52.40657, "lon": -1.88712,
                    "local": "On the A435 Alcester Road South, a short drive west of Shirley. Expect a busy main road with bus stops and turning traffic, the Maypole junctions, and residential roads towards Druids Heath, Highters Heath and Solihull Lodge.",
                    "roads": ["Alcester Road South (A435)", "Maypole Lane", "Druids Lane", "Highters Heath Lane", "Shirley Road"],
                    "areas": "Solihull Lodge, west Shirley, Hollywood, Wythall and Hall Green"},
    "coventry": {"short": "Coventry", "addr": "42 Bayton Road, Exhall, Coventry CV7 9EJ", "lat": 52.46378, "lon": -1.47516,
                 "local": "North of Coventry at Exhall, near junction 3 of the M6. Routes can include fast dual carriageways such as the A444, industrial estate roads, and residential streets around Bedworth, Exhall and north Coventry.",
                 "roads": ["Bayton Road", "A444", "Longford Road", "Coventry Road, Exhall", "Bedworth Road"],
                 "areas": "Meriden, Balsall Common, Berkswell and the east of the borough"},
    "redditch": {"short": "Redditch", "addr": "Elm Road, Redditch B97 6HJ", "lat": 52.30854, "lon": -1.94704,
                 "local": "South of the borough in Worcestershire. Redditch is a new town built around dual-carriageway 'ways' and many roundabouts, so lane discipline on multi-lane roundabouts and joining faster roads matter more here than at the city centres.",
                 "roads": ["Elm Road", "Bromsgrove Highway", "Alvechurch Highway", "Coventry Highway", "Redditch town centre ring road"],
                 "areas": "Hockley Heath, Earlswood, Tanworth-in-Arden and the south of the borough"},
    "warwick": {"short": "Warwick", "addr": "Wedgenock House, Rothwell Road, Warwick CV34", "lat": 52.291, "lon": -1.597,
                "local": "On the Wedgnock industrial estate in north Warwick. Tests can include the A46 Warwick bypass and its junctions, Warwick's historic town-centre streets and one-way system, and roads towards Leamington Spa.",
                "roads": ["Rothwell Road", "Wedgnock Lane", "A46 Warwick bypass", "Coventry Road, Warwick", "Warwick town centre"],
                "areas": "Knowle, Dorridge, Balsall Common, Chadwick End and the south-east of the borough"},
}
SRC = [("DVSA via GOV.UK — car driving test data by test centre (DRT122A–E, April 2025 to March 2026)", "https://www.gov.uk/government/statistical-data-sets/car-driving-test-data-by-test-centre"),
       ("DVSA via GOV.UK — car driving test waiting times and availability by test centre (DRT122F)", "https://www.gov.uk/government/statistical-data-sets/car-driving-test-data-by-test-centre"),
       ("GOV.UK — find a driving test centre", "https://www.gov.uk/find-driving-test-centre"),
       ("GOV.UK — book your driving test", "https://www.gov.uk/book-driving-test")]


def fname(s): return f"{s}-driving-test-centre-pass-rate-wait-time.html"
def nm(s): return C[s]["name"]
def pc(v, d=1): return "—" if v is None else f"{v:.{d}f}%"
def yrs(c): return sorted(c["years"])
def mo_short(m): a = m.split("-")[0] if "-" in m else m.split(" ")[0]; return a[:3]


def sources():
    return L.sec("sources", "Sources", "Where this data comes from",
                 "Official DVSA statistics, published on GOV.UK under the Open Government Licence. Tables checked November 2026.",
                 '<ul style="font-size:.88rem">' + "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{e(t)}</a></li>' for t, u in SRC) + "</ul>", alt=True)


def facts(s):
    c = C[s]; y = c["years"][Y]; gb = NAT["years"][Y]
    rank = sorted(ORDER, key=lambda k: -C[k]["years"][Y]["p"]).index(s) + 1
    ys = [k for k in yrs(c) if c["years"][k].get("p") is not None and k != "2020-21"]
    best = max(ys, key=lambda k: c["years"][k]["p"]); worst = min(ys, key=lambda k: c["years"][k]["p"])
    base = "2019-20" if "2019-20" in c["years"] else ys[0]
    ms = c["months"]; bm = max(ms, key=lambda m: m["p"]); wm = min(ms, key=lambda m: m["p"])
    ages = [a for a in c["age"] if a["age"] != "Total"]
    w = [x for x in c["waits"] if x["med"] is not None]; wl = w[-1]; w6 = w[-7] if len(w) > 6 else w[0]
    can = c["cancel"]; reasons = {"examiner sickness": can.get("medical") or 0, "examiner leave": can.get("leave") or 0, "bad weather": can.get("weather") or 0}
    top = max(reasons, key=reasons.get)
    return dict(y=y, gb=gb, rank=rank, best=best, worst=worst, base=base, bm=bm, wm=wm, ages=ages, wl=wl, w6=w6, can=can, top=top, reasons=reasons,
                first=c["first"].get(Y), auto=c["auto"].get(Y), gbf=NAT["first"].get(Y), gba=NAT["auto"].get(Y))


def chart_data(s):
    c = C[s]; ks = [k for k in sorted(NAT["years"]) if k >= "2009-10"]
    return {"trend": {"labels": [k[2:4] + "/" + k[5:] for k in ks], "c": [c["years"].get(k, {}).get("p") for k in ks], "gb": [NAT["years"][k]["p"] for k in ks]},
            "months": [[mo_short(m["mo"]), m["p"], m["n"]] for m in c["months"]],
            "ages": [[a["age"], a["p"], a["n"]] for a in c["age"] if a["age"] != "Total"],
            "waits": [[x["mo"][:3] + " " + x["mo"][-2:], x["med"]] for x in c["waits"] if x["med"] is not None],
            "prof": {"all": c["years"][Y]["p"], "m": c["years"][Y]["m"], "f": c["years"][Y]["f"], "first": (c["first"].get(Y) or {}).get("p"), "auto": (c["auto"].get(Y) or {}).get("p"),
                     "age": {a["age"]: a["p"] for a in c["age"] if a["age"] != "Total"}, "gb": NAT["years"][Y]["p"]}}


SCRIPT = """<script src="dsq-charts.js?v=1"></script>
<script>(function(){var D=JSON.parse(document.getElementById('cdata').textContent),R='#D10A11',G='#6b7280';
DSQCharts.line(document.getElementById('chTrend'),{label:'Pass rate by year',unit:'%',series:[{name:D.name,color:R,pts:D.trend.labels.map(function(l,i){return[l,D.trend.c[i]];})},{name:'Great Britain',color:G,dash:1,pts:D.trend.labels.map(function(l,i){return[l,D.trend.gb[i]];})}]});
var mx=Math.max.apply(null,D.months.map(function(m){return m[1];})),mn=Math.min.apply(null,D.months.map(function(m){return m[1];}));
DSQCharts.bars(document.getElementById('chMonths'),D.months.map(function(m){return{label:m[0],value:m[1],note:m[2].toLocaleString('en-GB')+' tests',hi:m[1]===mx};}),{unit:'%',max:Math.max(70,mx+5)});
DSQCharts.bars(document.getElementById('chAges'),D.ages.map(function(a){return{label:'Age '+a[0],value:a[1],note:a[2]!=null?a[2].toLocaleString('en-GB')+' tests':'count not published',hi:a[0]==='17'};}),{unit:'%',max:Math.max(80,D.ages[0][1]+5)});
DSQCharts.line(document.getElementById('chWaits'),{label:'Median wait in weeks',unit:'',digits:1,min:0,series:[{name:'Median wait (weeks) — '+D.name,color:R,pts:D.waits}]});
var f=document.getElementById('pfForm');if(f){function run(){var g=f.g.value,a=f.a.value,fa=f.fa.checked,au=f.au.checked,P=D.prof,o=[];
o.push(['Everyone at '+D.short+' (2025-26)',P.all]);if(g==='m')o.push(['Men',P.m]);if(g==='f')o.push(['Women',P.f]);
if(a&&P.age[a]!=null)o.push(['Aged '+a,P.age[a]]);if(fa&&P.first!=null)o.push(['First attempts',P.first]);if(au&&P.auto!=null)o.push(['Automatic tests',P.auto]);o.push(['Great Britain average',P.gb]);
DSQCharts.bars(document.getElementById('pfOut'),o.map(function(x,i){return{label:x[0],value:x[1],hi:i>0&&i<o.length-1};}),{unit:'%',max:100});}
f.addEventListener('change',run);run();}})();</script>"""


def profile_tool(s):
    ages = "".join(f'<option value="{a["age"]}">{a["age"]}</option>' for a in C[s]["age"] if a["age"] != "Total")
    return f"""<div class="sol-card reveal" style="padding:22px"><form id="pfForm" style="display:flex;flex-wrap:wrap;gap:12px;align-items:end">
<label style="font-size:.85rem">You are<select name="g" class="form-select"><option value="">Prefer not to say</option><option value="m">Male</option><option value="f">Female</option></select></label>
<label style="font-size:.85rem">Age<select name="a" class="form-select"><option value="">26 or over / skip</option>{ages}</select></label>
<label style="font-size:.85rem;display:flex;gap:6px;align-items:center"><input type="checkbox" name="fa" checked> First attempt</label>
<label style="font-size:.85rem;display:flex;gap:6px;align-items:center"><input type="checkbox" name="au"> Automatic car</label></form>
<div id="pfOut" class="mt-3"></div>
<p class="sol-note mt-2 mb-0">These are DVSA's separate published pass rates for each group at {e(INFO[s]['short'])} in 2025-26 — not a prediction for you. The biggest factor is being properly ready.</p></div>"""


def centre_page(s):
    c, I = C[s], INFO[s]; F = facts(s); y, gb = F["y"], F["gb"]
    diff = y["p"] - gb["p"]; base = c["years"][F["base"]]["p"]
    cd = chart_data(s); cd.update({"name": nm(s), "short": I["short"]})
    others = [k for k in ORDER if k != s]
    ages = F["ages"]; a17 = ages[0] if ages else None; a25 = ages[-1] if ages else None
    wl, w6 = F["wl"], F["w6"]
    kpi = (f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal">'
           f'<div><b data-count="{y["p"]}" data-digits="1" data-suffix="%">{y["p"]}%</b><span>pass rate 2025-26 (GB {gb["p"]}%)</span></div>'
           f'<div><b data-count="{y["n"]}">{y["n"]:,}</b><span>tests in 2025-26</span></div>'
           f'<div><b data-count="{(F["first"] or {}).get("p") or 0}" data-digits="1" data-suffix="%">{pc((F["first"] or {}).get("p"))}</b><span>first-attempt pass rate</span></div>'
           f'<div><b data-count="{wl["med"]}" data-digits="1" data-suffix=" wks">{wl["med"]} wks</b><span>median wait, {wl["mo"].replace("-", " ")}</span></div></div></div></section>')
    summary = (f"In 2025-26 (April 2025 to March 2026), <b>{e(nm(s))}</b> carried out <b>{y['n']:,}</b> car tests and <b>{y['pass']:,}</b> passed — a pass rate of <b>{y['p']}%</b>, "
               f"{abs(diff):.1f} points {'above' if diff >= 0 else 'below'} the Great Britain average of {gb['p']}%. That ranks it <b>{F['rank']} of the 7</b> centres Solihull learners use. "
               f"In {F['base'].replace('-', '/')} it was {base}%, so it has {'risen' if y['p'] >= base else 'fallen'} by {abs(y['p'] - base):.1f} points since. "
               f"Its best year on record was {F['best'].replace('-', '/')} ({c['years'][F['best']]['p']}%) and its lowest {F['worst'].replace('-', '/')} ({c['years'][F['worst']]['p']}%).")
    gap = y["m"] - y["f"]
    detail = L.cards([
        ("bi-calendar3", "Best and worst month", f"{F['bm']['mo']}: {F['bm']['p']}% · {F['wm']['mo']}: {F['wm']['p']}% (2025-26)."),
        ("bi-gender-ambiguous", "Men and women", f"Men {y['m']}% ({y['mn']:,} tests), women {y['f']}% ({y['fn']:,}) — a {abs(gap):.1f}-point gap {'in favour of men' if gap > 0 else 'in favour of women' if gap < 0 else ''}."),
        ("bi-1-circle", "First attempts", f"{pc((F['first'] or {}).get('p'))} of {((F['first'] or {}).get('n') or 0):,} first attempts passed (GB {pc((F['gbf'] or {}).get('p'))}); {((F['first'] or {}).get('zero') or 0):,} first-timers passed with zero faults."),
        ("bi-gear", "Automatic tests", f"{pc((F['auto'] or {}).get('p'))} of {((F['auto'] or {}).get('n') or 0):,} automatic tests passed (GB automatic {pc((F['gba'] or {}).get('p'))})."),
        ("bi-person", "Young learners", f"17-year-olds passed {a17['p']}% of their tests; 25-year-olds {a25['p']}% — younger learners did better here, as across Britain." if a17 and a25 and a17["p"] > a25["p"] else f"17-year-olds: {a17['p'] if a17 else '—'}%."),
        ("bi-x-octagon", "Cancelled by DVSA", f"{F['can'].get('total', 0):,} tests cancelled by DVSA in 2025-26 — mostly {F['top']} ({F['reasons'][F['top']]:,}). You get a free new date, and can usually claim out-of-pocket expenses if DVSA cancels at short notice — but not for bad weather."),
    ])
    waits_txt = (f"The median wait from booking to test was <b>{wl['med']} weeks</b> in {wl['mo'].replace('-', ' ')}, compared with {w6['med']} weeks in {w6['mo'].replace('-', ' ')}. "
                 + (f"{wl['in7']:.0f}% of tests that month were taken within 7 weeks of booking. " if wl.get('in7') is not None else "")
                 + "Waits change month to month — check GOV.UK for the latest and book as soon as your instructor says you're close.")
    near = sorted(others, key=lambda k: (INFO[k]["lat"] - I["lat"]) ** 2 + ((INFO[k]["lon"] - I["lon"]) * 0.61) ** 2)[:3]
    comp = "".join(f'<tr><td><a href="{fname(k)}">{e(nm(k))}</a></td><td>{C[k]["years"][Y]["p"]}%</td><td>{C[k]["years"][Y]["n"]:,}</td><td>{[x for x in C[k]["waits"] if x["med"] is not None][-1]["med"]} wks</td></tr>' for k in [s] + near)
    sq_route = f'{SQS}{s}-driving-test-centre-routes.html'
    secs = [
        kpi,
        L.sec("summary", "2025-26 at a glance", f"{e(I['short'])} driving test centre in numbers", "", f'<p style="font-size:1.02rem">{summary}</p>' + detail),
        L.sec("trend", "19 years of data", f"{e(I['short'])} pass rate vs Great Britain", "Every year since 2009-10 from DVSA's tables. 2020-21 was heavily disrupted by the pandemic. Hover a point for the figure.",
              '<div class="sol-card reveal" style="padding:18px"><div id="chTrend"></div></div>', alt=True),
        L.sec("you", "Your figures", f"Pass rates for people like you at {e(I['short'])}", "Choose what applies — see the official pass rate for each group side by side.", profile_tool(s)),
        L.sec("months", "Month by month", "Pass rate by month, 2025-26", "The highlighted bar is the best month. Small differences between months are normal.",
              '<div class="sol-card reveal" style="padding:18px"><div id="chMonths"></div></div>', alt=True),
        L.sec("ages", "By age", "Pass rate by age (17 to 25), 2025-26", "DVSA publishes this table for 17 to 25-year-olds only.",
              '<div class="sol-card reveal" style="padding:18px"><div id="chAges"></div></div>'),
        L.sec("waits", "Waiting times", f"How long is the wait at {e(I['short'])}?", waits_txt,
              '<div class="sol-card reveal" style="padding:18px"><div id="chWaits"></div></div><p class="sol-note mt-2">DVSA median wait in weeks, each month since 2019. Gaps are months DVSA didn\'t publish a figure. '
              '<a href="driving-test-rule-changes-2026-solihull.html">2026 booking rules</a> · <a href="solihull-pass-by-date-planner.html">pass-by-date planner</a></p>', alt=True),
        L.sec("local", "Local knowledge", f"What test routes around {e(I['short'])} are like", "",
              f'<p>{e(I["local"])}</p><div class="area-head mt-2">Roads learners often mention</div>' + L.chips([(sq_route, r) for r in I["roads"]]) +
              f'<p class="mt-3">Examiners vary routes and DVSA doesn\'t publish them. For junction-by-junction notes see SQ Driving School\'s <a href="{sq_route}">{e(I["short"])} test route guide</a>.</p>'
              f'<p><b>Address:</b> {e(I["addr"])} · <b>Handy from:</b> {e(I["areas"])}.</p>'),
        L.sec("compare", "Nearby centres", "How it compares with the nearest centres", "2025-26 pass rate, tests and latest median wait.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Pass rate</th><th>Tests</th><th>Median wait</th></tr></thead><tbody>{comp}</tbody></table></div>'
              f'<p class="mt-2"><a href="{HUB}">Compare all 7 centres →</a> · <a href="solihull-driving-test-centre-finder.html">find your nearest by postcode</a> · <a href="driving-test-waiting-times-solihull.html">waiting-times tracker</a> · <a href="driving-test-pass-rate-by-age-solihull.html">pass rate by age</a> · <a href="automatic-vs-manual-pass-rate-solihull.html">automatic vs manual</a> · <a href="first-time-pass-rate-solihull.html">first-time passes</a> · <a href="driving-test-cancellations-solihull.html">cancellations</a></p>', alt=True),
        L.sec("prepare", "With DriveSQ", f"Preparing for a test at {e(I['short'])}", "",
              L.cards([("bi-signpost-split", "Lessons on the right roads", f"We teach on the roads around {I['short']} — the junctions and roundabouts you'll actually meet."),
                       ("bi-clipboard-check", "Mock tests", "Full mock tests marked the way examiners mark, so test day holds no surprises."),
                       ("bi-phone", "Free Student Portal", "Track your progress, practise 700+ theory questions and see your readiness checklist."),
                       ("bi-card-checklist", "Show me, tell me", 'Practise every question with our <a href="show-me-tell-me-questions-trainer.html">free trainer</a>.')])),
        sources(),
    ]
    first = F["first"] or {}
    faqs = [(f"What is the pass rate at {nm(s)} driving test centre?", f"{y['p']}% in 2025-26 ({y['pass']:,} passes from {y['n']:,} tests), according to DVSA. The Great Britain average was {gb['p']}%."),
            (f"What is the first-time pass rate at {nm(s)}?", f"{pc(first.get('p'))} of {first.get('n', 0):,} first attempts passed in 2025-26."),
            (f"How long is the wait for a driving test at {nm(s)}?", f"DVSA's median wait was {wl['med']} weeks in {wl['mo'].replace('-', ' ')}. It changes month to month."),
            (f"Where is {nm(s)} driving test centre?", f"{I['addr']}."),
            (f"Is {I['short']} a good test centre for Solihull learners?", f"It's handy from {I['areas']}. Its 2025-26 pass rate ranked {F['rank']} of the 7 centres Solihull learners use. The best centre is the one whose roads you've practised on.")]
    title = f"{nm(s)} Driving Test Centre: {y['p']}% Pass Rate, Wait Times & Data | DriveSQ"
    desc = f"{nm(s)} driving test centre in official DVSA figures: {y['p']}% pass rate in 2025-26 (GB {gb['p']}%), first-attempt and automatic pass rates, 19-year trend, pass rate by age and month, median wait {wl['med']} weeks."
    kw = f"{I['short'].lower()} driving test centre, {I['short'].lower()} driving test pass rate, {I['short'].lower()} test centre wait time, driving test {I['short'].lower()}"
    dataset = {"@context": "https://schema.org", "@type": "Dataset", "name": f"{nm(s)} driving test centre statistics 2025-26", "description": desc,
               "creator": {"@type": "GovernmentOrganization", "name": "Driver and Vehicle Standards Agency"}, "license": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
               "isBasedOn": SRC[0][1], "temporalCoverage": "2009-04/2026-09", "spatialCoverage": {"@type": "Place", "name": nm(s), "address": I["addr"]}}
    hero = L.hero("Official DVSA data · " + I["short"], f'<span class="w">{e(I["short"])}</span> <span class="w w--red">Test</span> <span class="w">Centre.</span>',
                  f"{y['p']}% pass rate in 2025-26 — every official figure, charted",
                  [("bi-bar-chart", "DVSA data to 2026"), ("bi-graph-up", "19-year trend"), ("bi-hourglass-split", "Latest waits")],
                  [("red", "#you", "bi-person-check", "Your figures"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    secs += [L.faq_html(faqs), L.booking()]
    html = L.page(fname(s), title, desc, kw, [L.faq_schema(faqs), L.crumbs(f"{I['short']} test centre", fname(s)), dataset], hero, secs)
    return html.replace("</body>", f'<script type="application/json" id="cdata">{json.dumps(cd)}</script>\n{SCRIPT}\n</body>', 1)


def hub():
    rows = sorted(ORDER, key=lambda k: -C[k]["years"][Y]["p"])
    def lastw(k): return [x for x in C[k]["waits"] if x["med"] is not None][-1]
    table = "".join(f'<tr><td><a href="{fname(k)}"><b>{e(nm(k))}</b></a></td><td>{C[k]["years"][Y]["p"]}%</td><td>{pc((C[k]["first"].get(Y) or {}).get("p"))}</td><td>{pc((C[k]["auto"].get(Y) or {}).get("p"))}</td><td>{C[k]["years"][Y]["n"]:,}</td><td>{lastw(k)["med"]} wks</td></tr>' for k in rows)
    gb = NAT["years"][Y]
    metrics = {"pass": ["Pass rate 2025-26", "%", {k: C[k]["years"][Y]["p"] for k in ORDER}, gb["p"]],
               "first": ["First-attempt pass rate", "%", {k: (C[k]["first"].get(Y) or {}).get("p") for k in ORDER}, (NAT["first"].get(Y) or {}).get("p")],
               "auto": ["Automatic pass rate", "%", {k: (C[k]["auto"].get(Y) or {}).get("p") for k in ORDER}, (NAT["auto"].get(Y) or {}).get("p")],
               "tests": ["Tests carried out", "", {k: C[k]["years"][Y]["n"] for k in ORDER}, None],
               "wait": ["Median wait (weeks, latest)", "", {k: lastw(k)["med"] for k in ORDER}, None],
               "age17": ["17-year-olds' pass rate", "%", {k: next((a["p"] for a in C[k]["age"] if a["age"] == "17"), None) for k in ORDER}, None],
               "gap": ["Men minus women (points)", "", {k: round(C[k]["years"][Y]["m"] - C[k]["years"][Y]["f"], 1) for k in ORDER}, round(gb["m"] - gb["f"], 1)]}
    names = {k: INFO[k]["short"] for k in ORDER}
    trend = {"labels": [k[2:4] + "/" + k[5:] for k in sorted(NAT["years"]) if k >= "2015-16"]}
    trend["series"] = {INFO[k]["short"]: [C[k]["years"].get(y, {}).get("p") for y in sorted(NAT["years"]) if y >= "2015-16"] for k in ORDER}
    trend["gb"] = [NAT["years"][y]["p"] for y in sorted(NAT["years"]) if y >= "2015-16"]
    explorer = """<div class="sol-card reveal" style="padding:22px"><div id="mxBtns" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px"></div><div id="mxOut"></div><p id="mxNote" class="sol-note mt-2 mb-0"></p></div>"""
    script = """<script src="dsq-charts.js?v=1"></script><script>(function(){var D=JSON.parse(document.getElementById('hdata').textContent),b=document.getElementById('mxBtns'),cur='pass';
function draw(){var m=D.metrics[cur],v=m[2],ks=Object.keys(v).filter(function(k){return v[k]!=null;}).sort(function(a,c){return cur==='wait'?v[a]-v[c]:v[c]-v[a];});
var items=ks.map(function(k){return{label:D.names[k],value:v[k],hi:k==='shirley'};});if(m[3]!=null)items.push({label:'Great Britain',value:m[3],note:'average'});
DSQCharts.bars(document.getElementById('mxOut'),items,{unit:m[1],digits:cur==='tests'?0:1});document.getElementById('mxNote').textContent=m[0]+(cur==='wait'?' — shortest first.':' — highest first.')+' Source: DVSA.';
[].forEach.call(b.children,function(x){x.className='dsqx-btn '+(x.getAttribute('data-k')===cur?'dsqx-btn--red':'dsqx-btn--ghost');});}
Object.keys(D.metrics).forEach(function(k){var x=document.createElement('button');x.type='button';x.setAttribute('data-k',k);x.textContent=D.metrics[k][0];x.onclick=function(){cur=k;draw();};b.appendChild(x);});draw();
var cols=['#D10A11','#2563eb','#16a34a','#d97706','#7c3aed','#0891b2','#db2777'],i=0,S=[];for(var n in D.trend.series)S.push({name:n,color:cols[i++%7],pts:D.trend.labels.map(function(l,j){return[l,D.trend.series[n][j]];})});
S.push({name:'Great Britain',color:'#111',dash:1,pts:D.trend.labels.map(function(l,j){return[l,D.trend.gb[j]];})});DSQCharts.line(document.getElementById('hTrend'),{label:'Pass rates since 2015-16',unit:'%',series:S});})();</script>"""
    secs = [
        f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b data-count="7">7</b><span>test centres compared</span></div><div><b data-count="{sum(C[k]["years"][Y]["n"] for k in ORDER)}">{sum(C[k]["years"][Y]["n"] for k in ORDER):,}</b><span>tests in 2025-26</span></div><div><b>{C[rows[0]]["years"][Y]["p"]}%</b><span>highest: {INFO[rows[0]]["short"]}</span></div><div><b>{gb["p"]}%</b><span>Great Britain average</span></div></div></div></section>',
        L.sec("explorer", "Data explorer", "Compare every Solihull test centre", "Pick a measure — the bars re-sort with the latest official DVSA figures.", explorer),
        L.sec("table", "All the numbers", "The 7 centres side by side (2025-26)", "",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Pass rate</th><th>First attempt</th><th>Automatic</th><th>Tests</th><th>Median wait</th></tr></thead><tbody>{table}</tbody></table></div>'
              f'<p class="sol-note mt-2">Great Britain: {gb["p"]}% pass rate from {gb["n"]:,} tests. Median wait is DVSA\'s latest monthly figure.</p>', alt=True),
        L.sec("trend", "Trends", "Pass rates since 2015-16", "Each centre against the Great Britain average. Hover a point for the figure.", '<div class="sol-card reveal" style="padding:18px"><div id="hTrend"></div></div>'),
        L.sec("centres", "Deep dives", "Every centre in detail", "", L.cards([("bi-geo-alt-fill", nm(k), f'<a href="{fname(k)}">{C[k]["years"][Y]["p"]}% pass rate · {C[k]["years"][Y]["n"]:,} tests · charts, ages, months, waits →</a>') for k in rows]), alt=True),
        L.sec("topics", "More official data", "Explore by topic", "",
              L.cards([("bi-person", "Pass rate by age", '<a href="driving-test-pass-rate-by-age-solihull.html">Ages 17–25 at every centre, as a heatmap →</a>'),
                       ("bi-gear", "Automatic vs manual", '<a href="automatic-vs-manual-pass-rate-solihull.html">Both pass rates, and the rise of automatic tests →</a>'),
                       ("bi-1-circle", "First-time passes", '<a href="first-time-pass-rate-solihull.html">First-attempt rates since 2015 and zero-fault passes →</a>'),
                       ("bi-x-octagon", "Cancellations", '<a href="driving-test-cancellations-solihull.html">How often DVSA cancels — and what you can claim →</a>'),
                       ("bi-hourglass-split", "Waiting times", '<a href="driving-test-waiting-times-solihull.html">Monthly median waits since 2019 →</a>'),
                       ("bi-list-ol", "Top 10 faults", '<a href="top-driving-test-faults-solihull.html">What fails tests — and where in Solihull →</a>'),
                       ("bi-journal-check", "Theory pass rates", '<a href="theory-test-pass-rates-near-solihull.html">Birmingham, Coventry and more →</a>'),
                       ("bi-arrow-repeat", "Attempts", '<a href="driving-test-attempts-solihull.html">Pass rate by attempt and retake costs →</a>'),
                       ("bi-calendar3", "By month", '<a href="driving-test-pass-rate-by-month-solihull.html">Each centre&#39;s best month →</a>')])),
        L.sec("choose", "Choosing a centre", "Does the test centre matter?", "",
              '<ul style="font-size:.95rem"><li class="mb-2"><b>Practise where you\'ll test.</b> Pass rates reflect who tests there as much as the roads — learners who know the local junctions do better.</li>'
              '<li class="mb-2"><b>Moving your test is limited.</b> Since June 2026 you can only move a booking to one of the three nearest centres — <a href="driving-test-rule-changes-2026-solihull.html">the 2026 rules</a>.</li>'
              '<li class="mb-2"><b>Waits move.</b> A centre with a long wait one month can have short waits the next. Check GOV.UK before you book.</li></ul>'),
        sources(),
    ]
    faqs = [("Which driving test centre near Solihull has the highest pass rate?", f"{nm(rows[0])}, at {C[rows[0]]['years'][Y]['p']}% in 2025-26 according to DVSA. The Great Britain average was {gb['p']}%."),
            ("What is the pass rate at Shirley driving test centre?", f"{C['shirley']['years'][Y]['p']}% in 2025-26, from {C['shirley']['years'][Y]['n']:,} tests."),
            ("Where does this data come from?", "DVSA's official tables of car driving tests by test centre, published on GOV.UK.")]
    hero = L.hero("Official DVSA data", '<span class="w">Solihull</span> <span class="w w--red">Test Centre</span> <span class="w">Data.</span>', "7 centres, every official figure — compare, chart and explore",
                  [("bi-bar-chart", "DVSA 2025-26"), ("bi-graph-up", "Trends since 2015"), ("bi-hourglass-split", "Waiting times")],
                  [("red", "#explorer", "bi-sliders", "Open the explorer"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    secs += [L.faq_html(faqs), L.booking()]
    html = L.page(HUB, "Solihull Driving Test Centres: Pass Rates & Waits Compared (DVSA 2025-26) | DriveSQ",
                  f"Compare the 7 driving test centres Solihull learners use with official DVSA data: pass rates, first-attempt and automatic rates, waiting times and trends. Highest in 2025-26: {nm(rows[0])} ({C[rows[0]]['years'][Y]['p']}%).",
                  "solihull driving test centres, driving test pass rates solihull, best driving test centre birmingham, shirley garretts green south yardley pass rate",
                  [L.faq_schema(faqs), L.crumbs("Test centre data", HUB)], hero, secs)
    data = {"metrics": metrics, "names": names, "trend": trend}
    return html.replace("</body>", f'<script type="application/json" id="hdata">{json.dumps(data)}</script>\n{script}\n</body>', 1)


def main():
    out = {HUB: hub()}
    for s in ORDER: out[fname(s)] = centre_page(s)
    for f, h in out.items(): open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml"); x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{L.SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
