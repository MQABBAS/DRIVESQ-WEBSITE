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
