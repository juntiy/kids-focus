import { getPos } from '../touch.js';
import { ding, buzz, lose, win } from '../sound.js';

export const id = 'shock';
export const name = '防触电';
export const icon = '⚡';
export const desc = '安全的物品才点，带电的千万别碰（慢速专注版）';

const W = 820;
const H = 500;
const SAFE = ['🍎', '🍌', '🍓', '🧸', '🎈', '⭐', '🐰', '🚗', '🍇', '🌸'];
const DANGER = ['⚡', '🔌'];
const TOTAL_ROUNDS = 20;
const SHOW_TIME = 3.2;   // 每个物品停留时间（秒）
const RESOLVE_GAP = 1.0; // 点完或超时后的间隔（秒）
const bestKey = 'kids-best-shock';

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const onCleanup = (fn) => cleanups.push(fn);
  const q = (rootEl, sel) => rootEl.querySelector(sel);

  let canvas = null;
  let ctx = null;
  let wrap = null;
  let raf = 0;
  let lastT = 0;
  let round = 0;
  let score = 0;
  let lives = 3;
  let item = null;         // 当前物品 { emoji, safe }
  let phase = 'wait';      // wait -> show -> resolved
  let phaseTimer = 1.0;
  let best = Number(localStorage.getItem(bestKey) || 0);

  function reset() {
    round = 0;
    score = 0;
    lives = 3;
    item = null;
    phase = 'wait';
    phaseTimer = 1.0;
  }

  function renderScreen() {
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="sh-back">← 返回</button>
          <h2>⚡ 防触电</h2>
          <span id="sh-lives">❤️❤️❤️</span>
        </div>
        <p class="center muted">物品会<b>一个一个慢慢出现</b>：<b>安全的才点</b>，带电的 ⚡ 千万不能碰。不用着急，慢慢看～</p>
        <div class="canvas-wrap" id="sh-wrap"><canvas id="sh-canvas"></canvas></div>
        <p class="center muted" style="margin-top:8px">第 <b id="sh-round">0</b> / ${TOTAL_ROUNDS} 个 · 收集 <b id="sh-score">0</b></p>
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

  function nextItem() {
    round++;
    if (round > TOTAL_ROUNDS) { finish(); return; }
    const safe = Math.random() < 0.6;
    const pool = safe ? SAFE : DANGER;
    let emoji = pool[Math.floor(Math.random() * pool.length)];
    if (item && emoji === item.emoji) emoji = pool[(pool.indexOf(emoji) + 1) % pool.length];
    item = { emoji, safe };
    phase = 'show';
    phaseTimer = SHOW_TIME;
    updateHud();
  }

  function frame(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;
    phaseTimer -= dt;
    if (phase === 'wait' && phaseTimer <= 0) {
      nextItem();
    } else if (phase === 'show' && phaseTimer <= 0) {
      // 超时未点：安全物品没收集到（不扣分，保持轻松）；带电的没点反而是对的
      item = null;
      phase = 'resolved';
      phaseTimer = RESOLVE_GAP;
    } else if (phase === 'resolved' && phaseTimer <= 0) {
      item = null;
      phase = 'wait';
      phaseTimer = 0.9;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function onTap(e) {
    if (phase !== 'show' || !item) return;
    if (item.safe) {
      score++;
      ding();
      floatPlus('+1', 0.5, 0.4);
      item = null;
      phase = 'resolved';
      phaseTimer = RESOLVE_GAP;
      updateHud();
    } else {
      lives--;
      buzz();
      flashRed();
      canvas.classList.add('shake');
      setTimeout(() => canvas.classList.remove('shake'), 420);
      item = null;
      phase = 'resolved';
      phaseTimer = RESOLVE_GAP + 0.3;
      updateHud();
      if (lives <= 0) { lose(); gameOver(); }
    }
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e8eaf6');
    g.addColorStop(1, '#fff8e1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2 - 10;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    roundRect(ctx, cx - 150, cy - 120, 300, 240, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,150,.25)';
    ctx.lineWidth = 4;
    roundRect(ctx, cx - 150, cy - 120, 300, 240, 28);
    ctx.stroke();

    if (item) {
      ctx.font = '105px "Segoe UI Emoji", "Apple Color Emoji", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, cx, cy - 8);

      ctx.fillStyle = '#90a4ae';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('看仔细再点', cx, cy + 92);

      const pct = Math.max(0, phaseTimer / SHOW_TIME);
      ctx.fillStyle = '#e0e0e0';
      roundRect(ctx, cx - 110, cy + 112, 220, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#aed581';
      roundRect(ctx, cx - 110, cy + 112, 220 * pct, 10, 5);
      ctx.fill();
    } else {
      ctx.fillStyle = '#90a4ae';
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('准备下一个…', cx, cy);
    }
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

  function floatPlus(text, fx, fy) {
    const el = document.createElement('span');
    el.className = 'float-plus';
    el.textContent = text;
    el.style.left = `${(fx * 100).toFixed(1)}%`;
    el.style.top = `${(fy * 100).toFixed(1)}%`;
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
    const roundEl = q(container, '#sh-round');
    const scoreEl = q(container, '#sh-score');
    const livesEl = q(container, '#sh-lives');
    if (roundEl) roundEl.textContent = Math.min(round, TOTAL_ROUNDS);
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
  }

  function finish() {
    win();
    if (score > best) { best = score; localStorage.setItem(bestKey, String(best)); }
    const stars = score >= 16 ? 3 : score >= 12 ? 2 : 1;
    showOverlay(`
      <h2>🎉 全部看完啦！</h2>
      <p>收集了 <b>${score}</b> 个安全物品 · 最佳 <b>${best}</b></p>
      <p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="sh-exit">🏠 返回首页</button>
        <button class="btn btn-primary" id="sh-again">🔄 再来一局</button>
      </div>`);
  }

  function gameOver() {
    showOverlay(`
      <h2>😌 碰到了电…</h2>
      <p>收集 <b>${score}</b> 个 · 最佳 <b>${best}</b></p>
      <p class="muted">没关系，记得：带电的东西千万不能碰～</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="sh-exit">🏠 返回首页</button>
        <button class="btn btn-primary" id="sh-again">🔄 再来一局</button>
      </div>`);
  }

  function showOverlay(inner) {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `<div class="win-card">${inner}</div>`;
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
