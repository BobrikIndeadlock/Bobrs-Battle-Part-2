(() => {
  const phase = document.getElementById('dlPhase');
  const effect = document.getElementById('dlFx');
  const chamber = document.getElementById('dlCathedral');
  const canvas = chamber.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const base = 'media/draft/';
  const candles = [
    ['demon-candles', 0, 374, 92, 120],
    ['vampire-candles', 901, 363, 99, 130],
    ['demon-flame', 204, 276, 96, 102],
    ['vampire-flame', 591, 270, 94, 100],
  ];
  const banners = [
    ['demon-banner', 253, 106, 60, 174],
    ['vampire-banner', 697, 104, 57, 175],
  ];
  const images = new Map();
  let frame = 0;
  let last = 0;
  let previous = 0;
  let elapsed = 0;
  let started = false;
  let loaded = false;

  const files = [...candles.map(([name]) => [name, base + name + '.webp']),
    ...banners.map(([name]) => [name, base + name + '.webp']),
    ['fog', 'media/throne/fog-haze.webp'], ['floor', 'media/throne/fog-floor.webp']];
  Promise.all(files.map(async ([name, source]) => {
    const image = new Image();
    image.src = source;
    try {
      await image.decode();
      images.set(name, image);
    } catch {}
  })).then(() => {
    loaded = true;
    sync();
  });

  function draw(name, x, y, width, height, alpha) {
    const image = images.get(name);
    if (!image) return;
    context.globalAlpha = alpha;
    context.drawImage(image, x, y, width, height);
  }

  function paint(time) {
    context.setTransform(canvas.width / 1000, 0, 0, canvas.height / 563, 0, 0);
    context.clearRect(0, 0, 1000, 563);
    banners.forEach(([name, x, y, width, height], index) => {
      const image = images.get(name);
      if (!image) return;
      const phase = ((time * .99 + index * 3.4) % 8 + 8) % 8;
      const step = Math.floor(phase);
      context.globalAlpha = 1;
      context.drawImage(image, step * width, 0, width, height, x, y, width, height);
      context.globalAlpha = phase - step;
      context.drawImage(image, (step + 1) % 8 * width, 0, width, height, x, y, width, height);
    });
    candles.forEach(([name, x, y, width, height], index) => {
      const power = .34 + .15 * Math.sin(time * (7.1 + index * .2) + index) +
        .10 * Math.sin(time * 11.3 + index * 2.1) + .07 * Math.cos(time * 2.12 - index);
      draw(name, x, y, width, height, power);
    });
    const drift = Math.sin(time * .23);
    draw('fog', 238 + drift * 42, 225 + Math.sin(time * .11) * 13, 515, 105, .16);
    draw('floor', -61 + drift * 53, 370, 590, 150, .24);
    draw('floor', 465 - drift * 52, 339, 584, 161, .21);
    context.globalAlpha = 1;
  }

  function active() {
    return phase.classList.contains('draft-active');
  }

  function tick(now) {
    if (!active() || document.hidden || reduced.matches || effect.classList.contains('draft-impact')) {
      frame = 0;
      return;
    }
    if (previous) elapsed += Math.min(100, now - previous);
    previous = now;
    if (!last || now - last >= (compact.matches ? 48 : 40)) {
      last = now;
      paint(elapsed / 1000);
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    const visible = active();
    if (!loaded || !visible || document.hidden || effect.classList.contains('draft-impact')) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!started) {
      paint(elapsed / 1000);
      started = true;
    }
    if (reduced.matches) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else if (!frame) {
      last = 0;
      previous = 0;
      frame = requestAnimationFrame(tick);
    }
  }

  function resize() {
    const small = compact.matches || reduced.matches;
    canvas.width = small ? 600 : 960;
    canvas.height = small ? 338 : 540;
    started = false;
    sync();
  }
  const observer = new MutationObserver(sync);
  observer.observe(phase, { attributes: true, attributeFilter: ['class'] });
  observer.observe(effect, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', sync);
  compact.addEventListener('change', resize);
  reduced.addEventListener('change', resize);
  resize();
})();
