import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";

interface EvasionData {
  node_id: string;
  score: number;
  threat_level: "low" | "medium" | "high" | "critical";
  methods_detected: string[];
  last_analysis: string;
}

const EvasionAnalysis: React.FC<{ data?: EvasionData | null }> = ({ data = null }) => {
  const evasion = data || { node_id: "none", score: 0, threat_level: "low" as const, methods_detected: [], last_analysis: "" };
  const { score, threat_level, methods_detected, last_analysis, node_id } = evasion;

  const threatColors: Record<string, string> = {
    low: "#00ff88",
    medium: "#ffd700",
    high: "#ff8c00",
    critical: "#ff4757",
  };
  const color = threatColors[threat_level] || "#444";

  // Animated score
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const start = displayScore;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (score - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score]);

  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (circumference * displayScore) / 100;

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>
        <span style={{...styles.titleIcon, color: '#00d4ff'}}>&#9679;</span>
        Evasion Analysis
      </h2>

      <div style={styles.scoreSection}>
        <div style={styles.scoreCircle}>
          <svg viewBox="0 0 100 100" style={styles.svg}>
            {/* Background ring */}
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1a2a3a" strokeWidth="4" />
            {/* Glow ring */}
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={color} strokeWidth="1"
              opacity={0.15}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            {/* Score ring */}
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={color} strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                filter: `drop-shadow(0 0 6px ${color}44)`,
              }}
            />
            {/* Score text */}
            <foreignObject x="15" y="22" width="70" height="45">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <GlitchNumber value={displayScore} color={color} fontSize={26} fontWeight={700} intensity={0.5} />
                <div style={{ fontSize: 8, color: '#444', fontFamily: "'JetBrains Mono', monospace" }}>SCORE</div>
              </div>
            </foreignObject>
          </svg>
        </div>

        <div style={styles.scoreInfo}>
          <motion.div
            style={{ ...styles.threatBadge, backgroundColor: `${color}15`, color, border: `1px solid ${color}33` }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {threat_level.toUpperCase()}
          </motion.div>
          <span style={styles.nodeLabel}>{node_id}</span>
        </div>
      </div>

      <div style={styles.methodsSection}>
        <h3 style={styles.methodsTitle}>Detected Methods</h3>
        {methods_detected.length === 0 ? (
          <p style={styles.methodsEmpty}>No evasion methods detected</p>
        ) : (
          <div style={styles.methodsList}>
            {methods_detected.map((method, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={styles.methodItem}
              >
                <div style={{ ...styles.methodDot, backgroundColor: color }} />
                <span style={styles.methodText}>{method}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {last_analysis && (
        <div style={styles.timestamp}>
          Last: {new Date(last_analysis).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(255, 215, 0, 0.1)',
    padding: '14px 16px',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    boxSizing: 'border-box' as const,
  },
  title: {
    margin: '0 0 12px 0',
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
  titleIcon: {
    fontSize: 8,
    animation: 'pulse 2s infinite',
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    marginBottom: 12,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    flexShrink: 0,
  },
  svg: { width: '100%', height: '100%' },
  scoreInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  threatBadge: {
    padding: '6px 16px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    width: 'fit-content',
    fontFamily: "'JetBrains Mono', monospace",
  },
  nodeLabel: {
    color: '#444',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  methodsSection: {
    marginBottom: 12,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  methodsTitle: {
    margin: '0 0 10px 0',
    color: '#aaa',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'JetBrains Mono', monospace",
  },
  methodsEmpty: {
    color: '#444',
    fontSize: 12,
  },
  methodsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    overflowY: 'auto',
  },
  methodItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 12px',
    background: 'rgba(6, 6, 14, 0.5)',
    borderRadius: 6,
    border: '1px solid rgba(255, 215, 0, 0.05)',
    fontSize: 12,
    color: '#ccc',
    fontFamily: "'JetBrains Mono', monospace",
  },
  methodDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    flexShrink: 0,
  },
  methodText: {},
  timestamp: {
    color: '#333',
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default EvasionAnalysis;
