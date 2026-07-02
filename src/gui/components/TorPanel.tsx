import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = "http://localhost:8000";

const COUNTRY_FLAGS: Record<string, string> = {
  'Germany': '🇩🇪', 'Netherlands': '🇳🇱', 'France': '🇫🇷', 'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭', 'Japan': '🇯🇵', 'Singapore': '🇸🇬', 'United Kingdom': '🇬🇧',
  'UK': '🇬🇧', 'Romania': '🇷🇴', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
  'Brazil': '🇧🇷', 'India': '🇮🇳', 'Argentina': '🇦🇷', 'United States': '🇺🇸',
  'US': '🇺🇸', 'Russia': '🇷🇺', 'China': '🇨🇳', 'South Korea': '🇰🇷',
  'Hong Kong': '🇭🇰', 'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Norway': '🇳🇴',
  'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Poland': '🇵🇱', 'Austria': '🇦🇹',
  'Belgium': '🇧🇪', 'Ireland': '🇮🇪', 'Portugal': '🇵🇹', 'Greece': '🇬🇷',
  'Turkey': '🇹🇷', 'Mexico': '🇲🇽', 'South Africa': '🇿🇦',
};

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6;
  const a = code.toUpperCase().charCodeAt(0) - 65;
  const b = code.toUpperCase().charCodeAt(1) - 65;
  if (a < 0 || a > 25 || b < 0 || b > 25) return '';
  return String.fromCodePoint(base + a, base + b);
}

const TorPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, circuits: [], active: false, exit_node: null });
  const [executing, setExecuting] = useState<string | null>(null);
  const [exitCountry, setExitCountry] = useState("random");
  const [ipInfo, setIpInfo] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/tor/status`); setStatus(await r.json()); } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 350; const h = 180;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    const hopPositions = [
      { x: 60, y: 90, label: "GUARD" },
      { x: 175, y: 90, label: "MIDDLE" },
      { x: 290, y: 90, label: "EXIT" },
    ];

    let t = 0;
    const particles: Array<{ x: number; y: number; tx: number; ty: number; progress: number; speed: number; size: number; alpha: number }> = [];
    for (let i = 0; i < 12; i++) {
      const seg = Math.floor(Math.random() * 2);
      const start = hopPositions[seg];
      const end = hopPositions[seg + 1];
      particles.push({
        x: start.x, y: start.y,
        tx: end.x, ty: end.y,
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.006,
        size: 1.5 + Math.random() * 2,
        alpha: 0.4 + Math.random() * 0.5,
      });
    }

    const draw = () => {
      t += 0.02;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.3)";
      ctx.fillRect(0, 0, w, h);

      const nodes = status.circuit_nodes || [];
      const active = status.active;

      hopPositions.forEach((hp, i) => {
        const pulse = active ? 1 + Math.sin(t * 3 + i) * 0.35 : 0.5;
        const alpha = active ? 0.15 + Math.sin(t * 2 + i) * 0.1 : 0.05;

        // Connection lines with gradient pulse
        if (i < 2) {
          const nx = hopPositions[i + 1];
          ctx.beginPath();
          ctx.moveTo(hp.x, hp.y);
          ctx.lineTo(nx.x, nx.y);
          const g = ctx.createLinearGradient(hp.x, hp.y, nx.x, nx.y);
          g.addColorStop(0, `rgba(168,85,247,${alpha})`);
          g.addColorStop(0.5, `rgba(0,212,255,${alpha + 0.1})`);
          g.addColorStop(1, `rgba(0,255,136,${alpha})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Data flow shimmer
          ctx.beginPath();
          ctx.moveTo(hp.x, hp.y);
          ctx.lineTo(nx.x, nx.y);
          const shimmerOffset = ((t * 30) % 200) - 100;
          ctx.strokeStyle = "rgba(0,255,136,0.08)";
          ctx.lineWidth = 4;
          ctx.setLineDash([6, 18]);
          ctx.lineDashOffset = -shimmerOffset;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Outer ring pulse
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 18 * pulse, 0, Math.PI * 2);
        const rg = ctx.createRadialGradient(hp.x, hp.y, 6 * pulse, hp.x, hp.y, 18 * pulse);
        const colors = i === 0 ? [168, 85, 247] : i === 1 ? [0, 212, 255] : [0, 255, 136];
        rg.addColorStop(0, `rgba(${colors[0]},${colors[1]},${colors[2]},0.25)`);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
        ctx.shadowColor = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
        ctx.shadowBlur = 10 * pulse;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(hp.label, hp.x, hp.y - 22);
        if (nodes[i]) {
          ctx.fillStyle = "#555";
          ctx.font = "7px 'JetBrains Mono', monospace";
          ctx.fillText(nodes[i].country || "", hp.x, hp.y + 28);
        } else {
          ctx.fillStyle = "#333";
          ctx.font = "7px 'JetBrains Mono', monospace";
          ctx.fillText("---", hp.x, hp.y + 28);
        }
      });

      // Animated data particles
      particles.forEach(p => {
        p.progress += p.speed;
        if (p.progress >= 1) { p.progress = 0; }
        const seg = Math.floor(p.progress * 1000) % 2;
        const start = hopPositions[seg];
        const end = hopPositions[seg + 1];
        const lp = p.progress % 1;
        p.x = start.x + (end.x - start.x) * lp;
        p.y = start.y + (end.y - start.y) * lp + Math.sin(lp * Math.PI * 4) * 3;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,136,${p.alpha * (status.active ? 0.8 : 0.2)})`;
        ctx.fill();
      });

      // Logo/animation in center
      if (status.active) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.font = "bold 48px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#a855f7";
        ctx.fillText("🔐", 175, 105);
        ctx.restore();
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [status.active, status.circuit_nodes]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try { await fetch(`${API}/api/tor/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) }); } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  useEffect(() => {
    // Auto-fetch IP info on mount
    checkIp();
    const id = setInterval(checkIp, 15000);
    return () => clearInterval(id);
  }, []);

  const checkIp = async () => {
    try {
      // Get REAL IP from client-side geolocation API
      const [ipRes, torRes] = await Promise.all([
        fetch('http://ip-api.com/json/?fields=query,city,country,countryCode,isp,org,lat,lon'),
        fetch(`${API}/api/tor/check-ip`),
      ]);
      const [ipData, torData] = await Promise.all([ipRes.json(), torRes.json()]);
      setIpInfo({
        real_ip: ipData.query || '?',
        real_city: ipData.city || '',
        real_country: ipData.country || '',
        real_countryCode: ipData.countryCode || '',
        real_isp: ipData.isp || ipData.org || '',
        real_lat: ipData.lat || 0,
        real_lon: ipData.lon || 0,
        torified: torData.torified || false,
        exit_ip: torData.exit_ip || '',
        exit_country: torData.exit_country || '',
        latency_ms: torData.latency_ms || 0,
        checked_at: new Date().toISOString(),
      });
    } catch (e) {
      console.log('IP check failed:', e);
    }
  };

  const s = status.stats || {};
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.topRow}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>TOR Routing</h2>
            <motion.div style={{ ...styles.badge, background: status.active ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.06)", color: status.active ? "#a855f7" : "#555", borderColor: status.active ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.15)" }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              {status.active ? "ONION" : "OFFLINE"}
            </motion.div>
          </div>
          <div style={styles.statsBar}>
            <Stat label="Circuits" value={<GlitchNumber value={s.circuits_built || 0} color="#a855f7" fontSize={22} fontWeight={700} />} />
            <Stat label="Torified" value={<GlitchNumber value={s.nodes_torified || 0} color="#00ff88" fontSize={22} fontWeight={700} />} />
            <Stat label="BW" value={`${(s.bandwidth_mbps || 0).toFixed(1)} Mbps`} color="#00d4ff" />
            <Stat label="Latency" value={`${s.latency_ms || 0}ms`} color="#ffd700" />
            <Stat label="Routed" value={`${(s.traffic_routed_mb || 0).toFixed(1)} MB`} color="#ff6ec7" />
            <Stat label="Uptime" value={`${status.uptime || 0}s`} color="#ff4757" />
          </div>
        </div>
      </div>

      <div style={styles.midRow}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Circuit Builder</h3>
          <div style={styles.targetRow}>
            <select style={styles.select} value={exitCountry} onChange={(e) => setExitCountry(e.target.value)}>
              <option value="random">Random Exit</option>
              {(status.available_exits || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={styles.actionGrid}>
            <Btn label="BUILD CIRCUIT" color="#a855f7" loading={executing === "Build"} onClick={() => execute("build", { exit: exitCountry === "random" ? null : exitCountry }, "Build")} />
            <Btn label="ROTATE" color="#00d4ff" loading={executing === "Rotate"} onClick={() => execute("rotate", {}, "Rotate")} />
            <Btn label="TORIFY ALL" color="#00ff88" loading={executing === "Torify"} onClick={() => execute("torify", {}, "Torify")} />
            <Btn label="BRIDGES ON" color="#ffd700" loading={executing === "Bridge"} onClick={() => execute("bridges", { enable: true }, "Bridge")} />
            <Btn label="STEALTH" color="#ff6ec7" loading={executing === "Stealth"} onClick={() => execute("stealth", {}, "Stealth")} />
            <Btn label="DESTROY" color="#ff4757" loading={executing === "Destroy"} onClick={() => execute("stop", {}, "Destroy")} />
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Circuit Map</h3>
          <canvas ref={canvasRef} style={{ width: "100%", height: 180, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
        </div>
      </div>

      {/* ── Live IP Display ── */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionTitle, margin: 0, marginBottom: 12 }}><span style={styles.dot} />Live IP Status</h3>
        {ipInfo ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "14px", background: "rgba(255,71,87,0.06)", borderRadius: 10, border: "1px solid rgba(255,71,87,0.15)" }}>
              <div style={{ color: "#ff4757", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, fontWeight: 600 }}>⚠ Real IP (UNMASKED)</div>
              <div style={{ color: "#ff4757", fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{ipInfo.real_ip}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ color: "#ff4757", fontSize: 16, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", background: "rgba(255,71,87,0.1)", borderRadius: 4 }}>{countryCodeToFlag(ipInfo.real_countryCode) || COUNTRY_FLAGS[ipInfo.real_country] || '🏳️'}</span>
                <span style={{ color: "#555", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>{ipInfo.real_isp}</span>
              </div>
            </div>
            <div style={{ padding: "14px", background: ipInfo.torified ? "rgba(168,85,247,0.06)" : "rgba(0,255,136,0.06)", borderRadius: 10, border: `1px solid ${ipInfo.torified ? "rgba(168,85,247,0.15)" : "rgba(0,255,136,0.15)"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#666", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>{ipInfo.torified ? 'TOR Exit IP (Masked)' : 'Connection'}</span>
                <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: ipInfo.torified ? "#a855f7" : "#00ff88", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
                  {ipInfo.torified ? 'TOR PROTECTED' : 'CLEAR'}
                </motion.span>
              </div>
              <div style={{ color: ipInfo.torified ? "#a855f7" : "#00ff88", fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{ipInfo.torified ? ipInfo.exit_ip : ipInfo.real_ip}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                {ipInfo.torified ? (
                  <>
                    <span style={{ color: "#a855f7", fontSize: 16, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", background: "rgba(168,85,247,0.1)", borderRadius: 4 }}>{COUNTRY_FLAGS[ipInfo.exit_country] || '🏳️'}</span>
                    <span style={{ color: "#a855f7", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: "rgba(168,85,247,0.1)", borderRadius: 4 }}>{ipInfo.latency_ms}ms</span>
                  </>
                ) : (
                  <span style={{ color: "#555", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>Not torified</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#333", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>Detecting IP...</div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Exit Node Countries</h3>
        <div style={styles.countryGrid}>
          {(status.available_exits || []).slice(0, 15).map((c: string) => (
            <motion.div key={c} whileHover={{ scale: 1.05, borderColor: "rgba(168,85,247,0.3)" }} style={{ ...styles.countryChip, borderColor: c === status.exit_node ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.04)", background: c === status.exit_node ? "rgba(168,85,247,0.1)" : "rgba(6,6,14,0.4)" }}>
              <span style={{ fontSize: 16, lineHeight: 1, color: c === status.exit_node ? "#a855f7" : "#666", fontFamily: "'JetBrains Mono', monospace" }}>{COUNTRY_FLAGS[c] || '🏳️'}</span>
              <span style={{ fontSize: 6, color: "#333", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{c}</span>
              {c === status.exit_node && <span style={{ fontSize: 7, color: "#a855f7", marginLeft: 4 }}>ACTIVE</span>}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

function Stat({ label, value }: { label: string; value: any; color?: string }) {
  return (<div style={{ textAlign: "center" }}><div style={{ color: "#e0e0e0", fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div><div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div></div>);
}

function Btn({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  return (<motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ ...styles.btn, borderColor: `${color}30`, opacity: loading ? 0.5 : 1 }} onClick={onClick} disabled={loading}>
    {loading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>&#9696;</motion.span> : null}
    <span style={{ color, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
  </motion.button>);
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  topRow: { display: "flex", gap: 6 },
  midRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(168,85,247,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)", flex: 1 },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { margin: 0, color: "#a855f7", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#a855f7", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 10px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsBar: { display: "flex", justifyContent: "space-around", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap", gap: 12 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 },
  targetRow: { display: "flex", gap: 8, marginBottom: 10 },
  select: { flex: 1, padding: "8px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none" },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  countryGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  countryChip: { padding: "6px 12px", borderRadius: 8, border: "1px solid", display: "flex", alignItems: "center", transition: "all 0.2s" },
};

export default TorPanel;
