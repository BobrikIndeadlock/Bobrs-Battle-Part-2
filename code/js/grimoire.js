window.grimoireVisual = (() => {
  const atlas = new Image();
  atlas.src = 'media/grimoire/book-lighting.webp';
  const ready = atlas.decode().catch(() => {});

  // These coordinates register the extracted textures to arena-throne-room.webp.
  const left = 546;
  const top = 630;
  const width = 444;
  const height = 224;
  const pageEdge = new Path2D('M631 784 H737 L767 797 L788 784 H917 Q924 788 923 793 Q916 807 922 817 H631 Q626 799 631 784 Z');
  const runeBands = [
    { left: 639, width: 77, phase: 0, delay: 0 },
    { left: 827, width: 72, phase: .89, delay: .31 },
  ];
  let ritual = null;

  function begin() {
    const current = { time: 0, timing: null };
    ritual = current;
    return {
      update(time, timing) {
        current.time = time;
        current.timing = timing;
      },
      finish() {
        if (ritual === current) ritual = null;
      },
    };
  }

  function smooth(value) {
    const t = Math.min(1, Math.max(0, value));
    return t * t * (3 - 2 * t);
  }

  function drawPlate(context, index, opacity, x = left, plateWidth = width) {
    if (opacity <= 0) return;
    context.globalAlpha = Math.min(1, opacity);
    context.drawImage(atlas, x - left, index * height, plateWidth, height,
      x, top, plateWidth, height);
  }

  function wakeLight(time, timing) {
    const { firstEmission, spacing, count, reveal } = timing;
    const start = smooth(time / firstEmission);
    const afterLaunch = time - firstEmission;
    const anticipation = start * (1 - smooth(afterLaunch / 740));
    const lending = afterLaunch >= 0 && afterLaunch < count * spacing
      ? .22 * Math.sin(Math.PI * ((afterLaunch % spacing) / spacing)) ** 2
      : 0;
    const residual = 1 - smooth((time - reveal - 340) / 965);
    const resonance = .23 * smooth(afterLaunch / 350) + .09 * smooth((time - reveal + 1500) / 1500);
    return {
      strength: Math.min(1, (anticipation * .88 + lending + resonance) * residual),
      wave: start * (1 - smooth((afterLaunch - 120) / 1220)),
    };
  }

  function flexPages(context, time, wave, compact) {
    const x = 623;
    const y = 781;
    const count = compact ? 4 : 7;
    const stripHeight = 38 / count;
    context.save();
    context.clip(pageEdge);
    for (let index = 0; index < count; index++) {
      const stripY = y + index * stripHeight;
      const shift = Math.sin(time / 78 - index * .82) * wave;
      context.globalAlpha = wave * .85;
      context.drawImage(atlas, x - left, 3 * height + stripY - top, 305, stripHeight + 2,
        x + shift * .8, stripY + shift * 1.85, 305, stripHeight + 2);
    }
    context.restore();
  }

  function drawMotes(context, ember, time, strength, compact) {
    if (!ember) return;
    const count = compact ? 3 : 6;
    for (let index = 0; index < count; index++) {
      const period = 4.6 + (index % 3) * 1.07;
      const age = (time + index * 2.13) % period;
      if (age > 1.6) continue;
      const lift = age / 1.6;
      const side = index % 2 ? -1 : 1;
      const x = 768 + side * (34 + index * 9 - lift * (14 + 12 * strength)) + Math.sin(age * 2.4 + index) * 4;
      const y = 761 - index * 3 - lift * (26 + 26 * strength);
      const size = (1.9 + index % 3 * .5) * (1 - lift * .44);
      context.globalAlpha = Math.sin(Math.PI * lift) ** 2 * (.22 + strength * .46);
      context.drawImage(ember, x, y, size, size * 2.1);
    }
  }

  function paint(context, ember, ambientTime, reduced, compact) {
    if (!atlas.complete || !atlas.naturalWidth) return;

    const { time, timing } = ritual ?? {};
    const { strength, wave } = timing && !reduced ? wakeLight(time, timing) : { strength: 0, wave: 0 };
    const breath = reduced ? .45 : .46 + Math.sin(ambientTime * 1.15) * .22 + Math.sin(ambientTime * 2.13) * .07;
    drawPlate(context, 0, 1);
    if (wave) flexPages(context, time, wave, compact);
    drawPlate(context, 1, .13 + breath * .13 + strength * .67);
    for (const band of runeBands) {
      const pulse = reduced ? .18 : .16 + (Math.sin(ambientTime * 1.55 + band.phase) + 1) * .075;
      const lit = strength ? smooth((time / timing.firstEmission - band.delay) / .75) * strength : 0;
      drawPlate(context, 2, pulse + lit * .72, band.left, band.width);
    }
    if (!reduced) drawMotes(context, ember, ambientTime, strength, compact);
    context.globalAlpha = 1;
  }

  return { begin, paint, ready };
})();
