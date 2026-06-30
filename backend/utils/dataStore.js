const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const mongoose = require("mongoose");

let FileData;
try {
  FileData = require("../models/FileData");
} catch (e) {
  console.error("[DataStore] Failed to load FileData model:", e);
}

const store = new Map();
const uploadsDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function getFilePath(key) {
  return path.join(uploadsDir, `dataStore_${key}.json`);
}

module.exports = {
  async set(key, value) {
    store.set(key, value);
    
    // Save to local disk as a fallback
    try {
      fs.writeFileSync(getFilePath(key), JSON.stringify(value, null, 2), "utf8");
    } catch (err) {
      console.error(`[DataStore Disk Fallback] Error writing file cache for key ${key}:`, err);
    }

    // Save to MongoDB with zlib compression
    try {
      if (mongoose.connection.readyState === 1 && FileData) {
        const compressedRows = zlib.gzipSync(JSON.stringify(value.rows));
        
        await FileData.findOneAndUpdate(
          { fileId: key },
          {
            fileId: key,
            originalName: value.originalName,
            headers: value.headers,
            compressedRows,
            columnTypes: value.columnTypes,
            stats: value.stats,
            rowCount: value.rowCount,
            uploadedAt: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`[DataStore MongoDB] Saved and compressed file data for key ${key}`);
      }
    } catch (err) {
      console.error(`[DataStore MongoDB] Error writing to DB for key ${key}:`, err);
    }
  },

  async get(key) {
    // 1. Check memory store
    if (store.has(key)) {
      return store.get(key);
    }

    // 2. Check MongoDB
    try {
      if (mongoose.connection.readyState === 1 && FileData) {
        const doc = await FileData.findOne({ fileId: key });
        if (doc) {
          const rows = JSON.parse(zlib.gunzipSync(doc.compressedRows).toString("utf8"));
          const reconstructed = {
            fileId: doc.fileId,
            originalName: doc.originalName,
            headers: doc.headers,
            rows,
            columnTypes: doc.columnTypes,
            stats: doc.stats,
            rowCount: doc.rowCount,
            uploadedAt: doc.uploadedAt
          };
          store.set(key, reconstructed); // cache in memory
          return reconstructed;
        }
      }
    } catch (err) {
      console.error(`[DataStore MongoDB] Error reading from DB for key ${key}:`, err);
    }

    // 3. Check local disk fallback
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        store.set(key, parsed);
        return parsed;
      } catch (err) {
        console.error(`[DataStore Disk Fallback] Error reading file cache for key ${key}:`, err);
      }
    }

    return null;
  },

  async delete(key) {
    store.delete(key);
    
    // Delete from local disk
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`[DataStore Disk Fallback] Error deleting file cache for key ${key}:`, err);
      }
    }

    // Delete from MongoDB
    try {
      if (mongoose.connection.readyState === 1 && FileData) {
        await FileData.deleteOne({ fileId: key });
        console.log(`[DataStore MongoDB] Deleted file data for key ${key}`);
      }
    } catch (err) {
      console.error(`[DataStore MongoDB] Error deleting from DB for key ${key}:`, err);
    }

    return true;
  },

  async has(key) {
    if (store.has(key)) return true;
    try {
      if (mongoose.connection.readyState === 1 && FileData) {
        const count = await FileData.countDocuments({ fileId: key });
        if (count > 0) return true;
      }
    } catch (e) {
      console.error("[DataStore MongoDB] Error counting files:", e);
    }
    return fs.existsSync(getFilePath(key));
  },

  size() {
    return store.size;
  }
};
