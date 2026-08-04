// 免费开源 AI 图片生成：Pollinations.ai（FLUX，无需 API Key）

export const AI_INFO = {
  name: 'Pollinations AI（免费 · 无需 Key）',
  model: 'FLUX.1-schnell（开源）',
  hint: 'AI 图片生成需要联网，通常 10~60 秒。',
};

export const PROMPT_PRESETS = [
  { label: '🌳 森林小动物', text: '森林草地上有可爱的小兔子、小鹿和小松鼠围着蘑菇玩耍。children book illustration, cute forest animals, bunny and fawn playing near mushrooms, bright colors, flat cartoon style' },
  { label: '🌊 海底世界', text: '海底世界里的小丑鱼、海星和海龟在珊瑚丛中游动。children book illustration, clownfish and sea turtle among corals, blue tones, flat cartoon style' },
  { label: '🚀 太空冒险', text: '小宇航员和机器人在星球上玩耍，背景是彩色星空。children book illustration, little astronaut and robot on a planet, starry sky, purple blue tones, flat cartoon style' },
  { label: '🎡 游乐场', text: '彩色游乐场里有摩天轮、气球和小动物。children book illustration, colorful amusement park, ferris wheel, balloons, sunny, flat cartoon style' },
  { label: '🐱 猫咪乐园', text: '几只可爱的小猫在玩具堆里玩耍。children book illustration, cute kittens playing with toys, warm pink yellow tones, flat cartoon style' },
  { label: '🏔️ 雪山滑雪', text: '雪山上的小企鹅和小熊开心地滑雪橇。children book illustration, penguin and bear sledding on snowy mountain, blue white tones, flat cartoon style' },
];

export function buildImageUrl(prompt, { width = 768, height = 768, seed } = {}) {
  const s = seed ?? Math.floor(Math.random() * 1_000_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${s}&nologo=true&model=flux`;
}

export function loadImage(src, { crossOrigin = true, timeout = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('图片加载超时，请稍后重试'));
    }, timeout);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('图片加载失败（可能需要联网）')); };
    img.src = src;
  });
}
