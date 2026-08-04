import { ding, buzz, win, lose } from '../sound.js';

export const id = 'color-match';
export const name = '找相近颜色';
export const icon = '🎨';
export const desc = '在一堆相近颜色里，找到唯一不一样的那一个';

const ROUNDS = 10;

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const q = (rootEl, sel) => rootEl.querySelector(sel);

  let rootEl = null;
  let round = 0;
  let score = 0;
  let lives = 3;
  let gridN = 4;
  let timeLeft = 0;
  let timeTotal = 0;
  let timerId = null;
  let oddIndex = -1;

  function renderGame() {
    rootEl = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="cm-back">← 返回</button>
          <h2>🎨 找相近颜色</h2>
          <span id="cm-lives">❤️❤️❤️</span>
        </div>
        <p class="center muted">在一堆相近的颜色里，找到唯一<b>不一样</b>的那一个！</p>
        <div class="cm-info">
          <span>第 <b id="cm-round">1</b> / ${ROUNDS} 关</span>
          <span>得分 <b id="cm-score">0</b></span>
          <span>⏱️ <b id="cm-time">0.0</b> 秒</span>
        </div>
        <div class="cm-bar"><div class="cm-bar-inner" id="cm-bar"></div></div>
        <div class="cm-board" id="cm-board"></div>
      </div>`);
    q(rootEl, '#cm-back').addEventListener('click', onExit);
    newRound();
  }

  function newRound() {
    round++;
    if (round > ROUNDS) { finish(); return; }
    gridN = round <= 4 ? 4 : round <= 7 ? 6 : 8;
    const hue = Math.random() * 360;
    const sat = 62 + Math.random() * 18;
    const light = 50 + Math.random() * 14;
    const delta = Math.max(3, Math.round(13 - round * 0.9));
    const base = `hsl(${hue.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`;
    const oh = (hue + (Math.random() < 0.5 ? -delta : delta) + 360) % 360;
    const odd = `hsl(${oh.toFixed(1)}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`;
    oddIndex = Math.floor(Math.random() * gridN * gridN);

    const board = q(rootEl, '#cm-board');
    board.style.gridTemplateColumns = `repeat(${gridN}, 1fr)`;
    board.innerHTML = Array.from({ length: gridN * gridN }, (_, i) =>
      `<button class="cm-tile" data-i="${i}" style="background:${i === oddIndex ? odd : base}"></button>`).join('');
    board.querySelectorAll('.cm-tile').forEach(t => t.addEventListener('click', () => onTile(Number(t.dataset.i), t)));

    q(rootEl, '#cm-round').textContent = round;
    updateHud();
    startTimer();
  }

  function onTile(i, el) {
    if (i === oddIndex) {
      ding();
      score++;
      el.classList.add('found');
      clearInterval(timerId);
      setTimeout(newRound, 480);
      updateHud();
    } else {
      buzz();
      lives--;
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 350);
      updateHud();
      if (lives <= 0) {
        clearInterval(timerId);
        lose();
        gameOver();
      }
    }
  }

  function startTimer() {
    clearInterval(timerId);
    timeLeft = Math.max(4, 9 - round * 0.35);
    timeTotal = timeLeft;
    updateHud();
    timerId = setInterval(() => {
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(timerId);
        lives--;
        buzz();
        updateHud();
        if (lives <= 0) { lose(); gameOver(); } else { newRound(); }
      }
      updateHud();
    }, 100);
    onCleanup(() => clearInterval(timerId));
  }

  function updateHud() {
    const scoreEl = q(rootEl, '#cm-score');
    const timeEl = q(rootEl, '#cm-time');
    const livesEl = q(rootEl, '#cm-lives');
    const barEl = q(rootEl, '#cm-bar');
    if (scoreEl) scoreEl.textContent = score;
    if (timeEl) timeEl.textContent = Math.max(0, timeLeft).toFixed(1);
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
    if (barEl && timeTotal) barEl.style.width = `${Math.max(0, timeLeft / timeTotal * 100)}%`;
  }

  function finish() {
    win();
    const stars = score >= 9 ? 3 : score >= 6 ? 2 : 1;
    showOverlay(`
      <h2>🎉 全部完成！</h2>
      <p>得分 <b>${score}</b> 分</p>
      <p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="ov-exit">🏠 返回首页</button>
        <button class="btn btn-primary" id="ov-again">🔄 再来一局</button>
      </div>`);
  }

  function gameOver() {
    showOverlay(`
      <h2>😢 心都凉了…</h2>
      <p>本次得分 <b>${score}</b> 分</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="ov-exit">🏠 返回首页</button>
        <button class="btn btn-primary" id="ov-again">🔄 再来一局</button>
      </div>`);
  }

  function showOverlay(inner) {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.innerHTML = `<div class="win-card">${inner}</div>`;
    container.appendChild(overlay);
    cleanups.push(() => overlay.remove());
    q(overlay, '#ov-exit').addEventListener('click', onExit);
    q(overlay, '#ov-again').addEventListener('click', () => {
      overlay.remove();
      round = 0; score = 0; lives = 3;
      renderGame();
    });
  }

  renderGame();
  return cleanupAll;
}
