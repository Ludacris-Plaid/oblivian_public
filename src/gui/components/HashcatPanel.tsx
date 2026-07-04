import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Ring } from "@react-three/drei";
import * as THREE from "three";
import { API_URL } from "../config";

const API = API_URL;

// ── Hash algorithm definitions ──────────────────────────────────
const ALGOS = [
  { id: "0", label: "MD5", mode: 0, color: "#ffd700", effect: "golden_spiral", desc: "Fast, 128-bit, legacy" },
  { id: "1000", label: "NTLM", mode: 1000, color: "#ffa502", effect: "orange_fortress", desc: "Windows auth hash" },
  { id: "1400", label: "SHA-256", mode: 1400, color: "#c0c0c0", effect: "silver_geo", desc: "256-bit, modern" },
  { id: "3200", label: "bcrypt", mode: 3200, color: "#a855f7", effect: "purple_molecular", desc: "Blowfish, slow, secure" },
  { id: "1800", label: "SHA-512", mode: 1800, color: "#e0e0e0", effect: "silver_geo", desc: "512-bit, Unix crypt" },
  { id: "1500", label: "Apache", mode: 1500, color: "#2ed573", effect: "green_cylinder", desc: "Apache $apr1$" },
  { id: "1600", label: "MySQL", mode: 1600, color: "#00d4ff", effect: "green_cylinder", desc: "MySQL 4.1+" },
  { id: "1700", label: "SHA-512crypt", mode: 1700, color: "#ff6ec7", effect: "silver_geo", desc: "Unix $6$ crypt" },
];

const PRESETS = [
  { label: "Rockyou NTLM", mode: 1000, wordlist: "/usr/share/wordlists/rockyou.txt", color: "#ffa502" },
  { label: "Rockyou MD5", mode: 0, wordlist: "/usr/share/wordlists/rockyou.txt", color: "#ffd700" },
  { label: "bcrypt slow", mode: 3200, wordlist: "/usr/share/wordlists/rockyou.txt", color: "#a855f7" },
  { label: "Dict + Rules", mode: 0, rules: "best64.rule", color: "#ff6ec7" },
  { label: "Mask ?a?a?a?a", mode: 0, mask: "?a?a?a?a?a?a", color: "#00d4ff" },
  { label: "Combo attack", mode: 0, combo: true, color: "#2ed573" },
];

const MODE_COLORS: Record<string, string> = {};
ALGOS.forEach(a => { MODE_COLORS[String(a.mode)] = a.color; });

// ── 3D Visualization: Hash Stream + GPU Heatmap + Crack Timeline ──
function HashcatVisual({ running, mode, cracked, total, rate }: {
  running: boolean; mode: number; cracked: number; total: number; rate: number;
}) {
  const color = MODE_COLORS[String(mode)] || "#ffd700";
  const particleCount = running ? 250 : 50;
  const streamSpeed = running ? Math.min(3 + (rate / 5000), 12) : 0.3;

  const [positions] = useState(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      arr[i] = (Math.random() - 0.5) * 6;
      arr[i + 1] = (Math.random() - 0.5) * 8;
      arr[i + 2] = (Math.random() - 0.5) * 3;
    }
    return arr;
  });

  const ptsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (!ptsRef.current) return;
    const pos = ptsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= delta * streamSpeed * 0.8;     // Flow upward
      pos[i] += Math.sin(performance.now() * 0.001 + i) * delta * 0.3;
      if (pos[i + 1] < -4) {
        pos[i + 1] = 4;
        pos[i] = (Math.random() - 0.5) * 6;
        pos[i + 2] = (Math.random() - 0.5) * 3;
      }
    }
    ptsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const progress = total > 0 ? cracked / total : 0;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 3, 4]} intensity={0.5} color={color} />
      <pointLight position={[-2, -1, 2]} intensity={0.2} color="#ffffff" />

      {/* Center fracturing sphere */}
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.3 + progress * 0.3} />
      </mesh>

      {/* Hash stream particles */}
      <points ref={ptsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.06} transparent opacity={0.85} />
      </points>

      {/* Crack explosion rings */}
      {cracked > 0 && Array.from({ length: Math.min(cracked, 5) }).map((_, i) => (
        <Ring key={`cr-${i}`} args={[1.2 + i * 0.25, 1.25 + i * 0.25, 64]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={i % 2 === 0 ? "#2ed573" : color} transparent opacity={0.2 + i * 0.05} side={THREE.DoubleSide} />
        </Ring>
      ))}

      <OrbitControls enableRotate autoRotate autoRotateSpeed={0.4 + (running ? 1 : 0)} />
    </>
  );
}

// ── Main HashcatPanel ───────────────────────────────────────────
const HashcatPanel: React.FC<{ target?: string; args?: string; onResult?: (r: any) => void; standalone?: boolean }> = ({ target: initialTarget, args: initialArgs, onResult, standalone }) => {
  const [hashInput, setHashInput] = useState("");
  const [mode, setMode] = useState("0");
  const [wordlist, setWordlist] = useState("/usr/share/wordlists/rockyou.txt");
  const [mask, setMask] = useState("");
  const [rules, setRules] = useState("");
  const [extraFlags, setExtraFlags] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [results, setResults] = useState<Array<{ hash: string; pass?: string }>>([]);
  const [rate, setRate] = useState(0);
  const [crackedCount, setCrackedCount] = useState(0);
  const [history, setHistory] = useState<Array<{ time: string; algo: string; cracked: number }>>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const algo = ALGOS.find(a => a.id === mode) || ALGOS[0];

  const detectHashType = (hash: string): string => {
    const h = hash.trim();
    if (/^[a-f0-9]{32}$/i.test(h)) return "0";            // MD5
    if (/^[a-f0-9]{64}$/i.test(h)) return "1400";         // SHA-256
    if (/^[a-f0-9]{128}$/i.test(h)) return "1800";        // SHA-512
    if (h.startsWith("$2")) return "3200";                  // bcrypt
    if (h.startsWith("$apr1$")) return "1500";              // Apache
    if (/^[a-f0-9]{32}$/i.test(h) && h.length === 32) return "0"; // MD5
    if (/^[a-f0-9]{40}$/i.test(h)) return "100";          // SHA-1
    return "";
  };

  const buildArgs = () => {
    const parts: string[] = [];
    if (mode) parts.push(`-m ${mode}`);
    if (wordlist) parts.push(wordlist);
    if (mask) parts.push(mask);
    if (rules) parts.push(`-r ${rules}`);
    if (extraFlags) parts.push(extraFlags);
    return parts.join(" ");
  };

  const run = async () => {
    if (!hashInput.trim() || running) return;
    setRunning(true); setOutput(""); setResults([]); setRate(0); setCrackedCount(0);

    const hashes = hashInput.trim().split(/\n/).filter(h => h.trim());
    if (hashes.length === 0) { setRunning(false); return; }

    // Auto-detect hash type
    const detected = detectHashType(hashes[0]);
    if (detected && !mode) setMode(detected);

    // Create a temp hash file for hashcat
    const hashFile = hashes.join("\n");
    setResults(hashes.map(h => ({ hash: h })));

    try {
      const flags = shlexSplit(buildArgs());
      const r = await fetch(`${API}/api/tools/hashcat/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: hashFile, args: flags }),
      });
      const data = await r.json();
      const out = data.output || "";
      setOutput(out);

      // Parse cracked passwords
      const cracked = parseHashcatOutput(out);
      const parsed = hashes.map(h => {
        const found = cracked.find((c: any) => c.hash === h);
        return found ? { ...found } : { hash: h };
      });
      const count = parsed.filter((p: any) => p.pass).length;
      setResults(parsed);
      setCrackedCount(count);

      // Parse hash rate
      const rateMatch = out.match(/([\d.]+)\s*[kM]?H\/s/);
      if (rateMatch) setRate(parseFloat(rateMatch[1]));
      else if (out.includes("Speed")) {
        const spMatch = out.match(/Speed.*?:\s+([\d.]+)/);
        if (spMatch) setRate(parseFloat(spMatch[1]));
      }

      setHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), algo: algo.label, cracked: count }]);
      if (onResult) onResult(data);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
    setRunning(false);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [output]);

  const hashCount = hashInput.trim().split(/\n/).filter(h => h.trim()).length;

  return (
    <div style={styles.wrap}>
      {/* ── Top Row: Input + Viz ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {/* Input / Config */}
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />HASH INPUT</h3>
          <textarea
            style={styles.hashInput}
            placeholder="Paste hash(es) — auto-detects MD5/SHA256/bcrypt..."
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            spellCheck={false}
            rows={3}
          />
          <div style={{ fontSize: 8, color: "#555", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            {hashCount} hash(es) · Detected: <span style={{ color: algo.color, fontWeight: 600 }}>{ALGOS.find(a => a.id === detectHashType(hashInput.split("\n")[0] || ""))?.label || "?"}</span>
          </div>

          {/* Algo selector */}
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>ALGORITHM</span>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
              {ALGOS.map(a => {
                const active = mode === a.id;
                return (
                  <motion.button key={a.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setMode(a.id)}
                    title={`-m ${a.mode}: ${a.desc}`}
                    style={{
                      ...styles.algoBtn,
                      color: active ? a.color : "#555",
                      borderColor: active ? `${a.color}50` : "rgba(255,255,255,0.06)",
                      background: active ? `${a.color}15` : "rgba(6,6,14,0.4)",
                    }}>
                    {a.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Wordlist, Mask, Rules */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input style={{ ...styles.input, flex: 2 }} placeholder="Wordlist path" value={wordlist} onChange={e => setWordlist(e.target.value)} spellCheck={false} />
            <input style={{ ...styles.input, flex: 1 }} placeholder="Mask (?a?a?a)" value={mask} onChange={e => setMask(e.target.value)} spellCheck={false} />
            <input style={{ ...styles.input, flex: 1 }} placeholder="Rules (best64)" value={rules} onChange={e => setRules(e.target.value)} spellCheck={false} />
          </div>

          {/* Extra flags */}
          <input style={{ ...styles.input, marginTop: 6, fontSize: 9, color: "#888" }} placeholder="Extra flags (-O -w 3 -d 1)" value={extraFlags} onChange={e => setExtraFlags(e.target.value)} spellCheck={false} />
          <div style={{ fontSize: 8, color: "#555", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{buildArgs()}</div>

          {/* Presets */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <motion.button key={p.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (p.mode !== undefined) setMode(String(p.mode));
                  if (p.wordlist) setWordlist(p.wordlist);
                  if (p.rules) setRules(p.rules);
                  if (p.mask) setMask(p.mask);
                }}
                style={{ ...styles.presetBtn, color: p.color, borderColor: `${p.color}30`, background: `${p.color}10` }}>
                {p.label}
              </motion.button>
            ))}
          </div>

          {/* Run */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={run} disabled={running}
            style={{ ...styles.runBtn, borderColor: running ? "rgba(255,71,87,0.3)" : `${algo.color}30`, marginTop: 10, opacity: running ? 0.6 : 1 }}>
            {running ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>◌</motion.span> : "▶"}
            <span style={{ color: running ? "#ff4757" : algo.color, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {running ? "CRACKING..." : `CRACK WITH ${algo.label}`}
            </span>
          </motion.button>
        </div>

        {/* Three.js Visualization */}
        <div style={{ ...styles.card, padding: "8px 14px" }}>
          <h3 style={styles.title}><span style={styles.dot} />CRACK VISUALIZATION</h3>
          <div style={{ width: "100%", height: 340, borderRadius: 8, overflow: "hidden", background: "rgba(6,6,14,0.8)" }}>
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
              <HashcatVisual running={running} mode={parseInt(mode) || 0} cracked={crackedCount} total={hashCount} rate={rate} />
            </Canvas>
          </div>
          {/* Stats overlay */}
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
            <StatBox label="CRACKED" value={crackedCount} total={hashCount} color="#2ed573" />
            <StatBox label="RATE" value={`${rate} MH/s`} color={algo.color} />
            <StatBox label="MODE" value={`-m ${mode}`} color="{algo.color}" />
          </div>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div style={styles.card}>
        <h3 style={styles.title}><span style={styles.dot} />RESULTS</h3>
        {results.length === 0 ? (
          <div style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "20px", textAlign: "center" }}>
            {running ? "Cracking in progress..." : "Paste hashes and run a crack to see results"}
          </div>
        ) : (
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600 }}>HASH</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600 }}>ALGO</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600 }}>STATUS</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600 }}>PASSWORD</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <motion.tr key={i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "4px 8px", color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{r.hash.slice(0, 28)}...</td>
                    <td style={{ padding: "4px 8px", color: algo.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600 }}>{algo.label}</td>
                    <td style={{ padding: "4px 8px" }}>
                      <span style={{
                        color: r.pass ? "#2ed573" : "#ff4757",
                        background: r.pass ? "rgba(34,197,94,0.1)" : "rgba(255,71,87,0.1)",
                        padding: "2px 6px", borderRadius: 3, fontSize: 8, fontFamily: "'JetBrains Mono', monospace"
                      }}>{r.pass ? "✓ CRACKED" : "✗"}</span>
                    </td>
                    <td style={{ padding: "4px 8px", color: r.pass ? "#2ed573" : "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: r.pass ? 700 : 400 }}>
                      {r.pass || "—"}
                    </td>
                  </motion.tr>
                ))}
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
            {output || <span style={{ color: "#333" }}>{running ? "Running hashcat..." : "Output will appear here"}</span>}
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />CRACK HISTORY</h3>
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {history.length === 0 && <div style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "20px", textAlign: "center" }}>No prior cracks</div>}
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: "#555" }}>{h.time}</span>
                <span style={{ color: MODE_COLORS[h.algo] || "#ffd700", fontWeight: 600 }}>{h.algo}</span>
                <span style={{ color: h.cracked > 0 ? "#2ed573" : "#555", marginLeft: "auto" }}>{h.cracked} cracked</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function StatBox({ label, value, total, color }: any) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ color, fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#555", fontSize: 8, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function parseHashcatOutput(output: string): Array<{ hash: string; pass: string }> {
  const results: Array<{ hash: string; pass: string }> = [];
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes(":")) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const hash = parts[0].trim();
        const pass = parts.slice(1).join(":").trim();
        if (hash.length >= 16 && pass.length > 0) {
          results.push({ hash, pass });
        }
      }
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
  hashInput: { width: "100%", padding: "8px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none", boxSizing: "border-box", resize: "vertical" },
  algoBtn: { padding: "3px 8px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  input: { padding: "7px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none", boxSizing: "border-box" },
  presetBtn: { padding: "4px 10px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  runBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", outline: "none", width: "100%" },
  logBox: { maxHeight: 160, overflowY: "auto", padding: "8px 10px", background: "rgba(6,6,14,0.7)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#888", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};

export default HashcatPanel;
