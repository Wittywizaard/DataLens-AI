import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("authToken"));

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.user);
    } catch (err) {
      localStorage.removeItem("authToken");
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, name) => {
    const res = await axios.post(`${API_BASE}/auth/signup`, {
      email,
      password,
      name
    });
    localStorage.setItem("authToken", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    localStorage.setItem("authToken", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
  };

  const loginWithToken = async (newToken) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      setUser(res.data.user);
    } catch (err) {
      localStorage.removeItem("authToken");
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}
