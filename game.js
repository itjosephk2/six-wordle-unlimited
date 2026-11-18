/**
 * Sixordle Unlimited -- 6 Wordles simultaneously
 * 11 Guesses. 6 Words. Instant Restart. 6-Stripe Segmented Keyboard.
 */

// ==========================================================================
// 1. GAME CONSTANTS & CONFIG
// ==========================================================================
const MAX_GUESSES = 11;
const WORD_LENGTH = 5;
const NUM_BOARDS = 6;

// Pick 6 distinct random target words
function pickRandomTargets(count) {
  const chosen = [];
  const chosenSet = new Set();
  const pool = ANSWER_WORDS;
  
  while (chosen.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    const word = pool[idx].toUpperCase();
    if (!chosenSet.has(word)) {
      chosenSet.add(word);
      chosen.push(word);
    }
  }
  return chosen;
}

// ==========================================================================
// 2. CORE TWO-PASS WORDLE EVALUATION
// ==========================================================================
function evaluateGuess(guessWord, targetWord) {
  const guess = guessWord.toUpperCase();
  const target = targetWord.toUpperCase();
  const evaluation = Array(WORD_LENGTH).fill("absent");
  const letterCounts = {};

  // Count occurrences in target
  for (let i = 0; i < WORD_LENGTH; i++) {
    const char = target[i];
    letterCounts[char] = (letterCounts[char] || 0) + 1;
  }

  // Pass 1: Exact matches (Green / Correct)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
      evaluation[i] = "correct";
      letterCounts[guess[i]]--;
    }
  }

  // Pass 2: Misplaced matches (Yellow / Present)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (evaluation[i] === "correct") continue;
    const char = guess[i];
    if (letterCounts[char] && letterCounts[char] > 0) {
      evaluation[i] = "present";
      letterCounts[char]--;
    }
  }

  return evaluation;
}

// ==========================================================================
// 3. GAME STATE
// ==========================================================================
let currentGuess = "";
let guessHistory = [];
let gameOver = false;
let gameWon = false;
let activeMobileTab = "all"; // "all" or 0..5

let boards = [];
// Structure per board:
// {
//   id: 0..5,
//   targetWord: "OCTET",
//   isSolved: false,
//   solvedAtGuess: null,
//   rows: [ { word: "SLATE", evaluation: ['absent', ...] } ]
// }

let keyStatuses = {}; 
// Map: 'A' => Array(6).fill('unused')

// ==========================================================================
// 4. STATS & STORAGE
// ==========================================================================
const STATS_KEY = "sixordle_unlimited_stats";

function loadStats() {
  const raw = localStorage.getItem(STATS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse stats", e);
    }
  }
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: { 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 }
  };
}

function saveStats(won, numGuesses) {
  const stats = loadStats();
  stats.played += 1;

  if (won) {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    if (stats.guessDistribution[numGuesses] !== undefined) {
      stats.guessDistribution[numGuesses] += 1;
    }
  } else {
    stats.currentStreak = 0;
  }

  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// ==========================================================================
// 5. INITIALIZATION & RESTART
// ==========================================================================
function restartGame(showNotification = true) {
  currentGuess = "";
  guessHistory = [];
  gameOver = false;
  gameWon = false;

  // Reset letter status matrix (A-Z)
  keyStatuses = {};
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let char of ALPHABET) {
    keyStatuses[char] = Array(NUM_BOARDS).fill("unused");
  }

  // Draw 6 brand new random targets
  const targets = pickRandomTargets(NUM_BOARDS);
  boards = targets.map((target, idx) => ({
    id: idx,
    targetWord: target,
    isSolved: false,
    solvedAtGuess: null,
    rows: []
  }));

  // Hide any open modals
  const statsModal = document.getElementById("stats-modal");
  if (statsModal) statsModal.classList.add("hidden");
  const helpModal = document.getElementById("help-modal");
  if (helpModal) helpModal.classList.add("hidden");

  // Re-render UI
  renderBoardCards();
  renderMobileTabs();
  renderKeyboard();
  updateBoardCardsUI();

  if (showNotification) {
    showToast("New game started!");
  }
}

// ==========================================================================
// 6. UI RENDERING (BOARDS & ROWS)
// ==========================================================================
function renderBoardCards() {
  const container = document.getElementById("boards-wrapper");
  container.innerHTML = "";

  for (let b = 0; b < NUM_BOARDS; b++) {
    const card = document.createElement("div");
    card.className = "board-card";
    card.id = `board-card-${b}`;

    // Header
    const cardHeader = document.createElement("div");
    cardHeader.className = "board-card-header";
    
    const boardTitle = document.createElement("span");
    boardTitle.textContent = `Board ${b + 1}`;

    const badge = document.createElement("span");
    badge.className = "board-badge";
    badge.id = `board-badge-${b}`;
    badge.textContent = "Active";

    cardHeader.appendChild(boardTitle);
    cardHeader.appendChild(badge);
    card.appendChild(cardHeader);

    // 11-row Grid
    const grid = document.createElement("div");
    grid.className = "board-grid";
    grid.id = `board-grid-${b}`;

    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement("div");
      row.className = "board-row";
      row.id = `board-${b}-row-${r}`;

      for (let t = 0; t < WORD_LENGTH; t++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.id = `board-${b}-tile-${r}-${t}`;
        row.appendChild(tile);
      }
      grid.appendChild(row);
    }

    card.appendChild(grid);
    container.appendChild(card);
  }
}

function updateBoardCardsUI() {
  for (let b = 0; b < NUM_BOARDS; b++) {
    const board = boards[b];
    const card = document.getElementById(`board-card-${b}`);
    const badge = document.getElementById(`board-badge-${b}`);

    if (board.isSolved) {
      card.classList.add("solved");
      badge.textContent = `Solved ${board.solvedAtGuess + 1}/${MAX_GUESSES}`;
    } else {
      card.classList.remove("solved");
      badge.textContent = "Active";
    }

    // Populate submitted rows
    for (let r = 0; r < MAX_GUESSES; r++) {
      const rowEl = document.getElementById(`board-${b}-row-${r}`);
      rowEl.classList.remove("completed-empty");

      if (r < board.rows.length) {
        const submitted = board.rows[r];
        for (let t = 0; t < WORD_LENGTH; t++) {
          const tile = document.getElementById(`board-${b}-tile-${r}-${t}`);
          tile.textContent = submitted.word[t];
          tile.className = `tile ${submitted.evaluation[t]}`;
        }
      } else if (board.isSolved && r >= board.rows.length) {
        // Solved board: remaining rows are locked/empty
        rowEl.classList.add("completed-empty");
        for (let t = 0; t < WORD_LENGTH; t++) {
          const tile = document.getElementById(`board-${b}-tile-${r}-${t}`);
          tile.textContent = "";
          tile.className = "tile";
        }
      } else if (!board.isSolved && r === guessHistory.length) {
        // Active typing row for unsolved board
        for (let t = 0; t < WORD_LENGTH; t++) {
          const tile = document.getElementById(`board-${b}-tile-${r}-${t}`);
          const char = currentGuess[t] || "";
          tile.textContent = char;
          tile.className = char ? "tile active" : "tile";
        }
      } else {
        // Future unfilled row
        for (let t = 0; t < WORD_LENGTH; t++) {
          const tile = document.getElementById(`board-${b}-tile-${r}-${t}`);
          tile.textContent = "";
          tile.className = "tile";
        }
      }
    }
  }

  updateKeyboardUI();
  updateMobileTabsUI();
}

function updateActiveTypingRow() {
  const activeRowIdx = guessHistory.length;
  if (activeRowIdx >= MAX_GUESSES || gameOver) return;

  for (let b = 0; b < NUM_BOARDS; b++) {
    const board = boards[b];
    if (board.isSolved) continue;

    for (let t = 0; t < WORD_LENGTH; t++) {
      const tile = document.getElementById(`board-${b}-tile-${activeRowIdx}-${t}`);
      if (!tile) continue;
      const char = currentGuess[t] || "";
      tile.textContent = char;
      tile.className = char ? "tile active" : "tile";
    }
  }
}

// ==========================================================================
// 7. MOBILE VIEW CONTROLLER & TABS
// ==========================================================================
function renderMobileTabs() {
  const tabContainer = document.getElementById("board-nav-tabs");
  if (!tabContainer) return;
  tabContainer.innerHTML = "";

  const allTab = document.createElement("button");
  allTab.className = "board-tab all-tab" + (activeMobileTab === "all" ? " active" : "");
  allTab.textContent = "All (6)";
  allTab.onclick = () => switchMobileTab("all");
  tabContainer.appendChild(allTab);

  for (let b = 0; b < NUM_BOARDS; b++) {
    const tab = document.createElement("button");
    tab.className = "board-tab" + (activeMobileTab === b ? " active" : "");
    tab.id = `mobile-tab-${b}`;
    tab.textContent = `B${b + 1}`;
    tab.onclick = () => switchMobileTab(b);
    tabContainer.appendChild(tab);
  }
}

function switchMobileTab(tabIndex) {
  activeMobileTab = tabIndex;
  const wrapper = document.getElementById("boards-wrapper");

  if (tabIndex === "all") {
    wrapper.classList.remove("single-board-view");
    wrapper.classList.add("all-boards-view");
  } else {
    wrapper.classList.remove("all-boards-view");
    wrapper.classList.add("single-board-view");
    for (let b = 0; b < NUM_BOARDS; b++) {
      const card = document.getElementById(`board-card-${b}`);
      if (b === tabIndex) {
        card.classList.add("tab-active");
      } else {
        card.classList.remove("tab-active");
      }
    }
  }

  updateMobileTabsUI();
}

function updateMobileTabsUI() {
  const tabs = document.querySelectorAll(".board-tab");
  tabs.forEach(tab => tab.classList.remove("active"));

  if (activeMobileTab === "all") {
    const allTab = document.querySelector(".board-tab.all-tab");
    if (allTab) allTab.classList.add("active");
  } else {
    const activeTab = document.getElementById(`mobile-tab-${activeMobileTab}`);
    if (activeTab) activeTab.classList.add("active");
  }

  for (let b = 0; b < NUM_BOARDS; b++) {
    const tab = document.getElementById(`mobile-tab-${b}`);
    if (!tab) continue;
    if (boards[b] && boards[b].isSolved) {
      tab.classList.add("solved");
      tab.textContent = `✓ B${b + 1}`;
    } else {
      tab.classList.remove("solved");
      tab.textContent = `B${b + 1}`;
    }
  }
}

// ==========================================================================
// 8. VIRTUAL KEYBOARD WITH 6-STRIPE MULTI-BOARD BACKGROUND
// ==========================================================================
function renderKeyboard() {
  const container = document.getElementById("keyboard-container");
  container.innerHTML = "";

  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["BACKSPACE", "Z", "X", "C", "V", "B", "N", "M", "ENTER"]
  ];

  rows.forEach(rowKeys => {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    rowKeys.forEach(keyStr => {
      const button = document.createElement("button");
      button.className = "key";
      button.id = `key-${keyStr}`;

      if (keyStr === "ENTER") {
        button.classList.add("wide-key");
        button.innerHTML = '<span class="key-label" style="font-size: 1.25rem;">↵</span>';
      } else if (keyStr === "BACKSPACE") {
        button.classList.add("wide-key");
        button.innerHTML = '<span class="key-label" style="font-size: 1.25rem;">⌫</span>';
      } else {
        // 6 vertical stripes directly behind letter
        const stripesContainer = document.createElement("div");
        stripesContainer.className = "key-bg-stripes";
        for (let b = 0; b < NUM_BOARDS; b++) {
          const stripe = document.createElement("div");
          stripe.className = "key-stripe";
          stripe.id = `stripe-${keyStr}-${b}`;
          stripesContainer.appendChild(stripe);
        }
        button.appendChild(stripesContainer);

        const charLabel = document.createElement("span");
        charLabel.className = "key-label";
        charLabel.textContent = keyStr;
        button.appendChild(charLabel);
      }

      button.onclick = (e) => {
        e.preventDefault();
        handleVirtualKeyPress(keyStr === "BACKSPACE" ? "⌫" : keyStr);
      };

      rowEl.appendChild(button);
    });

    container.appendChild(rowEl);
  });
}

function updateKeyboardUI() {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let char of ALPHABET) {
    const keyEl = document.getElementById(`key-${char}`);
    if (!keyEl) continue;

    let allAbsent = true;
    let anyUnused = false;

    for (let b = 0; b < NUM_BOARDS; b++) {
      const stripe = document.getElementById(`stripe-${char}-${b}`);
      if (!stripe) continue;

      const status = keyStatuses[char][b];
      const boardSolved = boards[b].isSolved;

      stripe.className = "key-stripe";

      if (status === "correct") {
        stripe.classList.add("stripe-correct");
      } else if (status === "present") {
        stripe.classList.add("stripe-present");
      } else if (status === "absent") {
        stripe.classList.add("stripe-absent");
      } else {
        anyUnused = true;
      }

      if (boardSolved) {
        stripe.classList.add("stripe-solved");
      }

      if (status !== "absent" && !boardSolved) {
        allAbsent = false;
      }
    }

    if (allAbsent && !anyUnused) {
      keyEl.classList.add("all-absent");
    } else {
      keyEl.classList.remove("all-absent");
    }
  }
}

// ==========================================================================
// 9. INPUT HANDLING & SUBMISSION LOGIC
// ==========================================================================
function handleVirtualKeyPress(key) {
  if (key === "ENTER") {
    submitGuess();
  } else if (key === "⌫" || key === "BACKSPACE") {
    deleteLetter();
  } else if (/^[A-Z]$/.test(key)) {
    addLetter(key);
  }
}

function addLetter(letter) {
  if (gameOver) return;
  if (currentGuess.length < WORD_LENGTH) {
    currentGuess += letter.toUpperCase();
    updateActiveTypingRow();
  }
}

function deleteLetter() {
  if (gameOver) return;
  if (currentGuess.length > 0) {
    currentGuess = currentGuess.slice(0, -1);
    updateActiveTypingRow();
  }
}

function submitGuess() {
  if (gameOver) return;

  if (currentGuess.length !== WORD_LENGTH) {
    showToast("Not enough letters");
    shakeActiveRows();
    return;
  }

  const guess = currentGuess.toUpperCase();
  const lowerGuess = guess.toLowerCase();

  // Validate against dictionary
  const isValid = VALID_GUESSES.has(lowerGuess) || ANSWER_WORDS.includes(lowerGuess);
  if (!isValid) {
    showToast("Not in word list");
    shakeActiveRows();
    return;
  }

  // Record guess
  guessHistory.push(guess);
  const guessIndex = guessHistory.length - 1;

  // Evaluate across all boards
  let newlySolvedCount = 0;
  for (let b = 0; b < NUM_BOARDS; b++) {
    const board = boards[b];
    if (board.isSolved) continue;

    const evalResult = evaluateGuess(guess, board.targetWord);
    board.rows.push({
      word: guess,
      evaluation: evalResult
    });

    // Update letter statuses for this board
    for (let i = 0; i < WORD_LENGTH; i++) {
      const char = guess[i];
      const charStatus = evalResult[i];
      const prev = keyStatuses[char][b];

      if (charStatus === "correct") {
        keyStatuses[char][b] = "correct";
      } else if (charStatus === "present" && prev !== "correct") {
        keyStatuses[char][b] = "present";
      } else if (charStatus === "absent" && prev === "unused") {
        keyStatuses[char][b] = "absent";
      }
    }

    // Check if this board is solved
    const allGreen = evalResult.every(s => s === "correct");
    if (allGreen) {
      board.isSolved = true;
      board.solvedAtGuess = guessIndex;
      newlySolvedCount++;

      // Trigger bounce on newly solved board
      const card = document.getElementById(`board-card-${b}`);
      if (card) {
        card.classList.add("bounce");
        setTimeout(() => card.classList.remove("bounce"), 1200);
      }
    }
  }

  // Reset typed buffer
  currentGuess = "";

  // Animate tile flips
  animateTileFlips(guessIndex, () => {
    updateBoardCardsUI();

    // Check game outcome
    const allSolved = boards.every(b => b.isSolved);
    if (allSolved) {
      gameOver = true;
      gameWon = true;
      saveStats(true, guessHistory.length);
      showToast("Splendid! All 6 solved!");
      setTimeout(() => showGameOverModal(), 1200);
      return;
    }

    if (guessHistory.length >= MAX_GUESSES) {
      gameOver = true;
      gameWon = false;
      saveStats(false, MAX_GUESSES);
      showToast("Game Over");
      setTimeout(() => showGameOverModal(), 1200);
      return;
    }
  });
}

function shakeActiveRows() {
  const activeRowIdx = guessHistory.length;
  for (let b = 0; b < NUM_BOARDS; b++) {
    if (boards[b].isSolved) continue;
    const rowEl = document.getElementById(`board-${b}-row-${activeRowIdx}`);
    if (rowEl) {
      rowEl.classList.add("shake");
      setTimeout(() => rowEl.classList.remove("shake"), 500);
    }
  }
}

function animateTileFlips(rowIndex, onComplete) {
  let longestDelay = 0;

  for (let b = 0; b < NUM_BOARDS; b++) {
    const board = boards[b];
    const rowData = board.rows[rowIndex];
    if (!rowData) continue;

    for (let t = 0; t < WORD_LENGTH; t++) {
      const tile = document.getElementById(`board-${b}-tile-${rowIndex}-${t}`);
      if (!tile) continue;

      const delay = t * 90;
      longestDelay = Math.max(longestDelay, delay + 350);

      setTimeout(() => {
        tile.classList.add("flipping");
        tile.classList.add(rowData.evaluation[t]);
      }, delay);
    }
  }

  setTimeout(onComplete, longestDelay);
}

// ==========================================================================
// 10. TOAST & MODAL CONTROLLERS
// ==========================================================================
function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function toggleHelp() {
  const modal = document.getElementById("help-modal");
  modal.classList.toggle("hidden");
}

function toggleStats() {
  const modal = document.getElementById("stats-modal");
  if (modal.classList.contains("hidden")) {
    populateStatsModal();
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
}

function showGameOverModal() {
  populateStatsModal();
  const modal = document.getElementById("stats-modal");
  modal.classList.remove("hidden");
}

function populateStatsModal() {
  const stats = loadStats();
  document.getElementById("stat-played").textContent = stats.played;
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  document.getElementById("stat-win-rate").textContent = `${winRate}%`;
  document.getElementById("stat-current-streak").textContent = stats.currentStreak;
  document.getElementById("stat-max-streak").textContent = stats.maxStreak;

  // Distribution chart
  const distContainer = document.getElementById("guess-distribution");
  distContainer.innerHTML = "";
  
  const values = Object.values(stats.guessDistribution);
  const maxVal = Math.max(1, ...values);

  for (let g = 6; g <= 11; g++) {
    const count = stats.guessDistribution[g] || 0;
    const pct = Math.max(7, Math.round((count / maxVal) * 100));

    const row = document.createElement("div");
    row.className = "dist-bar-row";

    const numSpan = document.createElement("span");
    numSpan.className = "dist-num";
    numSpan.textContent = g;

    const track = document.createElement("div");
    track.className = "dist-bar-track";

    const fill = document.createElement("div");
    fill.className = "dist-bar-fill";
    if (gameWon && guessHistory.length === g) {
      fill.classList.add("highlight");
    }
    fill.style.width = `${pct}%`;
    fill.textContent = count;

    track.appendChild(fill);
    row.appendChild(numSpan);
    row.appendChild(track);
    distContainer.appendChild(row);
  }

  // Solution words breakdown
  const solutionsBox = document.getElementById("solution-words-container");
  solutionsBox.innerHTML = "";
  if (gameOver) {
    solutionsBox.style.display = "grid";
    boards.forEach((b, idx) => {
      const chip = document.createElement("div");
      chip.className = `solution-chip ${b.isSolved ? "solved-chip" : "unsolved-chip"}`;
      chip.textContent = `${idx + 1}. ${b.targetWord}`;
      solutionsBox.appendChild(chip);
    });
  } else {
    solutionsBox.style.display = "none";
  }
}

// ==========================================================================
// 11. SHARING (EMOJI RESULTS)
// ==========================================================================
function shareResults() {
  if (!gameOver) {
    showToast("Finish game to share!");
    return;
  }

  const scoreLabel = gameWon ? `${guessHistory.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  let shareText = `Sixordle Unlimited ${scoreLabel}\n`;

  const boardPips = boards.map(b => b.isSolved ? `${b.solvedAtGuess + 1}` : "X").join(" | ");
  shareText += `Boards: [ ${boardPips} ]\n\n`;

  for (let r = 0; r < guessHistory.length; r++) {
    let rowEmojis = "";
    for (let b = 0; b < NUM_BOARDS; b++) {
      const board = boards[b];
      if (r < board.rows.length) {
        const row = board.rows[r];
        const isSolvedRow = row.evaluation.every(e => e === "correct");
        rowEmojis += isSolvedRow ? "🟩" : "🟨";
      } else {
        rowEmojis += "⬛";
      }
    }
    shareText += rowEmojis + "\n";
  }

  shareText += "\nPlay Sixordle Unlimited: " + window.location.href;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareText)
      .then(() => showToast("Copied results to clipboard!"))
      .catch(() => showToast("Failed to copy results"));
  } else {
    showToast("Sharing not supported on this device");
  }
}

// ==========================================================================
// 12. EVENT LISTENERS
// ==========================================================================
function setupKeyboardListeners() {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Enter") {
      submitGuess();
    } else if (e.key === "Backspace") {
      deleteLetter();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      addLetter(e.key.toUpperCase());
    }
  });
}

// ==========================================================================
// 13. BOOTSTRAP
// ==========================================================================
window.addEventListener("DOMContentLoaded", () => {
  setupKeyboardListeners();
  restartGame(false);
});
