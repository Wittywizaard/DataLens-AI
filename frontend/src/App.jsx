import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { useDropzone } from "react-dropzone";
import html2canvas from "html2canvas";
import useAnalysis from "./useAnalysis.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ["#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#3b82f6","#14b8a6","#f97316","#84cc16","#a855f7"];
const CHART_MAP = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut, scatter: Scatter };

// ─── CHART OPTIONS ────────────────────────────────────────────────
const baseOpts = (isRadial) => ({
  responsive: true, maintainAspectRatio: false,
  width: isRadial ? 300 : 400, height: isRadial ? 250 : 300,  // Smaller size for pie charts
  animation: { duration: 600, easing: "easeInOutQuart" },
  plugins: {
    legend: { labels: { color: "#a09dbe", font: { family: "'JetBrains Mono'", size: 11 }, padding: 20, boxWidth: 10 } },
    tooltip: { backgroundColor: "#111128", titleColor: "#f1f0ff", bodyColor: "#a09dbe", borderColor: "#ffffff18", borderWidth: 1, padding: 12, cornerRadius: 10 },
  },
  ...(isRadial ? {} : {
    scales: {
      x: { ticks: { color: "#5c5a7a", font: { size: 11 }, maxRotation: 40 }, grid: { color: "#ffffff07" }, border: { color: "#ffffff0f" } },
      y: { ticks: { color: "#5c5a7a", font: { size: 11 } }, grid: { color: "#ffffff07" }, border: { color: "#ffffff0f" } },
    },
  }),
});

// ─── SMALL COMPONENTS ─────────────────────────────────────────────
function Spinner() {
  return <div style={{ width:18, height:18, border:"2px solid #ffffff20", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin .7s linear infinite" }} />;
}

function ThinkingDots() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#7c3aed", display:"inline-block", animation:`dot 1.2s ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

function InsightCard({ label, value }) {
  return (
    <div style={{ background:"#111128", border:"1px solid #ffffff0f", borderRadius:12, padding:"12px 16px", minWidth:100 }}>
      <div style={{ fontSize:20, fontWeight:800, color:"#c4a0ff", fontFamily:"'JetBrains Mono'", lineHeight:1.2 }}>{value}</div>
      <div style={{ fontSize:11, color:"#5c5a7a", marginTop:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
    </div>
  );
}

function ChartBlock({ config }) {
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
      if (isRadial) {
        if (Array.isArray(ds.backgroundColor) && ds.backgroundColor.length > 0) {
          bgColor = labels.map((_, j) => ds.backgroundColor[j] || COLORS[j % COLORS.length]);
        } else {
          bgColor = labels.map((_, j) => COLORS[j % COLORS.length]);
        }
      } else {
        bgColor = Array.isArray(ds.backgroundColor) ? ds.backgroundColor : (ds.backgroundColor || COLORS[i % COLORS.length]);
      }
      return {
        label: ds.label || "Value",
        data: cleanData,
        backgroundColor: bgColor,
        borderColor: isRadial ? "#05050f" : (ds.borderColor || COLORS[i % COLORS.length]),
        borderWidth: isRadial ? 2 : config.type === "line" ? 2.5 : 1,
        fill: config.type === "line" ? false : undefined,
        tension: 0.4,
        pointRadius: config.type === "line" ? 4 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: COLORS[i%COLORS.length],
        hoverOffset: isRadial ? 10 : 0,
      };
    }),
  };

  return (
    <div style={{ background:"#0c0c1d", border:"1px solid #ffffff0f", borderRadius:16, padding:"20px 20px 16px", marginTop:14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        {config.title && (
          <div style={{ fontSize:12, fontFamily:"'JetBrains Mono'", color:"#7c3aed", fontWeight:500 }}>
            ▸ {config.title}
          </div>
        )}
        <button
          onClick={handleDownload}
          style={{
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 11,
            fontFamily: "'JetBrains Mono'",
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#5b21b6'}
          onMouseOut={(e) => e.target.style.background = '#7c3aed'}
        >
          📥 Download
        </button>
      </div>
      <div ref={chartRef}>
        <Comp data={data} options={baseOpts(isRadial)} />
      </div>
    </div>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX:"auto", marginTop:14, borderRadius:12, border:"1px solid #ffffff0f" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'JetBrains Mono'" }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ background:"#111128", color:"#7c3aed", padding:"8px 14px", textAlign:"left", borderBottom:"1px solid #ffffff0f", whiteSpace:"nowrap", fontWeight:500 }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0,20).map((row,i) => (
            <tr key={i} style={{ background: i%2===0?"transparent":"#ffffff03" }}>
              {row.map((v,j) => <td key={j} style={{ padding:"7px 14px", color:"#a09dbe", borderBottom:"1px solid #ffffff05", whiteSpace:"nowrap" }}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MESSAGE BUBBLE ────────────────────────────────────────────────
function MessageBubble({ msg }) {
  if (msg.role === "user") return (
    <div style={{ display:"flex", justifyContent:"flex-end", animation:"fadeUp .3s ease" }}>
      <div style={{ background:"linear-gradient(135deg,#7c3aed,#5b21b6)", borderRadius:"18px 18px 4px 18px", padding:"12px 18px", maxWidth:"75%", fontSize:14, lineHeight:1.6, boxShadow:"0 4px 20px rgba(124,58,237,.3)" }}>
        {msg.content}
      </div>
    </div>
  );

  if (msg.role === "error") return (
    <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:14, padding:"12px 16px", fontSize:13, color:"#ef4444", animation:"fadeUp .3s ease" }}>
      ⚠ {msg.content}
    </div>
  );

  const { result } = msg;
  if (!result) return null;

  return (
    <div style={{ animation:"fadeUp .3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ width:28, height:28, background:"linear-gradient(135deg,#7c3aed,#06b6d4)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>✦</div>
        <span style={{ fontSize:12, color:"#5c5a7a", fontFamily:"'JetBrains Mono'", textTransform:"uppercase", letterSpacing:"0.06em" }}>DataLens AI</span>
      </div>

      {result.summary && (
        <p style={{ fontSize:14, lineHeight:1.7, color:"#c4c2df", marginBottom:14 }}>{result.summary}</p>
      )}

      {result.insights?.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8, marginBottom:4 }}>
          {result.insights.map((ins,i) => <InsightCard key={i} {...ins} />)}
        </div>
      )}

      {result.chartConfig?.type && <ChartBlock config={result.chartConfig} />}

      {result.tableData?.headers && result.tableData?.rows && (
        <DataTable headers={result.tableData.headers} rows={result.tableData.rows} />
      )}
    </div>
  );
}

// ─── UPLOAD ZONE ──────────────────────────────────────────────────
function UploadZone({ onUpload, uploading, progress }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv":[".csv"], "text/tab-separated-values":[".tsv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"], "application/vnd.ms-excel":[".xls"] },
    maxFiles: 1, maxSize: 25*1024*1024, disabled: uploading,
    onDrop: (f) => f[0] && onUpload(f[0]),
  });

  return (
    <div {...getRootProps()} style={{
      border: `2px dashed ${isDragActive ? "#7c3aed" : "#ffffff15"}`,
      borderRadius: 24, padding: "56px 40px", textAlign: "center",
      cursor: uploading ? "default" : "pointer",
      background: isDragActive ? "rgba(124,58,237,.08)" : "rgba(255,255,255,.02)",
      transition: "all .25s", outline: "none",
      boxShadow: isDragActive ? "0 0 40px rgba(124,58,237,.15)" : "none",
      maxWidth: 560, margin: "0 auto",
    }}>
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <div style={{ position:"relative", width:72, height:72, margin:"0 auto 20px" }}>
            <svg viewBox="0 0 72 72" style={{ width:72, height:72, transform:"rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="30" fill="none" stroke="#ffffff0f" strokeWidth="4"/>
              <circle cx="36" cy="36" r="30" fill="none" stroke="#7c3aed" strokeWidth="4"
                strokeDasharray={`${(progress/100)*188} 188`} strokeLinecap="round"/>
            </svg>
            <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontFamily:"'JetBrains Mono'", color:"#7c3aed", fontWeight:500 }}>{progress}%</span>
          </div>
          <p style={{ color:"#a09dbe", fontSize:14 }}>Parsing your file…</p>
        </div>
      ) : (
        <>
          <div style={{ width:64, height:64, background:"rgba(124,58,237,.15)", border:"1px solid rgba(124,58,237,.3)", borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:26 }}>
            {isDragActive ? "📂" : "📁"}
          </div>
          <p style={{ fontSize:18, fontWeight:700, marginBottom:8, color:"#f1f0ff" }}>
            {isDragActive ? "Drop it!" : "Drop your spreadsheet here"}
          </p>
          <p style={{ fontSize:13, color:"#5c5a7a", marginBottom:20 }}>or click to browse — up to 25 MB</p>
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {[".csv",".xlsx",".xls",".tsv"].map(f => (
              <span key={f} style={{ fontSize:11, fontFamily:"'JetBrains Mono'", padding:"3px 12px", borderRadius:100, background:"rgba(255,255,255,.05)", border:"1px solid #ffffff12", color:"#a09dbe" }}>{f}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────
const FEATURES = [
  { icon:"🧠", t:"Natural Language", s:"Just describe what you want. No formulas, no SQL, no BI expertise needed." },
  { icon:"📊", t:"Auto Chart Selection", s:"AI picks the perfect chart — bar, line, pie, scatter, doughnut — based on your data." },
  { icon:"⚡", t:"Instant Insights", s:"Key metrics auto-extracted: totals, averages, top values — all computed in real time." },
  { icon:"🔄", t:"Multi-Turn Chat", s:"Follow up naturally. 'Filter to Q1.' 'Show as a line.' The AI remembers your context." },
  { icon:"📂", t:"Any Spreadsheet", s:"CSV, Excel (.xlsx/.xls), TSV — up to 25MB. Multiple sheets supported." },
  { icon:"🔒", t:"Private by Design", s:"Files live in memory only. Auto-deleted after 1 hour. Never stored, never shared." },
];

const PROMPTS = [
  "Show total sales by region as a bar chart",
  "What's the trend in monthly revenue?",
  "Pie chart of expenses by category",
  "Top 10 products by units sold",
  "Compare Q1 vs Q2 performance",
  "Scatter plot of price vs quantity",
  "Which rep had highest revenue?",
  "Average order value by segment",
];

function Landing({ onUpload, uploading, progress }) {
  return (
    <div style={{ minHeight:"100vh" }}>
      {/* Hero */}
      <div style={{ position:"relative", overflow:"hidden", paddingBottom:80 }}>
        {/* BG glow blobs */}
        <div style={{ position:"absolute", top:-200, left:"50%", transform:"translateX(-50%)", width:800, height:600, background:"radial-gradient(circle, rgba(124,58,237,.18) 0%, transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:100, left:"10%", width:300, height:300, background:"radial-gradient(circle, rgba(6,182,212,.08) 0%, transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:200, right:"10%", width:200, height:200, background:"radial-gradient(circle, rgba(236,72,153,.06) 0%, transparent 70%)", pointerEvents:"none" }}/>

        <div style={{ maxWidth:780, margin:"0 auto", padding:"100px 24px 60px", textAlign:"center" }}>
          {/* Badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(124,58,237,.12)", border:"1px solid rgba(124,58,237,.3)", borderRadius:100, padding:"6px 16px", marginBottom:32, animation:"fadeIn .6s ease" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#7c3aed", boxShadow:"0 0 10px #7c3aed", display:"inline-block", animation:"glow 2s infinite" }}/>
            <span style={{ fontSize:12, fontFamily:"'JetBrains Mono'", color:"#c4a0ff", fontWeight:500 }}>Powered by Google Gemini AI — Free Forever</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:"clamp(42px,7vw,80px)", fontWeight:900, lineHeight:1.05, letterSpacing:"-2px", marginBottom:24, animation:"fadeUp .7s .1s both" }}>
            <span style={{ display:"block", color:"#f1f0ff" }}>Your Spreadsheet.</span>
            <span style={{ display:"block", background:"linear-gradient(135deg,#7c3aed,#06b6d4,#10b981)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              Visualized Instantly.
            </span>
          </h1>

          <p style={{ fontSize:18, color:"#a09dbe", lineHeight:1.7, maxWidth:520, margin:"0 auto 48px", animation:"fadeUp .7s .2s both", fontWeight:400 }}>
            Upload any Excel or CSV file. Ask in plain English.
            Get beautiful charts and actionable insights — no Power BI, no formulas, no expertise needed.
          </p>

          {/* Upload zone */}
          <div style={{ animation:"fadeUp .7s .3s both" }}>
            <UploadZone onUpload={onUpload} uploading={uploading} progress={progress} />
          </div>

          {/* Social proof row */}
          <div style={{ display:"flex", justifyContent:"center", gap:32, marginTop:40, flexWrap:"wrap", animation:"fadeUp .7s .4s both" }}>
            {[["CSV, Excel, TSV","File formats"],["25 MB","Max file size"],["Free Forever","Gemini AI"],["Instant","No setup"]].map(([val,lbl]) => (
              <div key={lbl} style={{ textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#c4a0ff", fontFamily:"'JetBrains Mono'" }}>{val}</div>
                <div style={{ fontSize:11, color:"#5c5a7a", marginTop:2, textTransform:"uppercase", letterSpacing:"0.06em" }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrolling prompt marquee */}
      <div style={{ overflow:"hidden", borderTop:"1px solid #ffffff08", borderBottom:"1px solid #ffffff08", background:"rgba(255,255,255,.01)", padding:"14px 0", marginBottom:80 }}>
        <div style={{ display:"flex", gap:0, animation:"marquee 30s linear infinite", width:"max-content" }}>
          {[...PROMPTS,...PROMPTS].map((p,i) => (
            <span key={i} style={{ whiteSpace:"nowrap", padding:"0 24px", fontSize:13, color:"#5c5a7a", borderRight:"1px solid #ffffff08" }}>
              <span style={{ color:"#7c3aed", marginRight:8 }}>✦</span>{p}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 100px" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ fontSize:11, fontFamily:"'JetBrains Mono'", color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>CAPABILITIES</div>
          <h2 style={{ fontSize:"clamp(28px,4vw,42px)", fontWeight:800, letterSpacing:"-1px" }}>Everything you need.</h2>
          <p style={{ fontSize:16, color:"#a09dbe", marginTop:12 }}>Nothing you don't.</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          {FEATURES.map((f,i) => (
            <div key={f.t} style={{ background:"rgba(255,255,255,.02)", border:"1px solid #ffffff0f", borderRadius:20, padding:"28px 28px 24px", transition:"all .25s", cursor:"default" }}
              onMouseEnter={e => { e.currentTarget.style.border="1px solid rgba(124,58,237,.3)"; e.currentTarget.style.background="rgba(124,58,237,.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.border="1px solid #ffffff0f"; e.currentTarget.style.background="rgba(255,255,255,.02)"; }}>
              <div style={{ fontSize:28, marginBottom:16 }}>{f.icon}</div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8, color:"#f1f0ff" }}>{f.t}</h3>
              <p style={{ fontSize:14, color:"#5c5a7a", lineHeight:1.65 }}>{f.s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 100px" }}>
        <div style={{ textAlign:"center", marginBottom:56 }}>
          <div style={{ fontSize:11, fontFamily:"'JetBrains Mono'", color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:12 }}>WORKFLOW</div>
          <h2 style={{ fontSize:"clamp(28px,4vw,42px)", fontWeight:800, letterSpacing:"-1px" }}>How it works</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:0, position:"relative" }}>
          {[
            { n:"01", t:"Upload", s:"Drop any CSV or Excel file — up to 25 MB" },
            { n:"02", t:"Ask", s:"Describe what you want in plain English" },
            { n:"03", t:"Visualize", s:"AI computes and renders the perfect chart" },
            { n:"04", t:"Iterate", s:"Follow up, filter, compare — infinitely" },
          ].map((s,i) => (
            <div key={s.n} style={{ textAlign:"center", padding:"32px 24px", position:"relative" }}>
              <div style={{ width:48, height:48, background:"rgba(124,58,237,.15)", border:"1px solid rgba(124,58,237,.3)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontFamily:"'JetBrains Mono'", fontSize:13, color:"#7c3aed", fontWeight:500 }}>{s.n}</div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{s.t}</h3>
              <p style={{ fontSize:13, color:"#5c5a7a", lineHeight:1.6 }}>{s.s}</p>
              {i < 3 && <div style={{ position:"absolute", top:56, right:-4, fontSize:20, color:"#ffffff10" }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"0 24px 120px", textAlign:"center" }}>
        <div style={{ background:"linear-gradient(135deg,rgba(124,58,237,.15),rgba(6,182,212,.08))", border:"1px solid rgba(124,58,237,.2)", borderRadius:28, padding:"56px 40px" }}>
          <h2 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:800, letterSpacing:"-1px", marginBottom:12 }}>Ready to see your data?</h2>
          <p style={{ color:"#a09dbe", fontSize:15, marginBottom:32 }}>Drop your spreadsheet above and start asking questions for free.</p>
          <a href="#top" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}
            style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#7c3aed,#5b21b6)", color:"white", padding:"14px 32px", borderRadius:100, fontSize:15, fontWeight:600, boxShadow:"0 8px 30px rgba(124,58,237,.4)", transition:"all .2s" }}>
            Upload a file now →
          </a>
        </div>
      </div>

      <div style={{ borderTop:"1px solid #ffffff08", padding:"24px", textAlign:"center", fontSize:12, color:"#5c5a7a" }}>
        DataLens AI · Built with Google Gemini · Data never stored beyond your session
      </div>
    </div>
  );
}

// ─── WORKSPACE ────────────────────────────────────────────────────
function Workspace({ fileInfo, messages, analyzing, onQuery, onReset }) {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const { headers, columnTypes, stats, preview, rowCount, originalName } = fileInfo;

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

  return (
    <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", height:"calc(100vh - 64px)", overflow:"hidden" }}>
      {/* LEFT PANEL */}
      <div style={{ background:"#0c0c1d", borderRight:"1px solid #ffffff0f", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* File info */}
        <div style={{ padding:"16px", borderBottom:"1px solid #ffffff0f", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"rgba(124,58,237,.2)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>📄</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{originalName}</div>
              <div style={{ fontSize:11, color:"#5c5a7a", fontFamily:"'JetBrains Mono'", marginTop:2 }}>{rowCount.toLocaleString()} rows · {headers.length} cols</div>
            </div>
            <button onClick={onReset} style={{ color:"#5c5a7a", fontSize:18, lineHeight:1, padding:4, borderRadius:6, transition:"color .15s" }}
              onMouseEnter={e=>e.target.style.color="#ef4444"} onMouseLeave={e=>e.target.style.color="#5c5a7a"}>✕</button>
          </div>
          {/* Type pills */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
            {numCols.length > 0 && <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 8px", borderRadius:100, background:"rgba(6,182,212,.12)", border:"1px solid rgba(6,182,212,.2)", color:"#06b6d4" }}>📊 {numCols.length} numeric</span>}
            {catCols.length > 0 && <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 8px", borderRadius:100, background:"rgba(124,58,237,.12)", border:"1px solid rgba(124,58,237,.2)", color:"#a78bfa" }}>🏷 {catCols.length} categorical</span>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #ffffff0f", flexShrink:0 }}>
          {["preview","columns"].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{ flex:1, padding:"10px", fontSize:12, fontWeight:500, color: activeTab===tab?"#c4a0ff":"#5c5a7a", borderBottom: activeTab===tab?"2px solid #7c3aed":"2px solid transparent", transition:"all .15s", background:"none", textTransform:"capitalize" }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
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

      {/* RIGHT — CHAT */}
      <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:"#05050f" }}>
        {/* Messages */}
        <div style={{ flex:1, overflow:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {messages.length === 0 && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:40 }}>
              <div style={{ fontSize:40, marginBottom:16, animation:"float 3s ease-in-out infinite" }}>✦</div>
              <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8, letterSpacing:"-0.5px" }}>Ask anything about your data</h2>
              <p style={{ color:"#5c5a7a", fontSize:14, marginBottom:32 }}>Try one of these or type your own question</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8, width:"100%", maxWidth:640 }}>
                {suggestions.map(s => (
                  <button key={s} onClick={()=>onQuery(s)} style={{ background:"rgba(255,255,255,.02)", border:"1px solid #ffffff0f", borderRadius:12, padding:"11px 16px", fontSize:13, color:"#a09dbe", textAlign:"left", transition:"all .2s", lineHeight:1.4 }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,.4)";e.currentTarget.style.color="#c4a0ff";e.currentTarget.style.background="rgba(124,58,237,.06)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#ffffff0f";e.currentTarget.style.color="#a09dbe";e.currentTarget.style.background="rgba(255,255,255,.02)";}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {analyzing && (
            <div style={{ display:"flex", alignItems:"center", gap:12, color:"#5c5a7a", fontSize:13, animation:"fadeIn .3s ease" }}>
              <ThinkingDots />
              <span>Analyzing your data…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestion strip */}
        {messages.length > 0 && (
          <div style={{ display:"flex", gap:8, padding:"10px 28px", borderTop:"1px solid #ffffff08", overflowX:"auto" }}>
            {suggestions.slice(0,3).map(s => (
              <button key={s} onClick={()=>onQuery(s)} style={{ whiteSpace:"nowrap", fontSize:12, padding:"5px 14px", borderRadius:100, border:"1px solid #ffffff0f", background:"rgba(255,255,255,.02)", color:"#5c5a7a", transition:"all .15s", flexShrink:0 }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,.4)";e.currentTarget.style.color="#c4a0ff";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#ffffff0f";e.currentTarget.style.color="#5c5a7a";}}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"16px 28px 20px", borderTop:"1px solid #ffffff08", flexShrink:0 }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-end", background:"rgba(255,255,255,.03)", border:"1.5px solid #ffffff12", borderRadius:16, padding:"10px 12px 10px 16px", transition:"border-color .2s" }}
            onFocusCapture={e=>e.currentTarget.style.borderColor="rgba(124,58,237,.5)"}
            onBlurCapture={e=>e.currentTarget.style.borderColor="#ffffff12"}>
            <textarea ref={inputRef} value={input}
              onChange={e=>{setInput(e.target.value);const el=e.target;el.style.height="auto";el.style.height=Math.min(el.scrollHeight,120)+"px";}}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}}}
              placeholder="Ask about your data… e.g. 'Show revenue by month as a line chart'"
              disabled={analyzing}
              rows={1}
              style={{ flex:1, background:"none", border:"none", outline:"none", color:"#f1f0ff", fontSize:14, lineHeight:1.5, resize:"none", minHeight:24, maxHeight:120, fontFamily:"'Inter'", padding:0 }}
            />
            <button onClick={submit} disabled={!input.trim()||analyzing}
              style={{ width:38, height:38, background: input.trim()&&!analyzing?"linear-gradient(135deg,#7c3aed,#5b21b6)":"#ffffff0a", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .2s", boxShadow: input.trim()&&!analyzing?"0 4px 16px rgba(124,58,237,.4)":"none" }}>
              {analyzing ? <Spinner/> : <svg viewBox="0 0 20 20" fill="white" width="16" height="16"><path d="M2 10.5L17 3l-3 14-4-5-3 2 1-5z"/></svg>}
            </button>
          </div>
          <p style={{ fontSize:11, color:"#2e2c4a", marginTop:8, textAlign:"right", fontFamily:"'JetBrains Mono'" }}>Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────
function Header({ fileLoaded, onReset }) {
  return (
    <header style={{ height:64, borderBottom:"1px solid #ffffff08", background:"rgba(5,5,15,.85)", backdropFilter:"blur(16px)", position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", padding:"0 28px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", maxWidth:1400, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#7c3aed,#5b21b6)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 20 20" fill="white" width="16" height="16"><rect x="2" y="2" width="6" height="6" rx="1.5"/><rect x="12" y="2" width="6" height="6" rx="1.5" opacity=".6"/><rect x="2" y="12" width="6" height="6" rx="1.5" opacity=".6"/><rect x="12" y="12" width="6" height="6" rx="1.5"/></svg>
          </div>
          <span style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.3px" }}>DataLens</span>
          <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", background:"rgba(124,58,237,.2)", border:"1px solid rgba(124,58,237,.35)", color:"#c4a0ff", padding:"2px 8px", borderRadius:100, letterSpacing:"0.06em" }}>AI</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {fileLoaded && (
            <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, fontFamily:"'JetBrains Mono'", color:"#5c5a7a" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 8px #10b981", display:"inline-block" }}/>
              Session active
            </div>
          )}
          {onReset && (
            <button onClick={onReset} style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, padding:"7px 16px", borderRadius:100, border:"1px solid #ffffff15", color:"#a09dbe", transition:"all .2s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(124,58,237,.5)";e.currentTarget.style.color="#c4a0ff";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#ffffff15";e.currentTarget.style.color="#a09dbe";}}>
              ↺ New file
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────
export default function App() {
  const { fileInfo, uploading, uploadProgress, messages, analyzing, handleUpload, handleQuery, handleReset } = useAnalysis();

  return (
    <>
      <Header fileLoaded={!!fileInfo} onReset={fileInfo ? handleReset : null} />
      {fileInfo ? (
        <Workspace fileInfo={fileInfo} messages={messages} analyzing={analyzing} onQuery={handleQuery} onReset={handleReset} />
      ) : (
        <Landing onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
      )}
    </>
  );
}
