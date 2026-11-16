#!/usr/bin/env python3
"""Builds one outreach email per university/college as ready-made templates in the admin Email tab (Templates -> Universities & colleges)
   and writes data/outreach_targets.md (who to send each to). Facts come from data/institutions.json. Run after changing that file."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INS = json.load(open(os.path.join(ROOT, "data/institutions.json"), encoding="utf-8"))
BASE = "https://www.drivesq.co.uk/"
HOOK = {
 "driving-lessons-near-university-of-manchester.html": "It brings together what the University publishes about its three residential campuses (City, Fallowfield and Victoria Park), how students get around, and the DVSA's official test-centre pass rates for Manchester.",
 "driving-lessons-near-mmu-manchester.html": "It covers the 19 halls in Manchester Met's own hall comparison table, including the journey times the university publishes to the Business School and Brooks Building, and the DVSA's official pass rates for Manchester.",
 "driving-lessons-near-salford-university.html": "It covers Salford's three campuses (Peel Park, Frederick Road and MediaCity), Salford Crescent station, the buses that stop at The Crescent, the free 50 bus and the university's parking guidance.",
 "driving-lessons-university-of-greater-manchester-bolton.html": "It covers the university's new name (formerly the University of Bolton), the Deane Road campus, Orlando Village and the parking guidance on your website.",
 "driving-lessons-the-manchester-college-students.html": "It covers all six campuses across Central, North and East, and South Manchester, and points adult learners to your own adult learners section.",
 "driving-lessons-salford-city-college-students.html": "It covers your provision for ages 16 to 23, adults, higher education and apprenticeships, your student transport network, and your adult open events at FutureSkills at MediaCityUK on 3 December 2026 and 7 January 2027.",
 "driving-lessons-trafford-stockport-college-group-students.html": "It covers Trafford College (Altrincham and Stretford), Stockport College and Cheadle College, and the two DVSA test centres in your area, Sale and Bredbury.",
 "driving-lessons-tameside-college-students.html": "It covers the Beaufort Road campus in Ashton-under-Lyne and your adult provision, including part-time courses, ESOL and advanced learner loans.",
 "driving-lessons-hopwood-hall-college-students.html": "It covers your Middleton and Rochdale campuses, your adult learners section and training for trades, and the DVSA's Rochdale test centre.",
 "driving-lessons-bolton-college-students.html": "It covers the Deane Road campus, the Deane & Derby Community Learning Centre and your adult courses, and the DVSA's Bolton test centre.",
 "driving-lessons-wigan-leigh-college-students.html": "It covers the Parsons Walk campus redevelopment, your adults section and the DVSA's Atherton test centre in the Wigan borough.",
 "driving-lessons-oldham-college-students.html": "It covers Oldham College and University Campus Oldham, including the recent investment in facilities, and your adults study section.",
 "driving-lessons-bury-college-students.html": "It covers your open events for ages 16 to 18, adults and the University Centre, your adults section and the DVSA's Bury test centre."}
ASK_U = "a listing on your offers or discounts page, a mention in a newsletter or at a welcome or freshers' event, a noticeboard flyer with a QR code, or space on your digital screens"
ASK_C = "a mention to adult learners and university-centre students through student services or your newsletter, a leaflet or QR code at an open event, or a noticeboard flyer"
def design(i):
    u = i["level"] == "university"; short = i["short"]; name = i["name"]; url = BASE + i["slug"]
    who = f"{short[0].upper()+short[1:]}" if short.startswith("the ") else short
    body = (f"I am writing from **DriveSQ**, an independent driving school teaching manual and automatic lessons across Greater Manchester. We have 180+ five-star Google reviews, and we pick learners up from home, halls or campus.\n\n"
            f"We have written a page for {'students' if u else 'learners aged 18 and over'} at {short}: [{url.replace('https://','')}]({url}). {HOOK[i['slug']]} Every fact on it was checked against {short}'s own public website, and the sources are listed on the page.\n\n"
            f"**The offer for your {'students' if u else 'learners'}**\n- **10 hours of lessons for £320**, paid in advance, manual or automatic (our standard price is £35 an hour)\n- **Free access to the DriveSQ Student Portal**: 700+ theory test questions, 14 mock tests, hazard perception training and progress tracking\n- Pick-up from halls, home or campus, with lessons arranged around timetables\n\n"
            f"**Would you be willing to share it?** For example: {ASK_U if u else ASK_C}. If you have a standard process, rates or approval steps for partners, please tell us what they are and we will follow them.\n\n"
            f"**How we will behave**\n- We are independent and not affiliated with {name}\n- We will not use your name or logo without your written permission\n- We will not ask you for student contact details. Students book directly with us\n\n"
            f"A short reply is all we need to get started. I can also send a one-page summary or a flyer.")
    return {"name": f"Outreach: {name}", "theme": "clean", "banner": "none",
            "subject": f"A driving lesson offer for {'students' if u else 'learners'} at {short}: could we share it?",
            "preheader": f"DriveSQ has built a page for {'students' if u else 'learners'} at {short} and would like to share a student offer.",
            "headline": f"A driving lesson offer for **{'students' if u else 'learners'} at {short}**", "greeting": f"Hello {name} team,",
            "body": body, "highlightValue": "£320", "highlightLabel": "10 hours of lessons · paid in advance · free Student Portal",
            "buttonText": f"See the {short.replace('the ','')} student page", "buttonUrl": url,
            "secondaryText": "Questions? Just reply to this email or [WhatsApp us](https://wa.me/447352932003).",
            "signoff": "Kind regards,\nThe DriveSQ team", "footerNote": f"You are receiving this because we think a student offer could be useful to {short}. If you would rather not hear from us, use the unsubscribe link below and we will not write again."}
items = []
for k in ("universities", "colleges"):
    for i in INS[k]:
        items.append({"id": "pre-out-" + i["slug"].replace(".html", ""), "name": f"Outreach: {i['name']}", "group": "Universities & colleges", "premade": True, "design": design(i)})
js = "  /* ==== UNI-OUTREACH START (generated by tools/build_outreach_templates.py) ==== */\n  const UNI_OUTREACH = " + json.dumps(items, ensure_ascii=False, indent=1).replace("\n", "\n  ") + ";\n  /* ==== UNI-OUTREACH END ==== */\n"
p = os.path.join(ROOT, "admin.html"); s = open(p, encoding="utf-8").read()
if "UNI-OUTREACH START" in s:
    s = re.sub(r"  /\* ==== UNI-OUTREACH START.*?UNI-OUTREACH END ==== \*/\n", lambda m: js, s, flags=re.S)
else:
    a = "  /* hand-written ready-made emails"; assert s.count(a) == 1; s = s.replace(a, js + a, 1)
    old = "const PREMADE = () => PREMADE_BASE().concat(PREMADE_EXTRA());"; assert old in s
    s = s.replace(old, "const PREMADE = () => PREMADE_BASE().concat(PREMADE_EXTRA(), UNI_OUTREACH);")
    g = 'var GROUPS = ["New enquiries & bookings", "During lessons", "Tests & passing", "Offers & newsletters", "Instructors", "General"];'; assert g in s
    s = s.replace(g, 'var GROUPS = ["New enquiries & bookings", "During lessons", "Tests & passing", "Offers & newsletters", "Instructors", "Universities & colleges", "General"];')
open(p, "w", encoding="utf-8").write(s)
print("templates:", len(items))
