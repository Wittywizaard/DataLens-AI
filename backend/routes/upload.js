const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Papa = require("papaparse");
const XLSX = require("xlsx");
const {
  pickBestSheetName,
  sheetToCleanJson,
  detectColumnTypes,
  computeStats,
  isBlankRow,
  normalizeRow,
  parseLooseNumber,
} = require("../utils/dataAnalysis");

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

function cleanParsedRows(fileHeaders, fileRows) {
  // Drop blank rows and normalize Date objects / loose numbers where helpful
  const cleaned = fileRows
    .filter((r) => !isBlankRow(r))
    .map((r) => {
      const row = normalizeRow(r);
      for (const h of fileHeaders) {
        if (!(h in row)) row[h] = null;
      }
      return row;
    });

  // Prefer union of keys across all rows (not only first row)
  const headerSet = new Set(fileHeaders);
  cleaned.forEach((r) => Object.keys(r).forEach((k) => headerSet.add(k)));
  return {
    headers: Array.from(headerSet),
    rows: cleaned,
  };
}

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
    let sheetInfo = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      originalNames.push(file.originalname);

      let fileHeaders = [];
      let fileRows = [];
      let selectedSheet = null;

      // Parse the file
      if (ext === ".csv" || ext === ".tsv") {
        const content = file.buffer.toString("utf8");
        const delimiter = ext === ".tsv" ? "\t" : ",";
        const result = Papa.parse(content, {
          header: true,
          skipEmptyLines: "greedy",
          dynamicTyping: true,
          delimiter,
          transformHeader: (h) => (h || "").trim(),
        });
        fileHeaders = (result.meta.fields || []).filter(Boolean);
        fileRows = result.data.map((r) => {
          const out = { ...r };
          // Coerce currency-like strings to numbers when Papa left them as text
          for (const h of fileHeaders) {
            if (typeof out[h] === "string") {
              const n = parseLooseNumber(out[h]);
              if (!isNaN(n) && /[$£€¥₹,]|^\d+\.\d+$/.test(out[h].trim())) {
                out[h] = n;
              }
            }
          }
          return out;
        });
      } else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = XLSX.read(file.buffer, {
          type: "buffer",
          cellDates: true,
          cellNF: false,
        });
        selectedSheet = pickBestSheetName(workbook);
        const sheet = workbook.Sheets[selectedSheet];
        const parsed = sheetToCleanJson(sheet);
        fileHeaders = parsed.headers;
        fileRows = parsed.rows;
        sheetInfo.push({
          file: file.originalname,
          selectedSheet,
          availableSheets: workbook.SheetNames,
        });
      }

      const cleaned = cleanParsedRows(fileHeaders, fileRows);
      fileHeaders = cleaned.headers;
      fileRows = cleaned.rows;

      fileHeaders.forEach((h) => headersSet.add(h));
      // Add source file identifier so AI can distinguish them
      fileRows = fileRows.map((r) => ({ ...r, "Source File": file.originalname }));
      rows = rows.concat(fileRows);
    }

    headersSet.add("Source File");
    const headers = Array.from(headersSet);

    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: "Files appear to be empty or unreadable." });
    }

    // Detect column types + stats with hardened parsers
    const columnTypes = detectColumnTypes(headers, rows);
    const stats = computeStats(headers, rows, columnTypes);

    // Store parsed data in memory
    const fileId = uuidv4();
    const displayName =
      originalNames.length > 1 ? `${originalNames.length} files combined` : originalNames[0];

    await dataStore.set(fileId, {
      fileId,
      originalName: displayName,
      headers,
      rows,
      columnTypes,
      stats,
      rowCount: rows.length,
      sheetInfo,
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
      sheetInfo,
      preview: rows.slice(0, 5),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process files." });
  }
});

module.exports = router;
