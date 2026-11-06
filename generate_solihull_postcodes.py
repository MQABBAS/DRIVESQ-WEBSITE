#!/usr/bin/env python3
"""DriveSQ — Solihull postcode pages, built from real postcode data.
  driving-lessons-<district>.html   e.g. driving-lessons-b90.html   (16 districts in and around Solihull)
  driving-lessons-<sector>.html     e.g. driving-lessons-b90-1.html (42 postcode sectors)
  solihull-postcode-checker.html    any postcode → its sector, nearest test centres and nearest areas
Every page carries a map drawn from the real position of each postcode in it, distances to all 7 test centres,
the postcodes it covers, fuel and parking nearby, a lesson plan on its own roads, and links to the matching
DriveSQ area pages and SQ Driving School guides.
Data: _data/solihull_postcodes_full.json (UK postcode centroids, dwyl/uk-postcodes-latitude-longitude-complete-csv,
built from ONS/OS open data; newer postcodes may be missing), _data/solihull_sectors.json (exported from the SQ build).
Run: python3 generate_solihull_postcodes.py   (after generate_solihull_landing.py and generate_solihull_areas.py)"""
import importlib.util, json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("areas", os.path.join(HERE, "generate_solihull_areas.py"))
A = importlib.util.module_from_spec(_s)
_s.loader.exec_module(A)
L, e, SQS, SITE = A.L, A.e, A.SQS, A.SITE
PCS = json.load(open(os.path.join(HERE, "_data/solihull_postcodes_full.json"), encoding="utf-8"))
SD = json.load(open(os.path.join(HERE, "_data/solihull_sectors.json"), encoding="utf-8"))
SECT, PARK = SD["sectors"], SD["park"]
DISTRICTS = sorted({k.split()[0] for k in SECT}, key=lambda d: (d[:2] != "B9", d))
DNAME = {"B90": "Shirley, Monkspath & Dickens Heath", "B91": "Solihull town centre & Hillfield", "B92": "Olton, Lyndon, Elmdon & Hampton-in-Arden",
         "B93": "Knowle & Dorridge", "B94": "Hockley Heath & Earlswood", "B36": "Castle Bromwich & Smith's Wood", "B37": "Chelmsley Wood, Kingshurst & Marston Green",
         "CV7": "Balsall Common, Berkswell & Meriden", "B26": "Sheldon & Elmdon", "B25": "Yardley", "B27": "Acocks Green", "B28": "Hall Green",
         "B33": "Garretts Green, Kitts Green & Stechford", "B34": "Shard End", "B35": "Castle Vale", "B47": "Hollywood & Wythall"}
DCOUNCIL = {"B25": "Birmingham", "B27": "Birmingham", "B28": "Birmingham", "B33": "Birmingham", "B34": "Birmingham", "B35": "Birmingham", "B26": "Birmingham and Solihull",
            "B47": "Bromsgrove", "CV7": "Solihull (CV7 7) and Coventry/Warwickshire"}
AREA_PAGES = {a["slug"]: a["name"] for a in A.AREAS}
TODAY = "2026-11-06"


def slug(code):
    return "driving-lessons-" + code.lower().replace(" ", "-") + ".html"


def pts(code):
    return [(p[1], p[2]) for p in PCS.get(code, [])]


def ranked(p):
    return sorted((A.mi(p, A.TC[s]), s) for s in A.TC)


def bearing(a, b):
    y = math.sin(math.radians(b[1] - a[1])) * math.cos(math.radians(b[0]))
    x = math.cos(math.radians(a[0])) * math.sin(math.radians(b[0])) - math.sin(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.cos(math.radians(b[1] - a[1]))
    d = (math.degrees(math.atan2(y, x)) + 360) % 360
    return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][int((d + 22.5) // 45) % 8]


COLS = ["#D10A11", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#4b5563"]


def svg_map(groups, title, marks=()):
    """groups: [(label, colour, [(lat,lon)...])]; marks: [(label, (lat,lon))] drawn as flags if inside the frame."""
    allp = [p for _, _, ps in groups for p in ps]
    if not allp:
        return ""
    la0, la1 = min(p[0] for p in allp), max(p[0] for p in allp)
    lo0, lo1 = min(p[1] for p in allp), max(p[1] for p in allp)
    k = math.cos(math.radians((la0 + la1) / 2))
    w, h = max((lo1 - lo0) * k, 0.004), max(la1 - la0, 0.004)
    pad = .12
    W, H = 600, max(260, min(460, int(600 * h / w)))
    sx = W * (1 - 2 * pad) / w
    sy = H * (1 - 2 * pad) / h
    s = min(sx, sy)
    ox, oy = (W - w * s) / 2, (H - h * s) / 2
    P = lambda la, lo: (ox + (lo - lo0) * k * s, oy + (la1 - la) * s)
    out = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{e(title)}" style="width:100%;height:auto;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px">']
    for x in range(0, W, 50):
        out.append(f'<line x1="{x}" y1="0" x2="{x}" y2="{H}" stroke="#eef2f7"/>')
    for y in range(0, H, 50):
        out.append(f'<line x1="0" y1="{y}" x2="{W}" y2="{y}" stroke="#eef2f7"/>')
    for lab, col, ps in groups:
        for la, lo in ps:
            x, y = P(la, lo)
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="{col}" fill-opacity=".72"/>')
    for lab, (la, lo) in marks:
        x, y = P(la, lo)
        if -5 <= x <= W + 5 and -5 <= y <= H + 5:
            out.append(f'<g><circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="#111"/><text x="{x + 10:.1f}" y="{y + 4:.1f}" font-size="13" font-family="Inter,Arial,sans-serif" font-weight="700" fill="#111">🏁 {e(lab)}</text></g>')
    # scale bar: 1 mile
    mpx = s / 69.0
    out.append(f'<g font-family="Inter,Arial,sans-serif" font-size="12" fill="#475569"><line x1="16" y1="{H - 16}" x2="{16 + mpx:.0f}" y2="{H - 16}" stroke="#475569" stroke-width="3"/><text x="16" y="{H - 22}">1 mile</text><text x="{W - 16}" y="22" text-anchor="end">N ↑</text></g>')
    out.append("</svg>")
    if len(groups) > 1:
        out.append('<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:.78rem;color:#475569">' + "".join(f'<span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:{c};margin-right:5px"></i>{e(l)}</span>' for l, c, _ in groups) + "</div>")
    return "".join(out)


def centre_rows(rk):
    return "".join(f'<tr><td><a href="{SQS}{s}-driving-test-centre-routes.html">{e(A.CEN[s][0])}</a></td><td>{d:.1f} miles</td><td>{A.CEN[s][2]}%</td></tr>' for d, s in rk)


def fuel_near(p, r=2.5):
    f = sorted(((A.mi(p, (x["lat"], x["lon"])), x) for x in A.D["fuel"]), key=lambda t: t[0])
    return [t for t in f if t[0] <= r][:4]


def plan(code, sec, c1):
    r = sec["roads"]
    st = [("Lessons 1–4: clutch control and moving off", f"Quiet streets in {code}, picked up from your door."),
          ("Lessons 5–9: junctions and mirrors", f"Side roads off {r[0]}."),
          ("Lessons 10–14: roundabouts and lane choice", f"{r[1] if len(r) > 1 else r[0]} and the junctions around it."),
          ("Lessons 15–20: faster roads", "The nearest A-roads and dual carriageways — and, with an ADI, the M42."),
          ("Lessons 21+: manoeuvres and independent driving", "Real car parks and sat-nav drives, tracked in your Student Portal."),
          ("Before you book your test: a mock test", f"A full mock test around {c1}, marked like the real thing.")]
    return '<ol style="padding-left:18px">' + "".join(f'<li class="reveal" style="margin:0 0 12px"><b>{t}</b><br><span style="color:#555">{d}</span></li>' for t, d in st) + "</ol>"


def faq_and_schema(name, fname, faqs, codes):
    biz = L.biz_schema(fname)
    biz.update({"@id": f"{SITE}/{fname}#school", "name": f"DriveSQ — Driving Lessons {name}",
                "areaServed": [{"@type": "Place", "name": c, "address": {"@type": "PostalAddress", "postalCode": c, "addressCountry": "GB"}} for c in codes],
                "sameAs": [SITE + "/driving-lessons-solihull.html"]})
    return [biz, L.faq_schema(faqs), L.crumbs(name, fname)]


def sector_page(code):
    sec = SECT[code]
    ps = pts(code)
    c = (sec["lat"], sec["lon"])
    rk = ranked(c)
    d1, s1 = rk[0]
    n1, addr1, r1 = A.CEN[s1]
    best = max(rk[:3], key=lambda t: A.CEN[t[1]][2])
    district = code.split()[0]
    kind = sec["kind"] if sec["kind"] in A.KIND else "suburb"
    kp, kfocus, kstart = A.KIND[kind]
    near = sorted((A.mi(c, (v["lat"], v["lon"])), k) for k, v in SECT.items() if k != code)[:6]
    fuel = fuel_near(c)
    areas = [(A.fname(s), AREA_PAGES[s]) for s in sec["aslugs"] if s in AREA_PAGES]
    codes = [p[0] for p in PCS.get(code, [])]
    eg = codes[len(codes) // 2] if codes else code
    pick = (f"Of the three closest, {A.CEN[best[1]][0]} had the highest pass rate ({A.CEN[best[1]][2]}%)." if best[1] != s1 else f"{n1} also had the highest pass rate of the three closest.")
    intro = (f"{code} covers {sec['areas']}. It's {kp}, so lessons here focus on {kfocus}. {kstart} "
             f"From the middle of {code}, {n1} test centre is about {d1:.1f} miles to the {bearing(c, A.TC[s1])} in a straight line ({r1}% pass rate in 2024-25).")
    mapsvg = svg_map([(code, "#D10A11", ps)], f"Map of the {len(ps)} postcodes in {code}", [(n1, A.TC[s1])])
    local = ""
    if fuel:
        local += '<div class="sol-card reveal"><b>Fuel stations nearby</b><span><ul class="mt-2 mb-0">' + "".join(f'<li>{e(f["name"])} — {e(f["addr"])} ({d:.1f} mi)</li>' for d, f in fuel) + f'</ul><a href="{SQS}petrol-stations-solihull-learner-guide.html">First fill-up guide →</a></span></div>'
    if sec.get("park"):
        local += '<div class="sol-card reveal"><b>Parking and shops</b><span><ul class="mt-2 mb-0">' + "".join(f"<li><b>{e(n)}</b> — {e(d)}</li>" for n, d in PARK.get(sec["park"], [])) + f'</ul><a href="{SQS}car-parks-solihull-learner-guide.html">Car parks for learners →</a></span></div>'
    if sec["rg"]:
        local += '<div class="sol-card reveal"><b>Road guides</b><span>' + " · ".join(f'<a href="{SQS}{r}.html">{e(A.ROADG.get(r, r))}</a>' for r in sec["rg"]) + "</span></div>"
    local += f'<div class="sol-card reveal"><b>More about {e(code)}</b><span><a href="{SQS}postcode-{code.lower().replace(" ", "-")}-driving-lessons.html">SQ Driving School\'s {e(code)} guide</a> · <a href="{slug(district)}">all of {district}</a> · <a href="solihull-postcode-checker.html">postcode checker</a></span></div>'
    secs = [
        f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>{d1:.1f} mi</b><span>to {e(n1)} test centre</span></div><div><b>{r1}%</b><span>its pass rate 2024-25</span></div><div><b>{len(ps)}</b><span>postcodes in {e(code)}</span></div><div><b>£35</b><span>per hour, manual or auto</span></div></div></div></section>',
        L.sec("learn", f"Driving lessons in {e(code)}", f"Learning to drive in {e(code)}", e(intro),
              f'<div class="row g-4 mt-1"><div class="col-lg-7"><div class="reveal">{mapsvg}</div><p class="sol-note mt-2">Each dot is a postcode in {e(code)}. 🏁 marks {e(n1)} test centre when it fits on the map.</p></div>'
              f'<div class="col-lg-5"><div class="sol-card reveal"><b>Roads you\'ll learn on</b><span><ul class="mt-2 mb-0">{"".join(f"<li>{e(r)}</li>" for r in sec["roads"])}</ul></span></div>'
              + (f'<div class="sol-card reveal mt-3"><b>Areas in {e(code)}</b><span>' + " · ".join(f'<a href="{h}">{e(t)}</a>' for h, t in areas) + "</span></div>" if areas else "")
              + '<div class="sol-card reveal mt-3"><b>Your instructor</b><span>An ADI (green badge) or a PDI (trainee, pink badge) — we tell you which before you book. Motorway lessons are always with an ADI.</span></div></div></div>'),
        L.sec("plan", "Lesson plan", f"Your lesson plan in {e(code)}", "How lessons usually build up — your instructor adjusts it to you.", plan(code, sec, n1), alt=True),
        L.sec("test-centres", "Driving test centres", f"Which test centre for {e(code)}?", f"Straight-line distances from the middle of {e(code)} to all seven centres. {pick}",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Test centre</th><th>From {e(code)}</th><th>Pass rate 2024-25</th></tr></thead><tbody>{centre_rows(rk)}</tbody></table></div><p class="sol-note mt-2">Pass rates: passrates.uk analysis of DVSA data. Driving distances are longer than straight-line.</p>'),
        L.sec("postcodes", "Postcodes", f"Every postcode we cover in {e(code)}", f"We pick up from every postcode in {e(code)} — {len(codes)} in the public postcode data. Newer postcodes on recent developments are covered too.",
              f'<details class="reveal" style="background:#fff;border:1px solid #eee;border-radius:12px;padding:12px 16px"><summary style="cursor:pointer;font-weight:700">Show all {len(codes)} postcodes in {e(code)}</summary><p style="font-size:.82rem;line-height:1.9;color:#444;margin-top:10px;word-spacing:4px">{" · ".join(e(x) for x in codes)}</p></details>'
              f'<p class="sol-note mt-2">Not sure which sector you\'re in? <a href="solihull-postcode-checker.html">Check your postcode →</a></p>', alt=True),
        L.sec("local", "Local", f"Around {e(code)}", "Fuel, parking and guides for this postcode.", f'<div class="sol-grid">{local}</div>'),
        L.sec("portal-features", "DriveSQ Student Portal", f"Free for every learner in {e(code)}",
              f"Your own learning app from DriveSQ, included with your lessons: track progress, practise 700+ theory questions and know when you're ready for {e(n1)}.",
              L.cards([L.STUDENT_FEATURES[(sorted(SECT).index(code) * 5 + i) % len(L.STUDENT_FEATURES)] for i in range(3)]) + '<div class="dsqx-ctas mt-4"><a class="dsqx-btn dsqx-btn--red" href="student.html"><i class="bi bi-mortarboard-fill"></i>Open the Student Portal</a><a class="dsqx-btn dsqx-btn--ghost" href="driving-lessons-solihull.html#portal-features"><i class="bi bi-grid"></i>All features</a></div>', alt=True),
        L.sec("nearby", "Nearby", f"Postcodes near {e(code)}", "Every neighbouring sector has its own page.",
              L.chips([(slug(k), f"{k} ({d:.1f} mi)") for d, k in near] + [(slug(district), f"All of {district}"), ("solihull-postcode-checker.html", "All Solihull postcodes")])),
    ]
    faqs = [(f"Do you give driving lessons in {code}?", f"Yes — door-to-door pick-up anywhere in {code} ({sec['areas']}), manual or automatic, from £35 an hour."),
            (f"Which test centre is nearest to {code}?", f"{n1} ({addr1}), about {d1:.1f} miles away in a straight line. {pick}"),
            (f"Do you cover {eg}?", f"Yes — {eg} is in {code}, and we cover every postcode in it."),
            (f"How much are driving lessons in {code}?", "£35 an hour for lessons of 2 hours or more, £40 for a single hour, £350 for 10 hours (£320 for NHS staff and students)."),
            ("Is the Student Portal free?", "Yes — every DriveSQ learner gets it free: progress tracking, 700+ theory questions, 14 mock tests and instructor messaging.")]
    secs += [L.faq_html(faqs), L.booking()]
    hero = L.hero(f"{e(DNAME.get(district, district))} · {e(code)}", f'<span class="w">Driving</span> <span class="w w--red">Lessons</span> <span class="w">{e(code)}.</span>',
                  f"{d1:.1f} miles from {e(n1)} test centre · free DriveSQ Student Portal",
                  [("bi-person-badge", "ADI &amp; PDI instructors"), ("bi-phone", "Free Student Portal"), ("bi-gear-wide-connected", "Manual &amp; auto · £35/hr")],
                  [("red", "#book", "bi-calendar-check-fill", "Book a lesson"), ("ghost", "#postcodes", "bi-geo-alt-fill", "Postcodes covered")])
    f = slug(code)
    return f, L.page(f, f"Driving Lessons {code} | {sec['areas'].split(',')[0].split(' (')[0][:40]} | DriveSQ",
                     f"Driving lessons in {code} ({sec['areas'].split(' (')[0]}): £35/hr, {d1:.1f} miles from {n1} test centre, every postcode covered, local lesson plan and the free DriveSQ Student Portal.",
                     f"driving lessons {code.lower()}, driving instructor {code.lower()}, driving school {code.lower()}, automatic driving lessons {code.lower()}",
                     faq_and_schema(code, f, faqs, [code]), hero, secs)


def district_page(dist):
    codes = sorted(k for k in SECT if k.split()[0] == dist)
    allp = [p for k in codes for p in pts(k)]
    c = (sum(p[0] for p in allp) / len(allp), sum(p[1] for p in allp) / len(allp))
    rk = ranked(c)
    d1, s1 = rk[0]
    n1 = A.CEN[s1][0]
    rows = ""
    for k in codes:
        kr = ranked((SECT[k]["lat"], SECT[k]["lon"]))[0]
        rows += f'<tr><td><a href="{slug(k)}">{e(k)}</a></td><td>{e(SECT[k]["areas"])}</td><td>{len(pts(k))}</td><td>{e(A.CEN[kr[1]][0])} ({kr[0]:.1f} mi)</td></tr>'
    groups = [(k, COLS[i % len(COLS)], pts(k)) for i, k in enumerate(codes)]
    aslugs = []
    for k in codes:
        for s in SECT[k]["aslugs"]:
            if s in AREA_PAGES and s not in aslugs:
                aslugs.append(s)
    roads = []
    for k in codes:
        for r in SECT[k]["roads"]:
            if r not in roads and "lanes" not in r and "roads" not in r:
                roads.append(r)
    fuel = sorted({f["name"]: (d, f) for k in codes for d, f in fuel_near((SECT[k]["lat"], SECT[k]["lon"]), 2.0)}.values(), key=lambda t: t[0])[:6]
    council = DCOUNCIL.get(dist, "Solihull")
    other = [d for d in DISTRICTS if d != dist]
    secs = [
        f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>{len(codes)}</b><span>postcode sectors</span></div><div><b>{len(allp)}</b><span>postcodes covered</span></div><div><b>{d1:.1f} mi</b><span>to {e(n1)} (from the middle)</span></div><div><b>£35</b><span>per hour, manual or auto</span></div></div></div></section>',
        L.sec("map", f"Driving lessons in {e(dist)}", f"{e(dist)}: {e(DNAME.get(dist, ''))}",
              f"{e(dist)} is in {e(council)}. Every coloured dot below is a postcode, grouped by sector — each sector has its own page with distances to every test centre, its roads and every postcode in it.",
              f'<div class="reveal">{svg_map(groups, f"Map of postcodes in {dist} by sector", [(A.CEN[s][0], A.TC[s]) for _, s in rk[:2]])}</div>'),
        L.sec("sectors", "Postcode sectors", f"Every sector in {e(dist)}", "Tap a sector for its full local guide.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Sector</th><th>Covers</th><th>Postcodes</th><th>Nearest test centre</th></tr></thead><tbody>{rows}</tbody></table></div>', alt=True),
        L.sec("test-centres", "Driving test centres", f"Test centres from {e(dist)}", "Straight-line distances from the middle of the district.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Test centre</th><th>From {e(dist)}</th><th>Pass rate 2024-25</th></tr></thead><tbody>{centre_rows(rk)}</tbody></table></div>'),
    ]
    inner = ""
    if aslugs:
        inner += '<div class="area-head mt-2">Areas</div>' + L.chips([(A.fname(s), AREA_PAGES[s]) for s in aslugs])
    if roads:
        inner += '<div class="area-head mt-3">Main roads</div><p style="font-size:.9rem;color:#444">' + " · ".join(e(r) for r in roads) + "</p>"
    if fuel:
        inner += '<div class="area-head mt-3">Fuel stations</div><ul style="font-size:.9rem;color:#444">' + "".join(f'<li>{e(f["name"])} — {e(f["addr"])}</li>' for d, f in fuel) + "</ul>"
    inner += f'<p class="sol-note mt-2">SQ Driving School\'s <a href="{SQS}{dist.lower()}-driving-lessons.html">{e(dist)} guide</a> · <a href="solihull-postcode-checker.html">postcode checker</a></p>' if dist in ("B90", "B91", "B92", "B93", "B94", "B36", "B37", "CV7") else f'<p class="sol-note mt-2"><a href="solihull-postcode-checker.html">Check any postcode →</a></p>'
    secs.append(L.sec("local", "Local", f"Areas, roads and fuel in {e(dist)}", "", inner, alt=True))
    secs.append(L.sec("portal-features", "DriveSQ Student Portal", f"Free for every learner in {e(dist)}", "Lesson tracking, progress charts, 700+ theory questions, 14 mock tests and messaging — included with your lessons.",
                      L.cards(L.STUDENT_FEATURES[3:6]) + '<div class="dsqx-ctas mt-4"><a class="dsqx-btn dsqx-btn--red" href="student.html"><i class="bi bi-mortarboard-fill"></i>Open the Student Portal</a></div>'))
    secs.append(L.sec("more", "Nearby", "Other postcode districts", "", L.chips([(slug(d), f"{d} — {DNAME.get(d, '')}") for d in other])))
    faqs = [(f"Do you give driving lessons in {dist}?", f"Yes — every postcode in {dist} ({DNAME.get(dist, '')}), manual or automatic, from £35 an hour."),
            (f"Which test centre is nearest to {dist}?", f"From the middle of {dist}, {n1} is about {d1:.1f} miles away in a straight line — each sector page shows its own nearest centre."),
            (f"Which postcode sectors are in {dist}?", ", ".join(codes) + "."),
            ("Who will teach me?", "An ADI (green badge) or a PDI (trainee, pink badge) — we tell you which before you book.")]
    secs += [L.faq_html(faqs), L.booking()]
    hero = L.hero(f"{e(council)} · {len(codes)} sectors", f'<span class="w">Driving</span> <span class="w w--red">Lessons</span> <span class="w">{e(dist)}.</span>',
                  f"{e(DNAME.get(dist, ''))} · free DriveSQ Student Portal",
                  [("bi-person-badge", "ADI &amp; PDI instructors"), ("bi-phone", "Free Student Portal"), ("bi-gear-wide-connected", "Manual &amp; auto · £35/hr")],
                  [("red", "#book", "bi-calendar-check-fill", "Book a lesson"), ("ghost", "#sectors", "bi-geo-alt-fill", "Every sector")])
    f = slug(dist)
    return f, L.page(f, f"Driving Lessons {dist} | {DNAME.get(dist, '')} | DriveSQ",
                     f"Driving lessons in {dist} ({DNAME.get(dist, '')}): every postcode covered, {len(codes)} sector guides, nearest test centres and the free DriveSQ Student Portal. £35/hr.",
                     f"driving lessons {dist.lower()}, driving instructor {dist.lower()}, driving school {dist.lower()}", faq_and_schema(dist, f, faqs, codes), hero, secs)


def checker_page():
    # compact lookup: postcode -> [lat, lon]; sector centroids for postcodes missing from the data
    look = {p[0].replace(" ", ""): [p[1], p[2]] for k, v in PCS.items() if re.match(r"^[A-Z]{1,2}\d{1,2} \d$", k) and k.split()[0] in DISTRICTS for p in v}
    json.dump({"p": look, "s": {k: [v["lat"], v["lon"]] for k, v in SECT.items()}}, open(os.path.join(HERE, "solihull-postcodes.json"), "w"), separators=(",", ":"))
    data = {"tc": [{"n": A.CEN[s][0], "a": A.CEN[s][1], "r": A.CEN[s][2], "slug": s, "lat": p[0], "lon": p[1]} for s, p in A.TC.items()],
            "areas": [{"n": a["name"], "f": A.fname(a["slug"]), "lat": A.PTS[a["slug"]]["lat"], "lon": A.PTS[a["slug"]]["lon"]} for a in A.AREAS],
            "sec": {k: {"a": v["areas"], "f": slug(k), "lat": v["lat"], "lon": v["lon"]} for k, v in SECT.items()},
            "dist": {d: {"f": slug(d), "n": DNAME.get(d, "")} for d in DISTRICTS}, "sqs": SQS}
    tool = """<div class="sol-card reveal" style="padding:22px"><label for="pcIn" style="font-weight:700;display:block;margin-bottom:8px">Your postcode</label>
<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="pcIn" class="form-control" style="max-width:260px;text-transform:uppercase" placeholder="e.g. B91 3QJ" maxlength="8" autocomplete="postal-code">
<button id="pcGo" class="dsqx-btn dsqx-btn--red" type="button"><i class="bi bi-search"></i>Check</button></div><div id="pcOut" aria-live="polite" class="mt-3"></div>
<p class="sol-note mt-2">Nothing you type is saved or sent anywhere — the lookup runs in your browser.</p></div>
<script>(function(){var D=""" + json.dumps(data) + """,P=null;
function mi(a,b,c,d){var R=3958.8,r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2);var h=x*x+Math.cos(a*r)*Math.cos(c*r)*y*y;return 2*R*Math.asin(Math.sqrt(h));}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
async function run(){var o=document.getElementById('pcOut'),raw=document.getElementById('pcIn').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
if(raw.length<5){o.innerHTML='<p>Enter a full postcode, like B91 3QJ.</p>';return;}
if(!P){o.innerHTML='<p>Looking up…</p>';try{P=await (await fetch('solihull-postcodes.json')).json();}catch(e){o.innerHTML='<p>Couldn\\'t load the postcode list — please try again.</p>';return;}}
var dist=raw.slice(0,-3),sec=dist+' '+raw.slice(-3,-2),pc=dist+' '+raw.slice(-3),g=P.p[raw],exact=!!g;if(!g&&P.s[sec])g=P.s[sec];
if(!g&&D.dist[dist]){var cs=Object.keys(D.sec).filter(function(k){return k.split(' ')[0]===dist;});if(cs.length)g=[cs.reduce(function(t,k){return t+D.sec[k].lat;},0)/cs.length,cs.reduce(function(t,k){return t+D.sec[k].lon;},0)/cs.length];}
if(g&&D.dist[dist]&&!D.sec[sec]){var best=null,bd=1e9;Object.keys(D.sec).forEach(function(k){if(k.split(' ')[0]!==dist)return;var d=mi(g[0],g[1],D.sec[k].lat,D.sec[k].lon);if(d<bd){bd=d;best=k;}});if(best){D.sec[sec]={a:'next to '+best+' ('+D.sec[best].a+')',f:D.sec[best].f,lat:D.sec[best].lat,lon:D.sec[best].lon};}}
if(!g||!D.sec[sec]){o.innerHTML='<p><b>'+esc(pc)+'</b> isn\\'t in the Solihull area we cover on these pages. We may still cover you — <a href="https://wa.me/447352932003?text='+encodeURIComponent('Hi DriveSQ! Do you cover '+pc+'?')+'" target="_blank" rel="noopener">ask on WhatsApp</a>.</p>';return;}
var tc=D.tc.map(function(t){return{t:t,d:mi(g[0],g[1],t.lat,t.lon)};}).sort(function(a,b){return a.d-b.d;}).slice(0,3);
var ar=D.areas.map(function(a){return{a:a,d:mi(g[0],g[1],a.lat,a.lon)};}).sort(function(a,b){return a.d-b.d;}).slice(0,3);
o.innerHTML='<p style="font-size:1.05rem"><b>'+esc(pc)+'</b> is in sector <a href="'+D.sec[sec].f+'"><b>'+sec+'</b></a> — '+esc(D.sec[sec].a)+'.'+(exact?'':' <span class="sol-note">(new postcode — using the middle of '+sec+')</span>')+'</p>'+
'<div class="sol-kpi" style="margin-top:10px">'+tc.map(function(x){return'<div><b>'+x.d.toFixed(1)+' mi</b><span>'+esc(x.t.n)+' · '+x.t.r+'% pass rate</span></div>';}).join('')+'</div>'+
'<p class="mt-3">Nearest areas: '+ar.map(function(x){return'<a href="'+x.a.f+'">'+esc(x.a.n)+'</a> ('+x.d.toFixed(1)+' mi)';}).join(' · ')+'</p>'+
'<p class="mt-2"><a class="dsqx-btn dsqx-btn--red" href="'+D.sec[sec].f+'"><i class="bi bi-geo-alt-fill"></i>Driving lessons in '+sec+'</a> <a class="dsqx-btn dsqx-btn--wa" target="_blank" rel="noopener" href="https://wa.me/447352932003?text='+encodeURIComponent('Hi DriveSQ! I\\'d like driving lessons. My postcode is '+pc+'.')+'"><i class="bi bi-whatsapp"></i>Book on WhatsApp</a></p>'+
'<p class="sol-note">Straight-line distances; pass rates 2024-25 (passrates.uk, DVSA data).</p>';}
document.getElementById('pcGo').addEventListener('click',run);document.getElementById('pcIn').addEventListener('keydown',function(e){if(e.key==='Enter')run();});})();</script>"""
    directory = "".join(f'<div class="area-head mt-3"><a href="{slug(d)}">{e(d)}</a> — {e(DNAME.get(d, ""))}</div>' + L.chips([(slug(k), f"{k} · {SECT[k]['areas'].split(',')[0].split(' (')[0][:38]}") for k in sorted(SECT) if k.split()[0] == d]) for d in DISTRICTS)
    total = sum(len(PCS.get(k, [])) for k in SECT)
    secs = [L.sec("checker", "Postcode checker", "Check your postcode", f"Type any postcode in or around Solihull to see its sector, your nearest test centres and the closest areas — {total:,} postcodes in {len(SECT)} sectors.", tool),
            L.sec("all", "Every postcode", "All Solihull postcode districts and sectors", "Each one has its own local driving guide.", directory, alt=True),
            L.faq_html([("Which postcodes does DriveSQ cover in Solihull?", "Every postcode in B90, B91, B92, B93, B94, B36, B37 and CV7 7, plus the neighbouring Birmingham and Bromsgrove districts listed here."),
                        ("Is my postcode saved when I use the checker?", "No — the lookup runs in your browser and nothing is sent.")]),
            L.booking()]
    hero = L.hero(f"{len(SECT)} sectors · {total:,} postcodes", '<span class="w">Solihull</span> <span class="w w--red">Postcode</span> <span class="w">Checker.</span>',
                  "every postcode, its nearest test centres and local driving guide",
                  [("bi-geo-alt", f"{len(DISTRICTS)} districts"), ("bi-grid-3x3", f"{len(SECT)} sectors"), ("bi-phone", "Free Student Portal")],
                  [("red", "#checker", "bi-search", "Check your postcode"), ("ghost", "#all", "bi-list-ul", "Browse all postcodes")])
    f = "solihull-postcode-checker.html"
    faqs = [("Which postcodes does DriveSQ cover in Solihull?", "Every postcode in B90, B91, B92, B93, B94, B36, B37 and CV7 7, plus neighbouring districts.")]
    return f, L.page(f, "Solihull Postcode Checker | Driving Lessons by Postcode | DriveSQ",
                     f"Check any Solihull postcode: its sector, nearest driving test centres and local driving guide. {total:,} postcodes across {len(SECT)} sectors — B90 to B94, B36, B37, CV7 and more.",
                     "solihull postcodes, driving lessons by postcode solihull, b90 b91 b92 b93 b94 driving lessons, solihull postcode checker",
                     [L.faq_schema(faqs), L.crumbs("Postcode checker", f)], hero, secs)


def main():
    out = dict([sector_page(k) for k in SECT] + [district_page(d) for d in DISTRICTS] + [checker_page()])
    for f, h in out.items():
        open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml")
    x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
