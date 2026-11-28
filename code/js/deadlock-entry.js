(() => {
  const button = document.getElementById('goDeadlock');
  if (!button) return;

  function openLocal() {
    if (typeof window.openDeadlockDraft !== 'function') {
      alert('Модуль Deadlock не загрузился');
      return;
    }
    document.getElementById('finish')?.classList.remove('visible');
    window.openDeadlockDraft();
  }

  const dialog = document.createElement('dialog');
  if (typeof dialog.showModal !== 'function') {
    button.addEventListener('click', openLocal);
    return;
  }
  dialog.id = 'deadlockMode';
  dialog.setAttribute('aria-labelledby', 'deadlockModeTitle');
  dialog.innerHTML = `
    <h2 id="deadlockModeTitle">Драфт героев Deadlock</h2>
    <p>Выберите режим второго этапа</p>
    <div class="deadlock-mode-actions">
      <button type="button" id="deadlockLocal" autofocus>Локально</button>
      <a id="deadlockOnline" target="_blank" rel="noopener noreferrer">Онлайн с капитаном</a>
    </div>
    <button type="button" id="deadlockModeBack">Назад</button>
  `;
  document.body.append(dialog);

  const online = dialog.querySelector('#deadlockOnline');
  const canHost = !!window.BobrsCampaignView;
  if (!canHost) {
    const instruction = document.createElement('p');
    instruction.textContent = 'Для приглашения запустите веб-сборку этого сезона.';
    online.replaceWith(instruction);
  }
  button.addEventListener('click', () => {
    if (canHost) {
      const teams = window.BobrsNewDraft.teams().map(team => team.map(player => player.id));
      const page = new URL('deadlock.html', location.href);
      page.hash = new URLSearchParams({ teams: JSON.stringify(teams), season: window.BobrsSeason.id }).toString();
      online.href = page.href;
    }
    dialog.showModal();
  });
  dialog.querySelector('#deadlockLocal').addEventListener('click', () => {
    dialog.close();
    openLocal();
  });
  online.addEventListener('click', () => dialog.close());
  dialog.querySelector('#deadlockModeBack').addEventListener('click', () => dialog.close());
})();
