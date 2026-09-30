// Rule data lives here; interchangeable algorithms live in the neighboring modules.
export const DEFAULT_RULES = {
  setup: { formation: 'left-corners' },
  exposure: { mode: 'flexible', rightRange: 4, leftRange: 1, forwardRange: 1 },
  turn: { actionsPerTurn: 1, revealCostsAction: true, bonusReveal: false },
  hidden: { attack: 'challenge' },
  king: { revealResponse: true, allowPreparationWhenTrapped: true },
  pawn: { initialDoubleStep: false, promotion: 'queen' },
  stack: { enabled: true, unstack: 'orthogonal', anyAdjacent: false, stackAndStep: false, scouting: false },
  outcome: { repetitionCount: 3, quietActionLimit: 100 }
};

export function createRules(overrides = {}) {
  const rules = structuredClone(DEFAULT_RULES);
  for (const [module, settings] of Object.entries(overrides)) {
    if (!(module in rules)) throw new Error(`Unknown rule module: ${module}`);
    for (const [key, value] of Object.entries(settings)) {
      if (!(key in rules[module])) throw new Error(`Unknown rule: ${module}.${key}`);
      rules[module][key] = value;
    }
  }
  if (!['flexible', 'right-empty', 'either-horizontal'].includes(rules.exposure.mode)) throw new Error('Unsupported exposure mode');
  for (const key of ['rightRange', 'leftRange', 'forwardRange']) {
    if (!Number.isInteger(rules.exposure[key]) || rules.exposure[key] < 0 || rules.exposure[key] > 7) throw new Error(`exposure.${key} must be an integer from 0 to 7`);
  }
  if (!Number.isInteger(rules.turn.actionsPerTurn) || rules.turn.actionsPerTurn < 1 || rules.turn.actionsPerTurn > 3) throw new Error('Actions per turn must be 1–3');
  if (typeof rules.turn.bonusReveal !== 'boolean') throw new Error('turn.bonusReveal must be a boolean');
  if (rules.setup.formation !== 'left-corners' || rules.hidden.attack !== 'challenge') throw new Error('This setup or hidden attack policy needs a new rule implementation');
  if (!['orthogonal', 'any-adjacent'].includes(rules.stack.unstack)) throw new Error('Unsupported unstack rule');
  for (const key of ['enabled', 'anyAdjacent', 'stackAndStep', 'scouting']) {
    if (typeof rules.stack[key] !== 'boolean') throw new Error(`stack.${key} must be a boolean`);
  }
  if (!['queen', 'rook', 'bishop', 'knight'].includes(rules.pawn.promotion)) throw new Error('Unsupported promotion piece');
  return rules;
}
