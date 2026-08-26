import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const WA_TOKEN = Deno.env.get('WA_TOKEN');
    const WA_PHONE_ID = Deno.env.get('WA_PHONE_ID');

    if (!WA_TOKEN || !WA_PHONE_ID) {
      return new Response(JSON.stringify({ sent: false, reason: 'not_configured' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { to, message } = await req.json();
    if (!to || !message) {
      return new Response(JSON.stringify({ sent: false, error: 'Missing to or message' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Normalise number — ensure it starts with country code digits only (no +)
    const num = String(to).replace(/\D/g, '');

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: num,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    const data = await res.json();

    if (data.messages && data.messages[0]?.id) {
      return new Response(JSON.stringify({ sent: true, messageId: data.messages[0].id }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ sent: false, error: data.error?.message || 'Unknown Meta API error' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ sent: false, error: String(e) }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
