 // Appended inside the original presentation controller by the Pages build.
 let maySend = () => false;
 let sendAction = () => {};
 let roomTeams;

 function onlineAllowed(kind) {
  return !animating && (!roomTeams || !flipping && maySend(kind));
 }

 function showCoinResult() {
  coinModel.className = 'dl-coin ' + coinResult;
  $('dlCoinResult').textContent = coinResult === 'heads' ? 'ОРЁЛ! АРТЕМОН — МЕСТО 1' : 'РЕШКА! МАКАРЫЧ — МЕСТО 1';
  $('dlFlip').style.display = 'none';
  $('dlEnter').style.display = '';
 }

 function fillRoomRosters() {
  roomTeams.forEach((team, side) => {
   const roster = $('dlRoster' + side);
   roster.replaceChildren();
   const heading = roster.previousElementSibling;
   const label = heading.dataset.rosterLabel ?? heading.textContent;
   heading.dataset.rosterLabel = label;
   heading.textContent = label + ' · ' + team.length + ' / 5';
   for (const player of team) {
    const item = document.createElement('figure');
    const image = new Image();
    image.src = player.image;
    image.alt = player.name;
    const caption = document.createElement('figcaption');
    caption.textContent = player.name;
    item.append(image, caption);
    roster.append(item);
   }
  });
 }

 function refreshRoomControls() {
  $('dlFlip').disabled = !onlineAllowed('flip');
  $('dlEnter').disabled = !onlineAllowed('start');
  $('dlNew').disabled = !onlineAllowed('reset');
  if (!active.classList.contains('draft-active')) return;
  $('dlConfirm').disabled = !onlineAllowed('move') || selected === null;
  renderHeroes();
 }

 function connectRoomControls() {
 $('dlFlip').onclick = () => { if (onlineAllowed('flip')) sendAction('flip'); };
 $('dlEnter').onclick = () => { if (onlineAllowed('start')) sendAction('start'); };
 $('dlConfirm').onclick = () => {
  if (onlineAllowed('move') && selected !== null) sendAction('move', selected);
 };
 $('dlNew').onclick = () => { if (onlineAllowed('reset')) sendAction('reset'); };
 $('dlBack').textContent = 'ВЫЙТИ ИЗ КОМНАТЫ';
 $('dlBack').onclick = () => location.replace(location.pathname);
 $('dlUndo').hidden = true;
 $('dlPortraitUpload').closest('label').hidden = true;
 }

 window.DeadlockRoomView = {
  open(teams, send, allowed) {
   if (teams.length !== 2 || teams.some(team => team.length !== 5 || !team.every(Boolean))) {
    throw new Error('В Deadlock должны перейти два полных состава первого драфта.');
   }
   roomTeams = teams;
   sendAction = send;
   maySend = allowed;
   connectRoomControls();
   begin();
   fillRoomRosters();
   refreshRoomControls();
  },
  refresh: refreshRoomControls,
  async paint(previous, next, { animate, moveAt }) {
   if (!next.coin) {
    if (previous?.coin) {
     begin();
     fillRoomRosters();
    }
    return;
   }
   if (!next.started) {
    if (animate && previous && !previous.coin) {
     await playCoin(next.coin);
    } else {
     coinResult = next.coin;
     place1 = coinResult === 'heads' ? 1 : 0;
     showCoinResult();
    }
    return;
   }
   const index = next.moves.length - 1;
   if (animate && previous?.started && previous.moves.length === index && step === index) {
    const move = moveAt(next, index);
    animating = true;
    refreshRoomControls();
    try {
     await effect(move.type, heroes[move.id], move.side);
    } catch (error) {
     console.warn('Эффект драфта пропущен', error);
    } finally {
     animating = false;
    }
   }
   coinResult = next.coin;
   place1 = coinResult === 'heads' ? 1 : 0;
   history = next.moves.map((_, i) => moveAt(next, i));
   step = history.length;
   selected = null;
   if (!active.classList.contains('draft-active')) screen('dlDraftScreen');
   update();
  },
 };
