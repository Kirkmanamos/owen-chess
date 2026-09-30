// Reveal bonuses and multi-action turns can be tested without changing movement.
export function actionCost(action, rules) {
  return action.kind === 'reveal' && !rules.turn.revealCostsAction ? 0 : 1;
}

// Unlimited free reveals supersede this bounded experiment. The bonus happens
// after all paid actions, so its tile cannot also take a normal action this turn.
export function hasBonusReveal(rules) {
  return rules.turn.bonusReveal && rules.turn.revealCostsAction;
}

export function beginTurn(state, player) {
  state.currentPlayer = player;
  state.actionsLeft = state.rules.turn.actionsPerTurn;
  state.bonusRevealPending = false;
  state.turnNumber += 1;
}
