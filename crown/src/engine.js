import { SQUARES, HOME, THRONE, UNITS, ARMY, LAND_STACK, SETTINGS, otherPlayer, neighbors, distance, rowOf, colOf, index, inside, squareName } from './rules.js';

export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Phases: setup → (build → act [→ peek | bonus-build]) per turn → over.
export function createGame({ random = Math.random } = {}) {
  const land = Array(SQUARES).fill(null);
  for (const square of [...HOME[1], ...HOME[2]]) land[square] = 'plains';
  land[THRONE] = 'throne';
  const stack = shuffled(LAND_STACK, random);
  const hands = { 1: stack.splice(0, SETTINGS.handSize), 2: stack.splice(0, SETTINGS.handSize) };
  return {
    land, units: Array(SQUARES).fill(null), stack, hands,
    phase: 'setup', currentPlayer: 1, turnNumber: 0, buildsLeft: 0, bonusBuilds: 0, peekFrom: null,
    successionTurn: { 1: null, 2: null }, knowledge: { 1: {}, 2: {} },
    nextId: 1, finalTurnsLeft: null, fallen: [], log: [], result: null
  };
}

export function randomLayout(random = Math.random) {
  return shuffled([...ARMY, null], random);
}

const isPassable = (state, square) => state.land[square] !== null && state.land[square] !== 'river';
const canHoldTile = (state, square) => state.land[square] === null && neighbors(square).some(n => state.land[n] !== null);
export const buildSpots = state => state.land.flatMap((_, square) => canHoldTile(state, square) ? [square] : []);
const canBuild = state => state.hands[state.currentPlayer].length > 0 && buildSpots(state).length > 0;

function log(state, text, player = state.currentPlayer) {
  state.log.push({ turn: state.turnNumber, player, text });
}

function moveDestinations(state, from) {
  const unit = state.units[from];
  const steps = unit.revealed && unit.type === 'scout' ? 2 : 1;
  const reached = new Set();
  let frontier = [from];
  for (let step = 0; step < steps; step++) {
    frontier = frontier.flatMap(square => neighbors(square)).filter(square => isPassable(state, square) && !state.units[square] && square !== from && !reached.has(square));
    frontier.forEach(square => reached.add(square));
  }
  return [...reached];
}

function attackTargets(state, from) {
  const unit = state.units[from];
  if (!unit.revealed) return [];
  const isEnemy = square => state.units[square] && state.units[square].owner !== unit.owner;
  if (unit.type !== 'archer') return neighbors(from).filter(isEnemy);
  // The archer shoots exactly two squares along a row or column, past an empty middle square.
  return [[-2, 0], [2, 0], [0, -2], [0, 2]].flatMap(([dr, dc]) => {
    const row = rowOf(from) + dr, col = colOf(from) + dc;
    if (!inside(row, col)) return [];
    const target = index(row, col);
    const middle = index(rowOf(from) + dr / 2, colOf(from) + dc / 2);
    return !state.units[middle] && isEnemy(target) ? [target] : [];
  });
}

function peekTargets(state, from) {
  return state.units.flatMap((unit, square) => unit && unit.owner !== state.currentPlayer && !unit.revealed
    && distance(from, square) <= SETTINGS.scoutRange && state.land[square] !== 'forest' ? [square] : []);
}

export function getLegalActions(state) {
  if (state.result || state.phase === 'setup') return [];
  const player = state.currentPlayer;
  if (state.phase === 'build' || state.phase === 'bonus-build') {
    const tiles = [...new Set(state.hands[player])];
    return buildSpots(state).flatMap(at => tiles.map(tile => ({ kind: 'build', tile, at })));
  }
  if (state.phase === 'peek') return peekTargets(state, state.peekFrom).map(at => ({ kind: 'peek', at }));
  const actions = [];
  const crown = state.units.findIndex(unit => unit?.owner === player && unit.type === 'crown');
  const successionOpen = state.successionTurn[player] === null && crown !== -1 && !state.units[crown].revealed;
  state.units.forEach((unit, square) => {
    if (unit?.owner !== player) return;
    if (!unit.revealed) actions.push({ kind: 'reveal', at: square });
    for (const to of moveDestinations(state, square)) actions.push({ kind: 'move', from: square, to });
    for (const to of attackTargets(state, square)) actions.push({ kind: 'attack', from: square, to });
    if (successionOpen && !unit.revealed && square !== crown) actions.push({ kind: 'succession', with: square });
  });
  return actions.length ? actions : [{ kind: 'pass' }];
}

const sameAction = (a, b) => ['kind', 'at', 'from', 'to', 'tile', 'with'].every(key => a[key] === b[key]);

export function defenseStrength(state, square) {
  const unit = state.units[square];
  const guarded = neighbors(square).some(n => state.units[n]?.owner === unit.owner && state.units[n].revealed && state.units[n].type === 'guard');
  return UNITS[unit.type].strength + (state.land[square] === 'hill' ? 1 : 0) + (guarded ? 1 : 0);
}

function resolveAttack(state, from, to) {
  const attacker = state.units[from];
  const defender = state.units[to];
  defender.revealed = true;
  const attack = UNITS[attacker.type].strength;
  const defense = defenseStrength(state, to);
  const assassination = attacker.type === 'assassin' && ['crown', 'champion'].includes(defender.type);
  const outcome = assassination || attack > defense ? 'win' : attack < defense ? 'lose' : 'tie';
  const removed = [];
  if (outcome !== 'lose') { state.units[to] = null; removed.push(defender); }
  if (outcome !== 'win') { state.units[from] = null; removed.push(attacker); }
  state.fallen.push(...removed.map(unit => ({ owner: unit.owner, type: unit.type })));
  if (outcome === 'win' && attacker.type !== 'archer') { state.units[to] = attacker; state.units[from] = null; }
  const [a, d] = [UNITS[attacker.type].name, UNITS[defender.type].name];
  const summary = { win: `${a} defeated the ${d}`, lose: `${a} fell to the ${d}`, tie: `${a} and ${d} fell together` }[outcome];
  log(state, `${squareName(from)} attacked ${squareName(to)} (${attack}${assassination ? ', assassination' : ''} vs ${defense}). ${summary}.`);
  const fallenCrowns = removed.filter(unit => unit.type === 'crown').map(unit => unit.owner);
  if (fallenCrowns.length === 2) state.result = { winner: null, reason: 'Both Crowns fell' };
  else if (fallenCrowns.length === 1) state.result = { winner: otherPlayer(fallenCrowns[0]), reason: 'The enemy Crown was captured' };
}

function throneCount(state) {
  const count = player => state.units.filter((unit, square) => unit?.owner === player && distance(square, THRONE) <= SETTINGS.throneZone).length;
  const [one, two] = [count(1), count(2)];
  const units = n => `${n} unit${n === 1 ? '' : 's'}`;
  return one === two
    ? { winner: null, reason: `The land ran out and both sides hold ${units(one)} near the Throne` }
    : { winner: one > two ? 1 : 2, reason: `The land ran out; ${units(Math.max(one, two))} to ${Math.min(one, two)} near the Throne` };
}

function beginTurn(state, player) {
  state.currentPlayer = player;
  state.turnNumber += 1;
  state.peekFrom = null;
  if (state.finalTurnsLeft !== null) {
    state.finalTurnsLeft -= 1;
    if (state.finalTurnsLeft <= 0) { state.result = throneCount(state); state.phase = 'over'; return; }
  }
  const crown = state.units[THRONE];
  if (crown?.owner === player && crown.type === 'crown' && crown.revealed) {
    state.result = { winner: player, reason: 'The Crown holds the Throne' };
    state.phase = 'over';
    return;
  }
  // Player 2's first turn lays extra land to offset moving second.
  state.buildsLeft = player === 2 && state.turnNumber === 2 ? SETTINGS.secondPlayerFirstBuilds : 1;
  state.phase = canBuild(state) ? 'build' : 'act';
}

function endTurn(state) {
  if (state.result) { state.phase = 'over'; return; }
  beginTurn(state, otherPlayer(state.currentPlayer));
}

function placeArmy(state, layout) {
  const player = state.currentPlayer;
  const home = HOME[player];
  if (!Array.isArray(layout) || layout.length !== home.length) throw new Error(`A layout needs exactly ${home.length} entries.`);
  const sorted = list => [...list].filter(Boolean).sort().join();
  if (sorted(layout) !== sorted(ARMY) || layout.filter(type => type === null).length !== 1) throw new Error('A layout must place the whole army and leave one square empty.');
  home.forEach((square, i) => { if (layout[i]) state.units[square] = { id: state.nextId++, owner: player, type: layout[i], revealed: false }; });
  log(state, 'Placed their army in secret.');
  if (player === 1) state.currentPlayer = 2;
  else beginTurn(state, 1);
}

export function applyAction(original, action) {
  if (original.result) throw new Error('The game is over.');
  const state = structuredClone(original);
  const player = state.currentPlayer;
  if (state.phase === 'setup') {
    if (action.kind !== 'place') throw new Error('Place your army first.');
    placeArmy(state, action.layout);
    return state;
  }
  if (!getLegalActions(original).some(legal => sameAction(legal, action))) throw new Error('That action is not legal right now.');
  switch (action.kind) {
    case 'build': {
      const hand = state.hands[player];
      hand.splice(hand.indexOf(action.tile), 1);
      state.land[action.at] = action.tile;
      if (state.stack.length) hand.push(state.stack.shift());
      if (!state.stack.length && state.finalTurnsLeft === null) state.finalTurnsLeft = SETTINGS.finalTurns;
      log(state, `Laid ${action.tile} on ${squareName(action.at)}.`);
      if (state.phase === 'build') {
        state.buildsLeft -= 1;
        if (state.buildsLeft <= 0 || !canBuild(state)) state.phase = 'act';
      } else {
        state.bonusBuilds -= 1;
        if (state.bonusBuilds <= 0 || !canBuild(state)) endTurn(state);
      }
      return state;
    }
    case 'reveal': {
      const unit = state.units[action.at];
      unit.revealed = true;
      log(state, `Revealed a ${UNITS[unit.type].name} on ${squareName(action.at)}.`);
      if (unit.type === 'scout' && peekTargets(state, action.at).length) {
        state.phase = 'peek';
        state.peekFrom = action.at;
      } else if (unit.type === 'builder' && canBuild(state)) {
        state.phase = 'bonus-build';
        state.bonusBuilds = SETTINGS.builderTiles;
      } else endTurn(state);
      return state;
    }
    case 'peek': {
      const unit = state.units[action.at];
      state.knowledge[player][unit.id] = { type: unit.type, turn: state.turnNumber };
      log(state, `The Scout peeked at the hidden unit on ${squareName(action.at)}.`);
      endTurn(state);
      return state;
    }
    case 'move':
      state.units[action.to] = state.units[action.from];
      state.units[action.from] = null;
      log(state, `Moved ${squareName(action.from)} → ${squareName(action.to)}.`);
      endTurn(state);
      return state;
    case 'attack':
      resolveAttack(state, action.from, action.to);
      endTurn(state);
      return state;
    case 'succession': {
      const crown = state.units.findIndex(unit => unit?.owner === player && unit.type === 'crown');
      const other = state.units[action.with];
      [state.units[crown].type, other.type] = [other.type, 'crown'];
      state.successionTurn[player] = state.turnNumber;
      log(state, 'Used succession. Somewhere in the hidden ranks, the Crown may have moved.');
      endTurn(state);
      return state;
    }
    case 'pass':
      log(state, 'Had no legal action and passed.');
      endTurn(state);
      return state;
  }
}

// What one player is allowed to know. Your own units are always known to you;
// enemy hidden units show only an outline, plus anything your Scouts saw.
export function viewFor(state, viewer) {
  const enemy = otherPlayer(viewer);
  return {
    land: [...state.land],
    units: state.units.map(unit => {
      if (!unit) return null;
      if (unit.owner === viewer || unit.revealed) return { id: unit.id, owner: unit.owner, type: unit.type, revealed: unit.revealed };
      const seen = state.knowledge[viewer][unit.id];
      const stale = seen && state.successionTurn[enemy] !== null && state.successionTurn[enemy] > seen.turn;
      return { id: unit.id, owner: unit.owner, revealed: false, ...(seen ? { seen: seen.type, stale } : {}) };
    }),
    hand: [...state.hands[viewer]], opponentHand: state.hands[enemy].length, stackLeft: state.stack.length,
    phase: state.phase, currentPlayer: state.currentPlayer, turnNumber: state.turnNumber,
    buildsLeft: state.buildsLeft, bonusBuilds: state.bonusBuilds, peekFrom: state.peekFrom,
    successionUsed: { 1: state.successionTurn[1] !== null, 2: state.successionTurn[2] !== null },
    finalTurnsLeft: state.finalTurnsLeft, fallen: state.fallen.map(unit => ({ ...unit })), log: state.log.map(entry => ({ ...entry })), result: state.result && { ...state.result }
  };
}
