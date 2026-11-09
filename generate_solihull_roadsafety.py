#!/usr/bin/env python3
"""DriveSQ — Solihull road safety page built from DfT RAS0403 (_data/solihull_road_casualties.json).
  solihull-road-accident-statistics.html   10-year casualty/collision trends, borough comparison, road users, what it means for learners
Run after build_road_casualties.py:  python3 generate_solihull_roadsafety.py"""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location("dt", os.path.join(HERE, "generate_dvsa_topics.py"))
DT = importlib.util.module_from_spec(_s); _s.loader.exec_module(DT)
L, e, kpis, card, CHART, TODAY = DT.L, DT.e, DT.kpis, DT.card, DT.CHART, DT.TODAY
D = json.load(open(os.path.join(HERE, "_data", "solihull_road_casualties.json")))
YRS = D["years"]
SRC = [("DfT — Reported road casualties Great Britain: final results 2025", "https://www.gov.uk/government/statistics/reported-road-casualties-great-britain-annual-report-2025"),
       ("DfT — Road safety statistics data tables (RAS0403: casualties by local authority)", "https://www.gov.uk/government/statistical-data-sets/reported-road-accidents-vehicles-and-casualties-tables-for-great-britain"),
       ("DVSA — The Highway Code: rules for pedestrians, cyclists and motorcyclists", "https://www.gov.uk/guidance/the-highway-code")]

import dsq_photos as PH
PHOTO_CSS = ("<style>.rs-split{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:22px;align-items:start}@media (max-width:900px){.rs-split{grid-template-columns:1fr}}</style>")


def pct(a, b): return round(100 * (a - b) / b)


def page():
    f = "solihull-road-accident-statistics.html"
    ca, ksi, kil = D["casualties"]["all"], D["casualties"]["ksi"], D["casualties"]["killed"]
    co, loc, ru, bo = D["collisions"]["all"], D["local"], D["road_users"], D["boroughs"]
    c25, c16, k25, k16 = ca["n"][-1], ca["n"][0], ksi["n"][-1], ksi["n"][0]
    rate25, krate25 = ca["rate"][-1], ksi["rate"][-1]
    rank = sorted(bo, key=lambda k: bo[k]["all_rate"]); krank = sorted(bo, key=lambda k: bo[k]["ksi_rate"])
    lowest = rank[0] == "Solihull" and krank[0] == "Solihull"
    localshare = round(100 * loc["collisions_all"][-1] / co["n"][-1])
    ped, cyc, moto, car = ru["Pedestrian"], ru["Pedal Cyclist"], ru["Motor Cyclist"], ru["Car Occupant"]
    ped_hi = ped["All casualties"][-1] == max(ped["All casualties"]); pedk_hi = ped["KSI (unadjusted)"][-1] == max(ped["KSI (unadjusted)"])
    yl = [str(y) for y in YRS]
    btab = "".join(f'<tr{" style=\"font-weight:700;background:rgba(209,10,17,.06)\"" if k == "Solihull" else ""}><td>{e(k)}</td><td>{bo[k]["all"]:,}</td><td>{bo[k]["all_rate"]:.0f}</td><td>{bo[k]["ksi"]}</td><td>{bo[k]["ksi_rate"]:.1f}</td></tr>' for k in rank)
    utab = "".join(f'<tr><td>{e(u.replace("Veh", "vehicle"))}</td><td>{v["All casualties"][0]}</td><td><b>{v["All casualties"][-1]}</b></td><td>{v["KSI (unadjusted)"][-1]}</td><td>{v["Killed"][-1]}</td></tr>'
                   for u, v in sorted(ru.items(), key=lambda x: -x[1]["All casualties"][-1]))
    lessons = L.cards([
        ("bi-person-walking", f"Pedestrians: {ped['All casualties'][-1]} hurt in 2025",
         ("The most in the ten years shown. " if ped_hi else "") + "We practise scanning pavements, crossings and gaps between parked cars on busy town-centre streets."),
        ("bi-bicycle", f"Cyclists: {cyc['All casualties'][0]} → {cyc['All casualties'][-1]}",
         "Cyclist casualties fell sharply from 2016 to 2025. We still teach the 1.5 m passing gap (Highway Code rule 163) and the hierarchy of road users from your first lesson."),
        ("bi-speedometer2", f"Motorcyclists: {moto['All casualties'][-1]} hurt in 2025",
         "Bikes are easy to miss at junctions. Mirror–signal–manoeuvre and a proper look right at T-junctions and roundabouts are drilled until they're automatic."),
        ("bi-car-front", f"Car occupants: {car['All casualties'][-1]} hurt in 2025",
         f"Still the largest group, though down from {car['All casualties'][0]} in 2016. Safe gaps, speed for the conditions and no phone — the habits that also pass tests."),
    ])
    secs = [
        kpis([(c25, 0, "", "people hurt on Solihull roads in 2025"), (k25, 0, "", "killed or seriously injured (KSI)"), (rate25, 0, "", "casualties per billion vehicle miles"), (localshare, 0, "%", "of collisions on council-run roads")]),
        L.sec("trend", "Ten years of data", f"Casualties are down {abs(pct(c25, c16))}% since 2016 — serious injuries are not",
              f"All reported casualties fell from {c16} (2016) to {c25} (2025). Killed or seriously injured rose from {k16} to {k25}. Part of that rise reflects how police record injury severity (DfT note 1), so compare recent years with care.",
              '<div class="rs-split">' + card("chTrend", '<p class="small text-muted mt-2 mb-0">Red: all casualties · Black: killed or seriously injured. 2020 was the lockdown year.</p>') +
              '<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Year</th><th>Collisions</th><th>Casualties</th><th>KSI</th><th>Killed</th></tr></thead><tbody>' +
              "".join(f'<tr><td>{y}</td><td>{co["n"][i]}</td><td>{ca["n"][i]}</td><td>{ksi["n"][i]}</td><td>{kil["n"][i]}</td></tr>' for i, y in reversed(list(enumerate(YRS)))) + "</tbody></table></div></div>"),
        L.sec("boroughs", "How Solihull compares", ("Solihull is the safest of the seven West Midlands boroughs — per mile driven" if lowest else "Solihull against the other West Midlands boroughs"),
              "Raw numbers favour small places, so DfT also publishes a rate: casualties per billion miles driven by motor vehicles in each area. Lower is safer.",
              card("chBor") + f'<div class="sol-wrap reveal mt-3"><table class="sol-tbl"><thead><tr><th>Borough (2025)</th><th>Casualties</th><th>Per bn vehicle miles</th><th>KSI</th><th>KSI per bn miles</th></tr></thead><tbody>{btab}</tbody></table></div>', alt=True),
        L.sec("users", "Who gets hurt", "Pedestrians up, cyclists down",
              "Casualties on Solihull roads by road user type. Car occupants are the largest group; pedestrian casualties rose to a ten-year high in 2025.",
              '<div class="rs-split">' + card("chUsers") + f'<div class="sol-wrap reveal"><table class="sol-tbl"><thead><tr><th>Road user</th><th>2016</th><th>2025</th><th>KSI 2025</th><th>Killed 2025</th></tr></thead><tbody>{utab}</tbody></table></div></div>' +
              card("chPed", '<p class="small text-muted mt-2 mb-0">Killed or seriously injured each year, by road user.</p>')),
        L.sec("local", "Where it happens", f"{localshare}% of collisions are on everyday local roads",
              f"In 2025, {loc['collisions_all'][-1]} of {co['n'][-1]} reported collisions in Solihull were on roads run by the council — not the M42 or the trunk roads managed by National Highways. That's the 20, 30 and 40 mph roads learners drive every lesson.",
              L.cards([("bi-signpost-split", "Junctions & roundabouts", "Most of our lesson time near Solihull is spent where local-road collisions cluster: junctions, roundabouts and busy town-centre streets."),
                       ("bi-sign-stop", "Speed for the road", "Many Solihull residential roads are 20 or 30 mph. Reading the limit from street lights and signs is a skill we test on every route."),
                       ("bi-sign-merge-right", "Motorway lessons too", 'Learners can now drive on motorways with an ADI in a dual-control car. <a href="m42-junction-5a-a4545-new-road-solihull.html">See the M42 J5A changes</a>.')])),
        L.sec("lessons", "What it means for your lessons", "We teach to the risks in the data",
              "Every point below is built into DriveSQ lessons in Solihull — it's also exactly what examiners look for.", lessons, alt=True),
        L.sec("passes", "Real learners", "Recent DriveSQ passes", "Real DriveSQ learners on the day they passed.", PHOTO_CSS + PH.gallery()),
        L.sec("more", "Keep reading", "More Solihull data and guides", "",
              L.chips([("top-driving-test-faults-solihull.html", "Top test faults near Solihull"), ("winter-driving-solihull.html", "Winter driving in Solihull"),
                       ("solihull-new-drivers-first-year.html", "Your first year after passing"), ("solihull-parents-guide-learner-drivers.html", "Parents' guide"),
                       ("solihull-driving-test-centres-data.html", "Test centre data"), ("solihull-learner-driver-insurance.html", "Learner insurance"),
                       ("driving-lessons-solihull.html", "Driving lessons in Solihull")])),
        L.sec("sources", "Sources", "Where this data comes from",
              "Department for Transport, reported road casualties Great Britain: final results 2025 — table RAS0403 (Open Government Licence v3.0). Only collisions reported to the police are included. Checked November 2026.",
              '<ul style="font-size:.88rem">' + "".join(f'<li><a href="{u}" target="_blank" rel="noopener">{e(t)}</a></li>' for t, u in SRC) + "</ul>", alt=True),
    ]
    faqs = [("How many road accidents were there in Solihull in 2025?", f"{co['n'][-1]} reported road collisions, in which {c25} people were hurt — {k25} killed or seriously injured and {kil['n'][-1]} killed (DfT RAS0403, final 2025 figures)."),
            ("Is Solihull a safe place to learn to drive?", f"By the DfT's per-mile measure, yes: {rate25:.0f} casualties per billion vehicle miles in 2025, the lowest of the seven West Midlands metropolitan boroughs (Birmingham was {bo['Birmingham']['all_rate']:.0f})." if lowest else f"Solihull had {rate25:.0f} casualties per billion vehicle miles in 2025."),
            ("Are Solihull road casualties going up or down?", f"All casualties are down from {c16} in 2016 to {c25} in 2025. Killed-or-seriously-injured casualties went the other way, {k16} to {k25}, partly because of changes in how police record injury severity."),
            ("Which road users are most at risk in Solihull?", f"Car occupants are the largest group ({car['All casualties'][-1]} in 2025). Pedestrian casualties reached {ped['All casualties'][-1]}, the highest in ten years, with {ped['KSI (unadjusted)'][-1]} killed or seriously injured."),
            ("Where do most crashes in Solihull happen?", f"On local roads: {localshare}% of 2025 collisions were on council-managed roads rather than the M42 or other National Highways roads.")]
    data = {"y": yl, "ca": ca["n"], "ksi": ksi["n"], "bo": [{"label": k, "value": bo[k]["all_rate"], "hi": k == "Solihull", "note": f'{bo[k]["all"]:,} casualties'} for k in rank],
            "users": [{"label": u.replace("Veh", "vehicle"), "value": v["All casualties"][-1], "hi": u == "Pedestrian"} for u, v in sorted(ru.items(), key=lambda x: -x[1]["All casualties"][-1]) if v["All casualties"][-1] >= 5],
            "ksiu": {u: ru[u]["KSI (unadjusted)"] for u in ["Pedestrian", "Pedal Cyclist", "Motor Cyclist", "Car Occupant"]}}
    script = """var P=function(a){return D.y.map(function(l,i){return[l,a[i]];});};
DSQCharts.line(document.getElementById('chTrend'),{label:'Solihull road casualties 2016-2025',min:0,series:[{name:'All casualties',color:'#D10A11',pts:P(D.ca)},{name:'Killed or seriously injured',color:'#111',pts:P(D.ksi)}],digits:0});
DSQCharts.bars(document.getElementById('chBor'),D.bo,{digits:0,max:850});
DSQCharts.bars(document.getElementById('chUsers'),D.users,{digits:0});
var C={'Pedestrian':'#D10A11','Pedal Cyclist':'#16a34a','Motor Cyclist':'#d97706','Car Occupant':'#2563eb'};
DSQCharts.line(document.getElementById('chPed'),{label:'KSI by road user',min:0,digits:0,series:Object.keys(D.ksiu).map(function(k){return{name:k,color:C[k],pts:P(D.ksiu[k])};})});"""
    hero = L.hero("Official DfT data · 2016–2025", '<span class="w">Solihull</span> <span class="w w--red">road</span> <span class="w">safety.</span>',
                  "ten years of crash and casualty data — and what it means for learners",
                  [("bi-graph-down", f"{abs(pct(c25, c16))}% fewer casualties"), ("bi-trophy", "Lowest rate in the West Midlands" if lowest else "Borough comparison"), ("bi-shield-check", "Final 2025 figures")],
                  [("red", "#trend", "bi-graph-up", "See the data"), ("ghost", "#book", "bi-calendar-check-fill", "Book lessons")])
    title = "Solihull Road Accident Statistics 2016–2025 (DfT data) | DriveSQ"
    desc = f"Solihull road casualties from official DfT data: {c25} people hurt and {k25} killed or seriously injured in 2025. Ten-year trends, West Midlands comparison and what it means for learner drivers."
    schema = [L.faq_schema(faqs), L.crumbs("Road accident statistics", f),
              {"@context": "https://schema.org", "@type": "Dataset", "name": "Solihull road casualties 2016–2025", "description": desc,
               "creator": {"@type": "GovernmentOrganization", "name": "Department for Transport"}, "license": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
               "isBasedOn": SRC[1][1], "temporalCoverage": "2016/2025", "spatialCoverage": "Metropolitan Borough of Solihull, West Midlands"},
              PH.schema(L.SITE)]
    html = L.page(f, title, desc, "solihull road accidents, solihull road accident statistics, solihull crash statistics, most dangerous roads solihull, solihull road safety, learner driver solihull",
                  schema, hero, secs + [L.faq_html(faqs), L.booking()])
    html = html.replace("</body>", f'<script type="application/json" id="pdata">{json.dumps(data)}</script>\n{CHART}\n<script>(function(){{var D=JSON.parse(document.getElementById("pdata").textContent);{script}}})();</script>\n</body>', 1)
    return f, html


def main():
    out = dict([page()])
    for f, h in out.items(): open(os.path.join(HERE, f), "w", encoding="utf-8").write(h)
    sm = os.path.join(HERE, "sitemap-1.xml"); x = open(sm, encoding="utf-8").read()
    for f in out:
        loc = f"<loc>{L.SITE}/{f}</loc>"
        x = re.sub(re.escape(loc) + r"<lastmod>[^<]*</lastmod>", loc + f"<lastmod>{TODAY}</lastmod>", x) if loc in x else x.replace("</urlset>", f"  <url>{loc}<lastmod>{TODAY}</lastmod></url>\n</urlset>")
    open(sm, "w", encoding="utf-8").write(x)
    print("wrote", ", ".join(out))


if __name__ == "__main__":
    main()
