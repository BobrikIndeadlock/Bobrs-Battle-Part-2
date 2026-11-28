window.createSeasonAtmosphere = context => {
  const textures = window.BobrsSeason.captains.map(() => ({}));
  const ready = Promise.all(window.BobrsSeason.captains.flatMap(({ effects }, side) =>
    ['aura', 'mist'].map(async name => {
      const image = new Image();
      image.src = effects[name];
      try {
        await image.decode();
        textures[side][name] = image;
      } catch {
        // Base scene artwork remains available if an optional overlay fails.
      }
    })));

  function plate(side, name, x, y, width, height, opacity) {
    const image = textures[side][name];
    if (image && opacity > 0) {
      context.globalAlpha = Math.min(1, opacity);
      context.drawImage(image, x, y, width, height);
    }
  }

  const scenes = {
    throne: {
      mist: [[9,634,485,152],[1035,600,537,173]],
      fire: [[395,323,78,102],[507,392,50,67]],
      bolt: [1089,67,147,205],
      stone: [[246,718,246,93],[1309,715,227,95]]
    },
    gate: {
      mist: [[-60,242,470,132],[444,238,450,125]],
      fire: [[49,187,78,85]],
      bolt: [712,-8,112,102],
      stone: [[144,384,190,59],[728,372,170,60]]
    },
    cathedral: {
      mist: [[-53,357,424,133],[639,325,411,158]],
      fire: [[31,409,96,84],[254,341,66,75]],
      bolt: [744,58,229,223],
      stone: [[213,449,158,73],[820,439,156,80]]
    }
  };

  const light = [0, 0];
  let previous = 0;
  function spot(x, y, width, height, side, opacity) {
    if (opacity <= 0) return;
    const gradient = context.createRadialGradient(0,0,0,0,0,1);
    const rgb = window.BobrsSeason.captains[side].theme.rgb;
    gradient.addColorStop(0,`rgba(${rgb},${opacity})`);
    gradient.addColorStop(1,`rgba(${rgb},0)`);
    context.save();
    context.translate(x,y);
    context.scale(width,height);
    context.globalAlpha = 1;
    context.fillStyle = gradient;
    context.fillRect(-1,-1,2,2);
    context.restore();
  }

  function paint(scene, time, active, { reduced = false, compact = false, proximity = 0 } = {}) {
    const { mist, fire, bolt, stone } = scenes[scene];
    const delta = Math.min(.15, Math.max(0, time - previous));
    previous = time;
    const strength = reduced ? 1 : 1 - Math.exp(-delta * 3.3);
    for (const side of [0,1]) light[side] += ((String(side) === active ? 1 : 0) - light[side]) * strength;
    const veil = (1-proximity)**2;
    const surge = (time + 2.7) % (scene === 'gate' ? 12 : 10.2);
    const lightning = reduced || surge > .60 ? 0 : Math.sin(Math.PI * surge / .60)**2 *
      (.74 + .26 * Math.sin(surge*28));
    const drift = Math.sin(time*.22);
    context.save();
    context.globalCompositeOperation = 'screen';
    for (const [side, [x,y,width,height]] of mist.entries()) {
      const move = reduced ? 0 : (side ? -1 : 1) * (drift*24 + 50*proximity);
      plate(side,'mist',x+move,y+Math.sin(time*.31+side)*7,width,height,(.27+light[side]*.20)*veil);
      spot(...stone[side],side,(.11+.23*light[side]+(side?lightning*.12:0))*veil);
    }
    for (const [i,[x,y,width,height]] of fire.entries()) {
      const flutter = reduced ? .48 : .49+.16*Math.sin(time*3.4+i)+.06*Math.sin(time*7.1+i*2);
      const lift = reduced ? 0 : 4*Math.sin(time*3.8+i);
      plate(0,'aura',x+lift,y-lift,width,height,(flutter+.22*light[0])*veil);
      if (compact || reduced) continue;
      for (let mote=0;mote<3;mote++) {
        const age=(time/(3.9+mote*.31)+mote*.31+i*.51)%1;
        const mx=x+width*(.44+mote*.06+Math.sin(age*3+mote)*.10);
        spot(mx,y+height*.85-age*height*.85,1.5,2.3,0,Math.sin(Math.PI*age)**2*.62*veil);
      }
    }
    if (lightning) {
      plate(1,'aura',...bolt,lightning*(.42+.30*light[1])*veil);
      if (light[1]>.08) {
        const [x,y,w,h]=bolt;
        plate(1,'aura',x+w*.9,y+h*.85,w*.43,h*.43,lightning*light[1]*.50*veil);
      }
    }
    context.restore();
  }

  return { ready, paint };
};

window.playSeasonSound = (() => {
  const clips = new Map();
  return (side, volume = .26) => {
    if (document.hidden) return;
    let clip = clips.get(side);
    if (!clip) {
      clip = new Audio(window.BobrsSeason.captains[side].effects.sound);
      clips.set(side, clip);
    }
    clip.volume = volume;
    clip.currentTime = 0;
    clip.play().catch(() => {});
  };
})();
