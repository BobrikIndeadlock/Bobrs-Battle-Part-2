(() => {
  const phase = document.getElementById('dlPhase');
  const effect = document.getElementById('dlFx');
  const chamber = document.getElementById('dlCathedral');
  const canvas = chamber.querySelector('canvas');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 850px), (max-height: 500px)');
  const season = window.createSeasonAtmosphere(canvas,'cathedral');
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
    season.paint(time,draft.dataset.paletteSide,{ reduced: reduced.matches });
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
        season.size(1,1);
        canvas.hidden = true;
        started = false;
      }
      return;
    }
    if (!started) {
      const small = compact.matches || reduced.matches;
      season.size(small ? 352 : 512,small ? 198 : 288);
      paint(elapsed / 1000);
      started = true;
    }
    if (reduced.matches) {
      canvas.hidden = true;
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
