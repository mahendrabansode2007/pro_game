/**
 * models/Game.js
 * Mongoose schema and model for the Game collection
 */

const mongoose = require("mongoose");

// ─── Game Schema ───────────────────────────────────────────────────────────────
const GameSchema = new mongoose.Schema(
  {
    // Human-readable game name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Game type — used by frontend to dynamically render the correct game
    // Allowed values: "memory" | "reaction" | "puzzle"
    type: {
      type: String,
      required: true,
      enum: ["memory", "reaction", "puzzle"],
    },

    // Short description shown to user before game starts
    description: {
      type: String,
      default: "A fun brain-training mini game!",
    },

    // Difficulty label (for display only)
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    // Array of userIds who have already been assigned this game
    usedBy: {
      type: [String],
      default: [],
    },

    // Global uniqueness flag — true once ANY user has been assigned this game
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// ─── Export Model ──────────────────────────────────────────────────────────────
module.exports = mongoose.model("Game", GameSchema);
