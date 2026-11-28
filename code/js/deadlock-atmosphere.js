(() => {
  const phase = document.getElementById('dlPhase');
  const effect = document.getElementById('dlFx');
  const chamber = document.getElementById('dlCathedral');
  const canvas = chamber.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const season = window.createSeasonAtmosphere(context);
  const draft = document.getElementById('dlDraftScreen');
  let frame = 0;
  let last = 0;
  let previous = 0;
  let elapsed = 0;
  let started = false;
  let loaded = false;
  season.ready.then(() => {
    loaded = true;
    sync();
  });

  function paint(time) {
    context.setTransform(canvas.width / 1000, 0, 0, canvas.height / 563, 0, 0);
    context.clearRect(0, 0, 1000, 563);
    season.paint('cathedral', time, draft.dataset.paletteSide, { reduced: reduced.matches, compact: compact.matches });
  }

  function active() {
    return phase.classList.contains('active') && phase.classList.contains('draft-active');
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
      if (!visible && canvas.width !== 1) {
        canvas.width = 1;
        canvas.height = 1;
        started = false;
      }
      return;
    }
    if (!started) {
      const small = compact.matches || reduced.matches;
      canvas.width = small ? 600 : 960;
      canvas.height = small ? 338 : 540;
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
