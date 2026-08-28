// DriveSQ WhatsApp Webhook — Supabase Edge Function
// Handles: Meta webhook verification + inbound message processing
// Replace META_PHONE_NUMBER_ID and META_ACCESS_TOKEN with real values

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERIFY_TOKEN = 'drivesq_webhook_2024';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN') ?? '';
const META_PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID') ?? '';

const sb = createClient(SB_URL, SB_SERVICE_KEY);

// ── Send WhatsApp message via Meta Cloud API ──────────────────
async function sendWA(to: string, body: string) {
  const clean = to.replace(/\D/g, '');
  const intl = clean.startsWith('44') ? clean : clean.startsWith('0') ? '44' + clean.slice(1) : '44' + clean;
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.log(`[WA PLACEHOLDER → ${intl}]`, body);
    return;
  }
  await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: intl, type: 'text', text: { body } })
  });
}

// ── Yes/No word sets ──────────────────────────────────────────
const YES_WORDS = new Set(['yes','y','yep','yeah','yea','ok','okay','sure','confirm','confirmed','icancover','ican','cantake','1','accept','✅','👍']);
const NO_WORDS  = new Set(['no','nope','n','cant','cannot','decline','declined','reject','0','❌','👎','sorry']);

function isYes(text: string) {
  const c = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [...YES_WORDS].some(w => c === w.replace(/[^a-z0-9]/g,'') || c.includes(w.replace(/[^a-z0-9]/g,'')));
}
function isNo(text: string) {
  const c = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [...NO_WORDS].some(w => c === w.replace(/[^a-z0-9]/g,'') || c.includes(w.replace(/[^a-z0-9]/g,'')));
}

// ── Handle inbound message ────────────────────────────────────
async function handleInbound(from: string, messageText: string) {
  const text = (messageText || '').trim();

  // Check if this number matches an instructor who has a pending confirm request
  const { data: instrData } = await sb
    .from('instructors')
    .select('id, full_name, phone')
    .ilike('phone', `%${from.slice(-10)}%`)
    .maybeSingle();

  if (instrData) {
    // Check for pending confirm entry assigned to this instructor
    const { data: wlEntry } = await sb
      .from('waiting_list')
      .select('*')
      .eq('instructor_id', instrData.id)
      .eq('confirm_status', 'pending')
      .eq('status', 'pending_confirm')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (wlEntry) {
      if (isYes(text)) {
        // Assign the student
        await assignStudent(wlEntry, instrData);
        return;
      } else if (isNo(text)) {
        // Instructor declined
        await sb.from('waiting_list').update({
          status: 'rejected',
          confirm_status: 'declined'
        }).eq('id', wlEntry.id);

        // Message student
        if (wlEntry.student_phone) {
          const firstName = (wlEntry.student_name || '').split(' ')[0];
          await sendWA(wlEntry.student_phone,
            `Hi ${firstName}! 👋\n\nUnfortunately, we don't currently have any instructors available in your area.\n\nPlease contact us if you'd like us to try again in the future.\n\n— DriveSQ 🚗`
          );
        }

        // Log it
        await sb.from('autopilot_log').insert([{
          created_at: new Date().toISOString(),
          student_name: wlEntry.student_name,
          student_phone: wlEntry.student_phone,
          student_postcode: wlEntry.postcode,
          instructor_id: instrData.id,
          instructor_name: instrData.full_name,
          distance_miles: wlEntry.distance_miles,
          action: 'instructor_declined_confirm',
          source: wlEntry.source || 'website',
          waiting_list_id: wlEntry.id
        }]);
        return;
      }
    }
  }

  // Save inbound message to DB for WA inbox view
  await sb.from('whatsapp_messages').upsert([{
    direction: 'inbound',
    from_number: from,
    body: text,
    status: 'received',
    created_at: new Date().toISOString()
  }]).catch(() => {});
}

// ── Assign student after instructor confirms ──────────────────
async function assignStudent(wlEntry: any, instr: any) {
  const stuName = wlEntry.student_name || 'Student';
  const stuPhone = wlEntry.student_phone || '';
  const rawPc = wlEntry.postcode || '';
  const lessonType = wlEntry.lesson_type || 'Manual';
  const dist = wlEntry.distance_miles || 0;

  // Create student profile
  const profBase = {
    instructor_id: instr.id,
    name: stuName,
    phone: stuPhone || null,
    address: rawPc || null,
    created_at: new Date().toISOString()
  };
  for (const payload of [
    { ...profBase, lesson_type: lessonType, notes: wlEntry.notes || null },
    { ...profBase, lesson_type: lessonType },
    profBase
  ]) {
    const { error } = await sb.from('student_profiles').insert([payload]);
    if (!error) break;
  }

  // Update waiting list
  await sb.from('waiting_list').update({
    status: 'assigned',
    confirm_status: 'confirmed'
  }).eq('id', wlEntry.id);

  // Audit log
  await sb.from('autopilot_log').insert([{
    created_at: new Date().toISOString(),
    student_name: stuName,
    student_phone: stuPhone,
    student_postcode: rawPc,
    lesson_type: lessonType,
    instructor_id: instr.id,
    instructor_name: instr.full_name,
    distance_miles: dist,
    action: 'assigned_after_confirm',
    source: wlEntry.source || 'website',
    waiting_list_id: wlEntry.id
  }]);

  // Message instructor — full details
  await sendWA(instr.phone,
    `Hi ${instr.full_name}! 👋\n\n✅ *Confirmed! Here are the full student details:*\n\n──────────────\n👤 *Name:* ${stuName}\n📞 *Phone:* ${stuPhone || 'Not provided'}\n🏠 *Postcode:* ${rawPc}\n🚗 *Lesson type:* ${lessonType}\n${wlEntry.notes ? '📝 *Notes:* ' + wlEntry.notes + '\n' : ''}──────────────\n\n🔗 *Your Portal:* https://www.drivesq.co.uk/portal.html\n\n— DriveSQ 🤖`
  );

  // Message student — instructor details
  if (stuPhone) {
    await sendWA(stuPhone,
      `Hi ${stuName.split(' ')[0]}! 👋\n\nGreat news! DriveSQ has matched you with an instructor.\n\n──────────────\n👤 *Instructor:* ${instr.full_name}\n📞 *Their number:* ${instr.phone || 'We will be in touch'}\n──────────────\n\nThey will be in touch shortly to arrange your first lesson.\n\n📱 *Your Student Portal:* https://www.drivesq.co.uk/student.html\n\nSee you on the road! 🚗\n— DriveSQ`
    );
  }
}

// ── Autopilot timeout check (Deno cron — runs every 30 min) ──
Deno.cron('autopilot-timeout-check', '*/30 * * * *', async () => {
  const now = new Date().toISOString();
  const { data: expired } = await sb
    .from('waiting_list')
    .select('*, instructors(full_name, phone)')
    .eq('confirm_status', 'pending')
    .eq('status', 'pending_confirm')
    .lt('confirm_expires_at', now);

  if (!expired?.length) return;

  await Promise.all(expired.map(async (entry: any) => {
    // Instructor didn't reply in 5 hours — reject and notify student
    await sb.from('waiting_list').update({
      status: 'rejected',
      confirm_status: 'expired'
    }).eq('id', entry.id);

    await sb.from('autopilot_log').insert([{
      created_at: new Date().toISOString(),
      student_name: entry.student_name,
      student_phone: entry.student_phone,
      student_postcode: entry.postcode,
      instructor_id: entry.instructor_id,
      instructor_name: entry.instructors?.full_name,
      distance_miles: entry.distance_miles,
      action: 'confirm_expired_no_reply',
      source: entry.source || 'website',
      waiting_list_id: entry.id
    }]);

    if (entry.student_phone) {
      const firstName = (entry.student_name || '').split(' ')[0];
      await sendWA(entry.student_phone,
        `Hi ${firstName}! 👋\n\nUnfortunately, we don't currently have any instructors available in your area.\n\nPlease contact us if you'd like us to try again.\n\n— DriveSQ 🚗`
      );
    }
  }));
});

// ── Main request handler ──────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // GET — Meta webhook verification
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // POST — inbound message
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;
      if (messages?.length) {
        for (const msg of messages) {
          const from = msg.from;
          const text = msg.text?.body || msg.button?.text || '';
          if (from && text) await handleInbound(from, text);
        }
      }
    } catch (e) {
      console.error('Webhook error:', e);
    }
    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
