# Opening Arena

An interactive chess opening trainer. It teaches the **Italian Game** (1.e4 e5 2.Nf3 Nc6 3.Bc4), the **Ruy Lopez** (3.Bb5), and the **Queen's Gambit** (1.d4 d5 2.c4) with their main variations. Switch openings with the tabs above the board. The move tree shows every opening that starts with the same first move, so you can see exactly where the Italian and Ruy Lopez split.

**Open online:** [Opening Arena](https://kirkmanamos.github.io/owen-chess/).

## Run

Install Node.js 20 or later, then from this directory:

```sh
npm start
```

Open **http://localhost:5173**. There are no packages to install and no build step. To choose another port: `PORT=5174 npm start`.

```sh
npm test       # Chess rules (including perft counts), course content, and review scheduling
npm run check  # Entry-point syntax check plus the tests
npm run build  # Copy browser assets into dist/ for static hosting
```

## How it works

- **Learn** steps through a variation one move at a time. A coach explains each move, and arrows and highlighted squares show the idea. **What can come next** lists every move the course covers from the current position, so you can follow any branch. You can also play moves on the board: a covered move switches to that variation.
- **Practice** has you play one side (usually White) from move 1. The opponent replies automatically. A wrong move is counted; if it belongs to a different variation, the coach says which one. **Hint** shows which piece to move, then the move itself. Finishing a line with no mistakes and no hints marks it **mastered** for that side and adds it to the review schedule. Progress is saved in this browser.
- **Practice as either side.** Each line has a main side, but **Play as** switches to the other side, so you can answer the moves instead of making them.
- **Drill** builds a short session. First come lines that are due for review, played from the start. Then come quick positions from the middle of random lines, where you find your side's next two moves. A clean run schedules the next review 1, 3, 7, 14, then 30 days out, and a run with mistakes keeps the line due. Positions from Black's side unlock once a line is mastered as White. The **Drill** tab shows how many reviews are due.
- **Variations** cards summarize each line's plans, and the **Move tree** shows exactly where the lines split.
- **Feel:** pieces slide between squares, and captures spin away. In Practice, streaks of correct moves raise the coin sound's pitch and earn cheers and confetti. Mastering a line ends with a confetti burst.
- **Sound and theme:** the header has a mute button and a **Theme** picker with five board colour schemes and five piece sets. Both settings are saved in this browser.

To audition and pick sound effects locally, open **http://localhost:5173/sound-lab.html**. It offers several styles for each sound. Picks are saved in the browser, and the defaults live in `DEFAULTS` in `src/sound.js`. The lab is not part of the published site.

Keyboard: ← / → step through moves in Learn mode, Home / End jump to the start or end. On the board, Tab in, use the arrow keys to move between squares, and Enter or Space to select. Escape clears a selection.

## Italian Game lines

| Family | Line | You play |
| --- | --- | --- |
| Giuoco Piano (3…Bc5) | Main line: c3 and d4 | White |
| Giuoco Piano | Giuoco Pianissimo: slow d3 | White |
| Giuoco Piano | Evans Gambit | White |
| Two Knights Defense (3…Nf6) | 4.Ng5 main line: 5…Na5 | White |
| Two Knights Defense | Fried Liver Attack (trap) | White |
| Two Knights Defense | Quiet 4.d3 | White |
| 3…Nd4 Shilling Gambit | The trap: 4.Nxe5? | Black |
| 3…Nd4 Shilling Gambit | The refutation: 4.O-O | White |

## Ruy Lopez lines

| Family | Line | You play |
| --- | --- | --- |
| Morphy Defense (3…a6) | Closed Ruy: Chigorin | White |
| Morphy Defense | Open Ruy: 5…Nxe4 | White |
| Exchange Variation (4.Bxc6) | Exchange: castle first | White |
| Exchange Variation | Why 5.Nxe5? fails | White |
| Berlin Defense (3…Nf6) | The Berlin endgame | White |
| Noah's Ark trap | The trap: 8.Qxd4? | Black |

## Queen's Gambit lines

| Family | Line | You play |
| --- | --- | --- |
| Declined (2…e6) | Orthodox: Capablanca's freeing plan | White |
| Declined | Exchange: the minority attack | White |
| Declined | Elephant Trap | Black |
| Accepted (2…dxc4) | Classical: 3.Nf3 and …c5 | White |
| Accepted | Why holding the pawn fails | White |
| Slav (2…c6) | Main line: 5.a4 Bf5 | White |

## Adding an opening

Each course is one file in `src/openings/`, registered in `src/main.js`. It exports `opening` (name, shared starting moves, intro), `lines` (each a full move sequence in standard notation with a summary and key ideas), and `notes` (coaching text keyed by the move path that reaches the position, with optional `arrows` like `'c4f7'` and `marks` like `'f7'`). Positions shared by several lines are explained once, even across openings: the Ruy Lopez relies on the Italian file's notes for 1.e4 e5 2.Nf3 Nc6. The course tests check that every line is legal and every move has a note.

`src/progress.js` schedules reviews and builds drills. `src/sound.js` synthesizes every sound with the Web Audio API, so there are no audio files. `src/confetti.js` draws the confetti. `src/chess.js` is a self-contained legal-move generator with SAN reading and writing. `src/course.js` replays lines and merges them into the move tree. `src/main.js` is the interface.
