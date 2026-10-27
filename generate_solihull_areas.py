#!/usr/bin/env python3
"""DriveSQ — one page for every Solihull area (driving-lessons-<area>.html), on the Solihull landing design.
Each page is built from that area's own data: distances from the area to all 7 test centres (straight line, from an
approximate area point checked against nearby postcodes), its postcode sectors, roads and landmarks, fuel stations
within 2.5 miles, the nearest other areas, and a lesson plan that uses those roads. Every page promotes the free
DriveSQ Student and Instructor Portals and links page-to-page with the matching SQ Driving School guides.
Data: _data/solihull_areas.json (exported from the SQ Driving School build) and _data/solihull_area_points.json.
Run: python3 generate_solihull_areas.py   (after generate_solihull_landing.py)"""
import importlib.util, json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("land", os.path.join(HERE, "generate_solihull_landing.py"))
L = importlib.util.module_from_spec(_s)
_s.loader.exec_module(L)
G, e, SQ, SQS, SITE = L.G, L.e, L.SQ, L.SQS, L.SITE
D = json.load(open(os.path.join(HERE, "_data/solihull_areas.json"), encoding="utf-8"))
PTS = json.load(open(os.path.join(HERE, "_data/solihull_area_points.json"), encoding="utf-8"))
AREAS = [a for a in D["areas"] if a["slug"] in PTS]
ROADG = dict(D["roads"])
TC = {"shirley": (52.40429, -1.82203), "garretts-green": (52.47267, -1.77128), "south-yardley": (52.45396, -1.81010), "kings-heath": (52.40657, -1.88712),
      "coventry": (52.46378, -1.47516), "warwick": (52.291, -1.597), "redditch": (52.30854, -1.94704)}
CEN = {s: (n, a, r) for n, a, r, s in L.CENTRES}
DISTRICT = {"hollywood": "Bromsgrove district", "wythall": "Bromsgrove district", "tanworth-in-arden": "Stratford-on-Avon district", "lapworth": "Warwick district",
            "packwood": "Warwick district", "solihull-lodge": "the Solihull–Birmingham boundary"}


def fname(slug):
    return f"driving-lessons-{slug}.html"


def mi(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


def pt(a):
    return (PTS[a["slug"]]["lat"], PTS[a["slug"]]["lon"])


# DriveSQ's own wording by type of area — what lessons focus on, and the step up
KIND = {
    "village": ("a village", "country lanes, village limits and bends you can't see round", "Village roads are quiet, so we use them to build control before heading to busier roads."),
    "suburb": ("a residential area", "parked cars, side roads and mini-roundabouts", "Residential streets give plenty of junction practice close to home."),
    "town": ("a busy town area", "lanes, signals, crossings and car parks", "There's a lot happening in a small space, so we start on quieter side streets nearby."),
    "estate": ("an estate area", "speed humps, long estate roads and joining main roads", "Long estate roads are ideal for clutch control, turning and manoeuvres."),
    "city": ("a city neighbourhood", "busy junctions, bus lanes and filter lights", "Busy roads come quickly, so we build the basics on quieter streets first."),
}
FOCUS = ["Clutch control and moving off", "Junctions and mirrors", "Roundabouts and lane choice", "Faster roads and dual carriageways", "Manoeuvres and independent driving", "Mock test on your centre's routes"]


def plan(a, c1):
    r = a["roads"]
    steps = [(f"Lessons 1–4: {FOCUS[0]}", f"Quiet streets near {a['near'][0]} — we drive you there for your first lesson."),
             (f"Lessons 5–9: {FOCUS[1]}", f"Side roads and junctions off {r[0]}."),
             (f"Lessons 10–14: {FOCUS[2]}", f"{r[1] if len(r) > 1 else r[0]} and the roundabouts around it."),
             (f"Lessons 15–20: {FOCUS[3]}", "The A34, A41, A45 or A452 — whichever is closest — and, with an ADI, the M42."),
             (f"Lessons 21+: {FOCUS[4]}", "Parking in real car parks and sat-nav drives, tracked in your Student Portal."),
             (f"Before booking: {FOCUS[5]}", f"A full mock test around {c1}, marked like the real thing.")]
    return '<ol class="sol-plan" style="padding-left:18px">' + "".join(f'<li class="reveal" style="margin:0 0 12px"><b>{t}</b><br><span style="color:#555">{d}</span></li>' for t, d in steps) + "</ol>"


# one honest line per area, in DriveSQ's own words
WHY = {
    "shirley": "Shirley has the borough's own test centre on the A34, so lessons here can finish on the very roads examiners use.",
    "solihull-town-centre": "Touchwood, the station and the town-centre roads make the centre the busiest — and most varied — place to learn in the borough.",
    "olton": "Olton sits on the A41 between Solihull and Acocks Green, with its own station and the reservoir known as Olton Mere.",
    "knowle": "Knowle's high street sits on the A4141 between Solihull and Warwick, with village-centre parking and pedestrians to plan around.",
    "dorridge": "Dorridge grew up around its railway station and is one of the calmest places in the borough for first lessons.",
    "chelmsley-wood": "Chelmsley Wood was built in the 1960s and 70s as a very large housing estate with its own shopping centre — long estate roads and busy main roads side by side.",
    "castle-bromwich": "Castle Bromwich sits on the A452 Chester Road at the north of the borough, close to Castle Bromwich Hall Gardens.",
    "kingshurst-smiths-wood": "Kingshurst and Smith's Wood are neighbouring north Solihull estates with quick access to the A452 and the motorway network.",
    "marston-green": "Marston Green has its own station and sits right next to Birmingham Airport and the NEC.",
    "dickens-heath": "Dickens Heath is a modern village built from the late 1990s around a busy centre, beside the Stratford-upon-Avon Canal.",
    "monkspath": "Monkspath's modern estates and roundabouts are right beside Shirley test centre and M42 junction 4.",
    "balsall-common": "Balsall Common is a large village on the A452, where HS2 construction has changed traffic patterns.",
    "hockley-heath": "Hockley Heath sits on the A3400 near M40 junction 16, with the Stratford-upon-Avon Canal beside the village.",
    "meriden": "Meriden's village green has a cross traditionally said to mark the centre of England — and the A45 is minutes away.",
    "hillfield": "Hillfield, around Hillfield Park and its 16th-century hall, links Solihull town centre with Monkspath.",
    "cheswick-green": "Cheswick Green is a 1970s planned village whose older lanes were built for far less traffic than they carry today.",
    "bentley-heath": "Bentley Heath sits between Knowle and Dorridge around Widney Road, with a village school and shops to plan around.",
    "elmdon": "Elmdon sits beside Birmingham Airport, with Elmdon Park and the A45 close by.",
    "lyndon": "Lyndon is a residential part of north Solihull between Olton and Elmdon.",
    "fordbridge": "Fordbridge is a north Solihull estate between Chelmsley Wood and Kingshurst.",
    "smiths-wood": "Smith's Wood is a north Solihull estate close to the A452 and the M6.",
    "kingshurst": "Kingshurst is a north Solihull estate with a local centre and quick routes onto the A452.",
    "hampton-in-arden": "Hampton-in-Arden is a village with its own station, minutes from the NEC and the A45.",
    "berkswell": "Berkswell is a small village with old stocks on its green and a station on the Coventry line.",
    "catherine-de-barnes": "Catherine-de-Barnes is a small village on the Grand Union Canal, east of Solihull.",
    "tidbury-green": "Tidbury Green is a village of lanes and newer homes on the borough's south-west edge.",
    "blythe-valley": "Blythe Valley Park is a business park at M42 junction 4, with new homes alongside.",
    "sharmans-cross": "Sharmans Cross is a leafy residential area west of the town centre, near Blossomfield Road and several schools.",
    "widney-manor": "Widney Manor has its own station and quiet residential roads south of the town centre.",
    "solihull-lodge": "Solihull Lodge sits on the boundary with Birmingham, close to the Stratford-upon-Avon Canal.",
    "copt-heath": "Copt Heath sits between Knowle and M42 junction 5.",
    "bickenhill": "Bickenhill is a small village right beside the NEC, M42 junction 6 and Birmingham Airport.",
    "elmdon-heath": "Elmdon Heath is a residential area north of the town centre, between Lode Lane and Hampton Lane.",
    "majors-green": "Majors Green is on Shirley's western edge, where the Stratford-upon-Avon Canal passes the houses.",
    "haslucks-green": "Haslucks Green is the part of west Shirley around Shirley station.",
    "ulverley-green": "Ulverley Green is a residential part of Olton, close to the A41 and Lyndon.",
    "barston": "Barston is a small village in open countryside between Solihull and Balsall Common.",
    "eastcote": "Eastcote is a farmland hamlet near Barston and Hampton-in-Arden.",
    "temple-balsall": "Temple Balsall is a historic hamlet south of Balsall Common, known for its church linked to the Knights Templar.",
    "chadwick-end": "Chadwick End is a small village on the A4141 between Knowle and Warwick.",
    "earlswood": "Earlswood is known for Earlswood Lakes, built as reservoirs for the Stratford-upon-Avon Canal.",
    "tanworth-in-arden": "Tanworth-in-Arden is a village in Stratford-on-Avon district, south of Earlswood.",
    "lapworth": "Lapworth is the canal village where the Stratford-upon-Avon and Grand Union canals meet.",
    "packwood": "Packwood is the hamlet around the National Trust's Packwood House.",
    "hollywood": "Hollywood is a village on the A435 Alcester Road, just south of Birmingham's Maypole.",
    "wythall": "Wythall is a village with its own station, south of Birmingham on the line towards Stratford-upon-Avon.",
}


def area_page(a):
    n, slug, p = a["name"], a["slug"], pt(a)
    ranked = sorted((mi(p, TC[s]), s) for s in TC)
    d1, s1 = ranked[0]
    n1, addr1, r1 = CEN[s1]
    best3 = max(ranked[:3], key=lambda t: CEN[t[1]][2])
    kind = a["kind"] if a["kind"] in KIND else "suburb"
    kp, kfocus, kstart = KIND[kind]
    where = DISTRICT.get(slug, "Solihull")
    near_areas = sorted(((mi(p, pt(b)), b) for b in AREAS if b["slug"] != slug), key=lambda t: t[0])[:6]
    fuel = sorted(((mi(p, (f["lat"], f["lon"])), f) for f in D["fuel"]), key=lambda t: t[0])
    fuel = [t for t in fuel if t[0] <= 2.5][:4]
    rows = "".join(f'<tr><td><a href="{SQS}{s}-driving-test-centre-routes.html">{e(CEN[s][0])}</a></td><td>{d:.1f} miles</td><td>{CEN[s][2]}%</td></tr>' for d, s in ranked)
    rg = [k for k, v in ROADG.items() if any(w.split(" (")[0].lower() in v.lower() or v.split(" ")[0].lower() in w.lower() for w in a["roads"])][:3]
    intro = (WHY.get(slug, "") + " " + f"{n} is {kp} in {where} ({', '.join(a['pcs'])}). Lessons here focus on {kfocus}. {kstart} "
             f"The nearest test centre is {n1}, about {d1:.1f} miles away in a straight line, with a {r1}% pass rate in 2024-25.")
    pick = (f"Of the three closest centres, {CEN[best3[1]][0]} had the highest pass rate ({CEN[best3[1]][2]}%)." if best3[1] != s1 else f"{n1} also had the highest pass rate of the three closest centres.")
    secs = [
        f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>{d1:.1f} mi</b><span>to {e(n1)} test centre</span></div><div><b>{r1}%</b><span>{e(n1)} pass rate 2024-25</span></div><div><b>£35</b><span>per hour, manual or auto</span></div><div><b>£0</b><span>DriveSQ Student Portal</span></div></div></div></section>',
        L.sec("learn", f"Driving lessons in {e(n)}", f"Learning to drive in {e(n)}", e(intro),
              f'<div class="row g-4 mt-1"><div class="col-lg-7"><h3 class="h5 mt-2" style="font-family:Oswald,sans-serif">Your lesson plan in {e(n)}</h3>{plan(a, n1)}</div>'
              f'<div class="col-lg-5"><div class="sol-card reveal"><b>Roads you\'ll learn on</b><span><ul class="mt-2 mb-0">{"".join(f"<li>{e(r)}</li>" for r in a["roads"])}</ul></span></div>'
              f'<div class="sol-card reveal mt-3"><b>Landmarks and pick-up points</b><span><ul class="mt-2 mb-0">{"".join(f"<li>{e(x)}</li>" for x in a["near"])}</ul></span></div>'
              f'<div class="sol-card reveal mt-3"><b>Your instructor</b><span>An ADI (green badge) or a PDI (trainee, pink badge) — we tell you which before you book. Motorway lessons are always with an ADI.</span></div></div></div>'),
        L.sec("test-centres", "Driving test centres", f"Which test centre for {e(n)}?",
              f"Straight-line distances from {e(n)} to all seven centres Solihull learners use. {pick} Most learners do best at the centre whose roads they've practised most.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Test centre</th><th>Distance from {e(n)}</th><th>Pass rate 2024-25</th></tr></thead><tbody>{rows}</tbody></table></div>'
              f'<p class="sol-note mt-2">Pass rates: passrates.uk analysis of DVSA data. Driving distances are longer than straight-line. <a href="solihull-driving-test-centre-finder.html">Find yours by postcode →</a></p>', alt=True),
        L.sec("portal-features", "DriveSQ Student Portal", f"Free for every learner in {e(n)}",
              f"Your own learning app from DriveSQ, included with your lessons. Use its readiness checklist to judge when you're ready for {e(n1)}, and message your instructor between lessons in {e(n)}.",
              L.cards([L.STUDENT_FEATURES[(AREAS.index(a) * 5 + i) % len(L.STUDENT_FEATURES)] for i in range(3)]) + f'<div class="dsqx-ctas mt-4"><a class="dsqx-btn dsqx-btn--red" href="student.html"><i class="bi bi-mortarboard-fill"></i>Open the Student Portal</a><a class="dsqx-btn dsqx-btn--ghost" href="driving-lessons-solihull.html#portal-features"><i class="bi bi-grid"></i>All 12 features</a><a class="dsqx-btn dsqx-btn--ghost" href="dashboard.html"><i class="bi bi-person-badge"></i>Instructor Portal</a></div>'),
    ]
    local = ""
    if fuel:
        local += '<div class="sol-card reveal"><b>Fuel stations nearby</b><span><ul class="mt-2 mb-0">' + "".join(f'<li>{e(f["name"])} — {e(f["addr"])} ({d:.1f} mi)</li>' for d, f in fuel) + f'</ul><a href="{SQS}petrol-stations-solihull-learner-guide.html">First fill-up guide →</a></span></div>'
    local += f'<div class="sol-card reveal"><b>Postcode sectors</b><span>' + " · ".join(f'<a href="{SQS}{D["sector_slugs"][k]}.html">{k}</a>' for k in a["sectors"]) + "</span></div>"
    if rg:
        local += '<div class="sol-card reveal"><b>Road guides</b><span>' + " · ".join(f'<a href="{SQS}{k}.html">{e(ROADG[k])}</a>' for k in rg) + "</span></div>"
    local += f'<div class="sol-card reveal"><b>More about {e(n)}</b><span><a href="{SQS}driving-lessons-{slug}.html">SQ Driving School\'s {e(n)} guide</a> · <a href="{SQS}car-parks-solihull-learner-guide.html">car parks</a> · <a href="{SQS}hardest-and-easiest-roads-solihull-learners.html">hardest and easiest roads</a></span></div>'
    secs.append(L.sec("local", "Local", f"Around {e(n)}", "Fuel, postcodes and guides for this area.", f'<div class="sol-grid">{local}</div>', alt=True))
    secs.append(L.sec("nearby", "Nearby", f"Areas near {e(n)}", "We teach across the whole borough — door-to-door pick-up everywhere.",
                      L.chips([(fname(b["slug"]), f"{b['name']} ({d:.1f} mi)") for d, b in near_areas] + [("driving-lessons-solihull.html", "All of Solihull")])))
    faqs = [(f"How much are driving lessons in {n}?", "£35 an hour for lessons of 2 hours or more (£70 for 2 hours), £40 for a single hour, £350 for 10 hours (£320 for NHS staff and students). Manual and automatic are the same price."),
            (f"Which driving test centre is nearest to {n}?", f"{n1}, about {d1:.1f} miles away in a straight line ({addr1}). {pick}"),
            (f"Do you pick up from home in {n}?", f"Yes — door-to-door anywhere in {n}, including {a['near'][0]}."),
            (f"Is the Student Portal free for learners in {n}?", "Yes. Every DriveSQ learner gets the Student Portal free: progress tracking, 700+ theory questions, 14 mock tests, a readiness checklist and instructor messaging."),
            (f"Who will teach me in {n}?", "An ADI (DVSA Approved Driving Instructor, green badge) or a PDI (trainee instructor with a pink-badge licence). We tell you which you're booking, and motorway lessons are always with an ADI.")]
    secs += [L.faq_html(faqs), L.booking()]
    hero_html = L.hero(f"{e(where)} · {' / '.join(a['pcs'])}", f'<span class="w">Driving</span> <span class="w w--red">Lessons</span> <span class="w">{e(n)}.</span>',
                       f"{d1:.1f} miles from {e(n1)} test centre · free DriveSQ Student Portal",
                       [("bi-person-badge", "ADI &amp; PDI instructors"), ("bi-phone", "Free Student Portal"), ("bi-gear-wide-connected", "Manual &amp; auto · £35/hr")],
                       [("red", "#book", "bi-calendar-check-fill", "Book a lesson"), ("ghost", "#portal-features", "bi-mortarboard-fill", "See the Student Portal")])
    biz = L.biz_schema(fname(slug))
    biz.update({"@id": f"{SITE}/{fname(slug)}#school", "name": f"DriveSQ — Driving Lessons in {n}", "areaServed": [{"@type": "Place", "name": f"{n}, {where}", "geo": {"@type": "GeoCoordinates", "latitude": p[0], "longitude": p[1]}}],
                "sameAs": [SQS + f"driving-lessons-{slug}.html", SITE + "/driving-lessons-solihull.html"]})
    schema = [biz, L.faq_schema(faqs), L.crumbs(n, fname(slug))]
    return L.page(fname(slug), f"Driving Lessons {n} | £35/hr + Free Student Portal | DriveSQ",
                  f"Driving lessons in {n} ({', '.join(a['pcs'])}): £35/hr manual or automatic, {d1:.1f} miles from {n1} test centre, a local lesson plan and the free DriveSQ Student Portal.",
                  f"driving lessons {n.lower()}, driving instructor {n.lower()}, automatic driving lessons {n.lower()}, driving school {n.lower()}",
                  schema, hero_html, secs)


def main():
    out = {fname(a["slug"]): area_page(a) for a in AREAS}
    for f, h in out.items():
        open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml")
    x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{SITE}/{f}</loc>"
        if loc in x:
            x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + "<lastmod>2026-10-27</lastmod>", x)
        else:
            x = x.replace("</urlset>", f"  <url>{loc}<lastmod>2026-10-27</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", len(out), "area pages")


if __name__ == "__main__":
    main()
