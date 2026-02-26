const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    sender: {
      type: String,
      enum: ["user", "bot"],
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indices
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, sender: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
