 // This bridge is appended to the Pages copy of the original first draft.
 let campaignInput = null;
 let actionRandom = null;
 let mayResolveChronos = () => true;

 function campaignDispatch(kind, id) {
  if (campaignInput) return campaignInput(kind, id);
  return playCampaignAction({kind, id});
 }

 function campaignSnapshot() {
  const ids = cards => cards.map(card => card.id);
  const idle = state === 'idle';
  return {
   phase: state, turn, captain: captainTurn, deck: ids(available),
   teams: teams.map(ids), pair: ids(pair), exposed: ids(selectedPair),
   exchange: exchangeSeat, scripted: idle ? null : scriptedPairs[2][0],
   completed: idle ? [] : [...scriptedCompleted],
   legal: state === 'choose' ? ids(available).filter(id => !selectedPair.some(card => card.id === id)) : [],
  };
 }

 async function playCampaignAction({kind, id, seed}) {
  actionRandom = seed === undefined ? null : () => {
   // The host supplies a fresh seed for each action, leaving local randomness untouched.
   seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
   return seed >>> 8;
  };
  try {
   if (kind === 'summon') await summon();
   else if (kind === 'reveal') await tapCard(id);
   else if (kind === 'choose') await choose(id);
   else if (kind === 'restart') reset();
   else if (kind === 'exchange' || kind === 'decline') await settleChronos(kind,id);
  } finally {
   actionRandom = null;
  }
 }

 async function restoreCampaign(saved) {
  reset();
  if (saved.phase === 'idle') return;
  const cards = ids => ids.map(id => baseCharacters.find(card => card.id === id));
  available = cards(saved.deck);
  teams = saved.teams.map(cards);
  selectedPair = cards(saved.exposed);
  pair = cards(saved.pair);
  turn = saved.turn;
  state = saved.phase;
  exchangeSeat = saved.exchange;
  scriptedPairs = {2:[saved.scripted,'Сережа'],4:[getCounterpartName(saved.scripted),'Данечек']};
  scriptedCompleted.clear();
  saved.completed.forEach(value => scriptedCompleted.add(value));
  $('book').disabled = true;
  captainUpdate();
  displayGrid();
  for (const card of selectedPair) {
   const tile = $('grid').children[available.indexOf(card)];
   if (tile) {
    tile.disabled = true;
    tile.classList.add('arcane-picked');
   }
  }
  if (state === 'preview' || state === 'last') {
   if (state === 'preview') $('scene').classList.add('arcane-choosing');
   await showCompare([...pair], state === 'last');
  } else if (state === 'chronos') showChronosExchange();
  else if (state === 'done') showFinish(false);
  else status('Ход '+currentName()+(available.length===1?' · нажмите на доступную карту':' · нажмите на две закрытые карты'));
 }

 window.BobrsCampaignView = {
  connect(send, allowed) {
   campaignInput = send;
   mayResolveChronos = () => allowed('decline');
  },
  snapshot: campaignSnapshot,
  play: playCampaignAction,
  restore: restoreCampaign,
 };
