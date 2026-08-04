import { getPos } from '../touch.js';
import { ding, buzz, lose } from '../sound.js';

export const id = 'shock';
export const name = '防触电';
export const icon = '⚡';
export const desc = '点击安全物品得分，千万别碰带电的东西';

const W = 820;
const H = 500;
const SAFE = ['🍎', '🍌', '🍓', '🧸', '🎈', '⭐', '🐰', '🚗', '🍇'];
const DANGER = ['⚡', '🔌'];
const bestKey = 'kids-best-shock';

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const q = (rootEl, sel) => rootEl.querySelector(sel);
  const onCleanup = (fn) => cleanups.push(fn);

  let canvas = null;
  let ctx = null;
  let wrap = null;
  let raf = 0;
  let lastT = 0;
  let state = 'ready';
  let items = [];
  let lives = 3;
  let score = 0;
  let level = 1;
  let spawnT = 1.1;
  let lastTap = 0;
  let best = Number(localStorage.getItem(bestKey) || 0);

  function reset() {
    items = [];
    lives = 3;
    score = 0;
    level = 1;
    spawnT = 0.6;
    state = 'play';
  }

  function renderScreen() {
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="sh-back">← 返回</button>
          <h2>⚡ 防触电</h2>
          <span id="sh-lives">❤️❤️❤️</span>
        </div>
        <p class="center muted">点击<b>安全物品</b>得分，<b>千万别碰</b>带电的 ⚡ 和 🔌！</p>
        <div class="canvas-wrap" id="sh-wrap"><canvas id="sh-canvas"></canvas></div>
        <p class="center muted" style="margin-top:8px">得分：<b id="sh-score">0</b></p>
      </div>`);
    canvas = q(root, '#sh-canvas');
    wrap = q(root, '#sh-wrap');
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    q(root, '#sh-back').addEventListener('click', onExit);
    canvas.addEventListener('pointerdown', onTap);
    canvas.addEventListener('touchstart', onTap);
    onCleanup(() => {
      canvas.removeEventListener('pointerdown', onTap);
      canvas.removeEventListener('touchstart', onTap);
    });

    reset();
    lastT = performance.now();
    const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    onCleanup(() => cancelAnimationFrame(raf));
  }

  function onTap(e) {
    const now = Date.now();
    if (now - lastTap < 250) return;
    lastTap = now;
    if (state === 'over') return;
    const p = getPos(e, canvas);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const px = p.x / rect.width * W;
    const py = p.y / rect.height * H;
    let hit = null;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (Math.hypot(it.x - px, it.y - py) < it.r * 1.25) { hit = it; break; }
    }
    if (!hit) return;
    items = items.filter(it => it !== hit);
    if (hit.safe) {
      score++;
      ding();
      floatPlus(px, py);
      if (score % 10 === 0) level++;
      updateHud();
    } else {
      lives--;
      buzz();
      flashRed();
      canvas.classList.add('shake');
      setTimeout(() => canvas.classList.remove('shake'), 420);
      updateHud();
      if (lives <= 0) { lose(); gameOver(); }
    }
  }

  function frame(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (state === 'play') {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawn();
        spawnT = Math.max(0.6, 1.25 - level * 0.05);
      }
      items.forEach(it => { it.y += it.vy * dt; });
      items = items.filter(it => it.y < H + 60);
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function spawn() {
    const safe = Math.random() < 0.6;
    const pool = safe ? SAFE : DANGER;
    items.push({
      x: 50 + Math.random() * (W - 100),
      y: -40,
      vy: Math.min(230, 85 + level * 12 + Math.random() * 35),
      emoji: pool[Math.floor(Math.random() * pool.length)],
      safe,
      r: 34,
    });
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e8eaf6');
    g.addColorStop(1, '#fff8e1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.font = '52px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin(it.y * 0.02) * 0.1);
      ctx.fillText(it.emoji, 0, 0);
      ctx.restore();
    }

    if (score === 0) {
      ctx.fillStyle = '#37474f';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👆 点击安全物品，别碰 ⚡！', W / 2, H / 2 - 60);
    }
  }

  function floatPlus(px, py) {
    const el = document.createElement('span');
    el.className = 'float-plus';
    el.textContent = '+1';
    el.style.left = `${(px / W * 100).toFixed(1)}%`;
    el.style.top = `${(py / H * 100).toFixed(1)}%`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  function flashRed() {
    const el = document.createElement('div');
    el.className = 'flash-red';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }

  function updateHud() {
    const livesEl = q(container, '#sh-lives');
    const scoreEl = q(container, '#sh-score');
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
    if (scoreEl) scoreEl.textContent = score;
  }

  function gameOver() {
    state = 'over';
    if (score > best) { best = score; localStorage.setItem(bestKey, String(best)); }
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `
      <div class="win-card">
        <h2>⚡ 被电到啦！</h2>
        <p>得分 <b>${score}</b> · 最佳 <b>${best}</b></p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="sh-exit">🏠 返回首页</button>
          <button class="btn btn-primary" id="sh-again">🔄 再来一次</button>
        </div>
      </div>`;
    container.appendChild(overlay);
    cleanups.push(() => overlay.remove());
    q(overlay, '#sh-exit').addEventListener('click', onExit);
    q(overlay, '#sh-again').addEventListener('click', () => {
      overlay.remove();
      reset();
    });
  }

  renderScreen();
  return cleanupAll;
}
