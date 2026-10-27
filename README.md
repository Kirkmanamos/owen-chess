# Veiled Crowns — Version 0.7.0

A playable local two-player prototype of a hidden-army strategy game. The title is a working name. The rules are deliberately experimental.

**Play online:** [Veiled Crowns](https://kirkmanamos.github.io/owen-chess/).

The hosted game is still two players sharing one device. Opening the link on separate devices starts separate games; there is no network multiplayer or saved-game synchronization.

## Run

Install Node.js 20 or later, then from this directory:

```sh
npm start
```

Open **http://localhost:5173**. There are no packages to install, build steps, accounts, external fonts, or network services. The server binds to your computer's loopback interface. To choose another port: `PORT=5174 npm start`.

```sh
npm test       # Rule tests and seeded simulated play
npm run check  # Entry-point syntax checks plus the tests
npm run build  # Copy browser assets into dist/ for static hosting
```

## Play

1. Player 1 occupies **a1–d4**, and Player 2 occupies **a5–d8**. Both armies are shuffled and face down. Files e–h begin empty.
2. Select an outlined hidden tile, then choose a highlighted destination: **1–4 squares right**, **1 square forward**, or **1 square left**. The entire path and destination must be empty; there is no jumping or capture. Flip **where it lands**. The whole slide and reveal costs one action, regardless of distance or the piece underneath. Forward is toward rank 8 for Player 1 and rank 1 for Player 2. A pawn revealed on its far rank promotes to a queen.
3. Turns switch immediately, so the next player can act without dismissing a popup. On later turns, reveal another tile or use a revealed piece's chess movement. Clearing a square can open new reveal routes for nearby hidden tiles.
4. Attack a hidden enemy to challenge it: the target flips in place, and the attacker stays put. Kings are never captured. Newly exposed kings in check receive a response action.
5. Two side-by-side revealed pawns can **Stack**. Both pawns travel together **one square in any of the eight directions**, including sideways and backward. Captures use the same pattern; there is no jumping or double capture. Select **Unstack** to separate into an empty orthogonal neighbor. Stacks remain pawns on the far rank until split, then single pawns there promote.
6. Checkmate wins. **How to play** explains the current rules; **Playtest rules** changes selected rules when starting a fresh game.

Use mouse/touch, or Tab to enter the board, arrow keys to navigate, and Enter/Space to select. Escape clears a tile selection. The **Pass-device screen between turns** checkbox is off by default. Enable it at any point if you want the board hidden between players; when enabled, the next player presses a ready button. This changes presentation only, not turn costs or game state.

### Independent pawn stack experiments

Open **Playtest rules** to mix any combination of these three toggles. They are all **off by default** and require **Allow pawn stacking**. Applying settings starts a new randomized game; New game retains the selected rules.

- **Any-adjacent stacking:** friendly revealed single pawns can combine from horizontal, vertical, or diagonal neighbors. Off means horizontal pairs only.
- **Stack-and-step:** after combining, optionally move the stack one square in any direction to an empty square, within the same action. It may return to the first pawn's vacated square. The step cannot capture or challenge.
- **Stack scouting:** after a noncapturing stack move, optionally reveal one adjacent hidden enemy in place for free. This also works after stack-and-step when both toggles are on. It does not follow a capture, stationary combine, challenge, or unstack.

Choose the stacking partner or movement destination first. The board then previews any optional step/scout choices. Click a highlighted destination, **Finish stacking here**, or **Finish without scouting**. **Cancel action** or Escape discards the whole preview without spending an action. A full stack + step + scout costs one action and records one history entry. King safety is checked at the end of the combined action; scouting uses the existing king-reveal and ambush responses.

Games live in memory. Refreshing or restarting reshuffles the armies. There is no AI opponent, online play, persistence, or undo. The browser holds the full state internally; this is a shared-device prototype, not a secure online hidden-information server.

### One bonus reveal per turn

The independent **One bonus reveal per turn** toggle in **Playtest rules** is **off by default**. When enabled, finishing your normal action(s) offers one optional free slide-and-reveal of another hidden tile, followed by the opponent's turn. The board highlights eligible tiles and offers **Skip bonus reveal** inline, without a popup. If no legal reveal exists, the turn ends automatically.

The normal action can itself be a reveal, so a one-action turn can uncover two tiles. The bonus cannot move a revealed piece, capture, challenge, stack, or unstack. Its newly revealed piece cannot take another normal action that turn. Check still ends a turn immediately; a king revealed in check still receives its response, and response actions never earn bonuses. Ending a multi-action turn early also declines the bonus.

The bonus is once per turn, even with two or three normal actions, and combines with all three stack experiments. **Slide-and-reveal is free (unlimited)** supersedes it; that setting disables the bonus checkbox while retaining its choice. Applying playtest settings starts a new game, and **New game** retains the rules. Queen movement remains unchanged.

### Owen's Rules (Version 0.6)

The original game was invented by a 4-year-old, so the way to win keeps changing. Choose **Game mode → Owen's Rules** in **Playtest rules**. The classic mode is unchanged and remains the default.

- **Goals.** Owen picks one of 13 goals, such as *Sleepover!* (4 pieces in the other team's half), *Parade Time* (6 pieces on one row), *Snack Attack* (eat 8 points of pieces), or *Hug the Board* (touch all four edges). Finishing it earns a **crown**, and Owen picks a new goal. **First to 3 crowns wins.** Checkmate still wins instantly.
- **Owen gets bored.** After 12 turns he swaps the goal. The countdown is always shown.
- **"No! You play like this!"** When someone is one step away, each time the turn passes there is a 40% chance Owen changes the goal.
- **Not Fair tokens.** If a goal is taken away while you are one step from finishing it, you get a token (maximum 3). Spend one per turn, for free: **Not fair!** draws a new goal, and **Pinky promise** locks the goal until your next turn ends.
- **Fairness guardrails.** Owen never picks a goal someone has already nearly finished. Goals marked *counts from now* start both players at zero. Progress reads only public information.

- **Captures pay off.** Captured pieces fly into your **Toy Box**. Catching anything bigger than a pawn gives a **Sugar Rush**: one extra action right away, once per turn. Giving check still ends the turn, and king responses never earn one. Every 4 toys earns a Not Fair token.
- **Unicorns.** Every knight is a unicorn: the same knight piece, with a horn. It still moves exactly like a knight.
- **Stack anything.** Any of your pieces except the king can stack with another of yours up to 2 squares away, up to 3 high. Select a piece, then click a piece marked **+**. **Your first stack each turn is free**, so you can use the new stack right away.
- **Every new mix invents a power.** A stack moves like all of its pieces combined (a pawn inside steps one square any way), plus a power. The first time anyone makes a new mix, Owen rolls a random power for it, and the public **Recipe Book** keeps it for the rest of the game. Powers include Bouncy, Froggy, Floaty, Ghosty, Fort (can't be captured), Sticky (freezes touching enemies), Swappy, Sneezy (pushes touching enemies away), and Pew Pew (zaps 2 squares away).
- **Toys and three of a kind.** Stack a toy from your Toy Box onto one of your pieces; mixes with a toy roll from a wilder pool. Three of a kind always makes a secret super power: Choo-Choo (3 pawns), Rainbow Unicorn, Wizard, Castle Crusher, and Mega Queen. **Pop off** removes your own top piece; toys stay stuck on. A captured stack comes apart into separate toys.
- **Powers show up at once.** A new power gets an announcement, a rainbow ring and badge on the stack, a Recipe Book entry, and sparkles on every square it can now reach. If it's still your turn, the stack stays selected with its moves highlighted.

Each attacker has its own capture sprite: the pawn waddles in for a **CHOMP!**, the unicorn hops for a **NEIGH!**, the bishop teleports with a **ZAP!**, the rook slams for a **CRASH!** that shakes the board, the queen spins in for a **KAPOW!**, the king stomps for a **BONK!**, and a pawn stack does a **SQUISH!**. The captured piece pops out and flies into the Toy Box. Reward bubbles show Sugar Rushes and new tokens.

Announcements pop up over the board without blocking it. Goal cards flip in, progress bars grow, crowns and tokens pop, the countdown yawns, and a near-complete bar shakes. Moving tiles slide to their squares, reveals slide and then flip, and captures flash. The tuning values live in `rules.chaos` (`crownsToWin`, `boredTurns`, `nuhUhChance`, `maxTokens`).

## Architecture

| File | Responsibility |
| --- | --- |
| `src/engine.js` | Immutable transitions, legal actions, response scheduling, public-only UI projection |
| `src/board.js` | Coordinates, geometry, player direction |
| `src/rules/config.js` | Default values and configuration validation |
| `src/rules/setup.js` | Army composition, independent shuffles, starting squares |
| `src/rules/exposure.js` | Clear reveal paths, direction and distance profiles, isolated exposure definition |
| `src/rules/movement.js` | Per-piece movement registry and attack geometry |
| `src/rules/pawn-stack.js` | Combine, split, eight-direction movement, optional step/scout action variants |
| `src/rules/king.js` | Check and newly exposed king detection |
| `src/rules/turn.js` | Action costs and turn allowance |
| `src/rules/outcome.js` | Checkmate, stalemate, repetition, and quiet-action draws |
| `src/rules/chaos.js` | Owen's Rules: goal deck, crowns, boredom, "No! You play like this!", Not Fair tokens, capture rewards |
| `src/rules/powers.js` | Owen's stacks: any-piece stacking, Toy Box toys, recipes, power geometry and power actions |
| `src/rules/random.js` | Seeded randomness stored in the game state |
| `src/main.js` | DOM rendering and input; no movement-rule implementations |
| `tests/engine.test.js` | Rule scenarios, privacy invariants, and material conservation |
| `tests/exposure.test.js` | Reveal distances, blockers, player directions, promotion, privacy and king responses |
| `tests/stack-experiments.test.js` | All eight experiment combinations, compound actions, scouting privacy and king responses |
| `tests/owen-stacks.test.js` | Any-piece stacks, free first stack, recipes, triples, toys, pop-off and every special power |
| `tests/owen-rules.test.js` | Goal completion, tallies, goal swaps when someone is close, boredom, tokens, locks, privacy and seeded replay |
| `tests/bonus-reveal.test.js` | Bounded reveal turns, skipping, check responses, privacy, stacking interactions and seeded play |

The engine exports `createGame(overrides, random)`, `getLegalActions(state)`, `applyAction(state, action)`, and `publicView(state)`. All actions are validated by the engine. `applyAction` returns a new state and never mutates the supplied one. An injectable random function supports deterministic tests.

Examples of code-level experiments:

```js
createGame({
  turn: { actionsPerTurn: 2, revealCostsAction: false },
  exposure: { mode: 'flexible', rightRange: 4, leftRange: 1, forwardRange: 1 },
  stack: { enabled: true, anyAdjacent: true, stackAndStep: true, scouting: true }
});
```

The UI exposes the opening-move profiles, turn options, and stack toggles. The new opening is the default; the two classic one-square opening profiles remain selectable in Playtest rules. Custom reveal ranges are configurable in code (0 disables a direction). More substantial rule changes belong in the small rule modules, not in the rendering code. For example, change `revealDestinations` to try another exposure definition, or `stackMoves` and `stackAttacks` together to try another stack movement pattern. The old `forwardCapture` and `leap` configuration flags have been removed.

See [DESIGN_NOTES.md](DESIGN_NOTES.md) for exact assumptions, unresolved questions, and playtest priorities.

## Hosting and updates

The GitHub repository is [Kirkmanamos/owen-chess](https://github.com/Kirkmanamos/owen-chess). GitHub Pages publishes the `dist/` artifact through `.github/workflows/pages.yml`. Every push to `main` runs the checks, builds the site, and deploys it; pull requests run checks and build without deploying.

To publish an update, commit the intended files and push `main`, then check the **Test and publish game** workflow in GitHub Actions. Browser asset paths are relative so the game works both at localhost and under `/owen-chess/`. Only `index.html`, `src/`, and `.nojekyll` are included in the hosted site. Local screenshots and playtest records in `artifacts/` are ignored by Git.

The hosted link works without running the local server. For local development, use `npm start` and the localhost URL rather than opening `index.html` directly.
