#!/usr/bin/env python3
"""Builds the female driving instructor area pages (one per area in tools/female_areas_data.py) and their hub page.
   Local facts: tools/female_areas_data.py. DVSA figures (including women's and men's pass rates) are read from
   data/dvsa_manchester_2025_26.json. The booking form is dsq-female-book.js (sends through booking-capture.js).
   Run: python3 tools/seo_female_pages.py"""
import json, os, re, html, datetime, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from female_areas_data import AREAS, PLAN
BASE = "https://www.drivesq.co.uk/"
TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
DV = json.load(open(os.path.join(ROOT, "data/dvsa_manchester_2025_26.json")))["R"]["2025-26"]
CSS = open(os.path.join(ROOT, "tools/_page.css"), encoding="utf-8").read() + """
.hero{background:linear-gradient(135deg,#1b0c0e,#0b0204);color:#fff;border-radius:16px;padding:18px 18px 16px;margin:6px 0 14px;border:1px solid rgba(255,255,255,.1)}.hero p{margin:6px 0 0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.facts div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-align:center}.facts b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:1.35rem}.facts small{opacity:.75}
.tag{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:99px;padding:4px 11px;margin:3px 5px 3px 0;font-size:.84rem}.dis{font-size:.78rem;opacity:.8}.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:12px 0}.grid2 a{display:block;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-decoration:none}.grid2 b{display:block}.grid2 small{opacity:.75}
.roadlist{list-style:none;padding:0}.roadlist li{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--red);border-radius:10px;padding:10px 14px;margin:8px 0}
"""
sh = lambda n: n.replace(" (Manchester)", "")
p1 = lambda v: f"{v:.1f}%"; n0 = lambda v: f"{v:,.0f}"
GOV = {"lic": "https://www.gov.uk/apply-first-provisional-driving-licence", "learn": "https://www.gov.uk/driving-lessons-learning-to-drive", "find": "https://www.gov.uk/find-driving-schools-and-lessons",
       "theory": "https://www.gov.uk/book-theory-test", "test": "https://www.gov.uk/book-driving-test"}
by_slug = {a["slug"]: a for a in AREAS}
def fname(a): return f"female-driving-instructors-{a['slug']}-{a['pcs'][0].lower()}.html"
def pcs_txt(a): return " and ".join(a["pcs"]) if len(a["pcs"]) < 3 else ", ".join(a["pcs"][:-1]) + " and " + a["pcs"][-1]
def k_of(a): return [x["slug"] for x in AREAS].index(a["slug"]) % 4

WHY = [
 "Many women simply feel more at ease learning with another woman, especially in the first few lessons when everything is new. It is a personal preference and there is no need to explain it. Some learners are returning to driving after a long break or after a knock to their confidence, some prefer it for cultural or religious reasons, and some just find it easier to ask questions and say when they are unsure.",
 "There are lots of reasons to ask for a female instructor: feeling more relaxed, being more comfortable having a one-to-one lesson in a small car, cultural or family preferences, or simply wanting to learn in a calm environment. You do not need to justify it. When you book we note your preference and aim to match you with a female instructor near your pick-up postcode.",
 "Choosing a female instructor is a personal decision. Some learners feel less nervous, some are following family or cultural preferences, and others want to be sure they can ask anything without feeling judged. Whatever your reason, tell us on the booking form and we will do our best to match you.",
 "Plenty of learners ask for a female instructor, and the reasons vary: confidence, comfort, religious or cultural preference, or just wanting a particular teaching style. It is a normal request and we treat it as one. Say so on the form and we will look for a match near you."]
LESSONS = [
 "The DVSA says the average learner needs around 45 hours of lessons with an instructor, plus about 22 hours of practice with family or friends, before they pass. Everyone is different, so some pass with fewer and some need more. At £35 an hour, 45 hours is £1,575, and you pay as you go rather than all at once.",
 "DVSA guidance puts the average at about 45 hours of professional lessons and 22 hours of private practice. That is an average, so your own number could be lower or higher. At our £35 hourly rate, 45 hours would be £1,575, and you can pay lesson by lesson.",
 "On average, DVSA figures suggest learners need about 45 hours with an instructor and 22 hours of private practice. Your own journey depends on how often you drive and how quickly you pick things up. With lessons at £35 an hour, 45 hours comes to £1,575, paid as you go.",
 "According to DVSA, a typical learner takes roughly 45 hours of lessons plus 22 hours of extra practice. You may need fewer or more, and we assess honestly as you go. At £35 an hour, 45 hours would cost £1,575, and you pay for lessons as you take them."]

HERO = [
 "Lessons from £35 an hour, manual or automatic at the same price. New learners get their first 10 hours for £330, paid in advance. We have 180+ five-star Google reviews. Book below and we match you with a female instructor near your pick-up postcode, subject to availability.",
 "Book below and we match you with a female instructor close to your pick-up postcode, subject to availability. You pay £35 an hour whether you learn in a manual or an automatic, and new learners can start with 10 hours for £330 paid up front. Our 180+ Google reviews are all five-star.",
 "You pay £35 an hour for manual or automatic lessons, and new learners can take their first 10 hours for £330 in advance. With 180+ five-star Google reviews behind us, we aim to match you with a female instructor near your pick-up postcode. Availability varies, and we always tell you first.",
 "Our lessons start at £35 an hour, with manual and automatic at the same price, and the first 10 hours for new learners are £330 paid in advance. Rated five stars across 180+ Google reviews, we match you, where we can, with a female instructor close to where you want to be picked up."]
BOOKNOTE = [
 "On the booking form you can choose <b>female instructor</b> or <b>female preferred</b>. We always try for a female instructor first. If none is free close to your postcode, we tell you before anything is booked.",
 "Choose <b>female instructor</b> or <b>female preferred</b> when you book. We start by looking for a woman near your postcode, and if we cannot find one, we say so up front rather than booking someone you did not ask for.",
 "Pick <b>female instructor</b> if it matters to you, or <b>female preferred</b> if you are flexible. Either way we look for a female instructor near you first, and you hear from us before anything is confirmed.",
 "The form has two choices: <b>female instructor</b> or <b>female preferred</b>. We search for a female instructor near your pick-up postcode first, and if there is no one free, we tell you before we book anything."]
WHAT = [
 "What we can do is the part within our control: a calm, patient lesson style, honest feedback, and plenty of practice on the road types you will meet on test day.",
 "The part we can influence is how you are taught: unhurried lessons, clear feedback, and lots of practice on the kinds of roads a test uses.",
 "We cannot change a centre's statistics, but we can control how you learn: a relaxed pace, straightforward feedback and regular practice on typical test-day roads.",
 "Within our control is the teaching itself: patient, calm lessons with honest feedback, built around the road types that tests tend to include."]
PLANNOTE = [
 "Your own plan follows your progress, so you may move faster or slower. For costs, how many lessons learners typically need, the steps to a test and how to check any instructor, read our <a href=\"/female-driving-lessons-guide-manchester.html\">guide to learning to drive with a female instructor</a>.",
 "These stages are a guide, not a timetable. Our <a href=\"/female-driving-lessons-guide-manchester.html\">complete guide for women learners</a> covers typical lesson numbers, costs, the route from licence to test, and how to check an instructor.",
 "Everyone moves at their own speed, so treat the list above as a starting point. Costs, typical lesson numbers and test steps are in our <a href=\"/female-driving-lessons-guide-manchester.html\">guide for women learning to drive</a>.",
 "You set the pace and your instructor adapts. If you want the bigger picture (costs, number of lessons, theory and practical test steps, checking an instructor), see our <a href=\"/female-driving-lessons-guide-manchester.html\">women's learner guide</a>."]
PRICE = [
 "Lessons are £35 an hour for manual or automatic. New learners can start with 10 hours for £330, paid in advance. Every learner also gets the free Student Portal.",
 "You pay £35 an hour, manual or automatic, with the first 10 hours for new learners at £330 up front. The free Student Portal comes with every booking.",
 "An hour costs £35 whichever gearbox you choose, and new learners can take 10 hours for £330 paid in advance. The Student Portal is free for every learner.",
 "Our hourly rate is £35 for manual and automatic alike, and new learners can book their first 10 hours for £330 in advance. Every learner gets free access to the Student Portal."]
FIRST = [
 "A valid provisional driving licence, and glasses or contact lenses if you need them to drive. Your instructor will check your licence and eyesight at the start.",
 "Bring your provisional licence, plus glasses or contacts if you wear them to drive. Your instructor checks both at the start of the first lesson.",
 "Your provisional driving licence and, if you need them, your glasses or contact lenses. At the first lesson your instructor checks your licence and your eyesight.",
 "Just your provisional licence and any glasses or contact lenses you need for driving. Your instructor will look at both before you set off."]
PRICEQ = [
 ("How much do lessons cost, and is a female instructor extra?", "Lessons are £35 an hour for manual or automatic, and new learners can start with 10 hours for £330, paid in advance. There is no extra charge for a female instructor."),
 ("What do lessons cost, and does a female instructor cost more?", "Manual or automatic, it is £35 an hour, and new learners can start with 10 hours for £330 paid up front. A female instructor costs the same."),
 ("What is the price, and is there a surcharge for a female instructor?", "You pay £35 an hour for manual or automatic. New learners can book 10 hours for £330 in advance. There is no surcharge for a female instructor."),
 ("Is a female instructor more expensive?", "No. Lessons are £35 an hour for manual or automatic, and new learners can start with 10 hours for £330 paid in advance, with any instructor.")]

def page_shell(slug, title, desc, h1, body, faq, about, related, crumb):
    url = BASE + slug
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": h1, "description": desc, "dateModified": TODAY, "inLanguage": "en-GB", "isPartOf": {"@id": BASE + "#website"}, "about": about, "publisher": {"@id": BASE + "#school"}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate([("Home", BASE)] + crumb + [(h1, url)])]}]}
    faqh = "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in related)
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="website"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/female-driving-instructors-manchester-areas.html">Female instructors</a><a href="/areas.html">Areas</a><a href="/reviews.html">Reviews</a><a href="/#book-60">Book</a></nav></div></header>
<main class="wrap">{body}
<h2>Frequently asked questions</h2>{faqh}
<h2>More from DriveSQ</h2><ul>{rel}</ul></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/privacy.html">Privacy</a></footer>
<script src="/dsq-analytics.js" defer></script><script src="/booking-capture.js?v=20261118" defer></script><script src="/dsq-female-book.js?v=1" defer></script></body></html>'''

def form(a):
    return f'<div id="dsqFemBook" data-area="{html.escape(a["name"])}" data-postcodes="{html.escape("|".join(a["pcs"]))}"></div>'

def women_table(a):
    rows = ""
    best = None
    for c in a["centres"]:
        r = DV[c]; rows += f'<tr><td><b>{sh(c)}</b></td><td>{n0(r["f_tests"])}</td><td>{p1(r["f_rate"])}</td><td>{n0(r["m_tests"])}</td><td>{p1(r["m_rate"])}</td></tr>'
    c0 = DV[a["centres"][0]]; gap = c0["m_rate"] - c0["f_rate"]
    lead = (f"At {sh(a['centres'][0])}, the DVSA recorded {n0(c0['f_tests'])} tests by women, with a pass rate of {p1(c0['f_rate'])}, and {n0(c0['m_tests'])} tests by men, with a pass rate of {p1(c0['m_rate'])}. "
            + ("That is a gap of " + f"{abs(gap):.1f}" + " percentage points in men's favour." if gap > 0.3 else "The two rates are very close." if gap > -0.3 else "Women's rate was higher."))
    tbl = '<div class="tbl"><table><thead><tr><th>Test centre</th><th>Women’s tests</th><th>Women’s pass rate</th><th>Men’s tests</th><th>Men’s pass rate</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    return lead, tbl

def area_page(a):
    k = k_of(a); n = a["name"]; pc = pcs_txt(a); first = a["pcs"][0]
    near = [by_slug[s] for s in a["near"]]
    places = "".join(f'<span class="tag">{html.escape(x)}</span>' for x in a["places"])
    roads = "".join(f"<li><b>{html.escape(r)}</b><br>{html.escape(t)}</li>" for r, t in a["roads"])
    lead, tbl = women_table(a)
    cs = ", ".join(sh(c) for c in a["centres"])
    nearl = "".join(f'<a href="/{fname(o)}"><b>{html.escape(o["name"])}</b><small>{pcs_txt(o)} · female instructors</small></a>' for o in near)
    h1 = f"Female Driving Instructors in {n} ({'/'.join(a['pcs'])})"
    body = f'''<h1>{html.escape(h1)}</h1><div class="meta">Local guide updated {TODAY_H} · Lessons across {html.escape(pc)}</div>
<div class="hero"><strong>Learn to drive with a female instructor in {html.escape(n)}.</strong><p>{HERO[k]}</p></div>
{form(a)}
<div class="facts"><div><b>{html.escape("/".join(a["pcs"]))}</b><small>postcodes covered</small></div><div><b>£35/hr</b><small>manual or automatic</small></div><div><b>£330</b><small>first 10 hours, new learners</small></div><div><b>Free</b><small>Student Portal included</small></div></div>
<h2>Why learners in {html.escape(n)} choose a female instructor</h2><p>{WHY[k]}</p>
<p>{BOOKNOTE[(k + 1) % 4]}</p>
<h2>Learning to drive in {html.escape(n)}</h2><p>{html.escape(a["intro"])}</p>
<p><b>Places you may know:</b></p><p>{places}</p>
<h3>Roads and junctions your lessons use</h3><ul class="roadlist">{roads}</ul>
<p>{html.escape(a["teach"])}</p>
<p><b>Getting around:</b> {html.escape(a["transport"])}</p>
<h2>Where we pick you up in {html.escape(n)}</h2>
<p>We pick you up from home, work, college or university anywhere in {html.escape(pc)}, and from nearby postcodes. Give us your full pick-up postcode on the form and we match you with an instructor close to it, so you spend your paid time driving and not travelling.</p>
<h2>{["Women and the driving test in ", "Test pass rates for women near ", "What the DVSA figures show for women in ", "Female learners and the driving test around "][k]}{html.escape(n)}</h2>
<p>The DVSA publishes pass rates by test centre and by gender. {html.escape(n)} learners commonly take their test at one of these Manchester-group centres: {html.escape(cs)}. Figures are for April 2025 to March 2026.</p>
<p>{lead}</p>{tbl}
<p class="dis">Source: DVSA driving test statistics, April 2025 to March 2026. A test centre's pass rate is not a measure of how hard its routes are, and these figures cannot tell us why rates differ. You can book your test at any centre; your instructor will advise on the best one for your pick-up area and test date.</p>
<p>{WHAT[(k + 2) % 4]}</p>
<h2>A typical first ten lessons in {html.escape(n)}</h2><ol>{"".join(f"<li>{html.escape(x)}</li>" for x in PLAN[a["slug"]])}</ol>
<p>{PLANNOTE[(k + 3) % 4]}</p>
<h2>Prices and what is included</h2>
<p>{PRICE[(k + 1) % 4]} <a href="/drivesq-student-portal.html">See what is inside the portal</a>.</p>
<h2>Nearby areas</h2><div class="grid2">{nearl}</div>
<p>See <a href="/female-driving-instructors-manchester-areas.html">all areas with female driving instructors</a>.</p>'''
    faq = [
        (f"Can I have a female driving instructor in {n}?", f"Yes, you can request one when you book. We match you with a female instructor near your {pc} pick-up postcode, subject to availability. If none is free nearby, we tell you before anything is booked."),
        PRICEQ[(k + 2) % 4],
        ("What do I need for my first lesson?", FIRST[(k + 1) % 4]),
        a["faq"][0],
        (f"Can you pick me up near {a['places'][0]}?", f"Yes. Give us your full postcode and we pick you up from home, work or study, including around {a['places'][0]} and {a['places'][1]}, as long as it is in or near {pc}."),
        (f"Will I drive on {a['roads'][0][0]}?", f"Once you are ready, yes. {a['roads'][0][1]} Your instructor builds up to it so it never comes as a surprise."),
        (f"Which test centres do {n} learners use?", f"Learners from {n} commonly use {cs}, and you can book any DVSA test centre. Your instructor will advise on the best choice."),
    ]
    rel = [("/female-driving-instructors-manchester-areas.html", "Female driving instructors across Manchester"), ("/manchester-driving-test-pass-rates-by-test-centre.html", "Manchester driving test pass rates by test centre"),
           ("/drivesq-student-portal.html", "The free DriveSQ Student Portal"), ("/areas.html", "All the areas we cover"), ("/reviews.html", "Read our Google reviews")]
    title = f"Female Driving Instructors in {n} {first} | Lessons from £35/hr | DriveSQ"
    desc = f"Female driving instructors in {n} ({'/'.join(a['pcs'])}): lessons from £35/hr, manual or automatic, first 10 hours £330. Local guide, DVSA pass rates for women and an advanced booking form."
    return page_shell(fname(a), title, desc, h1, body, faq, {"@type": "Place", "name": n, "address": {"@type": "PostalAddress", "addressLocality": n, "postalCode": a["pcs"][0], "addressCountry": "GB"}}, rel,
                      [("Female driving instructors in Manchester", BASE + "female-driving-instructors-manchester-areas.html")])

def hub():
    cards = "".join(f'<a href="/{fname(a)}"><b>{html.escape(a["name"])}</b><small>{html.escape(pcs_txt(a))}</small></a>' for a in AREAS)
    body = f'''<h1>Female driving instructors in Manchester</h1><div class="meta">Areas covered · updated {TODAY_H}</div>
<div class="hero"><strong>Learn to drive with a female instructor, close to home.</strong><p>DriveSQ matches learners with female driving instructors across Manchester, Trafford, Stockport and Wythenshawe. Lessons from £35 an hour, manual or automatic at the same price. New learners get their first 10 hours for £330. We have 180+ five-star Google reviews.</p></div>
<h2>Choose your area</h2><div class="grid2">{cards}</div>
<p>Not on the list? We cover many more postcodes. Use the form below, and we will tell you straight away whether we have a female instructor near you.</p>
<h2>Book a female instructor</h2><div id="dsqFemBook" data-area="Manchester" data-postcodes="M1|M13|M14|M16|M20|M21|M22|M32|M33|SK8|WA14"></div>
<h2>How it works</h2><ol><li>Choose <b>female instructor</b> on the form and give us your pick-up postcode.</li><li>We match you with a female instructor near you and call or text you to confirm.</li><li>You get your instructor's name and details before your first lesson, and free access to the Student Portal.</li></ol>
<p class="dis">We always try for a female instructor first. If none is available near you, we tell you before anything is booked.</p>
<p>New to all this? Read our <a href="/female-driving-lessons-guide-manchester.html">complete guide to learning to drive with a female instructor</a>: costs, how many lessons, test steps and how to check any instructor.</p>'''
    faq = [("Can I choose a female driving instructor?", "Yes. You can request a female instructor on the booking form, and we match you near your pick-up postcode, subject to availability."),
           ("How much are lessons?", "Lessons are £35 an hour for manual or automatic. New learners can start with 10 hours for £330, paid in advance."),
           ("Which areas do you cover?", "We cover Manchester, Trafford, Stockport and Wythenshawe, including every area listed on this page, and many nearby postcodes.")]
    rel = [("/areas.html", "All the areas we cover"), ("/drivesq-student-portal.html", "The free Student Portal"), ("/reviews.html", "Our Google reviews")]
    return page_shell("female-driving-instructors-manchester-areas.html", "Female Driving Instructors in Manchester | All Areas | DriveSQ",
        "Female driving instructors across Manchester, Trafford, Stockport and Wythenshawe. Lessons from £35/hr, first 10 hours £330, free Student Portal. Pick your area and book.",
        "Female driving instructors in Manchester", body, faq, {"@type": "ItemList", "name": "Areas with female driving instructors"}, rel, [])

def guide():
    k = 0
    body = f'''<h1>Learning to drive with a female instructor in Manchester: the complete guide</h1><div class="meta">Updated {TODAY_H}</div>
<div class="hero"><strong>Everything in one place.</strong><p>From your provisional licence to your practical test: costs, how many lessons learners typically need, how to check any driving instructor, and what the DVSA figures show for women.</p></div>
<h2>Why many women ask for a female instructor</h2><p>{WHY[0]}</p><p>{WHY[1]}</p>
<h2>How many lessons will you need?</h2><p>{LESSONS[0]}</p><p>See the DVSA's own guidance on <a href="{GOV['learn']}" rel="noopener">learning to drive on GOV.UK</a>.</p>
<h2>From provisional licence to test: the steps</h2>
<ol><li><b>Get your provisional licence.</b> You need it before your first lesson. <a href="{GOV['lic']}" rel="noopener">Apply on GOV.UK</a>. It must be valid, and you must meet the eyesight standard (able to read a number plate from 20 metres).</li>
<li><b>Start lessons.</b> We match you with an instructor and agree a plan for your first lessons.</li>
<li><b>Pass your theory test.</b> You need to pass it before you can book a practical test. It costs £23 (check GOV.UK for the current fee). <a href="{GOV['theory']}" rel="noopener">Book your theory test</a>. Our free Student Portal has 700+ practice questions and 14 mock tests.</li>
<li><b>Book your practical test.</b> It costs £62 on weekdays and £75 on evenings, weekends and bank holidays (check GOV.UK for current fees). <a href="{GOV['test']}" rel="noopener">Book your driving test</a>.</li>
<li><b>Pass, and go on.</b> Many new drivers add Pass Plus or motorway lessons for extra confidence.</li></ol>
<h2>Choosing and checking your instructor safely</h2>
<p>Whoever you learn with, check them. A qualified approved driving instructor (ADI) must display a green badge on the windscreen while teaching. A trainee instructor displays a pink badge. You can read the DVSA's advice on <a href="{GOV['find']}" rel="noopener">finding a driving instructor on GOV.UK</a>. At DriveSQ you will know your instructor's name, phone number and car before the first lesson. You can ask to be picked up from a public place, and you are welcome to tell a friend or family member the time and place of your lesson.</p>
<h2>What the DVSA figures show for women</h2>
<p>The DVSA publishes test pass rates by gender for each Manchester-group test centre. Figures for April 2025 to March 2026:</p>
<div class="tbl"><table><thead><tr><th>Test centre</th><th>Women’s tests</th><th>Women’s pass rate</th><th>Men’s tests</th><th>Men’s pass rate</th></tr></thead><tbody>{"".join(f'<tr><td><b>{sh(c)}</b></td><td>{n0(r["f_tests"])}</td><td>{p1(r["f_rate"])}</td><td>{n0(r["m_tests"])}</td><td>{p1(r["m_rate"])}</td></tr>' for c, r in sorted(DV.items()))}</tbody></table></div>
<p class="dis">Source: DVSA driving test statistics, April 2025 to March 2026. A test centre's pass rate is not a measure of how hard its routes are, and these figures cannot tell us why rates differ. See <a href="/manchester-driving-test-pass-rates-by-test-centre.html">pass rates at every Manchester centre</a>.</p>
<h2>Prices and what is included</h2>
<p>Lessons are £35 an hour for manual or automatic. New learners can start with 10 hours for £330, paid in advance. Every learner gets the free Student Portal, with 700+ theory questions, 14 mock tests and hazard perception practice. <a href="/drivesq-student-portal.html">See what is inside the portal</a>.</p>
<h2>Choose your area</h2><div class="grid2">{"".join(f'<a href="/{fname(x)}"><b>{html.escape(x["name"])}</b><small>{html.escape(pcs_txt(x))}</small></a>' for x in AREAS)}</div>'''
    faq = [("Can I choose a female driving instructor?", "Yes. You can request one on the booking form, and we match you near your pick-up postcode, subject to availability."),
           ("How do I know an instructor is qualified?", "A fully qualified instructor displays a green ADI badge, and a trainee displays a pink one. You can read the DVSA's advice on GOV.UK."),
           ("How much does it cost to learn to drive?", "It depends on how many lessons you need. The DVSA average is about 45 hours of lessons plus 22 hours of practice. At £35 an hour, 45 hours is £1,575, plus test fees.")]
    rel = [("/female-driving-instructors-manchester-areas.html", "Female driving instructors across Manchester"), ("/drivesq-student-portal.html", "The free Student Portal"), ("/reviews.html", "Our Google reviews")]
    return page_shell("female-driving-lessons-guide-manchester.html", "Learning to Drive with a Female Instructor in Manchester: Complete Guide | DriveSQ",
        "Complete guide to learning to drive with a female instructor in Manchester: costs, how many lessons, test steps, how to check an instructor, and DVSA pass rates for women.",
        "Learning to drive with a female instructor in Manchester: the complete guide", body, faq, {"@type": "Thing", "name": "Learning to drive in Manchester"}, rel, [("Female driving instructors in Manchester", BASE + "female-driving-instructors-manchester-areas.html")])

def update_sitemap(slugs):
    p = os.path.join(ROOT, "sitemap-1.xml"); s = open(p, encoding="utf-8").read(); add = ""
    for sl in slugs:
        if BASE + sl not in s: add += f"  <url><loc>{BASE}{sl}</loc><lastmod>{TODAY}</lastmod></url>\n"
    if add: s = s.replace("</urlset>", add + "</urlset>"); open(p, "w", encoding="utf-8").write(s)
    return add.count("<url>")

if __name__ == "__main__":
    built = []
    for a in AREAS:
        open(os.path.join(ROOT, fname(a)), "w", encoding="utf-8").write(area_page(a)); built.append(fname(a))
    open(os.path.join(ROOT, "female-driving-instructors-manchester-areas.html"), "w", encoding="utf-8").write(hub()); built.append("female-driving-instructors-manchester-areas.html")
    open(os.path.join(ROOT, "female-driving-lessons-guide-manchester.html"), "w", encoding="utf-8").write(guide()); built.append("female-driving-lessons-guide-manchester.html")
    print("built", len(built), "pages; sitemap added", update_sitemap(built))
