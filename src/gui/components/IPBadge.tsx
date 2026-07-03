import React, { useState, useEffect, useRef, useCallback } from "react";
import { API_URL } from "../config";

const COUNTRY_FLAGS: Record<string, string> = {
  'Germany': '🇩🇪', 'Netherlands': '🇳🇱', 'France': '🇫🇷', 'Sweden': '🇸🇪',
  'Switzerland': '🇨🇭', 'Japan': '🇯🇵', 'Singapore': '🇸🇬', 'UK': '🇬🇧',
  'United Kingdom': '🇬🇧', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
  'Brazil': '🇧🇷', 'India': '🇮🇳', 'United States': '🇺🇸', 'US': '🇺🇸',
  'Russia': '🇷🇺', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
};

const IPBadge: React.FC = () => {
  const [ipStatus, setIpStatus] = useState<{
    ip: string; flag: string; label: string; color: string; speed: string; connected: boolean; rotationSec: number; lastRotationTs: number;
  }>({ ip: '--', flag: '', label: 'WAITING', color: '#444', speed: '', connected: false, rotationSec: 0, lastRotationTs: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchIp = useCallback(async () => {
    try {
      const [ipRes, torRes, proxyRes] = await Promise.all([
        fetch(API_URL + '/api/ip-lookup?fields=query,city,country,countryCode,isp'),
        fetch(API_URL + '/api/tor/check-ip'),
        fetch(API_URL + '/api/rotating-proxy/status'),
      ]);
      const ipData = await ipRes.json();
      const torData = await torRes.json();
      const proxyData = await proxyRes.json();

      if (torData?.torified) {
        setIpStatus({
          ip: torData.exit_ip || ipData.query, flag: COUNTRY_FLAGS[torData.exit_country] || '🏳️',
          label: 'TOR', color: '#9966cc', speed: `${torData.latency_ms || '?'}ms`, connected: true, rotationSec: 0, lastRotationTs: 0,
        });
      } else if (proxyData?.active && proxyData?.current_proxy) {
        setIpStatus({
          ip: proxyData.current_proxy.host + ':' + proxyData.current_proxy.port,
          flag: countryCodeToFlag(proxyData.current_proxy.country) || COUNTRY_FLAGS[proxyData.current_proxy.country] || '🏳️',
          label: 'PROXY', color: '#ffd700',
          speed: proxyData.current_proxy.protocol || '',
          connected: true,
          rotationSec: proxyData?.stats?.rotation_interval_sec || 60,
          lastRotationTs: proxyData?.stats?.last_rotation_ts || 0,
        });
      } else if (ipData.query) {
        setIpStatus({
          ip: ipData.query, flag: countryCodeToFlag(ipData.countryCode) || '🏳️',
          label: 'CLEAR', color: '#00cc66', speed: ipData.isp || '', connected: true, rotationSec: 0, lastRotationTs: 0,
        });
      } else {
        throw new Error('No IP');
      }
    } catch {
      setIpStatus({ ip: 'OFFLINE', flag: '⚠️', label: 'DISCONNECTED', color: '#ff4757', speed: '', connected: false, rotationSec: 0, lastRotationTs: 0 });
    }
  }, []);

  useEffect(() => {
    fetchIp();
    const id = setInterval(fetchIp, 10000);
    return () => clearInterval(id);
  }, [fetchIp]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 260; const h = 72;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    let t = 0;

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      const col = ipStatus.color;
      const connected = ipStatus.connected;
      const intensityMul = connected ? 1 : 1.5;
      const speed = connected ? 1.2 : 2.5;

      // ── Breathing background (KillSwitch style) ──
      const breath = 0.04 + Math.sin(t * speed * 0.8) * 0.03;
      const baseAlpha = connected ? breath : 0.15 + Math.sin(t * 3) * 0.1;
      if (connected) {
        ctx.fillStyle = `${col}${Math.floor(baseAlpha * 255).toString(16).padStart(2, '0')}`;
      } else {
        ctx.fillStyle = `rgba(255,30,30,${baseAlpha})`;
      }
      ctx.fillRect(0, 0, w, h);

      // ── Radiating rings from center (KillSwitch style) ──
      const cx = w / 2, cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      for (let ring = 0; ring < 4; ring++) {
        const phase = ((t * speed + ring * 1.2) % 3);
        const radius = 5 + phase * (maxR / 3);
        const ringAlpha = Math.max(0, (0.4 - phase * 0.13) * intensityMul);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = col + (Math.floor(ringAlpha * 255).toString(16).padStart(2, '0'));
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // ── Border pulse (KillSwitch style) ──
      const borderAlpha = Math.min(0.35, (0.12 + Math.sin(t * speed * 1.5) * 0.06) * intensityMul);
      ctx.strokeStyle = col + (Math.floor(borderAlpha * 255).toString(16).padStart(2, '0'));
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 2, w - 4, h - 4);

      // ── Corner marks (KillSwitch style) ──
      const cornerLen = 8;
      const ca = Math.min(0.45, (0.2 + Math.sin(t * speed * 1.5) * 0.12) * intensityMul);
      ctx.strokeStyle = col + (Math.floor(ca * 255).toString(16).padStart(2, '0'));
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, 4 + cornerLen); ctx.lineTo(4, 4); ctx.lineTo(4 + cornerLen, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 4 - cornerLen, 4); ctx.lineTo(w - 4, 4); ctx.lineTo(w - 4, 4 + cornerLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, h - 4 - cornerLen); ctx.lineTo(4, h - 4); ctx.lineTo(4 + cornerLen, h - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - 4 - cornerLen, h - 4); ctx.lineTo(w - 4, h - 4); ctx.lineTo(w - 4, h - 4 - cornerLen); ctx.stroke();

      // ── Flag ──
      ctx.font = '26px sans-serif'; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.shadowBlur = 0;
      ctx.fillText(ipStatus.flag || '🌐', 8, h / 2);

      // ── IP text with glow ──
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = "left";
      ctx.fillStyle = connected ? '#f0f0f0' : col + 'ee';
      ctx.shadowColor = col;
      ctx.shadowBlur = connected ? 4 + Math.sin(t * speed) * 2 : 0;
      ctx.fillText(ipStatus.ip, 48, h / 2 - 6);
      ctx.shadowBlur = 0;

      // ── Label ──
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = connected ? col + 'cc' : col + 'cc';
      ctx.fillText(ipStatus.label, 48, h / 2 + 14);
      if (ipStatus.speed && connected) {
        ctx.fillStyle = col + '99';
        ctx.fillText(ipStatus.speed, 48 + ctx.measureText(ipStatus.label + '  ').width, h / 2 + 14);
      }

      // ── Proxy rotation countdown ring ──
      const ringX = w - 22;
      const ringY = 12;
      const ringR = 10;
      const rotationInterval = ipStatus.rotationSec;
      const lastRot = ipStatus.lastRotationTs;

      if (connected && rotationInterval > 0) {
        const nowMs = Date.now() / 1000;
        const startRef = lastRot > 0 ? lastRot : (nowMs - 2);
        const elapsed = nowMs - startRef;
        const countdown = Math.max(0, Math.ceil(rotationInterval - (elapsed % rotationInterval)));
        const fraction = countdown / rotationInterval;
        const urgency = 1.0 - fraction;

        if (countdown <= 10) {
          const ringSpeed = (1 - countdown / 10) * 4.5 + 0.2;
          for (let ring = 0; ring < 4; ring++) {
            const phase = ((t * ringSpeed + ring * 1.2) % 3);
            const radius = ringR + 3 + phase * 12;
            const ringAlpha = Math.max(0, (0.4 - phase * 0.13) * (0.2 + urgency * 0.8));
            ctx.beginPath();
            ctx.arc(ringX, ringY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = col + (Math.floor(ringAlpha * 255).toString(16).padStart(2, '0'));
            ctx.lineWidth = 1 + urgency * 2;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
        ctx.fillStyle = `${col}${Math.floor(15 + urgency * 30).toString(16).padStart(2, '0')}`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ringX, ringY, ringR - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - fraction), false);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 2 + urgency * 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = `bold ${9 + (countdown < 10 ? 1 : 0)}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = countdown <= 3 ? col : '#ddd';
        ctx.fillText(String(countdown), ringX, ringY + 1);
      } else if (connected) {
        ctx.beginPath();
        ctx.arc(ringX, ringY, 2, 0, Math.PI * 2);
        ctx.fillStyle = col + '44';
        ctx.fill();
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [ipStatus]);

  return (
    <canvas ref={canvasRef} onClick={fetchIp}
      style={{ width: 260, height: 72, borderRadius: 8, cursor: "pointer", background: "rgba(6,6,14,0.4)" }}
    />
  );
};

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6;
  const a = code.toUpperCase().charCodeAt(0) - 65;
  const b = code.toUpperCase().charCodeAt(1) - 65;
  if (a < 0 || a > 25 || b < 0 || b > 25) return '';
  return String.fromCodePoint(base + a, base + b);
}

export default IPBadge;
