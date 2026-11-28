/* The scene plate owns the geometry. Only the illustrated bodies are reprojected. */
window.createLivingCaptains = (scene, compact) => {
  'use strict';
  const plates = window.BobrsCaptainPlates;
  const pigments = window.BobrsSeason.captains.map(({theme}) => theme.rgb.split(',').map(channel=>Number(channel)/255));
  const layers = plates.map(({rect:[x,y,width,height],art},side) => {
    const canvas = document.createElement('canvas');
    const image = new Image();
    image.src = art;
    canvas.className = 'captain-motion';
    canvas.setAttribute('aria-hidden','true');
    canvas.hidden = true;
    canvas.dataset.side = String(side);
    for (const [property, value] of Object.entries({
      left:x/1672, top:y/941, width:width/1672, height:height/941,
    })) canvas.style[property] = value*100 + '%';
    scene.prepend(canvas);
    return {canvas,image,width,height,renderer:undefined,visible:true};
  });

  if (typeof IntersectionObserver === 'function') {
    const anchors = layers.map((_,side)=>document.getElementById('cap'+side));
    const observer = new IntersectionObserver(entries => {
      for (const {target,isIntersecting} of entries) {
        const layer = layers[anchors.indexOf(target)];
        layer.visible = isIntersecting;
        if (!isIntersecting) layer.canvas.hidden = true;
      }
    });
    anchors.forEach(anchor=>observer.observe(anchor));
  }
  let decoded = false;
  const ready = Promise.all(layers.map(({image}) => image.decode())).then(() => {
    decoded = true;
  }, () => {});

  const makeState = () => ({ strength:.16, attention:0, began:-Infinity, card:-Infinity, pending:false });
  let states = [makeState(),makeState()];
  let previous = 0;
  let previousPhase = 'idle';
  let formerTurn = '';
  let wasFrozen = false;
  let restoresAt = -Infinity;

  function receive(side, complete) {
    states[side].pending = true;
    if (complete) scene.dataset.completedCaptain = String(side);
  }

  function sample(time, turn, phase, counts, frozen = false) {
    const delta = Math.max(0, Math.min(.12,time-previous));
    previous = time;
    if (phase === 'idle' && previousPhase !== 'idle') {
      states = [makeState(),makeState()];
      delete scene.dataset.completedCaptain;
    }
    previousPhase = phase;
    if (frozen && !wasFrozen) {
      for (const state of states) {
        state.pending = false;
        state.card = -Infinity;
      }
    }
    if (!frozen && wasFrozen) restoresAt = time;
    wasFrozen = frozen;
    const restoring = time-restoresAt < 1.3;
    const entrance = (age, fade) => age < 3 ? (1-Math.exp(-age*12))*Math.exp(-age*fade) : 0;
    const settled = 1-Math.exp(-delta*4.1);
    const motion = states.map((state, side) => {
      const ready = phase !== 'idle' && phase !== 'summoning';
      const active = ready && turn === String(side);
      const full = counts[side] === 5;
      if (active && formerTurn !== turn) state.began = time;
      if (state.pending) {
        state.pending = false;
        state.card = time;
      }
      const landing = entrance(time-state.card, full ? .8 : 1.6);
      const opening = entrance(time-state.began, 1.65);
      const returnLight = restoring ? Math.sin((time-restoresAt)/1.3*Math.PI)*.17 : 0;
      const baseline = ready ? full ? .41 : active ? .45 : .11 : .16;
      const aim = active ? .82 : full ? .42 : .03;
      if (!frozen) {
        state.strength += (Math.min(1,baseline+landing*.74+opening*.27+returnLight)-state.strength)*settled;
        state.attention += (aim-state.attention)*settled;
      }
      const name = frozen ? 'frozen' : restoring ? 'returning' : full ? 'complete' :
        landing > .06 ? 'receiving' : !ready ? 'idle' : active ? 'active' : 'waiting';
      const breath = Math.sin(time*(side ? 1.28 : .94)+side*.8);
      const glance = Math.sin(time*(side ? .46 : .33))*.35 + state.attention + landing*.42;
      const cycle = (time+2.1)%8.4;
      const discharge = entrance(cycle,6)*.43 + opening*.42 + landing*.62;
      return {
        name, breath, glance,
        strength:frozen ? .04 : state.strength,
        strike:frozen || side===0 ? 0 : Math.min(1,discharge),
      };
    });
    formerTurn = phase === 'summoning' ? '' : turn;
    for (const [side,{canvas}] of layers.entries()) {
      if (canvas.dataset.state !== motion[side].name) canvas.dataset.state = motion[side].name;
    }
    return motion;
  }

  const vertex = `
    attribute vec2 point;
    varying vec2 uv;
    void main() {
      uv = point*vec2(.5,-.5)+.5;
      gl_Position = vec4(point,0.,1.);
    }
  `;
  const fragment = `
    precision mediump float;
    uniform sampler2D plate;
    uniform vec2 dimensions;
    uniform vec4 pose;
    uniform vec3 pigment;
    uniform float side, held, phase;
    varying vec2 uv;

    float region(vec2 p, vec2 center, vec2 radius, float core) {
      return 1.-smoothstep(core,1.,length((p-center)/radius));
    }

    void main() {
      vec2 pixel = uv*dimensions;
      float pavel = 1.-side;
      vec2 neck = mix(vec2(137.,130.),vec2(156.,148.),pavel);
      vec2 head = mix(vec2(157.,85.),vec2(136.,91.),pavel);
      vec2 headArea = mix(vec2(80.,81.),vec2(66.,83.),pavel);
      float skull = region(pixel,head,headArea,.72);
      // Hat and face ride the same rigid pose. The neck takes up the rotation.
      float hat = region(pixel,vec2(152.,40.),vec2(129.,49.),.70)*side;
      float rigid = max(skull,hat);
      vec2 axis = pixel-neck;
      float angle = pose.y*mix(.010,-.012,pavel);
      vec2 nod = vec2(axis.y,-axis.x)*angle + vec2(pose.y*.80,pose.x*.56);

      vec2 breast = mix(vec2(182.,170.),vec2(165.,193.),pavel);
      float chest = region(pixel,breast,vec2(103.,65.),.18);
      float shoulder = region(pixel,mix(vec2(232.,165.),vec2(76.,179.),pavel),vec2(78.,56.),.22);
      float cloth = region(pixel,mix(vec2(252.,182.),vec2(209.,200.),pavel),vec2(75.,48.),.14);
      float grip = region(pixel,mix(vec2(86.,196.),vec2(229.,225.),pavel),vec2(66.,53.),.69);
      float lift = (pose.x*1.8 + pose.y*.82)*chest + shoulder*pose.x*1.1;
      float fold = sin(pixel.y*.069+phase*2.1+side*.85)*cloth*.92;
      vec2 textile = vec2((pose.x*.85 + pose.y*.72)*shoulder + fold, -lift + fold*.41)*(1.-grip*.94);
      vec2 room = min(pixel,dimensions-pixel);
      float edge = smoothstep(3.,23.,min(room.x,room.y));
      vec2 sampleAt = (pixel-mix(textile,nod,rigid)*edge)/dimensions;
      vec3 art = texture2D(plate,sampleAt).rgb;

      float olive = smoothstep(.04,.30,art.g-art.b)*smoothstep(.12,.62,art.g)*
        (1.-smoothstep(.015,.15,art.r-art.g));
      float amber = smoothstep(.29,.72,art.r)*smoothstep(.17,.48,art.r-art.b);
      float crawl = smoothstep(.27,.78,.5+.5*sin((pixel.y-pixel.x*.47)*.034+phase*3.));
      float light = pavel*olive*(.075 + crawl*.045)*pose.z
        + side*amber*(.043*pose.z + crawl*pose.w*.12);
      art += pigment*light*(1.-art)*edge;
      art *= 1.-held*(.035 + .055*(pavel*olive+side*amber))*edge;
      gl_FragColor = vec4(art*edge,edge);
    }
  `;

  function initialize({canvas,image,width,height},side) {
    const gl = canvas.getContext('webgl',{alpha:true,depth:false,antialias:false});
    if (!gl) return null;
    const program = gl.createProgram();
    for (const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {
      console.warn('Captain motion shader unavailable:',gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program,'point');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    for (const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
    for (const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
    const uniforms = Object.fromEntries(['dimensions','pose','side','held','phase','pigment']
      .map(name => [name,gl.getUniformLocation(program,name)]));
    gl.uniform2f(uniforms.dimensions,width,height);
    gl.uniform1f(uniforms.side,side);
    gl.uniform3fv(uniforms.pigment,pigments[side]);
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const software = info && /SwiftShader|llvmpipe|software/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    return {gl, uniforms, software};
  }

  function fit({canvas,width,height,renderer}) {
    const scale = compact.matches ? .62 : renderer?.software ? .82 : 1;
    const w = Math.round(width*scale);
    const h = Math.round(height*scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    renderer?.gl.viewport(0,0,w,h);
  }

  function size() { layers.forEach(fit); }

  function paint(time, motion, held) {
    if (!decoded) return;
    for (const [side,layer] of layers.entries()) {
      if (!layer.visible) continue;
      if (layer.renderer === undefined) {
        try { layer.renderer = initialize(layer,side); }
        catch(error) {
          layer.renderer = null;
          console.warn('Captain motion unavailable:',error.message);
        }
        fit(layer);
      }
      if (!layer.renderer) continue;
      const {canvas,renderer:{gl,uniforms}} = layer;
      const {breath,glance,strength,strike} = motion[side];
      canvas.hidden = false;
      gl.uniform1f(uniforms.phase,time%(Math.PI*2/.3));
      gl.uniform1f(uniforms.held,held ? 1 : 0);
      gl.uniform4f(uniforms.pose,breath,glance,strength,strike);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }
  }

  for (const layer of layers) {
    const {canvas} = layer;
    canvas.addEventListener('webglcontextlost',event => {
      event.preventDefault();
      layer.renderer = null;
      canvas.hidden = true;
    });
    canvas.addEventListener('webglcontextrestored',() => { layer.renderer = undefined; });
  }
  return {
    ready,size,paint,receive,sample,
    budgeted:() => !decoded || layers.every(({visible,renderer}) => !visible || renderer === null || renderer?.software),
    hide:() => layers.forEach(({canvas}) => { canvas.hidden = true; }),
  };
};
