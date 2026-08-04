import { onPointerDrag } from '../touch.js';
import { ding, win } from '../sound.js';

export const id = 'maze';
export const name = '走迷宫';
export const icon = '🌀';
export const desc = '用手指拖动小球，穿过迷宫到达终点';

const LEVELS = [
  { rows: 6, cols: 6 },
  { rows: 8, cols: 8 },
  { rows: 10, cols: 10 },
  { rows: 12, cols: 12 },
];

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const onCleanup = (fn) => cleanups.push(fn);
  const q = (rootEl, sel) => rootEl.querySelector(sel);

  let level = 0;
  let canvas = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let cell = 44;
  let walls = [];
  let ball = null;
  let target = null;
  let start = null;
  let goal = null;
  let trail = [];
  let raf = 0;
  let timerId = null;
  let started = false;
  let seconds = 0;
  let done = false;

  function genMaze(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid.push([]);
      for (let c = 0; c < cols; c++) grid[r].push({ n: false, s: false, e: false, w: false, vis: false });
    }
    const stack = [[0, 0]];
    grid[0][0].vis = true;
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = [];
      if (r > 0 && !grid[r - 1][c].vis) opts.push([r - 1, c, 'n']);
      if (c < cols - 1 && !grid[r][c + 1].vis) opts.push([r, c + 1, 'e']);
      if (r < rows - 1 && !grid[r + 1][c].vis) opts.push([r + 1, c, 's']);
      if (c > 0 && !grid[r][c - 1].vis) opts.push([r, c - 1, 'w']);
      if (!opts.length) { stack.pop(); continue; }
      const [nr, nc, dir] = opts[Math.floor(Math.random() * opts.length)];
      if (dir === 'n') { grid[r][c].n = true; grid[nr][nc].s = true; }
      if (dir === 's') { grid[r][c].s = true; grid[nr][nc].n = true; }
      if (dir === 'e') { grid[r][c].e = true; grid[nr][nc].w = true; }
      if (dir === 'w') { grid[r][c].w = true; grid[nr][nc].e = true; }
      grid[nr][nc].vis = true;
      stack.push([nr, nc]);
    }
    return grid;
  }

  function buildLevel() {
    const cfg = LEVELS[level];
    cell = Math.max(34, Math.floor(520 / Math.max(cfg.rows, cfg.cols)));
    W = cfg.cols * cell;
    H = cfg.rows * cell;
    canvas.width = W;
    canvas.height = H;
    const maze = genMaze(cfg.rows, cfg.cols);
    walls = [];
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const m = maze[r][c];
        const x = c * cell;
        const y = r * cell;
        if (!m.n) walls.push({ x1: x, y1: y, x2: x + cell, y2: y });
        if (!m.s) walls.push({ x1: x, y1: y + cell, x2: x + cell, y2: y + cell });
        if (!m.w) walls.push({ x1: x, y1: y, x2: x, y2: y + cell });
        if (!m.e) walls.push({ x1: x + cell, y1: y, x2: x + cell, y2: y + cell });
      }
    }
    start = { x: cell / 2, y: cell / 2 };
    goal = { x: W - cell / 2, y: H - cell / 2 };
    ball = { x: start.x, y: start.y, vx: 0, vy: 0, r: cell * 0.26 };
    target = { x: start.x, y: start.y };
    trail = [];
    seconds = 0;
    started = false;
    done = false;
    renderHud();
    draw();
  }

  function renderScreen() {
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="mz-back">← 返回</button>
          <h2>🌀 走迷宫 <span id="mz-level">第 ${level + 1} 关</span></h2>
          <span id="mz-time">⏱️ 0 秒</span>
        </div>
        <p class="center muted">按住屏幕拖动小球 🟠 到 ⭐ 终点，迷宫会一关比一关大！</p>
        <div class="canvas-wrap"><canvas id="mz-canvas"></canvas></div>
      </div>`);
    canvas = q(root, '#mz-canvas');
    ctx = canvas.getContext('2d');
    q(root, '#mz-back').addEventListener('click', onExit);

    const toC = (p) => ({ x: p.x / canvas.clientWidth * W, y: p.y / canvas.clientHeight * H });
    const off = onPointerDrag(canvas, {
      down: (p) => {
        target = toC(p);
        if (!started) { started = true; startTimer(); }
      },
      move: (p) => { target = toC(p); },
      up: () => {},
    });
    onCleanup(off);

    buildLevel();
    const loop = () => { if (!done) step(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    onCleanup(() => cancelAnimationFrame(raf));
  }

  function step() {
    const dt = 1 / 60;
    const k = 16;
    const friction = 0.86;
    const maxSpeed = 330;
    ball.vx += (target.x - ball.x) * k * dt;
    ball.vy += (target.y - ball.y) * k * dt;
    ball.vx *= friction;
    ball.vy *= friction;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > maxSpeed) { ball.vx *= maxSpeed / sp; ball.vy *= maxSpeed / sp; }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    collideWalls();
    ball.x = Math.max(ball.r, Math.min(W - ball.r, ball.x));
    ball.y = Math.max(ball.r, Math.min(H - ball.r, ball.y));
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 260) trail.shift();
    draw();
    if (Math.hypot(ball.x - goal.x, ball.y - goal.y) < cell * 0.5) {
      done = true;
      cancelAnimationFrame(raf);
      winLevel();
    }
  }

  function collideWalls() {
    for (const w of walls) {
      const cx = Math.max(Math.min(w.x1, w.x2), Math.min(Math.max(w.x1, w.x2), ball.x));
      const cy = Math.max(Math.min(w.y1, w.y2), Math.min(Math.max(w.y1, w.y2), ball.y));
      let dx = ball.x - cx;
      let dy = ball.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < ball.r * ball.r && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (ball.r - d) / d;
        ball.x += dx * push;
        ball.y += dy * push;
        const dot = ball.vx * dx + ball.vy * dy;
        if (dot < 0) {
          ball.vx -= (dot / d2) * dx * 0.8;
          ball.vy -= (dot / d2) * dy * 0.8;
        }
      }
    }
  }

  function draw() {
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255, 183, 77, .18)';
    for (const t of trail) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = Math.max(4, cell * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const w of walls) { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }
    ctx.stroke();

    ctx.font = `${Math.round(cell * 0.72)}px "Segoe UI Emoji", "Apple Color Emoji", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏠', start.x, start.y);
    ctx.fillText('⭐', goal.x, goal.y);

    const g = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.2, ball.x, ball.y, ball.r);
    g.addColorStop(0, '#ffcc80');
    g.addColorStop(1, '#ff7043');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e64a19';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(ball.x - ball.r * 0.28, ball.y - ball.r * 0.2, ball.r * 0.12, 0, Math.PI * 2);
    ctx.arc(ball.x + ball.r * 0.28, ball.y - ball.r * 0.2, ball.r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  function startTimer() {
    timerId = setInterval(() => { seconds++; renderHud(); }, 1000);
    onCleanup(() => clearInterval(timerId));
  }

  function renderHud() {
    const el = q(container, '#mz-time');
    if (el) el.textContent = `⏱️ ${seconds} 秒`;
    const lv = q(container, '#mz-level');
    if (lv) lv.textContent = `第 ${level + 1} 关`;
  }

  function winLevel() {
    ding();
    win();
    clearInterval(timerId);
    const last = level === LEVELS.length - 1;
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `
      <div class="win-card">
        <h2>${last ? '🏆 全部通关！' : '🎉 过关啦！'}</h2>
        <p>用时 <b>${seconds}</b> 秒</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="mz-exit">🏠 返回首页</button>
          ${last
            ? '<button class="btn btn-primary" id="mz-again">🔄 重新挑战</button>'
            : '<button class="btn btn-primary" id="mz-next">➡️ 下一关</button>'}
        </div>
      </div>`;
    container.appendChild(overlay);
    onCleanup(() => overlay.remove());
    q(overlay, '#mz-exit').addEventListener('click', onExit);
    const nextBtn = q(overlay, last ? '#mz-again' : '#mz-next');
    nextBtn.addEventListener('click', () => {
      overlay.remove();
      level = last ? 0 : level + 1;
      renderScreen();
    });
  }

  renderScreen();
  return cleanupAll;
}
