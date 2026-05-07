// Simple in-memory store
// For production, replace with Redis:
//   const Redis = require('ioredis');
//   const client = new Redis(process.env.REDIS_URL);

const store = new Map();

module.exports = {
  set(key, value) {
    store.set(key, value);
  },
  get(key) {
    return store.get(key) || null;
  },
  delete(key) {
    return store.delete(key);
  },
  has(key) {
    return store.has(key);
  },
  size() {
    return store.size;
  },
};
