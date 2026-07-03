import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SmtpCred {
  host: string;
  port: number;
  username: string;
  password: string;
  status: string;
  sent_count: number;
  fail_count: number;
  consecutive_failures: number;
  warmed_up: boolean;
  warmup_day: number;
  last_error?: string;
  auth_valid: boolean;
  daily_capacity: number;
  quarantined_at?: string;
}

interface SmtpManagerProps {
  pool: SmtpCred[];
  onAdd: (cred: Omit<SmtpCred, "sent_count" | "fail_count" | "consecutive_failures" | "warmed_up" | "warmup_day" | "auth_valid">) => void;
  onRemove: (host: string) => void;
  onUpdate: (host: string, field: string, value: any) => void;
  onUnquarantine: (host: string) => void;
  onValidate: (host: string) => void;
}

const SmtpManager: React.FC<SmtpManagerProps> = ({ pool, onAdd, onRemove, onUpdate, onUnquarantine, onValidate }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newHost, setNewHost] = useState("");
  const [newPort, setNewPort] = useState(587);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newCap, setNewCap] = useState(1000);
  const [editHost, setEditHost] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newHost || !newUser) return;
    onAdd({
      host: newHost,
      port: newPort,
      username: newUser,
      password: newPass,
      status: "healthy",
      daily_capacity: newCap,
    });
    setNewHost(""); setNewPort(587); setNewUser(""); setNewPass(""); setNewCap(1000); setShowAdd(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "healthy": return "#2ed573";
      case "warming": return "#ffa502";
      case "suspicious": return "#ffa502";
      case "quarantined": return "#ff4757";
      case "dead": return "#ff4757";
      default: return "#555";
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.title}><span style={styles.dot} />SMTP Pool</h3>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={styles.addBtn} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "✕ Cancel" : "+ Add Server"}
        </motion.button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={styles.addForm}>
              <input style={styles.smallInput} placeholder="Host (smtp.example.com)" value={newHost} onChange={(e) => setNewHost(e.target.value)} />
              <div style={{ display: "flex", gap: 4 }}>
                <input style={{ ...styles.smallInput, width: 70 }} type="number" placeholder="Port" value={newPort} onChange={(e) => setNewPort(+e.target.value)} />
                <input style={{ ...styles.smallInput, width: 80 }} type="number" placeholder="Cap/day" value={newCap} onChange={(e) => setNewCap(+e.target.value)} />
              </div>
              <input style={styles.smallInput} placeholder="Username" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
              <input style={styles.smallInput} placeholder="Password" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={styles.saveBtn} onClick={handleAdd}>Add</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={styles.poolStats}>
        <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
          {pool.length} servers — {pool.filter(p => p.status === "healthy").length} healthy, {pool.filter(p => p.status === "warming").length} warming, {pool.filter(p => p.status === "quarantined").length} quarantined
        </span>
      </div>

      <div style={styles.list}>
        {pool.map((cred, i) => {
          const isEditing = editHost === cred.host;
          const sc = statusColor(cred.status);
          return (
            <motion.div key={cred.host + i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} style={styles.serverRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                <motion.span animate={{ opacity: cred.status === "healthy" ? [1, 0.3, 1] : [0.5] }} transition={{ duration: 1, repeat: Infinity }} style={{ color: sc, fontSize: 6 }}>●</motion.span>
                {isEditing ? (
                  <input style={{ ...styles.smallInput, flex: 1, fontSize: 9 }} value={cred.host} onChange={(e) => onUpdate(cred.host, "host", e.target.value)} onBlur={() => setEditHost(null)} autoFocus />
                ) : (
                  <span style={{ color: "#ccc", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${cred.host}:${cred.port}`}>
                    {cred.host}:{cred.port}
                  </span>
                )}
                <span style={{ color: sc, fontSize: 8, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{cred.status}</span>
                {cred.warmup_day > 0 && cred.warmup_day < 7 && (
                  <span style={{ color: "#ffa502", fontSize: 7, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>D{cred.warmup_day}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <span style={{ color: "#555", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{cred.sent_count}s</span>
                <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", margin: "0 2px" }}>|</span>
                <span style={{ color: "#555", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{cred.fail_count}f</span>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={styles.iconBtn} title="Edit" onClick={() => setEditHost(isEditing ? null : cred.host)}>✏️</motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={styles.iconBtn} title="Validate SPF/DKIM/DMARC" onClick={() => onValidate(cred.host)}>🔐</motion.button>
                {cred.status === "quarantined" && (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={{ ...styles.iconBtn, color: "#ffa502" }} title="Unquarantine" onClick={() => onUnquarantine(cred.host)}>🔓</motion.button>
                )}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={{ ...styles.iconBtn, color: "#ff4757" }} title="Remove" onClick={() => onRemove(cred.host)}>🗑</motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, color: "#00d4ff", fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  dot: { fontSize: 8, color: "#2ed573" },
  addBtn: {
    padding: "4px 12px", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 6, color: "#00d4ff", cursor: "pointer", outline: "none",
  },
  addForm: { display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" },
  smallInput: {
    padding: "6px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none",
  },
  saveBtn: {
    padding: "6px 14px", background: "rgba(46,213,115,0.1)", border: "1px solid rgba(46,213,115,0.2)",
    borderRadius: 6, color: "#2ed573", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", outline: "none",
  },
  poolStats: { padding: "4px 0" },
  list: { display: "flex", flexDirection: "column", gap: 3, maxHeight: 360, overflowY: "auto" },
  serverRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    padding: "7px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.03)",
  },
  iconBtn: {
    padding: "2px 4px", background: "transparent", border: "none",
    fontSize: 10, cursor: "pointer", outline: "none", color: "#888",
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default SmtpManager;
