#!/usr/bin/env python3
"""DriveSQ Solihull pages — written separately from the SQ Driving School Solihull pages (different angle, different
content) and cross-linked both ways so the two sites support each other.

  solihull-driving-school.html          "driving school Solihull"         who DriveSQ is, how lessons work, packages
  driving-instructors-solihull.html     "driving instructors Solihull"    how instructors are matched, what to check
  solihull-driving-test-pass-rates.html "Solihull driving test pass rates" data: every centre, odds, attempts, cost
  driving-instructor-jobs-solihull.html "driving instructor jobs Solihull" recruitment for ADIs/PDIs

Design (head styles, footer, SQ Websites credit) is copied from an existing DriveSQ page so the look matches.
Booking/application forms use #dsqInlineBookForm, which booking-capture.js sends to admin.html.
Run: python3 generate-solihull-pages.py"""
import html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = "https://www.drivesq.co.uk"
SQ = "https://sqdrivingschool.com"
TEMPLATE = os.path.join(HERE, "bredbury-driving-test-routes-guide.html")
UPDATED = "16 October 2026"

T = open(TEMPLATE, encoding="utf-8").read().split("\n")
CONSENT = "\n".join(T[3:5])                                          # consent default + analytics
STYLE = "\n".join(T[22:101])                                         # fonts, bootstrap, page CSS
FOOT_START = next(i for i, l in enumerate(T) if l.startswith("<footer>"))
FOOTER = "\n".join(T[FOOT_START:])
FOOTER = (FOOTER.replace("Bredbury, Stockport, Greater Manchester", "Solihull, West Midlands &middot; Greater Manchester")
          .replace("DriveSQ Driving School &middot; Bredbury &middot;", "DriveSQ Driving School &middot; Solihull &middot;")
          .replace("Manchester&rsquo;s #1 DVSA-approved driving school. &pound;35/hr manual &amp; automatic. 90%+ pass rate.",
                   "DVSA-approved instructors in Greater Manchester and now Solihull. &pound;35/hr manual &amp; automatic."))
assert "Mohammed Qaim Abbas" in FOOTER, "SQ Websites credit missing from template footer"

EXTRA_CSS = """<style>
.dsq-tbl{width:100%;border-collapse:collapse;font-size:.88rem;min-width:620px}.dsq-tbl th{font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:.5px;font-size:.75rem;color:#aaa;text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.12)}
.dsq-tbl td{padding:10px;border-bottom:1px solid rgba(255,255,255,.07)}.dsq-tbl tr:hover td{background:rgba(209,10,17,.06)}.dsq-tw{overflow-x:auto;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin:18px 0}
.dsq-bar{display:grid;grid-template-columns:150px 1fr 60px;gap:10px;align-items:center;margin:8px 0;font-size:.85rem}.dsq-bar i{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,#D10A11,#ff5a5a);width:0;transition:width 1.2s ease}
.dsq-bar.visible i{width:var(--w)}.dsq-bar.g i{background:linear-gradient(90deg,#16a34a,#4ade80)}.dsq-bar.n i{background:#666}
.dsq-x{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:18px 0}.dsq-x a{display:block;padding:18px;border-radius:14px;border:1px solid rgba(209,10,17,.3);background:rgba(209,10,17,.05);color:#f0f0f0;text-decoration:none;transition:transform .2s,border-color .2s}
.dsq-x a:hover{transform:translateY(-4px);border-color:#D10A11}.dsq-x small{display:block;color:#D10A11;font-family:'Oswald',sans-serif;letter-spacing:.5px;text-transform:uppercase;font-size:.72rem}.dsq-x b{display:block;margin:4px 0}.dsq-x span{color:#aaa;font-size:.85rem}
.dsq-src{font-size:.8rem;color:#999}.dsq-src a{color:#bbb}
@media(max-width:600px){.dsq-bar{grid-template-columns:100px 1fr 52px}}
@media(prefers-reduced-motion:reduce){.dsq-bar i{transition:none}}
</style>"""

PAGES = [
    ("solihull-driving-school.html", "Driving school Solihull", "DriveSQ in Solihull"),
    ("driving-instructors-solihull.html", "Driving instructors Solihull", "Instructors"),
    ("solihull-driving-test-pass-rates.html", "Solihull test pass rates", "Pass rates"),
    ("driving-instructor-jobs-solihull.html", "Instructor jobs Solihull", "Instructor jobs"),
]
SQ_LINKS = [
    (SQ + "/driving-lessons-solihull.html", "SQ Driving School", "Driving lessons in Solihull", "Prices, 14 Solihull areas and 60-second booking."),
    (SQ + "/solihull/shirley-driving-test-centre-routes.html", "Test routes", "Shirley driving test routes", "Roads, roundabouts and common mistakes at Shirley."),
    (SQ + "/solihull/garretts-green-driving-test-centre-routes.html", "Test routes", "Garretts Green test routes", "For Chelmsley Wood, Kingshurst and Marston Green."),
    (SQ + "/solihull/solihull-driving-test-centres-compared.html", "Compare", "Solihull test centres compared", "Which centre suits your postcode."),
    (SQ + "/solihull/learning-to-drive-in-solihull.html", "Local guide", "Learning to drive in Solihull", "M42, 20mph, Clean Air Zone and local data."),
    (SQ + "/solihull/automatic-driving-lessons-solihull.html", "Lessons", "Automatic lessons in Solihull", "Same £35/hr as manual."),
    (SQ + "/solihull/driving-lesson-prices-solihull.html", "Prices", "Driving lesson prices in Solihull", "£35/hr, no booking fees — and how Solihull compares."),
    (SQ + "/solihull/solihull-road-guides.html", "Roads", "Solihull road guides", "A34 cameras, M42 J5A, A45, bus lanes and 20mph zones."),
    (SQ + "/solihull/drivesq-student-portal-solihull.html", "Portal", "DriveSQ Student Portal in Solihull", "23 skills, mock tests and test-readiness."),
    (SQ + "/solihull/all-solihull-guides.html", "Directory", "Every Solihull guide", "Areas, postcodes, schools, workplaces and more."),
]
AREAS = [("Shirley", "shirley"), ("Solihull town centre", "solihull-town-centre"), ("Olton", "olton"), ("Knowle", "knowle"), ("Dorridge", "dorridge"),
         ("Chelmsley Wood", "chelmsley-wood"), ("Castle Bromwich", "castle-bromwich"), ("Kingshurst &amp; Smith's Wood", "kingshurst-smiths-wood"),
         ("Marston Green", "marston-green"), ("Dickens Heath", "dickens-heath"), ("Monkspath", "monkspath"), ("Hockley Heath", "hockley-heath"),
         ("Balsall Common", "balsall-common"), ("Meriden", "meriden"), ("Hillfield", "hillfield"), ("Cheswick Green", "cheswick-green"),
         ("Bentley Heath", "bentley-heath"), ("Elmdon", "elmdon"), ("Lyndon", "lyndon"), ("Fordbridge", "fordbridge"), ("Hampton-in-Arden", "hampton-in-arden"),
         ("Berkswell", "berkswell"), ("Catherine-de-Barnes", "catherine-de-barnes"), ("Tidbury Green", "tidbury-green"), ("Blythe Valley", "blythe-valley"),
         ("Widney Manor", "widney-manor"), ("Bickenhill", "bickenhill")]
# 2024-25 car pass rates, passrates.uk analysis of DVSA data
CENTRES = [("Birmingham (Shirley)", "401 Stratford Road, B90 4AA", 58.1, 9600, None, "shirley"),
           ("Warwick (Wedgenock House)", "Rothwell Road, Warwick CV34", 48.4, 10900, None, "warwick"),
           ("Birmingham (Kings Heath)", "955 Alcester Road South, B14 5JA", 47.0, 8488, None, "kings-heath"),
           ("Redditch", "Elm Road, B97 6HJ", 46.7, 4700, 44.7, "redditch"),
           ("Coventry", "42 Bayton Road, Exhall CV7 9EJ", 42.3, 9100, 41.7, "coventry"),
           ("Birmingham (Garretts Green)", "Granby Avenue, B33 0SD", 42.0, 21871, 39.9, "garretts-green"),
           ("Birmingham (South Yardley)", "Clay Lane, B26 1EA", 41.6, 12709, 39.4, "south-yardley")]
NAT = 48.7


def e(s):
    return html.escape(s, quote=True)


def nav(active):
    items = "".join(f'<li class="nav-item"><a class="nav-link{" active" if f == active else ""}" href="{f}">{lbl}</a></li>' for f, _, lbl in PAGES)
    return f"""<div class="ann"><i class="bi bi-geo-alt-fill me-1"></i><strong>DriveSQ &mdash; now teaching in Solihull</strong> &mdash; <a href="https://wa.me/447352932003" target="_blank" rel="nofollow noopener">WhatsApp 07352 932003 &rarr;</a></div>
<nav class="navbar navbar-expand-lg navbar-dark sticky-top" id="mainNav"><div class="container nav-inner">
<a class="navbar-brand d-flex align-items-center gap-2" href="{SITE}/"><img class="nlogo" src="https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png" alt="DriveSQ" width="46" height="46" loading="eager"/>
<span><div class="nbrand">Drive<span class="r">SQ</span></div><div class="ntag">Solihull &middot; B90&ndash;B94 &middot; B36 &middot; B37</div></span></a>
<button class="navbar-toggler border-0 p-1" type="button" data-bs-toggle="collapse" data-bs-target="#navLinks" aria-label="Menu"><span class="navbar-toggler-icon"></span></button>
<div class="collapse navbar-collapse" id="navLinks"><ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center" style="gap:2px">{items}
<li class="nav-item ms-lg-2"><a class="btn-nav-bk" href="#booking"><i class="bi bi-calendar-check"></i>Book</a></li></ul></div></div></nav>"""


def form(title, sub, options, button="Book Now"):
    opts = "".join(f"<option>{o}</option>" for o in options)
    st = "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 13px;color:#f0f0f0;font-size:.88rem;outline:none;width:100%;box-sizing:border-box"
    return f"""<!-- DRIVESQ-INLINE-BOOKING-V1 -->
<section id="booking" style="padding:32px 16px;max-width:560px;margin:0 auto">
  <div style="background:linear-gradient(135deg,rgba(209,10,17,.08),rgba(209,10,17,.03));border:1px solid rgba(209,10,17,.2);border-radius:16px;padding:28px">
    <h3 style="font-family:'Oswald',sans-serif;font-size:1.3rem;font-weight:700;color:#f0f0f0;margin-bottom:6px;display:flex;align-items:center;gap:8px"><i class="bi bi-calendar-check-fill" style="color:#D10A11"></i> {title}</h3>
    <p style="color:#aaa;font-size:.85rem;margin-bottom:18px">{sub}</p>
    <form id="dsqInlineBookForm" style="display:flex;flex-direction:column;gap:10px">
      <input name="name" placeholder="Full name *" required autocomplete="name" style="{st}">
      <input name="phone" type="tel" placeholder="Phone number *" required autocomplete="tel" style="{st}">
      <input name="postcode" placeholder="Postcode * (e.g. B90 4AA)" required autocomplete="postal-code" style="{st};text-transform:uppercase">
      <select name="service" required style="{st};background:rgba(30,30,30,.95)"><option value="">Choose *</option>{opts}</select>
      <input name="email" type="email" placeholder="Email (optional)" autocomplete="email" style="{st}">
      <textarea name="notes" placeholder="Anything we should know? (optional)" maxlength="500" rows="3" style="{st}"></textarea>
      <button type="submit" id="dsqInlineBookBtn" style="background:#D10A11;color:#fff;border:none;border-radius:9px;font-family:'Oswald',sans-serif;font-size:1rem;font-weight:700;padding:12px;cursor:pointer;letter-spacing:.5px;display:flex;align-items:center;justify-content:center;gap:8px"><i class="bi bi-send-fill"></i> {button}</button>
      <div id="dsqInlineBookMsg"></div>
    </form>
  </div>
</section>
<script src="/booking-capture.js" defer></script>
<!-- /DRIVESQ-INLINE-BOOKING-V1 -->"""


LESSON_OPTS = ["Manual Lessons", "Automatic Lessons", "Intensive Course", "Pass Plus", "Theory Help"]


def crosslinks(exclude=None, n=10):
    cards = "".join(f'<a href="{u}"><small>{c}</small><b>{t}</b><span>{d}</span></a>' for u, c, t, d in SQ_LINKS[:n])
    own = "".join(f'<a href="{f}"><small>DriveSQ</small><b>{lbl}</b><span>More from DriveSQ in Solihull</span></a>' for f, lbl, _ in PAGES if f != exclude)
    return f"""<section class="sg"><div class="container"><span class="eye">Solihull guides</span><h2 class="sec-t">More on <span class="tr">Solihull</span></h2>
<p class="sec-s">DriveSQ and SQ Driving School are one team: the same instructors, prices and Student Portal. SQ Driving School publishes the detailed local guides.</p>
<div class="dsq-x">{cards}{own}</div></div></section>"""


def faq_html(faqs):
    items = "".join(f'<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#fq{i}">{e(q)}</button></h3><div id="fq{i}" class="accordion-collapse collapse"><div class="accordion-body">{a}</div></div></div>' for i, (q, a) in enumerate(faqs))
    return f'<section class="sw" id="faq"><div class="container" style="max-width:860px"><span class="eye">FAQ</span><h2 class="sec-t">Frequently asked <span class="tr">questions</span></h2><div class="accordion mt-3" id="faqAcc">{items}</div></div></section>'


def sources(src):
    li = "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{e(n)}</a></li>' for n, u in src)
    return f'<section class="sw"><div class="container"><div class="dsq-src"><strong>Sources</strong> (checked {UPDATED})<ul>{li}</ul></div></div></section>'


def build(fname, title, desc, kw, h1, lead, hero_pills, body, faqs, src, form_html, extra_schema=None):
    url = f"{SITE}/{fname}"
    crumb = next(lbl for f, lbl, _ in PAGES if f == fname)
    schema = [{"@context": "https://schema.org", "@type": "DrivingSchool", "name": "DriveSQ Driving School — Solihull", "url": url, "telephone": "+44 7352 932003", "priceRange": "£35–£350",
               "areaServed": {"@type": "AdministrativeArea", "name": "Metropolitan Borough of Solihull"}, "sameAs": [SQ + "/driving-lessons-solihull.html"],
               "subOrganization": {"@type": "Organization", "name": "SQ Driving School", "url": SQ}},
              {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}, {"@type": "ListItem", "position": 2, "name": "Solihull", "item": SITE + "/solihull-driving-school.html"}, {"@type": "ListItem", "position": 3, "name": crumb, "item": url}]},
              {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}} for q, a in faqs]}]
    if extra_schema:
        schema += extra_schema
    pills = "".join(f'<span class="hp"><span class="dot"></span>{p}</span>' for p in hero_pills)
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
{CONSENT}
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}"/>
<meta name="keywords" content="{e(kw)}"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="{url}"/>
<meta property="og:type" content="website"/><meta property="og:locale" content="en_GB"/>
<meta property="og:title" content="{e(title)}"/><meta property="og:description" content="{e(desc)}"/>
<meta property="og:image" content="https://i.postimg.cc/pLtNygxL/DRIVE-SQ-PASS.jpg"/><meta property="og:url" content="{url}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" href="https://i.postimg.cc/sx8zRRKV/cropped-circle-image.png"/>
""" + "\n".join(f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>' for s in schema) + f"""
{STYLE}
{EXTRA_CSS}
</head>
<body>
{nav(fname)}
<div class="bc"><div class="container"><nav aria-label="breadcrumb"><a href="{SITE}/">Home</a><span class="bc-sep">&#8250;</span><a href="solihull-driving-school.html">Solihull</a><span class="bc-sep">&#8250;</span><span style="color:#ccc">{crumb}</span></nav></div></div>
<section class="hero-sm"><div class="container">
<div class="badge-pill"><i class="bi bi-geo-alt-fill"></i> Solihull &middot; West Midlands</div>
<h1>{h1}</h1>
<p class="sub">{lead}</p>
<div class="d-flex flex-wrap gap-2 mt-3">{pills}</div>
<div class="d-flex flex-wrap gap-2 mt-4"><a class="btn-red-lg" href="#booking"><i class="bi bi-calendar-check-fill"></i> {"Apply now" if "jobs" in fname else "Book a lesson"}</a><a class="btn-wa-lg" href="https://wa.me/447352932003" target="_blank" rel="nofollow noopener"><i class="bi bi-whatsapp"></i> WhatsApp</a></div>
</div></section>
{body}
{form_html}
{crosslinks(fname)}
{faq_html(faqs)}
{sources(src)}
{FOOTER}"""


def bars(rows):
    out = ""
    for name, val, kind in rows:
        out += f'<div class="dsq-bar reveal {kind}"><span>{name}</span><i style="--w:{val / 70 * 100:.1f}%"></i><b>{val}%</b></div>'
    return out


# ------------------------------------------------------------------ pages
def school():
    areas = "".join(f'<a href="{SQ}/solihull/driving-lessons-{s}.html"><small>Lessons</small><b>{n}</b><span>Driving lessons in {n}</span></a>' for n, s in AREAS)
    body = f"""<div class="stats-bar"><div class="container"><div class="d-flex justify-content-center flex-wrap gap-4">
<div class="stat"><div class="stat-num">&pound;<span class="counter" data-t="35">35</span></div><div class="stat-lbl">per hour</div></div><div class="stat-sep d-none d-md-block"></div>
<div class="stat"><div class="stat-num"><span class="counter" data-t="{len(AREAS)}">{len(AREAS)}</span></div><div class="stat-lbl">Solihull areas</div></div><div class="stat-sep d-none d-md-block"></div>
<div class="stat"><div class="stat-num"><span class="counter" data-t="23">23</span></div><div class="stat-lbl">skills tracked</div></div><div class="stat-sep d-none d-md-block"></div>
<div class="stat"><div class="stat-num">58.1%</div><div class="stat-lbl">Shirley pass rate</div></div></div></div></div>
<section class="sw"><div class="container"><div class="row g-5"><div class="col-lg-7 reveal"><span class="eye">Driving school Solihull</span>
<h2 class="sec-t">A Manchester driving school, <span class="tr">now in Solihull</span></h2>
<div class="prose mt-3"><p>DriveSQ started in Greater Manchester, where we built our own booking system, a Student Portal for learners and an Instructor Portal for our instructors. Solihull is the first area we've opened outside Greater Manchester, and lessons here run on exactly the same system — same prices, same portals, same way of working.</p>
<p>Lessons in Solihull are delivered with our sister brand, <a href="{SQ}/driving-lessons-solihull.html">SQ Driving School</a>, which publishes the detailed local guides: every Solihull area, every test centre's roads, and the mistakes learners make on them.</p>
<h3>What's different about learning with DriveSQ</h3>
<ul><li><b>You can see your progress.</b> After every lesson your instructor records 23 driving skills in your Student Portal — moving off, junctions, roundabouts, manoeuvres and the rest — so you know exactly what's left before you're test-ready.</li>
<li><b>Instructors are matched by postcode.</b> Our booking system assigns the nearest suitable instructor in Solihull, whether you're in B90 or B37.</li>
<li><b>Lessons follow your test centre's roads.</b> Shirley, Garretts Green or elsewhere — the last weeks of lessons are on the roads you'll be tested on.</li>
<li><b>Transparent prices.</b> No deposit games, no fuel surcharges.</li></ul></div></div>
<div class="col-lg-5 reveal"><div class="hl-box"><strong><i class="bi bi-cash-coin me-1"></i>Solihull prices</strong><ul class="mt-2 mb-0"><li>1 hour &mdash; &pound;35 (manual or automatic)</li><li>2 hours &mdash; &pound;70</li><li>10 hours &mdash; &pound;350</li><li>NHS staff &amp; students &mdash; 10 hours &pound;320</li></ul></div>
<div class="hl-box green mt-3"><strong><i class="bi bi-phone me-1"></i>DriveSQ Student Portal</strong><p class="mb-0 mt-2" style="font-size:.88rem">Skills progress, theory library, 50-question mock tests, test-readiness checklist and messages with your instructor. <a href="{SITE}/student.html">Student login</a>.</p></div></div></div></div></section>
<section class="sg"><div class="container"><span class="eye">Coverage</span><h2 class="sec-t">Where we teach in <span class="tr">Solihull</span></h2><p class="sec-s">Door-to-door pick-up across the borough. Each area has its own guide on SQ Driving School.</p><div class="dsq-x">{areas}</div></div></section>
<section class="sw"><div class="container"><span class="eye">How it works</span><h2 class="sec-t">From booking to <span class="tr">test pass</span></h2><div class="row g-4 mt-2">
<div class="col-md-3 reveal"><div class="tc"><div class="tc-ico"><i class="bi bi-1-circle"></i></div><div class="tc-t">Book online</div><p>Send the form below; we call or text you back.</p></div></div>
<div class="col-md-3 reveal"><div class="tc"><div class="tc-ico"><i class="bi bi-2-circle"></i></div><div class="tc-t">Matched instructor</div><p>Nearest suitable instructor for your postcode.</p></div></div>
<div class="col-md-3 reveal"><div class="tc"><div class="tc-ico"><i class="bi bi-3-circle"></i></div><div class="tc-t">Track every skill</div><p>23 skills in your Student Portal.</p></div></div>
<div class="col-md-3 reveal"><div class="tc"><div class="tc-ico"><i class="bi bi-4-circle"></i></div><div class="tc-t">Test-route practice</div><p>Mock test on your centre's roads, then the real thing.</p></div></div></div></div></section>"""
    faqs = [("Is there a DriveSQ driving school in Solihull?", "Yes. DriveSQ now teaches across Solihull, together with its sister brand SQ Driving School."),
            ("How much are DriveSQ lessons in Solihull?", "£35 an hour for manual or automatic, £70 for 2 hours and £350 for 10 hours (£320 for NHS staff and students)."),
            ("Which areas of Solihull do you cover?", ", ".join(re.sub("&amp;", "&", n) for n, _ in AREAS) + "."),
            ("Do I get the DriveSQ Student Portal in Solihull?", "Yes — it's free with every lesson.")]
    src = [("ONS — Census 2021: Solihull", "https://www.ons.gov.uk/visualisations/censusareachanges/E08000029/"), ("passrates.uk — Birmingham (Shirley)", "https://passrates.uk/centres/birmingham-shirley")]
    return build("solihull-driving-school.html", "Driving School Solihull | DriveSQ — £35/hr Manual & Automatic",
                 "DriveSQ driving school in Solihull: £35/hr manual and automatic lessons, instructors matched by postcode, the free Student Portal and test-route practice for Shirley and Garretts Green.",
                 "driving school Solihull, driving lessons Solihull, DriveSQ Solihull, Shirley driving lessons, automatic driving school Solihull",
                 'Driving School <span class="r">Solihull</span>', "DriveSQ now teaches across Solihull — Shirley, Solihull, Knowle, Dorridge, Olton, Chelmsley Wood and more. £35/hr manual or automatic, instructors matched by postcode, and the free DriveSQ Student Portal.",
                 ["&pound;35/hr", "Manual &amp; automatic", "B90&ndash;B94, B36, B37", "Free Student Portal"], body, faqs, src,
                 form("Book a lesson in Solihull", "Send your details — the DriveSQ team will call or text you back.", LESSON_OPTS))


def instructors():
    body = f"""<section class="sw"><div class="container"><div class="row g-5"><div class="col-lg-7 reveal"><span class="eye">Driving instructors Solihull</span>
<h2 class="sec-t">How we match you with a <span class="tr">Solihull instructor</span></h2>
<div class="prose mt-3"><p>Most people choose a driving instructor by phoning round. With DriveSQ the booking system does the matching: it looks at your postcode, whether you want manual or automatic, and when you're free, then assigns the nearest suitable instructor in Solihull. You can ask to change instructor at any time.</p>
<h3>Five things to check about any driving instructor</h3>
<ol><li><b>The badge.</b> A fully qualified Approved Driving Instructor (ADI) shows a green badge on the windscreen. A trainee shows a pink one. Both are legal; you should know which you're getting.</li>
<li><b>Dual controls.</b> Needed for motorway lessons on the M42 and simply safer.</li>
<li><b>A plan.</b> Ask how they'll track progress. DriveSQ instructors record 23 skills in your Student Portal after each lesson.</li>
<li><b>Local test knowledge.</b> Do they know the roads around Shirley or Garretts Green? See SQ's <a href="{SQ}/solihull/shirley-driving-test-centre-routes.html">Shirley route guide</a>.</li>
<li><b>Clear prices.</b> DriveSQ: £35/hr, manual or automatic, no hidden extras.</li></ol>
<h3>Manual or automatic instructor?</h3><p>Same price. Automatic suits nervous learners and anyone who wants fewer hours; manual gives a full licence. See <a href="{SQ}/solihull/automatic-driving-lessons-solihull.html">automatic lessons in Solihull</a>.</p></div></div>
<div class="col-lg-5 reveal"><div class="hl-box"><strong><i class="bi bi-shield-check me-1"></i>Instructor standards</strong><p class="mt-2 mb-0" style="font-size:.88rem">ADIs are regulated by the DVSA, which carries out regular standards checks and grades instructors A or B. You can ask any instructor about their grade.</p></div>
<div class="hl-box green mt-3"><strong><i class="bi bi-person-plus me-1"></i>Are you an instructor?</strong><p class="mt-2 mb-0" style="font-size:.88rem">We're taking on ADIs in Solihull. <a href="driving-instructor-jobs-solihull.html">Driving instructor jobs in Solihull &rarr;</a></p></div></div></div></div></section>"""
    faqs = [("How do I find a good driving instructor in Solihull?", "Check they're an ADI (green badge), have dual controls, track your progress and know your test centre's roads. DriveSQ matches you to the nearest suitable instructor automatically."),
            ("What's the difference between a green and pink badge?", "Green is a fully qualified ADI; pink is a trainee licensed to teach while completing training."),
            ("Can I change instructor?", "Yes, at any time — just let us know."),
            ("How much do driving instructors charge in Solihull?", "DriveSQ charges £35 an hour for manual or automatic.")]
    src = [("GOV.UK — Approved driving instructor standards check", "https://www.gov.uk/adi-standards-check"), ("GOV.UK — Find a driving school or instructor", "https://www.gov.uk/find-driving-schools-and-lessons")]
    return build("driving-instructors-solihull.html", "Driving Instructors Solihull | Matched by Postcode | DriveSQ",
                 "Find a driving instructor in Solihull: how DriveSQ matches you by postcode, what to check (ADI badge, dual controls, progress tracking) and manual vs automatic — £35/hr.",
                 "driving instructors Solihull, driving instructor Shirley, automatic driving instructor Solihull, ADI Solihull",
                 'Driving Instructors in <span class="r">Solihull</span>', "How to choose a driving instructor in Solihull — and how DriveSQ matches you with the nearest suitable instructor for your postcode, manual or automatic, at £35 an hour.",
                 ["Matched by postcode", "ADI-qualified", "Dual controls", "&pound;35/hr"], body, faqs, src,
                 form("Get matched with an instructor", "Tell us your postcode and lesson type — we'll match you and get in touch.", LESSON_OPTS))


def pass_rates():
    rows = "".join(f'<tr><td>{f"<a href={chr(34)}{SQ}/solihull/{s}-driving-test-centre-routes.html{chr(34)}>{n}</a>" if s else n}</td><td>{a}</td><td><b>{r}%</b></td><td>{f"{ft}%" if ft else "—"}</td><td>{t:,}</td><td>{1 / (r / 100):.1f}</td><td>&pound;{62 / (r / 100):.0f}</td></tr>' for n, a, r, t, ft, s in CENTRES)
    b = bars([(n.replace("Birmingham (", "").replace(")", "").replace(" (Wedgenock House", ""), r, "g" if r >= NAT else "") for n, a, r, t, ft, s in CENTRES] + [("UK average", NAT, "n")])
    body = f"""<section class="sw"><div class="container"><span class="eye">Solihull driving test pass rates</span><h2 class="sec-t">Every centre Solihull learners use, <span class="tr">ranked</span></h2>
<p class="sec-s">2024-25 car test pass rates from passrates.uk's analysis of DVSA data. UK average: {NAT}%.</p>
<div class="mt-3">{b}</div>
<div class="dsq-tw reveal"><table class="dsq-tbl"><thead><tr><th>Centre</th><th>Location</th><th>Pass rate</th><th>First attempt</th><th>Tests</th><th>Avg attempts*</th><th>Avg test fees*</th></tr></thead><tbody>{rows}</tbody></table></div>
<p class="dsq-src">*If every attempt had the same chance of passing: average attempts = 1 &divide; pass rate; average spent on weekday test fees = &pound;62 &divide; pass rate. Real learners improve between attempts, so treat these as a baseline. Test volumes for some centres are rounded.</p></div></section>
<section class="sg"><div class="container"><div class="row g-5"><div class="col-lg-7 reveal"><span class="eye">What the numbers mean</span><h2 class="sec-t">Shirley's <span class="tr">16-point lead</span></h2>
<div class="prose mt-3"><p><b>Shirley</b>, Solihull's own centre on the A34, had a 58.1% pass rate in 2024-25 — the highest of any Birmingham-area centre and up from 44.9% in 2017-18. At the other end, <b>Garretts Green</b> — the busiest centre in Birmingham with almost 22,000 tests, and the nearest for north Solihull — passed 42.0%, with just 39.9% passing first time. Across Birmingham's five centres, passrates.uk puts the average at 45.4%.</p>
<p>That gap is worth real money. On the simple model in the table, an average Garretts Green candidate spends about &pound;148 on weekday test fees before passing; at Shirley it's about &pound;107. Every failed attempt also usually means extra lessons and another wait.</p>
<h3>Should you book Shirley instead?</h3><p>If you live in south Solihull, Shirley is probably your nearest centre anyway. If you live in Chelmsley Wood or Kingshurst, travelling to Shirley means being tested on roads you don't know — which can cancel out the advantage. Since June 2026 a booked test can only be moved to one of the three centres nearest it, so choose carefully. SQ Driving School's <a href="{SQ}/solihull/solihull-driving-test-centres-compared.html">comparison by postcode</a> helps.</p>
<h3>The West Midlands context</h3><p>The region's pass rate runs several points below the GB average, and nearby Wolverhampton had the lowest pass rate in Britain in 2024-25 (33.4%). Solihull's Shirley centre is a notable exception.</p></div></div>
<div class="col-lg-5 reveal"><div class="hl-box"><strong><i class="bi bi-graph-up-arrow me-1"></i>Key figures</strong><ul class="mt-2 mb-0"><li>Shirley 58.1% (2024-25), 44.9% (2017-18)</li><li>Garretts Green 42.0%, first attempt 39.9%</li><li>South Yardley 41.6% &mdash; lowest in Birmingham</li><li>Birmingham five-centre average 45.4%</li><li>UK average 48.7%</li></ul></div>
<div class="hl-box green mt-3"><strong><i class="bi bi-lightbulb me-1"></i>What actually moves your odds</strong><p class="mt-2 mb-0" style="font-size:.88rem">Being genuinely test-ready. DriveSQ learners see all 23 skills in their Student Portal and do a full mock test before booking.</p></div></div></div></div></section>"""
    faqs = [("What is the driving test pass rate in Solihull?", "Shirley, Solihull's only test centre, had a 58.1% car pass rate in 2024-25 — the highest in the Birmingham area."),
            ("Which test centre near Solihull is easiest?", "By pass rate, Shirley (58.1%). But the best centre for you is usually the one whose roads you've practised."),
            ("What is the pass rate at Garretts Green?", "42.0% in 2024-25 from 21,871 tests, with 39.9% passing first time."),
            ("What is the UK average driving test pass rate?", "48.7% in 2024-25, according to passrates.uk's analysis of DVSA data.")]
    src = [("passrates.uk — Birmingham test centres", "https://passrates.uk/guide/birmingham-driving-test-centres-pass-rates"), ("passrates.uk — Birmingham (Shirley)", "https://passrates.uk/centres/birmingham-shirley"),
           ("passrates.uk — Garretts Green", "https://passrates.uk/centres/birmingham-garretts-green"), ("passrates.uk — South Yardley", "https://passrates.uk/centres/birmingham-south-yardley"),
           ("passrates.uk — Kings Heath", "https://passrates.uk/centres/birmingham-kings-heath"), ("passrates.uk — Coventry", "https://passrates.uk/centres/coventry"),
           ("passrates.uk — Warwick", "https://passrates.uk/centres/warwick-wedgenock-house"), ("passrates.uk — Redditch", "https://passrates.uk/centres/redditch"),
           ("passrates.uk — UK pass rate 2024-25", "https://passrates.uk/guide/driving-test-pass-rate-2024-2025"), ("DVSA — Car driving test data by test centre", "https://www.gov.uk/government/statistical-data-sets/car-driving-test-data-by-test-centre"),
           ("GOV.UK — Driving test cost", "https://www.gov.uk/driving-test-cost")]
    ds = [{"@context": "https://schema.org", "@type": "Dataset", "name": "Driving test pass rates for centres used by Solihull learners, 2024-25", "description": "Pass rates, first-attempt rates, test volumes and modelled attempts and fees for seven test centres near Solihull.", "url": f"{SITE}/solihull-driving-test-pass-rates.html", "creator": {"@type": "Organization", "name": "DriveSQ"}, "license": "https://creativecommons.org/licenses/by/4.0/", "spatialCoverage": "Solihull, West Midlands"}]
    return build("solihull-driving-test-pass-rates.html", "Solihull Driving Test Pass Rates 2026: Every Centre Ranked | DriveSQ",
                 "Driving test pass rates for every centre Solihull learners use — Shirley 58.1%, Warwick, Kings Heath, Redditch, Coventry, Garretts Green, South Yardley — with attempts and costs explained.",
                 "Solihull driving test pass rate, Shirley test centre pass rate, Garretts Green pass rate, easiest test centre Birmingham",
                 'Solihull Driving Test <span class="r">Pass Rates</span>', "Seven test centres, one table: pass rates, first-attempt rates, how many attempts the average learner needs and what it costs — for everyone learning to drive in Solihull.",
                 ["Shirley 58.1%", "7 centres", "UK avg 48.7%", "Updated Oct 2026"], body, faqs, src,
                 form("Book lessons for your test", "Learning for a test at Shirley or Garretts Green? Book lessons with DriveSQ.", LESSON_OPTS), ds)


def jobs():
    body = f"""<section class="sw"><div class="container"><div class="row g-5"><div class="col-lg-7 reveal"><span class="eye">Driving instructor jobs Solihull</span>
<h2 class="sec-t">Teach in Solihull with <span class="tr">DriveSQ</span></h2>
<div class="prose mt-3"><p>DriveSQ has opened in Solihull and is taking on more driving instructors. Our booking system brings in learners and assigns them to the nearest suitable instructor by postcode, so you spend your time teaching rather than chasing pupils.</p>
<h3>What you get</h3><ul><li><b>Pupils matched by postcode</b> from DriveSQ and SQ Driving School bookings across B90&ndash;B94, B36 and B37.</li><li><b>The DriveSQ Instructor Portal</b> — diary, pupils, progress records and messaging in one place.</li><li><b>A Student Portal for your pupils</b> — they see the skills you record, which keeps them motivated.</li><li><b>Local test guides</b> — SQ's <a href="{SQ}/solihull/shirley-driving-test-centre-routes.html">Shirley</a> and <a href="{SQ}/solihull/garretts-green-driving-test-centre-routes.html">Garretts Green</a> route guides to share with pupils.</li></ul>
<h3>Why Solihull?</h3><p>Solihull had 216,245 residents at the 2021 Census, and about 9% are aged 16&ndash;24. Its test centre at Shirley had the best pass rate in the Birmingham area in 2024-25 (58.1%), and the M42 on the doorstep makes it ideal for motorway lessons.</p>
<h3>Who we're looking for</h3><ul><li>Qualified ADIs (green badge), manual or automatic</li><li>Trainee instructors (PDIs) — talk to us</li><li>Your own dual-controlled car</li><li>Patient, reliable and happy to use the Instructor Portal</li></ul></div></div>
<div class="col-lg-5 reveal"><div class="hl-box"><strong><i class="bi bi-geo me-1"></i>Areas we're recruiting for</strong><p class="mt-2 mb-0" style="font-size:.88rem">Shirley, Monkspath, Dickens Heath, Solihull town centre, Olton, Knowle, Dorridge, Chelmsley Wood, Kingshurst, Castle Bromwich, Marston Green, Balsall Common.</p></div>
<div class="hl-box green mt-3"><strong><i class="bi bi-laptop me-1"></i>Already with DriveSQ?</strong><p class="mt-2 mb-0" style="font-size:.88rem"><a href="{SITE}/dashboard.html">Instructor Portal login</a>.</p></div></div></div></div></section>"""
    faqs = [("Is DriveSQ hiring driving instructors in Solihull?", "Yes — qualified ADIs, manual or automatic, and we're happy to talk to trainees."),
            ("How do I get pupils?", "Learners who book with DriveSQ or SQ Driving School are matched to the nearest suitable instructor by postcode."),
            ("Do I need my own car?", "Yes, a dual-controlled car suitable for lessons."),
            ("What is the Instructor Portal?", "DriveSQ's online system for your diary, pupils, progress records and messages.")]
    src = [("GOV.UK — Become a driving instructor", "https://www.gov.uk/become-driving-instructor"), ("ONS — Census 2021: Solihull", "https://www.ons.gov.uk/visualisations/censusareachanges/E08000029/"),
           ("passrates.uk — Birmingham (Shirley)", "https://passrates.uk/centres/birmingham-shirley")]
    return build("driving-instructor-jobs-solihull.html", "Driving Instructor Jobs Solihull | Pupils Matched by Postcode | DriveSQ",
                 "Driving instructor jobs in Solihull with DriveSQ: pupils matched to you by postcode, the DriveSQ Instructor Portal, and learners across Shirley, Solihull, Knowle and Chelmsley Wood.",
                 "driving instructor jobs Solihull, ADI jobs Solihull, driving instructor franchise Solihull, become a driving instructor Solihull",
                 'Driving Instructor Jobs in <span class="r">Solihull</span>', "DriveSQ is growing in Solihull. Join us and get learners matched to you by postcode, plus the DriveSQ Instructor Portal to run your diary.",
                 ["ADIs &amp; trainees", "Manual &amp; automatic", "Pupils by postcode", "Instructor Portal"], body, faqs, src,
                 form("Apply to teach in Solihull", "Send your details and we'll call you back. Choose your status below.",
                      ["Instructor application — qualified ADI (manual)", "Instructor application — qualified ADI (automatic)", "Instructor application — trainee / PDI"], "Send application"))


def main():
    out = {"solihull-driving-school.html": school(), "driving-instructors-solihull.html": instructors(),
           "solihull-driving-test-pass-rates.html": pass_rates(), "driving-instructor-jobs-solihull.html": jobs()}
    for f, h in out.items():
        open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
