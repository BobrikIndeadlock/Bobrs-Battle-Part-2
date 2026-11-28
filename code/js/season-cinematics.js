(() => {
  const finish = document.getElementById('finish');
  const movie = document.getElementById('movieFinal');
  const poster = document.getElementById('moviePoster');
  const deadlock = document.getElementById('dlPhase');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 850px), (max-height: 500px)');
  const canvas = document.createElement('canvas');
  canvas.className = 'season-cinema-film';
  canvas.setAttribute('aria-hidden', 'true');
  let surface;
  let ready = false;
  let target;
  let start;
  let last = 0;
  let frame = 0;
  let reacted = false;

  function shown() {
    if (document.hidden || motion.matches || deadlock.classList.contains('active')) return null;
    if (movie.classList.contains('active')) return movie.classList.contains('poster') ? poster : null;
    return finish.classList.contains('visible') ? finish : null;
  }

  function tick(now) {
    frame = 0;
    if (!target || target!==shown()) return;
    start ??= now;
    if (now-last >= (small.matches ? 61 : 49)) {
      const time = (now-start)/1000;
      const entry = (1-Math.exp(-time*1.45))*Math.exp(-time*.39);
      surface.paint(time, '', { charge: 1, convergence: .28+entry*.81 });
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function fit() {
    surface?.size(small.matches ? 224 : 320, small.matches ? 126 : 180);
  }

  function sync() {
    if (!movie.classList.contains('active')) reacted = false;
    const next = shown();
    if (next!==target) {
      target = next;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      start = undefined;
      last = 0;
      if (target) target.prepend(canvas);
      else canvas.remove();
    }
    if (!target) return;
    if (!surface) {
      surface = window.createSeasonAtmosphere(canvas,'versus');
      fit();
      surface.ready.then(() => { ready = true; sync(); });
    }
    if (ready && !frame) {
      const completed = document.getElementById('scene').dataset.completedCaptain;
      if (target === poster && !reacted && (completed === '0' || completed === '1')) {
        surface.receive(Number(completed));
        reacted = true;
      }
      frame = requestAnimationFrame(tick);
    }
  }

  const observer = new MutationObserver(sync);
  for (const node of [movie,finish,deadlock]) observer.observe(node, {attributes:true,attributeFilter:['class']});
  motion.addEventListener('change',sync);
  small.addEventListener('change',fit);
  document.addEventListener('visibilitychange',sync);
  sync();
})();
