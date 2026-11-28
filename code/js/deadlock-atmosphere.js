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
  let previousImpact = null;
  let progress = 0;
  let preview = false;
  let loaded = false;
  season.ready.then(() => {
    loaded = true;
    sync();
  });

  function paint(time) {
    season.paint(time,draft.dataset.paletteSide,{
      reduced: reduced.matches,
      charge: Math.min(1,progress + (preview ? .28 : 0)),
      convergence: Math.max(0,(progress-.70)*.85),
    });
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
    if (!last || now - last >= (compact.matches ? 61 : 52)) {
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
      season.size(small ? 240 : 352,small ? 135 : 198);
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
  const observer = new MutationObserver(() => {
    const impact = effect.classList.contains('draft-impact') ? effect.firstElementChild : null;
    if (impact && impact !== previousImpact) {
      season.receive(Number(effect.dataset.paletteSide),effect.classList.contains('is-ban') ? 'ban' : 'pick');
    }
    previousImpact = impact;
    sync();
  });
  observer.observe(phase, { attributes: true, attributeFilter: ['class'] });
  observer.observe(effect, { attributes: true, attributeFilter: ['class'], childList:true });
  const order = document.getElementById('dlStep');
  const confirm = document.getElementById('dlConfirm');
  function updateCharge() {
    const current = order.textContent.match(/(\d+) \/ 18/);
    progress = current ? (Number(current[1])-1)/17 : 0;
    preview = !confirm.disabled;
    draft.classList.toggle('last-draft-turn',progress===1);
    draft.classList.toggle('hero-in-focus',preview);
  }
  const chargeObserver = new MutationObserver(updateCharge);
  chargeObserver.observe(order,{childList:true});
  chargeObserver.observe(confirm,{attributes:true,attributeFilter:['disabled']});
  document.addEventListener('visibilitychange', sync);
  compact.addEventListener('change', resize);
  reduced.addEventListener('change', resize);
  resize();
})();
