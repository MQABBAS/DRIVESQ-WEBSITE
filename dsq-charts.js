/* DriveSQ charts (v1) — tiny dependency-free animated charts for the test-centre data pages.
   DSQCharts.line(el, {series:[{name,color,dash,pts:[[label,value],...]}], min, max, unit})
   DSQCharts.bars(el, [{label, value, note, hi}], {max, unit, digits})
   [data-count] elements count up to their value when they scroll into view. */
(function () {
  if (window.DSQCharts) return;
  var css = '.dsqc-wrap{position:relative;width:100%}.dsqc-svg{width:100%;height:auto;display:block;overflow:visible}' +
    '.dsqc-path{fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;transition:stroke-dashoffset 1.6s cubic-bezier(.2,.7,.2,1)}' +
    '.dsqc-dot{transition:opacity .4s ease 1.2s;opacity:0}.dsqc-in .dsqc-dot{opacity:1}' +
    '.dsqc-axis{font:11px Inter,system-ui,sans-serif;fill:#777}.dsqc-grid{stroke:rgba(0,0,0,.08);stroke-width:1}' +
    '.dsqc-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:.8rem;margin-top:6px}.dsqc-legend i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}' +
    '.dsqc-tip{position:absolute;pointer-events:none;background:#111;color:#fff;font-size:.75rem;padding:5px 8px;border-radius:6px;white-space:nowrap;transform:translate(-50%,-120%);opacity:0;transition:opacity .15s}' +
    '.dsqc-bars{display:flex;flex-direction:column;gap:8px}.dsqc-row{display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;gap:10px;align-items:center;font-size:.85rem}' +
    '.dsqc-track{height:14px;background:rgba(0,0,0,.06);border-radius:999px;overflow:hidden}.dsqc-fill{height:100%;width:0;border-radius:999px;background:#9ca3af;transition:width 1.2s cubic-bezier(.2,.7,.2,1)}' +
    '.dsqc-row.hi .dsqc-fill{background:linear-gradient(90deg,#D10A11,#ff4d55)}.dsqc-row.hi b{color:#D10A11}.dsqc-val{font-weight:700;min-width:52px;text-align:right}' +
    '.dsqc-note{display:block;font-size:.72rem;color:#888;font-weight:400}' +
    '@media (prefers-reduced-motion:reduce){.dsqc-path,.dsqc-fill,.dsqc-dot{transition:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function onView(el, fn) {
    if (!window.IntersectionObserver) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: 0.25 });
    io.observe(el);
  }
  function fmt(v, d) { return v == null ? '—' : Number(v).toFixed(d == null ? 1 : d); }

  function line(el, o) {
    var W = 640, H = 260, L = 38, R = 12, Tp = 12, B = 30;
    var labels = o.series[0].pts.map(function (p) { return p[0]; });
    var vals = []; o.series.forEach(function (s) { s.pts.forEach(function (p) { if (p[1] != null) vals.push(p[1]); }); });
    var min = o.min != null ? o.min : Math.floor(Math.min.apply(null, vals) / 5) * 5 - 5, max = o.max != null ? o.max : Math.ceil(Math.max.apply(null, vals) / 5) * 5 + 5;
    var x = function (i) { return L + (W - L - R) * (labels.length < 2 ? 0.5 : i / (labels.length - 1)); };
    var y = function (v) { return Tp + (H - Tp - B) * (1 - (v - min) / (max - min)); };
    var g = '';
    var raw = (max - min) / 6, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), stp = [1, 2, 2.5, 5, 10].map(function (k) { return k * mag; }).filter(function (k) { return k >= raw; })[0] || 10;
    for (var t = Math.ceil(min / stp) * stp; t <= max + 1e-9; t += stp) g += '<line class="dsqc-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="dsqc-axis" x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + (o.unit || '') + '</text>';
    var step = Math.ceil(labels.length / 7);
    labels.forEach(function (lb, i) { if (i % step === 0 || i === labels.length - 1) g += '<text class="dsqc-axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + lb + '</text>'; });
    var paths = '', dots = '';
    o.series.forEach(function (s) {
      var d = '', started = false;
      s.pts.forEach(function (p, i) { if (p[1] == null) { started = false; return; } d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[1]).toFixed(1); started = true; dots += '<circle class="dsqc-dot" cx="' + x(i) + '" cy="' + y(p[1]) + '" r="' + (s.dash ? 2.5 : 3.5) + '" fill="' + s.color + '" data-t="' + s.name + ' · ' + p[0] + ': ' + fmt(p[1], o.digits) + (o.unit || '') + '"/>'; });
      paths += '<path class="dsqc-path" d="' + d + '" stroke="' + s.color + '"' + (s.dash ? ' stroke-dasharray="6 5" data-dash="1"' : '') + '/>';
    });
    el.innerHTML = '<div class="dsqc-wrap"><svg class="dsqc-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (o.label || 'Chart') + '">' + g + paths + dots + '</svg><div class="dsqc-tip"></div></div>' +
      '<div class="dsqc-legend">' + o.series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.name + '</span>'; }).join('') + '</div>';
    var svg = el.querySelector('svg'), tip = el.querySelector('.dsqc-tip');
    [].forEach.call(svg.querySelectorAll('.dsqc-path'), function (p) { if (p.getAttribute('data-dash')) return; var len = p.getTotalLength ? p.getTotalLength() : 1000; p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
    svg.addEventListener('mousemove', function (e) {
      var t = e.target; if (!t.getAttribute || !t.getAttribute('data-t')) { tip.style.opacity = 0; return; }
      var r = el.querySelector('.dsqc-wrap').getBoundingClientRect(); tip.textContent = t.getAttribute('data-t'); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.style.opacity = 1;
    });
    svg.addEventListener('mouseleave', function () { tip.style.opacity = 0; });
    onView(el, function () { el.classList.add('dsqc-in'); [].forEach.call(svg.querySelectorAll('.dsqc-path'), function (p) { p.style.strokeDashoffset = 0; }); });
  }

  function bars(el, items, o) {
    o = o || {};
    var max = o.max || Math.max.apply(null, items.map(function (i) { return i.value || 0; })) * 1.05;
    el.innerHTML = '<div class="dsqc-bars">' + items.map(function (i) {
      return '<div class="dsqc-row' + (i.hi ? ' hi' : '') + '"><b>' + i.label + (i.note ? '<span class="dsqc-note">' + i.note + '</span>' : '') + '</b><div class="dsqc-track"><div class="dsqc-fill" data-w="' + (100 * (i.value || 0) / max).toFixed(1) + '"></div></div><span class="dsqc-val">' + fmt(i.value, o.digits) + (o.unit || '') + '</span></div>';
    }).join('') + '</div>';
    onView(el, function () { [].forEach.call(el.querySelectorAll('.dsqc-fill'), function (f, k) { setTimeout(function () { f.style.width = f.getAttribute('data-w') + '%'; }, k * 70); }); });
  }

  function counters(root) {
    [].forEach.call((root || document).querySelectorAll('[data-count]'), function (el) {
      var to = parseFloat(el.getAttribute('data-count')), d = +(el.getAttribute('data-digits') || 0), suf = el.getAttribute('data-suffix') || '';
      el.textContent = (0).toFixed(d) + suf;
      onView(el, function () {
        var t0 = null, dur = 1200;
        function step(ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }) + suf; if (k < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      });
    });
  }
  window.DSQCharts = { line: line, bars: bars, counters: counters };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { counters(); }); else counters();
})();
