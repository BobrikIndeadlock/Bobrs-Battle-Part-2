
(()=>{
'use strict';
const arena=document.querySelector('.arena'),scene=document.querySelector('.arena .scene');
if(!arena||!scene||document.getElementById('livingAtmosphere'))return;
const layer=document.createElement('div');layer.id='livingAtmosphere';layer.setAttribute('aria-hidden','true');
layer.innerHTML='<div class="living-vault-light"></div><div class="living-haze"></div><div class="living-haze second"></div><div class="living-red-ritual"></div><div class="living-candle-light left"></div><div class="living-candle-light right"></div><div class="living-sigil"></div><canvas></canvas>';
scene.insertBefore(layer,scene.firstChild);
const c=layer.querySelector('canvas'),g=c.getContext('2d',{alpha:true});if(!g)return;
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
const TAU=Math.PI*2,SW=1536,SH=864;
let width=0,height=0,dpr=1,scale=1,ox=0,oy=0,raf=0,last=0;
const hash=n=>{const x=Math.sin(n*127.19+3.7)*43758.5453;return x-Math.floor(x)};
function resize(){const cr=c.getBoundingClientRect(),ar=arena.getBoundingClientRect();width=cr.width;height=cr.height;
 dpr=Math.min(devicePixelRatio||1,2);c.width=Math.max(1,Math.floor(width*dpr));c.height=Math.max(1,Math.floor(height*dpr));
 scale=Math.max(ar.width/SW,ar.height/SH);ox=(ar.left-cr.left)+(ar.width-SW*scale)/2;oy=(ar.top-cr.top)+(ar.height-SH*scale)/2;
}
const observer=new ResizeObserver(resize);observer.observe(arena);resize();
function aura(x,y,r,rgb,a){if(a<=0)return;const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,`rgba(${rgb},${a})`);grad.addColorStop(.34,`rgba(${rgb},${a*.42})`);grad.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=grad;g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}
function drop(x,y,r,rgb,a){aura(x,y,r*3,rgb,a*.5);g.fillStyle=`rgba(${rgb},${a})`;g.beginPath();g.ellipse(x,y,r*.68,r,0,0,TAU);g.fill()}
// Masked moon overlay: it never bleeds onto other architecture or the hanging card.
function moon(t){g.save();g.beginPath();g.arc(1086,94,61,0,TAU);g.clip();
 const pulse=.5+.5*Math.sin(t*TAU/8-.8),shimmer=.5+.5*Math.sin(t*TAU/12+1);
 const halo=g.createRadialGradient(1081,88,3,1086,94,80);halo.addColorStop(0,`rgba(255,145,100,${.17+pulse*.10})`);halo.addColorStop(.65,`rgba(255,40,35,${.06+pulse*.12})`);halo.addColorStop(1,'rgba(255,0,0,0)');g.fillStyle=halo;g.fillRect(1014,21,150,146);
 g.globalAlpha=.07+.08*shimmer;g.strokeStyle='#ffb19b';g.lineWidth=1.6;for(let i=0;i<3;i++){g.beginPath();g.arc(1090,98,28+i*14,-1.4,1.1);g.stroke()}g.restore();
 aura(1086,94,94,'255,38,33',.06+.11*pulse);
}
// Thin wavelets inside the EXACT stone gutters. Each region is cropped so card faces never animate.
function liquid(t,right){g.save();g.beginPath();if(right){g.moveTo(1149,630);g.lineTo(1512,630);g.lineTo(1512,773);g.lineTo(1116,773)}else{g.moveTo(24,632);g.lineTo(422,632);g.lineTo(422,769);g.lineTo(24,769)}g.closePath();g.clip();
 const left=right?1152:24,end=right?1513:424,base=right?736:734,rgb=right?'255,46,46':'174,61,255';
 // Luminous grooves moving in opposite directions, no broad flat color washes.
 for(let j=0;j<4;j++){
  let yy=base+j*7+Math.sin(t*(.85+j*.15)+j*1.8)*2;
  const gr=g.createLinearGradient(left,yy,end,yy+2);
  gr.addColorStop(0,`rgba(${rgb},0)`);gr.addColorStop(.18,`rgba(${rgb},.20)`);gr.addColorStop(.55,`rgba(${rgb},${.17+.1*Math.sin(t*.9+j)**2})`);gr.addColorStop(.84,`rgba(${rgb},.30)`);gr.addColorStop(1,`rgba(${rgb},0)`);
  g.beginPath();g.moveTo(left,yy);for(let x=left;x<=end;x+=5)g.lineTo(x,yy+Math.sin(x*.045-t*2.6+j)*1.9);g.strokeStyle=gr;g.lineWidth=j===0?2.8:1.25;g.shadowBlur=7;g.shadowColor=right?'#ff262f':'#ab36ff';g.stroke();g.shadowBlur=0;
 }
 // Magic / blood drips down the central gargoyle and columns.
 const streams=right?[[1307,701,764],[1209,698,738],[1405,704,743],[1499,701,744]]:[[242,700,768],[135,690,735],[337,704,741],[53,696,752]];
 streams.forEach(([x,y1,y2],i)=>{
  const travel=((t*.24+i*.31)%1);const y=y1+(y2-y1)*travel;
  g.strokeStyle=`rgba(${rgb},${.29+.3*(1-travel)})`;g.lineWidth=i===0?2.5:1.3;g.shadowColor=right?'#ef2339':'#b33cff';g.shadowBlur=8;
  g.beginPath();g.moveTo(x,y1);g.bezierCurveTo(x-2,y1+17,x+2,y2-15,x,y);g.stroke();g.shadowBlur=0;
  drop(x,y,1.7,rgb,.48*(1-travel));
 });g.restore();
}
// Subtle spectral soul silhouette drawn only in safe air to the right of the left arch.
function spirit(x,y,size,t,alpha){if(alpha<=0)return;g.save();g.translate(x,y);g.scale(size,size);g.rotate(Math.sin(t*.8)*.1);g.globalAlpha=alpha;
 aura(0,-10,37,'153,116,255',.32);
 const tail=g.createLinearGradient(0,-28,0,38);tail.addColorStop(0,'rgba(215,203,255,.55)');tail.addColorStop(.45,'rgba(129,91,233,.29)');tail.addColorStop(1,'rgba(112,73,234,0)');g.fillStyle=tail;
 g.beginPath();g.moveTo(0,-31);g.bezierCurveTo(-17,-32,-22,-11,-13,2);g.bezierCurveTo(-26,18,-11,28,-9,40);g.bezierCurveTo(0,26,7,22,12,41);g.bezierCurveTo(8,15,24,12,14,-5);g.bezierCurveTo(15,-25,11,-31,0,-31);g.fill();
 g.fillStyle='rgba(239,222,255,.49)';g.beginPath();g.ellipse(0,-16,9,12,0,0,TAU);g.fill();g.restore()}
function spirits(t){for(let i=0;i<3;i++){const tt=((t+i*5.3+1.7)%16.1)/16.1,edge=Math.min(1,tt*8,(1-tt)*8);const alpha=.54*Math.max(0,edge)*(tt>.08&&tt<.83?1:0);const x=434+tt*218+i*10,y=226-65*Math.sin(tt*Math.PI)+i*19;
 spirit(x,y,.42+i*.07,t+i,alpha);}}
// Bat silhouettes hand-drawn in canvas, realistically flap as they cross the RIGHT upper vault.
function bat(x,y,size,phase,alpha){if(alpha<=0)return;g.save();g.translate(x,y);g.scale(size,size);g.globalAlpha=alpha;
 const wing=Math.sin(phase)*.57;g.fillStyle='rgba(8,2,12,.92)';g.strokeStyle='rgba(15,2,12,.83)';g.lineWidth=.8;
 g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-7,-8+wing*8,-14,-17-wing*13,-23,-8-wing*15);
 g.bezierCurveTo(-33,-12-wing*22,-38,-1-wing*17,-41,4-wing*10);g.quadraticCurveTo(-31,-3-wing*10,-26,7-wing*5);
 g.quadraticCurveTo(-20,1-wing*6,-17,12);g.quadraticCurveTo(-10,5-wing*4,-5,6);g.lineTo(-2,5);
 g.lineTo(0,10);g.lineTo(2,5);
 g.quadraticCurveTo(10,5-wing*4,17,12);g.quadraticCurveTo(20,1-wing*6,26,7-wing*5);
 g.quadraticCurveTo(31,-3-wing*10,41,4-wing*10);g.bezierCurveTo(38,-1-wing*17,33,-12-wing*22,23,-8-wing*15);
 g.bezierCurveTo(14,-17-wing*13,7,-8+wing*8,0,0);g.fill();g.restore()}
function bats(t){for(let i=0;i<4;i++){const period=11.7,tt=((t+i*.24+2.9)%period)/period;
 if(tt>.56)continue;const progress=tt/.56,alpha=Math.max(0,Math.min(1,progress*7,(1-progress)*7));
 const x=1210-210*progress+i*14,y=112+38*progress+Math.sin(progress*6+i)*12+i*7;
 bat(x,y,.32+i*.06,t*10+i*.7,alpha*.87);}}
function candles(t){for(const [x,y,rgb] of [[26,695,'255,153,63'],[416,715,'255,151,58'],[1110,724,'255,139,61'],[1509,749,'255,160,61']]){
 let flicker=.5+.5*Math.sin(t*10+x*.17)*Math.sin(t*7+x*.29);
 aura(x,y,31,rgb,.055+.09*flicker);
 }}
function mote(t){for(let i=0;i<42;i++){
 const ax=hash(i*4.1+1),ay=hash(i*5.8+7),spd=.012+hash(i*3.4+11)*.022;
 let px=(ax+Math.sin(t*.24+i)*.012),py=((ay-t*spd+20)%1);
 const x=px*SW,y=py*SH;if((x<422&&y<635)||(x>1150&&y<620)||(x>722&&x<810&&y<270))continue;
 const a=.18+.21*(.5+.5*Math.sin(t*1.2+i));g.fillStyle=i%5===0?`rgba(172,125,255,${a})`:`rgba(255,116,58,${a})`;
 g.beginPath();g.arc(x,y,.55+hash(i*11)*1.1,0,TAU);g.fill();}}
let elapsed=0,previous=0;function frame(now){raf=0;if(document.body.classList.contains('bobrs-pause-arena')||document.hidden||motion.matches){previous=0;return}raf=requestAnimationFrame(frame);if(previous)elapsed+=Math.min(100,now-previous);previous=now;if(now-last<27)return;last=now;
 if(!width||!height)return;const t=elapsed/1000;
 g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,width,height);g.translate(ox,oy);g.scale(scale,scale);
 // Effects use the ORIGINAL BACKGROUND image coordinates, not viewport percentages.
 g.globalCompositeOperation='screen';moon(t);liquid(t,false);liquid(t,true);candles(t);mote(t);
 g.globalCompositeOperation='source-over';bats(t);g.globalCompositeOperation='source-over';
}
function syncLiving(){if(document.body.classList.contains('bobrs-pause-arena')||document.hidden||motion.matches){if(raf)cancelAnimationFrame(raf);raf=0;previous=0}else if(!raf){previous=0;raf=requestAnimationFrame(frame)}}
document.addEventListener('bobrs-visibility-sync',syncLiving);document.addEventListener('visibilitychange',syncLiving);motion.addEventListener?.('change',syncLiving);syncLiving();
})();
