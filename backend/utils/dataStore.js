const fs = require("fs");
const path = require("path");

const store = new Map();
const uploadsDir = path.join(__dirname, "../uploads");

// Ensure uploads dir exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function getFilePath(key) {
  return path.join(uploadsDir, `dataStore_${key}.json`);
}

// Clean up expired cache files from disk at startup
try {
  const files = fs.readdirSync(uploadsDir);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const file of files) {
    if (file.startsWith("dataStore_") && file.endsWith(".json")) {
      const filePath = path.join(uploadsDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[DataStore Startup Cleanup] Deleted expired cache file: ${file}`);
      }
    }
  }
} catch (err) {
  console.error("[DataStore Startup Cleanup] Error during cleanup:", err);
}

module.exports = {
  set(key, value) {
    store.set(key, value);
    try {
      fs.writeFileSync(getFilePath(key), JSON.stringify(value, null, 2), "utf8");
    } catch (err) {
      console.error(`[DataStore] Error writing file cache for key ${key}:`, err);
    }
  },
  get(key) {
    if (store.has(key)) {
      return store.get(key);
    }
    // Try to load from disk
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        store.set(key, parsed); // populate in-memory map
        return parsed;
      } catch (err) {
        console.error(`[DataStore] Error reading file cache for key ${key}:`, err);
      }
    }
    return null;
  },
  delete(key) {
    store.delete(key);
    const filePath = getFilePath(key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`[DataStore] Error deleting file cache for key ${key}:`, err);
      }
    }
    return true;
  },
  has(key) {
    if (store.has(key)) return true;
    return fs.existsSync(getFilePath(key));
  },
  size() {
    return store.size;
  },
};
