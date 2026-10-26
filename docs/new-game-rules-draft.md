# Crown & Veil — rules draft 0.1

A two-player bluffing game. Both armies start face down, the battleground is built as you play, and you win by finding the enemy Crown. The name is a working title. Strike out or change anything below.

## Pieces

- **Map:** a grid, 7 columns wide and 11 rows long. Only squares covered by land can be used.
- **Land tiles:** a shared shuffled stack of 30.

  | Land | Count | Effect |
  | --- | --- | --- |
  | Plains | 16 | No effect |
  | Forest | 6 | Units here cannot be peeked at |
  | Hill | 5 | +1 strength when defending here |
  | River | 3 | No unit may enter it; it shapes the map like a wall |

- **The Throne:** one special land tile, already placed in the centre of the map (row 6, column 4) at the start.
- **Units:** each player has 9 face-down units.

  | Unit | Count | Strength | Ability |
  | --- | --- | --- | --- |
  | Crown | 1 | 0 | If it is captured, you lose. |
  | Champion | 1 | 5 | No special ability. |
  | Guard | 2 | 3 | While revealed, friendly units next to it (up, down, left or right) get +1 strength when defending. |
  | Scout | 2 | 2 | **When revealed:** look at one enemy hidden unit up to 3 squares away. Once revealed, it moves up to 2 squares. |
  | Archer | 1 | 2 | Attacks a unit exactly 2 squares away in a straight line. |
  | Builder | 1 | 1 | **When revealed:** lay 2 extra land tiles. |
  | Assassin | 1 | 1 | Always wins when it attacks the Crown or the Champion. |

## Setup

1. Each player's home island is a block of 10 land squares, 2 rows by 5 columns, at their end of the map. Player 1 has rows 1–2 and Player 2 has rows 10–11. The 7 rows between the islands are empty, apart from the Throne.
2. **You place your own army in secret**, one face-down unit per square of your island, so one square stays empty. Your Crown goes wherever you choose.
3. Each player draws 2 land tiles into their hand.

## A turn

1. **Build.** Lay 1 land tile from your hand on an empty square that touches existing land along an edge, then draw a replacement. Once the stack runs out, skip this step.
2. **Act.** Do exactly one of these:
   - **Reveal:** turn one of your units face up. Its "When revealed" ability, if it has one, happens now.
   - **Move:** move one unit, hidden or revealed, 1 square up, down, left or right onto empty land. A revealed Scout may move 2 squares.
   - **Attack:** a *revealed* unit attacks an enemy on the next square (up, down, left or right). The defender is turned face up. The higher strength wins and the loser is removed. If the strengths are equal, both are removed. If the attacker wins, it moves into the square. An Archer attacks from 2 squares away and never moves; if it doesn't win, nothing happens.
   - **Succession:** once per game, secretly swap your hidden Crown with another of your hidden units. Your opponent is told that you used succession, but not which units were swapped.

Hidden units can move but cannot attack. That is the central tension: reveal a unit to gain power, or keep it hidden to stay secret.

## Winning

- **Capture the enemy Crown.** Any successful attack on it wins, because its strength is 0.
- **Take the Throne.** If your *revealed* Crown is standing on the Throne at the start of your turn, you win. Hiding your king is safe, but only a revealed king can win this way.

## Balance and pace targets

- Each side needs about 3 tiles to link its island to the Throne, so armies should first make contact around turn 4.
- A game should take 15–20 minutes.
- **First-player advantage:** Player 2 lays 2 land tiles on their first turn.

## Open questions to settle by playtesting

1. Should hidden units be allowed to move at all? Moving them gives away information, which may be fun bluffing, or may make the game slow and clumsy.
2. Should a succession reveal which two units were swapped, but not whether the Crown was one of them?
3. Should the land you lay be your own choice from a hand of 2, or simply the top tile of the stack?
4. What happens if neither Crown is ever found? Possible answer: after the stack runs out, the player whose units hold more land squares within 2 squares of the Throne wins after 10 more turns.
5. Is 9 units the right army size? Is the Assassin too strong against a Champion that everyone can see?

## What carries over from Veiled Crowns

- **Code structure:** small rule modules, and an engine that never shows a player the other side's hidden units.
- **Computer opponent:** the same approach of guessing what each hidden unit could be from the units still unaccounted for.
- **Tests:** a test proving the computer's choices don't depend on hidden information.
