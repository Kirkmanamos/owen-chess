# What makes a game like this fun — research notes

October 2026. These notes cover games with hidden armies, bluffing, a changing board and a contested centre. They were gathered before deciding the Crown & Veil v0.2 design. Sources are listed at the end. Most are reviews, student critiques and game guides, not formal research, so treat them as informed opinion.

## 1. Every turn should be an interesting choice

- **The idea:** Sid Meier's well-known line is that a good game is "a series of interesting choices". Soren Johnson adds that choices only have value in relation to one another; each comes with costs and benefits.
- **Crown & Veil now:** building is compulsory every turn, and where a tile goes rarely matters. That is a choice without stakes, which is why expansion "has no real feel".
- **Lesson:** cut any step that is usually obvious, or attach a cost or risk to it.

## 2. Bluffing needs a visible cost, and it wears out

- **Coup:** a failed challenge costs the challenger; a caught bluff costs the bluffer. Every claim is tense because the risk is visible. Players who bluff too often get caught.
- **Stratego research quote:** "The more you bluff, the more your opponent expects it, and the less each bluff is worth."
- **Stratego player tells:** a piece that never moves is probably a bomb or the flag. Decoys work by exploiting that read.
- **Lessons:**
  - Hidden units moving (or not moving) is a natural tell. Keep it.
  - Succession is a strong bluff because it is rare: once per game.
  - Give the opponent ways to test a bluff at a cost, such as a Scout peek or an attack, rather than free information.

## 3. Deduction should be possible, not just guessing

- **Coup:** each role exists three times, so tracking claims lets players deduce who is lying.
- **Lesson:** show each player which enemy unit types are still unaccounted for. Our computer opponent already reasons this way; a human should get the same help on screen. Guessing becomes deduction.

## 4. Shorter games come from fewer pieces and a smaller field

- **Stratego's biggest criticism** is length: 20 minutes to nearly 2 hours.
- **Its quicker editions:**
  - The revised edition uses 30 pieces instead of 40 on an 8×10 board instead of 10×10.
  - Stratego Classic is 30 against 30 and lists about 30 minutes instead of 45.
  - The digital "Quick Battle" uses 16 units a side.
- **Hive** starts with the two sides touching and branches out from there.
- **Lesson:** our 9 units are already small. The slowness comes from the 7 empty rows and one action per turn, not the army size. Start closer.

## 5. Something must force the fight, and it should speed up

- **Battle royale games:** the shrinking zone's one purpose is to force confrontation and rule out hiding. Designers set the pace through zone timing and damage. Later phases close faster and hurt more, so final fights are compressed.
- **Forbidden Island:** flooding starts slow and then accelerates into an "unstoppable monsoon". A few "Waters Rise" cards escalate it, the same pattern as Pandemic's Epidemics.
- **Crown & Veil now:** the land-runs-out countdown is a weak version of this. It ends the game but never pushes anyone toward anyone.
- **Lesson:** the out-of-control Core should be the pressure. It should escalate in clear steps (for example, surges get stronger after the Shattering) rather than all at once.

## 6. Chaos is fun when you can see it coming

- **Into the Breach:** the developers wanted every loss to feel like the player's own fault, so enemy attacks are shown a turn in advance. The game becomes a puzzle of preventing what you can see. Pushing, pulling and blocking are the main tools.
- **The trade-off:** reviewers note that perfect foresight can reduce variety between games.
- **Lesson:**
  - Show the Core's next surge before it happens. "Out of control" should mean the players can't stop it, not that they can't predict it.
  - Pushes and blocks give players something to do about it.
  - Our hidden armies already provide the surprise, so the Core can be predictable without the game feeling scripted.

## 7. A contested centre works when holding it is a continuing, interruptible goal

- **The King of the Hill pattern:** the goal is a state you must reach *and keep*, and everyone else gets goals that interfere with it. Games usually start with nobody holding the centre.
- **Chess King of the Hill:** reaching the centre wins instantly. That makes it a race, not a fight.
- **Lesson:** "your Crown must harness the Core for one full round" fits the pattern well. The opponent always gets a turn to respond, and the Crown has to come out of hiding. The current Throne rule is similar, but nothing tells players it exists or why it matters.

## 8. The board should grow out of the fight, not beside it

- **Hive** has no board. Placing and moving pieces creates the playing area, and each placement opens or closes options. (That last part is my reading, not a quoted source.)
- **Forbidden Island** reshapes its board by removing tiles. Lost tiles can cut paths and split the island apart.
- **Lesson:** changes to the board should come from things that matter in the fight: the Core's surges, a Builder, a battle. Not from a bookkeeping step at the start of each turn.

## 9. Hexes are fairer movement, and the brick layout gets you there cheaply

- **Hexes:** every neighbour is the same distance away and shares an edge, so there is no four-versus-eight-neighbours ambiguity.
- **Squares:** easier to read and to prototype.
- **Brick layout:** some designers shift every other row of squares by half a cell. That gives six neighbours that are effectively equal, which is how the proposed Shattering would work.
- **Lesson:** switching to hexes mid-game changes every unit's neighbours at once. It is the dramatic turning point you described, but players must be able to see the new neighbours clearly, ideally with an animation. Test early whether it is exciting or confusing.

## How the proposed Wild Core design measures up

| Proposed change | Supported by | Risk to watch |
| --- | --- | --- |
| Central Core with surges | Forced conflict (5), escalation (5) | Too random if surges are not shown in advance (6) |
| Surges shown a turn ahead | Into the Breach (6) | Less variety; the hidden armies should cover this |
| Land grows from the Core, not a compulsory build step | Interesting choices (1), board from the fight (8) | Players may feel they have less control; keep the Builder |
| Armies start 3 rows from the Core, 2 actions per turn | Shorter games (4), more decisions per turn (1) | Two actions may let a strong unit attack twice; may need a limit |
| The Shattering into hexes | Escalation step (5), hex fairness (9) | Confusion at the moment of change (9) |
| Crown must harness the Core for a full round | King of the Hill (7) | A hidden Crown may still be the safest plan; may need a reason to reveal it earlier |
| A visible "unaccounted units" list | Deduction (3) | None obvious; it is the same information the computer already uses |
| Succession stays once per game | Bluffs wear out (2) | None; it already fits |

## Questions for the v0.2 draft

1. Should the Core's surges come from a small visible deck, like Forbidden Island's flood cards, or follow a fixed pattern that escalates?
2. What exactly triggers the Shattering: the first unit within 2 squares of the Core, or a set round?
3. With 2 actions per turn, may one unit act twice?
4. Should anything reward revealing the Crown before the final push, so hiding it all game isn't automatically best?

## Sources

- [DeepMind — Mastering Stratego, the classic game of imperfect information](https://deepmind.google/discover/blog/mastering-stratego-the-classic-game-of-imperfect-information/)
- [Uppsala University game design blog — Board game analysis: Stratego](https://babel.speldesign.uu.se/?p=7201)
- [MIT News — game-playing AI and Stratego](https://news.mit.edu/2026/game-playing-ai-stratego-new-champ-0930)
- [Game Developer — Road to the IGF: Subset Games' Into the Breach](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)
- [Destructoid — Into the Breach review](https://www.destructoid.com/reviews/review-into-the-breach/)
- [GameSpot — Into the Breach review](https://gamespot.com/reviews/into-the-breach-review-a-mechanized-masterpiece/1900-6416865/)
- [Game design patterns — King of the Hill](https://math.vu.nl/~eliens/demo/pattern-kingofthehill.html)
- [Chess.com — What is King of the Hill?](https://support.chess.com/en/articles/8594498-what-is-king-of-the-hill-koth)
- [Game Developer — Designing interesting decisions in games, and when not to](https://www.gamedeveloper.com/design/designing-interesting-decisions-in-games-and-when-not-to-)
- [Game Developer — Analysis: Sid Meier's key design lessons](https://www.gamedeveloper.com/game-platforms/analysis-sid-meier-s-key-design-lessons)
- [Apex Legends wiki — Ring](https://apexlegends.wiki.gg/wiki/Ring)
- [EA — Battlefield REDSEC Rapid Royale guide](https://www.ea.com/fi/games/battlefield/redsec/news/battlefield-rapid-royale-mode-guide)
- [Meeple Like Us — Forbidden Island review](https://www.meeplelikeus.co.uk/forbidden-island-2010/)
- [Miniature Market — Forbidden Island review](https://miniaturemarket.com/reviewcorner/forbidden-island-review)
- [Wikipedia — Hex map](https://en.wikipedia.org/wiki/Hex_map)
- [Necropraxis — Bricks and hexes](https://necropraxis.com/2017/11/21/bricks-and-hexes/)
- [Analog Games — Stratego (Revised Edition)](https://analog.games/gameItem/show/419cd83f96a059f90196a071889200aa/stratego-revised-edition?lang=DE)
- [Board Game Bliss — Stratego Classic](https://www.boardgamebliss.com/collections/war-games/products/stratego-classic)
- [Wikipedia — Hive (game)](https://en.wikipedia.org/wiki/Hive_(game))
- [Mechanics of Magic — Critical Play: Coup](https://mechanicsofmagic.com/2024/04/08/critical-play-coup-blain-engeda/)
- [Mechanics of Magic — Critical Play: Competitive Analysis (Coup)](https://mechanicsofmagic.com/2022/04/12/critical-play-competitive-analysis-tristan-wang/)
