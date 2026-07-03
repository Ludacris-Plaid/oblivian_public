import React, { useState, useEffect, useRef } from 'react';
import GlitchNumber from './GlitchNumber';
import { API_URL } from "../config";

interface FreqBand {
  label: string;
  value: number;
  peak: number;
  color: string;
}

export default function SignalMonitor() {
  const [bars, setBars] = useState<FreqBand[]>([
    { label: '2.4GHz', value: 0, peak: 0, color: '#00ff88' },
    { label: '5GHz', value: 0, peak: 0, color: '#00d4ff' },
    { label: '6GHz', value: 0, peak: 0, color: '#a855f7' },
    { label: 'LoRa', value: 0, peak: 0, color: '#ffd700' },
    { label: 'SubG', value: 0, peak: 0, color: '#ff6ec7' },
    { label: 'VHF', value: 0, peak: 0, color: '#ff4757' },
    { label: 'UHF', value: 0, peak: 0, color: '#00ff88' },
    { label: 'S-band', value: 0, peak: 0, color: '#00d4ff' },
  ]);

  const [signalQuality, setSignalQuality] = useState(87);
  const [threatLevel, setThreatLevel] = useState(23);
  const [uptime, setUptime] = useState(0);
  const [nodesOnline, setNodesOnline] = useState(0);
  const [exfilRate, setExfilRate] = useState(0);
  const [cmdRate, setCmdRate] = useState(0);
  const [packetsTotal, setPacketsTotal] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array(32).fill(0.5));

  const waveRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const packetCountRef = useRef(Math.floor(Math.random() * 50000));
  const cmdCountRef = useRef(Math.floor(Math.random() * 200));
  const uptimeRef = useRef(0);
  const exfilRef = useRef(Math.floor(Math.random() * 10000000));
  const nodesRef = useRef(3);

  // Animate waveform on canvas
  useEffect(() => {
    const canvas = waveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 300;
    const h = 40;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      phase += 0.05;

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#00ff8840');
      grad.addColorStop(0.5, '#00d4ff80');
      grad.addColorStop(1, '#a855f740');

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let i = 0; i < waveform.length; i++) {
        const x = (i / (waveform.length - 1)) * w;
        const y = h - waveform[i] * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Glow line
      ctx.beginPath();
      for (let i = 0; i < waveform.length; i++) {
        const x = (i / (waveform.length - 1)) * w;
        const y = h - waveform[i] * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [waveform]);

  // Live data update loop
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [evRes, ctxRes] = await Promise.all([
          fetch(API_URL + '/api/events'),
          fetch(API_URL + '/api/ai/context'),
        ]);
        const evData = await evRes.json();
        const ctxData = await ctxRes.json();

        if (!alive) return;
        const evList = evData.events || [];

        // Waveform from node count / event activity
        const nodeCount = ctxData.active_nodes || 1;
        const evCount = evList.length;
        setWaveform(prev => prev.map((v, i) => {
          const base = 0.3 + (nodeCount * 0.08);
          const target = base + Math.sin(Date.now() / 500 + i * 0.5) * 0.2 + (evCount * 0.01);
          return v + (Math.min(target, 0.95) - v) * 0.3;
        }));

        // Frequency bars from event type distribution
        const typeCounts: Record<string, number> = {};
        for (const ev of evList) typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1;
        setBars(prev => prev.map((b, i) => {
          const types = Object.keys(typeCounts);
          const idx = i % Math.max(types.length, 1);
          const val = Math.min(95, Math.max(5, (typeCounts[types[idx]] || 1) * 12));
          return { ...b, value: val, peak: Math.max(b.peak * 0.95, val) };
        }));

        // Live metrics from real data
        setSignalQuality(Math.min(98, 65 + (nodeCount * 6)));
        setThreatLevel(Math.min(45, evList.filter(e => e.type === 'log_threat').length * 8 + Math.floor(Math.random() * 5)));
        uptimeRef.current += 1.5;
        setUptime(uptimeRef.current);
        setCmdRate(Math.max(1, evList.filter(e => e.type === 'command').length * 3 + evList.filter(e => e.type === 'ai_decision').length));
        packetCountRef.current += evList.length * 12 + 5;
        setPacketsTotal(packetCountRef.current);
        exfilRef.current += Math.max(100, (ctxData.creds || 1) * 180);
        setExfilRate(exfilRef.current);
        nodesRef.current = Math.max(1, nodeCount);
        setNodesOnline(nodeCount);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`;
  };

  const formatLarge = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div style={styles.card}>
      <div style={styles.main}>
        {/* Waveform */}
        <div style={styles.waveSection}>
          <div style={styles.sectionLabel}>Signal Waveform</div>
          <canvas ref={waveRef} style={styles.waveCanvas} />
          <div style={styles.waveMeta}>
            <span style={{ color: '#00ff88', fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
              {(signalQuality).toString().padStart(3, ' ')}%
            </span>
            <span style={{ color: '#333', fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>QUALITY</span>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Frequency bars */}
        <div style={styles.freqSection}>
          <div style={styles.sectionLabel}>Frequency Bands</div>
          <div style={styles.freqBars}>
            {bars.map((bar, i) => (
              <div key={bar.label} style={styles.freqBar}>
                <div style={styles.barWrapper}>
                  <div
                    style={{
                      width: '100%',
                      height: `${bar.value}%`,
                      background: `linear-gradient(to top, ${bar.color}40, ${bar.color})`,
                      borderRadius: 2,
                      position: 'absolute',
                      bottom: 0,
                      boxShadow: `0 0 6px ${bar.color}40`,
                      transition: 'height 0.3s ease-out',
                    }}
                  />
                  {/* Peak marker */}
                  <div style={{
                    position: 'absolute',
                    bottom: `${bar.peak}%`,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: `${bar.color}80`,
                  }} />
                </div>
                <span style={{ fontSize: 7, color: '#444', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.divider} />

        {/* Stats grid */}
        <div style={styles.statsSection}>
          <div style={styles.sectionLabel}>Live Metrics</div>
          <div style={styles.statsGrid}>
            <Stat label="Uptime" value={formatUptime(uptime)} color="#00ff88" />
            <Stat label="Nodes" value={`${nodesOnline} online`} color="#00d4ff" />
            <Stat label="Packets" value={formatLarge(packetsTotal)} color="#a855f7" />
            <Stat label="Exfil" value={formatLarge(exfilRate) + '/s'} color="#ffd700" />
            <Stat label="Cmds/s" value={String(cmdRate)} color="#ff6ec7" />
            <Stat label="Threat" value={`${threatLevel}%`} color={threatLevel > 30 ? '#ff4757' : '#00ff88'} />
          </div>
        </div>

        <div style={styles.divider} />

        {/* Signal ring */}
        <div style={styles.ringSection}>
          <SignalRing quality={signalQuality} />
        </div>
      </div>

      {/* Bottom ticker */}
      <div style={styles.ticker}>
        <Ticker />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={styles.stat}>
      <GlitchNumber value={value} color={color} fontSize={11} fontWeight={600} intensity={0.3} />
      <span style={{ fontSize: 8, color: '#444', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
        {label}
      </span>
    </div>
  );
}

function SignalRing({ quality }: { quality: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 64;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let raf: number;
    let t = 0;

    const draw = () => {
      t += 0.02;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const r = 26;

      // Background ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Quality arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * quality / 100);

      const grad = ctx.createConicGradient(startAngle, cx, cy);
      grad.addColorStop(0, '#00ff88');
      grad.addColorStop(0.5, '#00d4ff');
      grad.addColorStop(1, '#a855f7');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow dots around the ring
      for (let i = 0; i < 8; i++) {
        const angle = startAngle + ((i / 8) * Math.PI * 2) + t;
        const dx = cx + Math.cos(angle) * r;
        const dy = cy + Math.sin(angle) * r;
        const alpha = 0.3 + Math.sin(t * 2 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.fill();
      }

      // Center text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${quality}%`, cx, cy);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [quality]);

  return <canvas ref={canvasRef} style={{ width: 64, height: 64 }} />;
}

function Ticker() {
  const [pos, setPos] = useState(0);
  const [events, setEvents] = useState<Array<{timestamp: string; type: string; payload?: Record<string, unknown>}>>([]);
  const [health, setHealth] = useState<{nodes?: number; creds?: number; status?: string}>({});
  const [context, setContext] = useState<{nodes?: number; active_nodes?: number; evasion?: number; creds?: number}>({});
  const [sim, setSim] = useState<{simulation_enabled?: boolean}>({});
  const posRef = useRef(0);

  // Poll live data
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [evRes, hRes, ctxRes, simRes] = await Promise.all([
          fetch(API_URL + '/api/events'),
          fetch(API_URL + '/health'),
          fetch(API_URL + '/api/ai/context'),
          fetch(API_URL + '/api/simulation/status'),
        ]);
        if (alive) {
          const evData = await evRes.json();
          setEvents((evData.events || []).slice(0, 15));
          setHealth(await hRes.json());
          setContext(await ctxRes.json());
          setSim(await simRes.json());
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Build verbose status messages with color coding
  type Msg = { text: string; color: string };
  const msgs: Msg[] = [];

  // Server health
  const h = health;
  const healthColor = h.status === 'healthy' ? '#00ff88' : '#ff4757';
  msgs.push({ text: `SERVER: ${h.status || 'unknown'} // NODES: ${h.nodes ?? '?'} // CREDS HARVESTED: ${h.creds ?? '?'}`, color: healthColor });

  // AI context
  const c = context;
  msgs.push({ text: `AI BRAIN: ONLINE // ACTIVE NODES: ${c.active_nodes ?? '?'}/${c.nodes ?? '?'} // EVASION RECORDS: ${c.evasion ?? 0}`, color: '#00d4ff' });

  // Simulation
  msgs.push({ text: `SIMULATION: ${sim.simulation_enabled ? 'RUNNING' : 'OFF'}`, color: sim.simulation_enabled ? '#ffd700' : '#666' });

  // Recent events (verbose, color-coded by severity)
  for (const ev of events) {
    const p = ev.payload || {};
    const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '';
    const t = ev.type;
    let msg = '';
    let color = '#00ff88'; // default: info green

    if (t === 'heartbeat') {
      msg = `[${ts}] HEARTBEAT // ${String(p.node_id || 'NODE').toUpperCase()}`;
      color = '#00ff88';
    } else if (t === 'credential' || t === 'browser') {
      msg = `[${ts}] CREDENTIAL // ${String(p.username || '?')} @ ${String(p.site || '?')}`;
      color = '#00ff88';
    } else if (t === 'evasion') {
      const tl = String(p.threat_level || 'low');
      color = tl === 'critical' ? '#ff4757' : tl === 'high' ? '#ff8c00' : tl === 'medium' ? '#ffd700' : '#00ff88';
      msg = `[${ts}] EVASION // SCORE: ${String(p.score || '?')} // THREAT: ${tl.toUpperCase()}`;
    } else if (t === 'mutation') {
      msg = `[${ts}] MUTATION // ${String(p.mode || 'AUTO').toUpperCase()}`;
      color = '#a855f7';
    } else if (t === 'log_threat') {
      const sev = String(p.severity || 'medium');
      color = sev === 'critical' ? '#ff4757' : sev === 'high' ? '#ff8c00' : '#ffd700';
      msg = `[${ts}] THREAT // ${String(p.signature || '?')} // ${sev.toUpperCase()}`;
    } else if (t === 'ai_decision' && (p.action === 'system_start' || p.action === 'ai_brain_start')) {
      continue; // skip startup noise
    } else if (t === 'ai_decision') {
      msg = `[${ts}] AI // ${String(p.action || '').toUpperCase()}`;
      color = '#00d4ff';
    } else if (t === 'command') {
      msg = `[${ts}] COMMAND // ${String(p.action || '?')} // ${String(p.targets || '?')} NODES`;
      color = '#a855f7';
    } else if (t === 'harvest') {
      msg = `[${ts}] HARVEST // ${String(p.type || 'data').toUpperCase()}`;
      color = '#00ff88';
    } else if (t === 'system_info') {
      msg = `[${ts}] RECON // ${String(p.hostname || '?')} // ${String(p.os || '?')}`;
      color = '#00d4ff';
    } else if (t === 'ssh') {
      msg = `[${ts}] SSH KEY // ${String(p.site || '?')}`;
      color = '#ffd700';
    } else if (t === 'git') {
      msg = `[${ts}] GIT CREDS // ${String(p.site || '?')}`;
      color = '#ffd700';
    } else if (t === 'command_result') {
      const st = String(p.status || '?');
      color = st === 'error' ? '#ff4757' : st === 'executed' ? '#00ff88' : '#ffd700';
      msg = `[${ts}] RESULT // ${String(p.action || '?')} // ${st.toUpperCase()}`;
    } else {
      continue;
    }
    msgs.push({ text: msg, color });
  }

  // Diagnostics
  msgs.push({ text: `POLL: ${new Date().toLocaleTimeString()} // BRAIN CYCLE: 15s // LOG MONITOR: 5s`, color: '#6688aa' });

  const separator = { text: '  ◆  ', color: '#333' };

  // Flatten messages with separators into segments
  const segments: { text: string; color: string }[] = [];
  for (const m of msgs) {
    if (segments.length > 0) segments.push(separator);
    segments.push(m);
  }
  // Duplicate for seamless looping
  const allSegments = [...segments, ...segments];

  // Smooth RAF-based scrolling
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const speed = 0.35;
    const scroll = (now: number) => {
      const dt = now - last;
      last = now;
      posRef.current -= speed * (dt / 16);
      setPos(posRef.current);
      raf = requestAnimationFrame(scroll);
    };
    raf = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={styles.tickerInner}>
      <div
        style={{
          display: 'inline-flex',
          gap: 0,
          whiteSpace: 'nowrap' as const,
          transform: `translateX(${pos}px)`,
        }}
      >
        {allSegments.map((seg, i) => (
          <span key={i} style={{ color: seg.color, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{seg.text}</span>
        ))}
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
    padding: 0,
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    display: 'flex',
    alignItems: 'stretch',
    padding: '16px 20px',
    gap: 0,
  },
  divider: {
    width: 1,
    background: 'linear-gradient(to bottom, transparent, rgba(0,255,136,0.08), transparent)',
    margin: '0 16px',
    flexShrink: 0,
  },
  waveSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: '0 0 140px',
  },
  waveCanvas: {
    width: '100%',
    height: 40,
    borderRadius: 4,
    background: 'rgba(6, 6, 14, 0.5)',
  },
  waveMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freqSection: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minWidth: 0,
  },
  freqBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    flex: 1,
    height: 60,
  },
  freqBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    height: 60,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  statsSection: {
    display: 'flex',
    flexDirection: 'column',
    flex: '0 0 140px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px 8px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  ringSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 72px',
  },
  sectionLabel: {
    fontSize: 8,
    color: '#444',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 4,
  },
  ticker: {
    borderTop: '1px solid rgba(0,255,136,0.06)',
    background: 'rgba(6, 6, 14, 0.3)',
    padding: '7px 0',
    overflow: 'hidden',
    height: 28,
  },
  tickerInner: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
};