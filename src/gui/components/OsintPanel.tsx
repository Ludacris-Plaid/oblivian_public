import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL } from "../config";

const API = API_URL;

const TOOLS = [
  { id: "theharvester", label: "theHarvester", icon: "🔍", color: "#00d4ff", category: "Email/Domain", desc: "Scrapes emails, subdomains, hosts from public search engines and APIs." },
  { id: "shodan", label: "Shodan", icon: "📡", color: "#ff4757", category: "IoT/Devices", desc: "Search engine for internet-connected devices. Find open ports, cameras, routers." },
  { id: "google_dork", label: "Google Dork", icon: "🔎", color: "#ffa502", category: "Web", desc: "Advanced Google search operators. Find exposed files, configs, vulnerabilities." },
  { id: "phoneinfoga", label: "PhoneInfoga", icon: "📱", color: "#a855f7", category: "Phone", desc: "Phone number intelligence — carrier, country, line type, and breach data." },
  { id: "holehe", label: "Holehe", icon: "📧", color: "#2ed573", category: "Email", desc: "Check if an email is registered on 120+ online platforms and services." },
  { id: "instaloader", label: "Instaloader", icon: "📸", color: "#ff6ec7", category: "Social", desc: "Instagram profile scraper — followers, following, posts, and metadata." },
  { id: "gitdorker", label: "GitDorker", icon: "🔑", color: "#ffd700", category: "Repos", desc: "Search GitHub for sensitive data — passwords, tokens, keys, configs." },
  { id: "sn0int", label: "sn0int", icon: "🕵️", color: "#00ff88", category: "Recon", desc: "OSINT framework for domain/phone/person recon with modular plugins." },
  { id: "spiderfoot", label: "SpiderFoot", icon: "🕸️", color: "#ff8c00", category: "Full Recon", desc: "Automated OSINT — 200+ modules for deep target reconnaissance." },
  { id: "maltego", label: "Maltego", icon: "🔗", color: "#9966cc", category: "Graph", desc: "Relationship mapping — visualize connections between domains, emails, people, and infrastructure." },
];

const toolIcons: Record<string, string[]> = {
  theharvester: ["🔍", "🌐", "📧", "🖥️", "📋"],
  shodan: ["📡", "🔌", "🖧", "🌍", "⚡"],
  google_dork: ["🔎", "📄", "📁", "🔐", "📂"],
  phoneinfoga: ["📱", "📞", "🌍", "🏢", "📋"],
  holehe: ["📧", "🔍", "✓", "✗", "📊"],
  instaloader: ["📸", "👥", "❤️", "📊", "📷"],
  gitdorker: ["🔑", "🔐", "🔍", "📦", "💻"],
  sn0int: ["🕵️", "🔍", "📡", "🌐", "🔗"],
  spiderfoot: ["🕸️", "🔍", "📊", "🌐", "🧩"],
  maltego: ["🔗", "🔍", "📊", "🔄", "🌐"],
};

const MaltegoGraph: React.FC<{ nodes: any[]; edges: any[] }> = ({ nodes, edges }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 600; const h = 360;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    let t = 0;
    const positions = nodes.map((_, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      return { x: w / 2 + Math.cos(angle) * 120, y: h / 2 + Math.sin(angle) * 100, vx: 0, vy: 0 };
    });
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.5)"; ctx.fillRect(0, 0, w, h);
      edges.forEach((e: any) => {
        if (e.source < positions.length && e.target < positions.length) {
          ctx.beginPath(); ctx.moveTo(positions[e.source].x, positions[e.source].y);
          ctx.lineTo(positions[e.target].x, positions[e.target].y);
          ctx.strokeStyle = "rgba(153,102,204,0.2)"; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(positions[e.target].x, positions[e.target].y);
          ctx.lineTo(
            positions[e.source].x + (positions[e.target].x - positions[e.source].x) * 0.5,
            positions[e.source].y + (positions[e.target].y - positions[e.source].y) * 0.5
          );
          ctx.strokeStyle = "rgba(153,102,204,0.08)"; ctx.lineWidth = 3; ctx.setLineDash([4, 8]);
          const off = (t * 30) % 100; ctx.lineDashOffset = -off; ctx.stroke(); ctx.setLineDash([]);
        }
      });
      nodes.forEach((node: any, i: number) => {
        positions[i].x += Math.sin(t + i) * 0.3;
        positions[i].y += Math.cos(t + i * 1.3) * 0.3;
        const colors = ["#9966cc", "#00d4ff", "#2ed573", "#ff4757", "#ffa502", "#ff6ec7"];
        const col = colors[i % colors.length];
        ctx.beginPath(); ctx.arc(positions[i].x, positions[i].y, 20 + Math.sin(t * 2 + i) * 3, 0, Math.PI * 2);
        ctx.fillStyle = `${col}22`; ctx.fill();
        ctx.beginPath(); ctx.arc(positions[i].x, positions[i].y, 8, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#e0e0e0"; ctx.font = "7px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
        ctx.fillText(node.label.slice(0, 18), positions[i].x, positions[i].y + 22);
      });
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [nodes, edges]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: 360, borderRadius: 8 }} />;
};

const OsintPanel: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState("theharvester");
  const [status, setStatus] = useState<any>({ tools: {}, results: {} });
  const [input, setInput] = useState("");
  const [input2, setInput2] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch(`${API}/api/osint/status`); setStatus(await r.json()); } catch {}
    };
    poll(); const id = setInterval(poll, 5000); return () => clearInterval(id);
  }, []);

  // Canvas visualization
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 500; const h = 160;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
    let t = 0;
    const tool = TOOLS.find(t => t.id === selectedTool);
    const icons = toolIcons[selectedTool] || ["🔍", "🌐"];
    const traces: Array<{ x: number; y: number; alpha: number; size: number; dx: number; dy: number }> = [];
    for (let i = 0; i < 15; i++) {
      traces.push({ x: Math.random() * w, y: Math.random() * h, alpha: Math.random() * 0.5, size: 1 + Math.random() * 3, dx: (Math.random() - 0.5) * 0.5, dy: (Math.random() - 0.5) * 0.5 });
    }

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.3)"; ctx.fillRect(0, 0, w, h);

      // Animated scanning lines
      const scanY = ((t * 80) % h);
      ctx.fillStyle = `${tool?.color || "#00d4ff"}08`;
      ctx.fillRect(0, scanY, w, 4);

      // Floating tool icons
      icons.forEach((icon, i) => {
        const ix = w / 2 + Math.sin(t * 0.5 + i * 1.5) * 80;
        const iy = h / 2 + Math.cos(t * 0.3 + i * 2) * 40;
        ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(icon, ix, iy);
      });

      // Scanning particles
      if (running) {
        traces.forEach(p => {
          p.x += p.dx; p.y += p.dy;
          if (p.x < 0 || p.x > w) p.dx *= -1;
          if (p.y < 0 || p.y > h) p.dy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `${tool?.color || "#00d4ff"}${Math.floor(p.alpha * 255).toString(16).padStart(2, "0")}`;
          ctx.fill();
        });
      }

      // Tool name overlay
      if (running) {
        ctx.save();
        ctx.globalAlpha = 0.06; ctx.font = "bold 36px 'JetBrains Mono', monospace";
        ctx.textAlign = "center"; ctx.fillStyle = tool?.color || "#00d4ff";
        ctx.fillText("SCANNING", w / 2, h / 2);
        ctx.restore();
      }

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id);
  }, [selectedTool, running]);

  const run = async () => {
    if (!input.trim()) return;
    setRunning(selectedTool);
    const tool = selectedTool;
    setOutput("");
    setResults(null);

    try {
      let r: Response;
      const payload: any = {};
      switch (tool) {
        case "theharvester": payload.domain = input; payload.sources = input2 || "all"; r = await fetch(`${API}/api/osint/theharvester`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "shodan": payload.query = input; payload.max_results = parseInt(input2) || 10; r = await fetch(`${API}/api/osint/shodan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "google_dork": payload.dork = input; r = await fetch(`${API}/api/osint/google-dork`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "phoneinfoga": payload.phone = input; r = await fetch(`${API}/api/osint/phoneinfoga`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "holehe": payload.email = input; r = await fetch(`${API}/api/osint/holehe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "instaloader": payload.username = input; r = await fetch(`${API}/api/osint/instaloader`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "gitdorker": payload.query = input; payload.target = input2; r = await fetch(`${API}/api/osint/gitdorker`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "sn0int": payload.target = input; payload.module = input2 || "domain"; r = await fetch(`${API}/api/osint/sn0int`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "spiderfoot": payload.target = input; r = await fetch(`${API}/api/osint/spiderfoot`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
        case "maltego": payload.entity = input; payload.entity_type = input2 || "domain"; r = await fetch(`${API}/api/osint/maltego`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); break;
      }
      const data = await r.json();
      setResults(data);
      setOutput(data.output || data.error || "No output");
    } catch (e: any) {
      setOutput(`Error: ${e.message || "Connection failed"}`);
    }
    setRunning(null);
  };

  const tool = TOOLS.find(t => t.id === selectedTool);
  const toolInfo = status.tools || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      {/* Header */}
      <div style={styles.card}>
        <h2 style={styles.title}><span style={styles.dot} />OSINT Suite</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>{Object.values(status.tools || {}).filter(Boolean).length}/{Object.keys(status.tools || {}).length} tools available</span>
            <span>{status.stats?.total_scans || 0} total scans</span>
          </div>
        </div>
      </div>

      {/* Tool pills */}
      <div style={styles.card}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TOOLS.map((t) => {
            const avail = toolInfo[t.id];
            const isSelected = selectedTool === t.id;
            return (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  ...styles.pill,
                  borderColor: isSelected ? t.color : "rgba(255,255,255,0.06)",
                  background: isSelected ? `${t.color}15` : "rgba(6,6,14,0.4)",
                  color: isSelected ? t.color : "#555",
                }}
                onClick={() => setSelectedTool(t.id)}
              >
                <span style={{ fontSize: 12, lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600 }}>{t.label}</span>
                {avail === false && <span style={{ color: "#ff4757", fontSize: 7, marginLeft: 3 }}>✗</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {/* Input + Controls */}
        <div style={styles.card}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: tool?.color || "#00d4ff", fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{tool?.icon} {tool?.label}</div>
            <div style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{tool?.desc}</div>
            <div style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{tool?.category}</div>
          </div>

          {selectedTool === "instaloader" || selectedTool === "holehe" || selectedTool === "phoneinfoga" || selectedTool === "theharvester" ? (
            <div>
              <input style={styles.input} placeholder={tool?.id === "phoneinfoga" ? "+1234567890" : tool?.id === "instaloader" ? "Instagram username" : tool?.id === "holehe" ? "email@example.com" : "example.com"} value={input} onChange={e => setInput(e.target.value)} />
              {selectedTool === "theharvester" && <input style={{ ...styles.input, marginTop: 4 }} placeholder="Sources (e.g. google, bing, yahoo, linkedin) — default: all" value={input2} onChange={e => setInput2(e.target.value)} />}
            </div>
          ) : selectedTool === "shodan" ? (
            <div>
              <input style={styles.input} placeholder='Search query (e.g. "nginx" "port:443" country:US)' value={input} onChange={e => setInput(e.target.value)} />
              <input style={{ ...styles.input, marginTop: 4 }} type="number" placeholder="Max results (10)" value={input2} onChange={e => setInput2(e.target.value)} />
            </div>
          ) : selectedTool === "google_dork" ? (
            <input style={styles.input} placeholder='Dork (e.g. site:example.com filetype:pdf "confidential")' value={input} onChange={e => setInput(e.target.value)} />
          ) : selectedTool === "gitdorker" ? (
            <div>
              <input style={styles.input} placeholder='Search term (e.g. "api_key" "password" "token")' value={input} onChange={e => setInput(e.target.value)} />
              <input style={{ ...styles.input, marginTop: 4 }} placeholder="Target repo/user (optional)" value={input2} onChange={e => setInput2(e.target.value)} />
            </div>
          ) : selectedTool === "sn0int" ? (
            <div>
              <input style={styles.input} placeholder="Target (domain, IP, or phone)" value={input} onChange={e => setInput(e.target.value)} />
              <input style={{ ...styles.input, marginTop: 4 }} placeholder="Module (domain, ip, phone) — default: domain" value={input2} onChange={e => setInput2(e.target.value)} />
            </div>
          ) : selectedTool === "spiderfoot" || selectedTool === "maltego" ? (
            <div>
              <input style={styles.input} placeholder={selectedTool === "spiderfoot" ? "Target domain/IP" : "Entity (domain, email, name, IP)"} value={input} onChange={e => setInput(e.target.value)} />
              {selectedTool === "maltego" && <input style={{ ...styles.input, marginTop: 4 }} placeholder="Entity type (domain|email|name|ip)" value={input2} onChange={e => setInput2(e.target.value)} />}
            </div>
          ) : null}

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ ...styles.runBtn, borderColor: `${tool?.color}30`, opacity: running ? 0.5 : 1, marginTop: 8 }}
            onClick={run} disabled={!!running}
          >
            {running === selectedTool ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>◌</motion.span>
            ) : null}
            <span style={{ color: tool?.color || "#00d4ff", fontSize: 10, fontWeight: 600 }}>{running === selectedTool ? "RUNNING..." : "RUN"}</span>
          </motion.button>

          {/* Canvas visual */}
          <canvas ref={canvasRef} style={{ width: "100%", height: 160, borderRadius: 6, marginTop: 8 }} />
        </div>

        {/* Results */}
        <div style={{ ...styles.card, display: "flex", flexDirection: "column" }}>
          <h3 style={{ color: "#aaa", fontSize: 12, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", margin: "0 0 8px" }}>
            <span style={{ fontSize: 8, color: "#2ed573" }}>● </span>Results
          </h3>

          {selectedTool === "maltego" && results?.nodes ? (
            <MaltegoGraph nodes={results.nodes} edges={results.edges || []} />
          ) : selectedTool === "spiderfoot" && results?.findings ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              {results.findings.map((f: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: "#ff8c00" }}>{f.module}</span>
                  <span style={{ color: "#888" }}>{f.count} findings</span>
                </div>
              ))}
              <pre style={styles.outputBox}>{output}</pre>
            </div>
          ) : results?.hosts || results?.emails ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              {results.hosts?.length > 0 && <div style={{ color: "#00d4ff", fontSize: 10, padding: "4px 0" }}>Hosts ({results.hosts.length}):</div>}
              {results.hosts?.slice(0, 15).map((h: string, i: number) => <div key={i} style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px" }}>{h}</div>)}
              {results.emails?.length > 0 && <div style={{ color: "#2ed573", fontSize: 10, padding: "8px 0 4px" }}>Emails ({results.emails.length}):</div>}
              {results.emails?.slice(0, 15).map((e: string, i: number) => <div key={i} style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px" }}>{e}</div>)}
              <pre style={styles.outputBox}>{output}</pre>
            </div>
          ) : results?.matches ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              <div style={{ color: "#ff4757", fontSize: 10, padding: "4px 0" }}>Total: {results.total} matches</div>
              {results.matches.map((m: any, i: number) => (
                <div key={i} style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>
                  <span style={{ color: "#ff4757" }}>{m.ip}:{m.port}</span>
                  <span style={{ color: "#555" }}> — {m.org || m.city || m.country || ""}</span>
                </div>
              ))}
            </div>
          ) : results?.accounts_found ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              <div style={{ color: "#2ed573", fontSize: 10, padding: "4px 0" }}>Accounts found: {results.accounts_found.length}</div>
              {results.accounts_found.map((a: string, i: number) => <div key={i} style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "2px 8px" }}>{a}</div>)}
              <pre style={styles.outputBox}>{output}</pre>
            </div>
          ) : results?.followers ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                {["followers", "following", "posts"].map(k => (
                  <div key={k} style={{ textAlign: "center", padding: "10px", background: "rgba(255,110,199,0.06)", borderRadius: 6 }}>
                    <div style={{ color: "#ff6ec7", fontSize: 18, fontWeight: 700 }}>{results[k]}</div>
                    <div style={{ color: "#555", fontSize: 8, textTransform: "uppercase" }}>{k}</div>
                  </div>
                ))}
              </div>
              <pre style={styles.outputBox}>{output}</pre>
            </div>
          ) : results?.carrier ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              {["carrier", "country", "line_type"].map(k => (
                <div key={k} style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: "#a855f7" }}>{k}</span>
                  <span style={{ color: "#888" }}>{results[k]}</span>
                </div>
              ))}
              <pre style={styles.outputBox}>{output}</pre>
            </div>
          ) : results?.results && selectedTool === "google_dork" ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              {results.results.map((r: any, i: number) => (
                <div key={i} style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 9 }}>
                  <div style={{ color: "#ffa502", fontFamily: "'JetBrains Mono', monospace" }}>{r.title}</div>
                  <div style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>{r.url}</div>
                </div>
              ))}
            </div>
          ) : results?.findings ? (
            <div style={{ flex: 1, overflow: "auto" }}>
              {results.findings.map((f: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: "#ff8c00" }}>{f.module}</span>
                  <span style={{ color: "#888" }}>{f.count} findings</span>
                </div>
              ))}
              <pre style={styles.outputBox}>{output}</pre>
            </div>
          ) : (
            <pre style={{ ...styles.outputBox, flex: 1 }}>{output || "Run a tool to see results..."}</pre>
          )}
        </div>
      </div>

      {/* Recent results feed */}
      <div style={styles.card}>
        <h3 style={{ color: "#aaa", fontSize: 12, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", margin: "0 0 8px" }}>
          <span style={{ fontSize: 8, color: "#00d4ff" }}>● </span>Recent Results
        </h3>
        <div style={{ maxHeight: 140, overflowY: "auto" }}>
          {Object.entries(status.results || {}).filter(([_, v]) => (v as any[]).length > 0).length === 0 ? (
            <div style={{ color: "#333", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", padding: "12px", textAlign: "center" }}>No scans yet. Choose a tool and run a scan.</div>
          ) : (
            Object.entries(status.results || {}).map(([toolName, toolResults]) => {
              const t = TOOLS.find(t => t.id === toolName);
              if (!(toolResults as any[]).length) return null;
              return (toolResults as any[]).slice(-3).map((r, i) => (
                <div key={`${toolName}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ fontSize: 12 }}>{t?.icon || "🔍"}</span>
                  <span style={{ color: t?.color || "#888", fontWeight: 600 }}>{toolName}</span>
                  <span style={{ color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.domain || r.query || r.email || r.phone || r.username || r.dork || r.target || r.entity || r.target || ""}</span>
                  <span style={{ color: "#333" }}>{r.status}</span>
                </div>
              ));
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "12px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  title: { margin: 0, color: "#00d4ff", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)" },
  dot: { fontSize: 8, color: "#2ed573" },
  pill: { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, border: "1px solid", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s", outline: "none" },
  input: { width: "100%", padding: "8px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none", boxSizing: "border-box" },
  runBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 6, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", width: "100%", outline: "none" },
  outputBox: { margin: 0, padding: "8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#888", whiteSpace: "pre-wrap", lineHeight: 1.4 },
};

export default OsintPanel;
