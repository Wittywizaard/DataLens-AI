import React, { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthModal({ isOpen, onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const payload = isLogin ? { email, password } : { email, password, name };
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      
      onLogin(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // In a real app, this would redirect to Google OAuth flow
    alert("Google OAuth flow would initiate here. Please use email/password for this demo.");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: 32, maxWidth: 400, width: "100%", animation: "fadeUp .4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text4)", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>
        
        <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24, lineHeight: 1.6 }}>
          {isLogin ? "Sign in to save your analysis and datasets." : "Join to persist your data analysis securely."}
        </p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: 12, color: "#fca5a5", fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {!isLogin && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)" }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                required
                style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", transition: "border 0.2s" }}
              />
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", transition: "border 0.2s" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", transition: "border 0.2s" }}
            />
          </div>
          <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "all 0.2s", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div style={{ position: "relative", textAlign: "center", marginBottom: 24 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: "1px solid var(--border)" }}></div>
          <span style={{ position: "relative", background: "var(--bg2)", padding: "0 10px", color: "var(--text3)", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>Or</span>
        </div>

        <button type="button" onClick={handleGoogleLogin} style={{ width: "100%", background: "#fff", color: "#000", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
