import { order, heroNames, players } from './draft-data.mjs';

const playerIds = new Set(players.map(player => player.id));

export function validTeams(teams) {
  return Array.isArray(teams) && teams.length === 2 &&
    teams.every(team => Array.isArray(team) && team.length === 5 && team.every(id => playerIds.has(id))) &&
    new Set(teams.flat()).size === 10;
}

export function matchCampaignRosters(teams, draftTeams) {
  // Old clients omit the redundant wire roster. The first draft snapshot still carries it.
  return Array.isArray(teams) && (teams.length === 0 || (
    teams.length === draftTeams.length && teams.every((team, side) =>
      Array.isArray(team) && team.length === draftTeams[side].length &&
      team.every((id, slot) => id === draftTeams[side][slot]))
  ));
}

export const newDraft = (rev = 0) => ({ rev, coin: null, started: false, moves: [] });

export function validDraft(value) {
  return value && Number.isSafeInteger(value.rev) && value.rev >= 0 &&
    [null, 'heads', 'tails'].includes(value.coin) && typeof value.started === 'boolean' &&
    (!value.started || value.coin !== null) && Array.isArray(value.moves) &&
    (value.started || !value.moves.length) && value.moves.length <= order.length &&
    value.moves.length <= value.rev && new Set(value.moves).size === value.moves.length &&
    value.moves.every(id => Number.isInteger(id) && id >= 0 && id < heroNames.length);
}

export function moveAt(draft, index) {
  const [type, place] = order[index];
  const first = draft.coin === 'heads' ? 1 : 0;
  return { type, place, side: place === 0 ? first : 1 - first, id: draft.moves[index] };
}

export function permits(draft, side, kind) {
  if (!draft || ![0, 1].includes(side)) return false;
  if (kind === 'flip') return side === 0 && draft.coin === null;
  if (kind === 'start') return side === 0 && draft.coin !== null && !draft.started;
  if (kind === 'reset') return side === 0 && draft.moves.length === order.length;
  return kind === 'move' && draft.started && draft.moves.length < order.length &&
    moveAt(draft, draft.moves.length).side === side;
}

export function applyAction(draft, side, action, toss) {
  if (action?.rev !== draft.rev || !permits(draft, side, action.kind)) return null;
  const rev = draft.rev + 1;
  if (action.kind === 'flip') return { ...draft, rev, coin: toss() };
  if (action.kind === 'start') return { ...draft, rev, started: true };
  if (action.kind === 'reset') return newDraft(rev);
  const { hero } = action;
  if (!Number.isInteger(hero) || hero < 0 || hero >= heroNames.length || draft.moves.includes(hero)) return null;
  return { ...draft, rev, moves: [...draft.moves, hero] };
}
