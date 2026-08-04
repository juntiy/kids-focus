// 统一指针交互：兼容鼠标与触摸屏

export function getPos(e, el) {
  const rect = el.getBoundingClientRect();
  const src = (e.touches && e.touches.length) ? e.touches[0]
    : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e);
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

export function isTap(start, end, maxDist = 10) {
  return Math.hypot(end.x - start.x, end.y - start.y) <= maxDist;
}

// 绑定拖拽手势，返回解除绑定的函数
export function onPointerDrag(el, handlers) {
  let active = false;
  let start = null;
  let cur = null;

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    active = true;
    start = cur = getPos(e, el);
    try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
    handlers.down?.(start, e);
  };
  const move = (e) => {
    if (!active) return;
    e.preventDefault();
    cur = getPos(e, el);
    handlers.move?.(cur, start, e);
  };
  const up = (e) => {
    if (!active) return;
    active = false;
    const p = getPos(e, el);
    handlers.up?.(p, start, cur, e);
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
