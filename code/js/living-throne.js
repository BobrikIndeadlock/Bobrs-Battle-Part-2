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
  const captains = window.createLivingCaptains(scene,compact);
  const draft = window.BobrsNewDraft;
  scene.addEventListener('captain:received-card',event => {
    season.receive(event.detail);
    captains.receive(event.detail,draft.teams()[event.detail].length === 5);
  });
  const grimoire = window.grimoireVisual;
  let frame = 0;
  let lastTime = null;
  let accumulator = 0;
  let elapsed = 0;
  let ready = false;
  let held = false;
  let lastPortrait = -Infinity;

  function pose(time, frozen = false) {
    const counts = draft.teams().map(team => team.length);
    const phase = draft.phase();
    const motion = captains.sample(time,scene.dataset.paletteSide,phase,counts,frozen);
    return {motion,phase,progress:(counts[0]+counts[1])/10};
  }

  function paint(time, {motion,phase,progress}) {
    const charge = phase==='summoning' ? .54 : progress;
    season.paint(time, scene.dataset.paletteSide, {
      reduced: reduced.matches, charge, convergence: Math.max(0,(progress-.70)*.75),
      captainMotion: motion,
    });
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    context.clearRect(0, 0, width, height);
    grimoire?.paint(context, ember.naturalWidth ? ember : null, time, reduced.matches, compact.matches);
    context.globalAlpha = 1;
  }

  function isCovered() {
    return document.hidden || !!document.getElementById('intro-stage') ||
      document.body.classList.contains('bobrs-pause-atmosphere');
  }

  function tick(now) {
    frame = 0;
    if (isCovered() || reduced.matches) return;

    const delta = lastTime === null ? 0 : Math.min(now - lastTime, 100);
    lastTime = now;
    elapsed += delta;
    accumulator += delta;
    const interval = 1000 / (compact.matches ? 20 : 24);
    const atmosphereDue = accumulator >= interval;
    const poseInterval = 1000 / (captains.budgeted() ? 24 : compact.matches ? 30 : 60);
    const portraitDue = elapsed-lastPortrait >= poseInterval-.4;
    if (atmosphereDue || portraitDue) {
      const time = elapsed/1000;
      const current = pose(time);
      if (portraitDue) {
        captains.paint(time,current.motion,false);
        lastPortrait = elapsed;
      }
      if (atmosphereDue) {
        accumulator %= interval;
        paint(time,current);
      }
    }

    frame = requestAnimationFrame(tick);
  }

  function sync() {
    const covered = isCovered();
    if (!covered) held = false;
    const useStill = covered || reduced.matches;
    if (useStill) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      accumulator = 0;
      const chronos = document.body.classList.contains('chronos-still');
      if (ready && chronos && !held && !document.hidden) {
        const time = elapsed/1000;
        const frozen = pose(time,true);
        if (!reduced.matches) captains.paint(time,frozen.motion,true);
        season.paint(time,scene.dataset.paletteSide,{
          reduced:reduced.matches,captainMotion:frozen.motion,held:true,
        });
        held = true;
      }
      if (reduced.matches) {
        captains.hide();
        if (ready && !covered) paint(0,pose(elapsed/1000));
      }
      return;
    }

    if (ready && !frame) {
      const time = elapsed/1000;
      const next = pose(time);
      captains.paint(time,next.motion,false);
      paint(time,next);
      lastPortrait = elapsed;
      frame = requestAnimationFrame(tick);
    }
  }

  function resizeBuffer() {
    const lightweight = compact.matches || reduced.matches;
    captains.size();
    const bufferWidth = lightweight ? 640 : 960;
    const bufferHeight = lightweight ? 360 : 540;
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      season.size(lightweight ? 240 : 352,lightweight ? 135 : 198);
    }
    sync();
  }

  const ember = new Image();
  ember.src = 'media/throne/ember.webp';
  Promise.all([ember.decode().catch(()=>{}), season.ready, captains.ready, grimoire?.ready]).then(() => {
    ready = true;
    sync();
  });

  document.addEventListener('bobrs-visibility-sync', sync);
  compact.addEventListener('change', resizeBuffer);
  reduced.addEventListener('change', resizeBuffer);
  resizeBuffer();
})();
