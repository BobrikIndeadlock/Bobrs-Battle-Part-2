(() => {
  'use strict';

  const scene = document.querySelector('.arena .scene');
  const layer = document.getElementById('livingAtmosphere');
  if (!scene || layer) return;

  const atmosphere = document.createElement('div');
  atmosphere.id = 'livingAtmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  const lightCanvas = document.createElement('canvas');
  atmosphere.append(lightCanvas,canvas);
  scene.prepend(atmosphere);
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const width = 1536;
  const height = 864;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const season = window.createSeasonAtmosphere(lightCanvas,'throne');
  scene.addEventListener('captain:received-card',event => season.receive(event.detail));
  const grimoire = window.grimoireVisual;
  let frame = 0;
  let lastTime = null;
  let accumulator = 0;
  let elapsed = 0;
  let ready = false;

  function paint(time) {
    season.paint(time, scene.dataset.paletteSide, { reduced: reduced.matches });
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    context.clearRect(0, 0, width, height);
    grimoire?.paint(context, ember.naturalWidth ? ember : null, time, reduced.matches, compact.matches);
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
      season.size(lightweight ? 352 : 512,lightweight ? 198 : 288);
    }
    sync();
  }

  const ember = new Image();
  ember.src = 'media/throne/ember.webp';
  Promise.all([ember.decode().catch(()=>{}), season.ready, grimoire?.ready]).then(() => {
    ready = true;
    sync();
  });

  document.addEventListener('bobrs-visibility-sync', sync);
  compact.addEventListener('change', resizeBuffer);
  reduced.addEventListener('change', resizeBuffer);
  resizeBuffer();
})();
