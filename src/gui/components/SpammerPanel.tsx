import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

const API = "http://localhost:8000";

const TONE_COLORS: Record<string, string> = {
  URGENT_TONE: "#ff4757",
  SUPPORTIVE_TONE: "#2ed573",
  CURIOUS_TONE: "#ffa502",
  AUTHORITATIVE_TONE: "#a855f7",
  CASUAL_TONE: "#00d4ff",
};

const SpammerPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, smtp_pool: [], campaign: {}, active: false });
  const [executing, setExecuting] = useState<string | null>(null);
  const [tone, setTone] = useState("URGENT_TONE");
  const [template, setTemplate] = useState("product_launch");
  const [campaignName, setCampaignName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const poll = async () => {
      try {
        const [sr, ar] = await Promise.all([
          fetch(`${API}/api/spammer/status`),
          fetch(`${API}/api/spammer/activity`),
        ]);
        const [s, a] = await Promise.all([sr.json(), ar.json()]);
        setStatus(s);
        setTone(s.campaign?.tone || "URGENT_TONE");
        setTemplate(s.campaign?.template_id || "product_launch");
        if (a.log) setActivity(a.log);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 750; const h = 210;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    const stages = [
      { x: 75, y: 105, label: "CONTACTS", icon: "📇" },
      { x: 225, y: 105, label: "AI GEN", icon: "🧠" },
      { x: 375, y: 105, label: "WARMUP", icon: "🔥" },
      { x: 525, y: 105, label: "SEND", icon: "📤" },
      { x: 675, y: 105, label: "TRACK", icon: "📊" },
    ];

    const stageColors = ["#ffa502", "#a855f7", "#ff4757", "#00d4ff", "#2ed573"];

    let t = 0;
    const envelopes: Array<{ seg: number; progress: number; speed: number; size: number; alpha: number; success: boolean }> = [];
    for (let i = 0; i < 20; i++) {
      envelopes.push({
        seg: Math.floor(Math.random() * 4),
        progress: Math.random(),
        speed: 0.0015 + Math.random() * 0.005,
        size: 3 + Math.random() * 5,
        alpha: 0.3 + Math.random() * 0.5,
        success: Math.random() > 0.15,
      });
    }

    const smtpBars: Array<{ x: number; targetY: number; currentY: number; label: string; status: string }> = [];

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.4)";
      ctx.fillRect(0, 0, w, h);

      const active = status.active;
      const s = status.stats || {};

      // Pipeline stages
      stages.forEach((st, i) => {
        const pulse = active ? 1 + Math.sin(t * 3 + i) * 0.3 : 0.6;
        const alpha = active ? 0.12 + Math.sin(t * 2 + i) * 0.06 : 0.04;

        // Connection pipes between stages
        if (i < stages.length - 1) {
          const nx = stages[i + 1];
          ctx.beginPath();
          ctx.moveTo(st.x + 28, st.y);
          ctx.lineTo(nx.x - 28, nx.y);
          const g = ctx.createLinearGradient(st.x + 28, st.y, nx.x - 28, nx.y);
          g.addColorStop(0, `${stageColors[i]}44`);
          g.addColorStop(0.5, `${stageColors[i]}22`);
          g.addColorStop(1, `${stageColors[i + 1]}44`);
          ctx.strokeStyle = g;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Flowing data through pipe
          ctx.beginPath();
          ctx.moveTo(st.x + 28, st.y);
          ctx.lineTo(nx.x - 28, nx.y);
          const flowOff = ((t * 80) % 160) - 80;
          ctx.strokeStyle = active ? `${stageColors[i]}22` : "rgba(255,255,255,0.03)";
          ctx.lineWidth = 6;
          ctx.setLineDash([8, 20]);
          ctx.lineDashOffset = -flowOff;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Stage circle
        ctx.beginPath();
        ctx.arc(st.x, st.y, 22 * pulse, 0, Math.PI * 2);
        const rg = ctx.createRadialGradient(st.x, st.y, 8 * pulse, st.x, st.y, 22 * pulse);
        rg.addColorStop(0, `${stageColors[i]}44`);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(st.x, st.y, 6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = stageColors[i];
        ctx.shadowColor = stageColors[i];
        ctx.shadowBlur = active ? 12 * pulse : 4;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Stage label
        ctx.fillStyle = stageColors[i];
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(st.label, st.x, st.y - 34);
        ctx.fillStyle = "#555";
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillText(st.icon, st.x, st.y + 38);
      });

      // Animated email envelopes flowing through pipeline
      if (active) {
        const speed = 0.002 + (s.emails_sent || 0) * 0.0001;
        envelopes.forEach((e) => {
          e.progress += e.speed + (speed * 0.5);
          if (e.progress >= 1) {
            e.progress = 0;
            e.seg = (e.seg + 1) % 4;
          }
          const seg = e.seg;
          const start = stages[seg];
          const end = stages[seg + 1];
          const lp = e.progress;
          const ex = start.x + (end.x - start.x) * lp;
          const ey = start.y + Math.sin(lp * Math.PI * 3) * 10;

          // Envelope body
          ctx.fillStyle = e.success ? `rgba(46,213,115,${e.alpha})` : `rgba(255,71,87,${e.alpha * 0.5})`;
          ctx.fillRect(ex - e.size, ey - e.size * 0.6, e.size * 2, e.size * 1.2);
          ctx.strokeStyle = e.success ? "rgba(46,213,115,0.6)" : "rgba(255,71,87,0.4)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(ex - e.size, ey - e.size * 0.6, e.size * 2, e.size * 1.2);

          // Envelope flap (triangle)
          ctx.beginPath();
          ctx.moveTo(ex - e.size, ey - e.size * 0.6);
          ctx.lineTo(ex, ey);
          ctx.lineTo(ex + e.size, ey - e.size * 0.6);
          ctx.strokeStyle = e.success ? "rgba(46,213,115,0.5)" : "rgba(255,71,87,0.3)";
          ctx.lineWidth = 0.4;
          ctx.stroke();
        });
      }

      // SMTP pool health bars (right side)
      const pool = status.smtp_pool || [];
      if (smtpBars.length === 0 && pool.length > 0) {
        pool.forEach((p: any, i: number) => {
          smtpBars.push({
            x: 700 + (i % 4) * 60,
            targetY: 10 + Math.floor(i / 4) * 22,
            currentY: 200,
            label: p.host?.replace("smtp.", "")?.replace(".com", "") || "?",
            status: p.status || "healthy",
          });
        });
      }

      smtpBars.forEach((bar) => {
        bar.currentY += (bar.targetY - bar.currentY) * 0.1;
        const barX = 700;
        const barY = bar.targetY;
        const barW = 40;
        const barH = 14;

        const sc = bar.status === "healthy" ? "#2ed573" : bar.status === "suspicious" ? "#ffa502" : bar.status === "warming" ? "#ffa502" : bar.status === "quarantined" ? "#ff4757" : "#ff4757";
        ctx.fillStyle = `${sc}33`;
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = sc;
        ctx.fillRect(barX, barY, barW * (bar.status === "healthy" ? 0.9 : bar.status === "suspicious" ? 0.5 : bar.status === "warming" ? 0.35 : 0.15), barH);
        ctx.strokeStyle = `${sc}55`;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.fillStyle = sc;
        ctx.font = "6px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(bar.label, barX, barY - 3);

        // Pulsing activity indicator for healthy
        if (bar.status === "healthy" && active) {
          ctx.fillStyle = `${sc}${Math.floor(30 + Math.sin(t * 5) * 20).toString(16)}`;
          ctx.fillRect(barX - 10, barY + 4, 6, 6);
        }
      });

      // Background watermark when active
      if (active) {
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.font = "bold 56px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#2ed573";
        ctx.fillText("SPAMMING", w / 2, h / 2);
        ctx.restore();
      }

      requestAnimationFrame(draw);
    };
    const rid = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rid);
  }, [status.active, status.stats?.emails_sent, status.smtp_pool]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try {
      await fetch(`${API}/api/spammer/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const s = status.stats || {};
  const campaign = status.campaign || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      {/* ── Stats Bar ── */}
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot} />Spammer Engine</h2>
          <motion.div style={{
            ...styles.badge,
            background: status.active ? "rgba(46,213,115,0.15)" : "rgba(46,213,115,0.06)",
            color: status.active ? "#2ed573" : "#555",
            borderColor: status.active ? "rgba(46,213,115,0.3)" : "rgba(46,213,115,0.15)",
          }}
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            {status.active ? "FIRING" : "STANDBY"}
          </motion.div>
        </div>
        <div style={styles.statsBar}>
          <Stat label="Contacts" value={<GlitchNumber value={s.contacts_enriched || 0} color="#ffa502" fontSize={20} fontWeight={700} />} sub={`${status.contacts_count || 0} pool`} />
          <Stat label="Generated" value={<GlitchNumber value={s.emails_generated || 0} color="#a855f7" fontSize={20} fontWeight={700} />} sub={`${status.queue_size || 0} queued`} />
          <Stat label="Sent" value={<GlitchNumber value={s.emails_sent || 0} color="#00d4ff" fontSize={20} fontWeight={700} />} sub={`${(s.bytes_sent || 0).toLocaleString()} B`} />
          <Stat label="Opens" value={<GlitchNumber value={s.opens || 0} color="#ffa502" fontSize={20} fontWeight={700} />} sub={`${s.open_rate_pct || 0}%`} />
          <Stat label="Clicks" value={<GlitchNumber value={s.clicks || 0} color="#2ed573" fontSize={20} fontWeight={700} />} sub={`${s.click_rate_pct || 0}%`} />
          <Stat label="Bounces" value={<GlitchNumber value={s.bounces || 0} color="#ff4757" fontSize={20} fontWeight={700} />} sub={`${s.bounce_rate_pct || 0}%`} />
          <Stat label="SMTP Pool" value={s.active_smtp_credentials || 0} color="#00d4ff" sub={`${s.dead_smtp_credentials || 0} dead, ${s.quarantined_smtp_credentials || 0} quar`} />
          <Stat label="Rate" value={`${s.rate_delay_sec || 0}s`} color="#ff6ec7" sub={`${s.warmed_up_credentials || 0} warmed`} />
        </div>
      </div>

      {/* ── Pipeline Canvas ── */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Pipeline Visualization</h3>
        <canvas ref={canvasRef} style={{ width: "100%", height: 210, borderRadius: 8, background: "rgba(6,6,14,0.5)" }} />
      </div>

      {/* ── Controls + Configuration ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {/* Campaign Controls */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Campaign</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              style={styles.input}
              placeholder="Campaign name..."
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <select style={styles.select} value={template} onChange={(e) => { setTemplate(e.target.value); execute("set-template", { template_id: e.target.value }, "Set Template"); }}>
              {(status.templates || ["product_launch", "consultation_offer", "industry_insight"]).map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select style={styles.select} value={tone} onChange={(e) => { setTone(e.target.value); execute("set-tone", { tone: e.target.value }, "Set Tone"); }}>
              {(status.tones || ["URGENT_TONE", "SUPPORTIVE_TONE", "CURIOUS_TONE", "AUTHORITATIVE_TONE", "CASUAL_TONE"]).map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <Btn label="CREATE CAMPAIGN" color="#00d4ff" loading={executing === "Create"} onClick={() => execute("create-campaign", { name: campaignName || `Campaign-${Date.now()}`, template_id: template, tone }, "Create")} />
            <Btn label="IMPORT CONTACTS" color="#ffa502" loading={executing === "Import"} onClick={() => execute("import-contacts", { contacts: [] }, "Import")} />
            <Btn label="GENERATE EMAILS" color="#a855f7" loading={executing === "Generate"} onClick={() => execute("generate", { count: 10 }, "Generate")} />
            <Btn label="INIT SMTP POOL" color="#00d4ff" loading={executing === "Init SMTP"} onClick={() => execute("init-smtp", {}, "Init SMTP")} />
            <Btn label={status.active ? "⏹ STOP" : "▶ START"} color={status.active ? "#ff4757" : "#2ed573"} loading={executing === "Start"} onClick={() => execute(status.active ? "stop" : "start", status.active ? {} : { batch_size: 3 }, status.active ? "Stop" : "Start")} btnStyle={{ gridColumn: "span 2" }} />
          </div>
          {campaign.id && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(0,212,255,0.06)", borderRadius: 6, border: "1px solid rgba(0,212,255,0.1)" }}>
              <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Active Campaign: </span>
              <span style={{ color: "#00d4ff", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{campaign.name || campaign.id}</span>
              <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", marginLeft: 8 }}>{campaign.tone}</span>
            </div>
          )}
        </div>

        {/* SMTP Pool Health + Reputation */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />SMTP Pool Health</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <TinyStat label="Healthy" value={s.active_smtp_credentials || 0} color="#2ed573" />
            <TinyStat label="Warming" value={s.warming_up_credentials || 0} color="#ffa502" />
            <TinyStat label="Suspicious" value={s.suspicious_smtp_credentials || 0} color="#ffa502" />
            <TinyStat label="Dead" value={s.dead_smtp_credentials || 0} color="#ff4757" />
            <TinyStat label="Quar" value={s.quarantined_smtp_credentials || 0} color="#ff4757" />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(status.smtp_pool || []).slice(0, 12).map((cred: any, i: number) => {
              const sc = cred.status === "healthy" ? "#2ed573" : cred.status === "suspicious" ? "#ffa502" : cred.status === "warming" ? "#ffa502" : cred.status === "quarantined" ? "#ff4757" : "#ff4757";
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, borderColor: `${sc}66` }}
                  style={{ ...styles.smtpPill, borderColor: `${sc}22`, background: `${sc}0a` }}
                >
                  <motion.span animate={{ opacity: cred.status === "healthy" ? [1, 0.3, 1] : [0.5] }} transition={{ duration: cred.status === "healthy" ? 1 : 0 }} style={{ color: sc, fontSize: 6 }}>●</motion.span>
                  <span style={{ color: "#888", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{cred.host?.replace("smtp.", "")?.replace(".com", "") || "?"}</span>
                  <span style={{ color: sc, fontSize: 7, fontFamily: "'JetBrains Mono', monospace" }}>{cred.status}</span>
                </motion.div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
            <Btn label="A/B REPORT" color="#a855f7" loading={executing === "A/B"} onClick={async () => {
              setExecuting("A/B");
              try {
                const r = await fetch(`${API}/api/spammer/ab-report`);
                const d = await r.json();
                console.log("A/B Report:", d);
              } catch {}
              setTimeout(() => setExecuting(null), 1500);
            }} />
          </div>
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Send Activity</h3>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {activity.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "#333", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              No sends yet. Start a campaign.
            </div>
          )}
          {activity.map((item: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.01 }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span style={{ color: item.success ? "#2ed573" : "#ff4757", fontSize: 8 }}>{item.success ? "✓" : "✗"}</span>
              <span style={{ color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.email}
              </span>
              <span style={{ color: "#555", fontSize: 8 }}>{item.smtp}</span>
              {item.opened && <span style={{ color: "#ffa502", fontSize: 8 }}>👁</span>}
              {item.clicked && <span style={{ color: "#2ed573", fontSize: 8 }}>👆</span>}
              <span style={{ color: "#333", fontSize: 7 }}>{item.timestamp?.slice(11, 19) || ""}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

function Stat({ label, value, sub, color }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: color || "#e0e0e0", fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: "#333", marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function TinyStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ color, fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 7, color: "#444", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
    </div>
  );
}

function Btn({ label, color, loading, onClick, btnStyle }: { label: string; color: string; loading: boolean; onClick: () => void; btnStyle?: React.CSSProperties }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{ ...styles.btn, borderColor: `${color}30`, opacity: loading ? 0.5 : 1, ...(btnStyle || {}) }}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 12 }}>
          ◌
        </motion.span>
      ) : null}
      <span style={{ color, fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
    </motion.button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: {
    background: "rgba(12,14,28,0.85)",
    backdropFilter: "blur(20px)",
    borderRadius: 12,
    border: "1px solid rgba(0,212,255,0.1)",
    padding: "14px 16px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.3)",
  },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: {
    margin: 0, color: "#00d4ff", fontSize: 16, fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8,
    textShadow: "0 0 8px rgba(0,212,255,0.3)",
  },
  dot: { fontSize: 8, color: "#2ed573", animation: "pulse 2s infinite" },
  sectionTitle: {
    margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500,
    fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6,
  },
  badge: {
    padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1,
  },
  statsBar: {
    display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6,
    padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.03)",
  },
  input: {
    flex: 1, padding: "8px 12px", background: "rgba(6,6,14,0.6)",
    border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8,
    color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: "none",
  },
  select: {
    flex: 1, padding: "7px 10px", background: "rgba(6,6,14,0.6)",
    border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8,
    color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none",
  },
  btn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "8px 6px", background: "rgba(6,6,14,0.5)", border: "1px solid",
    borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
    transition: "all 0.2s",
  },
  smtpPill: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "4px 8px", borderRadius: 6, border: "1px solid",
    transition: "all 0.2s",
  },
};

export default SpammerPanel;
