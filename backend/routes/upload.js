const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const Papa = require("papaparse");
const XLSX = require("xlsx");

const router = express.Router();

// In-memory store for parsed data (use Redis in production)
const dataStore = require("../utils/dataStore");

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [".csv", ".tsv", ".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${ext}. Allowed: ${allowed.join(", ")}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

// POST /api/upload
router.post("/", upload.array("file", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      // Also check req.file for backwards compatibility just in case
      if (req.file) req.files = [req.file];
      else return res.status(400).json({ error: "No files uploaded." });
    }

    let headersSet = new Set();
    let rows = [];
    let originalNames = [];

    for (const file of req.files) {
      const filePath = file.path;
      const ext = path.extname(file.originalname).toLowerCase();
      originalNames.push(file.originalname);
      
      let fileHeaders = [];
      let fileRows = [];

      // Parse the file
      if (ext === ".csv" || ext === ".tsv") {
        const content = file.buffer.toString("utf8");
        const delimiter = ext === ".tsv" ? "\t" : ",";
        const result = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          delimiter,
        });
        fileHeaders = result.meta.fields || [];
        fileRows = result.data;
      } else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
        fileHeaders = json.length ? Object.keys(json[0]) : [];
        fileRows = json;
      }

      fileHeaders.forEach(h => headersSet.add(h));
      // Add source file identifier so AI can distinguish them
      fileRows = fileRows.map(r => ({ ...r, "Source File": file.originalname }));
      rows = rows.concat(fileRows);
    }
    
    headersSet.add("Source File");
    const headers = Array.from(headersSet);

    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: "Files appear to be empty or unreadable." });
    }

    // Detect column types
    const columnTypes = {};
    headers.forEach((h) => {
      const values = rows.map((r) => r[h]).filter((v) => v !== null && v !== undefined && v !== "");
      const numericCount = values.filter((v) => typeof v === "number" || (!isNaN(parseFloat(v)) && isFinite(v))).length;
      const dateCount = values.filter((v) => {
        if (typeof v !== "string") return false;
        return !isNaN(Date.parse(v));
      }).length;
      if (numericCount / values.length > 0.8) columnTypes[h] = "numeric";
      else if (dateCount / values.length > 0.6) columnTypes[h] = "date";
      else columnTypes[h] = "categorical";
    });

    // Compute basic stats
    const stats = {};
    headers.forEach((h) => {
      if (columnTypes[h] === "numeric") {
        const vals = rows.map((r) => parseFloat(r[h])).filter((v) => !isNaN(v));
        if (vals.length) {
          const sum = vals.reduce((a, b) => a + b, 0);
          const sorted = [...vals].sort((a, b) => a - b);
          stats[h] = {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: sum / vals.length,
            count: vals.length,
            sum,
          };
        }
      } else {
        const freq = {};
        rows.forEach((r) => {
          const v = String(r[h] ?? "");
          freq[v] = (freq[v] || 0) + 1;
        });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        stats[h] = {
          unique: sorted.length,
          topValues: sorted.slice(0, 10).map(([val, count]) => ({ val, count })),
        };
      }
    });

    // Store parsed data in memory
    const fileId = uuidv4();
    const displayName = originalNames.length > 1 ? `${originalNames.length} files combined` : originalNames[0];
    
    await dataStore.set(fileId, {
      fileId,
      originalName: displayName,
      headers,
      rows,
      columnTypes,
      stats,
      rowCount: rows.length,
      uploadedAt: new Date().toISOString(),
    });

    // Auto-delete after 24 hours (MongoDB does this automatically, but keeping fallback cleanup)
    setTimeout(async () => {
      await dataStore.delete(fileId);
    }, 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      fileId,
      originalName: displayName,
      rowCount: rows.length,
      headers,
      columnTypes,
      stats,
      preview: rows.slice(0, 5),
    });
  } catch (err) {
    console.error("Upload error:", err);
    if (req.files) {
      // Memory storage means no files to unlink
    }
    res.status(500).json({ error: err.message || "Failed to process files." });
  }
});

module.exports = router;
