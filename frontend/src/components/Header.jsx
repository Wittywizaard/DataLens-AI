import React from "react";

export function Header({ onSettingsOpen, user, onAuthOpen, onSignOut }) {
  return (
    <header style={{ 
      height: 72, 
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
      padding: "0 40px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <div style={{ 
          width: 36, height: 36, 
          background: "linear-gradient(135deg, var(--accent), var(--accent2))", 
          borderRadius: 10, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: 20,
          boxShadow: "0 0 20px var(--glow)"
        }}>✦</div>
        <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text)" }}>DataLens AI</span>
      </div>
      
      <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {[
          { name: "Features", id: "features" }
        ].map(link => (
          <a key={link.name} href={`#${link.id}`} style={{ fontSize: 14, color: "var(--text3)", fontWeight: 500, transition: "color 0.2s", textDecoration: "none" }} 
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
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 14 }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{user.name}</span>
            </div>
            <button style={{ 
              background: "rgba(239,68,68,0.1)", 
              border: "1px solid rgba(239,68,68,0.2)", 
              color: "#fca5a5", 
              padding: "8px 20px", 
              borderRadius: 10, 
              fontSize: 13, 
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={onSignOut}
            onMouseOver={e => { e.target.style.background="rgba(239,68,68,0.15)"; e.target.style.borderColor="rgba(239,68,68,0.3)"; }}
            onMouseOut={e => { e.target.style.background="rgba(239,68,68,0.1)"; e.target.style.borderColor="rgba(239,68,68,0.2)"; }}>
              Sign Out
            </button>
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
