/* EW VERDORA Welcome 开场:暗场背光 → "welcome to" → EW VERDORA 逐字 → Logo 生长 + 100 点环 → 个性化问候 → UI 显影。
 * 用法:VerdoraMotion.welcome.run({ name, lang:'en'|'zh', insight, onDone, force }) → { skip(), done:Promise }
 * 规则:同一会话只播完整版一次(sessionStorage),之后 1.2s 简版;prefers-reduced-motion → 300ms 淡入;点击/滑动/按键可跳过。 */
(function (R) {
  'use strict';
  var T = {
    en: { welcome: 'welcome to', brand: 'EW VERDORA', am: 'good morning', pm: 'good afternoon', eve: 'good evening', skip: 'tap to skip', insight: 'your ai coach has 3 actions ready for today' },
    zh: { welcome: 'welcome to', brand: 'EW VERDORA', am: '早上好', pm: '下午好', eve: '晚上好', skip: '点击跳过', insight: 'AI 教练已为你准备好今日 3 个行动' }
  };
  var KEY = 'ewv.welcome.seen';
  function seen() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function mark() { try { sessionStorage.setItem(KEY, '1'); } catch (e) { } }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function A(e, kf, o) { return e.animate(kf, { duration: o.d, delay: o.delay || 0, easing: o.e || 'cubic-bezier(.22,1,.36,1)', fill: 'both' }); }

  function run(o) {
    o = o || {};
    var lang = o.lang === 'zh' ? 'zh' : 'en', t = T[lang];
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var short = !o.force && seen();
    var h = new Date().getHours(), part = h < 12 ? t.am : h < 18 ? t.pm : t.eve;
    var root = el('div', 'vw-root'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'EW VERDORA');
    var orbs = ['g', 'n', 'a'].map(function (c) { var d = el('div', 'vw-orb ' + c); root.appendChild(d); return d; });
    var col = el('div', 'vw-col'); root.appendChild(col);
    var small = el('div', 'vw-small', t.welcome);
    var title = el('div', 'vw-title up'); var letters = t.brand.split('').map(function (ch) { var s = el('span', '', ch === ' ' ? ' ' : ch); title.appendChild(s); return s; });
    var logoHost = el('div', 'vw-logo'); logoHost.style.cssText += ''; 
    var hello = el('div', 'vw-hello', part + (o.name ? ', ' + o.name : '') + '.');
    var insight = el('div', 'vw-insight', o.insight || t.insight);
    col.appendChild(small); col.appendChild(title); col.appendChild(logoHost); col.appendChild(hello); col.appendChild(insight);
    root.appendChild(el('div', 'vw-skip', t.skip));
    document.body.appendChild(root);

    var LM = R.logoMotion, anims = [], ctrl = null, finished = false, timers = [];
    var resolve; var doneP = new Promise(function (r) { resolve = r; });
    if (LM) LM.mount(logoHost);

    function finish() {
      if (finished) return; finished = true;
      timers.forEach(clearTimeout); anims.forEach(function (a) { try { a.cancel(); } catch (e) { } });
      if (ctrl) try { ctrl.cancel(); } catch (e) { }
      window.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', onKey);
      mark(); root.classList.add('out');
      setTimeout(function () { root.remove(); if (o.onDone) o.onDone(); resolve(); }, reduced ? 300 : 620);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(); }
    function onMove(e) {
      var x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
      orbs.forEach(function (b, i) { b.style.translate = (x * (24 + i * 18)) + 'px ' + (y * (24 + i * 18)) + 'px'; });
    }
    root.addEventListener('click', finish); root.addEventListener('touchmove', finish, { passive: true });
    window.addEventListener('keydown', onKey); if (!reduced) window.addEventListener('pointermove', onMove);

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    if (reduced) {
      [small, title, logoHost, hello, insight].forEach(function (e) { e.style.opacity = 1; });
      letters.forEach(function (s) { s.style.cssText = 'opacity:1;transform:none;filter:none'; });
      later(finish, 300);
    } else if (short) {
      orbs.forEach(function (b) { anims.push(A(b, [{ opacity: 0 }, { opacity: .35 }], { d: 500 })); });
      letters.forEach(function (s, i) { anims.push(A(s, [{ opacity: 0, transform: 'translateY(.35em)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { d: 420, delay: i * 25 })); });
      anims.push(A(logoHost, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { d: 500, delay: 100 }));
      anims.push(A(hello, [{ opacity: 0 }, { opacity: 1 }], { d: 400, delay: 350 }));
      small.style.display = 'none'; insight.style.display = 'none';
      later(finish, 1200);
    } else {
      orbs.forEach(function (b, i) { anims.push(A(b, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: i === 1 ? .55 : .4, transform: 'scale(1)' }], { d: 1800, delay: i * 250 })); });
      anims.push(A(small, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: .85, transform: 'none' }], { d: 700, delay: 350 }));
      letters.forEach(function (s, i) { anims.push(A(s, [{ opacity: 0, transform: 'translateY(.35em)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { d: 600, delay: 800 + i * 70 })); });
      anims.push(A(logoHost, [{ opacity: 0 }, { opacity: 1 }], { d: 300, delay: 1600 }));
      later(function () { if (!finished && LM) ctrl = LM.play(logoHost, 99, {}); }, 1650);
      anims.push(A(hello, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { d: 700, delay: 4300 }));
      anims.push(A(insight, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: .8, transform: 'none' }], { d: 700, delay: 4700 }));
      later(finish, 6400);
    }
    return { skip: finish, done: doneP, root: root };
  }
  R.welcome = { run: run, seen: seen, reset: function () { try { sessionStorage.removeItem(KEY); } catch (e) { } } };
})(window.VerdoraMotion = window.VerdoraMotion || {});
