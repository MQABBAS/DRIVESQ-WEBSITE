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


def main():
    out = dict([best_month(), winter(), term_dates()])
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
