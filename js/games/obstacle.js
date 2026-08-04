import { lose } from '../sound.js';

export const id = 'obstacle';
export const name = '过障碍';
export const icon = '🦘';
export const desc = '点击屏幕让小青蛙跳过障碍物，越跳越远';

const W = 820;
const H = 500;
const GROUND = H - 64;
const OB_EMOJIS = ['🌵', '🦖', '🚧', '🪨', '🎪', '🦔'];
const bestKey = 'kids-best-obstacle';

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const q = (rootEl, sel) => rootEl.querySelector(sel);
  const onCleanup = (fn) => cleanups.push(fn);

  let canvas = null;
  let ctx = null;
  let raf = 0;
  let lastT = 0;
  let state = 'ready';
  let score = 0;
  let speed = 0;
  let spawnT = 0;
  let lastTap = 0;
  let player = null;
  let obstacles = [];
  let clouds = [];
  let best = Number(localStorage.getItem(bestKey) || 0);

  function reset() {
    score = 0;
    speed = 280;
    spawnT = 0.8;
    obstacles = [];
    clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 190 + 40, y: 40 + Math.random() * 100 }));
    player = { x: 130, y: GROUND, vy: 0, r: 34 };
    state = 'play';
  }

  function renderScreen() {
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="ob-back">← 返回</button>
          <h2>🦘 过障碍</h2>
          <span id="ob-score">0 米</span>
        </div>
        <p class="center muted">点击屏幕让小青蛙跳跃，躲开障碍物，跳得越远越好！</p>
        <div class="canvas-wrap"><canvas id="ob-canvas"></canvas></div>
      </div>`);
    canvas = q(root, '#ob-canvas');
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    q(root, '#ob-back').addEventListener('click', onExit);
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

  function onTap() {
    const now = Date.now();
    if (now - lastTap < 250) return;
    lastTap = now;
    if (state === 'play' && player.y >= GROUND - 0.5) {
      player.vy = -700;
    }
  }

  function frame(t) {
    const dt = Math.min(0.033, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (state === 'play') {
      speed = Math.min(560, 280 + score / 35);
      score += dt * 16;
      spawnT -= dt;
      if (spawnT <= 0) {
        obstacles.push(makeObstacle());
        spawnT = Math.max(0.55, 1.05 - score / 9000);
      }
      obstacles.forEach(o => { o.x -= speed * dt; });
      obstacles = obstacles.filter(o => o.x + o.w > -50);
      clouds.forEach(c => {
        c.x -= speed * 0.12 * dt;
        if (c.x < -80) { c.x = W + 80; c.y = 30 + Math.random() * 120; }
      });

      player.vy += 1500 * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; }

      const pr = player.r * 0.62;
      for (const o of obstacles) {
        if (hitCircleRect(player.x, player.y, pr, o.x, GROUND - o.h, o.w, o.h)) {
          lose();
          gameOver();
          break;
        }
      }
      const hud = q(container, '#ob-score');
      if (hud) hud.textContent = `${Math.floor(score)} 米`;
    }
    draw();
  }

  function makeObstacle() {
    const h = 46 + Math.random() * 26;
    return {
      x: W + 40,
      w: h * 0.8,
      h,
      emoji: OB_EMOJIS[Math.floor(Math.random() * OB_EMOJIS.length)],
    };
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#b3e5fc');
    g.addColorStop(1, '#e1f5fe');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(W - 90, 70, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 18, 0, Math.PI * 2);
      ctx.arc(c.x + 20, c.y - 8, 14, 0, Math.PI * 2);
      ctx.arc(c.x + 38, c.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(0, GROUND, W, 8);

    ctx.font = '38px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const o of obstacles) {
      ctx.fillText(o.emoji, o.x + o.w / 2, GROUND - o.h / 2 + 6);
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.max(-0.35, Math.min(0.35, player.vy * 0.0004)));
    ctx.font = `${Math.round(player.r * 1.7)}px "Segoe UI Emoji", "Apple Color Emoji", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐸', 0, 0);
    ctx.restore();

    if (state === 'play' && score < 30) {
      ctx.fillStyle = '#37474f';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👆 点击跳跃！', W / 2, H / 2 - 70);
    }
  }

  function gameOver() {
    state = 'over';
    const s = Math.floor(score);
    if (s > best) { best = s; localStorage.setItem(bestKey, String(best)); }
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `
      <div class="win-card">
        <h2>😅 撞到障碍啦</h2>
        <p>跳了 <b>${s}</b> 米 · 最佳 <b>${best}</b> 米</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="ob-exit">🏠 返回首页</button>
          <button class="btn btn-primary" id="ob-again">🔄 再来一次</button>
        </div>
      </div>`;
    container.appendChild(overlay);
    cleanups.push(() => overlay.remove());
    q(overlay, '#ob-exit').addEventListener('click', onExit);
    q(overlay, '#ob-again').addEventListener('click', () => {
      overlay.remove();
      reset();
    });
  }

  function hitCircleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  renderScreen();
  return cleanupAll;
}
