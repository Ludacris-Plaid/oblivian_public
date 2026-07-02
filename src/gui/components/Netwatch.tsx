import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlitchNumber from './GlitchNumber';
import { API_URL } from "../config";

interface Connection {
  id: string;
  node: string;
  target: string;
  protocol: string;
  status: 'active' | 'pending' | 'closed';
  packets: number;
  bytesIn: number;
  bytesOut: number;
  timestamp: string;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'in' | 'out' | 'alert' | 'cmd';
  message: string;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
}

export default function Netwatch() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bwIn, setBwIn] = useState(0);
  const [bwOut, setBwOut] = useState(0);
  const [totalConn, setTotalConn] = useState(0);
  const [packetsPerSec, setPacketsPerSec] = useState(0);
  const logIdRef = useRef(0);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [evRes, hRes, ctxRes] = await Promise.all([
          fetch(API_URL + '/api/events'),
          fetch(API_URL + '/health'),
          fetch(API_URL + '/api/ai/context'),
        ]);
        const evData = await evRes.json();
        const hData = await hRes.json();
        const ctxData = await ctxRes.json();

        if (!alive) return;

        const hostname = window.location.hostname;

        // Build connections from real node data (poll CS2 store)
        const evList = evData.events || [];
        const nodeIds = new Set<string>();
        const evTypes = new Set<string>();
        for (const ev of evList) {
          const nid = ev.payload?.node_id;
          if (nid) nodeIds.add(String(nid));
          evTypes.add(ev.type);
        }

        const conns: Connection[] = Array.from(nodeIds).map((nid, i) => ({
          id: `conn-live-${i}`,
          node: nid,
          target: hostname,
          protocol: 'ws',
          status: 'active' as const,
          packets: Math.round((evList.filter(e => e.payload?.node_id === nid).length || 1) * 47),
          bytesIn: hData.creds ? Math.round(hData.creds * 128) : 0,
          bytesOut: ctxData.creds ? Math.round(ctxData.creds * 256) : 0,
          timestamp: new Date().toTimeString().slice(0, 8),
        }));

        if (conns.length === 0) {
          conns.push({
            id: 'conn-default', node: 'c2-server', target: hostname, protocol: 'http',
            status: 'active', packets: 0, bytesIn: 0, bytesOut: 0,
            timestamp: new Date().toTimeString().slice(0, 8),
          });
        }

        setConnections(conns);
        setTotalConn(conns.length);

        // Build logs from real events
        const logEntries: LogEntry[] = evList.slice(0, 20).map((ev, i) => {
          const p = ev.payload || {};
          let msg = `${ev.type}: ${JSON.stringify(p).slice(0, 100)}`;
          let entryType: LogEntry['type'] = 'in';
          if (ev.type === 'ai_decision' || ev.type === 'command') entryType = 'cmd';
          else if (ev.type === 'log_threat' || ev.type === 'evasion') entryType = 'alert';
          else if (ev.type === 'harvest' || ev.type === 'credential') entryType = 'out';
          return { id: `log-${logIdRef.current++}`, time: new Date(ev.timestamp).toTimeString().slice(0, 8), type: entryType, message: msg.slice(0, 120) };
        });
        setLogs(logEntries);

        // Bandwidth from real credential counts
        setBwIn(Math.round((hData.creds || 1) * 512));
        setBwOut(Math.round((hData.creds || 1) * 1024));
        setPacketsPerSec(Math.round(evList.length * 3.2));
      } catch (e) {
        console.warn('[Netwatch] poll error:', e);
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const logTypeColor: Record<LogEntry['type'], string> = {
    in: '#00ff88',
    out: '#00d4ff',
    alert: '#ff4757',
    cmd: '#a855f7',
  };

  const logTypePrefix: Record<LogEntry['type'], string> = {
    in: '↓',
    out: '↑',
    alert: '⚠',
    cmd: '>',
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}><span style={{ fontSize: 8, color: '#00d4ff', animation: 'pulse 2s infinite' }}>&#9679;</span> Netwatch</h2>
          <p style={styles.sub}>Live Network Activity</p>
        </div>
        <div style={styles.metrics}>
          <MetricItem label="BW In" value={formatBytes(bwIn) + '/s'} color="#00ff88" />
          <div style={styles.metricDivider} />
          <MetricItem label="BW Out" value={formatBytes(bwOut) + '/s'} color="#00d4ff" />
          <div style={styles.metricDivider} />
          <MetricItem label="Pkt/s" value={String(packetsPerSec)} color="#ffd700" />
          <div style={styles.metricDivider} />
          <MetricItem label="Conn" value={String(totalConn)} color="#a855f7" />
        </div>
      </div>

      {/* Main content: connections + logs */}
      <div style={styles.content}>
        {/* Connection table */}
        <div style={styles.connSection}>
          <div style={styles.connHeader}>Active Connections</div>
          <div style={styles.connList}>
            {connections.map(conn => (
              <div key={conn.id} style={styles.connRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 90 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    backgroundColor: conn.status === 'active' ? '#00ff88' : conn.status === 'pending' ? '#ffd700' : '#333',
                    boxShadow: conn.status === 'active' ? '0 0 4px #00ff88' : 'none',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#555' }}>
                    {conn.node.slice(-8)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conn.target}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(0,212,255,0.08)', color: '#00d4ff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {conn.protocol}
                  </span>
                  <span style={{ fontSize: 9, color: '#00ff8866', fontFamily: "'JetBrains Mono', monospace", minWidth: 50, textAlign: 'right' }}>
                    {formatBytes(conn.bytesIn)}
                  </span>
                  <span style={{ fontSize: 9, color: '#00d4ff66', fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textAlign: 'right' }}>
                    {formatBytes(conn.bytesOut)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal log */}
        <div style={styles.logSection}>
          <div style={styles.logHeader}>Terminal Feed</div>
          <div style={styles.logList}>
            <AnimatePresence initial={false}>
              {logs.map(log => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  style={styles.logEntry}
                >
                  <span style={{ color: '#333', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 70 }}>
                    {log.time}
                  </span>
                  <span style={{ color: logTypeColor[log.type], fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 12 }}>
                    {logTypePrefix[log.type]}
                  </span>
                  <span style={{ color: '#888', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <GlitchNumber value={value} color={color} fontSize={13} fontWeight={700} intensity={0.3} />
      <div style={{ fontSize: 8, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(0, 255, 136, 0.1)',
    padding: '14px 16px',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  },
  sub: {
    margin: '4px 0 0',
    color: '#444',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  metrics: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  metricDivider: {
    width: 1,
    height: 28,
    background: 'linear-gradient(to bottom, transparent, rgba(0,255,136,0.1), transparent)',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  connSection: {
    borderRight: '1px solid rgba(0,255,136,0.05)',
    paddingRight: 16,
  },
  connHeader: {
    fontSize: 9,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 8,
  },
  connList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 160,
    overflow: 'hidden',
  },
  connRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 6px',
    borderRadius: 4,
    background: 'rgba(6, 6, 14, 0.4)',
  },
  logSection: {
    paddingLeft: 0,
  },
  logHeader: {
    fontSize: 9,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 8,
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxHeight: 180,
    overflowY: 'auto',
    paddingRight: 4,
  },
  logEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 0',
    borderBottom: '1px solid rgba(255,255,255,0.02)',
  },
};