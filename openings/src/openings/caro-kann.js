// The Caro-Kann Defense course: 1.e4 c6, mostly from Black's side. It shares
// 1.e4 with the Italian Game, whose file explains that move.

export const opening = {
  id: 'caro-kann',
  name: 'Caro-Kann Defense',
  moves: 'e4 c6',
  intro: 'The Caro-Kann is a solid defense for Black against 1.e4. Black prepares ...d5 with the c-pawn, then gets the light-squared bishop out before closing the center with ...e6. You play Black in most of these lines. Step through the moves with Next, or play them yourself on the board.'
};

export const lines = [
  {
    id: 'ck-classical',
    family: 'Classical (4…Bf5)',
    name: 'Main line: h4 and long castling',
    side: 'b',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7',
    summary: 'Black develops the bishop to f5 and keeps it safe from White\'s h-pawn, then builds a solid wall with ...e6.',
    ideas: ['Get the bishop out before ...e6.', 'Make an escape square with ...h6.', 'Trade the bishop, then build a solid pawn wall.']
  },
  {
    id: 'ck-karpov',
    family: 'Karpov (4…Nd7)',
    name: 'Main line: knights trade on f6',
    side: 'b',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bc4 Bf5',
    summary: 'Black prepares ...Ngf6 with ...Nd7, so that after a knight trade Black recaptures with a knight and keeps healthy pawns.',
    ideas: ['...Nd7 first, then ...Ngf6.', 'Recapture on f6 with a knight, not a pawn.', 'The bishop still comes out before ...e6.']
  },
  {
    id: 'ck-smothered',
    family: 'Karpov (4…Nd7)',
    name: 'The trap to avoid: 5…Ngf6??',
    side: 'w',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2 Ngf6 Nd6#',
    summary: 'A famous quick checkmate. After 5.Qe2, the natural ...Ngf6 allows Nd6, and Black\'s e-pawn cannot capture because it is pinned.',
    ideas: ['5.Qe2 sets the trap.', 'The e7 pawn is pinned to the king.', 'As Black, answer 5.Qe2 with 5...Ndf6.']
  },
  {
    id: 'ck-advance',
    family: 'Advance (3.e5)',
    name: 'Short system: strike with …c5',
    side: 'b',
    moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7',
    summary: 'White grabs space with e5. Black develops the bishop first, then attacks the base of White\'s pawn chain with ...c5.',
    ideas: ['Bishop out, then ...e6.', 'Attack the base of the chain: ...c5 hits d4.', 'Knights head for c6 and f5 to pile on d4.']
  },
  {
    id: 'ck-exchange',
    family: 'Exchange (3.exd5)',
    name: 'Exchange: a reversed Queen\'s Gambit',
    side: 'b',
    moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bxf3 Nxf3 Bd6',
    summary: 'White releases the tension early. The pawns form the same structure as the Queen\'s Gambit Exchange, with colors reversed, so Black gets the minority attack.',
    ideas: ['Recapture with the c-pawn to keep a center pawn.', 'Develop with tempo: ...Bg4 hits the queen.', 'Black\'s plan is ...b5–b4 on the queenside.']
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

const CK = 'e4 c6 d4 d5';

branch('e4', [
  ['c6', 'The Caro-Kann. Black prepares ...d5 with the c-pawn backing it up. Unlike the French Defense (1...e6), it keeps the c8 bishop\'s diagonal open.', { arrows: ['c6d5', 'c8f5'] }],
  ['d4', 'White takes the full center.', { marks: ['d4', 'e4'] }],
  ['d5', 'Black strikes at e4 straight away. This is the whole point of ...c6: if White takes on d5, Black can recapture with a pawn.', { arrows: ['d5e4'] }]
]);

branch(CK, [
  ['Nc3', 'White protects e4 by developing.', { arrows: ['c3e4'] }],
  ['dxe4', 'Black gives up the center pawn to develop freely.'],
  ['Nxe4', 'White recaptures with a well-placed knight.']
]);

branch(`${CK} Nc3 dxe4 Nxe4`, [
  ['Bf5', 'The Classical Caro-Kann. The bishop comes out before ...e6 and attacks the knight.', { arrows: ['f5e4'] }],
  ['Ng3', 'The knight steps away and attacks the bishop.', { arrows: ['g3f5'] }],
  ['Bg6', 'The bishop retreats but stays on its diagonal.'],
  ['h4', 'White threatens h5, which would trap the bishop.', { arrows: ['h4h5'], marks: ['g6'] }],
  ['h6', 'Black makes an escape square on h7.', { marks: ['h7'] }],
  ['Nf3', 'White develops.'],
  ['Nd7', 'Black covers e5, so White\'s knight cannot jump there and hit the bishop.', { arrows: ['d7e5'] }],
  ['h5', 'White gains space, and the bishop has to move.', { arrows: ['h5g6'] }],
  ['Bh7', 'The bishop tucks into h7, still watching the b1–h7 diagonal.', { arrows: ['h7d3'] }],
  ['Bd3', 'White offers to trade off Black\'s best minor piece.'],
  ['Bxd3', 'Black accepts. White\'s queen comes out, but Black\'s position stays solid.'],
  ['Qxd3', 'White recaptures.'],
  ['e6', 'With the bishop gone, ...e6 shuts nothing in. Black\'s pawns on c6 and e6 form a solid wall.', { marks: ['c6', 'e6', 'f7'] }],
  ['Bd2', 'White prepares to castle queenside.'],
  ['Ngf6', 'Black develops.'],
  ['O-O-O', 'White castles queenside. The pawn on h5 gives White some space on the kingside.'],
  ['Be7', 'Black develops and will castle kingside. Solid and comfortable: the Caro-Kann\'s trademark.']
]);

branch(`${CK} Nc3 dxe4 Nxe4`, [
  ['Nd7', 'The Karpov Variation. Black prepares ...Ngf6, so that if White trades knights, Black can recapture with the other knight and keep healthy pawns.', { marks: ['f6'] }]
]);

branch(`${CK} Nc3 dxe4 Nxe4 Nd7`, [
  ['Nf3', 'White develops calmly.'],
  ['Ngf6', 'Now ...Ngf6 is safe. Black offers a trade.'],
  ['Nxf6+', 'White trades with check.'],
  ['Nxf6', 'Black recaptures with the knight and keeps a healthy pawn structure.'],
  ['Bc4', 'White develops actively and eyes f7.', { arrows: ['c4f7'] }],
  ['Bf5', 'Black gets the bishop out before ...e6. Equal and solid.', { marks: ['f5'] }]
]);

branch(`${CK} Nc3 dxe4 Nxe4 Nd7`, [
  ['Qe2', 'An odd-looking queen move that sets a famous trap.'],
  ['Ngf6', 'A natural developing move, and a terrible blunder. 5...Ndf6 is the safe way to develop.'],
  ['Nd6#', 'Smothered checkmate. The e7 pawn cannot take because the queen on e2 pins it to the king, and Black\'s own pieces block every escape square.', { arrows: ['e2e8'], marks: ['e8'] }]
]);

branch(CK, [
  ['e5', 'The Advance Variation. White grabs space and locks the center.', { marks: ['e5'] }],
  ['Bf5', 'Black gets the bishop out before ...e6 locks it in. This is the key Caro-Kann idea.'],
  ['Nf3', 'White develops calmly. This quiet setup was made popular by Nigel Short.'],
  ['e6', 'Now ...e6 builds the pawn chain without shutting in the bishop.'],
  ['Be2', 'White prepares to castle.'],
  ['c5', 'The key break. Black attacks the base of White\'s pawn chain at d4. In a locked center, attack the base of the chain.', { arrows: ['c5d4'] }],
  ['Be3', 'White protects d4.', { arrows: ['e3d4'] }],
  ['Nd7', 'Black develops and puts pressure on e5.', { arrows: ['d7e5'] }],
  ['O-O', 'White castles.'],
  ['Ne7', 'The knight heads for c6 or f5 to add pressure on d4. Black has active play against White\'s center.', { arrows: ['e7c6', 'e7f5'] }]
]);

branch(CK, [
  ['exd5', 'The Exchange Variation. White releases the tension early.'],
  ['cxd5', 'Black recaptures with the c-pawn and keeps a pawn in the center.', { marks: ['d5'] }],
  ['Bd3', 'The bishop aims at h7 and stops ...Bf5.', { arrows: ['d3h7'], marks: ['f5'] }],
  ['Nc6', 'Black develops and eyes d4.', { arrows: ['c6d4'] }],
  ['c3', 'White supports d4. The pawns now match the Queen\'s Gambit Exchange, with colors reversed.', { marks: ['c3', 'd4'] }],
  ['Nf6', 'Black develops.'],
  ['Bf4', 'White develops the bishop outside the pawn chain.'],
  ['Bg4', 'Black develops with tempo, attacking the queen.', { arrows: ['g4d1'] }],
  ['Qb3', 'The queen steps aside and attacks b7.', { arrows: ['b3b7'] }],
  ['Qd7', 'Black protects b7 along the seventh rank.', { arrows: ['d7b7'] }],
  ['Nd2', 'White develops.'],
  ['e6', 'Black opens a path for the f8 bishop.'],
  ['Ngf3', 'White develops the other knight.'],
  ['Bxf3', 'Black trades bishop for knight, removing a piece that controls e5.'],
  ['Nxf3', 'White recaptures.'],
  ['Bd6', 'Black offers to trade dark-squared bishops. Black\'s plan is the minority attack with ...b5 and ...b4, just like White\'s plan in the Queen\'s Gambit Exchange.', { arrows: ['d6f4', 'b7b4'] }]
]);
