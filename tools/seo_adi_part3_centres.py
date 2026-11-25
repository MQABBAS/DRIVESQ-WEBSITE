#!/usr/bin/env python3
"""ADI Part 3 by Manchester test centre: 10 data-driven pages built from the official DVSA tables.
   Data: data/dvsa_adi_part3.json, extracted from
     DRT522B  ADI part 3 (instructional ability) test pass rate by gender: test centres  (updated 25 June 2026, data to March 2026)
     DRT521C  ADI part 3 tests conducted, passed and pass rates, Great Britain (updated 3 September 2026, data to June 2026)
   https://www.gov.uk/government/statistical-data-sets/approved-driving-instructor-adi-qualifying-test-data
   Every figure on the pages is read from that file. Where DVSA withholds a count ('..') the page says so and shows only the pass rate DVSA publishes.
   Run: python3 tools/seo_adi_part3_centres.py   (writes the pages and adds them to sitemap-1.xml)"""
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "data/dvsa_adi_part3.json")))
BASE = "https://www.drivesq.co.uk/"
TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
_src = open(os.path.join(ROOT, "tools/seo_dvsa_pages.py"), encoding="utf-8").read()
CSS = re.search(r'CSS = """(.*?)"""', _src, re.S).group(1)
SRC = D["source"]["page"]
WA = "https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27d%20like%20details%20about%20ADI%20Part%203%20training"
YEARS = ["2018-19", "2019-20", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
YL = lambda y: y.replace("-", "/")
CUR, PREV = "2025-26", "2024-25"
CEN = {k: v for k, v in D["centres"].items() if k in ("Atherton", "Bolton", "Bredbury", "Bury", "Cheetham Hill", "Rochdale", "Sale", "West Didsbury")}
NAT = D["national"]
slugify = lambda n: n.lower().replace(" ", "-")
cslug = lambda n: f"adi-part-3-test-centre-{slugify(n)}-manchester.html"
p1 = lambda v: "n/a" if v is None else f"{v:.1f}%"
n0 = lambda v: "withheld" if v is None else f"{v:,.0f}"
sg = lambda v: f"{v:+.1f}"
pw = lambda v: f"{abs(v):.1f} percentage point{'s' if round(abs(v), 1) != 1 else ''}"
ordn = lambda i: {1: "highest", 2: "second highest", 3: "third highest", 4: "fourth highest", 5: "fourth lowest", 6: "third lowest", 7: "second lowest", 8: "lowest"}[i]
rate = lambda n, y: (CEN[n].get(y) or {}).get("rate")
by_rate = sorted(CEN, key=lambda n: -rate(n, CUR)); rank = {n: i + 1 for i, n in enumerate(by_rate)}
natr = lambda y: NAT[y]["rate"]

def table(head, rows):
    return '<div class="tbl"><table><thead><tr>' + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div>"
cls = lambda v: "up" if v > 0 else "dn" if v < 0 else ""
LINKS_ALL = [("/adi-part-3-test-centres-manchester-pass-rates.html", "ADI Part 3 pass rates at every Manchester test centre")] + [(f"/{cslug(n)}", f"ADI Part 3 at {n}") for n in sorted(CEN)] + [("/adi-part-3-pass-rate-great-britain-trend.html", "ADI Part 3 pass rates across Great Britain: the trend since 2018")]
LINKS_MORE = [("/adi-part-3-training-booking.html", "Book your ADI Part 3 training"), ("/adi-part-3-score-calculator.html", "ADI Part 3 score calculator"), ("/adi-part-3-deadline-calculator.html", "ADI Part 3 deadline calculator"), ("/adi-part-3-cost-calculator.html", "ADI Part 3 cost calculator"), ("/adi-part-3-training-manchester.html", "ADI Part 3 training in Manchester"), ("/adi-part-3-marking-grades-17-competencies-explained.html", "How the ADI Part 3 is marked"), ("/adi-part-3-fail-retake-third-attempt-rules.html", "Failed ADI Part 3? Retake rules"), ("/manchester-driving-test-pass-rates-by-test-centre.html", "Car driving test pass rates by Manchester test centre")]
CAVEAT = ("DVSA notes that ADI Part 3 data is recorded by hand, so accuracy can be affected. It also withholds counts where they are small enough to identify individuals (shown here as 'withheld'), and a centre appears only if more than one examiner carries out these tests. "
          "Small numbers move pass rates a lot: one extra pass or fail can shift a centre's rate by several points. Treat one year at one centre with care.")

def page(slug, title, desc, h1, body, faq, about, meta_src="DVSA ADI part 3 test statistics (DRT522B, published 25 June 2026, data to March 2026)"):
    url = BASE + slug
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article", "headline": h1, "description": desc, "datePublished": TODAY, "dateModified": TODAY, "inLanguage": "en-GB", "mainEntityOfPage": url,
         "author": {"@id": BASE + "#school"}, "publisher": {"@id": BASE + "#school"}, "about": about, "citation": SRC},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE}, {"@type": "ListItem", "position": 2, "name": "ADI Part 3 training", "item": BASE + "adi-part-3-training-manchester.html"}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]}]}
    faqh = "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in LINKS_ALL + LINKS_MORE if u != "/" + slug)
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/adi-part-3-training-manchester.html">ADI Part 3 training</a><a href="/become-driving-instructor-manchester.html">Become an instructor</a><a href="/areas.html">Areas</a></nav></div></header>
<main class="wrap"><h1>{html.escape(h1)}</h1><div class="meta">Updated {TODAY_H} · Source: {meta_src}</div>
{body}
<h2>Questions people ask</h2>{faqh}
<h2>Preparing for your ADI Part 3 in Manchester?</h2><p>DriveSQ trains instructors for the ADI Part 3 in Greater Manchester. Message us on WhatsApp to ask about dates, the price and how a session works.</p>
<a class="cta" href="/adi-part-3-training-booking.html?from={slug}">Book ADI Part 3 training</a><a class="cta alt" href="{WA}" rel="nofollow noopener">WhatsApp 07352 932003</a>
<h2>More on the ADI Part 3</h2><ul>{rel}</ul>
<p class="src"><strong>Source and method.</strong> All figures are from the DVSA tables DRT522B ("ADI part 3 test pass rate by gender: test centres", updated 25 June 2026, data to March 2026) and DRT521C ("ADI part 3 tests conducted, passed and pass rates", Great Britain, updated 3 September 2026), published on <a href="{SRC}" rel="noopener">GOV.UK</a>. Years are financial years (April to March); 2020/21 is left out because the pandemic disrupted testing. {CAVEAT} DVSA also notes that before December 2022 not all ADI Part 3 tests were recorded, so older pass rates carry extra uncertainty. Differences, rankings and comparisons on this page are calculated by DriveSQ from the DVSA figures and are not DVSA headline figures. A centre's pass rate says nothing about how any individual test was marked.</p></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/areas.html">Areas</a></footer>
<script src="/dsq-analytics.js" defer></script></body></html>'''

pages = {}
nat_c, nat_p = NAT[CUR]["rate"], NAT[PREV]["rate"]
# ============ OVERVIEW ============
rows = []
for n in by_rate:
    c = CEN[n]; r0, r1, r2 = c[CUR]["rate"], c[PREV]["rate"], c["2023-24"]["rate"]
    rows.append([f'<b><a href="/{cslug(n)}">{n}</a></b>', p1(r0), f'<span class="{cls(r0 - nat_c)}">{sg(r0 - nat_c)}</span>', p1(r1), p1(r2), n0(c[CUR]["tests"]) if c[CUR]["tests"] else "withheld"])
tb = table(["Centre", "2025/26 pass rate", "vs national", "2024/25", "2023/24", "Tests 2025/26"], rows)
above = [n for n in by_rate if rate(n, CUR) > nat_c]; below = [n for n in by_rate if rate(n, CUR) <= nat_c]
known = [(n, CEN[n][CUR]["tests"], CEN[n][CUR]["passes"]) for n in CEN if CEN[n][CUR]["tests"]]
kt, kp = sum(t for _, t, _ in known), sum(p for _, _, p in known)
lo, hi = min(by_rate, key=lambda n: rate(n, CUR)), by_rate[0]
r18 = [rate(n, "2018-19") for n in CEN]; fell_n = sum(1 for n in CEN if rate(n, CUR) < rate(n, "2018-19"))
b1 = f'''<p class="lead">Eight DVSA centres in the Manchester area publish ADI Part 3 results. In 2025/26 their pass rates ran from <b>{p1(rate(lo, CUR))}</b> at {lo} to <b>{p1(rate(hi, CUR))}</b> at {hi}, against a Great Britain figure of <b>{p1(nat_c)}</b>. Here is every centre, with the trend, and what the numbers can and cannot tell you.</p>
<div class="note"><b>Short version:</b> only {len(above)} of the 8 centres were above the national pass rate in 2025/26 ({", ".join(above)}). {fell_n} of the 8 centres have a lower pass rate than in 2018/19, when the eight were between {min(r18):.0f}% and {max(r18):.0f}%.</div>
<h2>ADI Part 3 pass rates by Manchester test centre, 2025/26</h2>
{tb}
<p>"vs national" is each centre's pass rate minus the Great Britain rate of {p1(nat_c)} for the same year, in percentage points. DVSA publishes the number of tests only where it is large enough to be safe to show, so for most centres the count is withheld and only the pass rate is available.</p>
<h2>What stands out</h2>
<ul>
<li><b>{hi} is the highest at {p1(rate(hi, CUR))}</b>, {pw(rate(hi, CUR) - nat_c)} above the national figure. {by_rate[1]} follows at {p1(rate(by_rate[1], CUR))}.</li>
<li><b>{lo} is the lowest at {p1(rate(lo, CUR))}</b>, {pw(rate(lo, CUR) - nat_c)} below national. Its rate has been in the range of {min(rate(lo, y) for y in YEARS):.1f}% to {max(rate(lo, y) for y in YEARS):.1f}% across the years shown on this site.</li>
<li><b>{len(known)} centres publish their 2025/26 test count:</b> {" and ".join(f"{n} ({int(t)} tests, {int(p)} passes)" for n, t, p in known)}. Together that is {int(kt)} tests and {int(kp)} passes, a combined pass rate of {kp / kt * 100:.1f}%.</li>
<li><b>Several centres are volatile.</b> Bury, for example, went from {p1(rate("Bury", "2023-24"))} in 2023/24 to {p1(rate("Bury", PREV))} in 2024/25 and {p1(rate("Bury", CUR))} in 2025/26. With so few tests, swings like that are common and should not be read as a change in how tests are run.</li></ul>
<h2>Why not just pick the centre with the best number?</h2>
<p>You may not get a choice of centre, and even if you do, a pass rate is a poor guide to your own chances. Three reasons:</p>
<ol><li><b>Small samples.</b> Most centres run a few dozen to a few hundred Part 3 tests a year. A single result moves the rate by several points.</li><li><b>The rate describes candidates as well as the test.</b> Who takes their test at a centre, and how well prepared they are, differs from place to place.</li><li><b>Your own preparation matters far more.</b> A different centre means different roads, but it does not change what is being marked. See <a href="/adi-part-3-marking-grades-17-competencies-explained.html">how the Part 3 is marked</a>.</li></ol>
<h2>What you can do with this information</h2>
<ul><li>Use it to set expectations. Across Great Britain about {p1(nat_c)} of Part 3 attempts pass, so a fail is common and not a sign that you cannot teach.</li><li>Prepare with a pupil who is comfortable on the roads around your booked centre, if you know which one it will be.</li><li>Plan for a retake in your timeline and budget, because each attempt costs £111. See <a href="/adi-part-3-fail-retake-third-attempt-rules.html">the retake and third-attempt rules</a>.</li></ul>
<h2>Each centre in detail</h2>
<p>Pick a centre for its full history, year by year:</p>
<ul>{"".join(f'<li><a href="/{cslug(n)}">{n}: {p1(rate(n, CUR))} in 2025/26</a></li>' for n in by_rate)}</ul>
<h2>A note on Hyde</h2>
<p>Hyde appeared in the older DVSA tables and is marked as closed in 2021/22, so it is not included here.</p>'''
f1 = [("Which Manchester test centre has the highest ADI Part 3 pass rate?", f"In 2025/26 DVSA published a pass rate of {p1(rate(hi, CUR))} for {hi}, the highest of the eight Manchester centres, against {p1(nat_c)} for Great Britain. Small numbers mean the ranking can change from year to year."),
      ("Which Manchester centre has the lowest ADI Part 3 pass rate?", f"{lo} at {p1(rate(lo, CUR))} in 2025/26. Check the year-by-year figures before drawing conclusions, because a few tests can move a centre's rate by several points."),
      ("What is the ADI Part 3 pass rate in Great Britain?", f"{p1(nat_c)} for 2025/26 across {n0(NAT[CUR]['tests'])} tests, according to DVSA table DRT522B. It was {p1(NAT['2018-19']['rate'])} in 2018/19."),
      ("Can I choose which test centre I take my ADI Part 3 at?", "GOV.UK explains how to book the Part 3 on its test page. We could not confirm from official pages how a centre is chosen, so check the booking service when you book."),
      ("Does a lower pass rate mean the test is harder at that centre?", "No. The rate reflects who took their test there and how prepared they were, as well as the test. With small numbers, a few results can change a centre's rate by several points.")]
pages["adi-part-3-test-centres-manchester-pass-rates.html"] = page("adi-part-3-test-centres-manchester-pass-rates.html", "ADI Part 3 Pass Rates at Manchester Test Centres | DriveSQ",
    f"ADI Part 3 pass rates at all eight Manchester test centres, from {p1(rate(lo, CUR))} to {p1(rate(hi, CUR))} in 2025/26 against {p1(nat_c)} nationally. Official DVSA figures.", "ADI Part 3 pass rates at every Manchester test centre", b1, f1, {"@type": "Thing", "name": "ADI Part 3 pass rates by test centre"})

# ============ PER CENTRE ============
for n in sorted(CEN):
    c = CEN[n]; r = c[CUR]["rate"]; rk = rank[n]; d = r - nat_c
    hist = [(y, c[y]["rate"]) for y in YEARS if y in c]
    best = max(hist, key=lambda t: t[1]); worst = min(hist, key=lambda t: t[1]); first, last = hist[0], hist[-1]
    chg = last[1] - first[1]; chg_prev = r - c[PREV]["rate"]
    rows = []
    for y in reversed(YEARS):
        if y not in c: continue
        t, pz, rt = c[y]["tests"], c[y]["passes"], c[y]["rate"]
        rows.append([YL(y), n0(t) if t is not None else "withheld", n0(pz) if pz is not None else "withheld", p1(rt), p1(NAT[y]["rate"]), f'<span class="{cls(rt - NAT[y]["rate"])}">{sg(rt - NAT[y]["rate"])}</span>'])
    tbl = table(["Year", "Tests", "Passes", f"{n} pass rate", "Great Britain", "Difference"], rows)
    withheld_cur = c[CUR]["tests"] is None
    vol = (f"DVSA published {int(c[CUR]['tests'])} ADI Part 3 tests at {n} in 2025/26, of which {int(c[CUR]['passes'])} passed." if not withheld_cur else f"DVSA withheld the number of ADI Part 3 tests at {n} for 2025/26 because it is small, so only the pass rate is public.")
    ab = "above" if d > 0 else "below"
    b = f'''<p class="lead">{n} (Manchester) is one of the eight DVSA test centres in the Manchester area that publish ADI Part 3 results. In 2025/26 its pass rate was <b>{p1(r)}</b>, which is {pw(d)} {ab} the Great Britain figure of {p1(nat_c)}. That makes it the {ordn(rk)} of the eight Manchester centres.</p>
<div class="note"><b>At a glance:</b> {vol} Its pass rate was {p1(c[PREV]["rate"])} in 2024/25, a change of {sg(chg_prev)} points, and {p1(first[1])} in {YL(first[0])}.</div>
<h2>{n} ADI Part 3 pass rates, year by year</h2>
{tbl}
<p>"Difference" is {n}'s pass rate minus the national rate for the same year, in percentage points. The two years with the highest and lowest figures at {n} are {YL(best[0])} ({p1(best[1])}) and {YL(worst[0])} ({p1(worst[1])}).</p>
<h2>What the figures tell you</h2>
<ul><li><b>Compared with Great Britain:</b> {n} was above the national rate in {sum(1 for y, rt in hist if rt > NAT[y]["rate"])} of the {len(hist)} years shown, and at or below it in {sum(1 for y, rt in hist if rt <= NAT[y]["rate"])}.</li>
<li><b>Trend:</b> its pass rate moved from {p1(first[1])} in {YL(first[0])} to {p1(last[1])} in {YL(last[0])}, a change of {sg(chg)} points. Across Great Britain the rate moved from {p1(NAT[first[0]]["rate"])} to {p1(NAT[last[0]]["rate"])} over the same period ({sg(NAT[last[0]]["rate"] - NAT[first[0]]["rate"])} points).</li>
<li><b>Volume:</b> {vol}</li></ul>
<div class="note"><b>Read it with care.</b> One year at one centre is a small sample. A few extra passes or fails can change the rate by several points, and the pass rate says as much about who took their test at the centre and how well prepared they were as about the test itself.</div>
<h2>If your test is booked at {n}</h2>
<ul><li>Check your booking confirmation for the exact centre and time, and plan your journey and your pupil's journey with a margin.</li><li>Choose a pupil who is comfortable on the roads in the area. GOV.UK says the pupil can be a partly trained learner, a fully trained learner or a full licence holder.</li><li>Prepare for the test itself rather than the centre: about 45 minutes, a short opening on goals and risk, around 40 minutes with the pupil driving, and a short reflection at the end. See <a href="/adi-part-3-test-what-happens-minute-by-minute.html">the test, minute by minute</a>.</li><li>Know your pass mark. You need 31 or more out of 51 to pass. See <a href="/adi-part-3-marking-grades-17-competencies-explained.html">how it is marked</a>.</li></ul>
<h2>Learner driving tests are different</h2>
<p>This page is about the instructor test. If you are a learner looking for car driving test pass rates, see <a href="/manchester-driving-test-pass-rates-by-test-centre.html">car driving test pass rates by Manchester test centre</a>.</p>'''
    f = [(f"Is {n} an ADI Part 3 test centre?", f"DVSA publishes ADI Part 3 results for {n} (Manchester), so ADI Part 3 tests are carried out there. Check your booking for the exact centre."),
         (f"What is the ADI Part 3 pass rate at {n}?", f"DVSA's published pass rate for {n} was {p1(r)} in 2025/26 and {p1(c[PREV]['rate'])} in 2024/25. The Great Britain figure was {p1(nat_c)} in 2025/26."),
         (f"Is the ADI Part 3 harder at {n}?", "A pass rate cannot tell you that. It reflects the candidates who took their test there and how well prepared they were. With small numbers, a few results can change a centre's rate by several points."),
         ("How many tests are there at this centre?", vol),
         ("What score do I need to pass the ADI Part 3?", "31 or more out of 51. Grade B is 31 to 42, Grade A is 43 to 51, and 0 to 30 is a fail. A score of 7 or less in the risk management category is also a fail.")]
    pages[cslug(n)] = page(cslug(n), f"ADI Part 3 at {n}: Pass Rate and Test Centre | DriveSQ",
        f"ADI Part 3 at {n} (Manchester): {p1(r)} pass rate in 2025/26 against {p1(nat_c)} nationally, with the year-by-year history. Official DVSA figures.", f"ADI Part 3 at {n}: pass rate and test centre guide", b, f, {"@type": "Thing", "name": f"ADI Part 3 test centre: {n}"})

# ============ GB TREND ============
gb = D["gb_fy"]; fy = lambda y: gb[y.replace("-", " to 20")]
g18, g26, g25, g24 = fy("2018-19"), fy("2025-26"), fy("2024-25"), fy("2023-24")
rows = [[y.split(" to ")[0] + "/" + y.split(" to ")[1][2:4], n0(v["tests"]), n0(v["passes"]), p1(v["rate"])] for y, v in gb.items() if y >= "2018 to 2019" and "ytd" not in y and y != "2020 to 2021"]
gm, gf = NAT[CUR]["m_tests"], NAT[CUR]["f_tests"]
rm, rf = NAT[CUR]["m_rate"], NAT[CUR]["f_rate"]
q = D["gb_q"]
b3 = f'''<p class="lead">More people than ever are taking the ADI Part 3, and a smaller share are passing. In 2025/26 there were <b>{n0(g26["tests"])}</b> Part 3 tests in Great Britain, almost double the {n0(g18["tests"])} in 2018/19, and the pass rate fell from <b>{p1(g18["rate"])}</b> to <b>{p1(g26["rate"])}</b>.</p>
<div class="note"><b>The numbers:</b> tests {sg((g26["tests"] / g18["tests"] - 1) * 100)}% since 2018/19, pass rate {sg(g26["rate"] - g18["rate"])} percentage points. Passes still rose from {n0(g18["passes"])} to {n0(g26["passes"])}.</div>
<h2>Great Britain, year by year</h2>
{table(["Year", "Tests", "Passes", "Pass rate"], rows[::-1])}
<p>The financial year runs from April to March. 2020/21 is left out because the pandemic stopped most testing. The first quarter of 2026/27 (April to June 2026, provisional) shows {p1(gb["2026 to 2027 (ytd)"]["rate"])} on {n0(gb["2026 to 2027 (ytd)"]["tests"])} tests. DVSA's two tables differ by a few tests for 2025/26 ({n0(g26["tests"])} here against {n0(NAT[CUR]["tests"])} in the by-centre table). This page uses the Great Britain table for the trend, and the centre pages use the by-centre table.</p>
<h2>The last six quarters</h2>
{table(["Quarter", "Tests", "Passes", "Pass rate"], [[re.sub(r"^(\d{4}) to \d\d(\d\d) (Q\d) (.*)$", r"\1/\2 \3 (\4)", x["q"]), n0(x["tests"]), n0(x["passes"]), p1(x["rate"])] for x in q[::-1]])}
<h2>What the trend suggests, and what it does not</h2>
<p>DVSA does not say why the pass rate fell. What the figures show is a clear step down from about {p1(g24["rate"])} in 2023/24 to {p1(g25["rate"])} in 2024/25, at the same time as tests rose from {n0(g24["tests"])} to {n0(g25["tests"])}. Possible reasons are more first-time candidates, different preparation, or changes in how tests are recorded: before December 2022 DVSA did not record every Part 3 test. Without the underlying reasons, treat any explanation as a guess.</p>
<h2>Men and women</h2>
<p>In 2025/26 DVSA published {n0(gm)} tests taken by men (pass rate {p1(rm)}) and {n0(gf)} by women ({p1(rf)}). Women made up {gf / (gm + gf) * 100:.0f}% of tests and passed at a rate {rf - rm:.1f} points higher.</p>
<h2>What this means for you</h2>
<ul><li><b>A fail is common.</b> Roughly seven in ten attempts do not pass, so a fail says little about your ability to teach.</li><li><b>Prepare for the marking sheet.</b> The pass mark is 31 out of 51, with a minimum standard in risk management. See <a href="/adi-part-3-marking-grades-17-competencies-explained.html">how it is marked</a>.</li><li><b>Budget for a possible retake.</b> Each attempt costs £111, and the rules after a third fail are strict. See <a href="/adi-part-3-fail-retake-third-attempt-rules.html">the retake rules</a>.</li><li><b>Compare centres cautiously.</b> See <a href="/adi-part-3-test-centres-manchester-pass-rates.html">ADI Part 3 pass rates at every Manchester centre</a>.</li></ul>'''
f3 = [("What is the ADI Part 3 pass rate in Great Britain?", f"{p1(g26['rate'])} in 2025/26 ({n0(g26['passes'])} passes from {n0(g26['tests'])} tests), according to DVSA table DRT521C."),
      ("Has the ADI Part 3 pass rate fallen?", f"Yes. It was {p1(g18['rate'])} in 2018/19, {p1(g24['rate'])} in 2023/24 and {p1(g26['rate'])} in 2025/26, while the number of tests roughly doubled."),
      ("Do women pass the ADI Part 3 more often than men?", f"In 2025/26 DVSA's figures show a pass rate of {p1(rf)} for women and {p1(rm)} for men."),
      ("How many ADI Part 3 tests are taken a year?", f"{n0(g26['tests'])} in 2025/26, up from {n0(g18['tests'])} in 2018/19."),
      ("Why did the pass rate fall?", "DVSA does not give a reason in the data. Treat explanations with caution. One known factor for older years is that not every Part 3 test was recorded before December 2022.")]
pages["adi-part-3-pass-rate-great-britain-trend.html"] = page("adi-part-3-pass-rate-great-britain-trend.html", "ADI Part 3 Pass Rate in Great Britain Since 2018 | DriveSQ",
    f"ADI Part 3 pass rates in Great Britain fell from {p1(g18['rate'])} in 2018/19 to {p1(g26['rate'])} in 2025/26 as tests nearly doubled. Official DVSA figures and what they mean.", "ADI Part 3 pass rates across Great Britain: the trend since 2018", b3, f3, {"@type": "Thing", "name": "ADI Part 3 pass rate trend"}, meta_src="DVSA ADI part 3 test statistics (DRT521C, published 3 September 2026, data to June 2026)")

for slug, h in pages.items(): open(os.path.join(ROOT, slug), "w", encoding="utf-8").write(h)
smp = os.path.join(ROOT, "sitemap-1.xml"); sm = open(smp, encoding="utf-8").read()
for slug in pages:
    if slug not in sm: sm = sm.replace("</urlset>", f"  <url><loc>{BASE}{slug}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
open(smp, "w", encoding="utf-8").write(sm)
print("pages:", len(pages), "| national", p1(nat_c), "| best", hi, p1(rate(hi, CUR)), "| worst", lo, p1(rate(lo, CUR)))
