#!/usr/bin/env python3
"""Builds the Manchester university & college student pages and their hub.
   Facts come from data/institutions.json (each fact was read from the institution's own website; sources are listed on each page).
   DVSA figures come from data/dvsa_manchester_2025_26.json. The booking form is dsq-uni-book.js (sends through booking-capture.js).
   Run: python3 tools/seo_uni_pages.py"""
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.drivesq.co.uk/"
TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
INS = json.load(open(os.path.join(ROOT, "data/institutions.json"), encoding="utf-8"))
DV = json.load(open(os.path.join(ROOT, "data/dvsa_manchester_2025_26.json")))["R"]["2025-26"]
CSS = open(os.path.join(ROOT, "tools/_page.css"), encoding="utf-8").read() + """
.hero{background:linear-gradient(135deg,#1b0c0e,#0b0204);color:#fff;border-radius:16px;padding:18px 18px 16px;margin:6px 0 14px;border:1px solid rgba(255,255,255,.1)}.hero p{margin:6px 0 0}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.facts div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-align:center}.facts b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;color:var(--red)}.facts span{font-size:.78rem;opacity:.85}
.tag{display:inline-block;background:var(--card);border:1px solid var(--line);border-radius:99px;padding:4px 11px;margin:3px 5px 3px 0;font-size:.84rem}.dis{font-size:.78rem;opacity:.8}.grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}.grid2 a{display:block;text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.grid2 a b{display:block}.grid2 a small{opacity:.75}
"""
sh = lambda n: n.replace(" (Manchester)", "")
p1 = lambda v: f"{v:.1f}%"; n0 = lambda v: f"{v:,.0f}"
GOV_LIC = "https://www.gov.uk/apply-first-provisional-driving-licence"
PORTAL = "/drivesq-student-portal.html"

def page_shell(slug, title, desc, h1, body, faq, about, related):
    url = BASE + slug
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": h1, "description": desc, "dateModified": TODAY, "inLanguage": "en-GB", "isPartOf": {"@id": BASE + "#website"}, "about": about, "publisher": {"@id": BASE + "#school"}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE}, {"@type": "ListItem", "position": 2, "name": "Student driving lessons in Manchester", "item": BASE + "student-driving-lessons-manchester-universities.html"}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]}]}
    faqh = "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in related)
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="website"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/student-driving-lessons-manchester-universities.html">Students</a><a href="/areas.html">Areas</a><a href="/reviews.html">Reviews</a><a href="/#book-60">Book</a></nav></div></header>
<main class="wrap">{body}
<h2>Questions students ask</h2>{faqh}
<h2>More for Manchester students</h2><ul>{rel}</ul></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/privacy.html">Privacy</a></footer>
<script src="/dsq-analytics.js" defer></script><script src="/booking-capture.js?v=20261116" defer></script><script src="/dsq-uni-book.js?v=2" defer></script></body></html>'''

def form(inst, level, campuses):
    return f'<div id="dsqUniBook" data-institution="{html.escape(inst)}" data-level="{level}" data-campuses="{html.escape("|".join(campuses))}"></div>'

def dvsa_block(centres):
    if not centres:
        return ('<p>The DVSA publishes pass rates for eight test centres in its Manchester group. None is named after this part of Greater Manchester, so your instructor will advise which centre suits your pick-up area and test routes. '
                'See <a href="/manchester-driving-test-pass-rates-by-test-centre.html">pass rates at every Manchester test centre</a>.</p>')
    rows = "".join(f'<tr><td><b>{sh(c)}</b></td><td>{n0(DV[c]["tests"])}</td><td>{p1(DV[c]["rate"])}</td><td>{p1(DV[c]["fa_rate"])}</td><td>{p1(DV[c]["auto_rate"])}</td></tr>' for c in centres)
    return ('<div class="tbl"><table><thead><tr><th>Test centre</th><th>Tests</th><th>Pass rate</th><th>First-attempt</th><th>Automatic</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
            '<p class="dis">DVSA figures for April 2025 to March 2026. Great Britain overall: 50.0% pass rate. A centre\'s pass rate is not a measure of how hard its routes are. '
            'See <a href="/manchester-driving-test-pass-rates-by-test-centre.html">all eight Manchester centres</a>.</p>')

OFFER_V = [
 "Lessons are from £35 an hour, manual or automatic, and students get 10 hours for £320, paid in advance.",
 "You pay from £35 an hour whichever gearbox you choose, and our student offer is 10 hours for £320 when paid in advance.",
 "Manual and automatic both start at £35 an hour. As a student, you can book a 10-hour block for £320, paid up front.",
 "Our price is £35 an hour for manual or automatic, and students can start with 10 hours for £320, paid in advance."]
PORTAL_V = [
 "Every learner gets the free Student Portal: 700+ theory questions, 14 mock tests, hazard perception practice and a progress tracker.",
 "The free DriveSQ Student Portal comes with your booking, with 700+ theory questions, 14 mock tests, hazard perception training and progress tracking.",
 "Your booking includes free access to the Student Portal, where you can work through 700+ theory questions, 14 mock tests and hazard perception clips.",
 "You also get the Student Portal at no cost: practise 700+ theory questions and 14 mock tests, and see your progress as you go."]
LIC_V = [
 'You need a provisional licence before your first lesson. <a href="{g}" rel="noopener">Apply on GOV.UK</a> if you have not already.',
 'Have your provisional driving licence ready for lesson one. If you do not have one yet, you can <a href="{g}" rel="noopener">apply on GOV.UK</a>.',
 'A valid provisional licence is required before you drive with us. You can <a href="{g}" rel="noopener">apply for one on GOV.UK</a>.',
 'Check you hold a provisional licence before booking your first lesson, and <a href="{g}" rel="noopener">apply on GOV.UK</a> if you need to.']

def centre_insight(centres):
    out = []
    for c in centres:
        r = DV[c]; out.append(c)
    return out

def inst_page(i, others):
    name, short = i["name"], i["short"]
    k = sum(ord(ch) for ch in i["slug"]) % 4
    h1 = f"Driving lessons for {name} students" if i["level"] == "university" else f"Driving lessons for {name} learners aged 18+"
    cps = "".join(f'<span class="tag">{html.escape(c)}</span>' for c in i["campuses"])
    areas = ", ".join(f'<a href="{u}">{html.escape(t)}</a>' for t, u in i["areas"])
    facts = "".join(f"<li>{html.escape(f)}</li>" for f in i["facts"])
    halls = ""
    if i["halls"]:
        halls = '<h2>Where ' + html.escape(short) + ' students live</h2><p>The halls ' + html.escape(short) + ' lists on its own website:</p>' + \
            "".join(f"<details><summary>{html.escape(kk)} ({len(v)})</summary><p>{html.escape(', '.join(v))}</p></details>" for kk, v in i["halls"].items())
    guide = "".join(f"<p>{html.escape(g)}</p>" for g in i["guide"])
    src = "".join(f'<li><a href="{u}" rel="noopener">{html.escape(t)}</a></li>' for t, u in i["sources"])
    note = f'<p class="dis">{html.escape(i["note"])}</p>' if i.get("note") else ""
    pickup = [c for c in i["campuses"]]
    body = f'''<h1>{html.escape(h1)}</h1><div class="meta">Checked against {html.escape(short)}'s own website on {INS["checked"]}</div>
<div class="hero"><strong>{html.escape(i["headline"])}.</strong><p>{OFFER_V[k]}</p></div>
<h2>Where we pick you up</h2><p>{cps}</p><p>We teach in and around {areas}. Give us your full pick-up postcode on the form and we match you with an instructor near it.</p>
<h2>What {html.escape(short)} says about getting around</h2><ul>{facts}</ul>{halls}
<h2>A local guide for {html.escape(short)} learners</h2>{guide}{note}
<h2>Fit lessons around your studies</h2><p>{html.escape(i["fit"])} {LIC_V[k].format(g=GOV_LIC)} {PORTAL_V[k]} <a href="{PORTAL}">What is inside the portal</a>.</p>
<h2>Test centres for {html.escape(short)} learners</h2>{dvsa_block(i["centres"])}
<h2>Book your lessons</h2>{form(name, i["level"], pickup)}
<p class="dis"><strong>Independent.</strong> DriveSQ is not affiliated with or endorsed by {html.escape(name)}. Its details come from its own website on the date above and may change.</p>
<h2>Sources</h2><ul>{src}</ul>'''
    faq = [tuple(q) for q in i["faqs"]] + [
        ("How much are lessons?", OFFER_V[(k + 1) % 4]),
        ("What do I get with my booking?", PORTAL_V[(k + 2) % 4])]
    rel = [("/student-driving-lessons-manchester-universities.html", "Student driving lessons across Manchester"), ("/manchester-driving-test-pass-rates-by-test-centre.html", "Manchester driving test pass rates by test centre")] + [(o["slug"], o["name"]) for o in others[:2]]
    return page_shell(i["slug"], f"Driving Lessons for {name} Students | DriveSQ" if i["level"] == "university" else f"Driving Lessons for {name} Learners (18+) | DriveSQ",
        f"Driving lessons for {name} {'students' if i['level']=='university' else 'adult learners'}: pick-up from campus or halls, from £35/hr, student offer 10 hours £320, free Student Portal. Local facts from the {short} website.",
        h1, body, faq, {"@type": "CollegeOrUniversity" if i["level"] == "university" else "EducationalOrganization", "name": name}, rel)

def hub():
    U, C = INS["universities"], INS["colleges"]
    cards = lambda L: '<div class="grid2">' + "".join(f'<a href="/{x["slug"]}"><b>{html.escape(x["name"])}</b><small>{html.escape(x["town"])} · {html.escape(x["headline"])}</small></a>' for x in L) + "</div>"
    body = f'''<h1>Student driving lessons in Manchester</h1><div class="meta">Universities and colleges in Greater Manchester · checked against each institution's own website on {INS["checked"]}</div>
<div class="hero"><strong>One driving school for every Manchester campus.</strong><p>Whether you study at a university, a college or a university centre, DriveSQ teaches manual and automatic lessons from £35 an hour, picks you up from halls, home or campus, and gives you the free Student Portal. Students get 10 hours for £320, paid in advance.</p></div>
<h2>Universities</h2>{cards(U)}<p>Also in Manchester: the Royal Northern College of Music (<a href="https://www.rncm.ac.uk/" rel="noopener">rncm.ac.uk</a>). If you study there, use the form below and we will match you with an instructor near your halls or home.</p>
<h2>Colleges for learners aged 18 and over</h2>{cards(C)}
<h2>Why learn to drive while you study</h2><ul>
<li><strong>Your time is flexible.</strong> You can book lessons around your timetable, and tell us when you are free on the booking form.</li>
<li><strong>It widens your options.</strong> A licence can open up placements, jobs with early or late shifts, and trips home.</li>
<li><strong>Your data is on your side.</strong> See the DVSA figures for Manchester: <a href="/young-driver-pass-rates-manchester.html">17 to 25 year olds' pass rates</a> and <a href="/manchester-driving-test-pass-rates-by-test-centre.html">pass rates at every test centre</a>.</li></ul>
<h2>The free Student Portal</h2><p>Every DriveSQ learner gets free access to the Student Portal: 700+ theory practice questions, 14 mock tests, hazard perception training and a progress dashboard, so you can prepare for your theory test while you wait for your first lesson. <a href="{PORTAL}">See what is inside</a>.</p>
<h2>Book your lessons</h2><p>Four short steps. Your booking goes straight to the DriveSQ team.</p>{form("my university or college", "university", [])}
<p class="dis"><strong>Independent.</strong> DriveSQ is an independent driving school and is not affiliated with, or endorsed by, any of the institutions named here.</p>'''
    faq = [("Which Manchester universities and colleges do you cover?", "We cover the University of Manchester, Manchester Metropolitan University, the University of Salford, the University of Greater Manchester (formerly the University of Bolton) and the colleges listed on this page, and we teach students from any other institution too. Enter your pick-up postcode on the form."),
           ("Do you offer a student discount?", "Yes. Students at the universities and colleges on this page can book 10 hours for £320, paid in advance, for manual or automatic lessons. Lessons are from £35 an hour for everyone."),
           ("Can you pick me up from halls or campus?", "Yes. Tell us your pick-up postcode and whether you want to be collected from your halls, home or campus."),
           ("Is the Student Portal free?", "Yes. It is free for every DriveSQ learner and includes 700+ theory questions, 14 mock tests and hazard perception training.")]
    rel = [("/areas.html", "All the areas we cover"), ("/manchester-driving-test-pass-rates-by-test-centre.html", "Manchester driving test pass rates by test centre"), ("/driving-lessons-for-international-students-manchester.html", "Driving lessons for international students in Manchester"), (PORTAL, "The free DriveSQ Student Portal")]
    return page_shell("student-driving-lessons-manchester-universities.html", "Student Driving Lessons in Manchester | Every University & College | DriveSQ",
        "Driving lessons for students at every Greater Manchester university and college. From £35/hr, 10 hours for £320, pick-up from halls or campus, free Student Portal.",
        "Student driving lessons in Manchester", body, faq, {"@type": "ItemList", "name": "Manchester universities and colleges"}, rel)

if __name__ == "__main__":
    allp = INS["universities"] + INS["colleges"]; built = []
    for i in allp:
        others = [o for o in allp if o["slug"] != i["slug"] and o["level"] == i["level"]]
        open(os.path.join(ROOT, i["slug"]), "w", encoding="utf-8").write(inst_page(i, others)); built.append(i["slug"])
    open(os.path.join(ROOT, "student-driving-lessons-manchester-universities.html"), "w", encoding="utf-8").write(hub()); built.append("student-driving-lessons-manchester-universities.html")
    # the older generic UoM-students page now points at the hub
    f = os.path.join(ROOT, "student-driving-lessons-manchester-university.html")
    if os.path.exists(f):
        s = open(f, encoding="utf-8").read()
        s = re.sub(r'<link rel="canonical" href="[^"]*"', '<link rel="canonical" href="' + BASE + 'student-driving-lessons-manchester-universities.html"', s, count=1)
        open(f, "w", encoding="utf-8").write(s)
    smp = os.path.join(ROOT, "sitemap-1.xml"); sm = open(smp, encoding="utf-8").read()
    for slug in built:
        if slug not in sm: sm = sm.replace("</urlset>", f"  <url><loc>{BASE}{slug}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
    # the older page is now canonical elsewhere: keep it out of the sitemap
    sm = re.sub(r"  <url><loc>https://www\.drivesq\.co\.uk/student-driving-lessons-manchester-university\.html</loc>.*?</url>\n", "", sm)
    open(smp, "w", encoding="utf-8").write(sm)
    print("built", len(built), "pages")
