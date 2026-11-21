
const ENV = { WHATSAPP_TOKEN:"tok", WHATSAPP_PHONE_ID:"123", WHATSAPP_VERIFY_TOKEN:"vt", WHATSAPP_APP_SECRET:"sec", EMAIL_ADMIN_KEY:"adm", SUPABASE_URL:"https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY:"svc" };
globalThis.Deno = { env: { get: (k) => ENV[k] } };
globalThis.SEQ = 1; const uid = () => "id" + (globalThis.SEQ++);
globalThis.DB = {};
const T = (n) => (DB[n] = DB[n] || []);
const UNIQ = { auto_assign_jobs: "waiting_id" };
function builder(t) {
  const st = { f: [], op: "select", patch: null, rows: null, order: null, lim: null };
  const match = (r) => st.f.every(([k, o, v]) => o === "eq" ? String(r[k]) === String(v) : o === "neq" ? String(r[k]) !== String(v) : o === "gte" ? String(r[k]) >= String(v) : true);
  const run = () => {
    const tbl = T(t);
    if (st.op === "insert") { const out = []; for (const row of st.rows) { const u = UNIQ[t]; if (u && tbl.some((x) => String(x[u]) === String(row[u]))) return { data: null, error: { message: "duplicate key" } }; const r = { id: uid(), created_at: new Date().toISOString(), ...row }; tbl.push(r); out.push(r); } return { data: out, error: null }; }
    if (st.op === "update") { tbl.filter(match).forEach((r) => Object.assign(r, st.patch)); return { data: null, error: null }; }
    let rows = tbl.filter(match); if (st.order) rows = rows.sort((a, b) => String(a[st.order]).localeCompare(String(b[st.order]))); return { data: rows, error: null };
  };
  const o = { select: () => o, eq: (k, v) => { st.f.push([k, "eq", v]); return o; }, neq: (k, v) => { st.f.push([k, "neq", v]); return o; }, gte: (k, v) => { st.f.push([k, "gte", v]); return o; }, order: (k) => { st.order = k; return o; }, limit: () => o,
    insert: (rows) => { st.op = "insert"; st.rows = rows; return o; }, update: (p) => { st.op = "update"; st.patch = p; return o; },
    maybeSingle: async () => { const r = run(); return { data: (r.data || [])[0] || null, error: r.error }; }, single: async () => { const r = run(); return { data: (r.data || [])[0] || null, error: r.error }; },
    then: (res, rej) => Promise.resolve(run()).then(res, rej) };
  return o;
}
const createClient = () => ({ from: (t) => builder(t) });
const GEO = { "M41AA": [53.4250, -2.4500], "M139AB": [53.4655, -2.2145], "M139AA": [53.4650, -2.2150], "WA31AA": [53.4000, -2.5500], "PR11AA": [53.7600, -2.7000], "M100AA": [53.4800, -2.2400], "M130PG": [53.4600, -2.2200], "M13": [53.4600, -2.2200], "M140AA": [53.4500, -2.2300], "M14": [53.4500, -2.2300], "M200AA": [53.4100, -2.2300], "M20": [53.4100, -2.2300], "M330AA": [53.4250, -2.3200], "M33": [53.4250, -2.3200], "WA140AA": [53.3880, -2.3480], "WA14": [53.3880, -2.3480], "BL10AA": [53.5800, -2.4300], "BL1": [53.5800, -2.4300], "M10AA": [53.4800, -2.2400], "M1": [53.4800, -2.2400], "M220AA": [53.3900, -2.2700], "M22": [53.3900, -2.2700] };
globalThis.CALLS = [];
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("postcodes.io")) { const c = decodeURIComponent(u.split("/").pop()).toUpperCase(); const g = GEO[c]; return { ok: true, status: g ? 200 : 404, json: async () => g ? { result: { latitude: g[0], longitude: g[1] } } : { status: 404, result: null } }; }
  if (u.includes("osrm")) throw new Error("no osrm in test");
  if (u.includes("send-push")) { CALLS.push({ push: JSON.parse(opts.body) }); return { ok: true, status: 200, json: async () => ({}) }; }
  if (/\/messages$/.test(u)) { const b = JSON.parse(opts.body); CALLS.push({ wa: b }); return { ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid." + uid() }] }) }; }
  return { ok: true, status: 200, json: async () => ({ display_phone_number: "+44" }) };
};
AbortSignal.timeout = AbortSignal.timeout || (() => undefined);
const serve = () => {};
