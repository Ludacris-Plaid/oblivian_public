import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = "http://localhost:8000";

const ProxyPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, proxies: [], chains: [], active: false });
  const [executing, setExecuting] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/proxy/status`); setStatus(await r.json()); } catch {}
    };
    poll(); const id = setInterval(poll, 3000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 400; const h = 220;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);

    const nodePositions = [
      { x: 200, y: 25, label: "ENTRY" },
      { x: 320, y: 75, label: "HOP 1" },
      { x: 320, y: 145, label: "HOP 2" },
      { x: 200, y: 195, label: "HOP 3" },
      { x: 80, y: 145, label: "HOP 4" },
      { x: 80, y: 75, label: "EXIT" },
    ];

    let t = 0;
    const draw = () => {
      t += 0.02;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.4)"; ctx.fillRect(0, 0, w, h);

      const active = status.active;
      const chainLen = status.chains?.length || 0;
      const usedNodes = active ? nodePositions : nodePositions.slice(0, 2);

      // Draw connections
      for (let i = 0; i < usedNodes.length; i++) {
        const n1 = usedNodes[i];
        const n2 = usedNodes[(i + 1) % usedNodes.length];
        if (active && i < usedNodes.length - 1) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = `rgba(0,212,255,${0.1 + Math.sin(t * 3 + i) * 0.05})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Flow particles on connection
          for (let p = 0; p < 3; p++) {
            const progress = ((t * 20 + p * 33 + i * 10) % 100) / 100;
            const px = n1.x + (n2.x - n1.x) * progress;
            const py = n1.y + (n2.y - n1.y) * progress;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,255,136,${0.4 + Math.sin(t * 10 + p) * 0.3})`;
            ctx.fill();
          }
        }
      }

      // Draw nodes
      usedNodes.forEach((n, i) => {
        const pulse = active ? 1 + Math.sin(t * 3 + i) * 0.25 : 0.6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 12 * pulse, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(n.x, n.y, 3, n.x, n.y, 14 * pulse);
        g.addColorStop(0, `rgba(0,212,255,0.6)`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = "#00d4ff";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#888";
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y - 18);
      });

      if (active) {
        ctx.fillStyle = "rgba(0,212,255,0.04)";
        ctx.font = "bold 36px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("ROUTING", 200, 115);
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [status.active, status.chains]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try { await fetch(`${API}/api/proxy/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) }); } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>Proxy Chain Operations</h2>
          <motion.div style={{ ...styles.badge, background: status.active ? "rgba(0,212,255,0.12)" : "rgba(0,212,255,0.05)", color: status.active ? "#00d4ff" : "#555", borderColor: status.active ? "rgba(0,212,255,0.3)" : "rgba(0,212,255,0.12)" }}
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            {status.active ? "ROUTING" : "OFFLINE"}
          </motion.div>
        </div>
        <div style={styles.statsGrid}>
          <S label="Proxies" value={<GlitchNumber value={s.active_proxies || 0} color="#00d4ff" fontSize={28} fontWeight={700} />} sub="active" color="#00d4ff" />
          <S label="Bandwidth" value={`${(s.total_bandwidth_mbps || 0).toFixed(1)} Mbps`} sub="aggregate" color="#00ff88" />
          <S label="Routed" value={<GlitchNumber value={s.connections_routed || 0} color="#ffd700" fontSize={28} fontWeight={700} />} sub="requests" color="#ffd700" />
          <S label="Chains" value={<GlitchNumber value={s.chains_active || 0} color="#a855f7" fontSize={28} fontWeight={700} />} sub="active" color="#a855f7" />
          <S label="Uptime" value={`${(s.uptime_avg_sec || 0).toFixed(0)}s`} sub="average" color="#ff6ec7" />
          <S label="Latency" value={`${(status.chains || [])[0]?.latency_ms || 0}ms`} sub="current" color="#ff4757" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Chain Topology</h3>
          <canvas ref={canvasRef} style={{ width: "100%", height: 220, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Chain Builder</h3>
            <div style={styles.grid2}>
              <Btn2 label="Register All" color="#00d4ff" loading={executing === "Reg"} onClick={() => execute("register", {}, "Reg")} />
              <Btn2 label="Build Chain" color="#00ff88" loading={executing === "Chain"} onClick={() => execute("chain", { hops: 3 }, "Chain")} />
              <Btn2 label="Route Traffic" color="#ffd700" loading={executing === "Route"} onClick={() => execute("route", {}, "Route")} />
              <Btn2 label="Destroy All" color="#ff4757" loading={executing === "Destroy"} onClick={() => execute("stop", {}, "Destroy")} />
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Active Chains</h3>
            <div style={styles.feed}>
              {(status.chains || []).map((ch: any, i: number) => (
                <div key={i} style={styles.feedRow}>
                  <span style={{ color: "#a855f7", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{ch.id}</span>
                  <span style={{ color: "#00d4ff", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{ch.hops}h</span>
                  <span style={{ color: "#ffd700", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{ch.latency_ms}ms</span>
                  <span style={{ color: ch.status === "active" ? "#00ff88" : "#ff4757", fontSize: 9, fontWeight: 600, marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>{ch.status}</span>
                </div>
              ))}
              {(!status.chains || status.chains.length === 0) && <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 12 }}>No chains active</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Registered Proxies</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 150, overflowY: "auto" }}>
          {(status.proxies || []).slice(0, 24).map((p: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} style={styles.pChip}>
              <span style={{ color: p.status === "active" ? "#00ff88" : "#ff4757", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{p.node_id?.slice(-10)}</span>
              <span style={{ color: "#555", fontSize: 7, fontFamily: "'JetBrains Mono', monospace" }}>{p.country}</span>
              <span style={{ color: "#888", fontSize: 7 }}>{p.bandwidth_mbps}Mbps</span>
            </motion.div>
          ))}
          {(!status.proxies || status.proxies.length === 0) && <p style={{ color: "#333", fontSize: 10, padding: 12, width: "100%", textAlign: "center" }}>No proxies registered</p>}
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
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#00d4ff", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#00d4ff", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  feed: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 180, overflowY: "auto" },
  feedRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
  pChip: { display: "flex", flexDirection: "column", gap: 2, padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.03)", transition: "all 0.15s" },
};

export default ProxyPanel;
