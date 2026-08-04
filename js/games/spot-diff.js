import { isTap, onPointerDrag } from '../touch.js';
import { AI_INFO, PROMPT_PRESETS, buildImageUrl, loadImage } from '../ai.js';
import { addImage, listImages, deleteImage } from '../storage.js';
import { ding, buzz, win } from '../sound.js';

export const id = 'spot-diff';
export const name = '找不同';
export const icon = '🔍';
export const desc = '点击或画圈，找出两张图片的不同之处';

const DIFF_COUNT = 5;
const EMOJIS = ['⭐', '🎈', '🌸', '🍄', '🐞', '🌻', '🦋', '🎀', '🍀', '🐟'];
const PATCH_FILTERS = [
  'hue-rotate(110deg) saturate(1.25)',
  'brightness(1.5) contrast(1.15)',
  'invert(1)',
  'blur(2.5px) brightness(1.1)',
  'hue-rotate(65deg) brightness(0.9)',
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function create(container, onExit) {
  let cleanups = [];
  const cleanupAll = () => { cleanups.forEach(f => { try { f(); } catch { /* noop */ } }); cleanups = []; };
  const setScreen = (html) => { cleanupAll(); container.innerHTML = html; return container; };
  const onCleanup = (fn) => cleanups.push(fn);
  const q = (rootEl, sel) => rootEl.querySelector(sel);

  // ---------- 工具 ----------
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('无法读取文件'));
      r.readAsDataURL(file);
    });
  }

  // ---------- 主菜单 ----------
  function renderMenu() {
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" data-action="exit">← 返回</button>
          <h2>🔍 找不同</h2>
          <span></span>
        </div>
        <div class="sd-menu">
          <p class="sd-intro">选一张图片开始找不同：可以用自己的照片，也可以用免费 AI 生成专属图片。<br>
            上传图片时选择类型：<b>普通单图</b>（自动生成几处不同）或<b>现成的找不同图</b>（左右/上下并排，保持原样找）。直接<b>点击</b>或<b>画圈</b>标记即可。</p>
          <div class="sd-actions">
            <button class="btn btn-primary" id="sd-upload">📷 上传图片</button>
            <button class="btn btn-primary" id="sd-gallery">🖼️ 我的图库</button>
            <button class="btn btn-primary" id="sd-ai">✨ AI 生成</button>
          </div>
          <input type="file" id="sd-file" accept="image/*" multiple hidden>
        </div>
      </div>`);
    q(root, '[data-action="exit"]').addEventListener('click', onExit);

    const fileInput = q(root, '#sd-file');
    q(root, '#sd-upload').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const files = [...e.target.files];
      if (!files.length) return;
      try {
        const first = await readFileAsDataUrl(files[0]);
        const img = await loadImage(first, { crossOrigin: false });
        askModeAndStart(img);
        for (const f of files.slice(1)) {
          try {
            const d = await readFileAsDataUrl(f);
            await addImage(d, f.name);
          } catch { /* noop */ }
        }
        if (files.length > 1) toast('其余图片已存入“我的图库”');
      } catch (err) {
        toast('图片读取失败：' + err.message);
      }
      fileInput.value = '';
    });

    q(root, '#sd-gallery').addEventListener('click', openGallery);
    q(root, '#sd-ai').addEventListener('click', openAiModal);
  }

  // ---------- 我的图库 ----------
  async function openGallery() {
    const root = setScreen(`
      <div class="modal">
        <div class="modal-card">
          <h2>🖼️ 我的图库</h2>
          <p class="muted">上传的图片只保存在<b>本机浏览器</b>里（不上传服务器），随时可以拿来玩找不同。</p>
          <div class="gal-grid" id="gal-grid"><p class="empty">加载中…</p></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="gal-close">关闭</button>
            <button class="btn btn-primary" id="gal-add">➕ 添加图片</button>
          </div>
          <input type="file" id="gal-file" accept="image/*" multiple hidden>
        </div>
      </div>`);
    const grid = q(root, '#gal-grid');
    const fileInput = q(root, '#gal-file');

    q(root, '#gal-close').addEventListener('click', renderMenu);
    q(root, '#gal-add').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const files = [...e.target.files];
      for (const f of files) {
        try {
          const d = await readFileAsDataUrl(f);
          await addImage(d, f.name);
        } catch { /* noop */ }
      }
      fileInput.value = '';
      renderList();
    });

    async function renderList() {
      let items = [];
      try { items = await listImages(); } catch { /* noop */ }
      grid.innerHTML = items.length
        ? items.map(it => `
          <div class="gal-item">
            <img src="${it.dataUrl}" alt="${escapeHtml(it.name)}">
            <div class="gal-name">${escapeHtml(it.name)}</div>
            <div class="gal-btns">
              <button class="btn btn-small btn-primary gal-play" data-id="${it.id}">▶ 开始</button>
              <button class="btn btn-small btn-warn gal-del" data-id="${it.id}">🗑️</button>
            </div>
          </div>`).join('')
        : '<p class="empty">图库还是空的，先添加几张图片吧～</p>';

      grid.querySelectorAll('.gal-play').forEach(b => b.addEventListener('click', async () => {
        const it = items.find(x => x.id === b.dataset.id);
        if (!it) return;
        try {
          const img = await loadImage(it.dataUrl, { crossOrigin: false });
          askModeAndStart(img);
        } catch { toast('图片加载失败'); }
      }));
      grid.querySelectorAll('.gal-del').forEach(b => b.addEventListener('click', async () => {
        try { await deleteImage(b.dataset.id); toast('已删除'); renderList(); } catch { toast('删除失败'); }
      }));
    }
    renderList();
  }

  // ---------- AI 生成 ----------
  function openAiModal() {
    const root = setScreen(`
      <div class="modal">
        <div class="modal-card">
          <h2>✨ AI 生成找不同图片</h2>
          <p class="muted">使用免费开源模型 <b>${escapeHtml(AI_INFO.model)}</b>（${escapeHtml(AI_INFO.name)}），无需登录或付费。生成需要联网，通常 10~60 秒。</p>
          <div class="chips" id="ai-chips">
            ${PROMPT_PRESETS.map((p, i) => `<button class="chip${i === 0 ? ' active' : ''}" data-i="${i}">${p.label}</button>`).join('')}
          </div>
          <textarea id="ai-prompt" rows="2" maxlength="200" placeholder="也可以自己输入画面描述，比如：一只戴帽子的小狗在海边…"></textarea>
          <div id="ai-status" class="ai-status"></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="ai-cancel">取消</button>
            <button class="btn" id="ai-random">🎲 随机画面</button>
            <button class="btn btn-primary" id="ai-gen">✨ 开始生成</button>
          </div>
        </div>
      </div>`);
    let selected = 0;
    const chips = [...root.querySelectorAll('.chip')];
    const promptEl = q(root, '#ai-prompt');
    const statusEl = q(root, '#ai-status');
    const genBtn = q(root, '#ai-gen');

    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      selected = Number(ch.dataset.i);
      promptEl.value = '';
    }));
    q(root, '#ai-cancel').addEventListener('click', renderMenu);
    q(root, '#ai-random').addEventListener('click', () => {
      const i = Math.floor(Math.random() * PROMPT_PRESETS.length);
      chips.forEach(c => c.classList.remove('active'));
      chips[i].classList.add('active');
      selected = i;
      promptEl.value = '';
    });

    genBtn.addEventListener('click', async () => {
      const custom = promptEl.value.trim();
      const preset = PROMPT_PRESETS[selected];
      const prompt = (custom || preset.text) + '，儿童绘本插画风格，色彩鲜艳明亮，画面干净，没有文字';
      genBtn.disabled = true;
      statusEl.innerHTML = '<span class="spinner"></span><p>正在生成图片，请稍候…（免费模型生成较慢）</p>';
      const url = buildImageUrl(prompt, { width: 768, height: 768 });
      try {
        let img;
        try {
          img = await loadImage(url);
        } catch (e) {
          // 跨域读取失败时，退回不跨域加载（自动改用滤镜差异方案）
          img = await loadImage(url, { crossOrigin: false });
        }
        startGame(img);
      } catch (err) {
        statusEl.innerHTML = `<p class="err">${escapeHtml(err.message)}。请检查网络，或改用“上传图片”/“我的图库”。</p>`;
        genBtn.disabled = false;
      }
    });
  }

  // ---------- 上传图片类型选择 ----------
  function askModeAndStart(img) {
    const root = setScreen(`
      <div class="modal">
        <div class="modal-card">
          <h2>🖼️ 这张图是哪种？</h2>
          <p class="muted">告诉游戏怎么玩，找不同会更准：</p>
          <div class="sd-mode-options">
            <button class="sd-mode" id="mode-single">
              <div class="mode-icon">🌄</div>
              <div class="mode-body">
                <div class="mode-title">普通单张画面</div>
                <div class="mode-desc">游戏会在图上自动生成几处不同（适合普通照片 / 插画）</div>
              </div>
            </button>
            <button class="sd-mode" id="mode-pair">
              <div class="mode-icon">🖼️</div>
              <div class="mode-body">
                <div class="mode-title">已经做好的找不同图</div>
                <div class="mode-desc">图里已有一对画面（左右或上下并排），保持原样来找不同</div>
              </div>
            </button>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="mode-cancel">取消</button>
          </div>
        </div>
      </div>`);
    q(root, '#mode-cancel').addEventListener('click', renderMenu);
    q(root, '#mode-single').addEventListener('click', () => startGame(img));
    q(root, '#mode-pair').addEventListener('click', () => startExistingGame(img));
  }

  function startExistingGame(img) {
    const analysis = analyzePairImage(img);
    if (analysis.mode === 'verified') startVerifiedGame(img, analysis);
    else startFreeGame(img, analysis.reason);
  }

  // ---------- 生成差异 ----------
  function prepareGame(img) {
    const iw0 = img.naturalWidth;
    const ih0 = img.naturalHeight;
    const MAX = 720;
    const sc = Math.min(1, MAX / Math.max(iw0, ih0));
    const iw = Math.max(1, Math.round(iw0 * sc));
    const ih = Math.max(1, Math.round(ih0 * sc));

    const base = document.createElement('canvas');
    base.width = iw;
    base.height = ih;
    const bctx = base.getContext('2d');
    bctx.drawImage(img, 0, 0, iw, ih);

    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = iw;
    diffCanvas.height = ih;
    const dctx = diffCanvas.getContext('2d');
    dctx.drawImage(base, 0, 0);

    const margin = Math.min(iw, ih) * 0.08;
    const baseR = Math.min(iw, ih) * 0.065;
    const diffs = [];
    let attempts = 0;
    while (diffs.length < DIFF_COUNT && attempts < DIFF_COUNT * 40) {
      attempts++;
      const r = baseR * (0.9 + Math.random() * 0.35);
      const x = margin + Math.random() * (iw - margin * 2);
      const y = margin + Math.random() * (ih - margin * 2);
      if (diffs.some(d => Math.hypot(d.x - x, d.y - y) < d.r + r + baseR)) continue;
      diffs.push({ x, y, r });
    }

    let dataUrl = null;
    let patches = null;
    try {
      applyPixelDiffs(bctx, dctx, base, diffs);
      dataUrl = diffCanvas.toDataURL('image/jpeg', 0.92);
    } catch {
      // 跨域图片无法读取像素时，用“滤镜补丁”方案
      patches = diffs.map((d, i) => ({
        x: d.x, y: d.y, r: d.r,
        filter: PATCH_FILTERS[i % PATCH_FILTERS.length],
      }));
    }
    return { iw, ih, diffs, dataUrl, patches };
  }

  function applyPixelDiffs(bctx, dctx, base, diffs) {
    const w = base.width;
    const h = base.height;
    const basePixels = bctx.getImageData(0, 0, w, h).data;

    diffs.forEach((d, i) => {
      const type = i % 5;
      const x0 = Math.max(0, Math.floor(d.x - d.r));
      const x1 = Math.min(w - 1, Math.ceil(d.x + d.r));
      const y0 = Math.max(0, Math.floor(d.y - d.r));
      const y1 = Math.min(h - 1, Math.ceil(d.y + d.r));
      if (x1 < x0 || y1 < y0) return;
      const rw = x1 - x0 + 1;
      const rh = y1 - y0 + 1;
      const img = dctx.getImageData(x0, y0, rw, rh);
      const data = img.data;
      const cx = d.x - x0;
      const cy = d.y - y0;
      const inCircle = (i2, j2) => {
        const dx = i2 - cx;
        const dy = j2 - cy;
        return dx * dx + dy * dy <= d.r * d.r;
      };

      if (type === 0) {
        // 色相偏移
        for (let j = 0; j < rh; j++) {
          for (let i2 = 0; i2 < rw; i2++) {
            if (!inCircle(i2, j)) continue;
            const k = (j * rw + i2) * 4;
            const [hh, ss, ll] = rgbToHsl(data[k], data[k + 1], data[k + 2]);
            const [rr, gg, bb] = hslToRgb((hh + 100 + Math.random() * 40) % 360, Math.min(1, ss + 0.12), ll);
            data[k] = rr; data[k + 1] = gg; data[k + 2] = bb;
          }
        }
      } else if (type === 1) {
        // 变亮
        for (let j = 0; j < rh; j++) {
          for (let i2 = 0; i2 < rw; i2++) {
            if (!inCircle(i2, j)) continue;
            const k = (j * rw + i2) * 4;
            data[k] = Math.min(255, data[k] * 1.5);
            data[k + 1] = Math.min(255, data[k + 1] * 1.5);
            data[k + 2] = Math.min(255, data[k + 2] * 1.5);
          }
        }
      } else if (type === 2) {
        // 反色
        for (let j = 0; j < rh; j++) {
          for (let i2 = 0; i2 < rw; i2++) {
            if (!inCircle(i2, j)) continue;
            const k = (j * rw + i2) * 4;
            data[k] = 255 - data[k];
            data[k + 1] = 255 - data[k + 1];
            data[k + 2] = 255 - data[k + 2];
          }
        }
      } else if (type === 3) {
        // 模糊
        const src = new Uint8ClampedArray(data);
        for (let j = 0; j < rh; j++) {
          for (let i2 = 0; i2 < rw; i2++) {
            if (!inCircle(i2, j)) continue;
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let dj = -2; dj <= 2; dj++) {
              for (let di = -2; di <= 2; di++) {
                const ii = i2 + di;
                const jj = j + dj;
                if (ii < 0 || jj < 0 || ii >= rw || jj >= rh) continue;
                const k = (jj * rw + ii) * 4;
                r += src[k]; g += src[k + 1]; b += src[k + 2]; a += src[k + 3]; n++;
              }
            }
            const k = (j * rw + i2) * 4;
            data[k] = r / n; data[k + 1] = g / n; data[k + 2] = b / n; data[k + 3] = a / n;
          }
        }
      } else {
        // 涂抹掉（采样边缘颜色填充成补丁）
        const N = 16;
        let r = 0, g = 0, b = 0;
        for (let a = 0; a < N; a++) {
          const ang = Math.PI * 2 * a / N;
          const sx = Math.max(0, Math.min(w - 1, Math.round(d.x + Math.cos(ang) * d.r * 1.3)));
          const sy = Math.max(0, Math.min(h - 1, Math.round(d.y + Math.sin(ang) * d.r * 1.3)));
          const k = (sy * w + sx) * 4;
          r += basePixels[k]; g += basePixels[k + 1]; b += basePixels[k + 2];
        }
        r = Math.round(r / N); g = Math.round(g / N); b = Math.round(b / N);
        const grad = dctx.createRadialGradient(d.x, d.y, d.r * 0.5, d.x, d.y, d.r);
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
        grad.addColorStop(0.75, `rgba(${r},${g},${b},0.92)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        dctx.save();
        dctx.fillStyle = grad;
        dctx.beginPath();
        dctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        dctx.fill();
        dctx.restore();
        return;
      }
      dctx.putImageData(img, x0, y0);
    });

    // 在部分差异处“添加”一个可爱小物件（更接近真实找不同）
    diffs.forEach((d, i) => {
      if (i % 2 === 1) {
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        dctx.font = `${Math.round(d.r * 1.8)}px "Segoe UI Emoji", "Apple Color Emoji", serif`;
        dctx.textAlign = 'center';
        dctx.textBaseline = 'middle';
        dctx.fillText(emoji, d.x, d.y + d.r * 0.05);
      }
    });
  }

  // ---------- 开始游戏 ----------
  function startGame(img) {
    const prepared = prepareGame(img);
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="sd-back">← 返回</button>
          <h2>🔍 找出 <b id="sd-found">0</b> / ${DIFF_COUNT} 处不同</h2>
          <button class="btn" id="sd-hint">💡 提示</button>
        </div>
        <div class="sd-images">
          <figure class="sd-fig">
            <figcaption>图 A · 原图</figcaption>
            <div class="sd-imgwrap" id="sd-wrap-a"><img id="sd-img-a" alt="原图"><canvas id="sd-overlay-a"></canvas></div>
          </figure>
          <figure class="sd-fig">
            <figcaption>图 B · 找不同</figcaption>
            <div class="sd-imgwrap" id="sd-wrap-b"><img id="sd-img-b" alt="找不同"><canvas id="sd-overlay-b"></canvas></div>
          </figure>
        </div>
        <div class="sd-timer">⏱️ <span id="sd-time">0</span> 秒</div>
      </div>`);

    const game = {
      iw: prepared.iw,
      ih: prepared.ih,
      diffs: prepared.diffs,
      found: new Set(),
      hints: 0,
      seconds: 0,
      wrapA: q(root, '#sd-wrap-a'),
      wrapB: q(root, '#sd-wrap-b'),
      imgA: q(root, '#sd-img-a'),
      imgB: q(root, '#sd-img-b'),
    };
    let hintTimer = null;
    let hintIndex = -1;
    let hintOn = false;

    game.imgA.src = img.src;
    game.imgB.src = prepared.dataUrl || img.src;
    game.wrapA.style.aspectRatio = `${game.iw} / ${game.ih}`;
    game.wrapB.style.aspectRatio = `${game.iw} / ${game.ih}`;
    if (prepared.patches) applyPatches(game, prepared.patches);

    const timeEl = q(root, '#sd-time');
    const foundEl = q(root, '#sd-found');
    const timer = setInterval(() => { game.seconds++; timeEl.textContent = game.seconds; }, 1000);
    onCleanup(() => clearInterval(timer));

    q(root, '#sd-back').addEventListener('click', renderMenu);
    q(root, '#sd-hint').addEventListener('click', useHint);

    [game.wrapA, game.wrapB].forEach(wrap => {
      const off = onPointerDrag(wrap, {
        down: () => {},
        move: (p, start) => drawGesture(p, start, true),
        up: (p, start) => {
          drawGesture(p, start, false);
          handleTapOrCircle(start, p);
        },
      });
      onCleanup(off);
    });

    function drawGesture(p, start, on) {
      const cv = game.wrapB.querySelector('canvas');
      redrawOverlays();
      if (!on || !p) return;
      const c = cv.getContext('2d');
      c.strokeStyle = '#ff7043';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      if (isTap(start, p, 8)) {
        c.beginPath(); c.arc(p.x, p.y, 10, 0, Math.PI * 2); c.stroke();
      } else {
        const cx = (start.x + p.x) / 2;
        const cy = (start.y + p.y) / 2;
        const r = Math.hypot(p.x - start.x, p.y - start.y) / 2;
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
      }
      c.setLineDash([]);
    }

    function handleTapOrCircle(start, p) {
      const rect = game.wrapB.getBoundingClientRect();
      if (!rect.width) return;
      const toNat = (px, py) => ({ x: px / rect.width * game.iw, y: py / rect.height * game.ih });
      const hits = [];
      if (isTap(start, p, 8)) {
        const n = toNat(p.x, p.y);
        game.diffs.forEach((d, i) => {
          if (!game.found.has(i) && Math.hypot(n.x - d.x, n.y - d.y) < d.r * 1.35) hits.push(i);
        });
      } else {
        const cn = toNat((start.x + p.x) / 2, (start.y + p.y) / 2);
        const cr = Math.hypot(p.x - start.x, p.y - start.y) / 2 * (game.iw / rect.width);
        game.diffs.forEach((d, i) => {
          if (!game.found.has(i) && Math.hypot(cn.x - d.x, cn.y - d.y) < cr + d.r * 0.9) hits.push(i);
        });
      }
      if (hits.length) {
        hits.forEach(i => game.found.add(i));
        ding();
        foundEl.textContent = game.found.size;
        redrawOverlays();
        if (game.found.size >= DIFF_COUNT) showWin();
      } else {
        buzz();
      }
    }

    function useHint() {
      if (game.found.size >= DIFF_COUNT || hintTimer) return;
      game.hints++;
      hintIndex = game.diffs.findIndex((d, i) => !game.found.has(i));
      if (hintIndex < 0) return;
      hintOn = true;
      redrawOverlays();
      hintTimer = setInterval(() => { hintOn = !hintOn; redrawOverlays(); }, 320);
      setTimeout(() => {
        clearInterval(hintTimer);
        hintTimer = null;
        hintOn = false;
        redrawOverlays();
      }, 3200);
      onCleanup(() => clearInterval(hintTimer));
    }

    function redrawOverlays() {
      [game.wrapA, game.wrapB].forEach(wrap => {
        const cv = wrap.querySelector('canvas');
        const rect = wrap.getBoundingClientRect();
        if (!rect.width) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(rect.width * dpr);
        cv.height = Math.round(rect.height * dpr);
        const c = cv.getContext('2d');
        c.scale(dpr, dpr);
        c.clearRect(0, 0, rect.width, rect.height);
        const sx = rect.width / game.iw;
        const sy = rect.height / game.ih;
        game.diffs.forEach((d, i) => {
          if (!game.found.has(i)) return;
          const px = d.x * sx;
          const py = d.y * sy;
          const pr = Math.max(14, d.r * sx);
          c.fillStyle = 'rgba(76, 175, 80, .28)';
          c.strokeStyle = '#2e7d32';
          c.lineWidth = 4;
          c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#2e7d32';
          c.font = `bold ${Math.round(pr * 0.95)}px sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('✓', px, py + 1);
        });
      });
      // 提示圈（只画在图 B 上）
      if (hintOn && hintIndex >= 0 && !game.found.has(hintIndex)) {
        const d = game.diffs[hintIndex];
        const cv = game.wrapB.querySelector('canvas');
        const rect = game.wrapB.getBoundingClientRect();
        const c = cv.getContext('2d');
        c.strokeStyle = '#ffb300';
        c.lineWidth = 5;
        c.setLineDash([12, 8]);
        c.beginPath(); c.arc(d.x * rect.width / game.iw, d.y * rect.height / game.ih, Math.max(20, d.r * rect.width / game.iw), 0, Math.PI * 2); c.stroke();
        c.setLineDash([]);
      }
    }

    function applyPatches(g, patches) {
      patches.forEach(p => {
        const div = document.createElement('div');
        div.className = 'sd-patch';
        div.style.backgroundImage = `url("${g.imgB.src}")`;
        div.style.backgroundSize = '100% 100%';
        div.style.clipPath = `circle(${p.r}px at ${p.x}px ${p.y}px)`;
        div.style.filter = p.filter;
        g.wrapB.appendChild(div);
      });
    }

    function showWin() {
      win();
      const stars = Math.max(1, 3 - game.hints);
      const overlay = document.createElement('div');
      overlay.className = 'win-overlay';
      overlay.innerHTML = `
        <div class="win-card">
          <h2>🎉 太棒了！全部找到！</h2>
          <p>用时 <b>${game.seconds}</b> 秒 · 提示 <b>${game.hints}</b> 次</p>
          <p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="sd-new">🖼️ 换一张</button>
            <button class="btn btn-primary" id="sd-again">🔄 再玩一次</button>
          </div>
        </div>`;
      container.appendChild(overlay);
      onCleanup(() => overlay.remove());
      q(overlay, '#sd-new').addEventListener('click', () => { overlay.remove(); renderMenu(); });
      q(overlay, '#sd-again').addEventListener('click', () => { overlay.remove(); startGame(img); });
    }
  }

  // ---------- 现成找不同图：自动扫描答案版 ----------
  function startVerifiedGame(img, analysis) {
    const game = {
      iw: img.naturalWidth,
      ih: img.naturalHeight,
      diffs: analysis.diffs,
      mirror: analysis.mirror,
      found: new Set(),
      hints: 0,
      seconds: 0,
    };
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="sv-back">← 返回</button>
          <h2>🔍 找出 <b id="sv-found">0</b> / ${game.diffs.length} 处不同</h2>
          <button class="btn" id="sv-hint">💡 提示</button>
        </div>
        <p class="center muted">图片里已经有两幅画面：点击或画圈标出<b>不同之处</b>，左右两边都能点～</p>
        <div class="sd-single">
          <div class="sd-imgwrap" id="sv-wrap"><img id="sv-img" alt="找不同图片"><canvas id="sv-overlay"></canvas></div>
        </div>
        <div class="sd-timer">⏱️ <span id="sv-time">0</span> 秒</div>
      </div>`);
    const wrap = q(root, '#sv-wrap');
    const cv = q(root, '#sv-overlay');
    const timeEl = q(root, '#sv-time');
    const foundEl = q(root, '#sv-found');
    q(root, '#sv-img').src = img.src;
    wrap.style.aspectRatio = `${game.iw} / ${game.ih}`;

    const timer = setInterval(() => { game.seconds++; timeEl.textContent = game.seconds; }, 1000);
    onCleanup(() => clearInterval(timer));
    q(root, '#sv-back').addEventListener('click', renderMenu);

    let hintTimer = null;
    let hintIndex = -1;
    let hintOn = false;
    q(root, '#sv-hint').addEventListener('click', () => {
      if (game.found.size >= game.diffs.length || hintTimer) return;
      game.hints++;
      hintIndex = game.diffs.findIndex((d, i) => !game.found.has(i));
      if (hintIndex < 0) return;
      hintOn = true;
      redraw();
      hintTimer = setInterval(() => { hintOn = !hintOn; redraw(); }, 320);
      setTimeout(() => { clearInterval(hintTimer); hintTimer = null; hintOn = false; redraw(); }, 3200);
      onCleanup(() => clearInterval(hintTimer));
    });

    const off = onPointerDrag(wrap, {
      down: () => {},
      move: (p, start) => drawGesture(p, start, true),
      up: (p, start) => { drawGesture(p, start, false); handleTap(start, p); },
    });
    onCleanup(off);

    function toNat(px, py) {
      const rect = wrap.getBoundingClientRect();
      return { x: px / rect.width * game.iw, y: py / rect.height * game.ih };
    }

    function nearDiff(pt, d, extra = 0) {
      const base = Math.hypot(pt.x - d.x, pt.y - d.y);
      const mirrored = Math.hypot(pt.x - (d.x + game.mirror.x), pt.y - (d.y + game.mirror.y));
      return Math.min(base, mirrored) < d.r * 1.5 + extra;
    }

    function drawGesture(p, start, on) {
      redraw();
      if (!on || !p) return;
      const c = cv.getContext('2d');
      c.strokeStyle = '#ff7043';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      if (isTap(start, p, 8)) {
        c.beginPath(); c.arc(p.x, p.y, 10, 0, Math.PI * 2); c.stroke();
      } else {
        c.beginPath(); c.arc((start.x + p.x) / 2, (start.y + p.y) / 2, Math.hypot(p.x - start.x, p.y - start.y) / 2, 0, Math.PI * 2); c.stroke();
      }
      c.setLineDash([]);
    }

    function handleTap(start, p) {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;
      const hits = [];
      if (isTap(start, p, 8)) {
        const pt = toNat(p.x, p.y);
        game.diffs.forEach((d, i) => { if (!game.found.has(i) && nearDiff(pt, d)) hits.push(i); });
      } else {
        const cn = toNat((start.x + p.x) / 2, (start.y + p.y) / 2);
        const cr = Math.hypot(p.x - start.x, p.y - start.y) / 2 * (game.iw / rect.width);
        game.diffs.forEach((d, i) => { if (!game.found.has(i) && nearDiff(cn, d, cr + d.r * 0.8)) hits.push(i); });
      }
      if (hits.length) {
        hits.forEach(i => game.found.add(i));
        ding();
        foundEl.textContent = game.found.size;
        redraw();
        if (game.found.size >= game.diffs.length) showWin();
      } else {
        buzz();
      }
    }

    function redraw() {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      const c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.clearRect(0, 0, rect.width, rect.height);
      const sx = rect.width / game.iw;
      const sy = rect.height / game.ih;
      const drawMark = (d) => {
        const px = d.x * sx;
        const py = d.y * sy;
        const pr = Math.max(14, d.r * sx);
        c.fillStyle = 'rgba(76, 175, 80, .28)';
        c.strokeStyle = '#2e7d32';
        c.lineWidth = 4;
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#2e7d32';
        c.font = `bold ${Math.round(pr * 0.95)}px sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('✓', px, py + 1);
      };
      game.diffs.forEach((d, i) => {
        if (!game.found.has(i)) return;
        drawMark(d);
        drawMark({ x: d.x + game.mirror.x, y: d.y + game.mirror.y, r: d.r });
      });
      if (hintOn && hintIndex >= 0 && !game.found.has(hintIndex)) {
        const d = game.diffs[hintIndex];
        c.strokeStyle = '#ffb300';
        c.lineWidth = 5;
        c.setLineDash([12, 8]);
        [d, { x: d.x + game.mirror.x, y: d.y + game.mirror.y, r: d.r }].forEach(h => {
          c.beginPath(); c.arc(h.x * sx, h.y * sy, Math.max(20, h.r * sx), 0, Math.PI * 2); c.stroke();
        });
        c.setLineDash([]);
      }
    }

    function showWin() {
      win();
      const stars = Math.max(1, 3 - game.hints);
      const overlay = document.createElement('div');
      overlay.className = 'win-overlay';
      overlay.innerHTML = `
        <div class="win-card">
          <h2>🎉 全部找到！</h2>
          <p>用时 <b>${game.seconds}</b> 秒 · 提示 <b>${game.hints}</b> 次</p>
          <p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="sv-new">🖼️ 换一张</button>
            <button class="btn btn-primary" id="sv-again">🔄 再玩一次</button>
          </div>
        </div>`;
      container.appendChild(overlay);
      onCleanup(() => overlay.remove());
      q(overlay, '#sv-new').addEventListener('click', () => { overlay.remove(); renderMenu(); });
      q(overlay, '#sv-again').addEventListener('click', () => { overlay.remove(); startVerifiedGame(img, analysis); });
    }
  }

  // ---------- 现成找不同图：自由标记版（扫描不出答案时的兜底） ----------
  function startFreeGame(img, reason) {
    const game = { iw: img.naturalWidth, ih: img.naturalHeight, marks: [], seconds: 0 };
    const root = setScreen(`
      <div class="game-page">
        <div class="game-topbar">
          <button class="btn btn-secondary" id="sf-back">← 返回</button>
          <h2>🔍 找不同 · 自由标记</h2>
          <button class="btn btn-primary" id="sf-done">✅ 完成</button>
        </div>
        <p class="center muted">${escapeHtml(reason || '图片保持原样')}：找到不同就<b>点一下</b>标记，点错再点一下可以取消。</p>
        <div class="sd-single">
          <div class="sd-imgwrap" id="sf-wrap"><img id="sf-img" alt="找不同图片"><canvas id="sf-overlay"></canvas></div>
        </div>
        <div class="sd-timer">⏱️ <span id="sf-time">0</span> 秒 · 已标记 <b id="sf-count">0</b> 处</div>
      </div>`);
    const wrap = q(root, '#sf-wrap');
    const cv = q(root, '#sf-overlay');
    const timeEl = q(root, '#sf-time');
    const countEl = q(root, '#sf-count');
    q(root, '#sf-img').src = img.src;
    wrap.style.aspectRatio = `${game.iw} / ${game.ih}`;

    const timer = setInterval(() => { game.seconds++; timeEl.textContent = game.seconds; }, 1000);
    onCleanup(() => clearInterval(timer));
    q(root, '#sf-back').addEventListener('click', renderMenu);
    q(root, '#sf-done').addEventListener('click', finish);

    const off = onPointerDrag(wrap, {
      down: () => {},
      move: (p, start) => drawGesture(p, start, true),
      up: (p, start) => { drawGesture(p, start, false); addMark(start, p); },
    });
    onCleanup(off);

    function toNat(px, py) {
      const rect = wrap.getBoundingClientRect();
      return { x: px / rect.width * game.iw, y: py / rect.height * game.ih };
    }

    function drawGesture(p, start, on) {
      redraw();
      if (!on || !p) return;
      const c = cv.getContext('2d');
      c.strokeStyle = '#ff7043';
      c.lineWidth = 3;
      c.setLineDash([8, 6]);
      if (isTap(start, p, 8)) {
        c.beginPath(); c.arc(p.x, p.y, 10, 0, Math.PI * 2); c.stroke();
      } else {
        c.beginPath(); c.arc((start.x + p.x) / 2, (start.y + p.y) / 2, Math.hypot(p.x - start.x, p.y - start.y) / 2, 0, Math.PI * 2); c.stroke();
      }
      c.setLineDash([]);
    }

    function addMark(start, p) {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;
      const pt = toNat(p.x, p.y);
      const r = Math.max(20, Math.min(game.iw, game.ih) * 0.045);
      const hit = game.marks.findIndex(m => Math.hypot(m.x - pt.x, m.y - pt.y) < m.r * 1.5);
      if (hit >= 0) { game.marks.splice(hit, 1); buzz(); }
      else { game.marks.push({ x: pt.x, y: pt.y, r }); ding(); }
      countEl.textContent = game.marks.length;
      redraw();
    }

    function redraw() {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      const c = cv.getContext('2d');
      c.scale(dpr, dpr);
      c.clearRect(0, 0, rect.width, rect.height);
      const sx = rect.width / game.iw;
      const sy = rect.height / game.ih;
      game.marks.forEach((m, i) => {
        const px = m.x * sx;
        const py = m.y * sy;
        const pr = Math.max(14, m.r * sx);
        c.fillStyle = 'rgba(76, 175, 80, .28)';
        c.strokeStyle = '#2e7d32';
        c.lineWidth = 4;
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#2e7d32';
        c.font = `bold ${Math.round(pr * 0.95)}px sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(i + 1), px, py + 1);
      });
    }

    function finish() {
      const stars = game.marks.length >= 5 ? 3 : game.marks.length >= 3 ? 2 : 1;
      const overlay = document.createElement('div');
      overlay.className = 'win-overlay';
      overlay.innerHTML = `
        <div class="win-card">
          <h2>🔍 标记完成！</h2>
          <p>找到了 <b>${game.marks.length}</b> 处不同 · 用时 <b>${game.seconds}</b> 秒</p>
          <p class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
          <p class="muted">标记错了可以点掉重标，多找几遍更专注～</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="sf-new">🖼️ 换一张</button>
            <button class="btn btn-primary" id="sf-again">🔄 再玩一次</button>
          </div>
        </div>`;
      container.appendChild(overlay);
      onCleanup(() => overlay.remove());
      q(overlay, '#sf-new').addEventListener('click', () => { overlay.remove(); renderMenu(); });
      q(overlay, '#sf-again').addEventListener('click', () => { overlay.remove(); startFreeGame(img, reason); });
    }
  }

  renderMenu();
  return cleanupAll;
}

// ---------- 颜色工具 ----------
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h / 360 + 1 / 3) * 255), Math.round(f(h / 360) * 255), Math.round(f(h / 360 - 1 / 3) * 255)];
}

// ---------- 现成找不同图的本地扫描（无需联网 AI） ----------
function analyzePairImage(img) {
  const MAX = 640;
  const sc = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const iw = Math.max(1, Math.round(img.naturalWidth * sc));
  const ih = Math.max(1, Math.round(img.naturalHeight * sc));
  const cv = document.createElement('canvas');
  cv.width = iw;
  cv.height = ih;
  const c = cv.getContext('2d');
  c.drawImage(img, 0, 0, iw, ih);
  let data;
  try {
    data = c.getImageData(0, 0, iw, ih).data;
  } catch {
    return { mode: 'free', reason: '这张图无法读取像素，请直接自由标记' };
  }
  const v = compareHalves(data, iw, ih, 'v');
  const h = compareHalves(data, iw, ih, 'h');
  const best = v.cost <= h.cost ? v : h;
  if (best.cost > 34) {
    return { mode: 'free', reason: '没有检测到左右/上下并排的两幅画面，直接自由标记' };
  }
  const blobs = findDiffBlobs(best.mask, iw, ih);
  if (blobs.length < 3) {
    return { mode: 'free', reason: '检测到的差异太少，直接自由标记' };
  }
  const k = 1 / sc;
  const minDim = Math.min(img.naturalWidth, img.naturalHeight);
  const diffs = blobs.slice(0, 10).map(b => ({
    x: b.cx * k,
    y: b.cy * k,
    r: Math.min(Math.max(20, b.r * k), minDim * 0.08),
  }));
  return {
    mode: 'verified',
    diffs,
    mirror: { x: best.ox * k, y: best.oy * k },
  };
}

function compareHalves(data, iw, ih, orient) {
  const margin = Math.max(4, Math.floor(Math.min(iw, ih) * 0.04));
  const w1 = orient === 'v' ? iw >> 1 : iw;
  const h1 = orient === 'v' ? ih : ih >> 1;
  const ox = orient === 'v' ? iw >> 1 : 0;
  const oy = orient === 'v' ? 0 : ih >> 1;

  let best = { cost: Infinity, dx: 0, dy: 0 };
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      let sum = 0;
      let n = 0;
      for (let y = margin; y < h1 - margin; y += 2) {
        for (let x = margin; x < w1 - margin; x += 2) {
          const bx = x + ox + dx;
          const by = y + oy + dy;
          if (bx < 0 || by < 0 || bx >= iw || by >= ih) continue;
          const k1 = (y * iw + x) * 4;
          const k2 = (by * iw + bx) * 4;
          sum += Math.abs(data[k1] - data[k2])
            + Math.abs(data[k1 + 1] - data[k2 + 1])
            + Math.abs(data[k1 + 2] - data[k2 + 2]);
          n++;
        }
      }
      const cost = n ? sum / n : Infinity;
      if (cost < best.cost) best = { cost, dx, dy };
    }
  }

  const mask = new Uint8Array(iw * ih);
  const th = 90;
  for (let y = margin; y < h1 - margin; y++) {
    for (let x = margin; x < w1 - margin; x++) {
      const bx = x + ox + best.dx;
      const by = y + oy + best.dy;
      if (bx < 0 || by < 0 || bx >= iw || by >= ih) continue;
      const k1 = (y * iw + x) * 4;
      const k2 = (by * iw + bx) * 4;
      const d = Math.abs(data[k1] - data[k2])
        + Math.abs(data[k1 + 1] - data[k2 + 1])
        + Math.abs(data[k1 + 2] - data[k2 + 2]);
      if (d > th) mask[y * iw + x] = 1;
    }
  }
  return { orient, cost: best.cost, mask, ox, oy, dx: best.dx, dy: best.dy };
}

function findDiffBlobs(mask, iw, ih) {
  // 轻微膨胀连接邻近像素
  const dil = new Uint8Array(iw * ih);
  for (let y = 1; y < ih - 1; y++) {
    for (let x = 1; x < iw - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) s += mask[(y + dy) * iw + (x + dx)];
      }
      if (s >= 2) dil[y * iw + x] = 1;
    }
  }
  const visited = new Uint8Array(iw * ih);
  const blobs = [];
  const minArea = 20;
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      const idx = y * iw + x;
      if (!dil[idx] || visited[idx]) continue;
      const stack = [idx];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y, area = 0, sx = 0, sy = 0;
      while (stack.length) {
        const cur = stack.pop();
        const cx = cur % iw;
        const cy = (cur / iw) | 0;
        area++;
        sx += cx;
        sy += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const neigh = [cur - 1, cur + 1, cur - iw, cur + iw, cur - iw - 1, cur - iw + 1, cur + iw - 1, cur + iw + 1];
        for (const nn of neigh) {
          if (nn < 0 || nn >= iw * ih) continue;
          if (dil[nn] && !visited[nn]) { visited[nn] = 1; stack.push(nn); }
        }
      }
      if (area < minArea) continue;
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w > iw * 0.45 || h > ih * 0.45) continue;
      blobs.push({ cx: sx / area, cy: sy / area, r: Math.max(w, h) / 2, area });
    }
  }
  blobs.sort((a, b) => b.area - a.area);
  const merged = [];
  for (const b of blobs) {
    const near = merged.find(m => Math.hypot(m.cx - b.cx, m.cy - b.cy) < 28);
    if (near) near.area += b.area;
    else merged.push({ cx: b.cx, cy: b.cy, r: b.r, area: b.area });
  }
  merged.sort((a, b) => b.area - a.area);
  return merged;
}

export const __internals = { compareHalves, findDiffBlobs };

// ---------- 全局提示 ----------
let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2800);
}
