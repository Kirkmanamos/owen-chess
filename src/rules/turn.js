// Reveal bonuses and multi-action turns can be tested without changing movement.
export function actionCost(action, rules) {
  return action.kind === 'reveal' && !rules.turn.revealCostsAction ? 0 : 1;
}

export function beginTurn(state, player) {
  state.currentPlayer = player;
  state.actionsLeft = state.rules.turn.actionsPerTurn;
  state.turnNumber += 1;
}
