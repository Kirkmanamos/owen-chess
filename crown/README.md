# Crown & Veil — Prototype 0.2: The Wild Core

A two-player bluffing game. Two hidden armies race toward an unstable power in the centre of the field. The power reshapes the battlefield every round, and when someone gets close, the board shatters into hexagons. You win by capturing the enemy Crown, or by holding the Core with your own revealed Crown.

It grew out of Veiled Crowns. The armies still start face down, but the game is no longer chess. Both players arrange their own army in secret, so where the Crown hides is a decision, not a shuffle. The name is a working title.

**Play online:** [Crown & Veil](https://kirkmanamos.github.io/owen-chess/crown/), once this branch is merged to `main`.

## Run

From the repository root, run `npm start` and open **http://localhost:5173/crown/**. `npm test` runs the Crown & Veil tests alongside the Veiled Crowns ones.

## Play

You can play against another person on the same device, or against the computer. Choose in **New game**.

1. **Setup.** Arrange your 9 face-down units on the 10 squares of your home. Your Crown goes wherever you choose. **Arrange randomly** fills the home for you.
2. **Your turn.** Take **2 actions**; Player 1 takes only 1 on the very first turn. Each action is one of these:
   - **Reveal** a unit, which triggers its "when revealed" power.
   - **Move** a unit one step. Hidden units can move, but they cannot attack.
   - **Attack** with a revealed unit.
   - **Succession**, once per game, using both actions: secretly swap your hidden Crown with another of your hidden units.

   One unit may take both actions, but no unit attacks twice in a turn. You may end your turn early.
3. **The Wild Core surges.** Before the Shattering it surges after every round; after it, after every turn. The next surge, and the squares it will hit, are always shown. After the Shattering, the surge after that is shown too, so every mark is visible through a turn of each player before it strikes.
4. **The Shattering.** The first time a unit reaches a square next to the Core, or at the end of round 6 at the latest:
   - the board animates into hexagons (every other row shifts half a cell sideways)
   - every cell gains 6 neighbours
   - the Wild deck takes over
5. **Win** by capturing the enemy Crown, or by starting two of your turns in a row with your *revealed* Crown on the Core. A unit on the Core can't be pushed or struck, and its owner aims the next surge. After 30 rounds the Core burns out and the game is drawn.

| Unit | Strength | Ability |
| --- | --- | --- |
| Crown | 0 | If it is captured, you lose. While revealed, friendly units next to it get +1 strength. |
| Champion | 5 | No special ability. |
| Guard ×2 | 3 | While revealed, friendly units next to it get +1 strength when defending. |
| Scout ×2 | 2 | When revealed: look at one enemy hidden unit up to 3 steps away. Once revealed, moves up to 2 steps. |
| Archer | 2 | Attacks a unit exactly 2 steps away in a straight line, over an empty space, and never moves to attack. |
| Builder | 1 | When revealed: lay 2 land tiles of your choice. |
| Assassin | 1 | Always wins when it attacks the Crown or the Champion. |

**Combat:**
- The defender is turned face up.
- The higher strength wins, and the loser is removed. A tie removes both.
- A winning attacker moves into the square, except the Archer.

**Land:**
- Plains: no effect.
- Forest: units there can't be peeked at.
- Hill: +1 defence.
- Squares with no land can't be entered.

**Surges:**

| Deck | Card | Count | Effect |
| --- | --- | --- | --- |
| Calm | Grow | 3 | Each player lays a tile. |
| Calm | Bloom | 1 | Fills land within 2 steps of the Core. |
| Calm | Flare | 2 | Reveals a hidden unit on a marked square. |
| Calm | Tremor | 1 | Pushes units next to the Core away from it. |
| Calm | Bolt | 1 | Strikes a marked square with strength 3. |
| Wild | Storm | 2 | Two bolts. |
| Wild | Pulse | 2 | Pushes everything within 2 steps of the Core. |
| Wild | Sink | 2 | Removes a marked empty square. |
| Wild | Wild Flare | 1 | Reveals every hidden unit next to the Core. |
| Wild | Grow | 1 | Each player lays a tile. |

**Intelligence:** the side panel lists the enemy unit types you haven't yet seen revealed, fallen or scouted.

In a two-person game, a pass-device screen appears between turns, because each player can see their own hidden units. The board turns so the player whose turn it is always has their home at the bottom.

## The computer opponent

The computer uses only what a player in its seat would know: its own units, everything revealed, fallen or scouted, and the surges everyone can see. It guesses the rest: your hidden units, the order of the surge deck, and where future marks will land. Then it scores each legal action across a few of those guesses.

What it weighs:
- Units alive.
- Crown safety.
- Stepping out from under both showing surges.
- Holding the Core and aiming surges at your units.
- Pressing toward the Core and toward where your Crown might be.
- What its Scouts have learned.

It usually hides its Crown in its back row with Guards beside it, but not always. There is one strength level, and each decision takes at most about 20 ms.

**Simulation results:**
- **Computer against computer**, 80 games: 68 ended with a captured Crown and 7 with a Crown holding the Core, at about 13 rounds per game. Player 1 won 40 and Player 2 won 35.
- **Computer against random moves**, 40 games: it lost once.

## Code

| File | Responsibility |
| --- | --- |
| `crown/src/rules.js` | Map, homes, Core, square and hex geometry, units, land, surge cards and decks, tunable settings |
| `crown/src/engine.js` | Setup, legal actions, combat, surges, the Shattering, turn flow, win conditions, and each player's private view |
| `crown/src/ai.js` | Computer setup and action choice from sampled hidden information |
| `crown/src/main.js` | Rendering, the squares-to-hexagons animation, and input; no rules |
| `tests/crown/` | Rule scenarios, geometry, surges, privacy, computer behaviour and simulated games |

The engine exports `createGame({ random })`, `getLegalActions(state)`, `applyAction(state, action)` and `viewFor(state, player)`.
- `applyAction` never mutates its input. The state carries its own random seed, so surges stay reproducible.
- Most playtest changes are a number or a list in `SETTINGS`, `UNITS`, `SURGES` or `DECKS` in `rules.js`.

## Design history

- [docs/new-game-rules-draft.md](../docs/new-game-rules-draft.md): the 0.1 rules, with a building step every turn and a passive Throne. Superseded.
- [docs/research-notes.md](../docs/research-notes.md): what makes hidden-army, bluffing and contested-centre games fun.
- [docs/rules-draft-v0.2.md](../docs/rules-draft-v0.2.md): the Wild Core rules this prototype plays. It includes the decisions made while building, such as the two-surge preview, and the open questions for playtesting.
