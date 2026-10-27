import { fromFen, makeMove, moveFromSan, toSan } from './chess.js';

// Replay each line once so the UI can jump to any ply, and merge every
// opening's lines into one move tree that shows where variations branch apart.
export function buildCourse(modules) {
  const openings = modules.map(m => m.opening);
  const notes = {};
  for (const module of modules) {
    for (const [path, note] of Object.entries(module.notes)) {
      if (notes[path]) throw new Error(`${module.opening.id}: a note for "${path}" already exists`);
      notes[path] = note;
    }
  }
  const lines = modules.flatMap(m => m.lines.map(line => ({ ...line, opening: m.opening.id })));
  const root = { path: '', san: null, ply: 0, children: [], lines: [] };
  const nodes = new Map([['', root]]);
  const built = lines.map(line => {
    const sans = line.moves.split(' ');
    const positions = [fromFen()];
    const moves = [];
    sans.forEach((san, i) => {
      const move = moveFromSan(positions[i], san);
      if (!move) throw new Error(`${line.id}: illegal move ${san} at ply ${i + 1}`);
      moves.push({ ...move, san: toSan(positions[i], move) });
      positions.push(makeMove(positions[i], move));
    });
    const paths = moves.map((_, i) => sans.slice(0, i + 1).join(' '));
    let node = root;
    node.lines.push(line.id);
    paths.forEach((path, i) => {
      let child = nodes.get(path);
      if (!child) {
        child = { path, san: moves[i].san, ply: i + 1, children: [], lines: [], parent: node };
        nodes.set(path, child);
        node.children.push(child);
      }
      child.lines.push(line.id);
      node = child;
    });
    return { ...line, sans, moves, positions, paths };
  });
  const byId = new Map(built.map(line => [line.id, line]));
  if (byId.size !== built.length) throw new Error('Line ids must be unique across openings');
  const openingById = new Map(openings.map(o => [o.id, o]));
  // The empty path is the starting position, where each opening has its own intro.
  const noteFor = (path, openingId) => path ? notes[path] || null : { text: openingById.get(openingId)?.intro };
  return { openings, openingById, notes, lines: built, byId, root, nodes, noteFor };
}

export const moveNumber = (ply, san) => ply % 2 === 1 ? `${(ply + 1) / 2}.${san}` : `${ply / 2}…${san}`;
