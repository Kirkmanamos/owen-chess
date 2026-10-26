# Crown & Veil — rules draft 0.2: The Wild Core

Two hidden armies race toward an unstable power in the centre of the field. The power reshapes the battlefield every round. When someone gets close, the board shatters into hexagons and the endgame turns wild. Win by capturing the enemy Crown, or by holding the Core with your own revealed Crown.

This replaces [draft 0.1](new-game-rules-draft.md). The numbers in brackets point to the matching lessons in the [research notes](research-notes.md). Strike out or change anything.

**Status:** this is what Prototype 0.2 plays. Rules changed or filled in while building it are marked *(built)* and collected at the end.

## What changed from 0.1

| 0.1 | 0.2 | Why |
| --- | --- | --- |
| Lay a land tile every turn | Land grows from the Core's surges, plus the Builder | No turns spent on a step with no stakes (1, 8) |
| 7 empty rows between the armies | Each home's front row is 3 steps from the Core, with one empty row in between | First contact around turn 3 (4) |
| 1 action per turn | 2 actions per turn | More decisions per turn (1, 4) |
| Passive Throne | The Wild Core surges every round, announced in advance | Forces the fight and builds pressure (5, 6) |
| Square grid all game | The Shattering turns the board into hexagons | A clear turning point for the endgame (5, 9) |
| Revealed Crown starts a turn on the Throne | Revealed Crown holds the Core for a full round | The opponent always gets a turn to respond (7) |
| Land countdown and Throne count | Removed | The Core forces the ending instead |
| River tiles | Removed | Surges create obstacles instead |

## Pieces

- **Map:** 7 columns by 9 rows. Only squares covered by land can be used.
- **Home islands:** Player 1 has rows 8–9 and Player 2 has rows 1–2, each 5 columns wide (columns b–f).
- **The Core:** the centre square, d5. At the start it sits in a plus-shaped patch of 5 land squares (d4, c5, d5, e5, d6). Rows 3 and 7 start empty.
- **Land supply:** Plains, Forest and Hill tiles, as many as needed.
  - Forest: units there cannot be peeked at.
  - Hill: +1 strength when defending there.
- **Surge deck:** a Calm deck of 8 cards and a Wild deck of 8 cards. The cards are listed below.
- **Units:** each player has the same 9 face-down units as 0.1.

| Unit | Count | Strength | Ability |
| --- | --- | --- | --- |
| Crown | 1 | 0 | If it is captured, you lose. **While revealed, friendly units next to it get +1 strength** (see question 4). |
| Champion | 1 | 5 | No special ability. |
| Guard | 2 | 3 | While revealed, friendly units next to it get +1 strength when defending. |
| Scout | 2 | 2 | **When revealed:** look at one enemy hidden unit up to 3 steps away. Once revealed, moves up to 2 squares. |
| Archer | 1 | 2 | Attacks a unit exactly 2 steps away in a straight line, over an empty space, and never moves to attack. |
| Builder | 1 | 1 | **When revealed:** lay 2 land tiles of your choice touching existing land. |
| Assassin | 1 | 1 | Always wins when it attacks the Crown or the Champion. |

## Setup

1. Both players secretly arrange their 9 units on their 10 home squares. One square stays empty.
2. Shuffle the Calm deck and turn its top card face up. This is the **next surge**, and everyone can see it, including where it will hit.

## A round

A round is one turn for each player, then a surge.

**On your turn, take 2 actions.** Player 1 takes only 1 action on the very first turn, to offset moving first. Each action is one of these:

- **Reveal** one of your units. Its "when revealed" ability happens now.
- **Move** a unit one step onto empty land. A revealed Scout may move up to 2 steps.
- **Attack** with a revealed unit, using the same combat rules as 0.1.
- **Succession** (uses both actions, once per game): secretly swap your hidden Crown with another of your hidden units.

The same unit may take both of your actions, but **no unit may attack twice in one turn** (question 3).

**After both players have had a turn, the Core surges.**
1. Resolve the face-up surge card.
2. Turn the next card face up, so everyone sees the next surge a full round ahead.

### Surge cards

When a card is turned face up, its target squares are chosen at random and marked on the board, so players can plan around them (6).

**Calm deck (8 cards)**

| Card | Count | Effect |
| --- | --- | --- |
| Grow | 3 | Each player, starting with the player who will move next, lays 1 land tile of their choice touching existing land. |
| Bloom | 1 | Every square without land within 2 steps of the Core becomes Plains. *(built: "touching the Core's patch" could have meant the whole connected map)* |
| Flare | 2 | A hidden unit on the marked square is turned face up. The mark is a random land square within 2 steps of the Core. *(built: marking a hidden unit directly would point at where units are)* |
| Tremor | 1 | Every unit next to the Core is pushed 1 step directly away from it, if that square is empty land. |
| Bolt | 1 | The marked square is struck with strength 3, using the normal combat rules. The Core does not move into the square. |

**Wild deck (8 cards)** replaces the Calm deck after the Shattering.

| Card | Count | Effect |
| --- | --- | --- |
| Storm | 2 | Bolts strike 2 marked squares. |
| Pulse | 2 | Every unit within 2 steps of the Core is pushed 1 step directly away from it. |
| Sink | 2 | One marked empty land square within 3 steps of the Core, not a home square or the Core, is removed if it is still empty. |
| Wild Flare | 1 | Every hidden unit next to the Core is turned face up. |
| Grow | 1 | As in the Calm deck. |

## The Shattering

**Trigger:** the first time any unit ends an action next to the Core or on it. If that hasn't happened by the end of round 6, it happens then anyway (question 2).

**What happens**

1. The board turns into hexagons. Every other row shifts half a square sideways, like a brick wall (9). Units stay on their squares, but each square now has 6 neighbours instead of 4.
2. Every rule that says "next to", "step" or "straight line" now uses those 6 neighbours. The Archer can shoot along all 3 lines through its hex.
3. The surge already showing still comes next. Shuffle the Wild deck and turn its top card face up behind it. If the backstop triggers the Shattering, the next Calm card is drawn first. Either way, the Shattering never brings an unseen strike. *(built)*
4. From now on, the Core surges **after every turn**, not after every round, and **two surges are always showing**: the next one and the one after it. Every mark stays visible through one turn of each player before it strikes. *(built: with only one showing, the marks appeared too late for the targeted player to dodge.)*

The screen should animate the change and briefly highlight the new neighbours of whichever unit is selected, so nobody is caught out (9).

## Taking the Core

- **Harnessing.** A unit that starts its owner's turn on the Core is *harnessing* it.
  - Surges never push or strike it.
  - Its owner chooses the target squares of the next surge instead of the random marks. The card itself doesn't change.
- **Winning.** You win if your **revealed Crown** is harnessing the Core at the start of two of your turns in a row. That means it held the Core through a full round of your opponent's play and the surges (7).
- **Other way to win:** capture the enemy Crown.

## Information on screen

- Each player sees a list of the **enemy unit types still unaccounted for**: not yet revealed, not fallen, and not seen by a Scout. Bluffs can then be worked out, not just guessed (3).
- The next surge and its target squares are always visible (6).

## Suggested answers to the four questions

1. **A visible deck or a fixed pattern?** A small visible deck: Calm before the Shattering, Wild after it.
   - Showing the next card a round ahead keeps the game fair.
   - Shuffling keeps each game different.
   - The switch between decks is the escalation step, like Forbidden Island's "Waters Rise".
   - A fixed pattern would soon be memorised. (5, 6)
2. **What triggers the Shattering?** The first unit to end an action next to the Core or on it, with round 6 as a backstop. A wider trigger, such as within 2 steps, would fire almost as soon as the first land tile bridged the gap.
   - Being the first to get close is a real decision: you choose when the game turns wild.
   - The backstop stops both players from stalling. (5, 7)
3. **Can one unit use both actions?** Yes, but no unit attacks twice in a turn.
   - Moving twice, or revealing then moving, gives fast and interesting turns.
   - The attack limit stops the Champion from clearing two units in one turn.
   - If it still feels too strong, make the limit "one attack per turn in total". (1)
4. **What rewards revealing the Crown early?** While revealed, it gives +1 strength to friendly units next to it, attacking and defending, and only a revealed Crown can win at the Core.
   - The Crown becomes a powerful but exposed leader, so revealing it is a real gamble instead of an obvious mistake.
   - Succession then becomes a bluff with a cost: you hid your Crown at the price of losing its +1. (2, 7)

## Decisions made while building Prototype 0.2

- **Two surges after the Shattering.** Simulations showed that with one face-up surge, marks appeared at the end of your turn and struck at the end of your opponent's, so the targeted player could never react. Showing two fixed it. In computer-vs-computer play, games ending with a captured Crown rose from 65% to 85%, and the average length fell from about 22 rounds to about 13.
- **Pushes** go to the neighbour farther from the Core that is closest to the straight line out. A blocked push does nothing, and nobody falls off the land.
- **Bolts** use the normal combat rules, so a struck unit is turned face up even if it survives.
- **Safety net:** after 30 rounds the Core burns itself out and the game is a draw. It is rare in computer play (about 5 games in 80).
- **Balance so far:** in 80 computer-vs-computer games, Player 1 won 40 and Player 2 won 35, with 5 draws.

## Still to settle in playtesting

- With 2 actions per turn, is 3 steps from each home to the Core the right distance? The empty rows mean nobody can cross until the first Grow or Bloom, so the first surge decides where the armies meet.
- Do Sink cards make the endgame too swingy?
- Should the push from Tremor and Pulse be able to shove a unit off the edge of the land, and if so, does it fall?
