import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Ring, Line } from "@react-three/drei";
import * as THREE from "three";
import { API_URL } from "../config";

const API = API_URL;

// ── CVSS Color Map ─────────────────────────────────────────────
const CVSS_COLORS: Record<string, string> = {
  critical: "#ff0000", high: "#ffa500", medium: "#ffd700", low: "#00ff00", info: "#888",
};

function cvssColor(score: number): string {
  if (score >= 9) return "#ff0000";
  if (score >= 7) return "#ffa500";
  if (score >= 4) return "#ffd700";
  if (score > 0) return "#00ff00";
  return "#888";
}

function cvssSeverity(score: number): string {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  if (score > 0) return "LOW";
  return "INFO";
}

// ── Presets ─────────────────────────────────────────────────────
const PRESETS = [
  { label: "Full Audit", flags: "--enumerate vp,vt,u,cb,dbe --random-user-agent --force", color: "#ff4757" },
  { label: "Plugins Only", flags: "--enumerate vp", color: "#00d4ff" },
  { label: "Themes Only", flags: "--enumerate vt", color: "#a855f7" },
  { label: "User Enum", flags: "--enumerate u", color: "#2ed573" },
  { label: "Quick Scan", flags: "--enumerate vp,vt --plugins-detection aggressive", color: "#ffa502" },
  { label: "Stealth", flags: "--enumerate vp --random-user-agent --throttle 1000", color: "#ff6ec7" },
];

const SCAN_OPTIONS = [
  { id: "vp", label: "Plugins", desc: "Enumerate installed plugins" },
  { id: "vt", label: "Themes", desc: "Enumerate installed themes" },
  { id: "u", label: "Users", desc: "Enumerate WordPress users" },
  { id: "cb", label: "Config Backups", desc: "Find exposed config backups" },
  { id: "dbe", label: "DB Exports", desc: "Find database exports" },
  { id: "tt", label: "TimThumb", desc: "Scan for TimThumb vulns" },
];

// ── 3D Threat Landscape Viz ─────────────────────────────────────
function WpscanVisual({ running, plugins, vulnCount }: {
  running: boolean; plugins: Array<{ name: string; version: string; vulns: number }>; vulnCount: number;
}) {
  const centerRef = useRef<THREE.Mesh>(null);
  const count = Math.max(plugins.length, running ? 6 : 0);

  useFrame((_, delta) => {
    if (centerRef.current) {
      centerRef.current.rotation.y += delta * (running ? 2.5 : 0.5);
    }
  });

  const nodes = Array.from({ length: count }).map((_, i) => {
    const angle = (i / Math.max(count, 1)) * Math.PI * 2;
    const r = 1.8;
    const p = plugins[i];
    const col = p ? (p.vulns > 0 ? "#ff0000" : p.version ? "#ffa500" : "#00ff00") : "#555";
    return { x: Math.cos(angle) * r, y: Math.sin(angle * 3) * 0.5, z: Math.sin(angle) * r, col, label: p?.name?.slice(0, 14) || "" };
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 3, 4]} intensity={0.6} color="#ffa500" />
      <pointLight position={[-2, -1, 2]} intensity={0.2} color="#ffffff" />

      {/* Center WordPress sphere */}
      <mesh ref={centerRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#2563eb" wireframe transparent opacity={0.6} />
      </mesh>
      <Sphere args={[0.6, 32, 32]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#ffa500" transparent opacity={0.5} />
      </Sphere>

      {/* Orbiting plugin nodes */}
      {nodes.map((n, i) => (
        <React.Fragment key={i}>
          <Sphere args={[0.12, 16, 16]} position={[n.x, n.y, n.z]}>
            <meshBasicMaterial color={n.col} transparent opacity={0.9} />
          </Sphere>
          <Line points={[[0, 0, 0], [n.x, n.y, n.z]]} color={n.col} lineWidth={0.3} transparent opacity={0.3} />
        </React.Fragment>
      ))}

      {/* Shockwave rings during scan */}
      {running && Array.from({ length: 3 }).map((_, i) => {
        const s = (performance.now() * 0.001 * 2 + i * 1.5) % 5;
        return (
          <Ring key={`r-${i}`} args={[0.8 + s * 0.5, 0.85 + s * 0.5, 64]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#ffa500" transparent opacity={Math.max(0, 0.2 - s * 0.04)} side={THREE.DoubleSide} />
          </Ring>
        );
      })}

      {/* Vuln explosion particles */}
      {vulnCount > 0 && Array.from({ length: Math.min(vulnCount * 3, 15) }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.8 + Math.random() * 1.2;
        return (
          <Sphere key={`vp-${i}`} args={[0.03, 8, 8]} position={[Math.cos(angle) * dist, Math.sin(angle) * dist, (Math.random() - 0.5) * 1.5]}>
            <meshBasicMaterial color={Math.random() > 0.5 ? "#ff0000" : "#ffa500"} transparent opacity={0.7 + Math.random() * 0.3} />
          </Sphere>
        );
      })}

      <OrbitControls enableRotate autoRotate={!running} autoRotateSpeed={0.4} enableZoom />
    </>
  );
}

// ── Main WpscanPanel ───────────────────────────────────────────
const WpscanPanel: React.FC<{ target?: string; args?: string; onResult?: (r: any) => void; standalone?: boolean }> = ({ target: initialTarget, args: initialArgs, onResult, standalone }) => {
  const [targetUrl, setTargetUrl] = useState(initialTarget || "");
  const [enumerate, setEnumerate] = useState<Set<string>>(new Set(["vp", "vt"]));
  const [extraFlags, setExtraFlags] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [results, setResults] = useState<Array<{ name: string; version: string; vulns: number; cvss?: number; cves?: string[]; status: string }>>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; target: string; plugins: number; vulns: number }>>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const toggleOption = (id: string) => {
    setEnumerate(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const buildFlags = () => {
    const parts: string[] = [];
    if (enumerate.size > 0) parts.push(`--enumerate ${[...enumerate].join(",")}`);
    parts.push("--random-user-agent");
    parts.push("--force");
    if (extraFlags) parts.push(extraFlags);
    parts.push("--url");
    parts.push(targetUrl);
    return parts.join(" ");
  };

  const run = async () => {
    if (!targetUrl.trim() || running) return;
    setRunning(true); setOutput(""); setResults([]); setExpandedId(null);
    try {
      const flags = shlexSplit(buildFlags());
      const r = await fetch(`${API}/api/tools/wpscan/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetUrl, args: flags }),
      });
      const data = await r.json();
      const out = data.output || "";
      setOutput(out);
      const parsed = parseWpscanOutput(out);
      setResults(parsed);
      const vulns = parsed.reduce((s, p) => s + p.vulns, 0);
      setHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), target: targetUrl, plugins: parsed.length, vulns }]);
      if (onResult) onResult(data);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
    setRunning(false);
  };

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [output]);

  const vulnCount = results.reduce((s, r) => s + r.vulns, 0);

  return (
    <div style={styles.wrap}>
      {/* ── Top Row: Input + VIZ ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {/* Input / Config */}
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />TARGET</h3>
          <input style={styles.urlInput} placeholder="https://target-wordpress-site.com" value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)} spellCheck={false} />

          {/* Scan options */}
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>ENUMERATE</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {SCAN_OPTIONS.map(o => {
                const active = enumerate.has(o.id);
                return (
                  <motion.button key={o.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => toggleOption(o.id)} title={o.desc}
                    style={{
                      ...styles.optionBtn,
                      color: active ? "#00d4ff" : "#555",
                      borderColor: active ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.06)",
                      background: active ? "rgba(0,212,255,0.1)" : "rgba(6,6,14,0.4)",
                    }}>
                    {o.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Extra flags */}
          <input style={{ ...styles.input, marginTop: 8, fontSize: 9, color: "#888" }}
            placeholder="Extra flags (--plugins-detection aggressive --throttle 500)" value={extraFlags}
            onChange={e => setExtraFlags(e.target.value)} spellCheck={false} />
          <div style={{ fontSize: 8, color: "#555", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{buildFlags()}</div>

          {/* Presets */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <motion.button key={p.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setExtraFlags(p.flags)}
                style={{ ...styles.presetBtn, color: p.color, borderColor: `${p.color}30`, background: `${p.color}10` }}>
                {p.label}
              </motion.button>
            ))}
          </div>

          {/* Run */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={run} disabled={running}
            style={{ ...styles.runBtn, borderColor: running ? "rgba(255,71,87,0.3)" : "rgba(0,212,255,0.3)", marginTop: 10, opacity: running ? 0.6 : 1 }}>
            {running ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>◌</motion.span> : "▶"}
            <span style={{ color: running ? "#ff4757" : "#00d4ff", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {running ? "SCANNING..." : "AUDIT WORDPRESS"}
            </span>
          </motion.button>
        </div>

        {/* Three.js Visual */}
        <div style={{ ...styles.card, padding: "8px 14px" }}>
          <h3 style={styles.title}><span style={styles.dot} />THREAT LANDSCAPE</h3>
          <div style={{ width: "100%", height: 340, borderRadius: 8, overflow: "hidden", background: "rgba(6,6,14,0.8)" }}>
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
              <WpscanVisual running={running} plugins={results} vulnCount={vulnCount} />
            </Canvas>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
            <StatBox label="PLUGINS" value={results.length} color="#00d4ff" />
            <StatBox label="VULNS" value={vulnCount} color={vulnCount > 0 ? "#ff0000" : "#555"} />
            <StatBox label="CRITICAL" value={results.filter(r => (r.cvss || 0) >= 9).length} color="#ff0000" />
            <StatBox label="HIGH" value={results.filter(r => (r.cvss || 0) >= 7 && (r.cvss || 0) < 9).length} color="#ffa500" />
          </div>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div style={styles.card}>
        <h3 style={styles.title}><span style={styles.dot} />RESULTS</h3>
        {results.length === 0 ? (
          <div style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "20px", textAlign: "center" }}>
            {running ? "Auditing WordPress..." : "Enter a target URL and run an audit"}
          </div>
        ) : (
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>COMPONENT</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>VERSION</th>
                  <th style={{ textAlign: "center", padding: "4px 8px", color: "#555", fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>VULNS</th>
                  <th style={{ textAlign: "center", padding: "4px 8px", color: "#555", fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const col = r.vulns > 0 ? "#ff0000" : r.version ? "#ffa500" : "#00ff00";
                  return (
                    <React.Fragment key={i}>
                      <motion.tr initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        onClick={() => setExpandedId(expandedId === i ? null : i)}
                        style={{ ...styles.tr, background: expandedId === i ? "rgba(255,165,0,0.06)" : "transparent", cursor: "pointer" }}>
                        <td style={{ padding: "5px 8px", color: col, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "5px 8px", color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{r.version || "—"}</td>
                        <td style={{ padding: "5px 8px", textAlign: "center", color: r.vulns > 0 ? "#ff0000" : "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: r.vulns > 0 ? 700 : 400 }}>
                          {r.vulns > 0 ? r.vulns : "—"}
                        </td>
                        <td style={{ padding: "5px 8px", textAlign: "center" }}>
                          <span style={{
                            color: r.vulns > 0 ? "#ff0000" : "#00ff00",
                            background: r.vulns > 0 ? "rgba(255,0,0,0.1)" : "rgba(0,255,0,0.1)",
                            padding: "2px 6px", borderRadius: 3, fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                          }}>{r.vulns > 0 ? cvssSeverity(r.cvss || 7) : "SAFE"}</span>
                        </td>
                      </motion.tr>
                      {expandedId === i && r.vulns > 0 && (
                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          style={{ background: "rgba(255,165,0,0.03)" }}>
                          <td colSpan={4} style={{ padding: "8px 14px", fontSize: 9, color: "#888", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                            <div><b>CVSS:</b> <span style={{ color: cvssColor(r.cvss || 0), fontWeight: 700 }}>{r.cvss || "N/A"}</span> · <b>Severity:</b> <span style={{ color: cvssColor(r.cvss || 0) }}>{cvssSeverity(r.cvss || 0)}</span></div>
                            <div style={{ marginTop: 4 }}><b>CVEs:</b> <span style={{ color: "#ffa500" }}>{(r.cves || []).join(", ") || "N/A"}</span></div>
                            <div style={{ marginTop: 4 }}><b>Suggested Actions:</b> Update {r.name} to the latest version. Check exploit availability on exploit-db.com.</div>
                            <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                              <Btn tiny label="VIEW CVE" color="#ffa500" onClick={() => {}} />
                              <Btn tiny label="EXPLOIT-DB" color="#ff4757" onClick={() => {}} />
                              <Btn tiny label="EXPORT" color="#00d4ff" onClick={() => {}} />
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Output Log + History ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />OUTPUT LOG</h3>
          <div ref={logRef} style={styles.logBox}>
            {output || <span style={{ color: "#333" }}>{running ? "Running wpscan..." : "Output will appear here"}</span>}
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />AUDIT HISTORY</h3>
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {history.length === 0 && <div style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "20px", textAlign: "center" }}>No prior audits</div>}
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: "#555" }}>{h.time}</span>
                <span style={{ color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.target}</span>
                <span style={{ color: "#00d4ff" }}>{h.plugins} plugins</span>
                <span style={{ color: h.vulns > 0 ? "#ff0000" : "#555" }}>{h.vulns} vulns</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function Btn({ label, color, onClick, tiny }: any) {
  return (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
      style={{ color, fontSize: tiny ? 7 : 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 4, padding: tiny ? "2px 6px" : "4px 10px", outline: "none" }}>
      {label}
    </motion.button>
  );
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ color, fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      <div style={{ color: "#555", fontSize: 8, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
    </div>
  );
}

function parseWpscanOutput(output: string): Array<{ name: string; version: string; vulns: number; cvss?: number; cves?: string[]; status: string }> {
  const results: any[] = [];
  const lines = output.split("\n");
  let current: any = null;
  for (const line of lines) {
    const nameMatch = line.match(/\[i\]\s+Plugin:\s+(.+)/i) || line.match(/\[i\]\s+Theme:\s+(.+)/i);
    if (nameMatch) {
      if (current) results.push(current);
      current = { name: nameMatch[1].trim(), version: "", vulns: 0, cves: [], status: "scanned" };
      continue;
    }
    if (current && line.includes("Version:")) {
      const v = line.split("Version:").pop()?.trim() || "";
      if (v) current.version = v;
    }
    if (line.toLowerCase().includes("vulnerabilit") || line.includes("!]")) {
      if (current) current.vulns = (current.vulns || 0) + 1;
    }
    // Extract CVEs
    const cveMatch = line.match(/CVE-\d{4}-\d{4,}/i);
    if (cveMatch && current) {
      current.cves = [...new Set([...(current.cves || []), cveMatch[0]])];
    }
    // CVSS score
    const cvssMatch = line.match(/CVSS.*?(\d+\.?\d*)/i);
    if (cvssMatch && current) current.cvss = parseFloat(cvssMatch[1]);
  }
  if (current) results.push(current);
  if (results.length === 0) {
    // Try simpler parsing — look for plugin names
    const pluginLines = output.match(/\[i\] Plugin\[s\]? Found:[\s\S]+?(?=\n\n|\[.*Scan Completed)/i);
    if (pluginLines) {
      const names: string[] = pluginLines[0].match(/\[\+\]\s+(\S+)/g) || [];
      names.forEach((n: string) => results.push({ name: n.replace(/\[\+\]\s+/, ""), version: "", vulns: 0, cves: [], status: "detected" }));
    }
  }
  return results;
}

function shlexSplit(s: string): string[] {
  const parts: string[] = []; let cur = ""; let inQ = false; let qCh = "";
  for (const ch of s) {
    if (inQ) { if (ch === qCh) { inQ = false; continue } cur += ch; }
    else if (ch === '"' || ch === "'") { inQ = true; qCh = ch; }
    else if (ch === " ") { if (cur) { parts.push(cur); cur = ""; } }
    else { cur += ch; }
  }
  if (cur) parts.push(cur);
  return parts;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6 },
  card: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "12px 14px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  title: { margin: "0 0 8px 0", color: "#00d4ff", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  dot: { fontSize: 8, color: "#2ed573" },
  urlInput: { width: "100%", padding: "10px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", boxSizing: "border-box" },
  optionBtn: { padding: "4px 10px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  input: { width: "100%", padding: "7px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none", boxSizing: "border-box" },
  presetBtn: { padding: "4px 10px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  runBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", outline: "none", width: "100%" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s" },
  logBox: { maxHeight: 160, overflowY: "auto", padding: "8px 10px", background: "rgba(6,6,14,0.7)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#888", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};

export default WpscanPanel;
