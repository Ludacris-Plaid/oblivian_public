import React, { useState, useEffect } from "react";
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
  credential: "\uD83D\uDD11", browser: "\uD83D\uDD11", keyring: "\uD83D\uDD12",
  autofill: "\u270F\uFE0F", clipboard: "\uD83D\uDCCB",
  ssh: "\uD83D\uDD10", ssh_agent: "\uD83D\uDD10", git: "\uD83C\uDF10",
  system_info: "\uD83D\uDCBB", harvest: "\uD83D\uDD0D",
  heartbeat: "\uD83D\uDCE1", evasion: "\uD83C\uDFAD",
  log_threat: "\u26A0\uFE0F", ai_decision: "\uD83E\uDD16", command: "\u2699\uFE0F",
  ddos: "\uD83C\uDF0A", command_result: "\u2705",
  ransomware: "\uD83D\uDD12", keylogger: "\u2328\uFE0F", proxy: "\uD83D\uDD17",
  exfil: "\uD83D\uDCE4", tor: "\uD83E\uDDE0", tool_exec: "\uD83D\uDEE0\uFE0F",
  memory_burn: "\uD83D\uDD25", pdf_infect: "\uD83D\uDCC4", kill_switch: "\uD83D\uDC80",
  spammer: "\uD83D\uDCE7", operator_command: "\uD83D\uDDE3\uFE0F",
};

const COLORS: Record<string, string> = {
  credential: "#00ff88", browser: "#00ff88", keyring: "#00d4ff",
  autofill: "#ffd700", clipboard: "#a855f7", ssh: "#ff4757",
  ssh_agent: "#ff4757", git: "#8b5cf6", system_info: "#00ff88",
  harvest: "#00ff88", heartbeat: "#00ff88",
  log_threat: "#ff4757", ai_decision: "#00d4ff",
  command: "#a855f7", ddos: "#a855f7", command_result: "#00ff88",
  ransomware: "#ff4757", keylogger: "#00ff88", proxy: "#00d4ff",
  exfil: "#ffd700", tor: "#a855f7", tool_exec: "#00ff88",
  memory_burn: "#ff4757", pdf_infect: "#ff8c00", kill_switch: "#ff4757",
  spammer: "#2ed573", operator_command: "#ff6ec7",
};

const BGS: Record<string, string> = {
  credential: "rgba(0,255,136,0.06)", browser: "rgba(0,255,136,0.06)",
  keyring: "rgba(0,212,255,0.06)", autofill: "rgba(255,215,0,0.06)",
  clipboard: "rgba(168,85,247,0.06)", ssh: "rgba(255,71,87,0.06)",
  ssh_agent: "rgba(255,71,87,0.06)", git: "rgba(139,92,246,0.06)",
  system_info: "rgba(0,255,136,0.06)", harvest: "rgba(0,255,136,0.06)",
  heartbeat: "rgba(0,255,136,0.06)",
  log_threat: "rgba(255,71,87,0.12)", ai_decision: "rgba(0,212,255,0.12)",
  command: "rgba(168,85,247,0.08)", ddos: "rgba(168,85,247,0.08)",
  ransomware: "rgba(255,71,87,0.08)", keylogger: "rgba(0,255,136,0.06)",
  proxy: "rgba(0,212,255,0.06)", exfil: "rgba(255,215,0,0.06)",
  tor: "rgba(168,85,247,0.06)", tool_exec: "rgba(0,255,136,0.06)",
  memory_burn: "rgba(255,71,87,0.12)", pdf_infect: "rgba(255,140,0,0.08)",
  kill_switch: "rgba(255,71,87,0.12)", spammer: "rgba(46,213,115,0.08)",
  operator_command: "rgba(255,110,199,0.08)",
};

// Noise types: filtered out unless they carry real substance
const NOISE_TYPES = new Set([
  "evasion", "mutation", "command",
]);

function hasSubstance(ev: Event): boolean {
  if (!NOISE_TYPES.has(ev.type)) return true;
  const p = ev.payload || {};
  // Keep mutation events that were triggered by user action (not auto)
  if (ev.type === "mutation" && p.action && !String(p.action).includes("Auto-escalation") && !String(p.action).includes("stepping down")) return true;
  // Keep evasion events with actual detected methods
  if (ev.type === "evasion" && p.methods && String(p.methods).length > 10) return true;
  // Keep explicit user/operator commands
  if (ev.type === "command" && p.action && String(p.action).length > 3) return true;
  return false;
}

function describeEvent(ev: Event): { title: string; detail: string } {
  const p = ev.payload || {};
  const t = ev.type;
  const d = (k: string) => String(p[k] || "");
  const node = d("node_id");
  const detail = d("detail");
  const action = d("action");

  if (t === "credential" || t === "browser")
    return { title: "Browser credential harvested", detail: `From ${d("site")} — ${d("email") || d("username") || ""}${node ? ` via ${node}` : ""}` };
  if (t === "keyring")
    return { title: "Keyring credential extracted", detail: `${d("site") || "system keychain"}${node ? ` on ${node}` : ""}` };
  if (t === "autofill")
    return { title: "Autofill data captured", detail: `${d("site") || "form data"}${node ? ` from ${node}` : ""}` };
  if (t === "clipboard")
    return { title: "Clipboard contents captured", detail: `${detail || "Text and file names copied"}${node ? ` on ${node}` : ""}` };
  if (t === "ssh" || t === "ssh_agent")
    return { title: "SSH key harvested", detail: `${d("site") || "private key"}${node ? ` from ${node}` : ""}` };
  if (t === "git")
    return { title: "Git credential extracted", detail: `${d("site") || "repository credentials"}${node ? ` on ${node}` : ""}` };
  if (t === "system_info")
    return { title: "System reconnaissance completed", detail: `${d("hostname") || d("os") || "Unknown host"}${node ? ` (${node})` : ""} — hardware and network info collected` };
  if (t === "harvest")
    return { title: "Data harvest completed", detail: `${d("type") || "Unknown data"} harvested${node ? ` from ${node}` : ""}` };
  if (t === "heartbeat")
    return { title: "Node heartbeat received", detail: `${node} checked in — ${d("status") || "active"}` };
  if (t === "evasion")
    return { title: "Evasion posture updated", detail: `Score: ${d("score")}${d("methods") ? ` · Methods: ${d("methods")}` : ""}${node ? ` · Node: ${node}` : ""}` };
  if (t === "mutation")
    return { title: "Mutation strategy applied", detail: `Mode: ${d("mode") || d("strategy") || "auto"}${detail ? ` — ${detail}` : ""} · Applied to all active nodes` };
  if (t === "log_threat")
    return { title: "Security threat detected", detail: `${d("signature") || "Unknown signature"}${d("severity") ? ` · Severity: ${d("severity")}` : ""}${node ? ` · Node: ${node}` : ""}` };
  if (t === "ai_decision")
    return { title: "AI brain made a decision", detail: `${action}${detail ? ` — ${detail}` : ""}` };
  if (t === "command")
    return { title: "Command issued to node", detail: `${action || "unknown"}${node ? ` → ${node}` : ""}${detail ? ` · ${detail}` : ""}` };
  if (t === "ddos")
    return { title: "DDoS attack launched", detail: `${action || "attack"}${d("target") ? ` on ${d("target")}` : ""}${d("type") ? ` · ${d("type")}` : ""}${d("nodes") ? ` · ${d("nodes")} nodes` : ""}` };
  if (t === "ransomware")
    return { title: "Ransomware operation", detail: `${action || "deployed"}${node ? ` on ${node}` : ""}${detail ? ` — ${detail}` : ""}` };
  if (t === "keylogger")
    return { title: "Keylogger operation", detail: `${action || "deployed"}${node ? ` on ${node}` : ""} · Capturing keystrokes, screenshots, and clipboard` };
  if (t === "proxy")
    return { title: "Proxy chain operation", detail: `${action || "routing"}${node ? ` via ${node}` : ""}${detail ? ` — ${detail}` : ""}` };
  if (t === "exfil")
    return { title: "Data exfiltration", detail: `${action || "transfer"}${node ? ` from ${node}` : ""}${detail ? ` — ${detail}` : ""}` };
  if (t === "tor")
    return { title: "TOR circuit operation", detail: `${action || "routing"}${node ? ` through ${node}` : ""}${detail ? ` — ${detail}` : ""}` };
  if (t === "tool_exec")
    return { title: "Tool execution completed", detail: `${d("tool") || "unknown tool"}${d("status") ? ` · Status: ${d("status")}` : ""}${d("target") ? ` · Target: ${d("target")}` : ""}` };
  if (t === "memory_burn")
    return { title: "Memory burned", detail: "All Turso memory tables wiped — decisions, conversations, and state cleared" };
  if (t === "pdf_infect")
    return { title: "PDF infection deployed", detail: `${d("filename") || "file"} injected with C2 beacon payload` };
  if (t === "kill_switch")
    return { title: "Kill switch activated", detail: "Full system nuke — Redis flushed, memory burned, all nodes disconnected" };
  if (t === "spammer")
    return { title: "Spam campaign event", detail: `${action || "activity"}${detail ? ` — ${detail}` : ""}${d("name") ? ` · Campaign: ${d("name")}` : ""}${d("count") != null ? ` · ${d("count")} entries` : ""}` };
  if (t === "operator_command")
    return { title: "Operator command executed", detail: `${detail || action || "command issued"}` };
  return { title: t, detail: detail || action || "" };
}

function fmtTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return ts; }
}

const ActivityLog: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`${API}/api/events`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        const list: Event[] = (data.events || []).filter(hasSubstance);
        if (alive) { setEvents(list); setError(null); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "fetch failed");
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const visible = events.slice(-8).reverse();

  return (
    <motion.div
      style={styles.container}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={{ fontSize: 8, color: "#00d4ff", animation: "pulse 2s infinite" }}>{'\u25CF'}</span>
          Live Activity Feed
        </h3>
        <span style={styles.badge}>
          {error ? (
            <span style={{ color: "#ff4757" }}>offline</span>
          ) : (
            <><GlitchNumber value={events.length} color="#00ff88" fontSize={13} fontWeight={700} /> events</>
          )}
        </span>
      </div>

      <div style={styles.logContainer}>
        {visible.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDD0D'}</span>
            <span>{error ? `Connection error: ${error}` : "Waiting for activity..."}</span>
          </div>
        ) : (
          visible.map((ev, i) => {
            const color = COLORS[ev.type] || "#e0e0e0";
            const info = describeEvent(ev);
            return (
              <motion.div
                key={`${ev.timestamp}-${ev.type}-${i}`}
                style={{ ...styles.entry, background: BGS[ev.type] || "rgba(255,255,255,0.03)" }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <span style={styles.icon}>{ICONS[ev.type] || "\uD83D\uDCE1"}</span>
                <div style={styles.body}>
                  <div style={styles.titleRow}>
                    <span style={styles.time}>{fmtTime(ev.timestamp)}</span>
                    <span style={{ ...styles.eventTitle, color }}>{info.title}</span>
                    <span style={{ ...styles.typeTag, color, borderColor: `${color}33` }}>{ev.type}</span>
                  </div>
                  {info.detail && (
                    <div style={styles.detailRow}>
                      {info.detail}
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
    textShadow: "0 0 8px rgba(0, 212, 255, 0.3)",
    animation: "textGlowPulse 3s ease-in-out infinite",
  },
  badge: {
    fontSize: 12, color: "#00ff88", background: "rgba(0,255,136,0.1)",
    padding: "4px 12px", borderRadius: 10, fontFamily: "'JetBrains Mono', monospace",
  },
  logContainer: { padding: "8px 12px", maxHeight: 360, overflowY: "auto" },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: 100, color: "#444", fontSize: 13,
  },
  entry: {
    display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.03)", marginBottom: 4,
  },
  icon: { fontSize: 16, flexShrink: 0, marginTop: 1, lineHeight: 1 },
  body: { flex: 1, minWidth: 0 },
  titleRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  time: {
    fontSize: 10, color: "#555", fontFamily: "'JetBrains Mono', monospace",
    minWidth: 65, flexShrink: 0,
  },
  eventTitle: { fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3 },
  typeTag: {
    fontSize: 8, padding: "1px 6px", borderRadius: 4, border: "1px solid",
    fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" as const,
    letterSpacing: 0.5, flexShrink: 0, marginLeft: "auto",
  },
  detailRow: {
    fontSize: 11, color: "#999", fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.6, paddingLeft: 0, wordBreak: "break-word",
  },
};

export default ActivityLog;
