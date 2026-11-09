#!/usr/bin/env python3
"""Build _data/bolton_extra.json: theory test pass rates (DVSA DRT112A) for Bolton and nearby theory centres, and
reported road casualties (DfT RAS0403) for Bolton and the other nine Greater Manchester boroughs.
Both tables are .ods on GOV.UK; export each sheet to CSV first (drt112a__<sheet>.csv, ras0403__<sheet>.csv) and pass the folder:
    python3 build_bolton_extra.py /path/to/csv
Sources (Open Government Licence v3.0):
  https://www.gov.uk/government/statistical-data-sets/driving-test-and-theory-test-data-cars
  https://www.gov.uk/government/statistical-data-sets/reported-road-accidents-vehicles-and-casualties-tables-for-great-britain"""
import csv, glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
THEORY = ["Bolton", "Manchester", "Stockport", "Preston"]
BOROUGHS = ["Bolton", "Bury", "Manchester", "Oldham", "Rochdale", "Salford", "Stockport", "Tameside", "Trafford", "Wigan"]


def rows(path):
    with open(path, encoding="utf-8") as f: return list(csv.reader(f))


def fl(v):
    try: return float(v)
    except (TypeError, ValueError): return None


def theory(d):
    out = {c: {"years": {}, "months": []} for c in THEORY}; gb = {}
    for r in rows(os.path.join(d, "drt112a__Summary.csv")):
        m = re.match(r"^(\d{4})/(\d{2})$", r[0] if r else "")
        if m and len(r) >= 12: gb[f"{m.group(1)}-{m.group(2)}"] = {"n": int(fl(r[9])), "p": round(fl(r[11]), 1), "m": round(fl(r[3]), 1), "f": round(fl(r[7]), 1)}
    for path in sorted(glob.glob(os.path.join(d, "drt112a__20*.csv"))):
        y = re.search(r"(\d{4}-\d{2})", path).group(1); cur = None
        for r in rows(path):
            if len(r) == 1 or (r and all(v == "" for v in r[1:])): cur = r[0] if r else None; continue
            if r and r[0].endswith(" Total") and r[0][:-6] in out and len(r) >= 12 and fl(r[9]):
                out[r[0][:-6]]["years"][y] = {"n": int(fl(r[9])), "p": round(fl(r[11]), 1), "m": round(fl(r[3]), 1) if fl(r[3]) else None, "f": round(fl(r[7]), 1) if fl(r[7]) else None}
            elif cur in out and y == "2025-26" and r and re.match(r"^[A-Z][a-z]{2} \d{4}$", r[0]) and len(r) >= 12:
                out[cur]["months"].append({"mo": r[0], "n": int(fl(r[9])), "p": round(fl(r[11]), 1), "m": round(fl(r[3]), 1), "f": round(fl(r[7]), 1)})
    return {"centres": out, "gb": gb}


def two(d, sheet, la):
    o = {}
    for x in rows(os.path.join(d, f"ras0403__{sheet}.csv")):
        if len(x) > 31 and x[3] == la:
            o[x[4]] = {"n": [int(fl(v)) if fl(v) is not None else None for v in x[5:15]], "rate": [round(fl(v), 1) if fl(v) is not None else None for v in x[22:32]]}
    return o


def roads(d):
    out = {}
    for la in BOROUGHS:
        c, k = two(d, "Casualties", la), two(d, "Collisions", la)
        users = {}
        for x in rows(os.path.join(d, "ras0403__Road_user_type.csv")):
            if len(x) > 15 and x[3] == la and x[5] in ("Killed", "KSI (unadjusted)", "All casualties"):
                users.setdefault(x[4], {})[x[5]] = [int(fl(v)) if fl(v) is not None else None for v in x[6:16]]
        loc = two(d, "Collisions_local", la)
        out[la] = {"cas": c["All casualties"], "ksi": c["KSI (unadjusted)"], "killed": c["Killed"], "col": k["All collisions"],
                   "local_col": loc["All collisions"]["n"] if loc else None, "users": users}
    return {"years": list(range(2016, 2026)), "boroughs": out}


if __name__ == "__main__":
    d = sys.argv[1]
    data = {"theory": theory(d), "roads": roads(d),
            "source": "DVSA DRT112A (theory tests by centre, to March 2026); DfT RAS0403 (reported road casualties by local authority, final 2025)."}
    json.dump(data, open(os.path.join(HERE, "_data", "bolton_extra.json"), "w"), separators=(",", ":"))
    t = data["theory"]["centres"]["Bolton"]; r = data["roads"]["boroughs"]
    print("Bolton theory years", sorted(t["years"])[:2], "...", t["years"].get("2025-26"), "months", len(t["months"]))
    print({k: (v["cas"]["n"][-1], v["cas"]["rate"][-1], v["ksi"]["n"][-1]) for k, v in r.items()})
