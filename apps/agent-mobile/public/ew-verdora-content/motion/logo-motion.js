/* EW VERDORA — LogoMotion engine
 * 4 个独立图层:disc(白底) / rose(深蓝花形) / petals(6 片绿瓣) / core(18 尖星芒)。
 * 所有动画由单一时钟驱动(可 seek / 暂停 / 随时中断),结束后一律还原成标准 Logo。
 * 公共 API:
 *   VerdoraMotion.logoMotion.mount(host)                -> 在 host 里建好静态 Logo
 *   VerdoraMotion.logoMotion.play(host, id, opts)       -> controller {duration, seek(ms), pause(), resume(), cancel(), finished}
 *   VerdoraMotion.logoMotion.stop(host)
 * id 为 1–100(或 "01"–"100")。99 号为 Welcome 开场(见 ../welcome)。
 */
(function (R) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;
  var COL = { W: '#FFFFFF', G: '#8CB863', N: '#26255F', Au: '#D8BD86', Y: '#F5C542', R: '#E5484D', B: '#6FB1FF', O: '#FF9F43', P: '#B48CFF' };
  var EASE = { out: 'cubic-bezier(.2,.7,.2,1)', io: 'cubic-bezier(.6,0,.3,1)', sp: 'cubic-bezier(.34,1.56,.64,1)', lin: 'linear', in: 'cubic-bezier(.5,0,.9,.4)' };
  var ROSE = 'M88.5 50Q95.8 62.3 83.3 69.3Q82.7 83.5 69.3 83.3Q62.3 95.8 50 88.5Q37.7 95.8 30.8 83.3Q17.3 83.5 16.7 69.3Q4.2 62.3 11.5 50Q4.2 37.7 16.7 30.8Q17.3 16.5 30.8 16.7Q37.7 4.2 50 11.5Q62.3 4.2 69.3 16.7Q82.7 16.5 83.3 30.8Q95.8 37.7 88.5 50Z';
  var PET = 'M50 35C44 27 38.5 21 38.5 14.5A11.5 11.5 0 0 1 61.5 14.5C61.5 21 56 27 50 35Z';
  var CORE = '50,34 52,40 56,35 55,41 60,38 58,44 64,42 59,47 66,47 60,50 66,53 59,53 64,58 58,56 60,62 55,59 56,65 52,60 50,66 48,60 44,65 45,59 40,62 42,56 36,58 41,53 34,53 40,50 34,47 41,47 36,42 42,44 40,38 45,41 44,35 48,40';
  var MOTIONS = {}; // id -> {glow, dur, fn}
  var reduce = function () { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };

  function node(tag, attrs, html) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  }

  /* ---------- 静态 Logo(4 层) ---------- */
  function logoMarkup() {
    var pets = '';
    for (var i = 0; i < 6; i++) pets += '<g transform="rotate(' + (i * 60) + ' 50 50)"><g class="vl-pet"><path d="' + PET + '" fill="#8CB863"/></g></g>';
    return '<circle class="vl-disc" cx="50" cy="50" r="50" fill="#FFFFFF"/>' +
      '<path class="vl-rose" d="' + ROSE + '" fill="#26255F"/>' + pets +
      '<polygon class="vl-core" points="' + CORE + '" fill="#FFFFFF"/>';
  }

  function mount(host) {
    if (host.__vl) return host.__vl;
    host.classList.add('vl-host');
    var glow = document.createElement('div'); glow.className = 'vl-glow';
    var svg = node('svg', { viewBox: '-40 -40 180 180', class: 'vl-stage', 'aria-hidden': 'true', focusable: 'false' });
    var under = node('g', { class: 'vl-under' });
    var logo = node('g', { class: 'vl-logo' }, logoMarkup());
    var over = node('g', { class: 'vl-over' });
    svg.appendChild(node('defs'));
    svg.appendChild(under); svg.appendChild(logo); svg.appendChild(over);
    host.innerHTML = ''; host.appendChild(glow); host.appendChild(svg);
    var st = { host: host, glow: glow, svg: svg, defs: svg.firstChild, under: under, logo: logo, over: over, ctrl: null };
    host.__vl = st;
    return st;
  }

  function parts(st) {
    return {
      disc: st.logo.querySelector('.vl-disc'), rose: st.logo.querySelector('.vl-rose'),
      pets: [].slice.call(st.logo.querySelectorAll('.vl-pet')), core: st.logo.querySelector('.vl-core')
    };
  }

  function stop(host) {
    var st = host.__vl; if (st && st.ctrl) st.ctrl.cancel();
  }

  /* ---------- 播放 ---------- */
  function play(host, id, opts) {
    opts = opts || {};
    var n = +id;
    var def = MOTIONS[n];
    if (!def) throw new Error('LogoMotion: unknown id ' + id);
    var st = mount(host);
    stop(host);
    var P = parts(st);
    var anims = [], tweens = [], end = 0, t0 = 0, raf = 0, paused = !!opts.paused, now = 0, done = false, resolve;
    var finished = new Promise(function (r) { resolve = r; });

    function A(el, kf, x) {
      x = x || {};
      var d = x.d || 800, delay = x.delay || 0, it = x.it || 1;
      var a = el.animate(kf, { duration: d, delay: 0, easing: x.e || EASE.out, iterations: it, fill: 'both' });
      a.pause(); a.currentTime = 0;
      anims.push({ a: a, delay: delay, total: d * it });
      end = Math.max(end, delay + d * it);
      return a;
    }
    function tween(d, fn, delay) {
      delay = delay || 0; tweens.push({ d: d, fn: fn, delay: delay });
      end = Math.max(end, delay + d);
    }
    function add(markup, under) {
      var g = node('g', null, markup);
      (under ? st.under : st.over).appendChild(g);
      return g;
    }
    function kids(g) { return [].slice.call(g.children); }
    var c = {
      A: A, tween: tween, add: add, kids: kids, C: COL, E: EASE, svg: st.svg, defs: st.defs,
      logo: st.logo, disc: P.disc, rose: P.rose, pets: P.pets, core: P.core, over: st.over, under: st.under,
      id: function () { return 'vl' + (++uid); },
      // 把"屏幕方向的位移"换算成花瓣局部坐标(花瓣 i 外层旋转了 i*60°)
      vec: function (i, dx, dy) {
        var th = i * Math.PI / 3, cs = Math.cos(th), sn = Math.sin(th);
        return 'translate(' + (dx * cs + dy * sn).toFixed(2) + 'px,' + (-dx * sn + dy * cs).toFixed(2) + 'px)';
      },
      ripple: function (col, delay, r1, d) {
        var g = add('<circle cx="50" cy="50" r="' + (r1 || 46) + '" fill="none" stroke="' + (COL[col] || col) + '" stroke-width="2"/>');
        A(g.firstChild, [{ transform: 'scale(1)', opacity: 0.85 }, { transform: 'scale(1.9)', opacity: 0 }], { d: d || 800, delay: delay || 0 });
        return g;
      },
      burst: function (n, cols, delay, r0, r1, size, d) {
        for (var i = 0; i < n; i++) {
          var a = (i / n) * Math.PI * 2 + (i % 2) * 0.2, col = COL[cols[i % cols.length]] || cols[i % cols.length];
          var g = add('<circle cx="' + (50 + Math.cos(a) * r0) + '" cy="' + (50 + Math.sin(a) * r0) + '" r="' + (size || 2) + '" fill="' + col + '"/>');
          A(g.firstChild, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * (r1 - r0)) + 'px,' + (Math.sin(a) * (r1 - r0)) + 'px) scale(.3)', opacity: 0 }], { d: d || 800, delay: (delay || 0) + (i % 3) * 30 });
        }
      },
      clone: function () { var g = st.logo.cloneNode(true); g.setAttribute('class', 'vl-logo vl-clone'); st.over.appendChild(g); return g; },
      setLogoStyle: function (k, v) { st.logo.style[k] = v; },
      glow: function (col, peak) { c._glow = col; c._peak = peak; },
      _glow: def.glow, _peak: 0.85
    };
    def.fn(c);
    end = Math.max(end, def.dur || 0);

    // 背光(与开场一致的语言)
    st.glow.style.setProperty('--vl-glow', COL[c._glow] || c._glow || COL.G);
    var gl = st.glow.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: c._peak, transform: 'scale(1.05)', offset: 0.4 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: end, easing: 'ease-in-out', fill: 'both' });
    gl.pause(); anims.push({ a: gl, delay: 0, total: end });

    function seek(t) {
      now = t;
      anims.forEach(function (o) { o.a.currentTime = Math.max(0, Math.min(t - o.delay, o.total)); });
      tweens.forEach(function (w) { var p = (t - w.delay) / w.d; w.fn(Math.max(0, Math.min(1, p))); });
    }
    function cleanup() {
      if (done) return; done = true; cancelAnimationFrame(raf);
      anims.forEach(function (o) { try { o.a.cancel(); } catch (e) { } });
      st.over.innerHTML = ''; st.under.innerHTML = ''; st.defs.innerHTML = '';
      st.logo.removeAttribute('style');
      [P.disc, P.rose, P.core].concat(P.pets).forEach(function (e) { e.removeAttribute('style'); });
      st.glow.style.opacity = 0;
      st.ctrl = null;
      resolve(true);
    }
    function tick(ts) {
      if (done) return;
      if (!t0) t0 = ts - now;
      if (!paused) { now = ts - t0; seek(now); } else { t0 = ts - now; }
      if (now >= end) { seek(end); if (!opts.hold) cleanup(); return; }
      raf = requestAnimationFrame(tick);
    }

    var ctrl = { id: n, duration: end, seek: function (t) { seek(t); }, pause: function () { paused = true; }, resume: function () { paused = false; }, cancel: cleanup, finished: finished };
    st.ctrl = ctrl;

    if (reduce() && !opts.force) {
      // 降级:150ms 淡入淡出
      cleanup();
      st.ctrl = null;
      var fade = st.logo.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
      ctrl.duration = 150; ctrl.finished = new Promise(function (r) { fade.onfinish = function () { r(true); }; });
      return ctrl;
    }
    seek(0);
    raf = requestAnimationFrame(tick);
    return ctrl;
  }

  function reg(id, glow, dur, fn) { MOTIONS[id] = { glow: glow, dur: dur, fn: fn }; }

  var api = R.logoMotion = R.logoMotion || {};
  api.mount = mount; api.play = play; api.stop = stop; api.reg = reg;
  api.COL = COL; api.EASE = EASE;
  api.count = function () { return Object.keys(MOTIONS).length; };
  api.ids = function () { return Object.keys(MOTIONS).map(Number).sort(function (a, b) { return a - b; }); };
  api.source = function (id) { return MOTIONS[id] ? String(MOTIONS[id].fn) : null; };
  api.logoMarkup = logoMarkup;
  api.paths = { ROSE: ROSE, PET: PET, CORE: CORE };
})(window.VerdoraMotion = window.VerdoraMotion || {});
