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
5. Run `supabase/migrations/20261128_whatsapp.sql` in the SQL Editor.
6. Deploy a function named **whatsapp** with the code in `supabase/functions/whatsapp/index.ts`. **Turn Verify JWT off.**
7. Meta → WhatsApp → **Configuration** → webhook URL `https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to **messages**.
8. WhatsApp Manager → **Message templates**: create `dsq_new_student`, `dsq_student_welcome` and `dsq_chase_unmarked` (category Utility, language English (UK)). The exact text and variables are in admin → WhatsApp → *Message templates to create in Meta*. Wait for approval.
9. Admin → WhatsApp → **Send a test** to your own number, then switch automation **ON**.

## What happens when it is ON
Pressing **Assign** in Find & Assign sends:
- the **instructor** the student's details with **Accept / Can't take** buttons (a tap updates the referral note; "Can't take" also puts the student under 🟣 Unsure so you reassign), and
- the **student** a welcome with their instructor's name and phone and the Student Portal link.
Both can be unticked for a single assignment. If WhatsApp is not connected, nothing is sent and the manual buttons still work.

## Costs
No set-up or monthly fee from Meta. Meta charges a small amount per template message that starts a conversation; replies within 24 hours of a person messaging you are free. Check Meta's current UK rate card.

## Rules
Only message people who agreed to be contacted on WhatsApp, and follow Meta's WhatsApp Business policy.
