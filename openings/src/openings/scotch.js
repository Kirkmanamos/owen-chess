// The Scotch Game course. It shares 1.e4 e5 2.Nf3 Nc6 with the Italian Game,
// whose file explains those moves, and splits off at 3.d4.

export const opening = {
  id: 'scotch',
  name: 'Scotch Game',
  moves: 'e4 e5 Nf3 Nc6 d4',
  intro: 'The Scotch Game opens the center right away with 3.d4. The plans are direct, there is less to memorize than in the Ruy Lopez, and Garry Kasparov made it popular at the top level. Step through the moves with Next, or play them yourself on the board.'
};

export const lines = [
  {
    id: 'scotch-classical',
    family: 'Classical (4…Bc5)',
    name: 'Classical: the fight for d4',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4 Ne5 Be2 Qg6 O-O d5',
    summary: 'Black attacks the d4 knight with the bishop and queen. White defends it with Be3 and c3, then castles; Black strikes back with ...d5.',
    ideas: ['Black piles up on the d4 knight.', 'Be3 and c3 keep the knight safe.', 'Castling protects g2 from the queen.']
  },
  {
    id: 'scotch-schmidt',
    family: 'Schmidt (4…Nf6)',
    name: 'Mieses: e5 and c4',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4 Ba6 b3',
    summary: 'Black attacks e4. White trades on c6, pushes e5 with tempo, and chases the knight with c4.',
    ideas: ['Trade on c6 before pushing e5.', 'Qe2 defends e5 and blocks the e-file.', 'White has space; Black has active pieces.']
  },
  {
    id: 'scotch-steinitz',
    family: 'Steinitz (4…Qh4)',
    name: 'Punishing the early queen',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nc3 Bb4 Be2 Qxe4 Nb5 Bxc3+ bxc3 Kd8 O-O',
    summary: 'Black\'s queen grabs the e4 pawn. White gives it up for fast development, threatens Nxc7, and leaves Black\'s king stuck in the center.',
    ideas: ['An early queen raid costs time.', 'Nb5 threatens a fork on c7.', 'A pawn is worth less than a lead in development.']
  },
  {
    id: 'scotch-gambit',
    family: 'Scotch Gambit (4.Bc4)',
    name: 'Scotch Gambit: 5.e5 d5',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7 Bxc6 bxc6 O-O Bc5',
    summary: 'White develops the bishop instead of recapturing on d4. Black hits back in the center with ...d5, and White wins the pawn back later.',
    ideas: ['4.Bc4 offers d4 for speed.', 'Black\'s best reply is the freeing ...d5.', 'White regains the pawn with Nxd4.']
  },
  {
    id: 'scotch-nxd4',
    family: 'Early mistake',
    name: 'Punishing 3…Nxd4?',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 d4 Nxd4 Nxd4 exd4 Qxd4 Ne7 Bc4 Nc6 Qd5',
    summary: 'Trading knights on d4 brings White\'s queen to the center. When Black chases it, Qd5 threatens checkmate on f7.',
    ideas: ['3...Nxd4 helps White develop the queen.', 'A centralized queen is hard to kick.', 'Qd5 and Bc4 together hit f7.']
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

const SCOTCH = 'e4 e5 Nf3 Nc6 d4';

branch('e4 e5 Nf3 Nc6', [
  ['d4', 'The Scotch Game. White strikes in the center at once instead of developing a bishop first. The e5 pawn is attacked.', { arrows: ['d4e5'] }]
]);

branch(SCOTCH, [
  ['exd4', 'Black takes. This is almost always right: holding e5 with ...d6 is passive.']
]);

branch(`${SCOTCH} exd4`, [
  ['Nxd4', 'White recaptures and has a strong knight in the center. White has more space; Black develops easily and will try to hit the knight.', { marks: ['d4'] }]
]);

branch(`${SCOTCH} exd4 Nxd4`, [
  ['Bc5', 'The Classical Scotch. The bishop attacks the knight on d4.', { arrows: ['c5d4'] }],
  ['Be3', 'White defends the knight with a developing move.', { arrows: ['e3d4'] }],
  ['Qf6', 'Black piles up on d4: the queen and bishop both attack it.', { arrows: ['f6d4', 'c5d4'] }],
  ['c3', 'A pawn defends the knight, so it is secure.', { arrows: ['c3d4'] }],
  ['Nge7', 'Black develops the knight to e7, since the queen is on f6.'],
  ['Bc4', 'The bishop develops actively.'],
  ['Ne5', 'The knight attacks the bishop.', { arrows: ['e5c4'] }],
  ['Be2', 'The bishop retreats to safety.'],
  ['Qg6', 'The queen eyes e4 and g2.', { arrows: ['g6e4', 'g6g2'] }],
  ['O-O', 'White castles, and the king now protects g2.'],
  ['d5', 'Black strikes back in the center and opens lines for the pieces. A sharp, balanced position.', { arrows: ['d5e4'] }]
]);

branch(`${SCOTCH} exd4 Nxd4`, [
  ['Nf6', 'The Schmidt Variation. Black develops and attacks e4.', { arrows: ['f6e4'] }],
  ['Nxc6', 'White trades knights first, so that after ...bxc6 the e5 push comes with tempo.'],
  ['bxc6', 'Black recaptures toward the center.'],
  ['e5', 'The pawn attacks the knight on f6.', { arrows: ['e5f6'] }],
  ['Qe7', 'The queen pins the e5 pawn to White\'s king, so the pawn cannot take the knight. The queen also attacks e5.', { arrows: ['e7e1'] }],
  ['Qe2', 'White defends e5 and blocks the e-file.'],
  ['Nd5', 'The knight finds a central square.'],
  ['c4', 'White kicks the knight.', { arrows: ['c4d5'] }],
  ['Ba6', 'The bishop attacks c4, which is pinned to the queen on e2.', { arrows: ['a6e2'] }],
  ['b3', 'White defends c4. White has more space and better pawns; Black has active pieces.']
]);

branch(`${SCOTCH} exd4 Nxd4`, [
  ['Qh4', 'The Steinitz Variation. The queen attacks e4 at once. Bringing the queen out early is risky.', { arrows: ['h4e4'] }],
  ['Nc3', 'White defends e4 by developing.', { arrows: ['c3e4'] }],
  ['Bb4', 'Black pins the knight that defends e4.', { arrows: ['b4c3'] }],
  ['Be2', 'White develops and lets e4 go. Here, development matters more than a pawn.'],
  ['Qxe4', 'Black grabs the pawn, and the queen is now in the middle of the board.'],
  ['Nb5', 'The knight heads for c7, where it would fork the king and rook.', { arrows: ['b5c7'] }],
  ['Bxc3+', 'Black takes the other knight with check.'],
  ['bxc3', 'White recaptures.'],
  ['Kd8', 'The king has to guard c7 itself, and it will never castle.', { marks: ['d8', 'c7'] }],
  ['O-O', 'White castles. Black is a pawn up, but the king is stuck in the center while White\'s pieces come into play quickly. The lesson: an early queen raid costs time.']
]);

branch(`${SCOTCH} exd4`, [
  ['Bc4', 'The Scotch Gambit. White develops the bishop instead of taking back, offering the d4 pawn for fast development.', { arrows: ['c4f7'] }],
  ['Nf6', 'Black attacks e4, just like in the Two Knights Defense.', { arrows: ['f6e4'] }],
  ['e5', 'The pawn kicks the knight.', { arrows: ['e5f6'] }],
  ['d5', 'The best reply. Black hits the bishop and frees the position.', { arrows: ['d5c4'] }],
  ['Bb5', 'The bishop pins the knight on c6.', { arrows: ['b5c6'] }],
  ['Ne4', 'The knight jumps to a strong central square.'],
  ['Nxd4', 'White wins the pawn back.'],
  ['Bd7', 'Black breaks the pin.'],
  ['Bxc6', 'White trades.'],
  ['bxc6', 'Black recaptures.'],
  ['O-O', 'White castles.'],
  ['Bc5', 'Black develops and attacks the d4 knight. An active, balanced position.', { arrows: ['c5d4'] }]
]);

branch(SCOTCH, [
  ['Nxd4', 'A common beginner move. Black trades knights, but this only helps White.'],
  ['Nxd4', 'White takes.'],
  ['exd4', 'Black recaptures.'],
  ['Qxd4', 'White\'s queen lands in the center. With Black\'s c6 knight gone, there is no easy way to kick it.', { marks: ['d4'] }],
  ['Ne7', 'Black develops and heads for c6 to attack the queen.', { arrows: ['e7c6'] }],
  ['Bc4', 'White develops with a threat in mind.', { arrows: ['c4f7'] }],
  ['Nc6', 'The knight attacks the queen.', { arrows: ['c6d4'] }],
  ['Qd5', 'The queen steps to d5, and now Qxf7 would be checkmate: the queen and bishop both aim at f7. Black has to defend with ...Qe7 or ...Qf6.', { arrows: ['d5f7', 'c4f7'], marks: ['f7'] }]
]);
