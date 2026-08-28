// DriveSQ WhatsApp Webhook + Autopilot — Supabase Edge Function v2
// Endpoints:
//   GET  /                  — Meta webhook verification
//   POST /                  — Meta inbound WhatsApp messages
//   POST /check-timeouts    — Expire pending confirms older than 5h
//   POST /autopilot         — Run full autopilot cycle (called every 1 min by cron-job.org)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERIFY_TOKEN       = 'drivesq_webhook_2024';
const SB_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SB_SERVICE_KEY     = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const META_ACCESS_TOKEN  = Deno.env.get('META_ACCESS_TOKEN') ?? '';
const META_PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID') ?? '';

const AP_AUTO_MILES    = 5;   // ≤ this → assign immediately, no confirm
const AP_CONFIRM_MILES = 14;  // > this → reject
const AP_CONFIRM_HOURS = 5;   // hours to wait for instructor confirm

const sb = createClient(SB_URL, SB_SERVICE_KEY);

// ── WhatsApp sender ──────────────────────────────────────────────────────────
async function sendWA(to: string, body: string) {
  const clean = to.replace(/\D/g, '');
  const intl  = clean.startsWith('44') ? clean
              : clean.startsWith('0')  ? '44' + clean.slice(1)
              : '44' + clean;
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.log(`[WA PLACEHOLDER → ${intl}]`, body);
    return;
  }
  try {
    await fetch(`https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: intl, type: 'text', text: { body } })
    });
  } catch (e) { console.error('sendWA error:', e); }
}

// ── Audit log ────────────────────────────────────────────────────────────────
async function auditLog(data: Record<string, unknown>) {
  await sb.from('autopilot_log').insert([{ created_at: new Date().toISOString(), ...data }]);
}

// ── Haversine distance (miles) ───────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Geocode a postcode via postcodes.io (supports full + outward codes) ──────
async function geocode(pc: string): Promise<{lat: number, lon: number} | null> {
  const clean = pc.replace(/\s+/g, '').toUpperCase();
  try {
    let r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
    let j = await r.json();
    if (j.result) return { lat: j.result.latitude, lon: j.result.longitude };
    // Try outward code
    const oc = clean.replace(/\d[A-Z]{2}$/, '').trim();
    r = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(oc)}`);
    j = await r.json();
    if (j.result) return { lat: j.result.latitude, lon: j.result.longitude };
  } catch {}
  return null;
}

// ── Driving distance via OSRM (falls back to haversine) ─────────────────────
async function drivingMiles(sLat: number, sLon: number, iLat: number, iLon: number): Promise<number> {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${sLon},${sLat};${iLon},${iLat}?overview=false`);
    const j = await r.json();
    if (j.routes?.[0]) return j.routes[0].distance / 1609.34;
  } catch {}
  return haversine(sLat, sLon, iLat, iLon);
}

// ── Can this instructor teach this lesson type? ──────────────────────────────
function canTeach(instrType: string, reqType: string): boolean {
  if (instrType === 'Both') return true;
  if (reqType === 'Automatic') return instrType === 'Automatic';
  return instrType !== 'Automatic';
}

// ── Outward code extractor ───────────────────────────────────────────────────
function outward(pc: string): string {
  return pc.toUpperCase().replace(/\s+/g, '').replace(/\d[A-Z]{2}$/, '').trim();
}

// ── Create student profile (with fallback) ───────────────────────────────────
async function createStudentProfile(instrId: string, entry: any) {
  const base = {
    instructor_id: instrId,
    name: entry.student_name || 'Student',
    phone: entry.student_phone || null,
    address: entry.postcode || null,
    created_at: new Date().toISOString()
  };
  for (const payload of [
    { ...base, lesson_type: entry.lesson_type || 'Manual', notes: entry.notes || null },
    { ...base, lesson_type: entry.lesson_type || 'Manual' },
    base
  ]) {
    const { error } = await sb.from('student_profiles').insert([payload]);
    if (!error) break;
  }
}

// ── Check if autopilot is enabled in DB ─────────────────────────────────────
async function isAutopilotEnabled(): Promise<boolean> {
  const { data } = await sb.from('app_settings').select('value').eq('key', 'autopilot_enabled').maybeSingle();
  return data?.value === 'true' || data?.value === true;
}

// ── Main autopilot cycle ─────────────────────────────────────────────────────
async function runAutopilot(): Promise<{ processed: number; assigned: number; errors: string[]; skipped?: string }> {
  const errors: string[] = [];
  let processed = 0, assigned = 0;

  // Check if autopilot is enabled
  const enabled = await isAutopilotEnabled();
  if (!enabled) return { processed: 0, assigned: 0, errors: [], skipped: 'autopilot_disabled' };

  // Load waiting entries
  const { data: waiting, error: wErr } = await sb
    .from('waiting_list').select('*').eq('status', 'waiting').order('created_at', { ascending: true });
  if (wErr) return { processed: 0, assigned: 0, errors: ['waiting_list query: ' + wErr.message] };
  if (!waiting?.length) return { processed: 0, assigned: 0, errors: [] };

  // Load instructors
  const { data: instrs, error: iErr } = await sb.from('instructors').select('*').eq('status', 'approved');
  if (iErr || !instrs?.length) return { processed: 0, assigned: 0, errors: ['instructors query: ' + (iErr?.message || 'none found')] };

  // Weekly assignment counts for fair distribution
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const { data: weeklyData } = await sb.from('waiting_list')
    .select('instructor_id').eq('status', 'assigned').gte('created_at', weekStart.toISOString());
  const weeklyCount: Record<string, number> = {};
  (weeklyData || []).forEach((r: any) => {
    if (r.instructor_id) weeklyCount[r.instructor_id] = (weeklyCount[r.instructor_id] || 0) + 1;
  });

  for (const entry of waiting) {
    processed++;
    const stuName  = entry.student_name || 'Unknown';
    const stuPhone = entry.student_phone || '';
    const rawPc    = (entry.postcode || '').trim();
    const lessonType = entry.lesson_type || 'Manual';
    const source   = entry.source || 'website';

    if (!rawPc) {
      await auditLog({ student_name: stuName, student_phone: stuPhone, action: 'skipped_no_postcode', source, waiting_list_id: entry.id });
      continue;
    }

    // Geocode student
    const sCoord = await geocode(rawPc);
    if (!sCoord) {
      await auditLog({ student_name: stuName, student_phone: stuPhone, student_postcode: rawPc, action: 'skipped_bad_postcode', source, waiting_list_id: entry.id });
      continue;
    }

    // Score each instructor
    const scored: Array<{ instr: any; dist: number; score: number }> = [];
    for (const instr of instrs) {
      if (!canTeach(instr.car_type || 'Manual', lessonType)) continue;
      const pcMatch = (instr.area || '').match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i);
      if (!pcMatch) continue;
      const iCoord = await geocode(pcMatch[0]);
      if (!iCoord) continue;
      const dist = await drivingMiles(sCoord.lat, sCoord.lon, iCoord.lat, iCoord.lon);
      // Coverage bonus
      const covCodes = (instr.coverage_postcodes || instr.area || '').toUpperCase().split(/[\s,;/]+/).map((c: string) => c.trim()).filter(Boolean);
      const stuOC = outward(rawPc);
      const coverageBonus = stuOC && covCodes.some((c: string) => c === stuOC || outward(c) === stuOC) ? 40 : 0;
      const workloadPenalty = (weeklyCount[instr.id] || 0) * 8;
      const distScore = Math.max(0, 50 - dist * 3);
      scored.push({ instr, dist, score: distScore + coverageBonus - workloadPenalty });
    }

    scored.sort((a, b) => b.score - a.score);
    if (!scored.length) {
      await auditLog({ student_name: stuName, student_phone: stuPhone, student_postcode: rawPc, lesson_type: lessonType, action: 'no_instructor_found', source, waiting_list_id: entry.id });
      continue;
    }

    const best = scored[0];
    const dist = best.dist;
    const instr = best.instr;

    // >14 miles → reject immediately
    if (dist > AP_CONFIRM_MILES) {
      await sb.from('waiting_list').update({ status: 'rejected' }).eq('id', entry.id);
      await auditLog({ student_name: stuName, student_phone: stuPhone, student_postcode: rawPc, lesson_type: lessonType, instructor_id: instr.id, instructor_name: instr.full_name, distance_miles: dist, action: 'rejected_no_coverage', source, waiting_list_id: entry.id });
      if (stuPhone) {
        await sendWA(stuPhone, `Hi ${stuName.split(' ')[0]}! 👋\n\nThank you for contacting DriveSQ.\n\nUnfortunately, we don't currently have any instructors available in your area.\n\nWe are continuously expanding — please check back soon.\n\n— DriveSQ 🚗`);
      }
      continue;
    }

    // ≤5 miles → assign immediately
    if (dist <= AP_AUTO_MILES) {
      await createStudentProfile(instr.id, entry);
      await sb.from('waiting_list').update({ status: 'assigned', instructor_id: instr.id, distance_miles: dist }).eq('id', entry.id);
      weeklyCount[instr.id] = (weeklyCount[instr.id] || 0) + 1;
      assigned++;
      await auditLog({ student_name: stuName, student_phone: stuPhone, student_postcode: rawPc, lesson_type: lessonType, instructor_id: instr.id, instructor_name: instr.full_name, distance_miles: dist, action: 'auto_assigned', source, waiting_list_id: entry.id });
      // Message instructor
      await sendWA(instr.phone, `Hi ${instr.full_name}! 👋\n\n✅ *A new student has been assigned to you:*\n\n──────────────\n👤 *Name:* ${stuName}\n📞 *Phone:* ${stuPhone || 'Not provided'}\n🏠 *Postcode:* ${rawPc}\n🚗 *Lesson type:* ${lessonType}\n${entry.notes ? '📝 *Notes:* ' + entry.notes + '\n' : ''}──────────────\n\n🔗 *Your Portal:* https://www.drivesq.co.uk/portal.html\n\n— DriveSQ 🤖`);
      // Message student
      if (stuPhone) {
        await sendWA(stuPhone, `Hi ${stuName.split(' ')[0]}! 👋\n\nGreat news! DriveSQ has matched you with an instructor.\n\n──────────────\n👤 *Instructor:* ${instr.full_name}\n📞 *Their number:* ${instr.phone || 'We will be in touch'}\n──────────────\n\nThey will be in touch shortly to arrange your first lesson.\n\n📱 *Your Student Portal:* https://www.drivesq.co.uk/student.html\n\nSee you on the road! 🚗\n— DriveSQ`);
      }
      continue;
    }

    // 6–14 miles → send minimal confirm to instructor, set 5h expiry
    const expiresAt = new Date(Date.now() + AP_CONFIRM_HOURS * 3600 * 1000).toISOString();
    await sb.from('waiting_list').update({
      status: 'pending_confirm',
      instructor_id: instr.id,
      distance_miles: dist,
      confirm_status: 'pending',
      confirm_expires_at: expiresAt
    }).eq('id', entry.id);
    await auditLog({ student_name: stuName, student_phone: stuPhone, student_postcode: rawPc, lesson_type: lessonType, instructor_id: instr.id, instructor_name: instr.full_name, distance_miles: dist, action: 'confirm_sent', source, waiting_list_id: entry.id });
    await sendWA(instr.phone, `Hi ${instr.full_name}! 👋\n\nWe have a new student in *${rawPc}*, about *${dist.toFixed(1)} miles* from you.\n\n🚗 Lesson type: *${lessonType}*\n\nCan you take them? Reply *YES* or *NO*.\n\n(This request expires in ${AP_CONFIRM_HOURS} hours)\n\n— DriveSQ 🤖`);
  }

  return { processed, assigned, errors };
}

// ── Instructor yes/no reply handler ──────────────────────────────────────────
const YES_WORDS = ['yes','y','yep','yeah','yea','ok','okay','sure','confirm','confirmed','ican','cantake','1','accept'];
const NO_WORDS  = ['no','nope','n','cant','cannot','decline','declined','reject','0','sorry'];

function isYes(text: string) { const c = text.toLowerCase().replace(/[^a-z0-9]/g,''); return YES_WORDS.some(w => c === w || c.includes(w)); }
function isNo(text: string)  { const c = text.toLowerCase().replace(/[^a-z0-9]/g,''); return NO_WORDS.some(w => c === w || c.includes(w)); }

async function handleInbound(from: string, messageText: string) {
  const text = (messageText || '').trim();
  const { data: instrData } = await sb.from('instructors').select('id, full_name, phone').ilike('phone', `%${from.slice(-10)}%`).maybeSingle();

  if (instrData) {
    const { data: wlEntry } = await sb.from('waiting_list').select('*')
      .eq('instructor_id', instrData.id).eq('confirm_status', 'pending').eq('status', 'pending_confirm')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (wlEntry) {
      if (isYes(text)) {
        await createStudentProfile(instrData.id, wlEntry);
        await sb.from('waiting_list').update({ status: 'assigned', confirm_status: 'confirmed' }).eq('id', wlEntry.id);
        await auditLog({ student_name: wlEntry.student_name, student_phone: wlEntry.student_phone, student_postcode: wlEntry.postcode, lesson_type: wlEntry.lesson_type, instructor_id: instrData.id, instructor_name: instrData.full_name, distance_miles: wlEntry.distance_miles, action: 'assigned_after_confirm', source: wlEntry.source || 'website', waiting_list_id: wlEntry.id });
        await sendWA(instrData.phone, `Hi ${instrData.full_name}! 👋\n\n✅ *Confirmed! Here are the full student details:*\n\n──────────────\n👤 *Name:* ${wlEntry.student_name}\n📞 *Phone:* ${wlEntry.student_phone || 'Not provided'}\n🏠 *Postcode:* ${wlEntry.postcode}\n🚗 *Lesson type:* ${wlEntry.lesson_type || 'Manual'}\n${wlEntry.notes ? '📝 *Notes:* ' + wlEntry.notes + '\n' : ''}──────────────\n\n🔗 *Your Portal:* https://www.drivesq.co.uk/portal.html\n\n— DriveSQ 🤖`);
        if (wlEntry.student_phone) {
          await sendWA(wlEntry.student_phone, `Hi ${(wlEntry.student_name||'').split(' ')[0]}! 👋\n\nGreat news! DriveSQ has matched you with an instructor.\n\n──────────────\n👤 *Instructor:* ${instrData.full_name}\n📞 *Their number:* ${instrData.phone || 'We will be in touch'}\n──────────────\n\nThey will be in touch shortly to arrange your first lesson.\n\n📱 *Your Student Portal:* https://www.drivesq.co.uk/student.html\n\nSee you on the road! 🚗\n— DriveSQ`);
        }
        return;
      } else if (isNo(text)) {
        await sb.from('waiting_list').update({ status: 'rejected', confirm_status: 'declined' }).eq('id', wlEntry.id);
        await auditLog({ student_name: wlEntry.student_name, student_phone: wlEntry.student_phone, student_postcode: wlEntry.postcode, instructor_id: instrData.id, instructor_name: instrData.full_name, distance_miles: wlEntry.distance_miles, action: 'instructor_declined_confirm', source: wlEntry.source || 'website', waiting_list_id: wlEntry.id });
        if (wlEntry.student_phone) {
          await sendWA(wlEntry.student_phone, `Hi ${(wlEntry.student_name||'').split(' ')[0]}! 👋\n\nUnfortunately, we don't currently have any instructors available in your area.\n\nPlease contact us if you'd like us to try again in the future.\n\n— DriveSQ 🚗`);
        }
        return;
      }
    }
  }

  // Save inbound message for WA inbox
  await sb.from('whatsapp_messages').insert([{ direction: 'inbound', from_number: from, body: text, status: 'received', created_at: new Date().toISOString() }]);
}

// ── Timeout check ────────────────────────────────────────────────────────────
async function checkTimeouts(): Promise<number> {
  const { data: expired } = await sb.from('waiting_list').select('*, instructors(full_name, phone)')
    .eq('confirm_status', 'pending').eq('status', 'pending_confirm').lt('confirm_expires_at', new Date().toISOString());
  if (!expired?.length) return 0;
  await Promise.all(expired.map(async (entry: any) => {
    await sb.from('waiting_list').update({ status: 'rejected', confirm_status: 'expired' }).eq('id', entry.id);
    await auditLog({ student_name: entry.student_name, student_phone: entry.student_phone, student_postcode: entry.postcode, instructor_id: entry.instructor_id, instructor_name: entry.instructors?.full_name, distance_miles: entry.distance_miles, action: 'confirm_expired_no_reply', source: entry.source || 'website', waiting_list_id: entry.id });
    if (entry.student_phone) {
      await sendWA(entry.student_phone, `Hi ${(entry.student_name||'').split(' ')[0]}! 👋\n\nUnfortunately, we don't currently have any instructors available in your area.\n\nPlease contact us if you'd like us to try again.\n\n— DriveSQ 🚗`);
    }
  }));
  return expired.length;
}

// ── Request router ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // GET — Meta webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return new Response(challenge!, { status: 200 });
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    // Autopilot cycle
    if (url.pathname.endsWith('/autopilot')) {
      try {
        const result = await runAutopilot();
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Timeout check
    if (url.pathname.endsWith('/check-timeouts')) {
      const count = await checkTimeouts();
      return new Response(JSON.stringify({ processed: count }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Meta inbound webhook
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
    } catch (e) { console.error('Webhook error:', e); }
    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
