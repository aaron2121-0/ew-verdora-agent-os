/* LogoMotion 51–100:D 钱包(续) / E AI 教练 / F 培训考试 / G 等级 KPI / H 报价订单 / I Owner / J 系统。 */
(function (R) {
  'use strict';
  var L = R.logoMotion, reg = L.reg, E = L.EASE, P = L.paths;
  function dash() { return 'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" fill="none" stroke-linecap="round" stroke-linejoin="round"'; }
  function draw(c, el, delay, d) { c.A(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { d: d || 700, delay: delay || 0, e: E.io }); }
  function pop(c, el, delay, d) { c.A(el, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { d: d || 420, delay: delay || 0, e: E.sp }); }
  function pt(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r, a0, a1) { var p0 = pt(cx, cy, r, a0), p1 = pt(cx, cy, r, a1); return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2); }
  function star4(x, y, s, col) { return '<path d="M' + x + ' ' + (y - s) + ' Q' + x + ' ' + y + ' ' + (x + s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + s) + ' Q' + x + ' ' + y + ' ' + (x - s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - s) + 'Z" fill="' + col + '"/>'; }
  function pips(c, n, col) {
    for (var i = 0; i < 4; i++) {
      var d = c.add('<circle cx="' + (24 + i * 17.3) + '" cy="120" r="4.5" fill="' + (i < n ? col : 'rgba(255,255,255,.2)') + '"/>');
      if (i < n) c.A(d.firstChild, [{ opacity: .2, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.4)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { d: 450, delay: 150 + i * 300, e: E.sp });
    }
  }
  function lit(c, idx, delayBase, step) {
    c.pets.forEach(function (p, i) {
      var on = idx.indexOf(i) >= 0;
      if (on) c.A(p, [{ opacity: .22, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1.16)', offset: .55 }, { opacity: 1, transform: 'scale(1)' }], { d: 1000, delay: delayBase + idx.indexOf(i) * step, e: E.sp });
      else c.A(p, [{ opacity: 1 }, { opacity: .22, offset: .2 }, { opacity: .22, offset: .8 }, { opacity: 1 }], { d: 2300, e: E.lin });
    });
  }

  /* ---------- D 钱包(续) 51–52 ---------- */
  reg(51, 'Au', 2500, function (c) {
    var m = c.add('<polygon points="-14,134 38,86 58,104 82,66 114,134" fill="rgba(255,255,255,.12)" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/><polygon points="82,66 92,82 72,82" fill="#FFFFFF" opacity=".85"/>');
    c.A(m, [{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { d: 700, e: E.out });
    var pole = c.add('<line x1="82" y1="66" x2="82" y2="34" stroke="#D8BD86" stroke-width="2.4" ' + dash().replace('fill="none"', '') + '/>');
    draw(c, pole.firstChild, 900, 500);
    var flag = c.add('<polygon points="82,34 106,41 82,50" fill="#8CB863" stroke="#FFFFFF" stroke-width="1"/>');
    flag.style.transformOrigin = '0% 50%';
    c.A(flag, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1, offset: .25 }, { transform: 'skewY(-8deg)', offset: .5 }, { transform: 'skewY(7deg)', offset: .75 }, { transform: 'skewY(0)', opacity: 1 }], { d: 1200, delay: 1300, e: E.io });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translate(-6px,-6px) scale(.8)', offset: .3 }, { transform: 'translate(-6px,-12px) scale(.8)', offset: .75 }, { transform: 'scale(1.06)', offset: .92 }, { transform: 'none' }], { d: 2400, e: E.io });
    c.burst(10, ['Au', 'W'], 1300, 20, 40, 1.8, 700);
  });

  reg(52, 'G', 2300, function (c) {
    var sh = c.add('<path d="M50 -12 L100 6 V52 C100 82 76 98 50 108 C24 98 0 82 0 52 V6Z" stroke="#8CB863" stroke-width="3.2" ' + dash() + '/>');
    draw(c, sh.firstChild, 100, 1200);
    var fill = c.add('<path d="M50 -12 L100 6 V52 C100 82 76 98 50 108 C24 98 0 82 0 52 V6Z" fill="#8CB863"/>', true);
    c.A(fill, [{ opacity: 0 }, { opacity: .2 }], { d: 700, delay: 900 });
    [[-6, 4, 6], [104, 10, 5], [-10, 84, 5], [108, 88, 7]].forEach(function (s, i) {
      var st = c.add(star4(s[0], s[1], s[2], '#FFFFFF'));
      c.A(st, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1.3) rotate(45deg)', opacity: 1, offset: .5 }, { transform: 'scale(.7) rotate(90deg)', opacity: .8 }], { d: 800, delay: 1100 + i * 180, it: 2, e: E.out });
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.94)', offset: .45 }, { transform: 'scale(1.03)', offset: .85 }, { transform: 'none' }], { d: 2200 });
  });

  /* ---------- E AI 教练 53–62 ---------- */
  reg(53, 'B', 2400, function (c) {
    var nodes = []; for (var i = 0; i < 8; i++) nodes.push(pt(50, 50, 66, i * 45 - 90));
    var links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [0, 4], [2, 6], [1, 5], [3, 7]];
    links.forEach(function (l, i) {
      var a = nodes[l[0]], b = nodes[l[1]];
      var g = c.add('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#6FB1FF" stroke-width="1.2" ' + dash().replace('fill="none"', '') + '/>');
      draw(c, g.firstChild, 300 + i * 90, 500); c.A(g, [{ opacity: .9 }, { opacity: .9, offset: .8 }, { opacity: .35 }], { d: 2200 });
    });
    nodes.forEach(function (n, i) {
      var g = c.add('<circle cx="' + n[0] + '" cy="' + n[1] + '" r="4.2" fill="#FFFFFF" stroke="#6FB1FF" stroke-width="1.6"/>');
      c.A(g.firstChild, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.5)', opacity: 1, offset: .5 }, { transform: 'scale(1)', opacity: 1 }], { d: 500, delay: 200 + i * 110, e: E.sp });
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.06)', offset: .5 }, { transform: 'none' }], { d: 1800, delay: 500, e: E.io });
  });

  reg(54, 'P', 2400, function (c) {
    for (var i = 0; i < 13; i++) {
      var h = 10 + Math.abs(Math.sin(i * 1.7)) * 22;
      var b = c.add('<rect x="' + (-12 + i * 9.6) + '" y="' + (118 - h / 2) + '" width="5" height="' + h + '" rx="2.5" fill="' + (i % 3 === 0 ? '#B48CFF' : '#FFFFFF') + '"/>');
      c.A(b, [{ transform: 'scaleY(.15)', opacity: .4 }, { transform: 'scaleY(1)', opacity: 1, offset: .35 }, { transform: 'scaleY(.35)', opacity: .8, offset: .6 }, { transform: 'scaleY(.9)', opacity: 1, offset: .82 }, { transform: 'scaleY(.2)', opacity: .5 }], { d: 700 + (i % 4) * 90, delay: 100 + i * 45, it: 3, e: E.io });
    }
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.035)', offset: .2 }, { transform: 'scale(.99)', offset: .4 }, { transform: 'scale(1.03)', offset: .6 }, { transform: 'scale(.99)', offset: .8 }, { transform: 'none' }], { d: 2200 });
  });

  reg(55, 'B', 2500, function (c) {
    [0, 60, 120].forEach(function (a, i) {
      var g = c.add('<g transform="translate(50 50) rotate(' + a + ') scale(1 .38)"><circle r="64" fill="none" stroke="rgba(111,177,255,.4)" stroke-width="1.6"/><g class="s"><circle cx="64" cy="0" r="5" fill="' + ['#FFFFFF', '#6FB1FF', '#8CB863'][i] + '"/></g></g>');
      var s = g.firstChild.querySelector('.s');
      s.style.transformBox = 'view-box'; s.style.transformOrigin = '0px 0px';
      c.A(s, [{ transform: 'rotate(' + (i * 120) + 'deg)' }, { transform: 'rotate(' + (i * 120 + 720) + 'deg)' }], { d: 2300, e: E.io });
      c.A(g, [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2400 });
    });
    c.A(c.core, [{ transform: 'none' }, { transform: 'scale(1.25) rotate(60deg)', offset: .5 }, { transform: 'none' }], { d: 2200, e: E.io });
    c.A(c.rose, [{ transform: 'none' }, { transform: 'scale(.97)', offset: .5 }, { transform: 'none' }], { d: 2200, e: E.io });
  });

  reg(56, 'G', 2500, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-10px) scale(.9)' }, { transform: 'translateY(-8px) scale(.9)', offset: .9 }, { transform: 'none' }], { d: 2400, e: E.io });
    var bub = c.add('<rect x="-12" y="92" width="124" height="42" rx="14" fill="rgba(140,184,99,.14)" stroke="#8CB863" stroke-width="1.6"/>');
    pop(c, bub.firstChild, 100, 450);
    var rows = [[0, 40, 22, 100], [1, 30, 22, 108]];
    var widths = [14, 22, 10, 26, 16, 12, 20, 14];
    var x = -2, y = 100, k = 0;
    widths.forEach(function (w, i) {
      if (x + w > 102) { x = -2; y += 12; }
      var t = c.add('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="6" rx="3" fill="#FFFFFF" opacity=".9"/>');
      t.style.transformOrigin = '0% 50%';
      c.A(t, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: .95 }], { d: 260, delay: 650 + i * 190, e: E.out });
      x += w + 5; k++;
    });
    var sh = c.add('<rect x="-30" y="90" width="22" height="46" fill="#FFFFFF" opacity=".25"/>');
    c.A(sh, [{ transform: 'translateX(0) skewX(-18deg)', opacity: 0 }, { transform: 'translateX(60px) skewX(-18deg)', opacity: .6, offset: .5 }, { transform: 'translateX(160px) skewX(-18deg)', opacity: 0 }], { d: 1400, delay: 700 });
  });

  reg(57, 'R', 2400, function (c) {
    var sd = 'M50 12 L84 25 V52 C84 71 68 84 50 92 C32 84 16 71 16 52 V25Z';
    var sh = c.add('<path d="' + sd + '" fill="rgba(229,72,77,.2)" stroke="#E5484D" stroke-width="3.4" stroke-linejoin="round"/>');
    c.A(sh, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .2 }, { transform: 'scale(1)', opacity: 1 }], { d: 600, e: E.sp });
    c.A(sh.firstChild, [{ stroke: '#E5484D', fill: 'rgba(229,72,77,.2)' }, { stroke: '#E5484D', fill: 'rgba(229,72,77,.2)', offset: .45 }, { stroke: '#8CB863', fill: 'rgba(140,184,99,.25)', offset: .62 }, { stroke: '#8CB863', fill: 'rgba(140,184,99,.25)' }], { d: 1800, delay: 300 });
    c.A(sh, [{ opacity: 1 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { d: 2300 });
    var bm = c.add('<rect x="10" y="-1" width="80" height="3" rx="1.5" fill="#E5484D"/>');
    c.A(bm, [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'translateY(18px)', opacity: 1, offset: .1 }, { transform: 'translateY(84px)', opacity: 1, offset: .9 }, { transform: 'translateY(84px)', opacity: 0 }], { d: 1000, delay: 300, e: E.io });
    var ck = c.add('<path d="M36 54 L47 65 L67 40" stroke="#8CB863" stroke-width="6.5" ' + dash() + '/>');
    draw(c, ck.firstChild, 1250, 450); c.A(ck, [{ opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { d: 2200 });
    var bad = c.add('<rect x="8" y="104" width="84" height="7" rx="3.5" fill="#E5484D"/><line x1="4" y1="107.5" x2="96" y2="107.5" stroke="#FFFFFF" stroke-width="2"/>');
    bad.style.transformOrigin = '0% 50%';
    c.A(bad, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: .3 }, { transform: 'scaleX(1)', opacity: 1, offset: .6 }, { transform: 'scaleX(1)', opacity: 0, offset: .66 }, { opacity: 0 }], { d: 1500, delay: 300, e: E.out });
    var good = c.add('<rect x="8" y="104" width="62" height="7" rx="3.5" fill="#8CB863"/><rect x="8" y="116" width="40" height="5" rx="2.5" fill="rgba(255,255,255,.7)"/>');
    good.style.transformOrigin = '0% 50%';
    c.A(good, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1 }], { d: 650, delay: 1500, e: E.out });
    c.A(good, [{ opacity: 1 }, { opacity: 0 }], { d: 300, delay: 2100 });
  });

  reg(58, 'O', 2500, function (c) {
    c.add('<line x1="-12" y1="106" x2="112" y2="106" stroke="rgba(255,255,255,.35)" stroke-width="1.6"/><path d="M-8 106 A58 58 0 0 1 108 106" fill="none" stroke="rgba(255,159,67,.45)" stroke-width="1.6" stroke-dasharray="2 4"/>');
    var sun = c.add('<g class="o"><circle cx="50" cy="48" r="13" fill="#FF9F43" opacity=".35"/><circle cx="50" cy="48" r="7.5" fill="#F5C542"/></g>');
    var o = sun.firstChild; o.style.transformBox = 'view-box'; o.style.transformOrigin = '50px 106px';
    c.A(o, [{ transform: 'rotate(-90deg)', opacity: 0 }, { transform: 'rotate(-80deg)', opacity: 1, offset: .08 }, { transform: 'rotate(80deg)', opacity: 1, offset: .92 }, { transform: 'rotate(90deg)', opacity: 0 }], { d: 2300, e: E.io });
    c.A(c.logo, [{ filter: 'sepia(0) saturate(1)' }, { filter: 'sepia(.45) saturate(1.5) brightness(1.08)', offset: .5 }, { filter: 'none' }], { d: 2400, e: E.io });
  });

  reg(59, 'P', 2400, function (c) {
    c.A(c.logo, [{ opacity: 1 }, { opacity: .3, offset: .15 }, { opacity: .3, offset: .8 }, { opacity: 1 }], { d: 2400 });
    var bd = c.add('<circle cx="50" cy="50" r="30" fill="#26255F" stroke="#B48CFF" stroke-width="3"/>');
    pop(c, bd.firstChild, 0, 400);
    c.A(bd, [{ opacity: 1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2400 });
    var en = c.add('<text x="50" y="58" text-anchor="middle" font-size="24" font-weight="700" fill="#FFFFFF">EN</text>');
    c.A(en, [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: 1, offset: .3 }, { transform: 'scaleX(0)', opacity: 0, offset: .31 }, { opacity: 0, offset: .64 }, { transform: 'scaleX(0)', opacity: 1, offset: .65 }, { transform: 'scaleX(1)', opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2400, delay: 300, e: E.io });
    var zh = c.add('<text x="50" y="60" text-anchor="middle" font-size="26" font-weight="700" fill="#FFFFFF">中</text>');
    c.A(zh, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(0)', opacity: 0, offset: .3 }, { transform: 'scaleX(1)', opacity: 1, offset: .5 }, { transform: 'scaleX(1)', opacity: 1, offset: .6 }, { transform: 'scaleX(0)', opacity: 0, offset: .64 }, { opacity: 0 }], { d: 2400, delay: 300, e: E.io });
    var rg = c.add('<circle cx="50" cy="50" r="40" fill="none" stroke="#B48CFF" stroke-width="2" stroke-dasharray="4 6"/>');
    c.A(rg, [{ transform: 'rotate(0)', opacity: .9 }, { transform: 'rotate(360deg)', opacity: .9 }], { d: 2400, e: E.io });
  });

  reg(60, 'N', 2600, function (c) {
    c.A(c.logo, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.72)', offset: .15 }, { filter: 'grayscale(1) brightness(.72)', offset: .7 }, { filter: 'none', transform: 'scale(1.08)', offset: .88 }, { filter: 'none', transform: 'none' }], { d: 2500, e: E.io });
    c.add('<circle cx="50" cy="50" r="58" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/>');
    var rg = c.add('<circle cx="50" cy="50" r="58" stroke="#8CB863" stroke-width="4" transform="rotate(-90 50 50)" ' + dash() + '/>');
    draw(c, rg.firstChild, 450, 1500);
    var lk = c.add('<rect x="82" y="2" width="22" height="17" rx="3.5" fill="#D8BD86"/><path d="M87 2 V-3 a6 6 0 0 1 12 0 V2" fill="none" stroke="#D8BD86" stroke-width="3.4"/>');
    c.A(lk, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .2 }, { transform: 'scale(1)', opacity: 1, offset: .75 }, { transform: 'scale(1.6) rotate(-14deg)', opacity: 0 }], { d: 2400, e: E.sp });
    c.ripple('G', 1950, 58, 700);
  });

  reg(61, 'G', 2300, function (c) {
    var chip = c.add('<rect x="-30" y="-6" width="52" height="18" rx="9" fill="#8CB863"/><rect x="-22" y="1" width="30" height="3" rx="1.5" fill="#FFFFFF"/><rect x="-22" y="7" width="18" height="2.6" rx="1.3" fill="rgba(255,255,255,.75)"/>');
    c.A(chip, [{ transform: 'translate(-60px,-24px) scale(1)', opacity: 0 }, { transform: 'translate(-40px,-30px) scale(1)', opacity: 1, offset: .2 }, { transform: 'translate(46px,56px) scale(.15)', opacity: 0, offset: .6 }, { opacity: 0 }], { d: 1300, e: E.in });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'none', offset: .55 }, { transform: 'scale(1.14)', offset: .65 }, { transform: 'scale(.96)', offset: .78 }, { transform: 'none' }], { d: 1500, delay: 100, e: E.io });
    var msg = c.add('<rect x="30" y="38" width="38" height="16" rx="8" fill="#FFFFFF"/><rect x="38" y="44" width="22" height="3" rx="1.5" fill="#26255F"/>');
    c.A(msg, [{ transform: 'translate(0,0) scale(.2)', opacity: 0 }, { transform: 'translate(0,0) scale(.2)', opacity: 0, offset: .1 }, { transform: 'translate(40px,-20px) scale(.8)', opacity: 1, offset: .35 }, { transform: 'translate(96px,-46px) scale(.8)', opacity: 0 }], { d: 1000, delay: 1250, e: E.out });
    c.ripple('G', 1300, 46, 700);
  });

  reg(62, 'B', 2400, function (c) {
    var ws = [66, 52, 74, 44, 60], ys = [-26, -14, 112, 124, 136];
    ws.forEach(function (w, i) {
      var b = c.add('<rect x="' + (50 - w / 2) + '" y="' + ys[i] + '" width="' + w + '" height="5" rx="2.5" fill="#FFFFFF" opacity=".9"/>');
      var ty = 50 - ys[i];
      c.A(b, [{ transform: 'translate(0,0) scaleX(1)', opacity: 0 }, { transform: 'translate(0,0) scaleX(1)', opacity: .9, offset: .2 }, { transform: 'translate(0,' + (ty * .55) + 'px) scaleX(.5)', opacity: .9, offset: .55 }, { transform: 'translate(0,' + ty + 'px) scaleX(.04)', opacity: 0, offset: .75 }, { opacity: 0 }], { d: 1500, delay: 100 + i * 70, e: E.io });
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'none', offset: .5 }, { transform: 'scale(1.12)', offset: .72 }, { transform: 'scale(.97)', offset: .85 }, { transform: 'none' }], { d: 1700, delay: 100, e: E.io });
    var sm = c.add('<rect x="22" y="110" width="56" height="7" rx="3.5" fill="#8CB863"/>');
    sm.style.transformOrigin = '50% 50%';
    c.A(sm, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { d: 800, delay: 1450, e: E.sp });
  });

  /* ---------- F 培训与考试 63–72 ---------- */
  reg(63, 'G', 2500, function (c) {
    c.add('<line x1="104" y1="-14" x2="104" y2="112" stroke="rgba(255,255,255,.35)" stroke-width="2"/><line x1="126" y1="-14" x2="126" y2="112" stroke="rgba(255,255,255,.35)" stroke-width="2"/>');
    [86, 66, 46, 26, 6].forEach(function (y, i) {
      var r = c.add('<line x1="104" y1="' + y + '" x2="126" y2="' + y + '" stroke="rgba(255,255,255,.3)" stroke-width="3" stroke-linecap="round"/>');
      c.A(r.firstChild, [{ stroke: 'rgba(255,255,255,.3)' }, { stroke: '#8CB863' }], { d: 400, delay: 350 + i * 400 });
    });
    var d = c.add('<circle cx="115" cy="104" r="5" fill="#D8BD86"/>');
    c.A(d, [{ transform: 'translateY(0)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .08 }, { transform: 'translateY(-112px)', opacity: 1, offset: .92 }, { transform: 'translateY(-112px)', opacity: 1 }], { d: 2100, e: E.io });
    var st = c.add(star4(115, -20, 9, '#D8BD86'));
    c.A(st, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .75 }, { transform: 'scale(1.3) rotate(45deg)', opacity: 1, offset: .9 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { d: 2400, e: E.sp });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateX(-12px) rotate(-6deg) scale(.92)', offset: .25 }, { transform: 'translateX(-12px) rotate(-6deg) scale(.92)', offset: .85 }, { transform: 'none' }], { d: 2400, e: E.io });
  });

  reg(64, 'Au', 2700, function (c) {
    c.A(c.logo, [{ opacity: 1 }, { opacity: .22, offset: .08 }, { opacity: .22, offset: .78 }, { opacity: 1, transform: 'scale(1.14)', offset: .86 }, { opacity: 1, transform: 'none' }], { d: 2600, e: E.io });
    ['3', '2', '1'].forEach(function (n, i) {
      var t = c.add('<text x="50" y="72" text-anchor="middle" font-size="64" font-weight="700" fill="#FFFFFF">' + n + '</text>');
      c.A(t, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .25 }, { transform: 'scale(.85)', opacity: 0 }], { d: 780, delay: 220 + i * 760, e: E.out });
      var rg = c.add('<circle cx="50" cy="50" r="58" fill="none" stroke="#D8BD86" stroke-width="3"/>');
      c.A(rg.firstChild, [{ transform: 'scale(1)', opacity: .9 }, { transform: 'scale(.45)', opacity: 0 }], { d: 780, delay: 220 + i * 760 });
    });
    c.ripple('Au', 2400, 46, 600); c.burst(14, ['Au', 'W'], 2400, 46, 84, 2, 700);
  });

  reg(65, 'B', 2600, function (c) {
    var L1 = c.add('<rect x="-38" y="58" width="40" height="22" rx="10" fill="#8CB863"/><rect x="-30" y="65" width="22" height="3" rx="1.5" fill="#FFFFFF"/><rect x="-30" y="71" width="14" height="2.6" rx="1.3" fill="rgba(255,255,255,.7)"/>');
    var R1 = c.add('<rect x="98" y="58" width="40" height="22" rx="10" fill="#FFFFFF"/><rect x="106" y="65" width="22" height="3" rx="1.5" fill="#26255F"/><rect x="106" y="71" width="14" height="2.6" rx="1.3" fill="#8CB863"/>');
    var beats = [0, 1, 0, 1, 0, 1];
    [L1, R1].forEach(function (g, k) {
      c.A(g, [{ transform: 'scale(1)' }, { transform: 'scale(1)', offset: .05 }, { transform: 'scale(1.18)', offset: .1 }, { transform: 'scale(1)', offset: .2 }, { transform: 'scale(1)' }], { d: 1000, delay: 250 + k * 500, it: 3, e: E.sp });
    });
    var ball = c.add('<circle cx="0" cy="0" r="4.5" fill="#D8BD86"/>');
    var kf = [], n = 6;
    for (var i = 0; i <= n; i++) kf.push({ transform: 'translate(' + (i % 2 ? 100 : -4) + 'px,' + (i % 2 ? 10 : 10) + 'px)', offset: i / n });
    c.A(ball, kf.map(function (f, i) { return { transform: 'translate(' + (i % 2 ? 98 : 2) + 'px,' + (28) + 'px)', offset: i / n }; }), { d: 2400, delay: 100, e: E.io });
    c.A(ball, [{ opacity: 0 }, { opacity: 1, offset: .05 }, { opacity: 1, offset: .95 }, { opacity: 0 }], { d: 2400, delay: 100, e: E.lin });
    var arcs = c.add('<path d="M2 36 Q50 -4 98 36" fill="none" stroke="rgba(216,189,134,.5)" stroke-width="1.4" stroke-dasharray="2 4"/>');
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.04)', offset: .25 }, { transform: 'scale(.98)', offset: .5 }, { transform: 'scale(1.04)', offset: .75 }, { transform: 'none' }], { d: 2400, delay: 100 });
  });

  reg(66, 'G', 2500, function (c) {
    c.A(c.logo, [{ opacity: 1 }, { opacity: .35, offset: .2 }, { opacity: .35, offset: .85 }, { opacity: 1 }], { d: 2400 });
    var vals = [0.92, 0.7, 0.96, 0.78, 0.86];
    function poly(r) { var s = ''; for (var i = 0; i < 5; i++) { var p = pt(50, 50, r, i * 72 - 90); s += p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' '; } return s; }
    var grid = c.add('<polygon points="' + poly(62) + '" fill="none" stroke="rgba(255,255,255,.3)"/><polygon points="' + poly(41) + '" fill="none" stroke="rgba(255,255,255,.2)"/><polygon points="' + poly(20) + '" fill="none" stroke="rgba(255,255,255,.2)"/>');
    c.A(grid, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { d: 600 });
    for (var i = 0; i < 5; i++) { var p = pt(50, 50, 62, i * 72 - 90); var ax = c.add('<line x1="50" y1="50" x2="' + p[0] + '" y2="' + p[1] + '" stroke="rgba(255,255,255,.25)" ' + dash().replace('fill="none"', '') + '/>'); draw(c, ax.firstChild, 200 + i * 80, 400); }
    var ds = ''; vals.forEach(function (v, i) { var q = pt(50, 50, 62 * v, i * 72 - 90); ds += q[0].toFixed(1) + ',' + q[1].toFixed(1) + ' '; });
    var data = c.add('<polygon points="' + ds + '" fill="rgba(140,184,99,.45)" stroke="#8CB863" stroke-width="2.4" stroke-linejoin="round"/>');
    c.A(data, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { d: 1100, delay: 700, e: E.out });
    vals.forEach(function (v, i) { var q = pt(50, 50, 62 * v, i * 72 - 90); var d = c.add('<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4" fill="#FFFFFF" stroke="#8CB863" stroke-width="2"/>'); pop(c, d.firstChild, 1500 + i * 110, 320); });
  });

  reg(67, 'Au', 2500, function (c) {
    var rb = c.add('<path d="M28 94 L46 94 L42 138 L34 128 L24 138Z" fill="#8CB863"/><path d="M72 94 L54 94 L58 138 L66 128 L76 138Z" fill="#26255F" stroke="#8CB863" stroke-width="1"/>');
    rb.style.transformOrigin = '50% 0%';
    c.A(rb, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { d: 800, delay: 900, e: E.sp });
    var ring = c.add('<circle cx="50" cy="50" r="57" stroke="#D8BD86" stroke-width="5" transform="rotate(-90 50 50)" ' + dash() + '/><circle cx="50" cy="50" r="52" fill="none" stroke="rgba(216,189,134,.5)" stroke-width="1"/>');
    draw(c, ring.firstChild, 100, 1000); c.A(ring.children[1], [{ opacity: 0 }, { opacity: 1 }], { d: 500, delay: 900 });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.92)', offset: .35 }, { transform: 'scale(1.08)', offset: .6 }, { transform: 'none' }], { d: 1800, delay: 400, e: E.sp });
    [[-4, 8], [104, 4], [100, 92], [-6, 90]].forEach(function (s, i) { var st = c.add(star4(s[0], s[1], 6, '#FFFFFF')); c.A(st, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: .5 }, { transform: 'scale(0)', opacity: 0 }], { d: 800, delay: 1300 + i * 150 }); });
  });

  reg(68, 'Au', 2600, function (c) {
    var cr = c.add('<path d="M64 4 L53 26 L63 40 L46 58 L57 72 L42 100" stroke="#D8BD86" stroke-width="2.8" ' + dash() + '/><path d="M64 4 L53 26 L63 40 L46 58 L57 72 L42 100" stroke="rgba(216,189,134,.4)" stroke-width="9" ' + dash() + '/>');
    draw(c, cr.children[0], 300, 700); draw(c, cr.children[1], 300, 700);
    c.A(cr, [{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { d: 2500 });
    c.A(cr.children[1], [{ opacity: .6 }, { opacity: 1 }, { opacity: .5 }], { d: 700, delay: 1300, it: 2 });
    c.A(c.logo, [{ transform: 'none', filter: 'none' }, { transform: 'translateX(-4px) rotate(-1.5deg)', filter: 'brightness(.8)', offset: .1 }, { transform: 'translateX(4px) rotate(1.5deg)', filter: 'brightness(.8)', offset: .2 }, { transform: 'translateX(-3px)', filter: 'brightness(.75)', offset: .3 }, { transform: 'translateX(0)', filter: 'brightness(.75)', offset: .45 }, { transform: 'scale(1.04)', filter: 'brightness(1.25)', offset: .75 }, { transform: 'none', filter: 'none' }], { d: 2500, e: E.io });
    c.ripple('Au', 1700, 46, 700);
  });

  reg(69, 'Au', 2400, function (c) {
    var sp = c.add('<circle cx="78.6" cy="33.5" r="70" fill="none" stroke="rgba(8,10,9,.78)" stroke-width="260"/>');
    c.A(sp.firstChild, [{ r: '70px', opacity: 0 }, { r: '70px', opacity: 1, offset: .12 }, { r: '17px', opacity: 1, offset: .6 }, { r: '17px', opacity: 1, offset: .82 }, { r: '90px', opacity: 0 }], { d: 2300, e: E.io });
    var rg = c.add('<circle cx="78.6" cy="33.5" r="19" fill="none" stroke="#D8BD86" stroke-width="2"/>');
    c.A(rg, [{ opacity: 0, transform: 'scale(2)' }, { opacity: 0, transform: 'scale(2)', offset: .4 }, { opacity: 1, transform: 'scale(1)', offset: .62 }, { opacity: 1, transform: 'scale(1)', offset: .82 }, { opacity: 0 }], { d: 2300 });
    c.A(c.pets[1], [{ transform: 'none' }, { transform: 'none', offset: .55 }, { transform: 'scale(1.22)', offset: .66 }, { transform: 'scale(1.1)', offset: .74 }, { transform: 'scale(1.22)', offset: .82 }, { transform: 'none' }], { d: 2300, e: E.io });
  });

  reg(70, 'Au', 2500, function (c) {
    var id = c.id();
    c.defs.innerHTML = '<clipPath id="' + id + '"><rect x="-4" y="14" width="108" height="90" rx="8"/></clipPath>';
    var sheet = c.add('<rect x="-4" y="14" width="108" height="90" rx="8" fill="#FAF7F0" stroke="#D8BD86" stroke-width="2"/><rect x="8" y="26" width="26" height="4" rx="2" fill="#8CB863"/><rect x="8" y="94" width="40" height="3" rx="1.5" fill="rgba(38,37,95,.4)"/><rect x="62" y="94" width="30" height="3" rx="1.5" fill="rgba(38,37,95,.4)"/>', true);
    c.A(sheet, [{ transform: 'translateY(50px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { d: 700, e: E.out });
    c.A(c.logo, [{ transform: 'scale(1.7)', opacity: 0 }, { transform: 'scale(1.7)', opacity: 0, offset: .3 }, { transform: 'scale(.94)', opacity: 1, offset: .52 }, { transform: 'scale(1)', opacity: 1, offset: .62 }, { transform: 'none', opacity: 1 }], { d: 1800, e: E.in });
    c.ripple('Au', 1000, 48, 600);
    var emb = c.add('<circle cx="50" cy="50" r="50" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/><circle cx="50" cy="50" r="50" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1"/>');
    c.A(emb, [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 0, transform: 'scale(1.12)', offset: .5 }, { opacity: 1, transform: 'scale(1)', offset: .6 }, { opacity: .0 }], { d: 1800 });
    var sh = c.add('<g clip-path="url(#' + id + ')"><rect x="-40" y="0" width="22" height="130" fill="#FFFFFF" opacity=".55"/></g>');
    c.A(sh.firstChild.firstChild, [{ transform: 'translateX(0) skewX(-20deg)' }, { transform: 'translateX(180px) skewX(-20deg)' }], { d: 900, delay: 1500, e: E.io });
  });

  reg(71, 'O', 2600, function (c) {
    var id = c.id();
    c.defs.innerHTML = '<radialGradient id="' + id + '"><stop offset="0" stop-color="#FF9F43" stop-opacity=".9"/><stop offset="1" stop-color="#FF9F43" stop-opacity="0"/></radialGradient>';
    var sun = c.add('<circle cx="50" cy="104" r="64" fill="url(#' + id + ')"/>', true);
    c.A(sun, [{ transform: 'translateY(70px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .6 }, { transform: 'translateY(-20px)', opacity: 0 }], { d: 2400, e: E.out });
    c.A(c.logo, [{ filter: 'grayscale(1) brightness(.55)', transform: 'scale(.9)' }, { filter: 'grayscale(1) brightness(.55)', transform: 'scale(.9)', offset: .25 }, { filter: 'grayscale(.4) brightness(.9)', transform: 'scale(.97)', offset: .6 }, { filter: 'none', transform: 'scale(1.06)', offset: .85 }, { filter: 'none', transform: 'none' }], { d: 2500, e: E.io });
    ['z', 'z', 'z'].forEach(function (z, i) {
      var t = c.add('<text x="' + (84 + i * 6) + '" y="' + (16 - i * 2) + '" font-size="' + (12 + i * 5) + '" fill="#FFFFFF" opacity=".8">z</text>');
      c.A(t, [{ transform: 'translate(0,10px)', opacity: 0 }, { transform: 'translate(6px,0)', opacity: .9, offset: .4 }, { transform: 'translate(12px,-14px)', opacity: 0 }], { d: 900, delay: 100 + i * 260 });
    });
  });

  reg(72, 'G', 2300, function (c) {
    c.A(c.logo, [{ opacity: 0, filter: 'brightness(0)' }, { opacity: 0, filter: 'brightness(0)', offset: .35 }, { opacity: .6, filter: 'brightness(.5)', offset: .45 }, { opacity: 0, offset: .5 }, { opacity: 1, filter: 'brightness(1.6)', offset: .62 }, { opacity: .5, offset: .68 }, { opacity: 1, filter: 'brightness(1.1)', offset: .78 }, { opacity: 1, filter: 'none' }], { d: 2300, e: E.lin });
    var pw = c.add('<path d="M28 24 A32 32 0 1 0 72 24" stroke="#8CB863" stroke-width="5" ' + dash() + '/><line x1="50" y1="8" x2="50" y2="46" stroke="#8CB863" stroke-width="5" ' + dash().replace('fill="none"', '') + '/>');
    draw(c, pw.children[0], 100, 800); draw(c, pw.children[1], 600, 400);
    c.A(pw, [{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0 }], { d: 1400 });
    var sc = c.add('<rect x="-12" y="0" width="124" height="3" fill="#8CB863" opacity=".7"/>');
    c.A(sc, [{ transform: 'translateY(-4px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .05 }, { transform: 'translateY(100px)', opacity: 1, offset: .95 }, { opacity: 0 }], { d: 900, delay: 1250, e: E.io });
    c.ripple('G', 1500, 50, 800);
  });

  /* ---------- G 等级与 KPI 73–80 ---------- */
  reg(73, 'G', 2400, function (c) { lit(c, [0, 3], 300, 500); pips(c, 1, '#8CB863'); });
  reg(74, 'G', 2400, function (c) {
    lit(c, [0, 3, 1, 4], 250, 330); pips(c, 2, '#8CB863');
    c.ripple('G', 1500, 40, 700);
  });
  reg(75, 'Au', 2400, function (c) {
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: 'rotate(120deg) scale(.2)', opacity: 0 }, { transform: 'rotate(-12deg) scale(1.15)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { d: 1000, delay: 150 + i * 120, e: E.sp }); });
    c.A(c.rose, [{ transform: 'rotate(60deg) scale(.7)', opacity: .3 }, { transform: 'none', opacity: 1 }], { d: 1200, e: E.out });
    c.A(c.core, [{ transform: 'rotate(-180deg) scale(0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { d: 800, delay: 900, e: E.sp });
    pips(c, 3, '#D8BD86'); c.ripple('Au', 1400, 46, 800);
  });
  reg(76, 'Au', 2700, function (c) {
    var halo = c.add('<circle cx="50" cy="50" r="57" fill="none" stroke="#D8BD86" stroke-width="2.6" stroke-dasharray="5 4"/><circle cx="50" cy="50" r="64" fill="none" stroke="rgba(216,189,134,.5)" stroke-width="1.4" stroke-dasharray="1 5"/>');
    c.A(halo.children[0], [{ transform: 'rotate(0)', opacity: 0 }, { transform: 'rotate(120deg)', opacity: 1, offset: .2 }, { transform: 'rotate(360deg)', opacity: 1 }], { d: 2600, e: E.io });
    c.A(halo.children[1], [{ transform: 'rotate(0)', opacity: 0 }, { transform: 'rotate(-120deg)', opacity: 1, offset: .2 }, { transform: 'rotate(-360deg)', opacity: 1 }], { d: 2600, e: E.io });
    var rays = ''; for (var i = 0; i < 12; i++) { var a = pt(50, 50, 70, i * 30), b = pt(50, 50, 82, i * 30); rays += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#D8BD86" stroke-width="2.4" stroke-linecap="round"/>'; }
    var rg = c.add(rays);
    c.A(rg, [{ transform: 'rotate(0) scale(.8)', opacity: 0 }, { transform: 'rotate(60deg) scale(1)', opacity: 1, offset: .3 }, { transform: 'rotate(180deg) scale(1)', opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2600, e: E.out });
    var cr = c.add('<path d="M34 -8 L38 -24 L45 -14 L50 -30 L55 -14 L62 -24 L66 -8Z" fill="#D8BD86" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/><circle cx="50" cy="-6" r="0" fill="#fff"/>');
    cr.style.transformOrigin = '50% 100%';
    c.A(cr, [{ transform: 'scale(0) translateY(14px)', opacity: 0 }, { transform: 'scale(0) translateY(14px)', opacity: 0, offset: .35 }, { transform: 'scale(1.2) translateY(0)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { d: 1400, delay: 500, e: E.sp });
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: 'none', filter: 'none' }, { transform: 'scale(1.14)', filter: 'brightness(1.25)', offset: .5 }, { transform: 'none', filter: 'none' }], { d: 900, delay: 200 + i * 100, e: E.io }); });
    pips(c, 4, '#D8BD86');
  });

  reg(77, 'Y', 2700, function (c) {
    c.add('<circle cx="50" cy="50" r="57" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="4"/>');
    var rg = c.add('<circle cx="50" cy="50" r="57" stroke="#D8BD86" stroke-width="4" transform="rotate(-90 50 50)" ' + dash() + '/>');
    c.A(rg.firstChild, [{ strokeDashoffset: 0 }, { strokeDashoffset: .86 }], { d: 2200, delay: 200, e: E.lin });
    for (var i = 0; i < 7; i++) {
      var p = pt(50, 50, 68, i * (360 / 7) - 90);
      var d = c.add('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.4" fill="#D8BD86"/>');
      c.A(d.firstChild, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1)', offset: .15 }, { opacity: 0, transform: 'scale(.2)' }], { d: 380, delay: 300 + i * 300 });
    }
    c.A(c.logo, [{ filter: 'none' }, { filter: 'saturate(.45) brightness(.9)', offset: .75 }, { filter: 'saturate(.45) brightness(.9)', offset: .88 }, { filter: 'none' }], { d: 2600, e: E.io });
  });

  reg(78, 'G', 2700, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-14px) scale(.78)', offset: .2 }, { transform: 'translateY(-14px) scale(.78)', offset: .88 }, { transform: 'none' }], { d: 2600, e: E.io });
    c.add('<path d="' + arc(50, 112, 50, 180, 360) + '" stroke="rgba(255,255,255,.16)" stroke-width="7" fill="none" stroke-linecap="round"/>');
    var pr = c.add('<path d="' + arc(50, 112, 50, 180, 360) + '" stroke="#8CB863" stroke-width="7" ' + dash() + '/>');
    c.A(pr.firstChild, [{ strokeDashoffset: 1 }, { strokeDashoffset: .14 }], { d: 1500, delay: 400, e: E.io });
    var nd = c.add('<g><line x1="50" y1="112" x2="50" y2="66" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><line x1="50" y1="112" x2="50" y2="158" stroke="transparent"/></g>');
    nd.firstChild.style.transformBox = 'view-box'; nd.firstChild.style.transformOrigin = '50px 112px';
    c.A(nd.firstChild, [{ transform: 'rotate(-90deg)' }, { transform: 'rotate(66deg)', offset: .8 }, { transform: 'rotate(56deg)', offset: .9 }, { transform: 'rotate(60deg)' }], { d: 1700, delay: 400, e: E.io });
    var hub = c.add('<circle cx="50" cy="112" r="4.5" fill="#FFFFFF"/>'); pop(c, hub.firstChild, 300, 300);
    var tx = c.add('<text x="50" y="136" text-anchor="middle" font-size="19" font-weight="700" fill="#FFFFFF">0</text>');
    c.tween(1600, function (p) { tx.firstChild.textContent = String(Math.round(86 * (1 - Math.pow(1 - p, 3)))); }, 450);
  });

  reg(79, 'P', 2500, function (c) {
    c.pets.forEach(function (p, i) {
      c.A(p, [{ transform: 'none' }, { transform: 'translate(0,-24px) scale(.82)', offset: .35 }, { transform: 'translate(0,-24px) scale(.82)', offset: .7 }, { transform: 'none' }], { d: 2100, delay: 150 + i * 60, e: E.io });
      var a = pt(50, 50, 74, i * 60 - 90);
      var d = c.add('<circle cx="' + a[0] + '" cy="' + a[1] + '" r="3.6" fill="#B48CFF"/>');
      c.A(d.firstChild, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.4)', opacity: 1, offset: .5 }, { transform: 'scale(1)', opacity: 1 }], { d: 450, delay: 650 + i * 130, e: E.sp });
    });
    c.A(c.core, [{ transform: 'none' }, { transform: 'scale(1.7) rotate(40deg)', offset: .4 }, { transform: 'scale(1.7) rotate(40deg)', offset: .7 }, { transform: 'none' }], { d: 2100, delay: 150, e: E.io });
    var d7 = c.add('<circle cx="50" cy="-26" r="3.6" fill="#D8BD86"/>'); pop(c, d7.firstChild, 1500, 400);
    c.A(c.rose, [{ transform: 'none' }, { transform: 'scale(.92)', offset: .4 }, { transform: 'scale(.92)', offset: .7 }, { transform: 'none' }], { d: 2100, delay: 150, e: E.io });
  });

  reg(80, 'O', 2800, function (c) {
    var fn = c.add('<polygon points="0,70 100,70 62,104 62,128 38,128 38,104" fill="rgba(255,255,255,.08)" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/>');
    c.A(fn, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(.6)', opacity: 0, offset: .15 }, { transform: 'scale(1)', opacity: 1, offset: .35 }, { transform: 'scale(1)', opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2600, e: E.out });
    c.A(c.logo, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-22px) scale(.42)', opacity: 1, offset: .28 }, { transform: 'translateY(26px) scale(.34)', opacity: 1, offset: .5 }, { transform: 'translateY(62px) scale(.16)', opacity: 1, offset: .62 }, { transform: 'translateY(84px) scale(.06)', opacity: 0, offset: .68 }, { transform: 'translateY(-60px)', opacity: 0, offset: .72 }, { transform: 'none', opacity: 1, offset: .92 }, { transform: 'none', opacity: 1 }], { d: 2600, e: E.io });
    var res = c.add('<circle cx="50" cy="134" r="6" fill="#8CB863"/>');
    c.A(res.firstChild, [{ transform: 'translateY(-10px) scale(0)', opacity: 0 }, { transform: 'translateY(-10px) scale(0)', opacity: 0, offset: .6 }, { transform: 'translateY(0) scale(1.3)', opacity: 1, offset: .72 }, { transform: 'scale(1)', opacity: 1, offset: .86 }, { opacity: 0 }], { d: 2600 });
  });

  /* ---------- H 报价与订单 81–86 ---------- */
  reg(81, 'G', 2300, function (c) {
    var gl = c.add('<circle cx="50" cy="50" r="60" fill="#8CB863"/>', true);
    c.A(gl.firstChild, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: .32, transform: 'scale(1)', offset: .4 }, { opacity: .12, transform: 'scale(1.06)', offset: .7 }, { opacity: 0, transform: 'scale(1.1)' }], { d: 2200, e: E.out });
    var tag = c.add('<path d="M66 72 h46 a7 7 0 0 1 7 7 v20 a7 7 0 0 1 -7 7 h-46 a7 7 0 0 1 -7 -7 v-20 a7 7 0 0 1 7 -7z" fill="#8CB863" stroke="#FFFFFF" stroke-width="1.6"/><circle cx="68" cy="89" r="3" fill="#26255F"/><rect x="76" y="82" width="28" height="4" rx="2" fill="#FFFFFF"/><rect x="76" y="91" width="18" height="3.4" rx="1.7" fill="rgba(255,255,255,.7)"/>');
    c.A(tag, [{ transform: 'scaleX(-1) scale(.5)', opacity: 0 }, { transform: 'scaleX(-1) scale(.5)', opacity: 0, offset: .2 }, { transform: 'scaleX(1) scale(1.12)', opacity: 1, offset: .6 }, { transform: 'scaleX(1) scale(1)', opacity: 1, offset: .75 }, { transform: 'scaleX(1) scale(1)', opacity: 1, offset: .9 }, { opacity: 0 }], { d: 2300, e: E.io });
    var ck = c.add('<path d="M96 20 L104 28 L118 12" stroke="#8CB863" stroke-width="4.5" ' + dash() + '/>');
    draw(c, ck.firstChild, 1000, 500); c.A(ck, [{ opacity: 1 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { d: 2200 });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'drop-shadow(0 0 6px #8CB863) brightness(1.1)', offset: .4 }, { filter: 'none' }], { d: 1800 });
  });

  reg(82, 'Y', 2300, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateX(-9px) rotate(-3deg)', offset: .1 }, { transform: 'translateX(8px) rotate(2.5deg)', offset: .22 }, { transform: 'translateX(-6px)', offset: .34 }, { transform: 'translateX(4px)', offset: .46 }, { transform: 'translateX(-2px)', offset: .58 }, { transform: 'scale(1.05)', offset: .75 }, { transform: 'none' }], { d: 1900, e: E.out });
    var rf = c.add('<path d="' + arc(50, 50, 60, 200, 330) + '" fill="none" stroke="#F5C542" stroke-width="3.4" stroke-linecap="round"/><polygon points="' + pt(50, 50, 60, 330).map(function (v) { return v.toFixed(1); }).join(',') + ' ' + pt(50, 50, 66, 318).map(function (v) { return v.toFixed(1); }).join(',') + ' ' + pt(50, 50, 54, 318).map(function (v) { return v.toFixed(1); }).join(',') + '" fill="#F5C542"/><path d="' + arc(50, 50, 60, 20, 150) + '" fill="none" stroke="#F5C542" stroke-width="3.4" stroke-linecap="round"/><polygon points="' + pt(50, 50, 60, 150).map(function (v) { return v.toFixed(1); }).join(',') + ' ' + pt(50, 50, 66, 138).map(function (v) { return v.toFixed(1); }).join(',') + ' ' + pt(50, 50, 54, 138).map(function (v) { return v.toFixed(1); }).join(',') + '" fill="#F5C542"/>');
    c.A(rf, [{ transform: 'rotate(0)', opacity: 0 }, { transform: 'rotate(120deg)', opacity: 1, offset: .25 }, { transform: 'rotate(360deg)', opacity: 1, offset: .85 }, { transform: 'rotate(420deg)', opacity: 0 }], { d: 2300, e: E.io });
  });

  reg(83, 'Y', 2500, function (c) {
    c.add('<rect x="-8" y="100" width="116" height="10" rx="5" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/><circle cx="100" cy="86" r="4.2" fill="#F5C542"/>');
    var led = c.add('<circle cx="100" cy="86" r="4.2" fill="#F5C542"/>');
    c.A(led.firstChild, [{ opacity: .4, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1.4)' }, { opacity: .4, transform: 'scale(.8)' }], { d: 520, delay: 1500, it: 3 });
    var card = c.add('<rect x="-50" y="92" width="52" height="34" rx="6" fill="#26255F" stroke="#D8BD86" stroke-width="1.6"/><rect x="-50" y="98" width="52" height="7" fill="#000000" opacity=".7"/><rect x="-44" y="112" width="14" height="9" rx="2" fill="#D8BD86"/><rect x="-24" y="113" width="20" height="3" rx="1.5" fill="rgba(255,255,255,.5)"/>');
    c.A(card, [{ transform: 'translateX(0)', opacity: 0 }, { transform: 'translateX(14px)', opacity: 1, offset: .1 }, { transform: 'translateX(70px)', opacity: 1, offset: .4 }, { transform: 'translateX(112px)', opacity: 1, offset: .62 }, { transform: 'translateX(172px)', opacity: 0, offset: .8 }, { opacity: 0 }], { d: 1900, delay: 150, e: E.io });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-6px)', offset: .3 }, { transform: 'none' }], { d: 1800, e: E.io });
  });

  reg(84, 'G', 2300, function (c) {
    for (var i = 0; i < 3; i++) c.ripple('G', 1000 + i * 280, 46, 1000);
    var coin = c.add('<circle cx="50" cy="-30" r="9" fill="#D8BD86" stroke="#B8963F" stroke-width="2"/><circle cx="50" cy="-30" r="5.5" fill="none" stroke="#B8963F" stroke-width="1"/>');
    c.A(coin, [{ transform: 'translateY(0) scale(1)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: .12 }, { transform: 'translateY(80px) scale(.3)', opacity: 0, offset: 1 }], { d: 1000, delay: 100, e: E.in });
    c.A(c.core, [{ transform: 'none', filter: 'none' }, { transform: 'scale(1.7)', filter: 'brightness(1.5)', offset: .5 }, { transform: 'none', filter: 'none' }], { d: 700, delay: 1000, e: E.sp });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.1)', offset: .5 }, { transform: 'none' }], { d: 700, delay: 1000, e: E.sp });
  });

  reg(85, 'G', 2700, function (c) {
    var pd = 'M-30 118 C8 66 38 126 68 74 S110 34 118 4';
    var rt = c.add('<path d="' + pd + '" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-dasharray="1" pathLength="1" fill="none" stroke-dashoffset="1" stroke-linecap="round"/>');
    draw(c, rt.firstChild, 100, 1400);
    var dot = c.add('<circle cx="0" cy="0" r="5.5" fill="#D8BD86" stroke="#FFFFFF" stroke-width="1.6"/>');
    var path = rt.firstChild; var len = path.getTotalLength();
    c.tween(1400, function (p) { var q = path.getPointAtLength(len * p); dot.setAttribute('transform', 'translate(' + q.x.toFixed(2) + ' ' + q.y.toFixed(2) + ')'); }, 100);
    var pin = c.add('<g transform="translate(118 4)"><g class="p"><path d="M0 0 C-9 -12 -10 -20 -10 -22 A10 10 0 0 1 10 -22 C10 -20 9 -12 0 0Z" fill="#E5484D" stroke="#FFFFFF" stroke-width="1.4"/><circle cx="0" cy="-22" r="3.6" fill="#FFFFFF"/></g></g>');
    c.A(pin.firstChild.firstChild, [{ transform: 'translateY(-34px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .6 }, { transform: 'translateY(-6px)', offset: .8 }, { transform: 'translateY(0)', opacity: 1 }], { d: 700, delay: 1500, e: E.in });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'none', offset: .55 }, { transform: 'translateY(-10px) scale(1.05)', offset: .72 }, { transform: 'none' }], { d: 2300, e: E.sp });
    c.ripple('G', 1550, 40, 700);
  });

  reg(86, 'N', 2700, function (c) {
    var cols = ['#26255F', '#8CB863', '#FFFFFF', '#8CB863'];
    for (var i = 0; i < 34; i++) {
      var a = (i * 137.5) * Math.PI / 180, r = 8 + (i * 7 % 40);
      var x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r, ox = Math.cos(a) * (46 + i % 5 * 8), oy = Math.sin(a) * (46 + i % 5 * 8) - 8 - i % 4 * 5;
      var d = c.add('<circle cx="' + x + '" cy="' + y + '" r="' + (2 + i % 3) + '" fill="' + cols[i % 4] + '"/>');
      c.A(d.firstChild, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1, offset: .12 }, { transform: 'translate(' + ox + 'px,' + oy + 'px)', opacity: 0, offset: .5 }, { transform: 'translate(' + ox + 'px,' + oy + 'px)', opacity: 0, offset: .55 }, { transform: 'translate(' + (ox * .5) + 'px,' + (oy * .5) + 'px)', opacity: .8, offset: .75 }, { transform: 'translate(0,0)', opacity: 0, offset: .92 }, { opacity: 0 }], { d: 2600, delay: (i % 6) * 25, e: E.io });
    }
    c.A(c.logo, [{ opacity: 1, filter: 'none' }, { opacity: 1, offset: .1 }, { opacity: 0, filter: 'blur(2px)', offset: .38 }, { opacity: 0, offset: .62 }, { opacity: 1, filter: 'none', offset: .92 }, { opacity: 1 }], { d: 2600, e: E.lin });
  });

  /* ---------- I Owner 后台 87–96 ---------- */
  reg(87, 'B', 2500, function (c) {
    var pts = [[-8, 6], [20, -24], [74, -26], [108, -2], [114, 52], [96, 100], [40, 112], [-12, 84], [-18, 40]];
    pts.forEach(function (p, i) {
      if (i) { var q = pts[i - 1]; var l = c.add('<line x1="' + q[0] + '" y1="' + q[1] + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="rgba(111,177,255,.55)" stroke-width="1.2" ' + dash().replace('fill="none"', '') + '/>'); draw(c, l.firstChild, 300 + i * 170, 400); }
      var s = c.add(star4(p[0], p[1], 5.5, '#FFFFFF'));
      c.A(s, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.5) rotate(45deg)', opacity: 1, offset: .45 }, { transform: 'scale(1) rotate(0)', opacity: .95 }], { d: 600, delay: 200 + i * 170, e: E.sp });
      c.A(s, [{ opacity: .95 }, { opacity: .45 }, { opacity: .95 }], { d: 700 + (i % 3) * 200, delay: 1800, it: 1 });
    });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'drop-shadow(0 0 7px #6FB1FF) brightness(1.1)', offset: .6 }, { filter: 'none' }], { d: 2300, e: E.io });
  });

  reg(88, 'P', 2600, function (c) {
    var moon = c.add('<path d="M96 -6 A18 18 0 1 0 112 28 A14 14 0 1 1 96 -6Z" fill="#D8BD86"/>');
    c.A(moon, [{ transform: 'scale(0) rotate(-60deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .3 }, { transform: 'scale(1)', opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2400, e: E.out });
    c.A(c.logo, [{ filter: 'none', opacity: 1 }, { filter: 'grayscale(.7) brightness(.55)', opacity: .6, offset: .3 }, { filter: 'grayscale(.7) brightness(.55)', opacity: .6, offset: .75 }, { filter: 'none', opacity: 1 }], { d: 2500, e: E.io });
    [0, 1, 2].forEach(function (i) {
      var z = c.add('<text x="' + (74 + i * 10) + '" y="' + (-4 - i * 6) + '" font-size="' + (12 + i * 5) + '" font-weight="700" fill="#FFFFFF">Z</text>');
      c.A(z, [{ transform: 'translate(0,12px)', opacity: 0 }, { transform: 'translate(6px,0)', opacity: .95, offset: .4 }, { transform: 'translate(12px,-14px)', opacity: 0 }], { d: 1000, delay: 500 + i * 380, it: 2 });
    });
    [[-8, 6], [112, 90], [6, 100]].forEach(function (s, i) { var st = c.add(star4(s[0], s[1], 3.4, '#FFFFFF')); c.A(st, [{ opacity: .2 }, { opacity: 1 }, { opacity: .2 }], { d: 800, delay: i * 250, it: 2 }); });
  });

  reg(89, 'G', 2600, function (c) {
    var id = c.id();
    c.defs.innerHTML = '<clipPath id="' + id + '"><rect x="26" y="110" width="48" height="22" rx="4"/></clipPath>';
    c.add('<rect x="22" y="106" width="56" height="30" rx="15" fill="#26255F" stroke="#8CB863" stroke-width="2"/>');
    var digs = [3, 1, 8], dur = [1200, 1500, 1800];
    var cl = c.add('<g clip-path="url(#' + id + ')"></g>'); var holder = cl.firstChild;
    digs.forEach(function (d, k) {
      var col = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      var s = ''; for (var n = 0; n < 10; n++) s += '<text x="' + (34 + k * 16) + '" y="' + (127 + n * 22) + '" text-anchor="middle" font-size="18" font-weight="700" fill="#FFFFFF">' + n + '</text>';
      col.innerHTML = s; holder.appendChild(col);
      c.A(col, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-d * 22) + 'px)' }], { d: dur[k], delay: 250, e: 'cubic-bezier(.2,.8,.2,1)' });
    });
    for (var i = 0; i < 4; i++) c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.035)' }, { transform: 'none' }], { d: 300, delay: 500 + i * 380, e: E.out });
  });

  reg(90, 'G', 2700, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translate(-26px,-22px) scale(.64)', offset: .2 }, { transform: 'translate(-26px,-22px) scale(.64)', offset: .85 }, { transform: 'none' }], { d: 2600, e: E.io });
    var id = c.id();
    c.defs.innerHTML = '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CB863" stop-opacity=".45"/><stop offset="1" stop-color="#8CB863" stop-opacity="0"/></linearGradient>';
    var area = c.add('<path d="M28 124 L42 112 L56 116 L70 94 L84 100 L98 76 L112 80 L128 54 V134 H28Z" fill="url(#' + id + ')"/>');
    area.style.transformOrigin = '50% 100%';
    c.A(area, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { d: 1400, delay: 700, e: E.out });
    var ln = c.add('<path d="M28 124 L42 112 L56 116 L70 94 L84 100 L98 76 L112 80 L128 54" stroke="#8CB863" stroke-width="3" ' + dash() + '/>');
    draw(c, ln.firstChild, 500, 1400);
    var dot = c.add('<circle cx="128" cy="54" r="5" fill="#FFFFFF" stroke="#8CB863" stroke-width="2.4"/>');
    c.A(dot.firstChild, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .72 }, { transform: 'scale(1.5)', opacity: 1, offset: .86 }, { transform: 'scale(1)', opacity: 1 }], { d: 1900, delay: 500, e: E.sp });
    c.ripple('G', 1950, 6, 700).setAttribute('transform', 'translate(78 4)');
  });

  reg(91, 'O', 2700, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-24px) scale(.62)', offset: .2 }, { transform: 'translateY(-24px) scale(.62)', offset: .88 }, { transform: 'none' }], { d: 2600, e: E.io });
    var segs = [[180, 240, '#E5484D'], [240, 300, '#F5C542'], [300, 360, '#8CB863']];
    segs.forEach(function (s, i) {
      var g = c.add('<path d="' + arc(50, 112, 56, s[0] + 2, s[1] - 2) + '" stroke="' + s[2] + '" stroke-width="9" fill="none" stroke-linecap="round"/>');
      c.A(g, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], { d: 400, delay: 200 + i * 150, e: E.out });
    });
    var nd = c.add('<g><line x1="50" y1="112" x2="50" y2="66" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><line x1="50" y1="112" x2="50" y2="158" stroke="transparent"/></g>');
    nd.firstChild.style.transformBox = 'view-box'; nd.firstChild.style.transformOrigin = '50px 112px';
    c.A(nd.firstChild, [{ transform: 'rotate(-90deg)' }, { transform: 'rotate(-90deg)', offset: .1 }, { transform: 'rotate(-30deg)', offset: .3 }, { transform: 'rotate(10deg)', offset: .48 }, { transform: 'rotate(80deg)', offset: .7 }, { transform: 'rotate(64deg)', offset: .85 }, { transform: 'rotate(60deg)' }], { d: 2300, delay: 300, e: 'steps(14,end)' });
    var hub = c.add('<circle cx="50" cy="112" r="5" fill="#FFFFFF"/>'); pop(c, hub.firstChild, 250, 300);
    c.ripple('G', 2000, 6, 700).setAttribute('transform', 'translate(82 4)');
  });

  reg(92, 'Au', 2700, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-26px) scale(.6)', offset: .2 }, { transform: 'translateY(-26px) scale(.6)', offset: .88 }, { transform: 'none' }], { d: 2600, e: E.io });
    c.add('<line x1="50" y1="92" x2="50" y2="130" stroke="#FFFFFF" stroke-width="3"/><path d="M34 132 H66" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>');
    var beam = c.add('<g><line x1="6" y1="92" x2="94" y2="92" stroke="#D8BD86" stroke-width="3.4" stroke-linecap="round"/><g class="L"><line x1="6" y1="92" x2="-2" y2="112" stroke="rgba(255,255,255,.6)"/><line x1="6" y1="92" x2="14" y2="112" stroke="rgba(255,255,255,.6)"/><path d="M-4 112 H16 a10 5 0 0 1 -20 0Z" fill="#8CB863"/></g><g class="R"><line x1="94" y1="92" x2="86" y2="112" stroke="rgba(255,255,255,.6)"/><line x1="94" y1="92" x2="102" y2="112" stroke="rgba(255,255,255,.6)"/><path d="M84 112 H104 a10 5 0 0 1 -20 0Z" fill="#D8BD86"/></g></g>');
    var b = beam.firstChild; b.style.transformBox = 'view-box'; b.style.transformOrigin = '50px 92px';
    var rot = [0, -13, 11, -6, 3, 0];
    var kf = rot.map(function (r, i) { return { transform: 'rotate(' + r + 'deg)', offset: i / (rot.length - 1) }; });
    c.A(b, kf, { d: 2200, delay: 300, e: E.io });
    var pans = [['.L', 6, 92], ['.R', 94, 92]];
    pans.forEach(function (p) {
      var el = b.querySelector(p[0]); el.style.transformBox = 'view-box'; el.style.transformOrigin = p[1] + 'px ' + p[2] + 'px';
      c.A(el, rot.map(function (r, i) { return { transform: 'rotate(' + (-r) + 'deg)', offset: i / (rot.length - 1) }; }), { d: 2200, delay: 300, e: E.io });
    });
  });

  reg(93, 'R', 2500, function (c) {
    for (var i = 0; i < 3; i++) { var r = c.add('<circle cx="50" cy="50" r="22" fill="none" stroke="#E5484D" stroke-width="2.4"/>'); c.A(r.firstChild, [{ transform: 'scale(1)', opacity: .9 }, { transform: 'scale(3.2)', opacity: 0 }], { d: 1200, delay: 100 + i * 520 }); }
    var sw = c.add('<g><line x1="50" y1="50" x2="50" y2="-12" stroke="#E5484D" stroke-width="2.6" stroke-linecap="round"/><path d="M50 50 L50 -12 A62 62 0 0 1 82 -3.7 Z" fill="#E5484D" opacity=".28"/><line x1="50" y1="50" x2="50" y2="112" stroke="transparent"/></g>');
    sw.firstChild.style.transformBox = 'view-box'; sw.firstChild.style.transformOrigin = '50px 50px';
    c.A(sw.firstChild, [{ transform: 'rotate(0)', opacity: 0 }, { transform: 'rotate(0)', opacity: 1, offset: .08 }, { transform: 'rotate(540deg)', opacity: 1, offset: .92 }, { opacity: 0 }], { d: 2300, e: E.lin });
    var bl = c.add('<circle cx="90" cy="20" r="5" fill="#FFFFFF" stroke="#E5484D" stroke-width="3"/>');
    c.A(bl.firstChild, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .45 }, { transform: 'scale(1.6)', opacity: 1, offset: .55 }, { transform: 'scale(1)', opacity: 1, offset: .62 }, { transform: 'scale(1.5)', opacity: .6, offset: .75 }, { transform: 'scale(1)', opacity: 1, offset: .88 }, { opacity: 0 }], { d: 2400, e: E.sp });
    var tr = c.add('<polygon points="90,6 100,24 80,24" fill="none" stroke="#E5484D" stroke-width="2" stroke-linejoin="round"/>');
    c.A(tr, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(.5)', opacity: 0, offset: .62 }, { transform: 'scale(1.5)', opacity: 1, offset: .8 }, { transform: 'scale(2)', opacity: 0 }], { d: 2400 });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'saturate(1.4) hue-rotate(-12deg)', offset: .5 }, { filter: 'none' }], { d: 2300 });
  });

  reg(94, 'R', 2600, function (c) {
    var bm = c.add('<circle cx="50" cy="50" r="72" fill="none"/><polygon points="50,50 130,10 130,90" fill="#E5484D" opacity=".42"/><polygon points="50,50 -30,10 -30,90" fill="#E5484D" opacity=".42"/>', true);
    c.A(bm, [{ transform: 'rotate(0)', opacity: 0 }, { transform: 'rotate(180deg)', opacity: 1, offset: .12 }, { transform: 'rotate(900deg)', opacity: 1, offset: .9 }, { transform: 'rotate(1080deg)', opacity: 0 }], { d: 2500, e: E.io });
    var lamp = c.add('<circle cx="50" cy="50" r="11" fill="#E5484D" stroke="#FFFFFF" stroke-width="2.4"/><circle cx="50" cy="50" r="4" fill="#FFFFFF"/>');
    c.A(lamp, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .12 }, { transform: 'scale(1.15)', opacity: 1, offset: .3 }, { transform: 'scale(1)', opacity: 1, offset: .5 }, { transform: 'scale(1.15)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1, offset: .88 }, { transform: 'scale(0)', opacity: 0 }], { d: 2500, e: E.sp });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'brightness(.7) sepia(.4) hue-rotate(-30deg) saturate(2)', offset: .15 }, { filter: 'brightness(1.1)', offset: .3 }, { filter: 'brightness(.7) sepia(.4) hue-rotate(-30deg) saturate(2)', offset: .45 }, { filter: 'brightness(1.1)', offset: .6 }, { filter: 'brightness(.7) sepia(.4) hue-rotate(-30deg) saturate(2)', offset: .75 }, { filter: 'none' }], { d: 2500, e: E.lin });
  });

  reg(95, 'B', 2700, function (c) {
    var arms = '';
    for (var i = 0; i < 6; i++) {
      var a = i * 60 - 90, e = pt(50, 50, 66, a), m = pt(50, 50, 48, a), b1 = pt(m[0], m[1], 14, a + 50), b2 = pt(m[0], m[1], 14, a - 50);
      arms += '<line x1="50" y1="50" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#BEE1FF" stroke-width="2.4" ' + dash().replace('fill="none"', '') + '/><line x1="' + m[0] + '" y1="' + m[1] + '" x2="' + b1[0] + '" y2="' + b1[1] + '" stroke="#BEE1FF" stroke-width="1.8" ' + dash().replace('fill="none"', '') + '/><line x1="' + m[0] + '" y1="' + m[1] + '" x2="' + b2[0] + '" y2="' + b2[1] + '" stroke="#BEE1FF" stroke-width="1.8" ' + dash().replace('fill="none"', '') + '/>';
    }
    var fl = c.add(arms);
    c.kids(fl).forEach(function (k, i) { draw(c, k, 250 + Math.floor(i / 3) * 140 + (i % 3) * 120, 500); });
    c.A(fl, [{ opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { d: 2600 });
    var fr = c.add('<circle cx="50" cy="50" r="50" fill="#BEE1FF"/>');
    c.A(fr.firstChild, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: .35, transform: 'scale(1)', offset: .4 }, { opacity: .35, offset: .7 }, { opacity: 0, transform: 'scale(1.05)' }], { d: 2600 });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'saturate(.3) brightness(1.25) hue-rotate(150deg)', offset: .35 }, { filter: 'saturate(.3) brightness(1.25) hue-rotate(150deg)', offset: .65 }, { filter: 'none' }], { d: 2600, e: E.io });
    for (var j = 0; j < 6; j++) { var p = pt(50, 50, 78, j * 60 - 60); var s = c.add('<polygon points="' + p[0] + ',' + (p[1] - 6) + ' ' + (p[0] + 4) + ',' + (p[1] + 5) + ' ' + (p[0] - 4) + ',' + (p[1] + 5) + '" fill="#BEE1FF"/>'); c.A(s, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1.2) rotate(60deg)', opacity: 1, offset: .5 }, { transform: 'scale(.8) rotate(120deg)', opacity: 0 }], { d: 900, delay: 900 + j * 120 }); }
  });

  reg(96, 'P', 2500, function (c) {
    var lens = c.add('<circle cx="50" cy="50" r="24" fill="rgba(180,140,255,.14)" stroke="#FFFFFF" stroke-width="4"/><line x1="67" y1="67" x2="86" y2="86" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/><path d="M36 38 A18 18 0 0 1 46 31" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="3" stroke-linecap="round"/>');
    c.A(lens, [{ transform: 'translate(-60px,-10px) scaleX(1)', opacity: 0 }, { transform: 'translate(-30px,-10px) scaleX(1)', opacity: 1, offset: .15 }, { transform: 'translate(-10px,0) scaleX(0)', opacity: 1, offset: .35 }, { transform: 'translate(10px,6px) scaleX(-1)', opacity: 1, offset: .55 }, { transform: 'translate(30px,-6px) scaleX(0)', opacity: 1, offset: .72 }, { transform: 'translate(10px,0) scaleX(1)', opacity: 1, offset: .88 }, { transform: 'translate(10px,0) scaleX(1)', opacity: 0 }], { d: 2400, e: E.io });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.1)', offset: .55 }, { transform: 'none' }], { d: 2400, e: E.io });
    var ex = c.add('<circle cx="50" cy="50" r="10" fill="#B48CFF" opacity=".5"/>');
    c.A(ex.firstChild, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(4)', opacity: .5, offset: .7 }, { transform: 'scale(5)', opacity: 0 }], { d: 1200, delay: 1200 });
  });

  /* ---------- J 系统 97–100 ---------- */
  reg(97, 'Au', 2400, function (c) {
    [1, 2, 3].forEach(function (k) {
      var g = c.logo.cloneNode(true); g.setAttribute('class', 'vl-logo vl-clone'); c.under.appendChild(g);
      c.A(g, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(' + (k * 9) + 'px,' + (k * 9) + 'px) scale(' + (1 - k * .02) + ')', opacity: .5 - k * .1, offset: .35 }, { transform: 'translate(' + (k * 9) + 'px,' + (k * 9) + 'px) scale(' + (1 - k * .02) + ')', opacity: .5 - k * .1, offset: .72 }, { transform: 'translate(0,0)', opacity: 0 }], { d: 2300, delay: k * 220, e: E.io });
      var tab = c.add('<rect x="' + (104 + k * 4) + '" y="' + (k * 14 - 4) + '" width="24" height="10" rx="5" fill="#D8BD86" opacity=".9"/><text x="' + (116 + k * 4) + '" y="' + (k * 14 + 4) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#26255F">v' + k + '</text>');
      c.A(tab, [{ transform: 'translateX(-10px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { d: 400, delay: 500 + k * 220, e: E.out });
      c.A(tab, [{ opacity: 1 }, { opacity: 0 }], { d: 300, delay: 2000 });
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translate(-6px,-6px)', offset: .35 }, { transform: 'translate(-6px,-6px)', offset: .72 }, { transform: 'none' }], { d: 2300, e: E.io });
  });

  reg(98, 'G', 2700, function (c) {
    var xs = [-14, 20, 54, 88];
    xs.forEach(function (x, i) {
      if (i) { var l = c.add('<line x1="' + (xs[i - 1] + 24) + '" y1="121" x2="' + x + '" y2="121" stroke="#8CB863" stroke-width="2.2" ' + dash().replace('fill="none"', '') + '/>'); draw(c, l.firstChild, 350 + i * 330, 300); }
      var b = c.add('<rect x="' + x + '" y="108" width="26" height="26" rx="6" fill="#26255F" stroke="rgba(255,255,255,.5)" stroke-width="1.6"/><rect x="' + (x + 5) + '" y="115" width="16" height="3" rx="1.5" fill="rgba(255,255,255,.7)"/><rect x="' + (x + 5) + '" y="121" width="11" height="3" rx="1.5" fill="rgba(255,255,255,.5)"/><rect x="' + (x + 5) + '" y="127" width="14" height="2.4" rx="1.2" fill="#8CB863"/>');
      c.A(b, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], { d: 480, delay: 200 + i * 330, e: E.sp });
      c.A(b.firstChild, [{ stroke: 'rgba(255,255,255,.5)' }, { stroke: '#8CB863' }], { d: 300, delay: 1750 + i * 220 });
    });
    var pulse = c.add('<circle cx="0" cy="121" r="4.2" fill="#FFFFFF"/>');
    c.A(pulse, [{ transform: 'translateX(-4px)', opacity: 0 }, { transform: 'translateX(-4px)', opacity: 1, offset: .05 }, { transform: 'translateX(110px)', opacity: 1, offset: .95 }, { transform: 'translateX(110px)', opacity: 0 }], { d: 900, delay: 1700, e: E.lin });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-8px) scale(.9)', offset: .2 }, { transform: 'translateY(-8px) scale(.9)', offset: .85 }, { transform: 'none' }], { d: 2600, e: E.io });
  });

  reg(99, 'G', 4200, function (c) {
    // 紧凑预览;完整的 Welcome 开场见 motion/welcome/welcome.js
    c.A(c.disc, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { d: 900, delay: 400, e: E.out });
    c.A(c.rose, [{ transform: 'rotate(-120deg) scale(.2)', opacity: 0 }, { transform: 'rotate(8deg) scale(1.04)', opacity: 1, offset: .75 }, { transform: 'none', opacity: 1 }], { d: 1200, delay: 800, e: E.out });
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: 'rotate(180deg) scale(0)', opacity: 0 }, { transform: 'rotate(-10deg) scale(1.18)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { d: 900, delay: 1300 + i * 130, e: E.sp }); });
    c.A(c.core, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(2.4) rotate(40deg)', opacity: 1, offset: .5 }, { transform: 'none', opacity: 1 }], { d: 800, delay: 2100, e: E.out });
    c.ripple('G', 2150, 46, 900); c.ripple('W', 2300, 46, 900);
    for (var i = 0; i < 100; i++) {
      var a = (i / 100) * Math.PI * 2 - Math.PI / 2, r = 70;
      var d = c.add('<circle cx="' + (50 + r * Math.cos(a)) + '" cy="' + (50 + r * Math.sin(a)) + '" r="1.4" fill="' + (i % 5 === 0 ? '#D8BD86' : '#FFFFFF') + '"/>');
      c.A(d.firstChild, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.6)', offset: .3 }, { opacity: 1, transform: 'scale(1) translate(0,0)', offset: .6 }, { opacity: 0, transform: 'translate(' + (Math.cos(a) * 34) + 'px,' + (Math.sin(a) * 34) + 'px) scale(.4)' }], { d: 1500, delay: 2300 + i * 14, e: E.out });
    }
  });

  reg(100, 'G', 2600, function (c) {
    var key = c.add('<g><circle cx="-50" cy="50" r="10" fill="none" stroke="#D8BD86" stroke-width="4"/><circle cx="-50" cy="50" r="3" fill="#D8BD86"/><line x1="-40" y1="50" x2="46" y2="50" stroke="#D8BD86" stroke-width="4" stroke-linecap="round"/><line x1="30" y1="50" x2="30" y2="58" stroke="#D8BD86" stroke-width="4" stroke-linecap="round"/><line x1="38" y1="50" x2="38" y2="56" stroke="#D8BD86" stroke-width="4" stroke-linecap="round"/></g>');
    var k = key.firstChild; k.style.transformBox = 'view-box'; k.style.transformOrigin = '50px 50px';
    c.A(k, [{ transform: 'translateX(-90px) rotate(0)', opacity: 0 }, { transform: 'translateX(-90px) rotate(0)', opacity: 1, offset: .06 }, { transform: 'translateX(0) rotate(0)', opacity: 1, offset: .4 }, { transform: 'translateX(0) rotate(0)', opacity: 1, offset: .46 }, { transform: 'translateX(0) rotate(90deg)', opacity: 1, offset: .62 }, { transform: 'translateX(0) rotate(90deg)', opacity: 0, offset: .8 }, { opacity: 0 }], { d: 2000, e: E.io });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.94)', offset: .45 }, { transform: 'scale(.94)', offset: .62 }, { transform: 'scale(1.1)', offset: .78 }, { transform: 'none' }], { d: 2000, e: E.io });
    c.A(c.rose, [{ transform: 'rotate(0)' }, { transform: 'rotate(0)', offset: .45 }, { transform: 'rotate(30deg)', offset: .64 }, { transform: 'rotate(0)' }], { d: 2000, e: E.sp });
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: 'none' }, { transform: 'none', offset: .62 }, { transform: 'scale(1.18)', offset: .74 }, { transform: 'none' }], { d: 2000, delay: i * 30, e: E.sp }); });
    c.ripple('G', 1250, 46, 800); c.ripple('Au', 1400, 46, 800);
    var fl = c.add('<circle cx="50" cy="50" r="50" fill="#FFFFFF"/>');
    c.A(fl.firstChild, [{ opacity: 0 }, { opacity: 0, offset: .6 }, { opacity: .8, offset: .68 }, { opacity: 0 }], { d: 2000 });
  });
})(window.VerdoraMotion = window.VerdoraMotion || {});
