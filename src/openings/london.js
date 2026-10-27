// The London System course. It shares 1.d4 (and 1.d4 d5) with the Queen's
// Gambit, whose file explains those moves.

export const opening = {
  id: 'london',
  name: 'London System',
  moves: 'd4',
  label: '1.d4 and 2.Bf4',
  intro: 'The London System is a setup more than a sequence: Bf4, e3, Nf3, c3, Nbd2, and Bd3 against almost anything Black plays. There is little to memorize, so it is a great way to build confidence. You play White. Step through the moves with Next, or play them yourself on the board.'
};

export const lines = [
  {
    id: 'london-main',
    family: 'Main setup (1…d5)',
    name: 'The full setup and castling',
    side: 'w',
    moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6 O-O',
    summary: 'The standard London. The bishop comes out before e3, the c3–d4–e3 triangle holds the center, and Bg3 answers the bishop trade offer.',
    ideas: ['Bf4 before e3, so the bishop is not shut in.', 'c3, d4, and e3 form a solid triangle.', 'Bg3 meets ...Bd6 without giving up the bishop.']
  },
  {
    id: 'london-attack',
    family: 'Main setup (1…d5)',
    name: 'Attacking plan: Ne5 and f4',
    side: 'w',
    moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6 Ne5 Bb7 f4',
    summary: 'The same setup, but instead of castling White plants a knight on e5 and supports it with f4, getting ready to attack Black\'s king.',
    ideas: ['Ne5 is the London\'s attacking outpost.', 'f4 makes the knight hard to remove.', 'The bishop on d3 already aims at h7.']
  },
  {
    id: 'london-qb6',
    family: 'Early …c5 and …Qb6',
    name: 'Meeting …Qb6',
    side: 'w',
    moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 Qb6 Qb3 c4 Qc2 Bf5 Qc1 e6 Nd2 Nf6 Ngf3',
    summary: 'Black\'s most annoying plan: the queen attacks b2, which the f4 bishop no longer defends. White offers a queen trade, then keeps b2 covered.',
    ideas: ['With the bishop on f4, b2 needs a defender.', 'Qb3 offers a trade that would open the a-file.', 'Qc1 is not pretty, but it keeps b2 safe.']
  },
  {
    id: 'london-kid',
    family: 'Against …g6',
    name: 'Against a King\'s Indian setup',
    side: 'w',
    moves: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 Nbd7 O-O',
    summary: 'The same London against a kingside fianchetto. The bishop goes to e2 instead of d3, and h3 gives the f4 bishop a retreat.',
    ideas: ['Same setup, different opponent.', 'Be2: there is no target on h7 for a bishop on d3.', 'h3 keeps ...Nh5 from trading off the f4 bishop.']
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

const LONDON = 'd4 d5 Bf4';

branch('d4 d5', [
  ['Bf4', 'The London System. White develops the dark-squared bishop before playing e3, so it is not shut in behind the pawns. The same setup works against almost anything.', { marks: ['f4'] }]
]);

branch(LONDON, [
  ['Nf6', 'Black develops normally.'],
  ['e3', 'The pawn supports d4 and opens a path for the f1 bishop. The f4 bishop is already outside the pawn chain.'],
  ['e6', 'Black builds a solid center. Now Black\'s c8 bishop is the one stuck behind the pawns.', { marks: ['c8'] }],
  ['Nf3', 'White develops.'],
  ['c5', 'Black challenges d4, the main way to fight the London.', { arrows: ['c5d4'] }],
  ['c3', 'The London triangle: pawns on c3, d4, and e3 make d4 rock solid.', { marks: ['c3', 'd4', 'e3'] }],
  ['Nc6', 'Black adds pressure on d4.', { arrows: ['c6d4'] }],
  ['Nbd2', 'The knight goes to d2, not c3, so the c3 pawn can stay where it is. From d2 it also supports a later e4.', { arrows: ['d2e4'] }],
  ['Bd6', 'Black offers to trade off White\'s best bishop.', { arrows: ['d6f4'] }],
  ['Bg3', 'White keeps the bishop. If Black takes on g3, hxg3 opens the h-file toward Black\'s king.', { arrows: ['g3d6'] }],
  ['O-O', 'Black castles.'],
  ['Bd3', 'The bishop aims at h7, next to Black\'s king.', { arrows: ['d3h7'] }],
  ['b6', 'Black prepares ...Bb7 to fight for the e4 square.']
]);

branch(`${LONDON} Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6`, [
  ['O-O', 'White castles. This is the typical London: solid, flexible, and easy to play. Next, White chooses between Ne5 with f4, or e4 to open the center.']
]);

branch(`${LONDON} Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3 b6`, [
  ['Ne5', 'The attacking plan. The knight jumps to e5, the London\'s favorite outpost.', { marks: ['e5'] }],
  ['Bb7', 'Black develops.'],
  ['f4', 'Now no black pawn can easily kick the knight from e5. White can follow up with Qf3 and a rook lift, or g4–g5, against Black\'s king.', { arrows: ['f4e5', 'd3h7'], marks: ['e5'] }]
]);

branch(LONDON, [
  ['c5', 'Black hits d4 right away.', { arrows: ['c5d4'] }],
  ['e3', 'White supports d4.'],
  ['Nc6', 'More pressure on d4.', { arrows: ['c6d4'] }],
  ['c3', 'The London triangle again.', { marks: ['c3', 'd4', 'e3'] }],
  ['Qb6', 'Black\'s most annoying plan against the London. The queen attacks b2, which the bishop defended from c1 but no longer does from f4.', { arrows: ['b6b2'], marks: ['b2'] }],
  ['Qb3', 'White offers to trade queens. If ...Qxb3, axb3 opens the a-file for White\'s rook, a good trade for White.', { arrows: ['b3b6'] }],
  ['c4', 'Black kicks the queen and gains queenside space.', { arrows: ['c4b3'] }],
  ['Qc2', 'The queen retreats and still guards b2.', { arrows: ['c2b2'] }],
  ['Bf5', 'Black develops with tempo, attacking the queen.', { arrows: ['f5c2'] }],
  ['Qc1', 'The queen keeps guarding b2 from c1. It is not pretty, but it is solid.', { arrows: ['c1b2'] }],
  ['e6', 'Black builds the center.'],
  ['Nd2', 'White develops and prepares b3 or e4 to challenge Black\'s pawns.'],
  ['Nf6', 'Black develops.'],
  ['Ngf3', 'White finishes developing. Black has queenside space; White plans b3 to break up the c4 pawn.', { arrows: ['b2b3'] }]
]);

branch('d4', [
  ['Nf6', 'Black develops and stops e4.', { arrows: ['f6e4'] }],
  ['Bf4', 'The London works against ...Nf6 too: same bishop, same setup.', { marks: ['f4'] }],
  ['g6', 'Black prepares to put the bishop on g7, a King\'s Indian setup.'],
  ['e3', 'White builds the usual triangle.'],
  ['Bg7', 'The bishop takes the long diagonal.', { arrows: ['g7b2'] }],
  ['Nf3', 'White develops.'],
  ['O-O', 'Black castles.'],
  ['Be2', 'Against the fianchetto, a bishop on d3 would have no target on h7, so it goes to the modest, safe e2 square.'],
  ['d6', 'Black prepares ...e5.'],
  ['h3', 'White gives the f4 bishop a retreat on h2, so ...Nh5 cannot trade it off.', { marks: ['h2'] }],
  ['Nbd7', 'Black gets ready for ...e5.', { arrows: ['e7e5'] }],
  ['O-O', 'White castles. Same London, different opponent: White keeps the setup and waits for Black to commit.']
]);
