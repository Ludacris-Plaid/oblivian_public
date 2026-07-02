import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth; const h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
    ctx.scale(dpr, dpr);

    const particles: Array<{
      x: number; y: number; r: number; vx: number; vy: number; alpha: number; pulse: number; speed: number;
    }> = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 2 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.1,
        alpha: 0.08 + Math.random() * 0.2,
        pulse: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.03,
      });
    }

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.speed;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.08;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(0, 255, 136, ${currentAlpha})`);
        grad.addColorStop(0.3, `rgba(0, 255, 136, ${currentAlpha * 0.6})`);
        grad.addColorStop(1, "rgba(0, 255, 136, 0)");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${currentAlpha + 0.1})`;
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    setTimeout(() => {
      if (username === "dysthemix" && password === "Fraser1984!") {
        localStorage.setItem("virus_auth", JSON.stringify({ user: username, ts: Date.now() }));
        onLogin();
      } else {
        setError("Invalid credentials. Try again.");
        setSubmitting(false);
      }
    }, 800 + Math.random() * 400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#06060e", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: "relative", zIndex: 1, width: 380, padding: "40px 36px", background: "rgba(12,14,28,0.8)", backdropFilter: "blur(24px)", borderRadius: 16, border: "1px solid rgba(0,255,136,0.15)", boxShadow: "0 0 60px rgba(0,255,136,0.05)", textAlign: "center" }}
      >
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,255,136,0.08)", border: "2px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", animation: "pulse 2s infinite" }}>
          <span style={{ fontSize: 24, filter: "drop-shadow(0 0 8px rgba(0,255,136,0.4))" }}>☠️</span>
        </div>

        <h1 style={{ margin: "0 0 6px", color: "#00ff88", fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textShadow: "0 0 16px rgba(0,255,136,0.3)" }}>VIRUS C2</h1>
        <p style={{ margin: "0 0 28px", color: "#334", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: "uppercase" }}>Command & Control</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            style={inputStyle}
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ color: "#ff4757", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", padding: "6px 0" }}>
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting || !username || !password}
            style={{
              padding: "14px", borderRadius: 10, border: "1px solid rgba(0,255,136,0.3)",
              background: "rgba(0,255,136,0.1)", color: "#00ff88", fontSize: 14, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", marginTop: 4,
              opacity: (!username || !password) ? 0.3 : 1, transition: "all 0.2s",
              letterSpacing: 1,
            }}
          >
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 16 }}>⟳</motion.span>
                AUTHENTICATING...
              </span>
            ) : "LOGIN"}
          </motion.button>
        </form>

        <p style={{ margin: "20px 0 0", color: "#1a2a1a", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>VIRUS C2 v2.0 — Secure Terminal</p>
      </motion.div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  background: "rgba(6,6,14,0.5)",
  border: "1px solid rgba(0,255,136,0.15)",
  borderRadius: 10,
  color: "#e0e0e0",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s",
};

export default LoginScreen;
