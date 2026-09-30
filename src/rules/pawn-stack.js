import { AROUND, ORTHOGONAL, offset } from '../board.js';

export function stackAttacks(state, from) {
  // Two pawns travel together with king-like geometry, but no royal status.
  // Attack geometry includes occupied neighbors; move legality filters them.
  return AROUND.map(([dr, dc]) => offset(from, dr, dc)).filter(to => to !== null);
}

export function stackMoves(state, from) {
  const piece = state.board[from];
  return stackAttacks(state, from).flatMap(to => {
    const target = state.board[to];
    if (!target) return [{ kind: 'move', from, to }];
    if (target.owner === piece.owner) return [];
    if (!target.revealed) return [{ kind: 'challenge', from, to }];
    return target.type === 'king' ? [] : [{ kind: 'move', from, to }];
  });
}

export function combinationActions(state, from) {
  if (!state.rules.stack.enabled) return [];
  const piece = state.board[from];
  if (piece?.type !== 'pawn' || !piece.revealed) return [];
  if (piece.count === 1) {
    const directions = state.rules.stack.anyAdjacent ? AROUND : [[0, -1], [0, 1]];
    return directions.flatMap(([dr, dc]) => {
      const to = offset(from, dr, dc);
      const partner = state.board[to];
      return to !== null && partner?.owner === piece.owner && partner.revealed && partner.type === 'pawn' && partner.count === 1
        ? [{ kind: 'stack', from, to }] : [];
    });
  }
  const directions = state.rules.stack.unstack === 'any-adjacent' ? AROUND : ORTHOGONAL;
  return directions.flatMap(([dr, dc]) => {
    const to = offset(from, dr, dc);
    return to !== null && !state.board[to] ? [{ kind: 'unstack', from, to }] : [];
  });
}

// Optional parts are encoded on a single action, never as extra turns. Keeping
// the plain action alongside each variant lets the player decline every bonus.
// All geometry uses public occupancy; no hidden identity influences an option.
export function stackExperiments(state, action) {
  if (!state.rules.stack.enabled) return [action];
  const variants = [action];
  if (action.kind === 'stack' && state.rules.stack.stackAndStep) {
    for (const [dr, dc] of AROUND) {
      const step = offset(action.to, dr, dc);
      // The moving pawn's former square is empty after combining.
      if (step !== null && (!state.board[step] || step === action.from)) variants.push({ ...action, step });
    }
  }
  if (!state.rules.stack.scouting) return variants;
  const piece = state.board[action.from];
  return variants.flatMap(variant => {
    const movedStack = action.kind === 'move' && piece?.type === 'pawn' && piece.count === 2 && !state.board[action.to];
    const steppedStack = action.kind === 'stack' && variant.step !== undefined;
    if (!movedStack && !steppedStack) return [variant];
    const landing = variant.step ?? variant.to;
    const scouts = AROUND.flatMap(([dr, dc]) => {
      const scout = offset(landing, dr, dc);
      const target = state.board[scout];
      return scout !== null && target && target.owner !== piece.owner && !target.revealed
        ? [{ ...variant, scout }] : [];
    });
    return [variant, ...scouts];
  });
}
