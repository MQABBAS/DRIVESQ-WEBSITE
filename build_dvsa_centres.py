#!/usr/bin/env python3
"""Build _data/dvsa_centres.json from DVSA's official tables (GOV.UK, Open Government Licence):
DRT122A (pass rates), DRT122B (cancellations), DRT122C (first attempts), DRT122D (by age), DRT122E (automatic), DRT122F (waiting times).
Usage: python3 build_dvsa_centres.py <folder with the .ods files> [sol|gm]
  sol (default) -> _data/dvsa_centres.json     (the 7 centres Solihull learners use)
  gm            -> _data/dvsa_centres_gm.json  (Bolton and the Greater Manchester / Lancashire centres around it)"""
import json, os, re, sys, zipfile
from xml.etree.ElementTree import iterparse
T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'; O = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'
CEN = {'Birmingham (Shirley)': 'shirley', 'Birmingham (Garretts Green)': 'garretts-green', 'Birmingham (South Yardley)': 'south-yardley',
       'Birmingham (Kings Heath)': 'kings-heath', 'Coventry': 'coventry', 'Redditch': 'redditch', 'Warwick (Wedgenock House)': 'warwick'}
GM = {'Bolton (Manchester)': 'bolton', 'Atherton (Manchester)': 'atherton', 'Bury (Manchester)': 'bury', 'Chorley': 'chorley', 'Blackburn with Darwen': 'blackburn',
      'Cheetham Hill (Manchester)': 'cheetham-hill', 'Rochdale (Manchester)': 'rochdale', 'West Didsbury (Manchester)': 'west-didsbury', 'Sale (Manchester)': 'sale', 'Bredbury (Manchester)': 'bredbury'}
SET = sys.argv[2] if len(sys.argv) > 2 else 'sol'
if SET == 'gm': CEN = GM
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'


def sheets(name):
    path = [os.path.join(SRC, f) for f in os.listdir(SRC) if f.startswith(name)][0]
    out, cur, rows = {}, None, []
    with zipfile.ZipFile(path).open('content.xml') as f:
        for ev, el in iterparse(f, events=('start', 'end')):
            if ev == 'start' and el.tag == T + 'table': cur, rows = el.get(T + 'name'), []
            elif ev == 'end' and el.tag == T + 'table-row':
                vals = []
                for c in el:
                    if c.tag in (T + 'table-cell', T + 'covered-table-cell'):
                        v = c.get(O + 'value'); v = v if v is not None else ''.join(c.itertext()).strip()
                        vals.extend([v] * min(int(c.get(T + 'number-columns-repeated', '1')), 40))
                while vals and vals[-1] == '': vals.pop()
                if vals: rows.append(vals)
                el.clear()
            elif ev == 'end' and el.tag == T + 'table': out[cur] = rows; el.clear()
    return out


def num(v):
    try: return round(float(v), 1)
    except (TypeError, ValueError): return None


def inum(v):
    try: return int(float(v))
    except (TypeError, ValueError): return None


def yr(s): m = re.match(r'^(\d{4})[-/](\d{2})$', s.strip()); return f"{m.group(1)}-{m.group(2)}" if m else None


D = {s: {"name": n, "years": {}, "months": [], "first": {}, "auto": {}, "cancel": {}, "age": [], "waits": []} for n, s in CEN.items()}
NAT = {"years": {}, "first": {}, "auto": {}, "cancel": {}}

# A: yearly totals + 2025-26 months
for sh, rows in sheets('drt122a').items():
    y = yr(sh)
    if sh == 'Summary':
        for r in rows:
            k = yr(r[0])
            if k and len(r) >= 12: NAT["years"][k] = {"m": num(r[3]), "f": num(r[7]), "n": inum(r[9]), "p": num(r[11])}
        continue
    if not y: continue
    cur = None
    for r in rows:
        ne = [v for v in r if v != '']
        if len(ne) == 1: cur = r[0]; continue
        if r[0] in CEN and len(r) >= 12:
            D[CEN[r[0]]]["years"][y] = {"m": num(r[3]), "f": num(r[7]), "mn": inum(r[1]), "fn": inum(r[5]), "n": inum(r[9]), "pass": inum(r[10]), "p": num(r[11])}
        elif cur in CEN and y == '2025-26' and r[0].split(' ')[0] in MONTHS and len(r) >= 12:
            D[CEN[cur]]["months"].append({"mo": r[0], "n": inum(r[9]), "p": num(r[11])})
# C: first attempts
for sh, rows in sheets('drt122c').items():
    y = yr(sh)
    if not y: continue
    for r in rows:
        if len(r) >= 15 and (r[0] in CEN or r[0] == 'National Totals'):
            rec = {"n": inum(r[11]), "p": num(r[13]), "zero": inum(r[14])}
            (NAT["first"] if r[0] == 'National Totals' else D[CEN[r[0]]]["first"])[y] = rec
# E: automatic
for sh, rows in sheets('drt122e').items():
    y = yr(sh)
    if not y: continue
    for r in rows:
        if len(r) >= 12 and (r[0] in CEN or r[0] == 'National'):
            rec = {"n": inum(r[9]), "p": num(r[11])}
            (NAT["auto"] if r[0] == 'National' else D[CEN[r[0]]]["auto"])[y] = rec
# B: cancellations (latest year only)
for sh, rows in sheets('drt122b').items():
    if yr(sh) != '2025-26': continue
    for r in rows:
        if len(r) >= 7 and (r[0] in CEN or r[0] == 'National'):
            rec = {"leave": inum(r[1]), "weather": inum(r[3]), "medical": inum(r[4]), "total": inum(r[6])}
            if r[0] == 'National': NAT["cancel"] = rec
            else: D[CEN[r[0]]]["cancel"] = rec
# D: by age (latest year)
for sh, rows in sheets('drt122d').items():
    if yr(sh) != '2025-26': continue
    cur = None
    for r in rows:
        ne = [v for v in r if v != '']
        if len(ne) == 1: cur = r[0]; continue
        if cur in CEN and len(r) >= 11 and r[0] == '' and r[1].isdigit() and r[1] != '16' and num(r[10]) is not None:
            D[CEN[cur]]["age"].append({"age": r[1], "n": inum(r[8]), "p": num(r[10])})
# F: waiting times
for sh, rows in sheets('drt122f').items():
    for r in rows:
        if len(r) >= 15 and r[2] in CEN:
            D[CEN[r[2]]]["waits"].append({"mo": r[3], "wk10": num(r[5]), "med": num(r[6]), "in7": num(r[7]), "avail": inum(r[11]), "booked": inum(r[12])})
out = {"source": "DVSA via GOV.UK: car driving test data by test centre (DRT122A-E, data to March 2026) and DRT122F waiting times (to August 2026). Open Government Licence v3.0.",
       "built": "2026-11-08", "national": NAT, "centres": D}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_data", "dvsa_centres_gm.json" if SET == "gm" else "dvsa_centres.json"), "w"), separators=(",", ":"))
for s, c in D.items():
    y = c["years"].get("2025-26", {}); w = c["waits"][-1] if c["waits"] else {}
    print(f"{s:15} 25-26 {y.get('p')}% n={y.get('n')} m={y.get('m')} f={y.get('f')} | years={len(c['years'])} months={len(c['months'])} sum={sum(m['n'] or 0 for m in c['months'])} | first={c['first'].get('2025-26')} auto={c['auto'].get('2025-26')} | cancel={c['cancel']} | ages={len(c['age'])} | wait {w.get('mo')} med={w.get('med')} wk10={w.get('wk10')}")
print("GB", NAT["years"].get("2025-26"), NAT["first"].get("2025-26"), NAT["auto"].get("2025-26"), NAT["cancel"])
