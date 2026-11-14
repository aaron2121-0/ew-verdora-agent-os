/* LogoMotion 01–50:A 首页 / B 客户 / C 销售素材 / D 钱包。
 * 每个动态都是独立构思(见 docs/motion-registry.json 的 concept_zh),不是同一动画的参数变体。 */
(function (R) {
  'use strict';
  var L = R.logoMotion, reg = L.reg, E = L.EASE, P = L.paths;
  var NONE = { transform: 'none' };
  function pop(c, el, delay, d) { c.A(el, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { d: d || 420, delay: delay || 0, e: E.sp }); }
  function draw(c, el, delay, d) { c.A(el, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { d: d || 700, delay: delay || 0, e: E.io }); }
  function dashAttrs() { return 'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" fill="none" stroke-linecap="round" stroke-linejoin="round"'; }
  function petalOutline(col) {
    var s = '';
    for (var i = 0; i < 6; i++) s += '<path d="' + P.PET + '" transform="rotate(' + (i * 60) + ' 50 50)" stroke="' + col + '" stroke-width="1.4" ' + dashAttrs() + '/>';
    return s;
  }

  /* ---------- A 首页 / 任务 01–12 ---------- */
  reg(1, 'G', 1900, function (c) {
    c.A(c.disc, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'none' }], { d: 500 });
    c.A(c.rose, [{ opacity: 0, transform: 'scale(.3) rotate(-60deg)' }, { opacity: 1, transform: 'none' }], { d: 700, delay: 100 });
    c.pets.forEach(function (p, i) {
      c.A(p, [{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1.14) rotate(4deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { d: 700, delay: 350 + i * 140, e: E.sp });
    });
    c.A(c.core, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.8) rotate(25deg)', opacity: 1, offset: 0.55 }, { transform: 'none', opacity: 1 }], { d: 650, delay: 1250 });
    c.ripple('G', 1300);
  });

  reg(2, 'G', 2000, function (c) {
    var g = c.add('<path d="' + P.ROSE + '" stroke="#8CB863" stroke-width="1.6" ' + dashAttrs() + '/>' + petalOutline('#8CB863'));
    c.kids(g).forEach(function (k, i) { draw(c, k, i ? 250 + i * 90 : 0, i ? 600 : 900); });
    c.A(g, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { d: 2000 });
    [c.disc, c.rose, c.core].concat(c.pets).forEach(function (e) {
      c.A(e, [{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { d: 1900, delay: 0, e: E.lin });
    });
  });

  reg(3, 'Au', 1900, function (c) {
    var g = c.add('<circle cx="50" cy="50" r="57" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/><circle cx="50" cy="50" r="57" stroke="#D8BD86" stroke-width="4" transform="rotate(-90 50 50)" ' + dashAttrs() + '/>');
    draw(c, g.children[1], 100, 1300);
    c.A(c.rose, [{ transform: 'scale(.9)', opacity: .55 }, { transform: 'scale(.9) rotate(18deg)', opacity: 1, offset: .7 }, { transform: 'scale(1.08)', offset: .85 }, { transform: 'none' }], { d: 1700, delay: 100, e: E.io });
    c.ripple('Au', 1450); c.burst(10, ['Au', 'W'], 1450, 58, 80, 1.8, 600);
  });

  reg(4, 'G', 2200, function (c) {
    var a = c.clone(), b = c.clone();
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.6)', offset: .25 }, { transform: 'scale(.6)', offset: .6 }, { transform: 'scale(1.1)', offset: .85 }, { transform: 'none' }], { d: 2200, e: E.io });
    c.A(a, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(.6)', opacity: 1, offset: .25 }, { transform: 'translate(-38px,0) scale(.6)', opacity: 1, offset: .45 }, { transform: 'translate(-38px,0) scale(.6)', opacity: 1, offset: .58 }, { transform: 'scale(.6)', opacity: 0, offset: .8 }, { transform: 'scale(.6)', opacity: 0 }], { d: 2200, e: E.io });
    c.A(b, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(.6)', opacity: 1, offset: .25 }, { transform: 'translate(38px,0) scale(.6)', opacity: 1, offset: .45 }, { transform: 'translate(38px,0) scale(.6)', opacity: 1, offset: .58 }, { transform: 'scale(.6)', opacity: 0, offset: .8 }, { transform: 'scale(.6)', opacity: 0 }], { d: 2200, e: E.io });
    c.ripple('G', 1800);
  });

  reg(5, 'B', 2000, function (c) {
    for (var i = 0; i < 3; i++) {
      var g = c.add('<rect x="10" y="20" width="80" height="60" rx="9" fill="rgba(255,255,255,.10)" stroke="#8CB863" stroke-width="1.5"/><rect x="18" y="30" width="34" height="4" rx="2" fill="#8CB863"/><rect x="18" y="40" width="50" height="3" rx="1.5" fill="rgba(255,255,255,.5)"/>', true);
      var tx = (i - 1) * 9 + 'px,' + (i - 1) * 7 + 'px';
      c.A(g, [{ transform: 'translate(' + tx + ') scaleX(0)', opacity: 0 }, { transform: 'translate(' + tx + ') scaleX(1)', opacity: .9 }, { transform: 'translate(' + tx + ') scaleX(1)', opacity: .9, offset: .65 }, { transform: 'translate(' + tx + ') scaleX(0)', opacity: 0 }], { d: 1500, delay: 200 + i * 220, e: E.io });
    }
    c.A(c.logo, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)', offset: .35 }, { transform: 'scaleX(1)', offset: .7 }, { transform: 'none' }], { d: 1300, delay: 500, e: E.io });
  });

  reg(6, 'B', 2200, function (c) {
    c.setLogoStyle('transformOrigin', '50px -30px');
    c.A(c.logo, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(17deg)', offset: .18 }, { transform: 'rotate(-13deg)', offset: .4 }, { transform: 'rotate(8deg)', offset: .6 }, { transform: 'rotate(-4deg)', offset: .8 }, { transform: 'rotate(0deg)' }], { d: 2000, e: E.io });
    c.ripple('B', 350); c.ripple('B', 800); c.ripple('B', 1250);
    c.add('<line x1="50" y1="-30" x2="50" y2="2" stroke="rgba(255,255,255,.25)" stroke-width="1.2"/>', true);
  });

  reg(7, 'Au', 2400, function (c) {
    var order = [[c.disc, 0], [c.rose, 450], [null, 900], [c.core, 1350]];
    order.forEach(function (o) {
      var els = o[0] ? [o[0]] : c.pets;
      els.forEach(function (e, i) { c.A(e, [{ opacity: .1, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1.06)', offset: .6 }, { opacity: 1, transform: 'none' }], { d: 500, delay: o[1] + (o[0] ? 0 : i * 35), e: E.out }); });
    });
    for (var i = 0; i < 4; i++) {
      var d = c.add('<circle cx="' + (24 + i * 17.3) + '" cy="118" r="4.5" fill="#D8BD86"/>');
      c.A(d.firstChild, [{ opacity: .2, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.35)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { d: 450, delay: i * 450, e: E.sp });
    }
  });

  reg(8, 'Au', 2200, function (c) {
    var id = c.id();
    c.defs.innerHTML = '<clipPath id="' + id + '"><circle cx="50" cy="50" r="46"/></clipPath>';
    var g = c.add('<g clip-path="url(#' + id + ')"><g class="r"><g class="w"><path d="M-70 0 q15 -9 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V130 H-70Z" fill="#D8BD86" opacity=".6"/></g></g></g>');
    var rise = g.firstChild.firstChild, wave = rise.firstChild;
    c.A(rise, [{ transform: 'translate(0,112px)' }, { transform: 'translate(0,26px)' }], { d: 1700, e: E.io });
    c.A(wave, [{ transform: 'translate(0,0)' }, { transform: 'translate(-60px,0)' }], { d: 700, it: 3, e: E.lin });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.04)', offset: .85 }, { transform: 'none' }], { d: 2000 });
    c.burst(8, ['Au', 'W'], 1750, 46, 66, 1.8, 600);
  });

  reg(9, 'G', 2300, function (c) {
    var ring = c.add('<circle cx="50" cy="50" r="60" fill="none" stroke="rgba(140,184,99,.35)" stroke-dasharray="2 3"/>');
    var sweep = c.add('<path d="M50 50 L50 -10 A60 60 0 0 1 96 11 Z" fill="#8CB863" opacity=".38"/><circle cx="50" cy="50" r="60" fill="none"/>');
    c.A(sweep, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { d: 1300, e: E.io });
    var target = 2;
    for (var i = 0; i < 6; i++) {
      var a = (i * 60 - 90) * Math.PI / 180;
      var d = c.add('<circle cx="' + (50 + 60 * Math.cos(a)) + '" cy="' + (50 + 60 * Math.sin(a)) + '" r="' + (i === target ? 4.5 : 2.5) + '" fill="' + (i === target ? '#D8BD86' : '#8CB863') + '"/>');
      c.A(d.firstChild, [{ opacity: .2, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(' + (i === target ? 1.8 : 1.3) + ')', offset: .5 }, { opacity: i === target ? 1 : .5, transform: 'scale(1)' }], { d: 500, delay: 150 + i * 200 });
    }
    c.A(c.pets[target], [{ transform: 'none' }, { transform: 'scale(1.2)', offset: .5 }, { transform: 'scale(1.1)' }, { transform: 'none' }], { d: 900, delay: 1350, e: E.sp });
    c.ripple('Au', 1450, 20); c.A(ring, [{ opacity: 0 }, { opacity: 1 }], { d: 300 });
  });

  reg(10, 'O', 2000, function (c) {
    c.A(c.logo, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(6px) scale(1.04,.92)', offset: .14 }, { transform: 'translateY(-130px) scale(.9,1.12)', opacity: 1, offset: .46 }, { transform: 'translateY(-150px)', opacity: 0, offset: .5 }, { transform: 'translateY(130px)', opacity: 0, offset: .54 }, { transform: 'translateY(-4px) scale(1.02,.97)', opacity: 1, offset: .86 }, { transform: 'none', opacity: 1 }], { d: 2000, e: E.io });
    var flame = c.add('<path d="M50 102 C58 114 56 128 50 140 C44 128 42 114 50 102Z" fill="#FF9F43"/>', true);
    c.A(flame, [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'scaleY(1)', offset: .15 }, { opacity: 1, transform: 'scaleY(1.4)', offset: .4 }, { opacity: 0, transform: 'scaleY(.2)', offset: .5 }, { opacity: 0 }], { d: 1000 });
    for (var i = 0; i < 9; i++) {
      var t = c.add('<circle cx="' + (50 + (i % 3 - 1) * 9 + (i * 3 % 7 - 3)) + '" cy="96" r="' + (2 + i % 3) + '" fill="' + (i % 2 ? '#FFFFFF' : '#FF9F43') + '" opacity="0"/>', true);
      c.A(t.firstChild, [{ opacity: 0, transform: 'translateY(0)' }, { opacity: .9, offset: .2 }, { opacity: 0, transform: 'translateY(' + (20 + i * 5) + 'px) scale(.3)' }], { d: 650, delay: 180 + i * 55 });
    }
  });

  reg(11, 'Y', 2000, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.16)', offset: .18 }, { transform: 'none' }], { d: 600, e: E.sp });
    c.burst(20, ['G', 'Au', 'Y', 'W', 'B', 'O'], 100, 40, 92, 2.4, 1100);
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2, x = 50 + Math.cos(a) * 34, y = 50 + Math.sin(a) * 34;
      var r = c.add('<rect x="' + x + '" y="' + y + '" width="3" height="8" rx="1" fill="' + ['#8CB863', '#D8BD86', '#F5C542', '#6FB1FF'][i % 4] + '"/>');
      c.A(r.firstChild, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * 52) + 'px,' + (Math.sin(a) * 52 - 18) + 'px) rotate(' + (200 + i * 40) + 'deg)', opacity: 1, offset: .45 }, { transform: 'translate(' + (Math.cos(a) * 66) + 'px,' + (Math.sin(a) * 66 + 56) + 'px) rotate(' + (480 + i * 40) + 'deg)', opacity: 0 }], { d: 1600, delay: 150 + (i % 4) * 40, e: E.out });
    }
  });

  reg(12, 'G', 2200, function (c) {
    c.A(c.logo, [{ transform: 'scale(.9)', opacity: .35 }, { transform: 'none', opacity: 1 }], { d: 1200, delay: 700, e: E.out });
    var spine = c.add('<line x1="50" y1="14" x2="50" y2="86" stroke="#D8BD86" stroke-width="1.5"/>');
    pop(c, spine.firstChild, 0, 300);
    for (var i = 0; i < 3; i++) {
      var pg = c.add('<path d="M50 14 Q74 8 92 16 V82 Q74 74 50 86 Z" fill="rgba(255,255,255,.16)" stroke="#8CB863" stroke-width="1.3"/>');
      pg.style.transformOrigin = '0% 50%';
      c.A(pg, [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(-1)', opacity: .8 }, { transform: 'scaleX(-1)', opacity: 0 }], { d: 650, delay: 250 + i * 330, e: E.io });
    }
    var lp = c.add('<path d="M50 14 Q26 8 8 16 V82 Q26 74 50 86 Z" fill="rgba(255,255,255,.1)" stroke="#8CB863" stroke-width="1.3"/>');
    c.A(lp, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { d: 1800, delay: 200 });
  });

  /* ---------- B 客户 Leads 13–26 ---------- */
  reg(13, 'G', 1600, function (c) {
    var plus = c.add('<rect x="42" y="22" width="16" height="56" rx="4" fill="#8CB863"/><rect x="22" y="42" width="56" height="16" rx="4" fill="#8CB863"/>');
    c.A(plus, [{ transform: 'rotate(0deg) scale(1)', opacity: 1 }, { transform: 'rotate(90deg) scale(1.15)', opacity: 1, offset: .5 }, { transform: 'rotate(180deg) scale(0)', opacity: 0 }], { d: 900, e: E.io });
    c.A(c.logo, [{ transform: 'scale(.1) rotate(-90deg)', opacity: 0 }, { transform: 'scale(.1) rotate(-90deg)', opacity: 0, offset: .4 }, { transform: 'scale(1.1) rotate(6deg)', opacity: 1, offset: .75 }, { transform: 'none', opacity: 1 }], { d: 1500, e: E.sp });
    c.ripple('G', 800);
  });

  reg(14, 'G', 2000, function (c) {
    [-90, -20, 50, 130, 200].forEach(function (deg, i) {
      var a = deg * Math.PI / 180, cx = Math.cos(a), cy = Math.sin(a);
      var x1 = 50 + cx * 49, y1 = 50 + cy * 49, x2 = 50 + cx * 74, y2 = 50 + cy * 74;
      var g = c.add('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#8CB863" stroke-width="2" ' + dashAttrs() + '/>' +
        '<line x1="' + (50 + cx * 64) + '" y1="' + (50 + cy * 64) + '" x2="' + (50 + Math.cos(a + .6) * 76) + '" y2="' + (50 + Math.sin(a + .6) * 76) + '" stroke="#8CB863" stroke-width="1.4" ' + dashAttrs() + '/>' +
        '<circle cx="' + x2 + '" cy="' + y2 + '" r="4.2" fill="#D8BD86"/>');
      draw(c, g.children[0], 150 + i * 220, 450); draw(c, g.children[1], 450 + i * 220, 300);
      pop(c, g.children[2], 560 + i * 220, 380);
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.94)', offset: .5 }, { transform: 'none' }], { d: 1800 });
  });

  reg(15, 'Au', 2400, function (c) {
    var sh = ['<circle r="4.2" fill="#F5C542"/>', '<rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#6FB1FF"/>', '<path d="M0 -5 L5 4 H-5Z" fill="#8CB863"/>', '<path d="M0 -5 L5 0 L0 5 L-5 0Z" fill="#B48CFF"/>', '<path d="M0 4 C-7 -1 -5 -6 0 -3 C5 -6 7 -1 0 4Z" fill="#E5484D"/>', '<path d="M0 -5 L1.6 -1.6 L5 -1.4 L2.4 1 L3.2 4.6 L0 2.8 L-3.2 4.6 L-2.4 1 L-5 -1.4 L-1.6 -1.6Z" fill="#D8BD86"/>', '<path d="M-2.5 -4.3 H2.5 L5 0 L2.5 4.3 H-2.5 L-5 0Z" fill="#FF9F43"/>', '<path d="M-1.6 -5 H1.6 V-1.6 H5 V1.6 H1.6 V5 H-1.6 V1.6 H-5 V-1.6 H-1.6Z" fill="#FFFFFF"/>', '<path d="M0 -5 C4 0 5 2 5 3 A5 5 0 0 1 -5 3 C-5 2 -4 0 0 -5Z" fill="#7AD7C9"/>'];
    var m = '<circle cx="50" cy="50" r="64" fill="none" stroke="rgba(255,255,255,.12)"/>';
    sh.forEach(function (s, i) { var a = (i / 9) * Math.PI * 2 - Math.PI / 2; m += '<g transform="translate(' + (50 + 64 * Math.cos(a)) + ' ' + (50 + 64 * Math.sin(a)) + ') scale(1.5)">' + s + '</g>'; });
    var ring = c.add(m);
    c.A(ring, [{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(120deg)', opacity: 1, offset: .2 }, { transform: 'rotate(360deg)', opacity: 1, offset: .85 }, { transform: 'rotate(400deg)', opacity: 0 }], { d: 2300, e: E.io });
    var hi = c.add('<circle cx="50" cy="-14" r="8" fill="none" stroke="#D8BD86" stroke-width="2"/>');
    c.A(hi, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.2)' }], { d: 2300 });
    c.A(c.logo, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)', offset: .5 }, { transform: 'rotate(0)' }], { d: 2300, e: E.io });
  });

  reg(16, 'Au', 2000, function (c) {
    var rim = c.add('<circle cx="50" cy="50" r="52" fill="none" stroke="#D8BD86" stroke-width="4"/><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(216,189,134,.5)" stroke-width="1"/>');
    var flip = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)', offset: .25 }, { transform: 'scaleX(-1)', offset: .5 }, { transform: 'scaleX(0)', offset: .75 }, { transform: 'scaleX(1)' }];
    c.A(c.logo, flip, { d: 1500, delay: 100, e: E.io }); c.A(rim, flip, { d: 1500, delay: 100, e: E.io });
    var sp = c.add('<path d="M96 14 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#FFFFFF"/><path d="M0 70 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" fill="#FFFFFF"/>');
    c.A(sp, [{ opacity: 0, transform: 'scale(0) rotate(0)' }, { opacity: 1, transform: 'scale(1.2) rotate(90deg)', offset: .5 }, { opacity: 0, transform: 'scale(0) rotate(180deg)' }], { d: 900, delay: 1100 });
  });

  reg(17, 'Au', 2200, function (c) {
    c.add('<rect x="2" y="2" width="96" height="96" rx="12" fill="none" stroke="#D8BD86" stroke-width="2"/><circle cx="28" cy="2" r="3.5" fill="#D8BD86"/><circle cx="72" cy="2" r="3.5" fill="#D8BD86"/>', true);
    for (var i = 0; i < 3; i++) {
      var pg = c.add('<rect x="8" y="14" width="84" height="78" rx="6" fill="#FAF7F0" stroke="#D8BD86" stroke-width="1.5"/><rect x="18" y="26" width="30" height="5" rx="2" fill="#8CB863"/><rect x="18" y="40" width="64" height="3" rx="1.5" fill="rgba(38,37,95,.35)"/>');
      pg.style.transformOrigin = '50% 0%';
      c.A(pg, [{ transform: 'scaleY(1)', opacity: .96 }, { transform: 'scaleY(1)', opacity: .96, offset: .3 }, { transform: 'scaleY(0)', opacity: .96, offset: .8 }, { transform: 'scaleY(0)', opacity: 0 }], { d: 700 + i * 0, delay: 100 + i * 520, e: E.io });
    }
    c.A(c.logo, [{ transform: 'scale(.9)', opacity: .0 }, { transform: 'scale(.9)', opacity: 0, offset: .7 }, { transform: 'scale(1.06)', opacity: 1, offset: .9 }, { transform: 'none', opacity: 1 }], { d: 1800, delay: 200, e: E.sp });
  });

  reg(18, 'B', 2200, function (c) {
    var t = '';
    for (var i = 0; i < 12; i++) { var a = i * 30 * Math.PI / 180; t += '<line x1="' + (50 + 58 * Math.sin(a)) + '" y1="' + (50 - 58 * Math.cos(a)) + '" x2="' + (50 + 64 * Math.sin(a)) + '" y2="' + (50 - 64 * Math.cos(a)) + '" stroke="' + (i % 3 ? 'rgba(255,255,255,.5)' : '#D8BD86') + '" stroke-width="' + (i % 3 ? 1.4 : 2.4) + '" stroke-linecap="round"/>'; }
    var ticks = c.add(t);
    c.A(ticks, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'scale(1)' }], { d: 400 });
    var mh = c.add('<line x1="50" y1="50" x2="50" y2="-6" stroke="#D8BD86" stroke-width="3.2" stroke-linecap="round"/><line x1="50" y1="50" x2="50" y2="106" stroke="transparent"/>');
    var hh = c.add('<line x1="50" y1="50" x2="50" y2="22" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round"/><line x1="50" y1="50" x2="50" y2="78" stroke="transparent"/>');
    c.A(mh, [{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(0deg)', opacity: 1, offset: .1 }, { transform: 'rotate(720deg)', opacity: 1 }], { d: 1900, e: E.io });
    c.A(hh, [{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(0deg)', opacity: 1, offset: .1 }, { transform: 'rotate(60deg)', opacity: 1 }], { d: 1900, e: E.io });
    var dot = c.add('<circle cx="50" cy="50" r="4" fill="#D8BD86" stroke="#26255F" stroke-width="1.5"/>'); pop(c, dot.firstChild, 100, 300);
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.97)', offset: .5 }, { transform: 'none' }], { d: 2000 });
  });

  reg(19, 'W', 2000, function (c) {
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: 'none' }, { transform: 'rotate(-58deg) scale(.5)', offset: .38 }, { transform: 'rotate(-58deg) scale(.5)', offset: .52 }, { transform: 'rotate(8deg) scale(1.1)', offset: .8 }, { transform: 'none' }], { d: 1500, delay: i * 25, e: E.io }); });
    c.A(c.core, [{ transform: 'none' }, { transform: 'scale(.5)', offset: .4 }, { transform: 'scale(1.5)', offset: .55 }, { transform: 'none' }], { d: 1500, e: E.io });
    var fl = c.add('<circle cx="50" cy="50" r="48" fill="#FFFFFF"/>');
    c.A(fl.firstChild, [{ opacity: 0 }, { opacity: .95 }, { opacity: 0 }], { d: 260, delay: 780 });
    var br = '';[[-8, -8, 1, 1], [108, -8, -1, 1], [-8, 108, 1, -1], [108, 108, -1, -1]].forEach(function (b) { br += '<path d="M' + (b[0] + 14 * b[2]) + ' ' + b[1] + ' H' + b[0] + ' V' + (b[1] + 14 * b[3]) + '" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>'; });
    var vf = c.add(br);
    c.A(vf, [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'scale(1)', offset: .25 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { d: 1900 });
  });

  reg(20, 'B', 2400, function (c) {
    var xs = []; for (var i = 0; i < 6; i++) xs.push(-10 + i * 24);
    var ln = c.add('<line x1="-10" y1="120" x2="110" y2="120" stroke="rgba(255,255,255,.2)" stroke-width="3" stroke-linecap="round"/><line x1="-10" y1="120" x2="110" y2="120" stroke="#8CB863" stroke-width="3" stroke-linecap="round" ' + dashAttrs().replace('fill="none"', '') + '/>');
    c.A(ln.children[1], [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { d: 1500, delay: 400, e: E.io });
    xs.forEach(function (x, i) {
      var n = c.add('<circle cx="' + x + '" cy="120" r="5.5" fill="#26255F" stroke="#8CB863" stroke-width="2"/>');
      c.A(n.firstChild, [{ fill: '#26255F', transform: 'scale(1)' }, { fill: '#8CB863', transform: 'scale(1.4)', offset: .4 }, { fill: '#8CB863', transform: 'scale(1)' }], { d: 420, delay: 480 + i * 240 });
    });
    var kf = [{ transform: 'none' }, { transform: 'translate(' + (xs[0] - 50) + 'px,70px) scale(.28)', offset: .14 }];
    xs.forEach(function (x, i) { kf.push({ transform: 'translate(' + (x - 50) + 'px,70px) scale(.28)', offset: .14 + (i + 1) * .1 }); });
    kf.push({ transform: 'scale(1.06)', offset: .86 }); kf.push({ transform: 'none' });
    kf[kf.length - 3] = { transform: 'translate(' + (xs[5] - 50) + 'px,70px) scale(.28)', offset: .74 };
    c.A(c.logo, kf, { d: 2300, e: E.io });
  });

  reg(21, 'Y', 2100, function (c) {
    var bell = c.add('<path d="M90 2 C90 -10 94 -15 100 -15 C106 -15 110 -10 110 2 L114 8 H86Z" fill="#F5C542" stroke="#FFFFFF" stroke-width="1.2"/><circle cx="100" cy="12" r="3" fill="#F5C542"/><circle cx="100" cy="-19" r="2.2" fill="#F5C542"/>');
    bell.style.transformOrigin = '100px -18px';
    c.A(bell, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .12 }, { transform: 'rotate(24deg)', offset: .25 }, { transform: 'rotate(-20deg)', offset: .4 }, { transform: 'rotate(14deg)', offset: .55 }, { transform: 'rotate(-9deg)', offset: .7 }, { transform: 'rotate(4deg)', offset: .85 }, { transform: 'rotate(0deg)', opacity: 1 }], { d: 1900, e: E.out });
    [0, 1].forEach(function (i) {
      var w = c.add('<path d="M' + (116 + i * 8) + ' -8 q' + (7 + i * 3) + ' 10 0 20" fill="none" stroke="#F5C542" stroke-width="2" stroke-linecap="round"/>');
      c.A(w, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1 }, { opacity: 0, transform: 'translateX(6px)' }], { d: 700, delay: 350 + i * 250, it: 2 });
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'rotate(-4deg)', offset: .25 }, { transform: 'rotate(3deg)', offset: .4 }, { transform: 'none' }], { d: 1500, delay: 250 });
  });

  reg(22, 'N', 2400, function (c) {
    c.pets.forEach(function (p, i) {
      var s = i % 2 ? 7 : -7;
      c.A(p, [{ transform: 'none', opacity: 1 }, { transform: 'rotate(12deg) ' + c.vec(i, 0, 5), opacity: 1, offset: .3 }, { transform: 'rotate(' + (s * 5) + 'deg) ' + c.vec(i, s, 48), opacity: 0, offset: .62 }, { transform: 'scale(0)', opacity: 0, offset: .72 }, { transform: 'scale(1.1)', opacity: 1, offset: .9 }, { transform: 'none', opacity: 1 }], { d: 2300, delay: i * 90, e: E.io });
    });
    c.A(c.rose, [{ filter: 'none' }, { filter: 'saturate(.2) brightness(.7)', offset: .5 }, { filter: 'saturate(.2) brightness(.7)', offset: .7 }, { filter: 'none' }], { d: 2300, e: E.io });
    c.A(c.core, [{ transform: 'none' }, { transform: 'scale(.6)', offset: .5 }, { transform: 'none' }], { d: 2300, e: E.io });
  });

  reg(23, 'G', 1900, function (c) {
    var st = c.add('<circle cx="50" cy="50" r="30" fill="#FFFFFF" opacity=".92"/><circle cx="50" cy="50" r="30" fill="none" stroke="#8CB863" stroke-width="5"/><circle cx="50" cy="50" r="23" fill="none" stroke="#8CB863" stroke-width="1.4" stroke-dasharray="3 3"/><path d="M36 51 L46 61 L65 39" fill="none" stroke="#8CB863" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>');
    c.A(st, [{ transform: 'scale(2.6) rotate(-14deg)', opacity: 0 }, { transform: 'scale(2.6) rotate(-14deg)', opacity: 0, offset: .15 }, { transform: 'scale(1) rotate(-8deg)', opacity: 1, offset: .42 }, { transform: 'scale(.94) rotate(-8deg)', offset: .5 }, { transform: 'scale(1) rotate(-8deg)', opacity: 1, offset: .6 }, { transform: 'scale(1) rotate(-8deg)', opacity: 1, offset: .85 }, { transform: 'scale(1) rotate(-8deg)', opacity: 0 }], { d: 1800, e: E.in });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'none', offset: .42 }, { transform: 'scale(1.0,.9)', offset: .5 }, { transform: 'scale(1.03,1.03)', offset: .62 }, { transform: 'none' }], { d: 1800 });
    c.ripple('G', 780, 36, 900); c.ripple('G', 900, 36, 900); c.burst(12, ['G', 'W'], 780, 36, 78, 2, 700);
  });

  reg(24, 'B', 2300, function (c) {
    var bm = c.add('<rect x="-12" y="-1.5" width="124" height="3" rx="1.5" fill="#6FB1FF"/><rect x="-12" y="-9" width="124" height="18" fill="#6FB1FF" opacity=".18"/>');
    c.A(bm, [{ transform: 'translateY(-4px)', opacity: 0 }, { transform: 'translateY(-4px)', opacity: 1, offset: .05 }, { transform: 'translateY(104px)', opacity: 1, offset: .95 }, { transform: 'translateY(104px)', opacity: 0 }], { d: 1300, e: E.io });
    c.A(c.logo, [{ filter: 'brightness(.65)' }, { filter: 'brightness(1.12)', offset: .5 }, { filter: 'none' }], { d: 1300, e: E.lin });
    [[14, 'OCCASION'], [38, 'BUDGET'], [62, 'DATE']].forEach(function (r, i) {
      var chip = c.add('<rect x="106" y="' + r[0] + '" width="32" height="12" rx="6" fill="rgba(111,177,255,.22)" stroke="#6FB1FF" stroke-width="1.2"/><rect x="112" y="' + (r[0] + 4.5) + '" width="' + (12 + i * 4) + '" height="3" rx="1.5" fill="#FFFFFF" opacity=".85"/>');
      chip.style.transformOrigin = '0% 50%';
      c.A(chip, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { d: 450, delay: 1100 + i * 300, e: E.sp });
      var ln = c.add('<line x1="94" y1="' + (r[0] + 6) + '" x2="106" y2="' + (r[0] + 6) + '" stroke="#6FB1FF" stroke-width="1.2" ' + dashAttrs().replace('fill="none"', '') + '/>');
      draw(c, ln.firstChild, 1050 + i * 300, 250);
    });
  });

  reg(25, 'B', 2400, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translate(-16px,0) scale(.82)', offset: .2 }, { transform: 'translate(-16px,0) scale(.82)', offset: .8 }, { transform: 'none' }], { d: 2300, e: E.io });
    var ln = c.add('<line x1="112" y1="-10" x2="112" y2="110" stroke="#8CB863" stroke-width="2" ' + dashAttrs().replace('fill="none"', '') + '/>');
    draw(c, ln.firstChild, 200, 800);
    var ev = c.add('');
    [6, 32, 58, 84].forEach(function (y, i) {
      var g = c.add('<circle cx="112" cy="' + y + '" r="4.5" fill="#26255F" stroke="#8CB863" stroke-width="2"/><rect x="120" y="' + (y - 3) + '" width="' + (14 + i * 3) + '" height="3" rx="1.5" fill="#FFFFFF" opacity=".8"/><rect x="120" y="' + (y + 3) + '" width="10" height="2.4" rx="1.2" fill="#8CB863"/>');
      c.A(g, [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { d: 500, delay: 500 + i * 340 });
      c.A(g.firstChild, [{ fill: '#26255F' }, { fill: '#8CB863' }], { d: 300, delay: 700 + i * 340 });
    });
  });

  reg(26, 'Y', 2000, function (c) {
    for (var i = 0; i < 3; i++) {
      var t = c.add('<polygon points="50,-6 102,84 -2,84" fill="none" stroke="#F5C542" stroke-width="2.6" stroke-linejoin="round"/>');
      c.A(t.firstChild, [{ transform: 'scale(.7)', opacity: .9 }, { transform: 'scale(1.5)', opacity: 0 }], { d: 900, delay: 150 + i * 420 });
    }
    var b = c.add('<polygon points="104,-14 126,24 82,24" fill="#F5C542" stroke="#FFFFFF" stroke-width="1.4" stroke-linejoin="round"/><rect x="102.5" y="-2" width="3" height="14" rx="1.5" fill="#26255F"/><circle cx="104" cy="17" r="2" fill="#26255F"/>');
    c.A(b, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: .35 }, { transform: 'scale(1)', opacity: 1, offset: .55 }, { transform: 'scale(1.12)', offset: .7 }, { transform: 'scale(1)', opacity: 1, offset: .85 }, { transform: 'scale(1)', opacity: 0 }], { d: 1900, e: E.sp });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'sepia(.6) saturate(1.8) hue-rotate(-10deg)', offset: .3 }, { filter: 'none', offset: .8 }, { filter: 'none' }], { d: 1900 });
  });

  /* ---------- C 销售素材 27–38 ---------- */
  reg(27, 'G', 2200, function (c) {
    c.A(c.disc, [{ transform: 'translate(-80px,10px) rotate(-30deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { d: 700, delay: 0, e: E.sp });
    c.A(c.rose, [{ transform: 'translate(0,-90px) rotate(40deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { d: 700, delay: 280, e: E.sp });
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: c.vec(i, 0, 0) + ' translate(0,-70px) rotate(25deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { d: 600, delay: 650 + i * 110, e: E.sp }); });
    c.A(c.core, [{ transform: 'scale(4) rotate(60deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { d: 600, delay: 1450, e: E.sp });
    c.ripple('G', 1800, 30);
    for (var i = 0; i < 4; i++) { var tab = c.add('<circle cx="' + [50, 96, 50, 4][i] + '" cy="' + [4, 50, 96, 50][i] + '" r="4" fill="#D8BD86"/>'); c.A(tab.firstChild, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)', offset: .3 }, { opacity: 0, transform: 'scale(0)' }], { d: 500, delay: 1700 + i * 60 }); }
  });

  reg(28, 'W', 2200, function (c) {
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-8px)' }], { d: 500, e: E.out });
    var bars = [[100, 76], [112, 52]];
    bars.forEach(function (b, i) {
      var g = c.add('<rect x="12" y="' + b[0] + '" width="' + b[1] + '" height="6" rx="3" fill="rgba(255,255,255,.88)"/>');
      g.style.transformOrigin = '0% 50%';
      c.A(g, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 700 + i * 200, delay: 500 + i * 800, e: 'steps(11,end)' });
    });
    var cur = c.add('<rect x="10" y="97" width="2.4" height="12" rx="1" fill="#8CB863"/>');
    c.A(cur, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(76px,0)', opacity: 1, offset: .5 }, { transform: 'translate(76px,0)', opacity: 1, offset: .52 }, { transform: 'translate(0,12px)', opacity: 1, offset: .56 }, { transform: 'translate(52px,12px)', opacity: 1, offset: .95 }, { transform: 'translate(52px,12px)', opacity: 1 }], { d: 1900, delay: 500, e: 'steps(12,end)' });
    c.A(cur, [{ opacity: 1 }, { opacity: 0 }], { d: 380, delay: 2000, it: 1 });
  });

  reg(29, 'Au', 2200, function (c) {
    var sheet = c.add('<rect x="8" y="104" width="84" height="24" rx="3" fill="#F5EFE4"/><rect x="18" y="111" width="50" height="3" rx="1.5" fill="#26255F" opacity=".6"/><rect x="18" y="118" width="36" height="3" rx="1.5" fill="#8CB863"/>');
    c.A(sheet, [{ transform: 'scaleX(.04)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { d: 1200, delay: 250, e: E.io });
    [[8, -40], [92, 40]].forEach(function (r, i) {
      var cyl = c.add('<rect x="' + (r[0] - 4) + '" y="102" width="8" height="28" rx="4" fill="#D8BD86" stroke="#B8963F" stroke-width="1"/>');
      c.A(cyl, [{ transform: 'translateX(' + (-r[1]) + 'px)' }, { transform: 'translateX(0)' }], { d: 1200, delay: 250, e: E.io });
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-10px) scale(.95)' }, { transform: 'translateY(-6px) scale(.95)' }], { d: 1500, e: E.out });
  });

  reg(30, 'P', 2400, function (c) {
    for (var i = 0; i < 4; i++) {
      var tr = c.add('<rect x="' + (8 + i * 22) + '" y="-28" width="19" height="3.4" rx="1.7" fill="rgba(255,255,255,.28)"/>');
      var fl = c.add('<rect x="' + (8 + i * 22) + '" y="-28" width="19" height="3.4" rx="1.7" fill="#FFFFFF"/>');
      fl.style.transformOrigin = '0% 50%';
      c.A(fl, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { d: 520, delay: 150 + i * 520, e: E.lin });
    }
    c.A(c.logo, [{ transform: 'translateY(46px)', opacity: 0 }, { transform: 'none', opacity: 1, offset: .22 }, { transform: 'none', opacity: 1, offset: .46 }, { transform: 'translateY(-46px)', opacity: 0, offset: .52 }, { transform: 'translateY(46px)', opacity: 0, offset: .54 }, { transform: 'none', opacity: 1, offset: .74 }, { transform: 'none', opacity: 1, offset: .88 }, { transform: 'scale(1.05)', offset: .94 }, { transform: 'none' }], { d: 2300, e: E.io });
  });

  reg(31, 'G', 1900, function (c) {
    var b = c.add('<path d="M70 -14 h44 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-30 l-10 9 v-9 h-4 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8z" fill="#8CB863"/><circle cx="86" cy="3" r="2.6" fill="#FFFFFF"/><circle cx="96" cy="3" r="2.6" fill="#FFFFFF"/><circle cx="106" cy="3" r="2.6" fill="#FFFFFF"/>');
    b.style.transformOrigin = '30% 100%';
    c.A(b, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { d: 520, delay: 200, e: E.sp });
    for (var i = 0; i < 3; i++) c.A(b.children[i + 1], [{ transform: 'translateY(0)' }, { transform: 'translateY(-4.5px)' }, { transform: 'translateY(0)' }], { d: 480, delay: 700 + i * 130, it: 3 });
    c.A(b, [{ opacity: 1 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { d: 1800, delay: 0 });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translate(-5px,3px) rotate(-3deg)', offset: .3 }, { transform: 'none' }], { d: 1200, delay: 150, e: E.sp });
  });

  reg(32, 'G', 2400, function (c) {
    var spec = [[-36, 74, '#8CB863', 46], [92, 38, '#FFFFFF', 30], [-36, 0, '#8CB863', 40]];
    var prev = null;
    spec.forEach(function (s, i) {
      var g = c.add('<rect x="' + s[0] + '" y="' + s[1] + '" width="44" height="20" rx="9" fill="' + s[2] + '" opacity="' + (s[2] === '#FFFFFF' ? .92 : 1) + '"/><rect x="' + (s[0] + 8) + '" y="' + (s[1] + 6) + '" width="' + s[3] * .5 + '" height="3" rx="1.5" fill="' + (s[2] === '#FFFFFF' ? '#26255F' : '#FFFFFF') + '"/><rect x="' + (s[0] + 8) + '" y="' + (s[1] + 11.5) + '" width="' + s[3] * .3 + '" height="2.6" rx="1.3" fill="' + (s[2] === '#FFFFFF' ? '#8CB863' : 'rgba(255,255,255,.7)') + '"/>');
      g.style.transformOrigin = i === 1 ? '100% 100%' : '0% 100%';
      c.A(g, [{ transform: 'scale(0) translateY(12px)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { d: 520, delay: 250 + i * 650, e: E.sp });
      if (prev) {
        var l = c.add('<path d="M' + prev[0] + ' ' + prev[1] + ' Q50 ' + ((prev[1] + s[1] + 10) / 2) + ' ' + (s[0] + 22) + ' ' + (s[1] + 20) + '" stroke="#D8BD86" stroke-width="1.5" stroke-dasharray="1" ' + dashAttrs().replace('stroke-dasharray="1"', '').replace('fill="none"', 'fill="none"') + '/>');
        draw(c, l.firstChild, 150 + i * 650, 500);
      }
      prev = [s[0] + 22, s[1]];
    });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(.96)', offset: .3 }, { transform: 'none' }], { d: 2200 });
  });

  reg(33, 'B', 2300, function (c) {
    var sh = c.add('<path d="M98 22 L120 28 V52 C120 68 110 76 98 82 C86 76 76 68 76 52 V28Z" fill="rgba(111,177,255,.28)" stroke="#6FB1FF" stroke-width="2.4" stroke-linejoin="round"/>');
    c.A(sh, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { d: 500, e: E.sp });
    for (var i = 0; i < 5; i++) {
      var y = 30 + i * 11;
      var ar = c.add('<line x1="150" y1="' + y + '" x2="132" y2="' + y + '" stroke="#E5484D" stroke-width="2.4" stroke-linecap="round"/><polygon points="128,' + y + ' 134,' + (y - 3.5) + ' 134,' + (y + 3.5) + '" fill="#E5484D"/>');
      c.A(ar, [{ transform: 'translateX(30px)', opacity: 0 }, { transform: 'translateX(-10px)', opacity: 1, offset: .5 }, { transform: 'translate(12px,' + (-14 - i * 3) + 'px) rotate(-40deg)', opacity: 0 }], { d: 700, delay: 450 + i * 230, e: E.out });
      var sp = c.add('<circle cx="112" cy="' + y + '" r="3" fill="#FFFFFF"/>');
      c.A(sp.firstChild, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.6)', offset: .4 }, { opacity: 0, transform: 'scale(.6)' }], { d: 360, delay: 800 + i * 230 });
    }
    c.A(sh, [{ filter: 'none' }, { filter: 'brightness(1.8)', offset: .5 }, { filter: 'none' }], { d: 300, delay: 800, it: 4 });
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateX(-4px)', offset: .5 }, { transform: 'none' }], { d: 2000, delay: 200 });
  });

  reg(34, 'P', 2200, function (c) {
    var av = c.add('<circle cx="50" cy="36" r="14" fill="#8CB863"/><path d="M22 84 C22 62 36 54 50 54 C64 54 78 62 78 84 Z" fill="#8CB863"/><circle cx="50" cy="50" r="46" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="3 4"/>');
    c.A(av, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .3 }, { transform: 'scale(1)', opacity: 1, offset: .6 }, { transform: 'scale(.6)', opacity: 0 }], { d: 1900, delay: 200, e: E.io });
    c.A(c.logo, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.78)', opacity: .08, offset: .3 }, { transform: 'scale(.78)', opacity: .08, offset: .6 }, { transform: 'none', opacity: 1 }], { d: 1900, delay: 200, e: E.io });
    c.A(c.rose, [{ borderRadius: 0 }, { borderRadius: 0 }], { d: 1900 });
    c.ripple('P', 1100, 40);
  });

  reg(35, 'B', 2300, function (c) {
    for (var k = 0; k < 6; k++) {
      var g = c.add('<g transform="rotate(' + (k * 60) + ' 50 50)"><g class="s"><path d="M40 -4 Q50 -10 60 -4" fill="none" stroke="#6FB1FF" stroke-width="2.2" stroke-linecap="round"/><path d="M34 -14 Q50 -22 66 -14" fill="none" stroke="#6FB1FF" stroke-width="2.2" stroke-linecap="round"/><path d="M28 -24 Q50 -34 72 -24" fill="none" stroke="#6FB1FF" stroke-width="2.2" stroke-linecap="round"/><circle cx="50" cy="-34" r="3.6" fill="#FFFFFF"/></g></g>');
      var s = g.firstChild.firstChild;
      [0, 1, 2].forEach(function (a, j) { c.A(s.children[j], [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)', offset: .4 }, { opacity: 0, transform: 'translateY(-3px)' }], { d: 800, delay: 200 + k * 160 + j * 150 }); });
      c.A(s.children[3], [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { d: 400, delay: 650 + k * 160, e: E.sp });
    }
    c.A(c.logo, [{ transform: 'none' }, { transform: 'scale(1.06)', offset: .5 }, { transform: 'none' }], { d: 2200 });
  });

  reg(36, 'W', 2400, function (c) {
    var sheet = c.add('<rect x="28" y="28" width="44" height="44" rx="3" fill="#FFFFFF" opacity=".96"/><line x1="28" y1="28" x2="72" y2="72" stroke="rgba(38,37,95,.25)"/>');
    c.A(sheet, [{ transform: 'scale(0) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .25 }, { transform: 'scale(.9,.55) skewX(-18deg)', opacity: 1, offset: .5 }, { transform: 'scale(.3,.3)', opacity: 0, offset: .62 }, { opacity: 0 }], { d: 1300, e: E.io });
    var plane = c.add('<g transform="translate(34 56)"><g class="p"><polygon points="0,0 34,-14 14,4 10,16" fill="#FFFFFF" stroke="#26255F" stroke-width="1.2" stroke-linejoin="round"/><polygon points="14,4 34,-14 10,16" fill="#DADFD6"/></g></g>');
    c.A(plane.firstChild.firstChild, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .22 }, { transform: 'translate(30px,-26px) rotate(-12deg)', opacity: 1, offset: .55 }, { transform: 'translate(96px,-64px) rotate(-18deg) scale(.5)', opacity: 0 }], { d: 1400, delay: 700, e: E.io });
    var tr = c.add('<path d="M40 60 Q70 70 104 20" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round" opacity=".7"/>');
    c.A(tr, [{ opacity: 0 }, { opacity: .8 }, { opacity: 0 }], { d: 1200, delay: 1000 });
  });

  reg(37, 'P', 2200, function (c) {
    var a = c.clone(), b = c.clone();
    c.A(a, [{ transform: 'none', opacity: 0 }, { transform: 'translate(-8px,2px) rotate(-3deg)', opacity: .5, offset: .35 }, { transform: 'translate(-8px,2px) rotate(-3deg)', opacity: .5, offset: .7 }, { transform: 'none', opacity: 0 }], { d: 2000, e: E.io });
    c.A(b, [{ transform: 'none', opacity: 0 }, { transform: 'translate(8px,-2px) rotate(3deg)', opacity: .5, offset: .35 }, { transform: 'translate(8px,-2px) rotate(3deg)', opacity: .5, offset: .7 }, { transform: 'none', opacity: 0 }], { d: 2000, e: E.io });
    var w = c.add('<path d="M26 -16 q6 -7 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#D8BD86" stroke-width="2.6" ' + dashAttrs().replace('fill="none"', '') + '/><path d="M26 -4 q6 -7 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#D8BD86" stroke-width="2.6" ' + dashAttrs().replace('fill="none"', '') + '/>');
    draw(c, w.children[0], 350, 600); draw(c, w.children[1], 550, 600);
    c.A(w, [{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { d: 2000 });
  });

  reg(38, 'B', 2000, function (c) {
    for (var i = 0; i < 3; i++) { var cl = c.clone(); c.A(cl, [{ transform: 'scale(1)', opacity: .5 }, { transform: 'scale(1.7)', opacity: 0 }], { d: 900, delay: 150 + i * 330, e: E.out }); }
    var ic = c.add('<rect x="82" y="86" width="20" height="24" rx="4" fill="none" stroke="#FFFFFF" stroke-width="2"/><rect x="90" y="94" width="20" height="24" rx="4" fill="#26255F" stroke="#8CB863" stroke-width="2"/>');
    c.A(ic, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .5 }, { transform: 'scale(1)', opacity: 1, offset: .75 }, { transform: 'scale(1)', opacity: 0 }], { d: 1600, delay: 700, e: E.sp });
  });

  /* ---------- D 钱包 39–52 ---------- */
  reg(39, 'Au', 2200, function (c) {
    c.A(c.logo, [{ transform: 'translateY(40px) scale(.6)', opacity: 0 }, { transform: 'translateY(40px) scale(.6)', opacity: 1, offset: .3 }, { transform: 'translateY(-10px) scale(1.04)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { d: 2000, e: E.io });
    c.add('<rect x="4" y="46" width="92" height="56" rx="11" fill="#26255F" stroke="#D8BD86" stroke-width="2"/><rect x="66" y="66" width="30" height="16" rx="8" fill="#3a3978" stroke="#D8BD86" stroke-width="1.5"/><circle cx="78" cy="74" r="3" fill="#D8BD86"/>');
    var flap = c.add('<path d="M4 58 Q4 46 16 46 H84 Q96 46 96 58 V70 H4Z" fill="#33327a" stroke="#D8BD86" stroke-width="2"/><circle cx="50" cy="66" r="4.5" fill="#D8BD86"/>');
    flap.style.transformOrigin = '50% 0%';
    c.A(flap, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1)', offset: .18 }, { transform: 'scaleY(-.25)', offset: .5 }, { transform: 'scaleY(-.25)', offset: .85 }, { transform: 'scaleY(1)' }], { d: 2000, e: E.io });
  });

  reg(40, 'Au', 2300, function (c) {
    for (var i = 0; i < 6; i++) {
      var g = c.add('<ellipse cx="50" cy="' + (128 - i * 4.2) + '" rx="17" ry="5.2" fill="#B8963F"/><ellipse cx="50" cy="' + (126 - i * 4.2) + '" rx="17" ry="5.2" fill="#D8BD86"/><ellipse cx="50" cy="' + (126 - i * 4.2) + '" rx="10" ry="2.8" fill="none" stroke="#B8963F" stroke-width=".9"/>');
      c.A(g, [{ transform: 'translateY(-70px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: .55 }, { transform: 'translateY(-5px)', offset: .75 }, { transform: 'translateY(0)', opacity: 1 }], { d: 650, delay: 150 + i * 330, e: E.in });
      c.A(c.logo, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-(i + 1) * 1.6) + 'px)' }], { d: 300, delay: 700 + i * 330, e: E.out });
    }
    c.burst(8, ['Au', 'W'], 2000, 58, 80, 1.8, 600);
  });

  reg(41, 'Y', 2300, function (c) {
    var id = c.id();
    c.defs.innerHTML = '<linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#F5C542" stop-opacity=".7"/><stop offset="1" stop-color="#F5C542" stop-opacity="0"/></linearGradient>';
    var beam = c.add('<polygon points="34,106 66,106 110,-30 -10,-30" fill="url(#' + id + ')"/>', true);
    beam.style.transformOrigin = '50% 100%';
    c.A(beam, [{ opacity: 0, transform: 'scaleY(.1)' }, { opacity: 0, transform: 'scaleY(.1)', offset: .3 }, { opacity: 1, transform: 'scaleY(1)', offset: .55 }, { opacity: 0, transform: 'scaleY(1.1)' }], { d: 2000 });
    c.add('<rect x="28" y="108" width="44" height="26" rx="3" fill="#8CB863"/><rect x="46" y="108" width="8" height="26" fill="#FFFFFF"/>');
    var lid = c.add('<rect x="24" y="99" width="52" height="11" rx="3" fill="#A6CC7B"/><rect x="46" y="99" width="8" height="11" fill="#FFFFFF"/>');
    lid.style.transformOrigin = '100% 100%';
    c.A(lid, [{ transform: 'none' }, { transform: 'none', offset: .15 }, { transform: 'translate(8px,-22px) rotate(28deg)', offset: .4 }, { transform: 'translate(8px,-22px) rotate(28deg)', offset: .8 }, { transform: 'none' }], { d: 2200, e: E.sp });
    c.A(c.logo, [{ transform: 'translateY(46px) scale(.5)', opacity: 0 }, { transform: 'translateY(46px) scale(.5)', opacity: 0, offset: .25 }, { transform: 'translateY(-10px) scale(1.08)', opacity: 1, offset: .62 }, { transform: 'none', opacity: 1 }], { d: 2200, e: E.sp });
    c.burst(10, ['Y', 'W'], 800, 40, 84, 2, 900);
  });

  reg(42, 'Au', 2500, function (c) {
    c.A(c.logo, [{ opacity: 1 }, { opacity: .3, offset: .15 }, { opacity: .3, offset: .8 }, { opacity: 1 }], { d: 2400 });
    var h = c.add('<path d="M30 14 H70 M30 86 H70" stroke="#D8BD86" stroke-width="5" stroke-linecap="round"/><path d="M34 18 C34 36 50 42 50 50 C50 58 34 64 34 82 M66 18 C66 36 50 42 50 50 C50 58 66 64 66 82" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>');
    c.A(h, [{ transform: 'rotate(0deg) scale(.6)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: 1, offset: .1 }, { transform: 'rotate(0deg)', opacity: 1, offset: .7 }, { transform: 'rotate(180deg)', opacity: 1, offset: .88 }, { transform: 'rotate(180deg) scale(.6)', opacity: 0 }], { d: 2400, e: E.io });
    var top = c.add('<path d="M38 22 H62 L50 44Z" fill="#D8BD86"/>'); top.style.transformOrigin = '50% 100%';
    c.A(top, [{ transform: 'scaleY(1)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1, offset: .1 }, { transform: 'scaleY(0)', opacity: 1, offset: .65 }, { transform: 'scaleY(0)', opacity: 0 }], { d: 2400, e: E.lin });
    var bot = c.add('<path d="M34 80 H66 L50 62Z" fill="#D8BD86"/>'); bot.style.transformOrigin = '50% 100%';
    c.A(bot, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(0)', opacity: 1, offset: .1 }, { transform: 'scaleY(1)', opacity: 1, offset: .65 }, { transform: 'scaleY(1)', opacity: 0 }], { d: 2400, e: E.lin });
    var st = c.add('<line x1="50" y1="46" x2="50" y2="80" stroke="#D8BD86" stroke-width="1.4" stroke-dasharray="2 2"/>');
    c.A(st, [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .65 }, { opacity: 0, offset: .7 }, { opacity: 0 }], { d: 2400 });
  });

  reg(43, 'G', 2400, function (c) {
    var m = c.add('<circle cx="40" cy="40" r="14" fill="rgba(255,255,255,.14)" stroke="#FFFFFF" stroke-width="3"/><line x1="50" y1="50" x2="62" y2="62" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>');
    c.A(m, [{ transform: 'translate(-14px,-14px)', opacity: 0 }, { transform: 'translate(-14px,-14px)', opacity: 1, offset: .08 }, { transform: 'translate(36px,-14px)', offset: .3 }, { transform: 'translate(36px,22px)', offset: .5 }, { transform: 'translate(-14px,22px)', offset: .7 }, { transform: 'translate(14px,4px)', opacity: 1, offset: .8 }, { transform: 'translate(14px,4px)', opacity: 0 }], { d: 1900, e: E.io });
    var ok = c.add('<circle cx="86" cy="82" r="13" fill="#8CB863" stroke="#FFFFFF" stroke-width="2.4"/><path d="M79 82 L84 87 L93 76" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>');
    c.A(ok, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .75 }, { transform: 'scale(1.2)', opacity: 1, offset: .9 }, { transform: 'scale(1)', opacity: 1 }], { d: 2300, e: E.sp });
    c.A(c.logo, [{ filter: 'none' }, { filter: 'brightness(.8)', offset: .15 }, { filter: 'brightness(1.12)', offset: .75 }, { filter: 'none' }], { d: 2300 });
  });

  reg(44, 'B', 2300, function (c) {
    c.A(c.logo, [{ filter: 'none', transform: 'none' }, { filter: 'grayscale(1) brightness(.8) sepia(.2) hue-rotate(180deg)', transform: 'none', offset: .2 }, { filter: 'grayscale(1) brightness(.8) sepia(.2) hue-rotate(180deg)', transform: 'none', offset: .5 }, { filter: 'none', transform: 'scale(1.05)', offset: .7 }, { filter: 'none', transform: 'scale(1)', offset: .82 }, { filter: 'none', transform: 'scale(1.03)', offset: .92 }, { filter: 'none', transform: 'none' }], { d: 2300, e: E.io });
    var p = c.add('<circle cx="50" cy="50" r="26" fill="rgba(38,37,95,.82)" stroke="#6FB1FF" stroke-width="2.4"/><rect x="40" y="38" width="7" height="24" rx="2.4" fill="#FFFFFF"/><rect x="53" y="38" width="7" height="24" rx="2.4" fill="#FFFFFF"/>');
    c.A(p, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .2 }, { transform: 'scale(1)', opacity: 1, offset: .5 }, { transform: 'scale(1.5)', opacity: 0, offset: .65 }, { opacity: 0 }], { d: 2300, e: E.io });
    var fr = c.add('<circle cx="50" cy="50" r="58" fill="none" stroke="#6FB1FF" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>');
    c.A(fr, [{ opacity: 0, transform: 'rotate(0)' }, { opacity: 1, transform: 'rotate(40deg)', offset: .3 }, { opacity: 0, transform: 'rotate(80deg)' }], { d: 1600 });
  });

  reg(45, 'G', 2000, function (c) {
    c.A(c.logo, [{ opacity: 1 }, { opacity: .45, offset: .2 }, { opacity: .45, offset: .75 }, { opacity: 1 }], { d: 1900 });
    var g = c.add('<circle cx="50" cy="50" r="34" fill="rgba(255,255,255,.95)"/><circle cx="50" cy="50" r="34" stroke="#8CB863" stroke-width="5" transform="rotate(-90 50 50)" ' + dashAttrs() + '/><path d="M33 52 L46 65 L69 37" stroke="#8CB863" stroke-width="7.5" ' + dashAttrs() + '/>');
    pop(c, g.children[0], 0, 400);
    draw(c, g.children[1], 200, 700); draw(c, g.children[2], 800, 600);
    c.A(g, [{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { d: 1900 });
    c.ripple('G', 1300, 34);
  });

  reg(46, 'N', 2500, function (c) {
    var ys = [102, 111, 120, 129];
    ys.forEach(function (y, i) {
      var r = c.add('<circle cx="10" cy="' + y + '" r="2.8" fill="#8CB863"/><rect x="18" y="' + (y - 2.4) + '" width="' + (46 + (i * 13) % 24) + '" height="4.8" rx="2.4" fill="rgba(255,255,255,.82)"/><rect x="78" y="' + (y - 2.4) + '" width="22" height="4.8" rx="2.4" fill="#8CB863"/>');
      c.A(r, [{ transform: 'translateX(-30px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { d: 520, delay: 250 + i * 480, e: E.out });
      c.A(r.children[2], [{ fill: '#FFFFFF' }, { fill: '#8CB863' }], { d: 480, delay: 500 + i * 480 });
    });
    var lk = c.add('<path d="M-30 98 V134" stroke="rgba(255,255,255,.18)" stroke-width="1"/>');
    c.A(c.logo, [{ transform: 'none' }, { transform: 'translateY(-6px) scale(.96)', offset: .2 }, { transform: 'translateY(-6px) scale(.96)', offset: .85 }, { transform: 'none' }], { d: 2400, e: E.io });
  });

  reg(47, 'Au', 2200, function (c) {
    c.A(c.logo, [{ opacity: 1 }, { opacity: .3, offset: .15 }, { opacity: .3, offset: .8 }, { opacity: 1 }], { d: 2100 });
    var body = c.add('<rect x="32" y="48" width="36" height="30" rx="6" fill="#D8BD86" stroke="#B8963F" stroke-width="2"/><circle cx="50" cy="60" r="4" fill="#26255F"/><rect x="48" y="62" width="4" height="9" rx="2" fill="#26255F"/>');
    c.A(body, [{ transform: 'scale(.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .2 }, { transform: 'scale(1)', offset: .5 }, { transform: 'translateX(-2.5px)', offset: .56 }, { transform: 'translateX(2.5px)', offset: .62 }, { transform: 'translateX(0)', offset: .68 }, { transform: 'scale(1)', opacity: 1, offset: .85 }, { transform: 'scale(.6)', opacity: 0 }], { d: 2100 });
    var sk = c.add('<path d="M40 48 V38 a10 10 0 0 1 20 0 V48" fill="none" stroke="#D8BD86" stroke-width="5.5" stroke-linecap="round"/>');
    sk.style.transformOrigin = '0% 100%';
    c.A(sk, [{ transform: 'translateY(-13px) rotate(-22deg)', opacity: 0 }, { transform: 'translateY(-13px) rotate(-22deg)', opacity: 1, offset: .2 }, { transform: 'translateY(-13px) rotate(-22deg)', offset: .42 }, { transform: 'translateY(0) rotate(0)', offset: .5 }, { transform: 'translateY(0) rotate(0)', opacity: 1, offset: .85 }, { opacity: 0 }], { d: 2100, e: E.in });
    c.ripple('Au', 1050, 20, 700); c.burst(8, ['Au', 'W'], 1050, 22, 50, 1.8, 600);
  });

  reg(48, 'P', 2400, function (c) {
    c.A(c.rose, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-720deg)' }], { d: 1900, e: E.io });
    c.pets.forEach(function (p, i) { c.A(p, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], { d: 1900, delay: i * 40, e: E.io }); });
    c.A(c.core, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1080deg)' }], { d: 1900, e: E.io });
    for (var i = 0; i < 3; i++) { var cl = c.clone(); c.A(cl, [{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(-90deg)', opacity: .22 }, { transform: 'rotate(-360deg)', opacity: 0 }], { d: 1500, delay: 150 + i * 150, e: E.io }); }
    var ar = c.add('<path d="M50 -8 A58 58 0 1 0 -8 50" stroke="#B48CFF" stroke-width="3" ' + dashAttrs() + '/><polygon points="-8,60 -15,46 -1,46" fill="#B48CFF"/>');
    draw(c, ar.firstChild, 100, 1300); pop(c, ar.children[1], 1300, 300);
    c.A(ar, [{ opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { d: 2300 });
  });

  reg(49, 'Au', 2800, function (c) {
    var xs = [-6, 22, 50, 78], tops = [124, 114, 104, 94];
    xs.forEach(function (x, i) {
      var s = c.add('<rect x="' + x + '" y="' + tops[i] + '" width="26" height="' + (134 - tops[i]) + '" rx="3" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.3)"/>', true);
      var last = i === 3;
      c.A(s, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { d: 380, delay: i * 120, e: E.out });
      c.A(s.firstChild, [{ fill: 'rgba(255,255,255,.14)' }, { fill: '#D8BD86' }, { fill: last ? '#D8BD86' : 'rgba(255,255,255,.14)' }], { d: 1000, delay: 700 + i * 420, e: E.lin });
    });
    var kf = [{ transform: 'none' }, { transform: 'translate(' + (xs[0] + 13 - 50) + 'px,' + (tops[0] - 8 - 50) + 'px) scale(.22)', offset: .15 }];
    xs.forEach(function (x, i) { kf.push({ transform: 'translate(' + (x + 13 - 50) + 'px,' + (tops[i] - 8 - 50) + 'px) scale(.22)', offset: .15 + (i + 1) * .13 }); kf.push({ transform: 'translate(' + (x + 13 - 50 + 7) + 'px,' + (tops[i] - 22 - 50) + 'px) scale(.22)', offset: .15 + (i + 1) * .13 + .045 }); });
    kf.pop(); kf.push({ transform: 'translate(' + (xs[3] + 13 - 50) + 'px,' + (tops[3] - 8 - 50) + 'px) scale(.22)', offset: .84 }); kf.push({ transform: 'scale(1.06)', offset: .94 }); kf.push({ transform: 'none' });
    kf.sort(function (a, b) { return (a.offset || 0) - (b.offset || 0); });
    c.A(c.logo, kf, { d: 2700, e: E.io });
  });

  reg(50, 'O', 2400, function (c) {
    c.pets.forEach(function (p, i) {
      c.A(p, [{ opacity: .12, transform: 'scale(.9)' }, { opacity: .12, transform: 'scale(.9)', offset: .05 }, { opacity: 1, transform: 'scale(1.18)', offset: .55 }, { opacity: 1, transform: 'none' }], { d: 500, delay: 100 + i * 230, e: E.sp });
      var a = (i * 60 - 90) * Math.PI / 180;
      var d = c.add('<circle cx="' + (50 + 40 * Math.cos(a)) + '" cy="' + (50 + 40 * Math.sin(a)) + '" r="9" fill="none" stroke="#FF9F43" stroke-width="2"/>');
      c.A(d.firstChild, [{ opacity: .9, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(1.8)' }], { d: 500, delay: 250 + i * 230 });
    });
    c.A(c.core, [{ opacity: .12, transform: 'scale(.6)' }, { opacity: .12, transform: 'scale(.6)', offset: .05 }, { opacity: 1, transform: 'scale(1.5) rotate(20deg)', offset: .55 }, { opacity: 1, transform: 'none' }], { d: 600, delay: 1500, e: E.sp });
    var fl = c.add('<path d="M50 -22 C60 -8 68 -2 60 12 C58 4 53 3 50 -2 C47 3 42 4 40 12 C32 -2 40 -8 50 -22Z" fill="#FF9F43"/><path d="M50 -10 C55 -2 58 2 54 9 C52 5 50 5 50 2 C50 5 48 5 46 9 C42 2 45 -2 50 -10Z" fill="#F5C542"/>');
    fl.style.transformOrigin = '50% 100%';
    c.A(fl, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(0)', opacity: 0, offset: .72 }, { transform: 'scale(1.2)', opacity: 1, offset: .85 }, { transform: 'scale(.92,1.08)', offset: .92 }, { transform: 'scale(1.05,.96)', opacity: 1 }], { d: 2300, e: E.sp });
  });
})(window.VerdoraMotion = window.VerdoraMotion || {});
