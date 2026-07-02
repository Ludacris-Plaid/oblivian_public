import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = "http://localhost:8000";

function flagFromCode(code: string): string {
  if (!code || code.length !== 2) return code;
  const base = 0x1F1E6;
  const a = code.toUpperCase().charCodeAt(0) - 65;
  const b = code.toUpperCase().charCodeAt(1) - 65;
  if (a < 0 || a > 25 || b < 0 || b > 25) return code;
  return String.fromCodePoint(base + a, base + b);
}

const COUNTRY_FLAGS: Record<string, string> = {
  'US': '🇺🇸', 'DE': '🇩🇪', 'NL': '🇳🇱', 'FR': '🇫🇷', 'JP': '🇯🇵',
  'SG': '🇸🇬', 'UK': '🇬🇧', 'GB': '🇬🇧', 'BR': '🇧🇷', 'IN': '🇮🇳',
  'RU': '🇷🇺', 'CA': '🇨🇦', 'AU': '🇦🇺', 'CH': '🇨🇭', 'SE': '🇸🇪',
  'NO': '🇳🇴', 'DK': '🇩🇰', 'IT': '🇮🇹', 'ES': '🇪🇸', 'PT': '🇵🇹',
  'IE': '🇮🇪', 'AT': '🇦🇹', 'BE': '🇧🇪', 'PL': '🇵🇱', 'CZ': '🇨🇿',
  'HU': '🇭🇺', 'RO': '🇷🇴', 'BG': '🇧🇬', 'GR': '🇬🇷', 'TR': '🇹🇷',
  'CN': '🇨🇳', 'KR': '🇰🇷', 'TW': '🇹🇼', 'HK': '🇭🇰', 'TH': '🇹🇭',
  'VN': '🇻🇳', 'PH': '🇵🇭', 'ID': '🇮🇩', 'MY': '🇲🇾', 'MX': '🇲🇽',
  'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'ZA': '🇿🇦',
  'NG': '🇳🇬', 'EG': '🇪🇬', 'KE': '🇰🇪', 'MA': '🇲🇦', 'AE': '🇦🇪',
  'IL': '🇮🇱', 'SA': '🇸🇦', 'QA': '🇶🇦',
};

const RotatingProxyPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, proxies: [], history: [], active: false, current_proxy: null });
  const [executing, setExecuting] = useState<string | null>(null);
  const [speed, setSpeed] = useState(60);
  const SPEED_OPTS = [60, 300, 600, 1200, 1800, 3600];
  const [log, setLog] = useState<string[]>([]);
  const [ipInfo, setIpInfo] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/rotating-proxy/status`); setStatus(await r.json()); } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Fetch real IP info
  useEffect(() => {
    const pollIp = async () => {
      try {
        const r = await fetch('http://ip-api.com/json/?fields=query,city,country,countryCode,isp,org,as,mobile,proxy,hosting');
        const d = await r.json();
        setIpInfo(d);
      } catch {}
    };
    pollIp();
    const id = setInterval(pollIp, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = 600 * dpr; c.height = 80 * dpr;
    ctx.scale(dpr, dpr);
    let t = 0;
    const draw = () => {
      t += 0.05;
      ctx.clearRect(0, 0, 600, 80);
      for (let i = 0; i < 30; i++) {
        const x = (i * 20 + t * 15) % 620 - 20;
        const y = 40 + Math.sin(i + t) * 20;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        const alpha = 0.2 + Math.sin(t * 2 + i) * 0.15;
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try {
      const r = await fetch(`${API}/api/rotating-proxy/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
      setLog((l) => [`[${new Date().toTimeString().slice(0, 8)}] ${label}`, ...l.slice(0, 19)]);
    } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.topRow}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>Rotating Proxy</h2>
            <motion.div style={{ ...styles.badge, background: status.active ? "rgba(255,215,0,0.12)" : "rgba(255,215,0,0.06)", color: status.active ? "#ffd700" : "#555", borderColor: status.active ? "rgba(255,215,0,0.3)" : "rgba(255,215,0,0.15)" }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              {status.active ? "ROTATING" : "STOPPED"}
            </motion.div>
          </div>
          <div style={styles.statsBar}>
            <Stat label="Pool" value={<GlitchNumber value={s.active_proxies || 0} color="#ffd700" fontSize={22} fontWeight={700} />} />
            <Stat label="Dead" value={<GlitchNumber value={s.dead_proxies || 0} color="#ff4757" fontSize={22} fontWeight={700} />} />
            <Stat label="Rotations" value={<GlitchNumber value={s.rotations || 0} color="#00d4ff" fontSize={22} fontWeight={700} />} />
            <Stat label="Requests" value={<GlitchNumber value={s.requests_routed || 0} color="#00ff88" fontSize={22} fontWeight={700} />} />
            <Stat label="Latency" value={`${s.avg_latency_ms || 0}ms`} color="#ff6ec7" />
            <Stat label="Success" value={`${s.success_rate_pct || 100}%`} color="#a855f7" />
          </div>
        </div>
      </div>

      {/* ── Live IP Display (TOR-style) ── */}
      <div style={styles.ipCard}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: 10 }}><span style={styles.dot} />Live IP Status</h3>
        {ipInfo ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Real IP panel — always red */}
            <div style={{ padding: "14px", background: "rgba(255,71,87,0.06)", borderRadius: 10, border: "1px solid rgba(255,71,87,0.15)" }}>
              <div style={{ color: "#ff4757", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, fontWeight: 600 }}>⚠ Real IP (UNMASKED)</div>
              <div style={{ color: "#ff4757", fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{ipInfo.query || '?'}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: "#ff4757", fontSize: 16, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", background: "rgba(255,71,87,0.1)", borderRadius: 4 }}>{flagFromCode(ipInfo.countryCode) || ipInfo.country}</span>
                <span style={{ color: "#555", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>{ipInfo.isp || ipInfo.org || ''}</span>
                <span style={{ color: ipInfo.proxy ? "#ff4757" : "#00ff88", fontSize: 7, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: 4, background: ipInfo.proxy ? "rgba(255,71,87,0.1)" : "rgba(0,255,136,0.1)" }}>
                  {ipInfo.proxy ? 'PROXY DETECTED' : ipInfo.mobile ? 'MOBILE' : ipInfo.hosting ? 'HOSTING' : 'RESIDENTIAL'}
                </span>
              </div>
            </div>
            {/* Proxy/connection panel */}
            <div style={{ padding: "14px", background: status.active && status.current_proxy ? "rgba(255,215,0,0.06)" : "rgba(0,255,136,0.04)", borderRadius: 10, border: `1px solid ${status.active && status.current_proxy ? "rgba(255,215,0,0.15)" : "rgba(0,255,136,0.08)"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#666", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>{status.active ? 'Proxy IP (Masked)' : 'Connection'}</span>
                <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: status.active ? "#ffd700" : "#00ff88", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  {status.active ? 'PROXY ACTIVE' : 'CLEAR'}
                </motion.span>
              </div>
              {status.active && status.current_proxy ? (
                <>
                  <div style={{ color: "#ffd700", fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{status.current_proxy.host}:{status.current_proxy.port}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ color: "#ffd700", fontSize: 16, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", background: "rgba(255,215,0,0.1)", borderRadius: 4 }}>{COUNTRY_FLAGS[status.current_proxy.country] || flagFromCode(status.current_proxy.country) || '🏳️'}</span>
                    <span style={{ color: "#ffd700", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px", background: "rgba(255,215,0,0.08)", borderRadius: 4 }}>{status.current_proxy.protocol}</span>
                    <span style={{ color: "#888", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{status.current_proxy.anonymity}</span>
                  </div>
                </>
              ) : (
                <div style={{ color: "#555", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>Not using proxy</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#333", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>Detecting IP...</div>
        )}
      </div>

      <div style={styles.midRow}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Proxy Controls</h3>
          <div style={styles.speedRow}>
            <span style={{ color: "#aaa", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>Interval:</span>
            {SPEED_OPTS.map(s => (
              <motion.button key={s} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSpeed(s)}
                style={{
                  padding: "4px 8px", borderRadius: 5, border: speed === s ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.05)",
                  background: speed === s ? "rgba(255,215,0,0.1)" : "rgba(6,6,14,0.4)",
                  color: speed === s ? "#ffd700" : "#555", fontSize: 9, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", transition: "all 0.15s",
                }}>{s >= 60 ? `${s / 60}m` : `${s}s`}</motion.button>
            ))}
          </div>
          <div style={styles.actionGrid}>
            <Btn label="SCRAPE PROXIES" color="#ffd700" loading={executing === "Scrape"} onClick={() => execute("scrape", {}, "Scrape")} />
            <Btn label="START ROTATION" color="#00ff88" loading={executing === "Start"} onClick={() => execute("start", { speed }, "Start")} />
            <Btn label="ROTATE NOW" color="#00d4ff" loading={executing === "Rotate"} onClick={() => execute("rotate", {}, "Rotate")} />
            <Btn label="VALIDATE ALL" color="#a855f7" loading={executing === "Validate"} onClick={() => execute("validate", {}, "Validate")} />
            <Btn label="STOP" color="#ff4757" loading={executing === "Stop"} onClick={() => execute("stop", {}, "Stop")} />
          </div>
        </div>
        <div style={styles.card}>
          <canvas ref={canvasRef} style={{ width: "100%", height: 80, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Proxy Rotation Flow</span>
            {status.current_proxy && (
              <span style={{ color: "#ffd700", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
                {status.current_proxy.host}:{status.current_proxy.port} {COUNTRY_FLAGS[status.current_proxy.country] || flagFromCode(status.current_proxy.country) || status.current_proxy.country}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Proxy Pool</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 240, overflowY: "auto" }}>
            {(status.proxies || []).slice(0, 60).map((p: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.05 }} style={{
                ...styles.poolChip,
                borderColor: p.status === "active" ? "rgba(0,255,136,0.2)" : "rgba(255,71,87,0.2)",
                background: p.status === "active" ? "rgba(0,255,136,0.04)" : "rgba(255,71,87,0.04)",
              }}>
                <span style={{ color: p.status === "active" ? "#00ff88" : "#ff4757", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  {p.host}:{p.port}
                </span>
                <span style={{ color: "#444", fontSize: 7 }}>{COUNTRY_FLAGS[p.country] || flagFromCode(p.country) || p.country}</span>
                <span style={{ color: "#555", fontSize: 7 }}>{p.anonymity?.slice(0, 3)}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Rotation Log</h3>
          <div style={styles.feed}>
            {(status.history || []).slice(-12).reverse().map((h: any, i: number) => (
              <div key={i} style={styles.feedRow}>
                <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>{h.timestamp ? new Date(h.timestamp).toTimeString().slice(0, 8) : ""}</span>
                <span style={{ color: "#ffd700", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600 }}>{h.action}</span>
                {h.proxy && <span style={{ color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace", fontSize: 8 }}>{h.proxy}</span>}
                {h.found !== undefined && <span style={{ color: "#00ff88", fontSize: 8 }}>+{h.found}</span>}
              </div>
            ))}
            {(!status.history || status.history.length === 0) && <p style={{ color: "#333", fontSize: 11, textAlign: "center", padding: 20 }}>Start rotation to see logs</p>}
          </div>
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
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(255,215,0,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)", flex: 1 },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { margin: 0, color: "#ffd700", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#ffd700", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 10px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsBar: { display: "flex", justifyContent: "space-around", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap", gap: 12 },
  actionGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 },
  speedRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "6px 12px", background: "rgba(6,6,14,0.4)", borderRadius: 8 },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" },
  feed: { display: "flex", flexDirection: "column", gap: 3, maxHeight: 240, overflowY: "auto" },
  feedRow: { display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", background: "rgba(6,6,14,0.4)", borderRadius: 4 },
  poolChip: { display: "flex", flexDirection: "column", gap: 2, padding: "4px 8px", borderRadius: 6, border: "1px solid", transition: "all 0.15s" },
  ipCard: { background: "rgba(12,14,28,0.7)", backdropFilter: "blur(16px)", borderRadius: 10, border: "1px solid rgba(255,215,0,0.08)", padding: "10px 14px", boxShadow: "0 2px 24px rgba(0,0,0,0.3)" },
};

export default RotatingProxyPanel;
