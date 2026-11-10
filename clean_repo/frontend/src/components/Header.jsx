import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export function Header({ onSettingsOpen, user, onAuthOpen, onSignOut, onLogoClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="main-header" style={{ 
      height: 72, 
      borderBottom: "none", 
      background: "transparent", 
      backdropFilter: "none", 
      WebkitBackdropFilter: "none",
      position: "fixed", 
      width: "100%",
      top: 0, 
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      padding: "0 32px"
    }}>
      <Link 
        to="/" 
        onClick={(e) => {
          if (window.location.pathname === "/") {
            e.preventDefault();
          }
          if (onLogoClick) {
            onLogoClick();
          }
        }} 
        style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none" }}
      >
        <div style={{ 
          width: 44, height: 44, 
          background: "linear-gradient(135deg, #f59e0b, #d97706)", 
          borderRadius: 12, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: 24,
          boxShadow: "0 0 20px rgba(245, 158, 11, 0.4)",
          color: "white"
        }}>✦</div>
        <span className="header-logo-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>DataLens AI</span>
      </Link>
      <div style={{ flex: 1 }} />
      
      <nav className="header-nav" style={{ display: "flex", gap: 28, alignItems: "center" }}>
        <button 
          onClick={onSettingsOpen}
          style={{ 
            background: "none", border: "none", color: "#a78bfa", 
            fontSize: 22, cursor: "pointer", display: "flex", transition: "all 0.2s" 
          }}
          onMouseOver={e => e.target.style.color = "var(--accent)"}
          onMouseOut={e => e.target.style.color = "#a78bfa"}
        >
          ⚙️
        </button>
        {user ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ 
                width: 42, height: 42, borderRadius: "50%", 
                background: "linear-gradient(135deg, var(--accent), var(--accent2))", 
                display: "flex", alignItems: "center", justifyContent: "center", 
                fontWeight: 700, color: "#fff", fontSize: 16, cursor: "pointer",
                border: "2px solid transparent", transition: "all 0.2s",
                boxShadow: isMenuOpen ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "none"
              }}
              onMouseOver={e => e.target.style.transform = "scale(1.05)"}
              onMouseOut={e => e.target.style.transform = "none"}
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
            
            {isMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 12px)", right: 0,
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 16, overflow: "hidden", minWidth: 180,
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)", animation: "fadeUp 0.2s ease"
              }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border2)", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</span>
                </div>
                <div style={{ padding: 6, display: "flex", flexDirection: "column" }}>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} style={{ textDecoration: "none", color: "var(--text2)", fontSize: 13, fontWeight: 500, padding: "10px 12px", textAlign: "left", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }} onMouseOver={e => { e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.color = "var(--text)"; }} onMouseOut={e => { e.target.style.background = "none"; e.target.style.color = "var(--text2)"; }}>
                    <span style={{ fontSize: 16 }}>👤</span> My Profile
                  </Link>
                  <button onClick={() => { setIsMenuOpen(false); onSettingsOpen(); }} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: 13, fontWeight: 500, padding: "10px 12px", textAlign: "left", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }} onMouseOver={e => { e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.color = "var(--text)"; }} onMouseOut={e => { e.target.style.background = "none"; e.target.style.color = "var(--text2)"; }}>
                    <span style={{ fontSize: 16 }}>⚙️</span> Preferences
                  </button>
                  <button onClick={() => { setIsMenuOpen(false); onSignOut(); }} style={{ background: "none", border: "none", color: "#fca5a5", fontSize: 13, fontWeight: 500, padding: "10px 12px", textAlign: "left", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }} onMouseOver={e => e.target.style.background = "rgba(239,68,68,0.1)"} onMouseOut={e => e.target.style.background = "none"}>
                    <span style={{ fontSize: 16 }}>👋</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button style={{ 
            background: "rgba(255,255,255,0.03)", 
            border: "1px solid var(--border2)", 
            color: "var(--text2)", 
            padding: "10px 24px", 
            borderRadius: 12, 
            fontSize: 14, 
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onClick={onAuthOpen}
          onMouseOver={e => { e.target.style.background="rgba(255,255,255,0.06)"; e.target.style.borderColor="var(--border3)"; }}
          onMouseOut={e => { e.target.style.background="rgba(255,255,255,0.03)"; e.target.style.borderColor="var(--border2)"; }}>
            Sign In
          </button>
        )}
      </nav>
    </header>
  );
}
