(() => {
  'use strict';

  const scene = document.querySelector('.arena .scene');
  const layer = document.getElementById('livingAtmosphere');
  if (!scene || layer) return;

  const atmosphere = document.createElement('div');
  atmosphere.id = 'livingAtmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  atmosphere.append(canvas);
  scene.prepend(atmosphere);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const width = 1536;
  const height = 864;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const images = new Map();
  const season = window.createSeasonAtmosphere(context);
  const grimoire = window.grimoireVisual;
  const fogPlanes = [
    {
      image: 'fog-haze', x: 482, y: 416, width: 581, height: 159, drift: 20, speed: .22, opacity: .25,
      // The distant veil is behind the side columns and passes the lower window.
      mask: new Path2D('M 559 391 H 978 L 981 460 L 1010 483 L 1015 543 L 950 552 L 876 555 H 649 L 584 540 L 569 499 Z'),
    },
    {
      image: 'fog-haze', x: 387, y: 508, width: 771, height: 203, drift: 48, speed: .13, opacity: .43,
      // The two nearer buttresses cover the edge of this plane.
      mask: new Path2D('M 434 491 L 477 530 L 484 572 L 539 593 L 572 553 L 635 542 L 690 558 H 854 L 919 548 L 966 567 L 990 588 L 1041 579 L 1058 534 L 1106 500 L 1149 625 L 1117 667 L 951 684 L 872 656 L 665 653 L 585 678 L 436 661 L 408 626 Z'),
    },
    {
      image: 'fog-floor', x: 302, y: 646, width: 925, height: 167, drift: 60, speed: .16, opacity: .34,
      // The section across the book is cut out so the foreground never obscures it.
      mask: new Path2D('M 133 747 L 435 689 L 628 662 L 665 650 H 865 L 915 668 L 1102 687 L 1396 744 V 821 H 994 L 941 742 L 907 705 L 861 681 H 680 L 629 706 L 600 747 L 541 821 H 133 Z'),
    },
  ];
  const flameOrigins = [[30, 693], [415, 700], [1105, 705], [1508, 671]];
  const motes = Array.from({ length: 12 }, (_, index) => ({
    pair: flameOrigins[index % flameOrigins.length],
    offset: (index * .61803398875) % 1,
    period: 7.3 + (index % 5) * 1.13,
    drift: (index % 4 - 1.5) * 12,
  }));

  let frame = 0;
  let lastTime = null;
  let accumulator = 0;
  let elapsed = 0;
  let ready = false;

  function draw(name, x, y, alpha, imageWidth, imageHeight) {
    const image = images.get(name);
    if (!image) return;
    context.globalAlpha = alpha;
    context.drawImage(image, x, y, imageWidth ?? image.width, imageHeight ?? image.height);
  }

  function paint(time) {
    const lightweight = compact.matches || reduced.matches;
    const inDraft = scene.dataset.paletteSide !== '';
    const atmosphereOpacity = inDraft ? .70 : 1;

    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    context.clearRect(0, 0, width, height);
    for (const [index, plane] of fogPlanes.entries()) {
      if (lightweight && index === 0) continue;
      context.save();
      context.clip(plane.mask);
      const dx = Math.sin(time * plane.speed + index * 1.8) * plane.drift;
      const dy = Math.sin(time * plane.speed * .52 + index) * (index + 2);
      draw(plane.image, plane.x + dx, plane.y + dy, plane.opacity * atmosphereOpacity,
        plane.width, plane.height);
      context.restore();
    }

    if (!reduced.matches) {
      const moteCount = lightweight ? 4 : motes.length;
      for (let index = 0; index < moteCount; index++) {
        const { pair, offset, period, drift } = motes[index];
        const progress = (time / period + offset) % 1;
        const opacity = Math.sin(Math.PI * progress) ** 2 * (index % 3 === 0 ? .29 : .18);
        const x = pair[0] + drift * progress + Math.sin(time * .85 + index) * 4;
        const y = pair[1] - 3 - progress * (31 + (index % 4) * 7);
        const size = (1.0 + (index % 4) * .29) * (1 - progress * .39);
        draw('ember', x, y, opacity * atmosphereOpacity, size, size * 1.55);
      }
    }
    season.paint('throne', time, scene.dataset.paletteSide, { reduced: reduced.matches, compact: compact.matches });
    grimoire?.paint(context, images.get('ember'), time, reduced.matches, compact.matches);
    context.globalAlpha = 1;
  }

  function isCovered() {
    return document.hidden || document.body.classList.contains('bobrs-pause-atmosphere');
  }

  function tick(now) {
    frame = 0;
    if (isCovered() || reduced.matches) return;

    const delta = lastTime === null ? 0 : Math.min(now - lastTime, 100);
    lastTime = now;
    elapsed += delta;
    accumulator += delta;
    const interval = 1000 / (compact.matches ? 20 : 24);
    if (accumulator >= interval) {
      accumulator %= interval;
      paint(elapsed / 1000);
    }

    frame = requestAnimationFrame(tick);
  }

  function sync() {
    const covered = isCovered();
    const useStill = covered || reduced.matches;
    if (useStill) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      accumulator = 0;
      if (ready && reduced.matches && !covered) paint(0);
      return;
    }

    if (ready && !frame) {
      paint(elapsed / 1000);
      frame = requestAnimationFrame(tick);
    }
  }

  function resizeBuffer() {
    const lightweight = compact.matches || reduced.matches;
    const bufferWidth = lightweight ? 640 : 960;
    const bufferHeight = lightweight ? 360 : 540;
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    sync();
  }

  const assets = ['fog-haze', 'fog-floor', 'ember'];
  const basePath = 'media/throne/';
  const roomReady = Promise.all(assets.map(async name => {
    const image = new Image();
    image.src = basePath + name + '.webp';
    try {
      await image.decode();
      images.set(name, image);
    } catch (error) {
      console.warn('Throne atmosphere asset unavailable:', name, error);
    }
  }));
  Promise.all([roomReady, season.ready, grimoire?.ready]).then(() => {
    ready = true;
    sync();
  });

  document.addEventListener('bobrs-visibility-sync', sync);
  compact.addEventListener('change', resizeBuffer);
  reduced.addEventListener('change', resizeBuffer);
  resizeBuffer();
})();
