import { legalMoves, toSan, squareName, squareIndex, rowOf, colOf, colorOf, inCheck } from './chess.js';
import { buildCourse, moveNumber } from './course.js';
import * as italian from './openings/italian.js';
import { play, isMuted, setMuted } from './sound.js';
import { confettiFrom } from './confetti.js';
import { DAY, progressKey, recordRun, isMastered, dueKeys, whenDue, buildDrill } from './progress.js';

const $ = selector => document.querySelector(selector);
const course = buildCourse(italian);
const GLYPHS = { k: ['♔', '♚'], q: ['♕', '♛'], r: ['♖', '♜'], b: ['♗', '♝'], n: ['♘', '♞'], p: ['♙', '♟'] };
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const SIDE = { w: 'White', b: 'Black' };
const PROGRESS_KEY = 'opening-arena.progress';
const LEGACY_MASTERED_KEY = 'opening-arena.mastered';
const THEME_KEY = 'opening-arena.theme';
const BOARDS = { garden: 'Garden', ocean: 'Ocean', candy: 'Candy', walnut: 'Walnut', midnight: 'Midnight' };
const PIECE_SETS = { classic: 'Classic', marble: 'Marble', jade: 'Gold & Jade', candy: 'Candy', ember: 'Ember' };
const REPLY_DELAY = 650;
const MOTION_MS = 260;
const STREAK_CHEERS = { 3: 'Nice!', 5: 'On fire!', 8: 'Unstoppable!', 12: 'Opening expert!' };

const state = {
  lineId: course.lines[0].id,
  mode: 'learn',
  ply: 0,
  flipped: false,
  selected: -1,
  focus: squareIndex('e2'),
  feedback: null,
  practice: null,
  drill: null,
  anim: null,
  timer: null
};

let progress = loadProgress();

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (saved) return saved;
    // Lines mastered before review scheduling existed join the schedule.
    const legacy = (JSON.parse(localStorage.getItem(LEGACY_MASTERED_KEY)) || []).filter(id => course.byId.has(id));
    return Object.fromEntries(legacy.map(id => [progressKey(id, course.byId.get(id).side), { box: 0, due: Date.now() + DAY }]));
  } catch { return {}; }
}

function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* progress just won't persist */ }
}

const mastered = (l, side = l.side) => isMastered(progress, progressKey(l.id, side));
const isDue = (l, side) => (progress[progressKey(l.id, side)]?.due ?? Infinity) <= Date.now();

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(text, onClick, className = 'button') {
  const element = make('button', className, text);
  element.type = 'button';
  element.addEventListener('click', onClick);
  return element;
}

const line = () => course.byId.get(state.lineId);
// Practice and Drill both play through a run of book moves against the coach.
const practicing = () => state.mode !== 'learn';
const currentPly = () => practicing() && state.practice ? state.practice.ply : state.ply;
const position = () => line().positions[currentPly()];
const pathAt = ply => ply ? line().paths[ply - 1] : '';
const lineLabel = l => `${l.family}: ${l.name}`;

// ---------- Navigation ----------

function clearTimer() {
  clearTimeout(state.timer);
  state.timer = null;
}

function selectLine(id, { ply = 0, mode = state.mode, side } = {}) {
  if (mode === 'drill') return startDrill();
  clearTimer();
  state.lineId = id;
  state.mode = mode;
  state.selected = -1;
  state.feedback = null;
  state.drill = null;
  if (mode === 'practice') {
    startRun({ kind: 'line', lineId: id, side: side || line().side, start: 0, end: line().moves.length });
  } else {
    state.practice = null;
    state.ply = ply;
    state.flipped = line().side === 'b';
  }
  render();
}

function goTo(ply) {
  if (state.mode !== 'learn') return;
  const target = Math.max(0, Math.min(line().moves.length, ply));
  if (target === state.ply + 1) state.anim = motion(line().moves[state.ply]);
  else if (target === state.ply - 1) state.anim = motion(line().moves[target], true);
  state.ply = target;
  state.selected = -1;
  state.feedback = null;
  render();
}

// Jump to a node of the move tree, staying on the current line when it passes through.
function goToPath(path) {
  const node = course.nodes.get(path);
  const id = node.lines.includes(state.lineId) ? state.lineId : node.lines[0];
  if (state.mode === 'learn' && node.parent?.path === pathAt(state.ply)) state.anim = motion(course.byId.get(id).moves[node.ply - 1]);
  if (id !== state.lineId || state.mode !== 'learn') selectLine(id, { ply: node.ply, mode: 'learn' });
  else goTo(node.ply);
}

function setMode(mode) {
  if (mode === state.mode && mode !== 'drill') return;
  selectLine(state.lineId, { mode, ply: 0 });
}

// ---------- Practice ----------

// A run plays one stretch of a line, from `start` to `end`, as one side: a
// whole line in Practice or a drill review, or a few moves for a drill position.
function startRun(item, streak = 0) {
  state.lineId = item.lineId;
  state.flipped = item.side === 'b';
  state.selected = -1;
  state.practice = { ...item, ply: item.start, mistakes: 0, hints: 0, hint: 0, done: false, streak, best: streak };
  const yourMoves = Math.ceil((item.end - item.start) / 2);
  state.feedback = item.kind === 'position'
    ? { kind: 'info', text: `Find ${SIDE[item.side]}'s next ${yourMoves > 1 ? 'two moves' : 'move'} in this position. The highlighted squares show the last move played.` }
    : { kind: 'info', text: `You play ${SIDE[item.side]}. Find each book move. Wrong guesses and hints are counted.` };
  queueReply();
}

function userColor() {
  return state.practice.side;
}

// ---------- Drill ----------

function startDrill() {
  clearTimer();
  state.mode = 'drill';
  state.practice = null;
  state.selected = -1;
  state.feedback = null;
  state.ply = 0;
  state.flipped = false;
  state.drill = { items: buildDrill(course, progress), index: -1, results: [], finished: false };
  render();
}

function nextDrillItem() {
  const d = state.drill;
  const streak = state.practice?.streak || 0;
  d.index++;
  if (d.index < d.items.length) startRun(d.items[d.index], streak);
  else finishDrill();
  render();
}

function skipDrillItem() {
  clearTimer();
  state.drill.results.push({ ...state.drill.items[state.drill.index], clean: false });
  state.practice.streak = 0;
  nextDrillItem();
}

function finishDrill() {
  const d = state.drill;
  d.finished = true;
  const clean = d.results.filter(r => r.clean).length;
  if (clean === d.results.length) {
    play('mastered', 150);
    setTimeout(() => confettiFrom($('#board'), { count: 200, power: 1.2 }), 120);
  } else {
    play('done', 150);
  }
}

function queueReply() {
  const p = state.practice;
  const l = line();
  if (p.ply >= p.end) return finishPractice();
  if (l.positions[p.ply].turn === userColor()) return;
  clearTimer();
  state.timer = setTimeout(() => {
    state.timer = null;
    const previous = state.feedback?.kind === 'good' ? state.feedback : null;
    p.ply++;
    p.hint = 0;
    const note = course.noteFor(l.paths[p.ply - 1]);
    state.anim = motion(l.moves[p.ply - 1]);
    state.feedback = { kind: 'reply', move: l.moves[p.ply - 1], ply: p.ply, text: note?.text, previous };
    if (p.ply >= p.end) finishPractice();
    render();
  }, REPLY_DELAY);
}

function finishPractice() {
  const p = state.practice;
  p.done = true;
  const clean = p.mistakes === 0 && p.hints === 0;
  const l = line();
  const key = progressKey(l.id, p.side);
  const wholeLine = p.start === 0 && p.end === l.moves.length;
  const firstTime = clean && wholeLine && !isMastered(progress, key);
  if (wholeLine) {
    progress = recordRun(progress, key, clean);
    saveProgress();
  }
  if (state.drill) state.drill.results.push({ ...state.drill.items[state.drill.index], clean });
  const celebrate = clean && wholeLine;
  play(celebrate ? 'mastered' : 'done', MOTION_MS + 450);
  if (celebrate) setTimeout(() => confettiFrom($('#board'), { count: firstTime ? 220 : 140, power: 1.25 }), MOTION_MS + 400);
  state.progressPop = firstTime;
  state.finalNote = state.feedback;
  const best = p.best > 1 ? ` Best streak: ${p.best} in a row.` : '';
  const counts = `${p.mistakes} ${p.mistakes === 1 ? 'mistake' : 'mistakes'} and ${p.hints} ${p.hints === 1 ? 'hint' : 'hints'}`;
  const review = progress[key] ? ` Next review: ${whenDue(progress[key])}.` : '';
  let text;
  if (p.kind === 'position') text = `${clean ? 'Solved!' : `Solved with ${counts}.`} This position comes from ${lineLabel(l)}.`;
  else if (clean) text = `Perfect run: no mistakes and no hints.${firstTime ? ' This line is mastered.' : ''}${best}${review}`;
  else text = `Line complete with ${counts}.${best}${progress[key] ? ' It stays in your review queue until you play it cleanly.' : ' Try again for a clean run to master it.'}`;
  state.feedback = { kind: celebrate ? 'mastered' : clean ? 'solved' : 'done', text };
}

function practiceMove(move) {
  const p = state.practice;
  const l = line();
  const expected = l.moves[p.ply];
  const before = l.positions[p.ply];
  if (move.from === expected.from && move.to === expected.to) {
    // Only moves found without a hint keep the streak going.
    p.streak = p.hint ? 0 : p.streak + 1;
    p.best = Math.max(p.best, p.streak);
    p.ply++;
    p.hint = 0;
    state.anim = { ...motion(expected), celebrate: true, cheer: STREAK_CHEERS[p.streak] };
    play('correct', MOTION_MS + 60, Math.max(0, p.streak - 1));
    state.feedback = { kind: 'good', move: expected, ply: p.ply, text: course.noteFor(l.paths[p.ply - 1])?.text };
    queueReply();
    return;
  }
  p.mistakes++;
  p.streak = 0;
  state.anim = { shake: true, square: move.to };
  const san = toSan(before, move);
  const path = [pathAt(p.ply), san].filter(Boolean).join(' ');
  const node = course.nodes.get(path);
  state.feedback = node
    ? { kind: 'branch', text: `${moveNumber(p.ply + 1, san)} is a real option here: it leads to ${node.lines.map(id => lineLabel(course.byId.get(id))).join(' or ')}. This drill follows a different move.`, switchTo: node.lines[0], san }
    : { kind: 'bad', text: `${moveNumber(p.ply + 1, san)} is legal, but it is not the book move. Try again, or ask for a hint.` };
}

function hint() {
  const p = state.practice;
  if (p.done || position().turn !== userColor()) return;
  if (p.hint < 2) { p.hint++; p.hints++; }
  p.streak = 0;
  play('hint');
  const expected = line().moves[p.ply];
  state.feedback = p.hint === 1
    ? { kind: 'hint', text: `Move your ${NAMES[expected.piece.toLowerCase()]} on ${squareName(expected.from)}.` }
    : { kind: 'hint', text: `Play ${moveNumber(p.ply + 1, expected.san)}, following the arrow.` };
  render();
}

// ---------- Board interaction ----------

function onSquare(square) {
  const pos = position();
  if (practicing() && (!state.practice || state.practice.done || state.timer || pos.turn !== userColor())) return;
  const piece = pos.board[square];
  if (state.selected >= 0) {
    const move = legalMoves(pos, state.selected).find(m => m.to === square && (!m.promotion || m.promotion === 'q'));
    if (move) {
      state.selected = -1;
      playMove(move);
      render();
      return;
    }
  }
  state.selected = piece && colorOf(piece) === pos.turn && square !== state.selected ? square : -1;
  if (state.selected >= 0) play('select');
  render();
}

function playMove(move) {
  if (practicing()) return practiceMove(move);
  const pos = position();
  const san = toSan(pos, move);
  const path = [pathAt(state.ply), san].filter(Boolean).join(' ');
  const node = course.nodes.get(path);
  if (node) {
    const id = node.lines.includes(state.lineId) ? state.lineId : node.lines[0];
    if (id !== state.lineId) {
      state.lineId = id;
      state.flipped = line().side === 'b';
    }
    state.ply = node.ply;
    state.anim = motion(move);
    state.feedback = null;
  } else {
    const next = line().moves[state.ply];
    state.feedback = { kind: 'bad', text: `${moveNumber(state.ply + 1, san)} is legal, but this course doesn't cover it yet.${next ? ` Here the lesson continues with ${moveNumber(state.ply + 1, next.san)}.` : ''}` };
  }
}

// ---------- Rendering ----------

function displayOrder() {
  const squares = [...Array(64).keys()];
  return state.flipped ? squares.reverse() : squares;
}

function arrowsToDraw() {
  const ply = currentPly();
  const l = line();
  if (practicing()) {
    const p = state.practice;
    if (!p) return { arrows: [], marks: [] };
    if (p.hint === 2 && !p.done) { const m = l.moves[p.ply]; return { arrows: [[m.from, m.to, 'hint']], marks: [] }; }
    if (p.hint === 1 && !p.done) return { arrows: [], marks: [l.moves[p.ply].from] };
    if (!['good', 'reply'].includes(state.feedback?.kind)) return { arrows: [], marks: [] };
  }
  const note = course.noteFor(pathAt(ply));
  return {
    arrows: (note?.arrows || []).map(a => [squareIndex(a.slice(0, 2)), squareIndex(a.slice(2)), 'idea']),
    marks: (note?.marks || []).map(squareIndex)
  };
}

function pieceElement(piece) {
  const [outline, filled] = GLYPHS[piece.toLowerCase()];
  const glyph = make('span', `piece ${colorOf(piece)}`, `${outline}\uFE0E`);
  glyph.dataset.fill = `${filled}\uFE0E`;
  glyph.setAttribute('aria-hidden', 'true');
  return glyph;
}

// Describe how a move looks on screen: which pieces slide (the rook too when
// castling) and which piece is captured. Reversed when stepping backward.
function motion(move, reverse = false) {
  const slides = [[move.from, move.to]];
  if (move.castle) slides.push(move.castle === 'k' ? [move.from + 3, move.from + 1] : [move.from - 4, move.from - 1]);
  const capture = move.captured
    ? { square: move.enPassant ? move.to + (colorOf(move.piece) === 'w' ? 8 : -8) : move.to, piece: move.captured }
    : null;
  return { slides: reverse ? slides.map(([from, to]) => [to, from]) : slides, capture, reverse };
}

// The board is rebuilt on every render, so each moved piece starts at its old
// square's offset and glides home. Only transforms and opacity animate.
// A ring ripples out from the landing square; streak milestones add a cheer
// that floats up and a small confetti pop.
function celebrate(cell, cheer) {
  const ring = make('span', 'ripple');
  cell.append(ring);
  ring.animate([{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 520, delay: MOTION_MS * 0.8, easing: 'ease-out', fill: 'both' })
    .finished.then(() => ring.remove(), () => {});
  if (!cheer) return;
  const bubble = make('span', 'cheer', cheer);
  cell.append(bubble);
  bubble.animate([
    { transform: 'translate(-50%, 0) scale(.4)', opacity: 0 },
    { transform: 'translate(-50%, -70%) scale(1.15)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -120%) scale(1)', opacity: 1, offset: 0.75 },
    { transform: 'translate(-50%, -160%) scale(.95)', opacity: 0 }
  ], { duration: 1300, delay: MOTION_MS, easing: 'ease-out', fill: 'both' }).finished.then(() => bubble.remove(), () => {});
  setTimeout(() => confettiFrom(cell, { count: 40, power: 0.6 }), MOTION_MS);
}

function animateBoard(anim) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cellAt = square => $(`#board [data-square="${square}"]`);
  if (anim.shake) {
    cellAt(anim.square)?.animate([{ boxShadow: 'inset 0 0 0 50px #c0503a99' }, { boxShadow: 'inset 0 0 0 50px #c0503a00' }], { duration: 500, easing: 'ease-out' });
    $('.board-frame').animate([{ transform: 'none' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 340, easing: 'ease-out' });
    return;
  }
  for (const [from, to] of anim.slides) {
    const cell = cellAt(to);
    const piece = cell.querySelector('.piece');
    if (!piece) continue;
    const start = cellAt(from).getBoundingClientRect();
    const end = cell.getBoundingClientRect();
    cell.classList.add('moving');
    piece.animate([
      { transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(1.12)` },
      { transform: 'translate(0, 0) scale(1.12)', offset: 0.8 },
      { transform: 'none' }
    ], { duration: MOTION_MS, easing: 'cubic-bezier(.3,.8,.3,1)' });
  }
  if (anim.celebrate) celebrate(cellAt(anim.slides[0][1]), anim.cheer);
  if (!anim.capture) return;
  const cell = cellAt(anim.capture.square);
  if (anim.reverse) {
    cell.querySelector('.piece')?.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: MOTION_MS * 0.6, fill: 'backwards', easing: 'ease-out' });
    return;
  }
  const ghost = pieceElement(anim.capture.piece);
  ghost.classList.add('ghost');
  cell.append(ghost);
  ghost.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.5) rotate(-18deg)' }], { duration: 320, delay: MOTION_MS * 0.7, fill: 'both', easing: 'ease-out' })
    .finished.then(() => ghost.remove(), () => {});
}

// Time the landing sound to the moment the sliding piece arrives.
function playMoveSound(anim, check) {
  if (anim.shake) return play('wrong');
  const landing = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MOTION_MS * 0.75;
  play(anim.capture && !anim.reverse ? 'capture' : anim.slides.length > 1 ? 'castle' : 'move', landing);
  if (check && !anim.reverse) play('check', landing + 120);
}

function renderSoundToggle() {
  const toggle = $('#sound-toggle');
  toggle.replaceChildren(make('span', '', isMuted() ? '🔇\uFE0E' : '♪'), make('span', 'sound-label', isMuted() ? 'Sound off' : 'Sound on'));
  toggle.setAttribute('aria-pressed', String(!isMuted()));
  toggle.classList.toggle('off', isMuted());
}

function renderBoard() {
  const pos = position();
  const ply = currentPly();
  const last = ply ? line().moves[ply - 1] : null;
  const targets = state.selected >= 0 ? legalMoves(pos, state.selected) : [];
  const { arrows, marks } = arrowsToDraw();
  const checked = inCheck(pos) ? pos.board.indexOf(pos.turn === 'w' ? 'K' : 'k') : -1;
  const board = $('#board');
  board.replaceChildren();
  for (const square of displayOrder()) {
    const piece = pos.board[square];
    const cell = make('button', `square ${(rowOf(square) + colOf(square)) % 2 ? 'dark' : 'light'}`);
    cell.type = 'button';
    cell.dataset.square = square;
    cell.tabIndex = square === state.focus ? 0 : -1;
    if (last && (square === last.from || square === last.to)) cell.classList.add('last-move');
    if (square === state.selected) cell.classList.add('selected');
    if (marks.includes(square)) cell.classList.add('marked');
    if (square === checked) cell.classList.add('in-check');
    if (targets.some(m => m.to === square)) cell.classList.add(piece || targets.some(m => m.to === square && m.enPassant) ? 'capture' : 'legal');
    let label = `${squareName(square)}, ${piece ? `${SIDE[colorOf(piece)]} ${NAMES[piece.toLowerCase()]}` : 'empty'}`;
    if (piece) {
      cell.append(pieceElement(piece));
    }
    if (targets.some(m => m.to === square)) label += ', legal move';
    cell.setAttribute('aria-label', label);
    cell.addEventListener('click', () => {
      state.focus = square;
      onSquare(square);
      $(`#board [data-square="${square}"]`).focus({ preventScroll: true });
    });
    board.append(cell);
  }
  const layer = $('#arrow-layer');
  layer.replaceChildren();
  // Arrows fade in after a sliding piece lands, but not on every re-render.
  layer.classList.toggle('fresh', Boolean(state.anim?.slides));
  const point = square => {
    const row = state.flipped ? 7 - rowOf(square) : rowOf(square);
    const col = state.flipped ? 7 - colOf(square) : colOf(square);
    return [col * 100 + 50, row * 100 + 50];
  };
  for (const [from, to, kind] of arrows) {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    const length = Math.hypot(x2 - x1, y2 - y1);
    const [start, end] = [22 / length, 1 - 30 / length];
    const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineEl.setAttribute('x1', x1 + (x2 - x1) * start);
    lineEl.setAttribute('y1', y1 + (y2 - y1) * start);
    lineEl.setAttribute('x2', x1 + (x2 - x1) * end);
    lineEl.setAttribute('y2', y1 + (y2 - y1) * end);
    lineEl.setAttribute('class', `arrow ${kind}`);
    lineEl.setAttribute('marker-end', 'url(#head)');
    layer.append(lineEl);
  }
  const files = state.flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = state.flipped ? '12345678' : '87654321';
  $('#file-labels').replaceChildren(...[...files].map(f => make('span', '', f)));
  $('#rank-labels').replaceChildren(...[...ranks].map(r => make('span', '', r)));
  if (state.anim) {
    playMoveSound(state.anim, checked >= 0);
    animateBoard(state.anim);
  }
  state.anim = null;
}

function renderStatus() {
  const pos = position();
  const ply = currentPly();
  const l = line();
  $('#turn-dot').className = `player-dot ${pos.turn}`;
  const ended = ply >= l.moves.length;
  const d = state.drill;
  if (d && (d.index < 0 || d.finished)) {
    $('#turn-title').textContent = d.finished ? 'Drill complete' : 'Daily drill';
    $('#turn-subtitle').textContent = `${d.items.length} items · reviews and mixed positions`;
  } else if (practicing()) {
    const p = state.practice;
    const counts = `${p.mistakes} ${p.mistakes === 1 ? 'mistake' : 'mistakes'} · ${p.hints} ${p.hints === 1 ? 'hint' : 'hints'}`;
    $('#turn-title').textContent = p.done ? (p.kind === 'position' ? 'Solved' : 'Line complete') : pos.turn === userColor() ? 'Your move' : `${SIDE[pos.turn]} is thinking…`;
    if (d) {
      const what = p.kind === 'review' ? `Review · ${l.name}` : p.done ? l.name : `Position · you play ${SIDE[p.side]}`;
      $('#turn-subtitle').textContent = `Drill ${d.index + 1} of ${d.items.length} · ${what} · ${counts}`;
    } else {
      $('#turn-subtitle').textContent = `Practice as ${SIDE[p.side]} · ${l.name} · ${counts}`;
    }
  } else {
    $('#turn-title').textContent = ended ? 'End of line' : `${SIDE[pos.turn]} to move`;
    $('#turn-subtitle').textContent = `${l.family} · ${l.name}`;
  }
  $('#ply-count').textContent = `MOVE ${Math.min(Math.floor(ply / 2) + 1, Math.ceil(l.moves.length / 2))}`;
  const due = dueKeys(progress).length;
  $('#progress').textContent = `${Object.keys(progress).length} MASTERED${due ? ` · ${due} DUE` : ''}`;
  $('#drill-due').textContent = due || '';
  $('#drill-due').hidden = !due;
  if (state.progressPop) $('#progress').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', background: '#e2f0e6' }, { transform: 'scale(1)' }], { duration: 600, delay: MOTION_MS + 400, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  state.progressPop = false;
  const streak = $('#streak');
  const p = state.practice;
  const count = practicing() && p ? p.streak : 0;
  streak.hidden = count < 2;
  if (count >= 2 && streak.dataset.count !== String(count)) {
    streak.textContent = `🔥 ${count} in a row`;
    streak.animate([{ transform: 'scale(.6)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, delay: MOTION_MS, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'backwards' });
  }
  streak.dataset.count = count;
}

function renderControls() {
  const learn = state.mode === 'learn';
  const ply = state.ply;
  const end = line().moves.length;
  $('.controls').hidden = !learn;
  $('#first').disabled = $('#prev').disabled = !learn || ply === 0;
  $('#next').disabled = $('#last').disabled = !learn || ply >= end;
  for (const mode of ['learn', 'practice', 'drill']) {
    $(`#mode-${mode}`).classList.toggle('active', state.mode === mode);
    $(`#mode-${mode}`).setAttribute('aria-selected', String(state.mode === mode));
  }
  $('.line-picker').hidden = state.mode === 'drill';
  $('#line-select').value = state.lineId;
}

function renderCoach() {
  const coach = $('#coach');
  coach.replaceChildren();
  const l = line();
  if (state.mode === 'learn') {
    const ply = state.ply;
    const note = course.noteFor(pathAt(ply));
    coach.append(make('p', 'eyebrow', ply ? `${SIDE[ply % 2 ? 'w' : 'b'].toUpperCase()} PLAYED` : 'WELCOME'));
    coach.append(make('h2', 'coach-title', ply ? moveNumber(ply, l.moves[ply - 1].san) : course.opening.name));
    coach.append(make('p', 'coach-text', note?.text || ''));
    if (state.feedback) coach.append(make('p', `feedback ${state.feedback.kind}`, state.feedback.text));
    if (ply >= l.moves.length) {
      const done = make('div', 'coach-actions');
      done.append(button('Practice this line', () => setMode('practice'), 'button primary'), button('Restart', () => goTo(0)));
      coach.append(done);
    }
    return;
  }
  const d = state.drill;
  if (d && d.index < 0) return renderDrillIntro(coach);
  if (d?.finished) return renderDrillSummary(coach);
  const p = state.practice;
  const fb = state.feedback;
  const userTurn = !p.done && position().turn === userColor();
  if (!d) {
    const sides = make('div', 'side-toggle');
    sides.append(make('span', 'eyebrow', 'PLAY AS'));
    for (const side of ['w', 'b']) {
      const choice = button(SIDE[side], () => selectLine(state.lineId, { mode: 'practice', side }), `side-choice${p.side === side ? ' active' : ''}`);
      choice.setAttribute('aria-pressed', String(p.side === side));
      sides.append(choice);
    }
    coach.append(sides);
  }
  const where = d ? `${p.kind === 'review' ? 'REVIEW' : 'POSITION'} ${d.index + 1} OF ${d.items.length} · ` : '';
  coach.append(make('p', 'eyebrow', where + (p.done ? 'RESULT' : userTurn ? `YOUR MOVE · ${SIDE[userColor()].toUpperCase()}'S MOVE ${Math.floor(p.ply / 2) + 1}` : 'OPPONENT')));
  if (fb?.previous) {
    const yours = make('div', 'your-move');
    yours.append(make('strong', '', `✓ ${moveNumber(fb.previous.ply, fb.previous.move.san)}`), make('span', '', fb.previous.text || ''));
    coach.append(yours);
  }
  if (fb?.move) {
    coach.append(make('h2', `coach-title ${fb.kind}`, `${fb.kind === 'good' ? '✓ ' : ''}${moveNumber(fb.ply, fb.move.san)}`));
    if (fb.text) coach.append(make('p', 'coach-text', fb.text));
    if (userTurn) coach.append(make('p', 'feedback info', 'Your move.'));
  } else if (fb) {
    if (p.done && state.finalNote?.move) {
      coach.append(make('h2', 'coach-title', moveNumber(state.finalNote.ply, state.finalNote.move.san)));
      if (state.finalNote.text) coach.append(make('p', 'coach-text', state.finalNote.text));
    }
    coach.append(make('p', `feedback ${fb.kind}`, fb.text));
    if (fb.switchTo && !d) coach.append(button(`Study ${course.byId.get(fb.switchTo).name} instead`, () => selectLine(fb.switchTo, { mode: 'learn', ply: p.ply + 1 }), 'button subtle-link'));
  }
  const actions = make('div', 'coach-actions');
  const hintButton = button(p.hint === 0 ? 'Hint' : p.hint === 1 ? 'Show the move' : 'Hint shown', hint);
  hintButton.disabled = !userTurn || p.hint === 2;
  if (d) {
    const last = d.index === d.items.length - 1;
    if (p.done) actions.append(button(last ? 'See results' : 'Next →', nextDrillItem, 'button primary'));
    else actions.append(hintButton, button('Skip', skipDrillItem));
  } else if (p.done) {
    actions.append(button('Practice again', () => selectLine(state.lineId, { mode: 'practice', side: p.side }), 'button primary'));
    const next = nextLine();
    if (next) actions.append(button(`Next: ${next.name}`, () => selectLine(next.id, { mode: 'practice' })));
  } else {
    actions.append(hintButton, button('Restart', () => selectLine(state.lineId, { mode: 'practice', side: p.side })));
  }
  coach.append(actions);
}

function nextLine() {
  const rest = course.lines.filter(l => l.id !== state.lineId);
  return rest.find(l => !mastered(l)) || null;
}

function renderDrillIntro(coach) {
  const d = state.drill;
  const reviews = d.items.filter(i => i.kind === 'review').length;
  coach.append(make('p', 'eyebrow', 'DRILL'));
  coach.append(make('h2', 'coach-title', 'Daily drill'));
  const parts = [];
  if (reviews) parts.push(`${reviews} ${reviews === 1 ? 'line is' : 'lines are'} due for review. Play ${reviews === 1 ? 'it' : 'each one'} from the start.`);
  parts.push(`${d.items.length - reviews} quick positions come from the middle of the opening: find your side's next two moves.`);
  if (!Object.keys(progress).length) parts.push('Master lines in Practice to add them to your review schedule and unlock positions from Black\'s side.');
  coach.append(make('p', 'coach-text', parts.join(' ')));
  const actions = make('div', 'coach-actions');
  actions.append(button('Start drill', nextDrillItem, 'button primary'));
  coach.append(actions);
}

function renderDrillSummary(coach) {
  const d = state.drill;
  const clean = d.results.filter(r => r.clean).length;
  coach.append(make('p', 'eyebrow', 'DRILL COMPLETE'));
  coach.append(make('h2', 'coach-title', `${clean} / ${d.results.length} clean`));
  coach.append(make('p', 'coach-text', clean === d.results.length ? 'A perfect drill. Every move found without a hint.' : 'Lines with mistakes stay due for review. Choose any result to study that spot in Learn mode.'));
  const list = make('ul', 'drill-results');
  for (const r of d.results) {
    const l = course.byId.get(r.lineId);
    const item = make('li', r.clean ? 'clean' : 'missed');
    const open = button('', () => selectLine(r.lineId, { mode: 'learn', ply: r.start }));
    open.append(make('span', 'mark', r.clean ? '✓' : '✗'), make('span', '', `${r.kind === 'review' ? 'Review' : 'Position'}: ${l.name}`), make('small', '', SIDE[r.side]));
    item.append(open);
    list.append(item);
  }
  coach.append(list);
  const actions = make('div', 'coach-actions');
  actions.append(button('New drill', startDrill, 'button primary'), button('Back to learning', () => setMode('learn')));
  coach.append(actions);
}

function renderBranches() {
  const panel = $('#branches');
  panel.replaceChildren();
  const learn = state.mode === 'learn';
  panel.hidden = !learn;
  if (!learn) return;
  const l = line();
  const ply = state.ply;
  const node = course.nodes.get(pathAt(ply));
  const parent = node.parent;
  const heading = make('div', 'panel-heading');
  heading.append(make('h2', '', ply < l.moves.length ? 'What can come next' : 'End of this line'));
  panel.append(heading);
  const list = make('div', 'branch-list');
  const options = node.children;
  if (options.length) {
    for (const child of options) {
      const inLine = child.lines.includes(state.lineId);
      const names = child.lines.map(id => course.byId.get(id));
      const item = button('', () => goToPath(child.path), `branch${inLine ? ' current' : ''}`);
      item.append(make('strong', '', moveNumber(child.ply, child.san)));
      item.append(make('span', '', inLine ? (options.length > 1 ? 'This line' : 'Next in this line') : names.length > 1 ? `${names[0].family} · ${names.length} lines` : `${names[0].family}: ${names[0].name}`));
      list.append(item);
    }
    if (options.length > 1) panel.append(make('p', 'muted small', `${options.length} moves are covered here. Choose one to follow that variation.`));
  } else {
    panel.append(make('p', 'muted small', l.summary));
  }
  if (parent && parent.children.length > 1) {
    const others = parent.children.filter(c => c !== node);
    const alt = make('p', 'muted small alt-note', 'Instead of the last move: ');
    others.forEach((child, i) => {
      if (i) alt.append(', ');
      alt.append(button(moveNumber(child.ply, child.san), () => goToPath(child.path), 'text-button'));
    });
    panel.append(alt);
  }
  panel.append(list);
}

function renderMoves() {
  const d = state.drill;
  $('.moves-panel').hidden = Boolean(d && (d.index < 0 || d.finished));
  const l = line();
  const list = $('#move-list');
  list.replaceChildren();
  const ply = currentPly();
  for (let i = 0; i < l.moves.length; i += 2) {
    const row = make('li', 'move-row');
    row.append(make('span', 'move-no', `${i / 2 + 1}.`));
    for (const j of [i, i + 1]) {
      if (j >= l.moves.length) break;
      const hidden = practicing() && j >= ply;
      const cell = button(hidden ? '…' : l.moves[j].san, () => goTo(j + 1), `move${j + 1 === ply ? ' current' : ''}`);
      cell.disabled = practicing();
      row.append(cell);
    }
    list.append(row);
  }
  $('#line-family').textContent = d ? '' : `${l.moves.length} PLIES`;
}

function renderCards() {
  const host = $('#line-cards');
  host.replaceChildren();
  const families = [...new Set(course.lines.map(l => l.family))];
  for (const family of families) {
    const group = make('div', 'family');
    group.append(make('p', 'eyebrow', family.toUpperCase()));
    for (const l of course.lines.filter(x => x.family === family)) {
      const card = make('article', `line-card${l.id === state.lineId ? ' active' : ''}`);
      const title = make('div', 'line-card-title');
      title.append(make('h3', '', l.name));
      const badges = make('span', 'badges');
      for (const side of ['w', 'b']) {
        if (isDue(l, side)) badges.append(make('span', 'badge due', `Review ${SIDE[side]}`));
        else if (mastered(l, side)) badges.append(make('span', 'badge', `✓ ${SIDE[side]}`));
      }
      title.append(badges);
      card.append(title, make('p', 'muted small', l.summary));
      const ideas = make('ul', 'ideas');
      for (const idea of l.ideas) ideas.append(make('li', '', idea));
      card.append(ideas);
      const actions = make('div', 'card-actions');
      actions.append(button('Learn', () => { selectLine(l.id, { mode: 'learn' }); scrollToBoard(); }, 'button small'));
      for (const side of [l.side, l.side === 'w' ? 'b' : 'w']) {
        actions.append(button(`Practice as ${SIDE[side]}`, () => { selectLine(l.id, { mode: 'practice', side }); scrollToBoard(); }, `button small${side === l.side ? ' primary' : ''}`));
      }
      card.append(actions);
      group.append(card);
    }
    host.append(group);
  }
}

function scrollToBoard() {
  $('.play-area').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function renderTree() {
  const host = $('#tree');
  host.replaceChildren();
  const active = state.mode === 'learn' ? pathAt(state.ply) : null;
  const onPath = path => active !== null && (active === path || active.startsWith(`${path} `));
  const run = (node, showNumber) => {
    const wrap = make('div', 'tree-run');
    const moves = make('div', 'tree-moves');
    let current = node;
    let first = showNumber;
    while (current) {
      const label = current.ply % 2 === 1 || first ? moveNumber(current.ply, current.san) : current.san;
      const path = current.path;
      const cls = `tree-move${active === path ? ' current' : onPath(path) ? ' on-path' : ''}`;
      moves.append(button(label, () => goToPath(path), cls));
      first = false;
      if (current.children.length !== 1) break;
      current = current.children[0];
    }
    if (!current.children.length) {
      const l = course.byId.get(current.lines[0]);
      const tag = make('span', `tree-tag${mastered(l) ? ' done' : ''}`, `${mastered(l) ? '✓ ' : ''}${l.name}`);
      moves.append(tag);
    }
    wrap.append(moves);
    if (current.children.length > 1) {
      const branches = make('ul', 'tree-branches');
      for (const child of current.children) {
        const li = make('li');
        li.append(run(child, true));
        branches.append(li);
      }
      wrap.append(branches);
    }
    return wrap;
  };
  host.append(run(course.root.children[0], true));
}

function renderLineSelect() {
  const select = $('#line-select');
  for (const family of new Set(course.lines.map(l => l.family))) {
    const group = make('optgroup');
    group.label = family;
    for (const l of course.lines.filter(x => x.family === family)) {
      const option = make('option', '', l.name);
      option.value = l.id;
      group.append(option);
    }
    select.append(group);
  }
  select.addEventListener('change', () => selectLine(select.value));
}

// Slide new coaching text in, so each move's lesson feels like a fresh card.
let coachText = '';
function animateCoach() {
  const coach = $('#coach');
  if (coach.textContent === coachText) return;
  coachText = coach.textContent;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  [...coach.children].forEach((child, i) => child.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 40 * i, easing: 'ease-out', fill: 'backwards' }));
}

function render() {
  renderBoard();
  renderStatus();
  renderControls();
  renderCoach();
  animateCoach();
  renderBranches();
  renderMoves();
  renderCards();
  renderTree();
}

// ---------- Theme ----------

function loadTheme() {
  try { return { board: 'garden', pieces: 'classic', ...JSON.parse(localStorage.getItem(THEME_KEY)) }; } catch { return { board: 'garden', pieces: 'classic' }; }
}

let theme = loadTheme();

function applyTheme() {
  document.documentElement.dataset.board = theme.board;
  document.documentElement.dataset.pieces = theme.pieces;
  try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); } catch { /* theme just won't persist */ }
}

// Each swatch carries its own data attribute, so it previews its theme's colors.
function renderThemePicker() {
  const swatch = (kind, key, label, preview) => {
    const b = button('', () => { theme = { ...theme, [kind]: key }; applyTheme(); renderThemePicker(); play('select'); }, 'swatch');
    b.dataset[kind] = key;
    b.setAttribute('aria-pressed', String(theme[kind] === key));
    b.append(preview, make('span', '', label));
    return b;
  };
  $('#board-swatches').replaceChildren(...Object.entries(BOARDS).map(([key, label]) => {
    const mini = make('span', 'mini-board');
    mini.append(make('span', 'l'), make('span', 'd'), make('span', 'd'), make('span', 'l'));
    return swatch('board', key, label, mini);
  }));
  $('#piece-swatches').replaceChildren(...Object.entries(PIECE_SETS).map(([key, label]) => {
    const sample = make('span', 'mini-pieces');
    sample.append(pieceElement('N'), pieceElement('n'));
    return swatch('pieces', key, label, sample);
  }));
}

// ---------- Events ----------

$('#first').addEventListener('click', () => goTo(0));
$('#prev').addEventListener('click', () => goTo(state.ply - 1));
$('#next').addEventListener('click', () => goTo(state.ply + 1));
$('#last').addEventListener('click', () => goTo(line().moves.length));
$('#sound-toggle').addEventListener('click', () => {
  setMuted(!isMuted());
  renderSoundToggle();
  play('select');
});
$('#theme-button').addEventListener('click', () => { renderThemePicker(); $('#theme-dialog').showModal(); });
for (const close of document.querySelectorAll('#theme-dialog [data-close]')) close.addEventListener('click', () => $('#theme-dialog').close());
$('#theme-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
$('#flip').addEventListener('click', () => { state.flipped = !state.flipped; render(); });
$('#mode-learn').addEventListener('click', () => setMode('learn'));
$('#mode-practice').addEventListener('click', () => setMode('practice'));
$('#mode-drill').addEventListener('click', () => setMode('drill'));

document.addEventListener('keydown', event => {
  if (event.target.closest('select, input, textarea, dialog')) return;
  const onBoard = event.target.closest('#board');
  if (onBoard && event.key.startsWith('Arrow')) {
    const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[event.key];
    const sign = state.flipped ? -1 : 1;
    const row = Math.max(0, Math.min(7, rowOf(state.focus) + dr * sign));
    const col = Math.max(0, Math.min(7, colOf(state.focus) + dc * sign));
    state.focus = row * 8 + col;
    render();
    $(`#board [data-square="${state.focus}"]`).focus();
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape') { state.selected = -1; render(); return; }
  if (state.mode !== 'learn' || onBoard) return;
  const actions = { ArrowLeft: () => goTo(state.ply - 1), ArrowRight: () => goTo(state.ply + 1), Home: () => goTo(0), End: () => goTo(line().moves.length) };
  if (actions[event.key]) { actions[event.key](); event.preventDefault(); }
});

applyTheme();
renderLineSelect();
renderSoundToggle();
render();
