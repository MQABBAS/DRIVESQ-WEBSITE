# DriveSQ Twilio SMS Setup Guide

## Prerequisites
- Twilio account with Account SID, Auth Token, and a phone number
- Supabase project with CLI access

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Login and Link Project

```bash
supabase login
supabase link --project-ref vwvbfqrlumvoabzkjxoa
```

## Step 3: Set Twilio Secrets

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid_here
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1your_twilio_number
```

Find these values in your Twilio Console dashboard.

## Step 4: Deploy the Edge Function

```bash
cd /path/to/drivesq-website
supabase functions deploy send-sms --no-verify-jwt
```

The `--no-verify-jwt` flag allows the function to be called from the frontend using the anon key.

## Step 5: Test

Open browser console on any of the three apps and run:

```js
fetch('https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/send-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dmJmcXJsdW12b2FiemtqeG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzQ4MzgsImV4cCI6MjA5Njc1MDgzOH0.c5UNle-sh1DYuyqaNYvG9r9ru74EMP89uhdteQu2qho'
  },
  body: JSON.stringify({
    to: '+447352932003',
    type: 'custom',
    message: 'DriveSQ test message - SMS integration working!'
  })
}).then(r => r.json()).then(console.log);
```

**Note:** On Twilio trial, you can only send to verified numbers. Verify your number at:
Console > Phone Numbers > Verified Caller IDs

## SMS Types

The Edge Function supports these message types:

| Type | Trigger | Recipient |
|------|---------|-----------|
| `lesson_booked` | Instructor saves a new lesson | Student |
| `reminder_24hr` | Scheduled (future: cron job) | Student |
| `confirm_request` | Instructor confirms lesson | Student |
| `student_confirmed` | Student confirms attendance | Instructor |
| `student_declined` | Student requests reschedule | Instructor |
| `reschedule` | Lesson is rescheduled | Student |
| `custom` | Manual/admin use | Anyone |

## Triggers Already Wired In

- **dashboard.html**: SMS sent to student when lesson is booked, and when instructor confirms
- **student.html**: SMS sent to instructor when student confirms or requests reschedule

## Future: 24hr Reminder Cron

To add automated 24hr reminders, create a Supabase Database Webhook or pg_cron job:

```sql
-- Run daily at 8am UTC
select cron.schedule('lesson-reminders', '0 8 * * *', $$
  -- This would call the edge function for each lesson tomorrow
  -- Implementation depends on your pg_net extension availability
$$);
```

## Upgrading from Trial

1. Upgrade Twilio account (add payment method)
2. Complete UK regulatory bundle approval
3. Buy a UK number (+44)
4. Update the secret: `supabase secrets set TWILIO_PHONE_NUMBER=+44xxxxxxxxxx`
5. All verified-number restrictions are lifted automatically
