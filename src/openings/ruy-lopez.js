// The Ruy Lopez course. It shares 1.e4 e5 2.Nf3 Nc6 with the Italian Game, whose
// file explains those moves, and splits off at 3.Bb5.

export const opening = {
  id: 'ruy-lopez',
  name: 'Ruy Lopez',
  moves: 'e4 e5 Nf3 Nc6 Bb5',
  intro: 'The Ruy Lopez, or Spanish Game, is one of the most respected openings in chess. Instead of aiming at f7 like the Italian, White\'s bishop pressures the knight that defends e5. The pressure is slow but lasts all game. Step through the moves with Next, or play them yourself on the board.'
};

export const lines = [
  {
    id: 'ruy-closed',
    family: 'Morphy Defense (3…a6)',
    name: 'Closed Ruy: Chigorin',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4',
    summary: 'The main line of the Ruy Lopez. White castles, protects e4 with Re1, then builds the center with c3, h3, and d4.',
    ideas: ['Castle before worrying about e4.', 'c3 and h3 prepare d4 and stop ...Bg4.', 'The bishop ends on c2, aiming at Black\'s king.']
  },
  {
    id: 'ruy-open',
    family: 'Morphy Defense (3…a6)',
    name: 'Open Ruy: 5…Nxe4',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6',
    summary: 'Black grabs the e4 pawn. White opens the center with d4 while Black\'s king is still uncastled, then wins the pawn back.',
    ideas: ['5...Nxe4 is playable, but it opens the game.', 'White answers with d4, not a quick recapture.', 'Black supports the knight with ...d5.']
  },
  {
    id: 'ruy-exchange',
    family: 'Exchange Variation (4.Bxc6)',
    name: 'Exchange: castle first',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1',
    summary: 'White trades the bishop to double Black\'s pawns, castles, and aims for an endgame where the extra kingside pawn counts.',
    ideas: ['Bxc6 gives Black doubled c-pawns.', 'Castling first makes Nxe5 a real threat.', 'White wants an endgame; Black has the bishop pair.']
  },
  {
    id: 'ruy-exchange-nxe5',
    family: 'Exchange Variation (4.Bxc6)',
    name: 'Why 5.Nxe5? fails',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 Nxe5 Qd4 Nf3 Qxe4+ Qe2 Qxe2+ Kxe2',
    summary: 'Taking e5 right away looks free, but Black\'s queen forks the knight and e4 and wins the pawn back.',
    ideas: ['The knight on c6 is gone, but e5 is not really hanging.', '...Qd4 attacks the knight and e4 at once.', 'Castle first, then take.']
  },
  {
    id: 'ruy-berlin',
    family: 'Berlin Defense (3…Nf6)',
    name: 'The Berlin endgame',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
    summary: 'Black hits e4 at once. After a series of trades, queens come off early and Black\'s king stays in the center.',
    ideas: ['Black skips ...a6 and attacks e4.', 'White opens the center with d4.', 'An early endgame: White has the better pawns, Black the bishops.']
  },
  {
    id: 'ruy-noahs-ark',
    family: 'Noah\'s Ark trap',
    name: 'The trap: 8.Qxd4?',
    side: 'b',
    moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4 Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4',
    summary: 'If White grabs the d4 pawn with the queen, Black chases it with tempo, then traps the bishop on b3 with ...c4.',
    ideas: ['...a6 and ...b5 push the bishop to b3.', 'Win time by attacking the queen.', '...c4 traps the bishop behind Black\'s pawns.']
  }
];

export const notes = {};

function branch(path, entries) {
  let current = path;
  for (const [san, text, extras = {}] of entries) {
    current = current ? `${current} ${san}` : san;
    notes[current] = { text, ...extras };
  }
}

const RUY = 'e4 e5 Nf3 Nc6 Bb5';

branch('e4 e5 Nf3 Nc6', [
  ['Bb5', 'The Ruy Lopez, also called the Spanish Game. The bishop pressures the knight on c6, the piece that defends e5. It is not a threat yet: if White takes on c6 and then on e5, Black can win the pawn back. But the pressure lasts all game.', { arrows: ['b5c6', 'c6e5'], marks: ['e5'] }]
]);

branch(RUY, [
  ['a6', 'The Morphy Defense, Black\'s most popular reply. Black asks the bishop at once: trade on c6, or step back?', { arrows: ['a6b5'] }],
  ['Ba4', 'The bishop keeps its eye on c6. White would rather keep this strong attacking piece than trade it.', { arrows: ['a4c6'] }],
  ['Nf6', 'Black develops and attacks e4.', { arrows: ['f6e4'] }],
  ['O-O', 'White castles and lets e4 hang for now. If Black takes it, Re1 and d4 open lines against Black\'s uncastled king. Castling first is a key Ruy idea.']
]);

branch(`${RUY} a6 Ba4 Nf6 O-O`, [
  ['Be7', 'The Closed Ruy. Black develops calmly and gets ready to castle.'],
  ['Re1', 'Now e4 is protected, so ...Nxe4 is no longer possible. White also prepares c3 and d4.', { arrows: ['e1e4'] }],
  ['b5', 'Black kicks the bishop and gains queenside space.', { arrows: ['b5a4'] }],
  ['Bb3', 'The bishop retreats to its best diagonal and aims at f7, just like in the Italian.', { arrows: ['b3f7'] }],
  ['d6', 'Black supports e5 and opens a path for the c8 bishop.', { arrows: ['d6e5'] }],
  ['c3', 'White prepares d4 and makes a retreat square on c2 for the bishop, the same plan as the quiet Italian.', { arrows: ['d2d4'], marks: ['c2'] }],
  ['O-O', 'Black castles. This is one of the most played positions in chess history.'],
  ['h3', 'A small but important move. It stops ...Bg4, which would pin the f3 knight and weaken d4. Stopping your opponent\'s idea before playing your own is called prophylaxis.', { marks: ['g4'] }],
  ['Na5', 'The Chigorin Variation. The knight attacks the bishop and clears the way for the c-pawn.', { arrows: ['a5b3'] }],
  ['Bc2', 'The bishop tucks into c2. From there it aims at Black\'s king along the b1–h7 diagonal.', { arrows: ['c2h7'] }],
  ['c5', 'Black grabs queenside space and puts pressure on d4.', { arrows: ['c5d4'] }],
  ['d4', 'White finally builds the full center. A long maneuvering battle follows: White often plays Nbd2–f1–g3, just like in the Italian, while Black expands on the queenside.', { marks: ['d4', 'e4'] }]
]);

branch(`${RUY} a6 Ba4 Nf6 O-O`, [
  ['Nxe4', 'The Open Ruy. Black takes the pawn. It is playable, but Black\'s king is still in the center, so White opens lines quickly.'],
  ['d4', 'White strikes the center at once instead of rushing to win the pawn back.', { arrows: ['d4e5'] }],
  ['b5', 'Black first kicks the bishop away, so the c6 knight is free to defend e5 again.', { arrows: ['b5a4'] }],
  ['Bb3', 'The bishop retreats and now aims at d5 and f7.', { arrows: ['b3f7'] }],
  ['d5', 'Black protects the e4 knight with a pawn and claims the center.', { arrows: ['d5e4'] }],
  ['dxe5', 'White wins the pawn back. Material is equal again.'],
  ['Be6', 'Black develops and protects d5. The Open Ruy is a lively fight where both sides have active pieces.', { arrows: ['e6d5'] }]
]);

branch(`${RUY} a6`, [
  ['Bxc6', 'The Exchange Variation. White gives up the bishop to give Black doubled c-pawns.'],
  ['dxc6', 'Black recaptures toward the center, opening lines for the queen and the c8 bishop.', { marks: ['c7', 'c6'] }]
]);

branch(`${RUY} a6 Bxc6 dxc6`, [
  ['O-O', 'Castling makes Nxe5 a real threat. If Black answers Nxe5 with ...Qd4 and ...Qxe4, the rook comes to e1 and pins the queen to the king.', { arrows: ['f3e5'] }],
  ['f6', 'Black protects e5 solidly.', { arrows: ['f6e5'] }],
  ['d4', 'White opens the center.'],
  ['exd4', 'Black trades.'],
  ['Nxd4', 'White has four pawns against three on the kingside. In an endgame, that extra pawn can become a passed pawn.', { marks: ['e4', 'f2', 'g2', 'h2'] }],
  ['c5', 'Black kicks the knight.', { arrows: ['c5d4'] }],
  ['Nb3', 'The knight retreats.'],
  ['Qxd1', 'Black trades queens.'],
  ['Rxd1', 'An early endgame. White aims to use the healthy kingside majority; Black relies on the two bishops.']
]);

branch(`${RUY} a6 Bxc6 dxc6`, [
  ['Nxe5', 'It looks like a free pawn, since the knight that defended e5 is gone. But it is not.', { marks: ['e5'] }],
  ['Qd4', 'A double attack. The queen hits the knight on e5 and the pawn on e4.', { arrows: ['d4e5', 'd4e4'] }],
  ['Nf3', 'The knight retreats.'],
  ['Qxe4+', 'Black wins the pawn back with check. With White\'s king still on e1, there is no Re1 trick.', { arrows: ['e4e1'] }],
  ['Qe2', 'White blocks and offers to trade queens.'],
  ['Qxe2+', 'Black trades.'],
  ['Kxe2', 'Material is equal and Black has the two bishops. The lesson: in the Exchange Variation, castle first. Only then is Nxe5 a real threat.']
]);

branch(RUY, [
  ['Nf6', 'The Berlin Defense. Black skips ...a6 and attacks e4 straight away. Kramnik used it to beat Kasparov in their 2000 world championship match.', { arrows: ['f6e4'] }],
  ['O-O', 'White castles anyway, just as against ...a6.'],
  ['Nxe4', 'Black takes the pawn.'],
  ['d4', 'White opens the center while Black\'s king is still on e8.', { arrows: ['d4e5'] }],
  ['Nd6', 'The knight retreats and attacks the bishop.', { arrows: ['d6b5'] }],
  ['Bxc6', 'White trades the bishop to damage Black\'s pawns.'],
  ['dxc6', 'Black recaptures toward the center, opening the d-file for the queen.'],
  ['dxe5', 'The pawn attacks the knight.', { arrows: ['e5d6'] }],
  ['Nf5', 'The knight finds a safe square.'],
  ['Qxd8+', 'Queens come off the board.'],
  ['Kxd8', 'The Berlin endgame. Black can no longer castle and has doubled pawns, but has the two bishops and a very solid position. White has a slight edge thanks to the healthy kingside pawns.', { marks: ['d8'] }]
]);

branch(`${RUY} a6 Ba4`, [
  ['d6', 'The Steinitz Deferred. Black supports e5 with a pawn. It is solid, and it hides a trap.', { arrows: ['d6e5'] }],
  ['d4', 'White opens the center.'],
  ['b5', 'Black kicks the bishop.', { arrows: ['b5a4'] }],
  ['Bb3', 'The bishop retreats to b3. Remember this square.', { marks: ['b3'] }],
  ['Nxd4', 'Black swaps knights in the center.'],
  ['Nxd4', 'White recaptures.'],
  ['exd4', 'Black takes back. The pawn on d4 looks free.', { marks: ['d4'] }],
  ['Qxd4', 'Greedy. The queen grabs the pawn and walks into the Noah\'s Ark trap. 8.c3 is the right move.'],
  ['c5', 'Black attacks the queen.', { arrows: ['c5d4'] }],
  ['Qd5', 'The queen attacks the rook on a8 and teams up with the bishop against f7.', { arrows: ['d5a8', 'b3f7'] }],
  ['Be6', 'Black blocks, defends, and attacks the queen again.', { arrows: ['e6d5'] }],
  ['Qc6+', 'The queen escapes with check.'],
  ['Bd7', 'Black blocks and attacks the queen once more.', { arrows: ['d7c6'] }],
  ['Qd5', 'The queen returns to d5.'],
  ['c4', 'The trap closes. The pawn attacks the bishop on b3, and every escape is covered: Ba4 runs into ...bxa4, and Bxc4 into ...bxc4. Black\'s pawns surround it like an ark.', { arrows: ['c4b3'], marks: ['b3', 'a4', 'c2'] }]
]);
