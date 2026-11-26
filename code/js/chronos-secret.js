
(function(){
  const overlay=document.getElementById('c91oOverlay');
  const dim=document.getElementById('c91oDim');
  const chronos=document.getElementById('c91oChronos');
  const dialog=document.getElementById('c91oDialog');
  const textEl=document.getElementById('c91oText');
  let running=false;
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function buildDecor(){
    if(chronos.dataset.ready) return;
    chronos.dataset.ready='1';
    for(let i=0;i<12;i++){
      const t=document.createElement('div');
      t.className='c91o-tick';
      t.style.transform='translate(-50%,-100%) rotate('+(i*30)+'deg)';
      chronos.appendChild(t);
    }
    for(let i=0;i<16;i++){
      const s=document.createElement('div');
      s.className='c91o-spark';
      s.style.left=(18+Math.random()*64)+'%';
      s.style.top=(18+Math.random()*55)+'%';
      s.style.animationDelay=(Math.random()*3.2).toFixed(2)+'s';
      s.style.animationDuration=(3+Math.random()*2.8).toFixed(2)+'s';
      chronos.appendChild(s);
    }
  }
  async function typeWords(str){
    textEl.textContent='';
    const words=str.split(' ');
    for(let i=0;i<words.length;i++){
      if(words[i] === 'Продолжайте…'){
        const last=document.createElement('span');
        last.className='c91o-mocking-word';
        last.textContent=words[i];
        const revealed=new Promise(resolve=>{
          let fallback;
          const done=()=>{clearTimeout(fallback);last.removeEventListener('animationend',done);last.style.opacity='1';last.style.willChange='auto';resolve();};
          last.addEventListener('animationend',done,{once:true});
          fallback=setTimeout(done,3300);
        });
        textEl.appendChild(last);
        await revealed;
      } else {
        textEl.appendChild(document.createTextNode((i?' ':'')+words[i]));
        await sleep(words[i+1] === 'Продолжайте…' ? 2000 : 340);
      }
    }
  }
  async function run(){
    if(running) return; running=true;
    try{buildDecor();
    overlay.setAttribute('aria-hidden','false');
    overlay.classList.add('show');
    textEl.textContent=''; dialog.style.opacity='0'; chronos.classList.remove('show');
    dim.style.opacity='0';
    await sleep(220);
    dim.style.opacity='1';
    await sleep(2400);
    chronos.classList.add('show');
    await sleep(1700);
    dialog.style.opacity='1';
    await typeWords('Забавно наблюдать, как смертные пытаются управлять судьбой, не подозревая, что их собственная уже предрешена. Продолжайте…');
    await sleep(1200);
    dialog.style.opacity='0';
    chronos.classList.remove('show');
    dim.style.opacity='0';
    await sleep(1500);
    }finally{overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');dialog.style.opacity='0';chronos.classList.remove('show');dim.style.opacity='0';running=false;}
  }
  window.playChronosSecret91=run;
})();
