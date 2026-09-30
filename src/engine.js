import { otherPlayer, squareName, isPromotionRank } from './board.js';
import { createRules } from './rules/config.js';
import { setupBoard } from './rules/setup.js';
import { revealDestinations } from './rules/exposure.js';
import { movementActions } from './rules/movement.js';
import { combinationActions, stackExperiments } from './rules/pawn-stack.js';
import { isInCheck, newlyCheckedKing } from './rules/king.js';
import { actionCost, beginTurn } from './rules/turn.js';
import { evaluateOutcome, positionKey } from './rules/outcome.js';

export function createGame(overrides = {}, random = Math.random) {
  const rules = createRules(overrides);
  const state = {
    rules, board: setupBoard(rules, random), currentPlayer: 1, actionsLeft: rules.turn.actionsPerTurn,
    turnNumber: 1, actionNumber: 0, turnActivity: false, response: null, responseQueue: [],
    captured: [], history: [], result: null, quietActions: 0, repetitions: {}
  };
  state.repetitions[positionKey(state)] = 1;
  return state;
}

function candidateActions(state) {
  return state.board.flatMap((piece, from) => {
    if (piece?.owner !== state.currentPlayer) return [];
    if (!piece.revealed) return revealDestinations(state, from).map(to => ({ kind: 'reveal', from, to }));
    return [...movementActions(state, from), ...combinationActions(state, from)].flatMap(action => stackExperiments(state, action));
  });
}

function promote(state, square) {
  const piece = state.board[square];
  if (piece?.revealed && piece.type === 'pawn' && piece.count === 1 && isPromotionRank(square, piece.owner)) piece.type = state.rules.pawn.promotion;
}

// Pure board transition. Legality simulations may deliberately keep identities
// hidden so legal-action highlights cannot serve as an oracle for tile types.
function changeBoard(state, action, simulation = false) {
  const next = { ...state, board: state.board.map(piece => piece && { ...piece }), captured: [...state.captured] };
  const piece = next.board[action.from];
  const capture = square => {
    if (next.board[square]) next.captured.push({ ...next.board[square] });
    next.board[square] = null;
  };
  switch (action.kind) {
    case 'reveal':
      // Own identity is also unknown. New kings receive the isolated response
      // rule after the real flip; testing them here would leak their identity.
      next.board[action.to] = { ...piece, moved: true, revealed: !simulation };
      next.board[action.from] = null;
      break;
    case 'challenge':
      if (!simulation) next.board[action.to].revealed = true;
      break;
    case 'move':
      capture(action.to);
      next.board[action.to] = { ...piece, moved: true };
      next.board[action.from] = null;
      promote(next, action.to);
      break;
    case 'stack':
      next.board[action.from] = null;
      next.board[action.to] = null;
      next.board[action.step ?? action.to] = { ...piece, count: 2, moved: true };
      break;
    case 'unstack':
      next.board[action.from] = { ...piece, count: 1, moved: true };
      next.board[action.to] = { ...piece, count: 1, moved: true };
      promote(next, action.from);
      promote(next, action.to);
      break;
  }
  // Scouting follows a noncapturing move, and flips exactly one enemy in place.
  // In simulations it stays hidden, just like an ordinary challenge.
  if (action.scout !== undefined && !simulation) next.board[action.scout].revealed = true;
  return next;
}

export function getLegalActions(state) {
  if (state.result) return [];
  const candidates = candidateActions(state);
  const safe = candidates.filter(action => !isInCheck(changeBoard(state, action, true), state.currentPlayer));
  if (state.response && safe.length === 0 && state.rules.king.allowPreparationWhenTrapped) {
    return candidates.length ? candidates : [{ kind: 'finish-response' }];
  }
  if (state.response && safe.length === 0) return [{ kind: 'finish-response' }];
  if (!state.response && state.turnActivity && !isInCheck(state, state.currentPlayer)) safe.push({ kind: 'end-turn' });
  return safe;
}

export function isPreparationResponse(state) {
  return Boolean(state.response) && !candidateActions(state).some(action => !isInCheck(changeBoard(state, action, true), state.currentPlayer));
}

const actionMatches = (a, b) => ['kind', 'from', 'to', 'step', 'scout', 'over'].every(key => a[key] === b[key]);

function describeAction(before, after, action) {
  const from = action.from === undefined ? '' : squareName(action.from);
  const to = action.to === undefined ? '' : squareName(action.to);
  const scoutText = action.scout === undefined ? '' : ` Scouted ${squareName(action.scout)}: ${after.board[action.scout].type} revealed.`;
  if (action.kind === 'reveal') return `Slid ${from} → ${to}, revealing ${after.board[action.to].type}.`;
  if (action.kind === 'challenge') return `Challenged ${to}: ${after.board[action.to].type} revealed. Attacker stays on ${from}.`;
  if (action.kind === 'stack') return `Stacked pawns from ${from} onto ${to}${action.step === undefined ? '' : `, then stepped to ${squareName(action.step)}`}.${scoutText}`;
  if (action.kind === 'unstack') return `Unstacked a pawn from ${from} to ${to}.`;
  if (action.kind === 'finish-response') return 'Finished the king response with no escape.';
  if (action.kind === 'end-turn') return 'Ended the turn.';
  const captures = after.captured.slice(before.captured.length);
  const captureText = captures.length ? ` Captured ${captures.map(p => p.count === 2 ? 'a pawn stack' : p.type).join(' and ')}.` : '';
  const promotion = before.board[action.from].type !== after.board[action.to].type ? ` Promoted to ${after.board[action.to].type}.` : '';
  return `Moved ${from} → ${to}.${captureText}${promotion}${scoutText}`;
}

function switchTurn(state, player) {
  beginTurn(state, player);
  state.turnActivity = false;
}

export function applyAction(state, requested) {
  const action = getLegalActions(state).find(legal => actionMatches(legal, requested));
  if (!action) throw new Error('That action is not legal in the current position.');
  const actor = state.currentPlayer;
  const next = changeBoard(state, action);
  next.actionNumber += 1;
  next.turnActivity = true;
  next.history = [...state.history, { number: next.actionNumber, player: actor, text: describeAction(state, next, action) }];
  next.responseQueue = [...state.responseQueue];
  next.repetitions = { ...state.repetitions };
  const irreversible = ['reveal', 'challenge', 'stack', 'unstack'].includes(action.kind) || next.captured.length > state.captured.length || state.board[action.from]?.type === 'pawn';
  next.quietActions = irreversible ? 0 : state.quietActions + (action.kind === 'end-turn' ? 0 : 1);

  // A preparation action is an actual opportunity, not indefinite immunity.
  if (state.response && isInCheck(next, actor)) {
    next.response = null;
    next.result = { winner: otherPlayer(actor), reason: 'Checkmate after the king response' };
    return next;
  }
  next.response = null;
  const exposedKing = newlyCheckedKing(state, next, action);
  // A challenge can uncover an enemy attack on the actor's known king. Never
  // suppress that challenge based on secret identity; give an ambush response.
  const ambushed = (action.kind === 'challenge' || action.scout !== undefined) && isInCheck(next, actor) && !isInCheck(changeBoard(state, action, true), actor);
  const responses = [];
  if (ambushed) responses.push({ player: actor, reason: 'An uncovered piece attacks your king.' });
  if (exposedKing !== null && !responses.some(r => r.player === exposedKing)) responses.push({ player: exposedKing, reason: 'Your king was revealed in check.' });
  next.responseQueue.push(...responses);
  while (next.responseQueue.length && !isInCheck(next, next.responseQueue[0].player)) next.responseQueue.shift();
  if (next.responseQueue.length) {
    next.response = next.responseQueue.shift();
    if (next.currentPlayer !== next.response.player) switchTurn(next, next.response.player);
    next.actionsLeft = 1;
  } else {
    next.actionsLeft -= actionCost(action, state.rules);
    if (state.response || action.kind === 'end-turn' || next.actionsLeft <= 0 || isInCheck(next, otherPlayer(actor))) switchTurn(next, otherPlayer(actor));
  }
  const key = positionKey(next);
  next.repetitions[key] = (next.repetitions[key] || 0) + 1;
  next.result = evaluateOutcome(next, getLegalActions(next));
  return next;
}

// The UI receives only public facts. No hidden identity appears in DOM labels,
// tooltips, logs, CSS, or tile ids. This is local privacy, not anti-cheat security.
export function publicView(state) {
  return {
    board: state.board.map(piece => piece && (piece.revealed
      ? { owner: piece.owner, revealed: true, type: piece.type, count: piece.count }
      : { owner: piece.owner, revealed: false })),
    currentPlayer: state.currentPlayer, turnNumber: state.turnNumber, actionsLeft: state.actionsLeft,
    actionNumber: state.actionNumber, response: state.response && { ...state.response },
    preparation: isPreparationResponse(state), result: state.result && { ...state.result },
    captured: state.captured.map(p => ({ owner: p.owner, type: p.type, count: p.count })),
    history: state.history.map(item => ({ ...item })),
    check: { 1: isInCheck(state, 1), 2: isInCheck(state, 2) },
    rules: structuredClone(state.rules)
  };
}
