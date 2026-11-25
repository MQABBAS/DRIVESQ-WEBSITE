#!/usr/bin/env python3
"""Builds the ADI Part 3 training cluster (6 linked pages) in the same layout as the other DriveSQ guide pages.
   Every rule, number and fee below comes from the official GOV.UK pages (checked 25 Nov 2026):
     https://www.gov.uk/adi-part-3-test  (+ /what-happens-during-test, /test-result, /what-to-take)
     https://www.gov.uk/trainee-driving-instructor-licence-the-rules  (+ /options-when-you-apply-for-a-trainee-licence)
     https://www.gov.uk/approved-driving-instructor-adi-fees
   Nothing about DriveSQ's own course (price, hours, pass rate) is stated: the pages say "message us". Add those yourself if you want them.
   Run: python3 tools/seo_adi_part3_pages.py   (writes the pages and adds them to sitemap-1.xml)"""
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.drivesq.co.uk/"
TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
CHECKED = "25 November 2026"
# reuse the exact stylesheet of the other guide pages
_src = open(os.path.join(ROOT, "tools/seo_dvsa_pages.py"), encoding="utf-8").read()
CSS = re.search(r'CSS = """(.*?)"""', _src, re.S).group(1)
G = "https://www.gov.uk/"
GOV_P3 = G + "adi-part-3-test"
WA = "https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27d%20like%20details%20about%20ADI%20Part%203%20training"

def table(head, rows):
    return '<div class="tbl"><table><thead><tr>' + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div>"

CLUSTER = [
    ("/adi-part-3-training-manchester.html", "ADI Part 3 training in Manchester"),
    ("/adi-part-3-test-what-happens-minute-by-minute.html", "What happens on the ADI Part 3 test, minute by minute"),
    ("/adi-part-3-marking-grades-17-competencies-explained.html", "How the ADI Part 3 is marked: 17 competencies, 51 marks, grades A and B"),
    ("/adi-part-3-fail-retake-third-attempt-rules.html", "Failed ADI Part 3? Retakes, the third-attempt rule and what to do next"),
    ("/trainee-driving-instructor-licence-pink-badge-explained.html", "The trainee driving instructor licence (pink badge) explained"),
    ("/adi-part-3-lesson-planning-client-centred-learning-guide.html", "Planning a client-centred lesson for your ADI Part 3"),
    ("/adi-part-3-test-centres-manchester-pass-rates.html", "ADI Part 3 pass rates at every Manchester test centre"),
    ("/adi-part-3-pass-rate-great-britain-trend.html", "ADI Part 3 pass rates across Great Britain: the trend since 2018"),
    ("/adi-part-3-training-booking.html", "Book your ADI Part 3 training"),
    ("/adi-part-3-score-calculator.html", "ADI Part 3 score calculator: score your practice lesson"),
    ("/adi-part-3-deadline-calculator.html", "ADI Part 3 deadline calculator"),
    ("/adi-part-3-cost-calculator.html", "ADI Part 3 cost calculator: from Part 1 to your badge"),
    ("/adi-part-3-report-form-explained.html", "The DVSA ADI Part 3 report form, box by box"),
    ("/adi-part-3-pupil-and-lesson-theme-guide.html", "Choosing your pupil and lesson theme for the ADI Part 3"),
    ("/adi-part-3-test-day-checklist.html", "ADI Part 3 test-day checklist (printable)"),
]
MORE = [("/become-driving-instructor-manchester.html", "Become a driving instructor in Manchester"), ("/driving-instructor-jobs-manchester.html", "Driving instructor jobs in Manchester"), ("/adi-vs-pdi-driving-instructor-solihull.html", "ADI vs PDI: what is the difference?")]

def page(slug, title, desc, h1, body, faq, about):
    url = BASE + slug
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article", "headline": h1, "description": desc, "datePublished": TODAY, "dateModified": TODAY, "inLanguage": "en-GB", "mainEntityOfPage": url,
         "author": {"@id": BASE + "#school"}, "publisher": {"@id": BASE + "#school"}, "about": about, "citation": GOV_P3},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE}, {"@type": "ListItem", "position": 2, "name": "Become a driving instructor", "item": BASE + "become-driving-instructor-manchester.html"}, {"@type": "ListItem", "position": 3, "name": h1, "item": url}]}]}
    faqh = "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in CLUSTER if u != "/" + slug) + "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in MORE)
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/become-driving-instructor-manchester.html">Become an instructor</a><a href="/areas.html">Areas</a><a href="/#book-60">Book</a></nav></div></header>
<main class="wrap"><h1>{html.escape(h1)}</h1><div class="meta">Rules and fees checked on GOV.UK on {CHECKED} · Updated {TODAY_H}</div>
{body}
<h2>Questions people ask</h2>{faqh}
<h2>Talk to DriveSQ about ADI Part 3 training</h2><p>DriveSQ is a Greater Manchester driving school that trains instructors for the ADI Part 3. Message us on WhatsApp to ask about the course, dates, price and how a training session works.</p>
<a class="cta" href="/adi-part-3-training-booking.html?from={slug}">Book ADI Part 3 training</a><a class="cta alt" href="{WA}" rel="nofollow noopener">WhatsApp 07352 932003</a>
<h2>More for trainee instructors</h2><ul>{rel}</ul>
<p class="src"><strong>Source and method.</strong> Rules, fees and test details are taken from the official GOV.UK pages on the <a href="{GOV_P3}" rel="noopener">ADI part 3 test</a>, <a href="{G}trainee-driving-instructor-licence-the-rules" rel="noopener">trainee driving instructor licence</a> and <a href="{G}approved-driving-instructor-adi-fees" rel="noopener">ADI fees</a>, checked on {CHECKED}. The rules for Northern Ireland are different. Rules and fees can change, so always check GOV.UK before you book or pay. Worked examples, timelines and arithmetic on this page are DriveSQ's own illustrations, not DVSA figures. This is general information, not legal advice.</p></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/areas.html">Areas</a></footer>
<script src="/dsq-analytics.js" defer></script></body></html>'''

pages = {}

# ============ 1. PILLAR ============
b1 = f'''<p class="lead">The ADI Part 3 is the last of the three tests you pass to become an Approved Driving Instructor, and for most people it is the hardest. It is not a driving test. A DVSA examiner watches you teach a real pupil for about 45 minutes and scores how well you plan, manage risk and teach. DriveSQ trains instructors for exactly this test in Greater Manchester.</p>
<div class="note"><b>In one line:</b> you can book Part 3 once you have passed Part 2; it costs £111; you get a maximum of three attempts; and you score 31 or more out of 51 to pass.</div>
<p><a class="cta" href="/adi-part-3-training-booking.html?from=adi-part-3-training-manchester">Book ADI Part 3 training</a></p>
<h2>Free ADI Part 3 tools</h2>
<ul><li><a href="/adi-part-3-score-calculator.html"><b>Score calculator</b></a>: score a practice lesson on the 17 official areas and see your grade.</li><li><a href="/adi-part-3-deadline-calculator.html"><b>Deadline calculator</b></a>: your 2-year Part 1 window, licence expiry and badge deadline.</li><li><a href="/adi-part-3-cost-calculator.html"><b>Cost calculator</b></a>: the official fees from Part 1 to your badge, plus retakes.</li><li><a href="/adi-part-3-report-form-explained.html"><b>The report form, box by box</b></a> and the <a href="/adi-part-3-test-day-checklist.html"><b>test-day checklist</b></a>.</li></ul>
<h2>What the ADI Part 3 actually tests</h2>
<p>Parts 1 and 2 test what you know and how you drive. Part 3 tests something different: whether you can help <em>someone else</em> learn. The examiner sits in the back and scores 17 areas of competence, each from 0 to 3, grouped into three categories:</p>
<ul><li><b>Lesson planning</b>: finding out what the pupil needs and agreeing a sensible plan.</li><li><b>Risk management</b>: keeping the lesson safe and making sure the pupil understands who is responsible for what.</li><li><b>Teaching and learning strategies</b>: how you explain, question, give feedback and adapt as the lesson goes.</li></ul>
<p>We explain the scoring in detail in <a href="/adi-part-3-marking-grades-17-competencies-explained.html">how the ADI Part 3 is marked</a>.</p>
<h2>Who can book it, and when</h2>
{table(["Requirement", "What GOV.UK says"], [["Before booking", "You must have passed your ADI Part 2 test"], ["Test fee", "£111"], ["Attempts", "A third failed attempt means you must stop giving paid lessons and retake Parts 1 and 2"], ["Next attempt after a fail", "Must be booked within 2 years of passing your ADI Part 1"], ["After you pass", "Apply for your first ADI badge within 12 months, or pass all three tests again"]])}
<p>Most trainees hold a <a href="/trainee-driving-instructor-licence-pink-badge-explained.html">trainee driving instructor licence</a> (the pink badge) while they prepare, so that they can teach paying pupils under the rules and gain real practice before the test.</p>
<h2>How the road to your badge fits together</h2>
<ol><li><b>Pass Part 1</b> (theory and hazard perception). It is valid for two years for your Part 3 attempts.</li><li><b>Pass Part 2</b> (your own advanced driving).</li><li><b>Get a trainee licence</b> if you want to teach before qualifying: £140, lasts six months, needs at least 40 hours of training from a qualified ADI.</li><li><b>Prepare for Part 3</b> with training, practice lessons and feedback.</li><li><b>Take Part 3</b> and, on a pass, apply for your first ADI badge.</li></ol>
<h2>What the official fees add up to</h2>
<p>If you pass every stage at the first attempt, the DVSA's own fees come to <b>£743</b>. That excludes training, books and revision materials, and the cost of a suitable car.</p>
{table(["Stage", "DVSA fee"], [["ADI Part 1", "£81"], ["ADI Part 2", "£111"], ["Trainee licence (if you take one)", "£140"], ["ADI Part 3", "£111"], ["First ADI badge", "£300"], ["<b>Total at first attempts</b>", "<b>£743</b>"]])}
<p>Each retake costs the full fee again. A failed Part 3 attempt adds £111, so a plan that gets you ready before you book is the cheapest plan.</p>
<h2>How DriveSQ helps you prepare</h2>
<p>Good Part 3 preparation looks much the same wherever you do it: you teach real pupils, someone who knows the marking sheet watches, and you get specific feedback you can act on before the next lesson. DriveSQ trains instructors for the Part 3. Message us to ask how our sessions are run. Whatever route you choose, the preparation should cover:</p>
<ul><li>Planning a lesson with the pupil's goals in mind (see <a href="/adi-part-3-lesson-planning-client-centred-learning-guide.html">our lesson-planning guide</a>)</li><li>Managing risk and agreeing responsibility with the pupil</li><li>Explaining, questioning and giving feedback in a way a learner can use</li><li>Knowing exactly what happens in the test room (see <a href="/adi-part-3-test-what-happens-minute-by-minute.html">the test, minute by minute</a>)</li></ul>
<p>Message us for current dates and the price. DriveSQ works across Greater Manchester and in Solihull.</p>
<h2>ADI Part 3 test centres in Manchester</h2>
<p>Eight DVSA centres in the Manchester area publish ADI Part 3 results: Atherton, Bolton, Bredbury, Bury, Cheetham Hill, Rochdale, Sale and West Didsbury. In 2025/26 their pass rates ranged from 14.9% to 30.9%, against 27.8% for Great Britain. See <a href="/adi-part-3-test-centres-manchester-pass-rates.html">the pass rate at every Manchester centre</a>, or the <a href="/adi-part-3-pass-rate-great-britain-trend.html">national trend since 2018</a>. Small numbers make single-centre figures jumpy, so use them to set expectations, not to pick a centre.</p>
<h2>Are you ready? A quick check</h2>
<ul><li>You can plan a 45-minute lesson for a pupil you have just met, in about three minutes, in your head.</li><li>You can name the risk in a lesson before it happens and say who is responsible for what.</li><li>Your pupil does most of the talking about what they are finding hard. You are not lecturing.</li><li>You adjust the lesson when it is not working, instead of carrying on with your plan.</li><li>A watcher who knows the marking has seen you score comfortably above the pass mark more than once.</li></ul>
<p>If you tick fewer than three of these, book more preparation first. A fail means a gap, a fee and a wait.</p>'''
f1 = [("What is the ADI Part 3 test?", "It is the last of the three tests to qualify as an Approved Driving Instructor. A DVSA examiner observes you giving a lesson of about 45 minutes to a pupil you bring, and marks 17 areas of competence."),
      ("How much does the ADI Part 3 cost?", "The DVSA test fee is £111, checked on GOV.UK on 25 November 2026. If you fail and retake, you pay the full fee again. Training with DriveSQ is separate: message us for the current price."),
      ("How many times can I take the ADI Part 3?", "You can retake after a first or second fail, but if you fail a third time you must stop giving paid lessons straight away and retake and pass Parts 1 and 2 before trying again."),
      ("What score do I need to pass the ADI Part 3?", "Out of 51 marks, 31 to 42 is Grade B, 43 to 51 is Grade A, and 0 to 30 is a fail. A score of 7 or less in the risk management category is also a fail."),
      ("Does DriveSQ offer ADI Part 3 training in Manchester?", "Yes. Message us on WhatsApp on 07352 932003 for dates, how sessions work and the price.")]
pages["adi-part-3-training-manchester.html"] = page("adi-part-3-training-manchester.html", "ADI Part 3 Training in Manchester | DriveSQ",
    "ADI Part 3 training in Manchester from DriveSQ: what the test marks, the £111 fee, the attempt rules and how to know you are ready. Checked against GOV.UK.", "ADI Part 3 training in Manchester", b1, f1, {"@type": "Thing", "name": "ADI Part 3 instructional ability test"})

# ============ 2. THE TEST MINUTE BY MINUTE ============
b2 = f'''<p class="lead">The ADI Part 3 lasts about 45 minutes and you are in control of most of it. Knowing what happens, and when, removes a lot of the fear. This is the test as GOV.UK describes it, laid out as a clock.</p>
<h2>The 45 minutes at a glance</h2>
{table(["Time", "What happens", "Rule from GOV.UK"], [["0:00 to 3:00", "You and the pupil agree goals and discuss how risk will be managed", "No more than 3 minutes"], ["3:00 to about 43:00", "The pupil drives while you teach", "The pupil drives for about 40 minutes"], ["Any time", "You may stop safely to give feedback", "Allowed"], ["Last minutes", "You give the pupil time to reflect on their own performance", "No more than 3 minutes"]])}
<h2>What you bring</h2>
<ul><li><b>A pupil.</b> A partly trained learner, a fully trained learner or a full licence holder. A partly trained learner should be able to drive for 40 minutes without frequently stopping.</li><li><b>A suitable car.</b> GOV.UK has separate car rules.</li><li><b>Your trainee licence.</b> If you do not have one, bring your UK driving licence or passport.</li></ul>
<div class="note"><b>Who cannot be your pupil:</b> an ADI, or anyone who is preparing for the ADI Part 3 test. If you bring the wrong things, the test can be cancelled and you do not get a refund.</div>
<h2>The first three minutes matter most</h2>
<p>The opening discussion is short but sets up the whole lesson. In about three minutes you need to find out what the pupil wants to work on, agree a sensible plan for the lesson, and make sure they understand how responsibility for risk is shared between you. Trainees who rush this, or run it like a lecture, usually spend the next forty minutes teaching the wrong thing.</p>
<p>A useful way to think about it: you are not delivering a lesson you prepared at home. You are having a short conversation, and then you build a plan out of what the pupil says. See our <a href="/adi-part-3-lesson-planning-client-centred-learning-guide.html">lesson-planning guide</a> for how to do that.</p>
<h2>The 40-minute drive</h2>
<p>The pupil drives and you teach. The examiner is looking for evidence that you meet the national standard for driver and rider training. Two rules are worth knowing in advance:</p>
<ul><li>You cannot spend the whole lesson teaching a manoeuvre. A short recap of a manoeuvre the pupil has met before is fine.</li><li>If you need to give feedback, you may stop safely. Stopping is not a fault. Doing it badly or dangerously is.</li></ul>
<h2>The last three minutes</h2>
<p>You give the pupil no more than three minutes to reflect on how it went. This is a coaching moment: the best versions ask the pupil what they did well and what they would change, before the instructor says a word.</p>
<h2>What happens afterwards</h2>
<p>The examiner fills in the Part 3 report form and you receive your grade and the completed report by email at the end of the test. Read the report carefully, because each of the 17 areas is scored and the report tells you where marks were lost. Our <a href="/adi-part-3-marking-grades-17-competencies-explained.html">marking guide</a> shows how those scores add up.</p>
<h2>A practical countdown for test week</h2>
<ul><li><b>A week before:</b> do two complete 45-minute lessons with a pupil who is not part of your normal practice, with someone watching.</li><li><b>The day before:</b> check the car, your trainee licence (or licence and passport) and your pupil's availability and phone number.</li><li><b>On the day:</b> arrive early, meet your pupil, and keep the opening conversation unhurried. You have three minutes. Use them well.</li></ul>'''
f2 = [("How long is the ADI Part 3 test?", "About 45 minutes. It begins with a discussion of goals and risk management of no more than 3 minutes, the pupil drives for about 40 minutes, and you give the pupil no more than 3 minutes to reflect at the end."),
      ("Who can I bring as a pupil for the ADI Part 3?", "A partly trained learner, a fully trained learner or a full licence holder. They cannot be an ADI or someone preparing for the ADI Part 3 test."),
      ("Can I stop the car during the Part 3 to give feedback?", "Yes. You may stop safely during the lesson to give immediate feedback."),
      ("When do I get my ADI Part 3 result?", "You receive your grade and the completed report by email at the end of the test."),
      ("What happens if I forget my trainee licence?", "If you do not have a trainee licence, bring your UK driving licence or passport. If you bring the wrong things, the test can be cancelled with no refund.")]
pages["adi-part-3-test-what-happens-minute-by-minute.html"] = page("adi-part-3-test-what-happens-minute-by-minute.html", "ADI Part 3 Test: What Happens, Minute by Minute | DriveSQ",
    "The ADI Part 3 as a clock: 3 minutes of goals and risk, 40 of teaching, 3 of reflection. What to bring, who can be your pupil and when you get your result.", "What happens on the ADI Part 3 test, minute by minute", b2, f2, {"@type": "Thing", "name": "ADI Part 3 test day"})

# ============ 3. MARKING ============
b3 = f'''<p class="lead">The ADI Part 3 has 17 areas of competence. The examiner scores each one from 0 to 3, so the most you can score is 51. Your total decides whether you fail, get a Grade B or get a Grade A. The numbers are simple once you see them laid out.</p>
<h2>The pass marks</h2>
{table(["Total score", "Result", "What it means"], [["0 to 30", "Fail", "You will not join the ADI register"], ["31 to 42", "Grade B", "You are allowed to join the ADI register"], ["43 to 51", "Grade A", "A high standard of instruction; you are allowed to join the register"]])}
<p>There are two ways to fail regardless of your total score: scoring <b>7 or less in the risk management category</b>, or the examiner stopping the lesson because you have put yourself or someone else in danger.</p>
<h2>What the numbers mean in practice</h2>
<p>These are our own calculations from the official figures, useful for planning rather than official DVSA advice:</p>
{table(["If you average…", "Total over 17 areas", "Result"], [["1 mark per area", "17", "Fail"], ["Just under 2 marks per area (about 1.8)", "31", "Grade B, just"], ["2 marks per area", "34", "Grade B"], ["2.5 marks per area (about)", "43", "Grade A, just"], ["3 marks per area", "51", "Maximum"]])}
<p>Put simply, you need to average a little under 2 out of 3 in every area to pass, and a little over 2.5 out of 3 for a Grade A. A single area at zero is recoverable. A weak category is the real danger, especially risk management.</p>
<h2>The three categories</h2>
<p>The 17 areas fall into three categories. GOV.UK lists them as lesson planning, risk management, and teaching and learning strategies, and the examiner records them on the Part 3 report form.</p>
{table(["Category", "Areas of competence", "Most you can score"], [["Lesson planning", "4", "12"], ["Risk management", "5", "15"], ["Teaching and learning strategies", "8", "24"], ["<b>Total</b>", "<b>17</b>", "<b>51</b>"]])}
<p>The counts come from the DVSA's own ADI Part 3 report form (version dated September 2022). Check the current form on GOV.UK before you rely on the detail, because DVSA can update it.</p>
<ul><li><b>Lesson planning (4 areas)</b> covers whether you worked out the pupil's goals and needs, agreed a lesson structure that suited their experience, chose suitable practice areas and adapted the plan to help them reach their goals.</li><li><b>Risk management (5 areas)</b> carries the automatic-fail rule. It covers making sure the pupil understood how responsibility for risk would be shared, giving clear and timely directions, awareness of the surroundings and the pupil's actions, timely and appropriate intervention, and enough feedback after any safety-critical incident.</li><li><b>Teaching and learning strategies (8 areas)</b> is the largest group. It covers a teaching style that suits the pupil, encouraging them to analyse problems and take responsibility, using examples to clarify outcomes, accurate technical information, timely feedback, following up their questions, a non-discriminatory manner, and encouraging the pupil to reflect at the end.</li></ul>
<h2>What each score from 0 to 3 means</h2>
<p>On the DVSA form each competence is scored by how much of it you demonstrated:</p>
{table(["Score", "Meaning on the form"], [["0", "No evidence"], ["1", "Demonstrated in a few elements"], ["2", "Demonstrated in most elements"], ["3", "Demonstrated in all elements"]])}
<h2>The risk management rule, with numbers</h2>
<p>Risk management has five areas, so the most you can score there is 15. The automatic-fail rule says 7 or less fails, so you need at least 8 out of 15 in that category: an average of a little over 1.5 per area. This is our own arithmetic from the official rule. It means a lesson that is good elsewhere can still fail if one or two risk management areas score 0 or 1.</p>
<div class="note"><b>The risk management trap:</b> a trainee can teach a lovely, thoughtful lesson and still fail because the opening conversation about responsibility was thin, directions came late, or the examiner had to step in. Check your risk management total separately in every practice lesson.</div>
<h2>How to use this to prepare</h2>
<ol><li>Ask whoever watches your practice lessons to score you on all 17 areas, not just give you a general impression.</li><li>Add up the three categories separately. If risk management is at 7 or below out of 15, fix that before anything else.</li><li>Look for the pattern across several lessons. One low score is noise. The same low score three times is a gap.</li><li>Only book when your practice totals sit comfortably above 31, not on it.</li></ol>
<h2>Why a low risk-management score hurts so much</h2>
<p>Examiners treat safety as the floor under everything else. A lesson can have good questioning and a clear structure, but if the examiner is not satisfied that risk was managed, the test cannot be passed. Treat the opening conversation about responsibility, and your awareness of the road and the pupil during the drive, as the first priority in your preparation.</p>
<p>You can read how the test runs from start to finish in <a href="/adi-part-3-test-what-happens-minute-by-minute.html">our minute-by-minute guide</a>.</p>'''
f3 = [("How many marks are there in the ADI Part 3?", "There are 17 areas of competence, each scored 0 to 3, so the maximum is 51."),
      ("What is a pass mark on the ADI Part 3?", "31 to 42 is a Grade B pass, 43 to 51 is a Grade A pass, and 0 to 30 is a fail."),
      ("Can I fail the ADI Part 3 even with a high score?", "Yes. A score of 7 or less in the risk management category is an automatic fail, and so is the examiner stopping the lesson because you have put yourself or someone else in danger."),
      ("What are the three categories?", "Lesson planning, risk management, and teaching and learning strategies."),
      ("Does it matter if I get a Grade A or a Grade B?", "Both allow you to join the ADI register. Grade A is recorded as a high standard of instruction.")]
pages["adi-part-3-marking-grades-17-competencies-explained.html"] = page("adi-part-3-marking-grades-17-competencies-explained.html", "ADI Part 3 Marking: 17 Competencies, 51 Marks | DriveSQ",
    "ADI Part 3 marking explained: 17 areas scored 0 to 3, 51 in total. Grade B 31 to 42, Grade A 43 to 51, fail 0 to 30, plus the risk management rule.", "How the ADI Part 3 is marked: 17 competencies, 51 marks, grades A and B", b3, f3, {"@type": "Thing", "name": "ADI Part 3 marking and grades"})

# ============ 4. FAIL / RETAKE ============
b4 = f'''<p class="lead">Failing the ADI Part 3 is common and it is not the end. But the rules about retakes are strict, and the third fail has serious consequences. Here is exactly what GOV.UK says, and how to plan so you never get near the third attempt.</p>
<h2>What happens after each result</h2>
{table(["Result", "What happens next"], [["Pass", "Apply for your first ADI badge within 12 months of passing, or you must pass all three qualifying tests again"], ["First fail", "You can retake. Book your next attempt within 2 years of passing your ADI Part 1"], ["Second fail", "You can retake, under the same 2-year limit"], ["Third fail", "You must stop giving paid lessons immediately"]])}
<h2>The third fail</h2>
<p>If you fail the Part 3 for the third time, all of these apply:</p>
<ul><li>You must stop giving paid-for lessons immediately, and it is illegal to give paid-for lessons after that.</li><li>Your trainee licence becomes invalid.</li><li>You must retake and pass Part 1 and Part 2 again.</li><li>You must wait 2 years from your original Part 1 pass before you can retake Part 1.</li></ul>
<div class="note"><b>The takeaway:</b> every attempt is precious. A third fail costs you at least two years, and that is why the right time to book is when you are consistently above the pass mark, not when you hope to scrape through.</div>
<h2>Extra training after a fail</h2>
<p>If you chose the extra-training option on your trainee licence (rather than the supervision option), you must do 5 hours of extra training before you retake the Part 3. See the <a href="/trainee-driving-instructor-licence-pink-badge-explained.html">trainee licence guide</a> for the two options.</p>
<h2>A way to plan your attempts</h2>
<p>This is our own planning approach, not a DVSA rule. Treat each attempt as a project:</p>
<ol><li><b>Read the report line by line.</b> Each of the 17 areas is scored. Highlight everything scored 0 or 1.</li><li><b>Group the low scores by category.</b> If most are in one category, that is where your next training goes.</li><li><b>Set an evidence target.</b> For example, three practice lessons in a row, scored by someone watching, with a total comfortably over 31 and risk management well above 7.</li><li><b>Keep the 2-year clock in view.</b> Write down the date two years after your Part 1 pass, and work backwards.</li><li><b>Only then book.</b> Booking early to "have a go" uses up an attempt.</li></ol>
<h2>Money matters</h2>
<p>Each attempt costs £111 in test fees, plus the cost of the extra training or practice you need, and the time you cannot earn from paid lessons if your licence is affected. A retake is never just £111. This is the strongest argument for being ready before you book.</p>
<h2>If you think the result was wrong</h2>
<p>The result cannot be changed, but GOV.UK describes two routes: you can make a complaint to the DVSA, and you can appeal to a court within 6 months in England and Wales (21 days in Scotland). The DVSA may offer a refund or a free retest in some cases. If you are considering this, read the official page and act within the time limits.</p>
<h2>What to do this week if you have just failed</h2>
<ul><li>Take a breath. Most people who qualify do not pass first time.</li><li>Get the report and write the 17 scores down in a table.</li><li>Find your lowest category and book targeted training for it.</li><li>Message us if you would like to ask about training for your weakest category.</li></ul>'''
f4 = [("How many times can I fail the ADI Part 3?", "You can retake after a first or second fail. After a third fail you must stop giving paid lessons straight away, and retake and pass Parts 1 and 2."),
      ("What happens if I fail Part 3 three times?", "Your trainee licence becomes invalid, it is illegal to give paid-for lessons, you must retake and pass Parts 1 and 2, and you must wait 2 years from your original Part 1 pass before retaking Part 1."),
      ("How long do I have to retake the ADI Part 3?", "You must book your next attempt within 2 years of passing your ADI Part 1."),
      ("Do I need extra training after failing?", "If you chose the extra-training option on your trainee licence, you must do 5 hours of extra training before you retake."),
      ("Can I appeal an ADI Part 3 result?", "The result cannot be changed, but you can complain to the DVSA and you can appeal to a court within 6 months in England and Wales or 21 days in Scotland.")]
pages["adi-part-3-fail-retake-third-attempt-rules.html"] = page("adi-part-3-fail-retake-third-attempt-rules.html", "Failed ADI Part 3? Retake and Third-Attempt Rules | DriveSQ",
    "What happens if you fail the ADI Part 3: retakes, the 2-year limit, the third-fail rule, extra training and appeals, with a plan for your next attempt.", "Failed ADI Part 3? Retakes, the third-attempt rule and what to do next", b4, f4, {"@type": "Thing", "name": "ADI Part 3 retakes and fail rules"})

# ============ 5. TRAINEE LICENCE ============
b5 = f'''<p class="lead">A trainee driving instructor licence, often called the pink badge, lets you give paid lessons while you work towards the ADI Part 3. It lasts six months and comes with conditions. Here is how it works.</p>
<h2>Who can get one</h2>
<p>GOV.UK says you can apply once you have passed your ADI Part 2 test, and you must meet all of these:</p>
<ul><li>You passed ADI Part 1 in the last 2 years.</li><li>You passed ADI Part 2.</li><li>You have had at least 40 hours of training from a qualified ADI, with at least 10 of those hours in a car. This is recorded on form ADI 21T.</li><li>You are eligible to take the ADI Part 3.</li></ul>
<h2>Cost and length</h2>
{table(["Item", "Detail"], [["Fee", "£140"], ["Length", "6 months"], ["Where you teach", "Under the rules of your chosen option, with a sponsoring ADI or a training programme"]])}
<h2>The two options you must choose between</h2>
<p>When you apply, you choose one of two options. GOV.UK says you cannot change your mind afterwards, so read both carefully.</p>
{table(["", "Option 1: supervision", "Option 2: extra training"], [["What you do", "Your sponsoring ADI supervises you for 20% of all the lessons you give", "You do at least 20 hours of extra training"], ["When", "Throughout the licence", "Within 3 months of getting the licence, and before you book the Part 3 test"], ["Mix of training", "Not applicable", "At least 25% of it practical, in the car"], ["Records", "Keep a record of your hours and a supervision record (ADI 21S) signed by you and the ADI", "Record it on the instructor training declaration form and send it to the DVSA when done"], ["If you fail Part 3", "Normal retake rules", "5 hours of extra training before you retake"]])}
<div class="note"><b>Which one is right?</b> There is no universal answer. Supervision suits people who have a sponsoring ADI who can sit in on lessons regularly. Extra training suits people who want a structured block before the test. Ask us if you want to talk it through.</div>
<h2>Moving schools</h2>
<p>GOV.UK says you must apply for a new trainee licence if you leave one driving school and join another, so think before you move mid-licence.</p>
<h2>When the licence runs out</h2>
<p>A trainee licence lasts six months, so you want your Part 3 date planned inside that window. If you are not ready, do not book early just to beat the date. Read our guide on <a href="/adi-part-3-fail-retake-third-attempt-rules.html">retakes and the third-attempt rule</a>, because the rules there decide how much room you have.</p>
<h2>A sample six-month plan</h2>
<p>This is our own illustration, not a DVSA schedule:</p>
{table(["Month", "Focus"], [["1", "Settle in with your sponsor or training programme; teach a small number of pupils; get watched early"], ["2", "Practise opening conversations: goals and risk agreed in about three minutes"], ["3", "Score yourself on all 17 areas after every lesson; find your weakest category"], ["4", "Targeted training for that category; two full 45-minute practice lessons observed"], ["5", "Book your Part 3 only if your observed scores are comfortably above the pass mark"], ["6", "Take the test; if you need a retake, check the 2-year Part 1 clock and your licence"]])}
<h2>DriveSQ and trainee instructors</h2>
<p>Our lessons are delivered by DVSA-approved instructors (ADIs) and trainee instructors with a pink-badge licence (PDIs). Message us if you want to ask about Part 3 training.</p>'''
f5 = [("How much is a trainee driving instructor licence?", "£140, checked on GOV.UK on 25 November 2026."),
      ("How long does a trainee licence last?", "6 months."),
      ("Who can apply for a trainee driving instructor licence?", "You must have passed ADI Part 2 and passed ADI Part 1 in the last 2 years. You also need at least 40 hours of training from a qualified ADI, with at least 10 hours in a car, and be eligible to take the Part 3."),
      ("What are the two options on a trainee licence?", "Option 1 is supervision by your sponsoring ADI for 20% of all lessons. Option 2 is at least 20 hours of extra training, completed within 3 months of getting the licence and before you book the Part 3. You cannot change option once you have chosen."),
      ("What if I move to another driving school?", "You must apply for a new trainee licence if you leave a driving school and join a new one.")]
pages["trainee-driving-instructor-licence-pink-badge-explained.html"] = page("trainee-driving-instructor-licence-pink-badge-explained.html", "Trainee Driving Instructor Licence (Pink Badge) | DriveSQ",
    "Trainee driving instructor licence rules: £140, six months, 40 hours of training and the two options (20% supervision or 20 hours of extra training).", "The trainee driving instructor licence (pink badge) explained", b5, f5, {"@type": "Thing", "name": "Trainee driving instructor licence"})

# ============ 6. LESSON PLANNING ============
b6 = f'''<p class="lead">The ADI Part 3 rewards a lesson built around the pupil, not a lesson you prepared in advance. This guide shows how to turn a three-minute opening conversation into a plan, and how to keep adjusting it. It is teaching advice from DriveSQ, not an official DVSA script.</p>
<h2>What "client-centred" really means</h2>
<p>In a client-centred lesson, the pupil decides what the lesson is for, and you shape the lesson around it. The pupil takes responsibility for their own learning, and you guide, question and support. The test is looking for evidence of this in the way you plan and teach. It is the opposite of arriving with a fixed route and set of topics and delivering them whatever the pupil says.</p>
<h2>The three-minute opening, step by step</h2>
<p>GOV.UK allows no more than three minutes for the goals and risk discussion, so a clear shape helps:</p>
<ol><li><b>Find out where they are (about 1 minute).</b> "What have you been working on recently?" "What feels most comfortable? What doesn't?"</li><li><b>Agree the goal (about 1 minute).</b> "What would you like to get out of today?" Then shape the plan: "So we'll look at X, and use Y to practise it. Does that sound right?"</li><li><b>Agree who is responsible for what (about 1 minute).</b> Explain simply that the pupil is driving and you are teaching, that you have the dual controls, and how you will tell them if something needs to stop. Check they understand, in their own words.</li></ol>
<p>Keep the language natural. If it sounds like a script, you have rehearsed too much.</p>
<h2>Three pupils, three plans</h2>
<p>The pupil you bring can be a partly trained learner, a fully trained learner or a full licence holder. The same three-minute opening produces very different lessons:</p>
{table(["Pupil", "A likely goal", "How you might teach it"], [["Partly trained learner", "Smoother junctions, or moving off and stopping on a hill", "Short, focused practice runs; clear demonstration; plenty of questions so they explain the sequence back to you"], ["Fully trained learner", "Test-standard independent driving", "Let them navigate; ask about their decisions after, not during; give them a task and step back"], ["Full licence holder", "Confidence in a specific situation, such as a dual carriageway or parking", "Ask what worries them; set a small challenge; ask them to rate their own performance, then compare"]])}
<h2>Questions that help the pupil think</h2>
<p>Closed questions ("Was that okay?") get a yes. Open questions get thought. Compare:</p>
<ul><li>Instead of "Was that a good observation?", ask "What did you notice before you moved out?"</li><li>Instead of "Do you understand?", ask "How would you explain what you just did?"</li><li>Instead of telling them the fault, ask "What would you do differently next time?"</li></ul>
<h2>Adjusting the plan mid-lesson</h2>
<p>A plan is a starting point. If the pupil finds the first task too easy, step it up. If they struggle, drop back, break the skill into parts and try again. Examiners look for evidence that you noticed and responded. Carrying on with an unsuitable plan is a bigger problem than changing it.</p>
<h2>Giving feedback they can use</h2>
<ul><li>Keep it specific: "You checked your mirror and signalled in good time, then moved a little late" is better than "good".</li><li>Ask for their view first.</li><li>Give one thing to keep and one thing to change.</li><li>Link it back to the goal you agreed.</li></ul>
<h2>The closing three minutes</h2>
<p>GOV.UK allows no more than three minutes for the pupil to reflect at the end. A strong close asks the pupil what went well and what they would work on next, checks it against the goal you agreed, and lets them leave knowing what happens next. See the full running order in <a href="/adi-part-3-test-what-happens-minute-by-minute.html">our minute-by-minute guide</a>.</p>
<h2>Common mistakes we see</h2>
<ul><li>Spending the opening talking instead of asking.</li><li>A risk talk that is a list of rules rather than a conversation the pupil understands.</li><li>Teaching a manoeuvre for the whole lesson. GOV.UK says you cannot spend the whole lesson on one.</li><li>Giving answers too quickly, so the pupil never has to think.</li><li>Not stopping to give feedback when stopping safely would help.</li></ul>
<p>Want to practise this with someone who knows the marking? Message us and we will explain how our sessions work.</p>'''
f6 = [("What is client-centred learning in the ADI Part 3?", "It means the pupil shapes the goals of the lesson and takes responsibility for their own learning, while you guide, question and support. Your plan is built from what the pupil says, not brought in fixed."),
      ("How long can the opening discussion be?", "GOV.UK allows no more than 3 minutes for the discussion of goals and risk management at the start."),
      ("Can I spend the whole lesson teaching a manoeuvre?", "No. GOV.UK says you cannot spend the whole lesson teaching a manoeuvre, although a short recap of one the pupil has met before is allowed."),
      ("What kind of pupil should I bring?", "A partly trained learner, a fully trained learner or a full licence holder. A partly trained learner should be able to drive for 40 minutes without frequently stopping."),
      ("How long is the reflection at the end?", "No more than 3 minutes for the pupil to reflect on their performance.")]
pages["adi-part-3-lesson-planning-client-centred-learning-guide.html"] = page("adi-part-3-lesson-planning-client-centred-learning-guide.html", "Planning a Client-Centred Lesson for ADI Part 3 | DriveSQ",
    "How to plan a client-centred lesson for your ADI Part 3: the three-minute opening, plans for three pupil types, better questions and common mistakes.", "Planning a client-centred lesson for your ADI Part 3", b6, f6, {"@type": "Thing", "name": "Client-centred lesson planning for the ADI Part 3"})

for slug, h in pages.items(): open(os.path.join(ROOT, slug), "w", encoding="utf-8").write(h)
smp = os.path.join(ROOT, "sitemap-1.xml"); sm = open(smp, encoding="utf-8").read()
for slug in pages:
    if slug not in sm: sm = sm.replace("</urlset>", f"  <url><loc>{BASE}{slug}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
open(smp, "w", encoding="utf-8").write(sm)
print("pages:", list(pages))
