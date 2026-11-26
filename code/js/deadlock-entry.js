
(()=>{
 const btn=document.getElementById('goDeadlock');
 if(btn)btn.addEventListener('click',()=>{
   if(typeof window.openDeadlockDraft!=='function'){alert('Модуль Deadlock не загрузился');return}
   document.getElementById('finish')?.classList.remove('visible');
   window.openDeadlockDraft();
 });
})();
