#!/usr/bin/env python3
"""DriveSQ — Bolton data pages (same format as the Solihull pages: title → booking card → pass photos → information).
  bolton-driving-test-centre-pass-rate-wait-time.html   Bolton DTC deep dive (DVSA DRT122A-F)
  bolton-area-driving-test-centres-compared.html        Bolton vs the 6 nearest centres + 'which centre suits me'
  bolton-theory-test-pass-rates.html                    Bolton theory test centre (DVSA DRT112A)
  bolton-road-accident-statistics.html                  Bolton road casualties vs the other GM boroughs (DfT RAS0403)
Data: _data/dvsa_centres_gm.json (build_dvsa_centres.py <ods> gm) and _data/bolton_extra.json (build_bolton_extra.py <csv>).
Run:  python3 generate_bolton.py"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("dt", os.path.join(HERE, "generate_dvsa_topics.py"))
DT = importlib.util.module_from_spec(_s); _s.loader.exec_module(DT)
L, e, kpis, card, CHART, TODAY = DT.L, DT.e, DT.kpis, DT.card, DT.CHART, DT.TODAY
G = L.G
import dsq_photos as PH

GMJ = json.load(open(os.path.join(HERE, "_data", "dvsa_centres_gm.json")))
C, NAT = GMJ["centres"], GMJ["national"]
X = json.load(open(os.path.join(HERE, "_data", "bolton_extra.json")))
Y = "2025-26"
NEAR = ["bolton", "atherton", "bury", "chorley", "blackburn", "cheetham-hill", "rochdale"]
SHORT = {"bolton": "Bolton", "atherton": "Atherton", "bury": "Bury", "chorley": "Chorley", "blackburn": "Blackburn", "cheetham-hill": "Cheetham Hill", "rochdale": "Rochdale",
         "west-didsbury": "West Didsbury", "sale": "Sale", "bredbury": "Bredbury"}
COLS = {"bolton": "#D10A11", "atherton": "#2563eb", "bury": "#16a34a", "chorley": "#d97706", "blackburn": "#7c3aed", "cheetham-hill": "#0891b2", "rochdale": "#db2777"}
HUB = "driving-lessons-bolton.html"
MOVE = [("atherton", 6), ("bury", 7), ("cheetham-hill", 11)]   # GOV.UK: centres a Bolton test can be moved to, approx. miles
F_TC, F_CMP, F_TH, F_RD = "bolton-driving-test-centre-pass-rate-wait-time.html", "bolton-area-driving-test-centres-compared.html", "bolton-theory-test-pass-rates.html", "bolton-road-accident-statistics.html"
SRC = {"dvsa": ("DVSA — Car driving test and theory test data by centre (DRT122A–F, DRT112A)", "https://www.gov.uk/government/statistical-data-sets/driving-test-and-theory-test-data-cars"),
       "rules": ("GOV.UK — Changes to driving test booking rules in 2026", "https://www.gov.uk/guidance/changes-to-driving-test-booking-rules-in-2026"),
       "cancel": ("GOV.UK — Claim expenses if DVSA cancelled your driving test", "https://www.gov.uk/guidance/claim-expenses-if-dvsa-cancelled-your-driving-test"),
       "theory": ("GOV.UK — Book your theory test", "https://www.gov.uk/book-theory-test"),
       "move": ("GOV.UK — Check which driving test centres you can move your test to (updated 15 October 2026)", "https://www.gov.uk/government/publications/check-which-driving-test-centres-you-can-move-your-test-to/check-which-driving-test-centres-you-can-move-your-test-to"),
       "release": ("GOV.UK — Driving test appointments: release dates and finding earlier tests", "https://www.gov.uk/guidance/driving-test-appointments-release-dates-and-finding-earlier-tests"),
       "foi": ("DVSA FOI release — most times a candidate has failed a practical test at Bolton DTC since 2004", "https://www.gov.uk/government/publications/the-most-times-a-candidate-has-failed-a-motorcycle-and-car-practical-driving-test-at-bolton-dtc-since-2004/the-most-times-a-candidate-has-failed-a-motorcycle-and-car-practical-driving-test-at-bolton-dtc-since-2004"),
       "ras": ("DfT — Road safety statistics data tables (RAS0403: casualties by local authority)", "https://www.gov.uk/government/statistical-data-sets/reported-road-accidents-vehicles-and-casualties-tables-for-great-britain"),
       "rasrep": ("DfT — Reported road casualties Great Britain: final results 2025", "https://www.gov.uk/government/statistics/reported-road-casualties-great-britain-annual-report-2025")}
OPTS = ["Manual Lessons", "Automatic Lessons", "Intensive Course", "Test Preparation", "Pass Plus", "Theory Help"]
CSS = ("<style>.rs-split{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:22px;align-items:start}@media (max-width:900px){.rs-split{grid-template-columns:1fr}}"
       ".bt-pick{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.bt-rank{display:grid;gap:8px}.bt-rank div{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;background:#fff;border:1px solid #eee;border-radius:12px;padding:10px 12px}"
       ".bt-rank b{font-family:Oswald,sans-serif}.bt-rank i{font-style:normal;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#111;color:#fff;font-weight:700}.bt-rank div:first-child i{background:#D10A11}"
       ".bt-rank small{display:block;color:#777;font-size:.76rem}</style>")


def sources(keys, note="Official statistics on GOV.UK (Open Government Licence v3.0). Checked November 2026."):
    return L.sec("sources", "Sources", "Where this data comes from", note, '<ul style="font-size:.88rem">' + "".join(f'<li><a href="{SRC[k][1]}" target="_blank" rel="noopener">{e(SRC[k][0])}</a></li>' for k in keys) + "</ul>", alt=True)


def more(exclude):
    items = [(F_TC, "Bolton test centre data"), (F_CMP, "Bolton-area centres compared"), (F_TH, "Bolton theory test pass rates"), (F_RD, "Bolton road safety data"),
             ("bolton-driving-test-routes-guide.html", "Bolton test routes guide"), ("automatic-driving-lessons-bolton.html", "Automatic lessons in Bolton"),
             ("intensive-driving-course-bolton.html", "Intensive courses in Bolton"), (HUB, "Driving lessons in Bolton")]
    return L.sec("more", "Keep reading", "More for Bolton learners", "", L.chips([x for x in items if x[0] != exclude]))


def photos(picks, title="Recent DriveSQ passes"):
    return L.sec("passes", "Real learners", title, "Real DriveSQ learners on the day they passed.", PH.gallery(picks))


def faq_block(faqs):
    return L.faq_html(faqs).replace("Driving lessons in Solihull: FAQs", "Bolton learners: FAQs")


def crumbs(name, f):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": L.SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Bolton", "item": f"{L.SITE}/{HUB}"}, {"@type": "ListItem", "position": 3, "name": name, "item": f"{L.SITE}/{f}"}]}


def dataset(name, desc, creator, src):
    return {"@context": "https://schema.org", "@type": "Dataset", "name": name, "description": desc, "creator": {"@type": "GovernmentOrganization", "name": creator},
            "license": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/", "isBasedOn": src, "spatialCoverage": "Bolton, Greater Manchester"}


def build(f, crumb, title, desc, kw, hero, secs, faqs, data, script, extra_schema, picks):
    booking = '<div class="sol-form" id="book">' + G.form("Book driving lessons in Bolton", "A real person replies, usually within the hour. Goes straight to the DriveSQ team.", OPTS) + "</div>"
    schema = [L.faq_schema(faqs), crumbs(crumb, f), PH.schema(L.SITE, picks)] + extra_schema
    html = L.page(f, title, desc, kw, schema, hero, [CSS] + secs + [faq_block(faqs), booking])
    html = html.replace("Driving lessons in Solihull", "Driving lessons in Bolton").replace("B90 4AA", "BL1 1RU")
    return html.replace("</body>", f'<script type="application/json" id="pdata">{json.dumps(data)}</script>\n{CHART}\n<script>(function(){{var D=JSON.parse(document.getElementById("pdata").textContent);{script}}})();</script>\n</body>', 1)


def rules_sec(alt=False):
    alts = " · ".join(f"<b>{SHORT[k]}</b> (about {mi} miles, {C[k]['years'][Y]['p']}% pass rate, {lastwait(k)['med']}-week wait)" for k, mi in MOVE)
    return L.sec("rules", "2026 booking rules", "What the new rules mean for a Bolton test",
                 "DVSA changed how car tests are booked in 2026. For Bolton learners, this is what matters:",
                 L.cards([("bi-arrow-left-right", "Moving your test", f"A Bolton test can only be moved to one of its three nearest centres: {alts}."),
                          ("bi-2-circle", "Only 2 changes", "Since 31 March 2026 you get two changes per booking. Use them carefully."),
                          ("bi-person-lock", "Only you can book", "Since 12 May 2026 only the learner can book or manage the test on GOV.UK — and paid bot or 'cancellation finder' services are banned."),
                          ("bi-calendar-week", "When new dates appear", "DVSA releases a new week of tests at 6am every Monday, about 24 weeks ahead. Most centres have no cancellation list."),
                          ("bi-cash-coin", "Refunds", "Cancel at least 10 full working days before the test for a full refund.")]), alt=alt)

def lastwait(k): return [w for w in C[k]["waits"] if w["med"] is not None][-1]
def lab(y): return y[2:4] + "/" + y[5:]


# ─────────────────────── A. Bolton test centre deep dive ───────────────────────
def test_centre():
    b = C["bolton"]; yb = b["years"][Y]; gb = NAT["years"][Y]
    years = sorted(b["years"]); fb, ab = b["first"][Y], b["auto"][Y]
    an, ap = ab["n"], ab["p"]; mn = yb["n"] - an; mp = round(100 * (yb["pass"] - round(an * ap / 100)) / mn, 1)
    w = lastwait("bolton"); wm = w["mo"].replace("-", " ")
    best_age = max(b["age"], key=lambda a: a["p"]); age17 = next((a for a in b["age"] if a["age"] == "17"), None)
    cc = b["cancel"]; per = round(1000 * cc["total"] / yb["n"], 1); gbper = round(1000 * NAT["cancel"]["total"] / NAT["years"][Y]["n"], 1)
    rank = sorted(NEAR, key=lambda k: -C[k]["years"][Y]["p"]); pos = rank.index("bolton") + 1
    mo_best = max(b["months"], key=lambda m: m["p"]); mo_worst = min(b["months"], key=lambda m: m["p"])
    hist = [b["years"][y]["p"] for y in years]; hi_y = years[hist.index(max(hist))]
    waits = [x for x in b["waits"] if x["med"] is not None]
    secs = [
        kpis([(yb["p"], 1, "%", f"Bolton pass rate {Y} ({yb['n']:,} tests)"), (gb["p"], 1, "%", "Great Britain average"), (w["med"], 1, " wks", f"median wait, {wm}"), (fb["p"], 1, "%", "first-time pass rate")]),
        L.sec("trend", "Thirteen years", f"Bolton has beaten the national pass rate in {sum(1 for y in years if NAT['years'].get(y) and b['years'][y]['p'] > NAT['years'][y]['p'])} of {len(years)} years",
              f"Every car test at Bolton since {years[0]}, against Great Britain. Its best year was {hi_y} ({max(hist)}%). In {Y}, Bolton ranked {pos} of the {len(NEAR)} centres around Bolton.",
              card("chYears", '<p class="small text-muted mt-2 mb-0">Red: Bolton · Black dashed: Great Britain. 2020-21 was disrupted by lockdowns.</p>')),
        L.sec("months", "Month by month", f"{Y}: from {mo_worst['p']}% to {mo_best['p']}%",
              f"Pass rate for each month of {Y} at Bolton. Best: {mo_best['mo']} ({mo_best['p']}%). Lowest: {mo_worst['mo']} ({mo_worst['p']}%). Small monthly samples swing — don't pick a test month on this alone.",
              card("chMonths"), alt=True),
        L.sec("who", "Who passes", "By age, gender and gearbox", f"Bolton {Y}: men {yb['m']}%, women {yb['f']}%. Automatic {ap}% ({an:,} tests) against about {mp}% manual (derived from DVSA totals).",
              '<div class="rs-split">' + card("chAge", f'<p class="small text-muted mt-2 mb-0">Pass rate by age at Bolton, {Y}. Highest: age {best_age["age"]} ({best_age["p"]}%).</p>') +
              card("chGear", '<p class="small text-muted mt-2 mb-0">Manual = all passes minus automatic passes, divided by manual tests.</p>') + "</div>"),
        L.sec("first", "First time", f"{fb['p']}% pass first time — {fb['zero']} with zero faults",
              f"Of {fb['n']:,} first attempts at Bolton in {Y}, {fb['p']}% passed (Great Britain {NAT['first'][Y]['p']}%). {fb['zero']} people passed their first test without a single driving fault.",
              L.cards([("bi-1-circle", "First attempt matters", "First-time passes save the retest fee, another wait and more lessons. We only put learners in for a test when mock tests say they're ready."),
                       ("bi-stars", f"{fb['zero']} clean sheets", "A zero-fault pass is rare. It comes from planning ahead, steady speed and textbook observations — exactly what we drill."),
                       ("bi-clipboard-check", "Mock tests on real routes", 'Our mock tests use roads around the Bolton centre. See the <a href="bolton-driving-test-routes-guide.html">Bolton test routes guide</a>.')]), alt=True),
        L.sec("waits", "Waiting times", f"{w['med']} weeks: the median wait in {wm}",
              f"Median weeks from booking to test at Bolton, every month DVSA has published since {waits[0]['mo'].replace('-', ' ')}. In {wm}, {round(w['in7']) if w.get('in7') is not None else '—'}% of tests were taken within 7 weeks of booking.",
              card("chWait")),
        L.sec("cancel", "Cancellations", f"DVSA cancelled {cc['total']} Bolton tests in {Y}",
              f"That's {per} per 1,000 tests (Great Britain {gbper}). Reasons: examiner sickness {cc['medical']}, examiner leave {cc['leave']}, weather {cc['weather']}.",
              L.cards([("bi-calendar-plus", "Free new date", "DVSA rebooks you at no cost, and its change doesn't count towards your two allowed changes."),
                       ("bi-cash-coin", "Claim your costs", "If DVSA cancels with less than 3 full working days' notice you can claim expenses such as up to 2 hours of lessons — not for bad weather or poor light."),
                       ("bi-snow", "Winter mornings", "Check your email and texts on the morning of the test in ice or fog.")]), alt=True),
        rules_sec(),
        L.sec("history", "Did you know?", "Two facts from DVSA's own records", "From a DVSA freedom-of-information release about Bolton test centre:",
              L.cards([("bi-arrow-repeat", "23 attempts", "The most car practical tests one person has taken at Bolton since 2004 was 23 — and they then passed. Persistence pays, but good preparation pays sooner."),
                       ("bi-bicycle", "No motorbike tests since 2009", "Motorcycle tests haven't been held at Bolton since April 2009, so the site is cars only.")]), alt=True),
        L.sec("nearby", "Nearby", "How Bolton compares with the centres around it", f'Bolton ranked {pos} of {len(NEAR)} for pass rate in {Y}. <a href="{F_CMP}">Compare all seven in detail</a>.', card("chNear")),
        photos((3, 4, 9, 7, 8), "Recent DriveSQ passes"),
        more(F_TC), sources(("dvsa", "rules", "move", "release", "cancel", "foi"))]
    faqs = [("What is the pass rate at Bolton driving test centre?", f"{yb['p']}% in {Y}, from {yb['n']:,} car tests (DVSA). The Great Britain average was {gb['p']}%."),
            ("How long is the wait for a driving test in Bolton?", f"DVSA's median wait at Bolton was {w['med']} weeks in {wm} — half of tests that month had been booked less than {w['med']} weeks before."),
            ("Is Bolton an easy test centre?", f"It's close to average: {yb['p']}% against {gb['p']}% nationally, and {pos} of the {len(NEAR)} centres around Bolton in {Y}. Being well prepared matters far more than the centre."),
            ("What's the first-time pass rate at Bolton?", f"{fb['p']}% of first attempts passed in {Y}, and {fb['zero']} learners passed first time with zero faults."),
            ("Can I move my Bolton driving test to another centre?", "Only to one of the three nearest centres: Atherton (about 6 miles), Bury (about 7 miles) or Cheetham Hill (about 11 miles), according to GOV.UK. You get two changes per booking."),
            ("Do automatic learners pass less at Bolton?", f"Yes, slightly: automatic {ap}% against about {mp}% manual in {Y}. Nationally automatic was {NAT['auto'][Y]['p']}%.")]
    data = {"years": [lab(y) for y in years], "b": hist, "gb": [NAT["years"].get(y, {}).get("p") for y in years],
            "months": [{"label": m["mo"][:3] + " " + m["mo"][-2:], "value": m["p"], "note": f'{m["n"]:,} tests', "hi": m["mo"] == mo_best["mo"]} for m in b["months"]],
            "age": [{"label": "Age " + a["age"], "value": a["p"], "note": f'{a["n"]:,} tests', "hi": a["age"] == best_age["age"]} for a in b["age"]],
            "gear": [{"label": "Manual (derived)", "value": mp, "note": f"{mn:,} tests"}, {"label": "Automatic", "value": ap, "note": f"{an:,} tests", "hi": True}, {"label": "Automatic — Great Britain", "value": NAT["auto"][Y]["p"]}],
            "wl": [x["mo"][:3] + " " + x["mo"][-2:] for x in waits], "wv": [x["med"] for x in waits],
            "near": [{"label": SHORT[k], "value": C[k]["years"][Y]["p"], "hi": k == "bolton", "note": f'{C[k]["years"][Y]["n"]:,} tests'} for k in rank]}
    script = """DSQCharts.line(document.getElementById('chYears'),{label:'Bolton pass rate by year',unit:'%',series:[{name:'Bolton',color:'#D10A11',pts:D.years.map(function(l,i){return[l,D.b[i]];})},{name:'Great Britain',color:'#111',dash:1,pts:D.years.map(function(l,i){return[l,D.gb[i]];})}]});
DSQCharts.bars(document.getElementById('chMonths'),D.months,{unit:'%',max:70});DSQCharts.bars(document.getElementById('chAge'),D.age,{unit:'%',max:80});DSQCharts.bars(document.getElementById('chGear'),D.gear,{unit:'%',max:70});
DSQCharts.line(document.getElementById('chWait'),{label:'Median wait',min:0,digits:1,series:[{name:'Bolton median wait (weeks)',color:'#D10A11',pts:D.wl.map(function(l,i){return[l,D.wv[i]];})}]});DSQCharts.bars(document.getElementById('chNear'),D.near,{unit:'%',max:70});"""
    hero = L.hero("Official DVSA data · Bolton", '<span class="w">Bolton</span> <span class="w w--red">Test</span> <span class="w">Centre.</span>', "pass rates, waiting times, cancellations and who passes — all the official data",
                  [("bi-graph-up", f"{yb['p']}% pass rate"), ("bi-hourglass-split", f"{w['med']}-week median wait"), ("bi-calendar3", f"{len(years)} years of data")],
                  [("red", "#trend", "bi-bar-chart", "See the data"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Bolton driving test centre from official DVSA data: {yb['p']}% pass rate in {Y} ({yb['n']:,} tests), {w['med']}-week median wait ({wm}), first-time passes, pass rate by age, automatic vs manual and DVSA cancellations."
    return F_TC, build(F_TC, "Bolton test centre data", f"Bolton Driving Test Centre Pass Rate & Waiting Times ({Y} DVSA data) | DriveSQ", desc,
                       "bolton driving test centre pass rate, bolton test centre waiting times, bolton driving test centre, bolton pass rate 2026, bolton first time pass rate",
                       hero, secs, faqs, data, script, [dataset("Bolton driving test centre statistics", desc, "Driver and Vehicle Standards Agency", SRC["dvsa"][1])], (3, 4, 9, 7, 8))


# ─────────────────────── B. centres around Bolton compared ───────────────────────
def compare():
    row = {}
    for k in NEAR:
        c = C[k]; y = c["years"][Y]; w = lastwait(k)
        row[k] = {"name": SHORT[k], "p": y["p"], "n": y["n"], "first": c["first"][Y]["p"], "auto": c["auto"][Y]["p"], "wait": w["med"], "in7": w.get("in7"),
                  "cpk": round(1000 * c["cancel"]["total"] / y["n"], 1), "zero": c["first"][Y]["zero"], "m": y["m"], "f": y["f"]}
    wm = lastwait("bolton")["mo"].replace("-", " ")
    fast = min(NEAR, key=lambda k: row[k]["wait"]); hi = max(NEAR, key=lambda k: row[k]["p"]); lo = min(NEAR, key=lambda k: row[k]["p"])
    tbl = "".join(f'<tr{" style=" + chr(34) + "font-weight:700;background:rgba(209,10,17,.06)" + chr(34) if k == "bolton" else ""}><td>{e(SHORT[k])}</td><td>{row[k]["p"]}%</td><td>{row[k]["first"]}%</td><td>{row[k]["auto"]}%</td><td>{row[k]["wait"]} wks</td><td>{row[k]["cpk"]}</td><td>{row[k]["n"]:,}</td></tr>'
                  for k in sorted(NEAR, key=lambda k: -row[k]["p"]))
    recent = [x["mo"] for x in C["bolton"]["waits"] if x["mo"].endswith("2025") or x["mo"].endswith("2026")]
    ws = {k: {x["mo"]: x["med"] for x in C[k]["waits"]} for k in NEAR}
    tool = ('<div class="sol-card reveal" style="padding:20px"><b style="font-family:Oswald,sans-serif;font-size:1.1rem">What matters most to you?</b><p class="sol-note mb-2">Ranks the seven centres on DVSA\'s latest figures.</p>'
            '<div class="bt-pick" id="btPick"><button type="button" class="dsqx-btn dsqx-btn--red" data-k="p">Highest pass rate</button><button type="button" class="dsqx-btn dsqx-btn--ghost" data-k="wait">Shortest wait</button>'
            '<button type="button" class="dsqx-btn dsqx-btn--ghost" data-k="first">First-time passes</button><button type="button" class="dsqx-btn dsqx-btn--ghost" data-k="auto">Automatic pass rate</button>'
            '<button type="button" class="dsqx-btn dsqx-btn--ghost" data-k="cpk">Fewest DVSA cancellations</button></div><div class="bt-rank" id="btRank"></div></div>')
    secs = [
        kpis([(row["bolton"]["p"], 1, "%", "Bolton pass rate"), (row[hi]["p"], 1, "%", f"highest: {SHORT[hi]}"), (row[fast]["wait"], 1, " wks", f"shortest wait: {SHORT[fast]} ({wm})"), (len(NEAR), 0, "", "centres compared")]),
        L.sec("pick", "Choose", "Which test centre suits you?", "Tap what matters most. Remember: since 2026 you can only move a test to one of the three centres nearest the one you booked.", tool),
        rules_sec(alt=True),
        L.sec("table", "Side by side", f"The seven centres around Bolton ({Y})", f"Pass rates and cancellations are April 2025 – March 2026; waits are DVSA's median for {wm}. Cancellations are per 1,000 tests.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Pass rate</th><th>First time</th><th>Automatic</th><th>Median wait</th><th>DVSA cancellations</th><th>Tests</th></tr></thead><tbody>{tbl}</tbody></table></div>', alt=True),
        L.sec("waits", "Waits since 2025", "Waiting times move fast", "Median weeks from booking to test, every month since January 2025.", card("chW")),
        L.sec("read", "Reading the numbers", "What the differences really mean", "",
              L.cards([("bi-people", "Who tests there matters", f"A centre's pass rate reflects its learners as much as its roads. {SHORT[lo]} ({row[lo]['p']}%) and {SHORT[hi]} ({row[hi]['p']}%) serve very different areas."),
                       ("bi-signpost-2", "Learn the roads you'll test on", "Testing near where you learn means familiar junctions and roundabouts. We teach on the roads around the centre you book."),
                       ("bi-hourglass", "A short wait isn't everything", "A fast date is only useful if you're ready. A failed test costs another fee and another wait."),
                       ("bi-gear", "Automatic learners", "Automatic pass rates are lower at every centre here — partly because of who chooses automatic. Prepare with mock tests either way.")]), alt=True),
        photos((0, 1, 2, 5, 6), "Recent DriveSQ passes"),
        more(F_CMP), sources(("dvsa", "rules", "move", "release"))]
    faqs = [("Which test centre near Bolton has the highest pass rate?", f"{SHORT[hi]}, at {row[hi]['p']}% in {Y}. Bolton was {row['bolton']['p']}% (DVSA)."),
            ("Which test centre near Bolton has the shortest wait?", f"In {wm}, {SHORT[fast]} had the shortest median wait ({row[fast]['wait']} weeks). Bolton's was {row['bolton']['wait']} weeks."),
            ("Can I take my driving test at a different centre?", "You can book any centre. Once booked, you can only move it to one of the three nearest centres — for a Bolton test that's Atherton, Bury or Cheetham Hill (GOV.UK) — and you get two changes."),
            ("Is Atherton easier than Bolton?", f"Not on DVSA's figures: Atherton passed {row['atherton']['p']}% in {Y} against Bolton's {row['bolton']['p']}%.")]
    data = {"rows": row, "order": NEAR, "cols": COLS, "labels": [m[:3] + " " + m[-2:] for m in recent], "ws": {k: [ws[k].get(m) for m in recent] for k in NEAR}, "names": SHORT}
    script = """var lab={p:['pass rate','%',-1],wait:['median wait',' wks',1],first:['first-time pass rate','%',-1],auto:['automatic pass rate','%',-1],cpk:['DVSA cancellations per 1,000 tests','',1]};
function rank(k){var o=D.order.slice().sort(function(a,b){return (D.rows[a][k]-D.rows[b][k])*lab[k][2];});document.getElementById('btRank').innerHTML=o.map(function(c,i){var r=D.rows[c];return '<div><i>'+(i+1)+'</i><span><b>'+r.name+'</b><small>'+r.n.toLocaleString('en-GB')+' tests · pass '+r.p+'% · wait '+r.wait+' wks</small></span><b>'+r[k]+lab[k][1]+'</b></div>';}).join('');
[].forEach.call(document.querySelectorAll('#btPick button'),function(b){b.className='dsqx-btn '+(b.getAttribute('data-k')===k?'dsqx-btn--red':'dsqx-btn--ghost');});}
document.getElementById('btPick').addEventListener('click',function(e){var b=e.target.closest('button');if(b)rank(b.getAttribute('data-k'));});rank('p');
DSQCharts.line(document.getElementById('chW'),{label:'Median waits',min:0,digits:1,series:D.order.map(function(k){return{name:D.names[k],color:D.cols[k],pts:D.labels.map(function(l,i){return[l,D.ws[k][i]];})};})});"""
    hero = L.hero("Official DVSA data · Bolton area", '<span class="w">Bolton-area</span> <span class="w w--red">test centres</span> <span class="w">compared.</span>', "Bolton, Atherton, Bury, Chorley, Blackburn, Cheetham Hill and Rochdale side by side",
                  [("bi-trophy", "Pass rates"), ("bi-hourglass-split", "Waiting times"), ("bi-sliders", "Pick what matters")], [("red", "#pick", "bi-sliders", "Find my centre"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Compare the driving test centres around Bolton on DVSA data: pass rates ({SHORT[hi]} {row[hi]['p']}%, Bolton {row['bolton']['p']}%), waiting times ({SHORT[fast]} {row[fast]['wait']} weeks), first-time and automatic pass rates and cancellations."
    return F_CMP, build(F_CMP, "Bolton-area centres compared", f"Driving Test Centres Near Bolton Compared: Pass Rates & Waits ({Y}) | DriveSQ", desc,
                        "driving test centres near bolton, easiest test centre near bolton, atherton vs bolton test centre, bury test centre pass rate, chorley test centre pass rate, shortest driving test wait bolton",
                        hero, secs, faqs, data, script, [dataset("Driving test centres near Bolton compared", desc, "Driver and Vehicle Standards Agency", SRC["dvsa"][1])], (0, 1, 2, 5, 6))


# ─────────────────────── C. theory test ───────────────────────
def theory():
    T = X["theory"]["centres"]; gbT = X["theory"]["gb"]; b = T["Bolton"]; yb = b["years"][Y]; g = gbT[Y]
    ys = sorted(b["years"]); gys = sorted(gbT)
    mbest = max(b["months"], key=lambda m: m["p"]); mlow = min(b["months"], key=lambda m: m["p"])
    cmp_ = sorted(T, key=lambda c: -T[c]["years"][Y]["p"])
    secs = [
        kpis([(yb["p"], 1, "%", f"Bolton theory pass rate {Y}"), (g["p"], 1, "%", "Great Britain"), (yb["n"], 0, "", "theory tests taken at Bolton"), (yb["f"], 1, "%", "women at Bolton (men " + str(yb["m"]) + "%)")]),
        L.sec("why", "The hardest part?", f"Fewer than half pass the theory test in Bolton", f"In {Y}, {yb['p']}% of {yb['n']:,} car theory tests at the Bolton centre were passes — below the Great Britain rate of {g['p']}%. Nationally the theory pass rate has fallen from {gbT[gys[0]]["p"]}% in {gys[0]} to {g["p"]}% today.",
              '<div class="rs-split">' + card("chCmp", "<p class='small text-muted mt-2 mb-0'>Pass rate at nearby theory centres, " + Y + ".</p>") + card("chGB", "<p class='small text-muted mt-2 mb-0'>Great Britain theory pass rate since 2007-08.</p>") + "</div>"),
        L.sec("months", "Month by month", f"From {mlow['p']}% to {mbest['p']}%", f"Bolton theory pass rate each month of {Y}. Men and women shown separately — women passed more often in every month.", card("chMo"), alt=True),
        L.sec("pass", "How to pass first time", "What actually works", "",
              L.cards([("bi-journal-check", "Free Student Portal", "Every DriveSQ learner gets 700+ practice questions and 14 full 50-question mock tests with instant feedback."),
                       ("bi-camera-video", "Hazard perception", "Clips score 0–5 each; you need 44 of 75. Respond as soon as you see a hazard developing — and keep responding as it develops."),
                       ("bi-bar-chart-steps", "Book when you're scoring 47+", "The pass mark is 43 of 50 for multiple choice. Book once you're consistently above it in mocks."),
                       ("bi-car-front", "Learn it on the road", "Questions on stopping distances, signs and junctions stick far better when your instructor shows you them on real Bolton roads.")])),
        photos((8, 0, 3, 5, 1)),
        more(F_TH), sources(("dvsa", "theory"))]
    faqs = [("What is the theory test pass rate in Bolton?", f"{yb['p']}% in {Y}, from {yb['n']:,} car theory tests at the Bolton theory test centre (DVSA). Great Britain: {g['p']}%."),
            ("Is the Bolton theory test centre harder than others?", f"It's slightly below average: Bolton {yb['p']}%, Manchester {T['Manchester']['years'][Y]['p']}%, Stockport {T['Stockport']['years'][Y]['p']}% and Preston {T['Preston']['years'][Y]['p']}% in {Y}. Every centre uses the same national test."),
            ("What's the pass mark for the theory test?", "43 out of 50 for the multiple-choice part, and 44 out of 75 for hazard perception. You must pass both at the same sitting."),
            ("How do I book my theory test?", "On GOV.UK. You need a provisional licence first. Choose any theory test centre — Bolton, Manchester or Stockport are the nearest for most Bolton learners.")]
    data = {"cmp": [{"label": c, "value": T[c]["years"][Y]["p"], "hi": c == "Bolton", "note": f'{T[c]["years"][Y]["n"]:,} tests'} for c in cmp_] + [{"label": "Great Britain", "value": g["p"]}],
            "gl": [lab(y) for y in gys], "gv": [gbT[y]["p"] for y in gys], "ml": [m["mo"] for m in b["months"]], "mm": [m["m"] for m in b["months"]], "mf": [m["f"] for m in b["months"]], "mt": [m["p"] for m in b["months"]]}
    script = """DSQCharts.bars(document.getElementById('chCmp'),D.cmp,{unit:'%',max:60});DSQCharts.line(document.getElementById('chGB'),{label:'GB theory pass rate',unit:'%',min:30,series:[{name:'Great Britain',color:'#111',pts:D.gl.map(function(l,i){return[l,D.gv[i]];})}]});
DSQCharts.line(document.getElementById('chMo'),{label:'Bolton theory monthly',unit:'%',min:30,max:50,series:[{name:'All',color:'#D10A11',pts:D.ml.map(function(l,i){return[l,D.mt[i]];})},{name:'Women',color:'#7c3aed',dash:1,pts:D.ml.map(function(l,i){return[l,D.mf[i]];})},{name:'Men',color:'#2563eb',dash:1,pts:D.ml.map(function(l,i){return[l,D.mm[i]];})}]});"""
    hero = L.hero("Official DVSA data · Bolton", '<span class="w">Bolton</span> <span class="w w--red">Theory</span> <span class="w">Test.</span>', "pass rates at the Bolton theory centre — and how to pass first time",
                  [("bi-journal-check", f"{yb['p']}% pass rate"), ("bi-people", f"{yb['n']:,} tests a year"), ("bi-mortarboard", "700+ free practice questions")], [("red", "#why", "bi-bar-chart", "See the data"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Bolton theory test pass rate from DVSA data: {yb['p']}% in {Y} from {yb['n']:,} tests, below the Great Britain {g['p']}%. Monthly figures, men vs women, nearby centres and how to pass first time."
    return F_TH, build(F_TH, "Bolton theory test pass rates", f"Bolton Theory Test Pass Rate ({Y} DVSA data) & How to Pass | DriveSQ", desc,
                       "bolton theory test pass rate, theory test centre bolton, bolton theory test, theory test pass rate manchester, how to pass theory test first time",
                       hero, secs, faqs, data, script, [dataset("Bolton theory test centre pass rates", desc, "Driver and Vehicle Standards Agency", SRC["dvsa"][1])], (8, 0, 3, 5, 1))


# ─────────────────────── D. road casualties ───────────────────────
def roads():
    R = X["roads"]; yrs = R["years"]; B = R["boroughs"]; b = B["Bolton"]
    c25, c16, k25, k16 = b["cas"]["n"][-1], b["cas"]["n"][0], b["ksi"]["n"][-1], b["ksi"]["n"][0]
    rate = b["cas"]["rate"][-1]; rk = sorted(B, key=lambda k: B[k]["cas"]["rate"][-1]); pos = rk.index("Bolton") + 1
    localshare = round(100 * b["local_col"][-1] / b["col"]["n"][-1])
    U = b["users"]; ped = U["Pedestrian"]["All casualties"]; cyc = U["Pedal Cyclist"]["All casualties"]; moto = U["Motor Cyclist"]["All casualties"]; car = U["Car Occupant"]["All casualties"]
    tbl = "".join(f'<tr{" style=" + chr(34) + "font-weight:700;background:rgba(209,10,17,.06)" + chr(34) if k == "Bolton" else ""}><td>{k}</td><td>{B[k]["cas"]["n"][-1]:,}</td><td>{B[k]["cas"]["rate"][-1]:.0f}</td><td>{B[k]["ksi"]["n"][-1]}</td><td>{B[k]["ksi"]["rate"][-1]:.1f}</td></tr>' for k in rk)
    utab = "".join(f'<tr><td>{u.replace("Veh", "vehicle")}</td><td>{v["All casualties"][0]}</td><td><b>{v["All casualties"][-1]}</b></td><td>{v["KSI (unadjusted)"][-1]}</td></tr>' for u, v in sorted(U.items(), key=lambda x: -x[1]["All casualties"][-1]))
    secs = [
        kpis([(c25, 0, "", "people hurt on Bolton roads in 2025"), (k25, 0, "", "killed or seriously injured"), (rate, 0, "", "casualties per billion vehicle miles"), (localshare, 0, "%", "of collisions on council-run roads")]),
        L.sec("trend", "Ten years", f"Casualties down {round(100 * (c16 - c25) / c16)}% since 2016 — serious injuries up",
              f"All reported casualties in Bolton fell from {c16} (2016) to {c25} (2025). Killed or seriously injured went from {k16} to {k25}; part of that rise reflects changes in how police record injury severity (DfT).",
              '<div class="rs-split">' + card("chT", '<p class="small text-muted mt-2 mb-0">Red: all casualties · Black: killed or seriously injured.</p>') +
              '<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Year</th><th>Collisions</th><th>Casualties</th><th>KSI</th><th>Killed</th></tr></thead><tbody>' +
              "".join(f'<tr><td>{y}</td><td>{b["col"]["n"][i]}</td><td>{b["cas"]["n"][i]}</td><td>{b["ksi"]["n"][i]}</td><td>{b["killed"]["n"][i]}</td></tr>' for i, y in reversed(list(enumerate(yrs)))) + "</tbody></table></div></div>"),
        L.sec("gm", "Greater Manchester", f"Bolton ranks {pos} of 10 boroughs per mile driven (1 = safest)",
              "Casualties per billion vehicle miles, 2025 — the fairest way to compare places with different traffic levels. Lower is safer.",
              card("chB") + f'<div class="sol-wrap reveal mt-3"><table class="sol-tbl"><thead><tr><th>Borough (2025)</th><th>Casualties</th><th>Per bn vehicle miles</th><th>KSI</th><th>KSI per bn miles</th></tr></thead><tbody>{tbl}</tbody></table></div>', alt=True),
        L.sec("users", "Who gets hurt", f"Pedestrians: {ped[-1]} hurt in 2025", "Casualties on Bolton roads by road user.",
              '<div class="rs-split">' + card("chU") + f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Road user</th><th>2016</th><th>2025</th><th>KSI 2025</th></tr></thead><tbody>{utab}</tbody></table></div></div>'),
        L.sec("lessons", "What it means for your lessons", f"{localshare}% of Bolton collisions happen on everyday local roads",
              f"In 2025, {b['local_col'][-1]} of {b['col']['n'][-1]} reported collisions in Bolton were on council-managed roads — not the M61 or other National Highways roads. Those are the town-centre streets, ring road and estates learners drive every week.",
              L.cards([("bi-person-walking", f"Pedestrians ({ped[-1]})", "Busy town-centre crossings, school gates and parked cars: we train early scanning and speed that gives you time to stop."),
                       ("bi-bicycle", f"Cyclists ({cyc[-1]})", "Give at least 1.5 m when passing (Highway Code rule 163) and check left before turning — every lesson."),
                       ("bi-speedometer2", f"Motorcyclists ({moto[-1]})", "Look properly before pulling out at junctions and roundabouts — bikes are easy to miss."),
                       ("bi-car-front", f"Car occupants ({car[-1]})", f"Down from {car[0]} in 2016. Safe gaps, speed for the conditions and no phone keep you out of these figures.")]), alt=True),
        photos((6, 2, 4, 7, 9)),
        more(F_RD), L.sec("sources", "Sources", "Where this data comes from", "Department for Transport table RAS0403 — reported road casualties by local authority, final 2025 figures (Open Government Licence v3.0). Only collisions reported to the police are included. Checked November 2026.",
                          '<ul style="font-size:.88rem">' + "".join(f'<li><a href="{SRC[k][1]}" target="_blank" rel="noopener">{e(SRC[k][0])}</a></li>' for k in ("rasrep", "ras")) + "</ul>", alt=True)]
    faqs = [("How many road accidents were there in Bolton in 2025?", f"{b['col']['n'][-1]} reported road collisions, with {c25} people hurt — {k25} killed or seriously injured and {b['killed']['n'][-1]} killed (DfT RAS0403)."),
            ("Are Bolton's roads getting safer?", f"Total casualties fell from {c16} in 2016 to {c25} in 2025, but killed-or-seriously-injured casualties rose from {k16} to {k25}, partly because of changes in how police record severity."),
            ("How does Bolton compare with the rest of Greater Manchester?", f"Bolton had {rate:.0f} casualties per billion vehicle miles in 2025 — {pos} of the 10 Greater Manchester boroughs from safest. Manchester was highest ({B['Manchester']['cas']['rate'][-1]:.0f}), {rk[0]} lowest ({B[rk[0]]['cas']['rate'][-1]:.0f})."),
            ("Where do most crashes happen in Bolton?", f"On local roads: {localshare}% of 2025 collisions were on council-managed roads rather than the M61 or other National Highways roads.")]
    data = {"y": [str(x) for x in yrs], "ca": b["cas"]["n"], "ksi": b["ksi"]["n"],
            "bo": [{"label": k, "value": B[k]["cas"]["rate"][-1], "hi": k == "Bolton", "note": f'{B[k]["cas"]["n"][-1]:,} casualties'} for k in rk],
            "u": [{"label": u.replace("Veh", "vehicle"), "value": v["All casualties"][-1], "hi": u == "Pedestrian"} for u, v in sorted(U.items(), key=lambda x: -x[1]["All casualties"][-1]) if v["All casualties"][-1] >= 3]}
    script = """var P=function(a){return D.y.map(function(l,i){return[l,a[i]];});};DSQCharts.line(document.getElementById('chT'),{label:'Bolton casualties',min:0,digits:0,series:[{name:'All casualties',color:'#D10A11',pts:P(D.ca)},{name:'Killed or seriously injured',color:'#111',pts:P(D.ksi)}]});
DSQCharts.bars(document.getElementById('chB'),D.bo,{digits:0,max:520});DSQCharts.bars(document.getElementById('chU'),D.u,{digits:0});"""
    hero = L.hero("Official DfT data · 2016–2025", '<span class="w">Bolton</span> <span class="w w--red">road</span> <span class="w">safety.</span>', "ten years of crash and casualty data — and what it means for learners",
                  [("bi-graph-down", f"{round(100 * (c16 - c25) / c16)}% fewer casualties"), ("bi-geo", "vs 9 GM boroughs"), ("bi-shield-check", "Final 2025 figures")], [("red", "#trend", "bi-graph-up", "See the data"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Bolton road casualties from official DfT data: {c25} people hurt and {k25} killed or seriously injured in 2025. Ten-year trends, Greater Manchester comparison and what it means for learner drivers."
    return F_RD, build(F_RD, "Bolton road safety data", "Bolton Road Accident Statistics 2016–2025 (DfT data) | DriveSQ", desc,
                       "bolton road accidents, bolton road accident statistics, bolton crash statistics, most dangerous roads bolton, bolton road safety, greater manchester road casualties",
                       hero, secs, faqs, data, script, [dataset("Bolton road casualties 2016–2025", desc, "Department for Transport", SRC["ras"][1])], (6, 2, 4, 7, 9))


PAGES = [test_centre, compare, theory, roads]


def main():
    out = dict(fn() for fn in PAGES)
    for f, h in out.items(): open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml"); x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{L.SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", ", ".join(out))


if __name__ == "__main__":
    main()
