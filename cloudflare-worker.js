/**
 * DriveSQ SMS Proxy — Cloudflare Worker
 *
 * DEPLOY STEPS:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this entire file into the editor and click "Deploy"
 * 3. Go to Worker Settings → Variables → add these Environment Variables:
 *      TWILIO_SID    = AC2e5c573d7571ec12cf694499fc1d0e42  (your Account SID)
 *      TWILIO_TOKEN  = <your REGENERATED Auth Token>         ← regenerate first!
 *      TWILIO_FROM   = +19516354707                          (your Twilio number)
 *                      OR use: DriveSQ                       (alphanumeric sender)
 * 4. Copy the Worker URL (e.g. https://drivesq-sms.your-name.workers.dev)
 * 5. Paste that URL into dashboard.html and student.html as SMS_WORKER_URL
 *
 * SECURITY: Credentials live ONLY in Cloudflare — never in your code.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, message } = body;
    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalise UK mobile number → E.164
    let toNum = String(to).replace(/\s+/g, '');
    if (toNum.startsWith('07') && toNum.length === 11) toNum = '+44' + toNum.slice(1);
    else if (toNum.startsWith('7') && toNum.length === 10) toNum = '+44' + toNum;
    else if (!toNum.startsWith('+')) toNum = '+44' + toNum;

    const params = new URLSearchParams({
      To: toNum,
      From: env.TWILIO_FROM,
      Body: message,
    });

    const auth = btoa(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`);

    try {
      const twRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const twJson = await twRes.json();

      if (twJson.error_code) {
        return new Response(
          JSON.stringify({ error: twJson.message, code: twJson.error_code }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, sid: twJson.sid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
