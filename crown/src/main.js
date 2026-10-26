import { createGame, applyAction, getLegalActions, randomLayout, viewFor } from './engine.js';
import { SQUARES, COLS, ROWS, CORE, HOME, UNITS, LAND, SURGES, SETTINGS, ARMY, squareName, neighbors, position, otherPlayer } from './rules.js';
import { chooseAction as chooseComputerAction } from './ai.js';

const $ = selector => document.querySelector(selector);
const GLYPHS = { crown: '♛', champion: '⚔', guard: '⛨', scout: '◎', archer: '➶', builder: '⚒', assassin: '✠' };
const LAND_GLYPHS = { forest: '♣', hill: '▲', core: '✺' };
// Board space in cell widths. The brick layout is half a cell wider than the squares.
const BOARD_W = COLS + 0.5;
const BOARD_H = ROWS;
const HEX_H = 2 / Math.sqrt(3);

let game;
let viewer = 1;
let draft = Array(HOME[1].length).fill(null); // the army being arranged during setup
let placing = 'crown';
let selected = null;
let tile = 'plains';
let succession = false;
let lastSquares = [];
let current = { view: null, actions: [] };
let wasShattered = false;
let computer = null; // the player the computer controls, or null for two people
let computerTimer = null;
const COMPUTER_DELAY = 550;

const isComputerTurn = () => computer !== null && !game.result && game.currentPlayer === computer;
const playerName = player => computer === null ? `Player ${player}` : player === computer ? 'The computer' : 'You';

// The computer takes one step at a time (each action, land tile or aim) so you can follow it.
function scheduleComputer() {
  if (computerTimer !== null || !isComputerTurn()) return;
  computerTimer = setTimeout(() => {
    computerTimer = null;
    if (isComputerTurn()) act(chooseComputerAction(game));
  }, game.phase === 'setup' ? 0 : COMPUTER_DELAY);
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(text, onClick, className = 'button primary wide') {
  const element = make('button', className, text);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

const unitName = type => UNITS[type].name;
const remaining = type => ARMY.filter(t => t === type).length - draft.filter(t => t === type).length;

function act(action) {
  try {
    const before = game.currentPlayer;
    game = applyAction(game, action);
    if (['move', 'attack', 'reveal', 'grow', 'build', 'peek'].includes(action.kind)) lastSquares = [action.from, action.to, action.at].filter(square => square !== undefined);
    selected = null; succession = false;
    if (!game.result && game.currentPlayer !== before && computer === null) return handOff();
    render();
  } catch (error) {
    $('#status').textContent = error.message;
  }
}

function handOff() {
  document.body.classList.add('veiled');
  const growing = game.phase === 'grow';
  $('#handoff-title').textContent = `Over to Player ${game.currentPlayer}${growing ? ' to grow land' : ''}.`;
  $('#ready-button').textContent = `I'm Player ${game.currentPlayer} · Show my army`;
  render();
  $('#handoff').showModal();
}

// The action a click on this square would take, given the current selection.
function targetAction(square, actions) {
  switch (game.phase) {
    case 'grow':
    case 'build': return actions.find(a => a.at === square && a.tile === tile);
    case 'peek':
    case 'aim': return actions.find(a => a.at === square);
  }
  if (succession) return actions.find(a => a.kind === 'succession' && a.with === square);
  return actions.find(a => a.from === selected && a.to === square);
}

function clickSquare(square) {
  const { view, actions } = current;
  if (game.result || $('#handoff').open || isComputerTurn()) return;
  if (game.phase === 'setup') {
    const slot = HOME[viewer].indexOf(square);
    if (slot === -1) return;
    if (draft[slot]) draft[slot] = null;
    else if (placing && remaining(placing) > 0) {
      draft[slot] = placing;
      if (!remaining(placing)) placing = Object.keys(UNITS).find(remaining) ?? null;
    }
    return render();
  }
  const target = targetAction(square, actions);
  if (target) return act(target);
  if (view.units[square]?.owner === viewer && game.phase === 'act') {
    selected = selected === square ? null : square;
    succession = false;
    render();
  }
}

// Cell centre on screen, in board units. Player 2 sees the field turned around
// so their home is always at the bottom; rotating the whole picture keeps the
// brick layout valid.
function placement(square, hex) {
  const [x, y] = position(square, hex);
  const width = hex ? COLS + 0.5 : COLS;
  const height = hex ? (ROWS - 1) * Math.sqrt(3) / 2 + 1 : ROWS;
  const ox = (BOARD_W - width) / 2, oy = (BOARD_H - height) / 2;
  const [sx, sy] = viewer === 1 ? [x, y] : [width - 1 - x, height - 1 - y];
  return [ox + sx, oy + sy];
}

// Cells are created once and then updated, so the Shattering can animate them
// from squares into hexagons.
function ensureCells() {
  const board = $('#board');
  if (board.children.length) return;
  for (let square = 0; square < SQUARES; square++) {
    const cell = make('button', 'cell');
    cell.type = 'button';
    cell.dataset.square = square;
    cell.addEventListener('click', () => clickSquare(square));
    board.append(cell);
  }
}

function renderBoard(view, actions) {
  ensureCells();
  // Hold the old shape while the pass-device screen is up, so the next player
  // sees the Shattering happen instead of finding it already done.
  const hex = document.body.classList.contains('veiled') ? wasShattered : view.shattered;
  const board = $('#board');
  board.classList.toggle('hex', hex);
  const selectedNeighbors = selected === null ? [] : neighbors(selected, hex);
  for (const cell of board.children) {
    const square = Number(cell.dataset.square);
    const [x, y] = placement(square, hex);
    const height = hex ? HEX_H : 1;
    Object.assign(cell.style, { left: `${x / BOARD_W * 100}%`, top: `${(y + (1 - height) / 2) / BOARD_H * 100}%`, width: `${100 / BOARD_W}%`, height: `${height / BOARD_H * 100}%` });
    const land = view.land[square];
    cell.className = `cell ${land ?? 'void'}`;
    cell.replaceChildren();
    let label = `${squareName(square)}, ${land ? (land === 'core' ? 'the Core' : LAND[land].name) : 'no land'}`;
    if (LAND_GLYPHS[land]) cell.append(make('span', 'land-mark', LAND_GLYPHS[land]));
    if (game.phase === 'setup' && HOME[viewer].includes(square)) cell.classList.add('home');
    const unit = game.phase === 'setup' && HOME[viewer].includes(square)
      ? (draft[HOME[viewer].indexOf(square)] && { owner: viewer, type: draft[HOME[viewer].indexOf(square)], revealed: false })
      : view.units[square];
    if (unit) {
      const own = unit.owner === viewer;
      const known = unit.type ?? unit.seen;
      const token = make('span', `token p${unit.owner}${unit.revealed ? ' revealed' : ' hidden'}${own && !unit.revealed ? ' own-hidden' : ''}`);
      token.append(make('span', 'glyph', known ? GLYPHS[known] : '✦'));
      if (unit.type) token.append(make('span', 'strength', String(UNITS[unit.type].strength)));
      if (unit.seen) token.append(make('span', `seen${unit.stale ? ' stale' : ''}`, unit.stale ? '?' : '◉'));
      cell.append(token);
      label += `, ${own ? 'your' : 'enemy'} ${unit.type ? unitName(unit.type) : 'hidden unit'}${!unit.revealed && unit.type ? ' (hidden from your opponent)' : ''}${unit.seen ? `, scouted as ${unitName(unit.seen)}${unit.stale ? ' before a succession' : ''}` : ''}`;
    }
    if (game.phase !== 'setup' && view.surge.targets.includes(square)) { cell.classList.add('marked'); label += `, marked by the next ${SURGES[view.surge.card].name}`; }
    else if (game.phase !== 'setup' && view.upcoming?.targets.includes(square)) { cell.classList.add('marked-later'); label += `, marked by the ${SURGES[view.upcoming.card].name} after that`; }
    const target = game.phase !== 'setup' && targetAction(square, actions);
    if (target) { cell.classList.add('target', `target-${target.kind}`); label += `, ${target.kind} here`; }
    if (selected === square) cell.classList.add('selected');
    if (selectedNeighbors.includes(square)) cell.classList.add('adjacent');
    if (lastSquares.includes(square)) cell.classList.add('last');
    cell.setAttribute('aria-label', label);
  }
  // Play the Shattering once, when the field first breaks.
  if (hex && !wasShattered) {
    const frame = board.parentElement;
    frame.classList.remove('shattering');
    void frame.offsetWidth;
    frame.classList.add('shattering');
  }
  wasShattered = hex;
}

function unitCard(type) {
  const card = make('div', 'unit-card');
  card.append(make('span', 'card-glyph', GLYPHS[type]), make('strong', '', `${unitName(type)} · ${UNITS[type].strength}`), make('small', '', UNITS[type].text));
  return card;
}

function landChips(cards) {
  for (const type of Object.keys(LAND)) {
    const chip = button(`${LAND_GLYPHS[type] ?? '▭'} ${LAND[type].name}`, () => { tile = type; render(); }, `chip land-chip ${type}${tile === type ? ' active' : ''}`);
    chip.title = LAND[type].text;
    cards.append(chip);
  }
}

function renderPanel(view, actions) {
  const title = $('#panel-title'), hint = $('#panel-hint'), cards = $('#panel-cards'), buttons = $('#panel-buttons');
  cards.replaceChildren(); buttons.replaceChildren();
  if (view.result) {
    title.textContent = !view.result.winner ? 'A drawn battle.' : computer === null ? `Player ${view.result.winner} wins.` : view.result.winner === computer ? 'The computer wins.' : 'You win.';
    hint.textContent = `${view.result.reason}.`;
    buttons.append(button('Play again', () => $('#restart-dialog').showModal()));
    return;
  }
  if (isComputerTurn()) {
    title.textContent = 'The computer is thinking.';
    hint.textContent = 'It knows only what a player in its seat would know: its own units, what has been revealed, fallen or scouted, and the surge everyone can see.';
    return;
  }
  switch (game.phase) {
    case 'setup':
      title.textContent = 'Arrange your army.';
      hint.textContent = 'Choose a unit, then a highlighted home square. One square stays empty. Click a placed unit to pick it up. Only you can see this arrangement.';
      for (const type of Object.keys(UNITS)) {
        const choice = button(`${GLYPHS[type]} ${unitName(type)} ×${remaining(type)}`, () => { placing = type; render(); }, `chip${placing === type ? ' active' : ''}`);
        choice.disabled = remaining(type) === 0;
        cards.append(choice);
      }
      buttons.append(
        button('Arrange randomly', () => { draft = randomLayout(); render(); }, 'button wide'),
        button('Confirm army', () => { const layout = draft; draft = Array(HOME[1].length).fill(null); placing = 'crown'; act({ kind: 'place', layout }); })
      );
      buttons.lastChild.disabled = draft.filter(Boolean).length !== ARMY.length;
      return;
    case 'grow':
    case 'build':
      title.textContent = game.phase === 'grow' ? 'The Core grows the land.' : `Builder · ${view.pending.left} tile${view.pending.left === 1 ? '' : 's'} to lay.`;
      hint.textContent = `Choose a land type, then a highlighted square touching existing land. ${LAND[tile].name}: ${LAND[tile].text}`;
      landChips(cards);
      return;
    case 'peek':
      title.textContent = 'Your Scout looks out.';
      hint.textContent = `Choose a highlighted hidden enemy within ${SETTINGS.scoutRange} steps to see what it is. Only you will know.`;
      return;
    case 'aim':
      title.textContent = 'You hold the Core.';
      hint.textContent = `Your unit on the Core lets you aim the ${SURGES[view.upcoming.card].name} after next (faint stripes), so your opponent still gets a turn to react. Choose a highlighted square for mark ${view.pending.slot + 1}, or keep the current marks.`;
      buttons.append(button('Keep the current marks', () => act({ kind: 'keep-aim' }), 'button wide'));
      return;
  }
  const unit = view.units[selected];
  if (!unit) {
    title.textContent = `Choose a unit · ${view.actionsLeft} action${view.actionsLeft === 1 ? '' : 's'} left.`;
    hint.textContent = 'Select one of your units to reveal, move or attack. Hidden units move one step but cannot attack. One unit may take both actions, but attacks only once.';
  } else {
    title.textContent = `${unitName(unit.type)}${unit.revealed ? '' : ' (hidden)'}`;
    hint.textContent = unit.revealed ? 'Highlighted squares show where it can move or attack. Outlined squares are its neighbours.' : 'Your opponent only sees an outline. Move it one step, or reveal it to use its power.';
    cards.append(unitCard(unit.type));
    if (actions.some(a => a.kind === 'reveal' && a.at === selected)) buttons.append(button(`Reveal ${unitName(unit.type)}`, () => act({ kind: 'reveal', at: selected })));
    if (unit.type === 'crown' && actions.some(a => a.kind === 'succession')) {
      buttons.append(button(succession ? 'Cancel succession' : 'Succession: hide the Crown elsewhere (both actions)', () => { succession = !succession; render(); }, 'button wide'));
      if (succession) hint.textContent = 'Choose another of your hidden units. The Crown and that unit swap identities in secret. Uses both actions, once per game.';
    }
  }
  buttons.append(button(`End turn${view.actionsLeft ? ` · skip ${view.actionsLeft} action${view.actionsLeft === 1 ? '' : 's'}` : ''}`, () => act({ kind: 'end-turn' }), 'button wide'));
}

function renderSurge(view) {
  const card = SURGES[view.surge.card];
  $('#surge-meta').textContent = `${view.deckName === 'wild' ? 'WILD' : 'CALM'} DECK · ${view.deckLeft} LEFT`;
  $('#surge-name').textContent = card.name;
  const timing = view.shattered ? 'after this turn' : view.currentPlayer === 2 ? 'after this turn, at the end of the round' : 'at the end of the round';
  $('#surge-text').textContent = `${card.text} It happens ${timing}.${card.targets ? ' Its marked squares have solid stripes.' : ''}`;
  $('#surge-then').hidden = !view.upcoming;
  if (view.upcoming) {
    const then = SURGES[view.upcoming.card];
    $('#surge2-name').textContent = then.name;
    $('#surge2-text').textContent = `${then.text} It happens after the following turn.${then.targets ? ' Its marked squares have faint stripes.' : ''}`;
  }
  const list = $('#unaccounted'); list.replaceChildren();
  const counts = view.unaccounted.reduce((all, type) => ({ ...all, [type]: (all[type] ?? 0) + 1 }), {});
  for (const [type, count] of Object.entries(counts)) list.append(make('span', 'chip static', `${GLYPHS[type]} ${unitName(type)}${count > 1 ? ` ×${count}` : ''}`));
  if (!view.unaccounted.length) list.append(make('span', 'hint', 'None. Every enemy unit is known.'));
  const enemy = viewer === 1 ? 2 : 1;
  $('#intel-text').textContent = `Enemy succession: ${view.successionUsed[enemy] ? 'used — older scouting may be wrong' : 'not used yet'}. ${view.shattered ? 'The field has shattered.' : `The field shatters when a unit reaches the Core, or after round ${SETTINGS.shatterRound}.`}`;
}

function render() {
  const view = viewFor(game, viewer);
  const actions = $('#handoff').open || isComputerTurn() ? [] : getLegalActions(game);
  current = { view, actions };
  $('#turn-dot').className = `dot p${game.currentPlayer}`;
  const verb = { setup: 'arrange', act: 'act', peek: 'scout', build: 'build', grow: 'grow land', aim: 'aim the Core' }[game.phase] ?? 'act';
  $('#turn-title').textContent = view.result ? 'The battle is over' : `${playerName(game.currentPlayer)} to ${verb}`;
  $('#turn-meta').textContent = game.phase === 'setup' ? 'SETUP' : `ROUND ${String(view.round).padStart(2, '0')}${view.shattered ? ' · SHATTERED' : ''}`;
  const holder = view.units[CORE];
  const statuses = {
    setup: 'Place your army in secret. Your Crown goes wherever you choose.',
    act: `Take ${view.actionsLeft} more action${view.actionsLeft === 1 ? '' : 's'}: reveal, move, attack, or use succession.${holder?.owner === viewer && holder.type === 'crown' && holder.revealed ? ' Your Crown holds the Core — keep it there through the next round to win.' : ''}`,
    peek: 'Choose a hidden enemy for your Scout to look at.',
    build: 'Your Builder lays land.',
    grow: 'The Core surges with growth. Lay one land tile.',
    aim: 'You hold the Core: aim the surge after next.',
    over: view.result ? `${view.result.winner ? `Player ${view.result.winner} wins` : 'Draw'} · ${view.result.reason}` : ''
  };
  $('#status').textContent = isComputerTurn() ? 'The computer is taking its turn…' : statuses[game.phase];
  if (view.result && computer !== null && view.result.winner) $('#status').textContent = `${view.result.winner === computer ? 'The computer wins' : 'You win'} · ${view.result.reason}`;
  $('#status').classList.toggle('finished', Boolean(view.result));
  renderPanel(view, actions);
  renderBoard(view, actions);
  renderSurge(view);
  const log = $('#log'); log.replaceChildren();
  for (const entry of view.log.slice(-40).reverse()) {
    const item = make('li', entry.player === 0 ? 'core-entry' : '');
    item.append(make('span', `dot small ${entry.player ? `p${entry.player}` : 'core'}`), make('span', '', `${entry.turn ? `T${entry.turn} · ` : ''}${entry.text}`));
    log.append(item);
  }
  scheduleComputer();
}

function showRules() {
  const blocks = [
    ['Goal', `Capture the enemy Crown, or start ${SETTINGS.holdTurns} of your turns in a row with your revealed Crown on the Core.`],
    ['Setup', 'Each player secretly arranges 9 face-down units on their 10-square home. Your Crown goes wherever you choose.'],
    ['Your turn', `Take ${SETTINGS.actionsPerTurn} actions (Player 1 takes ${SETTINGS.firstTurnActions} on the very first turn). Reveal a unit, move a unit one step, attack with a revealed unit, or once per game use succession, which takes both actions. One unit may take both actions but attacks only once. You may end your turn early.`],
    ['The Wild Core', 'The Core surges at the end of every round. The next surge card and the squares it will hit are always shown. Calm surges grow land, reveal hidden units, push units away, or strike with bolts of strength 3.'],
    ['The Shattering', `The first time a unit reaches a square next to the Core — or at the end of round ${SETTINGS.shatterRound} — the field breaks into hexagons. Every cell then has 6 neighbours, the Wild deck takes over (storms, pulses, sinking land), and the Core surges after every turn. From then on the next two surges are always shown, so every mark is visible through one turn of each player before it strikes.`],
    ['Holding the Core', 'A unit that starts its owner’s turn on the Core is never pushed or struck, and its owner aims the surge after next (the one with faint stripes), so the target always gets a turn to react. Only a revealed Crown can win there.'],
    ['Combat', 'The defender is turned face up. Higher strength wins; ties remove both. A winning attacker moves in, except the Archer. Defenders get +1 on a Hill and +1 next to their revealed Guard. A revealed Crown gives +1 to friendly units next to it, attacking and defending. The Assassin always beats the Crown and the Champion when it attacks.'],
    ['Units', Object.values(UNITS).map(unit => `${unit.name} (${unit.strength}): ${unit.text}`).join(' ')],
    ['Land', `${Object.values(LAND).map(land => `${land.name}: ${land.text}`).join(' ')} Squares with no land cannot be entered.`],
    ['Succession', 'Once per game, using both actions, secretly swap your hidden Crown with another of your hidden units. Your opponent learns only that you used it.'],
    ['Intelligence', 'The side panel lists the enemy unit types you have not yet seen revealed, fallen, or scouted.']
  ];
  const container = $('#rules-content'); container.replaceChildren();
  for (const [heading, text] of blocks) { const block = make('section', 'rule'); block.append(make('h3', '', heading), make('p', '', text)); container.append(block); }
  $('#rules-dialog').showModal();
}

function startGame() {
  const form = $('#restart-form');
  const human = Number(form.elements.side.value);
  computer = form.elements.opponent.value === 'computer' ? otherPlayer(human) : null;
  clearTimeout(computerTimer);
  computerTimer = null;
  game = createGame();
  viewer = computer === null ? 1 : human; selected = null; tile = 'plains'; succession = false; lastSquares = []; wasShattered = false;
  draft = Array(HOME[1].length).fill(null); placing = 'crown';
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  document.body.classList.remove('veiled');
  render();
}

$('#handoff').addEventListener('cancel', event => event.preventDefault());
$('#ready-button').addEventListener('click', () => {
  viewer = game.currentPlayer;
  $('#handoff').close();
  document.body.classList.remove('veiled');
  render();
});
$('#rules-button').addEventListener('click', showRules);
$('#new-game').addEventListener('click', () => $('#restart-dialog').showModal());
$('#restart-form').addEventListener('submit', event => { event.preventDefault(); startGame(); });
$('#restart-form').elements.opponent.addEventListener('change', event => { $('#side-field').hidden = event.currentTarget.value !== 'computer'; });
for (const close of document.querySelectorAll('[data-close]')) close.addEventListener('click', () => document.getElementById(close.dataset.close).close());
startGame();
