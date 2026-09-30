# Veiled Crowns — Version 0.5.0

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
| `src/main.js` | DOM rendering and input; no movement-rule implementations |
| `tests/engine.test.js` | Rule scenarios, privacy invariants, and material conservation |
| `tests/exposure.test.js` | Reveal distances, blockers, player directions, promotion, privacy and king responses |
| `tests/stack-experiments.test.js` | All eight experiment combinations, compound actions, scouting privacy and king responses |
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
