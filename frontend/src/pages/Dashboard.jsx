import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { useDropzone } from "react-dropzone";
import html2canvas from "html2canvas";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { Header } from "../components/Header";
import { AuthModal } from "../components/AuthModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const PALETTES = {
  "Midnight Gold": ["#f59e0b","#fbbf24","#facc15","#ea580c","#d97706","#78350f","#b45309","#a16207","#ca8a04","#eab308","#fb923c","#fdba74", "#fde68a", "#fef3c7", "#fffbeb"],
  "Ocean Blue": ["#0ea5e9","#38bdf8","#0284c7","#0369a1","#0c4a6e","#7dd3fc","#bae6fd","#075985","#2dd4bf","#14b8a6","#0f766e", "#3b82f6", "#2563eb", "#1d4ed8", "#eff6ff"],
  "Emerald Green": ["#10b981","#34d399","#059669","#047857","#064e3b","#6ee7b7","#a7f3d0","#065f46","#84cc16","#65a30d","#4d7c0f", "#22c55e", "#16a34a", "#15803d", "#f0fdf4"],
  "Cyberpunk Neon": ["#c026d3","#d946ef","#a21caf","#86198f","#4a044e","#f0abfc","#fae8ff","#e879f9","#4f46e5","#6366f1","#4338ca","#3730a3", "#f43f5e", "#e11d48", "#fff0f2"],
  "Pastel Dream": ["#fca5a5","#fcd34d","#fef08a","#a7f3d0","#99f6e4","#bae6fd","#c7d2fe","#ddd6fe","#fbcfe8","#fecdd3","#fed7aa","#d9f99d", "#bfdbfe", "#e9d5ff", "#fdf4ff"]
};

const CHART_MAP = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut, scatter: Scatter };

const baseOpts = (isRadial) => ({
  responsive: true, maintainAspectRatio: false,
  width: isRadial ? 300 : 400, height: isRadial ? 250 : 300,
  animation: { duration: 600, easing: "easeInOutQuart" },
  plugins: {
    legend: { labels: { color: "#b4b4cf", font: { family: "'JetBrains Mono'", size: 11 }, padding: 20, boxWidth: 10 } },
    tooltip: { backgroundColor: "#0d0d1f", titleColor: "#ffffff", bodyColor: "#b4b4cf", borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, padding: 12, cornerRadius: 10 },
  },
  ...(isRadial ? {} : {
    scales: {
      x: { ticks: { color: "#71719a", font: { size: 11 }, maxRotation: 40 }, grid: { color: "rgba(255,255,255,0.03)" }, border: { color: "rgba(255,255,255,0.08)" } },
      y: { ticks: { color: "#71719a", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.03)" }, border: { color: "rgba(255,255,255,0.08)" } },
    },
  }),
});

function Spinner() {
  return <div style={{ width:18, height:18, border:"2px solid #ffffff20", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin .7s linear infinite" }} />;
}

function ThinkingDots() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block", animation:`dot 1.2s ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

function AnalyzingState() {
  const [textIndex, setTextIndex] = useState(0);
  const loadingTexts = [
    "Reading dataset context...",
    "Extracting key insights...",
    "Running multi-variate analysis...",
    "Generating visual charts...",
    "Finalizing report..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => Math.min(prev + 1, loadingTexts.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, animation:"fadeUp .3s ease", padding: "12px 18px", background: "rgba(255,255,255,0.02)", borderRadius: "18px 18px 18px 4px", width: "fit-content", border: "1px solid var(--border)" }}>
      <ThinkingDots />
      <span style={{ fontSize: 13, color: "var(--text3)", fontFamily: "var(--mono)", fontWeight: 500, letterSpacing: "0.02em" }}>
        {loadingTexts[textIndex]}
      </span>
    </div>
  );
}

function InsightCard({ label, value, trend, color }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.02)", borderLeft:`4px solid ${color}`, borderTop:"1px solid var(--border)", borderRight:"1px solid var(--border)", borderBottom:"1px solid var(--border)", borderRadius:16, padding:"20px", flex:1, minWidth:0, animation:"fadeUp .4s ease" }}>
      <div style={{ fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:700, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color, letterSpacing:"-0.02em", textShadow: `0 0 15px ${color}40` }}>{value}</div>
      {trend && (
        <div style={{ fontSize:12, color: trend.startsWith("+") ? "#10b981" : "#ef4444", marginTop:6, fontWeight:600 }}>
          {trend} from previous period
        </div>
      )}
    </div>
  );
}

function ChartBlock({ config, colors }) {
  const chartRef = useRef(null);
  const isRadial = ["pie","doughnut"].includes(config.type);
  const Comp = CHART_MAP[config.type];
  if (!Comp) return null;

  const handleDownload = async () => {
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: '#0c0c1d' });
        const link = document.createElement('a');
        link.download = `${config.title || 'chart'}.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const labels = Array.isArray(config.labels) ? config.labels : [];
  const data = {
    labels,
    datasets: (Array.isArray(config.datasets) ? config.datasets : []).map((ds, i) => {
      const cleanData = (Array.isArray(ds.data) ? ds.data : []).map(v => {
        if (typeof v === "object" && v !== null && "x" in v) return v;
        const n = parseFloat(v); return isNaN(n) ? 0 : n;
      });
      let bgColor;
      if (isRadial || config.type === "bar") {
        bgColor = labels.map((_, j) => colors[(j + i) % colors.length]);
      } else {
        bgColor = colors[i % colors.length];
      }
      return {
        label: ds.label || "Value",
        data: cleanData,
        backgroundColor: bgColor,
        borderColor: isRadial ? "#05050f" : (config.type === "bar" ? bgColor : colors[i % colors.length]),
        borderWidth: isRadial ? 2 : config.type === "line" ? 2.5 : 1,
        fill: config.type === "line" ? false : undefined,
        tension: 0.4,
        pointRadius: config.type === "line" ? 4 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: colors[i % colors.length],
        hoverOffset: isRadial ? 10 : 0,
      };
    }),
  };

  return (
    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)", backdropFilter:"blur(10px)", borderRadius:20, padding:"24px", marginTop:16, position: "relative" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        {config.title && (
          <div style={{ fontSize:14, fontFamily:"var(--mono)", color:"var(--accent)", fontWeight:600 }}>
            <span style={{ marginRight:8 }}>✦</span>{config.title}
          </div>
        )}
        <button
          onClick={handleDownload}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px var(--glow)'
          }}
          onMouseOver={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.filter = 'brightness(1.1)'; }}
          onMouseOut={(e) => { e.target.style.transform = 'none'; e.target.style.filter = 'none'; }}
        >
          Download
        </button>
      </div>
      <div ref={chartRef} style={{ padding: "0 10px" }}>
        <Comp data={data} options={baseOpts(isRadial)} />
      </div>
    </div>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX:"auto", marginTop:14, borderRadius:16, border:"1px solid var(--border)", background:"var(--glass)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"var(--mono)" }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ background:"var(--bg3)", color:"var(--accent)", padding:"12px 16px", textAlign:"left", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap", fontWeight:600 }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0,20).map((row,i) => (
            <tr key={i} style={{ background: i%2===0?"transparent":"rgba(255,255,255,0.01)" }}>
              {row.map((v,j) => <td key={j} style={{ padding:"10px 16px", color:"var(--text2)", borderBottom:"1px solid rgba(255,255,255,0.03)", whiteSpace:"nowrap" }}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessageBubble({ msg, colors }) {
  if (msg.role === "user") return (
    <div style={{ display:"flex", justifyContent:"flex-end", animation:"fadeUp .3s ease" }}>
      <div style={{ background:"linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius:"18px 18px 4px 18px", padding:"12px 18px", maxWidth:"75%", fontSize:14, lineHeight:1.6, boxShadow:"0 4px 20px var(--glow)", color: "#fff" }}>
        {msg.content}
      </div>
    </div>
  );

  if (msg.role === "error") return (
    <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:16, padding:"16px 20px", fontSize:14, color:"#fca5a5", animation:"fadeUp .3s ease", display:"flex", gap:12, alignItems:"center" }}>
      <span style={{ fontSize:18 }}>⚠️</span>
      <div>
        <div style={{ fontWeight:700, marginBottom:2 }}>Analysis Error</div>
        <div style={{ opacity:0.8, lineHeight:1.5 }}>{msg.content}</div>
      </div>
    </div>
  );

  const { result } = msg;
  if (!result) return null;

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:32, height:32, background:"linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:"0 4px 12px var(--glow)" }}>✦</div>
        <span style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700 }}>DataLens Intelligence</span>
      </div>

      {result.summary && (
        <p style={{ fontSize:14, lineHeight:1.7, color:"#c4c2df", marginBottom:14 }}>{result.summary}</p>
      )}

      {result.insights?.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, marginBottom:4 }}>
          {result.insights.map((ins,i) => <InsightCard key={i} {...ins} color={colors[i % colors.length]} />)}
        </div>
      )}

      {result.chartConfig?.type && <ChartBlock config={result.chartConfig} colors={colors} />}

      {result.tableData?.headers && result.tableData?.rows && (
        <DataTable headers={result.tableData.headers} rows={result.tableData.rows} />
      )}
    </div>
  );
}

function UploadZone({ onUpload, uploading, progress }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv":[".csv"], "text/tab-separated-values":[".tsv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"], "application/vnd.ms-excel":[".xls"] },
    maxFiles: 10, maxSize: 1024*1024*1024, disabled: uploading, // 1GB
    onDrop: (f) => f && f.length > 0 && onUpload(f),
  });

  return (
    <div {...getRootProps()} style={{
      border: `2px dashed ${isDragActive ? "var(--accent)" : "var(--border2)"}`,
      borderRadius: 40, padding: "80px 44px", textAlign: "center",
      cursor: uploading ? "default" : "pointer",
      background: isDragActive ? "rgba(139, 92, 246, 0.08)" : "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
      transition: "all .4s cubic-bezier(0.4, 0, 0.2, 1)",
      outline: "none",
      boxShadow: isDragActive ? "0 0 60px rgba(139, 92, 246, 0.15)" : "0 20px 80px rgba(0,0,0,0.3)",
      maxWidth: 800,
      margin: "0 auto",
      minWidth: 320,
      minHeight: 400,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden"
    }}>
      <input {...getInputProps()} />
      {uploading ? (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          <div style={{ position:"relative", width:84, height:84, margin:"0 auto 24px" }}>
            <svg viewBox="0 0 72 72" style={{ width:84, height:84, transform:"rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="32" fill="none" stroke="var(--border2)" strokeWidth="3"/>
              <circle cx="36" cy="36" r="32" fill="none" stroke="var(--accent)" strokeWidth="3"
                strokeDasharray={`${(progress/100)*201} 201`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.3s ease" }}/>
            </svg>
            <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontFamily:"var(--mono)", color:"var(--accent)", fontWeight:700 }}>{progress}%</span>
          </div>
          <p style={{ color:"var(--text2)", fontSize:15, fontWeight:500 }}>Decrypting data streams…</p>
        </div>
      ) : (
        <>
          <div style={{ width:110, height:110, background:"rgba(139, 92, 246, 0.12)", border:"1px solid rgba(139, 92, 246, 0.25)", borderRadius:30, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 30px", fontSize:40, color:"var(--accent)", transition: "all 0.3s ease", transform: isDragActive ? "scale(1.1)" : "none" }}>
            {isDragActive ? "🚀" : "☁️"}
          </div>
          <p style={{ fontSize:28, fontWeight:800, marginBottom:12, color:"var(--text)", letterSpacing:"-0.02em" }}>
            {isDragActive ? "Release to analyze" : "Power up your data"}
          </p>
          <p style={{ fontSize:16, color:"var(--text3)", marginBottom:32, maxWidth:560, marginLeft:"auto", marginRight:"auto", lineHeight:1.6 }}>
            Drop your CSV or Excel file here to unlock instant AI-powered visualizations and deep data insights.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {[".csv",".xlsx",".xls",".tsv"].map(f => (
              <span key={f} style={{ fontSize:12, fontFamily:"var(--mono)", padding:"8px 18px", borderRadius:100, background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--text3)", fontWeight:500 }}>{f}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Workspace({ fileInfo, messages, analyzing, uploading, progress, onQuery, onUpload, onSettingsOpen, theme, onThemeChange }) {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const headers = fileInfo?.headers ?? [];
  const columnTypes = fileInfo?.columnTypes ?? {};
  const stats = fileInfo?.stats ?? {};
  const preview = fileInfo?.preview ?? [];
  const rowCount = fileInfo?.rowCount ?? 0;
  const originalName = fileInfo?.originalName ?? "Uploaded file";

  const numCols = headers.filter(h => columnTypes[h] === "numeric");
  const catCols = headers.filter(h => columnTypes[h] !== "numeric");

  const suggestions = (() => {
    const s = [];
    if (numCols.length && catCols.length) { s.push(`Bar chart of ${numCols[0]} by ${catCols[0]}`); s.push(`Pie chart of ${catCols[0]} distribution`); }
    if (numCols.length >= 2) s.push(`Compare ${numCols[0]} vs ${numCols[1]}`);
    s.push("Show summary statistics"); s.push("What trends do you see?");
    if (numCols.length && catCols.length) s.push(`Top 10 by ${numCols[0]}`);
    return s.slice(0,6);
  })();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, analyzing]);

  const submit = () => {
    const q = input.trim();
    if (!q || analyzing) return;
    setInput(""); onQuery(q); inputRef.current?.focus();
  };

  const exportPDF = () => {
    if (!messagesRef.current) return;
    
    const filename = window.prompt("Enter a name for your PDF report:", "DataLens_Report");
    if (filename === null) return; // User cancelled
    
    // Add temporary styles for PDF rendering to fix dark mode
    const el = messagesRef.current.cloneNode(true);
    el.style.padding = "20px";
    el.style.background = "#05050f";
    el.style.color = "#ffffff";
    el.style.height = "auto";
    el.style.overflow = "visible";

    // Fix missing charts: Convert canvases to images since cloned DOM loses canvas context
    const originalCanvases = messagesRef.current.querySelectorAll('canvas');
    const clonedCanvases = el.querySelectorAll('canvas');
    originalCanvases.forEach((canvas, index) => {
      const img = document.createElement('img');
      img.src = canvas.toDataURL("image/png", 1.0);
      img.style.width = canvas.style.width || canvas.width + 'px';
      img.style.height = canvas.style.height || canvas.height + 'px';
      img.style.display = 'block';
      img.style.margin = '0 auto';
      clonedCanvases[index].parentNode.replaceChild(img, clonedCanvases[index]);
    });
    
    html2pdf().from(el).set({
      margin: 15,
      filename: `${filename.trim() || 'DataLens_Report'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#05050f', windowWidth: 1000 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).save();
    setShowExportOptions(false);
  };

  const exportDOC = () => {
    if (!messagesRef.current) return;
    
    const filename = window.prompt("Enter a name for your Word document:", "DataLens_Report");
    if (filename === null) return;
    
    // Fix missing charts: Convert canvases to images
    const el = messagesRef.current.cloneNode(true);
    const originalCanvases = messagesRef.current.querySelectorAll('canvas');
    const clonedCanvases = el.querySelectorAll('canvas');
    originalCanvases.forEach((canvas, index) => {
      const img = document.createElement('img');
      img.src = canvas.toDataURL("image/png");
      img.style.width = "100%"; // Fit word document
      img.style.maxWidth = "600px";
      clonedCanvases[index].parentNode.replaceChild(img, clonedCanvases[index]);
    });

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title><style>body { font-family: sans-serif; background: #05050f; color: #ffffff; }</style></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + el.innerHTML + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${filename.trim() || 'DataLens_Report'}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    setShowExportOptions(false);
  };

  const exportTXT = () => {
    const filename = window.prompt("Enter a name for your text report:", "DataLens_Report");
    if (filename === null) return;
    
    let text = "DataLens AI Analysis Report\n============================\n\n";
    messages.forEach(msg => {
      if (msg.role === "user") text += `User: ${msg.content}\n\n`;
      if (msg.role === "assistant" && msg.result) {
        text += `DataLens:\n`;
        if (msg.result.summary) text += `${msg.result.summary}\n`;
        if (msg.result.insights?.length) {
          msg.result.insights.forEach(ins => text += `- ${ins.label}: ${ins.value}\n`);
        }
        text += `\n`;
      }
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename.trim() || 'DataLens_Report'}.txt`;
    a.click();
    setShowExportOptions(false);
  };

  return (
    <div className="workspace-container">
      <div className="workspace-sidebar">
        <div style={{ padding:"20px", borderBottom:"1px solid var(--border)", flexShrink:0, background:"rgba(255,255,255,0.01)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"rgba(139, 92, 246, 0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:"1px solid rgba(139, 92, 246, 0.2)" }}>📄</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"var(--text)" }}>{originalName}</div>
              <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)", marginTop:2, fontWeight:500 }}>{rowCount.toLocaleString()} entries · {headers.length} properties</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
            {numCols.length > 0 && <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 8px", borderRadius:100, background:"rgba(6,182,212,.12)", border:"1px solid rgba(6,182,212,.2)", color:"#06b6d4" }}>📊 {numCols.length} numeric</span>}
            {catCols.length > 0 && <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 8px", borderRadius:100, background:"rgba(124,58,237,.12)", border:"1px solid rgba(124,58,237,.2)", color:"#a78bfa" }}>🏷 {catCols.length} categorical</span>}
          </div>
        </div>

        <div style={{ display:"flex", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          {["preview","columns"].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{ flex:1, padding:"12px", fontSize:12, fontWeight:700, color: activeTab===tab?"var(--accent)":"var(--text3)", borderBottom: activeTab===tab?"2px solid var(--accent)":"2px solid transparent", transition:"all 0.2s", background: activeTab===tab?"rgba(139, 92, 246, 0.05)":"none", textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflow:"auto" }}>
          {activeTab==="preview" && (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:"'JetBrains Mono'" }}>
                <thead><tr>{headers.map(h=><th key={h} style={{ background:"#111128", color:"#7c3aed", padding:"7px 10px", textAlign:"left", borderBottom:"1px solid #ffffff0f", whiteSpace:"nowrap", position:"sticky", top:0 }}>{h}</th>)}</tr></thead>
                <tbody>{(preview||[]).map((row,i)=><tr key={i}>{headers.map(h=><td key={h} style={{ padding:"6px 10px", color:"#5c5a7a", borderBottom:"1px solid #ffffff05", whiteSpace:"nowrap", maxWidth:100, overflow:"hidden", textOverflow:"ellipsis" }}>{String(row[h]??"")} </td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
          {activeTab==="columns" && (
            <div>
              {headers.map(h => {
                const type = columnTypes[h]; const s = stats[h];
                return (
                  <div key={h} style={{ padding:"12px 16px", borderBottom:"1px solid #ffffff05" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h}</span>
                      <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 7px", borderRadius:100, background: type==="numeric"?"rgba(6,182,212,.12)":"rgba(124,58,237,.12)", color: type==="numeric"?"#06b6d4":"#a78bfa", flexShrink:0 }}>{type}</span>
                    </div>
                    {type==="numeric" && s && <div style={{ fontSize:11, color:"#5c5a7a", fontFamily:"'JetBrains Mono'", display:"flex", gap:10, flexWrap:"wrap" }}>
                      <span>min <b style={{color:"#a09dbe"}}>{s.min?.toFixed(1)}</b></span>
                      <span>max <b style={{color:"#a09dbe"}}>{s.max?.toFixed(1)}</b></span>
                      <span>avg <b style={{color:"#a09dbe"}}>{s.mean?.toFixed(1)}</b></span>
                    </div>}
                    {type!=="numeric" && s && <div style={{ fontSize:11, color:"#5c5a7a", fontFamily:"'JetBrains Mono'" }}>
                      <span><b style={{color:"#a09dbe"}}>{s.unique}</b> unique · top: <b style={{color:"#a09dbe"}}>"{s.topValues?.[0]?.val}"</b></span>
                    </div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: "#05050f", position: "relative" }}>
        {/* Workspace Header Bar */}
        <div className="chat-header">
          <div className="hide-on-mobile" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }}></span>
            <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>Session active</span>
          </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => {setShowThemeOptions(!showThemeOptions); setShowExportOptions(false);}} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.03)"}>
                🎨 Theme
              </button>
              {showThemeOptions && (
                <div style={{ position: "absolute", top: "110%", right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", zIndex: 100, display: "flex", flexDirection: "column", minWidth: 160, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                  {Object.keys(PALETTES).map(paletteName => (
                    <button key={paletteName} onClick={() => { onThemeChange(paletteName); setShowThemeOptions(false); }} style={{ padding: "10px 16px", background: theme === paletteName ? "rgba(255,255,255,0.08)" : "none", border: "none", color: "var(--text)", fontSize: 12, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => theme !== paletteName && (e.target.style.background="rgba(255,255,255,0.05)")} onMouseLeave={e => theme !== paletteName && (e.target.style.background="none")}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: PALETTES[paletteName][0] }}></span>
                      {paletteName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => {setShowExportOptions(!showExportOptions); setShowThemeOptions(false);}} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.03)"}>
                📥 Export Report
              </button>
              {showExportOptions && (
                <div style={{ position: "absolute", top: "110%", right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", zIndex: 100, display: "flex", flexDirection: "column", minWidth: 120, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
                  <button onClick={exportPDF} style={{ padding: "10px 16px", background: "none", border: "none", color: "var(--text)", fontSize: 12, textAlign: "left", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e => e.target.style.background="none"}>PDF Document</button>
                  <button onClick={exportDOC} style={{ padding: "10px 16px", background: "none", border: "none", color: "var(--text)", fontSize: 12, textAlign: "left", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e => e.target.style.background="none"}>Word (.doc)</button>
                  <button onClick={exportTXT} style={{ padding: "10px 16px", background: "none", border: "none", color: "var(--text)", fontSize: 12, textAlign: "left", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e => e.target.style.background="none"}>Plain Text</button>
                </div>
              )}
            </div>
            <button onClick={onSettingsOpen} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "8px", borderRadius: 12, fontSize: 18, transition: "all 0.2s", cursor: "pointer", display: "flex" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.03)"}>
              ⚙️
            </button>
            <div style={{ position: "relative" }}>
              <input 
                type="file"
                multiple 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                accept=".csv,.tsv,.xlsx,.xls" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUpload(Array.from(e.target.files));
                  }
                  e.target.value = null;
                }}
              />
              <button onClick={() => fileInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.03)"}>
                ↺ New file
              </button>
            </div>
        </div>

        <div ref={messagesRef} style={{ flex:1, overflow:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20, position: "relative" }}>

          {uploading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(5,5,15,0.85)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", borderRadius: "16px" }}>
              <div style={{ position:"relative", width:84, height:84, margin:"0 auto 24px" }}>
                <svg viewBox="0 0 72 72" style={{ width:84, height:84, transform:"rotate(-90deg)" }}>
                  <circle cx="36" cy="36" r="32" fill="none" stroke="var(--border2)" strokeWidth="3"/>
                  <circle cx="36" cy="36" r="32" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray={`${(progress/100)*201} 201`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.3s ease" }}/>
                </svg>
                <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontFamily:"var(--mono)", color:"var(--accent)", fontWeight:700 }}>{progress}%</span>
              </div>
              <p style={{ color:"#fff", fontSize:16, fontWeight:600 }}>Analyzing new data stream…</p>
            </div>
          )}

          {messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, textAlign: "center", paddingBottom: 40 }}>
              <div style={{ fontSize: 48, filter: "drop-shadow(0 0 20px var(--glow))" }}>✦</div>
              <div>
                <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Ask anything about your data</h2>
                <p style={{ fontSize: 16, color: "var(--text3)" }}>Try one of these or type your own question</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 800, width: "100%", marginTop: 12 }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => onQuery(s)} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: "20px", borderRadius: 16, color: "var(--text2)", fontSize: 13, fontWeight: 600, textAlign: "left", transition: "all 0.2s", lineHeight: 1.4 }} onMouseEnter={e => { e.target.style.background="rgba(255,255,255,0.04)"; e.target.style.borderColor="var(--accent)"; }} onMouseLeave={e => { e.target.style.background="rgba(255,255,255,0.02)"; e.target.style.borderColor="var(--border)"; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m,i) => <MessageBubble key={i} msg={m} colors={PALETTES[theme]} />)}
              {analyzing && <AnalyzingState />}
            </>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ borderTop:"1px solid var(--border)", padding:"20px", flexShrink:0, background:"rgba(3, 3, 11, 0.5)", backdropFilter: "blur(10px)" }}>
          {messages.length > 0 && suggestions.length > 0 && (
            <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:8, scrollbarWidth: "none" }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => onQuery(s)}
                  style={{
                    fontSize:11, fontFamily:"var(--mono)", padding:"8px 16px", borderRadius:12,
                    background:"var(--glass)", border:"1px solid var(--border)", color:"var(--accent)",
                    cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.2s", flexShrink:0, fontWeight:600
                  }}
                  onMouseEnter={e => { e.target.style.background="rgba(245, 158, 11, 0.1)"; e.target.style.borderColor="rgba(245, 158, 11, 0.3)"; }}
                  onMouseLeave={e => { e.target.style.background="var(--glass)"; e.target.style.borderColor="var(--border)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:10, background:"var(--bg3)", padding:6, borderRadius:14, border:"1px solid var(--border2)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key==="Enter" && submit()}
              placeholder="Ask DataLens about your dataset..."
              style={{
                flex:1, padding:"10px 16px", background:"transparent", border:"none",
                color:"var(--text)", fontSize:14, outline:"none", transition:"all .15s"
              }}
            />
            <button
              onClick={submit}
              disabled={analyzing || !input.trim()}
              style={{
                padding:"10px 24px", background:analyzing?"var(--bg5)":"linear-gradient(135deg, var(--accent), var(--accent2))", color:"white", border:"none",
                borderRadius:10, fontWeight:700, fontSize:13, cursor: analyzing?"default":"pointer", transition:"all 0.3s", boxShadow: analyzing ? "none" : "0 4px 12px var(--glow)"
              }}
              onMouseEnter={e => !analyzing && (e.target.style.transform="scale(1.02)")}
              onMouseLeave={e => !analyzing && (e.target.style.transform="scale(1)")}
            >
              {analyzing ? <Spinner /> : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, onSave, currentKey }) {
  const [key, setKey] = useState(currentKey || "");
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: 32, maxWidth: 480, width: "100%", animation: "fadeUp .4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>API Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text4)", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24, lineHeight: 1.6 }}>
          Provide your own Gemini API key to bypass shared limits. Get one for free at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Google AI Studio</a>.
        </p>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)" }}>Gemini API Key</label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Enter AIzaSy..."
            style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 14, outline: "none", transition: "border 0.2s" }}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border2)"}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { onSave(key); onClose(); }} style={{ flex: 1, background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.target.style.filter = "brightness(1.1)"} onMouseLeave={e => e.target.style.filter = "none"}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
}

const Section = ({ children, style }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : "translateY(10px)",
        transition: "opacity .8s ease, transform .8s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export function Dashboard() {
  const [fileId, setFileId] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("Midnight Gold");
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem("datalens_api_key") || "");
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("datalens_user");
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { }
    }
  }, []);

  const handleLogin = (authData) => {
    const userData = { ...authData.user, token: authData.token };
    setUser(userData);
    localStorage.setItem("datalens_user", JSON.stringify(userData));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem("datalens_user");
  };

  const saveApiKey = (key) => {
    setUserApiKey(key);
    localStorage.setItem("datalens_api_key", key);
  };

  const handleUpload = async (fileOrFiles) => {
    setUploading(true); setUploadProgress(0);
    const interval = setInterval(() => setUploadProgress(p => p < 90 ? p + 10 : p), 200);
    const formData = new FormData(); 
    if (Array.isArray(fileOrFiles)) {
      fileOrFiles.forEach(f => formData.append("file", f));
    } else {
      formData.append("file", fileOrFiles);
    }
    
    try {
      const res = await axios.post(`${API_URL}/api/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setFileId(res.data.fileId); setFileInfo(res.data);
      setMessages([]);
    } catch (e) { alert(e.response?.data?.error || "Upload failed"); }
    finally { clearInterval(interval); setUploadProgress(100); setTimeout(() => setUploading(false), 500); }
  };

  const queryAnalysis = async (query) => {
    if (!fileId || analyzing) return;
    const userMsg = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/api/analyze`, {
        fileId, query, conversationHistory: messages, userApiKey
      });
      setMessages(prev => [...prev, { role: "assistant", result: res.data.result }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "error", content: e.response?.data?.error || "Analysis failed" }]);
    } finally { setAnalyzing(false); }
  };

  const handleReset = () => { setFileId(null); setFileInfo(null); setMessages([]); };

  const uploadSectionRef = useRef(null);
  const scrollToUpload = () => uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });

  const [mousePos, setMousePos] = useState({ x: 10, y: 20 });
  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setMousePos({ x, y });
  };

  if (!fileId) {
    return (
      <div 
        onMouseMove={handleMouseMove}
        className="moving-bg"
        style={{ 
          minHeight:"100vh", 
          "--x": `${mousePos.x}%`, 
          "--y": `${mousePos.y}%`,
          color:"var(--text)", 
          overflowX:"hidden", 
          position: "relative",
          transition: "background 0.1s ease-out"
        }}
      >
        {/* Dynamic Background Elements */}
        <div className="orb orb-gold" style={{ top: "-10%", left: "-10%", opacity: 0.15 }}></div>
        <div className="orb orb-orange" style={{ bottom: "10%", right: "-5%", opacity: 0.1 }}></div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "linear-gradient(180deg, rgba(245, 158, 11, 0.03) 0%, transparent 40%)", pointerEvents: "none" }}></div>
        <Header 
          onSettingsOpen={() => setIsSettingsOpen(true)} 
          user={user} 
          onAuthOpen={() => setIsAuthOpen(true)} 
          onSignOut={handleSignOut} 
        />
        
        <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 40px", position:"relative", zIndex:2, minHeight: "calc(100vh - 72px)", marginTop: 72 }}>
          <div style={{ animation:"fadeUp .8s cubic-bezier(0.16, 1, 0.3, 1)", width:"100%", maxWidth:1200, textAlign:"center", padding: "120px 0", position: "relative", zIndex: 3 }}>
            <h1 style={{ fontFamily: "var(--classy)", fontSize:"clamp(40px, 10vw, 110px)", fontWeight:700, marginBottom:32, letterSpacing:"-0.02em", lineHeight:1.1, color: "#fff", maxWidth: 1000, margin: "0 auto 32px" }}>
              Spreadsheets,<br/>
              <span style={{ fontStyle: "italic", background:"linear-gradient(135deg, #fff 30%, #f59e0b 80%, #fbbf24 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Meet Intelligence.</span>
            </h1>
            
            <p style={{ fontSize:"clamp(16px, 2.5vw, 22px)", color:"#b4b4cf", maxWidth:800, margin:"0 auto 56px", lineHeight:1.5, fontWeight: 500, padding: "0 10px" }}>
              Stop wrestling with charts. Just drop your file and ask questions.<br/>
              DataLens AI builds the visualizations you need, instantly.
            </p>

            <div className="hero-buttons">
              <button onClick={scrollToUpload} style={{ background:"linear-gradient(135deg, #f59e0b, #ea580c)", color:"#fff", border:"none", padding:"18px 32px", borderRadius:16, fontSize:18, fontWeight:700, cursor:"pointer", transition:"all 0.3s", boxShadow:"0 10px 40px rgba(245, 158, 11, 0.3)" }}
                onMouseEnter={e => { e.target.style.transform="translateY(-3px)"; e.target.style.filter="brightness(1.1)"; }} onMouseLeave={e => { e.target.style.transform="none"; e.target.style.filter="none"; }}>
                Get Started Free
              </button>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} style={{ background:"rgba(255,255,255,0.02)", color:"#fff", border:"1px solid rgba(255,255,255,0.1)", padding:"18px 32px", borderRadius:16, fontSize:18, fontWeight:700, cursor:"pointer", transition:"all 0.3s" }}
                onMouseEnter={e => { e.target.style.background="rgba(255,255,255,0.05)"; e.target.style.borderColor="rgba(255,255,255,0.2)"; }} onMouseLeave={e => { e.target.style.background="rgba(255,255,255,0.02)"; e.target.style.borderColor="rgba(255,255,255,0.1)"; }}>
                How It Works
              </button>
            </div>
          </div>

          {/* Deep Dynamic Glow matching the reference */}
          <div style={{ position: "absolute", top: "5%", left: "0%", width: "50%", height: "70%", background: "radial-gradient(circle at 0% 0%, rgba(245, 158, 11, 0.15) 0%, transparent 80%)", filter: "blur(80px)", zIndex: 1, pointerEvents: "none" }}></div>
          <div style={{ position: "absolute", top: "20%", right: "-10%", width: "40%", height: "50%", background: "radial-gradient(circle at 100% 100%, rgba(251, 191, 36, 0.05) 0%, transparent 70%)", filter: "blur(100px)", zIndex: 1, pointerEvents: "none" }}></div>

          <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
            <div id="how-it-works" style={{ marginBottom: 200, marginTop: 200, textAlign: "center" }}>
              <Section>
                <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>How It Works</h2>
                <p style={{ fontSize: 18, color: "var(--text3)", marginBottom: 60, maxWidth: 600, margin: "0 auto 60px" }}>
                  Three simple steps to unlock the hidden potential in your data.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:32 }}>
                  {[
                    { n: "01", t: "Upload", d: "Drop your CSV or Excel file. We instantly parse it securely on your machine." },
                    { n: "02", t: "Chat", d: "Ask questions in plain English. 'What was my top product last month?'" },
                    { n: "03", t: "Visualize", d: "Get beautiful charts and deep insights generated automatically." }
                  ].map(s => (
                    <div key={s.n} style={{ textAlign:"left", padding:40, background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)", borderRadius:32, transition: "all 0.3s ease" }} onMouseEnter={e => e.currentTarget.style.borderColor="var(--accent2)"} onMouseLeave={e => e.currentTarget.style.borderColor="var(--border)"}>
                      <div style={{ fontSize:14, fontFamily:"var(--mono)", color:"var(--accent)", fontWeight:700, marginBottom:20 }}>{s.n}</div>
                      <h3 style={{ fontSize:24, fontWeight:800, marginBottom:16, color:"#fff" }}>{s.t}</h3>
                      <p style={{ fontSize:16, color:"var(--text3)", lineHeight:1.7 }}>{s.d}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div id="features" style={{ marginBottom: 100, marginTop: 200, textAlign: "center" }}>
              <Section>
                <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16, letterSpacing: "-0.02em" }}>Everything you need.</h2>
                <p style={{ fontSize: 18, color: "var(--text3)", marginBottom: 60, maxWidth: 600, margin: "0 auto 60px" }}>
                  Everything you need to turn raw data into actionable intelligence.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:24, maxWidth: 1100, margin: "0 auto" }}>
                  {[
                    { t: "Instant Visualization", d: "Automatic chart generation based on natural language queries. No manual plotting needed.", i: "📊" },
                    { t: "Deep Insights", d: "Uncover hidden trends, correlations, and anomalies in seconds with Gemini AI.", i: "🧠" },
                    { t: "Zero Config", d: "No setup required. Upload any CSV or Excel and start chatting with your data immediately.", i: "⚡" }
                  ].map((f,idx) => (
                    <div key={idx} className="glass" style={{ padding:32, borderRadius:24, textAlign:"left", transition: "all 0.3s ease" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "var(--accent3)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <div style={{ fontSize:32, marginBottom:20, filter: "drop-shadow(0 0 8px var(--glow))" }}>{f.i}</div>
                      <h3 style={{ fontSize:20, fontWeight:700, marginBottom:12, color:"var(--text)" }}>{f.t}</h3>
                      <p style={{ fontSize:15, color:"var(--text3)", lineHeight:1.6 }}>{f.d}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div ref={uploadSectionRef} style={{ padding:"160px 0 160px", position:"relative", textAlign: "center" }}>
              <div style={{ position:"absolute", inset:0, background:"var(--accent)", filter:"blur(160px)", opacity:0.1, transform:"scale(0.6)" }}></div>
              <div style={{ position:"relative" }}>
                <h2 style={{ fontSize:"clamp(32px, 5vw, 48px)", fontWeight:800, marginBottom:16, letterSpacing:"-0.02em", color: "#fff" }}>Ready to analyze?</h2>
                <p style={{ fontSize: 18, color: "var(--text3)", marginBottom: 60, maxWidth: 600, margin: "0 auto 60px" }}>
                  Drop your file below and start uncovering the stories hidden in your data.
                </p>
                <UploadZone onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
              </div>
            </div>
          </div>
        </main>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={saveApiKey}
          currentKey={userApiKey}
        />
        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          onLogin={handleLogin} 
        />
      </div>
    );
  }

  const safeFileInfo = fileInfo || {};
  return (
    <div 
      onMouseMove={handleMouseMove}
      className="moving-bg"
      style={{ 
        minHeight:"100vh", 
        "--x": `${mousePos.x}%`, 
        "--y": `${mousePos.y}%`,
        color:"var(--text)", 
        overflowX:"hidden", 
        position: "relative",
        transition: "background 0.1s ease-out"
      }}
    >
      <Header 
        onSettingsOpen={() => setIsSettingsOpen(true)} 
        user={user} 
        onAuthOpen={() => setIsAuthOpen(true)} 
        onSignOut={handleSignOut} 
      />
      <Workspace
        fileInfo={safeFileInfo}
        messages={messages}
        analyzing={analyzing}
        uploading={uploading}
        progress={uploadProgress}
        onQuery={queryAnalysis}
        onUpload={handleUpload}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        theme={activeTheme}
        onThemeChange={setActiveTheme}
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={saveApiKey}
        currentKey={userApiKey}
      />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onLogin={handleLogin} 
      />
    </div>
  );
}
