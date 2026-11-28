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
  let focus = 0;
  let hovering = false;
  gate.addEventListener('pointerenter', () => { hovering = true; });
  gate.addEventListener('pointerleave', () => { hovering = false; });
  gate.addEventListener('focus', () => { hovering = true; });
  gate.addEventListener('blur', () => { hovering = false; });
  function fit() {
    season.size(compact.matches ? 224 : 320,compact.matches ? 126 : 180);
  }

  function render(now) {
    frame = 0;
    if (motion.matches || document.hidden || !stage.isConnected) return;
    frame = requestAnimationFrame(render);
    const interval = compact.matches ? 58 : 48;
    if (now - last < interval) return;
    last = now;

    focus += ((hovering ? 1 : 0)-focus)*.14;
    const proximity = cameraPosition();
    season.paint(now / 1000, '', {
      proximity, charge: focus, convergence: focus*.26 + proximity*.14,
    });
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
