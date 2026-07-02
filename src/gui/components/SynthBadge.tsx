import React, { useRef, useEffect } from 'react';

interface SynthBadgeProps {
  connected: boolean;
  activeNodes: number;
}

export default function SynthBadge({ connected, activeNodes }: SynthBadgeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const w = 260;
  const h = 72;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;
    const particles: Array<{ x: number; y: number; vx: number; life: number; color: string }> = [];

    const coreColor = connected ? '#00ff88' : '#ff4757';
    const accentColor = connected ? '#00d4ff' : '#ff6ec7';
    const warnColor = '#ffd700';

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);

      const cx = 36;
      const cy = h / 2;

      // --- Outer glow background ---
      const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
      bgGlow.addColorStop(0, `${coreColor}12`);
      bgGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, w, h);

      // --- Rotating outer ring ---
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.8);
      const ringSegments = 36;
      for (let i = 0; i < ringSegments; i++) {
        const angle = (i / ringSegments) * Math.PI * 2;
        const segLen = 0.15;
        const alpha = 0.08 + Math.sin(t * 3 + i * 0.5) * 0.06;
        ctx.beginPath();
        ctx.arc(0, 0, 28, angle, angle + segLen);
        ctx.strokeStyle = `${coreColor}`;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // --- Second rotating ring (counter) ---
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 1.2);
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const segLen = 0.1;
        const alpha = 0.05 + Math.sin(t * 2 + i * 0.8) * 0.04;
        ctx.beginPath();
        ctx.arc(0, 0, 22, angle, angle + segLen);
        ctx.strokeStyle = accentColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // --- Pulsing energy rings ---
      for (let i = 0; i < 3; i++) {
        const phase = (t * 1.5 + i * 1.2) % 3.6;
        const ringR = 8 + phase * 7;
        const alpha = Math.max(0, 0.3 - phase * 0.08);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = coreColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // --- Core orb ---
      const orbPulse = Math.sin(t * 4) * 0.15 + 0.85;
      const orbR = 8 * orbPulse;

      // Orb glow
      const orbGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 3);
      orbGlow.addColorStop(0, `${coreColor}50`);
      orbGlow.addColorStop(0.5, `${coreColor}15`);
      orbGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, orbR * 3, 0, Math.PI * 2);
      ctx.fill();

      // Orb body
      const orbGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, orbR);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, coreColor);
      orbGrad.addColorStop(1, `${coreColor}80`);
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, orbR + 2, 0, Math.PI * 2);
      ctx.strokeStyle = `${coreColor}60`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // --- Orbiting dots ---
      for (let i = 0; i < 4; i++) {
        const angle = t * (1.5 + i * 0.3) + (i * Math.PI / 2);
        const orbitR = 14 + i * 3;
        const dx = cx + Math.cos(angle) * orbitR;
        const dy = cy + Math.sin(angle) * orbitR;
        const dotAlpha = 0.4 + Math.sin(t * 3 + i) * 0.3;
        const dotSize = 1 + Math.sin(t * 2 + i * 1.5) * 0.5;

        ctx.beginPath();
        ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? coreColor : accentColor;
        ctx.globalAlpha = dotAlpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- Data stream lines (horizontal) ---
      const streamX = cx + 36;
      const streamW = w - streamX - 12;
      for (let i = 0; i < 5; i++) {
        const sy = 14 + i * 12;
        const progress = ((t * 60 + i * 40) % streamW);
        const lineAlpha = 0.15 + Math.sin(t * 2 + i) * 0.08;

        ctx.beginPath();
        ctx.moveTo(streamX, sy);
        ctx.lineTo(streamX + progress, sy);
        ctx.strokeStyle = i % 2 === 0 ? coreColor : accentColor;
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Bright head
        ctx.beginPath();
        ctx.arc(streamX + progress, sy, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = lineAlpha * 1.5;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // --- Status text with glitch ---
      const textX = cx + 38;
      const statusText = connected ? 'SYSTEM ACTIVE' : 'DISCONNECTED';
      const glitchActive = Math.sin(t * 6) > 0.92;

      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      if (glitchActive) {
        const gx = (Math.random() - 0.5) * 4;
        const gy = (Math.random() - 0.5) * 2;
        ctx.fillStyle = '#ff000050';
        ctx.fillText(statusText, textX + gx + 1, 24 + gy);
        ctx.fillStyle = '#00ffff40';
        ctx.fillText(statusText, textX - gx - 1, 24 - gy);
      }

      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 8;
      ctx.fillText(statusText, textX, 24);
      ctx.shadowBlur = 0;

      // --- Node count ---
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 4;
      ctx.fillText(activeNodes.toString(), textX, 46);
      ctx.shadowBlur = 0;

      const label = ` ACTIVE NODE${activeNodes !== 1 ? 'S' : ''}`;
      const countW = ctx.measureText(activeNodes.toString()).width;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff50';
      ctx.fillText(label, textX + countW + 2, 46);

      // --- Sub info line ---
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff30';
      const uptime = `${Math.floor(t / 60)}m ${Math.floor(t % 60)}s`;
      ctx.fillText(`UPTIME: ${uptime}  |  PKT/s: ${connected ? Math.floor(Math.sin(t) * 5 + 8) : 0}`, textX, 60);

      // --- Scanline overlay ---
      for (let y = 0; y < h; y += 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, y, w, 1);
      }

      // --- Bottom accent line ---
      const lineGrad = ctx.createLinearGradient(cx + 30, 0, w - 10, 0);
      lineGrad.addColorStop(0, `${coreColor}30`);
      lineGrad.addColorStop(0.5, `${coreColor}10`);
      lineGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(cx + 30, h - 2, streamW, 1);

      // --- Corner decorations ---
      ctx.strokeStyle = `${coreColor}25`;
      ctx.lineWidth = 1;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(4, 12); ctx.lineTo(4, 4); ctx.lineTo(12, 4);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(4, h - 12); ctx.lineTo(4, h - 4); ctx.lineTo(12, h - 4);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(w - 4, 12); ctx.lineTo(w - 4, 4); ctx.lineTo(w - 12, 4);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(w - 4, h - 12); ctx.lineTo(w - 4, h - 4); ctx.lineTo(w - 12, h - 4);
      ctx.stroke();

      // --- Spawn particles on activity ---
      if (connected && Math.random() > 0.85) {
        particles.push({
          x: cx + Math.random() * 10 - 5,
          y: cy + Math.random() * 10 - 5,
          vx: Math.random() * 2 + 0.5,
          life: 1,
          color: Math.random() > 0.5 ? coreColor : accentColor,
        });
      }

      // --- Draw particles ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.life -= 0.02;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.6;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Keep particles bounded
      if (particles.length > 30) particles.splice(0, particles.length - 30);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [connected, activeNodes]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: w,
        height: h,
        borderRadius: 8,
        border: `1px solid ${connected ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 71, 87, 0.15)'}`,
        background: 'rgba(6, 6, 14, 0.6)',
        boxShadow: `0 0 30px ${connected ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 71, 87, 0.08)'}`,
      }}
    />
  );
}
