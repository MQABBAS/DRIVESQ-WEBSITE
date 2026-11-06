#!/usr/bin/env python3
"""Build _data/dvsa_extra.json from DVSA's GOV.UK tables (OGL): DRT112A (theory tests by centre), DRT121F (top 10 faults),
DRT121D (attempts, GB) and DRT122A (monthly pass rates by centre, every year).  Usage: python3 build_dvsa_extra.py <folder of .ods>"""
import json, os, re, sys, zipfile
from xml.etree.ElementTree import iterparse
T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'; O = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
CEN = {'Birmingham (Shirley)': 'shirley', 'Birmingham (Garretts Green)': 'garretts-green', 'Birmingham (South Yardley)': 'south-yardley', 'Birmingham (Kings Heath)': 'kings-heath', 'Coventry': 'coventry', 'Redditch': 'redditch', 'Warwick (Wedgenock House)': 'warwick'}
THC = ['Birmingham', 'Coventry', 'Sutton Coldfield', 'Redditch', 'Stratford', 'Wolverhampton']


def rows(prefix, sheet=None):
    path = [os.path.join(SRC, f) for f in os.listdir(SRC) if f.startswith(prefix)][0]; cur = None
    with zipfile.ZipFile(path).open('content.xml') as f:
        for ev, el in iterparse(f, events=('start', 'end')):
            if ev == 'start' and el.tag == T + 'table': cur = el.get(T + 'name')
            elif ev == 'end' and el.tag == T + 'table-row':
                if sheet is None or cur == sheet:
                    v = []
                    for c in el:
                        if c.tag in (T + 'table-cell', T + 'covered-table-cell'):
                            x = c.get(O + 'value'); x = x if x is not None else ''.join(c.itertext()).strip(); v.extend([x] * min(int(c.get(T + 'number-columns-repeated', '1')), 40))
                    while v and v[-1] == '': v.pop()
                    if v: yield cur, v
                el.clear()


def yr(s): m = re.match(r'^(\d{4})[-/](\d{2})$', (s or '').strip()); return f"{m.group(1)}-{m.group(2)}" if m else None
def f1(x): return round(float(x), 1)


out = {"theory": {}, "faults": {}, "attempts_2526": {}, "months": {}}
for sh, r in rows('drt112a'):
    y = yr(sh)
    if sh == 'Summary' and yr(r[0]) and len(r) >= 12: out["theory"].setdefault("GB", {})[yr(r[0])] = {"p": f1(r[11]), "n": int(float(r[9])), "m": f1(r[3]), "f": f1(r[7])}
    elif y and r[0].endswith('Total') and any(r[0].startswith(w) for w in THC) and len(r) >= 12:
        out["theory"].setdefault(r[0][:-6], {})[y] = {"p": f1(r[11]), "n": int(float(r[9])), "m": f1(r[3]), "f": f1(r[7])}
for sh, r in rows('drt121f'):
    if len(r) >= 3 and r[1].isdigit(): out["faults"].setdefault(r[0], []).append(r[2])
for sh, r in rows('drt121d', 'DRT121D'):
    if len(r) >= 7 and r[0] == '2025 to 2026' and r[1] == 'Total' and r[2] == 'Total':
        out["attempts_2526"][r[3]] = {"n": int(float(r[4])), "pass": int(float(r[5])), "p": f1(r[6])}
cur = None
for sh, r in rows('drt122a'):
    if not yr(sh): continue
    if len([x for x in r if x]) == 1: cur = r[0]; continue
    if cur in CEN and r[0].split(' ')[0] in MON and len(r) >= 12:
        try: out["months"].setdefault(CEN[cur], {})[r[0]] = {"n": int(float(r[9])), "p": f1(r[11])}
        except ValueError: pass
out["source"] = "DVSA via GOV.UK (OGL v3.0): DRT112A, DRT121F, DRT121D, DRT122A."
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_data", "dvsa_extra.json"), "w"), separators=(",", ":"))
print({k: len(v) for k, v in out.items() if isinstance(v, dict)})
