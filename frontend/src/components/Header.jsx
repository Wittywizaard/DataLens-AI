import React from "react";

export function Header() {
  return (
    <header style={{ 
      height: 72, 
      borderBottom: "1px solid var(--border)", 
      background: "rgba(3, 3, 11, 0.7)", 
      backdropFilter: "blur(12px)", 
      WebkitBackdropFilter: "blur(12px)",
      position: "sticky", 
      top: 0, 
      zIndex: 100,
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
      
      <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
        {[
          { name: "How It Works", id: "how-it-works" },
          { name: "Features", id: "features" },
          { name: "Security", id: "security" }
        ].map(link => (
          <a key={link.name} href={`#${link.id}`} style={{ fontSize: 14, color: "var(--text3)", fontWeight: 500, transition: "color 0.2s" }} 
             onMouseOver={e => e.target.style.color = "var(--accent)"} 
             onMouseOut={e => e.target.style.color = "var(--text3)"}>
            {link.name}
          </a>
        ))}
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
        onMouseOver={e => { e.target.style.background="rgba(255,255,255,0.06)"; e.target.style.borderColor="var(--border3)"; }}
        onMouseOut={e => { e.target.style.background="rgba(255,255,255,0.03)"; e.target.style.borderColor="var(--border2)"; }}>
          Sign In
        </button>
      </nav>
    </header>
  );
}
