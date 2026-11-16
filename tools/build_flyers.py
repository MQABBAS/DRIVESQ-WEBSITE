#!/usr/bin/env python3
"""One-page A4 flyers (PDF) for the student offer: one general + one per university/college, each with a QR code to that page.
   The QR links carry ?utm_source=flyer so bookings show 'Campaign: flyer' as their source in admin.
   Run: python3 tools/build_flyers.py   (needs the 'qrcode' package and Playwright)"""
import json, os, io, base64, html, re, zipfile
import qrcode
import subprocess, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.drivesq.co.uk/"
INS = json.load(open(os.path.join(ROOT, "data/institutions.json"), encoding="utf-8"))
LOGO = "data:image/png;base64," + base64.b64encode(open(os.path.join(ROOT, "email/logo-240.png"), "rb").read()).decode()
def qr_uri(url):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=3); q.add_data(url); q.make(fit=True)
    b = io.BytesIO(); q.make_image(fill_color="#111111", back_color="white").save(b, format="PNG"); return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()
CSS = """@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{width:210mm;height:297mm;font-family:Inter,Arial,sans-serif;color:#1a1214;background:#fff;position:relative;overflow:hidden}
.top{background:#0b0204;color:#fff;height:34mm;padding:0 14mm;display:flex;align-items:center;gap:6mm}.top img{width:20mm;height:20mm;border-radius:50%;background:#fff}.top .n{font-weight:900;font-size:25pt;letter-spacing:-.5px}.top .n span{color:#ff2d35}.top .t{margin-left:auto;text-align:right;font-size:9.5pt;color:#f5c518;font-weight:800;letter-spacing:.14em;text-transform:uppercase;line-height:1.5}
.hero{padding:11mm 14mm 4mm}.hero .k{font-size:10pt;font-weight:800;letter-spacing:.16em;color:#D10A11;text-transform:uppercase}.hero h1{font-size:35pt;line-height:1.02;margin:3mm 0 3mm;font-weight:900;letter-spacing:-.8px;text-transform:uppercase}.hero p{font-size:13pt;margin:0;line-height:1.45;max-width:165mm}
.offer{margin:4mm 14mm;border-radius:6mm;background:linear-gradient(135deg,#D10A11,#8d0409);color:#fff;padding:7mm 9mm;display:flex;align-items:center;gap:8mm}.offer .big{font-size:50pt;font-weight:900;line-height:1;letter-spacing:-1.5px}.offer .big small{font-size:15pt;font-weight:800;display:block;letter-spacing:.04em;margin-bottom:1mm}.offer .txt{font-size:12.5pt;line-height:1.45}.offer .txt b{font-size:15pt}
.cards{display:flex;gap:5mm;margin:5mm 14mm 0}.card{flex:1;border:1.4px solid #e4dcd6;border-radius:4mm;padding:5mm 5mm 4mm}.card b{display:block;font-size:11.5pt;margin-bottom:1.5mm}.card span{font-size:10pt;line-height:1.45;color:#3a3032}
.row{display:flex;gap:8mm;margin:6mm 14mm 0;align-items:center}.steps{flex:1}.steps h3{margin:0 0 3mm;font-size:12pt;text-transform:uppercase;letter-spacing:.1em;color:#D10A11}.step{display:flex;gap:3.5mm;align-items:flex-start;margin-bottom:3mm;font-size:11.5pt;line-height:1.4}.step i{font-style:normal;flex:none;width:7.5mm;height:7.5mm;border-radius:50%;background:#111;color:#fff;font-weight:800;font-size:10.5pt;display:flex;align-items:center;justify-content:center}
.qr{width:66mm;text-align:center;border:2px solid #111;border-radius:5mm;padding:4mm 4mm 3mm}.qr img{width:54mm;height:54mm}.qr b{display:block;font-size:12.5pt;margin-top:1.5mm}.qr span{display:block;font-size:8.2pt;color:#555;word-break:break-all;margin-top:1mm}
.foot{position:absolute;left:0;right:0;bottom:0;background:#0b0204;color:#fff;padding:5.5mm 14mm 6mm}.foot .c{display:flex;gap:6mm;align-items:center;font-size:12pt;font-weight:800}.foot .c span{color:#f5c518}.foot .c em{margin-left:auto;font-style:normal;color:#f5c518;font-size:10.5pt}.foot p{margin:3mm 0 0;font-size:7.6pt;line-height:1.45;color:#bdb4b4}"""
def flyer(kicker, headline, sub, url_path, qr_label, disclaimer):
    full = BASE + url_path; link = full + "?utm_source=flyer&utm_medium=print"
    show = full.replace("https://", "")
    return f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="top"><img src="{LOGO}"><div class="n">Drive<span>SQ</span></div><div class="t">Driving school<br>Greater Manchester</div></div>
<div class="hero"><div class="k">{html.escape(kicker)}</div><h1>{headline}</h1><p>{sub}</p></div>
<div class="offer"><div class="big"><small>10 HOURS FOR</small>£320</div><div class="txt"><b>Student offer, paid in advance.</b><br>Manual or automatic, with friendly local instructors. After your block, lessons are from £35 an hour.</div></div>
<div class="cards"><div class="card"><b>Pick-up near you</b><span>From your halls, home or campus, with lessons arranged around your timetable.</span></div><div class="card"><b>Free Student Portal</b><span>700+ theory questions, 14 mock tests, hazard perception training and progress tracking.</span></div><div class="card"><b>Trusted locally</b><span>180+ five-star Google reviews. Manual and automatic cost the same.</span></div></div>
<div class="row"><div class="steps"><h3>How to book</h3><div class="step"><i>1</i><div><b>Scan the code</b> or visit the page below.</div></div><div class="step"><i>2</i><div><b>Answer a few quick questions</b> about your course, lessons and pick-up postcode.</div></div><div class="step"><i>3</i><div><b>We match you</b> with an instructor near you and confirm by email.</div></div></div>
<div class="qr"><img src="{qr_uri(link)}"><b>{html.escape(qr_label)}</b><span>{html.escape(show)}</span></div></div>
<div class="foot"><div class="c"><span>WhatsApp</span> 07352 932003 <em>drivesq.co.uk</em></div><p>{disclaimer} Offer: 10 hours of lessons for £320, paid in advance. Lessons are otherwise from £35 an hour, manual or automatic. A valid provisional driving licence is needed for lessons.</p></div></body></html>'''
jobs = [("DriveSQ-student-offer-all-manchester.html", flyer("Universities and colleges across Greater Manchester", "Learn to drive<br>while you study", "Lessons that fit around your timetable, from your halls, home or campus.", "student-driving-lessons-manchester-universities.html", "Scan to book", "DriveSQ is an independent driving school and is not affiliated with or endorsed by any university or college."))]
for k in ("universities", "colleges"):
    for i in INS[k]:
        short = i["short"]; who = f"students at {short}" if k == "universities" else f"learners aged 18 and over at {short}"
        jobs.append((f"DriveSQ-student-offer-{i['slug'].replace('.html','')}.html", flyer(f"For {who}", "Learn to drive<br>while you study", f"Lessons that fit around your timetable at {html.escape(short)}, from your halls, home or campus.", i["slug"], "Scan to book", f"DriveSQ is an independent driving school and is not affiliated with or endorsed by {html.escape(i['name'])}.")))
out = os.path.join(ROOT, "flyers"); os.makedirs(out, exist_ok=True)
tmp = tempfile.mkdtemp(prefix="flyers_"); pdfs = []
for name, h in jobs: open(os.path.join(tmp, name), "w", encoding="utf-8").write(h)
js = """const {chromium}=require('playwright');const fs=require('fs');const path=require('path');(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const f of fs.readdirSync(process.argv[2]).filter(x=>x.endsWith('.html'))){await p.goto('file://'+path.join(process.argv[2],f));await p.waitForTimeout(150);
await p.pdf({path:path.join(process.argv[3],f.replace('.html','.pdf')),format:'A4',printBackground:true,preferCSSPageSize:true});}
await p.setViewportSize({width:794,height:1123});await p.goto('file://'+path.join(process.argv[2],process.argv[4]));await p.screenshot({path:'/tmp/claude-0/flyer_sample.png'});await b.close();})();"""
open(os.path.join(tmp, "r.js"), "w").write(js)
subprocess.run(["node", os.path.join(tmp, "r.js"), tmp, out, jobs[1][0]], check=True, cwd="/tmp/claude-0")
pdfs = [os.path.join(out, n.replace(".html", ".pdf")) for n, _ in jobs]
z = os.path.join(out, "DriveSQ-student-offer-flyers-all.zip")
with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in pdfs: zf.write(f, os.path.basename(f))
print("flyers:", len(pdfs), "| zip:", os.path.getsize(z) // 1024, "KB")
