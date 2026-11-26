(() => {
  const byId = id => document.getElementById(id);
  const body = document.body;
  const arena = document.querySelector('main.arena');
  const active = (id, className = 'active') => byId(id)?.classList.contains(className);
  let previous = '';

  function sync() {
    const hidden = document.hidden;
    const covered = !!byId('intro-stage') || arena.inert || active('movieFinal') ||
      active('dlPhase') || active('hall92') || active('chronosEvent', 'visible') ||
      active('c91oOverlay', 'show') || active('finish', 'visible');
    const pauseArena = covered || hidden;
    // Compare lives inside the arena. Its card animations must continue.
    const pauseAtmosphere = pauseArena || active('compare', 'visible');
    const pauseFinish = hidden || !active('finish', 'visible') || active('dlPhase') || active('movieFinal');

    body.classList.toggle('bobrs-pause-arena', pauseArena);
    body.classList.toggle('bobrs-pause-atmosphere', pauseAtmosphere);
    body.classList.toggle('bobrs-pause-finish', pauseFinish);
    byId('dlPhase').classList.toggle('bobrs-fx-active', !!byId('dlFx')?.querySelector('iframe'));

    const key = String(pauseArena) + String(pauseAtmosphere) + String(hidden);
    if (key !== previous) {
      previous = key;
      document.dispatchEvent(new Event('bobrs-visibility-sync'));
    }
  }

  const observer = new MutationObserver(sync);
  for (const id of ['intro-stage', 'movieFinal', 'dlPhase', 'hall92', 'chronosEvent',
    'c91oOverlay', 'finish', 'dlFx', 'compare']) {
    const element = byId(id);
    if (element) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['class', 'inert'],
        childList: id === 'dlFx',
      });
    }
  }
  observer.observe(arena, { attributes: true, attributeFilter: ['inert'] });
  observer.observe(body, { childList: true });
  document.addEventListener('visibilitychange', sync);
  sync();
})();
