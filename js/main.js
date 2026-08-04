import { create as createSpotDiff } from './games/spot-diff.js';
import { create as createColorMatch } from './games/color-match.js';
import { create as createMaze } from './games/maze.js';
import { create as createObstacle } from './games/obstacle.js';
import { create as createShock } from './games/shock.js';
import { create as createSchulte } from './games/schulte.js';

const GAMES = [
  { id: 'spot-diff', name: '找不同', icon: '🔍', desc: '点击或画圈找出两图不同，支持上传图片和免费 AI 生成', color: '#ffe0b2', create: createSpotDiff },
  { id: 'color-match', name: '找相近颜色', icon: '🎨', desc: '在一堆相近颜色里，找到唯一不一样的那一个', color: '#d1c4e9', create: createColorMatch },
  { id: 'maze', name: '走迷宫', icon: '🌀', desc: '用手指拖动小球，穿过迷宫到达终点', color: '#b2dfdb', create: createMaze },
  { id: 'obstacle', name: '过障碍', icon: '🦘', desc: '点击屏幕让小青蛙跳过障碍物，越跳越远', color: '#c8e6c9', create: createObstacle },
  { id: 'shock', name: '防触电', icon: '⚡', desc: '点击安全物品得分，千万别碰带电的东西！', color: '#ffcdd2', create: createShock },
  { id: 'schulte', name: '舒尔特方格', icon: '🔢', desc: '按顺序从 1 点到最后，训练注意力和反应力', color: '#b3e5fc', create: createSchulte },
];

const root = document.getElementById('root');
let currentCleanup = null;

function renderHome() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  root.innerHTML = `
    <section class="game-grid">
      ${GAMES.map(g => `
        <button class="card" data-game="${g.id}" style="background:${g.color}">
          <div class="icon">${g.icon}</div>
          <h2>${g.name}</h2>
          <p>${g.desc}</p>
        </button>`).join('')}
    </section>`;
  root.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openGame(card.dataset.game));
  });
}

function openGame(id) {
  const g = GAMES.find(x => x.id === id);
  if (!g) return;
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  root.innerHTML = '';
  currentCleanup = g.create(root, renderHome) || null;
  window.scrollTo({ top: 0 });
}

document.getElementById('btn-home').addEventListener('click', renderHome);
renderHome();
