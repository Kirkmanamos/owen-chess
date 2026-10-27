import { createGame, getLegalActions, applyAction, publicView } from './engine.js';
import { squareName, offset, rowOf, colOf } from './board.js';
import { hasBonusReveal } from './rules/turn.js';
import { TOYS_PER_TOKEN } from './rules/chaos.js';

const $ = selector => document.querySelector(selector);
const SYMBOLS = { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' };
const TITLES = { king: 'King', queen: 'Queen', rook: 'Rook', bishop: 'Bishop', knight: 'Knight', pawn: 'Pawn' };
const MOVEMENT_HELP = {
  king: 'One square in any direction. Your revealed king must stay out of attack.',
  queen: 'Any distance along a clear rank, file, or diagonal.',
  rook: 'Any distance along a clear rank or file.',
  bishop: 'Any distance along a clear diagonal.',
  knight: 'An L-shaped jump: two squares one way, one square across. It can jump over tiles.',
  pawn: 'One square forward; capture one square diagonally forward. Promote to a queen on the far rank.'
};
let game = createGame();
let selected = null;
let mode = 'move';
let lastAction = null;
let focusSquare = 32;
let pending = null;
let animateAction = null; // The action whose arrival animates on the next render only.
let prevChaos = null; // Last rendered goal state, to animate what changed.
let toastTimer = null;
let prevToys = null; // Toy Box sizes at the last render, so new toys pop in.
const CAPTURE_SPRITES = {
  pawn: ['CHOMP!', '#c0602d'], knight: ['NEIGH!', '#7b4fb6'], bishop: ['ZAP!', '#2f7fb8'], rook: ['CRASH!', '#a0442d'],
  queen: ['KAPOW!', '#b2366b'], king: ['BONK!', '#8a6a1f'], stack: ['SQUISH!', '#3e7d4f']
};
// In Owen's Rules every knight is a unicorn. Only names and pictures change;
// it still moves exactly like a knight.
const unicorns = () => Boolean(game.rules.chaos.enabled);
// The knight glyph keeps the set's look; CSS adds the horn.
const horn = type => type === 'knight' && unicorns() ? ' unicorn' : '';
const owenWords = text => unicorns() ? text.replace(/knights/g, 'unicorns').replace(/knight/g, 'unicorn').replace(/Knight/g, 'Unicorn') : text;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function actionMode(action) {
  return ['stack', 'unstack', 'reveal'].includes(action.kind) ? action.kind : 'move';
}

function openingHelp(rules) {
  if (rules.exposure.mode === 'right-empty') return 'Slide one square right into an empty space and flip there.';
  if (rules.exposure.mode === 'either-horizontal') return 'Slide one square left or right into an empty space and flip there.';
  const ranges = [['right', rules.exposure.rightRange], ['left', rules.exposure.leftRange], ['forward', rules.exposure.forwardRange]];
  const moves = ranges.filter(([, range]) => range > 0).map(([direction, range]) => `${range === 1 ? '1 square' : `1–${range} squares`} ${direction}`);
  return `Slide ${moves.join(', or ')} and flip where you land. The path and destination must be empty.`;
}

function revealLabel(action) {
  const dr = rowOf(action.to) - rowOf(action.from);
  const dc = colOf(action.to) - colOf(action.from);
  const direction = dr ? 'forward' : dc > 0 ? 'right' : 'left';
  const arrow = dr ? dr < 0 ? '↑' : '↓' : dc > 0 ? '→' : '←';
  return `${arrow} ${squareName(action.to)} · Reveal ${Math.abs(dr || dc)} ${direction}`;
}

// Plan optional parts using engine-provided actions. Nothing is committed until
// the player picks the last destination or explicitly declines the bonus.
function chooseAction(options, chooseStep = true) {
  if (chooseStep && options.some(a => a.step !== undefined)) pending = { stage: 'step', options };
  else if (options.some(a => a.scout !== undefined)) pending = { stage: 'scout', options };
  else return perform(options[0]);
  focusSquare = destination(options.find(a => destination(a) !== undefined));
  render();
  $('#board').querySelector(`[data-square="${focusSquare}"]`)?.focus();
}

function cancelPlan() {
  pending = null;
  focusSquare = selected ?? focusSquare;
  render();
  $('#board').querySelector(`[data-square="${focusSquare}"]`)?.focus();
}

function destination(action) {
  return pending ? action[pending.stage === 'step' ? 'step' : 'scout'] : action.to;
}

function visibleActions(actions) {
  return pending ? pending.options : actions.filter(a => a.from === selected && actionMode(a) === mode);
}

function planView(view) {
  if (!pending) return view;
  const action = pending.options[0];
  const board = [...view.board];
  const piece = board[action.from];
  board[action.from] = null;
  if (action.kind === 'stack') board[action.to] = null;
  const landing = pending.stage === 'step' ? action.to : action.step ?? action.to;
  board[landing] = { ...piece, count: action.kind === 'stack' ? 2 : piece.count };
  return { ...view, board };
}

function perform(action) {
  try {
    const player = game.currentPlayer;
    const capturedBefore = game.captured.length;
    game = applyAction(game, action);
    pending = null;
    animateAction = { ...action, captured: game.captured.length > capturedBefore, victims: game.captured.slice(capturedBefore) };
    if (!action.kind.startsWith('goal-')) lastAction = action;
    selected = null;
    mode = 'move';
    render();
    if (!game.result && game.currentPlayer !== player && $('#privacy-toggle').checked) showHandoff();
    else $('#board').querySelector(`[data-square="${action.step ?? action.to ?? action.from ?? focusSquare}"]`)?.focus();
  } catch (error) {
    $('#status').textContent = error.message;
  }
}

function clickSquare(square) {
  if (game.result || $('#handoff').open) return;
  const view = publicView(game);
  const actions = getLegalActions(game);
  const destinations = visibleActions(actions).filter(a => destination(a) === square);
  if (destinations.length) return pending?.stage === 'scout' ? perform(destinations[0]) : chooseAction(destinations, !pending);
  if (pending) return;
  // Clicking a stack partner stacks directly; no need to find the Stack tab first.
  const stackWith = actions.filter(a => a.kind === 'stack' && a.from === selected && a.to === square);
  if (stackWith.length) return chooseAction(stackWith);
  if (view.board[square]?.owner === view.currentPlayer) {
    selected = selected === square ? null : square;
    mode = 'move';
    focusSquare = square;
    render();
    $('#board').querySelector(`[data-square="${square}"]`)?.focus();
  }
}

// Where a tile that just landed on `square` came from, if it traveled.
function arrivalOrigin(action, square) {
  if (!action) return null;
  if (action.kind === 'unstack') return square === action.to ? action.from : null;
  return ['move', 'reveal', 'stack'].includes(action.kind) && square === (action.step ?? action.to) ? action.from : null;
}

function renderBoard(view, actions) {
  const board = $('#board');
  board.replaceChildren();
  for (let square = 0; square < 64; square++) {
    const piece = view.board[square];
    const cell = make('button', `square${(Math.floor(square / 8) + square % 8) % 2 ? ' dark' : ''}`);
    cell.type = 'button';
    cell.dataset.square = square;
    cell.tabIndex = square === focusSquare ? 0 : -1;
    cell.setAttribute('aria-pressed', String(selected === square));
    let label = `${squareName(square)}, ${piece ? `Player ${piece.owner} ${piece.revealed ? piece.count === 2 ? 'pawn stack' : piece.type : 'hidden tile'}` : 'empty'}`;
    const revealable = !pending && actions.some(a => a.kind === 'reveal' && a.from === square);
    if (revealable) { cell.classList.add('revealable'); label += ', can reveal'; }
    const targets = visibleActions(actions).filter(a => destination(a) === square);
    if (targets.length) {
      const kind = pending?.stage ?? targets[0].kind;
      cell.classList.add('legal', `action-${kind}`);
      label += `, ${kind === 'challenge' ? 'challenge and reveal' : kind === 'reveal' ? 'slide and reveal' : kind} destination`;
    }
    if (selected === square) cell.classList.add('selected');
    if (!pending && !targets.length && actions.some(a => a.kind === 'stack' && a.from === selected && a.to === square)) {
      cell.classList.add('stack-partner');
      label += ', click to stack';
    }
    if (lastAction && [lastAction.from, lastAction.to, lastAction.step, lastAction.scout].includes(square)) cell.classList.add('last-action');
    if (pending) label += ', action preview';
    if (piece) {
      const tile = make('span', `tile p${piece.owner}${piece.revealed ? '' : ' hidden'}${piece.count === 2 ? ' stack' : ''}`);
      tile.setAttribute('aria-hidden', 'true');
      tile.append(make('span', piece.revealed ? `piece-symbol${horn(piece.type)}` : 'seal', piece.revealed ? SYMBOLS[piece.type] : '✦'));
      if (piece.count === 2) tile.append(make('span', 'stack-count', '×2'));
      if (piece.type === 'king' && view.check[piece.owner]) { cell.classList.add('in-check'); label += ', in check'; }
      const origin = pending ? null : arrivalOrigin(animateAction, square);
      if (origin !== null) {
        tile.style.setProperty('--dx', colOf(origin) - colOf(square));
        tile.style.setProperty('--dy', rowOf(origin) - rowOf(square));
        const attacker = piece.count === 2 ? 'stack' : piece.type;
        tile.classList.add(animateAction.kind === 'reveal' ? 'slide-flip' : animateAction.captured ? `capture-${attacker}` : 'slide-in');
        cell.classList.add('arriving');
      } else if (!pending && piece.revealed && ((animateAction?.kind === 'challenge' && animateAction.to === square) || animateAction?.scout === square)) tile.classList.add('just-revealed');
      cell.append(tile);
      if (origin !== null && animateAction.captured) cell.append(make('span', 'chomp'));

    }
    cell.setAttribute('aria-label', label);
    cell.addEventListener('click', () => clickSquare(square));
    cell.addEventListener('keydown', event => {
      const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (event.key === 'Escape') { pending = null; selected = null; render(); $(`[data-square="${square}"]`).focus(); }
      if (!directions[event.key]) return;
      event.preventDefault();
      const next = offset(square, ...directions[event.key]);
      if (next === null) return;
      focusSquare = next;
      cell.tabIndex = -1;
      const target = $(`[data-square="${next}"]`);
      target.tabIndex = 0;
      target.focus();
    });
    board.append(cell);
  }
}

function renderSelection(view, actions) {
  const container = $('#selection');
  const modes = $('#action-modes');
  const buttons = $('#action-buttons');
  const hint = $('#action-hint');
  container.replaceChildren(); modes.replaceChildren(); buttons.replaceChildren();
  if (pending) {
    const choosingStep = pending.stage === 'step';
    container.append(make('h2', 'selection-title', choosingStep ? 'Add a stack step?' : 'Choose a scouting target.'));
    hint.textContent = choosingStep
      ? 'Preview: the pawns are combined. Choose a highlighted empty neighbor for a free step, or finish stacking here. The entire action costs one action.'
      : 'Preview: the stack has moved. Choose one highlighted hidden enemy to reveal for free, or finish without scouting. Nothing is captured by scouting.';
    const plain = pending.options.filter(a => choosingStep ? a.step === undefined : a.scout === undefined);
    if (choosingStep && !plain.length) hint.textContent = 'Preview: choose a highlighted empty neighbor to complete the stack-and-step. Stopping at the merge square would leave your king in check. The entire action costs one action.';
    if (plain.length) buttons.append(button(choosingStep ? 'Finish stacking here' : 'Finish without scouting', () => chooseAction(plain, false)));
    buttons.append(button('Cancel action', cancelPlan, 'button wide'));
    return;
  }
  const piece = view.board[selected];
  if (view.result) {
    container.append(make('h2', 'selection-title', view.result.winner ? `Player ${view.result.winner} wins.` : 'A drawn game.'));
    hint.textContent = `${view.result.reason}. Start a new game to shuffle the armies again.`;
    buttons.append(button('Shuffle & play again ↗', () => $('#restart-dialog').showModal()));
    return;
  }
  if (!piece) {
    container.append(make('h2', 'selection-title', view.response ? 'Protect your king.' : view.bonusRevealPending ? 'Optional bonus reveal.' : 'The board is waiting.'));
    hint.textContent = view.preparation ? 'No safe escape exists. You still get one preparation action before checkmate is evaluated.' : view.bonusRevealPending ? 'Reveal one outlined hidden tile for free, or skip to end your turn. The bonus tile cannot also move this turn, except for an immediate king response.' : `Choose an outlined hidden tile. ${openingHelp(view.rules)} Revealed pieces use their normal moves.`;
  } else {
    const title = make('h2', 'selection-title', piece.revealed ? piece.count === 2 ? 'Pawn Stack' : owenWords(TITLES[piece.type]) : 'A hidden possibility.');
    title.append(make('span', 'selection-coordinate', squareName(selected)));
    container.append(title);
    const ownActions = actions.filter(a => a.from === selected);
    const availableModes = [...new Set(ownActions.map(actionMode))];
    if (!availableModes.includes(mode)) mode = availableModes[0] || 'move';
    if (!piece.revealed) {
      const reveals = ownActions.filter(a => a.kind === 'reveal');
      if (reveals.length) {
        for (const reveal of reveals) buttons.append(button(revealLabel(reveal), () => perform(reveal)));
        hint.textContent = `${openingHelp(view.rules)} ${view.bonusRevealPending ? 'This is your one free bonus reveal, then the turn ends. King responses still apply.' : view.rules.turn.revealCostsAction ? 'The slide and reveal together use one action, at any distance.' : 'This opening action is free this game.'} Forward follows your pawn direction.`;
      } else hint.textContent = view.check[view.currentPlayer] ? 'Your king is in check. Choose an action that makes it safe.' : `No safe reveal destination is available for this tile. ${openingHelp(view.rules)}`;
    } else {
      for (const name of availableModes) {
        const labels = { move: 'Move / attack', stack: 'Stack', unstack: 'Unstack' };
        const control = button(labels[name], () => { mode = name; render(); }, `mode-button${name === mode ? ' active' : ''}`);
        control.setAttribute('aria-pressed', String(name === mode));
        modes.append(control);
      }
      hint.textContent = ownActions.length === 0 ? 'No legal actions from this square. Choose another tile.' : mode === 'move' && ownActions.some(a => a.kind === 'stack') ? `${piece.count === 2 ? 'Move or capture one square in any direction.' : MOVEMENT_HELP[piece.type]} Click a pawn marked + to stack with it.` : mode === 'stack' ? 'Choose a highlighted friendly pawn. Both tiles combine on that square and use one action.' : mode === 'unstack' ? 'Choose a highlighted empty square. One pawn stays here; the other separates onto that square.' : piece.count === 2 ? 'Move or capture one square in any of the eight directions. Both pawns travel together. No jumping or double captures. Unstack to promote on the far rank.' : MOVEMENT_HELP[piece.type];
      if (mode === 'move' && ownActions.some(a => a.kind === 'challenge')) hint.textContent += ' Attacking a hidden tile reveals it; your piece stays put.';
      if (mode === 'stack' && view.rules.stack.stackAndStep) hint.textContent += ' After choosing your partner, you can add one noncapturing step for free.';
      if (piece.count === 2 && view.rules.stack.scouting) hint.textContent += ' After a noncapturing move, you may scout one adjacent hidden enemy for free.';
      if (view.bonusRevealPending) hint.textContent = 'Only one hidden tile can slide and reveal during this bonus. Choose an outlined hidden tile, or skip to end your turn.';
    }
  }
  for (const action of actions.filter(a => ['end-turn', 'finish-response'].includes(a.kind))) buttons.append(button(action.kind === 'end-turn' ? (view.bonusRevealPending ? 'Skip bonus reveal' : $('#privacy-toggle').checked ? 'End turn & pass device' : 'End turn') : 'Finish king response', () => perform(action), 'button wide'));
}

function renderArmies(view) {
  const armies = $('#armies'); armies.replaceChildren();
  for (const player of [1, 2]) {
    const pieces = view.board.filter(p => p?.owner === player);
    const revealed = pieces.reduce((sum, p) => sum + (p.revealed ? p.count : 0), 0);
    const remaining = pieces.reduce((sum, p) => sum + (p.count || 1), 0);
    const row = make('div', 'army-row');
    row.append(make('span', `player-dot p${player}`));
    const name = make('div', '', `Player ${player}`);
    const king = pieces.some(p => p.revealed && p.type === 'king');
    name.append(make('p', 'army-caption', `${view.check[player] ? 'King in check' : king ? 'King revealed' : 'King undiscovered'} · ${16 - remaining} captured`));
    row.append(name, make('span', 'army-count', `${revealed} / ${remaining}`));
    armies.append(row);
  }
}

const OWEN_TOASTS = {
  crown: event => ['👑', `Crown for Player ${event.player}!`],
  'nuh-uh': () => ['NUH-UH!', 'Owen changed his mind.'],
  bored: () => ['🥱', 'Owen got bored.'],
  redraw: event => ['🙅', `“Not fair!” says Player ${event.player}.`],
  lock: event => ['🤙', `Pinky promise with Player ${event.player}!`]
};

// One playful announcement per action. It never blocks the board.
function showOwenToast(chaos) {
  const event = chaos.events.find(e => OWEN_TOASTS[e.type]);
  if (!event) return;
  const toast = $('#owen-toast');
  const [mark, headline] = event.final ? ['👑', `Player ${event.player} wins Owen’s game!`] : OWEN_TOASTS[event.type](event);
  const detail = event.final ? `${chaos.crownsToWin} crowns. Owen is very proud.` : event.type === 'lock' ? `${chaos.goal.title} stays put.` : `New goal: ${chaos.goal.icon} ${chaos.goal.title}`;
  const card = make('div', `owen-toast-card kind-${event.type}${event.final ? ' final' : ''}`);
  card.append(make('span', event.type === 'nuh-uh' ? 'toast-stamp' : 'toast-mark', mark), make('strong', '', headline), make('span', 'toast-detail', detail));
  if (event.robbed?.length) card.append(make('span', 'toast-token', `🙅 Not Fair token for ${event.robbed.map(p => `Player ${p}`).join(' & ')}`));
  toast.replaceChildren(card);
  toast.className = 'owen-toast';
  void toast.offsetWidth; // Restart the animation when two announcements arrive back to back.
  toast.classList.add('show');
  clearTimeout(toastTimer);
  if (event.final) return celebrate();
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function celebrate() {
  const confetti = make('div', 'confetti');
  confetti.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 36; i++) {
    const bit = make('span', '', ['👑', '⭐', '🎉', '✨'][i % 4]);
    bit.style.setProperty('--x', `${Math.random() * 100}%`);
    bit.style.setProperty('--delay', `${Math.random() * 1.2}s`);
    bit.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    confetti.append(bit);
  }
  $('.board-frame').append(confetti);
  setTimeout(() => confetti.remove(), 5000);
}

function frameSpot(square) {
  const frame = $('.board-frame').getBoundingClientRect();
  const cell = $('#board').querySelector(`[data-square="${square}"]`).getBoundingClientRect();
  return { x: cell.left - frame.left + cell.width / 2, y: cell.top - frame.top + cell.height / 2, size: cell.width };
}

function sprite(className, text, spot, color) {
  const element = make('span', `sprite ${className}`, text);
  element.setAttribute('aria-hidden', 'true');
  element.style.left = `${spot.x}px`;
  element.style.top = `${spot.y}px`;
  element.style.setProperty('--cell', `${spot.size}px`);
  if (color) element.style.setProperty('--ink', color);
  $('.board-frame').append(element);
  element.addEventListener('animationend', () => element.remove());
  setTimeout(() => element.remove(), 3000); // Reduced motion skips animationend.
  return element;
}

// Comic captures: each attacker has its own entrance (CSS), word and burst.
// Victims pop out, then fly into the capturer's Toy Box in Owen's Rules.
function playCaptureSprites(action, view) {
  const landing = action.step ?? action.to;
  const piece = view.board[landing];
  if (!piece) return;
  const kind = piece.count === 2 ? 'stack' : piece.type;
  const [word, color] = CAPTURE_SPRITES[kind];
  const spot = frameSpot(landing);
  sprite('burst', '', spot, color);
  sprite('burst-word', word, spot, color);
  if (kind === 'rook' || kind === 'stack') {
    const frame = $('.board-frame');
    frame.classList.remove('shake'); void frame.offsetWidth; frame.classList.add('shake');
    setTimeout(() => frame.classList.remove('shake'), 600);
  }
  const rewards = view.chaos?.events.filter(e => ['sugar', 'toy-token'].includes(e.type)) ?? [];
  rewards.forEach((reward, i) => {
    const text = reward.type === 'sugar' ? '🍬 Sugar rush! Go again' : '🙅 +1 Not Fair token';
    sprite('reward', text, spot).style.animationDelay = `${0.55 + i * 0.35}s`;
  });
  const units = action.victims.flatMap(victim => Array(victim.count).fill(victim));
  units.forEach((victim, i) => {
    const ghost = sprite(`ghost p${victim.owner}`, '', spot);
    ghost.append(make('span', horn(victim.type).trim(), SYMBOLS[victim.type]));
    const target = view.chaos && document.querySelector(`.toy-row.p${piece.owner} .toy.arrive:nth-last-child(${units.length - i})`);
    if (!target || reducedMotion()) return;
    const from = ghost.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    ghost.classList.add('flying');
    ghost.animate([
      { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%, -110%) scale(1.25) rotate(-12deg)', opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.35 - 70}px)) scale(.9) rotate(200deg)`, offset: 0.65 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.45) rotate(360deg)`, opacity: 0.9 }
    ], { duration: 1100, delay: 250 + i * 120, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'both' }).finished.then(() => ghost.remove(), () => {});
  });
}

function toyBox(view) {
  const box = make('div', 'toy-box');
  const heading = make('div', 'toy-heading');
  heading.append(make('span', '', '🧸 Toy Box'), make('span', 'micro-label', `BIG CATCH = 🍬 GO AGAIN · ${TOYS_PER_TOKEN} TOYS = 🙅`));
  box.append(heading);
  const sizes = {};
  for (const player of [1, 2]) {
    const toys = view.captured.filter(p => p.owner !== player).flatMap(p => Array(p.count).fill(p));
    sizes[player] = toys.length;
    const row = make('div', `toy-row p${player}`);
    row.append(make('span', `player-dot p${player}`));
    const shelf = make('span', 'toy-shelf');
    toys.forEach((toy, i) => {
      const fresh = prevToys && i >= prevToys[player];
      const element = make('span', `toy p${toy.owner}${fresh ? ' arrive' : ''}`);
      element.append(make('span', horn(toy.type).trim(), SYMBOLS[toy.type]));
      if (fresh && !reducedMotion()) element.style.animationDelay = `${1.2 + (i - prevToys[player]) * 0.12}s`;
      shelf.append(element);
    });
    if (!toys.length) shelf.append(make('span', 'toy-empty', 'empty'));
    row.append(shelf, make('span', 'toy-next', `${toys.length % TOYS_PER_TOKEN}/${TOYS_PER_TOKEN}`));
    row.setAttribute('aria-label', `Player ${player} Toy Box: ${toys.length} captured, ${toys.length % TOYS_PER_TOKEN} of ${TOYS_PER_TOKEN} toward a Not Fair token`);
    box.append(row);
  }
  prevToys = sizes;
  return box;
}

function crownSlots(chaos, before, player) {
  const slots = make('span', 'crown-slots');
  for (let i = 0; i < chaos.crownsToWin; i++) {
    const won = i < chaos.crowns[player];
    slots.append(make('span', `crown${won ? ' won' : ''}${won && before && i >= before.crowns[player] ? ' pop' : ''}`, '👑'));
  }
  slots.setAttribute('aria-label', `${chaos.crowns[player]} of ${chaos.crownsToWin} crowns`);
  return slots;
}

function owenMood(chaos) {
  if (chaos.locked) return ['locked', `🤙 Pinky promise: this goal stays until Player ${chaos.lockedBy}’s next turn ends.`];
  if (chaos.near[1] || chaos.near[2]) return ['nervous', `😬 Someone is one step away! When the turn passes, Owen might say “Nuh-uh!” (${Math.round(chaos.nuhUhChance * 100)}% chance).`];
  if (chaos.turnsLeft <= 1) return ['yawning', '🥱 Owen is yawning… new goal after this turn.'];
  return [chaos.turnsLeft <= 3 ? 'yawning' : '', `Owen gets bored in ${chaos.turnsLeft} turns.`];
}

function renderOwen(view, actions) {
  const chaos = view.chaos;
  const panel = $('#owen-panel');
  panel.hidden = !chaos;
  $('#mode-badge').hidden = !chaos;
  document.body.classList.toggle('owen-mode', Boolean(chaos));
  if (!chaos) { prevChaos = null; prevToys = null; return; }
  const before = prevChaos;
  prevChaos = chaos;
  const sameGoal = before?.goal.id === chaos.goal.id;
  panel.replaceChildren();
  const heading = make('div', 'panel-heading owen-heading');
  heading.append(make('p', 'eyebrow', 'OWEN’S GOAL'), make('span', 'micro-label', chaos.goal.tally ? 'COUNTS FROM NOW' : 'ON THE BOARD'));
  const card = make('div', `goal-card${before && !sameGoal ? ' goal-new' : ''}`);
  const words = make('div');
  words.append(make('h2', '', chaos.goal.title), make('p', '', owenWords(chaos.goal.text)));
  card.append(make('span', 'goal-icon', chaos.goal.icon), words);

  const scores = make('div', 'goal-scores');
  const fills = [];
  for (const player of [1, 2]) {
    const row = make('div', `goal-row${chaos.near[player] ? ' near' : ''}`);
    const track = make('span', 'goal-track');
    const fill = make('span', `goal-fill p${player}`);
    fill.style.width = `${100 * (sameGoal ? before.progress[player] : 0) / chaos.goal.target}%`;
    fills.push([fill, `${100 * chaos.progress[player] / chaos.goal.target}%`]);
    track.append(fill);
    const tokens = make('span', `tokens${before && chaos.tokens[player] > before.tokens[player] ? ' pop' : ''}`, chaos.tokens[player] ? `🙅×${chaos.tokens[player]}` : '');
    tokens.title = 'Not Fair tokens';
    row.append(make('span', `player-dot p${player}`), make('span', 'goal-name', `P${player}`), track, make('span', 'goal-count', `${chaos.progress[player]}/${chaos.goal.target}`), crownSlots(chaos, before, player), tokens);
    row.setAttribute('aria-label', `Player ${player}: ${chaos.progress[player]} of ${chaos.goal.target}, ${chaos.crowns[player]} crowns, ${chaos.tokens[player]} Not Fair tokens${chaos.near[player] ? ', one step away' : ''}`);
    scores.append(row);
  }
  const [moodClass, moodText] = owenMood(chaos);
  panel.append(heading, card, scores, make('p', `owen-mood ${moodClass}`, moodText), toyBox(view));

  const spend = actions.filter(a => a.kind.startsWith('goal-'));
  if (spend.length) {
    const buttons = make('div', 'owen-buttons');
    for (const action of spend) buttons.append(button(action.kind === 'goal-redraw' ? '🙅 Not fair! New goal' : '🤙 Pinky promise', () => perform(action), 'button owen-button'));
    panel.append(buttons, make('p', 'owen-note', 'Spend a Not Fair token: get a new goal, or lock this one until your next turn ends. Free, one per turn.'));
  }
  void panel.offsetWidth; // Paint the old progress first so the bars grow.
  for (const [fill, width] of fills) fill.style.width = width;
}

function render() {
  const view = publicView(game);
  const actions = getLegalActions(game);
  $('#turn-dot').className = `player-dot p${view.currentPlayer}`;
  $('#turn-title').textContent = view.result ? 'The game is complete' : `Player ${view.currentPlayer} to ${view.response ? 'respond' : 'play'}`;
  $('#turn-subtitle').textContent = view.response ? 'One response action before adjudication' : view.bonusRevealPending ? '1 optional bonus reveal · or skip' : `${view.actionsLeft} action${view.actionsLeft === 1 ? '' : 's'} available${hasBonusReveal(view.rules) ? ' · then 1 optional reveal' : view.rules.turn.revealCostsAction ? '' : ' · reveals are free'}`;
  $('#turn-count').textContent = `TURN ${String(view.turnNumber).padStart(2, '0')}`;
  const forwardArrow = view.currentPlayer === 1 ? '↑' : '↓';
  $('#direction-label').textContent = view.rules.exposure.mode === 'flexible'
    ? `Reveal →≤${view.rules.exposure.rightRange} ←${view.rules.exposure.leftRange} ${forwardArrow}${view.rules.exposure.forwardRange}`
    : `Reveal ${view.rules.exposure.mode === 'right-empty' ? '→' : '↔'} · Pawns ${forwardArrow}`;
  const status = $('#status');
  status.className = `status${view.result ? ' finished' : view.check[view.currentPlayer] ? ' check' : ''}`;
  status.textContent = view.result ? `${view.result.winner ? `Player ${view.result.winner} wins` : 'Draw'} · ${view.result.reason}` : view.response ? `${view.response.reason} ${view.preparation ? 'No escape: take one preparation action before adjudication.' : 'You have an immediate action to get out of check.'}` : view.check[view.currentPlayer] ? 'Your king is in check. Your next action must make it safe.' : view.chaos ? 'Finish Owen’s goal for a crown, or checkmate to win outright. Slide a tile to reveal it, or move a revealed piece.' : 'Slide an exposed tile to reveal it, or move a revealed piece.';
  if (!view.result && view.bonusRevealPending) status.textContent = 'Bonus reveal · Slide one more hidden tile to reveal it, or skip to end your turn.';
  if (pending) status.textContent = 'Action preview · Choose an optional bonus below, or cancel to return to the position. Your turn has not ended.';
  renderSelection(view, actions); // Establish the selected mode before highlights.
  renderBoard(planView(view), actions);
  renderArmies(view);
  renderOwen(view, actions);
  if (view.chaos?.events.length && animateAction) showOwenToast(view.chaos);
  if (animateAction?.captured && !pending) playCaptureSprites(animateAction, view);
  animateAction = null;
  $('#history-count').textContent = `${view.actionNumber} ACTION${view.actionNumber === 1 ? '' : 'S'}`;
  const history = $('#history'); history.replaceChildren();
  if (!view.history.length) {
    const empty = make('li'); empty.style.display = 'block';
    empty.append(make('p', 'history-empty', 'Every discovery starts somewhere. Slide a tile right to reveal your first piece.'));
    history.append(empty);
  }
  for (const item of view.history.slice(-12).reverse()) {
    const li = make('li');
    const description = make('span');
    if (item.player) description.append(make('strong', '', `P${item.player} `), document.createTextNode(owenWords(item.text)));
    else description.append(make('strong', 'owen-name', 'Owen '), document.createTextNode(owenWords(item.text.replace(/^Owen: /, ''))));
    li.append(make('span', 'history-number', String(item.number).padStart(2, '0')), description);
    history.append(li);
  }
}

function showHandoff() {
  document.body.classList.add('privacy-on');
  $('#handoff-title').textContent = `Over to Player ${game.currentPlayer}.`;
  $('#handoff-mark').className = `handoff-mark p${game.currentPlayer}`;
  $('#ready-button').textContent = `I'm Player ${game.currentPlayer} · Let's play`;
  $('#handoff').showModal();
}

function startGame(rules = game.rules) {
  game = createGame(rules); selected = null; lastAction = null; pending = null; mode = 'move'; focusSquare = 32;
  animateAction = null; prevChaos = null; prevToys = null; clearTimeout(toastTimer);
  $('#owen-toast').className = 'owen-toast';
  document.querySelector('.confetti')?.remove();
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  document.body.classList.remove('privacy-on');
  render();
}

function showRules() {
  const rules = game.rules;
  const blocks = [
    ['01 / Discover your army', `Player 1 starts on a1–d4. Player 2 starts on a5–d8. Both armies occupy the first four files, facing the empty right half. Each contains the standard 16 chess pieces, shuffled face-down. Neither player can inspect hidden identities. ${openingHelp(rules)} Right always points toward file h. Forward is toward rank 8 for Player 1 and rank 1 for Player 2. This opening move applies regardless of the hidden piece’s identity, with no jumping or capture. Revealing a pawn on its far rank promotes it to a queen. Vacated squares open routes for the next layer.`],
    ['02 / Take an action', `This game allows ${rules.turn.actionsPerTurn} action${rules.turn.actionsPerTurn === 1 ? '' : 's'} per turn. ${rules.turn.revealCostsAction ? 'The slide and reveal together cost one action, regardless of distance.' : 'Slide-and-reveal actions are free.'} Moving, challenging, stacking, and unstacking each cost one action. One bonus reveal: ${hasBonusReveal(rules) ? 'ON — after your normal actions, optionally slide and reveal one additional hidden tile, then pass. You may reveal as your normal action and again as the bonus. The bonus tile cannot also take a normal action that turn. Skip bonus reveal declines it; if no legal reveal exists, the turn ends automatically. A king revealed in check still gets its immediate response.' : rules.turn.bonusReveal ? 'inactive while unlimited free reveals are on.' : 'OFF.'} A checking action ends the turn early, without a bonus. King responses never earn a bonus. Ending a turn early also declines the bonus. Select a tile, then a highlighted destination or a Reveal button.`],
    ['03 / Move & challenge', 'Revealed pieces use chess movement. Hidden tiles block paths and exert no attacks. Attacking a hidden enemy tile flips it, with both tiles staying in place. A later attack can capture it if it is not a king. Pawns move one square forward, capture diagonally, and automatically promote to queens. No castling, initial double move, or en passant.'],
    ['04 / Two pawns, new possibilities', rules.stack.enabled ? `Two ${rules.stack.anyAdjacent ? 'adjacent' : 'horizontally adjacent'} friendly revealed pawns can combine onto either pawn’s square. Both pawns then travel together, moving or capturing one square in any of the eight directions. A stack cannot jump or capture on two squares at once. It may move into attacked squares as long as its own king stays safe; it is not a king. Hidden enemies are challenged in place. Unstack into an empty orthogonal neighbor; one pawn stays. Stacks remain pawns on the far rank until split, then individual pawns there promote. Any-adjacent stacking: ${rules.stack.anyAdjacent ? 'ON — vertical and diagonal pairs also qualify' : 'OFF — horizontal pairs only'}. Stack-and-step: ${rules.stack.stackAndStep ? 'ON — combining may include one optional step to an empty adjacent square' : 'OFF'}. Stack scouting: ${rules.stack.scouting ? 'ON — after a noncapturing stack move, optionally reveal one adjacent hidden enemy for free, including after a stack-and-step' : 'OFF'}. Bonuses form one action; check is resolved afterward. Choose bonus squares on the preview, or finish without them. Cancel or Escape returns to the unchanged board.` : 'Pawn stacking and all three stack experiments are disabled for this game.'],
    ['05 / The king has a chance', 'Kings are never captured. Hidden kings cannot be checked. When a king is revealed in check, its owner immediately receives one response action before checkmate is judged. A challenge that uncovers an attack on your own king also gives you a response. If both kings are attacked, the challenging player responds first. If no safe response exists, take one preparation action; remaining in check afterward loses.'],
    ['06 / Finish the game', 'Checkmate wins. A player with no legal actions and no check draws. Three identical positions with the same player and action allowance draw, as do 100 actions without a reveal, capture, pawn move, stack, or unstack. Turns switch immediately by default. Enable “Pass-device screen between turns” beside the board if you want a privacy pause; you can toggle it during a game. This prototype does not save games; refreshing starts a new one.']
  ];
  if (rules.chaos.enabled) blocks.unshift(['00 / Owen’s Rules', `This game was invented by a 4-year-old, so the way to win keeps changing. Owen picks a goal, such as “Get 4 of your pieces into the other team’s half.” The first player to finish it gets a crown, and Owen picks a new goal. Goals marked “counts from now” only count what happens after they appear. First to ${rules.chaos.crownsToWin} crowns wins, and checkmate still wins instantly. Owen gets bored after ${rules.chaos.boredTurns} turns and picks a new goal; the countdown is always shown. When someone is one step away, each time the turn passes there is a ${Math.round(rules.chaos.nuhUhChance * 100)}% chance Owen says “Nuh-uh!” and changes the goal. Whenever a goal is taken away from someone one step from finishing, they get a Not Fair token (up to ${rules.chaos.maxTokens}). On your turn, spend one for free: “Not fair!” draws a new goal, or “Pinky promise” locks the goal until your next turn ends. One token per turn. Owen never picks a goal that someone has already nearly finished. Captured pieces go into your Toy Box. Catching anything bigger than a pawn gives a Sugar Rush: one extra action right away, once per turn (giving check still ends your turn, and king responses never earn one). Every ${TOYS_PER_TOKEN} toys in your Toy Box earns a Not Fair token. In Owen’s Rules, pawns can also stack with the pawn directly in front, behind, or diagonal to them.`]);
  const container = $('#rules-content'); container.replaceChildren();
  for (const [title, text] of blocks) { const block = make('section', 'rule-block'); block.append(make('h3', '', title), make('p', '', text)); container.append(block); }
  $('#rules-dialog').showModal();
}

$('#rank-labels').replaceChildren(...Array.from({ length: 8 }, (_, i) => make('span', '', String(8 - i))));
$('#file-labels').replaceChildren(...'abcdefgh'.split('').map(file => make('span', '', file)));
$('#handoff').addEventListener('cancel', event => event.preventDefault());
$('#ready-button').addEventListener('click', () => { $('#handoff').close(); document.body.classList.remove('privacy-on'); render(); $('#board').querySelector('[tabindex="0"]').focus(); });
$('#privacy-toggle').addEventListener('change', render);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && pending && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    cancelPlan();
  }
});
$('#rules-button').addEventListener('click', showRules);
$('#new-game').addEventListener('click', () => $('#restart-dialog').showModal());
$('#confirm-restart').addEventListener('click', () => startGame());
for (const close of document.querySelectorAll('[data-close]')) close.addEventListener('click', () => document.getElementById(close.dataset.close).close());
$('#settings-button').addEventListener('click', () => {
  const form = $('#settings-form');
  form.elements.gameMode.value = game.rules.chaos.enabled ? 'owen' : 'classic';
  form.elements.exposure.value = game.rules.exposure.mode;
  form.elements.actions.value = game.rules.turn.actionsPerTurn;
  form.elements.freeReveal.checked = !game.rules.turn.revealCostsAction;
  form.elements.bonusReveal.checked = game.rules.turn.bonusReveal;
  form.elements.bonusReveal.disabled = form.elements.freeReveal.checked;
  form.elements.stacking.checked = game.rules.stack.enabled;
  for (const key of ['anyAdjacent', 'stackAndStep', 'scouting']) form.elements[key].checked = game.rules.stack[key];
  $('#stack-experiments').disabled = !form.elements.stacking.checked;
  $('#settings-dialog').showModal();
});
$('#settings-form').elements.stacking.addEventListener('change', event => {
  $('#stack-experiments').disabled = !event.currentTarget.checked;
});
$('#settings-form').elements.freeReveal.addEventListener('change', event => {
  $('#settings-form').elements.bonusReveal.disabled = event.currentTarget.checked;
});
$('#settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const stack = { enabled: data.has('stacking') };
  for (const key of ['anyAdjacent', 'stackAndStep', 'scouting']) stack[key] = event.currentTarget.elements[key].checked;
  startGame({ exposure: { mode: data.get('exposure') }, turn: { actionsPerTurn: Number(data.get('actions')), revealCostsAction: !data.has('freeReveal'), bonusReveal: event.currentTarget.elements.bonusReveal.checked }, stack, chaos: { enabled: data.get('gameMode') === 'owen' } });
});
render();
