// 浏览器本地图库（IndexedDB）：上传的图片只保存在本机

const DB_NAME = 'kids-focus-gallery';
const STORE = 'images';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('浏览器不支持图库存储')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('打开图库失败'));
  });
}

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'img-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}

export async function addImage(dataUrl, name = '图片') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    const item = { id: uid(), name, dataUrl, createdAt: Date.now() };
    t.objectStore(STORE).put(item);
    t.oncomplete = () => resolve(item);
    t.onerror = () => reject(t.error || new Error('保存失败'));
  });
}

export async function listImages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
