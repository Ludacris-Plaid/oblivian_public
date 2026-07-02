import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";

const API = "http://localhost:8000";

const MemoryPanel: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({ preferences: {} });
  const [attackSuccess, setAttackSuccess] = useState<any>({});
  const [sessionAge, setSessionAge] = useState<string>("loading...");

  useEffect(() => {
    fetch(`${API}/api/memory/analytics`)
      .then(r => r.json())
      .then(d => setAnalytics(d))
      .catch(() => {});

    fetch(`${API}/api/memory/profile`)
      .then(r => r.json())
      .then(d => setProfile(d))
      .catch(() => {});

    fetch(`${API}/api/memory/attack-stats`)
      .then(r => r.json())
      .then(d => setAttackSuccess(d))
      .catch(() => {});

    const updateAge = () => {
      fetch(`${API}/api/memory/session-age`)
        .then(r => r.json())
        .then(d => setSessionAge(d.elapsed_str || 'unknown'))
        .catch(() => {});
    };
    updateAge();
    const ageId = setInterval(updateAge, 5000);
    return () => clearInterval(ageId);
  }, []);

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const r = await fetch(`${API}/api/memory/search?q=${encodeURIComponent(searchQuery)}`);
      const d = await r.json();
      setSearchResults(d.results || []);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>System Memory & Analytics</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <motion.div style={{ ...styles.badge, background: "rgba(0,212,255,0.12)", color: "#00d4ff", borderColor: "rgba(0,212,255,0.3)" }}
              animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              TURSO CLOUD
            </motion.div>
          </div>
        </div>
        <div style={styles.statsGrid}>
          <S label="Decisions" value={<GlitchNumber value={analytics?.total_decisions || 0} color="#00d4ff" fontSize={28} fontWeight={700} />} sub="total" color="#00d4ff" />
          <S label="Conversations" value={<GlitchNumber value={analytics?.total_conversations || 0} color="#00ff88" fontSize={28} fontWeight={700} />} sub="logged" color="#00ff88" />
          <S label="Attack Success" value={`${attackSuccess.success_rate_pct || 100}%`} sub="rate" color="#ffd700" />
          <S label="Mutations" value={<GlitchNumber value={attackSuccess.total_attacks || 0} color="#a855f7" fontSize={28} fontWeight={700} />} sub="executed" color="#a855f7" />
          <S label="Profile" value={profile.username || "dysthemix"} sub="operator" color="#ff6ec7" />
          <S label="Session Age" value={sessionAge} sub="persistent" color="#ff4757" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Attack Type Distribution</h3>
          <div style={styles.barList}>
            {analytics?.attack_types && Object.entries(analytics.attack_types).map(([k, v]: any) => {
              const max = Math.max(...(Object.values(analytics.attack_types) as number[]), 1);
              const pct = max > 0 ? (v / max) * 100 : 0;
              return (
                <div key={k} style={styles.barRow}>
                  <span style={{ color: "#00d4ff", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 120 }}>{k}</span>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden", margin: "0 8px" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} style={{ height: "100%", background: "linear-gradient(90deg, #00d4ff, #00ff88)", borderRadius: 4 }} />
                  </div>
                  <span style={{ color: "#00ff88", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 30, textAlign: "right" }}>{v}</span>
                </div>
              );
            })}
            {(!analytics?.attack_types || Object.keys(analytics.attack_types).length === 0) && (
              <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No attack data yet</p>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Mutation Mode Usage</h3>
          <div style={styles.barList}>
            {analytics?.mutation_modes && Object.entries(analytics.mutation_modes).map(([k, v]: any) => {
              const max = Math.max(...(Object.values(analytics.mutation_modes) as number[]), 1);
              const pct = max > 0 ? (v / max) * 100 : 0;
              return (
                <div key={k} style={styles.barRow}>
                  <span style={{ color: "#a855f7", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 120 }}>{k}</span>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden", margin: "0 8px" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} style={{ height: "100%", background: "linear-gradient(90deg, #a855f7, #ff6ec7)", borderRadius: 4 }} />
                  </div>
                  <span style={{ color: "#ff6ec7", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 30, textAlign: "right" }}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Conversation Search</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input style={styles.input} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Search conversations..." />
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ padding: "8px 18px", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, color: "#00d4ff", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}
            onClick={doSearch}>SEARCH</motion.button>
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          {(searchResults.length > 0 ? searchResults : (analytics?.recent_conversations || [])).slice(0, 20).map((c: any, i: number) => (
            <div key={i} style={styles.convRow}>
              <span style={{ color: c.role === "ai" ? "#ff6ec7" : "#00d4ff", fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textTransform: "uppercase" }}>{c.role}</span>
              <span style={{ color: "#aaa", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.content?.slice(0, 200)}</span>
              <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 70, textAlign: "right" }}>{c.timestamp?.slice(11, 19)}</span>
            </div>
          ))}
          {(!analytics?.recent_conversations || analytics.recent_conversations.length === 0) && (
            <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No conversations yet — chat with Chatz to log them</p>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Recent Decisions</h3>
          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
            {(analytics?.recent_decisions || []).map((d: any, i: number) => (
              <div key={i} style={styles.decRow}>
                <span style={{ color: "#a855f7", fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 100 }}>{d.type}</span>
                <span style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.detail?.slice(0, 120)}</span>
                <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 70, textAlign: "right" }}>{d.timestamp?.slice(11, 19)}</span>
              </div>
            ))}
            {(!analytics?.recent_decisions || analytics.recent_decisions.length === 0) && (
              <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No decisions recorded yet</p>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />Attack Success Tracking</h3>
          <div style={styles.barList}>
            {attackSuccess.by_type && Object.entries(attackSuccess.by_type).map(([k, v]: any) => (
              <div key={k} style={styles.barRow}>
                <span style={{ color: "#00d4ff", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 100 }}>{k}</span>
                <span style={{ color: "#ffd700", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 50 }}>{v.successes}/{v.total}</span>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.03)", borderRadius: 4, overflow: "hidden", margin: "0 8px" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${v.success_pct}%` }} transition={{ duration: 0.6 }} style={{ height: "100%", background: v.success_pct > 80 ? "#00ff88" : v.success_pct > 50 ? "#ffd700" : "#ff4757", borderRadius: 4 }} />
                </div>
                <span style={{ color: v.success_pct > 80 ? "#00ff88" : v.success_pct > 50 ? "#ffd700" : "#ff4757", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", minWidth: 45, textAlign: "right" }}>{v.success_pct}%</span>
              </div>
            ))}
            {(!attackSuccess.by_type || Object.keys(attackSuccess.by_type).length === 0) && (
              <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No attack stats yet — execute some commands</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function S({ label, value, sub, color }: any) { return (<div style={{ textAlign: "center", padding: "6px 4px" }}><div style={{ color, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div><div style={{ color: "#aaa", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div><div style={{ color: "#444", fontSize: 8, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div></div>); }

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#00d4ff", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#00d4ff", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 },
  barList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" },
  barRow: { display: "flex", alignItems: "center", gap: 6, padding: "4px 0" },
  input: { flex: 1, padding: "10px 14px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none" },
  pinInput: { width: 60, padding: "6px 10px", background: "rgba(6,6,14,0.8)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, color: "#ff4757", fontFamily: "'JetBrains Mono', monospace", fontSize: 16, outline: "none", textAlign: "center", letterSpacing: "4px" },
  convRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6 },
  decRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6 },
};

export default MemoryPanel;
