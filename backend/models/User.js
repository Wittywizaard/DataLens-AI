const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values
  },
  passwordHash: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  filesAnalyzed: {
    type: Number,
    default: 0,
  }
});

module.exports = mongoose.model("User", userSchema);
