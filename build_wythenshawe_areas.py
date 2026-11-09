#!/usr/bin/env python3
"""Build _data/wythenshawe_areas.json — Wythenshawe (M22 and its M23 neighbours) by Manchester City Council ward.
Inputs (Ordnance Survey open data, Open Government Licence — Contains OS data © Crown copyright and database right 2026):
  Code-Point Open  m.csv            every M postcode with position and ward (names from Codelist.xlsx)
  OS Open Roads    SJ_RoadLink.shp  named and numbered road links
plus _data/dvsa_locations_wythenshawe.json (DVSA centre locations from GOV.UK's finders; TfGM tram stop postcodes).
Per ward: postcodes by sector, named roads, A/B/M road numbers, nearest road for every postcode, straight-line distance
to each test centre and theory centre, and the Metrolink stops inside the ward.
Usage: python3 build_wythenshawe_areas.py <Code-Point folder> <path to SJ_RoadLink without .shp>"""
import csv, json, math, os, re, sys
from collections import Counter, defaultdict
import openpyxl, shapefile
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__))
CP, RL = sys.argv[1], sys.argv[2]
WARDS = ["Sharston", "Woodhouse Park", "Northenden", "Baguley", "Brooklands"]   # Wythenshawe; the first three make up M22
to_ll = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)
LOC = json.load(open(os.path.join(HERE, "_data", "dvsa_locations_wythenshawe.json")))

names = {}
for ws in openpyxl.load_workbook(os.path.join(CP, "Doc", "Codelist.xlsx"), read_only=True).worksheets:
    for r in ws.iter_rows(values_only=True):
        if r and len(r) >= 2 and isinstance(r[1], str) and r[1].startswith("E05"): names[r[1]] = str(r[0]).replace(" Ward", "").strip()
units, allpc = [], {}
for r in csv.reader(open(os.path.join(CP, "Data", "CSV", "m.csv"))):
    allpc[r[0]] = (float(r[2]), float(r[3]))
    if r[8] != "E08000003": continue
    units.append((r[0], float(r[2]), float(r[3]), names.get(r[9], r[9])))
X0, X1 = min(u[1] for u in units if u[3] in WARDS) - 1500, max(u[1] for u in units if u[3] in WARDS) + 1500
Y0, Y1 = min(u[2] for u in units if u[3] in WARDS) - 1500, max(u[2] for u in units if u[3] in WARDS) + 1500

CELL = 100.0
grid, links = defaultdict(list), []
r = shapefile.Reader(RL, encodingErrors="replace"); fi = {f[0]: i - 1 for i, f in enumerate(r.fields)}
for sr in r.iterShapeRecords():
    rec, pts = sr.record, sr.shape.points
    if not pts: continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    if max(xs) < X0 or min(xs) > X1 or max(ys) < Y0 or min(ys) > Y1: continue
    name = (rec[fi["name1"]] or "").strip(); num = (rec[fi["roadNumber"]] or "").strip()
    links.append((name, num, pts))
    if not name: continue
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        for i in range(int(min(ax, bx) // CELL) - 1, int(max(ax, bx) // CELL) + 2):
            for j in range(int(min(ay, by) // CELL) - 1, int(max(ay, by) // CELL) + 2):
                grid[(i, j)].append((ax, ay, bx, by, name))


def seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def nearest_road(x, y, maxd=80):
    best = (maxd + 1, "")
    for i in range(int(x // CELL) - 1, int(x // CELL) + 2):
        for j in range(int(y // CELL) - 1, int(y // CELL) + 2):
            for ax, ay, bx, by, nm in grid.get((i, j), ()):
                d = seg(x, y, ax, ay, bx, by)
                if d < best[0]: best = (d, nm)
    return best[1]


pgrid = defaultdict(list)
for u in units: pgrid[(int(u[1] // 250), int(u[2] // 250))].append(u)
def ward_at(x, y):
    best = (1e9, None)
    for i in range(int(x // 250) - 2, int(x // 250) + 3):
        for j in range(int(y // 250) - 2, int(y // 250) + 3):
            for u in pgrid.get((i, j), ()):
                d = math.hypot(u[1] - x, u[2] - y)
                if d < best[0]: best = (d, u[3])
    return best[1] if best[0] < 300 else None


roads_in = defaultdict(lambda: defaultdict(float)); nums_in = defaultdict(set); numbers = {}
for name, num, pts in links:
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        w = ward_at((ax + bx) / 2, (ay + by) / 2)
        if w not in WARDS: continue
        if name: roads_in[w][name] += math.hypot(bx - ax, by - ay)
        if num: nums_in[w].add(num)
    if name and num and num[0] in "AB" and name not in numbers: numbers[name] = num


def miles(lat1, lon1, lat2, lon2):
    R = math.pi / 180; x = math.sin((lat2 - lat1) * R / 2); y = math.sin((lon2 - lon1) * R / 2)
    return 2 * 3958.8 * math.asin(math.sqrt(x * x + math.cos(lat1 * R) * math.cos(lat2 * R) * y * y))


trams = []
for slug, pc in LOC["trams"]:
    if pc in allpc:
        x, y = allpc[pc]; lon, lat = to_ll.transform(x, y)
        trams.append({"stop": slug.replace("-", " ").title().replace("Centre", "Centre"), "pc": pc, "ward": ward_at(x, y), "lat": round(lat, 5), "lon": round(lon, 5)})
out = {"source": "Contains OS data © Crown copyright and database right 2026 (Code-Point Open, OS Open Roads). Test centres: DVSA via GOV.UK. Tram stops: TfGM.", "trams": trams, "wards": {}}
for w in WARDS:
    us = [u for u in units if u[3] == w]
    cx, cy = sum(u[1] for u in us) / len(us), sum(u[2] for u in us) / len(us); lon, lat = to_ll.transform(cx, cy)
    rd = roads_in[w]; named = sorted(k for k, v in rd.items() if v >= 25)
    main = []
    for k in sorted((k for k in named if k in numbers), key=lambda k: (numbers[k][0], int(re.sub(r"\D", "", numbers[k]) or 0))):
        main.append([k, numbers[k]])
    out["wards"][w] = {"m22": any(u[0].startswith("M22 ") for u in us) and sum(u[0].startswith("M22 ") for u in us) > len(us) / 2,
                       "postcodes": len(us), "districts": dict(Counter(u[0].split()[0] for u in us).most_common()), "sectors": dict(sorted(Counter(u[0][:-2].strip() for u in us).items())),
                       "lat": round(lat, 5), "lon": round(lon, 5), "roads": named, "main": main,
                       "motorways": sorted(n for n in nums_in[w] if n.startswith("M")), "aroads": sorted(n for n in nums_in[w] if n[0] in "AB"),
                       "tc": sorted(({"k": k, "mi": round(miles(lat, lon, v["lat"], v["lon"]), 1)} for k, v in LOC["practical"].items()), key=lambda d: d["mi"]),
                       "theory": sorted(({"name": t["name"], "mi": round(miles(lat, lon, t["lat"], t["lon"]), 1)} for t in LOC["theory"]), key=lambda d: d["mi"]),
                       "trams": [t["stop"] for t in trams if t["ward"] == w],
                       "pcs": [[u[0], nearest_road(u[1], u[2])] for u in sorted(us)]}
json.dump(out, open(os.path.join(HERE, "_data", "wythenshawe_areas.json"), "w"), separators=(",", ":"))
for w, d in out["wards"].items():
    print(f"{w:15} m22={d['m22']} pcs={d['postcodes']} dist={d['districts']} roads={len(d['roads'])} M={d['motorways']} tc={[(t['k'], t['mi']) for t in d['tc'][:3]]} th={[(t['name'], t['mi']) for t in d['theory']]} trams={d['trams']}")
print([(t["stop"], t["ward"]) for t in trams])
