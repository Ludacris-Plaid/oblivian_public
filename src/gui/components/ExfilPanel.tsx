import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";

const API = "http://localhost:8000";

const ExfilPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, channels: {}, transfers: [], staged: [], active: false });
  const [executing, setExecuting] = useState<string | null>(null);
  const [peakMbps, setPeakMbps] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/exfil/status`); const d = await r.json(); setStatus(d); if (d.stats?.transfer_rate_mbps > peakMbps) setPeakMbps(d.stats.transfer_rate_mbps); } catch {}
    };
    poll(); const id = setInterval(poll, 2500); return () => clearInterval(id);
  }, [peakMbps]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 600; const h = 200;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    const history: number[] = Array(80).fill(0);
    const chColors: Record<string, string> = { dns: "#a855f7", http: "#00d4ff", websocket: "#00ff88", icmp: "#ffd700" };

    const draw = () => {
      history.push(status.stats?.transfer_rate_mbps || 0);
      if (history.length > 80) history.shift();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.4)"; ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const maxY = Math.max(10, ...history);
      const grad = ctx.createLinearGradient(0, h - 10, 0, 20);
      grad.addColorStop(0, "rgba(0,255,136,0.03)");
      grad.addColorStop(0.5, "rgba(0,212,255,0.15)");
      grad.addColorStop(1, "rgba(255,215,0,0.03)");
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < history.length; i++) {
        const x = (i / history.length) * w;
        const y = h - (history[i] / maxY) * (h - 30) - 15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, h - (history[0] / maxY) * (h - 30) - 15);
      for (let i = 1; i < history.length; i++) {
        const x = (i / history.length) * w;
        const y = h - (history[i] / maxY) * (h - 30) - 15;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(0,212,255,0.5)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Big speed display
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.font = "bold 42px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${(status.stats?.transfer_rate_mbps || 0).toFixed(1)} Mbps`, w / 2, 55);

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [status.stats?.transfer_rate_mbps]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try { await fetch(`${API}/api/exfil/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) }); } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  const channels = Object.entries(status.channels || {});
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>Exfiltration Operations</h2>
          <motion.div style={{ ...styles.badge, background: status.active ? "rgba(255,215,0,0.12)" : "rgba(0,212,255,0.06)", color: status.active ? "#ffd700" : "#555", borderColor: status.active ? "rgba(255,215,0,0.3)" : "rgba(0,212,255,0.15)" }}
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            {status.active ? "TRANSFERRING" : "IDLE"}
          </motion.div>
        </div>
        <div style={styles.statsGrid}>
          <S label="Staged" value={`${((s.total_bytes_staged || 0) / 1048576).toFixed(1)} MB`} sub="ready" color="#ffd700" />
          <S label="Exfiltrated" value={`${((s.total_bytes_exfiltrated || 0) / 1048576).toFixed(1)} MB`} sub="done" color="#00ff88" />
          <S label="Active" value={<GlitchNumber value={s.active_transfers || 0} color="#00d4ff" fontSize={26} fontWeight={700} />} sub="transfers" color="#00d4ff" />
          <S label="Complete" value={<GlitchNumber value={s.completed_transfers || 0} color="#00ff88" fontSize={26} fontWeight={700} />} sub="done" color="#00ff88" />
          <S label="Failed" value={<GlitchNumber value={s.failed_transfers || 0} color="#ff4757" fontSize={26} fontWeight={700} />} sub="errors" color="#ff4757" />
          <S label="Speed" value={`${(s.transfer_rate_mbps || 0).toFixed(1)} Mbps`} sub={`peak: ${peakMbps.toFixed(1)}`} color="#ff6ec7" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Transfer Rate Monitor</h3>
          <canvas ref={canvasRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Transfer Controls</h3>
            <div style={styles.grid2}>
              <Btn2 label="Stage Data" color="#ffd700" loading={executing === "Stage"} onClick={() => execute("stage", {}, "Stage")} />
              <Btn2 label="Exfil HTTP" color="#00d4ff" loading={executing === "HTTP"} onClick={() => execute("transfer", { channel: "http" }, "HTTP")} />
              <Btn2 label="Exfil DNS" color="#a855f7" loading={executing === "DNS"} onClick={() => execute("transfer", { channel: "dns" }, "DNS")} />
              <Btn2 label="Exfil WS" color="#00ff88" loading={executing === "WS"} onClick={() => execute("transfer", { channel: "websocket" }, "WS")} />
              <Btn2 label="Compress" color="#ff6ec7" loading={executing === "Compress"} onClick={() => execute("compress", {}, "Compress")} />
              <Btn2 label="STOP" color="#ff4757" loading={executing === "Stop"} onClick={() => execute("stop", {}, "Stop")} />
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Channels</h3>
            <div style={styles.feed}>
              {channels.map(([name, cfg]: any) => (
                <div key={name} style={styles.chRow}>
                  <span style={{ color: cfg.enabled ? "#00ff88" : "#444", fontSize: 10 }}>{cfg.enabled ? "●" : "○"}</span>
                  <span style={{ color: "#00d4ff", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>{name}</span>
                  <span style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{cfg.speed_mbps}Mbps</span>
                  <span style={{ color: "#ffd700", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{cfg.stealth}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Staged Data</h3>
          <div style={styles.feed}>
            {(status.staged || []).slice(-10).reverse().map((sd: any, i: number) => (
              <div key={i} style={styles.feedRow}>
                <span style={{ color: "#333", fontSize: 8, minWidth: 65, fontFamily: "'JetBrains Mono', monospace" }}>{sd.timestamp ? new Date(sd.timestamp).toTimeString().slice(0, 8) : ""}</span>
                <span style={{ color: "#00d4ff", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{sd.node_id}</span>
                <span style={{ color: "#ffd700", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{sd.type}</span>
                <span style={{ color: "#00ff88", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{sd.size_mb} MB</span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Active Transfers</h3>
          <div style={styles.feed}>
            {(status.transfers || []).slice(-10).reverse().map((x: any, i: number) => (
              <div key={i} style={styles.transferRow}>
                <span style={{ color: "#00d4ff", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{x.id}</span>
                <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", margin: "0 6px" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${x.progress_pct}%` }} style={{ height: "100%", background: x.status === "completed" ? "#00ff88" : x.status === "failed" ? "#ff4757" : "#ffd700", borderRadius: 2 }} />
                </div>
                <span style={{ color: x.status === "completed" ? "#00ff88" : x.status === "failed" ? "#ff4757" : "#ffd700", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 35, textAlign: "right" }}>{x.progress_pct}%</span>
                <span style={{ color: "#888", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 45, textAlign: "right" }}>{x.size_mb}MB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function S({ label, value, sub, color }: any) { return (<div style={{ textAlign: "center", padding: "6px 4px" }}><div style={{ color, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div><div style={{ color: "#aaa", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div><div style={{ color: "#444", fontSize: 8, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div></div>); }

function Btn2({ label, color, loading, onClick }: any) {
  return (<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ ...styles.btn, borderColor: `${color}30`, opacity: loading ? 0.5 : 1 }} onClick={onClick} disabled={loading}>
    {loading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>&#9696;</motion.span> : null}
    <span style={{ color, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
  </motion.button>);
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#ffd700", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#ffd700", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  feed: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflowY: "auto" },
  feedRow: { display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
  chRow: { display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
  transferRow: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
};

export default ExfilPanel;
