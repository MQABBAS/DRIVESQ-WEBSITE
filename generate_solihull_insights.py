#!/usr/bin/env python3
"""DriveSQ — Solihull insight pages: researched local knowledge no driving school publishes.
  best-month-driving-test-solihull.html        pass-rate seasonality + Solihull daylight, weather and school holidays by month
  winter-driving-solihull.html                 what Solihull Council grits (Winter Services Plan) and what that means for learners
  solihull-school-term-dates-driving-lessons.html   term dates, bank holidays, school-run peaks + a date checker
Daylight is calculated for Solihull town centre (52.413, -1.778) with NOAA's sunrise/sunset method; every other figure
is cited on the page. Run: python3 generate_solihull_insights.py (after generate_solihull_landing.py)."""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("land", os.path.join(HERE, "generate_solihull_landing.py"))
L = importlib.util.module_from_spec(_s)
_s.loader.exec_module(L)
e, SQS = L.e, L.SQS
DAY = json.load(open(os.path.join(HERE, "_data/solihull_daylight.json"), encoding="utf-8"))
TODAY = "2026-11-06"
SRC = {
    "coll": ("Collingwood — best month to take your driving test (DVSA data 2019–2025)", "https://www.collingwood.co.uk/insight/best-month-to-take-your-driving-test/"),
    "coll_th": ("Collingwood — theory test pass rate by month (2007–2024)", "https://www.collingwood.co.uk/insight/theory-test-pass-rate-per-month/"),
    "dvsa": ("GOV.UK — car driving test data by test centre (DVSA)", "https://www.gov.uk/government/statistical-data-sets/car-driving-test-data-by-test-centre"),
    "pr": ("passrates.uk — Birmingham test centres pass rates 2024-25", "https://passrates.uk/guide/birmingham-driving-test-centres-pass-rates"),
    "ws": ("Weather Spark — Birmingham Airport climate by month", "https://weatherspark.com/y/147820/Average-Weather-at-Birmingham-Airport-United-Kingdom-Year-Round"),
    "noaa": ("NOAA — solar calculation method (sunrise and sunset)", "https://gml.noaa.gov/grad/solcalc/calcdetails.html"),
    "terms": ("Save My Exams — Solihull Council school holidays 2026–2027", "https://www.savemyexams.com/learning-hub/school-holidays/england/west-midlands/solihull-council/"),
    "bank": ("GOV.UK — UK bank holidays", "https://www.gov.uk/bank-holidays"),
    "winter": ("Solihull Council — Winter Services Plan 2023–2028", "https://www.solihull.gov.uk/sites/default/files/2026-01/Winter-Services-Plan.pdf"),
    "gfaq": ("Solihull Council — gritting FAQs and myth busting", "https://www.solihull.gov.uk/roads-pavements-and-streetcare/gritting-and-grit-bins/gritting-faqs-and-myth-busting"),
    "hc_weather": ("GOV.UK — The Highway Code: driving in adverse weather (226 to 237)", "https://www.gov.uk/guidance/the-highway-code/driving-in-adverse-weather-conditions-226-to-237"),
    "hc_speed": ("GOV.UK — The Highway Code: stopping distances (rule 126)", "https://www.gov.uk/guidance/the-highway-code/general-rules-techniques-and-advice-for-all-drivers-and-riders-103-to-158"),
    "rules": ("GOV.UK — changes to driving test booking rules in 2026", "https://www.gov.uk/guidance/changes-to-driving-test-booking-rules-in-2026"),
    "rules_news": ("GOV.UK — end of the road for unofficial driving test booking services", "https://www.gov.uk/government/news/end-of-the-road-for-unofficial-driving-test-booking-services"),
    "waits_letter": ("Transport Committee correspondence, 20 May 2026 (national average wait 22.1 weeks, median 9)", "https://www.beyondthevote.co.uk/committee-publication/c89c3faa-5abb-4bfa-9c1d-5b64ab36e91b"),
    "waits_median": ("passrates.uk — DVSA median wait times explained (May 2026: 9.7 weeks GB)", "https://passrates.uk/guide/dvsa-median-wait-times-explained"),
    "kh": ("passrates.uk — Birmingham (Kings Heath) test centre", "https://passrates.uk/centres/birmingham-kings-heath"),
    "shirley": ("passrates.uk — Birmingham (Shirley) test centre", "https://passrates.uk/centres/birmingham-shirley"),
    "nao": ("National Audit Office — investigation into car driving test waiting times (Dec 2025)", "https://www.nao.org.uk/wp-content/uploads/2025/12/investigation-into-car-driving-test-waiting-times-summary.pdf"),
    "rss": ("GOV.UK — Road Safety Strategy (7 January 2026)", "https://assets.publishing.service.gov.uk/media/69677c093eea543d3e7034ba/road-safety-strategy-large-print.pdf"),
    "book": ("GOV.UK — book your driving test", "https://www.gov.uk/book-driving-test"),
    "caz_pay": ("Brum Breathes — pay a Clean Air Zone charge (vehicle standards, penalties)", "https://www.brumbreathes.co.uk/info/24/individuals-1/3/mean-1"),
    "caz_org": ("Brum Breathes — guidance for businesses and employers", "https://www.brumbreathes.co.uk/info/23/organisations-1/10/youre-employer-staff-drive-work-birmingham"),
    "caz_rac": ("RAC — the Birmingham Clean Air Zone: what you need to know", "https://www.rac.co.uk/drive/advice/emissions/the-birmingham-clean-air-zone-what-you-need-to-know"),
    "caz_gov": ("GOV.UK — check if you need to pay a Clean Air Zone charge", "https://www.gov.uk/clean-air-zones"),
    "nh_j6": ("National Highways — M42 junction 6 improvement scheme", "https://nationalhighways.co.uk/projects/m42-junction-6-improvement"),
    "nh_open": ("National Highways — drivers get first outing on brand new road and motorway junction", "https://nationalhighways.co.uk/drivers-get-first-outing-on-brand-new-road-and-motorway-junction"),
    "nh_full": ("National Highways — brand new road fully opened as M42 improvements scheme reaches final stages", "https://nationalhighways.co.uk/press/brand-new-road-fully-opened-as-m42-improvements-scheme-reaches-final-stages"),
    "gov_282": ("GOV.UK — £282m investment for M42 junction 6 near Birmingham", "https://www.gov.uk/government/news/282m-investment-for-m42-junction-6-near-birmingham"),
    "hc_mway": ("GOV.UK — The Highway Code: motorways (253 to 274)", "https://www.gov.uk/guidance/the-highway-code/motorways-253-to-274"),
    "cancel": ("GOV.UK — driving test cancelled because of bad weather", "https://www.gov.uk/driving-test/test-cancelled-bad-weather"),
}
# Solihull Council (community schools) calendar 2026–27; academies may differ
HOLS = [("Autumn half term", "2026-10-26", "2026-10-30"), ("Christmas", "2026-12-21", "2027-01-01"), ("Spring half term", "2027-02-15", "2027-02-19"),
        ("Easter", "2027-03-26", "2027-04-09"), ("Summer half term", "2027-05-31", "2027-06-04"), ("Summer holiday (expected)", "2027-07-22", "2027-09-01")]
BANK = [("Christmas Day", "2026-12-25"), ("Boxing Day (substitute)", "2026-12-28"), ("New Year's Day", "2027-01-01"), ("Good Friday", "2027-03-26"),
        ("Easter Monday", "2027-03-29"), ("Early May bank holiday", "2027-05-03"), ("Spring bank holiday", "2027-05-31"), ("Summer bank holiday", "2027-08-30"),
        ("Christmas Day (substitute)", "2027-12-27"), ("Boxing Day (substitute)", "2027-12-28")]
PASS = {"April": "≈51.7% (highest)", "February": "≈51.4%", "March": "≈50.7%", "October": "≈47.9%", "November": "≈47.7% (lowest)", "December": "≈48.1%"}
HOLMONTH = {"February": "Spring half term 15–19 Feb", "March": "Easter from 26 Mar", "April": "Easter to 9 Apr", "May": "Half term from 31 May", "June": "Half term to 4 Jun",
            "July": "Summer from ~22 Jul", "August": "Summer holiday", "October": "Half term 26–30 Oct", "December": "Christmas from 21 Dec", "January": "Back 4 Jan"}


def sources(keys):
    return L.sec("sources", "Sources", "Where these facts come from", "Checked November 2026. Figures change — follow the links for the latest.",
                 '<ul style="font-size:.88rem">' + "".join(f'<li><a href="{SRC[k][1]}" target="_blank" rel="noopener">{e(SRC[k][0])}</a></li>' for k in keys) + "</ul>", alt=True)


def page(fname, crumb, title, desc, kw, hero_bits, secs, faqs):
    eyebrow, h1, sub, ticks, ctas = hero_bits
    hero = L.hero(eyebrow, h1, sub, ticks, ctas)
    secs = secs + [L.faq_html(faqs), L.booking()]
    return L.page(fname, title, desc, kw, [L.faq_schema(faqs), L.crumbs(crumb, fname)], hero, secs)


def best_month():
    f = "best-month-driving-test-solihull.html"
    rows = "".join(f'<tr><td><b>{m}</b></td><td>{PASS.get(m, "—")}</td><td>{r}</td><td>{s}</td><td>{h:.1f} h</td><td>{e(HOLMONTH.get(m, ""))}</td></tr>' for m, r, s, h in DAY)
    dmax, dmin = max(DAY, key=lambda x: x[3]), min(DAY, key=lambda x: x[3])
    secs = [
        f'<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>April</b><span>highest average pass rate (≈51.7%)</span></div><div><b>November</b><span>lowest (≈47.7%)</span></div><div><b>{dmax[3]:.1f} h</b><span>daylight in {dmax[0]} in Solihull</span></div><div><b>{dmin[3]:.1f} h</b><span>daylight in {dmin[0]} (sunset {dmin[2]})</span></div></div></div></section>',
        L.sec("month", "Month by month", "Solihull, month by month",
              "National pass rates by month (Collingwood's analysis of about ten million DVSA tests, 2019–2025) alongside sunrise, sunset and daylight we calculated for Solihull town centre on the 15th of each month, and Solihull school holidays for 2026–27.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Month</th><th>Average pass rate (UK)</th><th>Sunrise</th><th>Sunset</th><th>Daylight</th><th>Solihull school holidays</th></tr></thead><tbody>{rows}</tbody></table></div>'
              '<p class="sol-note mt-2">Pass rates are national averages; "—" means the month wasn\'t in the published top or bottom three. Times are UK clock time (BST in summer). School holidays: Solihull Council calendar — academies may differ.</p>'),
        L.sec("why", "What it means", "Why spring is the sweet spot — and autumn is harder",
              "The differences are small (about four percentage points between the best and worst months), but in Solihull several things line up.",
              L.cards([("bi-sun", "February to April", "Pass rates are highest nationally, the evenings get lighter each week (sunset moves from about 17:20 to 20:05), and April is usually one of the drier months at nearby Birmingham Airport."),
                       ("bi-cloud-drizzle", "October to December", "The lowest pass rates nationally. The clocks go back on 25 October 2026, sunset is before 16:30 by mid-November, low winter sun causes glare, and November has the most wet days at Birmingham Airport."),
                       ("bi-backpack", "School holidays", "Fewer school runs usually mean calmer roads around Solihull's schools — handy for lessons, though test slots still go fast."),
                       ("bi-calendar-check", "What matters most", "Being ready. A learner who can drive a full test calmly on their centre's roads beats any calendar. Book when your instructor says you're ready — then, if you can choose, aim for spring."),
                       ("bi-building", "Shirley test centre", "Solihull's own centre had a 58.1% pass rate in 2024-25 — well above the national average, whatever the month."),
                       ("bi-journal-check", "Theory test too", "For the theory test, February had the highest average pass rate nationally (56.4%).")]), alt=True),
        L.sec("plan", "Plan backwards", "Working back from a spring test", "Test waiting times vary, so plan early.",
              '<ol style="font-size:.95rem"><li class="mb-2"><b>Autumn:</b> start lessons and pass your theory test.</li><li class="mb-2"><b>Winter:</b> build skills — use the dark evenings to practise night driving and wet roads (it counts on the test too).</li><li class="mb-2"><b>January–February:</b> mock tests on your centre\'s roads; book the practical as soon as your instructor agrees.</li><li class="mb-2"><b>March–April:</b> test day — lighter, drier, and historically the best months.</li></ol>'
              f'<p>Tools: <a href="solihull-daylight-driving-planner.html">daylight &amp; sun-glare planner</a> · <a href="solihull-driving-test-readiness-check.html">readiness check</a> · <a href="solihull-school-term-dates-driving-lessons.html">term dates &amp; lesson timing</a></p>'),
        sources(["coll", "coll_th", "dvsa", "pr", "ws", "noaa", "terms"]),
    ]
    faqs = [("What is the best month to take a driving test?", "Nationally, April has had the highest average pass rate (about 51.7% across DVSA data for 2019–2025), followed by February and March. November has been the lowest (about 47.7%)."),
            ("Is it harder to pass a driving test in winter in Solihull?", f"Pass rates dip slightly in October to December. In Solihull the sun sets around {dmin[2]} in mid-December, there's low winter sun and more wet days — so practise in the dark and the wet before your test."),
            ("Should I wait for spring to book my test?", "Only if you're not ready yet. Readiness matters far more than the month — the difference between the best and worst months is only about four percentage points.")]
    return f, page(f, "Best month for your test", "Best Month to Take Your Driving Test in Solihull (2026-27) | DriveSQ",
                   "When to take your driving test in Solihull: pass rates by month (DVSA data), Solihull sunrise, sunset and daylight for every month, school holidays and weather — and how to plan back from a spring test.",
                   "best month to take driving test, best time to take driving test solihull, driving test pass rate by month, solihull driving test",
                   ("Data · Solihull", '<span class="w">Best</span> <span class="w w--red">Month</span> <span class="w">to Test.</span>', "pass rates, daylight and school holidays — month by month in Solihull",
                    [("bi-bar-chart", "DVSA data 2019–2025"), ("bi-sun", "Solihull daylight"), ("bi-calendar3", "2026–27 holidays")],
                    [("red", "#month", "bi-table", "See every month"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")]), secs, faqs)


def winter():
    f = "winter-driving-solihull.html"
    secs = [
        '<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>9</b><span>council gritting routes</span></div><div><b>56%</b><span>of borough roads on those routes</span></div><div><b>10×</b><span>stopping distance on ice (up to)</span></div><div><b>25 Oct</b><span>clocks go back (2026)</span></div></div></div></section>',
        L.sec("gritting", "What gets gritted", "What Solihull Council grits — and what it doesn't",
              "From the council's Winter Services Plan. Knowing this tells you which roads will be treated on an icy morning — and which won't.",
              L.cards([("bi-signpost-2", "Main roads", "The classified road network (A, B and classified C roads) is on the nine pre-salting and snow-clearing routes."),
                       ("bi-bus-front", "Busy bus routes", "Roads carrying TfWM bus services at intervals of 30 minutes or better are included too."),
                       ("bi-stopwatch", "Within 3 hours", "Every route in the plan is gritted within three hours of a treatment starting. Together the nine routes cover about 56% of the borough's roads."),
                       ("bi-shop", "Town-centre pavements", "High-amenity footways in the town centres of Solihull, Shirley, Knowle, Hobs Moat, Marston Green and Dorridge are treated separately, aimed at being done by 8am."),
                       ("bi-house", "Estate roads usually aren't", "Quiet residential streets and cul-de-sacs — where most first lessons and pick-ups happen — are generally not on the pre-salting routes."),
                       ("bi-exclamation-triangle", "So on icy mornings", "Expect a treated main road and an untreated side street. The riskiest part of the lesson is often the first and last 200 metres.")])),
        L.sec("learners", "For learners", "Driving lessons in a Solihull winter", "How we adapt lessons — and what to practise before your test.",
              '<ul style="font-size:.95rem"><li class="mb-2"><b>Ice:</b> stopping distances can be up to ten times longer. We use gentle braking and big gaps — and if your street is a sheet of ice, we\'ll pick you up from the nearest treated road or move the lesson.</li>'
              '<li class="mb-2"><b>Fog:</b> low-lying land around the M42, the NEC and the airport collects mist. Dipped headlights when visibility is seriously reduced; fog lights only below about 100 metres — and off again when it clears.</li>'
              '<li class="mb-2"><b>Dark evenings:</b> after the clocks go back, after-school lessons are in the dark. That\'s good practice — headlight use, dazzle and seeing pedestrians.</li>'
              '<li class="mb-2"><b>Low sun:</b> winter sun sits low over the A34, A41 and A45 at rush hour. Keep the windscreen clean inside and out; use the visor.</li>'
              '<li class="mb-2"><b>Test day:</b> if DVSA cancels your test for ice, snow or fog you get a free new date. Bad-weather cancellations don\'t qualify for out-of-pocket expenses.</li></ul>'
              f'<p>More: <a href="which-lights-should-i-use.html">which lights should I use?</a> · <a href="solihull-daylight-driving-planner.html">sun-glare planner</a> · <a href="{L.SQ}/guides/fog-and-headlights.html">fog guide</a></p>', alt=True),
        L.sec("check", "Before you set off", "A two-minute winter check", "The same checks examiners expect you to know.",
              L.cards([("bi-snow", "Clear all the glass", "Every window, mirror and light — not just a porthole. The Highway Code says you must be able to see."),
                       ("bi-droplet", "Screen wash", "Topped up with a winter mix."),
                       ("bi-thermometer-snow", "Tyres", "Good tread and correct pressure — grip matters most in the cold."),
                       ("bi-lightbulb", "Lights", "All working and clean."),
                       ("bi-phone", "Plan", "Check the forecast and leave extra time."),
                       ("bi-bag", "Kit", "Scraper, de-icer, warm layer and a charged phone.")])),
        sources(["winter", "gfaq", "hc_weather", "hc_speed", "cancel", "noaa"]),
    ]
    faqs = [("Which roads does Solihull Council grit?", "The classified road network and bus routes with services every 30 minutes or better, on nine routes, each treated within three hours. Together they cover about 56% of the borough's roads. Town-centre pavements are treated separately. Most quiet residential streets are not pre-salted."),
            ("Do driving lessons go ahead in snow and ice?", "Often, with care — it's useful practice. If roads are unsafe, we move the lesson or pick you up from a treated road."),
            ("What happens if my driving test is cancelled for bad weather?", "DVSA gives you a free new date. Weather cancellations don't qualify for out-of-pocket expenses.")]
    return f, page(f, "Winter driving in Solihull", "Winter Driving in Solihull: Gritting Routes, Ice & Fog for Learners | DriveSQ",
                   "Which Solihull roads the council grits (9 routes, main roads and frequent bus routes, within 3 hours) and which it doesn't — plus how learners should handle ice, fog, dark evenings and low sun.",
                   "solihull gritting routes, winter driving solihull, driving lessons in snow, icy roads learner driver",
                   ("Winter · Solihull", '<span class="w">Winter</span> <span class="w w--red">Driving</span> <span class="w">Solihull.</span>', "what the council grits, and how learners stay safe on ice, fog and dark evenings",
                    [("bi-signpost-2", "9 gritting routes"), ("bi-snow", "Ice & fog"), ("bi-moon-stars", "Dark evenings")],
                    [("red", "#gritting", "bi-info-circle", "What gets gritted"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")]), secs, faqs)


def term_dates():
    f = "solihull-school-term-dates-driving-lessons.html"
    hol = "".join(f'<tr><td>{e(n)}</td><td>{a}</td><td>{b}</td></tr>' for n, a, b in HOLS)
    bank = "".join(f'<tr><td>{e(n)}</td><td>{d}</td></tr>' for n, d in BANK)
    tool = """<div class="sol-card reveal" style="padding:22px"><label for="tdIn" style="font-weight:700;display:block;margin-bottom:8px">Pick a date for a lesson or test</label>
<div style="display:flex;gap:8px;flex-wrap:wrap"><input type="date" id="tdIn" class="form-control" style="max-width:220px"><button id="tdGo" class="dsqx-btn dsqx-btn--red" type="button"><i class="bi bi-search"></i>Check</button></div>
<div id="tdOut" aria-live="polite" class="mt-3"></div></div>
<script>(function(){var H=""" + json.dumps(HOLS) + """,B=""" + json.dumps(BANK) + """;
function sun(d,rise){var LAT=52.413,LON=-1.778,N=Math.round((d-new Date(d.getFullYear(),0,0))/864e5),lh=LON/15,t=N+((rise?6:18)-lh)/24,M=0.9856*t-3.289,r=Math.PI/180;
var Lg=(M+1.916*Math.sin(M*r)+0.020*Math.sin(2*M*r)+282.634)%360,RA=(Math.atan(0.91764*Math.tan(Lg*r))/r+360)%360;RA=(RA+(Math.floor(Lg/90)*90-Math.floor(RA/90)*90))/15;
var sd=0.39782*Math.sin(Lg*r),cd=Math.cos(Math.asin(sd)),ch=(Math.cos(90.833*r)-sd*Math.sin(LAT*r))/(cd*Math.cos(LAT*r)),Hh=(rise?360-Math.acos(ch)/r:Math.acos(ch)/r)/15;
var T=Hh+RA-0.06571*t-6.622,UT=((T-lh)%24+24)%24;var dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(UT),Math.round((UT%1)*60)));return dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});}
function run(){var v=document.getElementById('tdIn').value,o=document.getElementById('tdOut');if(!v){o.innerHTML='<p>Choose a date.</p>';return;}
var d=new Date(v+'T12:00:00'),dow=d.getDay(),we=dow===0||dow===6,hol=H.find(function(h){return v>=h[1]&&v<=h[2];}),bh=B.find(function(b){return b[1]===v;});
var tip=bh?'Bank holiday — test centres are closed and roads can be busy around the NEC, airport and retail parks.':we?'Weekend — no school runs; retail parks and Touchwood get busy from late morning.':hol?'School holiday — no school runs, so weekday roads are usually calmer. A good time for town-centre and junction practice.':'Term-time weekday — school runs typically around 8:15–9:15 and 2:45–3:45. Quieter lesson slots are usually 9:30–2:30. 20 mph school zones and crossing patrols are active.';
o.innerHTML='<p style="font-size:1.05rem"><b>'+d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</b>'+(bh?' · <span style="color:#D10A11">'+bh[0]+'</span>':'')+(hol?' · '+hol[0]:'')+'</p><div class="sol-kpi" style="margin-top:10px"><div><b>'+sun(d,true)+'</b><span>sunrise in Solihull</span></div><div><b>'+sun(d,false)+'</b><span>sunset</span></div><div><b>'+(bh?'Closed':dow===0?'Closed':dow===6?'Some':'Open')+'</b><span>DVSA test centres</span></div></div><p class="mt-3">'+tip+'</p><p class="sol-note">School dates follow Solihull Council\\'s calendar — academies may differ. Times are approximate.</p>';}
document.getElementById('tdGo').addEventListener('click',run);var i=document.getElementById('tdIn');i.value=new Date().toISOString().slice(0,10);run();})();</script>"""
    secs = [
        L.sec("checker", "Date checker", "Is it term time? When's sunset? Is it a bank holiday?", "Pick any date to see school holidays, bank holidays, sunrise and sunset in Solihull — and the quietest times for a lesson.", tool),
        L.sec("terms", "Term dates", "Solihull school holidays 2026–27", "Solihull Council's calendar for community and voluntary-controlled schools, as listed by Save My Exams — confirm with the council or your school. Academies and independent schools (such as Solihull School) set their own — check with your school.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Holiday</th><th>From</th><th>To</th></tr></thead><tbody>{hol}</tbody></table></div>', alt=True),
        L.sec("bank", "Bank holidays", "Bank holidays 2026–27", "Driving test centres don't run tests on bank holidays.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Bank holiday</th><th>Date</th></tr></thead><tbody>{bank}</tbody></table></div>'),
        L.sec("timing", "Timing your lessons", "When to have your lessons in Solihull", "Small changes in timing make lessons calmer — or deliberately busier when you're ready.",
              L.cards([("bi-sunrise", "First lessons", "Term-time weekdays between 9:30 and 2:30, or school-holiday mornings — the calmest roads."),
                       ("bi-people", "School-run practice", "Once you're confident, lessons at 8:30 or 3:15 teach parked cars, crossing patrols and children near the road — all things examiners watch for."),
                       ("bi-moon", "Evening lessons", "From late October, after-school lessons are in the dark — great night-driving practice."),
                       ("bi-calendar-event", "Test week", "Have a lesson at the same time of day as your test, on your centre's roads."),
                       ("bi-airplane", "Airport and NEC", "School holidays bring busier traffic around Birmingham Airport and the NEC — useful practice on the A45 and M42 junctions."),
                       ("bi-briefcase", "Shift changes", "Around the JLR plant on Lode Lane, shift-change traffic is a real-world lesson in anticipation.")]), alt=True),
        sources(["terms", "bank", "noaa"]),
    ]
    faqs = [("When are the Solihull school holidays in 2026–27?", "Under Solihull Council's calendar: autumn half term 26–30 Oct 2026, Christmas 21 Dec 2026–1 Jan 2027, spring half term 15–19 Feb 2027, Easter 26 Mar–9 Apr 2027, summer half term 31 May–4 Jun 2027 and summer expected from 22 Jul 2027 (not yet confirmed). Academies may differ."),
            ("Are driving tests held on bank holidays?", "No — DVSA test centres don't run tests on bank holidays."),
            ("What's the best time of day for driving lessons?", "For beginners, term-time weekdays 9:30–2:30. Later, practise in the school run and in the dark so nothing on test day is new.")]
    return f, page(f, "Term dates & lesson timing", "Solihull School Term Dates 2026-27 & Best Times for Driving Lessons | DriveSQ",
                   "Solihull school holidays and bank holidays for 2026–27, school-run times, and a date checker with sunrise and sunset in Solihull — plan driving lessons and your test around them.",
                   "solihull term dates 2026 2027, solihull school holidays, best time for driving lessons, driving test bank holiday",
                   ("Plan · Solihull", '<span class="w">Term</span> <span class="w w--red">Dates</span> <span class="w">&amp; Timing.</span>', "plan lessons and your test around Solihull's school year",
                    [("bi-calendar3", "2026–27 term dates"), ("bi-sun", "Sunrise & sunset"), ("bi-search", "Date checker")],
                    [("red", "#checker", "bi-search", "Check a date"), ("ghost", "#terms", "bi-table", "Term dates")]), secs, faqs)


def rules_2026():
    f = "driving-test-rule-changes-2026-solihull.html"
    near = [("Birmingham (Shirley)", "Kings Heath (2.7 mi), South Yardley (3.5 mi), Garretts Green (5.2 mi)"),
            ("Birmingham (South Yardley)", "Garretts Green (2.1 mi), Shirley (3.5 mi), Kings Heath (4.6 mi)"),
            ("Birmingham (Kings Heath)", "Shirley (2.7 mi), South Yardley (4.6 mi), Garretts Green (6.7 mi)")]
    nt = "".join(f'<tr><td><b>{e(a)}</b></td><td>{e(b)}</td></tr>' for a, b in near)
    secs = [
        '<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>2</b><span>changes allowed per booking (from 31 Mar 2026)</span></div><div><b>Learner only</b><span>can book or change the test (from 12 May 2026)</span></div><div><b>3</b><span>nearest centres you can move to (from 9 Jun 2026)</span></div><div><b>9.7 wks</b><span>GB median wait, May 2026</span></div></div></div></section>',
        L.sec("rules", "What changed", "The three booking rule changes of 2026", "All three are now in force for car driving tests in Great Britain. They don't apply to other test types.",
              L.cards([("bi-arrow-repeat", "31 March — two changes per booking", "You can change the date, time or centre of a booked test twice. Changes DVSA makes (for example bad weather) don't count, and reset you to two."),
                       ("bi-person-lock", "12 May — only you can book", "Learners must book and manage their own car test on GOV.UK. Instructors, friends and booking apps can no longer do it for you — it's now against the law to book or change a test for someone else."),
                       ("bi-geo-alt", "9 June — nearby centres only", "You can only move a booked test to one of the three centres nearest to where it's booked, or back to the centre you first booked on that booking."),
                       ("bi-shield-exclamation", "Why", "DVSA says the changes stop bots and resellers buying up tests and selling them on at a mark-up."),
                       ("bi-cash-coin", "Avoid swap apps", "Paying a third party to find or swap a test can now break the rules. Only use GOV.UK."),
                       ("bi-hand-thumbs-up", "What we do", "We help you book it yourself: we agree the right time, sit with you while you use GOV.UK if you want, and plan lessons around the date.")])),
        L.sec("near", "Solihull centres", "Where can you move a Solihull-area test?",
              "Our straight-line estimate of the three nearest centres. DVSA's booking service shows your exact options when you change a booking — always go by that.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Test booked at</th><th>Likely three nearest centres</th></tr></thead><tbody>{nt}</tbody></table></div>'
              '<p class="sol-note mt-2">Distances are straight-line between test centres. Shirley is Solihull\'s own centre (58.1% pass rate in 2024-25).</p>', alt=True),
        L.sec("waits", "Waiting times", "How long is the wait?", "Two different measures are published — they tell very different stories.",
              L.cards([("bi-hourglass-split", "Average: about 22 weeks", "The national average wait was 22.1 weeks in May 2026, according to the Roads Minister. Averages are pulled up by the worst centres."),
                       ("bi-bar-chart-steps", "Median: about 10 weeks", "DVSA started publishing a median in June 2026: 9.7 weeks across Great Britain for May 2026. Half of learners waited less."),
                       ("bi-geo", "Near Solihull", "Learners tested at Kings Heath in May 2026 had a median wait of 10 weeks from booking to test day."),
                       ("bi-flag", "The target", "The government aims to bring average waits down to seven weeks by the end of 2027.")])
              + '<p class="mt-3"><b>What it means for you:</b> book your theory test early, and book the practical as soon as your instructor says you\'re close — then use the two changes wisely.</p>'),
        L.sec("next", "Coming next?", "Proposed — not law yet", "The Road Safety Strategy (January 2026) asked for views on further changes. None of these is in force.",
              L.cards([("bi-calendar-range", "Minimum learning period", "A three- or six-month minimum between getting a provisional licence (or passing theory) and taking the practical test, plus possibly minimum supervised hours."),
                       ("bi-cup-straw", "Lower drink-drive limit", "From 35 to 22 micrograms per 100 ml of breath in England and Wales, matching Scotland — with a possible lower limit for new drivers."),
                       ("bi-moon-stars", "Why it matters now", "Practise in the dark, in the rain and in heavy traffic anyway. If a minimum period arrives, learners who already have that experience lose nothing.")]), alt=True),
        L.sec("how", "Booking it yourself", "How to book your test in five minutes", "You need your provisional licence number, your theory test pass certificate number and a card to pay.",
              '<ol style="font-size:.95rem"><li class="mb-2">Agree a date range with your instructor first.</li><li class="mb-2">Go to <a href="https://www.gov.uk/book-driving-test" target="_blank" rel="noopener">gov.uk/book-driving-test</a> — the only official site.</li><li class="mb-2">Choose Birmingham (Shirley) or your preferred centre. Look for earlier dates when you log in to change it — that\'s free.</li><li class="mb-2">Tell your instructor the date and time straight away so the car is booked.</li><li class="mb-2">Keep the confirmation email. Remember: two changes, and only to nearby centres.</li></ol>'
              '<p>Plan: <a href="best-month-driving-test-solihull.html">best month for your test</a> · <a href="solihull-driving-test-readiness-check.html">readiness check</a> · <a href="solihull-driving-test-centre-finder.html">test centre finder</a></p>'),
        sources(["rules", "rules_news", "book", "waits_letter", "waits_median", "kh", "shirley", "nao", "rss"]),
    ]
    faqs = [("Can my driving instructor book my driving test for me in 2026?", "No. Since 12 May 2026 learners must book and manage their own car driving test on GOV.UK. Your instructor can help you choose a date, but you have to make the booking."),
            ("How many times can I change my driving test date?", "Twice per booking since 31 March 2026. Changes DVSA makes, such as for bad weather, don't count and reset you to two."),
            ("Can I move my Shirley driving test to another centre?", "Only to one of the three centres nearest to where it's booked (since 9 June 2026). By straight-line distance that's likely Kings Heath, South Yardley and Garretts Green — the booking service shows your exact options."),
            ("Is there a minimum learning period for learner drivers?", "Not yet. The government consulted in 2026 on a three- or six-month minimum learning period, but it is not law.")]
    return f, page(f, "2026 test rule changes", "Driving Test Rule Changes 2026 Explained for Solihull Learners | DriveSQ",
                   "The 2026 driving test booking rules: two changes per booking, learners must book their own test, and moves only to the three nearest centres — what it means at Shirley, plus latest waiting times and proposed changes.",
                   "driving test rule changes 2026, can instructor book driving test, change driving test 2 times, three nearest test centres, shirley driving test",
                   ("Latest · 2026", '<span class="w">New</span> <span class="w w--red">Test</span> <span class="w">Rules 2026.</span>', "what changed for booking your driving test — and what it means in Solihull",
                    [("bi-patch-check", "From GOV.UK"), ("bi-geo-alt", "Shirley & nearby"), ("bi-clock-history", "Latest waits")],
                    [("red", "#rules", "bi-list-check", "What changed"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")]), secs, faqs)


def caz():
    f = "birmingham-clean-air-zone-solihull-drivers.html"
    tool = """<div class="sol-card reveal" style="padding:22px"><b style="display:block;margin-bottom:10px">Will my (first) car pay the Birmingham Clean Air Zone charge?</b>
<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label style="font-size:.85rem">Fuel<select id="cazFuel" class="form-select" style="min-width:150px"><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="hybrid-p">Petrol hybrid</option><option value="hybrid-d">Diesel hybrid</option><option value="ev">Fully electric</option></select></label>
<label style="font-size:.85rem">First registered (year)<input id="cazYear" class="form-control" type="number" min="1990" max="2026" value="2012" style="max-width:130px"></label>
<label style="font-size:.85rem">Month<select id="cazMonth" class="form-select"><option value="1">Jan–Aug</option><option value="9">Sep–Dec</option></select></label>
<button id="cazGo" class="dsqx-btn dsqx-btn--red" type="button"><i class="bi bi-search"></i>Check</button></div>
<div id="cazOut" aria-live="polite" class="mt-3"></div>
<p class="sol-note mb-0">A rule of thumb from the Euro standard dates only. Always confirm with the official vehicle checker on GOV.UK before you buy or drive in.</p></div>
<script>(function(){function run(){var f=document.getElementById('cazFuel').value,y=+document.getElementById('cazYear').value,m=+document.getElementById('cazMonth').value,o=document.getElementById('cazOut'),r,c;
if(!y){o.innerHTML='<p>Enter a year.</p>';return;}
if(f==='ev'){r='No charge';c='#16a34a';t='Fully electric cars don\\'t pay.';}
else if(f==='petrol'||f==='hybrid-p'){if(y>=2006){r='Very likely compliant';c='#16a34a';t='Petrol cars need Euro 4 — required for all new cars from January 2006.';}else if(y>=2005){r='Check it';c='#d97706';t='Some 2005 petrol cars already met Euro 4. Check the exact car.';}else{r='Likely to pay £8 a day';c='#D10A11';t='Most petrol cars before 2005 are below Euro 4.';}}
else{var ok=y>2015||(y===2015&&m>=9);if(ok){r='Very likely compliant';c='#16a34a';t='Diesel cars need Euro 6 — required for new cars from September 2015.';}else if(y>=2014){r='Check it';c='#d97706';t='Some diesel cars from 2014–15 already met Euro 6. Check the exact car.';}else{r='Likely to pay £8 a day';c='#D10A11';t='Most diesel cars before 2014 are below Euro 6.';}}
o.innerHTML='<div class="sol-kpi"><div><b style="color:'+c+'">'+r+'</b><span>'+t+'</span></div></div>';}
document.getElementById('cazGo').addEventListener('click',run);run();})();</script>"""
    secs = [
        '<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>£8</b><span>a day for a non-compliant car</span></div><div><b>24/7</b><span>every day of the year</span></div><div><b>6 days</b><span>to pay, before or after your trip</span></div><div><b>£120</b><span>penalty if unpaid (£60 within 14 days)</span></div></div></div></section>',
        L.sec("zone", "The zone", "Where is it — and does it affect Solihull?",
              "Birmingham's Clean Air Zone covers the city centre inside the A4540 Middleway ring road. Solihull itself has no clean air zone.",
              L.cards([("bi-geo", "Inside the Middleway", "Every road inside the A4540 Middleway ring road is in the zone. The Middleway itself is not charged — you can drive around the ring without paying."),
                       ("bi-signpost", "From Solihull", "The A41 (Warwick Road), A45 (Coventry Road) and A34 (Stratford Road) all lead towards the Middleway. Turn onto the ring rather than crossing it and you stay outside."),
                       ("bi-car-front", "Driving lessons", "Solihull lessons and test routes from Shirley stay well outside the zone. If a lesson goes into the city centre, it's the instructor's car that has to be compliant — not yours."),
                       ("bi-train-front", "Going into town", "For a day in the city centre, the train from Solihull, Olton or Shirley to Moor Street or Snow Hill avoids the question altogether."),
                       ("bi-camera", "How it's enforced", "Number-plate cameras. There are no barriers or tickets — you pay online by vehicle registration."),
                       ("bi-universal-access", "Exemptions", "Some vehicles are exempt, including motorcycles and vehicles in the disabled tax class. Fully electric cars don't pay. Check Brum Breathes for the full list.")])),
        L.sec("check", "First-car checker", "Buying your first car? Check it first", "A cheap older diesel can cost £8 every day it goes into Birmingham city centre.", tool, alt=True),
        L.sec("tips", "New drivers", "What new drivers in Solihull should know", "The zone mostly matters when you start driving on your own.",
              L.cards([("bi-cash-stack", "Compliant cars are easy to find", "Most petrol cars from 2006 on meet Euro 4 — and small petrol cars are usually cheaper to insure for new drivers too."),
                       ("bi-exclamation-octagon", "Watch older diesels", "Diesels need Euro 6 (most from September 2015). Older ones are often cheap for a reason."),
                       ("bi-phone", "Sat-nav routes", "Navigation apps may route you through the centre. Check for 'via Middleway' or set Moor Street car parks carefully."),
                       ("bi-calendar-x", "Don't forget to pay", "Pay online within six days after entering — or up to six days before. Miss it and the penalty is £120 plus the charge.")])),
        sources(["caz_pay", "caz_org", "caz_rac", "caz_gov"]),
    ]
    faqs = [("Does Solihull have a clean air zone?", "No. Birmingham's Clean Air Zone covers only the city centre inside the A4540 Middleway ring road. Solihull town centre, Shirley and the rest of the borough are outside it."),
            ("How much is the Birmingham Clean Air Zone charge for a car?", "£8 a day for a car that doesn't meet the standard (Euro 4 petrol or Euro 6 diesel). If you don't pay, the penalty is £120, reduced to £60 if paid within 14 days."),
            ("Do driving lessons go into the Birmingham Clean Air Zone?", "Solihull lessons and Shirley test routes stay well outside it. Lessons are in the instructor's car, so you'd never pay a charge for a lesson.")]
    return f, page(f, "Clean Air Zone guide", "Birmingham Clean Air Zone Guide for Solihull Drivers & New Drivers | DriveSQ",
                   "Birmingham's Clean Air Zone explained for Solihull: where it is, the £8 daily charge, Euro 4 petrol and Euro 6 diesel rules, penalties — plus a first-car checker for new drivers.",
                   "birmingham clean air zone solihull, birmingham caz charge, is my car caz compliant, first car clean air zone",
                   ("New drivers · Birmingham", '<span class="w">Clean</span> <span class="w w--red">Air</span> <span class="w">Zone.</span>', "what Solihull drivers need to know — and a first-car checker",
                    [("bi-geo", "Inside the Middleway"), ("bi-cash", "£8 a day"), ("bi-search", "First-car checker")],
                    [("red", "#check", "bi-search", "Check a car"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")]), secs, faqs)


def j5a():
    f = "m42-junction-5a-a4545-new-road-solihull.html"
    secs = [
        '<section class="sol-sec" style="padding-top:36px"><div class="container"><div class="sol-kpi reveal"><div><b>J5A</b><span>new M42 junction</span></div><div><b>2.4 km</b><span>A4545 dual carriageway</span></div><div><b>18 Dec 2024</b><span>opened to traffic</span></div><div><b>£282m</b><span>M42 junction 6 scheme</span></div></div></div></section>',
        L.sec("what", "What changed", "Solihull's newest motorway junction", "Part of National Highways' M42 junction 6 improvement scheme — built to take pressure off the old junction 6 by Birmingham Airport and the NEC.",
              L.cards([("bi-sign-merge-right", "Junction 5A", "A new M42 junction about 1.8 km south of junction 6."),
                       ("bi-signpost-split", "The A4545 link road", "A new 2.4 km dual carriageway from junction 5A to the Clock Interchange on the A45, west of Bickenhill."),
                       ("bi-airplane", "Airport slip road", "A dedicated slip road from the A4545 into Birmingham Airport opened when the scheme's traffic management was removed."),
                       ("bi-bridge", "Solihull Road bridge", "Rebuilt and reopened in June 2023 as part of the same scheme, with work along Catherine de Barnes Lane in phases after that."),
                       ("bi-map", "Old maps are wrong", "Older sat-navs and maps don't show J5A or the A4545. Update yours before you rely on it."),
                       ("bi-cone-striped", "Watch for changes", "Final stages of a big scheme can mean changed lane markings and temporary limits. Read the signs, not your memory.")])),
        L.sec("learners", "For learners", "How we use it in lessons", "Learners can drive on motorways with an Approved Driving Instructor in a dual-controlled car. J5A is one of the most useful junctions in Solihull to learn.",
              '<ul style="font-size:.95rem"><li class="mb-2"><b>A new dual carriageway:</b> the A4545 is a modern dual carriageway — good practice for joining, lane discipline and higher speeds before a first motorway lesson. Always check the signed limit.</li>'
              '<li class="mb-2"><b>Joining the M42:</b> use the slip road to match speed, check mirrors and blind spot, and merge. Never stop on the slip road unless traffic is stationary.</li>'
              '<li class="mb-2"><b>Clock Interchange:</b> a large junction on the A45 — read the lane signs early and pick your lane before the roundabout.</li>'
              '<li class="mb-2"><b>Airport and NEC traffic:</b> expect drivers looking for terminals and car parks — give extra room and anticipate late lane changes.</li>'
              '<li class="mb-2"><b>On your own after passing:</b> consider a motorway refresher or Pass Plus before your first solo M42 trip.</li></ul>'
              '<p>Motorway lessons are always with an ADI. See also: <a href="winter-driving-solihull.html">winter driving and gritting</a> · <a href="birmingham-clean-air-zone-solihull-drivers.html">Clean Air Zone guide</a></p>', alt=True),
        sources(["nh_j6", "nh_open", "nh_full", "gov_282", "hc_mway"]),
    ]
    faqs = [("When did M42 junction 5A open?", "National Highways opened the A4545 link road and the new junction 5A to traffic on 18 December 2024, with the airport slip road opening later when traffic management was removed."),
            ("Where does the A4545 go?", "It's a 2.4 km dual carriageway from M42 junction 5A to the Clock Interchange on the A45, west of Bickenhill, near Birmingham Airport and the NEC."),
            ("Can learner drivers use the M42?", "Yes, with an Approved Driving Instructor in a car with dual controls. DriveSQ motorway lessons are always with an ADI.")]
    return f, page(f, "M42 J5A & A4545", "M42 Junction 5A & A4545 Link Road Explained: Solihull's New Road | DriveSQ",
                   "The M42 junction 5A and the 2.4 km A4545 link road to the Clock Interchange (opened December 2024) explained for Solihull drivers and learners — airport, NEC, motorway lessons.",
                   "m42 junction 5a, a4545 link road, clock interchange, m42 junction 6 improvement, solihull motorway lessons",
                   ("New road · Solihull", '<span class="w">M42</span> <span class="w w--red">J5A</span> <span class="w">&amp; A4545.</span>', "Solihull's newest junction — and how learners use it",
                    [("bi-sign-merge-right", "Junction 5A"), ("bi-airplane", "Airport & NEC"), ("bi-person-badge", "ADI motorway lessons")],
                    [("red", "#what", "bi-info-circle", "What changed"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")]), secs, faqs)


def main():
    out = dict([best_month(), winter(), term_dates(), rules_2026(), caz(), j5a()])
    for f, h in out.items():
        open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml")
    x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{L.SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
