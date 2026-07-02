import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from "../config";

interface MutationEntry {
  timestamp: string;
  action: string;
  detail: string;
  node_id?: string;
  mode?: string;
  threats?: number;
  score?: number;
}

const MODE_COLORS: Record<string, string> = {
  passive: '#00ff88',
  moderate: '#00d4ff',
  aggressive: '#ffd700',
  ghost: '#a855f7',
  polymorphic: '#ff6ec7',
};

export default function MutationTimeline() {
  const [entries, setEntries] = useState<MutationEntry[]>([]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(API_URL + '/api/events');
        const data = await res.json();
        const events = data.events || [];
        const mutations = events
          .filter((e: any) => {
            const p = e.payload || {};
            return e.type === 'ai_decision' &&
              (String(p.action || '').includes('threat') ||
               String(p.action || '').includes('mutate') ||
               String(p.action || '').includes('mutation') ||
               String(p.detail || '').includes('mode') ||
               String(p.detail || '').includes('threat'));
          })
          .map((e: any) => {
            const p = e.payload || {};
            const detail = String(p.detail || '');
            let mode = '';
            for (const m of Object.keys(MODE_COLORS)) {
              if (detail.includes(m)) { mode = m; break; }
            }
            return {
              timestamp: e.timestamp,
              action: String(p.action || ''),
              detail: detail,
              node_id: p.node_id ? String(p.node_id) : undefined,
              mode: mode || undefined,
              threats: p.threats ? Number(p.threats) : undefined,
              score: p.score ? Number(p.score) : undefined,
            } as MutationEntry;
          })
          .slice(-12);
        if (alive) setEntries(mutations);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}><span style={{ fontSize: 8, color: '#00d4ff', animation: 'pulse 2s infinite' }}>&#9679;</span> AI Mutation Timeline</h3>
        <span style={styles.badge}>{entries.length} events</span>
      </div>
      <div style={styles.timeline}>
        {entries.length === 0 ? (
          <p style={styles.empty}>No mutation activity yet. Toggle simulation or connect a beacon.</p>
        ) : (
          entries.reverse().map((entry, i) => {
            const color = entry.mode ? MODE_COLORS[entry.mode] : '#00ff88';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={styles.entry}
              >
                <div style={{ ...styles.dot, backgroundColor: color, boxShadow: `0 0 8px ${color}66` }} />
                <div style={styles.content}>
                  <div style={styles.entryTime}>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '--:--'}
                  </div>
                  <div style={styles.entryDetail}>
                    {entry.mode && (
                      <span style={{ ...styles.modeTag, backgroundColor: `${color}22`, color, border: `1px solid ${color}33` }}>
                        {entry.mode.toUpperCase()}
                      </span>
                    )}
                    {entry.threats !== undefined && (
                      <span style={styles.threatTag}>{entry.threats} threats</span>
                    )}
                    {entry.node_id && (
                      <span style={styles.nodeTag}>{entry.node_id.slice(0, 18)}</span>
                    )}
                  </div>
                  <div style={styles.entryMsg}>{entry.detail.slice(0, 100)}</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(168, 85, 247, 0.1)',
    padding: '14px 16px',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, paddingBottom: 8,
    borderBottom: '1px solid rgba(168, 85, 247, 0.06)',
  },
  title: {
    margin: 0, fontSize: 14, fontWeight: 600,     color: '#00d4ff',
    fontFamily: "'JetBrains Mono', monospace",
    textShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    animation: 'textGlowPulse 3s ease-in-out infinite',
  },
  badge: {
    fontSize: 10, color: '#00d4ff', background: 'rgba(0, 212, 255, 0.1)',
    padding: '2px 8px', borderRadius: 8, fontFamily: "'JetBrains Mono', monospace",
  },
  timeline: {
    display: 'flex', flexDirection: 'column', gap: 6,
    maxHeight: 300, overflowY: 'auto' as const,
  },
  empty: { color: '#444', fontSize: 12, textAlign: 'center', padding: 12 },
  entry: {
    display: 'flex', gap: 10, padding: '8px 10px',
    background: 'rgba(6, 6, 14, 0.4)', borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  content: { flex: 1, minWidth: 0 },
  entryTime: { fontSize: 9, color: '#555', fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 },
  entryDetail: { display: 'flex', gap: 6, marginBottom: 3, flexWrap: 'wrap' as const },
  modeTag: {
    fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
  },
  threatTag: { fontSize: 9, color: '#ff8c00', fontFamily: "'JetBrains Mono', monospace" },
  nodeTag: { fontSize: 9, color: '#666', fontFamily: "'JetBrains Mono', monospace" },
  entryMsg: { fontSize: 10, color: '#888', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.3 },
};
