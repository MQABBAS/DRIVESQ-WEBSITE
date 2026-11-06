#!/usr/bin/env python3
"""Build _data/solihull_streets.json (postcode -> road names) from an OpenStreetMap extract.
Road names © OpenStreetMap contributors, ODbL. Each named road's points are matched to the nearest Solihull
postcode (within 120 m) from _data/solihull_postcodes_full.json; OSM addr:postcode tags are used directly too.
Usage: python3 build_solihull_streets.py west-midlands-latest.osm.pbf"""
import json, math, os, sys
from collections import Counter, defaultdict
import osmium

HERE = os.path.dirname(os.path.abspath(__file__))
PCS = json.load(open(os.path.join(HERE, "_data/solihull_postcodes_full.json"), encoding="utf-8"))
UNITS = [(p[0], p[1], p[2]) for v in PCS.values() for p in v]
VALID = {u[0] for u in UNITS}
LAT0, LAT1 = min(u[1] for u in UNITS) - .01, max(u[1] for u in UNITS) + .01
LON0, LON1 = min(u[2] for u in UNITS) - .015, max(u[2] for u in UNITS) + .015
CELL = .004
GRID = defaultdict(list)
for pc, la, lo in UNITS: GRID[(int(la / CELL), int(lo / CELL))].append((pc, la, lo))
ROADS = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "primary_link", "secondary_link", "tertiary_link", "trunk_link", "road"}


def nearest(la, lo, maxm=120):
    best, bd = None, maxm
    ci, cj = int(la / CELL), int(lo / CELL)
    for i in (ci - 1, ci, ci + 1):
        for j in (cj - 1, cj, cj + 1):
            for pc, a, b in GRID.get((i, j), ()):
                d = math.hypot((a - la) * 111320, (b - lo) * 111320 * math.cos(math.radians(la)))
                if d < bd: best, bd = pc, d
    return best


def norm(pc):
    c = pc.upper().replace(" ", "")
    return c[:-3] + " " + c[-3:] if len(c) >= 5 else c


class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.hits = defaultdict(Counter)

    def way(self, w):
        name = w.tags.get("name")
        if not name or w.tags.get("highway") not in ROADS: return
        try: pts = [(n.location.lat, n.location.lon) for n in w.nodes if n.location.valid()]
        except Exception: return
        if not pts or not any(LAT0 < a < LAT1 and LON0 < b < LON1 for a, b in pts): return
        dense = []
        for (a1, b1), (a2, b2) in zip(pts, pts[1:]):
            seg = math.hypot((a2 - a1) * 111320, (b2 - b1) * 68000); k = max(1, int(seg / 40))
            dense += [(a1 + (a2 - a1) * t / k, b1 + (b2 - b1) * t / k) for t in range(k)]
        dense.append(pts[-1])
        for a, b in dense:
            pc = nearest(a, b)
            if pc: self.hits[pc][name] += 1
        pcode = w.tags.get("addr:postcode")
        if pcode and norm(pcode) in VALID: self.hits[norm(pcode)][name] += 5


h = H(); h.apply_file(sys.argv[1], locations=True)
out = {pc: [n for n, _ in c.most_common(4)] for pc, c in h.hits.items()}
json.dump({"source": "© OpenStreetMap contributors (ODbL), matched to nearest postcode", "pc": out}, open(os.path.join(HERE, "_data/solihull_streets.json"), "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print(len(out), "of", len(VALID), "postcodes have road names;", len({n for v in out.values() for n in v}), "roads")
