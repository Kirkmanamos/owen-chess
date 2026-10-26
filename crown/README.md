# Crown & Veil — Prototype 0.1

A two-player bluffing game about finding the enemy Crown on a battlefield you build as you play. It grew out of Veiled Crowns: the armies still start face down, but the game is no longer chess. Both players arrange their own army in secret, so where the Crown hides is a decision, not a shuffle. The name is a working title.

**Play online:** [Crown & Veil](https://kirkmanamos.github.io/owen-chess/crown/), once this branch is merged to `main`.

## Run

From the repository root, run `npm start` and open **http://localhost:5173/crown/**. `npm test` runs the Crown & Veil tests alongside the Veiled Crowns ones.

## Play

You can play against another person on the same device, or against the computer. Choose in **New game**.

1. **Setup.** Arrange your 9 face-down units on the 10 squares of your home island. Your Crown goes wherever you choose. **Arrange randomly** fills the island for you.
2. **Build.** Each turn starts by laying one land tile from your hand of two on an empty square that touches existing land. Then you draw a new tile. Player 2 lays two tiles on their first turn.
3. **Act.** Then do exactly one thing:
   - **Reveal** a unit, which triggers its "when revealed" power.
   - **Move** a unit one square up, down, left or right. Hidden units can move, but they cannot attack.
   - **Attack** with a revealed unit.
   - **Succession**, once per game: secretly swap your hidden Crown with another of your hidden units.
4. **Win** by capturing the enemy Crown, or by starting your turn with your *revealed* Crown on the Throne in the centre. When the land stack runs out, 20 more turns are played (counting each player's turn), and then whoever has more units within 2 squares of the Throne wins.

| Unit | Strength | Ability |
| --- | --- | --- |
| Crown | 0 | If it is captured, you lose. |
| Champion | 5 | No special ability. |
| Guard ×2 | 3 | While revealed, friendly units next to it get +1 strength when defending. |
| Scout ×2 | 2 | When revealed: look at one enemy hidden unit up to 3 squares away. Once revealed, moves up to 2 squares. |
| Archer | 2 | Attacks a unit exactly 2 squares away in a straight line, over an empty square, and never moves to attack. |
| Builder | 1 | When revealed: lay 2 extra land tiles. |
| Assassin | 1 | Always wins when it attacks the Crown or the Champion. |

**Combat:**
- The defender is turned face up.
- The higher strength wins, and the loser is removed. A tie removes both.
- A winning attacker moves into the square, except the Archer.
- A defender gets +1 on a Hill and +1 next to its own revealed Guard. These bonuses also protect the Crown.

**Land:** a stack of 30 tiles.
- Plains (16): no effect.
- Forest (6): units there cannot be peeked at.
- Hill (5): +1 defence.
- River (3): impassable.

In a two-person game, a pass-device screen appears between turns, because each player can see their own hidden units. The board turns so the player whose turn it is always has their home at the bottom.

## The computer opponent

The computer uses only what a player in its seat would know. That is its own units, everything revealed, fallen or scouted, and its own land hand. It guesses the rest: which enemy units are hidden where, and which tiles are in the stack and in your hand. Then it scores each legal action across a few of those guesses.

What it weighs:
- Units still alive.
- Crown safety.
- Closing in on where your Crown might be.
- Its path to the Throne.
- Holding the Throne area, more urgently as the final countdown runs down.
- What its Scouts have learned.

It usually hides its Crown in its back row with Guards beside it, but not always. There is one strength level.

## Code

| File | Responsibility |
| --- | --- |
| `crown/src/rules.js` | Map size, home islands, Throne, unit roster, land stack and tunable settings |
| `crown/src/engine.js` | Setup, legal actions, combat, turn flow, win conditions, and each player's private view |
| `crown/src/ai.js` | Computer setup and action choice from sampled hidden information |
| `crown/src/main.js` | Rendering and input only |
| `tests/crown/` | Rule scenarios, privacy, computer behaviour and simulated games |

The engine exports `createGame({ random })`, `getLegalActions(state)`, `applyAction(state, action)` and `viewFor(state, player)`. `applyAction` never mutates its input. Most playtest changes are a number in `SETTINGS`, `UNITS` or `LAND` in `rules.js`.

## Choices the rules draft left open

The draft is [docs/new-game-rules-draft.md](../docs/new-game-rules-draft.md). Wherever it asked a question, the prototype uses the first suggestion:

- Hidden units may move.
- Succession is fully secret.
- You choose land from a hand of two.
- The Throne count decides the game when the land runs out.

A few details were filled in:

- Scout range is counted in steps up, down, left and right.
- Archers need an empty middle square.
- The countdown starts as soon as the stack is empty.

## Known issue: pacing

In simulated games, very few battles end with a captured Crown. Most end on the Throne count after about 17–20 turns per player, and sometimes a Crown reaches the Throne. The land runs out quickly and fighting is rare. Possible fixes:

- A larger stack.
- A smaller map.
- Requiring an attack before the count can decide.
- Making the count a tiebreak rather than a win.

This needs human playtesting before changing.
