(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const overlay = $('c91oOverlay');
  const figure = $('c91oChronos');
  const dialogue = $('c91oText');
  const panel = $('chronosExchange');
  const board = $('chronosTeams');
  const confirm = $('chronosConfirm');
  const decline = $('chronosDecline');
  const inspector = $('chronosInspect');
  const zoom = $('chronosZoom');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duel = ['preset-3', 'preset-4'];
  const still = 'chronos-still';
  let exchange = null;
  let preview = [null, null];
  let entries = new Map();
  let locked = false;

  window.chronosRules = {
    recipient(teams, remaining) {
      if (remaining !== 1 || teams[0].length + teams[1].length !== 9) return null;
      const holder = teams.findIndex(team => duel.every(id => team.includes(id)));
      return holder === -1 ? null : 1 - holder;
    },
    validSwap(teams, side, pair) {
      return (side === 0 || side === 1) && Array.isArray(pair) && pair.length === 2 &&
        pair[0] !== pair[1] && teams[side].includes(pair[0]) && teams[1 - side].includes(pair[1]);
    },
  };

  function wait(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(signal.reason); return; }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, reduced.matches ? Math.min(ms, 270) : ms);
      function abort() {
        clearTimeout(timer);
        reject(signal.reason);
      }
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  async function speak(lines, signal) {
    dialogue.replaceChildren();
    overlay.classList.add('chronos-speaking');
    const words = [];
    for (const line of lines) {
      const paragraph = document.createElement('p');
      dialogue.append(paragraph);
      for (const word of line.split(' ')) {
        if (paragraph.childNodes.length) paragraph.append(' ');
        const span = document.createElement('span');
        span.textContent = word;
        span.className = 'chronos-word';
        span.setAttribute('aria-hidden', 'true');
        paragraph.append(span);
        words.push(span);
      }
    }
    for (const word of words) {
      word.classList.add('spoken');
      word.removeAttribute('aria-hidden');
      await wait(/[.!?…]$/.test(word.textContent) ? 780 : /[,;:]$/.test(word.textContent) ? 295 : 138, signal);
    }
    await wait(600, signal);
  }

  function holdWorld() {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add(still);
    $('scene').inert = true;
    overlay.focus({preventScroll: true});
  }

  async function appear(signal) {
    holdWorld();
    await wait(750, signal);
    overlay.classList.add('chronos-dim');
    await wait(1450, signal);
    figure.classList.add('show');
    await wait(1050, signal);
    await speak([
      'Когда вы стояли предо мной в прошлый раз, я оставил вам время, чтобы постичь свою ошибку.',
      'Я видел каждый ваш выбор. Вы приняли моё молчание за милость.',
      'Теперь тот, кого обошла удача, перепишет одну строку вашей судьбы. Моего решения никто не оспорит.',
    ], signal);
  }

  function text(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function portrait(card) {
    const image = new Image();
    image.src = card.image;
    image.alt = card.name;
    return image;
  }

  function inspect(card) {
    $('chronosCardName').textContent = card.name;
    $('chronosCardArt').src = card.image;
    $('chronosCardArt').alt = card.name;
    inspector.classList.remove('magnified');
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = 'Увеличить';
    inspector.querySelector('.chronos-card-scroll').scrollTo(0,0);
    if (!inspector.open) inspector.showModal();
    $('chronosInspectClose').focus();
  }

  zoom.onclick = () => {
    const magnified = inspector.classList.toggle('magnified');
    zoom.setAttribute('aria-pressed', String(magnified));
    zoom.textContent = magnified ? 'Обычный размер' : 'Увеличить';
  };
  $('chronosInspectClose').onclick = () => inspector.close();

  function refresh() {
    if (!exchange) return;
    const canAct = !locked && exchange.allowed();
    const [offer, claim] = preview.map(id => entries.get(id)?.card);
    for (const [id, { button }] of entries) {
      button.disabled = !canAct;
      button.setAttribute('aria-pressed', String(preview.includes(id)));
    }
    confirm.disabled = !canAct || !offer || !claim;
    decline.disabled = !canAct;
    $('chronosExchangePreview').textContent = offer && claim
      ? `${exchange.captains[exchange.side].shortName} получит «${claim.name}» и отдаст «${offer.name}».`
      : '';
    $('chronosExchangeHelp').textContent = canAct
      ? `${exchange.captains[exchange.side].shortName}, выберите одну карту в каждой команде.`
      : `Решение принимает ${exchange.captains[exchange.side].shortName}.`;
  }

  function openExchange(options) {
    exchange = options;
    locked = false;
    preview = [null, null];
    entries = new Map();
    holdWorld();
    overlay.classList.remove('chronos-speaking');
    dialogue.replaceChildren();
    overlay.classList.add('chronos-dim', 'chronos-bargain');
    figure.classList.add('show');
    const groups = options.teams.map((team, side) => {
      const roster = document.createElement('section');
      roster.className = 'chronos-roster';
      roster.dataset.paletteSide = side;
      roster.append(text('h3', options.captains[side].name));
      const list = document.createElement('ul');
      for (const card of team) {
        const item = document.createElement('li');
        const button = text('button', '', 'chronos-choice');
        button.type = 'button';
        button.dataset.cardId = card.id;
        const image = portrait(card);
        image.alt = '';
        button.append(image, text('span', card.name));
        button.onclick = () => {
          if (!exchange.allowed() || locked) return;
          const index = side === exchange.side ? 0 : 1;
          preview[index] = preview[index] === card.id ? null : card.id;
          refresh();
        };
        const detail = text('button', 'Смотреть', 'chronos-inspect-button');
        detail.type = 'button';
        detail.setAttribute('aria-label', 'Рассмотреть карту «' + card.name + '»');
        detail.onclick = () => inspect(card);
        item.append(button, detail);
        list.append(item);
        entries.set(card.id, {card, button});
      }
      roster.append(list);
      return roster;
    });
    board.replaceChildren(...groups);
    panel.hidden = false;
    confirm.onclick = () => {
      if (!confirm.disabled) void exchange.submit('exchange', [...preview]);
    };
    decline.onclick = () => {
      if (!decline.disabled) void exchange.submit('decline');
    };
    refresh();
    $('chronosExchangeTitle').focus({preventScroll: true});
  }

  overlay.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || inspector.open) return;
    const controls = [...panel.querySelectorAll('button:enabled')].filter(button => button.getClientRects().length);
    if (!controls.length) { event.preventDefault(); return; }
    const boundary = event.shiftKey ? controls[0] : controls.at(-1);
    if (document.activeElement === boundary || !controls.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? controls.at(-1) : controls[0]).focus();
    }
  });

  function close() {
    if (inspector.open) inspector.close();
    panel.hidden = true;
    board.replaceChildren();
    entries.clear();
    exchange = null;
    dialogue.replaceChildren();
    figure.classList.remove('show');
    overlay.classList.remove('show', 'chronos-dim', 'chronos-bargain', 'chronos-speaking', 'chronos-leave');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove(still);
    $('scene').inert = false;
  }

  function film(canvas, center, duration) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};
    const density = Math.min(devicePixelRatio || 1, 1.25);
    const size = Math.min(480, innerWidth * .88, innerHeight * .84);
    canvas.width = canvas.height = Math.round(size * density);
    canvas.style.width = canvas.style.height = size + 'px';
    canvas.style.left = center.x + 'px';
    canvas.style.top = center.y + 'px';
    const radius = canvas.width / 2;
    const start = performance.now();
    let frame;
    function draw(now) {
      const t = Math.min(1, (now - start) / duration);
      const power = Math.sin(Math.PI * t) ** 1.25;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let ring = 0; ring < 3; ring++) {
        ctx.strokeStyle = `rgba(212,177,121,${power * (.55 - ring * .13)})`;
        ctx.lineWidth = (1.2 - ring * .28) * density;
        const r = radius * (.56 + ring * .106 + t * .09);
        ctx.beginPath();
        ctx.arc(radius, radius, r, t * (ring % 2 ? 3 : -4) + ring, t * (ring % 2 ? 3 : -4) + ring + 5.5);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(219,226,239,${power * .64})`;
      ctx.lineWidth = density;
      ctx.beginPath();
      for (let i = 0; i < 53; i++) {
        const angle = i * 2.39996 + t * (i % 2 ? 5 : -5);
        const distance = radius * (.15 + .79 * ((t * .86 + i * .137) % 1));
        const x = radius + Math.cos(angle) * distance;
        const y = radius + Math.sin(angle) * distance;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sin(angle) * (i % 6 + 2), y - Math.cos(angle) * (i % 6 + 2));
      }
      ctx.stroke();
      if (t < 1) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }

  async function crossFates(ids, commit, signal) {
    if (reduced.matches || document.hidden || !Element.prototype.animate) {
      commit();
      return;
    }
    const chosen = ids.map(id => entries.get(id));
    const rects = chosen.map(({button}) => button.querySelector('img').getBoundingClientRect());
    const clamp = (coordinate, limit) => Math.max(28, Math.min(limit - 28, coordinate));
    const center = {x: innerWidth / 2, y: innerHeight * .46};
    const locations = rects.map(rect => ({
      x: clamp(rect.left + rect.width / 2, innerWidth),
      y: clamp(rect.top + rect.height / 2, innerHeight),
      scale: Math.min(1, rect.width / Math.min(150, innerWidth * .27)),
    }));
    const layer = document.createElement('div');
    layer.className = 'chronos-rift';
    layer.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    layer.append(canvas);
    overlay.append(layer);
    const duration = 1840;
    const stop = film(canvas, center, duration);
    try {
      for (const [index, {card, button}] of chosen.entries()) {
        button.classList.add('thread-lifted');
        const image = portrait(card);
        layer.append(image);
        const start = locations[index];
        const end = locations[1 - index];
        const sign = index === 0 ? -1 : 1;
        const pose = (x, y, tilt, scale) => `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotateY(${tilt}deg) scale(${scale})`;
        image.animate([
          {transform:pose(start.x,start.y,0,start.scale),opacity:1,offset:0},
          {transform:pose(center.x + sign*44,center.y,sign*28,1),opacity:1,offset:.34},
          {transform:pose(center.x,center.y + sign*20,sign*83,.78),opacity:.38,offset:.50},
          {transform:pose(center.x - sign*48,center.y,-sign*26,1),opacity:1,offset:.66},
          {transform:pose(end.x,end.y,0,end.scale),opacity:.80,offset:1},
        ], {duration, easing:'cubic-bezier(.39,.10,.32,1)',fill:'both'});
      }
      await wait(duration - 140, signal);
      commit();
      await wait(140, signal);
    } finally {
      stop();
      layer.remove();
      chosen.forEach(({button})=>button.classList.remove('thread-lifted'));
    }
  }

  async function finish(ids, update, signal) {
    locked = true;
    if (inspector.open) inspector.close();
    refresh();
    let committed = false;
    const commit = () => {
      if (committed || signal.aborted) return;
      committed = true;
      update();
    };
    try {
      if (ids) {
        try { await crossFates(ids, commit, signal); }
        catch (error) { if (signal.aborted) throw error; }
        commit();
        openExchange(exchange);
        locked = true;
        refresh();
        await wait(620, signal);
      }
      panel.hidden = true;
      overlay.classList.remove('chronos-bargain');
      await speak([ids
        ? 'Нить перерезана. Отныне каждый из вас ответит за судьбу, которую получил.'
        : 'Ты оставил нити нетронутыми. Запомни, смертный, даже отказ вплетён в судьбу.'
      ], signal);
      overlay.classList.remove('chronos-dim', 'chronos-speaking');
      overlay.classList.add('chronos-leave');
      figure.classList.remove('show');
      document.body.classList.remove(still);
      await wait(1400, signal);
    } finally {
      locked = false;
    }
  }

  window.chronosCinema = { appear, exchange: openExchange, finish, refresh, close };
})();
