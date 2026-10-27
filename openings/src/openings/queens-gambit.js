// The Queen's Gambit course: 1.d4 d5 2.c4 and Black's three main answers.

export const opening = {
  id: 'queens-gambit',
  name: 'Queen\'s Gambit',
  moves: 'd4 d5 c4',
  intro: 'The Queen\'s Gambit is the classic answer to 1...d5. White offers the c-pawn to pull Black\'s d-pawn away from the center. Games are usually slower and more strategic than after 1.e4, so plans matter more than tricks. Step through the moves with Next, or play them yourself on the board.'
};

export const lines = [
  {
    id: 'qgd-orthodox',
    family: 'Declined (2…e6)',
    name: 'Orthodox: Capablanca\'s freeing plan',
    side: 'w',
    moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5',
    summary: 'The classical main line. White pins and builds slowly; Black waits for the right moment to take on c4 and trade pieces to free the position.',
    ideas: ['Bg5 pins the knight that defends d5.', 'Black takes on c4 when it costs White a tempo.', '...Nd5 trades pieces to relieve a cramped position.']
  },
  {
    id: 'qgd-exchange',
    family: 'Declined (2…e6)',
    name: 'Exchange: the minority attack',
    side: 'w',
    moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nf3 Re8 O-O Nf8 Rab1',
    summary: 'White trades on d5 to fix the pawn structure, then pushes the queenside pawns forward to create a weakness in Black\'s camp.',
    ideas: ['cxd5 creates the Carlsbad pawn structure.', 'Qc2 and Bd3 aim at h7.', 'Rab1 starts the minority attack with b4–b5.']
  },
  {
    id: 'qgd-elephant',
    family: 'Declined (2…e6)',
    name: 'Elephant Trap',
    side: 'b',
    moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8',
    summary: 'White thinks the f6 knight is pinned and grabs d5. Black takes back anyway, gives up the queen for a moment, and wins a knight for a pawn.',
    ideas: ['...Nbd7 sets the trap.', 'The pin on f6 is not real: Black can give up the queen.', '...Bb4+ wins White\'s queen back.']
  },
  {
    id: 'qga-classical',
    family: 'Accepted (2…dxc4)',
    name: 'Classical: 3.Nf3 and …c5',
    side: 'w',
    moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7',
    summary: 'Black takes the pawn but does not try to keep it. White wins it back with Bxc4; Black fights the center with ...c5 and gains queenside space.',
    ideas: ['Don\'t rush to win c4 back: develop first.', 'Black hits the center with ...c5.', 'Both sides get active pieces and a balanced game.']
  },
  {
    id: 'qga-b5',
    family: 'Accepted (2…dxc4)',
    name: 'Why holding the pawn fails',
    side: 'w',
    moves: 'd4 d5 c4 dxc4 e3 b5 a4 c6 axb5 cxb5 Qf3',
    summary: 'If Black tries to keep the extra pawn with ...b5, White breaks the pawn chain and the queen attacks the rook on a8.',
    ideas: ['...b5 to hold c4 is a mistake.', 'a4 attacks the chain at its base.', 'Qf3 hits a8 along the long diagonal.']
  },
  {
    id: 'slav-main',
    family: 'Slav (2…c6)',
    name: 'Main line: 5.a4 Bf5',
    side: 'w',
    moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2',
    summary: 'Black protects d5 with the c-pawn so the light-squared bishop can come out to f5 before ...e6.',
    ideas: ['...c6 keeps the c8 bishop\'s diagonal open.', 'a4 stops ...b5 from holding the c4 pawn.', 'Black gets a solid position and an active bishop.']
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

branch('', [
  ['d4', 'White takes the center with the queen\'s pawn. Unlike a pawn on e4, the d4 pawn is already protected by the queen, so games tend to be slower and more strategic.', { marks: ['d4'] }],
  ['d5', 'Black blocks the pawn and claims an equal share of the center.'],
  ['c4', 'The Queen\'s Gambit. White offers the c-pawn to pull the d5 pawn away from the center. It is not a true gambit: if Black takes, White can usually win the pawn back.', { arrows: ['c4d5'] }]
]);

const QG = 'd4 d5 c4';

branch(QG, [
  ['e6', 'The Queen\'s Gambit Declined. Black holds d5 firmly with a pawn. It is solid, but the c8 bishop is now shut in behind e6. That bishop is Black\'s main problem in this opening.', { arrows: ['e6d5'], marks: ['c8'] }],
  ['Nc3', 'White adds pressure on d5.', { arrows: ['c3d5'] }],
  ['Nf6', 'Black defends d5 again.', { arrows: ['f6d5'] }]
]);

branch(`${QG} e6 Nc3 Nf6`, [
  ['Bg5', 'The bishop pins the knight to the queen. Since the f6 knight defends d5, the pin adds pressure on d5.', { arrows: ['g5f6'] }],
  ['Be7', 'Black breaks the pin calmly.'],
  ['e3', 'White opens a path for the f1 bishop. The c1 bishop is already outside the pawn chain, so e3 does not shut it in.'],
  ['O-O', 'Black castles.'],
  ['Nf3', 'White develops.'],
  ['Nbd7', 'The knight supports a later ...c5 or ...e5 to free Black\'s position.'],
  ['Rc1', 'The rook goes to the c-file, which may open after cxd5 or ...dxc4.', { arrows: ['c1c6'] }],
  ['c6', 'Black strengthens d5 and prepares the freeing plan.'],
  ['Bd3', 'White develops the last minor piece.'],
  ['dxc4', 'Black takes at the right moment: the bishop has just moved, so it spends a second move recapturing.'],
  ['Bxc4', 'White recaptures.'],
  ['Nd5', 'Capablanca\'s freeing maneuver. The knight offers trades. After Bxe7 Qxe7, Black\'s cramped position has more room, and ...e5 can follow. A useful rule of thumb: when you are cramped, trade pieces.', { arrows: ['e7g5'], marks: ['e5'] }]
]);

branch(`${QG} e6 Nc3 Nf6 Bg5`, [
  ['Nbd7', 'It looks as if Black leaves d5 weak. It is actually a trap.'],
  ['cxd5', 'White trades in the center.'],
  ['exd5', 'Black recaptures.'],
  ['Nxd5', 'Greedy. White thinks the f6 knight is pinned and cannot take back.', { marks: ['f6'] }],
  ['Nxd5', 'Black takes back anyway. If White takes the queen, Black has a surprise ready.'],
  ['Bxd8', 'White wins the queen, for now.'],
  ['Bb4+', 'Check! White has to block, and the only way gives the queen back.', { arrows: ['b4e1'] }],
  ['Qd2', 'The only move that blocks.'],
  ['Bxd2+', 'Black takes the queen with check.'],
  ['Kxd2', 'Forced.'],
  ['Kxd8', 'Count the material: the queens are gone, and Black has won a knight for a pawn. That is the Elephant Trap.', { marks: ['d5'] }]
]);

branch(`${QG} e6 Nc3 Nf6`, [
  ['cxd5', 'The Exchange Variation. White settles the tension in the center right away.'],
  ['exd5', 'Black recaptures with the e-pawn, which frees the c8 bishop. This pawn setup is called the Carlsbad structure.', { marks: ['d5', 'c7', 'b7', 'a7'] }],
  ['Bg5', 'The pin again.', { arrows: ['g5f6'] }],
  ['c6', 'Black supports d5 and gives the queen room on c7 or b6.'],
  ['e3', 'White opens a path for the f1 bishop.'],
  ['Be7', 'Black breaks the pin.'],
  ['Bd3', 'The bishop aims at h7.', { arrows: ['d3h7'] }],
  ['Nbd7', 'Black develops.'],
  ['Qc2', 'The queen joins the bishop on the b1–h7 diagonal and stops ...Bf5.', { arrows: ['c2h7'], marks: ['f5'] }],
  ['O-O', 'Black castles.'],
  ['Nf3', 'White develops.'],
  ['Re8', 'The rook supports ...Ne4 and makes room for the knight on f8.'],
  ['O-O', 'White castles.'],
  ['Nf8', 'The knight heads for g6 or e6 to defend the kingside.'],
  ['Rab1', 'The minority attack begins. White will push b4 and b5 to break up Black\'s queenside pawns, even though White has fewer pawns there. The goal is to leave Black with a weak pawn on c6 or d5.', { arrows: ['b2b5'], marks: ['c6'] }]
]);

branch(QG, [
  ['dxc4', 'The Queen\'s Gambit Accepted. Black takes the pawn and gives up the center for now, planning to strike back with ...c5 or ...e5.']
]);

branch(`${QG} dxc4`, [
  ['Nf3', 'White develops and stops ...e5. There is no rush to win the pawn back, because Black cannot hold it.', { arrows: ['f3e5'] }],
  ['Nf6', 'Black develops.'],
  ['e3', 'White opens the bishop\'s path to c4.', { arrows: ['f1c4'] }],
  ['e6', 'Black opens a path for the f8 bishop.'],
  ['Bxc4', 'White wins the pawn back and has more central control.'],
  ['c5', 'Black challenges d4. This is the main way to fight White\'s center in the Queen\'s Gambit Accepted.', { arrows: ['c5d4'] }],
  ['O-O', 'White castles.'],
  ['a6', 'Black prepares ...b5 to gain space and kick the bishop.'],
  ['Qe2', 'The queen supports a later e4 or dxc5.'],
  ['b5', 'Black gains space and hits the bishop.', { arrows: ['b5c4'] }],
  ['Bb3', 'The bishop retreats, still aiming at e6 and f7.'],
  ['Bb7', 'The bishop takes the long diagonal. Both sides have clear plans and active pieces.', { arrows: ['b7f3'] }]
]);

branch(`${QG} dxc4`, [
  ['e3', 'White threatens to win the pawn back with Bxc4 right away.', { arrows: ['f1c4'] }],
  ['b5', 'Black tries to keep the extra pawn. This is a mistake.', { arrows: ['b5c4'] }],
  ['a4', 'White attacks the pawn chain at its base.', { arrows: ['a4b5'] }],
  ['c6', 'Black props up the b5 pawn.'],
  ['axb5', 'White breaks the chain.'],
  ['cxb5', 'Black recaptures, but now the long diagonal is open.'],
  ['Qf3', 'The queen attacks the rook on a8, and the knight on b8 is also loose. Black will lose material. The lesson: in the Queen\'s Gambit Accepted, do not try to hold on to the c4 pawn.', { arrows: ['f3a8'], marks: ['a8'] }]
]);

branch(QG, [
  ['c6', 'The Slav Defense. Black protects d5 with the c-pawn, so the c8 bishop is not shut in the way it is after ...e6.', { arrows: ['c6d5', 'c8f5'] }],
  ['Nf3', 'White develops.'],
  ['Nf6', 'Black develops.'],
  ['Nc3', 'More pressure on d5.', { arrows: ['c3d5'] }],
  ['dxc4', 'Now Black takes, hoping to hold the pawn with ...b5.'],
  ['a4', 'White stops ...b5 for good.', { marks: ['b5'] }],
  ['Bf5', 'The point of the Slav: the c8 bishop gets out before ...e6 shuts it in.', { marks: ['f5'] }],
  ['e3', 'White prepares to win the pawn back.', { arrows: ['f1c4'] }],
  ['e6', 'Black opens a path for the f8 bishop.'],
  ['Bxc4', 'White wins the pawn back.'],
  ['Bb4', 'The bishop pins the c3 knight, which helps control e4.', { arrows: ['b4c3'], marks: ['e4'] }],
  ['O-O', 'White castles.'],
  ['O-O', 'Black castles.'],
  ['Qe2', 'White prepares e4. The Slav gives Black a solid position and an active bishop.', { arrows: ['e3e4'] }]
]);
