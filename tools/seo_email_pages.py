#!/usr/bin/env python3
"""Three pages that describe how DriveSQ really uses email: what students receive, how instructors are supported, and the quality standards behind it.
   Everything stated here mirrors what the admin system does (DSQ-AUTOMAIL in admin.html and the Monday emails in supabase/functions/send-email/monday.part.js).
   If the system changes, update these pages. Run: python3 tools/seo_email_pages.py"""
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://www.drivesq.co.uk/"; TODAY = datetime.date.today().isoformat(); TODAY_H = datetime.date.today().strftime("%-d %B %Y")
CSS = open(os.path.join(ROOT, "tools/_page.css"), encoding="utf-8").read()
def page(slug, title, desc, h1, body, faq, related, about):
    url = BASE + slug
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": h1, "description": desc, "dateModified": TODAY, "inLanguage": "en-GB", "isPartOf": {"@id": BASE + "#website"}, "about": about, "publisher": {"@id": BASE + "#school"}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE}, {"@type": "ListItem", "position": 2, "name": h1, "item": url}]}]}
    faqh = "".join(f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faq)
    rel = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for u, t in related)
    return f'''<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:title" content="{html.escape(h1)}"><meta property="og:description" content="{html.escape(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="article"><meta property="og:locale" content="en_GB">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>{CSS}</style></head>
<body><header><div class="in"><b>Drive<span>SQ</span></b><nav><a href="/">Home</a><a href="/areas.html">Areas</a><a href="/reviews.html">Reviews</a><a href="/#book-60">Book</a></nav></div></header>
<main class="wrap"><h1>{html.escape(h1)}</h1><div class="meta">Updated {TODAY_H}</div>
{body}
<h2>Questions people ask</h2>{faqh}
<h2>More from DriveSQ</h2><ul>{rel}</ul></main>
<footer>DriveSQ Driving School · Greater Manchester &amp; Solihull · <a href="/">drivesq.co.uk</a> · <a href="/about.html">About</a> · <a href="/reviews.html">Reviews</a> · <a href="/privacy.html">Privacy</a></footer>
<script src="/dsq-analytics.js" defer></script></body></html>'''
WA = "https://wa.me/447352932003"
def cta(text="Book in 60 seconds", url="/#book-60", wa="Hi%20DriveSQ%2C%20I%27d%20like%20to%20book%20driving%20lessons", wal="WhatsApp 07352 932003"):
    return f'<a class="cta" href="{url}">{text}</a><a class="cta alt" href="{WA}?text={wa}" rel="nofollow noopener">{wal}</a>'
cards = lambda items: '<div class="cards">' + "".join(f'<div class="card"><b>{t}</b><p>{d}</p></div>' for t, d in items) + "</div>"
pages = {}

# ---------- 1. students ----------
b = f'''<p class="lead"><strong>Short answer: a handful, and they are all about your booking and your lessons.</strong> When you book with DriveSQ you get a confirmation, your instructor's details, and, only if you haven't got started yet, a friendly nudge. Every automatic email links to an unsubscribe option, and we send no more than one automatic email a day.</p>
<h2>The emails you may receive, and when</h2>{cards([
 ("1. We've got your details", "Straight after you book online. It confirms we've received your request, shows the details you gave us (with a booking reference), explains what happens next and points you to your free Student Portal."),
 ("2. You're booked in", "Once your lessons are confirmed with your instructor. It gives your instructor's name and contact details, asks you to message them to say hello, explains what to bring and what happens in your first lesson, and shows how to use the free Student Portal."),
 ("3. Your new instructor", "Only if we move you to a different instructor. It tells you who they are and how to reach them, so you're never left wondering."),
 ("4. Welcome back", "If you return after a break, to pick up lessons again."),
 ("5. Ready to get started?", "Only if you asked about lessons but haven't started. One friendly nudge, and a single reminder about a week later. Then we stop."),
 ("6. Your instructor is trying to reach you", "If your instructor hasn't been able to get hold of you, so you can get back in touch."),
 ("7. Can we help?", "If it didn't work out with a booking, a short note asking whether we can help put it right.")])}
<h2>What you can rely on</h2><ul>
<li><strong>Limited and relevant.</strong> Automatic emails are tied to your booking. Some also mention our current new-learner offer (the first 10 hours for £330), and we say so clearly.</li>
<li><strong>No more than one automatic email a day.</strong></li>
<li><strong>You can stop them.</strong> Use the unsubscribe link in the email, or message us and we'll do it. If you unsubscribe, our system skips you.</li>
<li><strong>Your details have a purpose.</strong> We share them with your instructor so they can arrange your lessons. Your request goes to the DriveSQ team and isn't sold or shared for other purposes. See our <a href="/privacy.html">privacy policy</a>.</li>
<li><strong>Urgent things aren't left to email.</strong> For lesson-day changes, your instructor will contact you directly, usually by WhatsApp or phone.</li></ul>
<div class="note"><strong>Not heard from your instructor?</strong> Message us on <a href="{WA}" rel="nofollow noopener">WhatsApp 07352 932003</a> and we'll chase it for you.</div>
<h2>Why we keep it this simple</h2><p>Most of what makes a good learning experience happens in the car, not in your inbox. Our emails exist to make sure the basics happen: you know who your instructor is, you know what to expect, and nobody falls through the gaps. Behind the scenes, we also email our instructors to keep standards consistent. You can read about that in <a href="/how-drivesq-keeps-driving-lesson-quality-high.html">how we keep driving lesson quality high</a>.</p>
{cta()}'''
f = [("What emails will I get when I book driving lessons with DriveSQ?", "A confirmation that we've received your booking, a \"you're booked in\" email with your instructor's name and contact details, and, only if you haven't started yet, a friendly nudge and one reminder. We send no more than one automatic email a day."),
     ("Will DriveSQ spam me?", "No. Our automatic emails are tied to your booking, capped at one a day, and each includes an unsubscribe option. Some mention our current new-learner offer."),
     ("How do I stop DriveSQ emails?", "Use the unsubscribe link at the bottom of the email, or message us on WhatsApp on 07352 932003 and we'll stop them."),
     ("Will I be told who my instructor is?", "Yes. Your \"you're booked in\" email gives your instructor's name and contact details, and we ask you to message them to say hello and agree days and times."),
     ("Who sees my details?", "Your details go to the DriveSQ team and your instructor, so they can arrange your lessons. They aren't sold. See our privacy policy for details.")]
pages["what-emails-will-i-get-from-drivesq.html"] = page("what-emails-will-i-get-from-drivesq.html", "What Emails Will DriveSQ Send Me? Booking Confirmation & Instructor Details",
    "What to expect when you book driving lessons with DriveSQ in Manchester: a booking confirmation, your instructor's details and nothing you don't need. Max one email a day.",
    "What emails will DriveSQ send me?", b, f, [("/drivesq-student-portal.html", "The free DriveSQ Student Portal"), ("/how-drivesq-keeps-driving-lesson-quality-high.html", "How we keep driving lesson quality high"), ("/reviews.html", "Read our reviews"), ("/areas.html", "All the areas we cover")], {"@type": "Thing", "name": "DriveSQ booking emails"})

# ---------- 2. instructors ----------
b = f'''<p class="lead">If you are an ADI or a PDI thinking about joining DriveSQ in Greater Manchester, it helps to know how we work with our instructors day to day. Here is what we send you, when, and why. Everything also appears in your Instructor Portal, so nothing depends on one inbox.</p>
<h2>What you receive</h2>{cards([
 ("A new student, with the details you need", "When we assign you a student you get their name, phone, email, pick-up address and postcode, lesson type, availability, any test date and notes, organised so you can read it at a glance. In your portal, View opens the student's full profile."),
 ("A weekly Monday reminder", "Every Monday you get a short email with one focus for the week (for example first lessons, test preparation or weather and visibility) plus the basics for every lesson. It also appears in your portal and as a notification."),
 ("A nudge for students you haven't been able to reach", "A summary of students waiting to hear from you, so none are forgotten. We keep it to every couple of days at most."),
 ("Clear emails about money", "Franchise instructors get a weekly Monday fee reminder. Referral instructors get a weekly statement of the students we've confirmed as booked with you, with each student's amount and a note to ignore it if you've already paid. If we've got something wrong, you tell us and we correct it. No booking means no fee."),
 ("Prompts that help your reputation", "In your portal, a reminder at the end of lessons to ask learners for an honest Google review, with the QR code and link ready in your portal.")])}
<h2>You stay in control</h2><ul>
<li><strong>Email options:</strong> each instructor can opt out of everything, of fee and statement emails, or of weekly reminders. You'd still see the messages in your portal.</li>
<li><strong>WhatsApp for anything urgent.</strong> Emails are a record and a reminder. Real-time contact is by WhatsApp or phone.</li>
<li><strong>Everything in one place.</strong> The Instructor Portal shows your students, messages, progress records and notifications.</li></ul>
<h2>Why we do it this way</h2><p>A driving school is only as good as the lessons in its cars. Regular, short, practical reminders keep standards consistent across everyone who teaches with us, and clear communication about students and money avoids confusion. See <a href="/how-drivesq-keeps-driving-lesson-quality-high.html">how we keep lesson quality high</a> for the standards behind the weekly focus.</p>
<h2>Thinking of joining?</h2><p>We work with qualified ADIs and trainee PDIs across Greater Manchester. There are two ways to work with us, a fee per student who books or a flat weekly franchise fee, and we're happy to explain both. Read about the <a href="/driving-school-franchise-manchester.html">franchise option</a> or <a href="/independent-vs-franchise-driving-school.html">independent versus franchise</a>, or message us to ask for the current terms.</p>
{cta("Ask about joining", "https://wa.me/447352932003?text=Hi%20DriveSQ%2C%20I%27m%20a%20driving%20instructor%20and%20I%27d%20like%20to%20know%20about%20joining", "Hi%20DriveSQ%2C%20I%27m%20a%20driving%20instructor%20and%20I%27d%20like%20to%20know%20about%20joining", "WhatsApp 07352 932003")}'''
f = [("What emails does DriveSQ send to driving instructors?", "A weekly Monday reminder with one focus for the week, details of each new student we assign, a nudge for students you haven't reached, and clear fee reminders or referral statements depending on how you work with us."),
     ("Can I opt out of DriveSQ emails as an instructor?", "Yes. You can opt out of everything, of fee and statement emails, or of the weekly reminders. You'd still see the messages in your Instructor Portal."),
     ("Do I get paid or charged without being told?", "No. Franchise instructors get a weekly fee reminder, and referral instructors get a statement of the students confirmed as booked, with each amount shown and a way to tell us if something is wrong. No booking means no fee."),
     ("Is the information about each student organised?", "Yes. You get their name, contact details, pick-up address and postcode, lesson type, availability and notes in one clear message, and the portal opens their full profile."),
     ("Do you take on trainee instructors (PDIs)?", "We work with both ADIs and PDIs. Ask us about the current terms by WhatsApp on 07352 932003.")]
pages["how-drivesq-supports-driving-instructors.html"] = page("how-drivesq-supports-driving-instructors.html", "How DriveSQ Supports Driving Instructors in Manchester | Weekly Reminders, Statements & Portal",
    "What driving instructors joining DriveSQ in Greater Manchester receive: student details, weekly standards reminders, clear fee statements and one portal. Opt-out controls included.",
    "How DriveSQ supports driving instructors", b, f, [("/driving-school-franchise-manchester.html", "Driving school franchise in Manchester"), ("/independent-vs-franchise-driving-school.html", "Independent vs franchise driving school"), ("/instructor-lesson-guide.html", "Instructor lesson quality guide"), ("/how-drivesq-keeps-driving-lesson-quality-high.html", "How we keep lesson quality high")], {"@type": "Thing", "name": "Support for driving instructors"})

# ---------- 3. quality ----------
b = f'''<p class="lead">Learners can't watch what happens in every car, so we do three things. We set clear standards, we remind every instructor of them every week, and we give learners their own way to track progress and tell us how it's going. Here is what that looks like in practice.</p>
<h2>What we ask of every instructor, every lesson</h2><ul>
<li><strong>Check the provisional licence</strong> is valid and matches before the first drive.</li>
<li><strong>Check eyesight</strong> before the first lesson: reading a number plate from 20 metres, with glasses or lenses if needed.</li>
<li><strong>No hand-held phone</strong> while supervising a learner (Highway Code rule 149).</li>
<li><strong>L plates front and back,</strong> dual controls checked and seat belts on (rule 99).</li>
<li><strong>The instructor's badge</strong> (or trainee licence) on display in the car.</li>
<li><strong>Update the portal after each lesson,</strong> with status, a lesson log and progress.</li></ul>
<h2>A different focus every week</h2><p>Each Monday our instructors get a short reminder with one topic to concentrate on. The topics rotate through:</p>{cards([
 ("First lessons", "Start somewhere quiet, explain the controls clearly and agree a plan."),
 ("Planning a quality lesson", "Read the last lesson's notes, agree one or two goals with the learner and finish with them reflecting on their own performance."),
 ("Coaching, not just instructing", "Ask before you tell, match the learner's learning style and give specific, timely feedback."),
 ("Risk management", "Agree how responsibility for risk is shared, give directions clearly and in good time, and debrief any intervention."),
 ("Test preparation", "Use mock tests on local routes, practise show me / tell me questions and use the theory mock tests in the Student Portal."),
 ("Weather and visibility", "Check lights, demisting and tyres, teach longer stopping distances on wet roads and reschedule if conditions aren't safe."),
 ("Rest and fatigue", "Don't teach tired. Build in breaks on long teaching days."),
 ("Professional standards", "Be on time, keep messages professional and take payments only as agreed."),
 ("Lesson records", "Log every lesson so learners can see their progress, with the topics covered and what to work on next."),
 ("Reviews", "Ask every learner for an honest Google review at the end of a lesson, never offering discounts or free lessons for one.")])}
<h2>What learners get</h2><ul>
<li><strong>The free Student Portal</strong> with 700+ theory practice questions, 14 mock tests, hazard perception training and a progress dashboard. See the <a href="/drivesq-student-portal.html">DriveSQ Student Portal</a>.</li>
<li><strong>Lesson records</strong> so you can see what was covered and what to work on next.</li>
<li><strong>Mock tests on local routes</strong> before you book or confirm your real test.</li>
<li><strong>A clear way to tell us</strong> if something isn't right. Message us on WhatsApp.</li></ul>
<div class="note"><strong>An honest note.</strong> These are the standards we ask for and remind instructors about every week. We can't be in every car, so if a lesson isn't up to scratch, tell us and we'll look into it.</div>
<h2>Where email fits</h2><p>Email is one tool among several. It carries the weekly reminders to instructors and the booking messages to learners. The real work is done in the lesson. For what learners receive, see <a href="/what-emails-will-i-get-from-drivesq.html">what emails DriveSQ will send you</a>. For instructors, see <a href="/how-drivesq-supports-driving-instructors.html">how DriveSQ supports driving instructors</a>.</p>
{cta()}'''
f = [("How does DriveSQ make sure driving lessons are good quality?", "We set clear standards for every lesson, remind our instructors of them every week with a rotating focus (such as test preparation, risk management and coaching), keep lesson records in a portal, and give learners a way to tell us how it's going."),
     ("What checks do DriveSQ instructors do before a lesson?", "We ask instructors to check the learner's provisional licence and eyesight, have L plates and dual controls in order, display their badge, avoid hand-held phones and update the portal after the lesson."),
     ("Do DriveSQ learners get mock tests?", "Instructors are asked to use mock tests on local routes before a test is booked or confirmed, and learners have 14 theory mock tests in the free Student Portal."),
     ("What if I'm not happy with a lesson?", "Message us on WhatsApp on 07352 932003 and we'll look into it. We want to hear it straight away.")]
pages["how-drivesq-keeps-driving-lesson-quality-high.html"] = page("how-drivesq-keeps-driving-lesson-quality-high.html", "How DriveSQ Keeps Driving Lesson Quality High | Standards, Weekly Focus & Progress Records",
    "How DriveSQ keeps driving lessons in Manchester consistent: clear standards for every lesson, a weekly instructor focus, lesson records and mock tests on local routes.",
    "How DriveSQ keeps driving lesson quality high", b, f, [("/what-emails-will-i-get-from-drivesq.html", "What emails will DriveSQ send me?"), ("/how-drivesq-supports-driving-instructors.html", "How DriveSQ supports driving instructors"), ("/drivesq-student-portal.html", "The free Student Portal"), ("/reviews.html", "Read our reviews")], {"@type": "Thing", "name": "Driving lesson quality standards"})

for slug, h in pages.items(): open(os.path.join(ROOT, slug), "w", encoding="utf-8").write(h)
smp = os.path.join(ROOT, "sitemap-1.xml"); sm = open(smp, encoding="utf-8").read()
for slug in pages:
    if slug not in sm: sm = sm.replace("</urlset>", f"  <url><loc>{BASE}{slug}</loc><lastmod>{TODAY}</lastmod></url>\n</urlset>")
open(smp, "w", encoding="utf-8").write(sm)
print("built:", list(pages))
