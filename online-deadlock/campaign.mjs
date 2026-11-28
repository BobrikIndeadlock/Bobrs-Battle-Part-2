import { openRoom, roomToken } from './room.mjs';
import { applyAction, matchCampaignRosters, newDraft, permits as permitsDeadlock, validDraft, validTeams } from './rules.mjs';
import { players } from './draft-data.mjs';

const $ = id => document.getElementById(id);
const first = window.BobrsCampaignView;
const second = window.DeadlockRoomView;
const playerIds = new Set(players.map(player => player.id));
const phases = ['idle', 'choose', 'preview', 'chronos', 'last', 'done'];
const actions = ['summon', 'reveal', 'choose', 'restart', 'exchange', 'decline'];
const chronos = window.chronosRules;
const roomPattern = /^[a-f0-9]{32}$/;

function ids(value, max) {
  return Array.isArray(value) && value.length <= max &&
    value.every(id => playerIds.has(id)) && new Set(value).size === value.length;
}

function validFirst(state) {
  return state && phases.includes(state.phase) && Number.isInteger(state.turn) &&
    state.turn >= 0 && state.turn <= 10 && state.captain === state.turn % 2 &&
    Array.isArray(state.teams) && state.teams.length === 2 && state.teams.every(team => ids(team, 5)) &&
    ids(state.deck, 10) && ids([...state.deck, ...state.teams.flat()], 10) &&
    (state.phase === 'idle' || state.deck.length + state.teams.flat().length === 10) &&
    ids(state.pair, 2) && ids(state.exposed, 2) && ids(state.legal, 10) &&
    [...state.pair, ...state.exposed, ...state.legal].every(id => state.deck.includes(id)) &&
    state.turn === state.teams.flat().length &&
    (state.phase === 'chronos'
      ? state.exchange !== null && state.exchange === chronos.recipient(state.teams,state.deck.length)
      : state.exchange === null) &&
    (state.phase !== 'done' || validTeams(state.teams)) &&
    (state.phase === 'idle' ? state.scripted === null : ['Грит', 'Аптека'].includes(state.scripted)) &&
    Array.isArray(state.completed) && state.completed.length <= 2 &&
    state.completed.every(value => value === 2 || value === 4);
}

function valid(state) {
  if (!state || !Number.isSafeInteger(state.rev) || state.rev < 0 || !validFirst(state.first)) return false;
  if (state.second) {
    return state.first.phase === 'done' && validTeams(state.first.teams) && !state.event && validDraft(state.second);
  }
  if (!state.event) return state.event === null;
  const { kind, id, seed } = state.event;
  const payload = kind === 'exchange' ? chronos.validSwap(state.first.teams,state.first.exchange,id) :
    ['reveal','choose'].includes(kind) ? playerIds.has(id) : id === undefined;
  return actions.includes(kind) && payload &&
    (kind !== 'exchange' && kind !== 'decline' || state.first.phase === 'chronos') &&
    Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
}

function permits(state, side, kind, id) {
  if (!state || state.event) return false;
  if (state.second) return permitsDeadlock(state.second, side, kind);
  const draft = state.first;
  if (kind === 'summon') return side === 0 && draft.phase === 'idle';
  if (kind === 'enter' || kind === 'restart') return side === 0 && draft.phase === 'done';
  if (kind === 'exchange' || kind === 'decline') {
    return draft.phase === 'chronos' && side === draft.exchange &&
      (kind === 'decline' ? id === undefined : id === undefined || chronos.validSwap(draft.teams,side,id));
  }
  const legal = kind === 'reveal' && draft.phase === 'choose' ? draft.legal :
    kind === 'choose' && ['preview', 'last'].includes(draft.phase) ? draft.pair : [];
  return side === draft.captain && (id === undefined ? legal.length > 0 : legal.includes(id));
}

function apply(state, side, action, toss) {
  if (action?.rev !== state.rev || !permits(state, side, action.kind, action.hero)) return null;
  if (['reveal', 'choose'].includes(action.kind) && !state.second && !playerIds.has(action.hero)) return null;
  if (!state.second && action.kind === 'exchange' && !chronos.validSwap(state.first.teams,side,action.hero)) return null;
  const rev = state.rev + 1;
  if (state.second) {
    const next = applyAction({ ...state.second, rev: state.rev }, side, action, toss);
    return next ? { ...state, rev, second: next } : null;
  }
  if (action.kind === 'enter') return { ...state, rev, second: newDraft(rev) };
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return { ...state, rev, event: { kind: action.kind, id: action.hero, seed } };
}

function whenClassClears(element, className) {
  if (!element.classList.contains(className)) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (!element.classList.contains(className)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ['class'] });
  });
}

async function enterArena(reconnecting) {
  const stage = $('intro-stage');
  if (stage) {
    const entered = new Promise(resolve => stage.addEventListener('intro:complete', resolve, {once: true}));
    if (reconnecting && !$('intro-gate').disabled) $('intro-gate').click();
    await entered;
  }
  await whenClassClears($('hall92'), 'active');
}

function campaignGame() {
  let send;
  let allowed;
  let deadlockOpen = false;
  const same = snapshot => JSON.stringify(first.snapshot()) === JSON.stringify(snapshot);
  const view = {
    open(_, submit, maySend) {
      send = submit;
      allowed = maySend;
      $('campaignMenu').hidden = true;
      first.connect(send,allowed);
      $('goDeadlock').addEventListener('click', event => {
        event.stopImmediatePropagation();
        send('enter');
      }, {capture: true});
      view.refresh();
    },
    refresh() {
      if (deadlockOpen) {
        second.refresh();
        return;
      }
      $('book').inert = !allowed('summon');
      $('grid').inert = !allowed('reveal');
      $('compareCards').inert = !allowed('choose');
      $('goDeadlock').inert = !allowed('enter');
      $('restart').inert = !allowed('restart');
      window.chronosCinema.refresh();
    },
    async paint(previous, next, options) {
      if (!deadlockOpen) {
        await enterArena(!previous && next.first.phase !== 'idle');
        if (!same(next.first)) await first.restore(next.first);
        if (next.event) await first.play(next.event);
        if (!next.second) return;
        await whenClassClears($('movieFinal'), 'active');
        $('finish').classList.remove('visible');
        second.open(options.rosters, send, allowed);
        deadlockOpen = true;
      }
      await second.paint(previous?.second, next.second, options);
    },
  };
  return {
    view,
    waitForPeer: true,
    initial: () => ({ rev: 0, first: first.snapshot(), event: null, second: null }),
    valid,
    rosterIds: state => state.first.teams,
    validTeams: (teams, state) => matchCampaignRosters(teams, state.first.teams),
    permits,
    apply,
    settle: state => state.event ? {
      ...state, rev: state.rev + 1, first: first.snapshot(), event: null,
    } : null,
  };
}

function join(side, room) {
  openRoom({ side, room, game: campaignGame(), invitationKey: 'campaign' });
}

const params = new URLSearchParams(location.hash.slice(1));
const invite = params.get('campaign');
if (invite !== null) {
  $('campaignCreate').hidden = true;
  $('roomBar').hidden = false;
  try {
    if (params.get('season') !== window.BobrsSeason.id) throw new Error('Ссылка относится к другому сезону.');
    if (!roomPattern.test(invite)) throw new Error('Ссылка комнаты повреждена.');
    $('book').inert = true;
    join(1, invite);
  } catch (error) {
    $('roomStatus').textContent = error.message;
  }
} else {
  const button = $('campaignCreate');
  const update = () => { button.hidden = window.BobrsNewDraft.phase() !== 'idle'; };
  new MutationObserver(update).observe($('book'), { attributes: true, attributeFilter: ['disabled'] });
  button.onclick = () => {
    if (window.BobrsNewDraft.phase() !== 'idle') return;
    try {
      join(0, roomToken());
    } catch (error) {
      $('campaignNotice').textContent = error.message;
    }
  };
}
