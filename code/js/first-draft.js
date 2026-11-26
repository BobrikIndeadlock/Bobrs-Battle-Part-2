(()=>{'use strict';
const $=id=>document.getElementById(id);
const captains=['Макарыч','Артемон'];
const baseCharacters=[{"id":"preset-1","name":"Мишаня","image":"media/images/mishanya.jpg"},{"id":"preset-2","name":"Стасик","image":"media/images/stasik.jpg"},{"id":"preset-3","name":"Грит","image":"media/images/grit-winner.jpg"},{"id":"preset-4","name":"Аптека","image":"media/images/apteka.jpg"},{"id":"preset-5","name":"Павел король грязнулек","image":"media/images/pavel.jpg"},{"id":"preset-6","name":"Сережа","image":"media/images/serezha.jpg"},{"id":"preset-7","name":"Данечек","image":"media/images/danechek.jpg"},{"id":"preset-8","name":"Дрипсик","image":"media/images/dripsik.jpg"},{"id":"preset-9","name":"Ануар","image":"media/images/anuar.jpg"},{"id":"preset-10","name":"Митя","image":"media/images/mitya.jpg"}];
let available=[],turn=0,state='idle',pair=[],selectedPair=[],teams=[[],[]],captainTurn=0,timerIds=[],duoLock=[null,null];
const randomInt=max=>{const r=new Uint32Array(1);if(crypto?.getRandomValues){crypto.getRandomValues(r);return r[0]%max}return Math.floor(Math.random()*max)};
function shuffle(list){const res=[...list];for(let i=res.length-1;i>0;i--){const j=randomInt(i+1);[res[i],res[j]]=[res[j],res[i]]}return res}
function status(t){$('status').textContent=(state==='idle'&&t.includes('Нажмите на гримуар'))?'':t}
const delay=ms=>new Promise(r=>{let x=setTimeout(r,ms);timerIds.push(x)});
const chronosSealedBack='media/images/chronos-card-back.png';
const duoPairNames=['Грит','Аптека'];
// Approved encounter: the third and fifth successful draft turns offer fixed pairs.
const scriptedPairs={2:['Грит','Сережа'],4:['Аптека','Данечек']};
let scriptedCompleted=new Set();
let chronosSecretPlayed=false;
function randomizeScriptedDuoPicks(){scriptedCompleted.clear()}
function scriptedDuoTarget(){return !scriptedCompleted.has(turn)?scriptedPairs[turn]:null}
function reservedNames(){
 return Object.entries(scriptedPairs).filter(([t])=>Number(t)>turn&&!scriptedCompleted.has(Number(t))).flatMap(([,names])=>names);
}
function swapHiddenCardIntoChosenSlot(clickedId,targetName){
 const selectedIdx=available.findIndex(c=>c.id===clickedId);
 const targetIdx=available.findIndex(c=>c.name===targetName);
 if(selectedIdx<0||targetIdx<0||selectedPair.some(c=>c.id===available[targetIdx].id))return null;
 if(selectedIdx!==targetIdx){
  [available[selectedIdx],available[targetIdx]]=[available[targetIdx],available[selectedIdx]];
  for(const idx of [selectedIdx,targetIdx]){const tile=$('grid').children[idx];if(tile)tile.onclick=()=>tapCard(available[idx].id)}
 }
 return available[selectedIdx].id;
}
function playableCards(){
 const legal=available.filter(c=>!isHeroChainedForCaptain(c,captainTurn));
 // Reserve the final team slot for the remaining duo member if this captain
 // has neither. Otherwise the other captain could be left with an illegal last card.
 if(teams[captainTurn].length===4&&!teams[captainTurn].some(c=>duoPairNames.includes(c.name))){
  const needed=legal.filter(c=>duoPairNames.includes(c.name));
  if(needed.length)return needed;
 }
 return legal;
}
function adjustScriptedHiddenPick(id){
 const clicked=available.find(c=>c.id===id);
 if(!clicked||!playableCards().some(c=>c.id===id)||selectedPair.some(c=>c.id===id))return null;
 const targets=scriptedDuoTarget();
 if(targets){
  const wanted=targets[selectedPair.length];
  return wanted?swapHiddenCardIntoChosenSlot(id,wanted):null;
 }
 const reserved=reservedNames();
 if(!reserved.includes(clicked.name))return id;
 const candidates=playableCards().filter(c=>!reserved.includes(c.name)&&!selectedPair.some(p=>p.id===c.id));
 if(!candidates.length)return null;
 return swapHiddenCardIntoChosenSlot(id,candidates[randomInt(candidates.length)].name);
}

function getCounterpartName(name){return name==='Грит'?'Аптека':name==='Аптека'?'Грит':null}
function isHeroChainedForCaptain(hero,captIndex){return !!hero&&duoLock[captIndex]===hero.name}
function currentCaptainHasPlayableCard(){return available.some(card=>!isHeroChainedForCaptain(card,captainTurn))}
function hideChronosEvent(){const event=$('chronosEvent');event.classList.remove('visible','grayfall','show-figure','rewind-active','rewind-fading');$('chronosText').innerHTML='';event.setAttribute('aria-hidden','true')}
async function typeChronosLine(container,text,delayMs=520,pauseAfter=-1){
 const paragraph=document.createElement('p');
 container.append(paragraph);
 const words=text.trim().split(/\s+/).filter(Boolean);
 for(let i=0;i<words.length;i++){
  if(i>0)paragraph.append(document.createTextNode(' '));
  const span=document.createElement('span');
  span.className='word';
  span.textContent=words[i];
  paragraph.append(span);
  await delay(i===pauseAfter?1500:delayMs);
 }
 return paragraph;
}
async function revealChronosSeal(hero){
 // Show the same red-gold back transforming into the approved Chronos back.
 // This short visual is separate from the real deck, so it cannot leak the hero's face.
 const stage=document.createElement('div');
 stage.className='chronos-seal-reveal';stage.setAttribute('aria-hidden','true');
 const card=document.createElement('div');card.className='seal-card';card.innerHTML=backMarkup();
 const light=document.createElement('div');light.className='seal-light';
 const pulse=document.createElement('div');pulse.className='seal-pulse';
 card.append(light,pulse);stage.append(card);document.body.append(stage);
 try{
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  stage.classList.add('seal-show');
  await delay(850);
  const image=card.querySelector('.card-back-image');
  if(image)image.src=chronosSealedBack;
  stage.classList.add('seal-trigger');
  await delay(1650);
  stage.classList.add('seal-leave');
  await delay(850);
 }finally{stage.remove()}
}
async function playChronosIntervention(captIndex,invalidHero){
 const keptHero=teams[captIndex].find(h=>duoPairNames.includes(h.name)&&h.id!==invalidHero.id) || teams[captIndex].find(h=>duoPairNames.includes(h.name));
 const event=$('chronosEvent');
 hideChronosEvent();
 state='cutscene';
 status('Нарушено древнее правило…');
 $('book').disabled=true;
 $('grid').querySelectorAll('.tile').forEach(card=>card.disabled=true);
 event.setAttribute('aria-hidden','false');
 event.classList.add('visible','grayfall');
 await delay(4900);
 event.classList.add('show-figure');
 await delay(1900);
 const box=$('chronosText');
 box.innerHTML='';
 await typeChronosLine(box,'Жалкое насекомое, ты и правда думал что я позволю тебе взять их обоих?',340,1);
 await delay(1200);
 await typeChronosLine(box,'Развлеките меня как подобает смертным.',460);
 await delay(2900);
 event.classList.remove('show-figure');
 event.classList.add('rewind-active');
 await delay(4800);
 event.classList.add('rewind-fading');
 await delay(1100);
 hideChronosEvent();
 const removeIndex=teams[captIndex].findIndex(h=>h.id===invalidHero.id);
 if(removeIndex!==-1)teams[captIndex].splice(removeIndex,1);
 available=shuffle([...available,invalidHero]);
 duoLock[captIndex]=invalidHero.name;
 await revealChronosSeal(invalidHero);
 captainUpdate();
 status('Время отмотано назад · Кронос запечатал карту «'+invalidHero.name+'» для '+currentName());
 state='shuffling';
 return keptHero;
}
function skipBlockedTurnIfNeeded(){
 if(state!=='choose')return false;
 if(currentCaptainHasPlayableCard())return false;
 const blockedName=duoLock[captainTurn];
 status('Карта «'+blockedName+'» запечатана Кроносом для '+currentName()+' · ход переходит дальше');
 turn++;
 captainUpdate();
 displayGrid();
 return true;
}

function captainUpdate(){captainTurn=turn%2;for(let i=0;i<2;i++){$('chrono84-'+i).classList.toggle('mark-active',!!duoLock[i]&&state!=='idle'&&state!=='done');}$('scene').dataset.paletteSide=state==='idle'||state==='done'?'':String(captainTurn);$('compare').dataset.paletteSide=String(captainTurn);for(let i=0;i<2;i++){let c=$('cap'+i);c.classList.toggle('active',state!=='idle'&&state!=='done'&&captainTurn===i);c.classList.toggle('dim',state!=='idle'&&state!=='done'&&captainTurn!==i);$('capCount'+i).textContent=teams[i].length+' / 5';const roster=$('teamTiny'+i);roster.hidden=state==='idle';const previous=new Map([...roster.children].map(el=>[el.dataset.hero,el]));const slots=Array.from({length:5},(_,j)=>{const hero=teams[i][j];if(!hero){const el=document.createElement('div');el.className='roster-slot empty';el.textContent='◇';return el}const key=String(hero.id);if(previous.has(key))return previous.get(key);const el=document.createElement('div');el.className='roster-slot roster-arrive';el.dataset.hero=key;const image=new Image();image.className='team-badge';image.src=hero.image;image.alt=hero.name;const name=document.createElement('span');name.textContent=hero.name;el.append(image,name);return el});roster.replaceChildren(...slots)}}
function backMarkup(){return '<div class="face card-back-face"><img class="card-back-image" src="media/images/draft-card-back.png" alt="" draggable="false"></div>'}
function displayGrid(){const grid=$('grid');grid.replaceChildren();for(let i=0;i<available.length;i++){const c=available[i];const blocked=isHeroChainedForCaptain(c,captainTurn);const b=document.createElement('button');b.type='button';b.className='tile'+(available.length===1?' legendary':'')+(blocked?' chronos-sealed':'');b.setAttribute('aria-label',blocked?('Карта '+c.name+' запечатана Кроносом'):('Закрытая карта '+(i+1)));b.innerHTML=backMarkup();if(blocked){const image=b.querySelector('.card-back-image');if(image)image.src=chronosSealedBack;}b.style.animationDelay=(i*.038)+'s';b.onclick=()=>tapCard(c.id);b.disabled=state!=='choose'||!playableCards().some(card=>card.id===c.id);if(blocked){b.title='Кронос запечатал эту карту. Она недоступна для '+currentName();b.setAttribute('aria-disabled','true')}grid.append(b)}}
function currentName(){return captains[captainTurn]}
function waitForOrbArrival(orb,fallbackMs){
 return new Promise(resolve=>{
  if(!orb){resolve();return}
  let complete=false,timer=null;
  const onEnd=e=>{if(e.target===orb&&(e.animationName==='ritualOrbFlight'||e.animationName==='hellSparkFlight'))finish()};
  const finish=()=>{if(complete)return;complete=true;clearTimeout(timer);orb.removeEventListener('animationend',onEnd);resolve()};
  orb.addEventListener('animationend',onEnd);
  timer=setTimeout(finish,fallbackMs);
 });
}
async function handoffSummonSequence(fx,grid){
 let flash=null;
 try{
  // Display the flash in its own composited frame, before changing cards.
  flash=document.createElement('div');
  flash.className='summon-impact-flash bobrs-force-flash';
  flash.setAttribute('aria-hidden','true');
  document.body.append(flash);
  void flash.offsetWidth;
  flash.classList.add('bobrs-flash-on');
  await delay(190);
  // Deal while the screen is opaque: no abrupt jump from sparks to cards.
  fx.replaceChildren();fx.classList.remove('summon-charged');
  state='choose';
  displayGrid();
  grid.querySelectorAll('.tile').forEach(card=>{card.disabled=false;card.removeAttribute('aria-disabled')});
  captainUpdate();
  status('Ход '+currentName()+' · нажмите на две закрытые карты');
  flash.classList.remove('bobrs-flash-on');flash.classList.add('bobrs-flash-off');
  await delay(590);
 }catch(err){console.error('Bobrs summon handoff:',err)}
 finally{
  flash?.remove();fx.replaceChildren();fx.classList.remove('summon-charged');
  if(state==='summoning')state='choose';
  if(grid.children.length!==available.length)displayGrid();
  grid.querySelectorAll('.tile').forEach(card=>{card.disabled=false;card.removeAttribute('aria-disabled')});
  captainUpdate();
  if(state==='choose'){status('Ход '+currentName()+' · нажмите на две закрытые карты');skipBlockedTurnIfNeeded();}
 }
}
async function summon(){
 if(state!=='idle')return;
 state='summoning';
 $('book').disabled=true;
 available=shuffle(baseCharacters).slice(0,10);
 teams=[[],[]];turn=0;selectedPair=[];pair=[];duoLock=[null,null];chronosSecretPlayed=false;hideChronosEvent();randomizeScriptedDuoPicks();
 captainUpdate();
 status('Гримуар пробуждается…');
 const fx=$('fx'),grid=$('grid');
 fx.replaceChildren();fx.classList.remove('summon-charged');grid.replaceChildren();
 const scene=$('scene').getBoundingClientRect(),bounds=$('center').getBoundingClientRect();
 const total=10,flight=2400,interval=180,afterLastOrbDelay=1300;
 let lastOrb=null;
 try{
  // Compute ten distinct 5x2 endpoints and render them all before the flight begins.
  const fragment=document.createDocumentFragment();
  for(let i=0;i<total;i++){
   const orb=document.createElement('div');
   orb.className='orb bobrs-summon-orb';
   orb.dataset.orbNumber=String(i+1);
   orb.setAttribute('aria-hidden','true');
   orb.style.animationDuration=flight+'ms';
   const col=i%5,row=Math.floor(i/5);
   const x=bounds.left+(col+.5)*bounds.width/5-scene.left;
   const y=bounds.top+(row+.5)*bounds.height/2-scene.top;
   const dx=x-scene.width*.5,dy=y-scene.height*.88;
   orb.style.setProperty('--dx',dx+'px');
   orb.style.setProperty('--dy',dy+'px');
   orb.style.setProperty('--dx20',(dx*.2)+'px');
   orb.style.setProperty('--dx70',(dx*.7)+'px');
   orb.style.setProperty('--dy27',(dy*.27)+'px');
   orb.style.setProperty('--dy70',(dy*.7)+'px');
   orb.style.setProperty('--lean',((col-2)*6)+'deg');
   orb.style.setProperty('--curve',((col-2)*18)+'px');
   orb.style.setProperty('--flickerDelay',(-i*.13)+'s');
   orb.style.animationDelay=(i*interval)+'ms';
   const tail=document.createElement('span');tail.className='hell-tail';orb.append(tail);
   const wake=document.createElement('span');wake.className='summon-wake';orb.append(wake);
   const halo=document.createElement('span');halo.className='summon-halo';orb.append(halo);
   for(let j=0;j<2;j++){
    const ember=document.createElement('i');ember.className='hell-ember';
    ember.style.setProperty('--ex',((j?1:-1)*(13+j*9))+'px');
    ember.style.setProperty('--ey',(-(34+j*20))+'px');
    ember.style.setProperty('--delay',(-j*.17)+'s');
    ember.style.setProperty('--t',(.7+j*.15)+'s');
    ember.style.setProperty('--s',(3+j*2)+'px');
    orb.append(ember);
   }
   fragment.append(orb);
   if(i===total-1)lastOrb=orb;
  }
  // Attach last-orb completion listener before starting animations.
  fx.append(fragment);
  const arrived=waitForOrbArrival(lastOrb,flight+(total-1)*interval+250);
  await arrived;
  fx.classList.add('summon-charged');
  status('Все десять огней заняли свои места…');
  await delay(afterLastOrbDelay);
 }catch(err){console.error('Bobrs summon animation:',err)}
 await handoffSummonSequence(fx,grid);
}

function tapCard(id){
 if(state!=='choose'||selectedPair.some(x=>x.id===id))return;
 id=adjustScriptedHiddenPick(id);
 if(!id||selectedPair.some(x=>x.id===id))return;
 if(playableCards().length===1){
  const c=playableCards()[0];state='last';captainUpdate();
  const tile=$('grid').children[available.findIndex(x=>x.id===c.id)];
  if(tile){tile.classList.add('legendary','arcane-picked');}
  showCompare([c],true);return;
 }
 const chosen=available.find(c=>c.id===id);if(!chosen)return;
 selectedPair.push(chosen);
 const idx=available.findIndex(c=>c.id===id),tile=$('grid').children[idx];
 if(tile){tile.disabled=true;tile.classList.add('arcane-picked');tile.style.setProperty('--pick-order',selectedPair.length)}
 if(selectedPair.length===2){
  if(scriptedDuoTarget())scriptedCompleted.add(turn);
  state='preview';captainUpdate();
  $('scene').classList.add('arcane-choosing');
  status('Две карты выбраны · пробуждение карт судьбы…');
  setTimeout(()=>showCompare([...selectedPair],false),380);
 }else status('Выбрана первая карта · выберите вторую');
}
async function ensureCompareStageFx(){const panel=$('compare');let fx=panel.querySelector('.compare-stage-fx');if(!fx){fx=document.createElement('div');fx.className='compare-stage-fx';fx.innerHTML='<div class="compare-halo"></div><div class="compare-halo-two"></div><div class="compare-runes"></div><div class="compare-flash-layer"></div>';panel.prepend(fx)}return fx}
async function showCompare(cards,last){
 try{return await revealCompare(cards,last)}catch(err){console.warn('Card reveal recovered:',err);if(state!=='preview'&&state!=='last')return;const panel=$('compare'),container=$('compareCards');pair=cards;container.replaceChildren();for(const c of cards){const b=document.createElement('button');b.type='button';b.className='reveal-card arcane-live arcane-settled flipped arcane-choice-ready';b.dataset.cardId=String(c.id);b.innerHTML=`<div class="arcane-aura"></div><div class="flip-core"><div class="flip-side front">${backMarkup()}</div><div class="flip-side back"><img alt=""></div></div><div class="arcane-rim"></div><div class="arcane-name">${c.name}</div>`;const im=b.querySelector('.flip-side.back img');im.src=c.image;im.alt=c.name;b.onclick=()=>choose(c.id);container.append(b)}panel.classList.remove('arcane-flare','arcane-resolving');panel.classList.add('visible','arcane-cinematic','arcane-ready','arcane-selectable');$('choiceHint').textContent='Выберите персонажа для команды '+currentName();}
}
async function revealCompare(cards,last){
 pair=cards;
 const panel=$('compare'),container=$('compareCards');
 ensureCompareStageFx();
 const origins=cards.map(c=>{const i=available.findIndex(a=>a.id===c.id),el=$('grid').children[i];return el?el.getBoundingClientRect():null});
 panel.classList.remove('arcane-ready','arcane-flare','arcane-selectable','arcane-resolving');
 panel.classList.add('visible','arcane-cinematic');
 container.replaceChildren();
 $('compareTitle').textContent=last?(available.length===1?'ПОСЛЕДНЯЯ КАРТА · ЛЕГЕНДАРНАЯ':'ЕДИНСТВЕННАЯ ДОСТУПНАЯ КАРТА'):'ДВЕ КАРТЫ СУДЬБЫ';
 $('choiceHint').textContent=last?'Легендарная карта поднимается из колоды…':'Карты вырываются из алтаря…';
 cards.forEach((c,i)=>{
  const b=document.createElement('button');
  b.className='reveal-card arcane-arriving';
  b.dataset.cardId=String(c.id);
  b.type='button';
  b.disabled=true;
  b.innerHTML=`<div class="arcane-aura"></div><div class="flip-core"><div class="flip-side front">${backMarkup()}</div><div class="flip-side back"><img alt=""></div></div><div class="arcane-rim"></div><div class="arcane-name">${c.name}</div>`;
  b.querySelector('.flip-side.back img').src=c.image;
  b.querySelector('.flip-side.back img').alt=c.name;
  b.setAttribute('aria-label',c.name);
  b.onclick=()=>choose(c.id);
  container.append(b);
 });
 await Promise.race([new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),new Promise(r=>setTimeout(r,220))]);
 const buttons=[...container.children];
 const arrivalAnimations=[];
 buttons.forEach((b,i)=>{b.classList.add('arcane-live');const source=origins[i],target=b.getBoundingClientRect();if(!source)return;const x=source.left+source.width/2-(target.left+target.width/2);const y=source.top+source.height/2-(target.top+target.height/2);const sx=Math.max(.12,source.width/target.width),sy=Math.max(.12,source.height/target.height);try{if(typeof b.animate==='function')arrivalAnimations.push(b.animate([
   {transform:`translate(${x}px,${y}px) scale(${sx},${sy}) rotate(${i?9:-9}deg)`,filter:'brightness(.72) saturate(.8)',opacity:.12},
   {offset:.42,transform:`translate(${x*.22}px,${y*.26-46}px) scale(.88) rotate(${i?-6:6}deg)`,filter:'brightness(1.5) saturate(1.12)',opacity:1},
   {offset:.72,transform:`translate(${x*.08}px,${y*.08-16}px) scale(1.06) rotate(${i?-2:2}deg)`,filter:'brightness(1.18) saturate(1.02)',opacity:1},
   {transform:'translate(0,0) scale(1) rotate(0deg)',filter:'brightness(1) saturate(1)',opacity:1}
  ],{duration:last?1450:1600,delay:i*190,easing:'cubic-bezier(.16,.78,.18,1)',fill:'both'}))}catch(err){console.warn('Card arrival skipped',err);b.classList.add('arcane-settled')}});
 await delay(last?1700:1880);
 // Release the completed entrance animation so later CSS animations control the cards.
 buttons.forEach(b=>b.classList.add('arcane-settled'));
 arrivalAnimations.forEach(a=>{try{a.cancel()}catch(err){}});
 if(!panel.classList.contains('visible'))return;
 $('choiceHint').textContent=last?'Последняя печать трескается…':'Магические печати разрушаются…';
 panel.classList.add('arcane-flare');
 buttons.forEach((b,i)=>{setTimeout(()=>b.classList.add('arcane-preflip'),i*130);setTimeout(()=>b.classList.add('flipped'),last?240:i*420+320)});
 await delay(last?1320:2050);
 if(!panel.classList.contains('visible'))return;
 panel.classList.remove('arcane-flare');
 panel.classList.add('arcane-ready','arcane-selectable');
 buttons.forEach(b=>{b.disabled=false;b.classList.remove('arcane-arriving','arcane-preflip');b.classList.add('arcane-choice-ready')});
 $('choiceHint').innerHTML=last?'Нажмите на <strong>легендарного героя</strong>':'Выберите <strong>одного персонажа</strong> для команды '+currentName();

}
async function cinematicDeckShuffle(beforeRemoval){
 const grid=$('grid'),source=[...grid.children];
 const remaining=available.map(card=>source[beforeRemoval.findIndex(old=>old.id===card.id)]).filter(Boolean);
 const sourceRects=remaining.map(el=>el.getBoundingClientRect());
 const gridRect=grid.getBoundingClientRect();
 const count=available.length;
 const pileX=gridRect.left+gridRect.width/2,pileY=gridRect.top+gridRect.height/2;
 const layer=document.createElement('div');layer.className='bobrs-shuffle-layer';layer.setAttribute('aria-hidden','true');
 const glow=document.createElement('div');glow.className='bobrs-shuffle-light';layer.append(glow);
 const cards=[];
 try{
  // Ghost cards inherit the existing card-back design, but don't touch the real game state.
  for(let i=0;i<count;i++){
   const r=sourceRects[i];if(!r)continue;
   const clone=document.createElement('div');clone.className='bobrs-shuffle-card';
   clone.style.left=r.left+'px';clone.style.top=r.top+'px';clone.style.width=r.width+'px';clone.style.height=r.height+'px';
   clone.innerHTML=backMarkup();clone.style.zIndex=String(2+i);
   layer.append(clone);cards.push({clone,rect:r,i});
  }
  document.body.append(layer);
  grid.classList.add('bobrs-grid-shuffling');
  grid.style.opacity='0';
  grid.style.pointerEvents='none';
  // Shuffle the logical deck while the old backs fly through the animation.
  available=shuffle(available);
  displayGrid();
  const targets=[...grid.children].map(el=>el.getBoundingClientRect());
  status('Карты собираются в зачарованную колоду…');
  const totalMs=2650;
  for(const {clone,rect:r,i} of cards){
   const target=targets[i%targets.length]||r;
   const sx=r.left+r.width/2,sy=r.top+r.height/2;
   const ex=target.left+target.width/2,ey=target.top+target.height/2;
   const tx=pileX-sx,ty=pileY-sy;
   const dx=ex-sx,dy=ey-sy;
   const wobble=(i%2?1:-1),rotation=(i*31)%105;
   const radius= Math.min(56,gridRect.width*.11);
   const circle1X=tx+Math.cos(i*2.399)*radius;
   const circle1Y=ty+Math.sin(i*2.399)*radius*.45;
   const circle2X=tx-Math.cos(i*2.399)*radius*.8;
   const circle2Y=ty-Math.sin(i*2.399)*radius*.6;
   if(typeof clone.animate==='function'){
    clone.animate([
     {offset:0,transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1},
     {offset:.27,transform:`translate(${tx}px,${ty}px) rotate(${wobble*(8+i*3)}deg) scale(.86)`,opacity:1},
     {offset:.47,transform:`translate(${circle1X}px,${circle1Y}px) rotate(${wobble*(115+rotation)}deg) scale(.82)`,opacity:1},
     {offset:.64,transform:`translate(${circle2X}px,${circle2Y}px) rotate(${wobble*(245+rotation)}deg) scale(.85)`,opacity:1},
     {offset:.77,transform:`translate(${tx}px,${ty}px) rotate(${wobble*360}deg) scale(.81)`,opacity:1},
     {offset:1,transform:`translate(${dx}px,${dy}px) rotate(${wobble*360}deg) scale(1)`,opacity:1}
    ],{duration:totalMs,delay:i*24,easing:'cubic-bezier(.34,.04,.23,1)',fill:'both'});
   }else{
    clone.style.transition='transform 1.7s cubic-bezier(.2,.65,.25,1)';
    clone.style.transform=`translate(${dx}px,${dy}px)`;
   }
  }
  await delay(820);
  status('Магия перемешивает колоду…');
  await delay(950);
  status('Карты возвращаются на алтарь…');
  await delay(1100);
 }catch(err){console.error('Bobrs deck shuffle:',err);if(grid.children.length!==available.length)displayGrid()}
 finally{
  layer.remove();grid.classList.remove('bobrs-grid-shuffling');grid.style.opacity='';grid.style.pointerEvents='';
 }
}
async function choose(id){
 if(state!=='preview'&&state!=='last')return;
 const hero=pair.find(c=>c.id===id);if(!hero||teams[captainTurn].length>=5||isHeroChainedForCaptain(hero,captainTurn))return;
 const choosingCaptain=captainTurn;
 const panel=$('compare');
 const compareButtons=[...$('compareCards').querySelectorAll('button.reveal-card')];
 const chosenBtn=compareButtons.find(b=>b.dataset.cardId===String(id));
 if(!panel.classList.contains('arcane-selectable')||!chosenBtn||chosenBtn.disabled)return;
 state='resolving';
 compareButtons.forEach(b=>b.disabled=true);
 $('choiceHint').textContent=hero.name+' отправляется к '+captains[choosingCaptain];
 compareButtons.forEach(b=>{
  const selected=b===chosenBtn;
  b.classList.toggle('selected-for-captain',selected);
  b.classList.toggle('rejected-by-captain',!selected);
 });
 panel.classList.remove('arcane-selectable');
 panel.classList.add('arcane-resolving','arcane-flare');
 await delay(820);
 $('compare').classList.remove('visible','arcane-cinematic','arcane-ready','arcane-flare','arcane-selectable','arcane-resolving');
 $('scene').classList.remove('arcane-choosing');
 teams[choosingCaptain].push(hero);available=available.filter(c=>c.id!==id);selectedPair=[];
 captainUpdate();
 const captainDuo=teams[choosingCaptain].filter(member=>duoPairNames.includes(member.name));
 if(captainDuo.length>=2){
   status('Древнее правило нарушено…');
   await delay(3700);
   await playChronosIntervention(choosingCaptain,hero);
   // Rewound selection does not consume the captain's turn.
 }else turn++;
 if(!available.length){state='done';captainUpdate();showFinish();return}
 state='shuffling';captainUpdate();status('Оставшиеся карты собираются в колоду…');let grid=$('grid');const oldTiles=[...grid.children],gridRect=grid.getBoundingClientRect();const pileX=gridRect.left+gridRect.width/2,pileY=gridRect.top+gridRect.height/2;oldTiles.forEach((el,i)=>{const rect=el.getBoundingClientRect();el.style.animation='none';el.style.transition='transform .65s cubic-bezier(.4,0,.2,1),opacity .6s';el.style.zIndex=String(i+1);el.style.transform=`translate(${pileX-(rect.left+rect.width/2)}px,${pileY-(rect.top+rect.height/2)}px) scale(.76) rotate(${(i%2?1:-1)*(8+i*3)}deg)`;el.style.opacity='.95'});await delay(690);status('Колода перемешивается…');oldTiles.forEach((el,i)=>{el.style.transition='transform .2s ease-in-out';el.style.transform+=` rotate(${(i%2?1:-1)*85}deg)`});await delay(260);available=shuffle(available);displayGrid();[...grid.children].forEach((el,i)=>{const rr=el.getBoundingClientRect();el.style.animation='none';el.style.transition='none';el.style.opacity='.7';el.style.transform=`translate(${pileX-(rr.left+rr.width/2)}px,${pileY-(rr.top+rr.height/2)}px) scale(.75) rotate(${(i-5)*12}deg)`});void grid.offsetWidth;[...grid.children].forEach((el,i)=>{el.style.transition=`transform .65s cubic-bezier(.16,.75,.3,1) ${i*35}ms, opacity .5s ${i*35}ms`;el.style.transform='translate(0,0) scale(1) rotate(0deg)';el.style.opacity='1'});await delay(1020);if(!chronosSecretPlayed&&teams[0].length+teams[1].length===9&&available.length===1){chronosSecretPlayed=true;state='cutscene';displayGrid();try{await window.playChronosSecret91()}catch(err){console.error('Chronos secret:',err)}}state='choose';captainUpdate();displayGrid();status('Ход '+currentName()+(playableCards().length===1?' · нажмите на доступную карту':' · нажмите на две закрытые карты'));skipBlockedTurnIfNeeded()}
let vsFinishToken=0;
function skipVsIntro(){const finish=$('finish');finish.classList.add('vs-intro','vs-armies','vs-ready');finish.querySelectorAll('.vs-small-card,.vs-team').forEach(el=>{el.style.animation='none';el.style.opacity='1';el.style.transform='none';el.style.filter='none'});finish.querySelectorAll('.vs-captain,.vs-mark,.vs-headline').forEach(el=>{el.style.animation='none';el.style.opacity='1';el.style.transform='none';el.style.filter='none'});vsFinishToken++}
function showFinish(){
 status('Драфт завершён · ПРОТИВОСТОЯНИЕ');
 const box=$('finalTeams'),finish=$('finish');
 vsFinishToken++;
 const myToken=vsFinishToken;
 finish.classList.remove('vs-intro','vs-armies','vs-ready');
 finish.querySelectorAll('.vs-captain,.vs-mark,.vs-headline,.vs-team,.vs-small-card').forEach(el=>{el.style.removeProperty('animation');el.style.removeProperty('opacity');el.style.removeProperty('transform');el.style.removeProperty('filter')});
 $('vsCaptain0').src=$('portrait0').src;
 $('vsCaptain1').src=$('portrait1').src;
 box.replaceChildren();
 teams.forEach((members,i)=>{
  const block=document.createElement('section');block.className='vs-team';
  const title=document.createElement('h2');title.className='vs-team-heading';title.textContent='КОМАНДА '+captains[i].toUpperCase();
  const row=document.createElement('div');row.className='vs-small-cards';
  members.forEach((c,j)=>{const wrap=document.createElement('div');wrap.className='vs-small-card';wrap.style.setProperty('--reveal-delay',(j*.39+i*.17)+'s');const img=new Image();img.src=c.image;img.alt=c.name;img.title=c.name;img.loading='eager';wrap.append(img);row.append(wrap)});
  block.append(title,row);box.append(block);
 });
 const movie=$('movieFinal'),video=$('movieVideo'); movie.className='active'; video.currentTime=0; $('moviePlay').style.display='none'; video.play().catch(()=>{$('moviePlay').style.display='block'});
}
function showMoviePoster(){const m=$('movieFinal');if(!m.classList.contains('active'))return;$('movieVideo').pause();m.classList.add('poster');$('moviePlay').style.display='none'}
$('movieVideo').onended=showMoviePoster;$('movieVideo').onerror=showMoviePoster;$('movieSkip').onclick=showMoviePoster;$('moviePlay').onclick=()=>{$('movieVideo').play().then(()=>{$('moviePlay').style.display='none'}).catch(()=>{})};$('movieContinue').onclick=()=>{$('movieFinal').className='';$('finish').classList.add('visible');skipVsIntro()};$('vsSkip').onclick=skipVsIntro;
function reset(){$('movieVideo').pause();$('movieFinal').className='';vsFinishToken++;$('finish').classList.remove('visible','vs-intro','vs-armies','vs-ready');$('compare').classList.remove('visible','arcane-cinematic','arcane-ready','arcane-flare','arcane-selectable','arcane-resolving');$('scene').classList.remove('arcane-choosing');$('fx').replaceChildren();hideChronosEvent();available=[];teams=[[],[]];selectedPair=[];turn=0;state='idle';duoLock=[null,null];chronosSecretPlayed=false;$('book').disabled=false;$('grid').replaceChildren();captainUpdate();status('Нажмите на гримуар, чтобы призвать десять карт')}
$('book').onclick=summon;$('restart').onclick=reset;captainUpdate();status('Нажмите на гримуар, чтобы призвать десять карт');
window.BobrsNewDraft={restart:reset,phase:()=>state,teams:()=>teams.map(t=>[...t])};

})();