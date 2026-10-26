import { createGame, applyAction, getLegalActions, randomLayout, viewFor } from './engine.js';
import { SQUARES, HOME, UNITS, LAND, ARMY, SETTINGS, squareName, otherPlayer } from './rules.js';
import { chooseAction as chooseComputerAction } from './ai.js';

const $ = selector => document.querySelector(selector);
const GLYPHS = { crown: '♛', champion: '⚔', guard: '⛨', scout: '◎', archer: '➶', builder: '⚒', assassin: '✠' };
const LAND_GLYPHS = { forest: '♣', hill: '▲', river: '≈', throne: '♛' };

let game;
let viewer = 1;
let draft = Array(HOME[1].length).fill(null); // the army being arranged during setup
let placing = 'crown';
let selected = null;
let tile = null;
let succession = false;
let lastSquares = [];
let computer = null; // the player the computer controls, or null for two people
let computerTimer = null;
const COMPUTER_DELAY = 500;

const isComputerTurn = () => computer !== null && !game.result && game.currentPlayer === computer;
const playerName = player => computer === null ? `Player ${player}` : player === computer ? 'The computer' : 'You';

// The computer takes one step at a time (each build, then its action) so you can follow it.
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
    lastSquares = [action.from, action.to, action.at].filter(square => square !== undefined && action.kind !== 'succession');
    selected = null; succession = false;
    tile = game.hands[game.currentPlayer][0] ?? null;
    if (!game.result && game.currentPlayer !== before && computer === null) return handOff();
    render();
  } catch (error) {
    $('#status').textContent = error.message;
  }
}

function handOff() {
  document.body.classList.add('veiled');
  $('#handoff-title').textContent = `Over to Player ${game.currentPlayer}.`;
  $('#ready-button').textContent = `I'm Player ${game.currentPlayer} · Show my army`;
  render();
  $('#handoff').showModal();
}

// Board squares in screen order: each player sees their own home at the bottom.
const screenOrder = () => Array.from({ length: SQUARES }, (_, i) => viewer === 1 ? i : SQUARES - 1 - i);

function clickSquare(square, view, actions) {
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

// The action a click on this square would take, given the current selection.
function targetAction(square, actions) {
  if (game.phase === 'build' || game.phase === 'bonus-build') return actions.find(a => a.at === square && a.tile === tile);
  if (game.phase === 'peek') return actions.find(a => a.at === square);
  if (succession) return actions.find(a => a.kind === 'succession' && a.with === square);
  return actions.find(a => a.from === selected && a.to === square);
}

function renderBoard(view, actions) {
  const board = $('#board');
  board.replaceChildren();
  for (const square of screenOrder()) {
    const land = view.land[square];
    const cell = make('button', `cell ${land ?? 'void'}`);
    cell.type = 'button';
    let label = `${squareName(square)}, ${land ? (land === 'throne' ? 'the Throne' : LAND[land]?.name ?? 'land') : 'no land yet'}`;
    if (land && LAND_GLYPHS[land]) cell.append(make('span', 'land-mark', LAND_GLYPHS[land]));
    const home = game.phase === 'setup' && HOME[viewer].includes(square);
    if (home) cell.classList.add('home');
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
    const target = game.phase !== 'setup' && targetAction(square, actions);
    if (target) { cell.classList.add('target', `target-${target.kind}`); label += `, ${target.kind} here`; }
    if (selected === square) cell.classList.add('selected');
    if (lastSquares.includes(square)) cell.classList.add('last');
    cell.setAttribute('aria-label', label);
    cell.addEventListener('click', () => clickSquare(square, view, actions));
    board.append(cell);
  }
}

function unitCard(type, extra = '') {
  const card = make('div', 'unit-card');
  card.append(make('span', 'card-glyph', GLYPHS[type]), make('strong', '', `${unitName(type)} · ${UNITS[type].strength}`), make('small', '', `${UNITS[type].text}${extra}`));
  return card;
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
    hint.textContent = 'It knows only what a player in its seat would know: its own units, what it has revealed or scouted, and the land it holds.';
    return;
  }
  if (game.phase === 'setup') {
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
  }
  if (game.phase === 'build' || game.phase === 'bonus-build') {
    title.textContent = game.phase === 'build' ? `Lay land${view.buildsLeft > 1 ? ` · ${view.buildsLeft} tiles` : ''}.` : `Builder bonus · ${view.bonusBuilds} tile${view.bonusBuilds === 1 ? '' : 's'}.`;
    hint.textContent = 'Choose a tile from your hand, then a highlighted square touching existing land.';
    for (const type of view.hand) {
      const card = button(`${LAND_GLYPHS[type] ?? '▭'} ${LAND[type].name}`, () => { tile = type; render(); }, `chip land-chip ${type}${tile === type ? ' active' : ''}`);
      card.title = LAND[type].text;
      cards.append(card);
    }
    if (tile) hint.textContent += ` ${LAND[tile].name}: ${LAND[tile].text}`;
    return;
  }
  if (game.phase === 'peek') {
    title.textContent = 'Your Scout looks out.';
    hint.textContent = `Choose a highlighted hidden enemy within ${SETTINGS.scoutRange} squares to see what it is. Only you will know.`;
    return;
  }
  const unit = view.units[selected];
  if (!unit) {
    title.textContent = 'Choose a unit.';
    hint.textContent = 'Select one of your units to reveal, move or attack. Hidden units move one square but cannot attack.';
    if (actions[0]?.kind === 'pass') buttons.append(button('Pass', () => act({ kind: 'pass' })));
    return;
  }
  title.textContent = `${unitName(unit.type)}${unit.revealed ? '' : ' (hidden)'}`;
  hint.textContent = unit.revealed ? 'Highlighted squares show where it can move or attack.' : 'Your opponent only sees an outline. Move it one square, or reveal it to use its power.';
  cards.append(unitCard(unit.type));
  if (actions.some(a => a.kind === 'reveal' && a.at === selected)) buttons.append(button(`Reveal ${unitName(unit.type)}`, () => act({ kind: 'reveal', at: selected })));
  if (unit.type === 'crown' && actions.some(a => a.kind === 'succession')) {
    buttons.append(button(succession ? 'Cancel succession' : 'Succession: hide the Crown elsewhere', () => { succession = !succession; render(); }, 'button wide'));
    if (succession) hint.textContent = 'Choose another of your hidden units. The Crown and that unit swap identities in secret. You can do this once per game.';
  }
}

function renderLand(view) {
  $('#land-meta').textContent = `${view.stackLeft} IN STACK`;
  const countdown = view.finalTurnsLeft === null ? '' : ` The land has run out: ${view.finalTurnsLeft} turn${view.finalTurnsLeft === 1 ? '' : 's'} remain before the units within ${SETTINGS.throneZone} squares of the Throne are counted.`;
  $('#land-text').textContent = `Your hand: ${view.hand.map(type => LAND[type].name).join(', ') || 'empty'}. Your opponent holds ${view.opponentHand} tile${view.opponentHand === 1 ? '' : 's'}. Succession used: Player 1 ${view.successionUsed[1] ? 'yes' : 'no'}, Player 2 ${view.successionUsed[2] ? 'yes' : 'no'}.${countdown}`;
}

function render() {
  const view = viewFor(game, viewer);
  const actions = $('#handoff').open || isComputerTurn() ? [] : getLegalActions(game);
  $('#turn-dot').className = `dot p${game.currentPlayer}`;
  const verb = game.phase === 'setup' ? 'arrange' : game.phase === 'act' ? 'act' : game.phase === 'peek' ? 'scout' : 'build';
  $('#turn-title').textContent = view.result ? 'The battle is over' : `${playerName(game.currentPlayer)} to ${verb}`;
  $('#turn-meta').textContent = game.phase === 'setup' ? 'SETUP' : `TURN ${String(view.turnNumber).padStart(2, '0')}`;
  const statuses = {
    setup: 'Place your army in secret. Your Crown goes wherever you choose.',
    build: 'Lay one land tile next to existing land.',
    'bonus-build': 'Your Builder lays extra land.',
    act: 'Do one thing: reveal, move, attack, or use succession.',
    peek: 'Choose a hidden enemy for your Scout to look at.',
    over: view.result ? `${view.result.winner ? `Player ${view.result.winner} wins` : 'Draw'} · ${view.result.reason}` : ''
  };
  $('#status').textContent = isComputerTurn() ? 'The computer is taking its turn…' : statuses[game.phase];
  if (view.result && computer !== null && view.result.winner) $('#status').textContent = `${view.result.winner === computer ? 'The computer wins' : 'You win'} · ${view.result.reason}`;
  $('#status').classList.toggle('finished', Boolean(view.result));
  renderPanel(view, actions);
  renderBoard(view, actions);
  renderLand(view);
  const log = $('#log'); log.replaceChildren();
  for (const entry of view.log.slice(-40).reverse()) {
    const item = make('li');
    item.append(make('span', `dot small p${entry.player}`), make('span', '', `${entry.turn ? `T${entry.turn} · ` : ''}${entry.text}`));
    log.append(item);
  }
  scheduleComputer();
}

function showRules() {
  const blocks = [
    ['Goal', 'Capture the enemy Crown, or start your turn with your revealed Crown standing on the Throne in the centre.'],
    ['Setup', 'Each player secretly arranges 9 face-down units on their 10-square home island. Your Crown goes wherever you choose. Each player holds 2 land tiles.'],
    ['Each turn', `1. Lay one land tile from your hand next to existing land, then draw. Player 2 lays 2 tiles on their first turn. 2. Do one thing: reveal a unit (its "when revealed" power happens now), move a unit one square up, down, left or right, attack with a revealed unit, or once per game use succession.`],
    ['Combat', 'The defender is turned face up. Higher strength wins; the loser is removed. Ties remove both. A winning attacker moves into the square, except the Archer. Hills give +1 defence, and so does standing next to your own revealed Guard. The Assassin always beats the Crown and the Champion when it attacks.'],
    ['Units', Object.values(UNITS).map(unit => `${unit.name} (${unit.strength}): ${unit.text}`).join(' ')],
    ['Land', `${Object.values(LAND).map(land => `${land.name}: ${land.text}`).join(' ')} Squares with no land cannot be entered.`],
    ['Succession', 'Once per game, as your action, secretly swap your hidden Crown with another of your hidden units. Your opponent learns only that you used it, and anything their Scouts saw may now be out of date.'],
    ['Running out of land', `When the land stack runs out, ${SETTINGS.finalTurns} more turns are played (counting each player's turn). Then whoever has more units within ${SETTINGS.throneZone} squares of the Throne wins.`]
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
  viewer = computer === null ? 1 : human; selected = null; tile = null; succession = false; lastSquares = [];
  draft = Array(HOME[1].length).fill(null); placing = 'crown';
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  document.body.classList.remove('veiled');
  render();
}

$('#handoff').addEventListener('cancel', event => event.preventDefault());
$('#ready-button').addEventListener('click', () => {
  viewer = game.currentPlayer;
  tile = game.hands[viewer][0] ?? null;
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
