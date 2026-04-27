/**
 * script.js
 * NeuroPlay — IQ Test + Smart Game Recommendation System
 *
 * Sections:
 *  1. Global State & Utilities
 *  2. Screen Management
 *  3. Quiz Logic
 *  4. Score & Result Screen
 *  5. Backend API: Fetch Game
 *  6. Game Loader (decides which game to render)
 *  7. Memory Match Game
 *  8. Reaction Speed Game
 *  9. Number Puzzle (15-puzzle)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GLOBAL STATE & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Generate a simple unique user ID and persist it in localStorage */
function getUserId() {
  let uid = localStorage.getItem("neuroplay_uid");
  if (!uid) {
    uid = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("neuroplay_uid", uid);
  }
  return uid;
}

const USER_ID = getUserId();

/** App-level state */
const state = {
  username: "",
  currentQuestion: 0,
  score: 0,
  selectedAnswer: null,
  timerInterval: null,
  timeLeft: 30,
  answeredQuestions: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Show a specific screen by ID, hiding all others.
 * @param {string} screenId - e.g. "screenWelcome"
 */
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.remove("active");
  });
  const target = document.getElementById(screenId);
  if (target) {
    // Force reflow for re-triggering animation
    target.style.animation = "none";
    target.offsetHeight; // reflow
    target.style.animation = "";
    target.classList.add("active");
  }
}

/** Show a toast notification (error/info) */
function showToast(message) {
  let toast = document.getElementById("globalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "globalToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

/** Reset everything and go back to welcome screen */
function resetToHome() {
  clearInterval(state.timerInterval);
  state.currentQuestion = 0;
  state.score = 0;
  state.selectedAnswer = null;
  state.answeredQuestions = [];
  showScreen("screenWelcome");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. QUIZ LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/** IQ-style MCQ questions */
const QUESTIONS = [
  {
    text: "Which number logically comes next in this series?\n2 · 6 · 12 · 20 · 30 · __",
    options: ["38", "40", "42", "44"],
    answer: 2, // index of correct option (0-based)
    explanation: "Differences: 4,6,8,10,12 → next is 30+12 = 42",
  },
  {
    text: "If all Bloops are Razzles, and all Razzles are Lazzles, then:\nAll Bloops are definitely…",
    options: ["Razzles only", "Lazzles", "Neither", "Cannot determine"],
    answer: 1,
    explanation: "Transitivity: Bloops→Razzles→Lazzles",
  },
  {
    text: "A train travels 120 km in 1.5 hours.\nHow many km does it travel in 2.5 hours at the same speed?",
    options: ["160 km", "180 km", "200 km", "220 km"],
    answer: 2,
    explanation: "Speed = 80 km/h. 80 × 2.5 = 200 km",
  },
  {
    text: "Which shape does NOT belong?\n△ ○ □ ◇ ▭",
    options: ["Triangle (△)", "Circle (○)", "Rectangle (▭)", "Diamond (◇)"],
    answer: 1,
    explanation: "The circle has no corners; all others are polygons",
  },
  {
    text: "If you rearrange the letters in 'CIFAIPC', you get the name of a(n):",
    options: ["Country", "Animal", "Ocean", "City"],
    answer: 2,
    explanation: "CIFAIPC → PACIFIC (ocean)",
  },
];

/** Start the quiz — validate username and transition to quiz screen */
function startQuiz() {
  const input = document.getElementById("usernameInput").value.trim();

  if (!input) {
    showToast("⚠️ Please enter your name to begin!");
    document.getElementById("usernameInput").focus();
    return;
  }

  state.username = input;

  // Show username in header badge
  document.getElementById("badgeUsername").textContent = input;
  document.getElementById("userBadge").style.display = "flex";

  // Reset quiz state
  state.currentQuestion = 0;
  state.score = 0;
  state.answeredQuestions = [];

  showScreen("screenQuiz");
  renderQuestion();
}

/** Render the current question onto the quiz card */
function renderQuestion() {
  const q = QUESTIONS[state.currentQuestion];
  const total = QUESTIONS.length;
  const qIndex = state.currentQuestion;

  // Update metadata
  document.getElementById("questionCounter").textContent =
    `Question ${qIndex + 1} / ${total}`;
  document.getElementById("qNumber").textContent = `Q${qIndex + 1}`;
  document.getElementById("questionText").textContent = q.text;

  // Progress bar
  const pct = ((qIndex) / total) * 100;
  document.getElementById("progressFill").style.width = pct + "%";

  // Render options
  const grid = document.getElementById("optionsGrid");
  grid.innerHTML = "";
  const letters = ["A", "B", "C", "D"];

  q.options.forEach((optText, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span> ${optText}`;
    btn.addEventListener("click", () => selectAnswer(i, btn));
    grid.appendChild(btn);
  });

  // Disable next button until an answer is selected
  const btnNext = document.getElementById("btnNext");
  btnNext.disabled = true;
  btnNext.textContent =
    qIndex === total - 1 ? "Submit Quiz ✓" : "Next Question →";

  // Reset & start timer
  state.selectedAnswer = null;
  startTimer();
}

/** Start the 30-second countdown timer */
function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = 30;
  updateTimerUI(30);

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateTimerUI(state.timeLeft);

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      // Auto-advance on timeout (counts as wrong)
      autoTimeout();
    }
  }, 1000);
}

/** Update the circular timer SVG and text */
function updateTimerUI(seconds) {
  const circumference = 125.6; // 2 * π * 20
  const fraction = seconds / 30;
  const offset = circumference * (1 - fraction);

  const ring = document.getElementById("timerRing");
  const display = document.getElementById("timerDisplay");

  ring.style.strokeDashoffset = offset;
  display.textContent = seconds;

  // Color shift when time is low
  if (seconds <= 10) {
    ring.style.stroke = "#ff5a5a";
  } else if (seconds <= 20) {
    ring.style.stroke = "#ffc83c";
  } else {
    ring.style.stroke = "#ffc83c";
  }
}

/** Handle timeout — mark as wrong and move on */
function autoTimeout() {
  const q = QUESTIONS[state.currentQuestion];

  // Highlight correct answer
  const optBtns = document.querySelectorAll(".option-btn");
  optBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add("correct");
  });

  document.getElementById("btnNext").disabled = false;

  // Short delay then auto-advance
  setTimeout(() => nextQuestion(), 1500);
}

/** User selects an answer */
function selectAnswer(index, clickedBtn) {
  // Prevent re-selection
  if (state.selectedAnswer !== null) return;

  clearInterval(state.timerInterval);
  state.selectedAnswer = index;

  const q = QUESTIONS[state.currentQuestion];
  const optBtns = document.querySelectorAll(".option-btn");

  // Disable all options
  optBtns.forEach((btn) => (btn.disabled = true));

  // Mark correct / wrong
  if (index === q.answer) {
    clickedBtn.classList.add("correct");
    state.score++;
  } else {
    clickedBtn.classList.add("wrong");
    optBtns[q.answer].classList.add("correct");
  }

  document.getElementById("btnNext").disabled = false;
}

/** Advance to next question or show results */
function nextQuestion() {
  clearInterval(state.timerInterval);
  state.currentQuestion++;

  if (state.currentQuestion >= QUESTIONS.length) {
    showResultScreen();
  } else {
    renderQuestion();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SCORE & RESULT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

/** Compute an approximate IQ range based on score */
function getIQLabel(score) {
  if (score === 5) return { label: "Genius (IQ 130+)",       msg: "Outstanding! Perfect score — you're in the top 2%!" };
  if (score === 4) return { label: "Superior (IQ 115–129)",  msg: "Excellent! You have sharp logical thinking." };
  if (score === 3) return { label: "Above Average (IQ 105–114)", msg: "Good work! Solid reasoning skills." };
  if (score === 2) return { label: "Average (IQ 90–104)",    msg: "Not bad! Keep sharpening those neural pathways." };
  if (score === 1) return { label: "Below Average (IQ 80–89)", msg: "Keep practicing — every brain can grow!" };
  return           { label: "Low Range (IQ <80)",            msg: "Don't worry — try again and learn from each question!" };
}

/** Animate the score arc on the result screen */
function animateScoreArc(score, total) {
  const circumference = 326.7; // 2 * π * 52
  const offset = circumference * (1 - score / total);

  // Small delay so screen transition completes first
  setTimeout(() => {
    document.getElementById("scoreArc").style.strokeDashoffset = offset;
  }, 100);
}

/** Transition to result screen */
function showResultScreen() {
  const { label, msg } = getIQLabel(state.score);

  document.getElementById("scoreDisplay").textContent = state.score;
  document.getElementById("resultTitle").textContent =
    state.score >= 4
      ? `Well done, ${state.username}! 🏆`
      : state.score >= 2
      ? `Nice try, ${state.username}! 💡`
      : `Keep going, ${state.username}! 💪`;
  document.getElementById("resultSubtitle").textContent = msg;
  document.getElementById("iqBadge").textContent = label;

  showScreen("screenResult");
  animateScoreArc(state.score, QUESTIONS.length);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BACKEND API: FETCH GAME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /get-game
 * Fetches a unique game from the backend for this user, then loads it.
 */
async function fetchGame() {
  showScreen("screenLoading");

  try {
    const response = await fetch("/get-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Backend returned an error (e.g. no games available)
      const msg = data.message || data.error || "Failed to fetch game";
      showScreen("screenResult");
      showToast("🎮 " + msg);
      return;
    }

    // Load the game into the arena
    loadGame(data);
  } catch (err) {
    console.error("API error:", err);
    showScreen("screenResult");
    showToast("❌ Could not connect to server. Is it running on port 3000?");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GAME LOADER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Takes the API game object and renders the correct game.
 * @param {Object} game - { id, name, type, description, difficulty }
 */
function loadGame(game) {
  // Update game header
  document.getElementById("gameName").textContent = game.name;
  document.getElementById("gameDesc").textContent = game.description;
  document.getElementById("gameTag").textContent = game.type;

  // Hide all game containers
  document.getElementById("gameMemory").style.display = "none";
  document.getElementById("gameReaction").style.display = "none";
  document.getElementById("gamePuzzle").style.display = "none";

  // Show and initialize the correct game
  switch (game.type) {
    case "memory":
      document.getElementById("gameMemory").style.display = "block";
      initMemoryGame();
      break;
    case "reaction":
      document.getElementById("gameReaction").style.display = "block";
      initReactionGame();
      break;
    case "puzzle":
      document.getElementById("gamePuzzle").style.display = "block";
      initPuzzleGame();
      break;
    default:
      // Fallback: default to memory game
      document.getElementById("gameMemory").style.display = "block";
      initMemoryGame();
  }

  showScreen("screenGame");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MEMORY MATCH GAME
// ═══════════════════════════════════════════════════════════════════════════════

const MEMORY_EMOJIS = ["🧠", "⚡", "🎯", "💡", "🔥", "🌊", "🎲", "🦋"];

let memState = {
  cards: [],
  flipped: [],
  matched: 0,
  moves: 0,
  timerInterval: null,
  elapsed: 0,
  locked: false,
};

/** Initialize / restart the memory game */
function initMemoryGame() {
  clearInterval(memState.timerInterval);
  memState = {
    cards: [],
    flipped: [],
    matched: 0,
    moves: 0,
    timerInterval: null,
    elapsed: 0,
    locked: false,
  };

  // Update stats display
  document.getElementById("memMoves").textContent = "0";
  document.getElementById("memPairs").textContent = "0";
  document.getElementById("memTime").textContent = "0s";

  // Create shuffled card deck (8 pairs = 16 cards)
  const deck = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
  shuffleArray(deck);

  const grid = document.getElementById("memoryGrid");
  grid.innerHTML = "";

  deck.forEach((emoji, idx) => {
    const card = document.createElement("div");
    card.className = "mem-card";
    card.dataset.emoji = emoji;
    card.dataset.index = idx;
    card.innerHTML = `
      <div class="mem-card-inner">
        <div class="mem-front"></div>
        <div class="mem-back">${emoji}</div>
      </div>
    `;
    card.addEventListener("click", () => flipCard(card));
    grid.appendChild(card);
    memState.cards.push(card);
  });

  // Start elapsed timer
  memState.timerInterval = setInterval(() => {
    memState.elapsed++;
    document.getElementById("memTime").textContent = memState.elapsed + "s";
  }, 1000);
}

/** Handle card flip */
function flipCard(card) {
  if (
    memState.locked ||
    card.classList.contains("flipped") ||
    card.classList.contains("matched")
  )
    return;

  card.classList.add("flipped");
  memState.flipped.push(card);

  if (memState.flipped.length === 2) {
    memState.locked = true;
    memState.moves++;
    document.getElementById("memMoves").textContent = memState.moves;
    checkMemoryMatch();
  }
}

/** Check if two flipped cards match */
function checkMemoryMatch() {
  const [a, b] = memState.flipped;
  if (a.dataset.emoji === b.dataset.emoji) {
    // Match!
    a.classList.add("matched");
    b.classList.add("matched");
    memState.matched++;
    document.getElementById("memPairs").textContent = memState.matched;
    memState.flipped = [];
    memState.locked = false;

    if (memState.matched === MEMORY_EMOJIS.length) {
      // All pairs found
      clearInterval(memState.timerInterval);
      setTimeout(() => {
        showToast(
          `🎉 Solved in ${memState.moves} moves & ${memState.elapsed}s!`
        );
      }, 400);
    }
  } else {
    // No match — flip back after short delay
    setTimeout(() => {
      a.classList.remove("flipped");
      b.classList.remove("flipped");
      memState.flipped = [];
      memState.locked = false;
    }, 900);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. REACTION SPEED GAME
// ═══════════════════════════════════════════════════════════════════════════════

let rxState = {
  phase: "idle",   // idle | waiting | ready | go
  startTime: null,
  bestMs: Infinity,
  attempts: 0,
  timeoutId: null,
};

/** Initialize reaction game */
function initReactionGame() {
  resetReactionGame();
}

/** Reset reaction game state and UI */
function resetReactionGame() {
  clearTimeout(rxState.timeoutId);
  rxState = { phase: "idle", startTime: null, bestMs: Infinity, attempts: 0, timeoutId: null };
  updateReactionUI("idle");
  document.getElementById("reactionLast").textContent = "—";
  document.getElementById("reactionBest").textContent = "—";
  document.getElementById("reactionAttempts").textContent = "0";
}

/** Update the reaction pad appearance and text */
function updateReactionUI(phase) {
  const pad = document.getElementById("reactionPad");
  const text = document.getElementById("reactionText");
  pad.className = "reaction-pad";

  switch (phase) {
    case "idle":
      text.textContent = "Click to Start";
      break;
    case "waiting":
      pad.classList.add("waiting");
      text.textContent = "Wait for GREEN…";
      break;
    case "ready":
      pad.classList.add("ready");
      text.textContent = "Get ready…";
      break;
    case "go":
      pad.classList.add("go");
      text.textContent = "CLICK NOW! ⚡";
      break;
    case "too-early":
      pad.classList.add("too-early");
      text.textContent = "Too early! Try again";
      break;
    case "result":
      pad.classList.add("ready");
      break;
  }
}

/** Handle click on reaction pad */
function handleReactionClick() {
  switch (rxState.phase) {
    case "idle":
      startReactionRound();
      break;

    case "waiting":
    case "ready":
      // Clicked too early
      clearTimeout(rxState.timeoutId);
      rxState.phase = "too-early";
      updateReactionUI("too-early");
      document.getElementById("reactionText").textContent =
        "⚠️ Too early! Click again to retry";
      setTimeout(() => {
        rxState.phase = "idle";
        updateReactionUI("idle");
      }, 1500);
      break;

    case "go":
      // Measure reaction time
      const elapsed = Date.now() - rxState.startTime;
      rxState.attempts++;
      if (elapsed < rxState.bestMs) rxState.bestMs = elapsed;

      document.getElementById("reactionLast").textContent = elapsed + " ms";
      document.getElementById("reactionBest").textContent =
        rxState.bestMs + " ms";
      document.getElementById("reactionAttempts").textContent =
        rxState.attempts;
      document.getElementById("reactionText").textContent =
        elapsed + " ms — Click to try again!";

      rxState.phase = "idle";
      updateReactionUI("idle");
      break;
  }
}

/** Begin a reaction round */
function startReactionRound() {
  rxState.phase = "waiting";
  updateReactionUI("waiting");

  // Random delay between 1.5s and 5s before showing green
  const delay = 1500 + Math.random() * 3500;

  rxState.timeoutId = setTimeout(() => {
    // Brief "ready" pulse before GO
    rxState.phase = "ready";
    updateReactionUI("ready");

    rxState.timeoutId = setTimeout(() => {
      rxState.phase = "go";
      rxState.startTime = Date.now();
      updateReactionUI("go");
    }, 400);
  }, delay);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. NUMBER PUZZLE (15-PUZZLE / SLIDING TILES)
// ═══════════════════════════════════════════════════════════════════════════════

const PUZZLE_SIZE = 4; // 4×4 grid (15 tiles + 1 empty)

let pzState = {
  tiles: [],       // 1D array of tile values (0 = empty)
  emptyIdx: 15,    // index of empty slot
  moves: 0,
  solved: false,
};

/** Solved state: [1,2,3,...,15,0] */
function getSolvedState() {
  return [...Array(15).keys()].map((n) => n + 1).concat([0]);
}

/** Initialize / shuffle the puzzle */
function initPuzzleGame() {
  pzState.moves = 0;
  pzState.solved = false;

  document.getElementById("puzzleMoves").textContent = "0";
  document.getElementById("puzzleStatus").textContent =
    "Slide tiles to solve the puzzle!";

  // Start from solved state and do many random moves (guarantees solvability)
  pzState.tiles = getSolvedState();
  pzState.emptyIdx = 15;

  for (let i = 0; i < 200; i++) {
    const neighbors = getPuzzleNeighbors(pzState.emptyIdx);
    const randNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    swapTiles(pzState.emptyIdx, randNeighbor, false); // silent swap
  }

  renderPuzzle();
}

/** Get valid neighbor indices for a given index */
function getPuzzleNeighbors(idx) {
  const neighbors = [];
  const row = Math.floor(idx / PUZZLE_SIZE);
  const col = idx % PUZZLE_SIZE;
  if (row > 0) neighbors.push(idx - PUZZLE_SIZE); // up
  if (row < PUZZLE_SIZE - 1) neighbors.push(idx + PUZZLE_SIZE); // down
  if (col > 0) neighbors.push(idx - 1); // left
  if (col < PUZZLE_SIZE - 1) neighbors.push(idx + 1); // right
  return neighbors;
}

/** Swap two tiles in pzState.tiles */
function swapTiles(a, b, updateEmpty = true) {
  [pzState.tiles[a], pzState.tiles[b]] = [pzState.tiles[b], pzState.tiles[a]];
  if (updateEmpty) {
    pzState.emptyIdx = pzState.tiles[a] === 0 ? a : b;
  } else {
    pzState.emptyIdx = b; // b is now empty (we just moved a into b)
  }
}

/** Handle tile click */
function clickTile(idx) {
  if (pzState.solved) return;
  if (pzState.tiles[idx] === 0) return;

  const neighbors = getPuzzleNeighbors(idx);
  if (!neighbors.includes(pzState.emptyIdx)) return; // not adjacent to empty

  // Move the tile
  swapTiles(idx, pzState.emptyIdx);
  pzState.moves++;
  document.getElementById("puzzleMoves").textContent = pzState.moves;

  renderPuzzle();
  checkPuzzleSolved();
}

/** Render the puzzle grid */
function renderPuzzle() {
  const grid = document.getElementById("puzzleGrid");
  grid.innerHTML = "";
  const solved = getSolvedState();

  pzState.tiles.forEach((val, idx) => {
    const tile = document.createElement("div");
    tile.className = "puzzle-tile";

    if (val === 0) {
      tile.classList.add("empty");
    } else {
      tile.textContent = val;
      if (val === solved[idx]) tile.classList.add("solved-cell");
      tile.addEventListener("click", () => clickTile(idx));
    }

    grid.appendChild(tile);
  });
}

/** Check if the puzzle is in solved state */
function checkPuzzleSolved() {
  const solved = getSolvedState();
  const isSolved = pzState.tiles.every((v, i) => v === solved[i]);

  if (isSolved) {
    pzState.solved = true;
    document.getElementById("puzzleStatus").textContent =
      `🎉 Solved in ${pzState.moves} moves!`;
    showToast(`🧩 Puzzle solved in ${pzState.moves} moves!`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Fisher-Yates shuffle */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT: Auto-seed games on first load
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * On page load, quietly call /add-games to seed the DB.
 * This is safe to call multiple times (server checks for duplicates).
 */
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetch("/add-games");
    console.log("🎮 Games seeded successfully");
  } catch (e) {
    console.warn("Could not seed games:", e.message);
  }
});
