const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userStore = require("../utils/userStore");

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
    
    if (userStore.findByEmail(email)) {
      return res.status(409).json({ error: "Email already registered" });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = userStore.create(email, passwordHash, name);
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
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
    
    const user = userStore.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    userStore.update(user.id, { lastLogin: new Date() });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

// Verify Token (get current user)
router.get("/me", verifyToken, (req, res) => {
  const user = userStore.findById(req.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      filesAnalyzed: user.filesAnalyzed
    }
  });
});

// Get all users (admin only - you can add role checking later)
router.get("/users", verifyToken, (req, res) => {
  const users = userStore.getAll();
  res.json({ users, total: users.length });
});

// Delete user
router.delete("/users/:id", verifyToken, (req, res) => {
  const deleted = userStore.delete(parseInt(req.params.id));
  if (deleted) {
    res.json({ message: "User deleted" });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

module.exports = router;
