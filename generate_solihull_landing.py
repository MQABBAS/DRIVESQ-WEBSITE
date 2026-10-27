#!/usr/bin/env python3
"""DriveSQ — the Solihull landing page (driving-lessons-solihull.html), built on index.html's design: same head/CSS,
nav, hero car, portal mock-up and footer, with Solihull content. Also builds two companion pages:
  solihull-driving-schools-compared.html  — what other Solihull driving schools publish (checked October 2026)
  free-learner-driver-resources-solihull.html — every free resource for Solihull learners in one place
Portal features are taken from the live Student Portal (student.html) and Instructor Portal (dashboard.html).
No "best"/"#1" claims, no pass-rate claims and no testimonials: everything here can be checked.
Run: python3 generate_solihull_landing.py"""
import html as H, importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("gsp", os.path.join(HERE, "generate-solihull-pages.py"))
G = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(G)
SITE, SQ = G.SITE, G.SQ
SQS = SQ + "/solihull/"
IDX = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
SQP = json.load(open(os.path.join(HERE, "solihull-sq-pages.json"), encoding="utf-8"))
CHECKED = "27 October 2026"
WA = "https://wa.me/447352932003"
LANDING = "driving-lessons-solihull.html"
COMPARE = "solihull-driving-schools-compared.html"
FREE = "free-learner-driver-resources-solihull.html"
e = H.escape

# ─────────────────────────── shared pieces cut from index.html ───────────────────────────
HEAD_END = IDX.index("</head>")
NAV = IDX[IDX.index("<nav"):IDX.index("</nav>") + 6]
HERO = IDX[IDX.index("<header"):IDX.index("</header>") + 9]
PORTAL = IDX[IDX.index('<section id="student-portal"'):IDX.index("</section>", IDX.index('<section id="student-portal"')) + 10]
FOOT = IDX[IDX.index("<footer"):]
# keep the engine scripts (bootstrap, booking capture, 3D car, reveal/motion); drop Manchester-only promos and the chat assistant
for sid in ("dsqx-assist", "dsqx-freehour", "dsqx-boost"):
    FOOT = re.sub(r'<script id="' + sid + r'"[^>]*>.*?</script>', "", FOOT, flags=re.S)

PROMO_HREF = {"#reviews": "index.html#reviews", "#services": "#prices", "#intensive": "index.html#intensive", "#passplus": "index.html#passplus",
              "#area-deals": "#areas", "#areas": "#areas", "#faq": "#faq", "#book": "#book", "#home": "#home", "#tools": "#tools", "#book-60": "#book"}


def relink(block):
    return re.sub(r'href="(#[a-z0-9-]+)"', lambda m: f'href="{PROMO_HREF.get(m.group(1), "index.html" + m.group(1))}"', block)


def head(fname, title, desc, kw, schema):
    hd = IDX[:HEAD_END]
    hd = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", hd, count=1, flags=re.S)
    hd = re.sub(r'<meta name="description" content="[^"]*"\s*/?>', f'<meta name="description" content="{e(desc)}"/>', hd, count=1)
    hd = re.sub(r'<meta name="keywords" content="[^"]*"\s*/?>', f'<meta name="keywords" content="{e(kw)}"/>', hd, count=1)
    hd = re.sub(r'<link rel="canonical" href="[^"]*"\s*/?>', f'<link rel="canonical" href="{SITE}/{fname}"/>', hd, count=1)
    for p, v in (("og:title", title), ("og:description", desc), ("og:url", f"{SITE}/{fname}"), ("twitter:title", title), ("twitter:description", desc)):
        hd = re.sub(r'(<meta (?:property|name)="' + p + r'" content=")[^"]*(")', lambda m: m.group(1) + e(v) + m.group(2), hd)
    hd = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", hd, flags=re.S)
    hd += "\n".join(f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>' for s in schema)
    hd += "\n<style>.sol-sec{padding:72px 0}.sol-sec.alt{background:#fafafa}.sol-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:22px}" \
          ".sol-card{background:#fff;border:1px solid #eee;border-radius:16px;padding:18px;box-shadow:0 6px 24px rgba(0,0,0,.04)}.sol-card b{display:block;font-family:'Oswald',sans-serif;font-size:1.02rem;margin-bottom:4px}" \
          ".sol-card span{font-size:.86rem;color:#555}.sol-card i{color:#D10A11;font-size:1.3rem;display:block;margin-bottom:6px}.sol-tbl{width:100%;border-collapse:collapse;font-size:.88rem;margin-top:16px}" \
          ".sol-tbl th,.sol-tbl td{border-bottom:1px solid #eee;padding:10px 8px;text-align:left;vertical-align:top}.sol-tbl th{font-family:'Oswald',sans-serif;background:#fff5f5}" \
          ".sol-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.sol-chips a{display:inline-block;margin:4px 6px 4px 0;padding:6px 12px;border-radius:999px;border:1px solid #eee;background:#fff;color:#333;font-size:.82rem;text-decoration:none}" \
          ".sol-chips a:hover{border-color:#D10A11;color:#D10A11}.sol-note{font-size:.8rem;color:#777}.sol-yes{color:#16a34a;font-weight:700}.sol-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:20px}" \
          ".sol-kpi div{background:#111;color:#fff;border-radius:14px;padding:16px;text-align:center}.sol-kpi b{display:block;font-family:'Oswald',sans-serif;font-size:1.6rem;color:#ff3b42}.sol-kpi span{font-size:.78rem;color:#ccc}" \
          ".sol-form section{padding:0!important;max-width:none!important}.sol-sec .dsqx-btn--ghost{color:#111!important;border-color:#d6d6d6!important;background:#fff!important}.sol-sec .dsqx-ctas{display:flex;flex-wrap:wrap;gap:10px}</style>\n"
    return hd


def nav():
    n = relink(NAV)
    n = n.replace("Manchester's #1 Driving School", "Driving lessons in Solihull").replace('href="index.html#home"', 'href="index.html"')
    return n


def page(fname, title, desc, kw, schema, hero_html, sections):
    foot = relink(FOOT).replace("Manchester's #1 DVSA-approved driving school.", "Driving lessons in Solihull and Greater Manchester.")
    return head(fname, title, desc, kw, schema) + "</head>\n<body>\n<div id=\"page-loader\" hidden></div>\n" + nav() + "\n" + hero_html + "\n<main id=\"main\">\n" + "\n".join(sections) + "\n</main>\n" + foot


def sec(sid, eye, title, sub, inner, alt=False):
    return f'<section id="{sid}" class="sol-sec{" alt" if alt else ""}" aria-labelledby="{sid}-t"><div class="container"><div class="reveal" style="max-width:820px"><span class="eye">{eye}</span><h2 id="{sid}-t" class="sec-t">{title}</h2><p class="sec-s">{sub}</p></div>{inner}</div></section>'


def cards(items):
    return '<div class="sol-grid">' + "".join(f'<div class="sol-card reveal"><i class="bi {ic}"></i><b>{t}</b><span>{d}</span></div>' for ic, t, d in items) + "</div>"


def chips(items):
    return '<div class="sol-chips">' + "".join(f'<a href="{h}">{e(t)}</a>' for h, t in items) + "</div>"


def booking():
    return '<div class="sol-form" id="book">' + G.form("Book driving lessons in Solihull", "A real person replies, usually within the hour. Goes straight to the DriveSQ team.", G.LESSON_OPTS) + "</div>"


def hero(eyebrow, h1, sub, ticks, ctas):
    x = HERO
    a = x.index('<div class="col-lg-6 order-2 dsqx-hero-txt">')
    b = x.index("</header>")
    # the text column ends where the row closes: rebuild it entirely
    car = x[:a]
    txt = f"""<div class="col-lg-6 order-2 dsqx-hero-txt">
        <div class="eyebrow a1"><i class="bi bi-geo-alt-fill"></i>{eyebrow}</div>
        <h1 class="hero-h1 dsqx-h1"><span class="dsqx-pft">{h1}</span><span class="dsqx-h1-sub">{sub}</span></h1>
        <ul class="dsqx-hero-ticks">{''.join(f'<li><i class="bi {i}"></i>{t}</li>' for i, t in ticks)}</ul>
        <div class="dsqx-hero-ctas">{''.join(f'<a class="dsqx-btn dsqx-btn--{k}" href="{h}"{" target=_blank rel=noopener" if h.startswith("http") else ""}><i class="bi {i}"></i>{t}</a>' for k, h, i, t in ctas)}</div>
      </div>
    </div>
  </div>
</header>"""
    return car.replace("Manchester's Best Driving School", "Driving lessons in Solihull") + txt


# ─────────────────────────── data ───────────────────────────
STUDENT_FEATURES = [
    ("bi-calendar-check", "Lesson tracker", "Every lesson logged, with your next lesson, confirm attendance and reschedule in a tap."),
    ("bi-graph-up-arrow", "Progress charts", "Overall competency, hours done against your target, and every topic marked as you reach Independent."),
    ("bi-journal-check", "700+ theory questions", "Practice mode with instant feedback, plus 14 full 50-question mock tests."),
    ("bi-lightning-charge", "Quick 5-question practice", "A short random theory quiz whenever you have two minutes."),
    ("bi-book", "Learn hub", "Practical guides, theory, test-day prep, tools and videos — tick topics as you read them."),
    ("bi-clipboard-check", "Test readiness checklist", "Hours, manoeuvres, junctions, independent driving, theory and instructor sign-off — see what's left."),
    ("bi-calendar-event", "Your test dates", "Set your theory and practical test dates and count down to them."),
    ("bi-chat-dots", "Message your instructor", "Questions between lessons, lesson changes and feedback in one place."),
    ("bi-fire", "Streaks, XP and achievements", "Daily streaks and levels that make revision a habit."),
    ("bi-star", "Rate your instructor", "Your feedback goes straight to your instructor and the DriveSQ team."),
    ("bi-phone", "Install it like an app", "Add it to your home screen on iPhone or Android — no app store, works offline too."),
    ("bi-moon-stars", "Day and night themes", "Easy on the eyes for late-night revision."),
]
INSTRUCTOR_FEATURES = [
    ("bi-calendar3", "Drag-and-drop diary", "Day, week and month views; move lessons by dragging them."),
    ("bi-people", "Student roster", "Every pupil's profile, progress and messages in one place."),
    ("bi-inbox", "Requests and transfers", "New learners matched to your covered postcodes, plus pupil transfers."),
    ("bi-geo-alt", "Students on a map", "See who's within 2, 5 or 10 miles of home."),
    ("bi-diagram-3", "Smart Day Builder", "Clusters nearby pupils on the same day to cut dead miles."),
    ("bi-signpost-split", "Route optimiser", "Puts a day's pick-ups in the shortest order."),
    ("bi-calculator", "Earnings and fuel calculator", "Estimate net earnings for a day after fuel."),
    ("bi-bell", "Push notifications", "New students, messages and lesson confirmations — even with the app closed."),
]
CENTRES = [(n, a, r, s) for n, a, r, t, _, s in G.CENTRES]
# what each school's own Solihull page or site shows — checked 27 October 2026 (search results and public pages)
SCHOOLS = [
    ("driveJohnson's", "https://www.drivejohnsons.co.uk/learners/areas-we-cover/solihull/", "National school; automatic lessons; says instructors are observed by a company trainer at least twice a year.", ""),
    ("BSM", "https://www.bsm.co.uk/locations/solihull", "National school; lists local instructors by name; manual lessons; weekday and weekend availability.", ""),
    ("Bill Plant", "https://www.billplant.co.uk/driving-lessons/where-to-find-us/solihull/", "National school; automatic lessons advertised from £34/hr nationally; block-booking discounts.", "From £34/hr (automatic, national page)"),
    ("Acclaim Driving School", "https://www.acclaimdriving.com/solihull-driving-lessons", "Weekly lessons or intensive courses; first two hours as an introduction.", "From £35"),
    ("RSM Driving School", "https://rsm-drivingschool.co.uk/driving-lessons-solihull/", "Manual and automatic; refresher and intensive courses.", "First three lessons £60"),
    ("Result Driving School", "https://resultdrivingschool.co.uk/driving-lessons/solihull/", "One-to-one lessons; daytime, evening and weekend; male or female instructor.", ""),
    ("Style Driving", "https://styledriving.co.uk/", "Says it has over 30 years' experience.", "First lesson £15"),
    ("Solihull Driver Trainers", "https://www.solihull-driving-school.uk/learning-to-drive-with-solihull-driving-school/automatic-driving-lessons.html", "Automatic lessons in dual-controlled cars.", ""),
    ("The A Team Driving School", "https://theateamdrivingschool.co.uk/", "Covers Solihull, Shirley, Knowle and Dorridge.", ""),
    ("Jon's LDC driving school", "https://www.lessonswithjon.co.uk/", "Independent ADI; manual only.", "5 hours £150"),
    ("Tim's LDC driving school", "https://www.passwithtim.co.uk/", "Independent ADI; manual only.", "5 hours £200"),
    ("My Four Wheels", "https://myfourwheels.co.uk/locations/solihull", "Says theory test prep software is included with every lesson.", ""),
]
FAQS = [
    ("How much are driving lessons in Solihull with DriveSQ?", "£35 an hour for lessons of 2 hours or more (£70 for 2 hours), £40 for a single hour, and £350 for 10 hours — £320 for NHS staff and students. Manual and automatic are the same price."),
    ("What is the DriveSQ Student Portal?", "A free web app for every DriveSQ learner: lesson tracking, progress charts, 700+ theory questions with 14 mock tests, a test readiness checklist, test-date countdowns and messaging with your instructor. It installs on your phone like an app."),
    ("Is the Student Portal really free?", "Yes — it's included with your lessons. There's nothing to download from an app store and no subscription."),
    ("Who are DriveSQ's instructors?", "Our team includes ADIs (DVSA Approved Driving Instructors, green badge) and PDIs (trainee instructors with a DVSA pink-badge licence). We tell you which you're booking, and motorway lessons are always with an ADI."),
    ("Which test centre should I use in Solihull?", "Most of the borough is closest to Birmingham (Shirley), which had a 58.1% pass rate in 2024-25. North Solihull is closer to Garretts Green or South Yardley. Use our free test centre finder to compare all seven by distance and pass rate."),
    ("Do you cover all of Solihull?", "Yes — B90 to B94, B36, B37, B40 and the CV7 villages, from Shirley and Solihull town centre to Chelmsley Wood, Knowle, Dorridge and Balsall Common."),
    ("Is DriveSQ the same as SQ Driving School?", "Yes. SQ Driving School is part of DriveSQ — the same instructors, prices and Student Portal. SQ Driving School publishes the detailed Solihull road, test-route and postcode guides."),
    ("Are instructors joining DriveSQ in Solihull?", "Yes — ADIs and PDIs can join and use the free Instructor Portal: diary, pupil records, messaging, a students map, route planning and learners matched to their postcodes."),
]


def biz_schema(fname):
    places = ["Solihull", "Shirley", "Solihull town centre", "Olton", "Knowle", "Dorridge", "Chelmsley Wood", "Castle Bromwich", "Kingshurst", "Marston Green",
              "Balsall Common", "Meriden", "Hampton-in-Arden", "Monkspath", "Dickens Heath", "Cheswick Green", "Hockley Heath", "Lyndon", "Elmdon"]
    return {"@context": "https://schema.org", "@type": "DrivingSchool", "@id": f"{SITE}/{LANDING}#school", "name": "DriveSQ — Driving Lessons in Solihull",
            "url": f"{SITE}/{fname}", "telephone": "+44 7352 932003", "priceRange": "£35–£350", "foundingDate": "2025",
            "areaServed": [{"@type": "AdministrativeArea", "name": "Metropolitan Borough of Solihull"}] + [{"@type": "Place", "name": p} for p in places],
            "sameAs": [SQ + "/driving-lessons-solihull.html", "https://www.instagram.com/drive_sq_academy/", "https://www.facebook.com/profile.php?id=100092258175464"],
            "subOrganization": {"@type": "Organization", "name": "SQ Driving School", "url": SQ},
            "knowsAbout": ["Driving lessons", "Automatic driving lessons", "Manual driving lessons", "Driving test preparation", "Theory test", "Birmingham (Shirley) driving test centre"],
            "makesOffer": [{"@type": "Offer", "name": "Driving lesson (2 hours or more), per hour", "price": "35", "priceCurrency": "GBP"},
                           {"@type": "Offer", "name": "Single 1-hour driving lesson", "price": "40", "priceCurrency": "GBP"},
                           {"@type": "Offer", "name": "10-hour block", "price": "350", "priceCurrency": "GBP"},
                           {"@type": "Offer", "name": "10-hour block for NHS staff and students", "price": "320", "priceCurrency": "GBP"},
                           {"@type": "Offer", "name": "DriveSQ Student Portal", "price": "0", "priceCurrency": "GBP", "itemOffered": {"@id": f"{SITE}/student.html#app"}}]}


def app_schema():
    return [{"@context": "https://schema.org", "@type": "WebApplication", "@id": f"{SITE}/student.html#app", "name": "DriveSQ Student Portal", "url": f"{SITE}/student.html",
             "applicationCategory": "EducationalApplication", "operatingSystem": "Any (web app, installable on iOS and Android)",
             "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP", "description": "Free with DriveSQ and SQ Driving School lessons"},
             "featureList": [t for _, t, _ in STUDENT_FEATURES], "provider": {"@type": "Organization", "name": "DriveSQ", "url": SITE}},
            {"@context": "https://schema.org", "@type": "WebApplication", "@id": f"{SITE}/dashboard.html#app", "name": "DriveSQ Instructor Portal", "url": f"{SITE}/dashboard.html",
             "applicationCategory": "BusinessApplication", "operatingSystem": "Any (web app)", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
             "featureList": [t for _, t, _ in INSTRUCTOR_FEATURES], "provider": {"@type": "Organization", "name": "DriveSQ", "url": SITE}}]


def faq_schema(faqs):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]}


def crumbs(name, fname):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Solihull", "item": f"{SITE}/{LANDING}"}] + ([{"@type": "ListItem", "position": 3, "name": name, "item": f"{SITE}/{fname}"}] if fname != LANDING else [])}


def faq_html(faqs):
    items = "".join(f'<div class="accordion-item reveal"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sf{i}">{e(q)}</button></h3><div id="sf{i}" class="accordion-collapse collapse" data-bs-parent="#solFaq"><div class="accordion-body">{e(a)}</div></div></div>' for i, (q, a) in enumerate(faqs))
    return f'<section id="faq" class="faq" aria-labelledby="faq-title"><div class="container"><div class="text-center mb-5 reveal"><span class="eye">Common questions</span><h2 id="faq-title" class="sec-t">Driving lessons in Solihull: FAQs</h2></div><div class="row justify-content-center"><div class="col-lg-8"><div class="accordion" id="solFaq">{items}</div></div></div></div></section>'


def school_rows():
    return "".join(f'<tr><td><a href="{u}" target="_blank" rel="nofollow noopener">{e(n)}</a></td><td>{e(p) or "Not shown on the page we checked"}</td><td>{e(d)}</td><td>{"Theory software (per its page)" if "theory" in d.lower() else "None advertised"}</td></tr>' for n, u, d, p in SCHOOLS)


def sq_group(cat):
    return [(SQ + "/" + p, t) for p, t, c in SQP if c == cat]


TOOLS = [(f, lbl) for f, lbl, _ in [("solihull-driving-test-centre-finder.html", "Test centre finder", 0), ("solihull-learner-driver-cost-calculator.html", "Licence cost calculator", 0),
         ("solihull-driving-test-readiness-check.html", "Test readiness check", 0), ("solihull-learner-driver-lesson-plan.html", "Week-by-week lesson plan", 0),
         ("solihull-daylight-driving-planner.html", "Daylight & sun-glare planner", 0), ("learner-driver-age-checker.html", "When can I start driving?", 0),
         ("driving-test-fault-counter.html", "Would I have passed?", 0), ("passing-distance-guide.html", "Passing distance guide", 0), ("which-lights-should-i-use.html", "Which lights should I use?", 0),
         ("cockpit-drill-checklist.html", "Cockpit drill checklist", 0), ("manual-or-automatic-decider.html", "Manual or automatic?", 0)]]


# ─────────────────────────── pages ───────────────────────────
def landing():
    portal = PORTAL.replace("Free with every DriveSQ lesson", "Free with every Solihull lesson").replace(
        "with a DVSA-approved instructor", "with an ADI or PDI instructor")
    rows = "".join(f'<tr><td>{"<a href=" + chr(34) + SQS + s + "-driving-test-centre-routes.html" + chr(34) + ">" + e(n) + "</a>" if s else e(n)}</td><td>{e(a)}</td><td>{r}%</td></tr>' for n, a, r, s in CENTRES)
    secs = [
        f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>£35</b><span>per hour, manual or auto</span></div><div><b>£0</b><span>Student Portal — free</span></div><div><b>700+</b><span>theory questions</span></div><div><b>14</b><span>full mock tests</span></div><div><b>7</b><span>test centres compared</span></div><div><b>{len(SQP)}+</b><span>Solihull guides</span></div></div></div></section>',
        portal,
        sec("portal-features", "DriveSQ Student Portal", "Everything inside — free for every Solihull learner",
            "Most driving schools give you lessons. DriveSQ gives you lessons plus your own learning app, built and run by us — not a third-party theory app with a referral code.",
            cards(STUDENT_FEATURES) + f'<div class="dsqx-ctas mt-4"><a class="dsqx-btn dsqx-btn--red" href="student.html"><i class="bi bi-mortarboard-fill"></i>Open the Student Portal</a><a class="dsqx-btn dsqx-btn--ghost" href="{SQS}drivesq-student-portal-solihull.html"><i class="bi bi-info-circle"></i>Student Portal guide</a></div>'),
        sec("compare", "Solihull driving schools compared", "What other Solihull schools publish — and what they don't",
            f"We read the Solihull pages of {len(SCHOOLS)} driving schools that rank for \"driving lessons Solihull\". None advertised its own free student portal combining lesson tracking, progress charts, a 700+ question theory bank and instructor messaging. Checked {CHECKED}; details can change — follow the links to check.",
            f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>School</th><th>Price shown</th><th>What its page says</th><th>Own student portal</th></tr></thead><tbody><tr><td><b>DriveSQ</b></td><td>£35/hr (2 hrs+), £40 single, 10 hrs £350</td><td>Manual &amp; automatic same price; ADIs &amp; PDIs; free tools and {len(SQP)}+ local guides</td><td class="sol-yes">Yes — free Student Portal</td></tr>{school_rows()}</tbody></table></div><p class="sol-note mt-2">National theory apps (such as Driving Test Success or Theory Test Pro) are used by many instructors; the comparison is about each school offering its own portal. <a href="{COMPARE}">Full comparison and method →</a></p>', alt=True),
        sec("instructor-portal", "DriveSQ Instructor Portal", "Instructors in Solihull: run your whole diary from one free portal",
            "ADIs and PDIs who teach with DriveSQ get the Instructor Portal free — and Solihull learners are matched to the postcodes you cover.",
            cards(INSTRUCTOR_FEATURES) + f'<div class="dsqx-ctas mt-4"><a class="dsqx-btn dsqx-btn--red" href="driving-instructor-jobs-solihull.html"><i class="bi bi-briefcase-fill"></i>Instructor jobs in Solihull</a><a class="dsqx-btn dsqx-btn--ghost" href="{SQS}drivesq-instructor-portal-solihull.html"><i class="bi bi-person-badge"></i>Instructor Portal guide</a><a class="dsqx-btn dsqx-btn--ghost" href="driving-instructor-training-solihull.html"><i class="bi bi-mortarboard"></i>Become an instructor</a></div>'),
        sec("prices", "Prices", "Simple Solihull prices — manual and automatic the same",
            "No booking fees, no fuel surcharge and no automatic premium.",
            cards([("bi-clock", "£35 an hour", "For lessons of 2 hours or more — £70 for a 2-hour lesson."), ("bi-1-circle", "£40 single hour", "If you only want one hour."),
                   ("bi-box-seam", "£350 for 10 hours", "Block booking."), ("bi-heart-pulse", "£320 for 10 hours", "For NHS staff and students."),
                   ("bi-person-badge", "ADIs and PDIs", "Our team includes ADIs (green badge) and PDIs (trainee, pink badge) — we tell you which you're booking; motorway lessons are always with an ADI."),
                   ("bi-gift", "Student Portal included", "£0 — free with every lesson.")]) + f'<p class="sol-note mt-3">Full breakdown: <a href="{SQS}driving-lesson-prices-solihull.html">Solihull prices</a> · <a href="solihull-learner-driver-cost-calculator.html">total licence cost calculator</a></p>', alt=True),
        sec("test-centres", "Driving test centres", "The 7 test centres Solihull learners use",
            "Pass rates for 2024-25 from passrates.uk's analysis of DVSA data. Each centre links to its SQ Driving School route guide.",
            f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Test centre</th><th>Address</th><th>Pass rate 2024-25</th></tr></thead><tbody>{rows}</tbody></table></div><p class="sol-note mt-2">Find your nearest by postcode: <a href="solihull-driving-test-centre-finder.html">test centre finder</a> · <a href="{SQS}solihull-driving-test-centres-compared.html">all centres compared</a> · <a href="solihull-driving-test-pass-rates.html">pass rates explained</a></p>'),
        sec("areas", "Coverage", "Every area and postcode in Solihull",
            "Door-to-door pick-up across the borough. Each link opens a local guide with roads, test centres, fuel and parking.",
            '<div class="area-head mt-3">Areas</div>' + chips(sq_group("Areas")) + '<div class="area-head mt-3">Postcodes and sectors</div>' + chips(sq_group("Postcodes")), alt=True),
        sec("tools", "Free tools", "Free tools for Solihull learners",
            "Built by DriveSQ, free for everyone — no sign-up.", chips(TOOLS) + f'<p class="sol-note mt-2">Everything free in one place: <a href="{FREE}">free learner driver resources for Solihull →</a></p>'),
        sec("guides", "Local knowledge", "Solihull roads, routes and lesson guides",
            "In-depth guides from SQ Driving School, part of DriveSQ.",
            '<div class="area-head mt-3">Roads and junctions</div>' + chips(sq_group("Roads & junctions")) + '<div class="area-head mt-3">Test centre routes</div>' + chips(sq_group("Test centres")) +
            '<div class="area-head mt-3">Lesson types</div>' + chips(sq_group("Lesson types")) + '<div class="area-head mt-3">Schools, colleges and workplaces</div>' + chips(sq_group("Schools & colleges") + sq_group("Workplaces")) +
            '<div class="area-head mt-3">Guides and portals</div>' + chips(sq_group("Guides & portals")), alt=True),
        faq_html(FAQS),
        booking(),
    ]
    hero_html = hero("Solihull · B90–B94 · B36 · B37 · CV7", '<span class="w">Driving</span> <span class="w w--red">Lessons</span> <span class="w">Solihull.</span>',
                     "with the free DriveSQ Student Portal",
                     [("bi-person-badge", "ADI &amp; PDI instructors"), ("bi-phone", "Free Student Portal"), ("bi-gear-wide-connected", "Manual &amp; auto · £35/hr")],
                     [("red", "#book", "bi-calendar-check-fill", "Book a lesson"), ("ghost", "#student-portal", "bi-mortarboard-fill", "See the Student Portal")])
    schema = [biz_schema(LANDING)] + app_schema() + [faq_schema(FAQS), crumbs("Solihull", LANDING)]
    return page(LANDING, "Driving Lessons Solihull | £35/hr + Free Student Portal | DriveSQ",
                "Driving lessons in Solihull from £35/hr, manual or automatic, with the free DriveSQ Student Portal: progress tracking, 700+ theory questions, 14 mock tests and instructor messaging.",
                "driving lessons solihull, driving school solihull, automatic driving lessons solihull, driving instructor solihull, student portal driving lessons",
                schema, hero_html, secs)


def compare_page():
    secs = [
        sec("method", "How we checked", f"Solihull driving schools compared ({CHECKED})",
            "We searched \"driving lessons Solihull\" and read the Solihull page (or homepage) of each school in the results. We only list what each page says — prices and offers change, so check with each school before booking.",
            f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>School</th><th>Price shown</th><th>What its page says</th><th>Own student portal</th></tr></thead><tbody><tr><td><b>DriveSQ</b></td><td>£35/hr (2 hrs+), £40 single, 10 hrs £350 (£320 NHS/students)</td><td>Manual &amp; automatic same price; ADIs &amp; PDIs; free tools; {len(SQP)}+ local guides via SQ Driving School</td><td class="sol-yes">Yes — free Student Portal</td></tr>{school_rows()}</tbody></table></div>'),
        sec("what-to-ask", "Choosing a school", "Six questions to ask any Solihull driving school", "Whoever you choose, these answers tell you more than a headline price.",
            cards([("bi-cash-coin", "What's the real hourly price?", "Introductory offers end — ask what lesson 4 onwards costs, and whether automatic costs more."),
                   ("bi-person-badge", "ADI or PDI?", "Ask whether your instructor is a fully qualified ADI (green badge) or a trainee PDI (pink badge). Both are legal; you should be told."),
                   ("bi-graph-up", "How will I see my progress?", "A written or app-based record of every skill beats \"you're doing fine\"."),
                   ("bi-journal-text", "What theory help is included?", "Free question banks and mock tests save you buying an app."),
                   ("bi-signpost", "Which test centre will we prepare for?", "Lessons should end on the roads of the centre you'll book."),
                   ("bi-arrow-repeat", "What if I need to change a lesson?", "Know the notice period before you book.")]), alt=True),
        sec("drivesq", "Why DriveSQ", "What's different about DriveSQ in Solihull", "The things you can check for yourself.",
            cards([("bi-phone", "Its own Student Portal", "Lesson tracking, progress charts, 700+ theory questions, 14 mock tests, a readiness checklist and messaging — free."),
                   ("bi-tools", "11 free tools", "Test centre finder, cost calculator, readiness check, lesson plan and more."),
                   ("bi-map", f"{len(SQP)}+ local guides", "Every Solihull area, postcode sector, road and test centre, via SQ Driving School."),
                   ("bi-gear", "Same price manual or auto", "£35/hr for 2 hours or more.")]) + f'<p class="mt-3"><a class="dsqx-btn dsqx-btn--red" href="{LANDING}"><i class="bi bi-arrow-right"></i>Driving lessons in Solihull</a></p>'),
        booking(),
    ]
    faqs = [("Which driving schools teach in Solihull?", f"National schools such as driveJohnson's, BSM and Bill Plant, and local schools including Acclaim, RSM, Result, Style Driving, Solihull Driver Trainers, The A Team and independent LDC instructors — plus DriveSQ. See the table for what each page says (checked {CHECKED})."),
            ("Do other Solihull driving schools have a student app?", "Many instructors use national theory apps, and My Four Wheels says it includes theory software. In our check, none advertised its own portal combining lesson tracking, progress charts, a theory bank and messaging like the DriveSQ Student Portal.")]
    hero_html = hero(f"Checked {CHECKED}", '<span class="w">Solihull</span> <span class="w w--red">Driving</span> <span class="w">Schools.</span>', "compared honestly — prices, offers and student portals",
                     [("bi-search", f"{len(SCHOOLS) + 1} schools checked"), ("bi-link-45deg", "Every claim linked"), ("bi-phone", "Who has a student portal?")],
                     [("red", "#method", "bi-table", "See the comparison"), ("ghost", LANDING, "bi-geo-alt-fill", "Lessons in Solihull")])
    return page(COMPARE, "Solihull Driving Schools Compared (2026) | Prices & Student Portals | DriveSQ",
                f"An honest comparison of {len(SCHOOLS) + 1} Solihull driving schools — prices shown, what each page offers, and which have their own student portal. Checked {CHECKED}.",
                "solihull driving schools, best driving school solihull, driving school solihull prices, driving lessons solihull compared",
                [faq_schema(faqs), crumbs("Solihull driving schools compared", COMPARE)], hero_html, secs)


def free_page():
    gov = [("https://www.gov.uk/guidance/the-highway-code", "The Highway Code (GOV.UK)"), ("https://www.gov.uk/government/publications/know-your-traffic-signs", "Know your traffic signs (GOV.UK)"),
           ("https://www.gov.uk/theory-test/revision-and-practice", "Theory test revision and practice (GOV.UK)"), ("https://www.gov.uk/driving-test/what-happens-during-test", "What happens on the driving test (GOV.UK)"),
           ("https://www.gov.uk/apply-first-provisional-driving-licence", "Apply for a provisional licence (GOV.UK)")]
    secs = [
        sec("portal", "Free with DriveSQ lessons", "The DriveSQ Student Portal", "The biggest free resource we offer — included with every lesson.", cards(STUDENT_FEATURES[:8]) + '<p class="mt-3"><a class="dsqx-btn dsqx-btn--red" href="student.html"><i class="bi bi-mortarboard-fill"></i>Open the Student Portal</a></p>'),
        sec("tools", "Free for everyone", "11 free DriveSQ tools", "No sign-up, nothing saved.", chips(TOOLS), alt=True),
        sec("guides", "Free local guides", "Solihull guides from SQ Driving School", "Areas, postcodes, roads, test routes and lesson guides.",
            '<div class="area-head mt-3">Test centre routes</div>' + chips(sq_group("Test centres")) + '<div class="area-head mt-3">Roads and junctions</div>' + chips(sq_group("Roads & junctions")) +
            '<div class="area-head mt-3">Guides</div>' + chips(sq_group("Guides & portals")) + f'<p class="sol-note mt-2">Plus every <a href="{SQ}/guides.html">learner guide</a> and <a href="{SQ}/test-faults.html">test fault explained</a>.</p>'),
        sec("official", "Free official resources", "From GOV.UK and DVSA", "The official sources every learner should know.", chips(gov), alt=True),
        booking(),
    ]
    faqs = [("Where can I get free driving theory practice in Solihull?", "DriveSQ learners get 700+ theory questions and 14 mock tests free in the Student Portal. Everyone can use GOV.UK's revision guidance and the Highway Code free."),
            ("Are DriveSQ's tools free for everyone?", "Yes — the 11 tools need no sign-up and nothing you enter is saved. The Student Portal is free for DriveSQ and SQ Driving School learners.")]
    hero_html = hero("Free · no sign-up", '<span class="w">Free</span> <span class="w w--red">Learner</span> <span class="w">Resources.</span>', "for Solihull learner drivers — in one place",
                     [("bi-phone", "Free Student Portal"), ("bi-tools", "11 free tools"), ("bi-map", f"{len(SQP)}+ local guides")],
                     [("red", "#portal", "bi-mortarboard-fill", "The Student Portal"), ("ghost", LANDING, "bi-geo-alt-fill", "Lessons in Solihull")])
    return page(FREE, "Free Learner Driver Resources Solihull | Theory, Tools & Guides | DriveSQ",
                "Every free resource for Solihull learner drivers: the DriveSQ Student Portal (700+ theory questions, 14 mock tests), 11 free tools, local road and test-route guides and official GOV.UK resources.",
                "free theory test practice solihull, free learner driver resources, driving theory free solihull, learner driver app free",
                [faq_schema(faqs), crumbs("Free learner resources", FREE)] + app_schema()[:1], hero_html, secs)


def main():
    out = {LANDING: landing(), COMPARE: compare_page(), FREE: free_page()}
    for f, h in out.items():
        open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml")
    x = open(sm, encoding="utf-8").read()
    today = "2026-10-27"
    for f in out:
        loc = f"<loc>{SITE}/{f}</loc>"
        if loc in x:
            x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{today}</lastmod>", x)
        else:
            x = x.replace("</urlset>", f"  <url>{loc}<lastmod>{today}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
