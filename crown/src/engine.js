import {
  SQUARES, CORE, CORE_PATCH, HOME, UNITS, ARMY, LAND, SURGES, DECKS, SETTINGS,
  otherPlayer, neighbors, distance, directions, step, position, squareName
} from './rules.js';

// Crown & Veil 0.2 — The Wild Core.
// Phases: setup → act (with peek / build sub-steps) → [grow during a surge] → … → over.
// A harnessing player may start their turn in `aim` to re-mark the next surge.

// A small deterministic generator kept in the state, so applyAction stays pure.
function nextRandom(state) {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return state.seed / 2 ** 32;
}

export function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomLayout(random = Math.random) {
  return shuffled([...ARMY, null], random);
}

export function createGame({ random = Math.random } = {}) {
  const land = Array(SQUARES).fill(null);
  for (const square of [...HOME[1], ...HOME[2], ...CORE_PATCH]) land[square] = 'plains';
  land[CORE] = 'core';
  const state = {
    land, units: Array(SQUARES).fill(null), seed: Math.floor(random() * 2 ** 32),
    phase: 'setup', currentPlayer: 1, turnNumber: 0, round: 0, actionsLeft: 0, attacked: [],
    shattered: false, deckName: 'calm', deck: [], surge: null, upcoming: null, pending: null,
    successionTurn: { 1: null, 2: null }, knowledge: { 1: {}, 2: {} }, crownHold: { 1: 0, 2: 0 },
    nextId: 1, fallen: [], log: [], result: null
  };
  state.deck = shuffled(DECKS.calm, () => nextRandom(state));
  state.surge = drawSurge(state);
  return state;
}

const hex = state => state.shattered;
const near = (state, a, b) => distance(a, b, hex(state));
const isLand = (state, square) => state.land[square] !== null;
const isOpen = (state, square) => isLand(state, square) && !state.units[square];
export const buildSpots = state => state.land.flatMap((type, square) =>
  type === null && neighbors(square, hex(state)).some(n => isLand(state, n)) ? [square] : []);

function log(state, text, player = state.currentPlayer) {
  state.log.push({ turn: state.turnNumber, player, text });
}

// --- Surges ---------------------------------------------------------------

export function targetCandidates(state, card) {
  if (card === 'sink') return state.land.flatMap((type, square) => type && type !== 'core' && !HOME[1].includes(square) && !HOME[2].includes(square)
    && !state.units[square] && near(state, square, CORE) <= SETTINGS.sinkRange ? [square] : []);
  return state.land.flatMap((type, square) => type && square !== CORE && near(state, square, CORE) <= SETTINGS.targetRange ? [square] : []);
}

function markTargets(state, card) {
  const count = SURGES[card].targets;
  if (!count) return [];
  return shuffled(targetCandidates(state, card), () => nextRandom(state)).slice(0, count);
}

function drawSurge(state) {
  if (!state.deck.length) state.deck = shuffled(DECKS[state.deckName], () => nextRandom(state));
  const card = state.deck.shift();
  return { card, targets: markTargets(state, card) };
}

function defenseStrength(state, square) {
  const unit = state.units[square];
  const friendly = type => neighbors(square, hex(state)).some(n => state.units[n]?.owner === unit.owner && state.units[n].revealed && state.units[n].type === type);
  return UNITS[unit.type].strength + (state.land[square] === 'hill' ? 1 : 0) + (friendly('guard') ? 1 : 0) + (unit.type !== 'crown' && friendly('crown') ? 1 : 0);
}

function attackStrength(state, square) {
  const unit = state.units[square];
  const rallied = unit.type !== 'crown' && neighbors(square, hex(state)).some(n => state.units[n]?.owner === unit.owner && state.units[n].revealed && state.units[n].type === 'crown');
  return UNITS[unit.type].strength + (rallied ? 1 : 0);
}
export { defenseStrength, attackStrength };

function remove(state, square) {
  const unit = state.units[square];
  state.units[square] = null;
  state.fallen.push({ owner: unit.owner, type: unit.type });
  return unit;
}

function checkCrowns(state, removed) {
  const fallen = removed.filter(unit => unit.type === 'crown').map(unit => unit.owner);
  if (fallen.length === 2) state.result = { winner: null, reason: 'Both Crowns fell' };
  else if (fallen.length === 1) state.result = { winner: otherPlayer(fallen[0]), reason: 'The enemy Crown was captured' };
}

function strike(state, square) {
  const unit = state.units[square];
  if (!unit) return [];
  unit.revealed = true;
  const defense = defenseStrength(state, square);
  if (SETTINGS.boltStrength >= defense) {
    log(state, `The Core’s bolt destroyed the ${UNITS[unit.type].name} on ${squareName(square)} (${SETTINGS.boltStrength} vs ${defense}).`, 0);
    return [remove(state, square)];
  }
  log(state, `The ${UNITS[unit.type].name} on ${squareName(square)} withstood a bolt (${SETTINGS.boltStrength} vs ${defense}).`, 0);
  return [];
}

// Push one step to the neighbour farther from the Core whose direction best
// matches the line from the Core through the unit. Blocked pushes do nothing.
function pushAway(state, square) {
  const from = near(state, square, CORE);
  const [cx, cy] = position(CORE, hex(state));
  const [ux, uy] = position(square, hex(state));
  const away = Math.atan2(uy - cy, ux - cx);
  const options = neighbors(square, hex(state)).filter(n => near(state, n, CORE) === from + 1);
  if (!options.length) return;
  const angle = n => { const [x, y] = position(n, hex(state)); const a = Math.atan2(y - uy, x - ux) - away; return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); };
  const target = options.sort((a, b) => angle(a) - angle(b))[0];
  if (isOpen(state, target)) {
    state.units[target] = state.units[square];
    state.units[square] = null;
  }
}

function pushRing(state, range) {
  const squares = state.units.flatMap((unit, square) => unit && square !== CORE && near(state, square, CORE) <= range ? [square] : []);
  squares.sort((a, b) => near(state, b, CORE) - near(state, a, CORE)).forEach(square => pushAway(state, square));
}

function resolveSurge(state, nextPlayer) {
  const { card, targets } = state.surge;
  log(state, `The Core surged: ${SURGES[card].name}.`, 0);
  const removed = [];
  switch (card) {
    case 'grow': {
      const queue = [nextPlayer, otherPlayer(nextPlayer)];
      state.pending = { kind: 'grow', queue, nextPlayer };
      return continueGrow(state);
    }
    case 'bloom':
      state.land.forEach((type, square) => { if (type === null && near(state, square, CORE) <= SETTINGS.targetRange) state.land[square] = 'plains'; });
      break;
    case 'flare':
      for (const square of targets) if (state.units[square] && !state.units[square].revealed) {
        state.units[square].revealed = true;
        log(state, `The flare revealed a ${UNITS[state.units[square].type].name} on ${squareName(square)}.`, 0);
      }
      break;
    case 'wildFlare':
      for (const square of neighbors(CORE, hex(state))) if (state.units[square] && !state.units[square].revealed) {
        state.units[square].revealed = true;
        log(state, `The wild flare revealed a ${UNITS[state.units[square].type].name} on ${squareName(square)}.`, 0);
      }
      break;
    case 'tremor': pushRing(state, 1); break;
    case 'pulse': pushRing(state, 2); break;
    case 'bolt':
    case 'storm':
      for (const square of targets) removed.push(...strike(state, square));
      break;
    case 'sink':
      for (const square of targets) if (state.land[square] && !state.units[square]) state.land[square] = null;
      break;
  }
  checkCrowns(state, removed);
  finishSurge(state, nextPlayer);
}

function continueGrow(state) {
  const pending = state.pending;
  while (pending.queue.length && !buildSpots(state).length) pending.queue.shift();
  if (!pending.queue.length) {
    state.pending = null;
    return finishSurge(state, pending.nextPlayer);
  }
  state.currentPlayer = pending.queue[0];
  state.phase = 'grow';
}

// After the Shattering the Core surges after every turn, so two surges are
// always showing: the next one, and the one after it. Every mark is visible
// through a turn of each player before it strikes.
function finishSurge(state, nextPlayer) {
  if (state.result) { state.phase = 'over'; return; }
  if (state.shattered) {
    state.surge = state.upcoming;
    state.upcoming = drawSurge(state);
  } else if (state.round >= SETTINGS.shatterRound && nextPlayer === 1) {
    state.surge = drawSurge(state);
    shatter(state, 'The Core could not be contained any longer.');
  } else state.surge = drawSurge(state);
  beginTurn(state, nextPlayer);
}

// The surge already showing still comes next; the Wild deck starts behind it,
// so the Shattering never brings an unseen strike.
function shatter(state, reason) {
  state.shattered = true;
  state.deckName = 'wild';
  state.deck = shuffled(DECKS.wild, () => nextRandom(state));
  state.upcoming = drawSurge(state);
  log(state, `The Shattering! ${reason} The field breaks into hexagons. The Core now surges after every turn, and the next two surges are always shown.`, 0);
}

// --- Turns ----------------------------------------------------------------

function beginTurn(state, player) {
  state.currentPlayer = player;
  state.turnNumber += 1;
  if (player === 1) state.round += 1;
  state.pending = null;
  state.attacked = [];
  if (state.round > SETTINGS.maxRounds) {
    state.result = { winner: null, reason: 'The Core burned itself out' };
    state.phase = 'over';
    return;
  }
  const holder = state.units[CORE];
  state.crownHold[player] = holder?.owner === player && holder.type === 'crown' && holder.revealed ? state.crownHold[player] + 1 : 0;
  if (state.crownHold[player] >= SETTINGS.holdTurns) {
    state.result = { winner: player, reason: 'The Crown harnessed the Core' };
    state.phase = 'over';
    return;
  }
  state.actionsLeft = state.turnNumber === 1 ? SETTINGS.firstTurnActions : SETTINGS.actionsPerTurn;
  const harnessing = holder?.owner === player;
  state.phase = harnessing && state.surge.targets.length ? 'aim' : 'act';
  if (state.phase === 'aim') state.pending = { kind: 'aim', slot: 0 };
}

function endTurn(state) {
  if (state.result) { state.phase = 'over'; return; }
  const nextPlayer = otherPlayer(state.currentPlayer);
  // Before the Shattering the Core surges once per round, after Player 2's turn.
  if (state.shattered || state.currentPlayer === 2) resolveSurge(state, nextPlayer);
  else beginTurn(state, nextPlayer);
}

function afterAction(state) {
  if (state.result) { state.phase = 'over'; return; }
  if (!state.shattered && state.units.some((unit, square) => unit && distance(square, CORE, false) <= 1)) {
    shatter(state, 'A unit reached the Core.');
  }
  if (state.pending) return;
  if (state.actionsLeft <= 0) endTurn(state);
  else state.phase = 'act';
}

function moveDestinations(state, from) {
  const unit = state.units[from];
  const steps = unit.revealed && unit.type === 'scout' ? 2 : 1;
  const reached = new Set();
  let frontier = [from];
  for (let i = 0; i < steps; i++) {
    frontier = frontier.flatMap(square => neighbors(square, hex(state))).filter(square => isOpen(state, square) && !reached.has(square));
    frontier.forEach(square => reached.add(square));
  }
  return [...reached];
}

function attackTargets(state, from) {
  const unit = state.units[from];
  if (!unit.revealed || state.attacked.includes(unit.id)) return [];
  const isEnemy = square => square !== null && state.units[square] && state.units[square].owner !== unit.owner;
  if (unit.type !== 'archer') return neighbors(from, hex(state)).filter(isEnemy);
  return directions(hex(state)).flatMap(direction => {
    const middle = step(from, direction, hex(state));
    const target = middle === null ? null : step(middle, direction, hex(state));
    return middle !== null && !state.units[middle] && isEnemy(target) ? [target] : [];
  });
}

function peekTargets(state, from) {
  return state.units.flatMap((unit, square) => unit && unit.owner !== state.currentPlayer && !unit.revealed
    && near(state, from, square) <= SETTINGS.scoutRange && state.land[square] !== 'forest' ? [square] : []);
}

const landChoices = state => buildSpots(state).flatMap(at => Object.keys(LAND).map(tile => ({ tile, at })));

export function getLegalActions(state) {
  if (state.result || state.phase === 'setup') return [];
  const player = state.currentPlayer;
  switch (state.phase) {
    case 'grow': return landChoices(state).map(choice => ({ kind: 'grow', ...choice }));
    case 'build': return landChoices(state).map(choice => ({ kind: 'build', ...choice }));
    case 'peek': return peekTargets(state, state.pending.from).map(at => ({ kind: 'peek', at }));
    case 'aim': return [...targetCandidates(state, state.surge.card).filter(at => !state.surge.targets.some((marked, i) => i !== state.pending.slot && marked === at)).map(at => ({ kind: 'aim', at })), { kind: 'keep-aim' }];
  }
  const actions = [];
  const crown = state.units.findIndex(unit => unit?.owner === player && unit.type === 'crown');
  const successionOpen = state.successionTurn[player] === null && state.actionsLeft >= 2 && crown !== -1 && !state.units[crown].revealed;
  state.units.forEach((unit, square) => {
    if (unit?.owner !== player) return;
    if (!unit.revealed) actions.push({ kind: 'reveal', at: square });
    for (const to of moveDestinations(state, square)) actions.push({ kind: 'move', from: square, to });
    for (const to of attackTargets(state, square)) actions.push({ kind: 'attack', from: square, to });
    if (successionOpen && !unit.revealed && square !== crown) actions.push({ kind: 'succession', with: square });
  });
  actions.push({ kind: 'end-turn' });
  return actions;
}

const sameAction = (a, b) => ['kind', 'at', 'from', 'to', 'tile', 'with'].every(key => a[key] === b[key]);

function resolveAttack(state, from, to) {
  const attacker = state.units[from];
  const defender = state.units[to];
  defender.revealed = true;
  state.attacked.push(attacker.id);
  const attack = attackStrength(state, from);
  const defense = defenseStrength(state, to);
  const assassination = attacker.type === 'assassin' && ['crown', 'champion'].includes(defender.type);
  const outcome = assassination || attack > defense ? 'win' : attack < defense ? 'lose' : 'tie';
  const removed = [];
  if (outcome !== 'lose') removed.push(remove(state, to));
  if (outcome !== 'win') removed.push(remove(state, from));
  if (outcome === 'win' && attacker.type !== 'archer') { state.units[to] = attacker; state.units[from] = null; }
  const [a, d] = [UNITS[attacker.type].name, UNITS[defender.type].name];
  const summary = { win: `${a} defeated the ${d}`, lose: `${a} fell to the ${d}`, tie: `${a} and ${d} fell together` }[outcome];
  log(state, `${squareName(from)} attacked ${squareName(to)} (${attack}${assassination ? ', assassination' : ''} vs ${defense}). ${summary}.`);
  checkCrowns(state, removed);
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
    case 'grow':
      state.land[action.at] = action.tile;
      log(state, `Grew ${action.tile} on ${squareName(action.at)}.`);
      state.pending.queue.shift();
      continueGrow(state);
      return state;
    case 'build':
      state.land[action.at] = action.tile;
      log(state, `The Builder laid ${action.tile} on ${squareName(action.at)}.`);
      state.pending.left -= 1;
      if (state.pending.left <= 0 || !buildSpots(state).length) state.pending = null;
      afterAction(state);
      return state;
    case 'aim':
    case 'keep-aim':
      if (action.kind === 'aim') {
        state.surge.targets[state.pending.slot] = action.at;
        state.pending.slot += 1;
        log(state, `Harnessing the Core, aimed the coming ${SURGES[state.surge.card].name} at ${squareName(action.at)}.`);
      }
      if (action.kind === 'keep-aim' || state.pending.slot >= SURGES[state.surge.card].targets) { state.pending = null; state.phase = 'act'; }
      return state;
    case 'peek': {
      const unit = state.units[action.at];
      state.knowledge[player][unit.id] = { type: unit.type, turn: state.turnNumber };
      log(state, `The Scout peeked at the hidden unit on ${squareName(action.at)}.`);
      state.pending = null;
      afterAction(state);
      return state;
    }
    case 'reveal': {
      const unit = state.units[action.at];
      unit.revealed = true;
      state.actionsLeft -= 1;
      log(state, `Revealed a ${UNITS[unit.type].name} on ${squareName(action.at)}.`);
      if (unit.type === 'scout' && peekTargets(state, action.at).length) { state.pending = { kind: 'peek', from: action.at }; state.phase = 'peek'; }
      else if (unit.type === 'builder' && buildSpots(state).length) { state.pending = { kind: 'build', left: SETTINGS.builderTiles }; state.phase = 'build'; }
      afterAction(state);
      return state;
    }
    case 'move':
      state.units[action.to] = state.units[action.from];
      state.units[action.from] = null;
      state.actionsLeft -= 1;
      log(state, `Moved ${squareName(action.from)} → ${squareName(action.to)}.`);
      afterAction(state);
      return state;
    case 'attack':
      resolveAttack(state, action.from, action.to);
      state.actionsLeft -= 1;
      afterAction(state);
      return state;
    case 'succession': {
      const crown = state.units.findIndex(unit => unit?.owner === player && unit.type === 'crown');
      const other = state.units[action.with];
      [state.units[crown].type, other.type] = [other.type, 'crown'];
      state.successionTurn[player] = state.turnNumber;
      state.actionsLeft = 0;
      log(state, 'Used succession. Somewhere in the hidden ranks, the Crown may have moved.');
      afterAction(state);
      return state;
    }
    case 'end-turn':
      log(state, 'Ended the turn.');
      state.actionsLeft = 0;
      endTurn(state);
      return state;
  }
}

// What one player may know. Your own units are known to you; enemy hidden
// units show an outline plus anything your Scouts saw. `unaccounted` lists the
// enemy types not yet revealed, fallen, or freshly scouted — for deduction.
export function viewFor(state, viewer) {
  const enemy = otherPlayer(viewer);
  const stale = seen => state.successionTurn[enemy] !== null && state.successionTurn[enemy] > seen.turn;
  const unaccounted = [...ARMY];
  const take = type => { const at = unaccounted.indexOf(type); if (at !== -1) unaccounted.splice(at, 1); };
  const units = state.units.map(unit => {
    if (!unit) return null;
    if (unit.owner === viewer || unit.revealed) {
      if (unit.owner === enemy) take(unit.type);
      return { id: unit.id, owner: unit.owner, type: unit.type, revealed: unit.revealed };
    }
    const seen = state.knowledge[viewer][unit.id];
    if (seen && !stale(seen)) take(seen.type);
    return { id: unit.id, owner: unit.owner, revealed: false, ...(seen ? { seen: seen.type, stale: stale(seen) } : {}) };
  });
  state.fallen.filter(unit => unit.owner === enemy).forEach(unit => take(unit.type));
  return {
    land: [...state.land], units, unaccounted, shattered: state.shattered,
    surge: { ...state.surge, targets: [...state.surge.targets] }, upcoming: state.upcoming && { ...state.upcoming, targets: [...state.upcoming.targets] }, deckName: state.deckName, deckLeft: state.deck.length,
    phase: state.phase, currentPlayer: state.currentPlayer, turnNumber: state.turnNumber, round: state.round,
    actionsLeft: state.actionsLeft, pending: state.pending && structuredClone(state.pending), crownHold: { ...state.crownHold },
    successionUsed: { 1: state.successionTurn[1] !== null, 2: state.successionTurn[2] !== null },
    fallen: state.fallen.map(unit => ({ ...unit })), log: state.log.map(entry => ({ ...entry })), result: state.result && { ...state.result }
  };
}
