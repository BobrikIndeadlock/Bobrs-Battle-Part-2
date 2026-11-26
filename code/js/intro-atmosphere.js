(() => {
  const stage = document.getElementById('intro-stage');
  const world = document.getElementById('intro-world');
  const gate = document.getElementById('intro-gate');
  if (!stage || !world || !gate) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'intro-life82';
  canvas.setAttribute('aria-hidden', 'true');
  world.insertBefore(canvas, gate);
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = 824;
  const height = 464;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const sources = {
    left: 'intro/brazier-left.webp', right: 'intro/brazier-right.webp',
    arch: 'intro/arch-light.webp', title: 'intro/title-light.webp',
    leftMetal: 'intro/metal-left.webp', rightMetal: 'intro/metal-right.webp',
    floor: 'intro/threshold-reflection.webp', shadow: 'intro/threshold-shadow.webp',
    fire: 'intro/brazier-fire.webp', mist: 'images/intro-mist.webp',
    ember: 'throne/ember.webp',
  };
  const images = new Map();
  for (const [name, file] of Object.entries(sources)) {
    const image = new Image();
    image.src = 'media/' + file;
    images.set(name, image);
  }

  let frame = 0;
  let last = 0;
  let opened = null;
  const clamp = value => Math.min(1, Math.max(0, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  function fit() {
    canvas.width = compact.matches ? 544 : width;
    canvas.height = compact.matches ? 306 : height;
  }

  function layer(name, x, y, alpha, w, h) {
    const image = images.get(name);
    if (!image?.complete || !image.naturalWidth || alpha <= 0) return;
    context.globalAlpha = clamp(alpha);
    context.drawImage(image, x, y, w ?? image.width, h ?? image.height);
  }

  function brazierFlames(time, left, strength) {
    const atlas = images.get('fire');
    if (!atlas.complete || !atlas.naturalWidth) return;
    const n = Math.floor(time * (left ? 13.2 : 11.8) + (left ? 0 : 5)) % 12;
    const x = left ? 49 : 687;
    context.globalAlpha = strength;
    context.drawImage(atlas, n % 4 * 90, Math.floor(n / 4) * 76, 90, 76, x, 184, 90, 83);
  }

  function render(now) {
    frame = 0;
    if (motion.matches || document.hidden || !stage.isConnected) return;
    frame = requestAnimationFrame(render);
    const interval = compact.matches ? 48 : 39;
    if (now - last < interval) return;
    last = now;

    const time = now / 1000;
    const passage = opened === null ? 0 : (now - opened) / 1000;
    const reveal = smooth((passage - .3) / 3.0);
    const departure = 1 - smooth((passage - 3.4) / 1.9);
    const live = (seed) => .54 + Math.sin(time * 4.3 + seed) * .09 +
      Math.sin(time * 9.1 + seed * 2) * .06 + Math.cos(time * 2.2 + seed) * .11;
    const left = live(.8) * departure;
    const right = live(2.5) * departure;

    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    context.clearRect(0, 0, width, height);

    layer('mist', -104 + 35 * Math.sin(time * .22), 268, (.18 + reveal * .13) * departure, 513, 122);
    layer('mist', 413 - 29 * Math.sin(time * .19 + 1.6), 268, (.16 + reveal * .12) * departure, 501, 123);
    layer('arch', 192, 101, (.36 + reveal * .52) * departure);
    layer('left', 0, 173, left);
    layer('right', 613, 173, right);
    layer('title', 220, 21, (.51 + .13 * Math.sin(time * .95)) * departure);

    if (passage < .23) {
      const closed = 1 - smooth(passage / .23);
      layer('leftMetal', 258, 112, (.42 + left * .12) * closed);
      layer('rightMetal', 410, 112, (.42 + right * .12) * closed);
    }

    layer('shadow', 236 - reveal * 12, 327, (.19 + reveal * .32) * departure);
    layer('floor', 184, 393, (.28 + (left + right) * .15 + reveal * .31) * departure);
    brazierFlames(time, true, left * .67);
    brazierFlames(time, false, right * .63);

    const count = compact.matches ? 14 : 24;
    for (let index = 0; index < count; index++) {
      const side = index % 2 ? 1 : -1;
      const age = (time / (2.3 + index % 5 * .41) + index * .61803398875) % 1;
      const x = (side < 0 ? 89 : 734) + Math.sin(index * 7) * 14 + side * age * 24;
      const y = 260 - age * (32 + index % 4 * 11);
      layer('ember', x, y, Math.sin(Math.PI * age) * .48 * departure, 1.2 + index % 3 * .28, 3);
    }

    layer('mist', 169 + 41 * Math.sin(time * .26) + reveal * 44, 357 - reveal * 19,
      (.20 + reveal * .18) * departure, 465, 135);
    context.globalAlpha = 1;
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function sync() {
    if (motion.matches || document.hidden || !stage.isConnected) stop();
    else if (!frame) frame = requestAnimationFrame(render);
  }

  stage.addEventListener('intro:open', () => { opened = performance.now(); }, { once: true });
  stage.addEventListener('intro:complete', () => {
    stop();
    compact.removeEventListener('change', fit);
    motion.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
  }, { once: true });
  compact.addEventListener('change', fit);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  fit();
  sync();
})();
