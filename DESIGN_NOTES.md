# Design notes — Version 0.3.0

This is an evolving original game, not a chess rules implementation with a decorative hidden mode. Hidden identities, horizontal emergence, randomized armies, and pawn stacks are central. “Veiled Crowns” is only a working title.

## Core game loop

Choose between bringing an unknown piece out of the formation, maneuvering an already revealed piece, and combining or separating pawns. Resolve any check, then pass the device. Every horizontal reveal opens a space for another tile to emerge. Players learn their own army at the same time as their opponent.

## Current rules

### Setup and horizontal revealing

- The board is 8×8. Player 1 occupies **a1–d4**; Player 2 occupies **a5–d8**. Both armies occupy the **first four files**. The right half starts empty. The armies touch along ranks 4 and 5.
- Each player has one king, one queen, two rooks, two bishops, two knights, and eight pawns. Each army is shuffled independently for each game.
- Every piece starts hidden to **both players**, including its owner.
- A hidden tile is exposed when the square immediately **right** of it is on the board and empty. Exactly four tiles per army begin exposed: d1–d4 and d5–d8.
- **Revealing is a move:** slide the tile **one square right** into that gap and flip it **there**. There is no voluntary in-place flip. The slide and flip are one action. This opening move applies even to bishops, knights, and pawns.
- The vacated square exposes the tile behind it. A tile that has revealed uses its normal piece movement on subsequent actions.
- The alternate playtest setting allows a hidden tile to slide one square either left or right into an empty neighbor. It still must move horizontally to reveal.

### Movement and hidden attacks

- Revealed kings, queens, rooks, bishops, and knights use their usual chess geometry. Sliding pieces cannot pass through any occupied tile. Knights can jump.
- After the horizontal opening action, Player 1 pawns move toward rank 8 and Player 2 pawns toward rank 1: one square forward, capture diagonally forward.
- No castling, en passant, or initial two-square pawn move by default. An optional home-rank double-step flag exists in the movement module; a voluntary horizontal reveal counts as having moved.
- A single pawn reaching its far rank automatically promotes to a queen. Promotion type is configurable in code.
- Hidden tiles block movement but exert no attacks.
- An attack on a hidden enemy is a **challenge**, regardless of its identity. It costs one action, reveals the target **in place**, and moves/captures neither tile. This forced reveal is an exception to voluntary horizontal emergence. A challenged tile can use its revealed movement without first sliding right.
- A later attack may capture that revealed target, unless it is a king. This two-action challenge rule prevents legal-move highlights from acting as a hidden-king detector.

### King safety and winning

- An unrevealed king is not checked. A revealed king is checked by enemy revealed attack geometry. As in chess, pinned enemy pieces still control squares for king movement.
- No action ever captures a king.
- With an already revealed king, normal actions must leave it safe. A hidden tile cannot slide out of a blocking position if doing so exposes its owner's revealed king.
- A king revealed in an attacked square gets an **immediate response action**, before ordinary checkmate evaluation. A voluntary reveal can therefore retain the turn for its owner. An enemy challenge normally hands the response to the revealed king's owner.
- A challenge can uncover an enemy attack on the acting player's own king. The actor gets the same immediate response so the legality of a challenge never depends on secret identity.
- If a challenge leaves both kings attacked, the actor responds first. The other newly exposed king gets its response afterward if still attacked. If it is already safe, that extra response is unnecessary and its normal turn begins.
- If any safe response exists, it must be chosen. If none exists, the player can take **one preparation action**, such as emerging a new tile or moving another piece. If the king remains attacked afterward, that player loses. This is a response opportunity, not a guarantee of an escape. If no board actions exist, an explicit **Finish king response** action completes adjudication.
- A response consumes one action even in multi-action/free-reveal experiments, and ends that player's turn. No king gets indefinite grace by continuing to reveal tiles.
- Ordinary checkmate wins. No legal actions without check is stalemate. These checks consider reveals, movement, stacking, and unstacking, not just chess moves.
- Three identical positions with the same player, action allowance, and response state draw. Hidden types are internal to the position key and never shown. A second draw safeguard ends a game after 100 actions without a reveal, challenge, capture, pawn move, stack, or unstack.

### Pawn stacks

- Two friendly, revealed, single pawns on horizontally adjacent squares may combine. The chosen pawn moves onto the other's square, creating a two-tile stack. Stacking costs one action.
- Only stacks of two are permitted. A captured stack removes both pawns.
- A stack moves **one square in any of the eight directions**, carrying both pawns together. Both players use the same geometry: forward, backward, sideways, and all four diagonals.
- A stack captures a revealed enemy non-king on any of those adjacent squares. It can capture on only **one destination square per action**. A hidden enemy on an adjacent square is challenged in place; the stack stays put, using the same policy as other pieces.
- Stacks have no leap, two-square diagonal move, or capture of enemies on two different squares. Capturing an enemy stack still removes that entire two-pawn unit.
- A stack threatens all adjacent squares, including an enemy king's square, but cannot capture a king. It has king-like movement **without royal status**: it may enter an attacked square, provided its own king stays safe.
- A stack can split into an empty orthogonal neighboring square. One revealed pawn stays and the other occupies the selected neighbor. It cannot capture while unstacking. Diagonal unstacking is a code-level option.
- Stacks can reach any board edge and remain stacks there. **Temporary promotion rule:** only individual pawns promote; when a stack splits, any single pawn then on its owner's far rank promotes. Splitting horizontally on that rank can promote both pawns. This replaces the old restriction that excluded stacks from the far rank, so the new movement works across the whole board.
- A stack move or capture cannot uncover a line attack against its own revealed king.

#### Independent stack experiments (Version 0.3)

All three toggles start **off**, may be combined freely, and require stack enablement. Settings apply to a fresh randomized game. Disabling stacks makes the three experiments inactive while retaining their checkbox choices.

- **Any-adjacent stacking** (`stack.anyAdjacent`): extend formation to all eight neighboring squares. Both tiles must remain friendly, revealed, single pawns. The default is still horizontal adjacency. Unstacking geometry is unchanged.
- **Stack-and-step** (`stack.stackAndStep`): forming a stack may include one optional noncapturing step to any empty adjacent square. The original pawn's vacated square qualifies. It cannot step onto a friendly tile, hidden enemy, revealed enemy, or king. Declining the step is always an option when the stationary formation is legal.
- **Stack scouting** (`stack.scouting`): after a noncapturing stack move, optionally challenge exactly one adjacent hidden enemy. The target flips in place, nothing is captured, and the stack remains at its new location. No scouting after a capture, stationary combination, ordinary challenge, or split. It works after stack-and-step when both flags are enabled; it also works independently on an existing stack with stack-and-step off.
- **Combined action assumption:** formation, optional step, and optional scout are one atomic action. Evaluate known king safety on the completed board, not on the intermediate merge square. A merge that temporarily opens a line may therefore be legal if the step blocks it again. A checking action ends the turn after its optional bonuses are resolved.
- Scout targets are offered based only on public ownership, concealment, and adjacency. Safety simulation keeps their identities hidden. A scouted king receives the usual immediate response if checked; an ambushed acting king responds first. Existing one-response/preparation limits still apply.
- The UI previews optional choices without committing state, spending an action, advancing history, or showing a handoff screen. Finish buttons decline a bonus; Cancel action/Escape discards the entire plan. The finished compound action has one history entry and costs one action, including in free-reveal/multi-action games.

### Turn and interface

- Player 1 starts. A turn normally has one primary action: horizontal slide-and-reveal, move/capture/challenge, stack, or unstack.
- Playtest settings offer one to three actions per turn, free slide-and-reveal actions, either horizontal reveal direction, stack enablement, and three independent stack experiment toggles. Applying settings starts a new randomized game. The old forward-capture and leap controls have been removed.
- Giving check ends an ordinary turn immediately, even with actions remaining. King responses always get one action. An optional End turn button appears after activity in a multi-action or free-reveal turn.
- The board keeps a fixed orientation so “right” always means toward file h. Turns switch immediately without a popup by default. The **Pass-device screen between turns** checkbox optionally hides the board and history between players; it can change during a game without restarting. There is no owner-only peek.
- Action history contains only facts already revealed publicly. The UI receives a redacted projection and no hidden type, identity-encoding id, tooltip, or accessibility label.

## Temporary assumptions

The author clarified that both armies occupy files a–d in the two left corners, and that the horizontal move itself reveals a tile. These replace the original opposite-diagonal-corner interpretation and stationary voluntary reveal.

For Version 0.2, the author replaced the stack's leap/double-capture experiment with one-square omnidirectional movement so two pawns can travel together. Applying the same geometry to captures is the current temporary interpretation.

For Version 0.2.1, the author confirmed keeping Move & Challenge after encountering it with a bishop on e5 targeting c3. The rule is unchanged. The mandatory between-turn popup interrupted quick play, so privacy pauses are now optional and off by default.

For Version 0.3, the author requested any-adjacent stacking, stack-and-step, and stack scouting as three independent playtest toggles. All are implemented and off by default. The atomic resolution, optional choices, and scouting after a bonus step are temporary interpretations documented above.

The following details are provisional implementations, not claims that the design is settled:

1. One-square rightward emergence, with exactly one action paying for the slide and flip.
2. Pawns switch to ordinary, opposite vertical directions after emerging.
3. Every hidden attack challenges and reveals in place; no hidden non-king can be captured immediately.
4. One immediate king response; one preparation action if no safe escape exists; no guaranteed rescue square.
5. Horizontal pawn adjacency for stacking by default, any adjacency as a toggle; orthogonal empty squares for unstacking.
6. Stack captures use the same eight adjacent squares as stack movement, with a single destination per action.
7. Stacks may reach any rank, remaining unpromoted until split. Each individual pawn on the far rank then promotes.
8. Automatic queen promotion; no special chess draw rules for insufficient material or standard fifty-move counting.
9. No saved games, undo, AI, private piece inspection, online play, or seeded rematch UI in this version.

## Rules to Playtest

| Question | Current experiment | Where to change it |
| --- | --- | --- |
| Should revealing move farther horizontally? | One empty square right | `rules/exposure.js`, `engine.js` |
| Should a hidden tile be able to emerge left once gaps exist? | Right only; alternate in the UI | `rules/exposure.js` |
| Does emergence cost the whole turn? | One action; free reveals / multiple actions available | `rules/turn.js`, `rules/config.js` |
| Should pawns keep moving horizontally after emergence? | Opposite vertical directions | `board.js`, `rules/movement.js`, `rules/pawn-stack.js` |
| What happens when attacking an unknown tile? | Challenge, reveal in place, no capture or displacement | `rules/movement.js`, `engine.js` |
| Must a challenged tile still perform a horizontal opening later? | No; forced revelation unlocks normal movement | `engine.js` |
| Is an opportunity enough when the newly revealed king has no escape? | One preparation action, then evaluate | `rules/king.js`, response handling in `engine.js` |
| Should kings have extra protection beyond the response? | No persistent immunity | `rules/king.js`, `rules/outcome.js` |
| Which adjacency should combine pawns? | Horizontal by default; **Any-adjacent stacking** toggles all eight neighbors | `rules/config.js`, `rules/pawn-stack.js` |
| Is spending a turn forming a stack too expensive? | **Stack-and-step** adds one optional noncapturing step, off by default | `rules/pawn-stack.js`, `engine.js` |
| Does a stack need a scouting role? | **Stack scouting** optionally flips one adjacent hidden enemy after a noncapturing move, off by default | `rules/pawn-stack.js`, `rules/king.js`, `engine.js` |
| Can the three bonuses be combined without becoming too strong? | All eight toggle combinations available; a formation + step + scout costs one action | `rules/config.js`, `engine.js` |
| When should compound-action king safety be evaluated? | After the complete action; intermediate merge positions do not end a turn | `engine.js` |
| Should stack captures match their omnidirectional movement? | Yes; one adjacent destination | `rules/pawn-stack.js` |
| Is the mobility worth concentrating two pawns on one capturable square? | Both pawns move together and are lost together | `rules/pawn-stack.js`, `engine.js` |
| Where may pawns unstack? | Orthogonal empty neighbor, one action | `rules/pawn-stack.js` |
| What should a stack do on its promotion rank? | Remain a stack; promote single pawns when split | `engine.js` |
| Can a player indefinitely avoid revealing their king? | Only the general draw safeguards prevent endless play | `rules/outcome.js` |

## Unresolved design questions

- Should a king's identity become public automatically after a certain number of actions, or must an opponent challenge it?
- Should a reveal into check ever guarantee an escape, rather than only a chance to respond?
- Is a challenge a useful commitment, or should hidden non-kings be captured immediately after the flip?
- Should the armies have mirrored/restricted shuffles for fairness, rather than fully independent randomization?
- Is first-player advantage large enough to alternate starts or grant a compensation action?
- Should moving a stack and splitting it remain separate actions, or should a noncapturing move permit an immediate split?
- Should promotion offer a choice, or give a stack a distinct promoted form?

## Potential balance problems

- The two armies touch along the a4–d4 / a5–d5 boundary. A newly revealed long-range piece can challenge across that boundary immediately; there is no empty central buffer.
- A horizontal bishop reveal changes its square color before normal movement starts. Randomized bishops are not guaranteed to end up on opposite colors.
- Pawns emerge onto files d/e but then move vertically. Their initial rank determines how quickly they can promote and whether neighboring pawns can block each other.
- A king buried deep in a formation can delay vulnerability. Refusing to expose it may be strategically stronger than fighting.
- Revealing a king can lose despite its preparation action if all exits are controlled. This needs human playtesting, not just engine correctness.
- Eight-direction stacks can transport pawns backward or sideways and form mobile screens, but concentrating two pawns on one square creates a two-pawn capture risk. They are capturable pieces, not additional kings.
- Transporting a stack to the far rank and splitting sideways can produce two queens at once. The opponent has an intervening turn under the default action economy, but this may still be too strong.
- Free reveals can unpack a large portion of an army before passing. Multiple actions can let a single piece challenge and capture on one turn; giving check interrupts that sequence.
- Combining all three stack experiments improves formation, tempo, and information gathering together. Scouting can expose a king while the stack is already adjacent and attacking it. The response rule remains active; watch whether this combination is too strong.

## Interesting situations discovered during implementation

1. **Legality can leak secrets.** If only hidden kings were noncapturable, destination highlights would identify them. Uniform challenges avoid that. Likewise, testing a challenge using the target's secret attack pattern would expose its identity indirectly. Safety simulation keeps the target hidden until resolution.
2. **Revealing can expose a line attack.** A horizontal opening vacates a real square, so it cannot be treated as a cosmetic flip. A hidden tile that shields an already revealed king may be unable to emerge.
3. **Royal collision.** A king can challenge a neighboring hidden king, leaving both kings attacked. The response queue gives the challenger the first chance to separate them, then reevaluates the other king.
4. **A challenge can ambush its attacker.** Flipping an enemy knight may suddenly check the attacker's own king. The challenge stays available before the flip, then the actor receives a response.
5. **Movement and threat must agree.** Backward and sideways stack attacks now count when testing check and king escape squares. A stack's own ability to enter an attacked square must not inherit the king's royal restriction.
6. **Unstacking can defend a king.** Leaving one pawn in place while adding another to a line can block a check. It is included when searching for checkmate escapes.
7. **Two tiles on one square still count as two.** Army counts and captured material track tile counts rather than occupied squares; randomized simulation checks conservation of all 32 tiles and both kings.
8. **Scouting can ambush during a move that resolves another check.** The moving stack may block a known rook attack, then reveal a different threat. Compare king safety before and after the flip on the completed board, so the actor still gets its ambush response.
9. **A bonus step can make a merge legal.** Two pawns can combine off a pinned file and step back onto that file within one action. The UI must show that complete action even if simply stacking in place would be illegal; it must not offer the unsafe finish-in-place option.

## Verification and next playtest

The automated suite covers setup, the four starting exits, sliding/revealing for every piece type, gradual exposure, standard movement, challenges, hidden-identity invariants, king responses and ordinary mate, all eight stack moves/captures for both players, rejection of the old leap, non-royal stack safety, edge behavior, promotion, configurable turns, draws, immutability, all eight experiment toggle combinations, compound-action costs, optional bonuses, and simulated legal play.

For the first human game, use the defaults. Record the first point where either player wants a rule to work differently, how many actions it takes to reveal each king, and whether either player has useful reasons to stack and unstack. Change one rule per subsequent game.

## First observed playtest result

The finished Version 0.1 board and its last twelve public actions were inspected after play, not watched live. This is a partial record, not a full replay; the earlier 31 actions were not visible in the UI. Evidence is saved in `artifacts/playtest-01-public.json` and `artifacts/playtest-01-finish.png`.

- Player 1 won by checkmate after 43 actions; the turn indicator showed 44 after the final handoff.
- Player 1's king remained hidden. Both players still had eight hidden tiles.
- Player 1 finished with a revealed queen on f5, rook on g6, and pawn on d3. Player 2's revealed king was on d5.
- The last actions included Player 1 emerging pawns on d4 and c4 and Player 2 capturing them on the following actions. Emergence therefore created immediate tactical targets.
- The final position suggests that keeping one's king hidden while using an early queen/rook may be strong. One game and a partial history do not establish that this is the dominant strategy.

Ideas for later experiments, **not implemented**: a limited bonus for voluntarily revealing a king; moving and then splitting a stack in one noncapturing action; or a bonus reveal for holding one of the open-center squares for a full turn. Test the revised stack first, then one further change at a time.
