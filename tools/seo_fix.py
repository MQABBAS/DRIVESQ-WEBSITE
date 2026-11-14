#!/usr/bin/env python3
"""DriveSQ SEO housekeeping (safe to re-run):
  1. retire duplicate homepages (noindex + canonical + refresh to /)
  2. canonicals always end in .html (matches the sitemap)
  3. Google review count -> REVIEWS everywhere (text + schema)
  4. areas.html hub + "More in <area>" related-links block on every area page
  5. regenerate sitemap-1.xml with every indexable page
"""
import re, glob, os, collections, datetime, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
REVIEWS = "180"
DUPES = ["improve1.html", "man.html", "new.html", "drivinglessonmanchester1.html", "DrivingLessonsManchester1.html", "manchesterdvsadrivingschool.html", "oldweb.html"]
PRIVATE = re.compile(r'^(admin|dashboard|student|ref|login|register|advertise|instructor-lesson-guide|email-|preview|test-page)', re.I)
TODAY = datetime.date.today().isoformat()
rd = lambda f: open(f, encoding="utf-8", errors="ignore").read()
def wr(f, s): open(f, "w", encoding="utf-8").write(s)
stats = collections.Counter()

# ---- 1. duplicate homepages
for f in DUPES:
    if not os.path.exists(f): continue
    s = rd(f)
    s = re.sub(r'<meta name="robots"[^>]*>\s*', "", s)
    s = re.sub(r'<link rel="canonical"[^>]*>\s*', "", s)
    s = re.sub(r'<meta http-equiv="refresh"[^>]*>\s*', "", s)
    s = s.replace("<head>", '<head>\n<meta name="robots" content="noindex,follow">\n<link rel="canonical" href="https://www.drivesq.co.uk/">\n<meta http-equiv="refresh" content="0;url=https://www.drivesq.co.uk/">', 1)
    wr(f, s); stats["dupes retired"] += 1

# ---- 2 + 3. canonicals and review count on every page
pages = sorted(glob.glob("*.html"))
for f in pages:
    s = rd(f); o = s
    s = re.sub(r'(rel="canonical" href="https://www\.drivesq\.co\.uk/)([a-z0-9\-]+)"', lambda m: m.group(1) + m.group(2) + '.html"' if os.path.exists(m.group(2) + ".html") else m.group(0), s)
    s = re.sub(r'\b(157|178|187|156|154|121)(\+?) (verified |five-star |5-star |Google )*reviews\b', lambda m: REVIEWS + " " + (m.group(3) or "") + "reviews", s)
    s = re.sub(r'("reviewCount": ?")(157|178|187|156|154|121)(")', r'\g<1>' + REVIEWS + r'\3', s)
    s = re.sub(r'\b(87|100\+) (verified )?(five-star |5-star |Google )?reviews\b', lambda m: REVIEWS + " " + (m.group(2) or "") + (m.group(3) or "") + "reviews", s)
    if s != o: wr(f, s); stats["pages updated (canonical/reviews)"] += 1

# ---- 4. area groups
def indexable(f):
    if PRIVATE.match(f) or f in DUPES or f == "index.html": return False
    return "noindex" not in rd(f)[:5000]
AREA = re.compile(r"\b(?:in|In|for|near)\s+([A-Z][A-Za-z'\-]+(?:\s(?:[A-Z][A-Za-z'\-]+|cum|on|upon|under|le|the))*?)\s*(?:,|\(|[–—|]|$| - | \d)")
LEAD = re.compile(r"^(?:Driving Lessons|Driving School|Automatic Driving Lessons|Intensive Driving Course[s]?|Driving Instructors?|Driving Tuition|Learn to Drive)\s+(?:in\s+)?([A-Z][A-Za-z'\-]+(?:\s[A-Z][A-Za-z'\-]+)*)")
DIST = re.compile(r"\b(M\d{1,2}|SK\d{1,2}|BL\d|OL\d{1,2}|WA\d{1,2}|B\d{2}|WN\d)\b")
BAD = {"Manchester", "Greater Manchester", "Your Area", "Me", "Confidence", "Mock Tests", "DriveSQ", "Learn", "Drive", "UK", "Solihull", "Birmingham", "Stockport", "Bolton", "Salford", "Trafford", "The",
       "For", "East", "West", "North", "South", "Automatic", "Automatic Car", "Manual", "Beginners", "Adults", "Jobs", "First-Time Passes", "International", "Car", "Area", "Areas", "New", "Your", "Home", "Local",
       "Online", "Mock", "Theory", "Test", "Tests", "Pass", "Students", "Women", "Female", "Nervous", "Older", "Young", "Teens", "Refresher", "Intensive", "Weekend", "Evenings", "Cheap", "Best", "Belle", "Adults Manchester"}
TOWNS = [("Manchester City Centre", "driving-lessons-manchester-city-centre.html"), ("Bolton", "driving-lessons-bolton.html"), ("Stockport", "driving-lessons-stockport.html"), ("Salford", "driving-lessons-salford.html"),
         ("Trafford", "driving-lessons-trafford.html"), ("Oldham", "driving-lessons-oldham.html"), ("Bury", "driving-lessons-bury.html"), ("Tameside", "driving-lessons-tameside.html"), ("Wigan", "driving-lessons-wigan.html"), ("Solihull", "driving-lessons-solihull.html")]
groups = collections.defaultdict(list); titles = {}
for f in pages:
    if not indexable(f): continue
    head = rd(f)[:4000]
    t = html.unescape((re.search(r"<title>([^<]*)", head) or [None, ""])[1]).strip()
    titles[f] = t
    m = AREA.search(t) or LEAD.match(t)
    a = m.group(1).strip() if m else None
    if a: a = re.sub(r"\s(SK|M|BL|OL|WA|B|WN|Sk|Stockport|Salford|Bolton|Trafford|Oldham|Bury|Tameside|Wigan|Solihull|Birmingham)$", "", a).strip()
    if a and a.endswith(" UK"): a = None
    if a and (a in BAD or len(a) < 3 or a.startswith(("Near ", "Jobs ", "Driving ", "Learn ")) or ("Manchester" in a and a != "Manchester City Centre")): a = None
    if not a:
        d = DIST.search(t) or DIST.search(f.upper().replace("-", " "))
        a = d.group(1) if d else None
    if a: groups[a].append(f)
# towns too (Bolton/Stockport/Salford/Solihull/Trafford/Birmingham appear in BAD so they get grouped by their main page only)
def region_of(files):
    c = collections.Counter()
    for f in files[:40]:
        for d in DIST.findall(rd(f)[:20000]): c[re.sub(r"\d.*", "", d)] += 1
    p = c.most_common(1)[0][0] if c else ""
    return {"M": "Manchester, Salford & Trafford", "SK": "Stockport & Cheshire", "BL": "Bolton & Bury", "OL": "Oldham, Rochdale & Tameside", "WA": "Warrington & Altrincham", "B": "Solihull & Birmingham", "WN": "Wigan"}.get(p, "Other areas")
def main_page(a, files):
    slug = re.sub(r"[^a-z0-9]+", "-", a.lower()).strip("-")
    for cand in (f"driving-lessons-{slug}.html", f"driving-lessons-in-{slug}.html", f"{slug}-driving-lessons.html", f"driving-school-{slug}.html"):
        if cand in files: return cand
    pref = [f for f in files if re.match(r"(?i)driving lessons (in )?" + re.escape(a) + r"\b", titles[f])]
    if pref: return min(pref, key=len)
    return min(files, key=len)
meta = {}
for a, files in list(groups.items()):
    slug = re.sub(r"[^a-z0-9]+", "-", a.lower()).strip("-")
    if len(files) < 2 and not any(slug in f for f in files): continue
    files = sorted(set(files)); meta[a] = {"files": files, "main": main_page(a, files), "region": region_of(files)}
# related block on every grouped page (first strip any old block everywhere, so pages that left a group are clean)
BLOCK_START, BLOCK_END = "<!-- DSQ-RELATED -->", "<!-- /DSQ-RELATED -->"
for f in pages:
    s = rd(f)
    if BLOCK_START in s: wr(f, re.sub(re.escape(BLOCK_START) + r".*?" + re.escape(BLOCK_END) + r"\s*", "", s, flags=re.S))
for a, g in meta.items():
    for f in g["files"]:
        s = rd(f)
        s = re.sub(re.escape(BLOCK_START) + r".*?" + re.escape(BLOCK_END) + r"\s*", "", s, flags=re.S)
        sibs = [x for x in g["files"] if x != f]
        # prefer the main page first, then up to 11 others spread through the list
        order = ([g["main"]] if g["main"] != f else []) + [x for x in sibs if x != g["main"]]
        step = max(1, len(order) // 11); pick = order[::step][:12]
        li = "".join(f'<li><a href="/{x}">{html.escape(re.sub(r"\s*[|—–-]\s*DriveSQ.*$", "", titles[x]))}</a></li>' for x in pick)
        block = (f'{BLOCK_START}<section class="dsq-related" aria-label="More driving lessons in {html.escape(a)}" style="max-width:1100px;margin:28px auto 8px;padding:16px 18px;border-radius:14px;background:rgba(127,127,127,.08);border:1px solid rgba(127,127,127,.22);font-size:.9rem;line-height:1.5">'
                 f'<h2 style="font-size:1.05rem;margin:0 0 8px">More driving lessons in {html.escape(a)}</h2>'
                 f'<ul style="columns:2;column-gap:24px;margin:0 0 10px;padding-left:18px">{li}</ul>'
                 f'<p style="margin:0;font-size:.82rem;opacity:.85">See <a href="/areas.html">all areas DriveSQ covers</a> · <a href="/">driving lessons Manchester</a> · <a href="/driving-lessons-solihull.html">Solihull</a></p></section>{BLOCK_END}\n')
        if "<footer" in s: s = s.replace("<footer", block + "<footer", 1)
        elif "</body>" in s: s = s.replace("</body>", block + "</body>", 1)
        else: continue
        wr(f, s); stats["related blocks"] += 1
# hub page
regions = collections.defaultdict(list)
for a, g in meta.items(): regions[g["region"]].append(a)
order = ["Manchester, Salford & Trafford", "Stockport & Cheshire", "Bolton & Bury", "Oldham, Rochdale & Tameside", "Warrington & Altrincham", "Wigan", "Solihull & Birmingham", "Other areas"]
secs = '<section><h2 id="main-towns">Main towns &amp; cities</h2><ul class="grid">' + "".join(f'<li><a href="/{f}">{html.escape(t)}</a></li>' for t, f in TOWNS if os.path.exists(f)) + "</ul></section>"
for r in order:
    if r not in regions: continue
    items = "".join(f'<li><a href="/{meta[a]["main"]}">{html.escape(a)}</a> <small>({len(meta[a]["files"])})</small></li>' for a in sorted(regions[r], key=lambda x: (DIST.fullmatch(x) is not None, x)))
    secs += f'<section><h2 id="{re.sub(r"[^a-z]+", "-", r.lower()).strip("-")}">{html.escape(r)}</h2><ul class="grid">{items}</ul></section>'
nareas = len(meta); npages = sum(len(g["files"]) for g in meta.values())
hub = f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>All Areas We Cover | Driving Lessons Across Greater Manchester, Stockport, Bolton &amp; Solihull | DriveSQ</title>
<meta name="description" content="Every area DriveSQ teaches in: {nareas} towns, suburbs and postcode districts across Greater Manchester, Stockport, Bolton, Trafford, Salford, Oldham, Tameside and Solihull. £35/hr manual or automatic, DVSA-approved instructors, same price everywhere.">
<link rel="canonical" href="https://www.drivesq.co.uk/areas.html"><meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:title" content="All areas DriveSQ covers"><meta property="og:description" content="{nareas} areas across Greater Manchester, Stockport, Bolton and Solihull — £35/hr manual or automatic."><meta property="og:url" content="https://www.drivesq.co.uk/areas.html">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"CollectionPage","name":"All areas DriveSQ covers","url":"https://www.drivesq.co.uk/areas.html","description":"Driving lessons in {nareas} areas across Greater Manchester, Stockport, Bolton and Solihull.","isPartOf":{{"@type":"WebSite","name":"DriveSQ","url":"https://www.drivesq.co.uk/"}},"about":{{"@type":"DrivingSchool","name":"DriveSQ","url":"https://www.drivesq.co.uk/","telephone":"+447352932003","priceRange":"££","areaServed":["Greater Manchester","Stockport","Bolton","Solihull"]}}}}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>:root{{--red:#D10A11;--gold:#F5C518;--ink:#1a1214;--bg:#f6f2ee;--card:#fff}}@media(prefers-color-scheme:dark){{:root{{--ink:#f3eeee;--bg:#0b0204;--card:#16080a}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,Arial,sans-serif;line-height:1.5}}a{{color:inherit}}.wrap{{max-width:1100px;margin:0 auto;padding:20px 16px 40px}}
header{{background:#0b0204;color:#fff;padding:14px 16px}}header .in{{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}}header b{{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem}}header b span{{color:#ff2d35}}header nav a{{color:#fff;text-decoration:none;margin-left:14px;font-weight:600;font-size:.9rem}}
h1{{font-family:'Barlow Condensed',sans-serif;font-size:2.4rem;line-height:1.05;margin:10px 0 6px;text-transform:uppercase}}h2{{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;margin:26px 0 8px;text-transform:uppercase;color:var(--red)}}
.lead{{font-size:1.02rem;max-width:760px}}.cta{{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 22px;margin:10px 10px 4px 0}}.cta.alt{{background:#25D366;color:#06210f}}
.grid{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px 14px}}.grid li{{background:var(--card);border:1px solid rgba(127,127,127,.25);border-radius:9px;padding:7px 10px;font-size:.92rem}}.grid a{{text-decoration:none;font-weight:600}}.grid small{{opacity:.6}}
.jump a{{display:inline-block;margin:4px 8px 4px 0;font-size:.85rem}}footer{{text-align:center;font-size:.8rem;opacity:.8;padding:20px}}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/#book-60">Book</a><a href="/reviews.html">Reviews</a><a href="/driving-lessons-solihull.html">Solihull</a></nav></div></header>
<main class="wrap"><h1>All the areas DriveSQ covers</h1>
<p class="lead">DriveSQ teaches in <strong>{nareas} areas</strong> across Greater Manchester, Stockport, Bolton, Trafford, Salford, Oldham, Tameside and Solihull — <strong>£35 an hour, manual or automatic, the same price everywhere</strong>, with DVSA-approved instructors who pick you up from home, college or work. New learners get their first 10 hours for £330. Pick your area below for local prices, test centres, pass rates and the roads you'll learn on.</p>
<a class="cta" href="/#book-60">Book in 60 seconds</a><a class="cta alt" href="https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27d%20like%20to%20book%20driving%20lessons" rel="nofollow noopener">WhatsApp 07352 932003</a>
<p class="jump"><a href="#main-towns">Main towns</a> {" ".join(f'<a href="#{re.sub(r"[^a-z]+", "-", r.lower()).strip("-")}">{html.escape(r)}</a>' for r in order if r in regions)}</p>
{secs}
<section><h2>Can't see your area?</h2><p>We cover most of Greater Manchester and Solihull. <a href="https://wa.me/447352932003" rel="nofollow noopener">WhatsApp us your postcode</a> and we'll tell you straight away which instructors are nearby.</p></section>
</main><footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/contact.html">Contact</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a></footer>
<script src="/dsq-analytics.js" defer></script></body></html>'''
wr("areas.html", hub); stats["hub areas"] = nareas; stats["hub pages linked"] = npages
# homepage footer link
ix = rd("index.html")
if "/areas.html" not in ix:
    ix = ix.replace('<a href="/driving-lessons-solihull.html" style="color:inherit;text-decoration:underline">Driving lessons in Solihull</a>', '<a href="/areas.html" style="color:inherit;text-decoration:underline">All areas we cover</a> · <a href="/driving-lessons-solihull.html" style="color:inherit;text-decoration:underline">Driving lessons in Solihull</a>', 1)
    wr("index.html", ix); stats["homepage hub link"] += 1

# ---- 5. sitemap
old = dict(re.findall(r"<loc>https://www\.drivesq\.co\.uk/([^<]*)</loc>\s*<lastmod>([^<]*)</lastmod>", rd("sitemap-1.xml")))
urls = []
for f in sorted(glob.glob("*.html")):
    if f == "index.html": urls.append(("", old.get("", TODAY))); continue
    if not indexable(f): continue
    _c = re.search(r'<link rel="canonical" href="([^"]*)"', rd(f))
    if _c and _c.group(1).rstrip("/") != "https://www.drivesq.co.uk/" + f: continue   # canonicalised to another URL: keep out of the sitemap
    urls.append((f, old.get(f, TODAY)))
body = "".join(f"  <url><loc>https://www.drivesq.co.uk/{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in urls)
wr("sitemap-1.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")
wr("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://www.drivesq.co.uk/sitemap-1.xml</loc><lastmod>{TODAY}</lastmod></sitemap>\n</sitemapindex>\n')
stats["sitemap urls"] = len(urls)
for k, v in stats.items(): print(f"{v:6}  {k}")
