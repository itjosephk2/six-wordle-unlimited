# SIXORDLE Unlimited 🟩🟧

An unofficial web implementation of **Sixordle Unlimited** -- solving **6 Wordles simultaneously** in **11 guesses** with a shared pool of guesses.

Built in clean, framework-free Vanilla HTML, CSS, and JavaScript.

---

## 🎮 How to Play

1. Type a **5-letter word** and press **ENTER**.
2. Your guess evaluates across **all 6 boards simultaneously**:
   - 🟩 **Green**: Letter is in the word and in the correct spot.
   - 🟨 **Yellow**: Letter is in the word but in the wrong spot.
   - ⬛ **Grey**: Letter is not in that board's word.
3. **Board Locks**: When a board is solved, all 5 tiles turn green and the board locks. Future guesses skip solved boards so you can focus on remaining targets.
4. **6-Stripe Smart Keyboard**: Each letter key is divided into **6 vertical columns** corresponding to Boards 1 through 6 from left to right. Instantly track where letters are alive or dead across all boards without squinting.
5. Win by solving all 6 boards in **11 guesses or fewer**!

---

## ✨ Features

- 🔄 **Unlimited Games**: No daily wait--hit **Restart** anytime to start an instant new game with 6 fresh target words.
- 🎹 **6-Stripe Multi-Board Keyboard**: Visual spatial layout matching the 6 board columns.
- 📱 **Fully Responsive Layout**:
  - **Desktop ($\ge 1200\text{px}$)**: Side-by-side 6-column layout.
  - **Tablet ($768\text{px} - 1199\text{px}$)**: $3 \times 2$ grid.
  - **Mobile ($< 768\text{px}$)**: Quick-jump board switcher tabs (`[All]`, `[B1]`-`[B6]`).
- 📊 **Statistics & Streaks**: Tracks games played, win rate, current streak, max streak, and guess distribution (6-11).
- 📋 **Share Grid**: Formats your game into an emoji result box ready for clipboard sharing.

---

## 📁 Project Structure

| File | Description |
| :--- | :--- |
| `index.html` | Semantic markup, header with Restart button, responsive board containers, and modals |
| `style.css` | Dark mode theme (`#121213`), 6-column grid, tile pop/flip animations, and 6-stripe keys |
| `game.js` | 2-pass Wordle logic, 6-board state engine, instant restart, stats, and sharing |
| `words.js` | Complete Wordle dictionary (`ANSWER_WORDS` and `EXTRA_GUESSES`) |

---

## 🚀 Running / Hosting

Because this project uses pure client-side web technologies, no build step or package installation is required:
- Open `index.html` directly in any modern browser, or
- Host on **GitHub Pages**, Cloudflare Pages, Netlify, or any static hosting service.
