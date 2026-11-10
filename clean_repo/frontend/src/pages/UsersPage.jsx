import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/Users.module.css";
import axios from "axios";

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`${API_BASE}/auth/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        setError("Failed to delete user");
      }
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1>👥 User Management</h1>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.stats}>
        <div className={styles.stat}>Total Users: <strong>{users.length}</strong></div>
      </div>
      
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Files Analyzed</th>
            <th>Joined</th>
            <th>Last Login</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.filesAnalyzed || 0}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</td>
              <td>
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteUser(user.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
