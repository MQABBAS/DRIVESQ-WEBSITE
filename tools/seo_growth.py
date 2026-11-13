#!/usr/bin/env python3
"""Growth/authority SEO: new 'fast-growing driving school Manchester' page, homepage schema + FAQ fix, about-page accuracy fixes, internal links, sitemap entry."""
import re, datetime, json, html
TODAY = datetime.date.today().isoformat()
def rd(f): return open(f, encoding="utf-8").read()
def wr(f, s): open(f, "w", encoding="utf-8").write(s)
SLUG = "fast-growing-driving-school-manchester.html"
URL = "https://www.drivesq.co.uk/" + SLUG
areas = re.search(r'(\d+) areas', rd("areas.html")).group(1)

faq = [
 ("Is DriveSQ the fastest-growing driving school in Manchester?",
  f"We can't point to an official ranking, so we won't claim one. What we can show is the record: DriveSQ was founded in 2025 and has since reached 180+ five-star Google reviews, a growing team of ADI and PDI instructors, and lessons in {areas} areas across Greater Manchester, Stockport, Bolton and Solihull. Read the reviews yourself and judge."),
 ("Why are so many learners choosing DriveSQ?",
  "Three things come up again and again in our reviews: one fair price (£35 an hour for manual and automatic), instructors who are patient and calm, and a quick reply on WhatsApp. New learners also get their first 10 hours for £330, paid in advance."),
 ("How much do driving lessons cost with DriveSQ?",
  "£35 per hour for manual or automatic, with a 2-hour standard lesson at £70. New learners get their first 10 hours for £330 in every area we cover. Intensive courses are £40 an hour."),
 ("Are DriveSQ instructors qualified?",
  "DriveSQ instructors are DVSA-approved driving instructors (ADI) or trainee instructors (PDI) working under DVSA's rules. Ask your instructor for their badge at the first lesson."),
 ("How quickly can I start lessons?",
  "Send your postcode on WhatsApp (07352 932003) or use the booking form. We match you with an instructor near you, and your instructor will contact you to arrange your first lesson."),
]
schema = {"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","@id":URL+"#page","url":URL,"name":"Fast-Growing Driving School in Manchester | DriveSQ","isPartOf":{"@id":"https://www.drivesq.co.uk/#website"},"about":{"@id":"https://www.drivesq.co.uk/#school"},"dateModified":TODAY,"inLanguage":"en-GB"},
 {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]},
 {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://www.drivesq.co.uk/"},{"@type":"ListItem","position":2,"name":"Fast-growing driving school Manchester","item":URL}]}]}
faqhtml = "".join(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>" for q,a in faq)
page = f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fast-Growing Driving School in Manchester | 180+ 5★ Reviews | DriveSQ</title>
<meta name="description" content="DriveSQ: a fast-growing Manchester driving school. Founded 2025, 180+ five-star Google reviews, ADI &amp; PDI instructors, {areas} areas. £35/hr manual or automatic, first 10 hours £330.">
<link rel="canonical" href="{URL}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="Fast-growing driving school in Manchester — DriveSQ"><meta property="og:description" content="Founded 2025. 180+ five-star Google reviews. £35/hr manual or automatic. First 10 hours £330."><meta property="og:url" content="{URL}"><meta property="og:type" content="website"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>:root{{--red:#D10A11;--ink:#1a1214;--bg:#f6f2ee;--card:#fff}}@media(prefers-color-scheme:dark){{:root{{--ink:#f3eeee;--bg:#0b0204;--card:#16080a}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6}}a{{color:inherit}}.wrap{{max-width:900px;margin:0 auto;padding:20px 16px 40px}}
header{{background:#0b0204;color:#fff;padding:14px 16px}}header .in{{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}}header b{{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem}}header b span{{color:#ff2d35}}header nav a{{color:#fff;text-decoration:none;margin-left:14px;font-weight:600;font-size:.9rem}}
h1{{font-family:'Barlow Condensed',sans-serif;font-size:2.4rem;line-height:1.05;margin:10px 0 8px;text-transform:uppercase}}h2{{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;margin:28px 0 8px;text-transform:uppercase;color:var(--red)}}
.stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0}}.stats div{{background:var(--card);border:1px solid rgba(127,127,127,.25);border-radius:12px;padding:12px;text-align:center}}.stats b{{display:block;font-family:'Barlow Condensed',sans-serif;font-size:1.9rem;color:var(--red)}}
.cta{{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 22px;margin:10px 10px 4px 0}}.cta.alt{{background:#25D366;color:#06210f}}
details{{background:var(--card);border:1px solid rgba(127,127,127,.25);border-radius:10px;padding:10px 14px;margin:8px 0}}summary{{cursor:pointer;font-weight:700}}footer{{text-align:center;font-size:.8rem;opacity:.8;padding:20px}}ul{{padding-left:20px}}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/about.html">About</a><a href="/areas.html">Areas</a><a href="/#book-60">Book</a></nav></div></header>
<main class="wrap"><h1>A fast-growing driving school in Manchester</h1>
<p>DriveSQ started in 2025 with a handful of instructors and one idea: professional driving lessons at a fair price, with a quick reply when you get in touch. Learners told their friends, and we've grown through word of mouth and the reviews you can read on Google.</p>
<div class="stats"><div><b>2025</b>Founded in Manchester</div><div><b>180+</b>5★ Google reviews</div><div><b>{areas}</b>Areas covered</div><div><b>£35/hr</b>Manual &amp; automatic</div></div>
<a class="cta" href="/#book-60">Book in 60 seconds</a><a class="cta alt" href="https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27d%20like%20to%20book%20driving%20lessons" rel="nofollow noopener">WhatsApp 07352 932003</a>
<h2>Why learners choose DriveSQ</h2><ul>
<li><strong>One fair price.</strong> £35 an hour, manual or automatic. New learners get their first 10 hours for £330, paid in advance.</li>
<li><strong>Quick reply.</strong> Message us on WhatsApp and we match you with an instructor near your postcode.</li>
<li><strong>Patient, qualified instructors.</strong> DVSA-approved (ADI) and trainee (PDI) instructors who go at your pace.</li>
<li><strong>Local to you.</strong> Lessons across <a href="/areas.html">{areas} areas</a> of Greater Manchester, Stockport, Bolton and Solihull, with pick-up from home, college or work.</li>
<li><strong>A free student portal</strong> to track your progress and revise.</li></ul>
<h2>See the proof</h2><p>Don't take our word for it: read our <a href="/reviews.html">five-star Google reviews</a>, or see our most popular pages: <a href="/automatic-driving-lessons-manchester.html">automatic lessons</a>, <a href="/10-hour-driving-course-manchester.html">the 10-hour course</a> and <a href="/areas.html">every area we cover</a>.</p>
<h2>Questions</h2>{faqhtml}
<p style="margin-top:22px"><a class="cta" href="/#book-60">Book your first lesson</a></p>
</main><footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/areas.html">Areas</a></footer>
<script src="/dsq-analytics.js" defer></script></body></html>'''
wr(SLUG, page)

# homepage: schema, FAQ duplicate sentence, footer link
ix = rd("index.html")
dup = "Selected inner postcodes (M19, M18, M14, M12, M13, SK4, SK5, SK3, SK8, M20, M21, M22, M16) pay just £330 for a 10-hour block. "
n = ix.count(dup); ix = ix.replace(dup, "")
ix = ix.replace('"@type":"DrivingSchool","name":"DriveSQ Driving School","url":"https://www.drivesq.co.uk/",',
 '"@type":["DrivingSchool","LocalBusiness"],"@id":"https://www.drivesq.co.uk/#school","name":"DriveSQ Driving School","alternateName":"DriveSQ","foundingDate":"2025","url":"https://www.drivesq.co.uk/","sameAs":["https://www.instagram.com/drive_sq_academy","https://g.page/r/Cf5Ww977kUeEEBM/review"],',1) if '"@id":"https://www.drivesq.co.uk/#school"' not in ix else ix
ix = ix.replace('"name":"10-Hour Block Booking"},"price":"350"', '"name":"10-Hour Block Booking (new learners, first 10 hours)"},"price":"330"')
ix = ix.replace('"description":"10 hours of standard lessons — best value"','"description":"New learners: first 10 hours of standard lessons, paid in advance"')
if SLUG not in ix:
    ix = ix.replace('<a href="/areas.html" style="color:inherit;text-decoration:underline">All areas we cover</a>', '<a href="/areas.html" style="color:inherit;text-decoration:underline">All areas we cover</a> · <a href="/'+SLUG+'" style="color:inherit;text-decoration:underline">Why learners choose DriveSQ</a>', 1)
wr("index.html", ix)

# about: accuracy fixes (we do run ads now; rating is 5/5)
ab = rd("about.html")
ab = re.sub(r"\s*We have never relied on flashy advertising or unrealistic promises\.", " We keep our promises realistic: honest prices and no hidden fees.", ab)
ab = ab.replace("Our growth has been entirely organic, built on word-of-mouth recommendations from students who passed their test and told their friends.", "Our growth has come largely from word-of-mouth recommendations from students who passed their test and told their friends.")
ab = ab.replace(">4.9<", ">5.0<")
if SLUG not in ab:
    ab = ab.replace("</footer>", ' · <a href="/'+SLUG+'">Why learners choose DriveSQ</a></footer>', 1)
wr("about.html", ab)

# sitemap
sm = rd("sitemap-1.xml")
if SLUG not in sm:
    sm = sm.replace("</urlset>", f"  <url><loc>{URL}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
    wr("sitemap-1.xml", sm)
print("dup removed:", n, "| about 4.9 left:", "4.9" in rd("about.html"))
