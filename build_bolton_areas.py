#!/usr/bin/env python3
"""Build _data/bolton_areas.json — inner Bolton neighbourhoods (Bolton Council wards in BL1–BL3) for the area pages.
Inputs (all Ordnance Survey open data, Open Government Licence — Contains OS data © Crown copyright and database right 2026):
  Code-Point Open  bl.csv           every BL postcode with its position and council ward (ward names from Codelist.xlsx)
  OS Open Roads    SD_RoadLink.shp  named road links with their real line geometry
plus _data/dvsa_locations_bolton.json (DVSA test centre locations from GOV.UK's centre finders).
For each ward: postcodes by district/sector, the named roads inside it (and A/B roads with numbers), the nearest road to
every postcode (for the on-page finder), straight-line distances to each test centre and the theory centre, and which of
Bolton Council's bus lanes and proposed box-junction camera sites fall inside it.
Usage: python3 build_bolton_areas.py <Code-Point folder (has Data/CSV/bl.csv and Doc/Codelist.xlsx)> <path to SD_RoadLink without .shp>"""
import csv, json, math, os, re, sys
from collections import Counter, defaultdict
import openpyxl, shapefile
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__))
CP, RL = sys.argv[1], sys.argv[2]
WARDS = ["Queens Park & Central", "Halliwell", "Great Lever", "Rumworth", "Tonge with the Haulgh", "Breightmet", "Astley Bridge",
         "Smithills", "Little Lever & Darcy Lever", "Hulton", "Heaton, Lostock & Chew Moor"]
OUTER = ["Bromley Cross", "Bradshaw", "Horwich North", "Horwich South & Blackrod", "Westhoughton North & Hunger Hill", "Westhoughton South",
         "Farnworth North", "Farnworth South", "Kearsley"]
INNER = list(WARDS); WARDS = WARDS + OUTER
to_ll = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)
to_bng = Transformer.from_crs("EPSG:4326", "EPSG:27700", always_xy=True)
LOC = json.load(open(os.path.join(HERE, "_data", "dvsa_locations_bolton.json")))
LANE_ROADS = {"Newbrook Road": "peak", "St Helens Road": "peak", "Derby Street": "peak", "Deane Road": "peak", "Knowsley Street": "all",
              "St George's Road": "all", "Bridge Street": "all", "Deansgate": "all", "Great Moor Street": "all"}
BOXES = [("Blackburn Road", "Lawson Street"), ("Trinity Street", "Newport Street"), ("Topp Way", "Higher Bridge Street"), ("Bridge Street", "St George's Street"), ("Cricketers Way", "Leigh Road")]
norm = lambda s: re.sub(r"[’'`]", "", s).lower().strip()

# (Deane Road colleges are added below as a point of interest)
# ---- ward names + postcodes
names = {}
for ws in openpyxl.load_workbook(os.path.join(CP, "Doc", "Codelist.xlsx"), read_only=True).worksheets:
    for r in ws.iter_rows(values_only=True):
        if r and len(r) >= 2 and isinstance(r[1], str) and r[1].startswith("E05"): names[r[1]] = str(r[0]).replace(" Ward", "").strip()
units = []   # (pc, x, y, ward)
for r in csv.reader(open(os.path.join(CP, "Data", "CSV", "bl.csv"))):
    if r[8] != "E08000001": continue
    units.append((r[0], float(r[2]), float(r[3]), names.get(r[9], r[9])))
inner = [u for u in units if u[3] in WARDS]
X0, X1 = min(u[1] for u in units) - 800, max(u[1] for u in units) + 800
Y0, Y1 = min(u[2] for u in units) - 800, max(u[2] for u in units) + 800

# ---- roads
CELL = 100.0
grid, links = defaultdict(list), []
r = shapefile.Reader(RL); fi = {f[0]: i - 1 for i, f in enumerate(r.fields)}
for sr in r.iterShapeRecords():
    rec, pts = sr.record, sr.shape.points
    name = (rec[fi["name1"]] or "").strip()
    if not name or not pts: continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    if max(xs) < X0 or min(xs) > X1 or max(ys) < Y0 or min(ys) > Y1: continue
    num = (rec[fi["roadNumber"]] or "").strip(); cls = (rec[fi["roadClassi"]] if "roadClassi" in fi else rec[fi.get("roadClassification", fi.get("class", 0))]) or ""
    links.append((name, num, cls, pts))
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        for i in range(int(min(ax, bx) // CELL) - 1, int(max(ax, bx) // CELL) + 2):
            for j in range(int(min(ay, by) // CELL) - 1, int(max(ay, by) // CELL) + 2):
                grid[(i, j)].append((ax, ay, bx, by, name, num))


def seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def nearest_road(x, y, maxd=80):
    best = {}
    for i in range(int(x // CELL) - 1, int(x // CELL) + 2):
        for j in range(int(y // CELL) - 1, int(y // CELL) + 2):
            for ax, ay, bx, by, nm, num in grid.get((i, j), ()):
                d = seg(x, y, ax, ay, bx, by)
                if d <= maxd and d < best.get(nm, (1e9,))[0]: best[nm] = (d, num)
    return sorted(best.items(), key=lambda kv: kv[1][0])


# ward lookup for any point = ward of the nearest postcode (postcodes are dense in towns)
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


roads_in = defaultdict(lambda: defaultdict(float))   # ward -> road -> metres inside
numbers = {}
for name, num, cls, pts in links:
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        w = ward_at((ax + bx) / 2, (ay + by) / 2)
        if w in WARDS: roads_in[w][name] += math.hypot(bx - ax, by - ay)
    if num and num[0] in "AB" and name not in numbers: numbers[name] = num

# box junctions: closest approach between the two named roads
def box_ward(a, b):
    A = [p for n, _, _, pts in links if norm(n) == norm(a) for p in pts]; B = [p for n, _, _, pts in links if norm(n) == norm(b) for p in pts]
    best = (1e9, None)
    for p in A:
        for q in B:
            d = math.hypot(p[0] - q[0], p[1] - q[1])
            if d < best[0]: best = (d, ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
    return (ward_at(*best[1]), round(best[0])) if best[1] else (None, None)
boxes = {f"{a} / {b}": box_ward(a, b) for a, b in BOXES}
# each bus lane pinned by the cross street named in Bolton Council's list
LANE_PIN = [("Newbrook Road", "Wellington Road"), ("St Helens Road", "Plodder Lane"), ("St Helens Road", "Dean Church Lane"), ("St Helens Road", "Morris Green Lane"),
            ("St Helens Road", "Church Avenue"), ("Derby Street", "University Way"), ("Derby Street", "Gibbon Street"), ("Deane Road", "Gilnow Lane"),
            ("Knowsley Street", "Corporation Street"), ("St George's Road", "Knowsley Street"), ("Bridge Street", "Bow Street"), ("Deansgate", "Crown Street"), ("Great Moor Street", "Mawdsley Street")]
lane_w = {f"{a}|{b}": box_ward(a, b) for a, b in LANE_PIN}
print("lanes", lane_w)

def miles(lat1, lon1, lat2, lon2):
    R = math.pi / 180; x = math.sin((lat2 - lat1) * R / 2); y = math.sin((lon2 - lon1) * R / 2)
    return 2 * 3958.8 * math.asin(math.sqrt(x * x + math.cos(lat1 * R) * math.cos(lat2 * R) * y * y))

out = {"source": "Contains OS data © Crown copyright and database right 2026 (Code-Point Open, OS Open Roads). Test centre locations: DVSA via GOV.UK.", "wards": {}}
for w in WARDS:
    us = [u for u in units if u[3] == w]
    cx, cy = sum(u[1] for u in us) / len(us), sum(u[2] for u in us) / len(us); lon, lat = to_ll.transform(cx, cy)
    dist = Counter(u[0].split()[0] for u in us); secs = Counter(u[0][:-2].strip() for u in us)
    rd = roads_in[w]; named = sorted(k for k, v in rd.items() if v >= 25)
    main = sorted({(k, numbers[k]) for k in named if k in numbers}, key=lambda kv: (kv[1][0], int(re.sub(r"\D", "", kv[1]) or 0)))
    pcs = []
    for pc, x, y, _ in sorted(us):
        nr = nearest_road(x, y)
        pcs.append([pc, nr[0][0] if nr else ""])
    tc = sorted(({"k": k, "mi": round(miles(lat, lon, v["lat"], v["lon"]), 1)} for k, v in LOC["practical"].items()), key=lambda d: d["mi"])
    th = sorted(({"name": t["name"], "mi": round(miles(lat, lon, t["lat"], t["lon"]), 1)} for t in LOC["theory"]), key=lambda d: d["mi"])
    lanes = sorted({k for k, (lw, dd) in lane_w.items() if lw == w and dd is not None and dd < 60 for k in [k.split("|")[0]]})
    out["wards"][w] = {"inner": w in INNER, "postcodes": len(us), "districts": dict(dist.most_common()), "sectors": dict(sorted(secs.items())), "lat": round(lat, 5), "lon": round(lon, 5),
                       "roads": named, "main": main, "longest": [k for k, _ in sorted(rd.items(), key=lambda kv: -kv[1])[:8]],
                       "tc": tc, "theory": th, "lanes": {k: LANE_ROADS[k] for k in lanes}, "boxes": [k for k, (bw, d) in boxes.items() if bw == w and d is not None and d < 40], "pcs": pcs}
# Deane Road (University / Bolton College): distances from postcode BL3 5AB
u = next((x for x in units if x[0] == "BL3 5AB"), None)
if u:
    lon, lat = to_ll.transform(u[1], u[2])
    out["deane_road"] = {"pc": "BL3 5AB", "ward": u[3], "tc": sorted(({"k": k, "mi": round(miles(lat, lon, v["lat"], v["lon"]), 1)} for k, v in LOC["practical"].items()), key=lambda d: d["mi"]),
                         "theory": sorted(({"name": t["name"], "mi": round(miles(lat, lon, t["lat"], t["lon"]), 1)} for t in LOC["theory"]), key=lambda d: d["mi"])}
json.dump(out, open(os.path.join(HERE, "_data", "bolton_areas.json"), "w"), separators=(",", ":"))
for w, d in out["wards"].items():
    print(f"{w:28} pcs={d['postcodes']:4} roads={len(d['roads']):3} main={[m[1] for m in d['main']][:6]} tc={[(t['k'], t['mi']) for t in d['tc'][:3]]} lanes={list(d['lanes'])} boxes={d['boxes']}")
print("boxes", boxes)
