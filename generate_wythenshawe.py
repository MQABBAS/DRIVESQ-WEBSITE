#!/usr/bin/env python3
"""DriveSQ — Wythenshawe (M22 + neighbouring M23 wards) pages, same format as Bolton: title → booking → photos → information.
  wythenshawe-test-centres-automatic-vs-manual.html      West Didsbury, Sale, Bredbury, Cheetham Hill: manual vs automatic, waits, ages
  wythenshawe-driving-guide-trams-airport-motorways.html  Metrolink Airport line stops (TfGM), tram rules 300–307, M56/M60, airport, Manchester road safety
  driving-lessons-<ward>-wythenshawe.html                 Sharston, Woodhouse Park, Northenden, Baguley, Brooklands
Data: _data/dvsa_centres_gm.json, _data/bolton_extra.json (RAS0403 incl. Manchester), _data/wythenshawe_areas.json,
      _data/dvsa_locations_wythenshawe.json.   Run:  python3 generate_wythenshawe.py"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("gb", os.path.join(HERE, "generate_bolton.py"))
B = importlib.util.module_from_spec(_s); _s.loader.exec_module(B)
L, e, kpis, card, C, NAT, Y, X = B.L, B.e, B.kpis, B.card, B.C, B.NAT, B.Y, B.X
B.PLACE, B.HUB, B.EXAMPLE_PC = "Wythenshawe", "driving-lessons-wythenshawe.html", "M22 5RB"
W = json.load(open(os.path.join(HERE, "_data", "wythenshawe_areas.json")))
LOCW = json.load(open(os.path.join(HERE, "_data", "dvsa_locations_wythenshawe.json")))
K = ["west-didsbury", "sale", "bredbury", "cheetham-hill"]
SH = {"west-didsbury": "West Didsbury", "sale": "Sale", "bredbury": "Bredbury", "cheetham-hill": "Cheetham Hill", "chadderton": "Chadderton", "bolton": "Bolton"}
COL = {"west-didsbury": "#D10A11", "sale": "#2563eb", "bredbury": "#16a34a", "cheetham-hill": "#d97706"}
F_DATA, F_GUIDE = "wythenshawe-test-centres-automatic-vs-manual.html", "wythenshawe-driving-guide-trams-airport-motorways.html"
SLUG = {w: re.sub(r"[^a-z]+", "-", w.lower()).strip("-") for w in W["wards"]}
WF = {w: f"driving-lessons-{SLUG[w]}-wythenshawe.html" for w in W["wards"]}
B.SRC.update({
    "finderw": ("GOV.UK — Find a driving test centre (DVSA), searched from M22", "https://www.gov.uk/find-driving-test-centre"),
    "tram": ("TfGM — Metrolink tram stops", "https://tfgm.com/public-transport/tram/stops"),
    "hc_tram": ("The Highway Code — Tramways, rules 300 to 307", "https://www.gov.uk/guidance/the-highway-code/road-works-level-crossings-and-tramways-288-to-307"),
    "hc_224": ("The Highway Code — rules 223 and 224 (buses, trams, electric vehicles)", "https://www.gov.uk/guidance/the-highway-code/road-users-requiring-extra-care-204-to-225"),
    "hc_183": ("The Highway Code — rule 183 (give way to bus lanes, cycle lanes and tramways when turning)", "https://www.gov.uk/guidance/the-highway-code/using-the-road-159-to-203")})


def lw(k): return B.lastwait(k)


def split(k):
    t, a = C[k]["years"][Y], C[k]["auto"][Y]
    ap = round(a["n"] * a["p"] / 100); mn = t["n"] - a["n"]
    return {"auto": a["p"], "manual": round(100 * (t["pass"] - ap) / mn, 1), "share": round(100 * a["n"] / t["n"]), "an": a["n"], "mn": mn}


def more(exclude):
    items = [(F_DATA, "Test centres: manual vs automatic"), (F_GUIDE, "Trams, airport & motorways guide"), ("driving-lessons-wythenshawe.html", "Driving lessons in Wythenshawe"),
             ("automatic-driving-lessons-wythenshawe.html", "Automatic lessons in Wythenshawe"), ("manual-driving-lessons-wythenshawe.html", "Manual lessons in Wythenshawe"),
             ("intensive-driving-course-wythenshawe.html", "Intensive courses in Wythenshawe")]
    return L.sec("more", "Keep reading", "More for Wythenshawe learners", "", L.chips([x for x in items if x[0] != exclude]) +
                 '<h3 style="font-family:Oswald,sans-serif;font-size:1.1rem;margin-top:18px">Wythenshawe neighbourhoods</h3>' + L.chips([(WF[w], w + (" (M22)" if W["wards"][w]["m22"] else "")) for w in WF if WF[w] != exclude]))


def centre_rows(tcs):
    out = ""
    for t in tcs:
        k = t["k"]; loc = LOCW["practical"][k]; sp = split(k); c = C[k]
        out += (f'<tr><td><b>{e(SH[k])}</b><small style="display:block;color:#777">{e(loc["addr"])}</small></td><td data-l="Distance"><b>{t["mi"]} mi</b></td>'
                f'<td data-l="Manual">{sp["manual"]}%</td><td data-l="Automatic">{sp["auto"]}%</td><td data-l="First time">{c["first"][Y]["p"]}%</td><td data-l="Median wait">{lw(k)["med"]} wks</td>'
                f'<td style="font-size:.78rem">{e(loc["types"])}{"<br>♿ wheelchair access" if loc["wheelchair"] else ""}{("<br>⚠️ " + e(loc["note"])) if loc["note"] else ""}</td></tr>')
    return ('<div class="sol-wrap reveal"><table class="sol-tbl bt-cent"><thead><tr><th>Centre</th><th>Distance</th><th>Manual</th><th>Automatic</th><th>First time</th><th>Median wait</th><th>Tests there</th></tr></thead><tbody>'
            + out + "</tbody></table></div>")


# ─────────────────────── 1. test centres, manual vs automatic ───────────────────────
def data_page():
    f = F_DATA; sp = {k: split(k) for k in K}; gb = NAT["years"][Y]; gba = NAT["auto"][Y]
    gbm = round(100 * (gb["n"] * gb["p"] / 100 - gba["n"] * gba["p"] / 100) / (gb["n"] - gba["n"]), 1)
    wm = lw("west-didsbury")["mo"].replace("-", " ")
    wards = W["wards"]
    dt = "".join(f'<tr><td><a href="{WF[w]}"><b>{e(w)}</b></a>{" <small>(M22)</small>" if wards[w]["m22"] else ""}</td>' + "".join(f'<td>{next(t["mi"] for t in wards[w]["tc"] if t["k"] == k)} mi</td>' for k in K) + "</tr>" for w in wards)
    ages = {k: {a["age"]: a["p"] for a in C[k]["age"]} for k in ("west-didsbury", "sale")}
    years = [y for y in sorted(C["west-didsbury"]["years"]) if y >= "2013-14"]
    recent = [x["mo"] for x in C["west-didsbury"]["waits"] if x["mo"].endswith("2025") or x["mo"].endswith("2026")]
    ws = {k: {x["mo"]: x["med"] for x in C[k]["waits"]} for k in K}
    mv = LOCW["move"]
    secs = [
        kpis([(sp["west-didsbury"]["manual"], 1, "%", "West Didsbury manual pass rate"), (sp["west-didsbury"]["auto"], 1, "%", "West Didsbury automatic"), (sp["sale"]["auto"], 1, "%", "Sale automatic"), (lw("sale")["med"], 1, " wks", f"Sale median wait, {wm}")]),
        L.sec("gear", "Manual or automatic?", "Automatic tests pass less often at every centre near Wythenshawe",
              f"DVSA {Y}. Manual is worked out from DVSA's totals minus its automatic figures. Across Great Britain: manual about {gbm}%, automatic {gba['p']}%.",
              card("chGear") + f'<div class="sol-wrap reveal mt-3"><table class="sol-tbl"><thead><tr><th>Centre</th><th>Manual</th><th>Automatic</th><th>Gap</th><th>Automatic share of tests</th><th>Automatic tests</th></tr></thead><tbody>' +
              "".join(f'<tr><td>{SH[k]}</td><td><b>{sp[k]["manual"]}%</b></td><td><b>{sp[k]["auto"]}%</b></td><td>{sp[k]["manual"] - sp[k]["auto"]:+.1f}</td><td>{sp[k]["share"]}%</td><td>{sp[k]["an"]:,}</td></tr>' for k in K) + "</tbody></table></div>"),
        L.sec("choose", "Which suits you", "Manual or automatic in Wythenshawe — an honest guide", "",
              L.cards([("bi-gear-wide-connected", "Choose manual if…", "you want a licence for both gearboxes, may drive vans or older family cars, or want the cheapest cars to insure and buy. Manual pass rates are higher here — partly because of who chooses it."),
                       ("bi-lightning-charge", "Choose automatic if…", "you want fewer controls to master on busy roads like the M56 approaches and Princess Parkway, plan to drive an electric car (all are automatic), or have struggled with clutch control."),
                       ("bi-train-front", "Tram roads either way", "Wythenshawe has 13 Metrolink stops between Baguley and the Airport. Whichever gearbox, you'll learn the tram rules (Highway Code 300–307) and how to cross tracks safely."),
                       ("bi-cash", "Same price", "DriveSQ charges £35/hr for manual or automatic, or 10 hours for £350."),
                       ("bi-question-circle", "Still unsure?", '<a href="manual-or-automatic-decider.html">Try the 1-minute decider</a>.')]), alt=True),
        L.sec("near", "Distances", "How far each centre is from your part of Wythenshawe",
              "Straight-line miles from the middle of each ward to DVSA's own centre locations (GOV.UK). Northenden is closest to West Didsbury; Brooklands and Baguley to Sale.",
              f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Ward</th>' + "".join(f"<th>{SH[k]}</th>" for k in K) + f"</tr></thead><tbody>{dt}</tbody></table></div>"),
        L.sec("centres", "The centres", "Addresses, tests, access and the latest figures", f"Pass rates April 2025 – March 2026; waits are DVSA's median for {wm}.",
              centre_rows([{"k": k, "mi": next(t["mi"] for t in wards["Sharston"]["tc"] if t["k"] == k)} for k in K]) +
              '<p class="sol-note mt-2">Distances here are from the middle of Sharston ward (M22).</p>', alt=True),
        L.sec("rules", "2026 booking rules", "Moving a West Didsbury or Sale test", "Since 2026 a booked test can only move to one of its three nearest centres (GOV.UK, updated 15 October 2026):",
              L.cards([("bi-arrow-left-right", "West Didsbury →", " · ".join(f"{SH[a]} (about {m} mi)" for a, m in mv["west-didsbury"])),
                       ("bi-arrow-left-right", "Sale →", " · ".join(f"{SH[a]} (about {m} mi)" for a, m in mv["sale"])),
                       ("bi-2-circle", "Two changes", "You get two changes per booking, and only you can book or change it on GOV.UK."),
                       ("bi-calendar-week", "New dates", "A new week of tests is released at 6am every Monday, about 24 weeks ahead.")])),
        L.sec("waits", "Waiting times", "Median waits since January 2025", "Weeks from booking to test, DVSA monthly figures.", card("chW"), alt=True),
        L.sec("age", "By age", "Younger learners pass more often", f"Pass rate by age at West Didsbury and Sale, {Y} (DVSA).", card("chAge")),
        L.sec("trend", "Long view", "Pass rates since 2013", "West Didsbury and Sale against Great Britain.", card("chY"), alt=True),
        B.photos((2, 6, 9, 0, 4)),
        more(f), B.sources(("dvsa", "finderw", "move", "rules", "release"))]
    faqs = [("Is the automatic driving test harder near Wythenshawe?", f"Automatic pass rates are lower at every nearby centre: West Didsbury {sp['west-didsbury']['auto']}% automatic vs about {sp['west-didsbury']['manual']}% manual, Sale {sp['sale']['auto']}% vs about {sp['sale']['manual']}% ({Y}, DVSA)."),
            ("Which test centre is nearest to Wythenshawe?", f"West Didsbury ({LOCW['practical']['west-didsbury']['addr']}) for Northenden, Sharston and Woodhouse Park; Sale ({LOCW['practical']['sale']['addr']}) for Brooklands and Baguley."),
            ("How long is the wait for a driving test at West Didsbury?", f"DVSA's median wait was {lw('west-didsbury')['med']} weeks in {wm}; Sale was {lw('sale')['med']} weeks."),
            ("Can I move my West Didsbury test to Sale?", "Yes — Sale is one of West Didsbury's three nearest centres (about 4 miles), along with Cheetham Hill and Bredbury. You get two changes per booking."),
            ("Do you teach both manual and automatic in Wythenshawe?", "Yes — £35/hr either way, with pick-up anywhere in M22 and M23.")]
    data = {"gear": sum(([{"label": SH[k] + " — manual", "value": sp[k]["manual"]}, {"label": SH[k] + " — automatic", "value": sp[k]["auto"], "hi": True}] for k in K), []),
            "labels": [m[:3] + " " + m[-2:] for m in recent], "ws": {k: [ws[k].get(m) for m in recent] for k in K}, "names": SH, "cols": COL,
            "ages": [str(a) for a in range(17, 26)], "wd": [ages["west-didsbury"].get(str(a)) for a in range(17, 26)], "sa": [ages["sale"].get(str(a)) for a in range(17, 26)],
            "yl": [y[2:4] + "/" + y[5:] for y in years], "ywd": [C["west-didsbury"]["years"][y]["p"] for y in years], "ysa": [C["sale"]["years"].get(y, {}).get("p") for y in years], "ygb": [NAT["years"].get(y, {}).get("p") for y in years]}
    script = """DSQCharts.bars(document.getElementById('chGear'),D.gear,{unit:'%',max:70});
DSQCharts.line(document.getElementById('chW'),{label:'Median waits',min:0,digits:1,series:Object.keys(D.ws).map(function(k){return{name:D.names[k],color:D.cols[k],pts:D.labels.map(function(l,i){return[l,D.ws[k][i]];})};})});
DSQCharts.line(document.getElementById('chAge'),{label:'Pass rate by age',unit:'%',series:[{name:'West Didsbury',color:'#D10A11',pts:D.ages.map(function(a,i){return['Age '+a,D.wd[i]];})},{name:'Sale',color:'#2563eb',pts:D.ages.map(function(a,i){return['Age '+a,D.sa[i]];})}]});
DSQCharts.line(document.getElementById('chY'),{label:'Pass rate by year',unit:'%',series:[{name:'West Didsbury',color:'#D10A11',pts:D.yl.map(function(l,i){return[l,D.ywd[i]];})},{name:'Sale',color:'#2563eb',pts:D.yl.map(function(l,i){return[l,D.ysa[i]];})},{name:'Great Britain',color:'#111',dash:1,pts:D.yl.map(function(l,i){return[l,D.ygb[i]];})}]});"""
    hero = L.hero("Official DVSA data · Wythenshawe M22", '<span class="w">Manual</span> <span class="w w--red">vs automatic</span> <span class="w">Wythenshawe.</span>', "pass rates, waits and distances at the test centres Wythenshawe learners use",
                  [("bi-gear", "Manual vs automatic"), ("bi-geo-alt", "West Didsbury · Sale · Bredbury"), ("bi-hourglass-split", "Latest waits")], [("red", "#gear", "bi-bar-chart", "See the comparison"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Manual vs automatic driving test pass rates for Wythenshawe (M22/M23) learners: West Didsbury {sp['west-didsbury']['manual']}% manual / {sp['west-didsbury']['auto']}% automatic, Sale, Bredbury and Cheetham Hill — waits, distances, addresses and 2026 rules."
    return f, B.build(f, "Manual vs automatic test data", f"Manual vs Automatic Driving Tests near Wythenshawe ({Y} DVSA) | DriveSQ", desc,
                      "automatic driving lessons wythenshawe, manual driving lessons wythenshawe, west didsbury test centre pass rate, sale test centre pass rate, automatic driving test pass rate manchester, driving test centre near wythenshawe",
                      hero, secs, faqs, data, script, [B.dataset("Driving test centres near Wythenshawe", desc, "Driver and Vehicle Standards Agency", B.SRC["dvsa"][1])], (2, 6, 9, 0, 4))


# ─────────────────────── 2. trams, airport and motorways ───────────────────────
def guide():
    f = F_GUIDE; tr = W["trams"]; R = X["roads"]["boroughs"]; man = R["Manchester"]
    rk = sorted(R, key=lambda k: R[k]["cas"]["rate"][-1]); pos = rk.index("Manchester") + 1
    trows = "".join(f'<tr><td><b>{e(t["stop"])}</b></td><td>{e(t["pc"])}</td><td>{e(t["ward"] or "Manchester Airport")}</td></tr>' for t in tr)
    mw = {w: d["motorways"] for w, d in W["wards"].items()}
    secs = [
        kpis([(len(tr), 0, "", "Metrolink stops between Baguley and the Airport"), (2, 0, "", "motorways through Wythenshawe (M56, M60)"), (man["cas"]["n"][-1], 0, "", "road casualties in Manchester, 2025"), (8, 0, "", "Highway Code tram rules (300–307)")]),
        L.sec("trams", "Trams", "Driving alongside the Metrolink Airport line",
              "TfGM lists these stops through Wythenshawe. The line runs on its own track in places and alongside or across roads in others, so you'll meet trams and tram crossings on everyday lessons.",
              '<div class="rs-split"><div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Tram stop</th><th>Postcode (TfGM)</th><th>Ward</th></tr></thead><tbody>' + trows + "</tbody></table></div>" +
              L.cards([("bi-sign-stop", "Never enter tram-only routes", "Rule 300: you MUST NOT enter a road, lane or route reserved for trams — and don't follow a tram where it leaves the road."),
                       ("bi-arrow-left-right", "Always give way to trams", "Rule 301: trams have their own signals and may move when you can't. Don't race them or pass on the inside."),
                       ("bi-volume-mute", "Silent and can't steer", "Rule 224: trams move quickly but silently and cannot steer to avoid you."),
                       ("bi-cone", "Crossing the rails", "Rule 306: take extra care crossing rails, especially when wet, on bends and at shallow angles — cross as near a right angle as you can.")]) + "</div>"),
        L.sec("motorways", "Motorways & the airport", "M56 and M60 on your doorstep",
              "OS Open Roads shows the M56 crossing Sharston, Woodhouse Park, Northenden and Baguley, and the M60 through Northenden and Brooklands. Manchester Airport (M90) sits in Woodhouse Park ward.",
              L.cards([("bi-sign-merge-right", "Motorway lessons", "Learners can drive on motorways with an approved instructor in a dual-control car — the M56 and M60 are minutes away for slip-road and merging practice."),
                       ("bi-airplane", "Airport roads", "Expect heavy, unfamiliar traffic, drop-off zones, lane changes and frequent signs near the airport — great for planning and lane discipline."),
                       ("bi-signpost-split", "Big junctions", "Wythenshawe's dual carriageways and multi-lane roundabouts are where we practise lane choice and signalling early."),
                       ("bi-map", "Your ward", " · ".join(f'<a href="{WF[w]}">{e(w)}</a>' + (f" ({', '.join(m)})" if m else "") for w, m in mw.items()))]), alt=True),
        L.sec("safety", "Road safety", f"Manchester has Greater Manchester's highest casualty rate per mile",
              f"In 2025, {man['cas']['n'][-1]} people were hurt on roads in Manchester (which includes Wythenshawe) — {man['cas']['rate'][-1]:.0f} per billion vehicle miles, {pos} of 10 Greater Manchester boroughs from safest (DfT RAS0403). {man['ksi']['n'][-1]} were killed or seriously injured.",
              card("chB", '<p class="small text-muted mt-2 mb-0">Casualties per billion vehicle miles, 2025 — lower is safer.</p>')),
        L.sec("gear", "Manual or automatic", "Which gearbox for Wythenshawe roads?", "",
              L.cards([("bi-lightning-charge", "Automatic", "One less thing to think about when you're watching trams, buses and airport traffic. All electric cars are automatic."),
                       ("bi-gear-wide-connected", "Manual", "A licence for both. Smooth clutch control matters in queues on Princess Parkway and around the motorway junctions."),
                       ("bi-bar-chart", "The data", f'<a href="{F_DATA}">Manual vs automatic pass rates at West Didsbury, Sale and Bredbury</a>.')]), alt=True),
        B.photos((8, 3, 1, 7, 5)),
        more(f), B.sources(("tram", "hc_tram", "hc_224", "hc_183", "cpo", "ras"), "TfGM, GOV.UK, Ordnance Survey and DfT, checked 9 November 2026.")]
    faqs = [("Do learner drivers in Wythenshawe drive near trams?", f"Yes — the Metrolink Airport line has {len(tr)} stops from Baguley to Manchester Airport (TfGM). The Highway Code's tram rules are 300 to 307."),
            ("Can learners drive on the M56 and M60?", "Yes, with an approved driving instructor in a car with dual controls. Both motorways run through Wythenshawe."),
            ("What are the main tram rules for drivers?", "Never enter tram-only routes (rule 300), always give way to trams and don't race or pass them on the inside (rule 301), don't stop on the track (rule 302), and take extra care crossing rails, especially when wet (rule 306)."),
            ("How safe are Manchester's roads?", f"Manchester had {man['cas']['rate'][-1]:.0f} casualties per billion vehicle miles in 2025 — the highest rate of the 10 Greater Manchester boroughs (DfT).")]
    data = {"bo": [{"label": k, "value": R[k]["cas"]["rate"][-1], "hi": k == "Manchester"} for k in rk]}
    script = """DSQCharts.bars(document.getElementById('chB'),D.bo,{digits:0,max:520});"""
    hero = L.hero("TfGM · Highway Code · DfT", '<span class="w">Trams, airport</span> <span class="w w--red">&amp; motorways.</span>', "what makes learning to drive in Wythenshawe different — and how we teach it",
                  [("bi-train-front", f"{len(tr)} tram stops"), ("bi-sign-merge-right", "M56 & M60"), ("bi-airplane", "Manchester Airport")], [("red", "#trams", "bi-train-front", "Tram rules"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Learning to drive in Wythenshawe: all {len(tr)} Metrolink Airport line stops (TfGM) and the Highway Code tram rules, the M56/M60 and airport roads, and Manchester road safety data — manual or automatic lessons £35/hr."
    return f, B.build(f, "Trams, airport & motorways", "Driving in Wythenshawe: Trams, Airport & M56/M60 Guide | DriveSQ", desc,
                      "driving lessons wythenshawe, learner driver trams manchester, metrolink tram rules drivers, motorway lessons m56, driving near manchester airport, wythenshawe driving guide",
                      hero, secs, faqs, data, script, [], (8, 3, 1, 7, 5))


# ─────────────────────── 3. ward pages ───────────────────────
def ward(w, idx):
    d = W["wards"][w]; f = WF[w]; tc = [t for t in d["tc"] if t["k"] in K][:4]; near = tc[0]; nk = near["k"]; sp = split(nk); th = d["theory"]
    dists = ", ".join(k for k in d["districts"] if re.fullmatch(r"M2[23]|M33|M90", k))
    secs_s = ", ".join(d["sectors"])
    mainroads = []
    for rd, num in d["main"]:
        if all(rd != m[0] for m in mainroads): mainroads.append((rd, num))
    letters = {}
    for r in d["roads"]: letters.setdefault(r[0].upper(), []).append(r)
    az = "".join(f'<p style="margin:0 0 6px;font-size:.86rem"><b style="color:#D10A11;margin-right:6px">{k}</b>{e(", ".join(v))}</p>' for k, v in sorted(letters.items()))
    finder = (f'<div class="sol-card reveal" style="padding:20px"><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="arPc" class="form-control" style="max-width:230px" placeholder="Your postcode, e.g. {e(d["pcs"][len(d["pcs"]) // 2][0])}" autocomplete="postal-code">'
              '<button type="button" class="dsqx-btn dsqx-btn--red" id="arGo">Check</button></div><div id="arOut" class="mt-3" style="font-size:.92rem"></div>'
              f'<p class="sol-note mt-2 mb-0">Covers all {d["postcodes"]} postcodes in {e(w)} ward. Nearest road from OS Open Roads.</p></div>')
    local = [("bi-train-front", "Trams here", ("Metrolink stops in this ward: " + ", ".join(d["trams"]) + ". Expect tram crossings — give way to trams and never enter tram-only routes (Highway Code 300–301).") if d["trams"] else "No Metrolink stops inside the ward, but the Airport line is close by — we cover tram rules on every route."),
             ("bi-sign-merge-right", "Motorways", (", ".join(d["motorways"]) + " run through or along the ward — ideal for motorway lessons with a dual-control car.") if d["motorways"] else "The M56 and M60 are a short drive away for motorway lessons."),
             ("bi-signpost-split", "Busy roads", ", ".join(f"{r} ({n})" for r, n in mainroads[:5]) or "Local estate roads, junctions and roundabouts.")]
    secs = [
        kpis([(near["mi"], 1, " mi", f"to {SH[nk]} test centre"), (sp["manual"], 1, "%", f"{SH[nk]} manual pass rate"), (sp["auto"], 1, "%", f"{SH[nk]} automatic pass rate"), (len(d["roads"]), 0, "", f"named roads in {w}")]),
        L.sec("centres", "Test centres", f"Your nearest test centres from {w} — manual and automatic",
              f"Straight-line distances from the middle of {w} to DVSA's own centre locations, with {Y} manual (derived) and automatic pass rates and the latest median waits.", centre_rows(tc)
              + f'<p class="mt-3" style="font-size:.9rem">Theory test: nearest is <b>{e(th[0]["name"])}</b> (about {th[0]["mi"]} mi), then {e(th[1]["name"])} ({th[1]["mi"]} mi). <a href="{F_DATA}">Full manual vs automatic data</a>.</p>'),
        L.sec("gear", "Manual or automatic", "Both, same price", f"DriveSQ teaches manual and automatic in {w} at £35/hr. At {SH[nk]}, {sp['share']}% of tests are now automatic.",
              L.cards([("bi-gear-wide-connected", f"Manual — {sp['manual']}% at {SH[nk]}", "A licence for both gearboxes. Higher pass rates locally, partly because of who chooses manual."),
                       ("bi-lightning-charge", f"Automatic — {sp['auto']}% at {SH[nk]}", "Fewer controls, often fewer hours to test standard — and ready for an electric car."),
                       ("bi-question-circle", "Not sure?", '<a href="manual-or-automatic-decider.html">Take the 1-minute decider</a>.')]), alt=True),
        L.sec("local", "Local roads", f"What learning in {w} involves", f"From OS Open Roads and TfGM: {len(d['roads'])} named roads, postcode sectors {secs_s}.", L.cards(local)),
        L.sec("finder", "Postcode check", f"Is your postcode in {w}?", "See your nearest road and test centres, then book.", finder, alt=True),
        L.sec("az", "Street index", f"Every named road in {w} (A–Z)", "Pick-up from home, college, work or the airport.", f'<div class="sol-card reveal" style="padding:18px">{az}</div>'),
        B.photos(((idx * 2) % 10, (idx * 2 + 3) % 10, (idx * 2 + 5) % 10, (idx * 2 + 7) % 10, (idx * 2 + 9) % 10)),
        more(f), B.sources(("finderw", "dvsa", "move", "tram", "hc_tram", "cpo"), "DVSA, TfGM, GOV.UK and Ordnance Survey data, checked 9 November 2026.")]
    faqs = [(f"What's the nearest driving test centre to {w}?", f"{SH[nk]} ({LOCW['practical'][nk]['addr']}), about {near['mi']} miles from the middle of {w}. In {Y} its pass rate was about {sp['manual']}% manual and {sp['auto']}% automatic (DVSA)."),
            (f"Do you do automatic driving lessons in {w}?", f"Yes — automatic and manual, both £35/hr, with pick-up anywhere in {w}."),
            (f"Which postcodes are in {w} ward?", f"{d['postcodes']} postcodes in sectors {secs_s} (Ordnance Survey Code-Point Open)."),
            (f"Where is the nearest theory test centre to {w}?", f"{th[0]['name']} — {next(t['addr'] for t in LOCW['theory'] if t['name'] == th[0]['name'])} (about {th[0]['mi']} miles).")]
    if d["trams"]: faqs.append((f"Are there tram stops in {w}?", f"Yes — {', '.join(d['trams'])} on the Metrolink Airport line (TfGM)."))
    data = {"pcs": d["pcs"], "ward": w, "near": [{"n": SH[t["k"]], "mi": t["mi"], "p": C[t["k"]]["years"][Y]["p"]} for t in tc[:3]]}
    script = """var M={};D.pcs.forEach(function(p){M[p[0].replace(/\\s/g,'')]=p;});
function go(){var raw=document.getElementById('arPc').value.trim().toUpperCase(),v=raw.replace(/[^A-Z0-9]/g,''),o=document.getElementById('arOut'),r=M[v];
if(!v){o.innerHTML='';return;}if(!r){o.innerHTML='ℹ️ <b>'+raw.replace(/[<>&"]/g,'')+'</b> isn\\'t in '+D.ward+' ward — but we cover all of Wythenshawe and Manchester. <a href="#book">Book anyway</a>.';return;}
o.innerHTML='✅ <b>'+r[0]+'</b> is in <b>'+D.ward+'</b>'+(r[1]?' — nearest road: <b>'+r[1]+'</b>':'')+'.<br>Nearest test centres: '+D.near.map(function(n){return n.n+' ('+n.mi+' mi, '+n.p+'% pass rate)';}).join(' · ')+
'<div class="mt-2"><a class="dsqx-btn dsqx-btn--red" href="#" data-dsq-book-pc="'+r[0]+'">📅 Book lessons from '+r[0]+'</a></div>';}
document.getElementById('arGo').onclick=go;document.getElementById('arPc').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();go();}});"""
    hero = L.hero(f"Wythenshawe · {dists}", f'<span class="w">Driving lessons</span> <span class="w w--red">{e(w)}.</span>', f"manual & automatic — nearest test centres, trams, motorways and a postcode check",
                  [("bi-geo-alt", f"{near['mi']} mi to {SH[nk]}"), ("bi-gear", "Manual & automatic £35/hr"), ("bi-train-front", f"{len(d['trams'])} tram stops" if d["trams"] else "Near the Metrolink")],
                  [("red", "#centres", "bi-geo-alt", "Nearest test centres"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    desc = f"Manual and automatic driving lessons in {w}, Wythenshawe ({dists}): nearest test centre {SH[nk]} ({near['mi']} mi; {sp['manual']}% manual, {sp['auto']}% automatic), theory centre, trams, motorways, postcode check. £35/hr."
    return f, B.build(f, f"Driving lessons {w}", f"Driving Lessons {w}, Wythenshawe ({dists}) — Manual & Automatic | DriveSQ", desc,
                      f"driving lessons {w.lower()}, automatic driving lessons {w.lower()}, manual driving lessons {w.lower()}, driving instructor {w.lower()}, driving lessons wythenshawe {dists.lower()}",
                      hero, secs, faqs, data, script, [], ((idx * 2) % 10, (idx * 2 + 3) % 10, (idx * 2 + 5) % 10, (idx * 2 + 7) % 10, (idx * 2 + 9) % 10))


def main():
    out = dict([data_page(), guide()] + [ward(w, i) for i, w in enumerate(W["wards"])])
    for f, h in out.items(): open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml"); x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{L.SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{B.TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{B.TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", ", ".join(out))


if __name__ == "__main__":
    main()
