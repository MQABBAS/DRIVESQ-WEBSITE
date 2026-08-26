/**
 * DriveSQ — Meta WhatsApp Business API Webhook
 *
 * SETUP (when ready to go live):
 * 1. In Meta Developer Console → WhatsApp → Configuration → Webhook:
 *    Callback URL: https://vwvbfqrlumvoabzkjxoa.supabase.co/functions/v1/whatsapp-webhook
 *    Verify Token: set to whatever you put in WA_VERIFY_TOKEN secret
 * 2. Subscribe to: messages
 * 3. In Supabase → Edge Functions → Secrets, add:
 *    WA_TOKEN        = your Meta permanent access token
 *    WA_PHONE_ID     = your WhatsApp phone number ID
 *    WA_VERIFY_TOKEN = any secret string you choose (used for verification)
 *    SB_SERVICE_KEY  = your Supabase service role key (for webhook DB writes)
 *
 * WHAT THIS DOES:
 * - GET  → Meta webhook verification handshake
 * - POST → Receives inbound WhatsApp messages, stores in whatsapp_messages table,
 *           processes confirmation replies (YES/NO → updates waiting_list confirm_status),
 *           and sends automatic replies where appropriate.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SB_URL = Deno.env.get('SUPABASE_URL') || 'https://vwvbfqrlumvoabzkjxoa.supabase.co';

// ── helpers ──────────────────────────────────────────────────────────────────

function sbHeaders() {
  const key = Deno.env.get('SB_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
}

async function sbGet(path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  return res.json();
}

async function sbPatch(table: string, filter: string, body: Record<string, unknown>) {
  await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(body),
  });
}

async function sbInsert(table: string, row: Record<string, unknown>) {
  await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(row),
  });
}

async function sendWA(to: string, message: string) {
  const token = Deno.env.get('WA_TOKEN');
  const phoneId = Deno.env.get('WA_PHONE_ID');
  if (!token || !phoneId) return;
  const num = String(to).replace(/\D/g, '');
  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: num,
      type: 'text',
      text: { body: message },
    }),
  }).catch(() => {});
}

// ── confirmation processing ───────────────────────────────────────────────────

const ACCEPT_WORDS = new Set(['1', 'yes', 'y', 'yep', 'yup', 'yeah', 'yea', 'ya', 'accept', 'accepted', 'ok', 'okay', 'sure', 'sounds good', 'soundsgood', 'great', 'perfect', 'absolutely', 'definitely', 'confirm', 'confirmed', 'agreed', 'deal', 'fine', 'happy', 'ill do it', 'illdo', 'ill take', 'illtake', '✅', '👍']);
const DECLINE_WORDS = new Set(['2', 'no', 'n', 'nope', 'nah', 'nay', 'decline', 'declined', 'reject', 'rejected', 'pass', 'cant', "can't", 'cannot', 'unable', 'sorry', 'unavailable', 'busy', 'full', 'no thanks', 'nothanks', 'not interested', '❌', '👎']);

async function processConfirmationReply(fromNumber: string, bodyText: string) {
  const word = bodyText.trim().toLowerCase().replace(/[^a-z0-9✅❌]/g, '');
  const isAccept = ACCEPT_WORDS.has(word);
  const isDecline = DECLINE_WORDS.has(word);
  if (!isAccept && !isDecline) return false; // not a confirmation reply

  // Find a pending confirmation for this instructor's phone number
  const num = fromNumber.replace(/\D/g, '');
  // Try matching last 9 digits (handles country code variants)
  const suffix = num.slice(-9);

  // Look up instructor by phone
  const instrs = await sbGet(`instructors?select=id,full_name,phone&status=eq.approved`);
  const instr = (instrs || []).find((i: { phone?: string }) => {
    const iNum = (i.phone || '').replace(/\D/g, '');
    return iNum.endsWith(suffix) || iNum === num;
  });
  if (!instr) return false;

  // Find their pending waiting_list confirmation
  const rows = await sbGet(
    `waiting_list?instructor_id=eq.${instr.id}&confirm_status=eq.pending&select=*&order=created_at.desc&limit=1`
  );
  const entry = rows?.[0];
  if (!entry) return false;

  if (isAccept) {
    await sbPatch('waiting_list', `confirm_token=eq.${entry.confirm_token}`, {
      confirm_status: 'accepted',
      confirm_responded_at: new Date().toISOString(),
    });
    await sendWA(fromNumber,
      `✅ *Confirmed!* ${entry.student_name || 'The student'} is now on your roster.\n\nThey'll be in touch to arrange the first lesson.\n\n🔗 View your roster: https://www.drivesq.co.uk/dashboard.html\n\n— DriveSQ 🤖`
    );
    return true;
  }

  if (isDecline) {
    await sbPatch('waiting_list', `confirm_token=eq.${entry.confirm_token}`, {
      confirm_status: 'declined',
      confirm_responded_at: new Date().toISOString(),
    });
    await sendWA(fromNumber,
      `❌ *Understood.* We'll find ${entry.student_name || 'the student'} another instructor right away.\n\nThanks for letting us know!\n\n— DriveSQ 🤖`
    );
    return true;
  }

  return false;
}

// ── match sender to instructor / student ──────────────────────────────────────

async function matchContact(fromNumber: string) {
  const num = fromNumber.replace(/\D/g, '');
  const suffix = num.slice(-9);

  // Try instructors first
  const instrs = await sbGet(`instructors?select=id,full_name,phone&limit=200`);
  for (const i of (instrs || [])) {
    const iNum = (i.phone || '').replace(/\D/g, '');
    if (iNum && (iNum === num || iNum.endsWith(suffix))) {
      return { name: i.full_name, type: 'instructor', id: i.id };
    }
  }

  // Try student_accounts
  const stus = await sbGet(`student_accounts?select=id,full_name,phone&limit=500`);
  for (const s of (stus || [])) {
    const sNum = (s.phone || '').replace(/\D/g, '');
    if (sNum && (sNum === num || sNum.endsWith(suffix))) {
      return { name: s.full_name, type: 'student', id: s.id };
    }
  }

  return { name: null, type: 'unknown', id: null };
}

// ── main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── GET: Meta webhook verification ──
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WA_VERIFY_TOKEN');

    // ── PLACEHOLDER: until you set WA_VERIFY_TOKEN, always return 403 ──
    if (!verifyToken) {
      console.log('WA_VERIFY_TOKEN not set — webhook not yet configured');
      return new Response('Webhook not yet configured. Set WA_VERIFY_TOKEN secret.', { status: 403 });
    }

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified ✅');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // ── POST: incoming messages ──
  if (req.method === 'POST') {
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return new Response('Bad JSON', { status: 400 });
    }

    try {
      // Extract messages from Meta's webhook structure
      const entry = (payload?.entry as Array<Record<string, unknown>>)?.[0];
      const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
      const value = changes?.value as Record<string, unknown>;
      const messages = value?.messages as Array<Record<string, unknown>>;

      if (messages?.length) {
        for (const msg of messages) {
          const waId    = String(msg.id || '');
          const from    = String(msg.from || '');
          const bodyText = (msg.text as Record<string, string>)?.body || '';
          const ts      = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString();

          // Look up contact
          const contact = await matchContact(from);

          // Store in whatsapp_messages (ignore duplicate wa_message_id)
          await sbInsert('whatsapp_messages', {
            wa_message_id: waId,
            from_number:   from,
            to_number:     Deno.env.get('WA_PHONE_ID') || '',
            body:          bodyText,
            direction:     'inbound',
            contact_name:  contact.name,
            contact_type:  contact.type,
            contact_id:    contact.id,
            processed:     false,
            raw_payload:   payload,
            created_at:    ts,
          }).catch(() => {}); // ignore duplicate key errors

          // Process confirmation replies (YES / NO)
          const wasConfirm = await processConfirmationReply(from, bodyText);

          // Mark as processed if we acted on it
          if (wasConfirm) {
            await sbPatch('whatsapp_messages', `wa_message_id=eq.${encodeURIComponent(waId)}`, { processed: true });
          }
        }
      }
    } catch (e) {
      console.error('Webhook processing error:', e);
    }

    // Always return 200 to Meta — otherwise they retry endlessly
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  return new Response('Method not allowed', { status: 405 });
});
