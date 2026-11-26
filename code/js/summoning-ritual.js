const summoningRitual = (() => {
  const media = 'media/summoning/';
  const filenames = {
    flame: 'flame-atlas.webp', haze: 'ember-haze.webp',
    light: 'stone-light.webp', rays: 'vault-rays.webp', wave: 'resonance.webp',
    book: 'book-light.webp', left: 'left-light.webp', right: 'right-light.webp',
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

  function getPaths(scene, grid) {
    const frame = scene.getBoundingClientRect();
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
        variation: noise(index + 1), depth: index < 5 ? .85 : 1,
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

    function flame(x, y, size, angle, frame, alpha) {
      const image = textures.get('flame');
      if (!image || alpha <= 0) return;
      const w = image.width / 4;
      const h = image.height / 3;
      const height = size * h / w;
      context.save();
      context.globalAlpha = clamp(alpha);
      context.translate(x, y);
      context.rotate(angle);
      context.drawImage(image, frame % 4 * w, Math.floor(frame / 4) * h, w, h,
        -size * .5, -height * .66, size, height);
      context.restore();
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

    function fire(path, index, time) {
      const age = time - firstEmission - index * spacing;
      if (age <= 0) return;
      const falloff = 1 - smooth((time - impact + 30) / 570);
      if (!falloff) return;
      const launch = smooth(age / 140);
      const flightAmount = clamp(age / flight);
      const settled = age > flight;
      const body = point(path, age);
      const next = point(path, age + 20);
      const lift = smooth((age - flight) / 360);
      const charge = smooth((time - 4100) / (impact - 4100));
      const float = settled ? Math.sin((age - flight) / 220 + path.variation * 6) * lift : 0;
      const x = body.x + float * 2.5;
      const y = body.y + float * 4.5;
      const tilt = Math.atan2(next.x - body.x, Math.max(0.02, body.y - next.y)) * .57;
      const angle = settled ? float * .12 : tilt * (1 - smooth((age - flight + 420) / 420));
      const pulse = 1 + Math.sin(age / 113 + index) * .08 + Math.sin(age / 71) * .045;
      const size = (24 + path.variation * 7) * path.depth * pulse *
        (.82 + .18 * smooth(age / 280) + charge * .22);
      const frame = Math.floor(age / (62 + path.variation * 23) + index * 3) % 12;

      if (!settled || age < flight + 330) {
        const motion = Math.sin(Math.PI * flightAmount) * .56 + .18;
        for (let i = compact ? 3 : 5; i >= 1; i--) {
          const lag = i * 40;
          if (age <= lag) continue;
          const tail = point(path, age - lag);
          plate('haze', tail.x - 16 - i * 2, tail.y - 10,
            31 + i * 4, 28 + i * 3, motion * falloff * (1 - i / 6) * .7);
          if (i < 4) flame(tail.x, tail.y, size * (1 - i * .18), angle + i * .10,
            (frame + 12 - i) % 12, motion * falloff * (1 - i / 4) * .55);
        }
      }

      const sparkCount = compact ? 3 : 5;
      for (let i = 0; i < sparkCount; i++) {
        spark(path, age, i, settled, launch * falloff * (.6 + charge * .22));
      }

      flame(x, y, size, angle, frame, launch * falloff);
      // Smaller live filament inside the moving silhouette.
      flame(x + 1, y + 3, size * .50, angle * .8, (frame + 7) % 12,
        launch * falloff * (.36 + charge * .24));
    }

    return (time, paths, reduced) => {
      context.clearRect(0, 0, sceneWidth, sceneHeight);
      if (reduced) {
        plate('light', 0, 0, sceneWidth, sceneHeight, Math.sin(Math.PI * clamp(time / 720)) * .12);
        return;
      }
      const sinceImpact = time - impact;
      const charge = smooth((time - 4060) / (impact - 4060));
      const approach = smooth(time / 530) * (1 - smooth((time - 970) / 620));
      const flash = sinceImpact < 0 ? 0 : Math.exp(-sinceImpact / 165);
      const residual = sinceImpact < 0 ? 1 : 1 - smooth(sinceImpact / 1470);
      const surface = (.31 * approach + .32 * charge * residual + .46 * flash);
      // The moving light pass is painted from the castle's own stone and metal texture.
      plate('light', 0, 0, sceneWidth, sceneHeight, surface);
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
      plate('book', 335, 351, 290, 189, approach * .54 + flash * .29);
      plate('left', 146, 200, 288, 258, Math.min(.52, leftLight) + flash * .22);
      plate('right', 526, 200, 288, 258, Math.min(.52, rightLight) + flash * .22);

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

      paths.forEach((path, index) => fire(path, index, time));

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

  async function play({ scene, grid, layer, signal, onCharge, onReveal }) {
    await loaded;
    if (signal.aborted || document.hidden || !textures.has('flame')) return;

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

    let paths = getPaths(scene, grid);
    const observer = new ResizeObserver(() => { paths = getPaths(scene, grid); });
    observer.observe(scene);
    observer.observe(grid);
    const paint = painter(context, compact);

    await new Promise(resolve => {
      let frame = 0;
      let lastPaint = null;
      let charged = false;
      let revealed = false;
      let started = null;
      const interval = 1000 / (compact ? 24 : 30);
      const watchdog = setTimeout(finish, duration + 1400);
      signal.addEventListener('abort', finish, { once: true });
      document.addEventListener('visibilitychange', visibilityChanged);
      reduced.addEventListener('change', motionChanged);

      function finish() {
        cancelAnimationFrame(frame);
        clearTimeout(watchdog);
        observer.disconnect();
        signal.removeEventListener('abort', finish);
        document.removeEventListener('visibilitychange', visibilityChanged);
        reduced.removeEventListener('change', motionChanged);
        canvas.remove();
        resolve();
      }

      function visibilityChanged() {
        if (document.hidden) finish();
      }

      function motionChanged(event) {
        if (event.matches) finish();
      }

      function draw(now) {
        started ??= now;
        const time = now - started;
        const still = reduced.matches;
        if (time >= (still ? 720 : duration)) {
          finish();
          return;
        }
        try {
          if (!charged && !still && time >= firstEmission + 9 * spacing + flight) {
            charged = true;
            onCharge();
          }
          if (!revealed && time >= (still ? 90 : reveal)) {
            revealed = true;
            onReveal();
          }
          const gap = lastPaint === null ? interval : now - lastPaint;
          if (gap >= interval - .4) {
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
