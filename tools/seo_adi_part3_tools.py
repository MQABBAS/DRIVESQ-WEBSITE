#!/usr/bin/env python3
"""ADI Part 3: the booking page (multi-step form) and the tools / guides nobody else has:
   - /adi-part-3-training-booking.html          booking form -> private adi_enquiries table (whatsapp edge function, action adi_enquiry) + email backup + WhatsApp fallback
   - /adi-part-3-score-calculator.html          score a practice lesson on the 17 official areas (0 to 3), with the risk management rule
   - /adi-part-3-deadline-calculator.html       the dates that matter: 2-year Part 1 window, 6-month trainee licence, extra-training deadline, badge deadline
   - /adi-part-3-cost-calculator.html           official DVSA fees from Part 1 to badge, with retakes, plus your own training costs
   - /adi-part-3-report-form-explained.html     every box on the DVSA Part 3 report form
   - /adi-part-3-pupil-and-lesson-theme-guide.html   choosing your pupil and lesson theme from the DVSA form's own options
   - /adi-part-3-test-day-checklist.html        printable checklist
   Facts: GOV.UK ADI part 3 pages and the DVSA 'ADI Part 3 test report form' (version 09/2022), checked 25 Nov 2026.
   Run: python3 tools/seo_adi_part3_tools.py   (writes the pages and adds them to sitemap-1.xml)"""
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.drivesq.co.uk/"
TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
CHECKED = "25 November 2026"
_src = open(os.path.join(ROOT, "tools/seo_dvsa_pages.py"), encoding="utf-8").read()
CSS = re.search(r'CSS = """(.*?)"""', _src, re.S).group(1)
G = "https://www.gov.uk/"
FORM_URL = "https://www.gov.uk/government/publications/approved-driving-instructor-adi-part-3-test-report"
WA = "https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27d%20like%20details%20about%20ADI%20Part%203%20training"
BOOK = "/adi-part-3-training-booking.html"
FN_URL = "https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/whatsapp"
FORMSPREE = "https://formspree.io/f/xvgjdapp"

EXTRA_CSS = r"""
.hero{background:linear-gradient(135deg,#0b0204 0%,#2b0609 70%);color:#fff;border-radius:20px;padding:22px 18px 18px;margin:6px 0 18px;position:relative;overflow:hidden}
.hero:after{content:"";position:absolute;right:-60px;top:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(245,197,24,.35),transparent 70%)}
.hero h1{margin:0 0 6px;color:#fff}.hero p{margin:0 0 12px;opacity:.92}.pills{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}.pill{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 12px;font-size:.78rem;font-weight:600}
.wiz{background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.14);overflow:hidden;margin:12px 0 22px}
.wiz-top{padding:16px 18px 6px}.bar{height:8px;border-radius:99px;background:rgba(127,127,127,.2);overflow:hidden}.bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--red),var(--gold));transition:width .4s ease}
.stepnames{display:flex;justify-content:space-between;gap:4px;font-size:.68rem;opacity:.7;margin:7px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:.03em}.stepnames span.on{opacity:1;color:var(--red)}
.q:focus{outline:none}.step{display:none;padding:8px 18px 4px;animation:in .3s ease}.step.on{display:block}@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.q{font-family:'Barlow Condensed',sans-serif;font-size:1.7rem;line-height:1.1;margin:8px 0 4px;text-transform:uppercase}.sub{font-size:.9rem;opacity:.78;margin:0 0 14px}
.opts{display:grid;gap:10px}.opt{display:flex;gap:13px;align-items:center;text-align:left;padding:14px 15px;border:2px solid var(--line);border-radius:15px;background:transparent;color:inherit;font:inherit;cursor:pointer;min-height:58px;transition:border-color .15s,background .15s,transform .1s}
.opt:hover{border-color:rgba(209,10,17,.55)}.opt:active{transform:scale(.99)}.opt:focus-visible,.chip2:focus-visible,.btn2:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.opt[aria-pressed=true],.chip2[aria-pressed=true]{border-color:var(--red);background:rgba(209,10,17,.09)}.opt .ic{font-size:1.6rem;flex:none;width:34px;text-align:center}.opt b{display:block;font-size:1rem}.opt small{display:block;opacity:.72;font-size:.8rem;margin-top:1px}
.chips2{display:flex;gap:8px;flex-wrap:wrap}.chip2{border:2px solid var(--line);border-radius:999px;padding:9px 14px;background:transparent;color:inherit;font:inherit;font-size:.9rem;cursor:pointer;min-height:44px}
.fld{margin:0 0 13px}.fld label,.fld .lbl{display:block;font-weight:700;font-size:.84rem;margin-bottom:5px}.fld .hint{font-size:.76rem;opacity:.7;margin-top:3px}
.wiz input[type=text],.wiz input[type=tel],.wiz input[type=email],.wiz input[type=date],.wiz select,.wiz textarea,.tool input[type=number],.tool input[type=date],.tool select{width:100%;box-sizing:border-box;border:2px solid var(--line);border-radius:12px;padding:12px 13px;font:inherit;font-size:16px;background:var(--card);color:inherit;min-height:48px}
.wiz textarea{min-height:90px;resize:vertical}.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:520px){.row2{grid-template-columns:1fr}}
.live{border-left:4px solid var(--gold);background:rgba(245,197,24,.12);border-radius:10px;padding:9px 12px;font-size:.86rem;margin:8px 0}.live.warn{border-left-color:var(--red);background:rgba(209,10,17,.08)}
.nav2{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:10px 18px 18px}.btn2{border:0;border-radius:999px;padding:13px 24px;font:inherit;font-weight:700;cursor:pointer;min-height:48px}.btn2.red{background:var(--red);color:#fff}.btn2.ghost{background:transparent;color:inherit;border:2px solid var(--line)}.btn2[disabled]{opacity:.55;cursor:wait}
.err{color:#c1121f;font-size:.84rem;font-weight:600;min-height:1.2em;padding:0 18px}.chk{display:flex;gap:10px;align-items:flex-start;font-size:.86rem;margin:6px 0}.chk input{width:22px;height:22px;margin-top:2px;flex:none}
.sum{display:grid;gap:6px;margin:6px 0 10px}.sum div{display:flex;gap:10px;justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0;font-size:.88rem}.sum div span{opacity:.7}.sum div b{text-align:right}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.done{text-align:center;padding:22px 8px}.done .big{font-size:3rem}
.trust{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:14px 0}.trust div{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:.88rem}.trust b{display:block;margin-bottom:2px}
.tool{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;margin:12px 0}.tool .fld{margin-bottom:12px}
.res{margin-top:12px;padding:14px;border-radius:14px;border:2px solid var(--line)}.res.pass{border-color:#16a34a;background:rgba(22,163,74,.09)}.res.fail{border-color:#c1121f;background:rgba(209,10,17,.08)}.res .big{font-family:'Barlow Condensed',sans-serif;font-size:2.4rem;line-height:1}
.sc{display:grid;gap:8px}.sc .it{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.sc .it p{margin:0 0 7px;font-size:.88rem}.sc .btns{display:flex;gap:6px}.sc .btns button{flex:1;border:2px solid var(--line);background:transparent;color:inherit;border-radius:10px;padding:9px 0;font:inherit;font-weight:700;cursor:pointer;min-height:44px}.sc .btns button[aria-pressed=true]{background:var(--red);border-color:var(--red);color:#fff}
.cat{display:flex;justify-content:space-between;align-items:center;margin:16px 0 6px;font-weight:800;font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;text-transform:uppercase}.cat span{font-family:Inter,sans-serif;font-size:.85rem;opacity:.8}
.check li{list-style:none;margin:0 0 8px;padding:0}.check label{display:flex;gap:10px;align-items:flex-start}.check input{width:22px;height:22px;flex:none;margin-top:2px}.check ul{padding:0}
@media print{header,footer,.cta,.noprint,nav{display:none!important}body{background:#fff;color:#000}.wrap{padding:0}}
"""

CLUSTER = [
    ("/adi-part-3-training-manchester.html", "ADI Part 3 training in Manchester"),
    (BOOK, "Book your ADI Part 3 training"),
    ("/adi-part-3-score-calculator.html", "ADI Part 3 score calculator: score your practice lesson"),
    ("/adi-part-3-deadline-calculator.html", "ADI Part 3 deadline calculator"),
    ("/adi-part-3-cost-calculator.html", "ADI Part 3 cost calculator: from Part 1 to your badge"),
    ("/adi-part-3-report-form-explained.html", "The DVSA ADI Part 3 report form, box by box"),
    ("/adi-part-3-pupil-and-lesson-theme-guide.html", "Choosing your pupil and lesson theme for the ADI Part 3"),
    ("/adi-part-3-test-day-checklist.html", "ADI Part 3 test-day checklist (printable)"),
    ("/adi-part-3-marking-grades-17-competencies-explained.html", "How the ADI Part 3 is marked"),
    ("/adi-part-3-test-centres-manchester-pass-rates.html", "ADI Part 3 pass rates at Manchester test centres"),
]

def table(head, rows):
    return '<div class="tbl"><table><thead><tr>' + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div>"

def shell(slug, title, desc, h1, main, faq, about_name, script="", app=False, hero=None, cta=True):
    url = BASE + slug
    graph = [
        {"@type": "WebApplication" if app else "Article", "@id": url + "#main", **({"name": h1, "applicationCategory": "EducationalApplication", "operatingSystem": "Any", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "GBP"}, "url": url, "provider": {"@id": BASE + "#school"}, "inLanguage": "en-GB"} if app else {"headline": h1, "datePublished": TODAY, "dateModified": TODAY, "inLanguage": "en-GB", "mainEntityOfPage": url, "author": {"@id": BASE + "#school"}, "publisher": {"@id": BASE + "#school"}, "about": {"@type": "Thing", "name": about_name}, "citation": G + "adi-part-3-test"}), "description": desc},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE}, {"@type": "ListItem", "position": 2, "name": "ADI Part 3 training", "item": BASE + "adi-part-3-training-manchester.html"}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]}]
    if faq: graph.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]})
    schema = {"@context": "https://schema.org", "@graph": graph}
    faqh = ("<h2>Questions people ask</h2>" + "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)) if faq else ""
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in CLUSTER if u != "/" + slug)
    ctab = f'<h2>Want help preparing for your ADI Part 3?</h2><p>DriveSQ trains instructors for the ADI Part 3 in Greater Manchester. Tell us where you are and we will message you.</p><a class="cta" href="{BOOK}?from={slug}">Book ADI Part 3 training</a><a class="cta alt" href="{WA}" rel="nofollow noopener">WhatsApp 07352 932003</a>' if cta else ""
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}{EXTRA_CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/adi-part-3-training-manchester.html">ADI Part 3 training</a><a href="{BOOK}">Book</a><a href="/areas.html">Areas</a></nav></div></header>
<main class="wrap">{hero or f'<h1>{html.escape(h1)}</h1><div class="meta">Rules and fees checked on GOV.UK on {CHECKED} · Updated {TODAY_H}</div>'}
{main}
{faqh}
{ctab}
<h2>More for trainee instructors</h2><ul>{rel}</ul>
<p class="src"><strong>Sources and method.</strong> Rules, fees and test details come from the official GOV.UK pages on the <a href="{G}adi-part-3-test" rel="noopener">ADI part 3 test</a>, <a href="{G}trainee-driving-instructor-licence-the-rules" rel="noopener">trainee driving instructor licence</a> and <a href="{G}approved-driving-instructor-adi-fees" rel="noopener">ADI fees</a>, and from the DVSA's <a href="{FORM_URL}" rel="noopener">ADI Part 3 test report form</a> (version dated September 2022), all checked on {CHECKED}. Rules and fees can change, so always check GOV.UK before you book or pay. Calculators and examples on this page are DriveSQ's own illustrations and are not DVSA tools. Northern Ireland has different rules. This is general information, not legal advice.</p></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/privacy.html">Privacy</a> · <a href="/about.html">About</a> · <a href="/areas.html">Areas</a></footer>
<script src="/dsq-analytics.js" defer></script>{script}</body></html>'''

pages = {}

# ====================================================== 1. BOOKING PAGE ======================================================
HERO_B = '''<div class="hero"><h1>Book your ADI Part 3 training</h1><p>Tell us where you are on the road to your badge. It takes about two minutes, nothing is charged, and we will message you.</p><div class="pills"><span class="pill">✅ Checked against GOV.UK</span><span class="pill">🔒 Private: only DriveSQ sees it</span><span class="pill">💬 We reply on WhatsApp</span></div></div>'''
CENTRES = ["West Didsbury", "Cheetham Hill", "Sale", "Bolton", "Bredbury", "Bury", "Atherton", "Rochdale"]
cen_opts = '<option value="">Not booked yet / not sure</option>' + "".join(f"<option>{c}</option>" for c in CENTRES) + "<option>Another centre</option>"
HELP = ["Lesson planning", "Risk management", "Client-centred teaching", "Questions and feedback", "A full mock Part 3", "Someone to observe my teaching", "Choosing a pupil and lesson theme", "Test-day preparation", "Understanding my fail report", "Not sure: advise me"]
help_chips = "".join(f'<button type="button" class="chip2" data-help="{h}" aria-pressed="false">{h}</button>' for h in HELP)
WIZ = '''<div class="wiz" id="wiz" aria-label="ADI Part 3 training enquiry">
<div class="wiz-top"><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="5" aria-valuenow="1"><i id="bar"></i></div><div class="stepnames" id="stepnames"><span>You</span><span>Your test</span><span>Help</span><span>When</span><span>Contact</span></div></div>
<form id="f" novalidate autocomplete="on">
<section class="step on" data-step="1" aria-labelledby="q1"><h2 class="q" id="q1" style="margin-top:6px">Where are you on your ADI journey?</h2><p class="sub">Pick the one that fits best. You can add details next.</p>
<div class="opts" id="stageOpts">
<button type="button" class="opt" data-stage="Passed Part 2: ready to train for Part 3" aria-pressed="false"><span class="ic">🚗</span><span><b>I've passed Part 2</b><small>Ready to prepare for the Part 3</small></span></button>
<button type="button" class="opt" data-stage="Has a trainee licence (pink badge)" aria-pressed="false"><span class="ic">🩷</span><span><b>I have my trainee licence</b><small>Teaching with the pink badge while I prepare</small></span></button>
<button type="button" class="opt" data-stage="Has a Part 3 test booked" aria-pressed="false"><span class="ic">📅</span><span><b>My Part 3 test is booked</b><small>I want to be ready on the day</small></span></button>
<button type="button" class="opt" data-stage="Failed Part 3: wants to retake" aria-pressed="false"><span class="ic">🔁</span><span><b>I've failed Part 3 and want to retake</b><small>Let's work out what to fix</small></span></button>
<button type="button" class="opt" data-stage="Still on Part 1 or Part 2" aria-pressed="false"><span class="ic">🧭</span><span><b>I'm still on Part 1 or Part 2</b><small>Planning ahead for Part 3</small></span></button>
</div></section>
<section class="step" data-step="2" aria-labelledby="q2"><h2 class="q" id="q2" style="margin-top:6px">Tell us about your Part 3</h2><p class="sub">Everything here is optional. The more you share, the more useful our reply.</p>
<div class="row2"><div class="fld"><label for="p1">Date you passed Part 1</label><input type="date" id="p1" max="__TODAY__"><div class="hint">From your pass letter or email.</div></div>
<div class="fld"><label for="att">Part 3 attempts so far</label><select id="att"><option value="0">None yet</option><option value="1">1</option><option value="2">2</option></select></div></div>
<div class="live" id="liveP1" hidden></div>
<div class="fld"><span class="lbl">Do you have a trainee licence?</span><div class="chips2" id="licOpts"><button type="button" class="chip2" data-lic="Yes" aria-pressed="false">Yes</button><button type="button" class="chip2" data-lic="Applying" aria-pressed="false">Applying</button><button type="button" class="chip2" data-lic="No" aria-pressed="false">No</button></div></div>
<div class="fld" id="licStartWrap" hidden><label for="lic">Date your trainee licence started</label><input type="date" id="lic" max="__TODAY__"></div>
<div class="live" id="liveLic" hidden></div>
<div class="row2"><div class="fld"><label for="td">Part 3 test date (if booked)</label><input type="date" id="td"></div>
<div class="fld"><label for="tc">Test centre</label><select id="tc">__CEN__</select></div></div>
</section>
<section class="step" data-step="3" aria-labelledby="q3"><h2 class="q" id="q3" style="margin-top:6px">What would you like help with?</h2><p class="sub">Choose as many as you like.</p><div class="chips2" id="helpChips">__HELP__</div></section>
<section class="step" data-step="4" aria-labelledby="q4"><h2 class="q" id="q4" style="margin-top:6px">When suits you?</h2><p class="sub">So we can suggest sessions that fit.</p>
<div class="fld"><span class="lbl">Days and times (tick any)</span><div class="chips2" id="availChips"><button type="button" class="chip2" data-av="Weekday daytime" aria-pressed="false">Weekday daytime</button><button type="button" class="chip2" data-av="Weekday evenings" aria-pressed="false">Weekday evenings</button><button type="button" class="chip2" data-av="Weekends" aria-pressed="false">Weekends</button></div></div>
<div class="fld"><span class="lbl">How soon do you want to start?</span><div class="chips2" id="urgOpts"><button type="button" class="chip2" data-urg="As soon as possible" aria-pressed="false">As soon as possible</button><button type="button" class="chip2" data-urg="Within 2 to 4 weeks" aria-pressed="false">Within 2 to 4 weeks</button><button type="button" class="chip2" data-urg="Within 2 months" aria-pressed="false">Within 2 months</button><button type="button" class="chip2" data-urg="Just exploring" aria-pressed="false">Just exploring</button></div></div>
<div class="row2"><div class="fld"><label for="pc">Your postcode (optional)</label><input type="text" id="pc" maxlength="9" autocomplete="postal-code" placeholder="e.g. M19 2LN"></div>
<div class="fld"><label for="car">A suitable car for the test?</label><select id="car"><option value="">Not sure</option><option>Yes, I have a suitable car</option><option>I need to check the car rules</option><option>No car yet</option></select></div></div></section>
<section class="step" data-step="5" aria-labelledby="q5"><h2 class="q" id="q5" style="margin-top:6px">How do we reach you?</h2><p class="sub">We will only use this to reply about your enquiry.</p>
<div class="row2"><div class="fld"><label for="nm">Your name *</label><input type="text" id="nm" autocomplete="name" maxlength="80" required></div><div class="fld"><label for="ph">Mobile number *</label><input type="tel" id="ph" autocomplete="tel" maxlength="20" placeholder="07..." required></div></div>
<div class="row2"><div class="fld"><label for="em">Email (optional)</label><input type="email" id="em" autocomplete="email" maxlength="120"></div><div class="fld"><label for="cp">Best way to reach you</label><select id="cp"><option>WhatsApp</option><option>Phone call</option><option>Email</option></select></div></div>
<div class="fld"><label for="msg">Anything else we should know? (optional)</label><textarea id="msg" maxlength="800" placeholder="For example: what went wrong last time, or what you are most worried about."></textarea></div>
<div class="hp" aria-hidden="true"><label>Website<input type="text" id="website" tabindex="-1" autocomplete="off"></label></div>
<label class="chk"><input type="checkbox" id="consent"><span>I agree that DriveSQ can contact me about this enquiry. See the <a href="/privacy.html" target="_blank" rel="noopener">privacy policy</a>.</span></label></section>
<section class="step" data-step="6" aria-labelledby="q6"><h2 class="q" id="q6" style="margin-top:6px">Check and send</h2><p class="sub">Look right? Press send and we will be in touch.</p><div class="sum" id="sum"></div><div class="live warn" id="sendWarn" hidden></div></section>
<section class="step" data-step="7" id="doneStep" aria-live="polite"><div class="done"><div class="big" id="doneIc">🎉</div><h2 class="q" id="doneH">Thank you!</h2><p id="doneP"></p><p><a class="cta" id="waDone" href="__WA__" rel="nofollow noopener">Message us on WhatsApp</a></p><p class="sub">While you wait, try the <a href="/adi-part-3-score-calculator.html">score calculator</a> or the <a href="/adi-part-3-deadline-calculator.html">deadline calculator</a>.</p></div></section>
<div class="err" id="err" role="alert"></div>
<div class="nav2" id="nav2"><button type="button" class="btn2 ghost" id="back" style="visibility:hidden">Back</button><button type="button" class="btn2 red" id="next">Next</button></div>
</form></div>
<div class="trust"><div><b>🔒 Private</b>Your details go to a private DriveSQ system, not a public page.</div><div><b>💷 No payment</b>Nothing is charged by sending this form.</div><div><b>✅ Honest advice</b>We will tell you whether you look ready to book your test.</div></div>'''
WIZ = WIZ.replace("__TODAY__", TODAY).replace("__CEN__", cen_opts).replace("__HELP__", help_chips).replace("__WA__", WA)
WIZ_JS = r'''<script>
(function(){
var FN="__FN__",FS="__FS__",$=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var S={stage:"",lic:"",av:[],help:[],urg:""},cur=1,sending=false,sentOnce=false,names=$$("#stepnames span");
var from=(new URLSearchParams(location.search).get("from")||"").replace(/[^a-z0-9-]/gi,"").slice(0,60);
function fmt(d){return d.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
function addM(d,m){var x=new Date(d.getTime());var day=x.getDate();x.setMonth(x.getMonth()+m);if(x.getDate()<day)x.setDate(0);return x}
function show(n,quiet){cur=n;$$(".step").forEach(function(s){s.classList.toggle("on",+s.getAttribute("data-step")===n)});
 var pct=n>=7?100:Math.round((Math.min(n,6)-1)/5*100)+(n===6?0:0);$("#bar").style.width=(n>=7?100:Math.max(6,(n-1)/5*100))+"%";$(".bar").setAttribute("aria-valuenow",Math.min(n,5));
 names.forEach(function(s,i){s.classList.toggle("on",i+1===Math.min(n,5))});
 $("#back").style.visibility=(n===1||n>=7)?"hidden":"visible";$("#nav2").style.display=n>=7?"none":"flex";$("#next").textContent=n===6?"Send my enquiry":n===1?"Next":"Next";$("#err").textContent="";
 if(n===6)summary();if(quiet)return;var h=$("#wiz");try{h.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}
 var f=$(".step.on h2");if(f){f.setAttribute("tabindex","-1");f.focus({preventScroll:true})}}
function toggle(btn){var on=btn.getAttribute("aria-pressed")==="true";btn.setAttribute("aria-pressed",on?"false":"true");return !on}
$$("#stageOpts .opt").forEach(function(b){b.addEventListener("click",function(){$$("#stageOpts .opt").forEach(function(x){x.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true");S.stage=b.getAttribute("data-stage");
 if(/trainee licence/.test(S.stage)){setLic("Yes")}if(/failed/i.test(S.stage)&&$("#att").value==="0")$("#att").value="1";
 setTimeout(function(){show(2)},220)})});
function setLic(v){S.lic=v;$$("#licOpts .chip2").forEach(function(x){x.setAttribute("aria-pressed",x.getAttribute("data-lic")===v?"true":"false")});$("#licStartWrap").hidden=v!=="Yes";liveLic()}
$$("#licOpts .chip2").forEach(function(b){b.addEventListener("click",function(){setLic(b.getAttribute("data-lic"))})});
$$("#helpChips .chip2").forEach(function(b){b.addEventListener("click",function(){var v=b.getAttribute("data-help"),on=toggle(b);S.help=S.help.filter(function(x){return x!==v});if(on)S.help.push(v)})});
$$("#availChips .chip2").forEach(function(b){b.addEventListener("click",function(){var v=b.getAttribute("data-av"),on=toggle(b);S.av=S.av.filter(function(x){return x!==v});if(on)S.av.push(v)})});
$$("#urgOpts .chip2").forEach(function(b){b.addEventListener("click",function(){$$("#urgOpts .chip2").forEach(function(x){x.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true");S.urg=b.getAttribute("data-urg")})});
function liveP1(){var v=$("#p1").value,o=$("#liveP1");if(!v){o.hidden=true;return}var d=new Date(v+"T12:00:00");if(isNaN(d)){o.hidden=true;return}var end=addM(d,24),days=Math.ceil((end-new Date())/864e5);o.hidden=false;o.classList.toggle("warn",days<90);
 o.innerHTML=days<0?"⚠️ GOV.UK says you must book your next Part 3 attempt within 2 years of passing Part 1. By your date that was <b>"+fmt(end)+"</b>, so please check your position on GOV.UK or message us.":"📅 You must book your next Part 3 attempt within 2 years of passing Part 1: by <b>"+fmt(end)+"</b> ("+days+" days from today)."}
function liveLic(){var v=$("#lic").value,o=$("#liveLic");if(S.lic!=="Yes"||!v){o.hidden=true;return}var d=new Date(v+"T12:00:00");if(isNaN(d)){o.hidden=true;return}var end=addM(d,6),days=Math.ceil((end-new Date())/864e5);o.hidden=false;o.classList.toggle("warn",days<45);
 o.innerHTML=days<0?"⚠️ A trainee licence lasts 6 months, so yours ran out on <b>"+fmt(end)+"</b>. Check your options on GOV.UK.":"🩷 A trainee licence lasts 6 months: yours runs out on <b>"+fmt(end)+"</b> ("+days+" days from today)."}
$("#p1").addEventListener("change",liveP1);$("#lic").addEventListener("change",liveLic);
function data(){return{action:"adi_enquiry",name:$("#nm").value,phone:$("#ph").value,email:$("#em").value,stage:S.stage,part1_pass:$("#p1").value,trainee_licence:S.lic,licence_start:$("#lic").value,attempts:+$("#att").value||0,test_date:$("#td").value,test_centre:$("#tc").value,car:$("#car").value,help:S.help,availability:S.av.join(", "),urgency:S.urg,postcode:$("#pc").value,contact_pref:$("#cp").value,message:$("#msg").value,consent:$("#consent").checked,website:$("#website").value,source:"adi-part-3-booking"+(from?" (from "+from+")":"")}}
function summary(){var d=data(),rows=[["Name",d.name],["Mobile",d.phone],["Email",d.email],["Where you are",d.stage],["Part 1 passed",d.part1_pass?fmt(new Date(d.part1_pass+"T12:00:00")):""],["Trainee licence",d.trainee_licence+(d.licence_start?" (from "+fmt(new Date(d.licence_start+"T12:00:00"))+")":"")],["Part 3 attempts so far",d.attempts?String(d.attempts):""],["Test",[d.test_date?fmt(new Date(d.test_date+"T12:00:00")):"",d.test_centre].filter(Boolean).join(" · ")],["Help with",d.help.join(", ")],["Free",d.availability],["Start",d.urgency],["Postcode",d.postcode],["Car",d.car],["Contact by",d.contact_pref]].filter(function(r){return r[1]});
 var o=$("#sum");o.innerHTML="";rows.forEach(function(r){var x=document.createElement("div"),a=document.createElement("span"),b=document.createElement("b");a.textContent=r[0];b.textContent=r[1];x.appendChild(a);x.appendChild(b);o.appendChild(x)})}
function waText(d){return "Hi DriveSQ! I'd like ADI Part 3 training.\n"+[["Name",d.name],["Where I am",d.stage],["Test",[d.test_date,d.test_centre].filter(Boolean).join(" ")],["Help with",d.help.join(", ")],["Free",d.availability]].filter(function(r){return r[1]}).map(function(r){return "• "+r[0]+": "+r[1]}).join("\n")}
function check(n){var e="";if(n===1&&!S.stage)e="Please choose where you are so we can help properly.";
 if(n===5){var d=data();if(d.name.trim().length<2)e="Please enter your name.";else if(!/^(\+?44|0)\d[\d\s()-]{8,}$/.test(d.phone.replace(/[^\d+]/g,"").replace(/^(\+44)/,"44")?d.phone.trim():"x")&&d.phone.replace(/\D/g,"").length<10)e="Please enter a valid UK mobile number.";else if(d.email&&!/^\S+@\S+\.\S+$/.test(d.email))e="That email address does not look right.";else if(!d.consent)e="Please tick the box so we can contact you."}
 $("#err").textContent=e;return !e}
function send(){if(sending)return;sending=true;var nb=$("#next");nb.disabled=true;nb.textContent="Sending…";$("#sendWarn").hidden=true;var d=data();
 var p1=fetch(FN,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).then(function(r){return r.json().catch(function(){return{ok:false}})}).then(function(j){if(!j.ok)throw new Error(j.error||"save failed");return true});
 var fd=new FormData();fd.append("_subject","ADI Part 3 training enquiry: "+d.name);fd.append("Source","drivesq.co.uk ADI Part 3 booking");[["Name",d.name],["Mobile",d.phone],["Email",d.email],["Stage",d.stage],["Part 1 passed",d.part1_pass],["Trainee licence",d.trainee_licence],["Licence start",d.licence_start],["Attempts",d.attempts],["Test date",d.test_date],["Test centre",d.test_centre],["Car",d.car],["Help with",d.help.join(", ")],["Free",d.availability],["Start",d.urgency],["Postcode",d.postcode],["Contact by",d.contact_pref],["Message",d.message]].forEach(function(r){fd.append(r[0],r[1]===""||r[1]==null?"-":r[1])});
 var p2=fetch(FS,{method:"POST",body:fd,headers:{Accept:"application/json"}}).then(function(r){if(!r.ok)throw new Error("email "+r.status);return true});
 Promise.allSettled([p1,p2]).then(function(res){sending=false;nb.disabled=false;var okFn=res[0].status==="fulfilled",okAny=res.some(function(x){return x.status==="fulfilled"});
  if(!okFn&&res[0].reason&&/valid|name|tick|email/i.test(String(res[0].reason.message))&&!okAny){$("#err").textContent=res[0].reason.message;nb.textContent="Send my enquiry";return}
  if(okAny){try{if(window.gtag)gtag("event","generate_lead",{method:"adi_part3_booking"})}catch(e){}
   $("#doneH").textContent="Thank you, "+(d.name.trim().split(/\s+/)[0]||"")+"!";$("#doneP").textContent=(d.contact_pref==="Phone call"?"We will call you":d.contact_pref==="Email"&&d.email?"We will email you":"We will message you")+" about your ADI Part 3 training. If it is urgent, message us on WhatsApp now.";$("#waDone").href="https://wa.me/447352932003?text="+encodeURIComponent(waText(d));show(7)}
  else{$("#sendWarn").hidden=false;$("#sendWarn").innerHTML="We could not send that just now. Please <a href=\""+"https://wa.me/447352932003?text="+encodeURIComponent(waText(d))+"\" rel=\"nofollow noopener\">send it on WhatsApp</a> or call <a href=\"tel:+447352932003\">07352 932003</a>.";nb.textContent="Try again"}})}
$("#next").addEventListener("click",function(){if(!check(cur))return;if(cur===6){send();return}show(cur+1)});
$("#back").addEventListener("click",function(){if(cur>1)show(cur-1)});
$("#f").addEventListener("keydown",function(e){if(e.key==="Enter"&&e.target.tagName==="INPUT"&&e.target.type!=="checkbox"){e.preventDefault();$("#next").click()}});
show(1,true);
})();
</script>'''
WIZ_JS = WIZ_JS.replace("__FN__", FN_URL).replace("__FS__", FORMSPREE)
FB = [("Is the ADI Part 3 training booking form free?", "Yes. Sending the form does not cost anything and no payment is taken. We use it to message you about training."),
      ("Who sees the details I send?", "The form goes to a private DriveSQ system that only DriveSQ can read, and we also receive an email copy. See our <a href=\"/privacy.html\">privacy policy</a>."),
      ("What if I do not know my test date or centre?", "Leave them blank. Every question after the first is optional except your name, mobile number and the contact tick."),
      ("Can I just message you instead?", "Yes. Message DriveSQ on WhatsApp on 07352 932003 and say where you are with your Part 3."),
      ("Do I have to have a trainee licence?", "No. You can ask about training at any stage. If you want to teach paying pupils before you qualify you will need a trainee licence. See <a href=\"/trainee-driving-instructor-licence-pink-badge-explained.html\">our trainee licence guide</a>.")]
b = f'''<noscript><p class="note">The form needs JavaScript. Please message us on <a href="{WA}">WhatsApp 07352 932003</a>.</p></noscript>{WIZ}
<h2>What happens after you send it</h2><ol><li>DriveSQ gets an alert straight away.</li><li>We read where you are with Parts 1, 2 and 3, and your test date if you have one.</li><li>We message you with honest next steps: what to work on, what training would help and whether you look ready to book.</li></ol>
<p>Not ready to book? Try the <a href="/adi-part-3-score-calculator.html">score calculator</a>, the <a href="/adi-part-3-deadline-calculator.html">deadline calculator</a> or the <a href="/adi-part-3-cost-calculator.html">cost calculator</a> first.</p>'''
pages["adi-part-3-training-booking.html"] = shell("adi-part-3-training-booking.html", "Book ADI Part 3 Training in Manchester | DriveSQ", "Book ADI Part 3 training in Greater Manchester. Tell us your stage, test date and what you need help with. Free to send, no payment, we reply on WhatsApp.", "Book your ADI Part 3 training", b, FB, "ADI Part 3 training enquiry", WIZ_JS, hero=HERO_B, cta=False)

# ====================================================== 2. SCORE CALCULATOR ======================================================
COMP = [
 ("Lesson planning", [
  "Identified the pupil's learning goals and needs",
  "Agreed a lesson structure that suited the pupil's experience and ability",
  "Chose suitable practice areas",
  "Adapted the lesson plan, when appropriate, to help the pupil work towards their goals"]),
 ("Risk management", [
  "Made sure the pupil fully understood how responsibility for risk would be shared",
  "Gave clear directions and instructions in good time",
  "Showed awareness of the surroundings and the pupil's actions",
  "Intervened verbally or physically in a timely and appropriate way",
  "Gave enough feedback to help the pupil understand any potential safety-critical incident"]),
 ("Teaching and learning strategies", [
  "Used a teaching and learning style that suited the pupil's learning style and current ability",
  "Encouraged the pupil to analyse problems and take responsibility for their learning",
  "Used opportunities and examples to clarify learning outcomes",
  "Gave comprehensive, appropriate and accurate technical information",
  "Gave the pupil appropriate and timely feedback during the session",
  "Followed up and answered the pupil's queries",
  "Kept an appropriate, non-discriminatory manner throughout",
  "At the end, encouraged the pupil to reflect on their own performance"])]
rows_html = ""; n = 0
for ci, (cat, items) in enumerate(COMP):
    rows_html += f'<div class="cat">{cat}<span id="ct{ci}">0 / {len(items) * 3}</span></div><div class="sc">'
    for it in items:
        n += 1
        rows_html += f'<div class="it" data-cat="{ci}"><p><b>{n}.</b> {html.escape(it)}</p><div class="btns" role="group" aria-label="Score for area {n}">' + "".join(f'<button type="button" data-v="{v}" aria-pressed="false">{v}</button>' for v in range(4)) + "</div></div>"
    rows_html += "</div>"
SC_MAIN = f'''<div class="tool"><p class="lead" style="margin-top:0">Score a practice lesson the way the DVSA does: 17 areas, each marked 0 to 3. Ask whoever watched you to score each one, then see your total, your grade and whether the risk management rule applies.</p>
<div class="tbl" style="margin:8px 0"><table><thead><tr><th style="text-align:left">Score</th><th style="text-align:left">DVSA wording</th></tr></thead><tbody><tr><td>0</td><td style="text-align:left">No evidence</td></tr><tr><td>1</td><td style="text-align:left">Demonstrated in a few elements</td></tr><tr><td>2</td><td style="text-align:left">Demonstrated in most elements</td></tr><tr><td>3</td><td style="text-align:left">Demonstrated in all elements</td></tr></tbody></table></div>
{rows_html}
<label class="chk" style="margin-top:14px"><input type="checkbox" id="danger"><span>The examiner (or observer) had to stop the lesson because someone was put in immediate danger. This is an automatic fail on the DVSA form.</span></label>
<div class="res" id="res" aria-live="polite"><div class="big" id="tot">0 / 51</div><div id="verdict">Score all 17 areas to see your result.</div><div id="more" style="margin-top:8px;font-size:.9rem"></div></div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px" class="noprint"><button type="button" class="btn2 ghost" id="reset">Clear scores</button><a class="cta" id="askUs" href="{WA}" rel="nofollow noopener">Ask DriveSQ about my scores</a></div></div>
<h2>How this calculator follows the official rules</h2>
<ul><li><b>17 areas, each 0 to 3.</b> The most you can score is 51.</li><li><b>Fail:</b> 0 to 30. <b>Grade B:</b> 31 to 42. <b>Grade A:</b> 43 to 51.</li><li><b>Automatic fail:</b> 7 or less in risk management (five areas, so out of 15), or the lesson being stopped because of immediate danger.</li></ul>
<p>The wording of each area is a short paraphrase of the questions on the DVSA's report form. For the exact wording, use the <a href="{FORM_URL}" rel="noopener">official form</a>. Read <a href="/adi-part-3-marking-grades-17-competencies-explained.html">how the Part 3 is marked</a> and <a href="/adi-part-3-report-form-explained.html">every box on the report form</a> for the full picture.</p>
<div class="note"><b>Our own rule of thumb (not DVSA advice):</b> do not book until a few observed lessons in a row score comfortably above the pass mark, for example 36 or more with risk management at 10 or more, so a single bad moment does not decide your result.</div>'''
SC_JS = r'''<script>
(function(){var $=function(s){return document.querySelector(s)},$$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};var CATS=["Lesson planning","Risk management","Teaching and learning strategies"],MAX=[12,15,24];
function calc(){var it=$$(".sc .it"),sc=[0,0,0],done=0,all=[];it.forEach(function(x){var b=x.querySelector("button[aria-pressed=true]"),c=+x.getAttribute("data-cat");if(b){var v=+b.getAttribute("data-v");sc[c]+=v;done++;all.push(v)}else all.push(null)});
 var tot=sc[0]+sc[1]+sc[2];sc.forEach(function(v,i){$("#ct"+i).textContent=v+" / "+MAX[i]});$("#tot").textContent=tot+" / 51";var r=$("#res"),v=$("#verdict"),m=$("#more"),dg=$("#danger").checked;r.className="res";
 if(done<17&&!dg){v.textContent=done+" of 17 areas scored so far.";m.textContent="";var rm=sc[1];if(done>0&&rm<=7&&it.slice(4,9).every(function(x){return x.querySelector("button[aria-pressed=true]")}))m.innerHTML="⚠️ Risk management is "+rm+" out of 15 and all five areas are scored: 7 or less is an automatic fail.";upd(sc,tot,done);return}
 var rmFail=sc[1]<=7;var grade=tot>=43?"Grade A":tot>=31?"Grade B":"Fail";var msg,cls;
 if(dg){cls="fail";msg="❌ <b>Automatic fail:</b> the lesson was stopped because of immediate danger."}
 else if(rmFail&&tot<31){cls="fail";msg="❌ <b>Fail, two reasons:</b> your total of "+tot+" is below the 31 needed ("+(31-tot)+" more mark"+(31-tot===1?"":"s")+"), and risk management is "+sc[1]+" out of 15 (7 or less is an automatic fail)."}
 else if(rmFail){cls="fail";msg="❌ <b>Automatic fail on risk management:</b> "+sc[1]+" out of 15 (7 or less fails), even though your total is "+tot+"."}
 else if(tot<31){cls="fail";msg="❌ <b>Fail:</b> "+tot+" is below the 31 needed. You need "+(31-tot)+" more mark"+(31-tot===1?"":"s")+"."}
 else{cls="pass";msg="✅ <b>"+grade+":</b> "+tot+" out of 51. That is "+(tot-31)+" mark"+(tot-31===1?"":"s")+" above the pass mark of 31."+(tot<43?" Grade A starts at 43.":"")}
 r.className="res "+cls;v.innerHTML=msg;var per=CATS.map(function(n,i){return{n:n,s:sc[i],mx:MAX[i],p:sc[i]/MAX[i]}}).sort(function(a,b){return a.p-b.p}),w=per[0];
 m.innerHTML="Weakest category: <b>"+w.n+"</b> ("+w.s+" of "+w.mx+"). "+(rmFail&&!dg?"Fix risk management first.":(tot-31<4&&!dg&&!rmFail?"You are close to the line. A few more observed lessons above the pass mark would give you a safer margin.":""));upd(sc,tot,done)}
function upd(sc,tot,done){var t="Hi DriveSQ! I scored a practice ADI Part 3 lesson: "+tot+"/51 (lesson planning "+sc[0]+"/12, risk management "+sc[1]+"/15, teaching and learning "+sc[2]+"/24). I'd like help.";$("#askUs").href="https://wa.me/447352932003?text="+encodeURIComponent(t)}
$$(".sc .btns button").forEach(function(b){b.addEventListener("click",function(){var g=b.parentNode;Array.prototype.forEach.call(g.children,function(x){x.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true");calc()})});
$("#danger").addEventListener("change",calc);$("#reset").addEventListener("click",function(){$$(".sc button").forEach(function(b){b.setAttribute("aria-pressed","false")});$("#danger").checked=false;calc()});calc()})();
</script>'''
FSC = [("How is the ADI Part 3 scored?", "The examiner scores 17 areas of competence from 0 to 3, so the maximum is 51. 0 to 30 is a fail, 31 to 42 is Grade B and 43 to 51 is Grade A."),
       ("What is the risk management rule?", "If you score 7 or less in the risk management category, which has five areas and a maximum of 15, it is an automatic fail whatever your total."),
       ("Can I use this to predict my test result?", "It shows how a lesson would score on the DVSA's own scale if an observer marks each area honestly. It cannot predict an examiner's marks, so use it to find weak areas and to decide when you are ready."),
       ("Who should score my practice lesson?", "Someone who knows the marking and will be honest, such as your trainer or an experienced ADI. Scoring yourself is useful but less reliable."),
       ("Does this store my scores?", "No. The calculator runs in your browser and does not send your scores anywhere.")]
pages["adi-part-3-score-calculator.html"] = shell("adi-part-3-score-calculator.html", "ADI Part 3 Score Calculator: Score a Practice Lesson | DriveSQ", "Free ADI Part 3 score calculator. Score a practice lesson on the 17 official areas, see your grade (A, B or fail) and whether the risk management rule applies.", "ADI Part 3 score calculator", SC_MAIN, FSC, "ADI Part 3 score calculator", SC_JS, app=True)

# ====================================================== 3. DEADLINE CALCULATOR ======================================================
DL_MAIN = f'''<div class="tool"><p class="lead" style="margin-top:0">Enter the dates you know. The calculator works out the deadlines from the official GOV.UK rules, counts the days left and warns you when one is close.</p>
<div class="row2"><div class="fld"><label for="d1">Date you passed ADI Part 1</label><input type="date" id="d1"></div><div class="fld"><label for="d2">Date your trainee licence started (if you have one)</label><input type="date" id="d2"></div></div>
<div class="row2"><div class="fld"><label for="d3">Part 3 test date (if booked)</label><input type="date" id="d3"></div><div class="fld"><label for="d4">Part 3 attempts so far</label><select id="d4"><option value="0">None yet</option><option value="1">1</option><option value="2">2</option></select></div></div>
<div id="out" aria-live="polite"><p class="sub">Enter at least your Part 1 pass date.</p></div></div>
<h2>The rules behind the dates</h2>
{table(["Deadline", "The official rule", "How it is worked out"], [["Book your next Part 3 attempt", "Within 2 years of passing ADI Part 1", "Part 1 pass date + 2 years"], ["Trainee licence runs out", "The licence lasts 6 months", "Licence start + 6 months"], ["Extra training (option 2 only)", "Within 3 months of getting the licence and before you book Part 3, whichever is sooner", "Licence start + 3 months"], ["First ADI badge", "Apply within 12 months of passing Part 3, or you must pass all three tests again", "Part 3 test date + 12 months, if you pass"], ["After a third fail", "You must wait 2 years from your original Part 1 pass before retaking Part 1", "Part 1 pass date + 2 years"]])}
<p>Dates are shown as the calendar date and are for planning. GOV.UK and your own paperwork are the final word, so check them before you rely on a deadline. See <a href="/trainee-driving-instructor-licence-pink-badge-explained.html">the trainee licence guide</a> and <a href="/adi-part-3-fail-retake-third-attempt-rules.html">the retake rules</a>.</p>'''
DL_JS = r'''<script>
(function(){var $=function(s){return document.querySelector(s)};function fmt(d){return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}
function addM(d,m){var x=new Date(d.getTime()),day=x.getDate();x.setMonth(x.getMonth()+m);if(x.getDate()<day)x.setDate(0);return x}
function dt(v){if(!v)return null;var d=new Date(v+"T12:00:00");return isNaN(d)?null:d}
function days(d){return Math.ceil((d-new Date())/864e5)}
function card(t,d,note,warnDays){var n=days(d),w=n<0?"fail":n<=warnDays?"fail":"pass",txt=n<0?"passed "+(-n)+" day"+(n===-1?"":"s")+" ago":n===0?"today":n+" day"+(n===1?"":"s")+" left";return '<div class="res '+w+'" style="margin:10px 0"><b>'+t+'</b><div class="big" style="font-size:1.7rem;margin:4px 0">'+fmt(d)+'</div><div>'+txt+'. '+note+'</div></div>'}
function run(){var p1=dt($("#d1").value),lic=dt($("#d2").value),td=dt($("#d3").value),att=+$("#d4").value,o=$("#out"),h="";
 if(p1){h+=card("Book your next Part 3 attempt by",addM(p1,24),"GOV.UK: you must book your next attempt within 2 years of passing Part 1.",60);
  h+='<div class="live">If you fail a third time you would have to wait until <b>'+fmt(addM(p1,24))+'</b> (2 years from your original Part 1 pass) before retaking Part 1.</div>'}
 if(lic){h+=card("Trainee licence runs out",addM(lic,6),"A trainee licence lasts 6 months.",30);h+=card("Extra training deadline (option 2 only)",addM(lic,3),"Within 3 months of getting the licence and before you book the Part 3, whichever is sooner. Not needed if you chose supervision (option 1).",21);
  if(td&&td>addM(lic,6)){h+='<div class="live warn">⚠️ Your test date is after your trainee licence runs out. Check your options before you rely on that date.</div>'}}
 if(td){var n=days(td);h+='<div class="res" style="margin:10px 0"><b>Your Part 3 test</b><div class="big" style="font-size:1.7rem;margin:4px 0">'+fmt(td)+'</div><div>'+(n<0?"This date has passed.":n+" day"+(n===1?"":"s")+" to go.")+'</div></div>';h+=card("If you pass, apply for your first ADI badge by",addM(td,12),"Within 12 months of passing, or you must pass all three tests again.",60);
  if(p1&&td>addM(p1,24))h+='<div class="live warn">⚠️ This test date is more than 2 years after your Part 1 pass. Check the rule on GOV.UK.</div>'}
 if(att>=2)h+='<div class="live warn">⚠️ You have used '+att+' attempts. A third fail means you must stop giving paid lessons straight away and retake and pass Part 1 and Part 2. Make this attempt count.</div>';
 if(!h)h='<p class="sub">Enter at least your Part 1 pass date.</p>';else h+='<p class="noprint" style="margin-top:12px"><a class="cta" href="__BOOK__?from=adi-part-3-deadline-calculator">Plan my training around these dates</a></p>';o.innerHTML=h}
["d1","d2","d3","d4"].forEach(function(i){$("#"+i).addEventListener("change",run);$("#"+i).addEventListener("input",run)});run()})();
</script>'''.replace("__BOOK__", BOOK)
FDL = [("How long do I have to retake the ADI Part 3?", "GOV.UK says you must book your next attempt within 2 years of passing your ADI Part 1."),
       ("How long does a trainee licence last?", "6 months. You choose either supervision for 20% of your lessons or at least 20 hours of extra training."),
       ("When must I apply for my first ADI badge?", "Within 12 months of passing the Part 3, or you must pass all three qualifying tests again."),
       ("What is the extra training deadline?", "If you chose option 2 on your trainee licence, the extra training must be done within 3 months of getting the licence and before you book the Part 3, whichever is sooner."),
       ("Does this calculator store my dates?", "No. It runs in your browser and nothing is sent anywhere.")]
pages["adi-part-3-deadline-calculator.html"] = shell("adi-part-3-deadline-calculator.html", "ADI Part 3 Deadline Calculator: Every Date That Matters | DriveSQ", "Free ADI Part 3 deadline calculator: your 2-year Part 1 window, trainee licence expiry, extra-training and badge deadlines, from the GOV.UK rules.", "ADI Part 3 deadline calculator", DL_MAIN, FDL, "ADI Part 3 deadlines", DL_JS, app=True)

# ====================================================== 4. COST CALCULATOR ======================================================
CO_MAIN = f'''<div class="tool"><p class="lead" style="margin-top:0">Add up what becoming an ADI really costs. The DVSA fees are the official ones (checked {CHECKED}). Add your own training and other costs, and see what each retake adds.</p>
<div class="row2"><div class="fld"><label for="a1">ADI Part 1 attempts (£81 each)</label><input type="number" id="a1" min="1" max="10" value="1"></div><div class="fld"><label for="a2">ADI Part 2 attempts (£111 each)</label><input type="number" id="a2" min="1" max="10" value="1"></div></div>
<div class="row2"><div class="fld"><label for="a3">ADI Part 3 attempts (£111 each)</label><input type="number" id="a3" min="1" max="3" value="1"></div><div class="fld"><label for="a4">Trainee licences (£140 each)</label><input type="number" id="a4" min="0" max="5" value="1"><div class="hint">You need a new one if you move to a different school.</div></div></div>
<div class="row2"><div class="fld"><label for="a5">Your training costs (£)</label><input type="number" id="a5" min="0" step="50" value="0"><div class="hint">Whatever you are quoted or have paid.</div></div><div class="fld"><label for="a6">Other costs (£)</label><input type="number" id="a6" min="0" step="50" value="0"><div class="hint">Books, revision, car costs, insurance.</div></div></div>
<div class="res" id="res" aria-live="polite"></div></div>
<h2>The official DVSA fees</h2>
{table(["Stage", "Fee"], [["ADI Part 1 (theory)", "£81"], ["ADI Part 2 (driving ability)", "£111"], ["Trainee driving instructor licence", "£140"], ["ADI Part 3 (instructional ability)", "£111"], ["First ADI badge", "£300"], ["<b>Total at first attempts, with a trainee licence</b>", "<b>£743</b>"]])}
<p>You pay the full fee again every time you retake a test. Fees can change, so check <a href="{G}approved-driving-instructor-adi-fees" rel="noopener">GOV.UK</a>. Renewing your badge later costs extra, and so do other things this calculator does not cover.</p>
<h2>What a Part 3 retake really costs</h2>
<p>A retake is more than the £111 fee. You may need more training or practice lessons, and if you are earning from teaching, any time you cannot teach costs you too. That is why the cheapest plan is to be ready before you book. See <a href="/adi-part-3-score-calculator.html">the score calculator</a> and <a href="/adi-part-3-fail-retake-third-attempt-rules.html">the retake rules</a>.</p>'''
CO_JS = r'''<script>
(function(){var $=function(s){return document.querySelector(s)},v=function(i){var x=parseFloat($("#"+i).value);return isNaN(x)||x<0?0:x},m=function(n){return "£"+n.toLocaleString("en-GB",{maximumFractionDigits:0})};
function run(){var f1=v("a1")*81,f2=v("a2")*111,f3=v("a3")*111,fl=v("a4")*140,badge=300,off=f1+f2+f3+fl+badge,tr=v("a5"),ot=v("a6"),all=off+tr+ot,extra=(v("a1")-1)*81+(v("a2")-1)*111+(v("a3")-1)*111;if(extra<0)extra=0;
 $("#res").className="res";$("#res").innerHTML='<div class="big">'+m(all)+'</div><div>Total including your own costs</div><div class="sum" style="margin-top:10px"><div><span>ADI Part 1 ('+v("a1")+')</span><b>'+m(f1)+'</b></div><div><span>ADI Part 2 ('+v("a2")+')</span><b>'+m(f2)+'</b></div><div><span>Trainee licence ('+v("a4")+')</span><b>'+m(fl)+'</b></div><div><span>ADI Part 3 ('+v("a3")+')</span><b>'+m(f3)+'</b></div><div><span>First ADI badge</span><b>'+m(badge)+'</b></div><div><span>DVSA fees subtotal</span><b>'+m(off)+'</b></div><div><span>Your training and other costs</span><b>'+m(tr+ot)+'</b></div></div>'+(extra?'<div class="live warn">Retake fees in this plan: <b>'+m(extra)+'</b> on top of the first-attempt fees.</div>':'<div class="live">Every retake adds its full fee again: Part 1 £81, Part 2 or Part 3 £111.</div>')}
["a1","a2","a3","a4","a5","a6"].forEach(function(i){$("#"+i).addEventListener("input",run)});run()})();
</script>'''
FCO = [("How much does it cost to become an ADI?", "The DVSA fees alone are £743 if you pass every test at the first attempt and take a trainee licence: £81 for Part 1, £111 for Part 2, £140 for the trainee licence, £111 for Part 3 and £300 for the first badge. Training, books, car and insurance come on top."),
       ("How much is the ADI Part 3 test?", "£111 (checked on GOV.UK on 25 November 2026). You pay it again for every attempt."),
       ("Is the trainee licence compulsory?", "No, but you need one to give paid lessons before you qualify. It costs £140 and lasts 6 months."),
       ("Does this include DriveSQ's training price?", "No. Message us for the current price and enter it in the training box."),
       ("Does this calculator store my numbers?", "No. It runs in your browser and nothing is sent anywhere.")]
pages["adi-part-3-cost-calculator.html"] = shell("adi-part-3-cost-calculator.html", "ADI Part 3 Cost Calculator: Part 1 to Your Badge | DriveSQ", "Free ADI cost calculator: the official DVSA fees from Part 1 to your first badge (£743 at first attempts), retakes, plus your own training and other costs.", "ADI Part 3 cost calculator: from Part 1 to your badge", CO_MAIN, FCO, "Cost of becoming an ADI", CO_JS, app=True)

# ====================================================== 5. REPORT FORM EXPLAINED ======================================================
RF = f'''<p class="lead">When your ADI Part 3 ends, the examiner has filled in a two-page DVSA report form, and you get a copy by email. Most trainees read the total and stop. The rest of the form tells you exactly where marks were won and lost. Here is every part of it, in plain English, based on the DVSA's own form.</p>
<div class="note"><b>Source:</b> the DVSA <a href="{FORM_URL}" rel="noopener">ADI Part 3 test report form</a> (version dated September 2022). DVSA can change the form, so compare this with the current one.</div>
<h2>Page 1: the lesson and the scoring</h2>
<h3>The header boxes</h3>
{table(["Box", "What it is for"], [["Candidate, PRN, address, application reference, date, time, driver number", "Identifies you and the test"], ["Test results preference (post or email)", "How you get your result"], ["Declaration that the test vehicle is covered by a valid insurance policy", "You confirm the car is properly insured for the test. Check your insurance covers it before the day"], ["Trainer PRN, ORDIT yes/no, training records yes/no, accompanied by", "Records who trained you and whether you were accompanied (trainer, supervisor or other)"], ["Vehicle registration and transmission (manual or automatic)", "Records the car used"]])}
<h3>The lesson boxes</h3>
<p>The examiner records the type of pupil and the theme of the lesson you taught:</p>
<ul><li><b>Pupil type:</b> partly trained, trained, full licence holder (new) or full licence holder (experienced). The form abbreviates the last two as FLH.</li><li><b>Lesson theme:</b> junctions; town and city driving; interaction with other road users; dual carriageway and faster-moving roads; defensive driving; effective use of mirrors; rural roads; motorways; eco-safe driving; recap of a manoeuvre; commentary; recap of an emergency stop; independent driving; or other.</li></ul>
<p>See <a href="/adi-part-3-pupil-and-lesson-theme-guide.html">our guide to choosing your pupil and lesson theme</a>.</p>
<h3>The 17 scored areas</h3>
<p>Each area has four boxes: 0 (no evidence), 1 (demonstrated in a few elements), 2 (demonstrated in most elements), 3 (demonstrated in all elements). The areas fall into three sections, each with a total score:</p>
{table(["Section", "Areas", "What the examiner looks at"], [["Lesson planning", "4", "The pupil's goals and needs, an agreed and suitable lesson structure, suitable practice areas, and adapting the plan"], ["Risk management", "5", "Shared responsibility for risk, clear directions, awareness, timely intervention, feedback on safety-critical incidents"], ["Teaching and learning strategies", "8", "Teaching style, pupil analysing problems, clarifying outcomes, accurate information, feedback, answering queries, non-discriminatory manner, end-of-lesson reflection"]])}
<p>The form ends page 1 with a <b>total overall score</b>. Use <a href="/adi-part-3-score-calculator.html">the score calculator</a> to add up your own practice lessons the same way.</p>
<h2>Page 2: the review</h2>
{table(["Question on the form", "What a Yes means"], [["Did the candidate score 7 or less on risk management?", "Automatic fail"], ["Did the candidate behave in a way that put the examiner, the pupil or anyone else in immediate danger, so the lesson had to be stopped?", "Automatic fail"], ["Was advice given to seek further development?", "The examiner advised you to get more training. If not, the form records a reason"]])}
<p>The page also has space for the examiner's feedback to you. Read it twice: it is the most specific advice you will get.</p>
<h2>How to read your own report in ten minutes</h2>
<ol><li>Check the total against the bands: 0 to 30 fail, 31 to 42 Grade B, 43 to 51 Grade A.</li><li>Check the risk management total. If it is 7 or less out of 15, that alone is a fail.</li><li>List every area scored 0 or 1. Those are your gaps.</li><li>Group the gaps by section. A cluster in one section is your training plan.</li><li>Read the examiner's feedback and the development advice, and write your own plan.</li><li>If you failed, see <a href="/adi-part-3-fail-retake-third-attempt-rules.html">the retake rules</a> before you book again.</li></ol>'''
FRF = [("What is on the ADI Part 3 report form?", "Your details and the test details, an insurance declaration, the pupil type and lesson theme, 17 areas scored 0 to 3 in three sections, and a review page with the automatic-fail questions and feedback."),
       ("How many marks is each area worth?", "Each of the 17 areas is scored 0 to 3, so the maximum total is 51."),
       ("What does a score of 1 mean on the form?", "The form describes the four scores as: 0 no evidence, 1 demonstrated in a few elements, 2 demonstrated in most elements and 3 demonstrated in all elements."),
       ("How many areas are in risk management?", "Five, so the most you can score is 15. A score of 7 or less is an automatic fail."),
       ("Where do I get my completed report?", "GOV.UK says you receive your grade and the completed report by email at the end of the test.")]
pages["adi-part-3-report-form-explained.html"] = shell("adi-part-3-report-form-explained.html", "The ADI Part 3 Report Form Explained, Box by Box | DriveSQ", "Every box on the DVSA ADI Part 3 report form explained: the 17 scored areas, themes, pupil types, the risk management fail rule and how to read yours.", "The DVSA ADI Part 3 report form, box by box", RF, FRF, "ADI Part 3 report form")

# ====================================================== 6. PUPIL AND LESSON THEME GUIDE ======================================================
PG = f'''<p class="lead">You choose your pupil, and the lesson theme comes from your conversation with them. Both choices change how easy it is to show the 17 areas. The DVSA form lists the pupil types and the lesson themes the examiner records, which gives us a clear menu to plan from.</p>
<h2>What GOV.UK says about your pupil</h2>
<ul><li>You can bring a partly trained learner, a fully trained learner or a full licence holder.</li><li>A partly trained learner should be able to drive for 40 minutes without frequently stopping.</li><li>Your pupil cannot be an ADI, or someone who is preparing for the ADI Part 3 test.</li></ul>
<p>The DVSA form records four pupil types: <b>partly trained</b>, <b>trained</b>, <b>full licence holder (new)</b> and <b>full licence holder (experienced)</b>.</p>
<h2>The lesson themes on the form</h2>
<p>The form lists these themes for the examiner to tick: junctions; town and city driving; interaction with other road users; dual carriageway and faster-moving roads; defensive driving; effective use of mirrors; rural roads; motorways; eco-safe driving; recap of a manoeuvre; commentary; recap of an emergency stop; independent driving; and other. You are not marked on which theme you pick. You are marked on how you plan and teach it.</p>
<h2>Matching pupil, theme and goal</h2>
<p>These are our own suggestions, not DVSA rules:</p>
{table(["Pupil", "Themes that tend to give you room to show planning and coaching", "Watch out for"], [["Partly trained learner", "Junctions; town and city driving; effective use of mirrors; interaction with other road users", "A pupil who needs constant instructions leaves less space for coaching questions"], ["Trained learner", "Independent driving; defensive driving; rural roads; recap of a manoeuvre", "Too little to teach if they are already test-ready. Agree a clear goal for the lesson"], ["Full licence holder (new)", "Dual carriageway and faster-moving roads; eco-safe driving; commentary", "They may want to skip the risk conversation. Have it anyway"], ["Full licence holder (experienced)", "Defensive driving; commentary; interaction with other road users", "Experienced drivers can resist coaching. Be ready to give a reason for each question"]])}
<h2>Five questions to ask before you pick</h2>
<ol><li><b>Will they give me real goals?</b> The first area is about identifying the pupil's learning goals and needs. A pupil who knows what they want to work on helps you.</li><li><b>Can they drive for 40 minutes?</b> The test has the pupil driving for about 40 minutes.</li><li><b>Do they handle a stranger watching?</b> Nervous pupils can be hard to coach in the moment. Practise with them first.</li><li><b>Are they reliable on the day?</b> Confirm the date and arrival time more than once. A pupil who does not turn up is a problem that costs you the test.</li><li><b>Are they allowed?</b> Check they are not an ADI and are not preparing for the Part 3.</li></ol>
<h2>Practise the pairing, not just the theme</h2>
<p>Before test day, run at least two full lessons with the same pupil on a similar theme, with someone who knows the marking watching. Score them on <a href="/adi-part-3-score-calculator.html">the score calculator</a>. If risk management or lesson planning scores are low, change the plan, not just the pupil.</p>
<p>For what happens in each minute of the test, see <a href="/adi-part-3-test-what-happens-minute-by-minute.html">the test, minute by minute</a>, and for planning the lesson, <a href="/adi-part-3-lesson-planning-client-centred-learning-guide.html">our lesson-planning guide</a>.</p>'''
FPG = [("Who can I bring as a pupil for the ADI Part 3?", "A partly trained learner, a fully trained learner or a full licence holder. They cannot be an ADI or someone preparing for the ADI Part 3."),
       ("Does the lesson theme affect my score?", "The DVSA form records the theme but you are marked on the 17 areas of competence, not on which theme you chose."),
       ("What themes does the DVSA form list?", "Junctions, town and city driving, interaction with other road users, dual carriageway and faster-moving roads, defensive driving, effective use of mirrors, rural roads, motorways, eco-safe driving, recap of a manoeuvre, commentary, recap of an emergency stop, independent driving and other."),
       ("How long does the pupil drive?", "For about 40 minutes of the roughly 45 minute test."),
       ("Can I spend the whole lesson on a manoeuvre?", "No. GOV.UK says you cannot spend the whole lesson teaching a manoeuvre, although a short recap is allowed.")]
pages["adi-part-3-pupil-and-lesson-theme-guide.html"] = shell("adi-part-3-pupil-and-lesson-theme-guide.html", "Choosing Your Pupil and Lesson Theme for ADI Part 3 | DriveSQ", "How to choose your pupil and lesson theme for the ADI Part 3, using the pupil types and themes on the DVSA form and what GOV.UK says about who can be your pupil.", "Choosing your pupil and lesson theme for the ADI Part 3", PG, FPG, "ADI Part 3 pupil and lesson theme")

# ====================================================== 7. TEST DAY CHECKLIST ======================================================
def chk(items): return '<ul class="check">' + "".join(f'<li><label><input type="checkbox"><span>{i}</span></label></li>' for i in items) + "</ul>"
CK = f'''<p class="lead">Print this or tick it on your phone. It is built from what GOV.UK says you must bring and what the DVSA report form records, so nothing on it is a guess.</p>
<div class="noprint" style="margin:10px 0"><button type="button" class="btn2 red" onclick="window.print()">🖨️ Print this checklist</button></div>
<h2>The week before</h2>{chk(["Pupil booked, and they know the date, time and where to meet", "Pupil checked: they are not an ADI and not preparing for the Part 3", "Pupil can drive for about 40 minutes without frequently stopping (if a partly trained learner)", "Two full 45-minute practice lessons done and scored with an observer", "Risk management scored above 7 out of 15 in every practice lesson", "Car checked against the GOV.UK car rules for the Part 3", "Insurance checked: the form includes a declaration that the car is covered by a valid insurance policy for the test", "Journey to the test centre planned, with extra time"])}
<h2>What to bring (GOV.UK)</h2>{chk(["Your pupil", "A suitable car", "Your trainee instructor licence, or if you do not have one, your UK driving licence or passport", "Your pupil's licence or photocard details, if they are a learner or licence holder (check what they should bring)"])}
<p>If you bring the wrong things, the test can be cancelled and you do not get a refund.</p>
<h2>Before you start the lesson</h2>{chk(["Meet your pupil and put them at ease", "Know your plan to open: goals and risk, in no more than 3 minutes", "Plan how you will agree who is responsible for what", "Know how you will give feedback and when you could stop safely", "Plan the last 3 minutes: the pupil reflecting on their own performance"])}
<h2>During the lesson</h2>{chk(["Keep to about 45 minutes in total, with the pupil driving for about 40", "Do not spend the whole lesson on one manoeuvre", "Stay aware of the surroundings and the pupil's actions", "Intervene early and clearly if you need to", "Ask questions that make the pupil think, and answer theirs"])}
<h2>After the test</h2>{chk(["Check your email for your grade and the completed report", "Read the report: total, risk management score, any area scored 0 or 1", "Read the examiner's feedback and any advice to seek further development", "If you passed: apply for your first ADI badge within 12 months", "If you failed: plan your next attempt, keeping the 2-year Part 1 window in mind"])}
<p>For dates, use <a href="/adi-part-3-deadline-calculator.html">the deadline calculator</a>. For how marks are awarded, see <a href="/adi-part-3-report-form-explained.html">the report form, box by box</a>.</p>'''
FCK = [("What do I need to bring to the ADI Part 3?", "Your pupil, a suitable car and your trainee instructor licence. If you do not have a trainee licence, bring your UK driving licence or passport."),
       ("How long is the ADI Part 3 test?", "About 45 minutes, with the pupil driving for about 40."),
       ("What happens if I bring the wrong things?", "The test can be cancelled with no refund."),
       ("Is my car insurance relevant?", "The DVSA report form includes a declaration that the test vehicle is fully covered by a valid insurance policy for the test, so check yours before the day."),
       ("When do I get my result?", "You get your grade and the completed report by email at the end of the test.")]
pages["adi-part-3-test-day-checklist.html"] = shell("adi-part-3-test-day-checklist.html", "ADI Part 3 Test-Day Checklist (Printable) | DriveSQ", "A printable ADI Part 3 test-day checklist: what to bring, pupil and car checks, how to run the 45 minutes and what to do after. Based on GOV.UK.", "ADI Part 3 test-day checklist", CK, FCK, "ADI Part 3 test day")

for slug, h in pages.items(): open(os.path.join(ROOT, slug), "w", encoding="utf-8").write(h)
smp = os.path.join(ROOT, "sitemap-1.xml"); sm = open(smp, encoding="utf-8").read()
for slug in pages:
    if slug not in sm: sm = sm.replace("</urlset>", f"  <url><loc>{BASE}{slug}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
open(smp, "w", encoding="utf-8").write(sm)
print("pages:", list(pages))
