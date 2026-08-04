import { getPos } from '../touch.js';
import { ding, buzz, win } from '../sound.js';

export const id = 'shock';
export const name = '防触电';
export const icon = '⚡';
export const desc = '小蜜蜂送花蜜：按住慢慢滑，别碰带电的蜘蛛网';

const W = 820;
const H = 500;
const RING_R = 13;
const MARGIN = 2;          // 边缘容差
const FAST_SPEED = 380;    // 超过这个速度就提醒"慢一点"
const SHOCK_TIME = 1.0;    // 被电后的动画时长（秒）
const bestKey = 'kids-shock-levels';
const skinKey = 'kids-shock-skin';

const SKINS = [
  { id: 'bee', emoji: '🐝', name: '小蜜蜂', need: 0 },
  { id: 'robot', emoji: '🤖', name: '太空机器人', need: 4 },
  { id: 'cat', emoji: '🐱', name: '猫咪爪', need: 8 },
];

// ---------- 关卡路径 ----------
function lv1() {
  const pts = [];
  for (let x = 60; x <= 760; x += 40) pts.push({ x, y: 250 + 55 * Math.sin(x * 0.008) });
  return pts;
}
function lv2() {
  const pts = [];
  for (let x = 60; x <= 760; x += 40) pts.push({ x, y: 250 + 105 * Math.sin(x * 0.011) });
  return pts;
}
function lv3() {
  return [
    { x: 70, y: 130 }, { x: 320, y: 130 }, { x: 320, y: 370 },
    { x: 560, y: 370 }, { x: 560, y: 170 }, { x: 750, y: 170 },
  ];
}
function lv4() {
  const pts = [];
  for (let x = 60; x <= 760; x += 35) pts.push({ x, y: 250 + 145 * Math.sin(x * 0.014) });
  return pts;
}
function lv5() {
  const pts = [];
  for (let x = 60; x <= 760; x += 30) pts.push({ x, y: 250 + 165 * Math.sin(x * 0.017) });
  return pts;
}
function lv6() {
  const pts = [];
  const cx = 400;
  const cy = 245;
  const turns = 1.7;
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns + Math.PI * 0.5;
    const r = 185 - t * 140;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) * 0.72 });
  }
  return pts;
}

const LEVELS = [
  { name: '花田小路', width: 96, sparks: 0, par: 25, gen: lv1 },
  { name: '微风弯道', width: 82, sparks: 0, par: 35, gen: lv2 },
  { name: '直角花园', width: 70, sparks: 0, par: 45, gen: lv3 },
  { name: 'S型花丛', width: 60, sparks: 0, par: 55, gen: lv4 },
  { name: '雷暴窄道', width: 54, sparks: 3, par: 70, gen: lv5 },
  { name: '星光螺旋', width: 50, sparks: 4, par: 90, gen: lv6 },
];

// ---------- 路径几何（导出供测试） ----------
function buildPath(points) {
  const cum = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    cum.push(total);
  }
  return { pts: points, cum, total };
}

function nearestOnPath(path, x, y) {
  const pts = path.pts;
  let best = { d: Infinity, i: 0, t: 0, px: pts[0].x, py: pts[0].y };
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i].x;
    const ay = pts[i].y;
    const dx = pts[i + 1].x - ax;
    const dy = pts[i + 1].y - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((x - ax) * dx + (y - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d, i, t, px, py };
  }
  return best;
}

function progressAt(path, n) {
  return path.cum[n.i] + n.t * (path.cum[n.i + 1] - path.cum[n.i]);
}

function pointOnPath(path, i, t) {
  const pts = path.pts;
  const ax = pts[i].x;
  const ay = pts[i].y;
  const bx = pts[i + 1].x;
  const by = pts[i + 1].y;
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
}

function perpendicular(pts, i) {
  const ax = pts[i].x;
  const ay = pts[i].y;
  const bx = pts[i + 1].x;
  const by = pts[i + 1].y;
  let dx = bx - ax;
  let dy = by - ay;
  const l = Math.hypot(dx, dy) || 1;
  dx /= l;
  dy /= l;
  return { x: -dy, y: dx };
}

export const __internals = { buildPath, nearestOnPath, progressAt, pointOnPath, perpendicular, LEVELS, RING_R, W, H };

// ---------- 游戏主逻辑 ----------
export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const onCleanup = (fn) => cleanups.push(fn);
  const q = (rootEl, sel) => rootEl.querySelector(sel);

  let canvas = null;
  let ctx = null;
  let raf = 0;
  let lastT = 0;
  let time = 0;
  let levelIdx = 0;
  let level = null;
  let path = null;
  let pts = [];
  let ring = null;
  let lastRing = null;
  let speedSmooth = 0;
  let progress = 0;
  let shocks = 0;
  let fastFrames = 0;
  let steadyAccum = 0;
  let steadyShow = 0;
  let state = 'menu';      // menu | play | shock | done
  let shockTimer = 0;
  let checkpoints = [];
  let checkpointIdx = 0;
  let sparks = [];
  let t0 = 0;
  let skin = loadSkin();
  let levelsStars = loadStars();

  function loadStars() {
    try { return JSON.parse(localStorage.getItem(bestKey) || '{}'); } catch { return {}; }
  }
  function saveStars() {
    try { localStorage.setItem(bestKey, JSON.stringify(levelsStars)); } catch { /* noop */ }
  }
  function totalStars() {
    return LEVELS.reduce((s, lv, i) => s + (levelsStars[i] || 0), 0);
  }
  function loadSkin() {
    const s = localStorage.getItem(skinKey);
    return SKINS.some(k => k.id === s) ? s : 'bee';
  }
  function saveSkin(id) {
    skin = id;
    try { localStorage.setItem(skinKey, id); } catch { /* noop */ }
  }
  function skinEmoji() {
    return (SKINS.find(k => k.id === skin) || SKINS[0]).emoji;
  }

  // ---------- 主菜单 ----------
  function renderMenu() {
    const total = totalStars();
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" data-action="exit">← 返回</button>
          <h2>⚡ 防触电</h2>
          <span id="sh-total">⭐ ${total}</span>
        </div>
        <div class="sh-menu">
          <p class="sh-story">🐝 小蜜蜂要把花蜜送回蜂窝，路上有<b>带电的蜘蛛网</b>！按住小蜜蜂，沿着花路<b>慢慢滑</b>，碰到紫色的边就会被电到哦～</p>
          <div class="sh-levels" id="sh-levels">
            ${LEVELS.map((lv, i) => {
              const st = levelsStars[i] || 0;
              return `<button class="sh-level" data-i="${i}">
                <div class="lv-no">第 ${i + 1} 关</div>
                <div class="lv-name">${lv.name}</div>
                <div class="lv-stars">${'⭐'.repeat(st)}${'☆'.repeat(3 - st)}</div>
              </button>`;
            }).join('')}
          </div>
          <div class="sh-skins" id="sh-skins">
            ${SKINS.map(k => {
              const locked = total < k.need;
              const active = skin === k.id;
              return `<button class="sh-skin${locked ? ' locked' : ''}${active ? ' active' : ''}" data-id="${k.id}">
                <div class="skin-emoji">${locked ? '🔒' : k.emoji}</div>
                <div class="skin-name">${k.name}</div>
                <div class="skin-need">${locked ? `需要 ${k.need} ⭐` : '已解锁'}</div>
              </button>`;
            }).join('')}
          </div>
        </div>
      </div>`);
    q(root, '[data-action="exit"]').addEventListener('click', onExit);
    root.querySelectorAll('.sh-level').forEach(b => b.addEventListener('click', () => startLevelScreen(Number(b.dataset.i))));
    root.querySelectorAll('.sh-skin').forEach(b => b.addEventListener('click', () => {
      const k = SKINS.find(x => x.id === b.dataset.id);
      if (total < k.need) { toast(`再收集 ${k.need - total} 颗星就能解锁啦`); return; }
      saveSkin(k.id);
      renderMenu();
    }));
  }

  // ---------- 关卡画面 ----------
  function startLevelScreen(idx) {
    levelIdx = idx;
    level = LEVELS[idx];
    pts = level.gen();
    path = buildPath(pts);
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="sh-back">← 返回</button>
          <h2>第 ${idx + 1} 关 · ${level.name}</h2>
          <span id="sh-shocks">⚡ 0</span>
        </div>
        <p class="center muted">按住小蜜蜂慢慢滑到 🍯，碰到紫色的边会被电到（有安全站，不怕重来）～</p>
        <div class="canvas-wrap"><canvas id="sh-canvas"></canvas></div>
        <div class="sh-progress"><div class="sh-progress-inner" id="sh-progress"></div></div>
      </div>`);
    canvas = q(root, '#sh-canvas');
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    q(root, '#sh-back').addEventListener('click', renderMenu);

    const toC = (p) => ({ x: p.x / canvas.clientWidth * W, y: p.y / canvas.clientHeight * H });
    const down = (e) => {
      if (state === 'play') {
        const p = toC(getPos(e, canvas));
        ring.x = clamp(p.x, RING_R, W - RING_R);
        ring.y = clamp(p.y, RING_R, H - RING_R);
        try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
      }
    };
    const move = (e) => {
      if (state === 'play') {
        const p = toC(getPos(e, canvas));
        ring.x = clamp(p.x, RING_R, W - RING_R);
        ring.y = clamp(p.y, RING_R, H - RING_R);
      }
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('touchstart', down);
    canvas.addEventListener('touchmove', move);
    onCleanup(() => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('touchstart', down);
      canvas.removeEventListener('touchmove', move);
    });

    resetLevel();
    lastT = performance.now();
    const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    onCleanup(() => cancelAnimationFrame(raf));
    breatheIntro();
  }

  function resetLevel() {
    time = 0;
    state = 'play';
    ring = { x: pts[0].x, y: pts[0].y };
    lastRing = { x: ring.x, y: ring.y };
    speedSmooth = 0;
    progress = 0;
    shocks = 0;
    fastFrames = 0;
    steadyAccum = 0;
    steadyShow = 0;
    shockTimer = 0;
    checkpointIdx = 0;
    checkpoints = [{ x: pts[0].x, y: pts[0].y }];
    sparks = buildSparks(level.sparks);
    t0 = performance.now();
  }

  function buildSparks(count) {
    const list = [];
    const segs = pts.length - 1;
    for (let i = 0; i < count; i++) {
      const seg = Math.floor((i + 0.5) * segs / count);
      list.push({
        seg,
        t: 0.15 + Math.random() * 0.7,
        amp: level.width * 0.26,
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 0.8,
        r: 14,
      });
    }
    return list;
  }

  function breatheIntro() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `
      <div class="win-card" style="text-align:center">
        <h2>🧘 先深呼吸一下</h2>
        <p id="breathe-t" style="font-size:22px;color:#7e57c2">吸气…</p>
        <p id="breathe-count" style="font-size:38px;font-weight:900;color:#ffa726;margin:6px 0">3</p>
        <button class="btn btn-secondary" id="breathe-skip">直接开始</button>
      </div>`;
    container.appendChild(overlay);
    onCleanup(() => overlay.remove());
    let n = 3;
    const tEl = q(overlay, '#breathe-t');
    const cEl = q(overlay, '#breathe-count');
    const iv = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        overlay.remove();
        t0 = performance.now();
      } else {
        cEl.textContent = n;
        tEl.textContent = n % 2 === 1 ? '吸气…' : '呼气…';
      }
    }, 900);
    onCleanup(() => clearInterval(iv));
    q(overlay, '#breathe-skip').addEventListener('click', () => {
      clearInterval(iv);
      overlay.remove();
      t0 = performance.now();
    });
  }

  function frame(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (state === 'play' || state === 'shock') {
      time += dt;
      updateProgress();
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function updateProgress() {
    if (state === 'shock') {
      shockTimer -= 0.016;
      if (shockTimer <= 0) {
        const cp = checkpoints[checkpointIdx];
        ring.x = cp.x;
        ring.y = cp.y;
        lastRing = { x: ring.x, y: ring.y };
        speedSmooth = 0;
        state = 'play';
      }
      return;
    }
    // 速度检测（匀速训练）
    const inst = Math.hypot(ring.x - lastRing.x, ring.y - lastRing.y) / 0.016;
    speedSmooth = speedSmooth * 0.7 + inst * 0.3;
    lastRing = { x: ring.x, y: ring.y };
    if (speedSmooth > FAST_SPEED) fastFrames++;
    if (speedSmooth > 10 && speedSmooth <= FAST_SPEED) {
      steadyAccum += 0.016;
      if (steadyAccum >= 4) {
        steadyAccum = 0;
        steadyShow = 1.2;
        ding();
      }
    } else if (speedSmooth > FAST_SPEED) {
      steadyAccum = Math.max(0, steadyAccum - 0.032);
    }
    if (steadyShow > 0) steadyShow -= 0.016;

    // 是否碰到边缘
    const n = nearestOnPath(path, ring.x, ring.y);
    const limit = level.width / 2 - RING_R - MARGIN;
    if (n.d > limit) { triggerShock(); return; }

    // 移动电荷
    for (const s of sparks) {
      const pos = sparkPos(s, time);
      if (Math.hypot(ring.x - pos.x, ring.y - pos.y) < RING_R + s.r) { triggerShock(); return; }
    }

    // 进度与检查点
    const pr = progressAt(path, n);
    if (pr > progress) progress = pr;
    const frac = progress / path.total;
    if (checkpointIdx < 3 && frac >= [0.25, 0.5, 0.75][checkpointIdx]) {
      checkpointIdx++;
      checkpoints.push({ x: ring.x, y: ring.y });
      ding();
    }
    const bar = q(container, '#sh-progress');
    if (bar) bar.style.width = `${Math.min(100, frac * 100).toFixed(1)}%`;
    const sh = q(container, '#sh-shocks');
    if (sh) sh.textContent = `⚡ ${shocks}`;

    if (progress >= path.total - 3) finishLevel();
  }

  function triggerShock() {
    if (state !== 'play') return;
    state = 'shock';
    shockTimer = SHOCK_TIME;
    shocks++;
    buzz();
    canvas.classList.add('shake');
    setTimeout(() => canvas.classList.remove('shake'), 450);
    steadyAccum = 0;
  }

  function sparkPos(s, tm) {
    const base = pointOnPath(path, s.seg, s.t);
    const perp = perpendicular(pts, s.seg);
    const off = Math.sin(tm * s.speed + s.phase) * s.amp;
    return { x: base.x + perp.x * off, y: base.y + perp.y * off };
  }

  // ---------- 绘制 ----------
  function draw() {
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, W, H);
    drawSky();
    drawPath();
    drawCheckpoints();
    drawSparks();
    drawEndpoints();
    drawRing();
    drawProgressBar();
    if (state === 'shock') drawShockFx();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#dcf5e6');
    g.addColorStop(1, '#fff8e1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(W - 80, 62, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    [[120, 70], [300, 45], [620, 80]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.arc(x + 18, y - 7, 12, 0, Math.PI * 2);
      ctx.arc(x + 34, y, 13, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function strokePath() {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function drawPath() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7e57c2';
    ctx.lineWidth = level.width;
    strokePath();
    ctx.strokeStyle = '#fff3e0';
    ctx.lineWidth = Math.max(6, level.width - 8);
    strokePath();
    ctx.strokeStyle = 'rgba(126,87,194,.30)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    strokePath();
    ctx.setLineDash([]);
  }

  function drawCheckpoints() {
    for (let i = 0; i < checkpoints.length; i++) {
      const c = checkpoints[i];
      if (i === 0) continue;
      ctx.fillStyle = 'rgba(102,187,106,.35)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2e7d32';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('安全站', c.x, c.y + 24);
    }
  }

  function drawSparks() {
    for (const s of sparks) {
      const p = sparkPos(s, time);
      ctx.fillStyle = 'rgba(255,213,79,.45)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '26px "Segoe UI Emoji", "Apple Color Emoji", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', p.x, p.y);
    }
  }

  function drawEndpoints() {
    ctx.font = '36px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌼', pts[0].x, pts[0].y);
    ctx.fillText('🍯', pts[pts.length - 1].x, pts[pts.length - 1].y);
  }

  function drawRing() {
    const fast = speedSmooth > FAST_SPEED;
    const emoji = state === 'shock' ? '😵' : skinEmoji();
    const color = fast ? '#e53935' : state === 'shock' ? '#7e57c2' : '#ffb300';
    ctx.fillStyle = 'rgba(255,215,64,.30)';
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, RING_R + 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = fast ? 5 : 4;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, RING_R + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '27px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, ring.x, ring.y);
    if (fast && state === 'play') {
      ctx.fillStyle = '#e53935';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('慢一点～', ring.x, ring.y - RING_R - 16);
    }
    if (steadyShow > 0) {
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('🌟 超稳！', ring.x, ring.y - RING_R - 16);
    }
  }

  function drawShockFx() {
    ctx.fillStyle = '#7e57c2';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('嗡嗡嗡～ 被电到啦！回到安全站', W / 2, 92);
  }

  function drawProgressBar() {
    const frac = Math.min(1, progress / path.total);
    const x = 110;
    const y = 34;
    const w = W - 220;
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    roundRect(ctx, x, y, w, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#66bb6a';
    roundRect(ctx, x, y, Math.max(10, w * frac), 10, 5);
    ctx.fill();
    ctx.fillStyle = '#546e7a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(frac * 100)}%`, x + w + 36, y + 5);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------- 结束 ----------
  function finishLevel() {
    if (state !== 'play') return;
    state = 'done';
    const sec = Math.round(time);
    const stars = shocks === 0 ? 3 : shocks <= 2 ? 2 : 1;
    const old = levelsStars[levelIdx] || 0;
    if (stars > old) {
      levelsStars[levelIdx] = stars;
      saveStars();
    }
    const total = totalStars();
    win();
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `
      <div class="win-card">
        <h2>🏅 专注力小奖状</h2>
        <p>用时 <b>${sec}</b> 秒 · 被电 <b>${shocks}</b> 次 · 过快 <b>${fastFrames}</b> 次</p>
        <p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
        <p class="muted">${shocks === 0 ? '零触电通关，太稳了！' : shocks <= 2 ? '很棒，下次试试零触电！' : '没关系，慢慢来就是赢～'}（共 ${total} ⭐）</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="sh-menu">🗺️ 选关</button>
          <button class="btn btn-primary" id="sh-again">🔄 再来一次</button>
        </div>
      </div>`;
    container.appendChild(overlay);
    onCleanup(() => overlay.remove());
    q(overlay, '#sh-menu').addEventListener('click', () => { overlay.remove(); renderMenu(); });
    q(overlay, '#sh-again').addEventListener('click', () => { overlay.remove(); startLevelScreen(levelIdx); });
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  renderMenu();
  return cleanupAll;
}

// ---------- 全局提示 ----------
let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}
