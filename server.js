/**
 * server.js
 * Main Express server for IQ Test + Smart Game Recommendation System
 * Handles game assignment logic and MongoDB connection
 */

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const MONGO_URI = "mongodb://localhost:27017/iqgamedb";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ─── Import Model ──────────────────────────────────────────────────────────────
const Game = require("./models/Game");

// ─── Seed Games Data ───────────────────────────────────────────────────────────
const SEED_GAMES = [
  {
    name: "Memory Match",
    type: "memory",
    description: "Flip cards and match all pairs as fast as you can!",
    difficulty: "easy",
  },
  {
    name: "Reaction Speed Challenge",
    type: "reaction",
    description: "Test your reflexes — click the moment the color changes!",
    difficulty: "medium",
  },
  {
    name: "Number Puzzle",
    type: "puzzle",
    description: "Slide the tiles into the correct order to win!",
    difficulty: "hard",
  },
  {
    name: "Color Memory Blitz",
    type: "memory",
    description: "Watch the color sequence and repeat it back!",
    difficulty: "medium",
  },
  {
    name: "Math Speed Quiz",
    type: "reaction",
    description: "Answer arithmetic questions as fast as possible!",
    difficulty: "hard",
  },
];

// ─── API: Seed Games ───────────────────────────────────────────────────────────
/**
 * GET /add-games
 * Seeds the database with predefined games (only if not already seeded)
 */
app.get("/add-games", async (req, res) => {
  try {
    const count = await Game.countDocuments();
    if (count >= SEED_GAMES.length) {
      return res.json({ message: "Games already exist in database", count });
    }

    // Remove old records and re-insert fresh
    await Game.deleteMany({});
    const inserted = await Game.insertMany(SEED_GAMES);

    res.json({
      message: `✅ ${inserted.length} games added successfully!`,
      games: inserted.map((g) => ({ name: g.name, type: g.type })),
    });
  } catch (err) {
    console.error("Error seeding games:", err);
    res.status(500).json({ error: "Failed to seed games" });
  }
});

// ─── API: Get Game for User ────────────────────────────────────────────────────
/**
 * POST /get-game
 * Body: { userId: String }
 *
 * Logic:
 *  1. Find a game this user hasn't played yet (userId not in usedBy)
 *  2. Prefer a globally unused game (isUsed = false)
 *  3. If found → add userId to usedBy, mark isUsed = true, return game
 *  4. If none → return "No new games available"
 */
app.post("/get-game", async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate input
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Valid userId is required" });
    }

    // Step 1: Try to find a game not used by this user AND globally unused
    let game = await Game.findOne({
      usedBy: { $nin: [userId] },
      isUsed: false,
    });

    // Step 2: If no globally-fresh game, allow any game this user hasn't played
    if (!game) {
      game = await Game.findOne({
        usedBy: { $nin: [userId] },
      });
    }

    // Step 3: No available game for this user
    if (!game) {
      return res.status(404).json({
        message: "No new games available. You've played them all — impressive!",
      });
    }

    // Step 4: Update the game record
    game.usedBy.push(userId);
    game.isUsed = true;
    await game.save();

    // Return the game details to frontend
    res.json({
      id: game._id,
      name: game.name,
      type: game.type,
      description: game.description,
      difficulty: game.difficulty,
    });
  } catch (err) {
    console.error("Error fetching game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── API: Health Check ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Seed games at: http://localhost:${PORT}/add-games`);
});
