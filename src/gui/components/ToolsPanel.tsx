import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlitchNumber from "./GlitchNumber";
import ToolVisual from "./ToolVisual";
import { API_URL } from "../config";

const API = "http://localhost:8000";

interface Tool {
  name: string; description: string; category: string; dangerous: boolean; available: boolean;
}

const COLORS: Record<string, string> = { scanner: "#00ff88", "brute-force": "#ff4757", exploitation: "#a855f7", cracking: "#ffd700", poisoning: "#ff6ec7" };
const TOOL_COLORS: Record<string, string> = { nmap: "#00ff88", hydra: "#ff4757", sqlmap: "#a855f7", hashcat: "#ffd700", responder: "#ff6ec7", metasploit: "#ff8c00", wpscan: "#00d4ff", ffuf: "#88ff44", impacket: "#ff2266", john: "#ffcc00", searchsploit: "#ff8800" };
const CAT_ICONS: Record<string, string> = { scanner: "🔍", "brute-force": "🔑", exploitation: "💥", cracking: "⚡", poisoning: "💀" };

const ToolsPanel: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<string>("nmap");
  const [toolArgs, setToolArgs] = useState<Record<string, { target: string; args: string }>>({
    nmap: { target: "127.0.0.1", args: "-sV -p 1-1000" },
    hydra: { target: "", args: "-l admin -P /usr/share/wordlists/rockyou.txt ssh://TARGET" },
    sqlmap: { target: "", args: '--url "TARGET" --level=1' },
    hashcat: { target: "", args: '-m 0 HASH_FILE /usr/share/wordlists/rockyou.txt' },
    responder: { target: "eth0", args: "-I TARGET" },
    metasploit: { target: "", args: '-q -x "search auxiliary; exit"' },
    wpscan: { target: "", args: '--url TARGET --enumerate u,p,t' },
    ffuf: { target: "", args: '-u http://TARGET/FUZZ -w /usr/share/wordlists/dirb/common.txt' },
    impacket: { target: "", args: 'TARGET -just-dc -outputfile dump.txt' },
    john: { target: "", args: '--wordlist=/usr/share/wordlists/rockyou.txt HASH_FILE' },
    searchsploit: { target: "apache", args: '-w apache' },
    nikto: { target: "", args: '-h TARGET -Tuning 1' },
    gobuster: { target: "", args: 'dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt' },
    enum4linux: { target: "", args: 'TARGET' },
    smbmap: { target: "", args: '-H TARGET' },
    whatweb: { target: "", args: 'TARGET' },
  });
  const [output, setOutput] = useState<string>("");
  const [totalRuns, setTotalRuns] = useState(0);

  useEffect(() => {
    fetch(API + '/api/tools/status').then(r => r.json()).then(d => { setTools(d.tools || []); setTotalRuns(d.total_runs || 0); }).catch(() => {});
  }, []);

  const pollHistory = async () => {
    try {
      const r = await fetch(API + '/api/tools/history?limit=30');
      const d = await r.json();
      const newHistory = d.history || [];
      const prevLen = history.length;
      setHistory(newHistory);
      setTotalRuns(newHistory.length || 0);
      // Auto-focus on AI-triggered tool executions
      if (newHistory.length > prevLen) {
        const latest = newHistory[newHistory.length - 1];
        if (latest && latest.triggered_by === 'ai') {
          setSelectedTool(latest.tool);
          setToolArgs(prev => ({ ...prev, [latest.tool]: { target: latest.target || '', args: latest.args || '' } }));
          setOutput(latest.output || latest.summary || '');
          setLastResult(latest);
        }
      }
    } catch {}
  };
  useEffect(() => { pollHistory(); const id = setInterval(pollHistory, 3000); return () => clearInterval(id); }, []);

  const run = async () => {
    const cfg = toolArgs[selectedTool];
    const args = cfg.args.includes("TARGET")
      ? cfg.args.split(" ").map(a => a === "TARGET" ? cfg.target : a).filter(Boolean)
      : [...shlexSplit(cfg.args), ...(cfg.target ? [cfg.target] : [])];
    setRunning(Date.now());
    setOutput("Running...\n");
    try {
      const r = await fetch(API + '/api/tools/' + selectedTool + '/run', {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args, target: cfg.target }),
      });
      const d = await r.json();
      setOutput(d.output || d.summary || JSON.stringify(d, null, 2));
      setLastResult(d);
      pollHistory();
    } catch (e) { setOutput("Connection error"); }
    setRunning(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}><span style={styles.dot}>&#9679;</span>Hacking Tools</h2>
          <motion.div style={{ ...styles.badge, background: "rgba(0,255,136,0.1)", color: "#00ff88", borderColor: "rgba(0,255,136,0.2)" }}
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            {totalRuns} RUNS
          </motion.div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {tools.map(t => (
            <motion.button key={t.name} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedTool(t.name)}
              style={{
                ...styles.pill, borderColor: selectedTool === t.name ? (TOOL_COLORS[t.name] || "#00d4ff") : "rgba(255,255,255,0.04)",
                background: selectedTool === t.name ? (TOOL_COLORS[t.name] || "#00d4ff") + "15" : "rgba(6,6,14,0.4)",
                color: selectedTool === t.name ? TOOL_COLORS[t.name] || "#00d4ff" : "#555",
              }}>
              <span style={{ fontSize: 12 }}>{CAT_ICONS[t.category] || "🔧"}</span>
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{t.name}</span>
              {!t.available && <span style={{ color: "#ff4757", fontSize: 8 }}>❌</span>}
              {t.dangerous && <span style={{ color: "#ff4757", fontSize: 8 }}>⚠</span>}
            </motion.button>
          ))}
        </div>

        {selectedTool && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input style={styles.input}
                    placeholder={selectedTool === "responder" ? "Interface (e.g. eth0)" : selectedTool === "searchsploit" ? "Search term or CVE" : "Target"}
                    value={toolArgs[selectedTool]?.target || ""}
                    onChange={e => setToolArgs(prev => ({ ...prev, [selectedTool]: { ...prev[selectedTool], target: e.target.value } }))} />
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={run} disabled={running !== null}
                    style={{ ...styles.runBtn, opacity: running ? 0.5 : 1, background: TOOL_COLORS[selectedTool] || "#00ff88" }}>
                    {running ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 16 }}>⟳</motion.span> : "RUN"}
                  </motion.button>
                </div>
                <input style={{ ...styles.input, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                  placeholder="Additional arguments (flags, options)"
                  value={toolArgs[selectedTool]?.args || ""}
                  onChange={e => setToolArgs(prev => ({ ...prev, [selectedTool]: { ...prev[selectedTool], args: e.target.value } }))} />
                <div style={{ color: "#444", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginTop: 6, lineHeight: 1.6 }}>
                  {tools.find(t => t.name === selectedTool)?.description}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {PRESETS[selectedTool]?.map((p: any) => (
                    <motion.button key={p.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setToolArgs(prev => ({ ...prev, [selectedTool]: { ...prev[selectedTool], args: p.args } }))}
                      style={{ padding: "4px 10px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 6, color: "#00d4ff", fontSize: 9, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              <ToolVisual tool={selectedTool} running={running !== null} lastResult={lastResult} />
              <div style={{ background: "rgba(6,6,14,0.6)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", maxHeight: 260, overflowY: "auto" }}>
                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#00ff88", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {output || "Run a tool to see output here"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />Execution History</h3>
        <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {history.slice().reverse().map((h: any) => (
            <motion.div key={h.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} style={styles.histRow}>
              <span style={{ color: h.tool === selectedTool ? "#00d4ff" : "#444", fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 70 }}>{h.tool}</span>
              <span style={{ color: h.status === "completed" ? "#00ff88" : h.status === "running" ? "#ffd700" : "#ff4757", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", minWidth: 55 }}>
                {h.status === "completed" ? "✓ done" : h.status === "failed" ? "✗ fail" : h.status}
              </span>
              <span style={{ color: "#888", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.summary?.slice(0, 80) || h.args?.slice(0, 60)}</span>
              <span style={{ color: "#ff6ec7", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 50 }}>{h.duration_ms}ms</span>
              <span style={{ color: "#333", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", minWidth: 70, textAlign: "right" }}>{h.started_at?.slice(11, 19)}</span>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setOutput(h.output)}
                style={{ color: "#555", background: "none", border: "none", fontSize: 9, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>view</motion.button>
            </motion.div>
          ))}
          {history.length === 0 && <p style={{ color: "#333", fontSize: 10, textAlign: "center", padding: 20 }}>No tool executions yet — select a tool and run it</p>}
        </div>
      </div>
    </motion.div>
  );
};

function shlexSplit(s: string): string[] {
  const parts: string[] = []; let cur = ""; let inQ = false; let qCh = "";
  for (const ch of s) {
    if (inQ) { if (ch === qCh) { inQ = false; continue } cur += ch }
    else if (ch === '"' || ch === "'") { inQ = true; qCh = ch }
    else if (ch === " ") { if (cur) { parts.push(cur); cur = "" } }
    else { cur += ch }
  }
  if (cur) parts.push(cur);
  return parts;
}

const PRESETS: Record<string, { label: string; args: string }[]> = {
  nmap: [
    { label: "Quick Scan", args: "-sV -p 1-1000" },
    { label: "Full Scan", args: "-sV -sC -p-" },
    { label: "Stealth", args: "-sS -Pn -T2" },
    { label: "Vuln Scan", args: "-sV --script=vuln" },
    { label: "OS Detect", args: "-O --osscan-guess" },
  ],
  hydra: [
    { label: "SSH brute", args: "-l admin -P /usr/share/wordlists/rockyou.txt ssh://TARGET" },
    { label: "FTP brute", args: "-l admin -P /usr/share/wordlists/rockyou.txt ftp://TARGET" },
    { label: "WordPress", args: "-l admin -P /usr/share/wordlists/rockyou.txt TARGET http-post-form \\'/wp-login.php:log=^USER^&pwd=^PASS^:Invalid\\'" },
    { label: "RDP", args: "-l administrator -P /usr/share/wordlists/rockyou.txt rdp://TARGET" },
    { label: "MySQL", args: "-l root -P /usr/share/wordlists/rockyou.txt mysql://TARGET" },
  ],
  sqlmap: [
    { label: "Basic scan", args: '--url "TARGET" --level=1' },
    { label: "Deep scan", args: '--url "TARGET" --level=3 --risk=2' },
    { label: "DB dump", args: '--url "TARGET" --dbs --batch' },
    { label: "os-shell", args: '--url "TARGET" --os-shell' },
  ],
  hashcat: [
    { label: "MD5", args: "-m 0 HASH_FILE /usr/share/wordlists/rockyou.txt" },
    { label: "SHA256", args: "-m 1400 HASH_FILE /usr/share/wordlists/rockyou.txt" },
    { label: "NTLM", args: "-m 1000 HASH_FILE /usr/share/wordlists/rockyou.txt" },
    { label: "bcrypt", args: "-m 3200 HASH_FILE /usr/share/wordlists/rockyou.txt" },
  ],
  responder: [
    { label: "Listen eth0", args: "-I eth0" },
    { label: "Analyze only", args: "-A" },
    { label: "WPAD proxy", args: "-w" },
  ],
  metasploit: [
    { label: "Search", args: '-q -x "search auxiliary/scanner; exit"' },
    { label: "Scan SMB", args: '-q -x "use auxiliary/scanner/smb/smb_version; set RHOSTS TARGET; run; exit"' },
    { label: "Scan HTTP", args: '-q -x "use auxiliary/scanner/http/http_version; set RHOSTS TARGET; run; exit"' },
  ],
  wpscan: [
    { label: "Vuln Scan", args: "--url TARGET --enumerate vp,vt,u" },
    { label: "User enum", args: "--url TARGET --enumerate u" },
    { label: "Plugin scan", args: "--url TARGET --enumerate p" },
    { label: "Full scan", args: "--url TARGET --enumerate vp,vt,u,p,t --force" },
    { label: "Passive", args: "--url TARGET --stealthy" },
  ],
  ffuf: [
    { label: "Dir scan", args: "-u http://TARGET/FUZZ -w /usr/share/wordlists/dirb/common.txt" },
    { label: "Subdomain", args: '-u http://TARGET -H "Host: FUZZ.TARGET" -w /usr/share/wordlists/dirb/common.txt' },
    { label: "Big dict", args: "-u http://TARGET/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt" },
    { label: "Recursive", args: "-u http://TARGET/FUZZ -w /usr/share/wordlists/dirb/common.txt -recursion" },
  ],
  impacket: [
    { label: "Dump SAM", args: "LOCAL -sam -system -security" },
    { label: "Dump NTDS", args: "TARGET -just-dc -outputfile ntds_dump" },
    { label: "Psexec", args: "domain/user:pass@TARGET 'whoami'" },
    { label: "Wmiexec", args: "domain/user:pass@TARGET 'whoami'" },
  ],
  john: [
    { label: "Wordlist", args: "--wordlist=/usr/share/wordlists/rockyou.txt HASH_FILE" },
    { label: "Incremental", args: "--incremental HASH_FILE" },
    { label: "Rules", args: "--wordlist=/usr/share/wordlists/rockyou.txt --rules HASH_FILE" },
    { label: "Show cracked", args: "--show HASH_FILE" },
  ],
  searchsploit: [
    { label: "Keyword", args: "-w TARGET" },
    { label: "CVE Lookup", args: "--cve TARGET" },
    { label: "Copy exploit", args: "-m TARGET" },
    { label: "JSON output", args: "-j TARGET" },
  ],
  nikto: [
    { label: "Quick scan", args: "-h TARGET -Tuning 1" },
    { label: "Full scan", args: "-h TARGET -Tuning 123456789" },
    { label: "Vuln only", args: "-h TARGET -Tuning 9" },
    { label: "SSL test", args: "-h TARGET -ssl" },
  ],
  gobuster: [
    { label: "Dir scan", args: "dir -u http://TARGET -w /usr/share/wordlists/dirb/common.txt" },
    { label: "DNS subdomain", args: "dns -d TARGET -w /usr/share/wordlists/dirb/common.txt" },
    { label: "Big wordlist", args: "dir -u http://TARGET -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt" },
    { label: "VHost", args: "vhost -u http://TARGET -w /usr/share/wordlists/dirb/common.txt" },
  ],
  enum4linux: [
    { label: "Full enum", args: "TARGET" },
    { label: "Users only", args: "-U TARGET" },
    { label: "Shares only", args: "-S TARGET" },
    { label: "OS detect", args: "-o TARGET" },
  ],
  smbmap: [
    { label: "List shares", args: "-H TARGET" },
    { label: "Recursive", args: "-H TARGET -R" },
    { label: "With creds", args: '-H TARGET -u admin -p "Password123"' },
    { label: "Execute cmd", args: '-H TARGET -u admin -p "Password123" -x "whoami"' },
  ],
  whatweb: [
    { label: "Quick scan", args: "TARGET" },
    { label: "Aggressive", args: "-a 3 TARGET" },
    { label: "Stealth", args: "-a 1 --no-errors TARGET" },
    { label: "JSON output", args: "--log-json=output.json TARGET" },
  ],
};

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6, margin: "0 20px 6px" },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "14px 16px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, color: "#00ff88", fontSize: 16, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 8, textShadow: "0 0 8px rgba(0,212,255,0.3)", animation: "textGlowPulse 3s ease-in-out infinite" },
  dot: { fontSize: 8, color: "#00ff88", animation: "pulse 2s infinite" },
  sectionTitle: { margin: "0 0 8px 0", color: "#aaa", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  badge: { padding: "4px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", letterSpacing: 1 },
  pill: { display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, transition: "all 0.15s" },
  input: { flex: 1, padding: "10px 14px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none" },
  runBtn: { padding: "10px 24px", border: "none", borderRadius: 8, color: "#06060e", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap", letterSpacing: 1 },
  histRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6 },
};

export default ToolsPanel;
