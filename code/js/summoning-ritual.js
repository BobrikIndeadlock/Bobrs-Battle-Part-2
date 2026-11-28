const summoningRitual = (() => {
  const media = 'media/summoning/';
  const filenames = {
    haze: 'ember-haze.webp',
    rays: 'vault-rays.webp', wave: 'resonance.webp',
    left: '../season/emerald-mist.webp', right: '../season/storm-mist.webp',
    ember: '../throne/ember.webp',
  };
  const textures = new Map();
  const loaded = Promise.all(Object.entries(filenames).map(async ([key, filename]) => {
    const image = new Image();
    image.src = media + filename;
    try {
      await image.decode();
      textures.set(key, image);
    } catch (error) {
      console.warn('Summoning texture unavailable:', filename, error);
    }
  }));

  const sceneWidth = 960;
  const sceneHeight = 540;
  const firstEmission = 240;
  const spacing = 185;
  const flight = 2320;
  const impact = 5300;
  const fadeStart = impact - 20;
  const fadeDuration = 430;
  const reveal = impact + 110;
  const duration = 6800;
  const clamp = value => Math.min(1, Math.max(0, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const noise = seed => ((Math.sin(seed * 175.41) * 43758.5453) % 1 + 1) % 1;

  function point(path, age) {
    const t = smooth(age / flight);
    const u = 1 - t;
    return {
      x: u ** 3 * path.x0 + 3 * u * u * t * path.x1 + 3 * u * t * t * path.x2 + t ** 3 * path.x3,
      y: u ** 3 * path.y0 + 3 * u * u * t * path.y1 + 3 * u * t * t * path.y2 + t ** 3 * path.y3,
    };
  }

  function getPaths(frame, grid) {
    if (!frame.width || !frame.height) return [];
    return Array.from(grid.children, (card, index) => {
      const rect = card.getBoundingClientRect();
      const endX = (rect.left + rect.width / 2 - frame.left) * sceneWidth / frame.width;
      const endY = (rect.top + rect.height / 2 - frame.top) * sceneHeight / frame.height;
      const spread = index % 5 - 2;
      return {
        x0: 480 + spread * 2.3, y0: 469,
        x1: 480 + spread * (index < 5 ? 26 : 19), y1: 379 + index % 3 * 7,
        x2: endX + spread * 19, y2: endY - (index < 5 ? 42 : 27),
        x3: endX, y3: endY,
        variation: noise(index + 1),
      };
    });
  }

  function painter(context, compact) {
    function plate(name, x, y, w, h, alpha) {
      const image = textures.get(name);
      if (!image || alpha <= 0) return;
      context.globalAlpha = clamp(alpha);
      context.drawImage(image, x, y, w, h);
    }

    function spark(path, age, index, burst, strength) {
      const progress = (age + index * 93) % 465 / 465;
      const emitted = point(path, Math.min(age, flight) - progress * 335);
      const side = index % 2 ? 1 : -1;
      const x = (burst ? path.x3 : emitted.x) + side * progress * (8 + index * 2.5);
      const y = (burst ? path.y3 : emitted.y) + progress * (8 + index * 1.4) -
        progress * progress * 13;
      const size = (1.5 + index % 3 * .40) * (1 - progress * .45);
      plate('ember', x, y, size, size * 1.45, (1 - progress) ** 1.7 * strength);
    }

    function trail(path, index, time) {
      const age = time - firstEmission - index * spacing;
      if (age <= 0 || age >= flight + 310) return;
      const travel = clamp(age / flight);
      const strength = Math.sin(Math.PI * travel) * .37 + .10;
      const dissolve = 1 - smooth((age - flight + 50) / 360);
      for (let i = compact ? 3 : 5; i >= 1; i--) {
        const lag = i * 47;
        if (age <= lag) continue;
        const tail = point(path, age - lag);
        plate('haze', tail.x - 12 - i, tail.y - 8, 24 + i * 3.2, 18 + i * 2.8,
          strength * dissolve * (1 - i / 6) * smooth(age / 330));
      }
    }

    return (time, paths, reduced) => {
      context.clearRect(0, 0, sceneWidth, sceneHeight);
      if (reduced) {
        const light = Math.sin(Math.PI * clamp(time / 720)) * .14;
        context.globalCompositeOperation = 'screen';
        plate('left', 0, 170, 445, 370, light);
        plate('right', 515, 170, 445, 370, light);
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
        return;
      }
      const sinceImpact = time - impact;
      const charge = smooth((time - 4060) / (impact - 4060));
      const approach = smooth(time / 530) * (1 - smooth((time - 970) / 620));
      const flash = sinceImpact < 0 ? 0 : Math.exp(-sinceImpact / 165);
      const residual = sinceImpact < 0 ? 1 : 1 - smooth(sinceImpact / 1470);
      const surface = (.31 * approach + .32 * charge * residual + .46 * flash);
      let leftLight = 0;
      let rightLight = 0;
      paths.forEach((path, index) => {
        const age = time - firstEmission - index * spacing;
        if (age < 0 || age > flight) return;
        const flamePosition = point(path, age);
        const proximity = (1 - smooth(Math.abs(flamePosition.y - 321) / 165)) * .16;
        leftLight += proximity * (1 - smooth(Math.abs(flamePosition.x - 277) / 185));
        rightLight += proximity * (1 - smooth(Math.abs(flamePosition.x - 681) / 185));
      });
      context.globalCompositeOperation = 'screen';
      plate('left', 9, 198, 438, 308, Math.min(.44, leftLight) + surface * .59);
      plate('right', 515, 198, 438, 308, Math.min(.44, rightLight) + surface * .63);
      context.globalCompositeOperation = 'source-over';

      if (sinceImpact >= 0) {
        const rayAlpha = smooth(sinceImpact / 44) *
          Math.exp(-Math.max(0, sinceImpact - 115) / 190) *
          (1 - smooth((sinceImpact - 440) / 300));
        plate('rays', 0, 0, sceneWidth, sceneHeight, rayAlpha * .94);
        const spread = 160 + smooth(sinceImpact / 1030) * 582;
        plate('wave', 480 - spread / 2, 292 - spread * .19,
          spread, spread * .39, .83 * (1 - smooth(sinceImpact / 1120)));
      } else if (charge) {
        plate('rays', 0, 0, sceneWidth, sceneHeight, charge * .11);
      }

      paths.forEach((path, index) => trail(path, index, time));

      if (sinceImpact >= 200 && residual > 0) {
        paths.forEach((path, index) => {
          const offset = Math.min(time - reveal, 650);
          plate('haze', path.x3 - 27 + Math.sin(index) * offset / 37,
            path.y3 - 20 - offset / 25, 55, 37, .23 * residual);
          for (let i = 0; i < (compact ? 2 : 4); i++) {
            spark(path, sinceImpact + index * 8, i, true, residual * .45);
          }
        });
      }
      context.globalAlpha = 1;
    };
  }

  function mountOrbs(layer, cards) {
    return Array.from(cards, (_, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'summoning-flight';
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.style.setProperty('--flight-delay', (firstEmission + index * spacing) + 'ms');
      const orb = document.createElement('div');
      orb.className = 'orb bobrs-summon-orb';
      orb.dataset.orbNumber = String(index + 1);
      orb.style.setProperty('--lean', (index % 5 - 2) * 6 + 'deg');
      orb.style.setProperty('--flickerDelay', -index * .13 + 's');
      for (const part of ['hell-tail', 'summon-wake', 'summon-halo']) {
        const element = document.createElement('span');
        element.className = part;
        orb.append(element);
      }
      for (let i = 0; i < 2; i++) {
        const ember = document.createElement('i');
        ember.className = 'hell-ember';
        ember.style.setProperty('--ex', (i ? 1 : -1) * (13 + i * 9) + 'px');
        ember.style.setProperty('--ey', -34 - i * 20 + 'px');
        ember.style.setProperty('--delay', -i * .17 + 's');
        ember.style.setProperty('--t', .7 + i * .15 + 's');
        ember.style.setProperty('--s', 3 + i * 2 + 'px');
        orb.append(ember);
      }
      wrapper.append(orb);
      layer.append(wrapper);
      return wrapper;
    });
  }

  function flightKeyframes(path, scale, emission, lifetime) {
    function pose(age) {
      const body = point(path, age);
      const hover = Math.max(0, age - flight);
      const sway = Math.sin(hover / 340 + path.variation * 6) * smooth(hover / 460);
      const x = (body.x + sway * 2.2) * scale.x;
      const y = (body.y + sway * (2.8 + path.variation)) * scale.y;
      const size = .15 + .85 * smooth(age / 325);
      const fade = 1 - smooth((emission + age - fadeStart) / fadeDuration);
      return {
        offset: age / lifetime,
        transform: `translate3d(${x}px, ${y}px, 0) scale(${size})`,
        opacity: smooth(age / 180) * fade,
      };
    }

    // Use closer samples for the quick fades and interpolate every pose on the browser's timeline.
    const keyframes = [pose(0)];
    let start = 0;
    for (const [end, interval] of [[325, 1000 / 60], [fadeStart - emission, 40], [lifetime, 1000 / 60]]) {
      const steps = Math.ceil((end - start) / interval);
      for (let step = 1; step <= steps; step++) {
        keyframes.push(pose(step === steps ? end : start + (end - start) * step / steps));
      }
      start = end;
    }
    return keyframes;
  }

  async function play({ scene, grid, layer, signal, onCharge, onReveal, onBookFrame }) {
    await loaded;
    if (signal.aborted || document.hidden) return;

    const compact = matchMedia('(max-width: 850px), (max-height: 500px)').matches;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.createElement('canvas');
    canvas.className = 'summoning-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = compact ? 640 : sceneWidth;
    canvas.height = compact ? 360 : sceneHeight;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    context.scale(canvas.width / sceneWidth, canvas.height / sceneHeight);
    layer.append(canvas);

    const orbs = reduced.matches ? [] : mountOrbs(layer, grid.children);
    const bookTiming = { firstEmission, spacing, count: orbs.length, reveal };
    let started = null;
    let paths = [];
    let scale;
    let flights = [];
    const measure = () => {
      const frame = scene.getBoundingClientRect();
      const nextScale = { x: frame.width / sceneWidth, y: frame.height / sceneHeight };
      const nextPaths = getPaths(frame, grid);
      if (scale?.x === nextScale.x && scale.y === nextScale.y && paths.length === nextPaths.length &&
          paths.every((path, index) => path.x3 === nextPaths[index].x3 && path.y3 === nextPaths[index].y3)) return;
      paths = nextPaths;
      scale = nextScale;
      if (!orbs.length || !paths.length) return;
      flights = paths.map((path, index) => {
        const delay = firstEmission + index * spacing;
        const lifetime = fadeStart + fadeDuration - delay;
        const keyframes = flightKeyframes(path, scale, delay, lifetime);
        const animation = flights[index];
        if (animation) {
          animation.effect.setKeyframes(keyframes);
          return animation;
        }
        const next = orbs[index].animate(keyframes, { delay, duration: lifetime, fill: 'both' });
        if (started !== null) next.startTime = started;
        return next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    observer.observe(grid);
    const paint = painter(context, compact);

    await new Promise(resolve => {
      let frame = 0;
      let lastPaint = null;
      let charged = false;
      let revealed = false;
      const interval = 1000 / (compact ? 24 : 30);
      const watchdog = setTimeout(finish, duration + 1400);
      signal.addEventListener('abort', finish, { once: true });
      document.addEventListener('visibilitychange', visibilityChanged);
      reduced.addEventListener('change', motionChanged);

      function removeOrbs() {
        flights.forEach(animation => animation.cancel());
        flights = [];
        orbs.splice(0).forEach(orb => orb.remove());
      }

      function finish() {
        cancelAnimationFrame(frame);
        clearTimeout(watchdog);
        observer.disconnect();
        signal.removeEventListener('abort', finish);
        document.removeEventListener('visibilitychange', visibilityChanged);
        reduced.removeEventListener('change', motionChanged);
        canvas.remove();
        removeOrbs();
        layer.classList.remove('summon-charged');
        resolve();
      }

      function visibilityChanged() {
        if (document.hidden) finish();
      }

      function motionChanged() {
        finish();
      }

      function draw(now) {
        if (started === null) {
          started = now;
          flights.forEach(animation => { animation.startTime = started; });
        }
        const time = now - started;
        const still = reduced.matches;
        if (time >= (still ? 720 : duration)) {
          finish();
          return;
        }
        try {
          if (!charged && !still && time >= firstEmission + 9 * spacing + flight) {
            charged = true;
            layer.classList.add('summon-charged');
            onCharge();
          }
          if (!revealed && time >= (still ? 90 : reveal)) {
            revealed = true;
            onReveal();
          }
          if (orbs.length && time >= fadeStart + fadeDuration) removeOrbs();
          const gap = lastPaint === null ? interval : now - lastPaint;
          if (gap >= interval - .4) {
            if (!still) onBookFrame?.(time, bookTiming);
            paint(time, paths, still);
            lastPaint = now - Math.max(0, gap - interval) % interval;
          }
          frame = requestAnimationFrame(draw);
        } catch (error) {
          console.warn('Summoning animation recovered:', error);
          finish();
        }
      }

      frame = requestAnimationFrame(draw);
    });
  }

  return { play };
})();
