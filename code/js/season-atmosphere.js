/* Fixed depth/reflectance maps register the moving light to the scene painting. */
window.createSeasonAtmosphere = (canvas, scene) => {
  const media = window.BobrsLightMaps[scene];
  const map = new Image();
  const detail = new Image();
  map.src = media;
  detail.src = window.BobrsDetailMaps[scene];
  const [ash, storm] = window.BobrsSeason.captains.map(({theme}) => theme.rgb.split(',').map(n => Number(n)/255));
  let renderer;
  let aspect = 16 / 9;
  let lastTime;
  let pulseSide = -1;
  let pulseTime = -Infinity;
  let landingPending = false;
  const level = [0, 0];

  const vertex = `
    attribute vec2 p;
    varying vec2 uv;
    void main() {
      uv = p * vec2(.5, -.5) + .5;
      gl_Position = vec4(p, 0., 1.);
    }
  `;
  const fragment = `
    precision mediump float;
    uniform sampler2D response, details;
    uniform float t, aspect, fade, charge, strike, approach;
    uniform vec2 energy, captainLight;
    uniform vec3 ash, storm;
    varying vec2 uv;

    float hash(vec2 p) {
      vec3 v = fract(vec3(p.xyx)*vec3(.1031,.1099,.1137));
      v += dot(v, v.yzx+19.19);
      return fract((v.x+v.y)*v.z);
    }
    float noise(vec2 p) {
      vec2 g = floor(p), f = fract(p);
      f = f*f*(3.-2.*f);
      return mix(mix(hash(g),hash(g+vec2(1,0)),f.x),
        mix(hash(g+vec2(0,1)),hash(g+1.),f.x),f.y);
    }
    float mist(vec2 p, float step) {
      vec2 q = p + vec2(-step*.18,step*.115);
      vec2 curl = vec2(noise(q*.68+step*.11),noise(q*.58-step*.09));
      q += (curl-.5)*1.28;
      return noise(q)*.61 + noise(q*2.17+vec2(step*.25,-step*.11))*.26 + noise(q*4.07)*.13;
    }
    float grains(vec2 p, float tick) {
      vec2 cell = floor(p);
      float seed = hash(cell + vec2(44.,2.));
      vec2 center = vec2(hash(cell*.71),hash(cell+16.))*.62+.19;
      float speck = 1.-smoothstep(.008,.073,length(fract(p)-center));
      return speck * smoothstep(.72,.98,seed) *
        pow(.5+.5*sin(tick*(1.3+seed)+seed*8.),2.);
    }

    void main() {
      vec3 surface = texture2D(response,uv).rgb;
      vec3 field = texture2D(details,uv).rgb;
      vec2 p = uv * vec2(aspect,1.);
      float farAir = noise(p*vec2(4.7,12.) + vec2(-t*.11,t*.12));
      float nearAir = mist(p*vec2(3.7,6.9) + vec2(16.+approach*.9,0.),t*.75);
      float bank = smoothstep(.31,.79,farAir*.42+nearAir*.58);
      float wisp = smoothstep(.49,.85,nearAir) * field.b;
      float left = surface.r*energy.x*(.28+nearAir*.46);
      float right = surface.g*energy.y*.69;
      float litBolt = field.g*strike*smoothstep(uv.y-.30,uv.y+.10,strike+.14);
      float torch = field.r * (.38 + .15*sin(t*6.9+uv.x*24.) + .14*sin(t*11.8+uv.y*13.));
      float fog = (.09*surface.b+.29*field.b)*bank;
      float spores = grains(p*vec2(40.,25.)+vec2(t*.39,t*.64),t) *
        (surface.r*.10+field.b*(.08+charge*.18));
      float breathFog = wisp * surface.r * captainLight.x * .27;
      float drift = wisp * (.06+energy.x*.25) + spores + breathFog;
      vec3 mistColor = vec3(.57,.59,.61);
      vec3 light = ash*(left+drift) + storm*(right+litBolt*.32)
        + mistColor*fog + vec3(1.,.57,.26)*torch;
      float opacity = clamp(left+right+litBolt*.32+torch+fog+drift,0.,.84);
      gl_FragColor = vec4(light*fade,opacity*fade);
    }
  `;

  function initialize() {
    const gl = canvas.getContext('webgl', { alpha:true, depth:false, antialias:false });
    if (!gl) return null;
    const program = gl.createProgram();
    for (const [name, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(name);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 3,-1, -1,3]),gl.STATIC_DRAW);
    const p = gl.getAttribLocation(program,'p');
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
    for (const [unit, [name, image]] of [['response',map],['details',detail]].entries()) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
      for (const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
      for (const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(program,name),unit);
    }
    const locations = Object.fromEntries(
      ['t','aspect','fade','energy','charge','strike','approach','captainLight'].map(name=>[name,gl.getUniformLocation(program,name)])
    );
    gl.uniform3fv(gl.getUniformLocation(program,'ash'),ash);
    gl.uniform3fv(gl.getUniformLocation(program,'storm'),storm);
    return { gl, locations };
  }

  function size(width, height) {
    aspect = width / height;
    canvas.width = width;
    canvas.height = height;
    renderer?.gl.viewport(0,0,width,height);
  }

  let pulseKind = 'pick';

  function receive(side, kind = 'pick') {
    pulseSide = side;
    pulseKind = kind;
    landingPending = true;
  }

  function paint(time, side, { reduced = false, proximity = 0, charge = 0, convergence = 0, captainMotion, held = false } = {}) {
    if (reduced || proximity >= .98) {
      canvas.hidden = true;
      return;
    }
    if (!map.naturalWidth || !detail.naturalWidth || canvas.width < 2) return;
    if (renderer === undefined) {
      try { renderer = initialize(); }
      catch (error) {
        renderer = null;
        console.warn('Scene lighting unavailable:', error.message);
      }
      renderer?.gl.viewport(0,0,canvas.width,canvas.height);
    }
    if (!renderer) return;
    canvas.hidden = false;
    const delta = lastTime === undefined ? 0 : Math.max(0,Math.min(.12,time-lastTime));
    lastTime = time;
    if (landingPending) {
      landingPending = false;
      pulseTime = time;
    }
    for (const index of [0,1]) {
      const desired = side === String(index) ? 1 : 0;
      level[index] += (desired-level[index])*(1-Math.exp(-delta*4));
    }

    const age = time-pulseTime;
    const pulse = age < 2.3 ? (1-Math.exp(-age*11))*Math.exp(-age*1.85) : 0;
    const harmonic = (1+Math.sin(time*1.3))*.5;
    const cycle = (time+4.6)%13.7;
    const flash = Math.exp(-cycle*10)*smoothstep(0,.10,cycle)
      + .50*Math.exp(-Math.max(0,cycle-.38)*13)*smoothstep(.34,.44,cycle);
    const activation = .86 + .3*charge;
    const ban = pulseKind === 'ban';
    const necromancy = captainMotion?.[0].strength ?? 0;
    const voltage = captainMotion?.[1].strength ?? 0;
    const discharge = captainMotion?.[1].strike ?? 0;
    const left = .20 + harmonic*.09 + level[0]*.36*activation +
      (pulseSide===0 ? pulse*(ban ? .30 : .69) : 0) + convergence*.35 + necromancy*.22;
    const right = .13 + level[1]*.27*activation + flash*1.2 +
      (pulseSide===1 ? pulse*(ban ? .36 : .73) : 0) + convergence*.32 + voltage*.11 + discharge*.39;
    const lightning = Math.min(1,flash*2.1 + (pulseSide===1 ? pulse*.58 : 0) + convergence*.18 + discharge*.68);

    const { gl,locations } = renderer;
    gl.uniform1f(locations.t,time%512);
    gl.uniform1f(locations.aspect,aspect);
    gl.uniform1f(locations.fade,(1-proximity)**1.5);
    gl.uniform1f(locations.approach,proximity);
    gl.uniform1f(locations.charge,charge);
    gl.uniform1f(locations.strike,held ? 0 : lightning);
    gl.uniform2f(locations.captainLight,necromancy,voltage);
    gl.uniform2f(locations.energy,held ? .055 : left,held ? .035 : right);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }

  canvas.classList.add('season-light');
  canvas.hidden = true;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    renderer = null;
    canvas.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => { renderer = undefined; });
  function smoothstep(start, end, value) {
    const t = Math.max(0,Math.min(1,(value-start)/(end-start)));
    return t*t*(3-2*t);
  }

  const ready = Promise.all([map.decode(),detail.decode()]).catch(()=>{});
  return { ready, size, paint, receive };
};

window.playSeasonSound = (() => {
  const clips = new Map();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const clip of clips.values()) clip.pause();
  });
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
