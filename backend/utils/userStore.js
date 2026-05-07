// In-memory user storage (can be replaced with MongoDB/PostgreSQL)
let users = [];
let nextId = 1;

const userStore = {
  // Find user by email
  findByEmail: (email) => users.find(u => u.email === email),
  
  // Find user by ID
  findById: (id) => users.find(u => u.id === id),
  
  // Create new user
  create: (email, passwordHash, name) => {
    const user = {
      id: nextId++,
      email,
      passwordHash,
      name,
      createdAt: new Date(),
      filesAnalyzed: 0,
      lastLogin: null
    };
    users.push(user);
    return user;
  },
  
  // Update user
  update: (id, updates) => {
    const user = userStore.findById(id);
    if (user) {
      Object.assign(user, updates);
    }
    return user;
  },
  
  // Get all users (for admin dashboard)
  getAll: () => users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    filesAnalyzed: u.filesAnalyzed,
    lastLogin: u.lastLogin
  })),
  
  // Delete user
  delete: (id) => {
    const index = users.findIndex(u => u.id === id);
    if (index > -1) {
      users.splice(index, 1);
      return true;
    }
    return false;
  },
  
  // Count total users
  count: () => users.length
};

module.exports = userStore;
