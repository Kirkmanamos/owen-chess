// Bot-vs-bot balance simulation across playtest rule settings.
//   npm run simulate                 # default sample size
//   npm run simulate -- --games 50   # quicker
//   npm run simulate -- --only default,bonus-reveal
// Results are printed and written to artifacts/simulation-<date>.json.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { playGame } from './sim/play.js';

const ALL_STACK = { anyAdjacent: true, stackAndStep: true, scouting: true };
export const SETTINGS = [
  { name: 'default', rules: {} },
  { name: 'no-bonus-reveal', rules: { turn: { bonusReveal: false } } },
  { name: 'free-reveals', rules: { turn: { revealCostsAction: false } } },
  { name: 'two-actions', rules: { turn: { actionsPerTurn: 2 } } },
  { name: 'no-stacks', rules: { stack: { enabled: false } } },
  { name: 'all-stack-experiments', rules: { stack: ALL_STACK } },
  { name: 'classic-right-only', rules: { exposure: { mode: 'right-empty' } } },
  { name: 'classic-either-side', rules: { exposure: { mode: 'either-horizontal' } } },
  { name: 'no-king-response', rules: { king: { revealResponse: false } } }
];
// Skill checks: a game where the better bot wins more often rewards skill.
const SKILL = [
  { name: 'skill: lookahead vs greedy', rules: {}, players: ['lookahead', 'greedy'] },
  { name: 'skill: lookahead vs random', rules: {}, players: ['lookahead', 'random'] }
];

if (!isMainThread) {
  parentPort.on('message', job => parentPort.postMessage({ id: job.id, result: playGame(job) }));
} else {
  const arg = name => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? null : process.argv[i + 1]; };
  const games = Number(arg('games') ?? 200);
  const only = arg('only')?.split(',');
  const groups = [...SETTINGS, ...SKILL].filter(g => !only || only.includes(g.name));

  // Seats alternate in skill matches, so first-move advantage cancels out.
  const jobs = groups.flatMap(group => Array.from({ length: games }, (_, i) => {
    const [a, b] = group.players ?? ['lookahead', 'lookahead'];
    const players = i % 2 ? { 1: b, 2: a } : { 1: a, 2: b };
    return { id: 0, group: group.name, rules: group.rules, seed: 1000 + i, players, focus: a };
  })).map((job, id) => ({ ...job, id }));

  const results = new Array(jobs.length);
  const started = Date.now();
  let next = 0, done = 0;
  await new Promise(resolve => {
    const workers = Array.from({ length: Math.max(1, availableParallelism() - 1) }, () => new Worker(new URL(import.meta.url)));
    const feed = worker => { if (next < jobs.length) worker.postMessage(jobs[next++]); };
    for (const worker of workers) {
      worker.on('message', ({ id, result }) => {
        results[id] = result;
        done += 1;
        if (done % 100 === 0) process.stderr.write(`  ${done}/${jobs.length} games\n`);
        if (done === jobs.length) { workers.forEach(w => w.terminate()); resolve(); } else feed(worker);
      });
      feed(worker);
    }
  });

  const pct = (n, d) => d ? `${Math.round(100 * n / d)}%` : '–';
  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const summary = groups.map(group => {
    const rs = jobs.map((job, i) => ({ job, r: results[i] })).filter(x => x.job.group === group.name);
    const n = rs.length;
    const decided = rs.filter(x => x.r.winner !== null);
    const all = rs.map(x => x.r);
    const sum = key => all.reduce((t, r) => t + r[key], 0);
    const kinds = {};
    for (const r of all) for (const [k, v] of Object.entries(r.kinds)) kinds[k] = (kinds[k] || 0) + v;
    const totalActions = sum('actions');
    const reasons = {};
    for (const r of all) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    const kingTimes = all.flatMap(r => [r.kingRevealedAt[1], r.kingRevealedAt[2]]);
    const kingBy = all.flatMap(r => [r.kingRevealedBy[1], r.kingRevealedBy[2]]).filter(Boolean);
    const row = {
      setting: group.name, games: n,
      decisive: pct(decided.length, n),
      p1WinOfDecisive: group.players ? undefined : pct(decided.filter(x => x.r.winner === 1).length, decided.length),
      focusWinRate: group.players ? pct(decided.filter(x => x.job.players[x.r.winner] === x.job.focus).length, n) : undefined,
      medianActions: median(all.map(r => r.actions)),
      medianTurns: median(all.map(r => r.turns)),
      revealedAfter5Turns: +mean(all.map(r => r.revealedAfter5 ?? 0)).toFixed(1),
      firstCaptureTurn: median(all.map(r => r.firstCaptureTurn).filter(t => t !== null)),
      capped: pct(all.filter(r => r.reason === 'Action cap').length, n),
      reasons,
      revealShare: pct(kinds.reveal || 0, totalActions),
      challengeShare: pct(kinds.challenge || 0, totalActions),
      stackActionsPerGame: +(((kinds.stack || 0) + (kinds.unstack || 0)) / n).toFixed(2),
      gamesWithStacks: pct(all.filter(r => r.kinds.stack).length, n),
      scoutsPerGame: +(sum('scouts') / n).toFixed(2),
      bonusUseRate: pct(sum('bonusUsed'), sum('bonusUsed') + sum('bonusSkipped')),
      capturesPerGame: +(sum('captures') / n).toFixed(1),
      checksPerGame: +(sum('checks') / n).toFixed(1),
      kingRevealedMedianAction: median(kingTimes.filter(t => t !== null)),
      kingNeverRevealed: pct(kingTimes.filter(t => t === null).length, kingTimes.length),
      kingRevealedBySelf: pct(kingBy.filter(b => b === 'self').length, kingBy.length),
      winnerKingHidden: pct(decided.filter(x => x.r.winnerKingHidden).length, decided.length),
      leadChangesPerGame: +mean(all.map(r => r.leadChanges)).toFixed(2),
      comebackWins: pct(decided.filter(x => x.r.comeback).length, decided.length),
      branching: +(sum('branching') / sum('decisions')).toFixed(1),
      forcedMoves: pct(sum('forced'), sum('decisions')),
      closeDecisions: pct(sum('close'), sum('closeSamples'))
    };
    return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
  });

  const balance = summary.filter(s => !s.setting.startsWith('skill'));
  const skill = summary.filter(s => s.setting.startsWith('skill'));
  const pick = (rows, keys) => rows.map(r => Object.fromEntries([['setting', r.setting], ...keys.map(k => [k, r[k]])]));
  console.log(`\n${jobs.length} games in ${((Date.now() - started) / 1000).toFixed(0)} s, ${games} per setting\n`);
  console.log('Opening pace (tiles revealed per player after five turns each; turn number counts both players)');
  console.table(pick(balance, ['revealedAfter5Turns', 'firstCaptureTurn', 'medianTurns']));
  console.log('Outcomes');
  console.table(pick(balance, ['decisive', 'p1WinOfDecisive', 'medianActions', 'medianTurns', 'capped', 'comebackWins', 'leadChangesPerGame']));
  console.log('Kings and hidden information');
  console.table(pick(balance, ['kingRevealedMedianAction', 'kingNeverRevealed', 'kingRevealedBySelf', 'winnerKingHidden', 'challengeShare', 'revealShare']));
  console.log('Feature use and choice');
  console.table(pick(balance, ['gamesWithStacks', 'stackActionsPerGame', 'scoutsPerGame', 'bonusUseRate', 'capturesPerGame', 'checksPerGame', 'branching', 'forcedMoves', 'closeDecisions']));
  if (skill.length) { console.log('Skill expression (seats alternate; win rate of the stronger bot, draws count as non-wins)'); console.table(pick(skill, ['focusWinRate', 'decisive', 'medianActions'])); }
  console.log('End reasons');
  for (const s of summary) console.log(`  ${s.setting}: ${Object.entries(s.reasons).map(([k, v]) => `${k} ${v}`).join(', ')}`);

  mkdirSync('artifacts', { recursive: true });
  const file = `artifacts/simulation-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify({ games, summary }, null, 2));
  console.log(`\nSaved ${file}`);
}
