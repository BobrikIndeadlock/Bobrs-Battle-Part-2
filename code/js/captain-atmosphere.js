// Captains share the room's paint buffer, coordinate grid and pause clock.
function createCaptainAtmosphere(context) {
  const textures = new Map();
  const files = [
    'spirits-left', 'spirits-right', 'ashen-violet', 'violet-stone',
    'crimson-vapour', 'crimson-floor', 'crimson-stone', 'blood-reflection',
  ];
  const ready = Promise.all(files.map(async name => {
    const image = new Image();
    image.src = 'media/captains/' + name + '.webp';
    try {
      await image.decode();
      textures.set(name, image);
    } catch (error) {
      console.warn('Captain atmosphere asset unavailable:', name, error);
    }
  }));

  // Registered on the 1536×864 painting. Leave portraits, labels and the central grid clear.
  const leftPedestal = new Path2D('M 8 568 H 68 L 88 617 H 346 L 366 607 L 378 569 H 433 L 452 692 L 443 829 H 8 Z');
  const rightPedestal = new Path2D('M 1088 649 L 1112 610 H 1150 L 1194 620 H 1504 L 1536 601 V 839 H 1090 Z');
  const rightStone = new Path2D('M 1088 643 L 1132 625 L 1179 637 H 1500 L 1536 622 V 839 H 1090 Z');

  const cycle = 13.6;
  // Rear, middle, then front. Smaller figures rise more slowly and stay in the haze.
  const spirits = [
    { x: 66, foot: 695, w: 55, start: .14, life: 8.3, lift: 34, drift: -10, seed: 2, side: 'left', opacity: .56 },
    { x: 368, foot: 707, w: 57, start: .91, life: 8.4, lift: 37, drift: 12, seed: 11, side: 'right', opacity: .57 },
    { x: 150, foot: 733, w: 64, start: 1.63, life: 8.3, lift: 43, drift: -9, seed: 5, side: 'right', opacity: .61 },
    { x: 300, foot: 731, w: 65, start: 2.22, life: 8.4, lift: 40, drift: 12, seed: 14, side: 'left', opacity: .64 },
    { x: 111, foot: 749, w: 74, start: 2.94, life: 8.15, lift: 48, drift: -9, seed: 8, side: 'left', opacity: .67 },
    { x: 242, foot: 750, w: 72, start: 3.42, life: 8.25, lift: 52, drift: 8, seed: 16, side: 'right', opacity: .71 },
    { x: 190, foot: 775, w: 83, start: 4.08, life: 8.1, lift: 55, drift: -7, seed: 12, side: 'left', opacity: .69 },
    { x: 333, foot: 763, w: 81, start: 4.76, life: 8.2, lift: 52, drift: 12, seed: 4, side: 'right', opacity: .67 },
  ];

  const ease = value => {
    const clamped = Math.max(0, Math.min(1, value));
    return clamped * clamped * (3 - 2 * clamped);
  };

  function plate(name, x, y, opacity, width, height) {
    const texture = textures.get(name);
    if (!texture) return;
    context.globalAlpha = opacity;
    context.drawImage(texture, x, y, width ?? texture.width, height ?? texture.height);
  }

  function spiritFrame(spirit, time, reduced, light) {
    const age = reduced ? spirit.life * .45 : time % cycle - spirit.start;
    if (age <= 0 || age >= spirit.life) return;
    const atlas = textures.get('spirits-' + spirit.side);
    if (!atlas) return;

    const progress = age / spirit.life;
    const rise = ease(progress);
    const sway = reduced ? 0 : Math.sin(age * 1.38 + spirit.seed) * 3.6;
    const frame = reduced ? 7 : (Math.floor(age * 9) + spirit.seed) % 20;
    const sourceWidth = atlas.width / 5;
    const sourceHeight = atlas.height / 4;
    const width = spirit.w * (.83 + .17 * rise);
    const height = width * sourceHeight / sourceWidth;
    const x = spirit.x + spirit.drift * rise + sway - width / 2;
    const y = spirit.foot - spirit.lift * rise - height;
    const presence = ease(age / 1.6) * ease((spirit.life - age) / 2.25);

    context.globalAlpha = spirit.opacity * presence * (reduced ? .59 : .83 + .17 * light);
    context.drawImage(atlas, frame % 5 * sourceWidth, Math.floor(frame / 5) * sourceHeight,
      sourceWidth, sourceHeight, x, y, width, height);
  }

  let leftActivity = 0;
  let rightActivity = 0;
  let previousTime = 0;

  function paint(time, side, reduced, compact) {
    const delta = time - previousTime;
    previousTime = time;
    const transition = reduced || delta < 0 ? 1 : 1 - Math.exp(-delta * 4.2);
    leftActivity += ((side === '0' ? 1 : 0) - leftActivity) * transition;
    rightActivity += ((side === '1' ? 1 : 0) - rightActivity) * transition;

    const violet = .49 + .22 * leftActivity + Math.sin(time * 1.58) * .11;
    const crimson = .48 + .24 * rightActivity +
      Math.sin(time * 1.88 + .72) * .10 + Math.sin(time * .63) * .09;

    context.save();
    context.clip(leftPedestal);
    plate('violet-stone', 23, 601, violet);
    plate('ashen-violet', 25 + 31 * Math.sin(time * .43), 579, .47 + leftActivity * .16, 397, 145);
    for (let index = 0; index < spirits.length; index++) {
      if (reduced && index !== 3 && index !== 5) continue;
      spiritFrame(spirits[index], time, reduced, violet);
    }
    if (!compact) {
      // A second veil crosses the bases of the nearer figures.
      plate('ashen-violet', 45 - 24 * Math.sin(time * .32 + .9), 665, .34, 372, 125);
    }
    context.restore();

    context.save();
    context.clip(rightPedestal);
    plate('crimson-stone', 1094, 603, crimson);
    plate('crimson-vapour', 1100 + 31 * Math.sin(time * .38), 615, .53 + rightActivity * .16, 449, 138);
    context.clip(rightStone);
    plate('blood-reflection', 1130 + 2 * Math.sin(time * 1.65), 712,
      crimson * (.70 + .20 * Math.sin(time * 2.15 - .8)));
    plate('crimson-floor', 1114 - 33 * Math.sin(time * .27 + .92), 692, .60, 421, 122);
    context.restore();
  }

  return { ready, paint };
}
