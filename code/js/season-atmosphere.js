/* Fixed depth/reflectance maps register the moving light to the scene painting. */
window.createSeasonAtmosphere = (canvas, scene) => {
  const media = window.BobrsLightMaps[scene];
  const map = new Image();
  map.src = media;
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
    uniform sampler2D response;
    uniform float t, aspect, fade;
    uniform vec2 energy;
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
    void main() {
      vec3 surface = texture2D(response,uv).rgb;
      vec2 p = uv * vec2(aspect,1.);
      vec3 ash = vec3(.69,.74,.63);
      vec3 gold = vec3(1.,.79,.28);
      float deep = mist(p * vec2(4.1,8.) + vec2(0.,11.),t);
      float near = mist(p * vec2(2.8,5.7) + vec2(16.,0.),t*1.41);
      float fog = surface.b * smoothstep(.30,.83,deep*.61+near*.39)*(.14+.21*energy.x);
      float left = surface.r * energy.x * (.30+deep*.40);
      float right = surface.g * energy.y * .66;
      float opacity = (left + right + fog)*fade;
      vec3 light = ash*(left+fog) + gold*right;
      gl_FragColor = vec4(light*fade,opacity);
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
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,map);
    for (const name of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,name,gl.CLAMP_TO_EDGE);
    for (const name of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,name,gl.LINEAR);
    const locations = Object.fromEntries(['t','aspect','fade','energy'].map(name=>[name,gl.getUniformLocation(program,name)]));
    return { gl, locations };
  }

  function size(width, height) {
    aspect = width / height;
    canvas.width = width;
    canvas.height = height;
    renderer?.gl.viewport(0,0,width,height);
  }

  function receive(side) {
    pulseSide = side;
    landingPending = true;
  }

  function paint(time, side, { reduced = false, proximity = 0 } = {}) {
    if (reduced || proximity >= .98) {
      canvas.hidden = true;
      return;
    }
    if (!map.naturalWidth) return;
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
    const arrival = age < 1.85 ? Math.sin(Math.PI*age/1.85)**2 : 0;
    const sinceStrike = (time+6.2)%11.3;
    const flash = sinceStrike < .64 ? Math.sin(Math.PI*sinceStrike/.64)**2 * Math.exp(-sinceStrike*3.8) : 0;
    const left = .14 + level[0]*.32 + (pulseSide===0 ? arrival*.34 : 0);
    const right = .11 + level[1]*.26 + flash*(.77+level[1]*.12) + (pulseSide===1 ? arrival*.36 : 0);

    const { gl,locations } = renderer;
    gl.uniform1f(locations.t,time%512);
    gl.uniform1f(locations.aspect,aspect);
    gl.uniform1f(locations.fade,(1-proximity)**1.5);
    gl.uniform2f(locations.energy,left,right);
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
  const ready = map.decode().catch(()=>{});
  return { ready, size, paint, receive };
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
