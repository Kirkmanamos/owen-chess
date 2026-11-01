// Reveal bonuses and multi-action turns can be tested without changing movement.
export function actionCost(action, rules) {
  return action.kind === 'reveal' && !rules.turn.revealCostsAction ? 0 : 1;
}

// Unlimited free reveals supersede this bounded experiment. The bonus happens
// after all paid actions, so its tile cannot also take a normal action this turn.
export function hasBonusReveal(rules) {
  return rules.turn.bonusReveal && rules.turn.revealCostsAction;
}

// A player's own first turns can get extra actions to speed up the opening.
export function turnAllowance(rules, ownTurn) {
  return rules.turn.openingRamp[ownTurn - 1] ?? rules.turn.actionsPerTurn;
}

// A king response is not a real turn, so it does not use up an opening turn.
export function beginTurn(state, player, isResponse = false) {
  state.currentPlayer = player;
  if (!isResponse) state.turnsTaken = { ...state.turnsTaken, [player]: state.turnsTaken[player] + 1 };
  state.actionsLeft = turnAllowance(state.rules, state.turnsTaken[player]);
  state.bonusRevealPending = false;
  state.turnNumber += 1;
}
