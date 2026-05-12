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

const COLORS = ["#f59e0b","#fbbf24","#facc15","#ea580c","#d97706","#78350f","#b45309","#a16207","#ca8a04","#eab308","#fb923c","#fdba74"];
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
    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid var(--border)", backdropFilter:"blur(10px)", borderRadius:16, padding:"20px 20px 16px", marginTop:14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        {config.title && (
          <div style={{ fontSize:12, fontFamily:"var(--mono)", color:"var(--accent)", fontWeight:600 }}>
            <span style={{ marginRight:8 }}>✦</span>{config.title}
          </div>
        )}
        <button
          onClick={handleDownload}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 11,
            fontFamily: "var(--mono)",
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px var(--glow)'
          }}
          onMouseOver={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 16px var(--glow)'; }}
          onMouseOut={(e) => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 12px var(--glow)'; }}
        >
          📥 Export
        </button>
      </div>
      <div ref={chartRef} style={{ padding: 10 }}>
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
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:32, height:32, background:"linear-gradient(135deg, var(--accent), var(--accent2))", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:"0 4px 12px var(--glow)" }}>✦</div>
        <span style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:700 }}>DataLens Intelligence</span>
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
    <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", height:"calc(100vh - 72px)", overflow:"hidden", marginTop: 72 }}>
      <div style={{ background:"var(--bg2)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"20px", borderBottom:"1px solid var(--border)", flexShrink:0, background:"rgba(255,255,255,0.01)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"rgba(139, 92, 246, 0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:"1px solid rgba(139, 92, 246, 0.2)" }}>📄</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"var(--text)" }}>{originalName}</div>
              <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)", marginTop:2, fontWeight:500 }}>{rowCount.toLocaleString()} entries · {headers.length} properties</div>
            </div>
            <button onClick={onReset} style={{ color:"var(--text4)", fontSize:18, lineHeight:1, padding:6, borderRadius:8, transition:"all 0.2s" }}
              onMouseEnter={e=>{e.target.style.color="var(--accent2)"; e.target.style.background="rgba(217,70,239,0.1)"}} onMouseLeave={e=>{e.target.style.color="var(--text4)"; e.target.style.background="none"}}>✕</button>
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

      <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", background:"#05050f" }}>
        <div style={{ flex:1, overflow:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {messages.map((m,i) => <MessageBubble key={i} msg={m} />)}
          {analyzing && <div style={{ display:"flex", gap:12, animation:"fadeUp .3s ease" }}><ThinkingDots /></div>}
          <div ref={endRef} />
        </div>

        <div style={{ borderTop:"1px solid var(--border)", padding:"20px", flexShrink:0, background:"rgba(255,255,255,0.01)" }}>
          {suggestions.length > 0 && (
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
                  onMouseEnter={e => { e.target.style.background="rgba(139, 92, 246, 0.1)"; e.target.style.borderColor="rgba(139, 92, 246, 0.3)"; }}
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
    <div style={{
      background: "rgba(255, 255, 255, 0.02)",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      borderRadius: 24,
      padding: "40px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
      textAlign: "left",
      transition: "all 0.3s ease",
      height: "100%",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.transform = "translateY(-5px)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: 18,
        fontWeight: 800,
        boxShadow: "0 8px 20px var(--glow)"
      }}>
        {step}
      </div>
      <div>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{title}</h3>
        <p style={{ margin: 0, color: "var(--text3)", lineHeight: 1.6, fontSize: 16 }}>{description}</p>
      </div>
    </div>
  );

  if (!fileInfo?.headers) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--text)", display:"flex", flexDirection:"column", position:"relative" }}>
        <div style={{ position:"absolute", top:"-10%", left:"-10%", width:"50%", height:"50%", background:"var(--glow)", filter:"blur(120px)", opacity:0.15, borderRadius:"50%", animation:"glow 8s infinite alternate" }}></div>
        <div style={{ position:"absolute", bottom:"-10%", right:"-10%", width:"60%", height:"60%", background:"var(--glow2)", filter:"blur(140px)", opacity:0.1, borderRadius:"50%", animation:"glow 12s infinite alternate-reverse" }}></div>
        
        <Header />
        
        <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 40px", position:"relative", zIndex:2, minHeight: "calc(100vh - 72px)", marginTop: 72 }}>
          <div style={{ animation:"fadeUp .8s cubic-bezier(0.16, 1, 0.3, 1)", width:"100%", maxWidth:1200, textAlign:"center", padding: "80px 0" }}>
            <h1 style={{ fontSize:"clamp(48px, 6vw, 84px)", fontWeight:900, marginBottom:24, letterSpacing:"-0.04em", lineHeight:1, background:"linear-gradient(135deg, #fff 30%, var(--accent) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Spreadsheets,<br/>Meet Intelligence.
            </h1>
            
            <p style={{ fontSize:22, color:"var(--text2)", maxWidth:720, margin:"0 auto 48px", lineHeight:1.6 }}>
              Stop wrestling with charts. Just drop your file and ask questions. DataLens AI builds the visualizations you need, instantly.
            </p>
            
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:100 }}>
              <button onClick={scrollToUpload} style={{ background:"linear-gradient(135deg, var(--accent), var(--accent2))", color:"white", borderRadius:14, padding:"18px 36px", fontSize:16, fontWeight:700, boxShadow:"0 10px 40px var(--glow)", cursor:"pointer", border:"none", transition:"all 0.3s" }} onMouseEnter={e=>e.target.style.transform="translateY(-2px)"} onMouseLeave={e=>e.target.style.transform="none"}>
                Get Started Free
              </button>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: "smooth" })} style={{ background:"rgba(255,255,255,.03)", color:"var(--text2)", borderRadius:14, padding:"18px 36px", fontSize:16, fontWeight:700, border:"1px solid var(--border2)", cursor:"pointer", transition:"all 0.2s" }} onMouseOver={e=>e.target.style.background="rgba(255,255,255,0.06)"} onMouseOut={e=>e.target.style.background="rgba(255,255,255,0.03)"}>
                How It Works
              </button>
            </div>

            <div id="how-it-works" style={{ marginBottom: 140, marginTop: 100, textAlign: "center" }}>
              <Section>
                <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>How It Works</h2>
                <p style={{ fontSize: 18, color: "var(--text3)", marginBottom: 60, maxWidth: 600, margin: "0 auto 60px" }}>
                  Three simple steps to unlock deep insights from your data.
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 32,
                  maxWidth: 1100,
                  margin: "0 auto"
                }}>
                  <StepCard
                    step="1"
                    title="Upload"
                    description="Drag and drop your dataset. We support CSV, Excel, and TSV files up to 25MB."
                  />
                  <StepCard
                    step="2"
                    title="Analyze"
                    description="Ask questions in plain English. Our AI analyzes your data and finds key trends."
                  />
                  <StepCard
                    step="3"
                    title="Visualize"
                    description="Get instant charts and insights. Export high-quality visualizations with one click."
                  />
                </div>
              </Section>
            </div>

            <div id="features" style={{ marginBottom: 140, textAlign: "center" }}>
              <Section>
                <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>Powerful Features</h2>
                <p style={{ fontSize: 18, color: "var(--text3)", marginBottom: 60, maxWidth: 600, margin: "0 auto 60px" }}>
                  Everything you need to turn raw data into actionable intelligence.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:24, maxWidth: 1100, margin: "0 auto" }}>
                  {[
                    { t: "Instant Viz", d: "Automatic chart generation based on natural language queries. No manual plotting needed.", i: "📊" },
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

            <div ref={uploadSectionRef} style={{ padding:"100px 0", position:"relative" }}>
              <div style={{ position:"absolute", inset:0, background:"var(--accent)", filter:"blur(120px)", opacity:0.05, transform:"scale(0.8)" }}></div>
              <div style={{ position:"relative" }}>
                <h2 style={{ fontSize:32, fontWeight:800, marginBottom:40, letterSpacing:"-0.02em" }}>Ready to analyze?</h2>
                <UploadZone onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
              </div>
            </div>
          </div>
        </main>
      </div>
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
