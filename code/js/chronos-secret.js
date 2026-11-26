(() => {
  'use strict';
  const overlay = document.getElementById('c91oOverlay');
  const figure = document.getElementById('c91oChronos');
  const echoText = document.getElementById('c91oText');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const redBack = 'media/images/draft-card-back.png';
  let running = false;

  function wait(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, ms);
      function abort() {
        clearTimeout(timer);
        reject(signal.reason);
      }
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  function prepare(container, lines) {
    container.replaceChildren();
    return lines.map(line => {
      const paragraph = document.createElement('p');
      const words = line.split(' ').map((word, index) => {
        if (index) paragraph.append(' ');
        const element = document.createElement('span');
        element.className = 'chronos-word';
        element.textContent = word;
        element.setAttribute('aria-hidden', 'true');
        paragraph.append(element);
        return element;
      });
      container.append(paragraph);
      return words;
    });
  }

  async function speak(words, pauseFor, signal) {
    for (const [index, word] of words.entries()) {
      if (signal?.aborted) throw signal.reason;
      word.classList.add('spoken');
      word.removeAttribute('aria-hidden');
      await wait(pauseFor(index), signal);
    }
  }

  function makeBack(path, className) {
    const image = new Image();
    image.src = path;
    image.alt = '';
    image.className = className;
    return image;
  }

  function rewindCard(slot) {
    if (!slot || reduced.matches) return;
    const rect = slot.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const layer = document.createElement('div');
    layer.className = 'chronos-return-echo';
    layer.setAttribute('aria-hidden', 'true');
    const width = Math.min(124, innerWidth * .20, innerHeight * .19);
    layer.style.setProperty('--echo-width', width + 'px');
    const image = makeBack(redBack, '');
    layer.append(image);
    document.body.append(layer);
    const vx = pos => pos / innerWidth * 100;
    const vy = pos => pos / innerHeight * 100;
    const fromX = vx(rect.left + rect.width / 2 - width / 2);
    const fromY = vy(rect.top + rect.height / 2 - width * 2 / 3);
    const toX = 50 - vx(width / 2);
    const toY = 50 - vy(width * 2 / 3);
    const pose = (x, y, tilt, scale) =>
      `translate3d(${x}vw, ${y}vh, 0) perspective(660px) rotateY(${tilt}deg) scale(${scale})`;
    image.animate([
      { transform: pose(fromX, fromY, 16, .48), opacity: 0, offset: 0 },
      { transform: pose(fromX, fromY - 2, 17, .62), opacity: .83, offset: .18 },
      { transform: pose(fromX * .49 + toX * .51, toY - 13, -9, .95), opacity: .89, offset: .63 },
      { transform: pose(toX, toY, 0, .32), opacity: 0, offset: 1 },
    ], { delay: 1900, duration: 2350, fill: 'both', easing: 'cubic-bezier(.32,.07,.25,1)' });
    return layer;
  }

  function sendToDeck(card, grid) {
    if (reduced.matches) return;
    const origin = card.getBoundingClientRect();
    const destination = grid.getBoundingClientRect();
    const dx = destination.left + destination.width / 2 - origin.left - origin.width / 2;
    const dy = destination.top + destination.height / 2 - origin.top - origin.height / 2;
    const tile = grid.querySelector('.tile')?.getBoundingClientRect();
    const scale = Math.min(.62, Math.max(.24, (tile?.width ?? 66) / origin.width));
    card.animate([
      { transform: 'none', opacity: 1, offset: 0 },
      { transform: `translate3d(${dx * .42 + 13}px,${dy * .42 - 44}px,0) rotateX(18deg) rotate(-4deg) scale(.84)`, opacity: 1, offset: .44 },
      { transform: `translate3d(${dx}px,${dy}px,0) rotateX(31deg) rotate(5deg) scale(${scale})`, opacity: .17, offset: .92 },
      { transform: `translate3d(${dx}px,${dy}px,0) rotateX(31deg) rotate(5deg) scale(${scale})`, opacity: 0, offset: 1 },
    ], { duration: 820, easing: 'cubic-bezier(.25,.51,.25,1)', fill: 'both' });
  }

  async function seal(sealedBack, grid, release, signal) {
    const stage = document.createElement('div');
    stage.className = 'chronos-seal-reveal';
    stage.setAttribute('aria-hidden', 'true');
    for (const className of ['seal-wave', 'seal-shard a', 'seal-shard b', 'seal-shard c']) {
      const effect = document.createElement('div');
      effect.className = className;
      stage.append(effect);
    }
    const card = document.createElement('div');
    card.className = 'seal-card';
    const cracks = document.createElement('span');
    cracks.className = 'seal-cracks';
    card.append(makeBack(redBack, 'seal-card-art'), makeBack(sealedBack, 'seal-card-art sealed'), cracks);
    stage.append(card);
    document.body.append(stage);
    try {
      // Commit the initial styles once, even if the tab is hidden and rAF is suspended.
      void stage.offsetWidth;
      stage.classList.add('seal-show');
      await wait(850, signal);
      stage.classList.add('seal-trigger');
      await wait(1650, signal);
      sendToDeck(card, grid);
      release();
      stage.classList.add('seal-returning', 'seal-leave');
      await wait(850, signal);
    } finally {
      stage.remove();
    }
  }

  async function runSecond(signal) {
    if (running) return;
    running = true;
    try {
      const [words] = prepare(echoText, ['Забавно наблюдать, как смертные пытаются управлять судьбой, не подозревая, что их собственная уже предрешена. Продолжайте…']);
      words.at(-1).classList.add('chronos-last-word');
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('show');
      await wait(220, signal);
      overlay.classList.add('chronos-dim');
      await wait(2400, signal);
      figure.classList.add('show');
      await wait(1700, signal);
      overlay.classList.add('chronos-speaking');
      await speak(words, index => index === words.length - 1 ? 3000 :
        index === words.length - 2 ? 2000 : 340, signal);
      await wait(1200, signal);
      overlay.classList.remove('chronos-dim', 'chronos-speaking');
      overlay.classList.add('chronos-leave');
      figure.classList.remove('show');
      await wait(1500, signal);
    } finally {
      overlay.classList.remove('show', 'chronos-dim', 'chronos-speaking', 'chronos-leave');
      overlay.setAttribute('aria-hidden', 'true');
      figure.classList.remove('show');
      echoText.replaceChildren();
      running = false;
    }
  }

  window.chronosCinema = { wait, prepare, speak, rewindCard, seal };
  window.playChronosSecret91 = runSecond;
})();
