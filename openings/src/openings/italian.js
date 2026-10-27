// The Italian Game course. Each line is a full move sequence from the starting
// position. Coaching notes are keyed by the move path that leads to them, so a
// position shared by several lines is explained once. A note may carry arrows
// ('c4f7' = c4 to f7) and marked squares to draw on the board.

export const opening = {
  id: 'italian',
  name: 'Italian Game',
  moves: 'e4 e5 Nf3 Nc6 Bc4',
  intro: 'The Italian Game is one of the oldest openings in chess. White develops quickly, castles early, and points a bishop at f7, the weakest square in Black\'s position. Step through the moves with Next, or play them yourself on the board.'
};

export const lines = [
  {
    id: 'piano-main',
    family: 'Giuoco Piano',
    name: 'Main line: c3 and d4',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3 Nce7 O-O O-O',
    summary: 'White builds a big pawn center with c3 and d4. Black breaks it up with the freeing move ...d5.',
    ideas: ['c3 prepares d4 for an ideal center.', 'Black answers the center with ...d5.', 'White gets an isolated d-pawn: space and activity, but a long-term target.']
  },
  {
    id: 'pianissimo',
    family: 'Giuoco Piano',
    name: 'Giuoco Pianissimo: slow d3',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3 Ba7 Nbd2',
    summary: 'The modern, patient approach. White protects e4, castles, and slowly regroups the queen\'s knight toward the kingside.',
    ideas: ['d3 keeps e4 solid instead of fighting at once.', 'Bishops retreat to b3 and a7 so they cannot be trapped.', 'Knight route: b1–d2–f1–g3.']
  },
  {
    id: 'evans',
    family: 'Giuoco Piano',
    name: 'Evans Gambit',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nge7 cxd4 d5 exd5 Nxd5 Ba3',
    summary: 'White sacrifices the b-pawn to win time for c3 and d4, then attacks before Black can castle.',
    ideas: ['b4 deflects the bishop so c3 and d4 come with tempo.', 'Development matters more than one pawn.', 'Ba3 can keep Black\'s king in the center.']
  },
  {
    id: 'two-knights-main',
    family: 'Two Knights Defense',
    name: '4.Ng5 main line: 5...Na5',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4 exd3 Nxd3 Qc7',
    summary: 'White attacks f7 and wins a pawn. Black gives it up for fast development and chases the white pieces around.',
    ideas: ['Ng5 attacks f7 twice; ...d5 blocks the bishop.', '5...Na5 kicks the bishop instead of recapturing.', 'Black plays a pawn down for active pieces.']
  },
  {
    id: 'fried-liver',
    family: 'Two Knights Defense',
    name: 'Fried Liver Attack (trap)',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3',
    summary: 'If Black recaptures with 5...Nxd5, White can sacrifice the knight on f7 and drag Black\'s king into the middle of the board.',
    ideas: ['5...Nxd5 leaves f7 too weak.', 'Nxf7 draws the king out.', 'Pile up on the pinned knight on d5.']
  },
  {
    id: 'two-knights-d3',
    family: 'Two Knights Defense',
    name: 'Quiet 4.d3',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5',
    summary: 'White avoids sharp lines, protects e4, and heads for a long, strategic game. The bishop ends up on c2.',
    ideas: ['d3 protects e4 calmly.', 'c3 prepares d4 and gives the bishop a home on c2.', 'Black gains queenside space with ...b5 and ...c5.']
  },
  {
    id: 'shilling-trap',
    family: '3...Nd4 Shilling Gambit',
    name: 'The trap: 4.Nxe5?',
    side: 'b',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#',
    summary: 'A cheap trap. If White greedily takes e5 and then f7, Black\'s queen and knight deliver a smothered checkmate.',
    ideas: ['3...Nd4 leaves e5 as bait.', '...Qg5 forks the knight and g2.', 'The king is boxed in by its own pieces.']
  },
  {
    id: 'shilling-calm',
    family: '3...Nd4 Shilling Gambit',
    name: 'The refutation: 4.O-O',
    side: 'w',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Nd4 O-O d6 c3 Nxf3+ Qxf3 Nf6 d4',
    summary: 'The best way to meet a trap is to keep developing. White castles, kicks the knight, and takes the center.',
    ideas: ['Do not grab the e5 pawn.', 'Castle and kick the knight with c3.', 'Finish with d4 and a lead in development.']
  }
];

export const notes = {};

// Register coaching notes for consecutive moves that follow a known path.
function branch(path, entries) {
  let current = path;
  for (const [san, text, extras = {}] of entries) {
    current = current ? `${current} ${san}` : san;
    notes[current] = { text, ...extras };
  }
}

branch('', [
  ['e4', 'White takes the center and opens lines for the queen and the light-squared bishop.', { arrows: ['f1c4', 'd1h5'] }],
  ['e5', 'Black claims an equal share of the center. The e5 pawn is now a target.', { marks: ['e5'] }],
  ['Nf3', 'The knight develops and attacks e5 at the same time. Knights before bishops is a good habit.', { arrows: ['f3e5'] }],
  ['Nc6', 'Black defends e5 by developing a piece instead of making a pawn move like ...d6 or ...f6.', { arrows: ['c6e5'] }],
  ['Bc4', 'This is the Italian Game. The bishop aims at f7, the weakest square in Black\'s camp because only the king defends it. Black\'s main choices are 3...Bc5, 3...Nf6, and the tricky 3...Nd4.', { arrows: ['c4f7'], marks: ['f7'] }]
]);

const ITALIAN = 'e4 e5 Nf3 Nc6 Bc4';

// Giuoco Piano
branch(ITALIAN, [
  ['Bc5', 'The Giuoco Piano, Italian for "quiet game." Black develops the bishop to the same active diagonal, aiming at f2.', { arrows: ['c5f2'], marks: ['f2'] }],
  ['c3', 'White prepares d4 to build a big pawn center. Later the queen can use the d1–b3 diagonal.', { arrows: ['d2d4'] }],
  ['Nf6', 'Black develops and attacks e4. White must decide: strike now with d4, or play slowly with d3.', { arrows: ['f6e4'] }]
]);

branch(`${ITALIAN} Bc5 c3 Nf6`, [
  ['d4', 'The direct approach. The d4 pawn attacks both the bishop on c5 and the pawn on e5.', { arrows: ['d4c5', 'd4e5'] }],
  ['exd4', 'Black captures to break up the center. If Black waits, d4xe5 hits the f6 knight.'],
  ['cxd4', 'White recaptures and has the ideal center: pawns side by side on e4 and d4. If they advance, Black\'s pieces get pushed back.', { marks: ['e4', 'd4'] }],
  ['Bb4+', 'The bishop was attacked, so it moves with check to gain time.', { arrows: ['b4e1'] }],
  ['Bd2', 'White blocks with a developing move and offers a trade. The sharp alternative 7.Nc3 is the Møller Attack.'],
  ['Bxd2+', 'Black trades bishops.'],
  ['Nbxd2', 'Recapturing with the knight develops another piece and keeps e4 protected.', { arrows: ['d2e4'] }],
  ['d5', 'The key freeing move. Black hits the center before White can push e5. In open games, ...d5 is often how Black equalizes.', { arrows: ['d5e4'], marks: ['d5'] }],
  ['exd5', 'White trades so that Black cannot capture on e4.'],
  ['Nxd5', 'The knight recaptures and lands on a strong central square.'],
  ['Qb3', 'The queen lines up behind the bishop to pressure d5 and also attacks b7.', { arrows: ['c4d5', 'b3b7'] }],
  ['Nce7', 'Black adds a second defender to d5 instead of giving up a pawn.', { arrows: ['e7d5'] }],
  ['O-O', 'White castles. The d4 pawn is now isolated: no pawn on the c- or e-file can protect it. It gives space and activity, but it can become a target.', { marks: ['d4'] }],
  ['O-O', 'Both kings are safe. White will use the open e-file (Rfe1) for activity. Black will blockade d5 and target the d4 pawn.']
]);

branch(`${ITALIAN} Bc5 c3 Nf6`, [
  ['d3', 'The Giuoco Pianissimo, "the very quiet game." White protects e4 and builds slowly. This is the most popular choice among strong players today.', { arrows: ['d3e4'] }],
  ['d6', 'Black does the same: e5 is protected and the c8 bishop can now develop.', { arrows: ['d6e5'] }],
  ['O-O', 'Castle early. The king is safer and the rook moves toward the center.'],
  ['O-O', 'Both sides have developed and castled. Now the slow maneuvering begins.'],
  ['Re1', 'The rook supports e4 and clears f1 for the knight\'s journey.', { arrows: ['e1e4'] }],
  ['a6', 'Black prepares a retreat square on a7. If White plays b4 or d4 later, the bishop can step back without being trapped.', { marks: ['a7'] }],
  ['Bb3', 'White steps back before ...d5 or ...Na5 can harass the bishop. It still points at f7.', { arrows: ['b3f7'] }],
  ['Ba7', 'Black mirrors White. The bishop keeps its long diagonal toward f2.', { arrows: ['a7f2'] }],
  ['Nbd2', 'The knight heads for f1 and then g3, where it supports a kingside attack. This slow buildup is the heart of the Giuoco Pianissimo.', { arrows: ['d2f1', 'f1g3'] }]
]);

branch(`${ITALIAN} Bc5`, [
  ['b4', 'The Evans Gambit. White offers a pawn: if Black takes, c3 hits the bishop and d4 follows with gain of time.', { arrows: ['b4c5'], marks: ['b4'] }],
  ['Bxb4', 'Black accepts the gambit. Declining with 4...Bb6 is also playable.'],
  ['c3', 'The pawn attacks the bishop and prepares d4.', { arrows: ['c3b4', 'd2d4'] }],
  ['Ba5', 'The main retreat. The bishop stays on the a5–e1 diagonal.', { arrows: ['a5c3'] }],
  ['d4', 'White strikes in the center. For one pawn, White has open lines for both bishops and a lead in development.'],
  ['exd4', 'Black captures. White\'s next move is about speed, not winning the pawn back.'],
  ['O-O', 'Castle first. White is a pawn down, but Black\'s pieces are still at home.'],
  ['Nge7', 'A modern, solid defense. The knight covers d5 and prepares ...d5 to give material back.', { arrows: ['e7d5'] }],
  ['cxd4', 'White regains a center pawn and builds the ideal center again.', { marks: ['e4', 'd4'] }],
  ['d5', 'Black gives back material to finish developing. It is the same freeing ...d5 idea from the Giuoco Piano.'],
  ['exd5', 'White trades.'],
  ['Nxd5', 'Black recaptures, opening the e7 square.'],
  ['Ba3', 'The point: the bishop controls f8, so Black cannot castle kingside. White keeps attacking chances for the pawn.', { arrows: ['a3f8'], marks: ['g8'] }]
]);

// Two Knights Defense
branch(ITALIAN, [
  ['Nf6', 'The Two Knights Defense, the most aggressive reply. Black ignores f7 and counterattacks e4.', { arrows: ['f6e4'] }],
  ['Ng5', 'White attacks f7 twice: knight and bishop. Moving a piece twice breaks an opening guideline, but the threat is real.', { arrows: ['g5f7', 'c4f7'], marks: ['f7'] }],
  ['d5', 'The best defense: the pawn blocks the bishop\'s path to f7.', { arrows: ['d5c4'] }],
  ['exd5', 'White captures. Now Black has a choice: 5...Na5 is correct, and 5...Nxd5?! is a risky mistake.']
]);

branch(`${ITALIAN} Nf6 Ng5 d5 exd5`, [
  ['Na5', 'The main line. Black chases the bishop away from f7 instead of recapturing. Black accepts being a pawn down for fast development.', { arrows: ['a5c4'] }],
  ['Bb5+', 'The bishop checks so it is not kicked again by ...b5.', { arrows: ['b5e8'] }],
  ['c6', 'Black blocks and offers another pawn.'],
  ['dxc6', 'White takes.'],
  ['bxc6', 'Black is a pawn down but will gain time chasing White\'s pieces.'],
  ['Be2', 'The bishop retreats to safety.'],
  ['h6', 'Black kicks the knight, which has already moved twice.', { arrows: ['h6g5'] }],
  ['Nf3', 'The knight retreats. It has now moved three times, so Black leads in development.'],
  ['e4', 'Black chases the knight again.', { arrows: ['e4f3'] }],
  ['Ne5', 'The knight jumps to a strong central square.'],
  ['Bd6', 'Black develops and attacks the knight.', { arrows: ['d6e5'] }],
  ['d4', 'White supports the knight and gains space. But the pawn skipped past d3, a square the e4 pawn attacks, so en passant is possible.', { marks: ['d3'] }],
  ['exd3', 'En passant. The e4 pawn captures the d-pawn as if it had moved only one square. This opens lines toward White\'s king.', { marks: ['d3'] }],
  ['Nxd3', 'White recaptures.'],
  ['Qc7', 'The queen lines up behind the bishop toward h2. For the pawn, Black has active pieces and open lines: classic Two Knights compensation.', { arrows: ['d6h2'] }]
]);

branch(`${ITALIAN} Nf6 Ng5 d5 exd5`, [
  ['Nxd5', 'Natural, but risky. The knight on d5 is loose and f7 is under-protected.', { marks: ['f7', 'd5'] }],
  ['Nxf7', 'The Fried Liver Attack. The knight sacrifices itself to drag Black\'s king out. (6.d4 is objectively even stronger.)'],
  ['Kxf7', 'Black takes the knight, and the king is pulled into the open.'],
  ['Qf3+', 'Check, and the queen attacks the knight on d5, which is pinned to the king.', { arrows: ['f3f7', 'c4d5'] }],
  ['Ke6', 'The king steps up to defend the knight. Other moves lose it.'],
  ['Nc3', 'White piles up on the pinned knight. Black\'s king is stuck in the middle of the board. The lesson for Black: answer 5.exd5 with 5...Na5.', { arrows: ['c3d5'], marks: ['e6'] }]
]);

branch(`${ITALIAN} Nf6`, [
  ['d3', 'The quiet Italian. White protects e4 and avoids the sharp lines, aiming for a long, strategic game.', { arrows: ['d3e4'] }],
  ['Be7', 'Black develops modestly. 4...Bc5 is also common.'],
  ['O-O', 'White castles.'],
  ['O-O', 'Both kings are safe.'],
  ['Re1', 'The rook supports e4, just like in the Pianissimo.', { arrows: ['e1e4'] }],
  ['d6', 'Black supports e5.'],
  ['c3', 'White prepares d4 and gives the bishop a retreat square on c2.', { marks: ['c2'] }],
  ['Na5', 'The knight attacks the bishop on c4.', { arrows: ['a5c4'] }],
  ['Bb5', 'The bishop avoids the trade.'],
  ['a6', 'Black kicks it again.'],
  ['Ba4', 'The bishop stays on the a4–e8 diagonal.'],
  ['b5', 'And again.'],
  ['Bc2', 'The bishop settles on c2. From there it can aim at Black\'s king along the b1–h7 diagonal, as in the Ruy Lopez.', { arrows: ['c2h7'] }],
  ['c5', 'Black grabs queenside space. The pawn structure looks like a Ruy Lopez: a long maneuvering game is ahead.']
]);

// 3...Nd4 Blackburne Shilling Gambit
branch(ITALIAN, [
  ['Nd4', 'The Blackburne Shilling Gambit, a cheap trap. Black moves the knight a second time and leaves e5 hanging. Should White grab it?', { marks: ['e5'] }]
]);

branch(`${ITALIAN} Nd4`, [
  ['Nxe5', 'Greedy. Taking e5 looks free, but it walks into a trap.'],
  ['Qg5', 'The queen attacks the knight on e5 and the pawn on g2 at the same time.', { arrows: ['g5e5', 'g5g2'] }],
  ['Nxf7', 'White doubles down, forking the queen and rook. But Black does not care.', { arrows: ['f7d8', 'f7h8'] }],
  ['Qxg2', 'Now the rook on h1 is attacked.', { arrows: ['g2h1'] }],
  ['Rf1', 'White saves the rook.'],
  ['Qxe4+', 'Check, and the bishop must block.', { arrows: ['e4e1'] }],
  ['Be2', 'Forced.'],
  ['Nf3#', 'Smothered checkmate. White\'s own pieces trap the king. The lesson: don\'t grab pawns when your king is short of defenders.', { marks: ['e1'] }]
]);

branch(`${ITALIAN} Nd4`, [
  ['O-O', 'The calm answer: keep developing. The knight on d4 is not attacking anything important. (4.Nxd4 exd4 5.c3 also works.)'],
  ['d6', 'Black protects e5.'],
  ['c3', 'White kicks the knight.', { arrows: ['c3d4'] }],
  ['Nxf3+', 'Black trades instead of retreating.'],
  ['Qxf3', 'White recaptures and develops the queen.'],
  ['Nf6', 'Black develops.'],
  ['d4', 'White has the center, a lead in development, and a safe king: the reward for calm play.', { marks: ['d4', 'e4'] }]
]);
