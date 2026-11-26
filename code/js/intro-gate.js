(() => {
  const stage = document.getElementById('intro-stage');
  const forecourt = document.getElementById('intro-forecourt');
  const world = document.getElementById('intro-world');
  const gate = document.getElementById('intro-gate');
  const arena = document.querySelector('.arena');
  if (!stage || !forecourt || !world || !gate || !arena) return;

  arena.inert = true;
  let watchdog = 0;
  let keyboard = false;

  function register() {
    const hall = arena.getBoundingClientRect();
    const court = forecourt.getBoundingClientRect();
    const width = world.clientWidth;
    const height = world.clientHeight;
    if (!width || !height || !hall.width || !hall.height) return;

    stage.style.setProperty('--hall-left', hall.left + 'px');
    stage.style.setProperty('--hall-top', hall.top + 'px');
    stage.style.setProperty('--hall-width', hall.width + 'px');
    stage.style.setProperty('--hall-height', hall.height + 'px');
    stage.style.setProperty('--start-view',
      `translate(${court.left + world.offsetLeft - hall.left}px, ${court.top + world.offsetTop - hall.top}px) scale(${width / hall.width}, ${height / hall.height})`);
    stage.style.setProperty('--intro-perspective', width * .88 + 'px');
    const zoom = 1.10 * Math.max(court.width / (width * .29), court.height / (height * .42));
    stage.style.setProperty('--intro-zoom', zoom);
    stage.style.setProperty('--intro-zoom-mid', 1 + (zoom - 1) * .62);
  }

  const observer = new ResizeObserver(register);
  observer.observe(stage);
  observer.observe(world);
  observer.observe(arena);
  register();

  function finish() {
    if (!stage.isConnected) return;
    clearTimeout(watchdog);
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    stage.dispatchEvent(new Event('intro:complete'));
    stage.remove();
    arena.inert = false;
    if (keyboard) document.getElementById('book')?.focus({ preventScroll: true });
  }

  function visibilityChanged() {
    if (document.hidden && stage.classList.contains('open')) finish();
  }

  stage.addEventListener('animationend', event => {
    if (event.target === stage) finish();
  });
  document.addEventListener('visibilitychange', visibilityChanged);
  gate.addEventListener('click', event => {
    keyboard = event.detail === 0;
    gate.disabled = true;
    register();
    stage.classList.add('open');
    stage.dispatchEvent(new Event('intro:open'));
    const duration = parseFloat(getComputedStyle(stage).getPropertyValue('--intro-entry-time'));
    watchdog = setTimeout(finish, duration + 350);
  }, { once: true });
})();
