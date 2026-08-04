// 简单的 WebAudio 音效（无需任何资源文件）

let ctx = null;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* noop */ }
  }
  return ctx;
}

export function beep(freq = 880, dur = 0.12, type = 'sine', vol = 0.15) {
  try {
    const a = ac();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(a.destination);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.start();
    o.stop(a.currentTime + dur);
  } catch { /* noop */ }
}

export const ding = () => beep(880, 0.14);
export const buzz = () => beep(200, 0.22, 'square', 0.07);
export const win = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 140)); };
export const lose = () => { [400, 300, 200].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sawtooth', 0.07), i * 160)); };
