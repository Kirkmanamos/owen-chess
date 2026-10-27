// A compact, complete chess move generator: enough to validate every move a
// student tries, read and write standard algebraic notation, and replay lines.
// Squares are 0–63 with 0 = a8 and 63 = h1. White pieces are uppercase.

const FILES = 'abcdefgh';
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const SLIDES = { r: ROOK, b: BISHOP, q: [...ROOK, ...BISHOP] };
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const rowOf = square => square >> 3;
export const colOf = square => square & 7;
export const squareName = square => `${FILES[colOf(square)]}${8 - rowOf(square)}`;
export const squareIndex = name => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);
export const colorOf = piece => piece === piece.toUpperCase() ? 'w' : 'b';
const typeOf = piece => piece.toLowerCase();
const other = color => color === 'w' ? 'b' : 'w';

function step(square, dr, dc) {
  const row = rowOf(square) + dr;
  const col = colOf(square) + dc;
  return row >= 0 && row < 8 && col >= 0 && col < 8 ? row * 8 + col : -1;
}

export function fromFen(fen = START_FEN) {
  const [placement, turn, castling, ep] = fen.split(' ');
  const board = [];
  for (const char of placement.replaceAll('/', '')) {
    if (/\d/.test(char)) board.push(...Array(Number(char)).fill(null));
    else board.push(char);
  }
  return { board, turn, castling: castling === '-' ? '' : castling, ep: ep === '-' ? -1 : squareIndex(ep) };
}

export function toFen(state) {
  const rows = [];
  for (let row = 0; row < 8; row++) {
    let text = '';
    let empty = 0;
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row * 8 + col];
      if (!piece) { empty++; continue; }
      if (empty) { text += empty; empty = 0; }
      text += piece;
    }
    rows.push(text + (empty || ''));
  }
  return `${rows.join('/')} ${state.turn} ${state.castling || '-'} ${state.ep < 0 ? '-' : squareName(state.ep)}`;
}

export function isAttacked(board, target, by) {
  const pawnRow = by === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const from = step(target, pawnRow, dc);
    if (from >= 0 && board[from] === (by === 'w' ? 'P' : 'p')) return true;
  }
  const own = piece => piece && colorOf(piece) === by;
  for (const [dr, dc] of KNIGHT) {
    const from = step(target, dr, dc);
    if (from >= 0 && own(board[from]) && typeOf(board[from]) === 'n') return true;
  }
  for (const [dr, dc] of KING) {
    const from = step(target, dr, dc);
    if (from >= 0 && own(board[from]) && typeOf(board[from]) === 'k') return true;
  }
  for (const [kind, directions] of [['r', ROOK], ['b', BISHOP]]) {
    for (const [dr, dc] of directions) {
      for (let from = step(target, dr, dc); from >= 0; from = step(from, dr, dc)) {
        const piece = board[from];
        if (!piece) continue;
        if (own(piece) && (typeOf(piece) === kind || typeOf(piece) === 'q')) return true;
        break;
      }
    }
  }
  return false;
}

export function inCheck(state, color = state.turn) {
  const king = state.board.indexOf(color === 'w' ? 'K' : 'k');
  return king >= 0 && isAttacked(state.board, king, other(color));
}

function pseudoMoves(state, from) {
  const { board } = state;
  const piece = board[from];
  if (!piece || colorOf(piece) !== state.turn) return [];
  const color = state.turn;
  const moves = [];
  const add = (to, extra = {}) => moves.push({ from, to, piece, captured: board[to] || null, ...extra });
  const type = typeOf(piece);

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const lastRow = color === 'w' ? 0 : 7;
    const push = (to, extra) => {
      if (rowOf(to) === lastRow) for (const promotion of 'qrbn') add(to, { ...extra, promotion });
      else add(to, extra);
    };
    const one = step(from, dir, 0);
    if (one >= 0 && !board[one]) {
      push(one);
      const two = step(one, dir, 0);
      if (rowOf(from) === (color === 'w' ? 6 : 1) && !board[two]) add(two, { double: true });
    }
    for (const dc of [-1, 1]) {
      const to = step(from, dir, dc);
      if (to < 0) continue;
      if (board[to] && colorOf(board[to]) !== color) push(to);
      else if (to === state.ep) add(to, { enPassant: true, captured: color === 'w' ? 'p' : 'P' });
    }
    return moves;
  }

  if (type === 'n' || type === 'k') {
    for (const [dr, dc] of type === 'n' ? KNIGHT : KING) {
      const to = step(from, dr, dc);
      if (to >= 0 && (!board[to] || colorOf(board[to]) !== color)) add(to);
    }
    if (type === 'k') addCastles(state, from, add);
    return moves;
  }

  for (const [dr, dc] of SLIDES[type]) {
    for (let to = step(from, dr, dc); to >= 0; to = step(to, dr, dc)) {
      if (!board[to]) { add(to); continue; }
      if (colorOf(board[to]) !== color) add(to);
      break;
    }
  }
  return moves;
}

function addCastles(state, from, add) {
  const color = state.turn;
  const home = color === 'w' ? 60 : 4;
  if (from !== home || inCheck(state, color)) return;
  const enemy = other(color);
  const [kingSide, queenSide] = color === 'w' ? ['K', 'Q'] : ['k', 'q'];
  const empty = squares => squares.every(s => !state.board[s]);
  const safe = squares => squares.every(s => !isAttacked(state.board, s, enemy));
  if (state.castling.includes(kingSide) && empty([home + 1, home + 2]) && safe([home + 1, home + 2])) add(home + 2, { castle: 'k' });
  if (state.castling.includes(queenSide) && empty([home - 1, home - 2, home - 3]) && safe([home - 1, home - 2])) add(home - 2, { castle: 'q' });
}

export function makeMove(state, move) {
  const board = state.board.slice();
  board[move.to] = move.promotion ? (state.turn === 'w' ? move.promotion.toUpperCase() : move.promotion) : move.piece;
  board[move.from] = null;
  if (move.enPassant) board[move.to + (state.turn === 'w' ? 8 : -8)] = null;
  if (move.castle) {
    const [rookFrom, rookTo] = move.castle === 'k' ? [move.from + 3, move.from + 1] : [move.from - 4, move.from - 1];
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  // A move from or to a corner (or the king's square) removes those rights.
  const lost = { 60: 'KQ', 4: 'kq', 63: 'K', 56: 'Q', 7: 'k', 0: 'q' };
  let castling = state.castling;
  for (const square of [move.from, move.to]) for (const right of lost[square] || '') castling = castling.replace(right, '');
  return { board, turn: other(state.turn), castling, ep: move.double ? (move.from + move.to) / 2 : -1 };
}

export function legalMoves(state, from) {
  const squares = from === undefined ? state.board.keys() : [from];
  const moves = [];
  for (const square of squares) {
    for (const move of pseudoMoves(state, square)) {
      if (!inCheck(makeMove(state, move), state.turn)) moves.push(move);
    }
  }
  return moves;
}

export function toSan(state, move) {
  let san;
  if (move.castle) san = move.castle === 'k' ? 'O-O' : 'O-O-O';
  else if (typeOf(move.piece) === 'p') {
    san = move.captured ? `${FILES[colOf(move.from)]}x${squareName(move.to)}` : squareName(move.to);
    if (move.promotion) san += `=${move.promotion.toUpperCase()}`;
  } else {
    const rivals = legalMoves(state).filter(m => m.piece === move.piece && m.to === move.to && m.from !== move.from);
    let hint = '';
    if (rivals.length) {
      if (rivals.every(m => colOf(m.from) !== colOf(move.from))) hint = FILES[colOf(move.from)];
      else if (rivals.every(m => rowOf(m.from) !== rowOf(move.from))) hint = String(8 - rowOf(move.from));
      else hint = squareName(move.from);
    }
    san = `${move.piece.toUpperCase()}${hint}${move.captured ? 'x' : ''}${squareName(move.to)}`;
  }
  const after = makeMove(state, move);
  if (inCheck(after)) san += legalMoves(after).length ? '+' : '#';
  return san;
}

const bare = san => san.replace(/[+#!?]/g, '').replaceAll('0', 'O');

export function moveFromSan(state, san) {
  const wanted = bare(san);
  return legalMoves(state).find(move => bare(toSan(state, move)) === wanted) || null;
}
