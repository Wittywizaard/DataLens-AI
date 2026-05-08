import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { useDropzone } from "react-dropzone";
import html2canvas from "html2canvas";
import useAnalysis from "../useAnalysis.js";
import { Header } from "../components/Header";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ["#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#3b82f6","#14b8a6","#f97316","#84cc16","#a855f7"];
const CHART_MAP = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut, scatter: Scatter };

const baseOpts = (isRadial) => ({
  responsive: true, maintainAspectRatio: false,
  width: isRadial ? 300 : 400, height: isRadial ? 250 : 300,
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

function UploadZone({ onUpload, uploading, progress }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv":[".csv"], "text/tab-separated-values":[".tsv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"], "application/vnd.ms-excel":[".xls"] },
    maxFiles: 1, maxSize: 25*1024*1024, disabled: uploading,
    onDrop: (f) => f[0] && onUpload(f[0]),
  });

  return (
    <div {...getRootProps()} style={{
      border: `2px dashed ${isDragActive ? "#7c3aed" : "#ffffff20"}`,
      borderRadius: 32, padding: "60px 44px", textAlign: "center",
      cursor: uploading ? "default" : "pointer",
      background: isDragActive ? "linear-gradient(135deg, rgba(124,58,237,.15), rgba(91,33,182,.15))" : "linear-gradient(135deg, rgba(255,255,255,.03), rgba(124,58,237,.02))",
      transition: "all .25s ease",
      outline: "none",
      boxShadow: isDragActive ? "0 0 45px rgba(124,58,237,.18)" : "0 24px 90px rgba(0,0,0,.14)",
      maxWidth: 720,
      margin: "0 auto",
      minWidth: 320,
      minHeight: 340,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
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
          <div style={{ width:96, height:96, background:"rgba(124,58,237,.18)", border:"1px solid rgba(124,58,237,.35)", borderRadius:22, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", fontSize:32, color:"#7c3aed" }}>
            {isDragActive ? "📂" : "📁"}
          </div>
          <p style={{ fontSize:22, fontWeight:700, marginBottom:10, color:"#f1f0ff" }}>
            {isDragActive ? "Drop it here" : "Drop your spreadsheet here"}
          </p>
          <p style={{ fontSize:15, color:"#b9b6d2", marginBottom:24, maxWidth:520, marginLeft:"auto", marginRight:"auto" }}>
            Click to browse files or drag and drop your Excel/CSV into the card to start analytics instantly.
          </p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            {[".csv",".xlsx",".xls",".tsv"].map(f => (
              <span key={f} style={{ fontSize:11, fontFamily:"'JetBrains Mono'", padding:"8px 16px", borderRadius:999, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.12)", color:"#a09dbe" }}>{f}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Workspace({ fileInfo, messages, analyzing, onQuery, onReset }) {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const endRef = useRef(null);
  const inputRef = useRef(null);
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

  return (
    <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", height:"calc(100vh - 64px)", overflow:"hidden" }}>
      <div style={{ background:"#0c0c1d", borderRight:"1px solid #ffffff0f", display:"flex", flexDirection:"column", overflow:"hidden" }}>
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
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
            {numCols.length > 0 && <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 8px", borderRadius:100, background:"rgba(6,182,212,.12)", border:"1px solid rgba(6,182,212,.2)", color:"#06b6d4" }}>📊 {numCols.length} numeric</span>}
            {catCols.length > 0 && <span style={{ fontSize:10, fontFamily:"'JetBrains Mono'", padding:"2px 8px", borderRadius:100, background:"rgba(124,58,237,.12)", border:"1px solid rgba(124,58,237,.2)", color:"#a78bfa" }}>🏷 {catCols.length} categorical</span>}
          </div>
        </div>

        <div style={{ display:"flex", borderBottom:"1px solid #ffffff0f", flexShrink:0 }}>
          {["preview","columns"].map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{ flex:1, padding:"10px", fontSize:12, fontWeight:500, color: activeTab===tab?"#c4a0ff":"#5c5a7a", borderBottom: activeTab===tab?"2px solid #7c3aed":"2px solid transparent", transition:"all .15s", background:"none", textTransform:"capitalize" }}>
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

      <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:"#05050f" }}>
        <div style={{ flex:1, overflow:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {messages.map((m,i) => <MessageBubble key={i} msg={m} />)}
          {analyzing && <div style={{ display:"flex", gap:12, animation:"fadeUp .3s ease" }}><ThinkingDots /></div>}
          <div ref={endRef} />
        </div>

        <div style={{ borderTop:"1px solid #ffffff0f", padding:"16px", flexShrink:0 }}>
          {suggestions.length > 0 && (
            <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", paddingBottom:8 }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => onQuery(s)}
                  style={{
                    fontSize:11, fontFamily:"'JetBrains Mono'", padding:"6px 12px", borderRadius:100,
                    background:"rgba(124,58,237,.1)", border:"1px solid rgba(124,58,237,.2)", color:"#a78bfa",
                    cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s", flexShrink:0
                  }}
                  onMouseEnter={e => { e.target.style.background="rgba(124,58,237,.2)"; }}
                  onMouseLeave={e => { e.target.style.background="rgba(124,58,237,.1)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key==="Enter" && submit()}
              placeholder="Ask anything about your data..."
              style={{
                flex:1, padding:"10px 14px", background:"#111128", border:"1px solid #ffffff15", borderRadius:10,
                color:"#f1f0ff", fontSize:13, outline:"none", transition:"all .15s"
              }}
              onFocus={e => e.target.style.borderColor="#7c3aed"}
              onBlur={e => e.target.style.borderColor="#ffffff15"}
            />
            <button
              onClick={submit}
              disabled={analyzing || !input.trim()}
              style={{
                padding:"10px 16px", background:analyzing?"#5c5a7a":"#7c3aed", color:"white", border:"none",
                borderRadius:10, fontWeight:600, fontSize:13, cursor: analyzing?"default":"pointer", transition:"all .15s"
              }}
              onMouseEnter={e => !analyzing && (e.target.style.background="#5b21b6")}
              onMouseLeave={e => !analyzing && (e.target.style.background="#7c3aed")}
            >
              {analyzing ? <Spinner /> : "Send"}
            </button>
          </div>
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
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : "translateY(28px)",
        transition: "opacity .75s ease, transform .75s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export function Dashboard() {
  const { fileInfo, uploading, uploadProgress, messages, analyzing, uploadFile, queryAnalysis, reset } = useAnalysis();
  const uploadSectionRef = useRef(null);
  const scrollToUpload = () => uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleUpload = async (file) => {
    await uploadFile(file);
  };

  const handleReset = () => {
    reset();
  };

  const FeatureCard = ({ title, description }) => (
    <div style={{ background: "#0c0c1d", border: "1px solid #ffffff12", borderRadius:20, padding:30, minHeight:180, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
      <div>
        <div style={{ fontSize:18, fontWeight:700, color:"#f1f0ff", marginBottom:12 }}>{title}</div>
        <p style={{ margin:0, color:"#b9b6d2", lineHeight:1.8, fontSize:15 }}>{description}</p>
      </div>
    </div>
  );

  const StepCard = ({ step, title, description }) => (
    <div style={{ background: "#070718", border: "1px solid #ffffff10", borderRadius:18, padding:20, display:"grid", gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:14, background: "rgba(124,58,237,.14)", color: "#7c3aed", display:"grid", placeItems:"center", fontWeight:800 }}>{step}</div>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:"#f1f0ff", marginBottom:8 }}>{title}</div>
        <p style={{ margin:0, color:"#b9b6d2", lineHeight:1.8, fontSize:14 }}>{description}</p>
      </div>
    </div>
  );

  if (!fileInfo?.headers) {
    return (
      <>
        <Header />
        <div style={{ minHeight:"calc(100vh - 64px)", background:"#05050f", color:"#f1f0ff" }}>
          <div style={{ maxWidth:1000, margin:"0 auto", padding:"100px 24px 100px", display:"grid", gap:100, alignItems:"center" }}>
            <Section style={{ padding:0, textAlign:"center" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:22, alignItems:"center" }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(124,58,237,.12)", border:"1px solid rgba(124,58,237,.28)", borderRadius:100, padding:"10px 20px", width:"fit-content" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:"#7c3aed", boxShadow:"0 0 12px #7c3aed" }} />
                  <span style={{ fontSize:13, color:"#c4a0ff", fontWeight:600 }}>Open-source BI workflow for modern teams</span>
                </div>
                <div>
                  <h1 style={{ fontSize:"clamp(48px,5vw,84px)", fontWeight:900, lineHeight:1.02, marginBottom:24 }}>
                    Your data, <span style={{ color:"#7c3aed" }}>instantly visual</span>.
                  </h1>
                  <p style={{ fontSize:18, color:"#b9b6d2", lineHeight:1.8, maxWidth:760, margin:"0 auto" }}>
                    Upload any spreadsheet, ask natural language questions, and watch the AI build charts, metrics, and insights step by step.
                  </p>
                </div>
                <div style={{ display:"flex", justifyContent:"center", gap:16, flexWrap:"wrap" }}>
                  <button onClick={scrollToUpload} style={{ background:"linear-gradient(135deg,#7c3aed,#5b21b6)", color:"white", borderRadius:999, padding:"14px 26px", fontSize:15, fontWeight:700, boxShadow:"0 20px 60px rgba(124,58,237,.18)", cursor:"pointer" }}>
                    Upload your spreadsheet
                  </button>
                  <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: "smooth" })} style={{ background:"rgba(255,255,255,.06)", color:"#c4c2df", borderRadius:999, padding:"14px 26px", fontSize:15, fontWeight:700, border:"1px solid rgba(255,255,255,.12)", cursor:"pointer" }}>
                    How it works
                  </button>
                </div>
              </div>
            </Section>

            <Section style={{ padding:0, textAlign:"center" }}>
              <div style={{ maxWidth:720, margin:"0 auto" }}>
                <div style={{ fontSize:12, color:"#7c3aed", fontWeight:700, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.2em" }}>Agentic AI</div>
                <h2 style={{ fontSize:38, lineHeight:1.05, margin:0, marginBottom:18 }}>Upload, ask, visualize.</h2>
              </div>
            </Section>

            <Section style={{ padding:0, textAlign:"center" }}>
              <div style={{ display:"grid", gap:18, justifyItems:"center" }}>
                <div style={{ fontSize:12, color:"#7c3aed", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.24em" }}>What you get</div>
                <div style={{ display:"grid", gap:18, width:"100%", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))" }}>
                  {[
                    { title: "AI-driven spreadsheet analysis", description: "Upload your file, ask questions, and get actionable visuals automatically." },
                    { title: "Multi-turn agentic experience", description: "Follow up with new questions like 'Show only Q1' or 'Compare by region'." },
                    { title: "No signup needed", description: "Start analyzing data immediately without authentication friction." },
                    { title: "Secure session storage", description: "Files are temporary and removed after the session completes." },
                  ].map((item) => <FeatureCard key={item.title} {...item} />)}
                </div>
              </div>
            </Section>

            <Section id="how-it-works" style={{ padding:0, textAlign:"center" }}>
              <div style={{ display:"grid", gap:20, justifyItems:"center", width:"100%" }}>
                <div style={{ fontSize:12, color:"#7c3aed", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.24em" }}>How it works</div>
                <div style={{ display:"grid", gap:20, width:"100%", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))" }}>
                  <StepCard step="1" title="Upload your spreadsheet" description="Drop a CSV or Excel file to start the experience." />
                  <StepCard step="2" title="Ask your question" description="Use natural language prompts and follow up as needed." />
                  <StepCard step="3" title="Review charts & insights" description="The agent builds visuals and metrics for fast decisions." />
                </div>
              </div>
            </Section>

            <Section style={{ padding:0, textAlign:"center" }}>
              <div ref={uploadSectionRef} style={{ width:"100%", maxWidth:760, margin:"0 auto" }}>
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontSize:12, color:"#7c3aed", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.24em", marginBottom:12 }}>Get started</div>
                  <h2 style={{ fontSize:34, lineHeight:1.05, margin:0, marginBottom:14 }}>Drop your spreadsheet here</h2>
                  <p style={{ color:"#b9b6d2", lineHeight:1.7, maxWidth:640, margin:"0 auto" }}>
                    Upload Excel or CSV and let the AI generate instant visual analysis. The upload card is interactive, centered, and designed to feel premium.
                  </p>
                </div>
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <UploadZone onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
                </div>
              </div>
            </Section>
          </div>
        </div>
      </>
    );
  }

  const safeFileInfo = fileInfo || {};
  return (
    <>
      <Header />
      <Workspace
        fileInfo={safeFileInfo}
        messages={messages}
        analyzing={analyzing}
        onQuery={queryAnalysis}
        onReset={handleReset}
      />
    </>
  );
}
