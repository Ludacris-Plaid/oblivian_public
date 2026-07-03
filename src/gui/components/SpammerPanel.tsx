import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import EmailComposer from "./EmailComposer";
import SmtpManager from "./SmtpManager";
import ContactImporter from "./ContactImporter";
import { API_URL } from "../config";

const API = "http://localhost:8000";

const SpammerPanel: React.FC = () => {
  const [status, setStatus] = useState<any>({ stats: {}, smtp_pool: [], campaign: {}, active: false, contacts_count: 0, tones: [], templates: [] });
  const [executing, setExecuting] = useState<string | null>(null);
  const [tone, setTone] = useState("URGENT_TONE");
  const [template, setTemplate] = useState("product_launch");
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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
    const w = 800; const h = 70;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    const stages = [
      { x: 80, y: 35, label: "CONTACTS" },
      { x: 260, y: 35, label: "AI GEN" },
      { x: 440, y: 35, label: "WARMUP" },
      { x: 620, y: 35, label: "SEND" },
      { x: 770, y: 35, label: "TRACK" },
    ];
    const colors = ["#ffa502", "#a855f7", "#ff4757", "#00d4ff", "#2ed573"];

    const envelopes: Array<{ seg: number; progress: number; speed: number; size: number; alpha: number; success: boolean }> = [];
    for (let i = 0; i < 15; i++) {
      envelopes.push({
        seg: Math.floor(Math.random() * 4), progress: Math.random(),
        speed: 0.002 + Math.random() * 0.006, size: 2.5 + Math.random() * 4,
        alpha: 0.3 + Math.random() * 0.5, success: Math.random() > 0.15,
      });
    }

    const draw = () => {
      const active = status.active;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.3)"; ctx.fillRect(0, 0, w, h);

      stages.forEach((st, i) => {
        const pulse = active ? 1 + Math.sin(Date.now() * 0.003 + i) * 0.25 : 0.5;
        if (i < stages.length - 1) {
          const nx = stages[i + 1];
          ctx.beginPath(); ctx.moveTo(st.x + 16, st.y); ctx.lineTo(nx.x - 16, nx.y);
          ctx.strokeStyle = `${colors[i]}22`; ctx.lineWidth = 1.5; ctx.stroke();

          ctx.beginPath(); ctx.moveTo(st.x + 16, st.y); ctx.lineTo(nx.x - 16, nx.y);
          ctx.strokeStyle = active ? `${colors[i]}0a` : "rgba(255,255,255,0.02)";
          ctx.lineWidth = 4; ctx.setLineDash([6, 16]);
          ctx.lineDashOffset = -(Date.now() * 0.05 % 160); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.beginPath(); ctx.arc(st.x, st.y, 14 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${colors[i]}33`; ctx.fill();
        ctx.beginPath(); ctx.arc(st.x, st.y, 4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = colors[i]; ctx.shadowColor = colors[i];
        ctx.shadowBlur = active ? 8 : 3; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = colors[i]; ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center"; ctx.fillText(st.label, st.x, st.y + 24);
      });

      if (active) {
        envelopes.forEach((e) => {
          e.progress += e.speed;
          if (e.progress >= 1) { e.progress = 0; e.seg = (e.seg + 1) % 4; }
          const start = stages[e.seg]; const end = stages[e.seg + 1];
          const lp = e.progress;
          const ex = start.x + (end.x - start.x) * lp;
          const ey = start.y + Math.sin(lp * Math.PI * 3) * 6;
          ctx.fillStyle = e.success ? `rgba(46,213,115,${e.alpha})` : `rgba(255,71,87,${e.alpha * 0.5})`;
          ctx.fillRect(ex - e.size, ey - e.size * 0.5, e.size * 2, e.size);
          ctx.strokeStyle = e.success ? "rgba(46,213,115,0.5)" : "rgba(255,71,87,0.3)";
          ctx.lineWidth = 0.5; ctx.strokeRect(ex - e.size, ey - e.size * 0.5, e.size * 2, e.size);
        });
      }
      requestAnimationFrame(draw);
    };
    const rid = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rid);
  }, [status.active]);

  const execute = async (action: string, params: any = {}, label: string) => {
    setExecuting(label);
    try {
      await fetch(`${API}/api/spammer/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch {}
    setTimeout(() => setExecuting(null), 1500);
  };

  const handleAIEmail = async (prompt: string): Promise<string> => {
    try {
      const r = await fetch(`${API}/api/spammer/generate-html`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, tone }),
      });
      const d = await r.json();
      return `Subject: ${d.subject || ""}\n${d.body || ""}`;
    } catch { return ""; }
  };

  const handleSaveDraft = async (subj: string, bdy: string) => {
    try {
      await fetch(`${API}/api/spammer/save-draft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subj, body: bdy, name: `Draft ${new Date().toLocaleTimeString()}` }),
      });
    } catch {}
  };

  const handleAddSmtp = async (cred: any) => {
    try { await fetch(`${API}/api/spammer/smtp-add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cred) }); } catch {}
  };
  const handleRemoveSmtp = async (host: string) => {
    try { await fetch(`${API}/api/spammer/smtp-remove`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host }) }); } catch {}
  };
  const handleUpdateSmtp = async (host: string, field: string, value: any) => {
    try { await fetch(`${API}/api/spammer/smtp-update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host, field, value }) }); } catch {}
  };
  const handleUnquarantine = async (host: string) => {
    try { await fetch(`${API}/api/spammer/unquarantine`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host }) }); } catch {}
  };
  const handleValidate = async (host: string) => {
    try { await fetch(`${API}/api/spammer/validate-auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host }) }); } catch {}
  };
  const handleImportContacts = async (contacts: any[]) => {
    try { await fetch(`${API}/api/spammer/import-contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacts }) }); } catch {}
  };
  const handleAddContact = async (contact: any) => {
    try { await fetch(`${API}/api/spammer/contact-add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contact) }); } catch {}
  };
  const handleRemoveContact = async (email: string) => {
    try { await fetch(`${API}/api/spammer/contact-remove`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); } catch {}
  };

  const s = status.stats || {};
  const campaign = status.campaign || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      {/* ── Pipeline Canvas ── */}
      <div style={styles.pipelineCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Pipeline</h3>
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
        <canvas ref={canvasRef} style={{ width: "100%", height: 70, borderRadius: 6 }} />
      </div>

      {/* ── Stats ── */}
      <div style={styles.statsRow}>
        <MiniStat label="Contacts" value={status.contacts_count || 0} color="#ffa502" />
        <MiniStat label="Generated" value={s.emails_generated || 0} color="#a855f7" />
        <MiniStat label="Sent" value={s.emails_sent || 0} color="#00d4ff" />
        <MiniStat label="Delivered" value={s.emails_delivered || 0} color="#2ed573" />
        <MiniStat label="Opens" value={s.opens || 0} color="#ffa502" sub={`${s.open_rate_pct || 0}%`} />
        <MiniStat label="Clicks" value={s.clicks || 0} color="#2ed573" sub={`${s.click_rate_pct || 0}%`} />
        <MiniStat label="Bounces" value={s.bounces || 0} color="#ff4757" sub={`${s.bounce_rate_pct || 0}%`} />
        <MiniStat label="Failed" value={s.emails_failed || 0} color="#ff4757" />
        <MiniStat label="Rate" value={`${s.rate_delay_sec || 0}s`} color="#ff6ec7" />
        <MiniStat label="Bytes" value={((s.bytes_sent || 0) / 1024).toFixed(1) + "K"} color="#00d4ff" />
      </div>

      {/* ── Main Grid: Contacts | SMTP ── */}
      <div style={styles.grid2}>
        <div style={styles.card}>
          <ContactImporter
            contacts={status.contacts || []}
            count={status.contacts_count || 0}
            onImportRaw={handleImportContacts}
            onAddManual={handleAddContact}
            onRemove={handleRemoveContact}
          />
        </div>
        <div style={styles.card}>
          <SmtpManager
            pool={status.smtp_pool || []}
            onAdd={handleAddSmtp}
            onRemove={handleRemoveSmtp}
            onUpdate={handleUpdateSmtp}
            onUnquarantine={handleUnquarantine}
            onValidate={handleValidate}
          />
        </div>
      </div>

      {/* ── Email Composer ── */}
      <div style={styles.card}>
        <EmailComposer
          onGenerateWithAI={handleAIEmail}
          onSave={handleSaveDraft}
          subject={subject}
          body={body}
          onSubjectChange={setSubject}
          onBodyChange={setBody}
          tone={tone}
          template={template}
        />
      </div>

      {/* ── Campaign Controls ── */}
      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input style={styles.campaignInput} placeholder="Campaign name..." value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
          <select style={styles.smallSelect} value={template} onChange={(e) => { setTemplate(e.target.value); execute("set-template", { template_id: e.target.value }, "tpl"); }}>
            {(status.templates || ["product_launch", "consultation_offer", "industry_insight"]).map((t: string) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select style={styles.smallSelect} value={tone} onChange={(e) => { setTone(e.target.value); execute("set-tone", { tone: e.target.value }, "tone"); }}>
            {(status.tones || ["URGENT_TONE", "SUPPORTIVE_TONE", "CURIOUS_TONE", "AUTHORITATIVE_TONE", "CASUAL_TONE"]).map((t: string) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Btn label="CREATE" color="#00d4ff" loading={executing === "Create"} onClick={() => execute("create-campaign", { name: campaignName || `C-${Date.now()}`, template_id: template, tone }, "Create")} />
          <Btn label="GEN 10" color="#a855f7" loading={executing === "Generate"} onClick={() => execute("generate", { count: 10 }, "Generate")} />
          <Btn label="INIT SMTP" color="#00d4ff" loading={executing === "Init SMTP"} onClick={() => execute("init-smtp", {}, "Init SMTP")} />
          <Btn label={status.active ? "⏹ STOP" : "▶ START"} color={status.active ? "#ff4757" : "#2ed573"} loading={executing === "Start"} onClick={() => execute(status.active ? "stop" : "start", status.active ? {} : { batch_size: 3 }, status.active ? "Stop" : "Start")} />
          <Btn label="A/B" color="#ffa502" loading={executing === "A/B"} onClick={async () => { setExecuting("A/B"); try { await fetch(`${API}/api/spammer/ab-report`); } catch {} setTimeout(() => setExecuting(null), 1500); }} />
        </div>
        {campaign.id && (
          <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(0,212,255,0.06)", borderRadius: 6, border: "1px solid rgba(0,212,255,0.1)", display: "flex", gap: 12 }}>
            <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Active: </span>
            <span style={{ color: "#00d4ff", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{campaign.name || campaign.id}</span>
            <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{campaign.tone}</span>
            <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Q: {status.queue_size || 0}</span>
          </div>
        )}
      </div>

      {/* ── Activity Log ── */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Send Activity ({activity.length})</h3>
        <div style={{ maxHeight: 180, overflowY: "auto" }}>
          {activity.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "#333", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>No sends yet.</div>
          )}
          {activity.map((item: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: item.success ? "#2ed573" : "#ff4757", fontSize: 7, width: 12 }}>{item.success ? "✓" : "✗"}</span>
              <span style={{ color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.email}</span>
              <span style={{ color: "#555", fontSize: 7 }}>{item.smtp?.slice(0, 20)}</span>
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

function MiniStat({ label, value, sub, color }: { label: string; value: any; sub?: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "6px 4px" }}>
      <div style={{ color, fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 8, color: "#444", textTransform: "uppercase", letterSpacing: 0.4, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      {sub && <div style={{ fontSize: 7, color: "#333", fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function Btn({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      style={{ ...styles.btn, borderColor: `${color}30`, opacity: loading ? 0.5 : 1 }}
      onClick={onClick} disabled={loading}>
      {loading ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 10 }}>◌</motion.span> : null}
      <span style={{ color, fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
    </motion.button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  pipelineCard: {
    background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12,
    border: "1px solid rgba(0,212,255,0.1)", padding: "10px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)",
  },
  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 2,
    background: "rgba(12,14,28,0.6)", borderRadius: 10, padding: "2px 8px",
    border: "1px solid rgba(0,212,255,0.06)",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  card: {
    background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12,
    border: "1px solid rgba(0,212,255,0.1)", padding: "12px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)",
  },
  sectionTitle: { margin: 0, color: "#00d4ff", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  dot: { fontSize: 8, color: "#2ed573" },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  campaignInput: {
    padding: "7px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none", flex: 1,
  },
  smallSelect: {
    padding: "7px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none",
  },
  btn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    padding: "7px 10px", background: "rgba(6,6,14,0.5)", border: "1px solid",
    borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s",
  },
};

export default SpammerPanel;
