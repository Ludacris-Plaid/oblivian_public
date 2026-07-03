import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = API_URL;

const RansomwarePanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, victims: [], active: false });
  const [executing, setExecuting] = useState<string | null>(null);
  const [feed, setFeed] = useState<Array<{ time: string; msg: string; color: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/ransomware/status`); setStatus(await r.json()); } catch {}
    };
    poll(); const id = setInterval(poll, 2500); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 600; const h = 200;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    const files: Array<{ x: number; y: number; rot: number; icon: string; locked: boolean; op: number; s: number }> = [];
    for (let i = 0; i < 40; i++) files.push({ x: 30 + (i % 10) * 55, y: 30 + Math.floor(i / 10) * 55, rot: Math.random() * 0.3, icon: i % 3 === 0 ? "📄" : i % 3 === 1 ? "📁" : "💾", locked: false, op: 1, s: 1 });
    let t = 0;
    const draw = () => {
      t += 0.03;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.4)"; ctx.fillRect(0, 0, w, h);

      files.forEach((f, i) => {
        if (status.active) {
          f.locked = Math.random() < 0.003 || f.locked;
          if (f.locked) {
            f.op = Math.max(0.3, f.op - 0.005 + Math.sin(t * 5 + i) * 0.02);
            f.s = 0.9 + Math.sin(t * 3 + i) * 0.1;
          }
        }
        ctx.save();
        ctx.translate(f.x + i * 0.5, f.y + i * 0.3);
        ctx.rotate(f.rot);
        ctx.globalAlpha = f.op;
        ctx.font = `${24 * f.s}px serif`;
        ctx.fillText(f.locked ? "🔒" : f.icon, 0, 0);
        ctx.restore();
        if (f.locked && status.active) {
          ctx.strokeStyle = `rgba(255,71,87,${0.05 + Math.sin(t * 4 + i) * 0.03})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(f.x - 12, f.y - 12, 30, 30);
        }
      });

      // Rolling encryption progress
      if (status.active) {
        const pct = status.stats?.files_encrypted || 0;
        ctx.fillStyle = "#ff4757";
        ctx.globalAlpha = 0.15;
        ctx.font = "bold 64px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`LOCKED`, w / 2, h / 2 + 22);
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [status.active, status.stats]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try {
      const r = await fetch(`${API}/api/ransomware/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
      const d = await r.json();
      setFeed(f => [{ time: new Date().toTimeString().slice(0, 8), msg: `${label} → ${d.targets || d.status || "OK"}`, color: d.status === "error" ? "#ff4757" : "#00ff88" }, ...f.slice(0, 19)]);
    } catch { setFeed(f => [{ time: new Date().toTimeString().slice(0, 8), msg: `${label} → FAILED`, color: "#ff4757" }, ...f.slice(0, 19)]); }
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>Ransomware Operations</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.div
              style={{ ...styles.badge, background: status.active ? "rgba(255,71,87,0.15)" : "rgba(0,212,255,0.06)", color: status.active ? "#ff4757" : "#555", borderColor: status.active ? "rgba(255,71,87,0.3)" : "rgba(0,212,255,0.15)" }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
              {status.active ? "ACTIVE" : "STANDBY"}
            </motion.div>
          </div>
        </div>
        <div style={styles.statsGrid}>
          <S label="Files Locked" value={<GlitchNumber value={s.files_encrypted || 0} color="#ff4757" fontSize={28} fontWeight={700} intensity={0.6} />} sub="encrypted" color="#ff4757" />
          <S label="Data Locked" value={`${((s.bytes_locked || 0) / 1048576).toFixed(1)} MB`} sub="encrypted" color="#ffd700" />
          <S label="Paid (BTC)" value={`${(s.ransom_paid || 0).toFixed(4)}`} sub="collected" color="#00ff88" />
          <S label="Nodes Deployed" value={<GlitchNumber value={s.nodes_deployed || 0} color="#00d4ff" fontSize={28} fontWeight={700} />} sub="infected" color="#00d4ff" />
          <S label="Victims" value={<GlitchNumber value={(status.victims || []).length} color="#ff6ec7" fontSize={28} fontWeight={700} />} sub="total" color="#ff6ec7" />
          <S label="Double Extort" value={status.double_extortion ? "ON" : "OFF"} sub="configured" color={status.double_extortion ? "#ff8c00" : "#444"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Encryption Canvas</h3>
          <canvas ref={canvasRef} style={{ width: "100%", height: 200, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>File System Visualization</span>
            <span style={{ color: status.active ? "#ff4757" : "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{status.active ? `${s.files_encrypted} files encrypted` : "Idle"}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Deploy Controls</h3>
            <div style={styles.actionGrid}>
              <Btn2 label="Deploy All" color="#ff4757" loading={executing === "Deploy"} onClick={() => execute("deploy", { target: "all" }, "Deploy")} />
              <Btn2 label="Encrypt" color="#ff8c00" loading={executing === "Encrypt"} onClick={() => execute("encrypt", { mode: "drives" }, "Encrypt")} />
              <Btn2 label="Lockscreen" color="#ffd700" loading={executing === "Lockscreen"} onClick={() => execute("lockscreen", {}, "Lockscreen")} />
              <Btn2 label="Exfil First" color="#a855f7" loading={executing === "Exfil"} onClick={() => execute("exfil", { mode: "exfiltrate" }, "Exfil")} />
              <Btn2 label="Keygen" color="#00d4ff" loading={executing === "Key"} onClick={() => execute("keygen", {}, "Key")} />
              <Btn2 label="RESET" color="#444" loading={executing === "Reset"} onClick={() => execute("stop", {}, "Reset")} />
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Activity Feed</h3>
            <div style={styles.feed}>
              {feed.map((f, i) => (
                <div key={i} style={styles.feedRow}>
                  <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>{f.time}</span>
                  <span style={{ color: f.color, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{f.msg}</span>
                </div>
              ))}
              {feed.length === 0 && <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 12 }}>Deploy ransomware to see activity</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Victim Ledger</h3>
        <div style={styles.feed}>
          {(status.victims || []).slice(-10).reverse().map((v: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} style={styles.ledgerRow}>
              <span style={{ color: "#333", fontSize: 8, minWidth: 65, fontFamily: "'JetBrains Mono', monospace" }}>{v.timestamp ? new Date(v.timestamp).toTimeString().slice(0, 8) : ""}</span>
              <span style={{ color: "#00d4ff", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", minWidth: 100 }}>{v.node_id}</span>
              <span style={{ color: "#ff4757", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>{v.files} files</span>
              <span style={{ color: "#ffd700", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>{(v.bytes / 1048576).toFixed(1)} MB</span>
              <motion.span animate={v.paid ? { opacity: [1, 0.5, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}
                style={{ color: v.paid ? "#00ff88" : "#444", fontSize: 9, fontWeight: v.paid ? 700 : 400, fontFamily: "'JetBrains Mono', monospace", minWidth: 50, textAlign: "right" }}>
                {v.paid ? "PAID" : "pending"}
              </motion.span>
            </motion.div>
          ))}
          {(!status.victims || status.victims.length === 0) && <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No victims yet — deploy to begin</p>}
        </div>
      </div>
    </motion.div>
  );
};

function S({ label, value, sub, color }: { label: string; value: any; sub: string; color: string }) {
  return (<div style={{ textAlign: "center", padding: "6px 4px" }}><div style={{ color, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div><div style={{ color: "#aaa", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div><div style={{ color: "#444", fontSize: 8, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div></div>);
}

function Btn2({ label, color, loading, onClick }: any) {
  return (<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ ...styles.btn, borderColor: `${color}30`, opacity: loading ? 0.5 : 1 }} onClick={onClick} disabled={loading}>
    {loading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>&#9696;</motion.span> : null}
    <span style={{ color, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
  </motion.button>);
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(255,71,87,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#ff4757", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#ff4757", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  feed: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 180, overflowY: "auto" },
  feedRow: { display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
  ledgerRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6 },
};

export default RansomwarePanel;
