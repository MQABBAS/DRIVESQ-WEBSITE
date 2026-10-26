#!/usr/bin/env python3
"""DriveSQ Solihull, part 2 — tools and guides that driving-school sites don't have.

SQ Driving School already covers Solihull areas, postcodes, schools, roads and lesson types, so DriveSQ's pages take
a different angle: free interactive tools (test-centre finder, full licence cost calculator, daylight & sun-glare
planner, test-readiness check, week-by-week lesson plan) and guides for parents, new drivers, the theory test and
instructor training. Every page links to the matching SQ Driving School pages (and SQ links back) so the two sites
support each other. Fees and rules are from GOV.UK; pass rates from passrates.uk's analysis of DVSA data.
Run: python3 generate_solihull_more.py   (generate-solihull-pages.py builds the first four pages)"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("gsp", os.path.join(HERE, "generate-solihull-pages.py"))
G = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(G)
SQ, e = G.SQ, G.e
SQS = SQ + "/solihull/"

NEW = [
    ("solihull-driving-test-centre-finder.html", "Test centre finder", "Centre finder"),
    ("solihull-learner-driver-cost-calculator.html", "Licence cost calculator", "Cost calculator"),
    ("solihull-daylight-driving-planner.html", "Daylight & sun-glare planner", "Daylight planner"),
    ("solihull-driving-test-readiness-check.html", "Test readiness check", "Readiness check"),
    ("solihull-learner-driver-lesson-plan.html", "Week-by-week lesson plan", "Lesson plan"),
    ("solihull-parents-guide-learner-drivers.html", "Parents' guide", "Parents"),
    ("solihull-new-drivers-first-year.html", "Your first year after passing", "New drivers"),
    ("solihull-theory-test-guide.html", "Theory test guide", "Theory test"),
    ("driving-instructor-training-solihull.html", "Become a driving instructor", "Instructor training"),
    ("solihull-learner-driver-insurance.html", "Learner driver insurance", "Insurance"),
    ("solihull.html", "Every Solihull page", "All Solihull"),
]
# make the base generator aware of the new pages (breadcrumbs + DriveSQ cross-link cards)
G.PAGES = G.PAGES + [(f, lbl, short) for f, lbl, short in NEW]
_base_nav = G.nav
def _nav(active):  # keep the bar short: the four core pages plus the hub
    keep = G.PAGES
    G.PAGES = keep[:4] + [p for p in keep if p[0] == "solihull.html"]
    try:
        return _base_nav(active)
    finally:
        G.PAGES = keep
G.nav = _nav

GOV = {
    "fees": ("GOV.UK — Driving test cost", "https://www.gov.uk/driving-test-cost"),
    "prov": ("GOV.UK — Apply for your first provisional driving licence", "https://www.gov.uk/apply-first-provisional-driving-licence"),
    "theory": ("GOV.UK — Theory test: cars", "https://www.gov.uk/theory-test"),
    "book_theory": ("GOV.UK — Book your theory test", "https://www.gov.uk/book-theory-test"),
    "book": ("GOV.UK — Book your driving test", "https://www.gov.uk/book-driving-test"),
    "solihull_closed": ("GOV.UK — Solihull theory test centre to close (2011)", "https://www.gov.uk/government/news/solihull-theory-test-centre-to-close"),
    "lessons": ("GOV.UK — Driving lessons and learning to drive", "https://www.gov.uk/driving-lessons-learning-to-drive"),
    "supervise": ("GOV.UK — Supervising a learner driver", "https://www.gov.uk/supervise-learner-driver"),
    "newdriver": ("GOV.UK — Penalty points: new drivers", "https://www.gov.uk/penalty-points-endorsements/new-drivers"),
    "adi": ("GOV.UK — Become a car driving instructor", "https://www.gov.uk/become-car-driving-instructor"),
    "adi_fees": ("GOV.UK — Approved driving instructor (ADI) fees", "https://www.gov.uk/approved-driving-instructor-adi-fees"),
    "trainee": ("GOV.UK — Trainee driving instructor licence", "https://www.gov.uk/trainee-driving-instructor-licence"),
    "ins_learner": ("GOV.UK — Driving lessons and learning to drive: insurance", "https://www.gov.uk/driving-lessons-learning-to-drive/practising-with-family-or-friends"),
    "caz": ("Brum Breathes — Birmingham Clean Air Zone", "https://www.brumbreathes.co.uk/"),
    "hc": ("GOV.UK — The Highway Code", "https://www.gov.uk/guidance/the-highway-code"),
    "pr": ("passrates.uk — Birmingham test centres pass rates (2024-25, DVSA data)", "https://passrates.uk/guide/birmingham-driving-test-centres-pass-rates"),
    "noaa": ("NOAA — Solar calculation details (sunrise, sunset and sun position)", "https://gml.noaa.gov/grad/solcalc/calcdetails.html"),
}
FEES = {"prov": 34, "theory": 23, "prac": 62, "prac_eve": 75}  # GOV.UK, October 2026


def sq_cards(items):
    return '<div class="dsq-x">' + "".join(f'<a href="{SQS}{p}"><small>SQ Driving School</small><b>{t}</b><span>{d}</span></a>' for p, t, d in items) + "</div>"


def section(eye, title, inner, alt=False):
    return f'<section class="{"sg" if alt else "sw"}"><div class="container" style="max-width:980px"><span class="eye">{eye}</span><h2 class="sec-t">{title}</h2>{inner}</div></section>'


TOOL_CSS = """<style>
.dt{background:rgba(255,255,255,.03);border:1px solid rgba(209,10,17,.28);border-radius:18px;padding:22px;margin:18px 0}
.dt label{display:block;font-size:.8rem;color:#bbb;margin:0 0 4px;font-weight:600}
.dt input,.dt select{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:10px 12px;color:#f0f0f0;font-size:.92rem}
.dt select option{background:#1b1b1b}.dt .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;align-items:end}
.dt button{background:#D10A11;color:#fff;border:0;border-radius:10px;padding:11px 16px;font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:.4px;cursor:pointer}
.dt .out{margin-top:16px}.dt .k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0}
.dt .k div{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px}.dt .k b{display:block;font-family:'Oswald',sans-serif;font-size:1.4rem;color:#fff}.dt .k span{font-size:.78rem;color:#aaa}
.dt .note{font-size:.78rem;color:#999;margin-top:8px}.dt .best{color:#4ade80;font-weight:700}
.q{border-bottom:1px solid rgba(255,255,255,.08);padding:10px 0}.q p{margin:0 0 6px;color:#eee}.q .o{display:flex;gap:6px;flex-wrap:wrap}
.q .o label{display:inline-flex;gap:6px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 12px;font-size:.82rem;color:#ddd;cursor:pointer;margin:0}
.q .o input{width:auto}
.plan td,.plan th{white-space:nowrap}
</style>"""


def page(fname, title, desc, kw, h1, lead, pills, body, faqs, src, extra_schema=None, form_title="Book driving lessons in Solihull", opts=None):
    form = G.form(form_title, "A real person replies, usually within the hour. Goes straight to the DriveSQ team.", opts or G.LESSON_OPTS)
    html = G.build(fname, title, desc, kw, h1, lead, pills, TOOL_CSS + body, faqs, [GOV[k] if isinstance(k, str) else k for k in src], form, extra_schema)
    return html


def tool_schema(fname, name, desc):
    return [{"@context": "https://schema.org", "@type": "WebApplication", "name": name, "url": f"{G.SITE}/{fname}", "description": desc,
             "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"},
             "provider": {"@type": "Organization", "name": "DriveSQ", "url": G.SITE}}]


# ───────────────────────── 1. test centre finder ─────────────────────────
APPROX = {"Birmingham (Shirley)": (52.402, -1.822, "B90 4AA"), "Birmingham (Garretts Green)": (52.474, -1.773, "B33 0SD"),
          "Birmingham (South Yardley)": (52.464, -1.810, "B26 1EA"), "Birmingham (Kings Heath)": (52.414, -1.888, "B14 5JA"),
          "Redditch": (52.304, -1.952, "B97 6HJ"), "Coventry": (52.467, -1.483, ""), "Warwick (Wedgenock House)": (52.291, -1.597, "")}


def finder():
    f = "solihull-driving-test-centre-finder.html"
    data = [{"n": n, "a": a, "r": r, "t": t, "pc": APPROX[n][2], "lat": APPROX[n][0], "lon": APPROX[n][1], "sq": s} for n, a, r, t, _, s in G.CENTRES]
    tool = f"""<div class="dt" id="finder"><div class="g">
<div><label for="tf-pc">Your postcode</label><input id="tf-pc" placeholder="e.g. B91 3QJ" maxlength="8" style="text-transform:uppercase"></div>
<div><label for="tf-pri">What matters most?</label><select id="tf-pri"><option value="bal">A balance of both</option><option value="near">Closest to me</option><option value="rate">Highest pass rate</option></select></div>
<div><button type="button" id="tf-go">Find my test centre</button></div></div><div class="out" id="tf-out" aria-live="polite"></div></div>
<script>(function(){{var C={json.dumps(data)};
function mi(a,b){{var r=Math.PI/180,R=3959,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x));}}
var o=document.getElementById('tf-out');
document.getElementById('tf-go').addEventListener('click',function(){{
 var pc=document.getElementById('tf-pc').value.toUpperCase().replace(/[^A-Z0-9]/g,''),pri=document.getElementById('tf-pri').value;if(pc.length<2)return;
 var full=/^[A-Z]{{1,2}}\\d[A-Z\\d]?\\d[A-Z]{{2}}$/.test(pc);o.innerHTML='<p class="note">Looking up '+pc+'…</p>';
 var bulk=fetch('https://api.postcodes.io/postcodes',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{postcodes:C.filter(function(c){{return c.pc;}}).map(function(c){{return c.pc;}})}})}}).then(function(r){{return r.json();}}).then(function(b){{(b.result||[]).forEach(function(x){{if(x&&x.result){{C.forEach(function(c){{if(c.pc===x.query){{c.lat=x.result.latitude;c.lon=x.result.longitude;}}}});}}}});}}).catch(function(){{}});
 Promise.all([fetch('https://api.postcodes.io/'+(full?'postcodes/':'outcodes/')+pc).then(function(r){{return r.json();}}),bulk]).then(function(a){{var j=a[0];
  if(!j||!j.result){{o.innerHTML='<p class="note">We couldn\\'t find that postcode — check it, or message us on WhatsApp.</p>';return;}}
  var me=[j.result.latitude,j.result.longitude],L=C.map(function(c){{var d=mi(me,[c.lat,c.lon]);return Object.assign({{d:d}},c);}});
  var maxd=Math.max.apply(null,L.map(function(c){{return c.d;}}));
  L.forEach(function(c){{var near=1-c.d/maxd,rate=(c.r-40)/20;c.s=pri==='near'?near:pri==='rate'?rate:0.55*near+0.45*rate;}});
  L.sort(function(a,b){{return b.s-a.s;}});
  var rows=L.map(function(c,i){{return '<tr><td>'+(i===0?'<span class="best">★ </span>':'')+(c.sq?'<a href="{SQS}'+c.sq+'-driving-test-centre-routes.html">'+c.n+'</a>':c.n)+'</td><td>'+c.d.toFixed(1)+' mi</td><td>'+c.r+'%</td><td>'+c.t.toLocaleString('en-GB')+'</td></tr>';}}).join('');
  var b=L[0];o.innerHTML='<div class="k"><div><b>'+b.n.replace('Birmingham (','').replace(')','')+'</b><span>best match for you</span></div><div><b>'+b.d.toFixed(1)+' mi</b><span>straight-line distance</span></div><div><b>'+b.r+'%</b><span>pass rate 2024-25</span></div></div>'+
   '<div class="dsq-tw"><table class="dsq-tbl"><thead><tr><th>Centre</th><th>Distance</th><th>Pass rate</th><th>Tests a year</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
   '<p class="note">Distances are straight-line. Pass rates: passrates.uk analysis of DVSA data, 2024-25 (GB ≈ {G.NAT}%). A higher pass rate doesn\\'t guarantee a pass — practising the centre\\'s roads matters more.</p>';
 }}).catch(function(){{o.innerHTML='<p class="note">The postcode lookup isn\\'t responding — message us and we\\'ll help you choose.</p>';}});
}});}})();</script>"""
    body = section("Free tool", "Which driving test centre <span class=\"tr\">suits you?</span>",
                   "<p>Enter your postcode and choose what matters most. We rank all seven test centres Solihull learners use by straight-line distance and 2024-25 pass rate.</p>" + tool)
    body += section("How to choose", "Distance, pass rate &mdash; or <span class=\"tr\">waiting time?</span>", """<ul>
<li><b>Practise where you test.</b> Lessons on your centre's roads beat a slightly higher pass rate somewhere you've never driven.</li>
<li><b>Earlier date vs closer centre.</b> If a centre further away has a test weeks sooner, it can be worth it — but book extra lessons on its routes.</li>
<li><b>Big-centre traffic.</b> Garretts Green runs over 20,000 car tests a year; Shirley under 10,000. Busier centres mean busier roads around them.</li>
<li><b>Evening and weekend tests</b> cost £75 instead of £62.</li></ul>""", alt=True)
    body += section("Route guides", "Know your centre's <span class=\"tr\">roads</span>", sq_cards([
        ("shirley-driving-test-centre-routes.html", "Shirley test routes", "A34, Cranmore Boulevard, Monkspath and the lanes to Dickens Heath."),
        ("garretts-green-driving-test-centre-routes.html", "Garretts Green test routes", "Granby Avenue, Cooks Lane and the A45."),
        ("south-yardley-driving-test-centre-routes.html", "South Yardley test routes", "Clay Lane and the A45 Coventry Road."),
        ("kings-heath-driving-test-centre-routes.html", "Kings Heath test routes", "Druids Lane and the Maypole roundabouts."),
        ("solihull-driving-test-centres-compared.html", "Every centre compared", "Side by side, with what each is like."),
        ("driving-test-cancellations-shirley.html", "Shirley cancellations", "How to find an earlier test date legally."),
        ("pass-driving-test-fast-solihull.html", "Pass fast in Solihull", "The quickest honest route to a licence."),
        ("failed-driving-test-lessons-solihull.html", "Failed your test?", "Rebook and fix the exact faults.")]))
    faqs = [("Which test centre is closest to Solihull?", "For most of the borough it's Birmingham (Shirley) on the A34 Stratford Road. North Solihull (Chelmsley Wood, Kingshurst, Castle Bromwich) is often closer to Garretts Green."),
            ("Which centre near Solihull has the best pass rate?", f"In 2024-25 Shirley had the highest of the nearby centres at 58.1%, against a GB average of about {G.NAT}%."),
            ("Can I take my test at any centre?", "Yes — you can book any centre in Great Britain. Choose one you can practise around."),
            ("How accurate is the distance?", "It's a straight-line distance from your postcode. Driving distance will be a little longer.")]
    return page(f, "Solihull Driving Test Centre Finder | Nearest & Best Pass Rate | DriveSQ",
                "Free tool: enter your postcode to rank the 7 test centres Solihull learners use by distance and 2024-25 pass rate, with route guides for each.",
                "solihull driving test centre, nearest driving test centre solihull, best test centre solihull, shirley test centre",
                "Solihull driving test centre finder", "Enter your postcode to see which of the seven centres Solihull learners use is closest — and which has the best pass rate.",
                ["7 centres ranked", "2024-25 pass rates", "Free, no sign-up"], body, faqs, ["pr", "book", "fees"], tool_schema(f, "Solihull driving test centre finder", "Ranks test centres near Solihull by distance and pass rate."))


# ───────────────────────── 2. cost calculator ─────────────────────────
def cost():
    f = "solihull-learner-driver-cost-calculator.html"
    tool = f"""<div class="dt" id="cc"><div class="g">
<div><label for="cc-exp">Driving so far</label><select id="cc-exp"><option value="45">Never driven</option><option value="35">A few lessons</option><option value="22">Quite a few lessons</option><option value="10">Nearly test-ready</option></select></div>
<div><label for="cc-disc">Discount</label><select id="cc-disc"><option value="">None</option><option value="1">NHS staff or student (10 hrs £320)</option></select></div>
<div><label for="cc-tt">Theory attempts</label><select id="cc-tt"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
<div><label for="cc-pt">Practical attempts</label><select id="cc-pt"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
<div><label for="cc-when">Practical test slot</label><select id="cc-when"><option value="62">Weekday (£62)</option><option value="75">Evening/weekend (£75)</option></select></div>
<div><label for="cc-ins">Learner insurance for private practice (£, optional)</label><input id="cc-ins" type="number" min="0" step="10" placeholder="0"></div>
<div><label for="cc-prov">Provisional licence</label><select id="cc-prov"><option value="{FEES['prov']}">I need one (£{FEES['prov']} online)</option><option value="0">I already have one</option></select></div>
<div><button type="button" id="cc-go">Work out my total</button></div></div><div class="out" id="cc-out" aria-live="polite"></div></div>
<script>(function(){{var o=document.getElementById('cc-out');function v(id){{return document.getElementById(id).value;}}
document.getElementById('cc-go').addEventListener('click',function(){{
 var hrs=+v('cc-exp'),disc=!!v('cc-disc'),blk=Math.floor(hrs/10),rest=hrs-blk*10,lessons=blk*(disc?320:350)+rest*35;
 var tt=+v('cc-tt')*{FEES['theory']},pt=+v('cc-pt')*+v('cc-when'),extra=(+v('cc-pt')-1)*4*35,prov=+v('cc-prov'),ins=+(v('cc-ins')||0);
 var tot=lessons+tt+pt+extra+prov+ins,wk=Math.ceil(tot/26);
 function r(l,x,n){{return '<tr><td>'+l+'</td><td>£'+x.toLocaleString('en-GB')+'</td><td>'+(n||'')+'</td></tr>';}}
 o.innerHTML='<div class="k"><div><b>£'+tot.toLocaleString('en-GB')+'</b><span>estimated total</span></div><div><b>'+hrs+' hrs</b><span>lessons, roughly</span></div><div><b>£'+wk+'</b><span>a week over 6 months</span></div></div>'+
 '<div class="dsq-tw"><table class="dsq-tbl"><thead><tr><th>Item</th><th>Cost</th><th>Note</th></tr></thead><tbody>'+
 (prov?r('Provisional licence',prov,'GOV.UK, online'):'')+r('Lessons ('+hrs+' hrs)',lessons,(blk?blk+' × 10-hour block at £'+(disc?320:350):'')+(rest?' + '+rest+' hrs at £35':''))+
 r('Theory test × '+v('cc-tt'),tt,'£{FEES['theory']} each')+r('Practical test × '+v('cc-pt'),pt,'£'+v('cc-when')+' each')+(extra?r('Extra lessons before retakes',extra,'~4 hrs per retake'):'')+(ins?r('Learner insurance',ins,'your quote'):'')+
 '</tbody></table></div><p class="note">Lesson hours are a starting estimate from DVSA\\'s average (about 45 hours with an instructor plus private practice); your instructor will give you an honest figure after your first lesson. Test fees: GOV.UK.</p>';
}});}})();</script>"""
    body = section("Free calculator", "What will your licence <span class=\"tr\">really cost?</span>",
                   "<p>Most price lists only show the hourly rate. This adds up everything: provisional licence, lessons at SQ/DriveSQ prices, theory and practical fees, retakes and optional insurance for practice with family.</p>" + tool)
    body += section("Where the money goes", "The fixed costs <span class=\"tr\">everyone pays</span>", f"""<div class="dsq-tw"><table class="dsq-tbl"><thead><tr><th>Item</th><th>Cost</th><th>Paid to</th></tr></thead><tbody>
<tr><td>Provisional licence (online)</td><td>£{FEES['prov']}</td><td>DVLA</td></tr><tr><td>Theory test</td><td>£{FEES['theory']}</td><td>DVSA</td></tr>
<tr><td>Practical test — weekday</td><td>£{FEES['prac']}</td><td>DVSA</td></tr><tr><td>Practical test — evening, weekend, bank holiday</td><td>£{FEES['prac_eve']}</td><td>DVSA</td></tr>
<tr><td>Lessons</td><td>£35/hr · £40 single hour · £350 per 10 hrs (£320 NHS/students)</td><td>DriveSQ / SQ Driving School</td></tr></tbody></table></div>
<p><b>Biggest saving:</b> passing first time. A retake costs another test fee plus the lessons in between — the readiness check and a mock test before your real test are the cheapest insurance.</p>""", alt=True)
    body += section("Prices in detail", "More on <span class=\"tr\">prices</span>", sq_cards([
        ("driving-lesson-prices-solihull.html", "Driving lesson prices in Solihull", "£35/hr, no booking fee — and how Solihull compares."),
        ("intensive-driving-courses-solihull.html", "Intensive courses", "Fewer weeks, same hourly price."),
        ("student-driving-lessons-solihull.html", "Student discount", "10 hours £320 with student ID."),
        ("nhs-driving-lessons-solihull.html", "NHS discount", "10 hours £320 for NHS staff."),
        ("cheap-driving-lessons-solihull.html", "Affordable lessons", "Seven honest ways to spend less."),
        ("failed-driving-test-lessons-solihull.html", "Failed your test?", "Fix the faults before your retake.")]))
    faqs = [("How much does it cost to get a driving licence in Solihull?", "Fixed fees are £34 for a provisional licence online, £23 for the theory test and £62 for a weekday practical (£75 evenings/weekends). Lessons are on top — use the calculator for your own estimate."),
            ("How many lessons will I need?", "DVSA says learners need around 45 hours of lessons plus private practice on average. Some people need fewer, some more."),
            ("Do I need insurance to practise with my parents?", "Yes — the car must be insured for you as a learner. Get your own quote and add it to the calculator."),
            ("Is automatic more expensive?", "Not with us — manual and automatic are both £35/hr.")]
    return page(f, "Learner Driver Cost Calculator Solihull | Full Licence Cost 2026 | DriveSQ",
                "Free calculator: the full cost of a driving licence in Solihull — provisional, lessons, theory and practical fees, retakes and insurance.",
                "how much does it cost to learn to drive solihull, driving licence cost calculator, learner driver cost solihull",
                "What will your licence cost in Solihull?", "A free calculator that adds up everything — not just the hourly rate.",
                ["Every fee included", "GOV.UK prices", "Free, no sign-up"], body, faqs, ["fees", "prov", "lessons"], tool_schema(f, "Solihull learner driver cost calculator", "Adds up the full cost of a UK driving licence for a Solihull learner."))


# ───────────────────────── 3. daylight & sun-glare planner ─────────────────────────
def daylight():
    f = "solihull-daylight-driving-planner.html"
    tool = """<div class="dt" id="dl"><div class="g">
<div><label for="dl-d">Date</label><input id="dl-d" type="date"></div>
<div><button type="button" id="dl-go">Show light &amp; glare</button></div></div><div class="out" id="dl-out" aria-live="polite"></div></div>
<script>(function(){var LAT=52.4118,LON=-1.7776,o=document.getElementById('dl-out'),d=document.getElementById('dl-d');d.value=new Date().toISOString().slice(0,10);
var rad=Math.PI/180;
function sun(date,mins){/* NOAA solar position; mins = minutes after UTC midnight */
 var jd=date/86400000+2440587.5,t=(jd-2451545)/36525,L0=(280.46646+t*(36000.76983+0.0003032*t))%360,M=357.52911+t*(35999.05029-0.0001537*t),e=0.016708634-t*(0.000042037+0.0000001267*t);
 var C=Math.sin(M*rad)*(1.914602-t*(0.004817+0.000014*t))+Math.sin(2*M*rad)*(0.019993-0.000101*t)+Math.sin(3*M*rad)*0.000289,tl=L0+C,om=125.04-1934.136*t,lam=tl-0.00569-0.00478*Math.sin(om*rad);
 var e0=23+(26+(21.448-t*(46.815+t*(0.00059-t*0.001813)))/60)/60,ep=e0+0.00256*Math.cos(om*rad),dec=Math.asin(Math.sin(ep*rad)*Math.sin(lam*rad))/rad;
 var y=Math.pow(Math.tan(ep/2*rad),2),eq=4*(y*Math.sin(2*L0*rad)-2*e*Math.sin(M*rad)+4*e*y*Math.sin(M*rad)*Math.cos(2*L0*rad)-0.5*y*y*Math.sin(4*L0*rad)-1.25*e*e*Math.sin(2*M*rad))/rad;
 var ts=(mins+eq+4*LON+1440)%1440,ha=ts/4<0?ts/4+180:ts/4-180,ze=Math.acos(Math.sin(LAT*rad)*Math.sin(dec*rad)+Math.cos(LAT*rad)*Math.cos(dec*rad)*Math.cos(ha*rad))/rad;
 var az=(Math.acos(((Math.sin(LAT*rad)*Math.cos(ze*rad))-Math.sin(dec*rad))/(Math.cos(LAT*rad)*Math.sin(ze*rad)))/rad);az=ha>0?(az+180)%360:(540-az)%360;return {alt:90-ze,az:az};}
function fmt(day,m){var x=new Date(day+m*60000);return x.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});}
function dir(a){return ['north','north-east','east','south-east','south','south-west','west','north-west'][Math.round(a/45)%8];}
document.getElementById('dl-go').addEventListener('click',function(){
 var day=Date.parse(d.value+'T00:00:00Z');if(isNaN(day))return;var rise=null,set=null,dawn=null,dusk=null,gm=[],ge=[],mx=-90,prev=sun(day,0).alt;
 for(var m=1;m<1440;m++){var s=sun(day,m),a=s.alt;
  if(prev<-6&&a>=-6)dawn=m;if(prev<-0.833&&a>=-0.833)rise=m;if(prev>=-0.833&&a<-0.833)set=m;if(prev>=-6&&a<-6)dusk=m;
  if(a>0&&a<15){(m<720?gm:ge).push([m,s.az]);}if(a>mx)mx=a;prev=a;}
 if(rise===null){o.innerHTML='<p class="note">No sunrise calculated for that date.</p>';return;}
 function win(g){if(!g.length)return '—';return fmt(day,g[0][0])+'–'+fmt(day,g[g.length-1][0])+' (sun to the '+dir(g[Math.floor(g.length/2)][1])+')';}
 o.innerHTML='<div class="k"><div><b>'+fmt(day,rise)+'</b><span>sunrise</span></div><div><b>'+fmt(day,set)+'</b><span>sunset</span></div><div><b>'+(dusk?fmt(day,dusk):'—')+'</b><span>properly dark (civil dusk)</span></div><div><b>'+Math.round((set-rise)/60*10)/10+' hrs</b><span>of daylight</span></div></div>'+
 '<div class="dsq-tw"><table class="dsq-tbl"><thead><tr><th>Low-sun glare (sun under 15°)</th><th>When</th><th>Watch out on</th></tr></thead><tbody>'+
 (mx<15?'<tr><td>All day</td><td>The sun never climbs above '+mx.toFixed(0)+'° — it stays low from sunrise to sunset</td><td>Any road heading roughly south-east in the morning, south at midday or south-west in the afternoon. Keep the windscreen clean and use your visor.</td></tr>':
 '<tr><td>Morning</td><td>'+win(gm)+'</td><td>Roads heading towards the sun — e.g. east along the A45 Coventry Road towards the airport</td></tr>'+
 '<tr><td>Evening</td><td>'+win(ge)+'</td><td>Roads heading towards the sun — e.g. west along the A45 into Birmingham</td></tr>')+'</tbody></table></div>'+
 '<p class="note">Times for Solihull town centre (52.41°N, 1.78°W), UK clock time. Calculated with NOAA\\'s solar equations; accurate to a minute or two. Road directions are approximate.</p>';});
document.getElementById('dl-go').click();})();</script>"""
    body = section("Free tool", "When is it light &mdash; and when does the sun <span class=\"tr\">dazzle?</span>",
                   "<p>Pick any date to see sunrise, sunset, when it gets properly dark, and the low-sun glare windows in Solihull. Useful for planning lessons, your test time, and your first drives after passing.</p>" + tool)
    body += section("Why it matters", "Light changes <span class=\"tr\">everything</span>", """<ul>
<li><b>Low sun is a real hazard.</b> The Highway Code says to slow down or stop if you're dazzled by bright sunlight. Keep the windscreen clean inside and out, and use the sun visor.</li>
<li><b>Practise in the dark before you need it.</b> Book some lessons after dusk in autumn and winter, with dual controls, so your first night drive alone isn't your first night drive.</li>
<li><b>Clock changes.</b> In 2026 the clocks went forward on 29 March and back on 25 October. The week after the clocks go back, evening rush hour suddenly happens in the dark.</li>
<li><b>Choosing a test time.</b> A test that ends near sunset in winter can mean low sun or dark roads — use the planner when you book.</li></ul>""", alt=True)
    body += section("Solihull roads", "Roads where it <span class=\"tr\">matters most</span>", sq_cards([
        ("a45-coventry-road-airport-nec.html", "A45 Coventry Road", "East–west, so low sun is straight ahead at the start and end of the day."),
        ("a34-stratford-road-shirley.html", "A34 Stratford Road", "Shirley's main road and the test centre's doorstep."),
        ("m42-junctions-3a-4-5-6-solihull.html", "M42 junctions 3a–6", "Motorway lessons with an instructor."),
        ("evening-weekend-driving-lessons-solihull.html", "Evening & weekend lessons", "Practise in the dark with dual controls.")]))
    faqs = [("What time does it get dark in Solihull?", "It depends on the date — pick one in the planner. 'Properly dark' is civil dusk, when the sun is 6° below the horizon."),
            ("What should I do if I'm dazzled by the sun?", "Slow down or stop safely, use your sun visor, and keep the windscreen clean — that's the Highway Code's advice."),
            ("Should I have lessons in the dark?", "Yes, a few — especially in autumn and winter. It's much safer to learn night driving with an instructor and dual controls."),
            ("Is the planner accurate?", "It uses NOAA's solar equations for Solihull town centre and is accurate to a minute or two.")]
    return page(f, "Solihull Daylight & Sun-Glare Planner for Learner Drivers | DriveSQ",
                "Free tool: sunrise, sunset, darkness and low-sun glare times in Solihull for any date — plan lessons, your test time and your first drives.",
                "what time does it get dark solihull, sunset solihull, sun glare driving, learner driver night driving solihull",
                "Solihull daylight &amp; sun-glare planner", "Sunrise, sunset, darkness and dazzle times in Solihull for any date — for learners and new drivers.",
                ["Any date", "Glare windows", "Free"], body, faqs, ["noaa", "hc"], tool_schema(f, "Solihull daylight and sun-glare planner", "Sunrise, sunset and low-sun glare times in Solihull for any date."))


# ───────────────────────── 4. test readiness check ─────────────────────────
QS = [("I can move off and stop smoothly without help, on the flat and on a hill.", "Control", "a34-stratford-road-shirley.html"),
      ("I check mirrors before every signal, change of speed and change of direction — without being reminded.", "Mirrors", None),
      ("At junctions I look both ways properly and only go when it's safe — I don't creep out blind.", "Junctions", "blossomfield-road-junction-signals.html"),
      ("I choose the right lane early on multi-lane roundabouts like those around Monkspath and Cranmore Boulevard.", "Roundabouts", "shirley-driving-test-centre-routes.html"),
      ("I keep to the limit and notice every change, including 20 mph zones.", "Speed", "solihull-speed-cameras-20mph-and-enforcement.html"),
      ("I can follow sat-nav or road signs on my own for 20 minutes (independent driving).", "Independent driving", None),
      ("I can do all the manoeuvres (bay parking forwards and in reverse, parallel parking, pulling up on the right) reliably.", "Manoeuvres", "mock-driving-test-solihull.html"),
      ("I handle bus lanes and buses pulling out on roads like Lode Lane and the A34.", "Bus lanes", "lode-lane-hobs-moat-road-bus-lanes.html"),
      ("I can join and leave a dual carriageway safely, matching the speed of traffic.", "Dual carriageways", "a45-coventry-road-airport-nec.html"),
      ("I give cyclists at least 1.5 metres and check for them before turning left.", "Cyclists", None),
      ("I've driven a full mock test on my test centre's roads and had fewer than 15 minor faults and no serious ones.", "Mock test", "mock-driving-test-solihull.html"),
      ("I know the 'show me, tell me' questions and can do the 'show me' ones while driving.", "Show me, tell me", None),
      ("I stay calm when things go wrong — I can carry on after a mistake.", "Nerves", "nervous-driver-lessons-solihull.html"),
      ("I've driven in rain and in the dark with my instructor.", "Conditions", None),
      ("I can drive on country lanes with bends and changing limits, like those towards Dickens Heath and Knowle.", "Rural roads", "knowle-dorridge-and-village-speed-limits.html")]


def readiness():
    f = "solihull-driving-test-readiness-check.html"
    qs = "".join(f'<div class="q"><p>{i + 1}. {e(q)}</p><div class="o">' + "".join(f'<label><input type="radio" name="q{i}" value="{v}">{l}</label>' for v, l in ((2, "Yes, every time"), (1, "Mostly"), (0, "Not yet"))) + "</div></div>" for i, (q, _, _) in enumerate(QS))
    meta = json.dumps([{"t": t, "l": (SQS + l) if l else ""} for _, t, l in QS])
    tool = f"""<div class="dt" id="rc">{qs}<div style="margin-top:14px"><button type="button" id="rc-go">See my result</button></div><div class="out" id="rc-out" aria-live="polite"></div></div>
<script>(function(){{var M={meta},o=document.getElementById('rc-out');
document.getElementById('rc-go').addEventListener('click',function(){{var s=0,miss=[],ans=0;
 M.forEach(function(m,i){{var x=document.querySelector('input[name="q'+i+'"]:checked');if(x){{ans++;s+=+x.value;if(+x.value<2)miss.push([m,+x.value]);}}}});
 if(ans<M.length){{o.innerHTML='<p class="note">Answer all '+M.length+' questions for an honest result ('+ans+' so far).</p>';return;}}
 var p=Math.round(s/(M.length*2)*100),verdict=p>=90?'Book your test — and a mock test on its routes first.':p>=70?'Close. Fix the areas below, then book.':p>=45?'You\\'re on your way. Focus on the areas below before booking.':'Keep building the basics — your instructor will plan the next steps.';
 miss.sort(function(a,b){{return a[1]-b[1];}});
 o.innerHTML='<div class="k"><div><b>'+p+'%</b><span>test-ready</span></div><div><b>'+miss.length+'</b><span>areas to work on</span></div></div><p><b>'+verdict+'</b></p>'+
 (miss.length?'<ul>'+miss.map(function(x){{return '<li>'+(x[1]===0?'<b>Not yet:</b> ':'<b>Mostly:</b> ')+x[0].t+(x[0].l?' — <a href="'+x[0].l+'">guide</a>':'')+'</li>';}}).join('')+'</ul>':'')+
 '<p class="note">A self-check, not an official assessment — your instructor\\'s view matters most. Nothing you enter is saved or sent.</p>';}});}})();</script>"""
    body = section("Free self-check", "Are you ready for your <span class=\"tr\">driving test?</span>",
                   "<p>Fifteen honest questions based on the skills examiners mark and the roads around Solihull's test centres. You get a readiness score and a list of what to work on, with a guide for each.</p>" + tool)
    body += section("Before you book", "The cheapest way to <span class=\"tr\">pass first time</span>", """<ol>
<li>Score 90%+ here <b>and</b> get your instructor's honest go-ahead.</li>
<li>Do a full mock test on your centre's roads.</li>
<li>Book your test — and keep lessons going while you wait so you don't go rusty.</li>
<li>The week before: a lesson on the test routes at the same time of day as your test.</li></ol>""", alt=True)
    body += section("Next steps", "Get <span class=\"tr\">test-ready</span>", sq_cards([
        ("mock-driving-test-solihull.html", "Mock driving test in Solihull", "A full test drive, marked like the real one."),
        ("failed-driving-test-lessons-solihull.html", "Failed before?", "Fix the exact faults on your report."),
        ("pass-driving-test-fast-solihull.html", "Pass fast in Solihull", "The quickest honest route."),
        ("shirley-driving-test-centre-routes.html", "Shirley test routes", "The roads examiners use.")]))
    faqs = [("How do I know I'm ready for my driving test?", "When you can drive independently for a full test-length drive on your centre's roads with only a few minor faults and no serious ones — and your instructor agrees."),
            ("How many faults can I get on the test?", "Up to 15 driving faults (minors) and no serious or dangerous faults."),
            ("Is this an official test?", "No — it's a self-check to help you and your instructor plan. Nothing you enter is saved or sent."),
            ("Should I do a mock test?", "Yes. A mock test on your centre's roads is the best predictor of how test day will go.")]
    return page(f, "Am I Ready for My Driving Test? Solihull Readiness Check | DriveSQ",
                "Free 15-question self-check built around Solihull's test routes: get a readiness score and a list of what to work on before you book.",
                "am i ready for my driving test, driving test readiness quiz, solihull driving test, shirley driving test tips",
                "Are you ready for your driving test?", "A free, honest self-check built around the roads at Solihull's test centres.",
                ["15 questions", "Instant result", "Nothing saved"], body, faqs, ["book", "hc"], tool_schema(f, "Solihull driving test readiness check", "A self-check for learner drivers before booking a test."))


# ───────────────────────── 5. week-by-week lesson plan ─────────────────────────
STAGES = [("Car control on quiet roads", 8, "Monkspath and Dickens Heath estates, quiet roads in Hillfield", "driving-lessons-monkspath.html"),
          ("Junctions and road positioning", 7, "Residential Shirley, Olton side roads, Blossomfield Road", "blossomfield-road-junction-signals.html"),
          ("Roundabouts", 6, "Cranmore Boulevard, Highlands Road, Monkspath roundabouts", "shirley-driving-test-centre-routes.html"),
          ("Busier town roads and bus lanes", 6, "Solihull town centre, Lode Lane, Warwick Road (A41)", "solihull-town-centre-driving-guide.html"),
          ("Dual carriageways and faster roads", 5, "A34 Stratford Road, A45 Coventry Road, A41", "a45-coventry-road-airport-nec.html"),
          ("Manoeuvres and independent driving", 6, "Car parks and quiet streets; sat-nav drives around Shirley", "mock-driving-test-solihull.html"),
          ("Motorway lesson (with your instructor)", 2, "M42 junctions 4–6", "motorway-driving-lessons-m42-solihull.html"),
          ("Test routes and mock tests", 5, "Your test centre's routes at test time of day", "shirley-driving-test-centre-routes.html")]


def plan():
    f = "solihull-learner-driver-lesson-plan.html"
    st = json.dumps([{"n": n, "h": h, "w": w, "l": SQS + l} for n, h, w, l in STAGES])
    tool = f"""<div class="dt" id="lp"><div class="g">
<div><label for="lp-start">Start date</label><input id="lp-start" type="date"></div>
<div><label for="lp-hpw">Hours a week</label><select id="lp-hpw"><option value="2">2</option><option value="4" selected>4</option><option value="6">6</option><option value="10">10 (intensive)</option></select></div>
<div><label for="lp-exp">Driving so far</label><select id="lp-exp"><option value="0">Never driven</option><option value="10">A few lessons</option><option value="20">Quite a few</option></select></div>
<div><button type="button" id="lp-go">Build my plan</button></div></div><div class="out" id="lp-out" aria-live="polite"></div></div>
<script>(function(){{var S={st},o=document.getElementById('lp-out'),sd=document.getElementById('lp-start');sd.value=new Date().toISOString().slice(0,10);
function d(x){{return x.toLocaleDateString('en-GB',{{day:'numeric',month:'short'}});}}
document.getElementById('lp-go').addEventListener('click',function(){{var hpw=+document.getElementById('lp-hpw').value,skip=+document.getElementById('lp-exp').value,t=new Date(sd.value+'T12:00:00');if(isNaN(t))return;
 var rows='',done=0,book=null,total=S.reduce(function(a,s){{return a+s.h;}},0);
 S.forEach(function(s){{var h=s.h;if(skip>0){{var c=Math.min(skip,h);skip-=c;h-=c;}}if(h<=0)return;var wks=Math.max(1,Math.round(h/hpw)),from=new Date(t);t=new Date(t.getTime()+wks*7*864e5);done+=h;
  rows+='<tr><td>'+d(from)+' – '+d(new Date(t.getTime()-864e5))+'</td><td><a href="'+s.l+'">'+s.n+'</a></td><td>'+h+' hrs</td><td>'+s.w+'</td></tr>';
  if(!book&&s.n.indexOf('Dual')===0)book=new Date(from);}});
 o.innerHTML='<div class="k"><div><b>'+done+' hrs</b><span>planned</span></div><div><b>'+d(t)+'</b><span>test-ready, roughly</span></div><div><b>'+(book?d(book):'now')+'</b><span>book your test around here</span></div></div>'+
 '<div class="dsq-tw"><table class="dsq-tbl plan"><thead><tr><th>Weeks</th><th>Focus</th><th>Hours</th><th>Where we practise</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<p class="note">A typical plan, not a promise — everyone learns at their own pace and your instructor will adjust it. Book your test around the date shown so it lands near when you\\'re ready; check availability on GOV.UK.</p>';}});
document.getElementById('lp-go').click();}})();</script>"""
    body = section("Free planner", "Your lessons, <span class=\"tr\">week by week</span>",
                   "<p>Choose a start date and how many hours a week you can do. You'll get a week-by-week plan through Solihull's roads — from quiet estates to the M42 and your test routes — with a rough test-ready date and when to book your test.</p>" + tool)
    body += section("How we teach in Solihull", "From Monkspath to the <span class=\"tr\">M42</span>", """<p>Solihull is a great place to learn because quiet modern estates, busy main roads, big roundabouts, country lanes and motorway junctions are all within a few minutes. We use that ladder on purpose: you only move up when the step below is automatic.</p>
<p>Every lesson and skill is tracked in the free <a href="drivesq-student-portal.html">DriveSQ Student Portal</a>, so you can see exactly where you are on the plan.</p>""", alt=True)
    body += section("Go deeper", "Guides for each <span class=\"tr\">stage</span>", sq_cards([(l.split("/")[-1], n, w) for n, h, w, l in [(s[0], s[1], s[2], s[3]) for s in STAGES][:6]]))
    faqs = [("How long does it take to learn to drive in Solihull?", "At 4 hours a week, a complete beginner is often test-ready in 3–4 months. Intensive learners can be quicker; everyone is different."),
            ("When should I book my driving test?", "Waiting times can be long, so many learners book once they're comfortable on busier roads — the planner shows a rough date. Keep lessons going until the test."),
            ("Will we drive on the motorway?", "Yes, once you're ready, with your instructor in a dual-control car. Learners can't practise on motorways with family."),
            ("Can I change my plan?", "Of course — it's a guide. Your instructor adjusts it every lesson.")]
    return page(f, "Learner Driver Lesson Plan Solihull | Week-by-Week Planner | DriveSQ",
                "Free planner: a week-by-week driving lesson plan through Solihull's roads, from quiet estates to the M42 and your test routes, with a test-ready date.",
                "how long to learn to drive solihull, driving lesson plan, learner driver plan, when to book driving test",
                "Your week-by-week lesson plan", "From quiet estates to the M42 and your test routes — with a rough test-ready date.",
                ["Personal plan", "Real Solihull roads", "Free"], body, faqs, ["lessons", "book"], tool_schema(f, "Solihull learner driver lesson planner", "Week-by-week driving lesson plan through Solihull's roads."))


# ───────────────────────── 6–9. guides ─────────────────────────
def parents():
    f = "solihull-parents-guide-learner-drivers.html"
    body = section("For parents & carers", "Helping your teenager <span class=\"tr\">learn to drive</span>", """<p>Private practice between lessons makes a big difference — but only if it reinforces what the instructor is teaching. This guide covers the rules, the costs and a practice plan built around Solihull's roads.</p>
<h3 class="mt-3">Can you supervise?</h3><ul><li>You must be <b>21 or over</b> and have held a full licence for that type of car for <b>3 years</b>.</li><li>The car must be <b>insured</b> for the learner, taxed and roadworthy, with <b>L plates</b> front and back.</li><li>You can't use a phone while supervising, and you mustn't be over the drink-drive limit.</li><li>Learners can't drive on motorways with you — only with an approved instructor in a dual-control car.</li></ul>""")
    body += section("A practice plan", "Practise the right roads at the <span class=\"tr\">right time</span>", """<ol>
<li><b>Early on:</b> quiet estates (Monkspath, Dickens Heath, Hillfield) at quiet times — moving off, stopping, steering.</li>
<li><b>Once junctions are solid:</b> residential Shirley and Olton — mirrors, signals, observations.</li>
<li><b>Ready for more:</b> roundabouts around Cranmore Boulevard and Highlands Road, then the A34 outside rush hour.</li>
<li><b>Near test standard:</b> ask the instructor which test-route roads to practise, and drive them at the time of day of the test.</li></ol>
<p><b>Golden rule:</b> ask the instructor what they're working on this week, and practise that — not your own habits. Things have changed since you passed (cyclist rules, the 2022 Highway Code changes, smart motorways).</p>""", alt=True)
    body += section("Useful guides", "Before you <span class=\"tr\">set off</span>", sq_cards([
        ("learning-to-drive-in-solihull.html", "Learning to drive in Solihull", "Local roads, data and the rules that matter."),
        ("solihull-speed-cameras-20mph-and-enforcement.html", "Speed cameras & 20 mph", "Where limits change."),
        ("knowle-dorridge-and-village-speed-limits.html", "Village speed limits", "Knowle, Dorridge and the lanes."),
        ("student-driving-lessons-solihull.html", "Student lessons", "10 hours £320 with student ID.")]))
    faqs = [("Can I teach my child to drive in my car?", "Yes, if you're 21+, have held a full licence for 3 years and the car is insured for them as a learner. Lessons with an instructor are still the safest way to learn the test standard."),
            ("Do I need my own L plates?", "Yes — L plates must be shown on the front and back of the car whenever a learner drives."),
            ("Can my learner drive on the M42 with me?", "No. Learners can only drive on motorways with an approved driving instructor in a dual-control car."),
            ("How much private practice helps?", "Regular practice between lessons helps a lot — DVSA's research shows learners who combine lessons with practice do better.")]
    return page(f, "Parents' Guide to Learner Drivers in Solihull | Rules & Practice Plan | DriveSQ",
                "Supervising a learner in Solihull: the rules, insurance, L plates, what you can't do, and a practice plan built around Solihull's roads.",
                "supervising learner driver rules, parents guide learner driver, teach my child to drive solihull",
                "A parents' guide to learner drivers in Solihull", "The rules for supervising, the costs, and a practice plan built around Solihull's roads.",
                ["21+ and 3 years' licence", "Insurance & L plates", "Practice plan"], body, faqs, ["supervise", "hc", "lessons"])


def newdrivers():
    f = "solihull-new-drivers-first-year.html"
    body = section("After you pass", "Your first year on Solihull's <span class=\"tr\">roads</span>", """<h3>The 6-point rule</h3><p>If you get <b>6 or more penalty points within 2 years of passing</b>, your licence is revoked and you have to apply for a new provisional licence and pass both tests again. Points on your provisional licence count too. Two speeding offences can be enough.</p>
<h3 class="mt-3">Birmingham's Clean Air Zone</h3><p>Birmingham city centre (inside the A4540 Middleway ring road) is a Clean Air Zone. Cars that don't meet the emission standards pay a daily charge to drive inside it. Solihull isn't in the zone, but plenty of Solihull drivers head into Birmingham — check your car on the official Brum Breathes site before you buy or drive in.</p>
<h3 class="mt-3">First motorway drives</h3><p>The M42 runs right past Solihull. If you didn't have a motorway lesson, book one — or take Pass Plus — before your first solo motorway trip.</p>""")
    body += section("First-year checklist", "Small habits, <span class=\"tr\">big difference</span>", """<ul>
<li><b>Drive in the dark and rain</b> with an experienced driver before you do it alone.</li>
<li><b>Limit passengers at first</b> — friends in the car are a proven distraction for new drivers.</li>
<li><b>Phone in the glovebox</b> or in a fixed holder for navigation only. Using a hand-held phone means 6 points — your whole allowance.</li>
<li><b>Know the 20 mph zones</b> and speed cameras on your regular routes.</li>
<li><b>Ask your insurer</b> about telematics policies and Pass Plus discounts.</li></ul>""", alt=True)
    body += section("Keep learning", "More for <span class=\"tr\">new drivers</span>", sq_cards([
        ("pass-plus-solihull.html", "Pass Plus in Solihull", "Night, rural, dual carriageways and motorways."),
        ("motorway-driving-lessons-m42-solihull.html", "M42 motorway lessons", "With dual controls."),
        ("solihull-speed-cameras-20mph-and-enforcement.html", "Speed cameras & 20 mph", "Where the limits change."),
        ("refresher-driving-lessons-solihull.html", "Refresher lessons", "Lost confidence? We'll rebuild it.")]))
    faqs = [("What happens if I get 6 points as a new driver?", "If you reach 6 or more points within 2 years of passing, DVLA revokes your licence and you must reapply for a provisional licence and pass the theory and practical tests again."),
            ("Is Solihull in the Clean Air Zone?", "No — Birmingham's Clean Air Zone covers Birmingham city centre inside the A4540 Middleway. Check your car on the Brum Breathes website if you drive in."),
            ("Should I do Pass Plus?", "It's optional, but it covers night, rural, dual carriageway and motorway driving, and some insurers offer a discount."),
            ("Can I drive on the motorway straight after passing?", "Yes, legally — but if you haven't driven on one before, a motorway lesson first is a very good idea.")]
    return page(f, "New Drivers in Solihull: Your First Year After Passing | DriveSQ",
                "Just passed in Solihull? The 6-point rule, Birmingham's Clean Air Zone, first motorway drives on the M42 and a first-year safety checklist.",
                "new driver 6 points rule, just passed driving test solihull, birmingham clean air zone new driver, pass plus solihull",
                "Your first year after passing", "The 6-point rule, the Clean Air Zone, the M42 and the habits that keep new drivers safe.",
                ["6-point rule", "Clean Air Zone", "M42"], body, faqs, ["newdriver", "caz", "hc"], form_title="Book Pass Plus or a motorway lesson", opts=["Pass Plus", "Motorway Lesson", "Refresher Lessons"])


def theory():
    f = "solihull-theory-test-guide.html"
    body = section("Theory test", "Taking your theory test from <span class=\"tr\">Solihull</span>", """<p><b>There's no longer a theory test centre in Solihull</b> — it closed in 2011 and its tests moved to the Birmingham and Coventry centres. Most Solihull learners now take their theory test in central Birmingham. Always check the exact address in your booking confirmation.</p>
<h3 class="mt-3">What's in the test</h3><ul><li><b>Multiple choice:</b> 50 questions; you need 43 to pass.</li><li><b>Hazard perception:</b> 14 video clips; you need 44 out of 75.</li><li>It costs <b>£23</b>, and your pass certificate lasts <b>2 years</b>.</li></ul>""")
    body += section("Getting ready", "A 4-week <span class=\"tr\">theory plan</span>", """<ol><li><b>Week 1:</b> read the Highway Code properly — signs, road markings, stopping distances.</li><li><b>Week 2:</b> practise questions every day, noting the topics you get wrong.</li><li><b>Week 3:</b> hazard perception clips — click when a hazard starts to develop, not before.</li><li><b>Week 4:</b> full mock tests until you're passing comfortably, then book.</li></ol>
<p><b>Tip:</b> start lessons while you revise — you only need a provisional licence. Real driving makes the theory stick.</p>""", alt=True)
    body += section("Next step", "After your <span class=\"tr\">theory</span>", sq_cards([
        ("solihull-driving-test-centres-compared.html", "Choose your practical test centre", "Shirley, Garretts Green and more."),
        ("driving-test-cancellations-shirley.html", "Finding an earlier practical test", "The legal ways to do it."),
        ("intensive-driving-courses-solihull.html", "Intensive courses", "Once your theory is passed."),
        ("learning-to-drive-in-solihull.html", "Learning to drive in Solihull", "The whole local picture."),
        ("driving-lessons-overseas-licence-solihull.html", "Drove abroad?", "Exchange your licence or get UK-test-ready.")]))
    faqs = [("Is there a theory test centre in Solihull?", "No. The Solihull centre closed in 2011 and its tests moved to Birmingham and Coventry. Most Solihull learners now use central Birmingham — check your booking confirmation for the address."),
            ("How much is the theory test?", "£23."), ("How long does a theory pass last?", "2 years — you need to pass your practical test within that time."),
            ("What's the pass mark?", "43 out of 50 for multiple choice and 44 out of 75 for hazard perception.")]
    return page(f, "Theory Test Solihull: Nearest Centre, Pass Marks & 4-Week Plan | DriveSQ",
                "There's no theory test centre in Solihull any more. Where Solihull learners take it, the pass marks, the £23 fee and a 4-week revision plan.",
                "theory test solihull, nearest theory test centre solihull, theory test birmingham, theory test pass mark",
                "Taking your theory test from Solihull", "Where to take it, what's in it, and a 4-week plan to pass first time.",
                ["£23", "43/50 + 44/75", "Valid 2 years"], body, faqs, ["solihull_closed", "theory", "book_theory"], opts=["Theory Help", "Manual Lessons", "Automatic Lessons"])


def instructor():
    f = "driving-instructor-training-solihull.html"
    body = section("Become an instructor", "How to become a driving instructor in <span class=\"tr\">Solihull</span>", """<p>To teach for money you must be a DVSA <b>approved driving instructor (ADI)</b>, or hold a <b>trainee licence</b> while you qualify. You need to be 21 or over and to have held a full driving licence for at least 3 years, and you'll need a criminal record check.</p>
<div class="dsq-tw"><table class="dsq-tbl"><thead><tr><th>Step</th><th>What it is</th><th>Fee</th></tr></thead><tbody>
<tr><td>Part 1</td><td>Theory and hazard perception test</td><td>£81</td></tr>
<tr><td>Part 2</td><td>Driving ability test</td><td>£111</td></tr>
<tr><td>Trainee licence (optional)</td><td>Teach for pay for 6 months while preparing for Part 3 — with supervision or extra training</td><td>£140</td></tr>
<tr><td>Part 3</td><td>Instructional ability test</td><td>£111</td></tr>
<tr><td>ADI registration</td><td>Join the register and get your green badge (renewed every 4 years)</td><td>£300</td></tr></tbody></table></div>
<p class="dsq-src">Fees from GOV.UK's ADI fees page — check before you pay, as they can change. Training course costs are extra.</p>""")
    body += section("Teaching with DriveSQ", "What we offer <span class=\"tr\">instructors</span>", """<ul><li><b>Pupils matched by postcode</b> across Solihull and Greater Manchester.</li><li><b>The DriveSQ Instructor Portal</b> — diary, pupil progress, payments and referrals in one place.</li><li><b>Referral or franchise</b> — pay per pupil, or a flat weekly fee with priority for new learners.</li></ul>
<p><a href="driving-instructor-jobs-solihull.html">See DriveSQ instructor jobs in Solihull →</a></p>""", alt=True)
    body += section("For pupils too", "What learners <span class=\"tr\">see</span>", sq_cards([
        ("drivesq-instructor-portal-solihull.html", "The DriveSQ Instructor Portal", "What it does for instructors in Solihull."),
        ("drivesq-student-portal-solihull.html", "The Student Portal", "What your pupils see."),
        ("solihull-driving-test-centres-compared.html", "Solihull test centres", "Where your pupils will test.")]))
    faqs = [("How long does it take to become a driving instructor?", "It varies — many people take between 6 and 18 months to pass all three parts."),
            ("How much does it cost to become a driving instructor?", "DVSA fees are £81 (Part 1), £111 (Part 2), £111 (Part 3) and £300 to register, plus £140 if you take a trainee licence. Training costs are extra."),
            ("Can I teach before I qualify?", "Only with a trainee licence after passing Part 2. It lasts 6 months and needs supervision or extra training."),
            ("Does DriveSQ take trainee instructors?", "Get in touch — tell us where you are in the process.")]
    return page(f, "How to Become a Driving Instructor in Solihull | ADI Steps & Fees | DriveSQ",
                "Become a driving instructor in Solihull: ADI Parts 1–3, the trainee licence, DVSA fees, and teaching with DriveSQ's pupils and Instructor Portal.",
                "become a driving instructor solihull, ADI training solihull, driving instructor course solihull, PDI trainee licence",
                "Become a driving instructor in Solihull", "The ADI steps, DVSA fees, the trainee licence — and how DriveSQ helps you fill your diary.",
                ["Parts 1–3", "DVSA fees", "Pupils by postcode"], body, faqs, ["adi", "adi_fees", "trainee"], form_title="Talk to us about instructing", opts=["Qualified ADI", "Trainee (PDI)", "Thinking about training"])


def insurance():
    f = "solihull-learner-driver-insurance.html"
    body = section("Practising between lessons", "Learner driver insurance in <span class=\"tr\">Solihull</span>", """<p>Private practice with family or friends makes a big difference — but the car must be insured for <b>you</b> as a learner. During lessons with us you're covered by the instructor's insurance, so this is only about practice in a family car.</p>
<h3 class="mt-3">Your options</h3><ul>
<li><b>Added as a named learner on the family policy.</b> Ask the insurer — some allow learners at little or no extra cost, others don't.</li>
<li><b>Standalone learner driver insurance.</b> Separate cover for the learner, often by the month, so a claim doesn't touch the car owner's no-claims bonus.</li>
<li><b>Short-term cover.</b> By the day or week — handy for a burst of practice before your test.</li></ul>
<h3 class="mt-3">Two rules people get wrong</h3><ul>
<li><b>"Fronting" is fraud.</b> If the learner will really be the main driver of a car, they must be insured as the main driver — not listed as a named driver on a parent's policy.</li>
<li><b>Once you pass, learner cover usually ends.</b> Arrange new insurance before you drive alone — many learner policies stop the day you pass.</li></ul>""")
    body += section("Supervising", "Who can sit next to <span class=\"tr\">you?</span>", """<p>Your supervisor must be <b>21 or over</b> and have held a full licence for that type of car for <b>3 years</b>. You'll need L plates front and back, and you can't practise on motorways — only with an approved instructor in a dual-control car.</p>
<p><a href="solihull-parents-guide-learner-drivers.html">Parents' guide with a Solihull practice plan →</a></p>""", alt=True)
    body += section("Keep costs down", "Spend less on your <span class=\"tr\">licence</span>", sq_cards([
        ("cheap-driving-lessons-solihull.html", "Affordable lessons in Solihull", "Seven honest ways to spend less."),
        ("driving-lesson-prices-solihull.html", "Solihull lesson prices", "£35/hr, no booking fee."),
        ("student-driving-lessons-solihull.html", "Student discount", "10 hours £320."),
        ("beginner-driving-lessons-solihull.html", "Beginner lessons", "Your first lesson, step by step.")]))
    faqs = [("Do I need insurance for driving lessons?", "Not for lessons with us — the instructor's car is insured for learners. You need your own learner cover only to practise in a family or friend's car."),
            ("Can my parent add me to their car insurance?", "Often, yes — ask the insurer. Some add learners cheaply; some don't allow it."),
            ("What is fronting?", "Insuring a young driver as a named driver on a parent's policy when the young driver is really the main driver. It's fraud and can void the policy."),
            ("Does learner insurance cover me after I pass?", "Usually not — most learner policies end when you pass. Arrange new cover before driving alone.")]
    return page(f, "Learner Driver Insurance Solihull: Options & Rules | DriveSQ",
                "Practising with family in Solihull? Your learner insurance options, the supervisor rules, why fronting is fraud, and what happens when you pass.",
                "learner driver insurance solihull, insurance to practise with parents, learner driver insurance explained",
                "Learner driver insurance explained", "Your options for practising in a family car — and the rules people get wrong.",
                ["Named driver or standalone", "Supervisor rules", "No fronting"], body, faqs, ["ins_learner", "supervise"], form_title="Book lessons in Solihull")


# ───────────────────────── 10. hub ─────────────────────────
def hub():
    f = "solihull.html"
    own = '<div class="dsq-x">' + "".join(f'<a href="{p}"><small>DriveSQ</small><b>{lbl}</b><span>{s}</span></a>' for p, lbl, s in G.PAGES if p != f) + "</div>"
    sqp = json.load(open(os.path.join(HERE, "solihull-sq-pages.json"), encoding="utf-8"))
    order = ["Lesson types", "Test centres", "Areas", "Postcodes", "Roads & junctions", "Schools & colleges", "Workplaces", "Guides & portals"]
    groups = "".join(f'<h3 class="mt-4">{e(g)}</h3><div class="d-flex flex-wrap gap-2 mt-2">' + "".join(f'<a class="hp" style="text-decoration:none;color:#ddd" href="{SQ}/{p}">{e(t)}</a>' for p, t, gg in sqp if gg == g) + "</div>" for g in order)
    body = section("DriveSQ in Solihull", "Every Solihull <span class=\"tr\">page</span>", "<h3>DriveSQ tools &amp; guides</h3>" + own +
                   f"<h3 class=\"mt-4\">All {len(sqp)} SQ Driving School Solihull pages</h3><p>SQ Driving School is part of DriveSQ — same instructors, prices and Student Portal.</p>" + groups)
    faqs = [("Are DriveSQ and SQ Driving School the same?", "SQ Driving School is a brand owned and managed by DriveSQ — the same instructors, prices and Student Portal."),
            ("Do you teach everywhere in Solihull?", "Across the borough — Shirley, Solihull town centre, Olton, Knowle, Dorridge, Chelmsley Wood, Castle Bromwich and more."),
            ("How much are lessons in Solihull?", "£35/hr manual or automatic, £40 for a single hour, £350 for 10 hours (£320 for NHS staff and students).")]
    return page(f, "DriveSQ Solihull: Every Tool & Guide | Driving Lessons Solihull",
                "Every DriveSQ and SQ Driving School page for Solihull: test-centre finder, cost calculator, daylight planner, readiness check, lesson plan and local guides.",
                "drivesq solihull, driving lessons solihull, solihull learner driver tools", "Everything for learners in Solihull",
                "Free tools, local guides and lessons from DriveSQ and SQ Driving School.", ["5 free tools", "100+ local guides", "£35/hr"], body, faqs, ["lessons"])


def main():
    out = {"solihull-driving-test-centre-finder.html": finder(), "solihull-learner-driver-cost-calculator.html": cost(),
           "solihull-daylight-driving-planner.html": daylight(), "solihull-driving-test-readiness-check.html": readiness(),
           "solihull-learner-driver-lesson-plan.html": plan(), "solihull-parents-guide-learner-drivers.html": parents(),
           "solihull-new-drivers-first-year.html": newdrivers(), "solihull-theory-test-guide.html": theory(),
           "driving-instructor-training-solihull.html": instructor(), "solihull-learner-driver-insurance.html": insurance(), "solihull.html": hub()}
    # rebuild the first four pages too, so their nav and cross-links include the new pages
    out.update({"solihull-driving-school.html": G.school(), "driving-instructors-solihull.html": G.instructors(),
                "solihull-driving-test-pass-rates.html": G.pass_rates(), "driving-instructor-jobs-solihull.html": G.jobs()})
    for f, h in out.items():
        open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    # sitemap: add new pages, refresh dates of the Solihull pages
    sm = os.path.join(HERE, "sitemap-1.xml")
    x = open(sm, encoding="utf-8").read()
    today = "2026-10-26"
    for f in out:
        loc = f"<loc>{G.SITE}/{f}</loc>"
        if loc in x:
            x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{today}</lastmod>", x)
        else:
            x = x.replace("</urlset>", f"  <url>{loc}<lastmod>{today}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    idx = os.path.join(HERE, "sitemap.xml")
    open(idx, "w", encoding="utf-8").write(re.sub(r"(sitemap-1\.xml</loc><lastmod>)[^<]*", r"\g<1>" + today, open(idx, encoding="utf-8").read()))
    print("wrote", len(out), "pages")


if __name__ == "__main__":
    main()
