#!/usr/bin/env python3
"""Build _data/solihull_streets.json (postcode -> nearest named roads) from OS Open Roads.
Contains OS data © Crown copyright and database right 2026 (Open Government Licence).
For every Solihull postcode, measures the true distance to each named road link (its real line geometry) and keeps
up to 3 road names within 60 m, nearest first. Road numbers are added in brackets, e.g. "Stratford Road (A34)".
Usage: python3 build_solihull_streets_os.py <path to SP_RoadLink (OS Open Roads shapefile, without extension)>"""
import json, math, os, sys
from collections import defaultdict
import shapefile
from pyproj import Transformer

HERE = os.path.dirname(os.path.abspath(__file__))
PCS = json.load(open(os.path.join(HERE, "_data/solihull_postcodes_full.json"), encoding="utf-8"))
to_bng = Transformer.from_crs("EPSG:4326", "EPSG:27700", always_xy=True)
UNITS = []
for units in PCS.values():
    for pc, lat, lon in units:
        x, y = to_bng.transform(lon, lat); UNITS.append((pc, x, y))
X0, X1 = min(u[1] for u in UNITS) - 500, max(u[1] for u in UNITS) + 500
Y0, Y1 = min(u[2] for u in UNITS) - 500, max(u[2] for u in UNITS) + 500
CELL, MAXD = 100.0, 60.0
grid = defaultdict(list)   # cell -> [(ax, ay, bx, by, label)]
r = shapefile.Reader(sys.argv[1])
fi = {f[0]: i - 1 for i, f in enumerate(r.fields)}
for sr in r.iterShapeRecords():
    rec, pts = sr.record, sr.shape.points
    name = (rec[fi["name1"]] or "").strip()
    if not name or not pts: continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    if max(xs) < X0 or min(xs) > X1 or max(ys) < Y0 or min(ys) > Y1: continue
    num = (rec[fi["roadNumber"]] or "").strip()
    label = f"{name} ({num})" if num and num not in name else name
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        for i in range(int(min(ax, bx) // CELL) - 1, int(max(ax, bx) // CELL) + 2):
            for j in range(int(min(ay, by) // CELL) - 1, int(max(ay, by) // CELL) + 2):
                grid[(i, j)].append((ax, ay, bx, by, label))


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == dy == 0: return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


out = {}
for pc, x, y in UNITS:
    best = {}
    ci, cj = int(x // CELL), int(y // CELL)
    for i in (ci - 1, ci, ci + 1):
        for j in (cj - 1, cj, cj + 1):
            for ax, ay, bx, by, label in grid.get((i, j), ()):
                d = seg_dist(x, y, ax, ay, bx, by)
                if d > MAXD: continue
                base = label.split(" (")[0]
                cur = best.get(base)
                if cur is None or d < cur[0]: best[base] = (d, label if "(" in label or cur is None else cur[1])
                elif "(" in label and "(" not in cur[1]: best[base] = (cur[0], label)
    if best: out[pc] = [lab for _, (d, lab) in sorted(best.items(), key=lambda t: t[1][0])[:3]]
json.dump({"source": "Contains OS data © Crown copyright and database right 2026 (OS Open Roads, Open Government Licence). Roads within 60 m of each postcode's centre, nearest first.", "pc": out},
          open(os.path.join(HERE, "_data/solihull_streets.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print(f"{len(out)} of {len(UNITS)} postcodes have road names; {len({n for v in out.values() for n in v})} distinct roads")
