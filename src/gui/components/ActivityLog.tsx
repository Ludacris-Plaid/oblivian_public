import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import { API_URL } from "../config";

interface Event {
  timestamp: string;
  type: string;
  payload?: Record<string, unknown>;
}

const API = API_URL;
const POLL_MS = 2000;

const ICONS: Record<string, string> = {
  credential: "\u{1F511}", browser: "\u{1F511}", keyring: "\u{1F512}",
  autofill: "\u{270F}\u{FE0F}", clipboard: "\u{1F4CB}",
  ssh: "\u{1F510}", ssh_agent: "\u{1F510}", git: "\u{1F310}",
  system_info: "\u{1F4BB}", harvest: "\u{1F50D}",
  heartbeat: "\u{1F4E1}", evasion: "\u{1F3AD}", mutation: "\u{1F3AD}",
  log_threat: "\u{26A0}\u{FE0F}", ai_decision: "\u{1F916}", command: "\u{2699}\u{FE0F}",
  ddos: "\u{1F30A}", command_result: "\u{2705}",
  ransomware: "\u{1F512}", keylogger: "\u{2328}\u{FE0F}", proxy: "\u{1F517}",
  exfil: "\u{1F4E4}", tor: "\u{1F9E0}", tool_exec: "\u{1F6E0}\u{FE0F}",
  memory_burn: "\u{1F525}", pdf_infect: "\u{1F4C4}", kill_switch: "\u{1F480}",
};

const COLORS: Record<string, string> = {
  credential: "#00ff88", browser: "#00ff88", keyring: "#00d4ff",
  autofill: "#ffd700", clipboard: "#a855f7", ssh: "#ff4757",
  ssh_agent: "#ff4757", git: "#8b5cf6", system_info: "#00ff88",
  harvest: "#00ff88", heartbeat: "#00ff88", evasion: "#ffd700",
  mutation: "#ffd700", log_threat: "#ff4757", ai_decision: "#00d4ff",
  command: "#a855f7", ddos: "#a855f7", command_result: "#00ff88",
  ransomware: "#ff4757", keylogger: "#00ff88", proxy: "#00d4ff",
  exfil: "#ffd700", tor: "#a855f7", tool_exec: "#00ff88",
  memory_burn: "#ff4757", pdf_infect: "#ff8c00", kill_switch: "#ff4757",
};

const BGS: Record<string, string> = {
  credential: "rgba(0,255,136,0.08)", browser: "rgba(0,255,136,0.08)",
  keyring: "rgba(0,212,255,0.08)", autofill: "rgba(255,215,0,0.08)",
  clipboard: "rgba(168,85,247,0.08)", ssh: "rgba(255,71,87,0.08)",
  ssh_agent: "rgba(255,71,87,0.08)", git: "rgba(139,92,246,0.08)",
  system_info: "rgba(0,255,136,0.08)", harvest: "rgba(0,255,136,0.08)",
  heartbeat: "rgba(0,255,136,0.08)", evasion: "rgba(255,215,0,0.08)",
  mutation: "rgba(255,215,0,0.12)", log_threat: "rgba(255,71,87,0.12)",
  ai_decision: "rgba(0,212,255,0.12)", command: "rgba(168,85,247,0.08)",
};

function label(ev: Event): string {
  const t = ev.type;
  const p = ev.payload || {};
  if (t === "credential" || t === "browser") return `Browser Credential \u2014 ${String(p.site || "unknown")}`;
  if (t === "keyring") return `Keyring \u2014 ${String(p.site || "system")}`;
  if (t === "autofill") return `Autofill \u2014 ${String(p.site || "data")}`;
  if (t === "clipboard") return "Clipboard Captured";
  if (t === "ssh") return `SSH Key \u2014 ${String(p.site || "key")}`;
  if (t === "ssh_agent") return "SSH Agent Key";
  if (t === "git") return `Git Creds \u2014 ${String(p.site || "repo")}`;
  if (t === "system_info") return `System Recon \u2014 ${String(p.hostname || p.os || "")}`;
  if (t === "harvest") return `${String(p.type || "Data")} Harvested`;
  if (t === "heartbeat") return `Heartbeat \u2014 ${String(p.node_id || "")}`;
  if (t === "evasion") return `Evasion \u2014 score ${String(p.score || "?")}`;
  if (t === "mutation") return `Mutation \u2014 ${String(p.mode || p.strategy || "auto")}`;
  if (t === "log_threat") return `Threat \u2014 ${String(p.signature || "unknown")}`;
  if (t === "ai_decision") return `AI \u2014 ${String(p.action || "analysis")}`;
  if (t === "command") return `Command \u2014 ${String(p.action || "")}`;
  return t;
}

function fmtTime(ts: string): string {
  try { return new Date(ts).toLocaleTimeString(); } catch { return ts; }
}

const ActivityLog: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const res = await fetch(`${API}/api/events`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        const list: Event[] = data.events || [];

        if (alive) {
          setEvents(list);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "fetch failed");
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={styles.header}>
        <h3 style={styles.title}><span style={{ fontSize: 8, color: '#00d4ff', animation: 'pulse 2s infinite' }}>&#9679;</span> Live Activity Feed</h3>
        <span style={styles.badge}>
          {error ? <span style={{ color: "#ff4757" }}>offline</span> : <><GlitchNumber value={events.length} color="#00ff88" fontSize={11} fontWeight={600} /> events</>}
        </span>
      </div>

      <div style={styles.logContainer}>
        {events.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: 24, marginBottom: 8 }}>&#128269;</span>
            <span>{error ? `Connection error: ${error}` : "Monitoring for activity..."}</span>
          </div>
        ) : (
          events.slice(-12).reverse().map((ev, i) => {
            const color = COLORS[ev.type] || "#e0e0e0";
            return (
              <motion.div
                key={`${ev.timestamp}-${ev.type}-${i}`}
                style={{ ...styles.entry, background: BGS[ev.type] || "rgba(255,255,255,0.03)" }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
              >
                <span style={styles.icon}>{ICONS[ev.type] || "\u{1F4E1}"}</span>
                <div style={styles.body}>
                  <div style={styles.row}>
                    <span style={styles.time}>{fmtTime(ev.timestamp)}</span>
                    <span style={{ ...styles.label, color }}>{label(ev)}</span>
                  </div>
                  {ev.payload?.node_id && (
                    <div style={styles.row}>
                      <span style={styles.sub}>node</span>
                      <span style={styles.val}>{String(ev.payload.node_id)}</span>
                    </div>
                  )}
                  {ev.payload?.detail && (
                    <div style={styles.row}>
                      <span style={styles.sub}>detail</span>
                      <span style={styles.val}>{String(ev.payload.detail).slice(0, 80)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative", zIndex: 10, margin: "0 20px 6px",
    background: "rgba(12,14,28,0.8)", borderRadius: 16,
    border: "1px solid rgba(0,255,136,0.12)", overflow: "hidden",
  },
  header: {
    padding: "14px 20px", borderBottom: "1px solid rgba(0,255,136,0.1)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  title: {
    margin: 0, fontSize: 14, fontWeight: 600, color: "#00d4ff",
    fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
    textShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    animation: 'textGlowPulse 3s ease-in-out infinite',
  },
  badge: {
    fontSize: 11, color: "#00ff88", background: "rgba(0,255,136,0.1)",
    padding: "3px 10px", borderRadius: 10, fontFamily: "'JetBrains Mono', monospace",
  },
  logContainer: { padding: "10px 12px", maxHeight: 300, overflowY: "auto" },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: 100, color: "#444", fontSize: 12,
  },
  entry: {
    display: "flex", gap: 10, padding: "7px 10px", borderRadius: 7,
    border: "1px solid rgba(255,255,255,0.03)", marginBottom: 4,
  },
  icon: { fontSize: 13, flexShrink: 0, marginTop: 1 },
  body: { flex: 1, minWidth: 0 },
  row: { display: "flex", gap: 6, marginBottom: 1, alignItems: "center" },
  time: {
    fontSize: 9, color: "#444", fontFamily: "'JetBrains Mono', monospace",
    minWidth: 55, flexShrink: 0,
  },
  label: { fontSize: 11, fontWeight: 600 },
  sub: {
    fontSize: 8, color: "#444", fontFamily: "'JetBrains Mono', monospace",
    textTransform: "uppercase" as const, letterSpacing: 0.5,
  },
  val: {
    fontSize: 10, color: "#888", fontFamily: "'JetBrains Mono', monospace",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
    maxWidth: 200,
  },
};

export default ActivityLog;
