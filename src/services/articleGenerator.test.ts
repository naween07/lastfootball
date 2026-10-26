import { describe, expect, it } from 'vitest';

import { getScorers } from './articleGenerator';
import type { MatchEvent } from '../types/football';

/// API-Football reports an own goal under the team of the player who scored it,
/// not the team the goal counts for. These tests pin that down, because getting
/// it wrong credits the goal to the side that conceded and leaves the scorer
/// list contradicting the scoreline.
function event(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: 1,
    type: 'goal',
    minute: 23,
    team: 'home',
    playerName: 'A. Striker',
    ...overrides,
  };
}

describe('getScorers', () => {
  it('credits a normal goal to the side that scored it', () => {
    const events = [event({ team: 'home', playerName: 'E. Haaland' })];

    expect(getScorers(events, 'home').map(s => s.name)).toEqual(['E. Haaland']);
    expect(getScorers(events, 'away')).toEqual([]);
  });

  it('credits an own goal to the side that benefits from it', () => {
    const events = [
      event({ team: 'home', playerName: 'K. Walker', detail: 'Own Goal', minute: 34 }),
    ];

    expect(getScorers(events, 'away').map(s => s.name)).toEqual(['K. Walker']);
    expect(getScorers(events, 'home')).toEqual([]);
  });

  it('keeps the own-goal detail so it can be marked (og)', () => {
    const events = [event({ team: 'away', detail: 'Own Goal' })];

    expect(getScorers(events, 'home')[0].detail).toBe('Own Goal');
  });

  it('separates a real goal from an own goal in the same match', () => {
    const events = [
      event({ id: 1, team: 'home', playerName: 'B. Saka', minute: 12 }),
      event({ id: 2, team: 'home', playerName: 'W. Saliba', detail: 'Own Goal', minute: 70 }),
    ];

    expect(getScorers(events, 'home').map(s => s.name)).toEqual(['B. Saka']);
    expect(getScorers(events, 'away').map(s => s.name)).toEqual(['W. Saliba']);
  });

  it('ignores cards and substitutions', () => {
    const events = [
      event({ type: 'yellow_card' }),
      event({ type: 'red_card' }),
      event({ type: 'substitution' }),
    ];

    expect(getScorers(events, 'home')).toEqual([]);
  });

  it('returns nothing when a match has no events', () => {
    expect(getScorers(undefined, 'home')).toEqual([]);
    expect(getScorers([], 'away')).toEqual([]);
  });
});
