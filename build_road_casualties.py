#!/usr/bin/env python3
"""Build _data/solihull_road_casualties.json from DfT table RAS0403 (reported road casualties by local authority,
10 years to 2025). RAS0403 is published as an .ods on GOV.UK; export its sheets to CSV first (one file per sheet,
named ras0403__<Sheet>.csv) and pass that folder:
    python3 build_road_casualties.py /path/to/csv
Source: https://www.gov.uk/government/statistical-data-sets/reported-road-accidents-vehicles-and-casualties-tables-for-great-britain
(Open Government Licence v3.0)."""
import csv, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
YEARS = list(range(2016, 2026))
METS = ["Birmingham", "Coventry", "Dudley", "Sandwell", "Solihull", "Walsall", "Wolverhampton"]   # West Midlands metropolitan boroughs


def rows(d, sheet):
    with open(os.path.join(d, f"ras0403__{sheet}.csv"), encoding="utf-8") as f:
        return list(csv.reader(f))


def n(v):
    try: return int(float(v))
    except ValueError: return None


def r(v):
    try: return round(float(v), 1)
    except ValueError: return None


def two_tables(d, sheet, la):
    """Count table (cols 5-14) + rate table (cols 22-31) for one local authority, keyed by severity."""
    out = {}
    for x in rows(d, sheet):
        if len(x) > 31 and x[3] == la:
            out[x[4]] = {"n": [n(v) for v in x[5:15]], "rate": [r(v) for v in x[22:32]]}
    return out


def main(d):
    sol = two_tables(d, "Casualties", "Solihull")
    col = two_tables(d, "Collisions", "Solihull")
    loc_c = two_tables(d, "Collisions_local", "Solihull")
    loc_k = two_tables(d, "Casualties_local", "Solihull")
    users = {}
    for x in rows(d, "Road_user_type"):
        if len(x) > 15 and x[3] == "Solihull" and x[5] in ("Killed", "KSI (unadjusted)", "All casualties"):
            users.setdefault(x[4], {})[x[5]] = [n(v) for v in x[6:16]]
    boroughs = {}
    for la in METS:
        t = two_tables(d, "Casualties", la)
        boroughs[la] = {"all": t["All casualties"]["n"][-1], "all_rate": t["All casualties"]["rate"][-1],
                        "ksi": t["KSI (unadjusted)"]["n"][-1], "ksi_rate": t["KSI (unadjusted)"]["rate"][-1], "all_series_rate": t["All casualties"]["rate"]}
    data = {"years": YEARS, "source": "DfT RAS0403, reported road casualties Great Britain: final results 2025 (published 2026)",
            "casualties": {"all": sol["All casualties"], "ksi": sol["KSI (unadjusted)"], "killed": sol["Killed"]},
            "collisions": {"all": col["All collisions"], "fsc": col["FSC (unadjusted)"], "fatal": col["Fatal"]},
            "local": {"collisions_all": loc_c["All collisions"]["n"], "casualties_all": loc_k["All casualties"]["n"], "ksi": loc_k["KSI (unadjusted)"]["n"]},
            "road_users": users, "boroughs": boroughs}
    os.makedirs(os.path.join(HERE, "_data"), exist_ok=True)
    json.dump(data, open(os.path.join(HERE, "_data", "solihull_road_casualties.json"), "w"), indent=1)
    print("Solihull 2025:", data["casualties"]["all"]["n"][-1], "casualties,", data["casualties"]["ksi"]["n"][-1], "KSI;",
          "rate", data["casualties"]["all"]["rate"][-1], "| boroughs:", {k: v["all_rate"] for k, v in boroughs.items()})


if __name__ == "__main__":
    main(sys.argv[1])
