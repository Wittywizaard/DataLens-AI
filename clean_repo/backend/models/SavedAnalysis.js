const mongoose = require("mongoose");

const savedAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileId: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  headers: [{
    type: String,
  }],
  columnTypes: {
    type: mongoose.Schema.Types.Mixed,
  },
  stats: {
    type: mongoose.Schema.Types.Mixed,
  },
  rowCount: {
    type: Number,
  },
  compressedRows: {
    type: Buffer,
    required: true,
  },
  messages: {
    type: Array,
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to quickly fetch saved analyses for a specific user
savedAnalysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("SavedAnalysis", savedAnalysisSchema);
