// Plays one bot-vs-bot game and returns per-game metrics. The metrics use the
// true state (omniscient) only for measurement, never for bot decisions.
import { createGame, getLegalActions, applyAction } from '../../src/engine.js';
import { isInCheck } from '../../src/rules/king.js';
import { otherPlayer } from '../../src/board.js';
import { bots, VALUE } from './bots.js';

export const MAX_ACTIONS = 600;

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 2 ** 32; };
}

const trueMaterial = state => state.board.reduce((sum, p) => p ? sum + (p.owner === 1 ? 1 : -1) * VALUE[p.type] * p.count : sum, 0);

export function playGame({ rules, seed, players }) {
  const random = seeded(seed);
  let state = createGame(rules, random);
  const m = {
    kinds: {}, captures: 0, checks: 0, scouts: 0, stackSteps: 0, bonusUsed: 0, bonusSkipped: 0,
    decisions: 0, branching: 0, forced: 0, close: 0, closeSamples: 0,
    kingRevealedAt: { 1: null, 2: null }, kingRevealedBy: { 1: null, 2: null },
    materialTrace: [], hiddenAtEnd: { 1: 0, 2: 0 },
    // Opening pace: tiles revealed per player after five turns each, and the
    // turn of the first capture.
    revealedAfter5: null, firstCaptureTurn: null
  };
  while (!state.result && state.actionNumber < MAX_ACTIONS) {
    const actions = getLegalActions(state);
    const actor = state.currentPlayer;
    const { action, close } = bots[players[actor]](state, actions, random);
    m.decisions += 1;
    m.branching += actions.length;
    if (actions.length === 1) m.forced += 1;
    if (close !== undefined && actions.length > 1) { m.close += close > 1 ? 1 : 0; m.closeSamples += 1; }
    if (state.bonusRevealPending) m[action.kind === 'reveal' ? 'bonusUsed' : 'bonusSkipped'] += 1;
    const before = state;
    state = applyAction(state, action);
    m.kinds[action.kind] = (m.kinds[action.kind] || 0) + 1;
    if (action.scout !== undefined) m.scouts += 1;
    if (action.step !== undefined) m.stackSteps += 1;
    if (state.captured.length > before.captured.length) {
      m.captures += 1;
      m.firstCaptureTurn ??= before.turnNumber;
    }
    if (m.revealedAfter5 === null && state.turnNumber > 10) m.revealedAfter5 = state.board.filter(p => p?.revealed).length / 2;
    if (isInCheck(state, otherPlayer(actor))) m.checks += 1;
    for (const owner of [1, 2]) {
      if (m.kingRevealedAt[owner] !== null) continue;
      if (state.board.some(p => p?.owner === owner && p.type === 'king' && p.revealed)) {
        m.kingRevealedAt[owner] = state.actionNumber;
        m.kingRevealedBy[owner] = actor === owner ? 'self' : 'opponent';
      }
    }
    m.materialTrace.push(trueMaterial(state));
  }
  for (const p of state.board) if (p && !p.revealed) m.hiddenAtEnd[p.owner] += 1;
  const winner = state.result?.winner ?? null;
  const reason = state.result ? state.result.reason.replace(/\d+/, 'N') : 'Action cap';
  // Lead changes: sign flips of a material lead of at least 3 points.
  let lead = 0, leadChanges = 0, loserMaxLead = 0;
  for (const value of m.materialTrace) {
    const sign = value >= 3 ? 1 : value <= -3 ? -1 : 0;
    if (sign && lead && sign !== lead) leadChanges += 1;
    if (sign) lead = sign;
    if (winner) loserMaxLead = Math.max(loserMaxLead, winner === 1 ? -value : value);
  }
  delete m.materialTrace;
  return {
    ...m, winner, reason, actions: state.actionNumber, turns: state.turnNumber,
    leadChanges, comeback: winner !== null && loserMaxLead >= 3,
    winnerKingHidden: winner !== null && m.kingRevealedAt[winner] === null
  };
}
