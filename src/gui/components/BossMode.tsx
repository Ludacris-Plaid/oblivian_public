import React, { useState, useEffect, useRef } from "react";

const EMPLOYEES = [
  { name: "James Wilson", dept: "Engineering", salary: 95000, status: "Active" },
  { name: "Sarah Chen", dept: "Marketing", salary: 78000, status: "Active" },
  { name: "Michael Torres", dept: "Finance", salary: 88000, status: "Active" },
  { name: "Emily Davis", dept: "Operations", salary: 72000, status: "On Leave" },
  { name: "David Kim", dept: "Engineering", salary: 110000, status: "Active" },
  { name: "Lisa Anderson", dept: "HR", salary: 65000, status: "Active" },
  { name: "Robert Martinez", dept: "Sales", salary: 82000, status: "Active" },
  { name: "Amanda Lee", dept: "Design", salary: 76000, status: "Active" },
];

const QTR_DATA = [
  { label: "Q1", revenue: 1.8, expenses: 1.3, profit: 0.5 },
  { label: "Q2", revenue: 2.1, expenses: 1.5, profit: 0.6 },
  { label: "Q3", revenue: 2.4, expenses: 1.8, profit: 0.6 },
  { label: "Q4", revenue: 2.9, expenses: 2.0, profit: 0.9 },
];

const MAX_BAR = Math.max(...QTR_DATA.map(d => d.revenue));

const BossMode: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  // Calculator state
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPrev, setCalcPrev] = useState(0);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcClearNext, setCalcClearNext] = useState(false);

  const [hideUi, setHideUi] = useState(false);

  useEffect(() => {
    const c = chartRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 380; const h = 200;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);
    let t = 0;

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = 20 + i * ((h - 40) / 4);
        ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(w - 10, y); ctx.stroke();
      }

      // Bars with animation — wider, more spaced, no legend overlap
      QTR_DATA.forEach((d, i) => {
        const bw = 55;
        const gap = 28;
        const x = 30 + i * (bw + gap);
        const bh = ((d.revenue / MAX_BAR) * (h - 60)) * Math.min(1, t * 0.5);
        const by = h - 30 - bh;

        // Revenue bar — thicker with stronger glow
        const grad = ctx.createLinearGradient(x, by, x, h - 30);
        grad.addColorStop(0, "#3b82f6");
        grad.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = grad;
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 6;
        ctx.fillRect(x, by, bw / 2 - 2, bh);
        ctx.shadowBlur = 0;

        // Expenses bar — cleaner grey
        const exx = x + bw / 2 + 2;
        const exh = ((d.expenses / MAX_BAR) * (h - 60)) * Math.min(1, t * 0.5);
        const exy = h - 30 - exh;
        ctx.fillStyle = "#475569";
        ctx.fillRect(exx, exy, bw / 2 - 2, exh);

        // Label
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(d.label, x + bw / 2, h - 12);
      });

      // Legend — moved to top-left to avoid Q4 overlap
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(10, 10, 8, 8);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText("Revenue", 22, 18);
      ctx.fillStyle = "#475569";
      ctx.fillRect(10, 24, 8, 8);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Expenses", 22, 32);

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  const calcInput = (v: string) => {
    if (calcClearNext) { setCalcDisplay(v); setCalcClearNext(false); }
    else { setCalcDisplay(d => d === "0" ? v : d + v); }
  };

  const calcOperator = (op: string) => {
    setCalcPrev(parseFloat(calcDisplay));
    setCalcOp(op);
    setCalcClearNext(true);
  };

  const calcEquals = () => {
    const cur = parseFloat(calcDisplay);
    const prev = calcPrev;
    let result = 0;
    if (calcOp === "+") result = prev + cur;
    else if (calcOp === "−") result = prev - cur;
    else if (calcOp === "×") result = prev * cur;
    else if (calcOp === "÷") result = prev / cur;
    else result = cur;
    setCalcDisplay(String(Math.round(result * 100) / 100));
    setCalcPrev(result);
    setCalcOp(null);
    setCalcClearNext(true);
  };

  const calcClear = () => { setCalcDisplay("0"); setCalcPrev(0); setCalcOp(null); };

  const calcBtns = [
    ["7", "8", "9", "÷"],
    ["4", "5", "6", "×"],
    ["1", "2", "3", "−"],
    ["0", ".", "=", "+"],
  ];

  const btnStyle = (label: string): React.CSSProperties => ({
    padding: 0, border: "none", borderRadius: 4, cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    color: ["÷", "×", "−", "+", "="].includes(label) ? "#2563eb" : "#e0e0e0",
    background: ["÷", "×", "−", "+"].includes(label) ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.04)",
    transition: "all 0.1s",
    outline: "none",
  });

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      zIndex: 99999, display: "flex", flexDirection: "column",
      background: "#0f172a", color: "#e0e0e0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
    }}>
      {/* ── Top Bar ── */}
      <div style={{
        height: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: "#1e293b", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>D</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", letterSpacing: 0.5 }}>DataSync Analytics Pro</span>
            <span style={{ fontSize: 10, color: "#475569", fontWeight: 500, padding: "1px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>v3.2</span>
          </div>
          <span style={{ color: "#475569", fontSize: 10 }}>|</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>Dashboard</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>Reports</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>Invoices</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 10, color: "#64748b" }}>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>JD</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{
          width: 180, flexShrink: 0, padding: "16px 0",
          background: "#1e293b", borderRight: "1px solid rgba(255,255,255,0.04)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {[
            { icon: "📊", label: "Dashboard", active: true },
            { icon: "📈", label: "Reports" },
            { icon: "📄", label: "Invoices" },
            { icon: "👥", label: "Employees" },
            { icon: "💳", label: "Payroll" },
            { icon: "📋", label: "Projects" },
            { icon: "⚙️", label: "Settings" },
          ].map((item) => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 16px", cursor: "default",
              background: item.active ? "rgba(37,99,235,0.1)" : "transparent",
              borderRight: item.active ? "2px solid #2563eb" : "2px solid transparent",
              color: item.active ? "#2563eb" : "#64748b",
              fontSize: 12, fontWeight: item.active ? 600 : 400,
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "Total Revenue", value: "$2.4M", change: "+12.3%", up: true },
              { label: "Expenses", value: "$1.8M", change: "-3.1%", up: false },
              { label: "Net Profit", value: "$600K", change: "+8.7%", up: true },
              { label: "Active Clients", value: "1,247", change: "+5.2%", up: true },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "14px 16px", borderRadius: 8,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: 0.5 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: s.up ? "#22c55e" : "#ef4444", marginTop: 4 }}>{s.change} vs last month</div>
              </div>
            ))}
          </div>

          {/* Chart + Calculator row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 16 }}>
            {/* Chart */}
            <div style={{
              padding: "14px 16px", borderRadius: 8,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Q3 Financial Summary</span>
                <span style={{ fontSize: 9, color: "#475569", padding: "2px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>Annual</span>
              </div>
              <canvas ref={chartRef} style={{ width: "100%", height: 200, borderRadius: 4 }} />
            </div>

            {/* Calculator */}
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>Quick Calculator</div>
              <div style={{
                padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 4,
                marginBottom: 10, textAlign: "right", fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20, color: "#f1f5f9", minHeight: 36, overflow: "hidden",
              }}>{calcDisplay}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {calcBtns.flat().map((l) => (
                  <button key={l} style={btnStyle(l)}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = ["÷","×","−","+"].includes(l) ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = ["÷","×","−","+"].includes(l) ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.04)"; }}
                    onClick={() => {
                      if (l === "=") calcEquals();
                      else if (["÷","×","−","+"].includes(l)) calcOperator(l);
                      else if (l === "C") calcClear();
                      else calcInput(l);
                    }}
                  >
                    <span style={{ fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", height: 30 }}>{l}</span>
                  </button>
                ))}
              </div>
              <button style={{ ...btnStyle(""), width: "100%", marginTop: 4, fontSize: 12, color: "#64748b" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onClick={calcClear}
              >C</button>
            </div>
          </div>

          {/* Employee table */}
          <div style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Employee Records</span>
                            <span style={{ fontSize: 9, color: "#475569" }}>{EMPLOYEES.length} entries</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#64748b", fontSize: 10 }}>
                    <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 500 }}>Department</th>
                    <th style={{ textAlign: "right", padding: "8px 16px", fontWeight: 500 }}>Salary</th>
                    <th style={{ textAlign: "center", padding: "8px 16px", fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {EMPLOYEES.map((e) => (
                    <tr key={e.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <td style={{ padding: "8px 16px", color: "#f1f5f9" }}>{e.name}</td>
                      <td style={{ padding: "8px 16px", color: "#94a3b8" }}>{e.dept}</td>
                      <td style={{ padding: "8px 16px", textAlign: "right", color: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace" }}>${e.salary.toLocaleString()}</td>
                      <td style={{ padding: "8px 16px", textAlign: "center" }}>
                        <span style={{
                          color: e.status === "Active" ? "#22c55e" : "#f59e0b",
                          background: e.status === "Active" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                          padding: "2px 8px", borderRadius: 4, fontSize: 9,
                        }}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar with exit hint */}
      <div style={{
        height: 28, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "#1e293b", borderTop: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: "#475569" }}>© {new Date().getFullYear()} DataSync Analytics Inc. — All data is simulated for demonstration</span>
        <span style={{ fontSize: 9, color: "#334155" }}>Press ` to exit</span>
      </div>
    </div>
  );
};

export default BossMode;