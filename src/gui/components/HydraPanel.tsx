import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Ring, Line } from "@react-three/drei";
import * as THREE from "three";
import { API_URL } from "../config";

const API = API_URL;

// ── Protocol definitions ────────────────────────────────────────
const PROTOCOLS = [
  { id: "ssh", label: "SSH", icon: "🔐", color: "#ff4757", port: 22, desc: "Secure Shell brute-force", wordlist: "/usr/share/wordlists/rockyou.txt" },
  { id: "http", label: "HTTP", icon: "🌐", color: "#2ed573", port: 80, desc: "HTTP POST/GET login brute-force", wordlist: "/usr/share/wordlists/rockyou.txt" },
  { id: "ftp", label: "FTP", icon: "📁", color: "#ffa502", port: 21, desc: "File Transfer Protocol brute-force", wordlist: "/usr/share/wordlists/rockyou.txt" },
  { id: "smb", label: "SMB", icon: "💾", color: "#00d4ff", port: 445, desc: "Server Message Block brute-force", wordlist: "/usr/share/wordlists/rockyou.txt" },
  { id: "mysql", label: "MySQL", icon: "🗄️", color: "#a855f7", port: 3306, desc: "Database brute-force", wordlist: "/usr/share/wordlists/rockyou.txt" },
];

const PRESETS = [
  { label: "Rockyou", wordlist: "/usr/share/wordlists/rockyou.txt", color: "#ff4757" },
  { label: "SSH root", user: "root", color: "#ff4757" },
  { label: "HTTP POST", path: "/wp-login.php", fail: "Invalid", color: "#2ed573" },
  { label: "Fastest", threads: 16, color: "#ffa502" },
  { label: "Admin brute", user: "admin", color: "#00d4ff" },
];

// ── 3D Visualization per protocol ──────────────────────────────
function HydraVisual({ protocol, running, attempts, found }: {
  protocol: string; running: boolean; attempts: number; found: number;
}) {
  const colors = PROTOCOLS.find(p => p.id === protocol)?.color || "#ff4757";
  const particlesRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const count = running ? 300 : 50;
  const speed = running ? (protocol === "http" ? 6 : protocol === "ssh" ? 3 : 2) : 0.5;

  // Particle positions
  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      arr[i] = (Math.random() - 0.5) * 8;
      arr[i + 1] = (Math.random() - 0.5) * 8;
      arr[i + 2] = (Math.random() - 0.5) * 4;
    }
    return arr;
  });

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      if (protocol === "http") {
        pos[i + 1] -= delta * speed * 0.5;
        if (pos[i + 1] < -4) { pos[i + 1] = 4; pos[i] = (Math.random() - 0.5) * 8; }
      } else if (protocol === "ssh") {
        pos[i + 1] -= delta * speed * 0.3;
        pos[i] += Math.sin(performance.now() * 0.001 + i) * delta * 0.5;
        if (pos[i + 1] < -4) { pos[i + 1] = 4; }
      } else if (protocol === "ftp") {
        const fx = Math.floor(pos[i] / 1.5);
        const fy = Math.floor(pos[i + 1] / 1.5);
        if ((fx + fy) % 2 === 0) {
          pos[i + 2] = Math.sin(performance.now() * 0.003 + i) * 0.5 * (running ? 1 : 0.3);
        }
      } else if (protocol === "smb") {
        const dx = pos[i], dy = pos[i + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        pos[i + 2] = Math.max(0, Math.sin(dist * 2 - performance.now() * 0.004) * 0.4 * (running ? 1 : 0.2));
      } else if (protocol === "mysql") {
        pos[i + 2] = Math.sin(pos[i] + performance.now() * 0.005) * Math.cos(pos[i + 1] + performance.now() * 0.004) * (running ? 0.6 : 0.15);
      }
      if (sphereRef.current) {
        sphereRef.current.rotation.y += delta * (running ? 2 : 0.3);
        sphereRef.current.rotation.x += delta * (running ? 0.8 : 0.1);
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 5]} intensity={0.6} color={colors} />
      <pointLight position={[-2, -1, 3]} intensity={0.3} color="#ffffff" />

      {/* Target sphere */}
      <mesh ref={sphereRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color={found > 0 ? "#2ed573" : colors} transparent opacity={0.7} wireframe={protocol === "mysql"} />
      </mesh>

      {/* Expanding rings */}
      {running && Array.from({ length: 3 }).map((_, i) => {
        const s = (performance.now() * 0.001 * speed * 0.5 + i * 1.5) % 5;
        return (
          <Ring key={`hr-${i}`} args={[1.4 + s * 0.6, 1.45 + s * 0.6, 64]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color={colors} transparent opacity={Math.max(0, 0.25 - s * 0.05)} side={THREE.DoubleSide} />
          </Ring>
        );
      })}

      {/* Protocol-specific particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={protocol === "ssh" ? "#2ed573" : colors} size={0.05} transparent opacity={0.8} />
      </points>

      {/* Lock/ring for SSH */}
      {protocol === "ssh" && (
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[1.6, 0.05, 16, 64, Math.PI]} />
          <meshBasicMaterial color="#ff4757" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Database boxes for MySQL */}
      {protocol === "mysql" && Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`db-${i}`} position={[Math.cos(i * 1.57) * 1.8, Math.sin(i * 1.57) * 1.8, 0]}>
          <boxGeometry args={[0.4, 0.2, 0.3]} />
          <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.5} />
        </mesh>
      ))}

      <OrbitControls enableRotate autoRotate autoRotateSpeed={0.5} enableZoom />
    </>
  );
}

// ── Main HydraPanel Component ──────────────────────────────────
const HydraPanel: React.FC<{ target?: string; args?: string; onResult?: (r: any) => void; standalone?: boolean }> = ({ target: initialTarget, args: initialArgs, onResult, standalone }) => {
  const [protocol, setProtocol] = useState("ssh");
  const [target, setTarget] = useState(initialTarget || "");
  const [username, setUsername] = useState("root");
  const [wordlist, setWordlist] = useState("/usr/share/wordlists/rockyou.txt");
  const [extraFlags, setExtraFlags] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ time: string; protocol: string; target: string; found: number }>>([]);
  const [attempts, setAttempts] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  const proto = PROTOCOLS.find(p => p.id === protocol)!;

  const buildArgs = () => {
    const parts: string[] = [];
    parts.push(`-l ${username}`);
    if (wordlist && !wordlist.startsWith("-")) parts.push(`-P ${wordlist}`);
    if (extraFlags) parts.push(extraFlags);
    parts.push(`${protocol}://${target}`);
    return parts.join(" ");
  };

  const run = async () => {
    if (!target.trim() || running) return;
    setRunning(true); setOutput(""); setResults([]);
    try {
      const flags = shlexSplit(buildArgs());
      const r = await fetch(`${API}/api/tools/hydra/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, args: flags }),
      });
      const data = await r.json();
      const out = data.output || "";
      setOutput(out);
      setAttempts(prev => prev + (data.attempts || 0));
      const found = data.credentials || parseHydraOutput(out);
      setResults(found.map((c: any) => c.user ? `${c.user}:${c.pass}` : c));
      if (found.length > 0) setFoundCount(prev => prev + found.length);
      setHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), protocol, target, found: found.length }]);
      if (onResult) onResult(data);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
    setRunning(false);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [output]);

  return (
    <div style={styles.wrap}>
      {/* ── Protocol Selector + Inputs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />PROTOCOL</h3>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {PROTOCOLS.map(p => {
              const active = protocol === p.id;
              return (
                <motion.button key={p.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setProtocol(p.id)}
                  style={{
                    ...styles.protoBtn,
                    color: active ? p.color : "#555",
                    borderColor: active ? `${p.color}50` : "rgba(255,255,255,0.06)",
                    background: active ? `${p.color}15` : "rgba(6,6,14,0.4)",
                  }}>
                  {p.icon} {p.label}
                </motion.button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: proto.color, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
            {proto.desc} — Port {proto.port}
          </div>

          <input style={styles.input} placeholder="Target (IP or hostname)" value={target} onChange={e => setTarget(e.target.value)} spellCheck={false} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input style={{ ...styles.input, flex: 1 }} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} spellCheck={false} />
            <input style={{ ...styles.input, flex: 2 }} placeholder="Wordlist path" value={wordlist} onChange={e => setWordlist(e.target.value)} spellCheck={false} />
          </div>
          <input style={{ ...styles.input, marginTop: 6, fontSize: 9, color: "#888" }} placeholder="Extra flags (-t 4 -w 3)" value={extraFlags} onChange={e => setExtraFlags(e.target.value)} spellCheck={false} />
          <div style={{ fontSize: 8, color: "#555", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{buildArgs()}</div>

          {/* Presets */}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <motion.button key={p.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (p.wordlist) setWordlist(p.wordlist);
                  if (p.user) setUsername(p.user);
                  if (p.path) setExtraFlags(`http-post-form "${p.path}:log=^USER^&pwd=^PASS^:${p.fail}"`);
                  if (p.threads) setExtraFlags(`-t ${p.threads}`);
                }}
                style={{ ...styles.presetBtn, color: p.color, borderColor: `${p.color}30`, background: `${p.color}10` }}>
                {p.label}
              </motion.button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={run} disabled={running}
              style={{ ...styles.runBtn, borderColor: running ? "rgba(255,71,87,0.3)" : `${proto.color}30`, flex: 1, opacity: running ? 0.6 : 1 }}>
              {running ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>◌</motion.span> : "▶"}
              <span style={{ color: running ? "#ff4757" : proto.color, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                {running ? "CRACKING..." : `BRUTE ${protocol.toUpperCase()}`}
              </span>
            </motion.button>
            {results.length > 0 && (
              <Btn label="EXPORT" color="#2ed573" onClick={() => {
                const blob = new Blob([results.join("\n")], { type: "text/plain" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `hydra_${target}_creds.txt`; a.click();
              }} />
            )}
          </div>
        </div>

        {/* Credential Preview */}
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />CREDENTIALS</h3>
          <div style={{ fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
            Wordlist: {wordlist.split("/").pop()} · User: {username} · Target: {target || "—"}
          </div>
          {results.length > 0 ? (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600 }}>USERNAME</th>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600 }}>PASSWORD</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const [u, p] = r.split(":");
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                        <td style={{ padding: "4px 8px", color: proto.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{u}</td>
                        <td style={{ padding: "4px 8px", color: "#2ed573", fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{p}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "20px", textAlign: "center" }}>
              {running ? "Cracking in progress..." : "No credentials found yet"}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>Attempts: {attempts}</span>
            <span>Found: {foundCount}</span>
          </div>
        </div>
      </div>

      {/* Three.js Visualization */}
      <div style={{ ...styles.card, padding: "8px 14px" }}>
        <h3 style={styles.title}><span style={styles.dot} />ATTACK VISUALIZATION</h3>
        <div style={{ width: "100%", height: 320, borderRadius: 8, overflow: "hidden", background: "rgba(6,6,14,0.8)" }}>
          <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
            <HydraVisual protocol={protocol} running={running} attempts={attempts} found={foundCount} />
          </Canvas>
        </div>
      </div>

      {/* JSON Bridge + History + Output */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />OUTPUT LOG</h3>
          <div ref={logRef} style={styles.logBox}>
            {output || <span style={{ color: "#333" }}>{running ? "Waiting for output..." : "Run an attack to see raw hydra output"}</span>}
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}><span style={styles.dot} />ATTACK HISTORY</h3>
          <div style={{ maxHeight: 170, overflowY: "auto" }}>
            {history.length === 0 && <div style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", padding: "20px", textAlign: "center" }}>No prior attacks</div>}
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: "#555" }}>{h.time}</span>
                <span style={{ color: PROTOCOLS.find(p => p.id === h.protocol)?.color || "#888", fontWeight: 600 }}>{h.protocol.toUpperCase()}</span>
                <span style={{ color: "#888" }}>{h.target}</span>
                <span style={{ color: h.found > 0 ? "#2ed573" : "#555", marginLeft: "auto" }}>{h.found} found</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function Btn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{ color, fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 4, padding: "4px 10px", outline: "none" }}>
      {label}
    </motion.button>
  );
}

function parseHydraOutput(output: string): Array<{ user?: string; pass?: string }> {
  const results: Array<{ user?: string; pass?: string }> = [];
  const lines = output.split("\n");
  for (const line of lines) {
    const hostMatch = line.match(/\[(\d+)\]\[(\w+)\]\s+host:\s+(\S+)\s+login:\s+(\S+)\s+password:\s+(\S+)/i);
    if (hostMatch) {
      results.push({ user: hostMatch[4], pass: hostMatch[5] });
      continue;
    }
    // Alternate format: "login: user password: pass"
    const altMatch = line.match(/login:\s*(\S+)\s+password:\s*(.+)/i);
    if (altMatch) {
      results.push({ user: altMatch[1], pass: altMatch[2].trim() });
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
  protoBtn: { padding: "6px 12px", borderRadius: 6, fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  input: { width: "100%", padding: "8px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none", boxSizing: "border-box" },
  presetBtn: { padding: "4px 10px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  runBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", outline: "none" },
  logBox: { maxHeight: 170, overflowY: "auto", padding: "8px 10px", background: "rgba(6,6,14,0.7)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#888", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};

export default HydraPanel;
