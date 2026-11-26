
(()=>{
 const $=id=>document.getElementById(id);
 const order=[['ban',0],['ban',1],['ban',1],['ban',0],['pick',0],['pick',1],['pick',1],['pick',0],['pick',0],['ban',1],['ban',0],['pick',1],['pick',1],['pick',0],['pick',0],['pick',1],['pick',0],['pick',1]];
 const names=['Abrams', 'Apollo', 'Baba', 'Bebop', 'Billy', 'Calico', 'Celeste', 'Deadman Danny', 'The Doorman', 'Drifter', 'Dynamo', 'Graves', 'Grey Talon', 'Haze', 'Holliday', 'Infernus', 'Ivy', 'Kelvin', 'Lady Geist', 'Lash', 'McGinnis', 'Mina', 'Mirage', 'Mo & Krill', 'Nurse Harrow', 'Paige', 'Paradox', 'Pocket', 'Rat King', 'Rem', 'Seven', 'Shiv', 'Silver', 'Sinclair', 'Solomon', 'Venator', 'Victor', 'Vindicta', 'Violet', 'Viscous', 'Vyper', 'Warden', 'Wraith', 'Yamato'];
 // Portraits can be replaced locally by clicking a hero and uploading a file; SVG fallbacks work offline.
 const colors=['#8e483f','#3e6671','#665a86','#6e8156','#8e4779','#9b623b','#59766c','#4b7b9a'];
 const heroes=names.map((name,i)=>({name,id:i,img:null}));
 let step=0,place1=1,selected=null,flipping=false,history=[],coinResult=null;
 const active=$('dlPhase');
 function screen(id){
  for(const name of ['dlCoinScreen','dlDraftScreen','dlEndScreen'])$(name).classList.toggle('active',name===id);
  active.classList.toggle('draft-active',id==='dlDraftScreen');
  active.scrollTop=0;
 }
 function fallbackPortrait(hero){if(hero.img)return hero.img;const c=colors[hero.id%colors.length],initial=hero.name.split(' ').map(s=>s[0]).slice(0,2).join('');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="290" viewBox="0 0 220 290"><defs><radialGradient id="a"><stop stop-color="${c}"/><stop offset="1" stop-color="#0d1019"/></radialGradient></defs><rect width="220" height="290" fill="url(#a)"/><path d="M-10 300Q10 170 65 168L78 145Q60 119 69 84Q76 48 110 48Q144 48 151 84Q160 119 142 145L155 168Q210 170 230 300" fill="#090d14" stroke="#b59b7977" stroke-width="2"/><path d="M40 250L180 250M20 270L200 270" stroke="#e4b98133" stroke-width="2"/><text x="110" y="235" text-anchor="middle" font-family="Georgia" font-size="65" fill="#f0d2a0" opacity=".88">${initial.replace(/&/g,'&amp;')}</text><path d="M15 15H205V275H15Z" stroke="#d7b47d66" fill="none" stroke-width="2"/></svg>`;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
 function portrait(hero){return hero.img||deadlockPortraits[hero.name]||fallbackPortrait(hero)}

 function sideOf(place){return place===0?place1:1-place1}function turn(){return order[step]};function picked(side){return history.filter(h=>h.type==='pick'&&h.side===side)}function banned(side){return history.filter(h=>h.type==='ban'&&h.side===side)}
 const heroButtons=new Map();
 function setPortrait(im,h){const url=portrait(h);if(im.dataset.requestedSrc!==url){im.dataset.requestedSrc=url;im.src=url}im.alt=h.name}
 function syncSlots(root,entries,kind){while(root.children.length>entries.length)root.lastElementChild.remove();entries.forEach((entry,i)=>{let el=root.children[i];if(!el){el=document.createElement('div');root.append(el)}const hero=entry?heroes[entry.id]:null,key=hero?String(hero.id):'empty';const cls=kind==='pick'?'dl-slot':'dl-ban-mini';if(el.dataset.heroKey!==key){el.dataset.heroKey=key;el.className=cls+(hero?'':' empty');el.replaceChildren();el.title=hero&&kind==='ban'?hero.name:'';if(hero){const im=new Image();el.append(im)}if(kind==='pick'){const txt=document.createElement('span');txt.textContent=hero?hero.name:`${i+1}. Ожидание`;el.append(txt)}}if(hero)setPortrait(el.querySelector('img'),hero)})}
 function renderAltar(){const timeline=$('dlOrder');if(timeline.children.length!==order.length){timeline.replaceChildren();order.forEach(([type,place],i)=>{const el=document.createElement('div');el.innerHTML=`${i+1}<b>${type==='ban'?'⊘':'⚔'}</b>${type==='ban'?'БАН':'ПИК'} ${place+1}`;timeline.append(el)})}order.forEach(([type,place],i)=>{const el=timeline.children[i];el.className='dl-order-item '+type+(i===step?' now':i<step?' done':'');el.dataset.paletteSide=String(sideOf(place));if(i===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});const list=history.filter(h=>h.type==='ban');syncSlots($('dlCentralBans'),Array.from({length:6},(_,i)=>list[i]||null),'ban')}
 function update(){renderAltar();if(step>=order.length){showEnd();return}const [type,place]=turn(),side=sideOf(place),name=side?'АРТЕМОН':'МАКАРЫЧ';$('dlDraftScreen').dataset.paletteSide=String(side);$('dlStep').textContent=`${type==='ban'?'БАН':'ПИК'} ${step+1} / 18`;$('dlTurnText').textContent=`ХОД ${side?'АРТЕМОНА':'МАКАРЫЧА'}`;$('dlTurnHint').textContent=`МЕСТО ${place+1} · ${type==='ban'?'Запретите одного героя':'Выберите героя в команду'}`;$('dlProgress').style.width=step/18*100+'%';$('dlPlace0').textContent='МЕСТО '+(place1===0?'1':'2')+' · ПИКИ '+picked(0).length+'/6 · БАНЫ '+banned(0).length+'/3';$('dlPlace1').textContent='МЕСТО '+(place1===1?'1':'2')+' · ПИКИ '+picked(1).length+'/6 · БАНЫ '+banned(1).length+'/3';for(let i=0;i<2;i++){$('dlTeam'+i).classList.toggle('current',side===i);const picks=picked(i),bans=banned(i);syncSlots($('dlPicks'+i),Array.from({length:6},(_,j)=>picks[j]||null),'pick');syncSlots($('dlBans'+i),bans,'ban')}$('dlChosenText').textContent=selected===null?'Выберите героя':heroes[selected].name;$('dlConfirm').disabled=animating||selected===null;$('dlConfirm').textContent=type==='ban'?'ЗАПРЕТИТЬ ГЕРОЯ':'ВЫБРАТЬ ГЕРОЯ';$('dlUndo').disabled=animating||!history.length;$('dlHistory').textContent=history.slice(-5).map(h=>`${h.side?'Артемон':'Макарыч'}: ${h.type==='ban'?'бан':'пик'} ${heroes[h.id].name}`).join('  ·  ');renderHeroes()}
 function renderHeroes(){const search=$('dlSearch').value.trim().toLowerCase(),used=new Map(history.map(h=>[h.id,h])),root=$('dlHeroes');for(const h of heroes){let b=heroButtons.get(h.id);if(!b){b=document.createElement('button');b.type='button';const im=new Image();im.loading='lazy';b.append(im);const label=document.createElement('span');label.textContent=h.name;b.append(label);b.onclick=()=>{if(animating||history.some(x=>x.id===h.id))return;selected=h.id;update()};heroButtons.set(h.id,b);root.append(b)}setPortrait(b.querySelector('img'),h);const usedBy=used.get(h.id);b.className='dl-hero'+(usedBy?' taken':'')+(selected===h.id?' selected':'');b.disabled=animating||!!usedBy;b.dataset.status=usedBy?(usedBy.type==='ban'?'БАН':'ПИК'):'';b.hidden=!h.name.toLowerCase().includes(search)}}
 let audioCtx=null, audioMaster=null, audioEnabled=false;
 const soundToggle=$('battleSoundToggle');
 function prepareAudio(){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;if(!audioCtx||audioCtx.state==='closed'){audioCtx=new Audio();audioMaster=audioCtx.createGain();audioMaster.gain.value=audioEnabled?1:0;audioMaster.connect(audioCtx.destination)}if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return true}
 soundToggle.onclick=()=>{audioEnabled=!audioEnabled;soundToggle.setAttribute('aria-pressed',String(audioEnabled));soundToggle.textContent=audioEnabled?'ЗВУК: ВКЛ':'ЗВУК: ВЫКЛ';try{if(audioEnabled)prepareAudio();if(audioMaster)audioMaster.gain.value=audioEnabled?1:0}catch(e){}};
 function sound(f=60,d=.5){if(!audioEnabled)return;try{if(!prepareAudio())return;const ctx=audioCtx,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(22,f*.45),ctx.currentTime+d);g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.04);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+d);o.connect(g).connect(audioMaster);o.start();o.stop(ctx.currentTime+d);o.onended=()=>{o.disconnect();g.disconnect()}}catch(e){}}
 let animating=false;
 const reducedImpact=matchMedia('(prefers-reduced-motion: reduce)');
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function impactTarget(type,side){
  if(type==='ban')return $('dlCentralBans').children[history.filter(move=>move.type==='ban').length];
  return $('dlPicks'+side).children[picked(side).length];
 }
 function flyToSlot(card,slot){
  const from=card.getBoundingClientRect();
  const to=slot?.getBoundingClientRect();
  if(!to||!to.width)return;
  const bound=(value,size)=>Math.min(size-24,Math.max(24,value));
  const x=bound(to.left+to.width/2,innerWidth)-from.left-from.width/2;
  const y=bound(to.top+to.height/2,innerHeight)-from.top-from.height/2;
  const scale=Math.min(.44,Math.max(.12,to.width/from.width));
  card.animate([
   {transform:'none',opacity:1,offset:0},
   {transform:`translate3d(${x*.46}px,${y*.45-36}px,0) rotateY(${x<0?-20:20}deg) scale(.78)`,opacity:.98,offset:.49},
   {transform:`translate3d(${x}px,${y}px,0) rotateX(11deg) scale(${scale})`,opacity:0,offset:1},
  ],{duration:610,easing:'cubic-bezier(.22,.48,.18,1)',fill:'both'});
 }
 async function effect(type,hero,side){
  const stage=$('dlFx');
  const wave=document.createElement('div');
  wave.className='draft-impact-wave';
  const card=document.createElement('figure');
  card.className='draft-impact-card';
  const image=new Image();
  image.alt=hero.name;
  image.addEventListener('error',()=>{image.src=fallbackPortrait(hero)}, {once:true});
  image.src=portrait(hero);
  const caption=document.createElement('figcaption');
  const label=document.createElement('span');
  label.className='draft-impact-kind';
  label.textContent=type==='ban'?'БАН':'ПИК';
  caption.append(label,hero.name);
  card.append(image,caption);
  stage.replaceChildren(wave,card);
  stage.classList.add('draft-impact',type==='ban'?'is-ban':'is-pick');
  stage.setAttribute('aria-hidden','true');
  try{
   if(reducedImpact.matches){
    await pause(220);
    return;
   }
   await pause(1460);
   flyToSlot(card,impactTarget(type,side));
   stage.classList.add('in-flight');
   await pause(630);
  }finally{
   stage.className='dl-fx';
   stage.replaceChildren();
  }
 }
 let coinCleanup=null;
 const coinModel=$('dlCoin');
 const edgeCount=96;
 const edgeFaces=Array.from({length:edgeCount},(_,i)=>{const edge=document.createElement('div');edge.className='dl-coin-edge';edge.setAttribute('aria-hidden','true');coinModel.append(edge);return edge});
 function fitCoin(){const size=coinModel.offsetWidth;if(!size)return;const radius=size/2*Math.cos(Math.PI/edgeCount),half=Math.max(5,size*.028);coinModel.style.setProperty('--coin-half',half+'px');coinModel.style.setProperty('--edge-depth',(2*half+.35)+'px');coinModel.style.setProperty('--edge-width',(size*Math.sin(Math.PI/edgeCount)+.45)+'px');edgeFaces.forEach((edge,i)=>{edge.style.transform=`translate(-50%,-50%) rotateZ(${i*360/edgeCount}deg) translateY(${-radius}px) rotateX(90deg)`})}
 if(typeof ResizeObserver==='function')new ResizeObserver(fitCoin).observe(coinModel);window.addEventListener('resize',fitCoin,{passive:true});
 function cancelCoin(){if(coinCleanup)coinCleanup();coinCleanup=null;flipping=false}
 function begin(){if(animating)return;cancelCoin();for(let side=0;side<2;side++){const roster=$('dlRoster'+side);roster.replaceChildren();document.querySelectorAll('#teamTiny'+side+' .roster-slot:not(.empty) img').forEach(src=>{const fig=document.createElement('figure'),im=new Image(),cap=document.createElement('figcaption');im.src=src.src;im.alt=src.alt;cap.textContent=src.alt;fig.append(im,cap);roster.append(fig)});const from=document.getElementById('portrait'+side);const to=$('dlCap'+side);if(to&&from&&from.src){to.src=from.src;to.alt=side===0?'Макарыч':'Артемон';}}step=0;history=[];selected=null;coinResult=null;flipping=false;$('dlCoin').className='dl-coin';$('dlCoinResult').textContent='Монета определит порядок выбора';$('dlFlip').style.display='';$('dlFlip').disabled=false;$('dlEnter').style.display='none';$('dlSearch').value='';screen('dlCoinScreen');active.classList.add('active');fitCoin();document.body.style.overflow='hidden';$('epicFinal')?.classList.remove('active');}
 window.openDeadlockDraft=begin;

 $('dlFlip').onclick=()=>{
 if(flipping||coinResult!==null)return;flipping=true;
 const random=new Uint32Array(1);if(window.crypto?.getRandomValues)crypto.getRandomValues(random);else random[0]=Math.floor(Math.random()*4294967296);
 const heads=(random[0]&1)===0;coinResult=heads?'heads':'tails';place1=heads?1:0;
 const coin=coinModel,animationName=heads?'dlSpinHeads':'dlSpinTails';coin.className='dl-coin';fitCoin();void coin.offsetWidth;
 $('dlFlip').disabled=true;$('dlCoinResult').textContent='СУДЬБА РЕШАЕТ…';sound(130,.5);
 let timer,finished=false;
 const cleanup=()=>{clearTimeout(timer);coin.removeEventListener('animationend',onEnd);coin.removeEventListener('animationcancel',onEnd)};
 const finish=()=>{if(finished)return;finished=true;cleanup();coinCleanup=null;coin.className='dl-coin '+coinResult;flipping=false;$('dlCoinResult').textContent=heads?'ОРЁЛ! АРТЕМОН — МЕСТО 1':'РЕШКА! МАКАРЫЧ — МЕСТО 1';$('dlFlip').style.display='none';$('dlEnter').style.display='';sound(65,.8)};
 const onEnd=e=>{if(e.target===coin&&e.animationName===animationName)finish()};
 coinCleanup=cleanup;coin.addEventListener('animationend',onEnd);coin.addEventListener('animationcancel',onEnd);coin.classList.add('spinning',coinResult);
 const style=getComputedStyle(coin),ms=v=>parseFloat(v)*(v.trim().endsWith('ms')?1:1000);const total=ms(style.animationDuration)+ms(style.animationDelay);timer=setTimeout(finish,Number.isFinite(total)?Math.max(0,total)+400:5000);
 };
 $('dlEnter').onclick=()=>{if(flipping||coinResult===null)return;screen('dlDraftScreen');update()};$('dlSearch').oninput=renderHeroes;
 $('dlConfirm').onclick=async()=>{if(animating||selected===null||step>=18||history.some(h=>h.id===selected))return;animating=true;const [type,place]=turn(),side=sideOf(place),id=selected;$('dlConfirm').disabled=true;$('dlUndo').disabled=true;$('dlSearch').disabled=true;$('dlPortraitUpload').disabled=true;renderHeroes();try{try{await effect(type,heroes[id],side)}catch(err){console.warn('Эффект пропущен:',err)}history.push({type,side,id,place});step++;selected=null;}finally{animating=false;$('dlSearch').disabled=false;$('dlPortraitUpload').disabled=false;update()}};$('dlUndo').onclick=()=>{if(animating||!history.length)return;history.pop();step--;selected=null;update()};
 $('dlPortraitUpload').onchange=async e=>{if(animating){e.target.value='';return}const file=e.target.files[0];if(selected===null){alert('Сначала выберите героя, затем загрузите его портрет.');e.target.value='';return}if(!file||!file.type.startsWith('image/'))return;const id=selected;const reader=new FileReader();reader.onload=()=>{heroes[id].img=reader.result;if(!animating)update()};reader.readAsDataURL(file);e.target.value=''};
 function showEnd(){ $('dlProgress').style.width='100%';screen('dlEndScreen');const root=$('dlFinalGrid');root.replaceChildren();root.classList.remove('battle-play');for(let side=0;side<2;side++){const card=document.createElement('article');card.className='battle-team side'+side;const captain=new Image();captain.src=$('dlCap'+side).src;captain.className='battle-captain';captain.alt=side?'Артемон':'Макарыч';card.append(captain);const h=document.createElement('h3');h.textContent=side?'АРТЕМОН':'МАКАРЫЧ';card.append(h);const label=document.createElement('h4');label.textContent='КОМАНДА '+(side?'АРТЕМОНА':'МАКАРЫЧА');card.append(label);const roster=document.createElement('div');roster.className='battle-roster';for(const fig of $('dlRoster'+side).children)roster.append(fig.cloneNode(true));card.append(roster);const hl=document.createElement('h4');hl.textContent='ГЕРОИ DEADLOCK';card.append(hl);const grid=document.createElement('div');grid.className='battle-heroes';for(const x of picked(side)){const fig=document.createElement('figure'),img=new Image(),cap=document.createElement('figcaption');img.src=portrait(heroes[x.id]);cap.textContent=heroes[x.id].name;fig.append(img,cap);grid.append(fig)}card.append(grid);root.append(card)}const vs=document.createElement('div');vs.className='battle-vs';vs.textContent='VS';root.append(vs);void root.offsetWidth;root.classList.add('battle-play');sound(50,1)}
 $('dlNew').onclick=begin;$('dlBack').onclick=()=>{active.classList.remove('active');document.body.style.overflow='';document.getElementById('finish')?.classList.add('visible')};
 $('dlExport').onclick=async()=>{
  const button=$('dlExport');if(button.disabled)return;
  const label=button.textContent;button.disabled=true;button.textContent='ПОДГОТОВКА PNG…';
  try{
   const lineup=[...picked(0),...picked(1)].map(item=>heroes[item.id]);
   const tryImage=(src,timeout=3200)=>new Promise(resolve=>{
    if(!src){resolve(null);return}
    const im=new Image();let completed=false;
    const done=ok=>{if(completed)return;completed=true;clearTimeout(timer);im.onload=im.onerror=null;resolve(ok?im:null)};
    const timer=setTimeout(()=>done(false),timeout);
    im.onload=()=>done(true);im.onerror=()=>done(false);im.src=src;
   });
   const loaded=await Promise.all(lineup.map(async h=>{
    const main=await tryImage(portrait(h));
    return main||await tryImage(fallbackPortrait(h),1400);
   }));
   const c=document.createElement('canvas');c.width=1600;c.height=900;
   const g=c.getContext('2d');g.fillStyle='#100c11';g.fillRect(0,0,c.width,c.height);
   const haze=g.createRadialGradient(800,340,60,800,340,900);haze.addColorStop(0,'#522525');haze.addColorStop(1,'#100c11');g.fillStyle=haze;g.fillRect(0,0,1600,900);
   g.textAlign='center';g.fillStyle='#eac489';g.font='bold 62px Georgia';g.fillText('BOBRS BATTLE · DEADLOCK',800,90);
   g.font='29px Georgia';g.fillText('CAPTAIN’S MODE · СОСТАВЫ КОМАНД',800,140);
   for(let side=0;side<2;side++){
    const x=side?860:80;g.textAlign='left';g.fillStyle='#eac489';g.font='bold 46px Georgia';g.fillText(side?'АРТЕМОН':'МАКАРЫЧ',x,215);
    for(let j=0;j<6;j++){
     const pickedHero=picked(side)[j];if(!pickedHero)continue;
     const h=heroes[pickedHero.id],px=x+(j%3)*245,py=240+Math.floor(j/3)*240;
     g.fillStyle=colors[h.id%colors.length];g.fillRect(px,py,220,190);
     const im=loaded[side*6+j];
     if(im){try{g.drawImage(im,px,py,220,140)}catch(err){console.warn('Невозможно отрисовать портрет; используется подложка',err)}}
     g.fillStyle='#120e12';g.fillRect(px,py+140,220,50);
     g.fillStyle='#f8e2b9';g.font='bold 24px Georgia';g.textAlign='center';g.fillText(h.name,px+110,py+171,210);
    }
    g.textAlign='left';g.font='20px Arial';g.fillStyle='#c6a999';
    g.fillText('БАНЫ: '+banned(side).map(x=>heroes[x.id].name).join(', '),x,760,675);
   }
   const png=await new Promise((resolve,reject)=>{try{c.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG недоступен')),'image/png')}catch(err){reject(err)}});
   const url=URL.createObjectURL(png),a=document.createElement('a');a.href=url;a.download='bobrs-deadlock-draft.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
  }catch(err){console.error('PNG export failed',err);alert('Не удалось сохранить PNG: '+err.message)}
  finally{button.textContent=label;button.disabled=false}
 };


})();
