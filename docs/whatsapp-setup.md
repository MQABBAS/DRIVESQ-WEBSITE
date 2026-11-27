# WhatsApp Business automation: set-up (free, about 30 minutes)

Admin → top bar → **WhatsApp** opens the same steps, the template texts and a test button.
The switch there turns the whole thing **ON / OFF**. OFF = nothing is sent by the system and you use the WhatsApp buttons yourself.

1. **Meta Business account** (business.facebook.com), then **Meta for Developers** → create an app of type *Business* → add the **WhatsApp** product.
2. **WhatsApp → API Setup** → add a phone number that is *not* already used in a WhatsApp app (a cheap SIM or virtual number is fine). Copy the **Phone number ID**.
3. Business settings → **System users** → create one → give it your app and the WhatsApp account → generate a **permanent token** with `whatsapp_business_messaging` and `whatsapp_business_management`.
4. Supabase → Edge Functions → **Secrets**:
   - `WHATSAPP_TOKEN` (step 3)
   - `WHATSAPP_PHONE_ID` (step 2)
   - `WHATSAPP_VERIFY_TOKEN` (any long random text)
   - `WHATSAPP_APP_SECRET` (App → Settings → Basic → App secret)
   - `EMAIL_ADMIN_KEY` is already set for the email function and is reused.
5. Run `supabase/migrations/20261128_whatsapp.sql` in the SQL Editor (creates `wa_log`, `auto_assign_jobs` and `admin_attention`; the older `whatsapp_messages` table is left alone).
6. Deploy a function named **whatsapp** with the code in `supabase/functions/whatsapp/index.ts`. **Turn Verify JWT off.** This ONE function replaces the older `whatsapp-webhook` (autopilot) and `send-whatsapp` functions. Meta only allows one webhook URL, so use this one, switch the old autopilot off in admin, and stop any cron-job.org job that calls the old function.
7. Meta → WhatsApp → **Configuration** → webhook URL `https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to **messages**.
8. WhatsApp Manager → **Message templates**: create `dsq_new_student`, `dsq_student_welcome`, `dsq_student_offer`, `dsq_admin_attention` and `dsq_chase_unmarked` (category Utility, language English (UK)). The exact text and variables are in admin → WhatsApp → *Message templates to create in Meta*. Wait for approval.
9. Admin → WhatsApp → **Send a test** to your own number, then switch automation **ON**.

## What happens when it is ON
Pressing **Assign** in Find & Assign sends:
- the **instructor** the student's details with **Accept / Can't take** buttons (a tap updates the referral note; "Can't take" also puts the student under 🟣 Unsure so you reassign), and
- the **student** a welcome with their instructor's name and phone and the Student Portal link, but **only after the instructor taps Accept** (so a student is never told about an instructor who then can't take them).
Both can be unticked for a single assignment. If WhatsApp is not connected, nothing is sent and the manual buttons still work.

## Costs
No set-up or monthly fee from Meta. Meta charges a small amount per template message that starts a conversation; replies within 24 hours of a person messaging you are free. Check Meta's current UK rate card.

## Rules
Only message people who agreed to be contacted on WhatsApp, and follow Meta's WhatsApp Business policy.

## Auto-assign of website bookings (admin → WhatsApp → Auto-assign)
Default OFF. Switch it on and the server (every 2 minutes, only between your hours) takes each **new website booking** and:
1. ranks the approved instructors: distance, whether they cover the postcode, students already given this week, how many of their students end up booked, Platinum priority, female preference, penalty for many unmarked students. It skips instructors you flagged *Never auto-assign*, and for bookings that ask for a female instructor it only considers instructors flagged *Female instructor* (or "prefer", your choice);
2. **within 5 miles**: assigns straight away (student account, roster, referral fee, in-app message, push), then WhatsApps the instructor (details + Accept / Can't take). The student's welcome is sent only when the instructor taps Accept;
3. **5 to 14 miles**: asks the instructor first ("Accept / Can't take"); on Accept it assigns and sends the details. On "Can't take" or no reply in 5 hours it tries the next instructor (2 more by default);
4. **nothing suitable, over 14 miles, bad postcode, a message that failed, nobody accepted, or an instructor who can't cover**: puts it in **🚨 Attention required** (red button in the top bar), and WhatsApps you if you give your number. Nothing is rejected or told "no instructors" to the student automatically.

Safety: **Preview** shows what it would do without sending or saving anything. **Suggest only** mode adds suggestions to the attention list instead of assigning. Only bookings created after you switched it on are touched. Each booking is handled once.

Cron (one-time): Supabase → Integrations → Cron → every 2 minutes → Edge Function `whatsapp` → POST body `{"action":"auto_assign","cron":true}` with header `x-admin-key` (your email admin key).

## Rules for choosing the instructor (final)
- Within **8 miles** only (over it: attention required). Up to **5 miles**: assigned straight away. **5 to 8 miles**: the instructor is asked to accept first.
- **Closest first.** Soft limits: **2 students given today**, **4 confirmed booked this week**. An instructor over a limit is asked **last** (closest first among the others). If everyone nearby declines or is over a limit, the closest gets the student anyway.

## Checking the student booked (follow-ups)
1. The instructor accepts → the student is welcomed.
2. **3 days later** the student gets *"Has [instructor] booked your first lesson?"* with **Yes, booked / Not yet / Gone elsewhere**.
3. **Yes, booked** → Referrals: green flag, "✅ Booked — confirmed by student" and a note "📱 [student] messaged on WhatsApp: confirmed they are booked in". **Not yet** → note, purple flag, then "Has the instructor been in touch?" (if No: attention required and the instructor is asked). **Gone elsewhere** → red, "Student confirmed left", no fee.
4. **No reply in 1 day** → the instructor gets *"Did [student] book?"* with **Booked / Not yet / Student left**; their answer is recorded the same way.
5. Repeats every **5 days**, up to **4 rounds**, then attention required. It stops as soon as someone says booked or left, or you mark it in admin.
All times and counts are settings in Admin → WhatsApp → Auto-assign. Run `supabase/migrations/20261129_followups.sql` once, create the two check-in templates (`dsq_student_checkin`, `dsq_instructor_checkin`), and the Supabase Cron job (every 2 minutes) runs the follow-ups even when auto-assign is off.

## Unpaid fees (referral instructors)
A referral instructor with **2 or more students confirmed booked whose referral fee is not marked paid** is asked **last** for new students (a soft limit, like the others: if everyone else declines, they still get one). You get a **💷 Unpaid fees** item in the 🚨 attention list with the amount and two buttons: **Copy balance message** and **WhatsApp the balance** (the amount only, no student names). It clears by itself once the fees are marked paid. Find & Assign shows a "💷 2 booked students not paid yet · £50" chip on the instructor's card. The number is a setting (0 = off). Franchise instructors are not affected.

## Reply time and booking acknowledgement
- An instructor has **45 minutes** (setting) to tap Accept on an offer. After that it goes to the **next** instructor straight away (the timer is checked every 2 minutes).
- Optional: tick **"WhatsApp every new website booking straight away"** and each website booking gets a short message ("we have passed your details to a driving instructor near you, they will contact you shortly, they may be in a lesson"). Needs the template `dsq_booking_received` (Utility, English (UK), one variable). Sent once per booking, only to bookings made after you tick it.

## Offer first, then auto-assign if they cover the area
Every student within 8 miles is **offered** to the nearest suitable instructor (Accept / Can't take). If they say **Can't take**, it goes to the next instructor straight away. If they **don't reply for 35 minutes** and the instructor's **Covered Postcodes** (instructor profile) include the student's postcode area, the student is **assigned to them automatically** (they are probably in a lesson): the student gets the welcome ("your instructor may be in a lesson, message them your availability") and the instructor gets the details. If they don't cover the area, it waits the full **60 minutes** and then goes to the next instructor. Settings: Admin -> WhatsApp -> Auto-assign (set "assign straight away if within" to 0 to offer everyone first).

## Timing: never at night
- Instructors are only contacted between the **offer hours** (default 8:00 to 20:00 UK time).
- The **reply timers (35 and 90 minutes) only count those hours**. A booking at midnight is offered at 8:00, and the instructor gets their full time to reply. An offer sent at 19:50 has 10 minutes before 20:00, then the rest from 8:00.
- The student is told we have their booking between the **acknowledgement hours** (default 7:00 to 23:00). During the offer hours: "we have passed your details to a driving instructor". Outside them: "first thing in the morning" wording (`dsq_booking_received_later`, one more template). Outside 7:00 to 23:00 nothing is sent until the morning.

## Optional: see template approval inside admin
Add the Supabase secret `WHATSAPP_WABA_ID` (your WhatsApp Business Account ID, shown in WhatsApp Manager → Account tools / Settings). The Auto-assign control centre → **Test & readiness** then lists each template as Active / In review / Rejected.

## Welcome email when a website booking comes in (sendemail function)
Supabase → Integrations → Cron → new job: every **2 minutes** (`*/2 * * * *`) → Supabase Edge Function → **sendemail** → POST, header `x-admin-key` = your email admin key, body `{"action":"welcome","cron":true}`.
It emails every NEW website booking that left an email address, once per address, and notes "📧 Welcome email sent (booking received)" on the booking. Switch it off with growth_settings key `welcome_config` = `{"enabled": false}`. Admin's own in-browser welcome email is skipped automatically once this function is deployed.

## Never annoying (built in)
- Balance reminders to instructors go out only 9am–6pm UK, never on Sundays, once a week, and not to anyone who already had 8 automatic messages in the last 24 hours.
- Student check-ins and acknowledgements stop after 4 messages to one student in 24 hours. Offers and assignments are never held back.
- Every Monday (from 9am UK) you get ONE "Weekly billing" item in Needs you: referral fees and franchise weekly fees owed. Overview also has a live "Money to collect" card.
- Ignore an instructor from Control centre → Instructors (🚫 Ignore, optional reason). They get nothing automatic until you press ↩ Include again.

## Per-instructor settings and the audit trail
- Control centre → Instructors → ⚙ Settings: for ONE instructor set who they teach (anyone / women only / men only), priority, furthest distance, most per day / week, hard weekly cap, weekly minimum, a holiday pause date, Ignore + reason. Empty = general setting. Every change is written to Activity.
- Women/men only: the student's gender is read from a "Student gender: female" line on the booking, then from titles and what they wrote, then from the first name (lists of common UK, South Asian, Arabic, African, European names). Unclear or unisex names (e.g. Noor) are never guessed: that instructor is skipped and you get the usual alert.
- Activity shows every move: offered, no answer, accepted, declined, assigned, alerts, balance reminders, settings changes, WhatsApps.

## WhatsApp enquiries collected by the Meta AI
Admin → Waiting List → Add: paste what the AI collected, press ✨ Fill in, check it, keep "🤖 Let auto-assign find an instructor" ticked, Add. The entry is tagged [WHATSAPP] [AUTO] and auto-assign handles it like a website booking. Unticked = handled by hand (auto-assign ignores it).

## WhatsApp booking assistant (Claude)
1. Create an API key in the Anthropic Console (no expiry) and save it in Supabase → Edge Functions → Secrets as ANTHROPIC_API_KEY.
2. Deploy the whatsapp function. Control centre → Settings → 🤖 WhatsApp booking assistant shows whether the key is found.
3. Turn it ON with Test mode ticked: it only answers your admin phone. Chat to it from your own phone, then untick Test mode.
4. Only one assistant may answer on the number: pause the Meta AI replies first.
It asks name, postcode, gearbox, times, then adds the booking ([WHATSAPP] [AUTO]) for auto-assign. It never quotes prices; anything else is handed to you as an alert and it goes quiet for that person for the day.

## Covered areas only
Control centre → Instructors → ⚙ Settings → "📍 Only students in the postcodes they cover". An instructor with this on is only offered students whose postcode (e.g. M13) is in their covered postcodes on their profile. No covered postcodes set = they get nothing until you add some. Shown as a "Covered areas only" badge.

## Female students
Settings → Who gets the jobs → "Female students: a female instructor first". When the student looks female (name, title, or her own words) a female instructor within 5 miles (changeable) is offered first; beyond that, or if none, the normal order. Nobody is excluded. Explicit requests for a female instructor still work as before.

## Every kind of student message
Fixed safe replies + an alert (no Claude needed): emergency/accident, complaint, payment/refund, cancel/reschedule, theory/driving test questions, questions about their instructor, "speak to a person". Abusive messages get no reply, only an alert. STOP stops every automatic message to that number until they send START. Existing students' alerts name their instructor. Settings → WhatsApp booking assistant → Facts box: the only facts the assistant may state (empty = built-in facts from the terms, incl. 2 hour minimum). Everything else Claude says the team will confirm.

## How a student message is understood (no guessing)
1. Claude labels the message (booking, faq, smalltalk, cancel/change, test date, payment, complaint, instructor question, speak to a person, real emergency, abuse, unclear) with an urgency and a confidence score.
2. Plain rules decide: booking/faq/smalltalk -> the assistant replies; the serious kinds -> a fixed safe reply + an alert to you; unclear or under 65% sure -> handed to you.
3. If the keyword check and Claude disagree it is shown in the alert, and Claude's reading wins only when it is confident. If Claude is unreachable the keyword rules take over.
4. Every decision is written to Activity in plain English, e.g. "test_date (96% sure, time_sensitive) -> fixed reply (test) and alert". The 999 line is only sent for a confirmed real emergency.
Settings can switch the classifier off (aiClassifier) or change the confidence threshold (aiMinConfidence).

## Claude: off / read only / read + send
Control centre header (and Settings → 🤖 WhatsApp booking assistant) has three modes:
- **Off**: Claude does nothing.
- **Read only**: Claude reads the chats on the number (also what a student told another assistant such as the Meta AI), takes out ONLY what they actually said (name, postcode, gearbox, times) and saves the booking for auto-assign when all three are there. Otherwise you get an alert listing what it found and what is missing. It NEVER sends a message (what it would have said is logged as "not sent"). Serious messages (refund, complaint, emergency...) become alerts only.
- **Read + send**: as above, and it also replies to students and confirms bookings.
Claude cannot see the Meta AI's own notes or its replies: it only sees the student's messages, from the last 24 hours.

## WhatsApp enquiries are held a few minutes
A booking Claude took from a WhatsApp chat waits 5 minutes (Settings: "Hold a WhatsApp enquiry for … minutes", max 15 in total) before auto-assign offers it, so the student can still give availability, address and the rest. New details restart the wait. If availability is already given it is assigned at once. A booking you pasted yourself, or a website booking, is never held. Preview shows held enquiries as "waiting".

## Sending students straight away (franchise, or instructors you choose)

- By default **franchise** instructors are sent a student's full details at once, with **no Accept needed**, when the student is within **6 miles** (Settings → "Send details straight away within … miles"). Referral instructors are asked first (an offer with Accept / Can't take), as before.
- Per instructor: ⚙ Settings → **How new students reach them**: *Default*, *Send details straight away*, or *Ask first*. The choice is recorded in Activity.
- A direct instructor gets the details message **with the Accept / Can't take buttons still on it**, and the student is told who their instructor is **immediately**. The booking card says "details sent straight away, no Accept needed".
- If that instructor taps **Can't take**: the student gets a new message ("we are finding you another instructor"), the instructor's record for that student is cancelled and removed from their lists, and auto-assign gives the student to the **next** instructor automatically (direct or asked first, by the same rules). If nobody is left, or the retries run out, you get an alert in Needs you.
- New message template: **dsq_student_reassign**. Press "Create the missing templates in Meta" in the control centre (Test & readiness) once. Until it is approved, the message is sent as a normal text if the student messaged recently, otherwise you get an alert to tell them by hand.

## ADI Part 3 training enquiries

- The booking form is `/adi-part-3-training-booking.html`. It posts to the **whatsapp** function (action `adi_enquiry`, the one action that needs no admin key) and also emails a copy through Formspree.
- Run `supabase/migrations/20261125_adi_enquiries.sql` once. The table is **private**: row level security is on with no policies, so only the function (service role) can read it.
- Each enquiry creates an alert in Needs you and a WhatsApp to your admin phone. Open **Control centre → 🎓 ADI leads** to reply (WhatsApp / call / email buttons), set a status (New, Contacted, Booked, Closed) and add a note.
- Safety: a hidden field catches bots, the same number is saved once per 10 minutes, and no more than 200 enquiries are taken a day.

**ADI Part 3 / instructor-training enquiries are never assigned to an instructor.** The form saves to the private table and alerts only you. A WhatsApp chat that mentions ADI training, the ADI tests, a trainee (pink badge) licence or becoming an instructor is never turned into a student booking (not by the assistant, the 1-minute catch-up, or "Read recent chats"): you get an alert and reply yourself. Auto-assign also skips any waiting-list entry that mentions ADI training.

## Inbox, morning summary, offer reminders, ADI reply, Claude usage

All of these are new in version 2026-11-26. Three of them use **new WhatsApp templates** (`dsq_admin_summary`, `dsq_offer_reminder`, `dsq_adi_enquiry_received`). Press "Create the missing templates in Meta" once. **While Meta reviews them nothing that works today changes**:
- **Morning summary**: goes out through your existing alert template until `dsq_admin_summary` is approved (or as a normal message if you messaged the number in the last 24 hours). Settings → "Summary, reminders & ADI replies": on/off and the hour. "Send me the summary now" sends it straight away.
- **Offer reminder**: one gentle reminder per unanswered offer (default 20 minutes of waking time). Until `dsq_offer_reminder` is approved it is only sent to an instructor who has messaged the number in the last 24 hours; otherwise nothing is sent and nothing fails. 0 turns it off.
- **ADI reply**: a thank-you on WhatsApp to people who send the ADI Part 3 form. Waits for `dsq_adi_enquiry_received`.
- **💬 Inbox** (control centre): every chat from the last 30 days, grouped by phone number, with Needs reply / Students / Instructors / ADI filters, the full thread, quick replies and a reply box. WhatsApp allows free text only within 24 hours of the person's last message; outside that window sending is blocked with an explanation. Anyone who sent STOP cannot be messaged. "Mark done" clears a chat from Needs reply. Every reply is logged in Activity.
- **📈 Claude usage**: calls and tokens per day and per purpose. Enter your Anthropic prices per million tokens under Settings to see an estimated cost.
- A button reply (Accept, Can't take, check-in answers, "I've paid") only counts when it comes from the person it was meant for.

## Check-ins: did the student book a lesson?

- **Who:** every student given since the start date (Settings → follow-ups, default Monday 23 Nov 2026), however they were given: auto-assign **or by hand** in Find & Assign. Earlier students are never asked.
- **When:** the first check-in goes to the student **and** the instructor 3 days after the student was given (8am to 9pm UK, never more than 12 people per run, at most 2 a week each).
- **Only unmarked or unsure:** a student with no mark, or marked 🟣 unsure in Referrals, is asked. A student marked **booked, not booked, can't reach or left** gets no message, and neither does their instructor. If a mark is removed they are asked again.
- **Answers** (a button tap, or a mark in the Instructor Portal) update the Referral: booked → green, not yet → unsure, left → red, with a note and an Activity line, and the other person is no longer asked.

**Encouraging students to message their instructor:** the welcome message already asks them to message the instructor with their days and times (with a tap-to-chat link). Every follow-up answer now does the same: a student who says "Not yet", or that the instructor has not been in touch, gets the instructor's WhatsApp link and number and is told to send the days and times they are free. These replies are free text sent right after the student taps a button, so they need no new template.

**ℹ️ Been informed (Referrals):** each student in an instructor's referral list has a "Been informed" button next to Booked / Not booked / Unsure. Press it when you already know how the student is getting on: no WhatsApp check-in goes to the student **or** the instructor. Press it again ("Informed ✓") to resume. It is saved as a line in the referral notes and in Activity, and it does not change the booked / unsure / not booked flag.

## What students and instructors write is noted as the reason

When a student (about themselves) or an instructor (about one of their students) sends a **free-text** WhatsApp, Claude reads it (needs Claude switched on; while Test mode is on only your own phone is read; nothing is ever sent back):
- The Referral notes get a line with their words and the reason, for example: `27 Nov 2026 · 📱 Sara on WhatsApp: “can’t afford it until payday on the 5th” → will book later: Waiting until payday on the 5th.`
- When it is clear (Claude at least 80% sure) and the student is **unmarked or unsure**, the Referral is marked the same way a button or the Instructor Portal would: **booked** (green, "confirmed by student / instructor"), **will book later** (unsure), **not booked / left / can't reach** (red). A "ready in 3 weeks" style date moves the next check-in out by that many days. The check-in stops for any finished mark.
- A student already marked booked, informed, or marked red is **never changed** by a message: the reason is noted and you are told to check.
- Not sure enough, not about lessons, or an instructor who does not say which student: noted or ignored, never guessed. Items that need you appear in Needs you.
- Switch it off in Settings under "Check the student booked".

## WhatsApp messages from referrals and profiles

A green **WhatsApp messages** button now opens the real WhatsApp Business conversation (read and reply) in a pop-up, from:

- **Referrals** (an instructor's referral list): **💬 Instructor's WhatsApp** in the header, and **💬 Messages** under each student's phone number.
- **Instructor profile**: **WhatsApp messages** beside the other action buttons.
- **Student profile** (and the student view opened from a referral): **WhatsApp messages**.

The pop-up refreshes every 12 seconds. Replies go from the DriveSQ business number; free text is only possible within 24 hours of their last message, and people who sent STOP are blocked. No function redeploy is needed (it uses the existing inbox actions).

## Safer admin login (security stage 1)

Admin passwords used to be stored as readable Base64 in a table anyone with the public website key could read. The new `admin-login` function checks the password on the server (PBKDF2, locks for 15 minutes after 8 wrong tries).

1. Run `20261128_admin_login.sql` (adds a column and a private attempts table; nothing stops working).
2. Deploy the `admin-login` function with **Verify JWT turned off**.
3. Sign in to the admin once: your account upgrades itself and the old readable password is wiped.
4. Check the admin works, then run `20261128_admin_login_lock.sql` to remove public access to the `admins` table.

Undo for step 4: `create policy "tmp_open_admins" on admins for all using (true) with check (true);`
