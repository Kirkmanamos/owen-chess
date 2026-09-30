import { otherPlayer } from '../board.js';
import { isInCheck } from './king.js';

export function evaluateOutcome(state, legalActions) {
  if (state.response) return null; // A newly exposed king must get its response.
  if (legalActions.length === 0) {
    return isInCheck(state, state.currentPlayer)
      ? { winner: otherPlayer(state.currentPlayer), reason: 'Checkmate' }
      : { winner: null, reason: 'Stalemate — no legal actions' };
  }
  if (state.rules.outcome.repetitionCount > 0 && state.repetitions[positionKey(state)] >= state.rules.outcome.repetitionCount) return { winner: null, reason: 'Draw by repetition' };
  if (state.rules.outcome.quietActionLimit > 0 && state.quietActions >= state.rules.outcome.quietActionLimit) return { winner: null, reason: `Draw after ${state.rules.outcome.quietActionLimit} quiet actions` };
  return null;
}

export function positionKey(state) {
  return JSON.stringify([state.currentPlayer, state.actionsLeft, state.response, state.board.map(p => p && [p.owner, p.type, p.revealed, p.count, state.rules.pawn.initialDoubleStep && p.moved])]);
}
