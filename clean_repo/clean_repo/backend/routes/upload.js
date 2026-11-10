const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Papa = require("papaparse");
const XLSX = require("xlsx");
const {
  ensureFullSheetRef,
  pickBestSheetName,
  sheetToCleanJson,
  detectColumnTypes,
  computeStats,
  isBlankRow,
  normalizeRow,
  parseLooseNumber,
} = require("../utils/dataAnalysis");

const router = express.Router();

// In-memory / MongoDB / disk store for parsed data
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
      if (req.file) req.files = [req.file];
      else return res.status(400).json({ error: "No files uploaded." });
    }

    let headersSet = new Set();
    let rows = [];
    let originalNames = [];
    let sheetInfo = [];
    let sheetsData = {};

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      originalNames.push(file.originalname);

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

        let fileHeaders = (result.meta.fields || []).filter(Boolean);
        let fileRows = result.data.map((r) => {
          const out = { ...r };
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

        const cleaned = cleanParsedRows(fileHeaders, fileRows);
        const cleanHeaders = cleaned.headers;
        const cleanRows = cleaned.rows;

        const sheetName = path.basename(file.originalname, ext);
        const sColTypes = detectColumnTypes(cleanHeaders, cleanRows);
        const sStats = computeStats(cleanHeaders, cleanRows, sColTypes);

        const sheetKey = req.files.length > 1 ? `${file.originalname} - ${sheetName}` : sheetName;
        const displayLabel = req.files.length > 1 ? `${file.originalname} > ${sheetName}` : sheetName;

        sheetInfo.push({
          key: sheetKey,
          file: file.originalname,
          sheetName,
          displayLabel,
          rowCount: cleanRows.length,
          columnCount: cleanHeaders.length,
          headers: cleanHeaders,
          columnTypes: sColTypes,
          stats: sStats,
        });

        sheetsData[sheetKey] = {
          key: sheetKey,
          file: file.originalname,
          sheetName,
          displayLabel,
          headers: cleanHeaders,
          rows: cleanRows,
          rowCount: cleanRows.length,
          columnTypes: sColTypes,
          stats: sStats,
        };
        if (sheetKey !== sheetName && !sheetsData[sheetName]) {
          sheetsData[sheetName] = sheetsData[sheetKey];
        }

        const taggedRows = cleanRows.map((r) => ({
          ...r,
          Sheet: sheetName,
          "Source File": file.originalname,
          "File Sheet": sheetKey,
        }));

        cleanHeaders.forEach((h) => headersSet.add(h));
        headersSet.add("Sheet");
        headersSet.add("Source File");
        if (req.files.length > 1) headersSet.add("File Sheet");
        rows = rows.concat(taggedRows);
      } else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = XLSX.read(file.buffer, {
          type: "buffer",
          cellDates: true,
          cellNF: false,
        });

        const sheetNames = workbook.SheetNames || [];
        for (const sheetName of sheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          ensureFullSheetRef(sheet);
          const parsed = sheetToCleanJson(sheet, sheetName);
          const sHeaders = parsed.headers || [];
          const sRows = parsed.rows || [];

          const sheetKey = req.files.length > 1 ? `${file.originalname} - ${sheetName}` : sheetName;
          const displayLabel = req.files.length > 1 ? `${file.originalname} > ${sheetName}` : sheetName;

          if (!sHeaders.length && !sRows.length) {
            sheetInfo.push({
              key: sheetKey,
              file: file.originalname,
              sheetName,
              displayLabel,
              rowCount: 0,
              columnCount: 0,
              headers: [],
              columnTypes: {},
              stats: {},
            });
            continue;
          }

          const sCleaned = cleanParsedRows(sHeaders, sRows);
          const cleanHeaders = sCleaned.headers;
          const cleanRows = sCleaned.rows;

          const sColTypes = detectColumnTypes(cleanHeaders, cleanRows);
          const sStats = computeStats(cleanHeaders, cleanRows, sColTypes);

          sheetInfo.push({
            key: sheetKey,
            file: file.originalname,
            sheetName,
            displayLabel,
            rowCount: cleanRows.length,
            columnCount: cleanHeaders.length,
            headers: cleanHeaders,
            columnTypes: sColTypes,
            stats: sStats,
          });

          sheetsData[sheetKey] = {
            key: sheetKey,
            file: file.originalname,
            sheetName,
            displayLabel,
            headers: cleanHeaders,
            rows: cleanRows,
            rowCount: cleanRows.length,
            columnTypes: sColTypes,
            stats: sStats,
          };
          if (sheetKey !== sheetName && !sheetsData[sheetName]) {
            sheetsData[sheetName] = sheetsData[sheetKey];
          }

          const taggedRows = cleanRows.map((r) => ({
            ...r,
            Sheet: sheetName,
            "Source File": file.originalname,
            "File Sheet": sheetKey,
          }));

          cleanHeaders.forEach((h) => headersSet.add(h));
          headersSet.add("Sheet");
          headersSet.add("Source File");
          if (req.files.length > 1) headersSet.add("File Sheet");
          rows = rows.concat(taggedRows);
        }
      }
    }

    const headers = Array.from(headersSet);

    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: "Files appear to be empty or unreadable." });
    }

    // Fill missing headers on combined rows so schema is uniform
    rows = rows.map((r) => {
      for (const h of headers) {
        if (!(h in r)) r[h] = null;
      }
      return r;
    });

    // Detect column types + stats over the full combined dataset
    const columnTypes = detectColumnTypes(headers, rows);
    const stats = computeStats(headers, rows, columnTypes);

    // Store parsed data
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
      sheetsData,
      uploadedAt: new Date().toISOString(),
    });

    // Auto-delete fallback after 24 hours
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
      preview: rows.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process files." });
  }
});

module.exports = router;
