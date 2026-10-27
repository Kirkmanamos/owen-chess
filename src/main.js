import { legalMoves, toSan, squareName, squareIndex, rowOf, colOf, colorOf, inCheck } from './chess.js';
import { buildCourse, moveNumber } from './course.js';
import * as italian from './openings/italian.js';

const $ = selector => document.querySelector(selector);
const course = buildCourse(italian);
const GLYPHS = { k: ['♔', '♚'], q: ['♕', '♛'], r: ['♖', '♜'], b: ['♗', '♝'], n: ['♘', '♞'], p: ['♙', '♟'] };
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const SIDE = { w: 'White', b: 'Black' };
const STORAGE_KEY = 'opening-arena.mastered';
const REPLY_DELAY = 650;

const state = {
  lineId: course.lines[0].id,
  mode: 'learn',
  ply: 0,
  flipped: false,
  selected: -1,
  focus: squareIndex('e2'),
  feedback: null,
  practice: null,
  timer: null
};

let mastered = loadMastered();

function loadMastered() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []); } catch { return new Set(); }
}

function saveMastered() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...mastered])); } catch { /* progress just won't persist */ }
}

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
const currentPly = () => state.mode === 'practice' ? state.practice.ply : state.ply;
const position = () => line().positions[currentPly()];
const pathAt = ply => ply ? line().paths[ply - 1] : '';
const lineLabel = l => `${l.family}: ${l.name}`;

// ---------- Navigation ----------

function clearTimer() {
  clearTimeout(state.timer);
  state.timer = null;
}

function selectLine(id, { ply = 0, mode = state.mode } = {}) {
  clearTimer();
  state.lineId = id;
  state.mode = mode;
  state.flipped = line().side === 'b';
  state.selected = -1;
  state.feedback = null;
  if (mode === 'practice') startPractice();
  else state.ply = ply;
  render();
}

function goTo(ply) {
  if (state.mode !== 'learn') return;
  state.ply = Math.max(0, Math.min(line().moves.length, ply));
  state.selected = -1;
  state.feedback = null;
  render();
}

// Jump to a node of the move tree, staying on the current line when it passes through.
function goToPath(path) {
  const node = course.nodes.get(path);
  const id = node.lines.includes(state.lineId) ? state.lineId : node.lines[0];
  if (id !== state.lineId || state.mode !== 'learn') selectLine(id, { ply: node.ply, mode: 'learn' });
  else goTo(node.ply);
}

function setMode(mode) {
  if (mode === state.mode) return;
  selectLine(state.lineId, { mode, ply: 0 });
}

// ---------- Practice ----------

function startPractice() {
  state.practice = { ply: 0, mistakes: 0, hints: 0, hint: 0, done: false };
  state.feedback = { kind: 'info', text: `You play ${SIDE[line().side]}. Find each book move. Wrong guesses and hints are counted.` };
  queueReply();
}

function userColor() {
  return line().side;
}

function queueReply() {
  const p = state.practice;
  const l = line();
  if (p.ply >= l.moves.length) return finishPractice();
  if (l.positions[p.ply].turn === userColor()) return;
  clearTimer();
  state.timer = setTimeout(() => {
    state.timer = null;
    const previous = state.feedback?.kind === 'good' ? state.feedback : null;
    p.ply++;
    p.hint = 0;
    const note = course.noteFor(l.paths[p.ply - 1]);
    state.feedback = { kind: 'reply', move: l.moves[p.ply - 1], ply: p.ply, text: note?.text, previous };
    if (p.ply >= l.moves.length) finishPractice();
    render();
  }, REPLY_DELAY);
}

function finishPractice() {
  const p = state.practice;
  p.done = true;
  const clean = p.mistakes === 0 && p.hints === 0;
  if (clean) { mastered.add(state.lineId); saveMastered(); }
  state.finalNote = state.feedback;
  state.feedback = { kind: clean ? 'mastered' : 'done', text: clean ? 'Perfect run: no mistakes and no hints. This line is mastered.' : `Line complete with ${p.mistakes} ${p.mistakes === 1 ? 'mistake' : 'mistakes'} and ${p.hints} ${p.hints === 1 ? 'hint' : 'hints'}. Try again for a clean run to master it.` };
}

function practiceMove(move) {
  const p = state.practice;
  const l = line();
  const expected = l.moves[p.ply];
  const before = l.positions[p.ply];
  if (move.from === expected.from && move.to === expected.to) {
    p.ply++;
    p.hint = 0;
    state.feedback = { kind: 'good', move: expected, ply: p.ply, text: course.noteFor(l.paths[p.ply - 1])?.text };
    queueReply();
    return;
  }
  p.mistakes++;
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
  const expected = line().moves[p.ply];
  state.feedback = p.hint === 1
    ? { kind: 'hint', text: `Move your ${NAMES[expected.piece.toLowerCase()]} on ${squareName(expected.from)}.` }
    : { kind: 'hint', text: `Play ${moveNumber(p.ply + 1, expected.san)}, following the arrow.` };
  render();
}

// ---------- Board interaction ----------

function onSquare(square) {
  const pos = position();
  if (state.mode === 'practice' && (state.practice.done || state.timer || pos.turn !== userColor())) return;
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
  render();
}

function playMove(move) {
  if (state.mode === 'practice') return practiceMove(move);
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
  if (state.mode === 'practice') {
    const p = state.practice;
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
      const [outline, filled] = GLYPHS[piece.toLowerCase()];
      const glyph = make('span', `piece ${colorOf(piece)}`, `${outline}︎`);
      glyph.dataset.fill = `${filled}︎`;
      glyph.setAttribute('aria-hidden', 'true');
      cell.append(glyph);
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
}

function renderStatus() {
  const pos = position();
  const ply = currentPly();
  const l = line();
  $('#turn-dot').className = `player-dot ${pos.turn}`;
  const ended = ply >= l.moves.length;
  if (state.mode === 'practice') {
    const p = state.practice;
    $('#turn-title').textContent = p.done ? 'Line complete' : pos.turn === userColor() ? 'Your move' : `${SIDE[pos.turn]} is thinking…`;
    $('#turn-subtitle').textContent = `Practice · ${l.name} · ${p.mistakes} ${p.mistakes === 1 ? 'mistake' : 'mistakes'} · ${p.hints} ${p.hints === 1 ? 'hint' : 'hints'}`;
  } else {
    $('#turn-title').textContent = ended ? 'End of line' : `${SIDE[pos.turn]} to move`;
    $('#turn-subtitle').textContent = `${l.family} · ${l.name}`;
  }
  $('#ply-count').textContent = `MOVE ${Math.min(Math.floor(ply / 2) + 1, Math.ceil(l.moves.length / 2))}`;
  $('#progress').textContent = `${mastered.size} / ${course.lines.length} LINES MASTERED`;
}

function renderControls() {
  const learn = state.mode === 'learn';
  const ply = state.ply;
  const end = line().moves.length;
  $('.controls').hidden = !learn;
  $('#first').disabled = $('#prev').disabled = !learn || ply === 0;
  $('#next').disabled = $('#last').disabled = !learn || ply >= end;
  $('#mode-learn').classList.toggle('active', learn);
  $('#mode-practice').classList.toggle('active', !learn);
  $('#mode-learn').setAttribute('aria-selected', learn);
  $('#mode-practice').setAttribute('aria-selected', !learn);
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
  const p = state.practice;
  const fb = state.feedback;
  const userTurn = !p.done && position().turn === userColor();
  coach.append(make('p', 'eyebrow', p.done ? 'RESULT' : userTurn ? `YOUR MOVE · ${SIDE[userColor()].toUpperCase()}'S MOVE ${Math.floor(p.ply / 2) + 1}` : 'OPPONENT'));
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
    if (fb.switchTo) coach.append(button(`Study ${course.byId.get(fb.switchTo).name} instead`, () => selectLine(fb.switchTo, { mode: 'learn', ply: p.ply + 1 }), 'button subtle-link'));
  }
  const actions = make('div', 'coach-actions');
  if (p.done) {
    actions.append(button('Practice again', () => selectLine(state.lineId, { mode: 'practice' }), 'button primary'));
    const next = nextLine();
    if (next) actions.append(button(`Next: ${next.name}`, () => selectLine(next.id, { mode: 'practice' })));
  } else {
    const hintButton = button(p.hint === 0 ? 'Hint' : p.hint === 1 ? 'Show the move' : 'Hint shown', hint);
    hintButton.disabled = !userTurn || p.hint === 2;
    actions.append(hintButton, button('Restart', () => selectLine(state.lineId, { mode: 'practice' })));
  }
  coach.append(actions);
}

function nextLine() {
  const rest = course.lines.filter(l => l.id !== state.lineId);
  return rest.find(l => !mastered.has(l.id)) || null;
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
  const l = line();
  const list = $('#move-list');
  list.replaceChildren();
  const ply = currentPly();
  for (let i = 0; i < l.moves.length; i += 2) {
    const row = make('li', 'move-row');
    row.append(make('span', 'move-no', `${i / 2 + 1}.`));
    for (const j of [i, i + 1]) {
      if (j >= l.moves.length) break;
      const hidden = state.mode === 'practice' && j >= ply;
      const cell = button(hidden ? '…' : l.moves[j].san, () => goTo(j + 1), `move${j + 1 === ply ? ' current' : ''}`);
      cell.disabled = state.mode === 'practice';
      row.append(cell);
    }
    list.append(row);
  }
  $('#line-family').textContent = `${l.moves.length} PLIES`;
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
      if (mastered.has(l.id)) title.append(make('span', 'badge', '✓ Mastered'));
      card.append(title, make('p', 'muted small', l.summary));
      const ideas = make('ul', 'ideas');
      for (const idea of l.ideas) ideas.append(make('li', '', idea));
      card.append(ideas);
      const actions = make('div', 'card-actions');
      actions.append(button('Learn', () => { selectLine(l.id, { mode: 'learn' }); scrollToBoard(); }, 'button small'));
      actions.append(button(`Practice as ${SIDE[l.side]}`, () => { selectLine(l.id, { mode: 'practice' }); scrollToBoard(); }, 'button small primary'));
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
      const tag = make('span', `tree-tag${mastered.has(l.id) ? ' done' : ''}`, `${mastered.has(l.id) ? '✓ ' : ''}${l.name}`);
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

function render() {
  renderBoard();
  renderStatus();
  renderControls();
  renderCoach();
  renderBranches();
  renderMoves();
  renderCards();
  renderTree();
}

// ---------- Events ----------

$('#first').addEventListener('click', () => goTo(0));
$('#prev').addEventListener('click', () => goTo(state.ply - 1));
$('#next').addEventListener('click', () => goTo(state.ply + 1));
$('#last').addEventListener('click', () => goTo(line().moves.length));
$('#flip').addEventListener('click', () => { state.flipped = !state.flipped; render(); });
$('#mode-learn').addEventListener('click', () => setMode('learn'));
$('#mode-practice').addEventListener('click', () => setMode('practice'));

document.addEventListener('keydown', event => {
  if (event.target.closest('select, input, textarea')) return;
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

renderLineSelect();
render();
