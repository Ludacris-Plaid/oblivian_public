import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface StatsOverviewProps {
  data?: {
    total_nodes: number;
    active_nodes: number;
    credentials: number;
  };
  bytes_harvested?: number;
  last_harvest?: string | null;
  last_heartbeat?: string | null;
}

const GLITCH_CHARS = '01%#@&X';

function AnimatedCounter({ value, color = "#00ff88" }: { value: number; color?: string }) {
  const [display, setDisplay] = useState(0);
  const [glitching, setGlitching] = useState(false);
  const [style, setStyle] = useState({});
  const mounted = useRef(true);

  useEffect(() => { return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let start = display;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = Date.now();
    const tick = () => {
      if (!mounted.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  // Glitch bursts
  useEffect(() => {
    const burst = () => {
      if (!mounted.current) return;
      setGlitching(true);
      const len = String(Math.abs(value)).length;
      const fakeNum = Math.floor(Math.random() * Math.pow(10, Math.min(len, 5)));
      setDisplay(fakeNum);
      setStyle({
        transform: `translateX(${(Math.random()-0.5)*4}px) skewX(${(Math.random()-0.5)*3}deg)`,
        textShadow: `0 0 ${8+Math.random()*12}px rgba(255,110,199,0.7)`,
      });
      setTimeout(() => {
        if (mounted.current) { setGlitching(false); setStyle({}); setDisplay(value); }
      }, 70 + Math.random() * 100);
    };
    const id = setInterval(burst, 3000 + Math.random() * 5000);
    return () => clearInterval(id);
  }, [value]);

  const finalColor = glitching ? '#ff6ec7' : color;

  return (
    <span style={{
      display: 'block', fontSize: 28, fontWeight: 700,
      color: finalColor, fontFamily: "'JetBrains Mono', monospace",
      textShadow: glitching ? undefined : `0 0 12px ${color}44`,
      ...style,
    }}>{display}</span>
  );
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ data = {}, bytes_harvested = 0, last_harvest = null, last_heartbeat = null }) => {
  const [localStats, setLocalStats] = useState({
    total_nodes: 0,
    active_nodes: 0,
    credentials: 0,
    bytes_harvested: 0,
    last_harvest: null as string | null,
    last_heartbeat: null as string | null,
  });

  useEffect(() => {
    setLocalStats(prev => ({
      ...prev,
      total_nodes: data.total_nodes ?? prev.total_nodes,
      active_nodes: data.active_nodes ?? prev.active_nodes,
      credentials: data.credentials ?? prev.credentials,
      bytes_harvested: bytes_harvested,
      last_harvest: last_harvest,
      last_heartbeat: last_heartbeat,
    }));
  }, [data, bytes_harvested, last_harvest, last_heartbeat]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div style={styles.container}>
      <motion.div style={styles.stat} whileHover={{ scale: 1.05 }}>
        <AnimatedCounter value={localStats.total_nodes} />
        <span style={styles.statLabel}>Total Nodes</span>
      </motion.div>

      <div style={styles.divider} />

      <motion.div style={styles.stat} whileHover={{ scale: 1.05 }}>
        <AnimatedCounter value={localStats.active_nodes} color="#00d4ff" />
        <span style={styles.statLabel}>Active</span>
        {localStats.active_nodes > 0 && (
          <span style={styles.substat} color="#ff4757">
            ({localStats.active_nodes} / {localStats.total_nodes})
          </span>
        )}
      </motion.div>

      <div style={styles.divider} />

      <motion.div style={styles.stat} whileHover={{ scale: 1.05 }}>
        <AnimatedCounter value={localStats.credentials} color="#ffd700" />
        <span style={styles.statLabel}>Credentials</span>
        {localStats.credentials > 0 && (
          <span style={styles.substat} color="#00ff88">
            Last: {formatTime(localStats.last_harvest)}
          </span>
        )}
      </motion.div>

      <div style={styles.divider} />

      <motion.div style={styles.stat} whileHover={{ scale: 1.05 }}>
        <AnimatedCounter value={Math.round(localStats.bytes_harvested)} color="#a855f7" />
        <span style={styles.statLabel}>Bytes Harvested</span>
        <span style={styles.substat} color="#a855f7">
          {formatBytes(localStats.bytes_harvested)}
        </span>
      </motion.div>

      <div style={styles.divider} />

      <motion.div style={styles.stat} whileHover={{ scale: 1.05 }}>
        <AnimatedCounter value={localStats.total_nodes} color="#00ff88" />
        <span style={styles.statLabel}>Heartbeats</span>
        {localStats.last_heartbeat && (
          <span style={styles.substat} color="#00ff88">
            Last: {formatTime(localStats.last_heartbeat)}
          </span>
        )}
      </motion.div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: '12px 0',
  },
  stat: {
    textAlign: 'center',
    cursor: 'default',
  },
  statLabel: {
    display: 'block',
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    fontFamily: "'JetBrains Mono', monospace",
  },
  divider: {
    width: 1,
    height: 40,
    background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 136, 0.15), transparent)',
  },
};

export default StatsOverview;
