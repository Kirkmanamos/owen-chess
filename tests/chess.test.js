import test from 'node:test';
import assert from 'node:assert/strict';
import { fromFen, toFen, legalMoves, makeMove, moveFromSan, toSan } from '../src/chess.js';

const play = (sans, fen) => sans.split(' ').reduce((state, san) => {
  const move = moveFromSan(state, san);
  assert.ok(move, `expected ${san} to be legal in ${toFen(state)}`);
  return makeMove(state, move);
}, fromFen(fen));

// Perft counts are the standard check that a move generator is complete.
function perft(state, depth) {
  if (depth === 0) return 1;
  return legalMoves(state).reduce((sum, move) => sum + perft(makeMove(state, move), depth - 1), 0);
}

test('starting position perft', () => {
  assert.equal(perft(fromFen(), 1), 20);
  assert.equal(perft(fromFen(), 2), 400);
  assert.equal(perft(fromFen(), 3), 8902);
});

test('kiwipete perft covers castling, en passant, and promotion', () => {
  const kiwipete = fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.equal(perft(kiwipete, 1), 48);
  assert.equal(perft(kiwipete, 2), 2039);
});

test('castling writes O-O and moves the rook', () => {
  const state = play('e4 e5 Nf3 Nc6 Bc4 Bc5');
  const castle = moveFromSan(state, 'O-O');
  assert.equal(toSan(state, castle), 'O-O');
  assert.match(toFen(makeMove(state, castle)), /^r1bqk1nr\/pppp1ppp\/2n5\/2b1p3\/2B1P3\/5N2\/PPPP1PPP\/RNBQ1RK1 b kq/);
});

test('en passant captures the passed pawn', () => {
  const state = play('e4 Nf6 e5 d5');
  const move = moveFromSan(state, 'exd6');
  assert.ok(move.enPassant);
  assert.equal(makeMove(state, move).board[27], null);
});

test('disambiguation, check, and mate suffixes', () => {
  const twoKnights = play('Nf3 a6 d3 b6');
  assert.equal(toSan(twoKnights, moveFromSan(twoKnights, 'Nbd2')), 'Nbd2');
  assert.equal(moveFromSan(twoKnights, 'Nd2'), null);
  const scholar = play('e4 e5 Bc4 Nc6 Qh5 Nf6');
  assert.equal(toSan(scholar, moveFromSan(scholar, 'Qxf7')), 'Qxf7#');
  assert.equal(legalMoves(play('e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7')).length, 0);
});
