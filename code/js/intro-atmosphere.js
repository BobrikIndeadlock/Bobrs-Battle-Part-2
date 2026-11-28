(() => {
  const stage = document.getElementById('intro-stage');
  const world = document.getElementById('intro-world');
  const gate = document.getElementById('intro-gate');
  if (!stage || !world || !gate) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'intro-life82';
  canvas.setAttribute('aria-hidden', 'true');
  world.insertBefore(canvas, gate);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const season = window.createSeasonAtmosphere(canvas,'gate');

  let frame = 0;
  let last = 0;
  let cameraPosition = () => 0;
  function fit() {
    season.size(compact.matches ? 352 : 512,compact.matches ? 198 : 288);
  }

  function render(now) {
    frame = 0;
    if (motion.matches || document.hidden || !stage.isConnected) return;
    frame = requestAnimationFrame(render);
    const interval = compact.matches ? 48 : 39;
    if (now - last < interval) return;
    last = now;

    season.paint(now / 1000, '', { proximity: cameraPosition() });
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function sync() {
    if (motion.matches || document.hidden || !stage.isConnected) {
      stop();
      if(motion.matches)canvas.hidden = true;
    }
    else if (!frame) frame = requestAnimationFrame(render);
  }

  stage.addEventListener('intro:open', event => {
    cameraPosition = event.detail.cameraPosition;
  }, { once: true });
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
