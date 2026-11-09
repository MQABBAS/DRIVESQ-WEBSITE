#!/usr/bin/env python3
"""DriveSQ — five Solihull topic pages built from DVSA's official test-centre tables (_data/dvsa_centres.json).
  driving-test-pass-rate-by-age-solihull.html     ages 17-25 x 7 centres heatmap + 'best centre for my age'
  automatic-vs-manual-pass-rate-solihull.html     automatic vs manual (manual derived from totals) + automatic share trend
  first-time-pass-rate-solihull.html              first-attempt pass rates, trend, zero-fault passes
  driving-test-cancellations-solihull.html        DVSA cancellations by reason 2025-26 + your rights
  driving-test-waiting-times-solihull.html        monthly median waits since 2019 for all 7 centres
Run after generate_test_centres.py:  python3 generate_dvsa_topics.py"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("tc", os.path.join(HERE, "generate_test_centres.py"))
TC = importlib.util.module_from_spec(_s); _s.loader.exec_module(TC)
L, e = TC.L, TC.L.e
C, NAT, Y, ORDER, INFO = TC.C, TC.NAT, TC.Y, TC.ORDER, TC.INFO
TODAY = "2026-11-09"
SHORT = {k: INFO[k]["short"] for k in ORDER}
COLS = {"shirley": "#D10A11", "garretts-green": "#2563eb", "south-yardley": "#16a34a", "kings-heath": "#d97706", "coventry": "#7c3aed", "redditch": "#0891b2", "warwick": "#db2777"}
CHART = '<script src="dsq-charts.js?v=2"></script>'
SRC_DVSA = TC.SRC[0]
EXTRA_SRC = {"cancel": ("GOV.UK — claim expenses if DVSA cancelled your driving test", "https://www.gov.uk/guidance/claim-expenses-if-dvsa-cancelled-your-driving-test"),
             "weather": ("GOV.UK — driving test cancelled because of bad weather", "https://www.gov.uk/driving-test/test-cancelled-bad-weather"),
             "waits": TC.SRC[1], "book": TC.SRC[3], "rules": ("GOV.UK — changes to driving test booking rules in 2026", "https://www.gov.uk/guidance/changes-to-driving-test-booking-rules-in-2026")}


def sources(extra=()):
    items = [SRC_DVSA] + [EXTRA_SRC[k] for k in extra]
    return L.sec("sources", "Sources", "Where this data comes from", "Official DVSA statistics on GOV.UK (Open Government Licence). Checked November 2026.",
                 '<ul style="font-size:.88rem">' + "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{e(t)}</a></li>' for t, u in items) + "</ul>", alt=True)


def links():
    return ('<p class="mt-3">More official data: <a href="solihull-driving-test-centres-data.html">compare all 7 centres</a> · '
            + " · ".join(f'<a href="{TC.fname(k)}">{SHORT[k]}</a>' for k in ORDER) + "</p>")


def kpis(items):
    return '<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal">' + "".join(
        f'<div><b{(" data-count=" + chr(34) + str(v) + chr(34) + " data-digits=" + chr(34) + str(d) + chr(34) + " data-suffix=" + chr(34) + suf + chr(34)) if isinstance(v, (int, float)) else ""}>{v if not isinstance(v, (int, float)) else (f"{v:,.{d}f}" + suf)}</b><span>{t}</span></div>'
        for v, d, suf, t in items) + "</div></div></section>"


def build(fname, crumb, title, desc, kw, hero, secs, faqs, data, script, extra_schema=None):
    secs = secs + [L.faq_html(faqs), L.booking()]
    schema = [L.faq_schema(faqs), L.crumbs(crumb, fname), {"@context": "https://schema.org", "@type": "Dataset", "name": title.split(" | ")[0], "description": desc,
              "creator": {"@type": "GovernmentOrganization", "name": "Driver and Vehicle Standards Agency"}, "license": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
              "isBasedOn": SRC_DVSA[1], "spatialCoverage": "Solihull and surrounding test centres, West Midlands"}] + (extra_schema or [])
    html = L.page(fname, title, desc, kw, schema, hero, secs)
    return html.replace("</body>", f'<script type="application/json" id="pdata">{json.dumps(data)}</script>\n{CHART}\n<script>(function(){{var D=JSON.parse(document.getElementById("pdata").textContent);{script}}})();</script>\n</body>', 1)


def card(inner_id, note=""):
    return f'<div class="sol-card reveal" style="padding:18px"><div id="{inner_id}"></div>{note}</div>'


# ───────────────────────── 1. by age ─────────────────────────
def by_age():
    f = "driving-test-pass-rate-by-age-solihull.html"
    ages = [str(a) for a in range(17, 26)]
    grid = {k: {a["age"]: a["p"] for a in C[k]["age"]} for k in ORDER}
    def comb(age):
        rows = [(a["n"], a["p"]) for k in ORDER for a in C[k]["age"] if a["age"] == age and a["n"]]
        n = sum(r[0] for r in rows); return round(sum(r[0] * r[1] for r in rows) / n, 1) if n else None
    combined = {a: comb(a) for a in ages}
    lo, hi = 35.0, 80.0
    def bg(v):
        if v is None: return "#f3f4f6"
        t = max(0, min(1, (v - lo) / (hi - lo))); return f"rgba(209,10,17,{0.08 + 0.62 * t:.2f})"
    head = "".join(f"<th>{a}</th>" for a in ages)
    body = "".join(f'<tr><td><a href="{TC.fname(k)}">{e(SHORT[k])}</a></td>' + "".join(f'<td style="background:{bg(grid[k].get(a))};text-align:center;font-weight:600">{grid[k][a] if grid[k].get(a) is not None else "—"}</td>' for a in ages) + "</tr>" for k in ORDER)
    body += '<tr><td><b>All 7 combined</b></td>' + "".join(f'<td style="text-align:center;font-weight:800">{combined[a]}</td>' for a in ages) + "</tr>"
    best17 = max(ORDER, key=lambda k: grid[k].get("17") or 0); worst25 = min(ORDER, key=lambda k: grid[k].get("25") or 99)
    tool = """<div class="sol-card reveal" style="padding:22px"><label style="font-size:.9rem;font-weight:600">Your age <select id="agSel" class="form-select" style="max-width:160px;display:inline-block;margin-left:8px">""" + "".join(f'<option{" selected" if a == "17" else ""}>{a}</option>' for a in ages) + """</select></label><div id="agOut" class="mt-3"></div><p class="sol-note mt-2 mb-0">DVSA's 2025-26 pass rate for candidates of that age at each centre. A few centres' counts are suppressed by DVSA when they're very small.</p></div>"""
    secs = [kpis([(combined["17"], 1, "%", "17-year-olds' pass rate, all 7 centres"), (combined["25"], 1, "%", "25-year-olds' pass rate"), (grid[best17]["17"], 1, "%", f"highest for 17s: {SHORT[best17]}"), (NAT["years"][Y]["p"], 1, "%", "all ages, Great Britain")]),
            L.sec("tool", "Your age", "Which centre has the best pass rate for your age?", "Pick your age — the centres re-sort.", tool),
            L.sec("heatmap", "Heatmap", "Pass rate by age at every centre (2025-26)", "Darker red means a higher pass rate. Ages 17 to 25 are the only ages DVSA publishes by centre.",
                  f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th>{head}</tr></thead><tbody>{body}</tbody></table></div>', alt=True),
            L.sec("why", "What it means", "Why do younger learners pass more often?", "",
                  L.cards([("bi-1-circle", "Fresh habits", "Most 17-year-olds test soon after learning, with lessons fresh and few bad habits picked up from years of being a passenger."),
                           ("bi-calendar-check", "Time to learn", "Many younger learners have regular weekly lessons and family practice; older learners often fit lessons around work."),
                           ("bi-arrow-repeat", "Retakes", "Older age groups include more people on second or later attempts, which pulls the average down."),
                           ("bi-person-check", "It's not destiny", f"Plenty of 25-year-olds pass first time. At {SHORT[worst25]} the 25-year-old rate was {grid[worst25]['25']}% — being properly ready matters more than age.")]) + links()),
            sources()]
    faqs = [("What age has the highest driving test pass rate near Solihull?", f"17-year-olds: {combined['17']}% across the seven centres Solihull learners use in 2025-26, falling to {combined['25']}% for 25-year-olds (DVSA)."),
            ("Which test centre near Solihull is best for 17-year-olds?", f"{C[best17]['name']}, where 17-year-olds passed {grid[best17]['17']}% of tests in 2025-26."),
            ("Does DVSA publish pass rates for over-25s by test centre?", "No — the by-centre age table covers 17 to 25-year-olds only.")]
    data = {"grid": grid, "names": SHORT}
    script = """function u(){var a=document.getElementById('agSel').value,it=Object.keys(D.grid).filter(function(k){return D.grid[k][a]!=null;}).sort(function(x,y){return D.grid[y][a]-D.grid[x][a];}).map(function(k,i){return{label:D.names[k],value:D.grid[k][a],hi:i===0};});DSQCharts.bars(document.getElementById('agOut'),it,{unit:'%',max:100});}document.getElementById('agSel').addEventListener('change',u);u();"""
    hero = L.hero("Official DVSA data", '<span class="w">Pass Rate</span> <span class="w w--red">by Age</span> <span class="w">Solihull.</span>', "ages 17 to 25 at all seven centres Solihull learners use",
                  [("bi-person", "Ages 17–25"), ("bi-grid-3x3", "Heatmap"), ("bi-sliders", "Best centre for your age")], [("red", "#tool", "bi-sliders", "Pick your age"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, build(f, "Pass rate by age", "Driving Test Pass Rate by Age: Solihull Test Centres (DVSA 2025-26) | DriveSQ",
                    f"Driving test pass rates by age (17–25) at Shirley, Garretts Green, South Yardley, Kings Heath, Coventry, Redditch and Warwick — official DVSA 2025-26 figures. 17-year-olds: {combined['17']}%.",
                    "driving test pass rate by age, pass rate 17 year olds, solihull driving test age, best test centre for 17 year olds", hero, secs, faqs, data, script)


# ───────────────────────── 2. automatic vs manual ─────────────────────────
def auto_manual():
    f = "automatic-vs-manual-pass-rate-solihull.html"
    def split(k, y):
        t, a = C[k]["years"].get(y), C[k]["auto"].get(y)
        if not t or not a or not a.get("n"): return None
        ap = round(a["n"] * a["p"] / 100); mn = t["n"] - a["n"]; mp = t["pass"] - ap
        return {"auto": a["p"], "manual": round(100 * mp / mn, 1) if mn else None, "share": round(100 * a["n"] / t["n"], 1), "an": a["n"], "mn": mn}
    cur = {k: split(k, Y) for k in ORDER}
    gbt, gba = NAT["years"][Y], NAT["auto"][Y]
    gbm = round(100 * (gbt["n"] * gbt["p"] / 100 - gba["n"] * gba["p"] / 100) / (gbt["n"] - gba["n"]), 1)
    years = [y for y in sorted(NAT["years"]) if y >= "2015-16"]
    share = {k: [(split(k, y) or {}).get("share") for y in years] for k in ORDER}
    gbshare = [round(100 * NAT["auto"][y]["n"] / NAT["years"][y]["n"], 1) if y in NAT["auto"] else None for y in years]
    rows = "".join(f'<tr><td><a href="{TC.fname(k)}">{e(SHORT[k])}</a></td><td><b>{cur[k]["manual"]}%</b></td><td><b>{cur[k]["auto"]}%</b></td><td>{cur[k]["manual"] - cur[k]["auto"]:+.1f}</td><td>{cur[k]["share"]}%</td></tr>' for k in ORDER)
    rows += f'<tr><td><b>Great Britain</b></td><td>{gbm}%</td><td>{gba["p"]}%</td><td>{gbm - gba["p"]:+.1f}</td><td>{round(100 * gba["n"] / gbt["n"], 1)}%</td></tr>'
    sh = cur["shirley"]
    secs = [kpis([(sh["manual"], 1, "%", "Shirley manual pass rate (derived)"), (sh["auto"], 1, "%", "Shirley automatic pass rate"), (sh["share"], 1, "%", "of Shirley tests were automatic"), (gba["p"], 1, "%", "automatic, Great Britain")]),
            L.sec("compare", "Side by side", "Manual vs automatic at every centre (2025-26)", "Bars: automatic (red) and manual (grey) pass rates. Hover nothing — every value is shown.", card("chAM"), alt=False),
            L.sec("table", "The numbers", "The full table", "Manual pass rate = all passes minus automatic passes, divided by manual tests (DVSA publishes totals and automatic separately).",
                  f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Manual</th><th>Automatic</th><th>Gap (pts)</th><th>Automatic share of tests</th></tr></thead><tbody>{rows}</tbody></table></div>', alt=True),
            L.sec("trend", "The switch to automatic", "Automatic tests are growing fast", "Share of all car tests taken in an automatic, each year since 2015-16.", card("chShare")),
            L.sec("choose", "Manual or automatic?", "Which should you learn in?", "",
                  L.cards([("bi-gear", "Automatic", "Fewer controls to master, often fewer hours to test standard — but an automatic-only licence. Electric cars are all automatic."),
                           ("bi-gear-wide-connected", "Manual", "A licence for both. Pass rates are usually a little higher for manual — partly because of who learns in each."),
                           ("bi-cash", "Same price at DriveSQ", "£35/hr either way, and new learners get their first 10 hours for £330."),
                           ("bi-question-circle", "Still unsure?", '<a href="manual-or-automatic-decider.html">Try the manual or automatic decider</a>.')]) + links(), alt=True),
            sources()]
    faqs = [("Is the automatic driving test pass rate lower near Solihull?", f"Yes, slightly. At Shirley in 2025-26 automatic tests passed {sh['auto']}% against about {sh['manual']}% for manual (DVSA). Across Great Britain it was {gba['p']}% automatic and about {gbm}% manual."),
            ("How many driving tests are automatic now?", f"About {round(100 * gba['n'] / gbt['n'])}% of car tests in Great Britain in 2025-26, and {sh['share']}% at Shirley."),
            ("Is automatic easier to pass?", "It has fewer controls to learn, so many people reach test standard in fewer hours — but pass rates are a little lower, partly because of who chooses automatic.")]
    data = {"names": SHORT, "cur": cur, "share": share, "gbshare": gbshare, "labels": [y[2:4] + "/" + y[5:] for y in years], "cols": COLS}
    script = """var it=[];Object.keys(D.cur).forEach(function(k){it.push({label:D.names[k]+' — automatic',value:D.cur[k].auto,hi:true});it.push({label:D.names[k]+' — manual',value:D.cur[k].manual});});DSQCharts.bars(document.getElementById('chAM'),it,{unit:'%',max:70});
var S=Object.keys(D.share).map(function(k){return{name:D.names[k],color:D.cols[k],pts:D.labels.map(function(l,i){return[l,D.share[k][i]];})};});S.push({name:'Great Britain',color:'#111',dash:1,pts:D.labels.map(function(l,i){return[l,D.gbshare[i]];})});DSQCharts.line(document.getElementById('chShare'),{label:'Automatic share of tests',unit:'%',min:0,series:S});"""
    hero = L.hero("Official DVSA data", '<span class="w">Automatic</span> <span class="w w--red">vs</span> <span class="w">Manual.</span>', "pass rates for both at every Solihull test centre",
                  [("bi-gear", "Manual vs auto"), ("bi-graph-up", "Automatic share since 2015"), ("bi-bar-chart", "DVSA 2025-26")], [("red", "#compare", "bi-bar-chart", "See the comparison"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, build(f, "Automatic vs manual", "Automatic vs Manual Driving Test Pass Rates in Solihull (DVSA 2025-26) | DriveSQ",
                    f"Automatic and manual driving test pass rates at the seven test centres Solihull learners use, from official DVSA data — plus how fast automatic tests are growing. Shirley: {sh['auto']}% automatic, {sh['manual']}% manual.",
                    "automatic driving test pass rate, manual vs automatic pass rate, automatic driving lessons solihull, automatic test shirley", hero, secs, faqs, data, script)


# ───────────────────────── 3. first time ─────────────────────────
def first_time():
    f = "first-time-pass-rate-solihull.html"
    years = [y for y in sorted(NAT["first"]) if y >= "2015-16"]
    cur = {k: C[k]["first"][Y] for k in ORDER}
    best = max(ORDER, key=lambda k: cur[k]["p"])
    zero_rate = {k: round(1000 * cur[k]["zero"] / cur[k]["n"], 1) for k in ORDER}
    gbf = NAT["first"][Y]
    secs = [kpis([(cur["shirley"]["p"], 1, "%", "Shirley first-attempt pass rate"), (gbf["p"], 1, "%", "first attempts, Great Britain"), (sum(cur[k]["zero"] for k in ORDER), 0, "", "first-timers passed with zero faults (7 centres)"), (sum(cur[k]["n"] for k in ORDER), 0, "", "first attempts in 2025-26")]),
            L.sec("rank", "2025-26", "First-time pass rate at every centre", "", card("chFirst")),
            L.sec("trend", "Trend", "First-time pass rates since 2015-16", "Each centre against Great Britain.", card("chFT"), alt=True),
            L.sec("zero", "Clean sheets", "Passing first time with zero faults", "How many first-time candidates passed without a single driving fault, per 1,000 first attempts (2025-26).", card("chZero")),
            L.sec("how", "First-time pass", "How to pass first time", "",
                  L.cards([("bi-clipboard-check", "Mock tests on your centre's roads", "Do at least one full mock test marked like the real thing before you book."),
                           ("bi-card-checklist", "Show me, tell me", '<a href="show-me-tell-me-questions-trainer.html">Learn all 21 questions</a> — an easy fault to avoid.'),
                           ("bi-calendar-heart", "Pick your moment", '<a href="best-month-driving-test-solihull.html">Spring months</a> have had higher pass rates nationally.'),
                           ("bi-phone", "Track every skill", "The free DriveSQ Student Portal shows which of the 23 skills you've mastered.")]) + links(), alt=True),
            sources()]
    faqs = [("What is the first-time driving test pass rate in Solihull?", f"At Shirley, {cur['shirley']['p']}% of first attempts passed in 2025-26, against {gbf['p']}% across Great Britain (DVSA)."),
            ("Which test centre near Solihull has the highest first-time pass rate?", f"{C[best]['name']}, at {cur[best]['p']}% in 2025-26."),
            ("How many people pass their driving test first time with no faults?", f"Across the seven centres Solihull learners use, {sum(cur[k]['zero'] for k in ORDER):,} first-time candidates passed with zero faults in 2025-26.")]
    data = {"names": SHORT, "cols": COLS, "cur": {k: cur[k]["p"] for k in ORDER}, "gb": gbf["p"], "zero": zero_rate, "labels": [y[2:4] + "/" + y[5:] for y in years],
            "trend": {k: [C[k]["first"].get(y, {}).get("p") for y in years] for k in ORDER}, "gbt": [NAT["first"][y]["p"] for y in years]}
    script = """var c=Object.keys(D.cur).sort(function(a,b){return D.cur[b]-D.cur[a];}).map(function(k,i){return{label:D.names[k],value:D.cur[k],hi:i===0};});c.push({label:'Great Britain',value:D.gb});DSQCharts.bars(document.getElementById('chFirst'),c,{unit:'%',max:70});
var S=Object.keys(D.trend).map(function(k){return{name:D.names[k],color:D.cols[k],pts:D.labels.map(function(l,i){return[l,D.trend[k][i]];})};});S.push({name:'Great Britain',color:'#111',dash:1,pts:D.labels.map(function(l,i){return[l,D.gbt[i]];})});DSQCharts.line(document.getElementById('chFT'),{label:'First-time pass rate',unit:'%',series:S});
DSQCharts.bars(document.getElementById('chZero'),Object.keys(D.zero).sort(function(a,b){return D.zero[b]-D.zero[a];}).map(function(k,i){return{label:D.names[k],value:D.zero[k],hi:i===0};}),{unit:' per 1,000',digits:1});"""
    hero = L.hero("Official DVSA data", '<span class="w">First-Time</span> <span class="w w--red">Pass</span> <span class="w">Rates.</span>', "how many Solihull learners pass at the first attempt — centre by centre",
                  [("bi-1-circle", "First attempts"), ("bi-graph-up", "Trend since 2015"), ("bi-star", "Zero-fault passes")], [("red", "#rank", "bi-bar-chart", "See the rankings"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, build(f, "First-time pass rate", "First-Time Driving Test Pass Rate in Solihull (DVSA 2025-26) | DriveSQ",
                    f"First-time driving test pass rates at Shirley ({cur['shirley']['p']}%), Garretts Green, South Yardley, Kings Heath, Coventry, Redditch and Warwick — trends since 2015 and zero-fault passes, from DVSA.",
                    "first time pass rate driving test, pass driving test first time solihull, shirley first time pass rate, zero fault driving test", hero, secs, faqs, data, script)


# ───────────────────────── 4. cancellations ─────────────────────────
def cancellations():
    f = "driving-test-cancellations-solihull.html"
    cc = {k: C[k]["cancel"] for k in ORDER}
    per = {k: round(1000 * cc[k]["total"] / C[k]["years"][Y]["n"], 1) for k in ORDER}
    gbper = round(1000 * NAT["cancel"]["total"] / NAT["years"][Y]["n"], 1)
    tot = sum(cc[k]["total"] for k in ORDER)
    rows = "".join(f'<tr><td><a href="{TC.fname(k)}">{e(SHORT[k])}</a></td><td>{cc[k]["total"]:,}</td><td>{cc[k]["medical"]:,}</td><td>{cc[k]["leave"]:,}</td><td>{cc[k]["weather"]:,}</td><td><b>{per[k]}</b></td></tr>' for k in sorted(ORDER, key=lambda k: -per[k]))
    gg = cc["garretts-green"]
    secs = [kpis([(tot, 0, "", "tests cancelled by DVSA at the 7 centres (2025-26)"), (per["shirley"], 1, "", "per 1,000 tests at Shirley"), (gbper, 1, "", "per 1,000 tests, Great Britain"), (gg["medical"], 0, "", "examiner sickness cancellations at Garretts Green")]),
            L.sec("rate", "How often", "Cancellations per 1,000 tests", "Tests DVSA cancelled in 2025-26 for every 1,000 tests carried out.", card("chCan")),
            L.sec("why", "Why", "Why DVSA cancels tests", "DVSA's reasons: examiner sickness ('medical absences'), examiner leave, and bad weather ('acts of nature'). These are cancellations by DVSA — not by learners.",
                  f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Cancelled</th><th>Examiner sickness</th><th>Examiner leave</th><th>Weather</th><th>Per 1,000 tests</th></tr></thead><tbody>{rows}</tbody></table></div>', alt=True),
            L.sec("rights", "Your rights", "If DVSA cancels your test", "",
                  L.cards([("bi-calendar-plus", "Free new date", "DVSA rebooks you at no cost, and a DVSA change doesn't count towards your two allowed changes."),
                           ("bi-cash-coin", "Out-of-pocket expenses", "If DVSA cancels with less than 3 full working days' notice, you can claim — up to 2 hours of lessons at your instructor's standard rate, or hire-car or fuel costs, plus lost pay. Apply within 6 months; keep the receipts."),
                           ("bi-snow", "Weather and light", "Cancellations for bad weather or poor light get a new date (DVSA books it automatically) but no expenses."),
                           ("bi-phone", "Check before you go", "DVSA emails or texts — check on the morning of your test, especially in ice, snow or fog.")]) +
                  '<p class="mt-3">Related: <a href="winter-driving-solihull.html">winter driving &amp; gritting</a> · <a href="driving-test-rule-changes-2026-solihull.html">2026 booking rules</a></p>' + links()),
            sources(("cancel", "weather", "rules"))]
    faqs = [("How often are driving tests cancelled by DVSA near Solihull?", f"At Shirley, {cc['shirley']['total']} tests were cancelled by DVSA in 2025-26 — {per['shirley']} for every 1,000 tests. Across Great Britain it was {gbper} per 1,000."),
            ("Why does DVSA cancel driving tests?", "Mostly examiner sickness, then examiner leave and bad weather, according to DVSA's 2025-26 figures."),
            ("Can I claim if DVSA cancels my driving test?", "Yes, if DVSA cancelled with less than 3 full working days' notice — for example up to 2 hours of lessons at your instructor's standard rate, plus lost pay. Not for bad weather or poor light. Apply within 6 months.")]
    data = {"names": SHORT, "per": per, "gb": gbper}
    script = """var it=Object.keys(D.per).sort(function(a,b){return D.per[b]-D.per[a];}).map(function(k){return{label:D.names[k],value:D.per[k],hi:k==='shirley'};});it.push({label:'Great Britain',value:D.gb});DSQCharts.bars(document.getElementById('chCan'),it,{digits:1});"""
    hero = L.hero("Official DVSA data", '<span class="w">Test</span> <span class="w w--red">Cancellations</span> <span class="w">Solihull.</span>', "how often DVSA cancels tests at each centre — and what you're owed",
                  [("bi-x-octagon", "By reason"), ("bi-bar-chart", "Per 1,000 tests"), ("bi-cash-coin", "Your rights")], [("red", "#rate", "bi-bar-chart", "See the figures"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, build(f, "Test cancellations", "Driving Test Cancellations by DVSA in Solihull: How Often & Why (2025-26) | DriveSQ",
                    f"How often DVSA cancelled driving tests at Shirley, Garretts Green, South Yardley, Kings Heath, Coventry, Redditch and Warwick in 2025-26 — examiner sickness, leave and weather — and what you can claim.",
                    "driving test cancelled by dvsa, dvsa cancelled my driving test, driving test cancellation solihull, examiner sickness driving test", hero, secs, faqs, data, script)


# ───────────────────────── 5. waiting times ─────────────────────────
def waits():
    f = "driving-test-waiting-times-solihull.html"
    labels = [w["mo"] for w in C["shirley"]["waits"]]
    series = {k: {w["mo"]: w["med"] for w in C[k]["waits"]} for k in ORDER}
    def last(k): return [w for w in C[k]["waits"] if w["med"] is not None][-1]
    latest = {k: last(k) for k in ORDER}
    lm = latest["shirley"]["mo"].replace("-", " ")
    short = min(ORDER, key=lambda k: latest[k]["med"]); long = max(ORDER, key=lambda k: latest[k]["med"])
    recent = [l for l in labels if l.endswith("2025") or l.endswith("2026")]
    rows = "".join(f'<tr><td><a href="{TC.fname(k)}">{e(SHORT[k])}</a></td><td><b>{latest[k]["med"]} wks</b></td><td>{(str(round(latest[k]["in7"])) + "%") if latest[k].get("in7") is not None else "—"}</td><td>{min((series[k][m] for m in recent if series[k].get(m) is not None), default="—")} – {max((series[k][m] for m in recent if series[k].get(m) is not None), default="—")} wks</td></tr>' for k in sorted(ORDER, key=lambda k: latest[k]["med"]))
    tool = """<div class="sol-card reveal" style="padding:22px"><div id="wtBtns" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div><div id="wtOut"></div><p id="wtNote" class="sol-note mt-2 mb-0"></p></div>"""
    secs = [kpis([(latest["shirley"]["med"], 1, " wks", f"Shirley median wait, {lm}"), (latest[short]["med"], 1, " wks", f"shortest: {SHORT[short]}"), (latest[long]["med"], 1, " wks", f"longest: {SHORT[long]}"), (len(labels), 0, "", "months of data since 2019")]),
            L.sec("tracker", "Tracker", "Median wait at each centre, month by month", "Pick a centre to see every month since January 2019. Gaps are months DVSA didn't publish.", tool),
            L.sec("latest", "Latest", f"Waiting times now ({lm})", "Median weeks from booking to test, and the share of tests taken within 7 weeks of booking.",
                  f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Median wait</th><th>Taken within 7 weeks</th><th>Range since Jan 2025</th></tr></thead><tbody>{rows}</tbody></table></div>', alt=True),
            L.sec("all", "Since 2025", "All seven centres since January 2025", "", card("chAll")),
            L.sec("tips", "Getting a test sooner", "How to get a test sooner — the 2026 way", "",
                  L.cards([("bi-person-lock", "Book it yourself", "Since May 2026 only you can book or change your test, on GOV.UK. Avoid paid 'cancellation' apps."),
                           ("bi-arrow-repeat", "Use your two changes well", "You get two changes per booking — check GOV.UK for earlier slots before using one."),
                           ("bi-geo-alt", "Nearby centres only", "You can move a test only to one of the three nearest centres. Compare their waits above."),
                           ("bi-calendar-check", "Book early", '<a href="solihull-pass-by-date-planner.html">The pass-by-date planner</a> tells you when to book so the date lands when you\'re ready.')]) + links(), alt=True),
            sources(("waits", "rules", "book"))]
    faqs = [("How long is the wait for a driving test in Solihull?", f"At Shirley, DVSA's median wait was {latest['shirley']['med']} weeks in {lm}. Nearby, {SHORT[short]} had the shortest ({latest[short]['med']} weeks) and {SHORT[long]} the longest ({latest[long]['med']} weeks)."),
            ("What does median wait mean?", "Half of the tests taken that month had been booked less than that many weeks before, and half more. DVSA publishes it monthly for each test centre."),
            ("How can I get a driving test sooner in Solihull?", "Book yourself on GOV.UK, check for earlier dates before using one of your two changes, and compare the three nearest centres you're allowed to move to.")]
    data = {"names": SHORT, "cols": COLS, "labels": labels, "series": {k: [series[k].get(m) for m in labels] for k in ORDER}, "recent": recent, "rs": {k: [series[k].get(m) for m in recent] for k in ORDER}}
    script = """var b=document.getElementById('wtBtns'),cur='shirley';function lab(m){return m.slice(0,3)+' '+m.slice(-2);}
function draw(){DSQCharts.line(document.getElementById('wtOut'),{label:'Median wait',min:0,digits:1,series:[{name:'Median wait (weeks) — '+D.names[cur],color:D.cols[cur],pts:D.labels.map(function(m,i){return[lab(m),D.series[cur][i]];})}]});
document.getElementById('wtNote').textContent='Weeks from booking to test (DVSA median). Latest: '+D.series[cur].filter(function(v){return v!=null;}).slice(-1)[0]+' weeks.';[].forEach.call(b.children,function(x){x.className='dsqx-btn '+(x.getAttribute('data-k')===cur?'dsqx-btn--red':'dsqx-btn--ghost');});}
Object.keys(D.names).forEach(function(k){var x=document.createElement('button');x.type='button';x.setAttribute('data-k',k);x.textContent=D.names[k];x.onclick=function(){cur=k;draw();};b.appendChild(x);});draw();
DSQCharts.line(document.getElementById('chAll'),{label:'Median waits since 2025',min:0,digits:1,series:Object.keys(D.rs).map(function(k){return{name:D.names[k],color:D.cols[k],pts:D.recent.map(function(m,i){return[lab(m),D.rs[k][i]];})};})});"""
    hero = L.hero("Official DVSA data", '<span class="w">Driving Test</span> <span class="w w--red">Waiting</span> <span class="w">Times.</span>', "every month since 2019 at the seven centres Solihull learners use",
                  [("bi-hourglass-split", "Median weeks"), ("bi-calendar3", "Monthly since 2019"), ("bi-geo-alt", "All 7 centres")], [("red", "#tracker", "bi-graph-up", "Open the tracker"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    return f, build(f, "Test waiting times", "Driving Test Waiting Times in Solihull: Monthly Tracker (DVSA, 2019–2026) | DriveSQ",
                    f"DVSA's median driving test waiting times every month since 2019 at Shirley ({latest['shirley']['med']} weeks in {lm}), Garretts Green, South Yardley, Kings Heath, Coventry, Redditch and Warwick — and how to get a test sooner.",
                    "driving test waiting times solihull, shirley driving test wait, how long to wait for driving test birmingham, driving test backlog solihull", hero, secs, faqs, data, script)


PAGES = [by_age, auto_manual, first_time, cancellations, waits]


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
