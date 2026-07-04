import React, { useEffect, useRef } from "react";

interface ToolVisualProps {
  tool: string;
  running: boolean;
  lastResult: any;
}

const COLORS: Record<string, string> = {
  scanner: "#00ff88",
  "brute-force": "#ff4757",
  exploitation: "#a855f7",
  cracking: "#ffd700",
  poisoning: "#ff6ec7",
};

const TOOL_COLORS: Record<string, string> = {
  nmap: "#00ff88",
  hydra: "#ff4757",
  sqlmap: "#a855f7",
  hashcat: "#ffd700",
  responder: "#ff6ec7",
  wpscan: "#00d4ff",
  ffuf: "#88ff44",
  impacket: "#ff2266",
  john: "#ffcc00",
  searchsploit: "#ff8800",
};

const ToolVisual: React.FC<ToolVisualProps> = ({ tool, running, lastResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 400; const h = 200;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    let t = 0;

    const draw = () => {
      t += 0.03;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,1)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.015)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      if (tool === "nmap") {
        const cx = 120; const cy = 100;
        const sweep = (t * 2) % (Math.PI * 2);
        const grad = ctx.createConicGradient(sweep - 0.3, cx, cy);
        grad.addColorStop(0, "rgba(0,255,136,0.3)");
        grad.addColorStop(0.5, "rgba(0,255,136,0.02)");
        grad.addColorStop(1, "rgba(0,255,136,0.01)");
        ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = "rgba(0,255,136,0.2)"; ctx.lineWidth = 1;
        for (let r = 15; r <= 60; r += 15) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 60, sweep - 0.03, sweep + 0.03); ctx.lineTo(cx, cy);
        ctx.fillStyle = "rgba(0,255,136,0.5)"; ctx.fill();

        for (let i = 0; i < 6; i++) {
          const hx = 240 + Math.cos(i * 1.1) * 45;
          const hy = 100 + Math.sin(i * 1.1) * 45;
          const pulse = running ? 1 + Math.sin(t * 4 + i) * 0.3 : 1;
          ctx.beginPath(); ctx.arc(hx, hy, 4 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = running ? TOOL_COLORS[tool] : "#333"; ctx.fill();
          if (running) {
            ctx.fillStyle = TOOL_COLORS[tool]; ctx.font = "7px monospace"; ctx.fillText("" + (8000 + i), hx + 8, hy + 4);
            ctx.setLineDash([2, 4]); ctx.lineDashOffset = -t * 30;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy);
            ctx.strokeStyle = "rgba(0,255,136,0.1)"; ctx.lineWidth = 1; ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#00ff88"; ctx.font = "bold 11px JetBrains Mono, monospace";
          ctx.fillText("SCAN COMPLETE", 240, 40);
          ctx.fillStyle = "#555"; ctx.font = "9px JetBrains Mono, monospace";
          ctx.fillText(lastResult.duration_ms + "ms", 240, 55);
          const ports = [22, 80, 443, 3306, 8080];
          const svcs = ["ssh", "http", "https", "mysql", "http-alt"];
          ports.forEach((p, i) => {
            ctx.fillStyle = "#00ff88"; ctx.font = "bold 10px JetBrains Mono, monospace";
            ctx.fillText(p + "/tcp", 240, 80 + i * 16);
            ctx.fillStyle = "#444"; ctx.font = "8px JetBrains Mono, monospace";
            ctx.fillText(svcs[i], 325, 80 + i * 16);
            ctx.fillStyle = "#333"; ctx.font = "8px JetBrains Mono, monospace";
            ctx.fillText("open", 390, 80 + i * 16);
          });
        }
      }

      else if (tool === "hydra") {
        const tx = 320; const ty = 100;
        ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2);
        ctx.fillStyle = running ? "rgba(255,71,87,0.3)" : "#333"; ctx.fill();
        ctx.textAlign = "center";
        if (running) {
          for (let i = 0; i < 20; i++) {
            const prog = ((t * 3 + i * 0.5) % 100) / 100;
            const px = -20 + (tx + 20) * prog;
            const py = ty + Math.sin(prog * Math.PI * 3) * 10;
            ctx.fillStyle = "rgba(255,71,87," + (0.3 + prog * 0.4) + ")";
            ctx.font = "9px JetBrains Mono, monospace";
            ctx.fillText("pass" + Math.floor(Math.random() * 9999), px, py);
          }
        }
        ctx.textAlign = "left";
        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#ff4757"; ctx.font = "bold 11px JetBrains Mono, monospace";
          ctx.fillText("CREDENTIALS FOUND", 40, 40);
          ctx.fillStyle = "#555"; ctx.font = "10px JetBrains Mono, monospace";
          ctx.fillText("admin:password123", 40, 60);
          ctx.fillText("Attempts: 12,847", 40, 75);
          ctx.fillText("Duration: " + (lastResult.duration_ms || "0") + "ms", 40, 90);
        }
      }

      else if (tool === "sqlmap") {
        const dbX = 50; const dbY = 40;
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 6; col++) {
            const x = dbX + col * 55; const y = dbY + row * 30;
            ctx.fillStyle = running && Math.random() > 0.7 ? "rgba(168,85,247," + (0.3 + Math.random() * 0.4) + ")" : "rgba(168,85,247,0.05)";
            ctx.fillRect(x + 2, y + 2, 48, 22);
            ctx.strokeStyle = running ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.05)";
            ctx.strokeRect(x + 2, y + 2, 48, 22);
          }
        }
        if (running) {
          const hx = dbX + ((Math.floor(t * 5) % 6) * 55) + 4;
          const hy = dbY + ((Math.floor(t * 3) % 4) * 30) + 4;
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(hx, hy, 44, 18);
        }
        ctx.fillStyle = TOOL_COLORS[tool]; ctx.font = "bold 10px JetBrains Mono, monospace";
        ctx.fillText(running ? "TESTING PARAMETERS..." : "SQLMAP READY", 40, 20);
        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#a855f7"; ctx.font = "bold 10px JetBrains Mono, monospace";
          ctx.fillText("DATABASES FOUND", 40, 170);
          ctx.fillStyle = "#555"; ctx.font = "9px JetBrains Mono, monospace";
          const dbs = ["mysql", "information_schema", "wordpress", "users"];
          for (let i = 0; i < 4; i++) ctx.fillText(dbs[i], 40, 185 + i * 14);
        }
      }

      else if (tool === "hashcat") {
        const hx = 50; const hy = h / 2;
        ctx.fillStyle = TOOL_COLORS[tool]; ctx.font = "bold 12px JetBrains Mono, monospace";
        ctx.fillText("$6$salt$Gx9k...3d2f", hx, hy);
        for (let i = 0; i < 15; i++) {
          const x = hx + 20 + i * 22; const y = hy + 20;
          const ch = running ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : "\u2014";
          ctx.fillStyle = running ? "rgba(255,215,0," + (0.4 + Math.random() * 0.4) + ")" : "#333";
          ctx.font = "bold 14px JetBrains Mono, monospace"; ctx.fillText(ch, x, y);
        }
        if (running) {
          const prog = ((t * 10) % 100).toFixed(1);
          ctx.fillStyle = TOOL_COLORS[tool]; ctx.font = "10px JetBrains Mono, monospace";
          ctx.fillText(prog + "% complete", hx, hy + 45);
          ctx.strokeStyle = "rgba(255,215,0,0.2)"; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(hx, hy + 55); ctx.lineTo(hx + (parseFloat(prog) / 100) * 300, hy + 55); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(hx + (parseFloat(prog) / 100) * 300, hy + 55); ctx.lineTo(hx + 300, hy + 55); ctx.stroke();
        }
        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#ffd700"; ctx.font = "bold 12px JetBrains Mono, monospace";
          ctx.fillText("HASH CRACKED!", 40, 20);
          ctx.fillStyle = "#555"; ctx.font = "10px JetBrains Mono, monospace";
          ctx.fillText("password: hunter2", 40, 38);
          ctx.fillText("Speed: 12.4 MH/s", 40, 53);
          ctx.fillText("Rule: rockyou.txt", 40, 68);
        }
      }

      else if (tool === "responder") {
        for (let i = 0; i < 15; i++) {
          const px = 50 + Math.random() * 300;
          const py = 20 + Math.random() * 160;
          if (running) {
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,110,199," + (0.3 + Math.random() * 0.4) + ")"; ctx.fill();
          }
        }
        if (running) {
          ctx.fillStyle = "rgba(255,110,199,0.08)";
          ctx.font = "bold 36px JetBrains Mono, monospace"; ctx.textAlign = "center";
          ctx.fillText("LISTENING", 200, 110);
        }
        ctx.textAlign = "left";
        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#ff6ec7"; ctx.font = "bold 11px JetBrains Mono, monospace";
          ctx.fillText("HASHES CAPTURED", 40, 40);
          ctx.fillStyle = "#555"; ctx.font = "9px JetBrains Mono, monospace";
          ctx.fillText("admin::NTLM:aad3b435...", 40, 60);
          ctx.fillText("user::NTLM:8846f7ea...", 40, 75);
          ctx.fillText("john::NTLM:31d6cfe0...", 40, 90);
          ctx.fillStyle = "#ff6ec7"; ctx.font = "bold 9px JetBrains Mono, monospace";
          ctx.fillText("3 hashes captured", 40, 115);
        }
      }

      else if (tool === "metasploit") {
        // Chain of exploit stages
        const stages = ["SEARCH", "MODULE", "PAYLOAD", "EXPLOIT", "SESSION"];
        stages.forEach((s, i) => {
          const x = 30 + i * 70; const y = 100;
          const done = running ? i < Math.floor(t * 0.5) % 5 : lastResult && lastResult.status === "completed";
          ctx.beginPath(); ctx.arc(x, y, done ? 8 : 5, 0, Math.PI * 2);
          ctx.fillStyle = done ? TOOL_COLORS[tool] : "#333"; ctx.fill();
          ctx.fillStyle = done ? TOOL_COLORS[tool] : "#444";
          ctx.font = "bold 7px JetBrains Mono, monospace"; ctx.textAlign = "center";
          ctx.fillText(s, x, y + 14);
          if (done && i < 4 && (running ? i < Math.floor(t * 0.5) % 5 - 1 : true)) {
            ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 50, y);
            ctx.strokeStyle = "rgba(168,85,247,0.4)"; ctx.lineWidth = 2; ctx.stroke();
          }
        });
        ctx.textAlign = "left";
        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#a855f7"; ctx.font = "bold 11px JetBrains Mono, monospace";
          ctx.fillText("SESSION OPENED", 40, 40);
          ctx.fillStyle = "#555"; ctx.font = "10px JetBrains Mono, monospace";
          ctx.fillText("meterpreter > shell", 40, 58);
          ctx.fillText("Target: " + (lastResult.target || "10.0.0.5"), 40, 73);
        }
      }

      else if (tool === "wpscan") {
        // WordPress site visualization
        const siteX = 80; const siteY = 50;
        ctx.fillStyle = running ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.03)";
        ctx.fillRect(siteX, siteY, 140, 90);
        ctx.strokeStyle = "rgba(0,255,136,0.2)"; ctx.lineWidth = 1;
        ctx.strokeRect(siteX, siteY, 140, 90);
        ctx.fillStyle = "#00ff88"; ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.fillText("wordpress", siteX + 15, siteY + 25);
        ctx.fillStyle = "#555"; ctx.font = "7px JetBrains Mono, monospace";
        ctx.fillText("v6.2", siteX + 15, siteY + 38);

        // Plugin boxes appearing during scan
        const plugins = ["wp-forms", "woocommerce", "yoast-seo", "elementor", "jetpack", "akismet", "contact-form-7"];
        plugins.forEach((pl, i) => {
          const px = 260 + (i % 2) * 70; const py = 40 + Math.floor(i / 2) * 28;
          const visible = running ? Math.random() > 0.6 : lastResult && lastResult.status === "completed";
          if (visible) {
            ctx.fillStyle = "rgba(0,255,136,0.05)";
            ctx.fillRect(px, py, 65, 20);
            ctx.fillStyle = "#00ff88"; ctx.font = "8px JetBrains Mono, monospace";
            ctx.fillText(pl, px + 4, py + 13);
            if (Math.random() > 0.8 && running) {
              ctx.fillStyle = "rgba(255,215,0,0.3)";
              ctx.fillRect(px, py, 65, 20);
              ctx.fillStyle = "#ffd700"; ctx.font = "bold 8px JetBrains Mono, monospace";
              ctx.fillText("VULN!", px + 4, py + 13);
            }
          }
        });

        if (!running && lastResult && lastResult.status === "completed") {
          ctx.fillStyle = "#ffd700"; ctx.font = "bold 10px JetBrains Mono, monospace";
          ctx.fillText("3 VULNERABILITIES FOUND", 40, 25);
          ctx.fillStyle = "#555"; ctx.font = "9px JetBrains Mono, monospace";
          ctx.fillText("CVE-2023-1234 (SQLi in wp-forms)", 40, 40);
          ctx.fillText("CVE-2024-5678 (XSS in theme)", 40, 55);
          ctx.fillText("Outdated WP Core 6.2 -> 6.5", 40, 70);
        }

        // Scanning beams
        if (running) {
          for (let i = 0; i < 3; i++) {
            const bx = siteX + (t * 50 + i * 50) % 140;
            const by = siteY + 10 + Math.floor((t * 30 + i) % 90);
            ctx.fillStyle = "rgba(0,255,136,0.3)";
            ctx.fillRect(bx, by, 1, 1);
          }
        }
      }


      else if (tool === 'ffuf') {
        const baseUrl = 'http://TARGET';
        const paths = ['admin', 'login', 'api', 'uploads', 'backup', 'config', 'wp-admin', '.git', '.env', 'robots.txt', 'sitemap.xml', 'dashboard', 'shell', 'phpmyadmin', 'test'];
        let foundCount = 0;
        paths.forEach((p, i) => {
          const x = 30 + ((i * 47) % 320);
          const y = 30 + Math.floor(i / 6) * 28;
          const found = running ? Math.random() < 0.15 : lastResult && lastResult.status === 'completed' && Math.random() < 0.4;
          ctx.fillStyle = found ? 'rgba(0,255,136,0.15)' : 'rgba(0,255,136,0.03)';
          ctx.fillRect(x, y, 42, 20);
          ctx.strokeStyle = found ? 'rgba(0,255,136,0.3)' : 'rgba(0,255,136,0.08)';
          ctx.strokeRect(x, y, 42, 20);
          ctx.fillStyle = found ? '#00ff88' : '#555';
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillText('/' + p, x + 3, y + 13);
          if (found) {
            ctx.fillStyle = '#00ff88'; ctx.font = '7px JetBrains Mono, monospace';
            ctx.fillText('200', x + 30, y + 13);
            foundCount++;
          }
        });
        ctx.fillStyle = '#00ff88'; ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(running ? 'FUZZING: ' + paths[Math.floor(t * 2) % paths.length] : (lastResult && lastResult.status === 'completed' ? foundCount + ' DIRS FOUND' : 'FFUF READY'), 30, 15);
      }

      else if (tool === 'impacket') {
        const stages = ['SAM', 'SECURITY', 'SYSTEM', 'NTDS', 'CREDS'];
        const stage = running ? stages[Math.floor(t * 2) % stages.length] : (lastResult && lastResult.status === 'completed' ? 'DONE' : '');
        stages.forEach((s, i) => {
          const x = 60 + i * 58; const y = 100;
          const active = running && stages.indexOf(stage) >= i;
          ctx.fillStyle = active ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.03)';
          ctx.fillRect(x, y, 48, 24);
          ctx.strokeStyle = active ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.1)';
          ctx.strokeRect(x, y, 48, 24);
          ctx.fillStyle = active ? '#a855f7' : '#444';
          ctx.font = 'bold 9px JetBrains Mono, monospace'; ctx.textAlign = 'center';
          ctx.fillText(s, x + 24, y + 15);
        });
        ctx.textAlign = 'left';
        if (!running && lastResult && lastResult.status === 'completed') {
          ctx.fillStyle = '#a855f7'; ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.fillText('CREDENTIALS DUMPED', 40, 40);
          ctx.fillStyle = '#555'; ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText('Administrator:500:aad3b...:8846f...:::', 40, 58);
          ctx.fillText('hunter@@DOMAIN:netntlm', 40, 72);
        }
      }

      else if (tool === 'john') {
        const hashX = 50; const hy = h / 2;
        ctx.fillStyle = TOOL_COLORS[tool]; ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillText('a/bin/bash5...', hashX, hy);
        for (let i = 0; i < 12; i++) {
          const x = hashX + 20 + i * 26; const y = hy + 20;
          const ch = running ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : '-';
          ctx.fillStyle = running ? 'rgba(255,215,0,' + (0.4 + Math.random() * 0.4) + ')' : '#333';
          ctx.font = 'bold 13px JetBrains Mono, monospace'; ctx.fillText(ch, x, y);
        }
        if (running) {
          const pct = Math.min(95, (t * 20) % 100);
          ctx.fillStyle = TOOL_COLORS[tool]; ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(pct.toFixed(0) + '% done | 45.2K c/s', hashX, hy + 45);
          ctx.strokeStyle = 'rgba(255,215,0,0.2)'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(hashX, hy + 55); ctx.lineTo(hashX + (pct / 100) * 300, hy + 55); ctx.stroke();
        }
        if (!running && lastResult && lastResult.status === 'completed') {
          ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px JetBrains Mono, monospace';
          ctx.fillText('CRACKED: p@ssw0rd!', 40, 20);
        }
      }

      else if (tool === 'searchsploit') {
        const exploits: string[] = ['Apache 2.4 RCE (CVE-2021-41773)', 'nginx traversal (CVE-2021-23017)', 'ProFTPD 1.3.5 RCE', 'Exim 4.93 LPE', 'vsftpd 2.3.4 backdoor', 'OpenSSL Heartbleed', 'Shellshock Bash RCE', 'SambaCry 7.0.0'];
        const filtered = running ? exploits.filter(() => Math.random() > 0.3) : (lastResult && lastResult.status === 'completed' ? exploits.slice(0, 6) : exploits.slice(0, 2));
        filtered.forEach((e, i) => {
          const y = 30 + i * 22;
          const alpha = running && i < 3 ? 0.3 : 0.05;
          ctx.fillStyle = 'rgba(255,215,0,' + alpha + ')';
          ctx.fillRect(10, y, 380, 18);
          ctx.fillStyle = running && i < 3 ? '#ffd700' : '#555';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(e.slice(0, 42), 15, y + 12);
        });
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(running ? 'SEARCHING... ' + exploits[Math.floor(t * 5) % exploits.length].slice(0, 20) : 'Exploit-DB Ready', 10, 15);
        if (!running && lastResult && lastResult.status === 'completed') {
          ctx.fillStyle = '#ffd700'; ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.fillText(filtered.length + ' EXPLOITS FOUND', 10, 190);
        }
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [tool, running, lastResult]);

  return (
    <canvas
      key={tool}
      ref={canvasRef}
      style={{
        width: "100%",
        height: 200,
        borderRadius: 8,
        background: "rgba(6,6,14,0.5)",
      }}
    />
  );
};

export default ToolVisual;
