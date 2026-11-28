(()=>{'use strict';
const $=id=>document.getElementById(id);
const { captains, movie: filmSource } = window.BobrsSeason;
const baseCharacters=[{"id":"preset-1","name":"Макарыч","image":"media/cards/makarych.png"},{"id":"preset-2","name":"Стасик","image":"media/cards/stasik.png"},{"id":"preset-3","name":"Грит","image":"media/cards/grit.png"},{"id":"preset-4","name":"Аптека","image":"media/cards/apteka.png"},{"id":"preset-5","name":"Артемон","image":"media/cards/artemon.png"},{"id":"preset-6","name":"Сережа","image":"media/cards/serezha.png"},{"id":"preset-7","name":"Данечек","image":"media/cards/danechek.png"},{"id":"preset-8","name":"Дрипсик","image":"media/cards/dripsik.png"},{"id":"preset-9","name":"Ануар","image":"media/cards/anuar.png"},{"id":"preset-10","name":"Митя","image":"media/cards/mitya.png"}];
let available=[],turn=0,state='idle',pair=[],selectedPair=[],teams=[[],[]],captainTurn=0;
const randomInt=max=>{const r=new Uint32Array(1);if(crypto?.getRandomValues){crypto.getRandomValues(r);return r[0]%max}return Math.floor(Math.random()*max)};
function shuffle(list){const res=[...list];for(let i=res.length-1;i>0;i--){const j=randomInt(i+1);[res[i],res[j]]=[res[j],res[i]]}return res}
function status(t){$('status').textContent=(state==='idle'&&t.includes('Нажмите на гримуар'))?'':t}
let draftController=new AbortController();
function delay(ms,signal){
 return new Promise(resolve=>{
  if(signal.aborted){resolve(false);return}
  const timer=setTimeout(()=>{
   signal.removeEventListener('abort',cancel);
   resolve(true);
  },ms);
  function cancel(){clearTimeout(timer);resolve(false)}
  signal.addEventListener('abort',cancel,{once:true});
 });
}
function nextPaint(signal){
 return new Promise(resolve=>{
  if(signal.aborted){resolve(false);return}
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>finish(true))});
  const timeout=setTimeout(()=>finish(true),220);
  const cancel=()=>finish(false);
  function finish(ready){
   clearTimeout(timeout);
   cancelAnimationFrame(frame);
   signal.removeEventListener('abort',cancel);
   resolve(ready);
  }
  signal.addEventListener('abort',cancel,{once:true});
 });
}
const duoPairNames=['Грит','Аптека'];
let scriptedPairs={};
const scriptedCompleted=new Set();
let exchangeSeat=null;
function randomizeScriptedDuoPicks(){
 const first=randomInt(duoPairNames.length);
 scriptedPairs={2:[duoPairNames[first],'Сережа'],4:[duoPairNames[1-first],'Данечек']};
 scriptedCompleted.clear();
}
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
function adjustScriptedHiddenPick(id){
 const clicked=available.find(c=>c.id===id);
 if(!clicked||!available.some(c=>c.id===id)||selectedPair.some(c=>c.id===id))return null;
 const targets=scriptedDuoTarget();
 if(targets){
  const wanted=targets[selectedPair.length];
  return wanted?swapHiddenCardIntoChosenSlot(id,wanted):null;
 }
 const reserved=reservedNames();
 if(!reserved.includes(clicked.name))return id;
 const candidates=available.filter(c=>!reserved.includes(c.name)&&!selectedPair.some(p=>p.id===c.id));
 if(!candidates.length)return null;
 return swapHiddenCardIntoChosenSlot(id,candidates[randomInt(candidates.length)].name);
}

function getCounterpartName(name){return name==='Грит'?'Аптека':name==='Аптека'?'Грит':null}
function draftIds(){
 return teams.map(team=>team.map(card=>card.id));
}
function enableLastCard(){
 exchangeSeat=null;
 state='choose';
 captainUpdate();
 displayGrid();
 status('Ход '+currentName()+' · нажмите на последнюю карту');
 $('grid').querySelector('button')?.focus({preventScroll:true});
}
async function settleChronos(kind, decision){
 if(state!=='chronos'||!['exchange','decline'].includes(kind))return;
 const seats=draftIds();
 if(kind==='exchange'&&!window.chronosRules.validSwap(seats,exchangeSeat,decision))return;
 if(kind==='decline'&&decision!==undefined)return;
 const signal=draftController.signal;
 state='chronos-resolving';
 const side=exchangeSeat;
 const indexes=decision?.map((id,index)=>seats[index===0?side:1-side].indexOf(id));
 let applied=false;
 const update=()=>{
  if(applied||!indexes||signal.aborted)return;
  applied=true;
  const [left,right]=indexes;
  [teams[side][left],teams[1-side][right]]=[teams[1-side][right],teams[side][left]];
  captainUpdate();
 };
 try{
  await window.chronosCinema.finish(decision,update,signal);
 }catch(error){
  if(!signal.aborted)console.warn('Chronos exchange presentation interrupted:',error);
 }
 if(!signal.aborted){
  update();
  window.chronosCinema.close();
  enableLastCard();
 }
}
function showChronosExchange(){
 window.chronosCinema.exchange({
  teams, captains, side:exchangeSeat,
  submit:settleChronos, allowed:()=>state==='chronos',
 });
}

function renderRoster(roster, members){
 for(let index=0;index<5;index++){
  const hero=members[index];
  let slot=roster.children[index];
  if(!slot){
   slot=document.createElement('div');
   roster.append(slot);
  }
  const key=hero?String(hero.id):'';
  if(slot.dataset.hero===key)continue;
  slot.dataset.hero=key;
  slot.className=hero?'roster-slot roster-arrive':'roster-slot empty';
  slot.title=hero?.name??'';
  slot.replaceChildren();
  if(hero){
   const image=new Image();
   image.className='team-badge';
   image.src=hero.image;
   image.alt=hero.name;
   const name=document.createElement('span');
   name.textContent=hero.shortName??hero.name;
   slot.append(image,name);
  }
 }
}
const rosterMotion=matchMedia('(prefers-reduced-motion: reduce)');
function renderCount(counter, count){
 const label=count+' / 5';
 if(counter.textContent===label&&counter.firstElementChild)return;
 const value=document.createElement('span');
 value.textContent=label;
 counter.replaceChildren(value);
 if(state!=='idle'&&!rosterMotion.matches){
  value.animate([
   {opacity:.4,transform:'translateY(.28em)'},
   {opacity:1,transform:'none'},
  ],{duration:360,easing:'ease-out'});
 }
}
function captainUpdate(){
 captainTurn=turn%2;
 const choosing=state!=='idle'&&state!=='done';
 $('scene').dataset.paletteSide=choosing?String(captainTurn):'';
 $('compare').dataset.paletteSide=String(captainTurn);
 for(let side=0;side<2;side++){
  const captain=$('cap'+side);
  captain.classList.toggle('active',choosing&&captainTurn===side);
  captain.classList.toggle('dim',choosing&&captainTurn!==side);
  renderCount($('capCount'+side),teams[side].length);
  const roster=$('teamTiny'+side);
  roster.hidden=state==='idle';
  renderRoster(roster,teams[side]);
 }
}
function backMarkup(){return '<div class="face card-back-face"><img class="card-back-image" src="media/images/draft-card-back.png" alt="" draggable="false"></div>'}
function displayGrid(){
 const grid=$('grid');
 grid.replaceChildren();
 available.forEach((card,index)=>{
  const tile=document.createElement('button');
  tile.type='button';
  tile.className=available.length===1?'tile legendary':'tile';
  tile.setAttribute('aria-label','Закрытая карта '+(index+1));
  tile.innerHTML=backMarkup();
  tile.style.animationDelay=(index*.038)+'s';
  tile.onclick=()=>tapCard(card.id);
  tile.disabled=state!=='choose';
  grid.append(tile);
 });
}
function currentName(){return captains[captainTurn].name}
async function summon(){
 if(state!=='idle')return;
 const controller=new AbortController();
 summonController=controller;
 const bookVisual=window.grimoireVisual?.begin();
 state='summoning';
 $('book').disabled=true;
 available=shuffle(baseCharacters).slice(0,10);
 teams=[[],[]];turn=0;selectedPair=[];pair=[];exchangeSeat=null;randomizeScriptedDuoPicks();
 captainUpdate();
 status('Гримуар пробуждается…');

 const fx=$('fx'),grid=$('grid');
 grid.classList.add('summon-preparing');
 displayGrid();
 for(const card of grid.children)card.classList.add('summoned-tile');
 try{
  await summoningRitual.play({
   scene:$('scene'),grid,layer:fx,signal:controller.signal,
   onBookFrame:bookVisual?.update,
   onCharge:()=>status('Все десять огней заняли свои места…'),
   onReveal:()=>{
    grid.classList.replace('summon-preparing','summon-materializing');
    status('Карты обретают форму…');
   },
  });
 }catch(error){
  console.warn('Summoning effects unavailable:',error);
 }finally{
  bookVisual?.finish();
  if(summonController===controller){
   summonController=null;
   fx.replaceChildren();
   state='choose';
   for(const card of grid.children)card.disabled=false;
   grid.classList.remove('summon-preparing','summon-materializing');
   captainUpdate();
   status('Ход '+currentName()+' · нажмите на две закрытые карты');
  }
 }
}

function tapCard(id){
 if(state!=='choose'||selectedPair.some(x=>x.id===id))return;
 id=adjustScriptedHiddenPick(id);
 if(!id||selectedPair.some(x=>x.id===id))return;
 if(available.length===1){
  const c=available[0];state='last';captainUpdate();
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
  showCompare([...selectedPair],false,380);
 }else status('Выбрана первая карта · выберите вторую');
}
function ensureCompareStageFx(){const panel=$('compare');let fx=panel.querySelector('.compare-stage-fx');if(!fx){fx=document.createElement('div');fx.className='compare-stage-fx';fx.innerHTML='<div class="compare-halo"></div><div class="compare-halo-two"></div><div class="compare-runes"></div><div class="compare-flash-layer"></div>';panel.prepend(fx)}return fx}
function mountComparePortrait(button,image){
 const face=button.querySelector('.flip-side.back');
 function setEdges(){
  if(!image.naturalHeight)return;
  face.style.setProperty('--portrait-aspect',image.naturalWidth/image.naturalHeight);
  face.style.setProperty('--portrait-art',`url("${image.src}")`);
 }
 if(image.complete)setEdges();
 else image.addEventListener('load',setEdges,{once:true});
 face.append(image);
}
async function showCompare(cards,last,hold=0){
 const signal=draftController.signal;
 const portraits=cards.map(card=>{
  const image=new Image();
  image.src=card.image;
  image.alt=card.name;
  image.decode().catch(()=>{});
  return image;
 });
 if(hold&&!await delay(hold,signal))return;
 try{
  return await revealCompare(cards,last,signal,portraits);
 }catch(err){
  if(signal.aborted)return;
  console.warn('Card reveal recovered:',err);
  if(state!=='preview'&&state!=='last')return;
  const panel=$('compare'),container=$('compareCards');
  pair=cards;
  container.replaceChildren();
  for(const [index,c] of cards.entries()){
   const b=document.createElement('button');
   b.type='button';
   b.className='reveal-card arcane-live arcane-settled flipped arcane-choice-ready';
   b.dataset.cardId=String(c.id);
   b.setAttribute('aria-label',c.name);
   b.innerHTML=`<div class="arcane-aura"></div><div class="flip-core"><div class="flip-side front">${backMarkup()}</div><div class="flip-side back"></div></div><div class="arcane-rim"></div><div class="arcane-name">${c.name}</div>`;
   mountComparePortrait(b,portraits[index]);
   b.onclick=()=>choose(c.id);
   container.append(b);
  }
  panel.classList.remove('arcane-flare','arcane-resolving');
  panel.classList.add('visible','arcane-cinematic','arcane-ready','arcane-selectable');
  $('choiceHint').textContent='Выберите персонажа для команды '+currentName();
 }
}
async function revealCompare(cards,last,signal,portraits){
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
  b.innerHTML=`<div class="arcane-aura"></div><div class="flip-core"><div class="flip-side front">${backMarkup()}</div><div class="flip-side back"></div></div><div class="arcane-rim"></div><div class="arcane-name">${c.name}</div>`;
  mountComparePortrait(b,portraits[i]);
  b.setAttribute('aria-label',c.name);
  b.onclick=()=>choose(c.id);
  container.append(b);
 });
 if(!await nextPaint(signal))return;
 const buttons=[...container.children];
 const arrivalAnimations=[];
 buttons.forEach(b=>b.classList.add('arcane-live'));
 const destinations=buttons.map(b=>b.getBoundingClientRect());
 buttons.forEach((b,i)=>{const source=origins[i],target=destinations[i];if(!source)return;const x=source.left+source.width/2-(target.left+target.width/2);const y=source.top+source.height/2-(target.top+target.height/2);const sx=Math.max(.12,source.width/target.width),sy=Math.max(.12,source.height/target.height);try{if(typeof b.animate==='function')arrivalAnimations.push(b.animate([
   {transform:`translate(${x}px,${y}px) scale(${sx},${sy}) rotate(${i?9:-9}deg)`,filter:'brightness(.72) saturate(.8)',opacity:.12},
   {offset:.42,transform:`translate(${x*.22}px,${y*.26-46}px) scale(.88) rotate(${i?-6:6}deg)`,filter:'brightness(1.5) saturate(1.12)',opacity:1},
   {offset:.72,transform:`translate(${x*.08}px,${y*.08-16}px) scale(1.06) rotate(${i?-2:2}deg)`,filter:'brightness(1.18) saturate(1.02)',opacity:1},
   {transform:'translate(0,0) scale(1) rotate(0deg)',filter:'brightness(1) saturate(1)',opacity:1}
  ],{duration:last?1450:1600,delay:i*190,easing:'cubic-bezier(.16,.78,.18,1)',fill:'both'}))}catch(err){console.warn('Card arrival skipped',err);b.classList.add('arcane-settled')}});
 const ready=await delay(last?1700:1880,signal);
 // Release the entrance animation before the flip animations take over.
 if(ready)buttons.forEach(b=>b.classList.add('arcane-settled'));
 arrivalAnimations.forEach(animation=>animation.cancel());
 if(!ready)return;
 if(!panel.classList.contains('visible'))return;
 $('choiceHint').textContent=last?'Последняя печать трескается…':'Магические печати разрушаются…';
 panel.classList.add('arcane-flare');
 buttons.forEach((button,index)=>{
  delay(index*130,signal).then(ready=>{if(ready)button.classList.add('arcane-preflip')});
  delay(last?240:index*420+320,signal).then(ready=>{if(ready)button.classList.add('flipped')});
 });
 if(!await delay(last?1320:2050,signal))return;
 if(!panel.classList.contains('visible'))return;
 panel.classList.remove('arcane-flare');
 panel.classList.add('arcane-ready','arcane-selectable');
 buttons.forEach(b=>{b.disabled=false;b.classList.remove('arcane-arriving','arcane-preflip');b.classList.add('arcane-choice-ready')});
 $('choiceHint').innerHTML=last?'Нажмите на <strong>легендарного героя</strong>':'Выберите <strong>одного персонажа</strong> для команды '+currentName();

}
async function choose(id){
 const signal=draftController.signal;
 if(state!=='preview'&&state!=='last')return;
 const hero=pair.find(c=>c.id===id);if(!hero||teams[captainTurn].length>=5)return;
 const choosingCaptain=captainTurn;
 const panel=$('compare');
 const compareButtons=[...$('compareCards').querySelectorAll('button.reveal-card')];
 const chosenBtn=compareButtons.find(b=>b.dataset.cardId===String(id));
 if(!panel.classList.contains('arcane-selectable')||!chosenBtn||chosenBtn.disabled)return;
 state='resolving';
 compareButtons.forEach(b=>b.disabled=true);
 $('choiceHint').textContent=hero.name+' вступает в команду '+captains[choosingCaptain].teamName;
 compareButtons.forEach(b=>{
  const selected=b===chosenBtn;
  b.classList.toggle('selected-for-captain',selected);
  b.classList.toggle('rejected-by-captain',!selected);
 });
 panel.classList.remove('arcane-selectable');
 panel.classList.add('arcane-resolving','arcane-flare');
 if(!await delay(820,signal))return;
 $('compare').classList.remove('visible','arcane-cinematic','arcane-ready','arcane-flare','arcane-selectable','arcane-resolving');
 $('scene').classList.remove('arcane-choosing');
 $('compareCards').replaceChildren();
 pair=[];
 teams[choosingCaptain].push(hero);available=available.filter(c=>c.id!==id);selectedPair=[];
 $('scene').dispatchEvent(new CustomEvent('captain:received-card',{detail:choosingCaptain}));
 captainUpdate();
 turn++;
 if(!available.length){state='done';captainUpdate();showFinish();return}
 exchangeSeat=window.chronosRules.recipient(draftIds(),available.length);
 if(exchangeSeat!==null){
  state='cutscene';
  captainUpdate();
  displayGrid();
  status('Время остановилось');
  try{
   await window.chronosCinema.appear(signal);
  }catch(error){
   if(signal.aborted)return;
   console.warn('Chronos introduction interrupted:',error);
  }
  if(signal.aborted)return;
  state='chronos';
  showChronosExchange();
  return;
 }
 state='shuffling';
 captainUpdate();
 status('Оставшиеся карты собираются в колоду…');
 const grid=$('grid');
 const oldTiles=[...grid.children];
 const gridRect=grid.getBoundingClientRect();
 const pileX=gridRect.left+gridRect.width/2,pileY=gridRect.top+gridRect.height/2;
 const origins=oldTiles.map(tile=>tile.getBoundingClientRect());
 oldTiles.forEach((tile,index)=>{
  const rect=origins[index];
  tile.style.animation='none';
  tile.style.transition='transform .65s cubic-bezier(.4,0,.2,1),opacity .6s';
  tile.style.zIndex=String(index+1);
  tile.style.transform=`translate(${pileX-(rect.left+rect.width/2)}px,${pileY-(rect.top+rect.height/2)}px) scale(.76) rotate(${(index%2?1:-1)*(8+index*3)}deg)`;
  tile.style.opacity='.95';
 });
 if(!await delay(690,signal))return;
 status('Колода перемешивается…');
 oldTiles.forEach((tile,index)=>{
  tile.style.transition='transform .2s ease-in-out';
  tile.style.transform+=` rotate(${(index%2?1:-1)*85}deg)`;
 });
 if(!await delay(260,signal))return;
 available=shuffle(available);
 displayGrid();
 const newTiles=[...grid.children];
 const targets=newTiles.map(tile=>tile.getBoundingClientRect());
 newTiles.forEach((tile,index)=>{
  const rect=targets[index];
  tile.style.animation='none';
  tile.style.transition='none';
  tile.style.opacity='.7';
  tile.style.transform=`translate(${pileX-(rect.left+rect.width/2)}px,${pileY-(rect.top+rect.height/2)}px) scale(.75) rotate(${(index-5)*12}deg)`;
 });
 void grid.offsetWidth;
 newTiles.forEach((tile,index)=>{
  tile.style.transition=`transform .65s cubic-bezier(.16,.75,.3,1) ${index*35}ms, opacity .5s ${index*35}ms`;
  tile.style.transform='translate(0,0) scale(1) rotate(0deg)';
  tile.style.opacity='1';
 });
 if(!await delay(1020,signal))return;
 if(signal.aborted)return;
 state='choose';
 captainUpdate();
 displayGrid();
 status('Ход '+currentName()+(available.length===1?' · нажмите на доступную карту':' · нажмите на две закрытые карты'));
}
let summonController=null;
function skipVsIntro(){const finish=$('finish');finish.classList.add('vs-intro','vs-armies','vs-ready');finish.querySelectorAll('.vs-small-card,.vs-team').forEach(el=>{el.style.animation='none';el.style.opacity='1';el.style.transform='none';el.style.filter='none'});finish.querySelectorAll('.vs-captain,.vs-mark,.vs-headline').forEach(el=>{el.style.animation='none';el.style.opacity='1';el.style.transform='none';el.style.filter='none'})}
function showFinish(){
 status('Драфт завершён · ПРОТИВОСТОЯНИЕ');
 const box=$('finalTeams'),finish=$('finish');
 finish.classList.remove('vs-intro','vs-armies','vs-ready');
 finish.querySelectorAll('.vs-captain,.vs-mark,.vs-headline,.vs-team,.vs-small-card').forEach(el=>{el.style.removeProperty('animation');el.style.removeProperty('opacity');el.style.removeProperty('transform');el.style.removeProperty('filter')});
 $('vsCaptain0').src=$('portrait0').src;
 $('vsCaptain1').src=$('portrait1').src;
 box.replaceChildren();
 teams.forEach((members,i)=>{
  const block=document.createElement('section');block.className='vs-team';
  const title=document.createElement('h2');title.className='vs-team-heading';title.textContent='КОМАНДА '+captains[i].teamName.toUpperCase();
  const row=document.createElement('div');row.className='vs-small-cards';
  members.forEach((c,j)=>{const wrap=document.createElement('div');wrap.className='vs-small-card';wrap.style.setProperty('--reveal-delay',(j*.39+i*.17)+'s');const img=new Image();img.src=c.image;img.alt=c.name;img.title=c.name;img.loading='eager';wrap.append(img);row.append(wrap)});
  block.append(title,row);box.append(block);
 });
 movie.className='active';
 playMovie();
}
const movie=$('movieFinal');
const film=$('movieVideo');
const playButton=$('moviePlay');
let playRequest=0;
let videoWatchdog=0;
let resumeMovie=false;
function movieShowing(){
 return movie.classList.contains('active')&&!movie.classList.contains('poster');
}
function watchMovie(){
 clearTimeout(videoWatchdog);
 if(!movieShowing()||document.hidden)return;
 const position=film.currentTime;
 videoWatchdog=setTimeout(()=>{
  if(movieShowing()&&film.currentTime===position)playButton.style.display='block';
 },9000);
}
function playMovie(){
 if(!movieShowing())return;
 if(!filmSource){showMoviePoster();return}
 const request=++playRequest;
 playButton.style.display='none';
 if(!film.hasAttribute('src'))film.src=filmSource;
 watchMovie();
 film.play().catch(()=>{
  if(request===playRequest&&movieShowing()){
   clearTimeout(videoWatchdog);
   playButton.style.display='block';
  }
 });
}
function releaseMovie(){
 playRequest++;
 clearTimeout(videoWatchdog);
 resumeMovie=false;
 film.pause();
 if(film.hasAttribute('src')){
  film.removeAttribute('src');
  film.load();
 }
 playButton.style.display='none';
}
function closeMovie(){
 movie.className='';
 releaseMovie();
}
function showMoviePoster(){
 if(!movieShowing())return;
 movie.classList.add('poster');
 releaseMovie();
}
film.onplaying=()=>{clearTimeout(videoWatchdog);playButton.style.display='none'};
film.onwaiting=watchMovie;
film.onstalled=watchMovie;
film.onended=showMoviePoster;
film.onerror=showMoviePoster;
$('movieSkip').onclick=showMoviePoster;
playButton.onclick=playMovie;
$('movieContinue').onclick=()=>{
 if(!movie.classList.contains('poster'))return;
 closeMovie();
 $('finish').classList.add('visible');
 skipVsIntro();
};
$('vsSkip').onclick=skipVsIntro;
document.addEventListener('visibilitychange',()=>{
 if(!movieShowing())return;
 if(document.hidden){
  resumeMovie=!film.paused;
  if(resumeMovie)film.pause();
  clearTimeout(videoWatchdog);
 }else if(resumeMovie){
  resumeMovie=false;
  playMovie();
 }
});
function reset(){
 draftController.abort();
 draftController=new AbortController();
 summonController?.abort();
 summonController=null;
 $('grid').classList.remove('summon-preparing','summon-materializing');
 closeMovie();
 $('finish').classList.remove('visible','vs-intro','vs-armies','vs-ready');
 $('finalTeams').replaceChildren();
 $('compare').classList.remove('visible','arcane-cinematic','arcane-ready','arcane-flare','arcane-selectable','arcane-resolving');
 $('compareCards').replaceChildren();
 $('scene').classList.remove('arcane-choosing');
 $('fx').replaceChildren();
 window.chronosCinema?.close();
 available=[];teams=[[],[]];selectedPair=[];pair=[];turn=0;state='idle';exchangeSeat=null;
 $('book').disabled=false;
 $('grid').replaceChildren();
 captainUpdate();
 status('Нажмите на гримуар, чтобы призвать десять карт');
}
$('book').onclick=summon;$('restart').onclick=reset;captainUpdate();status('Нажмите на гримуар, чтобы призвать десять карт');
window.BobrsNewDraft={restart:reset,phase:()=>state,teams:()=>teams.map(t=>[...t])};

})();
