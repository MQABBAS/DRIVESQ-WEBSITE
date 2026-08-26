/**
 * DriveSQ — Send WhatsApp message via Meta Cloud API
 * Also logs every outbound message to whatsapp_messages table.
 *
 * SETUP: Add these secrets in Supabase Dashboard → Edge Functions → Secrets:
 *   WA_TOKEN       = Meta permanent access token
 *   WA_PHONE_ID    = WhatsApp phone number ID
 *   SB_SERVICE_KEY = Supabase service role key (for logging)
 *
 * Returns:
 *   {sent: true,  messageId}          — sent successfully
 *   {sent: false, reason: 'not_configured'} — secrets not set yet (graceful)
 *   {sent: false, error}              — Meta API error
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SB_URL = Deno.env.get('SUPABASE_URL') || 'https://vwvbfqrlumvoabzkjxoa.supabase.co';

async function logOutbound(to: string, message: string, messageId: string | null) {
  const key = Deno.env.get('SB_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!key) return;
  await fetch(`${SB_URL}/rest/v1/whatsapp_messages`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      wa_message_id: messageId || `out_${Date.now()}`,
      from_number: Deno.env.get('WA_PHONE_ID') || 'admin',
      to_number: to,
      body: message,
      direction: 'outbound',
      processed: true,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {}); // non-fatal
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const WA_TOKEN   = Deno.env.get('WA_TOKEN');
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
      const messageId = data.messages[0].id;
      // Log outbound (non-blocking)
      logOutbound(num, message, messageId);
      return new Response(JSON.stringify({ sent: true, messageId }), {
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
