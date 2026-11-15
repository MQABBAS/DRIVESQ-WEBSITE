#!/usr/bin/env python3
"""Builds four data-driven Manchester pages from the DVSA test-centre statistics (DRT122A/C/D/E, updated June 2026, data to March 2026).
   Every number comes from data/dvsa_manchester_2025_26.json (extracted from the DVSA files). National figures are the DVSA totals.
   Run: python3 tools/seo_dvsa_pages.py   (rewrites the four pages and adds them to sitemap-1.xml)"""
import json, os, re, html, datetime, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "data/dvsa_manchester_2025_26.json")))
R = D["R"]; S, P = "2025-26", "2024-25"; C, C0 = R[S], R[P]
TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
BASE = "https://www.drivesq.co.uk/"
NAT = dict(tests=1998621, passes=1000043, rate=1000043 / 1998621 * 100, rate_prev=48.7, fa=50.5, auto_tests=589483, auto_pass=263121, auto_rate=263121 / 589483 * 100)
NAT["manual_rate"] = (NAT["passes"] - NAT["auto_pass"]) / (NAT["tests"] - NAT["auto_tests"]) * 100
NAT["auto_share"] = NAT["auto_tests"] / NAT["tests"] * 100
SRC_PAGE = "https://www.gov.uk/government/statistical-data-sets/car-driving-test-data-by-test-centre"
short = lambda n: n.replace(" (Manchester)", "")
n0 = lambda v: f"{v:,.0f}"; p1 = lambda v: f"{v:.1f}%"; sg = lambda v: f"{v:+.1f}"
names = list(C.keys())
for n in names:
    c = C[n]; c["manual_rate"] = (c["passes"] - c["auto_pass"]) / (c["tests"] - c["auto_tests"]) * 100; c["auto_share"] = c["auto_tests"] / c["tests"] * 100
    c["chg"] = c["rate"] - C0[n]["rate"]
tot_t = sum(C[n]["tests"] for n in names); tot_p = sum(C[n]["passes"] for n in names); gm_rate = tot_p / tot_t * 100
tot_p0 = sum(C0[n]["passes"] for n in names); tot_t0 = sum(C0[n]["tests"] for n in names); gm_rate0 = tot_p0 / tot_t0 * 100
auto_t = sum(C[n]["auto_tests"] for n in names); auto_p = sum(C[n]["auto_pass"] for n in names)
gm_auto = auto_p / auto_t * 100; gm_manual = (tot_p - auto_p) / (tot_t - auto_t) * 100; gm_auto_share = auto_t / tot_t * 100
by_rate = sorted(names, key=lambda n: -C[n]["rate"]); best, worst = by_rate[0], by_rate[-1]
above = [n for n in names if C[n]["rate"] > NAT["rate"]]
mon = collections.OrderedDict()
for n in names:
    for m, t, p, r in C[n]["months"]:
        a = mon.setdefault(m, [0, 0]); a[0] += t or 0; a[1] += p or 0
mon_rate = {m: 100 * p / t for m, (t, p) in mon.items()}
ages = collections.OrderedDict()
for n in names:
    for a, v in C[n]["ages"].items():
        if not a.isdigit() or not (17 <= int(a) <= 25): continue
        x = ages.setdefault(a, [0, 0]); x[0] += v["t"] or 0; x[1] += v["p"] or 0
ages = collections.OrderedDict(sorted(ages.items(), key=lambda kv: int(kv[0])))
age_rate = {a: 100 * p / t for a, (t, p) in ages.items() if t}

CSS = """:root{--red:#D10A11;--gold:#F5C518;--ink:#1a1214;--bg:#f6f2ee;--card:#fff;--line:rgba(127,127,127,.28)}@media(prefers-color-scheme:dark){:root{--ink:#f3eeee;--bg:#0b0204;--card:#16080a}}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,Arial,sans-serif;line-height:1.65}a{color:inherit}.wrap{max-width:860px;margin:0 auto;padding:20px 16px 44px}
header{background:#0b0204;color:#fff;padding:14px 16px}header .in{max-width:860px;margin:0 auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}header b{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem}header b span{color:#ff2d35}header nav a{color:#fff;text-decoration:none;margin-left:14px;font-weight:600;font-size:.9rem}
h1{font-family:'Barlow Condensed',sans-serif;font-size:2.3rem;line-height:1.05;margin:10px 0 6px;text-transform:uppercase}h2{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;margin:30px 0 8px;text-transform:uppercase;color:var(--red)}
.meta{font-size:.8rem;opacity:.75;margin-bottom:12px}.lead{font-size:1.04rem}.cta{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 22px;margin:8px 10px 4px 0}.cta.alt{background:#25D366;color:#06210f}
.tbl{overflow-x:auto;margin:12px 0;border:1px solid var(--line);border-radius:12px;background:var(--card)}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{padding:9px 11px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap}th:first-child,td:first-child{text-align:left;white-space:normal}th{font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;opacity:.8}tr:last-child td{border-bottom:0}.up{color:#16a34a;font-weight:700}.dn{color:#dc2626;font-weight:700}
.note{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:10px;padding:10px 14px;font-size:.9rem;margin:14px 0}details{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin:8px 0}summary{cursor:pointer;font-weight:700}ul{padding-left:20px}.src{font-size:.82rem;opacity:.85}footer{text-align:center;font-size:.8rem;opacity:.8;padding:20px}"""
def page(slug, title, desc, h1, body, faq, related, about):
    url = BASE + slug
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article", "headline": h1, "description": desc, "datePublished": TODAY, "dateModified": TODAY, "inLanguage": "en-GB", "mainEntityOfPage": url,
         "author": {"@id": BASE + "#school"}, "publisher": {"@id": BASE + "#school"}, "about": about,
         "citation": SRC_PAGE},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE}, {"@type": "ListItem", "position": 2, "name": "All areas", "item": BASE + "areas.html"}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]}]}
    faqh = "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in related)
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/areas.html">Areas</a><a href="/reviews.html">Reviews</a><a href="/#book-60">Book</a></nav></div></header>
<main class="wrap"><h1>{html.escape(h1)}</h1><div class="meta">Updated {TODAY_H} · Source: DVSA test-centre statistics, April 2025 to March 2026 (published June 2026)</div>
{body}
<h2>Questions people ask</h2>{faqh}
<h2>Learning to drive in Manchester?</h2><p>DriveSQ teaches manual and automatic lessons across Greater Manchester at the same price, £35 an hour. Your instructor will talk through the local test routes with you and can book you a mock test before the real thing.</p>
<a class="cta" href="/#book-60">Book in 60 seconds</a><a class="cta alt" href="https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27d%20like%20to%20book%20driving%20lessons" rel="nofollow noopener">WhatsApp 07352 932003</a>
<h2>More Manchester guides</h2><ul>{rel}</ul>
<p class="src"><strong>Source and method.</strong> All figures are calculated from the DVSA's published tables (DRT122A, DRT122C, DRT122D and DRT122E, "Car driving test data by test centre"), financial year 2025/26 (April 2025 to March 2026), compared with 2024/25. See the <a href="{SRC_PAGE}" rel="noopener">DVSA data sets on GOV.UK</a>. Pass rates cover practical car tests (categories B and B1). The eight Manchester centres are the ones DVSA lists as "(Manchester)": Atherton, Bolton, Bredbury, Bury, Cheetham Hill, Rochdale, Sale and West Didsbury. DVSA advises that small numbers should be treated with caution. We have calculated the Greater Manchester totals, the "manual" figures (all tests minus automatic tests) and the comparisons ourselves, and they are not DVSA headline figures.</p></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/areas.html">Areas</a></footer>
<script src="/dsq-analytics.js" defer></script></body></html>'''
def table(head, rows): return '<div class="tbl"><table><thead><tr>' + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div>"
cls = lambda v: "up" if v > 0 else "dn" if v < 0 else ""
REL = [("/manchester-driving-test-pass-rates-by-test-centre.html", "Manchester driving test pass rates by test centre"), ("/automatic-vs-manual-pass-rates-manchester.html", "Automatic vs manual pass rates in Manchester"),
       ("/young-driver-pass-rates-manchester.html", "Pass rates for 17 to 25 year olds in Manchester"), ("/best-time-of-year-to-take-your-driving-test-manchester.html", "Best time of year to take your driving test in Manchester"), ("/areas.html", "All the areas we cover")]
pages = {}

# ---------------- page 1: pass rates by test centre ----------------
rows = [[f"<b>{short(n)}</b>", n0(C[n]["tests"]), p1(C[n]["rate"]), f'<span class="{cls(C[n]["rate"]-NAT["rate"])}">{sg(C[n]["rate"]-NAT["rate"])}</span>', f'<span class="{cls(C[n]["chg"])}">{sg(C[n]["chg"])}</span>', p1(C[n]["fa_rate"]), p1(C[n]["m_rate"]), p1(C[n]["f_rate"])] for n in by_rate]
rows.append([f"<b>All eight</b>", n0(tot_t), p1(gm_rate), f'<span class="{cls(gm_rate-NAT["rate"])}">{sg(gm_rate-NAT["rate"])}</span>', f'<span class="{cls(gm_rate-gm_rate0)}">{sg(gm_rate-gm_rate0)}</span>', "", "", ""])
rows.append([f"<b>Great Britain</b>", n0(NAT["tests"]), p1(NAT["rate"]), "", f'<span class="{cls(NAT["rate"]-NAT["rate_prev"])}">{sg(NAT["rate"]-NAT["rate_prev"])}</span>', p1(NAT["fa"]), "", ""])
improved = sorted(names, key=lambda n: -C[n]["chg"]); gap = {n: C[n]["m_rate"] - C[n]["f_rate"] for n in names}; widest = max(names, key=lambda n: gap[n]); narrow = min(names, key=lambda n: abs(gap[n]))
busiest = max(names, key=lambda n: C[n]["tests"]); quietest = min(names, key=lambda n: C[n]["tests"])
b1 = f'''<p class="lead">Across the eight Greater Manchester test centres, learners took <strong>{n0(tot_t)} practical car tests</strong> in 2025/26 and <strong>{p1(gm_rate)}</strong> passed. That is {abs(gm_rate-NAT["rate"]):.1f} points {"below" if gm_rate<NAT["rate"] else "above"} the Great Britain figure of {p1(NAT["rate"])}. The best-performing centre was <strong>{short(best)} at {p1(C[best]["rate"])}</strong> and the lowest was <strong>{short(worst)} at {p1(C[worst]["rate"])}</strong>, a gap of {C[best]["rate"]-C[worst]["rate"]:.1f} points.</p>
<h2>Pass rate at every Manchester test centre, 2025/26</h2>{table(["Test centre","Tests","Pass rate","vs GB","Change on 2024/25","First-attempt pass rate","Men","Women"], rows)}
<p class="meta">"vs GB" and "Change" are in percentage points. First-attempt figures count only people taking their first ever practical test.</p>
<h2>What the numbers show</h2><ul>
<li><strong>{len(above)} of the 8 centres were above the national rate:</strong> {", ".join(short(n) for n in by_rate if n in above)}.</li>
<li><strong>Biggest improvement:</strong> {short(improved[0])} rose {C[improved[0]]["chg"]:.1f} points on 2024/25, followed by {short(improved[1])} ({C[improved[1]]["chg"]:+.1f}). <strong>Biggest fall:</strong> {short(improved[-1])}, down {abs(C[improved[-1]]["chg"]):.1f} points.</li>
<li><strong>Busiest centre:</strong> {short(busiest)} ({n0(C[busiest]["tests"])} tests). <strong>Quietest:</strong> {short(quietest)} ({n0(C[quietest]["tests"])}).</li>
<li><strong>Men and women:</strong> women passed less often than men at {sum(1 for n in names if gap[n]>0)} of the 8 centres. The widest gap was at {short(widest)} (men {p1(C[widest]["m_rate"])}, women {p1(C[widest]["f_rate"])}). At {short(narrow)} the two were within {abs(gap[narrow]):.1f} points of each other.</li></ul>
<div class="note"><strong>Read these figures with care.</strong> A centre's pass rate is not a score for how hard its routes are. It reflects who takes tests there, how many are retakes, how many lessons people have had and many other things the figures cannot show. Year-to-year moves at a single centre can be small-number noise.</div>
<h2>Which test centre should I book?</h2><ul>
<li><strong>You can usually choose.</strong> You can book at any DVSA centre, not just the nearest. Check the earliest dates at the centres within reach, because waiting times can differ.</li>
<li><strong>Practise the area you will be tested in.</strong> Ask your instructor to take you on the roads around your chosen centre in the weeks before the test. Familiarity with the local junctions and speed limits matters more than the centre's average.</li>
<li><strong>Book when you are ready, not when you are anxious to book.</strong> A mock test with your instructor shows whether you are consistently at test standard.</li></ul>'''
f1 = [("Which Manchester driving test centre has the highest pass rate?", f"In 2025/26 the highest pass rate among the Manchester centres in the DVSA tables was {short(best)} at {p1(C[best]['rate'])}, against {p1(NAT['rate'])} nationally. The lowest was {short(worst)} at {p1(C[worst]['rate'])}."),
      ("Is it easier to pass at a test centre with a higher pass rate?", "Not necessarily. Pass rates show what happened to the people who took tests there. They don't measure route difficulty, and they are affected by who books there and how prepared they are."),
      ("How many driving test centres are there in Manchester?", "DVSA's 2025/26 tables list eight centres in the Manchester group: Atherton, Bolton, Bredbury, Bury, Cheetham Hill, Rochdale, Sale and West Didsbury."),
      ("How many people pass their driving test first time in Manchester?", f"Across the eight centres, first-attempt pass rates ran from {p1(min(C[n]['fa_rate'] for n in names))} to {p1(max(C[n]['fa_rate'] for n in names))} in 2025/26. The Great Britain first-attempt rate was {p1(NAT['fa'])}.")]
pages["manchester-driving-test-pass-rates-by-test-centre.html"] = page("manchester-driving-test-pass-rates-by-test-centre.html", f"Manchester Driving Test Pass Rates by Test Centre (2025/26) | DriveSQ",
    f"Pass rates at all eight Manchester test centres from official DVSA data: {short(best)} {p1(C[best]['rate'])} to {short(worst)} {p1(C[worst]['rate'])}. Compared with Great Britain at {p1(NAT['rate'])}.",
    "Manchester driving test pass rates by test centre", b1, f1, [r for r in REL if "pass-rates-by" not in r[0]], {"@type": "Thing", "name": "Driving test pass rates in Greater Manchester"})

# ---------------- page 2: automatic vs manual ----------------
byauto = sorted(names, key=lambda n: -C[n]["manual_rate"] + 0)
rows = [[f"<b>{short(n)}</b>", p1(C[n]["auto_share"]), p1(C[n]["auto_rate"]), p1(C[n]["manual_rate"]), f'{C[n]["manual_rate"]-C[n]["auto_rate"]:+.1f}'] for n in sorted(names, key=lambda n: -C[n]["auto_rate"])]
rows.append(["<b>All eight</b>", p1(gm_auto_share), p1(gm_auto), p1(gm_manual), f"{gm_manual-gm_auto:+.1f}"]); rows.append(["<b>Great Britain</b>", p1(NAT["auto_share"]), p1(NAT["auto_rate"]), p1(NAT["manual_rate"]), f'{NAT["manual_rate"]-NAT["auto_rate"]:+.1f}'])
hi_auto = max(names, key=lambda n: C[n]["auto_share"]); lo_auto = min(names, key=lambda n: C[n]["auto_share"]); best_auto = max(names, key=lambda n: C[n]["auto_rate"]); worst_auto = min(names, key=lambda n: C[n]["auto_rate"])
b2 = f'''<p class="lead">Nearly one in three practical tests at Manchester centres is in an automatic car (<strong>{p1(gm_auto_share)}</strong> in 2025/26, against {p1(NAT["auto_share"])} across Great Britain). But the pass rate for automatic tests in Manchester was <strong>{p1(gm_auto)}</strong>, against <strong>{p1(gm_manual)}</strong> for manual. This page shows the gap centre by centre, what it does and does not mean, and how to choose.</p>
<h2>Automatic and manual pass rates at each Manchester centre</h2>{table(["Test centre","Share of tests that are automatic","Automatic pass rate","Manual pass rate","Gap (points)"], rows)}
<p class="meta">Manual figures are calculated as all tests minus automatic tests. DVSA publishes the automatic figures directly.</p>
<h2>What the numbers show</h2><ul>
<li><strong>Automatic pass rates were lower than manual at all 8 centres,</strong> by between {min(C[n]["manual_rate"]-C[n]["auto_rate"] for n in names):.1f} and {max(C[n]["manual_rate"]-C[n]["auto_rate"] for n in names):.1f} points. Nationally the gap was {NAT["manual_rate"]-NAT["auto_rate"]:.1f} points.</li>
<li><strong>The highest automatic pass rate</strong> was at {short(best_auto)} ({p1(C[best_auto]["auto_rate"])}) and the lowest at {short(worst_auto)} ({p1(C[worst_auto]["auto_rate"])}).</li>
<li><strong>{short(hi_auto)} had the highest share of automatic tests:</strong> {p1(C[hi_auto]["auto_share"])}. {short(lo_auto)} had the lowest ({p1(C[lo_auto]["auto_share"])}).</li></ul>
<div class="note"><strong>Does automatic mean harder?</strong> No. The figures can't tell us why the rates differ. Learners who choose automatic may differ from those who choose manual: for example, some move to automatic after finding manual difficult, or have fewer lessons before testing. An automatic car is simpler to drive in one way (no clutch or gears), but the test, the faults and the standard are exactly the same.</div>
<h2>How to choose between manual and automatic</h2><ul>
<li><strong>If you will only ever drive automatics,</strong> an automatic licence is a sensible choice. It lets you drive automatics only.</li>
<li><strong>If you want to drive any car,</strong> a manual licence covers both manual and automatic cars.</li>
<li><strong>If you are very nervous,</strong> removing gears and the clutch can let you concentrate on road awareness. Some learners find that helps.</li>
<li><strong>Whichever you pick, test readiness matters most.</strong> Take enough lessons, practise between lessons if you can, and do a mock test before booking.</li></ul>
<p>At DriveSQ, manual and automatic lessons cost the same, £35 an hour. See our <a href="/automatic-driving-lessons-manchester.html">automatic driving lessons in Manchester</a>.</p>'''
f2 = [("Is the automatic driving test easier than the manual test?", "The test itself is the same and is marked to the same standard. The DVSA figures show lower pass rates for automatic tests than for manual tests in Manchester and nationally, but they can't tell us why, and the learners involved aren't the same groups."),
      ("What percentage of driving tests in Manchester are automatic?", f"In 2025/26, about {p1(gm_auto_share)} of tests at the eight Manchester centres were automatic. The Great Britain figure was {p1(NAT['auto_share'])}."),
      ("What is the automatic driving test pass rate in Manchester?", f"{p1(gm_auto)} across the eight Manchester centres in 2025/26, against {p1(NAT['auto_rate'])} for Great Britain. The manual rate in Manchester, worked out from DVSA's tables, was {p1(gm_manual)}."),
      ("Does an automatic licence limit what I can drive?", "Yes. If you pass your test in an automatic car you can only drive automatic cars. A manual licence lets you drive both.")]
pages["automatic-vs-manual-pass-rates-manchester.html"] = page("automatic-vs-manual-pass-rates-manchester.html", "Automatic vs Manual Driving Test Pass Rates in Manchester (2025/26) | DriveSQ",
    f"Automatic tests pass at {p1(gm_auto)} in Manchester against {p1(gm_manual)} for manual (DVSA 2025/26 data). Centre-by-centre figures and how to choose.", "Automatic vs manual pass rates in Manchester", b2, f2, [r for r in REL if "automatic-vs" not in r[0]], {"@type": "Thing", "name": "Automatic and manual driving test pass rates"})

# ---------------- page 3: young drivers ----------------
rows = [[f"<b>{a}</b>", n0(t), p1(age_rate[a])] for a, (t, p) in ages.items()]
cent17 = sorted(names, key=lambda n: -(C[n]["ages"].get("17", {}).get("r") or 0))
rows17 = [[f"<b>{short(n)}</b>", n0(C[n]["ages"]["17"]["t"]), p1(C[n]["ages"]["17"]["r"]), p1(C[n]["rate"])] for n in cent17]
a17, a25, a24 = age_rate["17"], age_rate["25"], age_rate["24"]; share17 = ages["17"][0] / tot_t * 100; best_age = max(age_rate, key=lambda a: age_rate[a])
b3 = f'''<p class="lead">If you are young and learning to drive in Manchester, the DVSA figures are encouraging. In 2025/26, <strong>17-year-olds passed {p1(a17)} of the time</strong> across the eight Manchester centres: the best pass rate of any age from 17 to 25 and {a17-gm_rate:.1f} points above the all-ages rate of {p1(gm_rate)}. By 24 and 25 it had fallen to about 48 to 49%.</p>
<h2>Pass rate by age, Manchester test centres, 2025/26</h2>{table(["Age","Tests taken","Pass rate"], rows)}
<p class="meta">Combined across the eight Manchester centres. DVSA publishes this breakdown for ages 17 to 25 only.</p>
<h2>How 17-year-olds did at each centre</h2>{table(["Test centre","17-year-olds' tests","17-year-olds' pass rate","All ages' pass rate"], rows17)}
<h2>What the numbers show</h2><ul>
<li><strong>{n0(ages["17"][0])} tests</strong> in the eight centres were taken by 17-year-olds. That's {share17:.1f}% of all tests there.</li>
<li><strong>Every Manchester centre</strong> had a higher pass rate for 17-year-olds than for all ages, ranging from {p1(min(C[n]["ages"]["17"]["r"] for n in names))} to {p1(max(C[n]["ages"]["17"]["r"] for n in names))}.</li>
<li><strong>The pass rate falls as age rises,</strong> from {p1(a17)} at 17 to {p1(a18 := age_rate["18"])} at 18, and about {p1(a24)} by 24.</li></ul>
<div class="note"><strong>Why might 17-year-olds pass more often?</strong> The figures don't say. Possible factors include younger learners booking lessons more regularly and having more time to practise, but treat those as ideas, not findings. Age is not destiny: what matters is how many hours of good-quality practice you have had.</div>
<h2>If you are 17 or about to be</h2><ul>
<li><strong>You can start lessons at 17</strong> (your provisional licence can be applied for from 15 years 9 months, and you can drive a car on the road from your 17th birthday).</li>
<li><strong>Plan your theory test around your practical.</strong> A theory pass lasts two years, so book it when you can take your practical within that time.</li>
<li><strong>Book regular lessons.</strong> Consistent weekly lessons usually beat occasional long gaps.</li>
<li><strong>Ask about a mock test</strong> before your real test.</li></ul>'''
f3 = [("What is the driving test pass rate for 17-year-olds in Manchester?", f"{p1(a17)} across the eight Manchester centres in 2025/26, based on {n0(ages['17'][0])} tests (DVSA data)."),
      ("Do young people pass their driving test more often?", f"In the Manchester data, yes: pass rates were highest at 17 ({p1(a17)}) and lower for learners aged 24 and 25 (about 48 to 49%). The figures don't explain why."),
      ("When can I start learning to drive?", "You can apply for a provisional driving licence from 15 years and 9 months, and drive a car on the road with an instructor from your 17th birthday (or from 16 if you get the enhanced rate of the mobility component of Personal Independence Payment)."),
      ("Which Manchester test centre is best for young drivers?", f"On 2025/26 figures, 17-year-olds passed most often at {short(cent17[0])} ({p1(C[cent17[0]]['ages']['17']['r'])}). That reflects what happened there, not route difficulty.")]
pages["young-driver-pass-rates-manchester.html"] = page("young-driver-pass-rates-manchester.html", "Driving Test Pass Rates for 17 to 25 Year Olds in Manchester (2025/26) | DriveSQ",
    f"17-year-olds pass {p1(a17)} of the time at Manchester test centres, against {p1(gm_rate)} for all ages. Age-by-age DVSA figures for 17 to 25.", "Pass rates for 17 to 25 year olds in Manchester", b3, f3, [r for r in REL if "young-driver" not in r[0]], {"@type": "Thing", "name": "Driving test pass rates by age"})

# ---------------- page 4: best time of year ----------------
rows = [[f"<b>{m}</b>", n0(mon[m][0]), p1(mon_rate[m])] for m in mon]
bm, wm = max(mon_rate, key=lambda m: mon_rate[m]), min(mon_rate, key=lambda m: mon_rate[m]); bz, wz = max(mon, key=lambda m: mon[m][0]), min(mon, key=lambda m: mon[m][0])
b4 = f'''<p class="lead">Does it matter when you take your driving test? In Manchester, barely. Across the eight test centres in 2025/26, the monthly pass rate stayed between <strong>{p1(mon_rate[wm])}</strong> ({wm.split()[0]}) and <strong>{p1(mon_rate[bm])}</strong> ({bm.split()[0]}). That's a spread of just {mon_rate[bm]-mon_rate[wm]:.1f} percentage points, so booking the earliest date you are ready is better than waiting for a "lucky" month.</p>
<h2>Pass rate by month, Manchester test centres, April 2025 to March 2026</h2>{table(["Month","Tests","Pass rate"], rows)}
<h2>What the numbers show</h2><ul>
<li><strong>Highest pass rate:</strong> {bm} ({p1(mon_rate[bm])}). <strong>Lowest:</strong> {wm} ({p1(mon_rate[wm])}).</li>
<li><strong>Busiest month:</strong> {bz} ({n0(mon[bz][0])} tests). <strong>Quietest:</strong> {wz} ({n0(mon[wz][0])}).</li>
<li><strong>The gap between best and worst month is small,</strong> so don't wait months for a better slot.</li></ul>
<div class="note"><strong>What these figures can't tell you.</strong> They don't show waiting times, weather on the day, or how busy particular routes are. In winter you may face darkness, rain or low sun, so practise in those conditions before testing. A difference of a couple of points is small.</div>
<h2>How to pick your test date</h2><ul>
<li><strong>Book when your instructor says you are consistently at test standard,</strong> usually after one or two mock tests.</li>
<li><strong>Look for cancellations.</strong> Check the DVSA booking service regularly for earlier dates, and at more than one centre.</li>
<li><strong>Allow for the weather.</strong> If you test in winter, practise in the dark and in wet weather beforehand.</li>
<li><strong>Don't book just because a date is available.</strong> Retakes cost time and money, so be ready first.</li></ul>'''
f4 = [("What is the best month to take a driving test in Manchester?", f"On 2025/26 figures, {bm.split()[0]} had the highest pass rate ({p1(mon_rate[bm])}) and {wm.split()[0]} the lowest ({p1(mon_rate[wm])}), but the gap was only {mon_rate[bm]-mon_rate[wm]:.1f} points, so don't hold back a test you are ready for."),
      ("Is it harder to pass a driving test in winter?", f"Manchester pass rates in the winter months (December to February) were between {p1(min(mon_rate[m] for m in mon if m.split()[0] in ('December','January','February')))} and {p1(max(mon_rate[m] for m in mon if m.split()[0] in ('December','January','February')))}, close to summer. Practise in the dark, rain and low sun so you are prepared."),
      ("How many driving tests are taken in Manchester each month?", f"Between {n0(min(t for t,_ in mon.values()))} and {n0(max(t for t,_ in mon.values()))} tests a month at the eight centres in 2025/26.")]
pages["best-time-of-year-to-take-your-driving-test-manchester.html"] = page("best-time-of-year-to-take-your-driving-test-manchester.html", "Best Time of Year to Take Your Driving Test in Manchester (2025/26 data) | DriveSQ",
    f"Manchester driving test pass rates by month: {p1(mon_rate[wm])} to {p1(mon_rate[bm])} across 2025/26. Does the month matter? Official DVSA figures.", "Best time of year to take your driving test in Manchester", b4, f4, [r for r in REL if "best-time" not in r[0]], {"@type": "Thing", "name": "Driving test pass rates by month"})

for slug, h in pages.items(): open(os.path.join(ROOT, slug), "w", encoding="utf-8").write(h)
# sitemap
smp = os.path.join(ROOT, "sitemap-1.xml"); sm = open(smp, encoding="utf-8").read()
for slug in pages:
    if slug not in sm: sm = sm.replace("</urlset>", f"  <url><loc>{BASE}{slug}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
open(smp, "w", encoding="utf-8").write(sm)
print("pages:", list(pages), "| GM", n0(tot_t), p1(gm_rate), "| best", short(best), p1(C[best]["rate"]), "| worst", short(worst), p1(C[worst]["rate"]))
