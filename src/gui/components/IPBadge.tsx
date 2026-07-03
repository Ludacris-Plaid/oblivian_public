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

  // Countdown timer ref — removed, using backend lastRotationTs instead

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

      // Background
      if (!connected) {
        ctx.fillStyle = 'rgba(255,30,30,0.25)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `rgba(255,50,50,${0.25 + Math.sin(t * 3) * 0.15})`;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = col + '18';
        ctx.fillRect(0, 0, w, h);
      }

      // Semi-thick outline border with glow
      const borderPulse = connected ? 0.6 + Math.sin(t * 1.2) * 0.25 : 0.5 + Math.sin(t * 2.5) * 0.2;
      ctx.shadowColor = col;
      ctx.shadowBlur = connected ? 6 : 3;
      ctx.strokeStyle = col + (Math.floor(borderPulse * 255).toString(16).padStart(2, '0'));
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, w - 4, h - 4);
      ctx.shadowBlur = 0;

      // Connected animation
      if (connected) {
        for (let i = 0; i < 5; i++) {
          const phase = ((t * 2 + i * 0.8) % 1);
          const x = 20 + phase * (w - 40);
          const y = h / 2 - 8 + Math.sin(phase * Math.PI) * 8;
          ctx.fillStyle = col + (Math.floor(Math.sin(phase * Math.PI) * 0.5 * 255).toString(16).padStart(2, '0'));
          ctx.fillRect(x, y, 2, 4);
        }
        // Signal bars — brighter
        for (let bar = 0; bar < 3; bar++) {
          const bh = 8 + Math.sin(t * 2.5 + bar * 1.5) * 5 + 10;
          const bx = w - 34 + bar * 7;
          const by = h - 30;
          ctx.fillStyle = col + 'bb';
          ctx.fillRect(bx, by + (16 - bh), 4, bh);
        }
        // Glow indicator dot
        ctx.beginPath();
        ctx.arc(w - 22, 10, 4, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = col + '60';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const sx = 20 + i * 30;
          ctx.beginPath(); ctx.moveTo(sx, h - 20); ctx.lineTo(sx + 8, h - 12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + 8, h - 20); ctx.lineTo(sx, h - 12); ctx.stroke();
        }
      }

      // Flag — bigger and bolder
      ctx.font = '24px sans-serif'; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.shadowColor = col; ctx.shadowBlur = connected ? 4 : 0;
      ctx.fillText(ipStatus.flag || '🌐', 8, h / 2);
      ctx.shadowBlur = 0;

      // IP — bright white with color shadow
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillStyle = connected ? '#f0f0f0' : col + 'ee';
      ctx.shadowColor = col; ctx.shadowBlur = connected ? 3 : 0;
      ctx.fillText(ipStatus.ip, 36, h / 2 - 6);

      // Label + speed — brighter
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = connected ? col + 'cc' : col + 'cc';
      ctx.fillText(ipStatus.label, 36, h / 2 + 14);
      if (ipStatus.speed && connected) {
        ctx.fillStyle = col + '99';
        ctx.fillText(ipStatus.speed, 36 + ctx.measureText(ipStatus.label + '  ').width, h / 2 + 14);
      }

      // ── Rotation countdown (only if rotation is actually active with real timer) ──
      if (connected && ipStatus.rotationSec > 0 && ipStatus.lastRotationTs > 0) {
        const nowSec = Date.now() / 1000;
        const elapsed = nowSec - ipStatus.lastRotationTs;
        const remaining = Math.max(0, Math.ceil(ipStatus.rotationSec - (elapsed % ipStatus.rotationSec)));
        const em = remaining <= 3 ? (0.5 + Math.sin(t * 6) * 0.5) : 1;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = "right";
        ctx.fillStyle = col + (Math.floor(255 * em).toString(16).padStart(2, '0'));
        ctx.fillText(remaining + 's', w - 12, 12);
        ctx.font = '6px "JetBrains Mono", monospace';
        ctx.fillStyle = col + '55';
        ctx.fillText('NEXT ROT', w - 12, 22);
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [ipStatus]);

  return (
    <canvas ref={canvasRef} onClick={fetchIp}
      style={{ width: 260, height: 72, borderRadius: 8, cursor: "pointer" }} />
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
