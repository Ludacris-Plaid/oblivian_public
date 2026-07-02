import React from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";

interface Node {
  id: string;
  status: "online" | "offline" | "pending" | "active";
  ip?: string;
  country?: string;
  city?: string;
  last_heartbeat?: string;
}

const NodeStats: React.FC<{ data?: Node[] }> = ({ data = [] }) => {
  const nodes = data || [];
  const online = nodes.filter((n) => n.status === "online" || n.status === "active").length;
  const pending = nodes.filter((n) => n.status === "pending").length;
  const offline = nodes.filter((n) => n.status === "offline").length;
  const total = nodes.length;
  const percentage = total > 0 ? Math.round((online / total) * 100) : 0;

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>
        <span style={{...styles.titleIcon, color: '#00d4ff'}}>&#9679;</span>
        Node Health
      </h2>

      <div style={styles.statsGrid}>
        <StatBox label="Active" value={online} color="#00ff88" />
        <StatBox label="Pending" value={pending} color="#ffd700" />
        <StatBox label="Offline" value={offline} color="#ff4757" />
        <StatBox label="Total" value={total} color="#00d4ff" />
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressTrack}>
          <motion.div
            style={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span style={styles.progressLabel}>{percentage}% uptime</span>
      </div>

      <div style={styles.nodeList}>
        {nodes.length === 0 && (
          <p style={styles.emptyState}>No nodes connected yet</p>
        )}
        {nodes.slice(0, 8).map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={styles.nodeItem}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: node.status === "online" || node.status === "active"
                ? '#00ff88' : node.status === "pending" ? '#ffd700' : '#ff4757',
              boxShadow: `0 0 6px ${node.status === "online" || node.status === "active"
                ? '#00ff88' : node.status === "pending" ? '#ffd700' : '#ff4757'}44`,
              flexShrink: 0,
            }} />
            <span style={styles.nodeId}>{node.id}</span>
            <span style={styles.nodeCity}>{node.city || node.country || ""}</span>
            <span style={styles.nodeTime}>
              {node.last_heartbeat
                ? new Date(node.last_heartbeat).toLocaleTimeString()
                : "N/A"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <motion.div
    style={styles.statCard}
    whileHover={{ scale: 1.03, borderColor: `${color}33` }}
  >
    <GlitchNumber value={value} color={color} fontSize={24} fontWeight={700} intensity={0.4} />
    <div style={styles.statLabel}>{label}</div>
  </motion.div>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(0, 212, 255, 0.1)',
    padding: '14px 16px',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    boxSizing: 'border-box' as const,
  },
  title: {
    margin: '0 0 10px 0',
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    textShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    animation: 'textGlowPulse 3s ease-in-out infinite',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: { fontSize: 8, animation: 'pulse 2s infinite' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    background: 'rgba(6, 6, 14, 0.5)',
    padding: '14px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.03)',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    fontFamily: "'JetBrains Mono', monospace",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1a2a3a',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 10,
    color: '#444',
    fontFamily: "'JetBrains Mono', monospace",
  },
  nodeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'rgba(6, 6, 14, 0.4)',
    padding: 10,
    borderRadius: 8,
    border: '1px solid rgba(0, 255, 136, 0.04)',
    flex: 1,
    overflowY: 'auto',
  },
  emptyState: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    padding: 12,
  },
  nodeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 6,
    fontSize: 11,
    color: '#888',
    transition: 'background 0.2s',
  },
  nodeId: {
    fontFamily: "'JetBrains Mono', monospace",
    color: '#ccc',
    fontSize: 11,
    flex: 1,
  },
  nodeCity: {
    fontSize: 10,
    color: '#555',
    fontFamily: "'JetBrains Mono', monospace",
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  nodeTime: {
    fontSize: 10,
    color: '#444',
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default NodeStats;
