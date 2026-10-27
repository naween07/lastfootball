// Run with: node server/goalSide.test.mjs
import assert from 'node:assert/strict';

import { goalSide } from './goalSide.mjs';

const HOME = 10, AWAY = 20;
const goal = (teamId, detail) => ({ team: { id: teamId }, detail });

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${err.message}`);
    process.exitCode = 1;
  }
};

console.log('goalSide');

test('a normal goal counts for the team that scored it', () => {
  assert.equal(goalSide(goal(HOME), HOME), 'home');
  assert.equal(goalSide(goal(AWAY), HOME), 'away');
});

test('an own goal counts for the other side', () => {
  assert.equal(goalSide(goal(HOME, 'Own Goal'), HOME), 'away');
  assert.equal(goalSide(goal(AWAY, 'Own Goal'), HOME), 'home');
});

test('a penalty is a normal goal', () => {
  assert.equal(goalSide(goal(AWAY, 'Penalty'), HOME), 'away');
});

test('a missing team is treated as away, not crashed on', () => {
  assert.equal(goalSide({}, HOME), 'away');
  assert.equal(goalSide(undefined, HOME), 'away');
});

test('a 2-2 with an away own goal reconstructs to 2-2', () => {
  // Home scores once, away scores once, and an away player puts one in his
  // own net -- so the real score is 2-2, not 1-3.
  const events = [
    goal(HOME),
    goal(AWAY),
    goal(AWAY, 'Own Goal'),
  ];
  const sides = events.map(e => goalSide(e, HOME));
  assert.equal(sides.filter(s => s === 'home').length, 2);
  assert.equal(sides.filter(s => s === 'away').length, 1);
});

console.log(`\n${passed} passed`);
