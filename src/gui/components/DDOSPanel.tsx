import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = "http://localhost:8000";

const ATTACK_VISUALS: Record<string, { color: string; glow: string; name: string; particles: number; pattern: "wave" | "bombard" | "creep" | "amplify" | "pulse" }> = {
  http_flood: { color: "#00ff88", glow: "rgba(0,255,136,", name: "HTTP Flood", particles: 60, pattern: "wave" },
  syn_flood: { color: "#ff8c00", glow: "rgba(255,140,0,", name: "SYN Flood", particles: 40, pattern: "bombard" },
  udp_flood: { color: "#a855f7", glow: "rgba(168,85,247,", name: "UDP Flood", particles: 80, pattern: "bombard" },
  slowloris: { color: "#ff4757", glow: "rgba(255,71,87,", name: "Slowloris", particles: 12, pattern: "creep" },
  dns_amplification: { color: "#ffd700", glow: "rgba(255,215,0,", name: "DNS Amp", particles: 30, pattern: "amplify" },
  icmp_flood: { color: "#00d4ff", glow: "rgba(0,212,255,", name: "ICMP Flood", particles: 100, pattern: "pulse" },
};

const DDOSPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, targets: [], active: false, current_attack: null });
  const [executing, setExecuting] = useState<string | null>(null);
  const [target, setTarget] = useState("target.example.com");
  const [aType, setAType] = useState("http_flood");
  const [peakRps, setPeakRps] = useState(0);
  const [peakGbps, setPeakGbps] = useState(0);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const gaugeCanvasRef = useRef<HTMLCanvasElement>(null);
  const attacksRef = useRef<any[]>([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/ddos/status`);
        const d = await r.json();
        setStatus(d);
        if (d.stats) {
          if (d.stats.requests_per_second > peakRps) setPeakRps(d.stats.requests_per_second);
          if (d.stats.bandwidth_gbps > peakGbps) setPeakGbps(d.stats.bandwidth_gbps);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [peakRps, peakGbps]);

  useEffect(() => {
    if (status.current_attack && !attacksRef.current.find(a => a.target === status.current_attack?.target && a.type === status.current_attack?.type && a.status === "active")) {
      attacksRef.current = [{ ...status.current_attack, started: Date.now(), peak_rps: 0, peak_gbps: 0, total_hits: 0, status: "active" }, ...attacksRef.current.slice(0, 19)];
    }
    if (status.stats && attacksRef.current[0]?.status === "active") {
      const a = attacksRef.current[0];
      a.peak_rps = Math.max(a.peak_rps || 0, status.stats.requests_per_second || 0);
      a.peak_gbps = Math.max(a.peak_gbps || 0, status.stats.bandwidth_gbps || 0);
      a.total_hits = status.stats.requests_per_second || 0;
      a.duration = status.duration;
    }
    if (!status.active && attacksRef.current[0]?.status === "active") {
      if (attacksRef.current[0]) attacksRef.current[0].status = "completed";
    }
  }, [status]);

  // Main attack visualization canvas
  useEffect(() => {
    const c = mainCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 600; const h = 280;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    const visual = ATTACK_VISUALS[status.current_attack?.type] || ATTACK_VISUALS.http_flood;
    const serverX = 500; const serverY = h / 2;
    const active = status.active;
    const rps = status.stats?.requests_per_second || 0;

    interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; alpha: number; burst: number; }
    const particles: Particle[] = [];

    const spawn = () => {
      if (!active) return;
      const count = visual.particles;
      for (let i = 0; i < count * 0.3; i++) {
        const p: Particle = {
          x: -10 + Math.random() * 100,
          y: 40 + Math.random() * (h - 80),
          vx: 3 + Math.random() * 8,
          vy: (Math.random() - 0.5) * 2,
          life: 0, maxLife: 80 + Math.random() * 40,
          size: 1.5 + Math.random() * 3,
          alpha: 0.3 + Math.random() * 0.6,
          burst: 0,
        };
        if (visual.pattern === "amplify") {
          p.x = serverX - 20; p.y = serverY;
          p.vx = -(3 + Math.random() * 6);
          p.vy = (Math.random() - 0.5) * 12;
        }
        particles.push(p);
      }
    };

    let t = 0;
    let spawnTimer = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.5)";
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Target server
      const serverPulse = active ? 1 + Math.sin(t * 4) * 0.1 : 1;
      ctx.beginPath();
      ctx.arc(serverX, serverY, 22 * serverPulse, 0, Math.PI * 2);
      const sg = ctx.createRadialGradient(serverX, serverY, 8, serverX, serverY, 28);
      sg.addColorStop(0, `rgba(255,71,87,0.4)`);
      sg.addColorStop(0.5, `rgba(255,71,87,0.1)`);
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.fillStyle = active ? "#ff4757" : "#444";
      ctx.beginPath();
      ctx.arc(serverX, serverY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#aaa";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(status.current_attack?.target || "TARGET", serverX, serverY - 30);

      // Attack type label on left
      ctx.fillStyle = visual.color;
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(visual.name.toUpperCase(), 12, 24);
      ctx.fillStyle = "#555";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillText(active ? `${rps} req/s` : "IDLE", 12, 40);

      // Spawn particles
      spawnTimer += 0.016;
      if (spawnTimer > 0.05) { spawnTimer = 0; spawn(); }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }

        const progress = p.life / p.maxLife;

        if (visual.pattern === "amplify") {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.995;
          p.vy *= 0.995;
          p.size = 2 + (1 - progress) * 4;
        } else if (visual.pattern === "creep") {
          p.x += p.vx * 0.3;
          p.y += Math.sin(p.life * 0.1 + p.x * 0.1) * 0.5;
          p.vx *= 1.002;
        } else if (visual.pattern === "pulse") {
          p.x += p.vx * (1 + Math.sin(t * 10 + p.y * 0.1) * 0.5);
          p.y += p.vy;
        } else {
          p.x += p.vx;
          p.y += p.vy;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const fadeAlpha = (1 - progress) * p.alpha * (active ? 0.9 : 0.3);
        ctx.fillStyle = visual.glow + `${fadeAlpha})`;
        ctx.fill();
        ctx.shadowColor = visual.color;
        ctx.shadowBlur = active ? p.size * 3 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Trail
        if (p.life > 2) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.strokeStyle = visual.glow + `${fadeAlpha * 0.3})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }
      }

      // Hit effects on server
      if (active && Math.random() > 0.3) {
        ctx.beginPath();
        ctx.arc(serverX + (Math.random() - 0.5) * 30, serverY + (Math.random() - 0.5) * 20, Math.random() * 6, 0, Math.PI * 2);
        ctx.fillStyle = visual.glow + `${0.3 + Math.random() * 0.4})`;
        ctx.fill();
      }

      // RPS counter big
      if (active) {
        ctx.fillStyle = visual.color;
        ctx.globalAlpha = 0.15;
        ctx.font = "bold 72px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(rps), w / 2, h / 2 + 24);
        ctx.globalAlpha = 1;
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [status.active, status.current_attack, status.stats?.requests_per_second]);

  // Gauge canvas
  useEffect(() => {
    const c = gaugeCanvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = 200 * dpr; c.height = 100 * dpr; ctx.scale(dpr, dpr);

    const gbps = status.stats?.bandwidth_gbps || 0;
    const maxGbps = 10;
    const draw = () => {
      ctx.clearRect(0, 0, 200, 100);
      const angle = Math.min((gbps / maxGbps) * Math.PI * 1.5, Math.PI * 1.5);

      ctx.beginPath();
      ctx.arc(100, 75, 55, Math.PI * 0.75, Math.PI * 2.25);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 6;
      ctx.stroke();

      if (gbps > 0) {
        ctx.beginPath();
        ctx.arc(100, 75, 55, Math.PI * 0.75, Math.PI * 0.75 + angle);
        const gg = ctx.createLinearGradient(0, 100, 0, 20);
        gg.addColorStop(0, "#a855f7");
        gg.addColorStop(0.5, "#00d4ff");
        gg.addColorStop(1, "#00ff88");
        ctx.strokeStyle = gg;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      ctx.fillStyle = "#e0e0e0";
      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${gbps.toFixed(1)}`, 100, 68);
      ctx.fillStyle = "#444";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillText("Gbps", 100, 82);
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [status.stats?.bandwidth_gbps]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try {
      await fetch(`${API}/api/ddos/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
    } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      {/* Stats Row */}
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={{ fontSize: 8, color: "#a855f7", animation: "pulse 2s infinite" }}>&#9679;</span> DDoS Operations</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.div style={{ ...styles.badge, background: status.active ? "rgba(168,85,247,0.15)" : "rgba(0,212,255,0.06)", color: status.active ? "#a855f7" : "#555", borderColor: status.active ? "rgba(168,85,247,0.3)" : "rgba(0,212,255,0.15)" }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              {status.active ? "FIRING" : "ARMED"}
            </motion.div>
            {status.duration > 0 && <span style={{ color: "#ffd700", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{status.duration}s</span>}
          </div>
        </div>
        <div style={styles.statsGrid}>
          <StatBox label="Requests/s" value={<GlitchNumber value={s.requests_per_second || 0} color="#a855f7" fontSize={30} fontWeight={700} />} sub={`Peak: ${peakRps}`} color="#a855f7" />
          <StatBox label="Bandwidth" value={`${(s.bandwidth_gbps || 0).toFixed(1)} Gbps`} sub={`Peak: ${peakGbps.toFixed(1)} Gbps`} color="#00d4ff" />
          <StatBox label="Packets Sent" value={<GlitchNumber value={s.packets_sent || 0} color="#00ff88" fontSize={30} fontWeight={700} />} sub="total" color="#00ff88" />
          <StatBox label="Active Nodes" value={<GlitchNumber value={s.active_nodes || 0} color="#ffd700" fontSize={30} fontWeight={700} />} sub="firing" color="#ffd700" />
          <StatBox label="Targets Hit" value={<GlitchNumber value={s.targets_hit || 0} color="#ff4757" fontSize={30} fontWeight={700} />} sub="unique" color="#ff4757" />
          <StatBox label="Total Reqs" value={<GlitchNumber value={s.total_requests || 0} color="#ff6ec7" fontSize={28} fontWeight={700} intensity={0.6} />} sub="cumulative" color="#ff6ec7" />
        </div>
      </div>

      {/* Attack Canvas + Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <canvas ref={mainCanvasRef} style={{ width: "100%", height: 280, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ color: "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Live Attack Stream</span>
            <span style={{ color: status.active ? "#a855f7" : "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
              {status.active ? `${(ATTACK_VISUALS[status.current_attack?.type] || ATTACK_VISUALS.http_flood).name} → ${status.current_attack?.target || "..."}` : "No active attack"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={{ fontSize: 8, color: "#a855f7", animation: "pulse 2s infinite" }} />Attack Configuration</h3>
            <input style={styles.input} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target host/ip" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, margin: "8px 0" }}>
              {Object.entries(ATTACK_VISUALS).map(([key, v]) => (
                <motion.button key={key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setAType(key)}
                  style={{
                    padding: "8px 6px", borderRadius: 6, border: `1px solid ${aType === key ? v.color : "rgba(255,255,255,0.04)"}`,
                    background: aType === key ? `${v.glow}0.12)` : "rgba(6,6,14,0.4)",
                    color: aType === key ? v.color : "#555", fontSize: 9, fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >{v.name}</motion.button>
              ))}
            </div>
            <div style={styles.actionRow}>
              <Btn label="LAUNCH" color="#a855f7" loading={executing === "Launch"} onClick={() => execute("launch", { target, a_type: aType }, "Launch")} />
              <Btn label="STOP" color="#ff4757" loading={executing === "Stop"} onClick={() => execute("stop", {}, "Stop")} />
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><span style={{ fontSize: 8, color: "#a855f7", animation: "pulse 2s infinite" }} />Bandwidth Gauge</h3>
            <canvas ref={gaugeCanvasRef} style={{ width: "100%", height: 100, borderRadius: 8, background: "rgba(6,6,14,0.4)" }} />
          </div>
        </div>
      </div>

      {/* Attack History */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={{ fontSize: 8, color: "#a855f7", animation: "pulse 2s infinite" }} />Attack History</h3>
        <div style={styles.historyFeed}>
          {attacksRef.current.slice(0, 15).map((a: any, i: number) => {
            const v = ATTACK_VISUALS[a.type] || ATTACK_VISUALS.http_flood;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} style={styles.historyRow}>
                <div style={{ width: 3, height: "100%", background: a.status === "active" ? v.color : "#333", borderRadius: 2, flexShrink: 0 }} />
                <span style={{ color: "#333", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>{new Date(a.started).toTimeString().slice(0, 8)}</span>
                <span style={{ color: v.color, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 80 }}>{v.name}</span>
                <span style={{ color: "#00d4ff", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.target}</span>
                <span style={{ color: "#a855f7", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 50 }}>↑{a.peak_rps || 0}/s</span>
                <span style={{ color: "#00d4ff", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 55 }}>{a.peak_gbps || 0}Gbps</span>
                <span style={{ color: a.duration ? "#ff6ec7" : "#333", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 50 }}>{a.duration ? `${a.duration}s` : "0s"}</span>
                <motion.span
                  animate={a.status === "active" ? { opacity: [1, 0.4, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ color: a.status === "active" ? v.color : a.status === "completed" ? "#00ff88" : "#333", fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 60, textAlign: "right" }}>
                  {a.status === "active" ? "LIVE" : a.status === "completed" ? "DONE" : "IDLE"}
                </motion.span>
              </motion.div>
            );
          })}
          {attacksRef.current.length === 0 && <p style={{ color: "#333", fontSize: 11, textAlign: "center", padding: 24 }}>No attacks launched — configure and launch to begin</p>}
        </div>
      </div>
    </motion.div>
  );
};

function StatBox({ label, value, sub, color }: { label: string; value: any; sub: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 4px" }}>
      <div style={{ color, fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ color: "#aaa", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ color: "#444", fontSize: 8, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>
    </div>
  );
}

function Btn({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  return (<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ ...styles.btn, borderColor: `${color}30`, opacity: loading ? 0.5 : 1 }} onClick={onClick} disabled={loading}>
    {loading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>&#9696;</motion.span> : null}
    <span style={{ color, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
  </motion.button>);
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(168,85,247,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#a855f7", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 },
  input: { width: "100%", padding: "8px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", boxSizing: "border-box" as const },
  actionRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 8px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  historyFeed: { display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" },
  historyRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6, height: 30 },
};

export default DDOSPanel;
