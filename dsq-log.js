/* DriveSQ activity log — one place that records who did what (admin, instructor, system).
   DSQLog.add(sb, { area, action, summary, role, actor, instrId, student, refId, before, after })
   If the table does not exist yet, entries wait in this browser and are sent once it does. */
(function () {
  'use strict';
  var Q = 'dsq_log_queue', missing = false;
  function queue(row) { try { var q = JSON.parse(localStorage.getItem(Q) || '[]'); q.push(row); localStorage.setItem(Q, JSON.stringify(q.slice(-300))); } catch (e) { } }
  function toRow(o) { return { area: o.area || null, action: o.action || null, summary: o.summary || null, actor_role: o.role || 'admin', actor_name: o.actor || null, instructor_id: o.instrId != null ? String(o.instrId) : null, student_name: o.student || null, ref_id: o.refId != null ? String(o.refId) : null, before: o.before || null, after: o.after || null }; }
  async function add(sb, o) {
    var row = toRow(o || {});
    try {
      if (!sb) throw new Error('no client');
      var r = await sb.from('admin_activity_log').insert(row);
      if (r.error) { if (/does not exist|relation|schema cache/i.test(r.error.message || '')) { missing = true; queue(Object.assign({ _t: new Date().toISOString() }, row)); } return false; }
      flush(sb); return true;
    } catch (e) { queue(Object.assign({ _t: new Date().toISOString() }, row)); return false; }
  }
  async function flush(sb) {
    if (missing) return; var q = []; try { q = JSON.parse(localStorage.getItem(Q) || '[]'); } catch (e) { } if (!q.length) return;
    try { var r = await sb.from('admin_activity_log').insert(q.map(function (x) { var y = Object.assign({}, x); if (y._t) { y.created_at = y._t; delete y._t; } return y; })); if (!r.error) localStorage.removeItem(Q); } catch (e) { }
  }
  async function list(sb, opt) {
    opt = opt || {}; try { var q = sb.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(opt.limit || 60); if (opt.instrId) q = q.eq('instructor_id', String(opt.instrId)); if (opt.area) q = q.eq('area', opt.area); var r = await q; if (r.error) { missing = /does not exist|relation|schema cache/i.test(r.error.message || ''); return { rows: [], missing: missing }; } return { rows: r.data || [], missing: false }; } catch (e) { return { rows: [], missing: false }; }
  }
  window.DSQLog = { add: add, list: list, flush: flush, isMissing: function () { return missing; } };
})();
