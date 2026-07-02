import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlitchNumber from "./GlitchNumber";

interface Credential {
  id: string;
  username: string;
  email: string;
  password?: string;
  timestamp: string;
  node_id?: string;
  service?: string;
}

const CredentialStream: React.FC<{ data?: Credential[] }> = ({ data = [] }) => {
  const [typedText, setTypedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const currentCredential = data[currentIndex] || null;

  const typeText = useCallback((text: string) => {
    setIsTyping(true);
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentCredential) {
      return typeText(currentCredential.username);
    }
  }, [currentIndex, currentCredential, typeText]);

  const nextCredential = useCallback(() => {
    if (data.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % data.length);
    }
  }, [data.length]);

  useEffect(() => {
    if (data.length <= 1) return;
    const timer = setInterval(nextCredential, 5000);
    return () => clearInterval(timer);
  }, [data.length, nextCredential]);

  const downloadCreds = (format: "txt" | "csv") => {
    window.open(`/api/credentials/export?format=${format}`, "_blank");
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
          <h2 style={styles.title}>
            <span style={{...styles.titleIcon, color: '#00d4ff'}}>&#9679;</span>
            Live Harvests
          </h2>
        <div style={styles.headerRight}>
          <span style={styles.counter}><GlitchNumber value={data.length} fontSize={11} color="#444" glitchColor="#ff6ec7" intensity={0.3} /> total</span>
          <div style={styles.downloadGroup}>
            <button style={styles.dlBtn} onClick={() => downloadCreds("txt")} title="Download .txt">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                <path d="M6 1v7M3 5l3 3 3-3M2 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              .txt
            </button>
            <button style={styles.dlBtn} onClick={() => downloadCreds("csv")} title="Download .csv (Excel)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                <path d="M6 1v7M3 5l3 3 3-3M2 10h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              .csv
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#1a2a3a" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M14 20h12M20 14v12" stroke="#333" strokeWidth="1" />
            </svg>
          </div>
          <p style={styles.emptyText}>Waiting for incoming credentials...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            style={styles.credentialCard}
          >
            <DataRow label="username" value={typedText} color="#00ff88" isTyping={isTyping} />
            <DataRow label="email" value={currentCredential?.email || ""} color="#e0e0e0" />
            <DataRow label="password" value={currentCredential?.password || "---"} color="#ff4757" masked />
            <DataRow label="timestamp" value={
              currentCredential?.timestamp
                ? new Date(currentCredential.timestamp).toLocaleTimeString()
                : ""
            } color="#666" />
            {currentCredential?.node_id && (
              <DataRow label="node" value={currentCredential.node_id} color="#00d4ff" />
            )}
            {currentCredential?.service && (
              <DataRow label="service" value={currentCredential.service} color="#ffd700" />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <div style={styles.footer}>
        <span style={styles.count}>
          {data.length > 0 ? `${currentIndex + 1} / ${data.length}` : "0 / 0"}
        </span>
        <button
          style={styles.button}
          onClick={nextCredential}
          disabled={data.length <= 1}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

const DataRow: React.FC<{
  label: string;
  value: string;
  color: string;
  isTyping?: boolean;
  masked?: boolean;
}> = ({ label, value, color, isTyping, masked }) => (
  <div style={styles.row}>
    <span style={styles.label}>{label}</span>
    <span style={styles.colon}>:</span>
    <span style={{ ...styles.value, color }}>
      {masked ? value.replace(/./g, "*").substring(0, 12) : value}
      {isTyping && <span style={styles.cursor}>|</span>}
    </span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(0, 255, 136, 0.12)',
    padding: '14px 16px',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    boxSizing: 'border-box' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(0, 255, 136, 0.06)',
  },
  title: {
    margin: 0,
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
  counter: {
    color: '#444',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  downloadGroup: {
    display: 'flex',
    gap: 6,
  },
  dlBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'rgba(0, 255, 136, 0.08)',
    color: '#00ff88',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: 5,
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.2s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    color: '#444',
    fontSize: 13,
  },
  credentialCard: {
    background: 'rgba(6, 6, 14, 0.6)',
    padding: '16px 20px',
    borderRadius: 10,
    border: '1px solid rgba(0, 255, 136, 0.06)',
    fontFamily: "'JetBrains Mono', monospace",
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
    fontSize: 12,
  },
  label: {
    color: '#00d4ff',
    width: 90,
    flexShrink: 0,
  },
  colon: {
    color: '#222',
    marginRight: 12,
  },
  value: {
    flex: 1,
    fontSize: 12,
  },
  cursor: {
    color: '#00ff88',
    animation: 'pulse 1s infinite',
    marginLeft: 1,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  count: {
    color: '#444',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  button: {
    padding: '6px 16px',
    background: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.2s',
  },
};

export default CredentialStream;
