import React, { useState, useRef, useEffect, useCallback, useContext } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter, Radar, PolarArea, Bubble } from "react-chartjs-2";
import { useDropzone } from "react-dropzone";
import html2canvas from "html2canvas";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { Header } from "../components/Header";
import { AuthModal } from "../components/AuthModal";
import { AuthContext } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const PALETTES = {
  "Midnight Gold":   ["#f59e0b","#fbbf24","#facc15","#ea580c","#d97706","#78350f","#b45309","#a16207","#ca8a04","#eab308","#fb923c","#fdba74","#fde68a","#fef3c7","#fffbeb"],
  "Ocean Blue":      ["#0ea5e9","#38bdf8","#0284c7","#0369a1","#0c4a6e","#7dd3fc","#bae6fd","#075985","#2dd4bf","#14b8a6","#0f766e","#3b82f6","#2563eb","#1d4ed8","#eff6ff"],
  "Emerald Green":   ["#10b981","#34d399","#059669","#047857","#064e3b","#6ee7b7","#a7f3d0","#065f46","#84cc16","#65a30d","#4d7c0f","#22c55e","#16a34a","#15803d","#f0fdf4"],
  "Cyberpunk Neon":  ["#c026d3","#d946ef","#a21caf","#86198f","#4a044e","#f0abfc","#fae8ff","#e879f9","#4f46e5","#6366f1","#4338ca","#3730a3","#f43f5e","#e11d48","#fff0f2"],
  "Pastel Dream":    ["#fca5a5","#fcd34d","#fef08a","#a7f3d0","#99f6e4","#bae6fd","#c7d2fe","#ddd6fe","#fbcfe8","#fecdd3","#fed7aa","#d9f99d","#bfdbfe","#e9d5ff","#fdf4ff"],
  "Sunset Blaze":    ["#f97316","#ef4444","#ec4899","#f59e0b","#fb923c","#fca5a5","#fda4af","#fed7aa","#fde68a","#fbbf24","#e879f9","#c084fc","#ff6b6b","#ff8e53","#ffe259"],
  "Arctic Frost":    ["#e0f2fe","#bae6fd","#7dd3fc","#38bdf8","#0ea5e9","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#e0e7ff","#c7d2fe","#a5b4fc","#f0fdf4","#dcfce7","#bbf7d0"],
  "Cherry Blossom":  ["#f9a8d4","#f472b6","#ec4899","#db2777","#be185d","#fce7f3","#fbcfe8","#fda4af","#fb7185","#f43f5e","#e11d48","#fef9c3","#fef08a","#c084fc","#e9d5ff"],
  "Lush Forest":     ["#4ade80","#22c55e","#16a34a","#15803d","#166534","#86efac","#bbf7d0","#d9f99d","#bef264","#a3e635","#84cc16","#65a30d","#facc15","#fbbf24","#fef9c3"],
  "Cosmic Violet":   ["#a78bfa","#8b5cf6","#7c3aed","#6d28d9","#5b21b6","#c4b5fd","#ddd6fe","#ede9fe","#f5f3ff","#e879f9","#d946ef","#c026d3","#6366f1","#4f46e5","#4338ca"],
  "Golden Hour":     ["#fbbf24","#f59e0b","#d97706","#b45309","#92400e","#fde68a","#fef3c7","#fcd34d","#fb923c","#f97316","#ea580c","#dc2626","#fca5a5","#fed7aa","#fffbeb"],
};

const CHART_MAP = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut, scatter: Scatter, radar: Radar, polarArea: PolarArea, bubble: Bubble };

const baseOpts = (isRadial, isLightMode = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: 4, // Forces ultra-high resolution rendering
  animation: { duration: 600, easing: "easeInOutQuart" },
  plugins: {
    legend: {
      labels: {
        color: isLightMode ? "#0f172a" : "#cbd5e1", // Dark Slate in reports, high contrast Slate-300 on web dashboard
        font: { family: "system-ui, -apple-system, sans-serif", size: 12, weight: "700" },
        padding: 20,
        boxWidth: 12
      }
    },
    tooltip: { backgroundColor: "#0f172a", titleColor: "#ffffff", bodyColor: "#cbd5e1", borderColor: "rgba(0,0,0,0.05)", borderWidth: 1, padding: 12, cornerRadius: 10 },
  },
  scales: isRadial ? {
    r: {
      ticks: { color: isLightMode ? "#475569" : "#94a3b8", backdropColor: "transparent", font: { size: 10, weight: "700" } },
      grid: { color: isLightMode ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)" },
      angleLines: { color: isLightMode ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)" },
      pointLabels: { color: isLightMode ? "#0f172a" : "#cbd5e1", font: { size: 11, weight: "700" } }
    }
  } : {
    x: {
      ticks: { color: isLightMode ? "#475569" : "#94a3b8", font: { size: 11, weight: "700" }, maxRotation: 40 },
      grid: { color: isLightMode ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.08)" },
      border: { color: isLightMode ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)" }
    },
    y: {
      ticks: { color: isLightMode ? "#475569" : "#94a3b8", font: { size: 11, weight: "700" } },
      grid: { color: isLightMode ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.08)" },
      border: { color: isLightMode ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)" }
    },
  },
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
    <div data-role="insight-card" style={{ background:"rgba(255,255,255,0.02)", borderLeft:`4px solid ${color}`, borderTop:"1px solid var(--border)", borderRight:"1px solid var(--border)", borderBottom:"1px solid var(--border)", borderRadius:16, padding:"20px", flex:1, minWidth:0, animation:"fadeUp .4s ease" }}>
      <div data-role="insight-label" style={{ fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:700, marginBottom:8 }}>{label}</div>
      <div data-role="insight-value" style={{ fontSize:24, fontWeight:800, color, letterSpacing:"-0.02em", textShadow: `0 0 15px ${color}40` }}>{value}</div>
      {trend && (
        <div style={{ fontSize:12, color: trend.startsWith("+") ? "#10b981" : "#ef4444", marginTop:6, fontWeight:600 }}>
          {trend} from previous period
        </div>
      )}
    </div>
  );
}

const renderLightModeChartImage = (config) => {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 1200;
  tempCanvas.height = 600;
  tempCanvas.style.width = "600px";
  tempCanvas.style.height = "300px";
  tempCanvas.style.position = "absolute";
  tempCanvas.style.left = "-9999px";
  document.body.appendChild(tempCanvas);

  const ctx = tempCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  const isRadial = ["pie", "doughnut", "polarArea", "radar"].includes(config.type);
  const labels = config.labels || [];
  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f43f5e"];
  
  const chartData = {
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
        borderColor: isRadial ? "#ffffff" : (config.type === "bar" ? bgColor : colors[i % colors.length]),
        borderWidth: isRadial ? 2 : config.type === "line" ? 2.5 : 1,
        fill: config.type === "line" ? false : undefined,
        tension: 0.4,
        pointRadius: config.type === "line" ? 4 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: colors[i % colors.length],
        hoverOffset: isRadial ? 10 : 0,
      };
    })
  };

  const options = baseOpts(isRadial, true);
  options.animation = false;
  options.responsive = false;
  options.maintainAspectRatio = false;
  options.devicePixelRatio = 2;

  const chart = new ChartJS(ctx, {
    type: config.type === "polarArea" ? "polarArea" : config.type,
    data: chartData,
    options: options
  });

  // Force synchronous rendering of the chart
  chart.update();

  const imgUrl = tempCanvas.toDataURL("image/png");
  chart.destroy();
  document.body.removeChild(tempCanvas);
  return imgUrl;
};

function ChartBlock({ config, colors }) {
  const chartRef = useRef(null);
  if (!config) return null;
  const Comp = CHART_MAP[config.type] || Bar;
  const isRadial = ["pie", "doughnut", "polarArea", "radar"].includes(config.type);

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
    <div data-role="chart-block" style={{ background:"rgba(17, 17, 35, 0.45)", border:"1px solid rgba(255, 255, 255, 0.08)", backdropFilter:"blur(12px)", borderRadius:20, padding:"24px", marginTop:16, position: "relative", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        {config.title && (
          <div data-role="chart-title" style={{ fontSize:14, fontFamily:"system-ui, -apple-system, sans-serif", color:"#e2e8f0", fontWeight:700 }}>
            <span style={{ marginRight:8, color:"var(--accent)" }}>✦</span>{config.title}
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
      <div ref={chartRef} style={{ padding: "0 10px", height: isRadial ? "260px" : "320px", position: "relative" }}>
        <Comp data={data} options={baseOpts(isRadial, false)} data-config={JSON.stringify(config)} />
      </div>
    </div>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div data-role="data-table" style={{ overflowX:"auto", marginTop:14, borderRadius:16, border:"1px solid var(--border)", background:"var(--glass)" }}>
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
    <div data-role="user-msg" style={{ display:"flex", justifyContent:"flex-end", animation:"fadeUp .3s ease" }}>
      <div style={{ background:"linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius:"18px 18px 4px 18px", padding:"12px 18px", maxWidth:"75%", fontSize:14, lineHeight:1.6, boxShadow:"0 4px 20px var(--glow)", color: "#fff" }}>
        {msg.content}
      </div>
    </div>
  );

  if (msg.role === "error") return (
    <div data-role="error-msg" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:16, padding:"16px 20px", fontSize:14, color:"#fca5a5", animation:"fadeUp .3s ease", display:"flex", gap:12, alignItems:"center" }}>
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
    <div data-role="assistant-msg" style={{ animation:"fadeUp .3s ease" }}>
      <div data-role="assistant-header" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:32, height:32, background:"linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:"0 4px 12px var(--glow)" }}>✦</div>
        <span style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700 }}>DataLens Intelligence</span>
      </div>

      {result.summary && (
        <p data-role="assistant-summary" style={{ fontSize:14, lineHeight:1.7, color:"#c4c2df", marginBottom:14 }}>{result.summary}</p>
      )}

      {result.insights?.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, marginBottom:4 }}>
          {result.insights.map((ins,i) => <InsightCard key={i} {...ins} color={colors[i % colors.length]} />)}
        </div>
      )}

      {result.chartConfigs && result.chartConfigs.length > 0 ? (
        result.chartConfigs.map((cfg, idx) => (
          <ChartBlock key={idx} config={cfg} colors={colors} />
        ))
      ) : (
        result.chartConfig?.type && <ChartBlock config={result.chartConfig} colors={colors} />
      )}

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
  const { user, token } = useContext(AuthContext);
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [mainView, setMainView] = useState("chat");
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

  const handleSave = async () => {
    if (!fileInfo?.fileId || saving) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/auth/saved-analyses`,
        {
          fileId: fileInfo.fileId,
          fileName: fileInfo.originalName,
          messages,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("✓ Analysis session saved successfully in your profile!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save analysis session.");
    } finally {
      setSaving(false);
    }
  };

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
    el.style.padding = "40px";
    el.style.background = "#ffffff";
    el.style.color = "#1e293b";
    el.style.height = "auto";
    el.style.overflow = "visible";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.gap = "24px";
    el.style.maxWidth = "1000px";

    // 1. Remove all download buttons and action buttons
    el.querySelectorAll('button').forEach(btn => {
      btn.remove();
    });

    // 2. Restyle User Messages to look like professional section headers
    const userMsgs = el.querySelectorAll('[data-role="user-msg"]');
    userMsgs.forEach((msg, idx) => {
      msg.style.justifyContent = "flex-start";
      msg.style.margin = "20px 0 10px 0";
      msg.style.width = "100%";
      if (idx > 0) {
        msg.style.pageBreakBefore = "always"; // Start each query on a new page
      }
      
      const inner = msg.querySelector('div');
      if (inner) {
        inner.style.background = "none";
        inner.style.borderBottom = "2px solid #e2e8f0";
        inner.style.borderRadius = "0";
        inner.style.padding = "0 0 8px 0";
        inner.style.color = "#1e1b4b"; // Deep corporate Indigo
        inner.style.fontSize = "20px";
        inner.style.fontWeight = "800";
        inner.style.boxShadow = "none";
        inner.style.maxWidth = "100%";
        inner.innerHTML = `${idx + 1}. Analysis: "${inner.innerText}"`;
      }
    });

    // 3. Restyle Assistant Message Containers
    el.querySelectorAll('[data-role="assistant-msg"]').forEach(msg => {
      msg.style.width = "100%";
    });

    // 4. Remove Assistant Headers completely (hides "DataLens Intelligence")
    el.querySelectorAll('[data-role="assistant-header"]').forEach(hdr => {
      hdr.remove();
    });

    // 5. Restyle Assistant Summary
    el.querySelectorAll('[data-role="assistant-summary"]').forEach(p => {
      p.style.color = "#334155";
      p.style.fontSize = "14px";
      p.style.lineHeight = "1.6";
      p.style.marginBottom = "16px";
    });

    // 6. Restyle Insight Cards
    el.querySelectorAll('[data-role="insight-card"]').forEach(card => {
      card.style.background = "#f8fafc"; // light gray-blue
      card.style.border = "1px solid #cbd5e1";
      card.style.borderLeftWidth = "4px"; // Keep the accent color bar!
      card.style.boxShadow = "none";
      card.style.borderRadius = "12px";
      card.style.padding = "16px";
      
      const label = card.querySelector('[data-role="insight-label"]');
      if (label) label.style.color = "#475569";
      
      const val = card.querySelector('[data-role="insight-value"]');
      if (val) {
        val.style.textShadow = "none";
        val.style.fontSize = "22px";
      }
    });

    // 7. Restyle Chart Blocks & Convert Canvases to Resized Images (forcing light mode)
    el.querySelectorAll('[data-role="chart-block"]').forEach((block, idx) => {
      const originalBlock = messagesRef.current.querySelectorAll('[data-role="chart-block"]')[idx];
      if (!originalBlock) return;
      const canvas = originalBlock.querySelector('canvas');
      if (!canvas) return;

      const configStr = canvas.getAttribute("data-config");
      let imgSrc;
      if (configStr) {
        try {
          const config = JSON.parse(configStr);
          imgSrc = renderLightModeChartImage(config);
        } catch (e) {
          console.error("Failed to render light mode chart for PDF:", e);
          imgSrc = canvas.toDataURL("image/png", 1.0);
        }
      } else {
        imgSrc = canvas.toDataURL("image/png", 1.0);
      }

      // Extract the title
      const titleEl = block.querySelector('[data-role="chart-title"]');
      const titleText = titleEl ? titleEl.innerText : "Chart";

      // Clear the block's inner HTML completely!
      block.innerHTML = "";

      // Apply clean styles to the block
      block.style.background = "#ffffff";
      block.style.border = "1px solid #cbd5e1";
      block.style.borderRadius = "16px";
      block.style.padding = "20px";
      block.style.marginTop = "16px";
      block.style.pageBreakInside = "avoid";
      block.style.display = "flex";
      block.style.flexDirection = "column";
      block.style.alignItems = "center";
      block.style.gap = "12px";

      // Append clean Title element
      const cleanTitle = document.createElement("div");
      cleanTitle.innerText = titleText;
      cleanTitle.style.color = "#0f172a";
      cleanTitle.style.fontSize = "14px";
      cleanTitle.style.fontWeight = "700";
      cleanTitle.style.alignSelf = "flex-start";
      cleanTitle.style.borderBottom = "1px solid #e2e8f0";
      cleanTitle.style.paddingBottom = "6px";
      cleanTitle.style.width = "100%";
      block.appendChild(cleanTitle);

      // Append clean Image element
      const img = document.createElement('img');
      img.src = imgSrc;
      img.style.width = "100%";
      img.style.maxWidth = "500px";
      img.style.height = "auto";
      img.style.display = 'block';
      img.style.margin = '0 auto';
      block.appendChild(img);
    });

    // 8. Restyle Data Tables
    el.querySelectorAll('[data-role="data-table"]').forEach(table => {
      table.style.background = "#ffffff";
      table.style.border = "1px solid #cbd5e1";
      table.style.boxShadow = "none";
      table.style.borderRadius = "12px";
      table.style.pageBreakInside = "avoid";

      const ths = table.querySelectorAll('th');
      ths.forEach(ths => {
        ths.style.background = "#f1f5f9";
        ths.style.color = "#1e293b";
        ths.style.borderBottom = "2px solid #cbd5e1";
        ths.style.padding = "10px 14px";
      });

      const tds = table.querySelectorAll('td');
      tds.forEach(td => {
        td.style.color = "#334155";
        td.style.borderBottom = "1px solid #e2e8f0";
        td.style.padding = "8px 14px";
      });
    });

    // 9. Hide any error messages from the report
    el.querySelectorAll('[data-role="error-msg"]').forEach(err => {
      err.remove();
    });

    html2pdf().from(el).set({
      margin: [15, 15, 15, 15],
      filename: `${filename.trim() || 'DataLens_Report'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1000 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).save();
    setShowExportOptions(false);
  };

  const exportDOC = () => {
    if (!messagesRef.current) return;
    
    const filename = window.prompt("Enter a name for your Word document:", "DataLens_Report");
    if (filename === null) return;
    
    const el = messagesRef.current.cloneNode(true);

    // 1. Remove all download buttons and action buttons
    el.querySelectorAll('button').forEach(btn => {
      btn.remove();
    });

    // 2. Remove assistant header completely (hides "DataLens Intelligence")
    el.querySelectorAll('[data-role="assistant-header"]').forEach(hdr => {
      hdr.remove();
    });

    // 3. Remove error messages
    el.querySelectorAll('[data-role="error-msg"]').forEach(err => {
      err.remove();
    });

    // 4. Restyle user queries as clear document headings with page breaks
    const userMsgs = el.querySelectorAll('[data-role="user-msg"]');
    userMsgs.forEach((msg, idx) => {
      const inner = msg.querySelector('div');
      if (inner) {
        const heading = document.createElement('h2');
        heading.innerText = `${idx + 1}. Analysis: "${inner.innerText}"`;
        if (idx > 0) {
          heading.className = "page-break";
        }
        msg.parentNode.replaceChild(heading, msg);
      }
    });

    // 5. Restyle assistant message containers
    el.querySelectorAll('[data-role="assistant-msg"]').forEach(msg => {
      msg.style.margin = "0 0 20px 0";
    });

    // 6. Restyle assistant summaries
    el.querySelectorAll('[data-role="assistant-summary"]').forEach(p => {
      p.style.fontSize = "11pt";
      p.style.lineHeight = "1.5";
      p.style.color = "#334155";
      p.style.margin = "0 0 12pt 0";
    });

    // 7. Group and Restyle insights (using tables instead of flex boxes to ensure MS Word alignment)
    el.querySelectorAll('[data-role="assistant-msg"]').forEach(assistantMsg => {
      const cards = assistantMsg.querySelectorAll('[data-role="insight-card"]');
      if (cards.length > 0) {
        const table = document.createElement('table');
        table.style.width = "100%";
        table.style.borderCollapse = "separate";
        table.style.borderSpacing = "8px";
        table.style.marginBottom = "16px";
        table.style.marginTop = "12px";

        const tr = document.createElement('tr');

        cards.forEach(card => {
          const td = document.createElement('td');
          td.style.width = `${100 / cards.length}%`;
          td.style.padding = "14px";
          td.style.verticalAlign = "top";
          td.style.border = "1px solid #cbd5e1";
          td.style.borderLeft = "4px solid #4f46e5";
          td.style.background = "#f8fafc";
          td.style.borderRadius = "8px";

          const labelEl = card.querySelector('[data-role="insight-label"]');
          const valEl = card.querySelector('[data-role="insight-value"]');

          const labelText = labelEl ? labelEl.innerText : "";
          const valText = valEl ? valEl.innerText : "";

          td.innerHTML = `
            <div style="font-family: Arial, sans-serif; font-size: 9pt; color: #475569; font-weight: bold; text-transform: uppercase;">${labelText}</div>
            <div style="font-family: Arial, sans-serif; font-size: 16pt; color: #1e293b; font-weight: bold; margin-top: 4px;">${valText}</div>
          `;
          tr.appendChild(td);
        });

        table.appendChild(tr);

        const firstCard = cards[0];
        firstCard.parentNode.insertBefore(table, firstCard);
        cards.forEach(c => c.remove());
      }
    });

    // 8. Convert canvases to clean resized images (forcing light mode) and clean chart containers
    el.querySelectorAll('[data-role="chart-block"]').forEach((block, idx) => {
      const originalBlock = messagesRef.current.querySelectorAll('[data-role="chart-block"]')[idx];
      if (!originalBlock) return;
      const canvas = originalBlock.querySelector('canvas');
      if (!canvas) return;

      const configStr = canvas.getAttribute("data-config");
      let imgSrc;
      if (configStr) {
        try {
          const config = JSON.parse(configStr);
          imgSrc = renderLightModeChartImage(config);
        } catch (e) {
          console.error("Failed to render light mode chart for Word:", e);
          imgSrc = canvas.toDataURL("image/png", 1.0);
        }
      } else {
        imgSrc = canvas.toDataURL("image/png", 1.0);
      }

      // Extract title
      const titleEl = block.querySelector('[data-role="chart-title"]');
      const titleText = titleEl ? titleEl.innerText : "Chart";

      // Clear the block's inner HTML completely!
      block.innerHTML = "";

      // Apply styles suitable for Word document export
      block.className = "chart-container";
      block.style.background = "#ffffff";
      block.style.border = "1px solid #cbd5e1";
      block.style.borderRadius = "8px";
      block.style.padding = "16px";
      block.style.marginTop = "12px";
      block.style.textAlign = "center";
      block.style.pageBreakInside = "avoid";

      // Title
      const cleanTitle = document.createElement("div");
      cleanTitle.className = "chart-title";
      cleanTitle.innerText = titleText;
      cleanTitle.style.fontSize = "11pt";
      cleanTitle.style.fontWeight = "bold";
      cleanTitle.style.color = "#0f172a";
      cleanTitle.style.marginBottom = "8px";
      cleanTitle.style.textAlign = "left";
      block.appendChild(cleanTitle);

      // Image
      const img = document.createElement('img');
      img.src = imgSrc;
      img.style.width = "100%";
      img.style.maxWidth = "500px";
      img.style.height = "auto";
      img.style.display = 'block';
      img.style.margin = '10px auto';
      block.appendChild(img);
    });

    // 9. Restyle tables
    el.querySelectorAll('[data-role="data-table"]').forEach(table => {
      table.style.background = "#ffffff";
      table.style.border = "1px solid #cbd5e1";
      table.style.borderRadius = "8px";
      
      const ths = table.querySelectorAll('th');
      ths.forEach(th => {
        th.style.background = "#f1f5f9";
        th.style.color = "#1e293b";
        th.style.borderBottom = "2px solid #cbd5e1";
        th.style.padding = "8px";
      });

      const tds = table.querySelectorAll('td');
      tds.forEach(td => {
        td.style.color = "#334155";
        td.style.borderBottom = "1px solid #e2e8f0";
        td.style.padding = "6px";
      });
    });

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title><style>body { font-family: Arial, sans-serif; background: #ffffff; color: #333333; margin: 1in; } h2 { color: #1e1b4b; font-size: 16pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24pt; } .page-break { page-break-before: always; clear: both; } .chart-container { text-align: center; margin: 16px 0; page-break-inside: avoid; } img { max-width: 500px; height: auto; } table { width: 100%; border-collapse: collapse; margin-top: 12px; page-break-inside: avoid; } th { background: #f1f5f9; color: #1e293b; font-weight: bold; border-bottom: 2px solid #cbd5e1; padding: 8px; text-align: left; } td { color: #334155; border-bottom: 1px solid #e2e8f0; padding: 6px; }</style></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + el.innerHTML + footer;
    
    // Create a Blob from sourceHTML instead of raw Data URI to prevent size truncation
    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = `${filename.trim() || 'DataLens_Report'}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
    
    setShowExportOptions(false);
  };

  const exportTXT = () => {
    const filename = window.prompt("Enter a name for your text report:", "DataLens_Report");
    if (filename === null) return;
    
    let text = "ANALYSIS REPORT\n============================\n\n";
    messages.forEach((msg, idx) => {
      if (msg.role === "user") {
        text += `\n[Analysis ${idx + 1}] Question: ${msg.content}\n`;
        text += "------------------------------------------------------------\n";
      }
      if (msg.role === "assistant" && msg.result) {
        if (msg.result.summary) {
          text += `Summary:\n${msg.result.summary}\n\n`;
        }
        if (msg.result.insights?.length) {
          text += `Key Metrics:\n`;
          msg.result.insights.forEach(ins => {
            text += `  * ${ins.label}: ${ins.value}${ins.trend ? ` (${ins.trend})` : ""}\n`;
          });
          text += `\n`;
        }
        if (msg.result.chartConfig?.title) {
          text += `Chart Generated: "${msg.result.chartConfig.title}" (${msg.result.chartConfig.type.toUpperCase()} Chart)\n\n`;
        }
        if (msg.result.chartConfigs?.length > 0) {
          text += `Charts Generated:\n`;
          msg.result.chartConfigs.forEach(cfg => {
            text += `  * "${cfg.title}" (${cfg.type.toUpperCase()} Chart)\n`;
          });
          text += `\n`;
        }
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
            <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 4, border: "1px solid var(--border)" }}>
              <button onClick={() => setMainView("chat")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: mainView === "chat" ? "rgba(139, 92, 246, 0.15)" : "transparent", color: mainView === "chat" ? "var(--accent)" : "var(--text3)", transition: "all 0.2s" }}>💬 Chat</button>
              <button onClick={() => setMainView("dashboard")} style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: mainView === "dashboard" ? "rgba(139, 92, 246, 0.15)" : "transparent", color: mainView === "dashboard" ? "var(--accent)" : "var(--text3)", transition: "all 0.2s" }}>📊 Dashboard</button>
            </div>
          </div>
            <div style={{ position: "relative" }}>
              <button onClick={() => {setShowThemeOptions(!showThemeOptions); setShowExportOptions(false);}} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)", padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e => e.target.style.background="rgba(255,255,255,0.03)"}>
                🎨 Theme
              </button>
              {showThemeOptions && (
                <div style={{ position: "absolute", top: "110%", right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", zIndex: 100, display: "flex", flexDirection: "column", minWidth: 210, boxShadow: "0 16px 48px rgba(0,0,0,0.6)", padding: "6px 0" }}>
                  <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Chart Palette</div>
                  {Object.keys(PALETTES).map(paletteName => (
                    <button key={paletteName} onClick={() => { onThemeChange(paletteName); setShowThemeOptions(false); }} style={{ padding: "9px 14px", background: theme === paletteName ? "rgba(255,255,255,0.08)" : "none", border: "none", color: "var(--text)", fontSize: 12, fontWeight: theme === paletteName ? 700 : 500, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background 0.15s" }} onMouseEnter={e => { if(theme !== paletteName) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }} onMouseLeave={e => { if(theme !== paletteName) e.currentTarget.style.background="none"; }}>
                      <span style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {PALETTES[paletteName].slice(0, 4).map((c, i) => (
                          <span key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "inline-block" }} />
                        ))}
                      </span>
                      <span>{paletteName}</span>
                      {theme === paletteName && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: 14 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user && (
              <button onClick={handleSave} disabled={saving} style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "var(--accent)", padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => e.target.style.background="rgba(139, 92, 246, 0.25)"} onMouseLeave={e => e.target.style.background="rgba(139, 92, 246, 0.15)"}>
                {saving ? "⏳ Saving..." : "💾 Save Analysis"}
              </button>
            )}
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

          {mainView === "dashboard" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 24 }}>
              {messages.filter(m => m.role === "assistant" && (m.result?.chartConfig || (m.result?.chartConfigs && m.result.chartConfigs.length > 0))).length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: "var(--text3)" }}>
                  <div style={{ fontSize: 48, filter: "drop-shadow(0 0 20px var(--glow))", marginBottom: 16 }}>📊</div>
                  <h3 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Your Dashboard is empty</h3>
                  <p style={{ fontSize: 16 }}>Ask a question in the Chat that generates a chart, and it will automatically appear here!</p>
                </div>
              ) : (
                messages.filter(m => m.role === "assistant" && (m.result?.chartConfig || (m.result?.chartConfigs && m.result.chartConfigs.length > 0))).flatMap((m) => {
                  if (m.result.chartConfigs && m.result.chartConfigs.length > 0) {
                    return m.result.chartConfigs;
                  }
                  return m.result.chartConfig ? [m.result.chartConfig] : [];
                }).map((cfg, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column" }}>
                    <ChartBlock config={cfg} colors={PALETTES[theme]} />
                  </div>
                ))
              )}
            </div>
          ) : messages.length === 0 ? (
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
          <strong>Power User? Bypass server limits.</strong><br/>
          Provide your own API key to guarantee zero downtime and instant processing. Our Universal Detection automatically supports keys from <strong>OpenAI (ChatGPT)</strong>, <strong>Google Gemini</strong>, or <strong>Groq</strong>.
        </p>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", fontFamily: "var(--mono)" }}>API Key (OpenAI / Gemini / Groq)</label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-..., AIza..., or gsk_..."
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
  const [fileId, setFileId] = useState(() => sessionStorage.getItem("datalens_fileId") || null);
  const [fileInfo, setFileInfo] = useState(() => {
    const saved = sessionStorage.getItem("datalens_fileInfo");
    return saved ? JSON.parse(saved) : null;
  });
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("datalens_messages");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (fileId) sessionStorage.setItem("datalens_fileId", fileId);
    else sessionStorage.removeItem("datalens_fileId");
  }, [fileId]);

  useEffect(() => {
    if (fileInfo) sessionStorage.setItem("datalens_fileInfo", JSON.stringify(fileInfo));
    else sessionStorage.removeItem("datalens_fileInfo");
  }, [fileInfo]);

  useEffect(() => {
    sessionStorage.setItem("datalens_messages", JSON.stringify(messages));
  }, [messages]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("Midnight Gold");
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem("datalens_api_key") || "");
  const { user, logout, loginWithToken } = useContext(AuthContext);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleLogin = (authData) => {
    loginWithToken(authData.token);
  };

  const handleSignOut = () => {
    logout();
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
      const isSameFile = fileInfo && fileInfo.originalName === res.data.originalName;
      setFileId(res.data.fileId); 
      setFileInfo(res.data);
      if (!isSameFile) {
        setMessages([]);
      }
    } catch (e) { alert(e.response?.data?.error || "Upload failed"); }
    finally { clearInterval(interval); setUploadProgress(100); setTimeout(() => setUploading(false), 500); }
  };

  const queryAnalysis = async (query) => {
    if (!fileId || analyzing) return;
    const userMsg = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setAnalyzing(true);

    // Map conversation history to a lightweight format to reduce network payload and LLM context size
    const cleanHistory = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.role === "user" ? m.content : (m.result?.summary || m.content || "")
    }));

    try {
      const res = await axios.post(`${API_URL}/api/analyze`, {
        fileId, query, conversationHistory: cleanHistory, userApiKey
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
          onLogoClick={handleReset}
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
                    { t: "Deep Insights", d: "Uncover hidden trends, correlations, and anomalies in seconds with Groq AI.", i: "🧠" },
                    { t: "Zero Config", d: "No setup required. Upload any CSV or Excel and start chatting with your data immediately.", i: "⚡" },
                    { t: "Bring Your Own Key", d: "Power user? Plug in your own OpenAI, Google Gemini, or Groq API key to instantly bypass server limits.", i: "🔑" }
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
        onLogoClick={handleReset}
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
