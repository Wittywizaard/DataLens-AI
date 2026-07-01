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
      height: 56, 
      borderBottom: "1px solid var(--border)", 
      background: "rgba(3, 3, 11, 0.7)", 
      backdropFilter: "blur(12px)", 
      WebkitBackdropFilter: "blur(12px)",
      position: "fixed", 
      width: "100%",
      top: 0, 
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      padding: "0 24px"
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
        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
      >
        <div style={{ 
          width: 36, height: 36, 
          background: "linear-gradient(135deg, var(--accent), var(--accent2))", 
          borderRadius: 10, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: 20,
          boxShadow: "0 0 20px var(--glow)",
          color: "white"
        }}>✦</div>
        <span className="header-logo-text" style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>DataLens AI</span>
      </Link>
      <div style={{ flex: 1 }} />
      
      <nav className="header-nav" style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {[
          { name: "Features", id: "features" }
        ].map(link => (
          <a key={link.name} className="header-nav-link" href={`#${link.id}`} style={{ fontSize: 14, color: "var(--text3)", fontWeight: 500, transition: "color 0.2s", textDecoration: "none" }} 
             onMouseOver={e => e.target.style.color = "var(--accent)"} 
             onMouseOut={e => e.target.style.color = "var(--text3)"}>
            {link.name}
          </a>
        ))}
        <button 
          onClick={onSettingsOpen}
          style={{ 
            background: "none", border: "none", color: "var(--text3)", 
            fontSize: 18, cursor: "pointer", display: "flex", transition: "all 0.2s" 
          }}
          onMouseOver={e => e.target.style.color = "var(--accent)"}
          onMouseOut={e => e.target.style.color = "var(--text3)"}
        >
          ⚙️
        </button>
        {user ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ 
                width: 38, height: 38, borderRadius: "50%", 
                background: "linear-gradient(135deg, var(--accent), var(--accent2))", 
                display: "flex", alignItems: "center", justifyContent: "center", 
                fontWeight: 700, color: "#fff", fontSize: 15, cursor: "pointer",
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
            padding: "8px 20px", 
            borderRadius: 10, 
            fontSize: 13, 
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
