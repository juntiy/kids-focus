import { ding, buzz, win } from '../sound.js';

export const id = 'schulte';
export const name = '舒尔特方格';
export const icon = '🔢';
export const desc = '按顺序从 1 点到最后，训练注意力和反应力';

const SIZES = [
  { n: 3, label: '3×3 入门' },
  { n: 4, label: '4×4 进阶' },
  { n: 5, label: '5×5 标准' },
];

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const onCleanup = (fn) => cleanups.push(fn);
  const q = (rootEl, sel) => rootEl.querySelector(sel);

  let n = 5;
  let current = 1;
  let t0 = 0;
  let timerId = null;
  let running = false;

  function renderScreen() {
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="st-back">← 返回</button>
          <h2>🔢 舒尔特方格</h2>
          <span id="st-time">⏱️ 0.0 秒</span>
        </div>
        <p class="center muted">按顺序从 1 点到最后，越快越好，训练注意力和反应力！</p>
        <div class="center chips" id="st-sizes">
          ${SIZES.map(s => `<button class="chip${s.n === n ? ' active' : ''}" data-n="${s.n}">${s.label}</button>`).join('')}
        </div>
        <div class="center st-next">下一个：<b id="st-next">1</b></div>
        <div class="st-grid" id="st-grid"></div>
      </div>`);
    q(root, '#st-back').addEventListener('click', onExit);
    const sizes = q(root, '#st-sizes');
    sizes.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
      n = Number(ch.dataset.n);
      sizes.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === ch));
      startRound();
    }));
    startRound();
  }

  function startRound() {
    running = false;
    current = 1;
    clearInterval(timerId);
    t0 = 0;
    const total = n * n;
    const nums = Array.from({ length: total }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    const grid = q(container, '#st-grid');
    grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    grid.innerHTML = nums.map(v => `<button class="st-tile" data-v="${v}">${v}</button>`).join('');
    const nextEl = q(container, '#st-next');
    const timeEl = q(container, '#st-time');
    if (nextEl) nextEl.textContent = 1;
    if (timeEl) timeEl.textContent = '⏱️ 0.0 秒';
    grid.querySelectorAll('.st-tile').forEach(b => b.addEventListener('click', () => onTile(Number(b.dataset.v), b)));
  }

  function onTile(v, el) {
    if (!running && v === 1) {
      running = true;
      t0 = performance.now();
      timerId = setInterval(updateTime, 100);
      onCleanup(() => clearInterval(timerId));
    }
    if (v === current) {
      ding();
      el.classList.add('ok');
      el.disabled = true;
      current++;
      const nextEl = q(container, '#st-next');
      if (nextEl) nextEl.textContent = current;
      if (current > n * n) finish();
    } else {
      buzz();
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 300);
    }
  }

  function updateTime() {
    const el = q(container, '#st-time');
    if (el) el.textContent = `⏱️ ${((performance.now() - t0) / 1000).toFixed(1)} 秒`;
  }

  function finish() {
    win();
    clearInterval(timerId);
    const sec = ((performance.now() - t0) / 1000);
    const budget = n * n * 1.5;
    const rank = sec < budget ? '🌟 优秀！' : sec < budget * 2 ? '👍 良好！' : '💪 加油，再练一次！';
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `
      <div class="win-card">
        <h2>🎉 完成！</h2>
        <p>用时 <b>${sec.toFixed(1)}</b> 秒</p>
        <p class="rank">${rank}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="st-exit">🏠 返回首页</button>
          <button class="btn btn-primary" id="st-again">🔄 再来一局</button>
        </div>
      </div>`;
    container.appendChild(overlay);
    onCleanup(() => overlay.remove());
    q(overlay, '#st-exit').addEventListener('click', onExit);
    q(overlay, '#st-again').addEventListener('click', () => { overlay.remove(); startRound(); });
  }

  renderScreen();
  return cleanupAll;
}
