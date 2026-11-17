import { describe, expect, it } from 'vitest';

import { getScorers } from './articleGenerator';
import type { MatchEvent } from '../types/football';

/// API-Football reports an own goal under the team the goal COUNTS FOR, not
/// the team of the player who put it in. These tests had it the other way
/// round and getScorers flipped the side to compensate, which credited every
/// own goal to the team that conceded it.
///
/// Settled against published reports rather than from the provider's docs.
/// Switzerland 4-0 Scotland (2026-11-16): Lewis Ferguson, a Scotland player,
/// put through his own net, and the event arrived on the home side -- which
/// is Switzerland. The running tally built from these events reaches 4-0,
/// the real final score. France 2-1 Turkiye and Rumilly Vallieres 1-2 Saint
/// Etienne agree. A flip would have made those tallies 3-1 and 0-2.
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

  it('leaves an own goal on the side the provider credited, which is the side it counts for', () => {
    // L. Ferguson plays for the away team; the goal counts for the home team,
    // and that is the side the event arrives on.
    const events = [
      event({ team: 'home', playerName: 'L. Ferguson', detail: 'Own Goal', minute: 22 }),
    ];

    expect(getScorers(events, 'home').map(s => s.name)).toEqual(['L. Ferguson']);
    expect(getScorers(events, 'away')).toEqual([]);
  });

  it('keeps the own-goal detail so the narrative can say whose net it was', () => {
    const events = [event({ team: 'away', detail: 'Own Goal' })];

    expect(getScorers(events, 'away')[0].detail).toBe('Own Goal');
    expect(getScorers(events, 'home')).toEqual([]);
  });

  it('lists a real goal and an own goal for the same side in one match', () => {
    const events = [
      event({ id: 1, team: 'home', playerName: 'B. Saka', minute: 12 }),
      event({ id: 2, team: 'home', playerName: 'W. Saliba', detail: 'Own Goal', minute: 70 }),
    ];

    expect(getScorers(events, 'home').map(s => s.name)).toEqual(['B. Saka', 'W. Saliba']);
    expect(getScorers(events, 'away')).toEqual([]);
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
