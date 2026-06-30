const mongoose = require("mongoose");

const fileDataSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  headers: [{ type: String }],
  compressedRows: { type: Buffer, required: true }, // Compressed Gzipped JSON
  columnTypes: { type: mongoose.Schema.Types.Mixed, required: true },
  stats: { type: mongoose.Schema.Types.Mixed, required: true },
  rowCount: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

// Set auto-expiration TTL index to clean up documents after 48 hours (172800 seconds)
fileDataSchema.index({ uploadedAt: 1 }, { expireAfterSeconds: 172800 });

module.exports = mongoose.model("FileData", fileDataSchema);
