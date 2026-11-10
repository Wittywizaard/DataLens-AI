const express = require("express");
const dataStore = require("../utils/dataStore");

const router = express.Router();

// GET /api/files/:fileId
router.get("/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const fileData = await dataStore.get(fileId);
  if (!fileData) {
    return res.status(404).json({ error: "File not found or session expired." });
  }
  const { rows, ...meta } = fileData;
  res.json({ success: true, ...meta, preview: rows.slice(0, 10) });
});

// DELETE /api/files/:fileId
router.delete("/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const deleted = await dataStore.delete(fileId);
  res.json({ success: true, deleted });
});

module.exports = router;
