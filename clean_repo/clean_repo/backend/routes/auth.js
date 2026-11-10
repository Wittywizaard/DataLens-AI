const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const User = require("../models/User");
const SavedAnalysis = require("../models/SavedAnalysis");
const FileData = require("../models/FileData");
const dataStore = require("../utils/dataStore");
const zlib = require("zlib");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Sign Up
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name required" });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash, name });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Signup failed: " + error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

// Verify Token (get current user)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        filesAnalyzed: user.filesAnalyzed
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Get all users (admin only - you can add role checking later)
router.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash");
    res.json({ users, total: users.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Delete user
router.delete("/users/:id", verifyToken, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ error: "Unauthorized to delete this account" });
    }
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (deleted) {
      res.json({ message: "User deleted" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}?error=login_failed` }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign({ id: req.user._id, email: req.user.email }, JWT_SECRET, { expiresIn: "7d" });
    
    // Redirect back to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/success?token=${token}`);
  }
);

// Save or Update Analysis Session
router.post("/saved-analyses", verifyToken, async (req, res) => {
  try {
    const { fileId, fileName, messages } = req.body;
    if (!fileId || !fileName) {
      return res.status(400).json({ error: "fileId and fileName are required." });
    }

    // Find the file data in MongoDB
    const fileDoc = await FileData.findOne({ fileId });
    if (!fileDoc) {
      return res.status(404).json({ error: "Spreadsheet session expired. Please re-upload the file." });
    }

    // Check if it's already saved by this user
    let analysis = await SavedAnalysis.findOne({ userId: req.userId, fileId });

    if (analysis) {
      // Update existing saved analysis
      analysis.fileName = fileName;
      analysis.messages = messages;
      analysis.createdAt = new Date();
      await analysis.save();
    } else {
      // Create new saved analysis
      analysis = new SavedAnalysis({
        userId: req.userId,
        fileId,
        fileName,
        headers: fileDoc.headers,
        columnTypes: fileDoc.columnTypes,
        stats: fileDoc.stats,
        rowCount: fileDoc.rowCount,
        compressedRows: fileDoc.compressedRows,
        messages,
      });
      await analysis.save();
    }

    res.json({ success: true, message: "Analysis saved successfully!", analysisId: analysis._id });
  } catch (err) {
    console.error("Save analysis error:", err);
    res.status(500).json({ error: "Failed to save analysis session." });
  }
});

// Get all saved analyses for user (excluding compressedRows to keep it fast)
router.get("/saved-analyses", verifyToken, async (req, res) => {
  try {
    const list = await SavedAnalysis.find({ userId: req.userId })
      .select("-compressedRows")
      .sort({ createdAt: -1 });
    res.json({ success: true, analyses: list });
  } catch (err) {
    console.error("Get saved analyses error:", err);
    res.status(500).json({ error: "Failed to load saved analyses." });
  }
});

// Load a saved analysis session
router.post("/saved-analyses/:id/load", verifyToken, async (req, res) => {
  try {
    const analysis = await SavedAnalysis.findOne({ _id: req.params.id, userId: req.userId });
    if (!analysis) {
      return res.status(404).json({ error: "Saved analysis not found." });
    }

    // Decompress the rows
    const rows = JSON.parse(zlib.gunzipSync(analysis.compressedRows).toString("utf8"));

    // Cache the file in the server's dataStore
    await dataStore.set(analysis.fileId, {
      fileId: analysis.fileId,
      originalName: analysis.fileName,
      headers: analysis.headers,
      rows,
      columnTypes: analysis.columnTypes,
      stats: analysis.stats,
      rowCount: analysis.rowCount,
      uploadedAt: analysis.createdAt,
    });

    res.json({
      success: true,
      fileId: analysis.fileId,
      originalName: analysis.fileName,
      headers: analysis.headers,
      columnTypes: analysis.columnTypes,
      stats: analysis.stats,
      rowCount: analysis.rowCount,
      preview: rows.slice(0, 10),
      messages: analysis.messages,
    });
  } catch (err) {
    console.error("Load saved analysis error:", err);
    res.status(500).json({ error: "Failed to load the analysis session." });
  }
});

// Delete a saved analysis session
router.delete("/saved-analyses/:id", verifyToken, async (req, res) => {
  try {
    const deleted = await SavedAnalysis.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (deleted) {
      res.json({ success: true, message: "Saved analysis deleted successfully." });
    } else {
      res.status(404).json({ error: "Saved analysis not found." });
    }
  } catch (err) {
    console.error("Delete saved analysis error:", err);
    res.status(500).json({ error: "Failed to delete saved analysis." });
  }
});

module.exports = router;
