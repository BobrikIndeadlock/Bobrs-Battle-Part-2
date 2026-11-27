import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const site = pathToFileURL(resolve(process.env.DEADLOCK_SITE || '_site') + '/');
const { order, players } = await import(new URL('online-deadlock/draft-data.mjs', site));
const { applyAction, moveAt, newDraft, validDraft, validTeams } =
  await import(new URL('online-deadlock/rules.mjs', site));

test('only two complete teams of original IDs are transferable', () => {
  const ids = players.map(player => player.id);
  assert.equal(validTeams([ids.slice(0, 5), ids.slice(5)]), true);
  assert.equal(validTeams([ids.slice(0, 5), ids.slice(0, 5)]), false);
  assert.equal(validTeams([['https://elsewhere.example/card'], ids.slice(5)]), false);
});

for (const coin of ['heads', 'tails']) {
  test(coin + ' preserves all 18 turns and rejects duplicates and wrong seats', () => {
    const toss = () => coin;
    let draft = newDraft();
    assert.equal(applyAction(draft, 1, { kind: 'flip', rev: 0 }, toss), null);
    draft = applyAction(draft, 0, { kind: 'flip', rev: 0 }, toss);
    assert.equal(draft.coin, coin);
    assert.equal(applyAction(draft, 0, { kind: 'flip', rev: 0 }, toss), null);
    draft = applyAction(draft, 0, { kind: 'start', rev: 1 }, toss);
    const counts = [{ ban: 0, pick: 0 }, { ban: 0, pick: 0 }];

    const expectedPlaces = [0,1,1,0,0,1,1,0,0,1,0,1,1,0,0,1,0,1];
    const banAt = [0, 1, 2, 3, 9, 10];
    assert.deepEqual(order, expectedPlaces.map((place, index) => [banAt.includes(index) ? 'ban' : 'pick', place]));

    for (let hero = 0; hero < order.length; hero++) {
      const move = moveAt(draft, hero);
      counts[move.side][move.type]++;
      const action = { kind: 'move', rev: draft.rev, hero };
      assert.equal(applyAction(draft, 1 - move.side, action, toss), null);
      assert.equal(applyAction(draft, move.side, { ...action, hero: -1 }, toss), null);
      if (hero > 0) assert.equal(applyAction(draft, move.side, { ...action, hero: 0 }, toss), null);
      draft = applyAction(draft, move.side, action, toss);
      assert.equal(applyAction(draft, move.side, action, toss), null);
      assert.equal(validDraft(draft), true);
    }
    assert.deepEqual(counts, [{ ban: 3, pick: 6 }, { ban: 3, pick: 6 }]);
    assert.equal(validDraft({ ...draft, moves: [...draft.moves, 19] }), false);
    assert.equal(applyAction(draft, 1, {kind: 'reset', rev: draft.rev}, toss), null);
    assert.deepEqual(applyAction(draft, 0, {kind: 'reset', rev: draft.rev}, toss), newDraft(draft.rev + 1));
  });
}
