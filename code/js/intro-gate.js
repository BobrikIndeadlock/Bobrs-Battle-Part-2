(() => {
  const stage = document.getElementById('intro-stage');
  const forecourt = document.getElementById('intro-forecourt');
  const world = document.getElementById('intro-world');
  const doors = world?.querySelector('.intro-doors');
  const interior = document.getElementById('intro-interior');
  const gate = document.getElementById('intro-gate');
  const arena = document.querySelector('.arena');
  if (!stage || !forecourt || !world || !doors || !interior || !gate || !arena) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sampleCount = 90;
  let geometry;
  let approach;
  let doorProjection;
  let interiorApproach;
  let watchdog = 0;
  let keyboard = false;
  arena.inert = true;

  function distanceAt(fraction) {
    // Integrate one walking speed curve: a gentle start, a steady stride and a gentle settle.
    const start = .18;
    const end = .22;
    const total = 1 - (start + end) / 2;
    const ramp = (time, length) => (time - length / Math.PI * Math.sin(Math.PI * time / length)) / 2;
    if (fraction < start) return ramp(fraction, start) / total;
    if (fraction > 1 - end) return 1 - ramp(1 - fraction, end) / total;
    return (fraction - start / 2) / total;
  }

  function cameraPosition() {
    return distanceAt(approach?.effect.getComputedTiming().progress ?? 0);
  }

  function cameraFrames(plane) {
    const { hall, width, height, x, y, perspective } = geometry;
    const startCenterX = x + width / 2 - hall.left - hall.width / 2;
    const startCenterY = y + height / 2 - hall.top - hall.height / 2;

    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const offset = index / sampleCount;
      const distance = distanceAt(offset);
      // Project the flat forecourt and the hinged leaves from the same eye position.
      // Keeping the forecourt flat avoids rerasterizing it inside the door's 3D context.
      const depth = perspective * (1 - .935 * distance);
      if (plane === world) return { offset, transform: `scale(${perspective / depth})` };
      if (plane === doors) return { offset, perspective: `${depth}px` };

      // The painted interior is the distant plane. Its motion converges on the
      // exact rectangle of the game arena as the nearer arch passes out of view.
      const remaining = (1 - distance) ** 2;
      const perspectiveDepth = 1 + .19 * remaining;
      const scaleX = (1 + (width / hall.width - 1) * remaining) / perspectiveDepth;
      const scaleY = (1 + (height / hall.height - 1) * remaining) / perspectiveDepth;
      const left = startCenterX * remaining + hall.width * (1 - scaleX) / 2;
      const top = startCenterY * remaining + hall.height * (1 - scaleY) / 2;
      return { offset, transform: `translate(${left}px, ${top}px) scale(${scaleX}, ${scaleY})` };
    });
  }

  function register() {
    const hall = arena.getBoundingClientRect();
    const court = forecourt.getBoundingClientRect();
    const width = world.clientWidth;
    const height = world.clientHeight;
    if (!width || !height || !hall.width || !hall.height) return;

    const x = court.left + world.offsetLeft;
    const y = court.top + world.offsetTop;
    const perspective = width * .88;
    geometry = { hall, width, height, x, y, perspective };
    stage.style.setProperty('--hall-left', hall.left + 'px');
    stage.style.setProperty('--hall-top', hall.top + 'px');
    stage.style.setProperty('--hall-width', hall.width + 'px');
    stage.style.setProperty('--hall-height', hall.height + 'px');
    stage.style.setProperty('--start-view',
      `translate(${x - hall.left}px, ${y - hall.top}px) scale(${width / hall.width}, ${height / hall.height})`);
    stage.style.setProperty('--intro-perspective', perspective + 'px');

    // Changing orientation updates the projection without restarting its clock.
    approach?.effect.setKeyframes(cameraFrames(world));
    doorProjection?.effect.setKeyframes(cameraFrames(doors));
    interiorApproach?.effect.setKeyframes(cameraFrames(interior));
  }

  const observer = new ResizeObserver(register);
  observer.observe(stage);
  observer.observe(world);
  observer.observe(arena);
  register();

  function stopCamera() {
    approach?.cancel();
    doorProjection?.cancel();
    interiorApproach?.cancel();
    approach = null;
    doorProjection = null;
    interiorApproach = null;
  }

  function finish() {
    if (!stage.isConnected) return;
    clearTimeout(watchdog);
    observer.disconnect();
    stopCamera();
    reduced.removeEventListener('change', motionChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
    stage.dispatchEvent(new Event('intro:complete'));
    stage.remove();
    arena.inert = false;
    if (keyboard) document.getElementById('book')?.focus({ preventScroll: true });
  }

  function visibilityChanged() {
    if (document.hidden && stage.classList.contains('open')) finish();
  }

  function motionChanged(event) {
    if (event.matches) stopCamera();
  }

  stage.addEventListener('animationend', event => {
    if (event.target === stage) finish();
  });
  reduced.addEventListener('change', motionChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  gate.addEventListener('click', event => {
    keyboard = event.detail === 0;
    gate.disabled = true;
    register();
    stage.classList.add('open');
    const duration = parseFloat(getComputedStyle(stage).getPropertyValue('--intro-entry-time'));
    if (!reduced.matches && geometry && typeof world.animate === 'function') {
      const options = { duration, easing: 'linear', fill: 'both' };
      approach = world.animate(cameraFrames(world), options);
      doorProjection = doors.animate(cameraFrames(doors), options);
      interiorApproach = interior.animate(cameraFrames(interior), options);
    }
    stage.dispatchEvent(new CustomEvent('intro:open', { detail: { cameraPosition } }));
    watchdog = setTimeout(finish, duration + 350);
  }, { once: true });
})();
