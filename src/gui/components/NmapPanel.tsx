import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Line, Text, Ring } from "@react-three/drei";
import * as THREE from "three";
import { API_URL } from "../config";

const API = API_URL;

// ── Port color mapping ────────────────────────────────────────────
const PORT_COLORS: Record<string, string> = {
  ssh: "#ff4757",
  http: "#2563eb",
  https: "#a855f7",
  ftp: "#ffa502",
  smtp: "#2ed573",
  dns: "#00d4ff",
  rdp: "#00d4ff",
  mysql: "#ffa502",
  postgresql: "#2563eb",
  redis: "#ff4757",
  mongodb: "#2ed573",
  smb: "#ffa502",
  telnet: "#ff4757",
  pop3: "#a855f7",
  imap: "#a855f7",
  rpc: "#ff6ec7",
  netbios: "#ff6ec7",
  unknown: "#888",
};

function portColor(service: string): string {
  const s = (service || "").toLowerCase();
  for (const [k, c] of Object.entries(PORT_COLORS)) {
    if (s.includes(k)) return c;
  }
  return "#888";
}

// ── Speed reference ─────────────────────────────────────────────
const PULSE_SPEED = 0.05;

// ── Moving particle beam ──────────────────────────────────────────
function SynBeam({ from, to, color, speed = 2, active = true, style = "syn" }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    const p = meshRef.current.position as any;
    p.x += delta * speed * (to[0] - from[0]) * 0.15;
    p.y += delta * speed * (to[1] - from[1]) * 0.15;
    p.z += delta * speed * (to[2] - from[2]) * 0.15;
    const dx = p.x - from[0], dy = p.y - from[1], dz = p.z - from[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const totalDist = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2);
    if (dist > totalDist) {
      p.x = from[0]; p.y = from[1]; p.z = from[2];
    }
  });
  return (
    <mesh ref={meshRef} position={from as any}>
      <boxGeometry args={[0.08, 0.04, 0.04]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

// ── Speed function ───────────────────────────────────────────────

interface NmapScanResult {
  output: string;
  status: string;
  duration_ms?: number;
  summary?: string;
  ports?: Array<{ port: number; protocol: string; state: string; service: string; version: string }>;
}

const FLAGS = [
  { id: "-sS", label: "SYN", desc: "Half-open stealth" },
  { id: "-sT", label: "TCP", desc: "Full connect" },
  { id: "-sU", label: "UDP", desc: "UDP scan" },
  { id: "-sV", label: "Vers", desc: "Version detect" },
  { id: "-sC", label: "Script", desc: "NSE scripts" },
  { id: "-O", label: "OS", desc: "OS fingerprint" },
  { id: "-A", label: "Aggro", desc: "All-in-one" },
  { id: "-p-", label: "AllPorts", desc: "65536 ports" },
  { id: "-F", label: "Fast", desc: "Top 100" },
  { id: "-T4", label: "T4", desc: "Fast timing" },
  { id: "-T5", label: "T5", desc: "Insane timing" },
  { id: "-Pn", label: "NoPing", desc: "Skip discovery" },
];

const PRESETS = [
  { label: "Stealth", flags: ["-sS", "-T4"], color: "#00d4ff" },
  { label: "Aggressive", flags: ["-A", "-T5"], color: "#ff4757" },
  { label: "OS Detect", flags: ["-O", "-sV"], color: "#a855f7" },
  { label: "Scripts", flags: ["-sC"], color: "#2ed573" },
  { label: "Full Ports", flags: ["-p-"], color: "#ffa502" },
  { label: "Quick", flags: ["-sS", "-F", "-T5"], color: "#ff6ec7" },
];

// ── 3D Visualization Scene ────────────────────────────────────────
function NmapVisual({ scanning, ports, flags }: { scanning: boolean; ports: Array<{ port: number; service: string }>; flags: string[] }) {
  const scannerRef = useRef<THREE.Mesh>(null);
  const targetRef = useRef<THREE.Mesh>(null);
  const beamsRef = useRef<number[]>([]);
  const [beamIds, setBeamIds] = useState<number[]>([]);
  const isAggressive = flags.includes("-A") || flags.includes("-T5");
  const speed = isAggressive ? 8 : flags.includes("-T4") ? 4 : 2;

  useFrame((_, delta) => {
    if (!scannerRef.current || !targetRef.current) return;
    if (scanning) {
      const s = scannerRef.current.rotation;
      s.y += delta * 2;
      s.x += delta * 0.8;
      const t = targetRef.current.rotation;
      t.y -= delta * 1.5;
    }
  });

  // Spawn beams
  useEffect(() => {
    if (!scanning) { setBeamIds([]); return; }
    const interval = setInterval(() => {
      setBeamIds(prev => [...prev.slice(-20), Date.now()]);
    }, 200 - (isAggressive ? 150 : 0));
    return () => clearInterval(interval);
  }, [scanning, isAggressive]);

  const scannerPos: [number, number, number] = [-3, 0, 0];
  const targetPos: [number, number, number] = [3, 0, 0];

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={0.5} color="#0044ff" />

      {/* Nebula particles */}
      {Array.from({ length: 60 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 6;
        const z = (Math.random() - 0.5) * 4;
        return (
          <mesh key={`neb-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[0.02, 4, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.2 + Math.random() * 0.3} />
          </mesh>
        );
      })}

      {/* Scanner node */}
      <mesh ref={scannerRef} position={scannerPos}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={scanning ? "#00d4ff" : "#1a3a4a"} transparent opacity={0.9} />
      </mesh>
      <Ring args={[0.8, 0.85, 64]} position={scannerPos} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color="#00d4ff" transparent opacity={scanning ? 0.4 : 0.1} side={THREE.DoubleSide} />
      </Ring>

      {/* Shockwave rings */}
      {scanning && Array.from({ length: 4 }).map((_, i) => {
        const s = (performance.now() * 0.001 * speed + i * 1.5) % 6;
        return (
          <Ring key={`sw-${i}`} args={[0.6 + s * 0.8, 0.65 + s * 0.8, 64]} position={scannerPos} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#00d4ff" transparent opacity={Math.max(0, 0.3 - s * 0.05)} side={THREE.DoubleSide} />
          </Ring>
        );
      })}

      {/* Target node */}
      <mesh ref={targetRef} position={targetPos}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={ports.length > 0 ? "#ff4757" : "#3a1a1a"} transparent opacity={0.9} />
      </mesh>

      {/* Port particles around target */}
      {ports.map((p, i) => {
        const angle = (i / Math.max(ports.length, 1)) * Math.PI * 2;
        const r = 1.0;
        const x = targetPos[0] + Math.cos(angle) * r;
        const y = targetPos[1] + Math.sin(angle) * r;
        const z = targetPos[2] + (Math.random() - 0.5) * 0.6;
        const col = portColor(p.service);
        return (
          <mesh key={`port-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={col} transparent opacity={0.9} />
          </mesh>
        );
      })}

      {/* SYN beams */}
      {scanning && beamIds.map((id, i) => (
        <SynBeam key={id} from={scannerPos} to={targetPos} color={i % 3 === 0 ? "#2ed573" : "#00d4ff"} speed={speed} active={scanning} />
      ))}

      {/* Connection line */}
      <Line
        points={[scannerPos, targetPos]}
        color={scanning ? "#00d4ff" : "#1a3a4a"}
        lineWidth={0.5}
        transparent
        opacity={scanning ? 0.3 : 0.1}
      />

      {/* OS fingerprint wireframe (if -O active) */}
      {flags.includes("-O") && scanning && (
        <mesh position={targetPos}>
          <icosahedronGeometry args={[0.75, 1]} />
          <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.2 + Math.sin(performance.now() * 0.003) * 0.1} />
        </mesh>
      )}

      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} autoRotate={!scanning} autoRotateSpeed={0.3} />
    </>
  );
}

// ── Main NmapPanel Component ──────────────────────────────────────
const NmapPanel: React.FC<{ target?: string; args?: string; onResult?: (r: any) => void; standalone?: boolean }> = ({ target: initialTarget, args: initialArgs, onResult, standalone }) => {
  const [target, setTarget] = useState(initialTarget || "");
  const [args, setArgs] = useState(initialArgs || "");
  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<NmapScanResult | null>(null);
  const [log, setLog] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "open" | "error">("all");
  const [expandedPort, setExpandedPort] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const ports = result?.ports || [];
  const openPorts = ports.filter(p => p.state === "open");

  useEffect(() => {
    if (initialTarget !== undefined) setTarget(initialTarget);
    if (initialArgs !== undefined) { setArgs(initialArgs); parseFlags(initialArgs); }
  }, [initialTarget, initialArgs]);

  const parseFlags = (a: string) => {
    const set = new Set<string>();
    a.split(/\s+/).filter(f => f.startsWith("-")).forEach(f => set.add(f));
    setSelectedFlags(set);
  };

  const toggleFlag = (f: string) => {
    setSelectedFlags(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const currentFlags = new Set(selectedFlags);
    preset.flags.forEach(f => currentFlags.add(f));
    setSelectedFlags(currentFlags);
  };

  useEffect(() => {
    const built = [...selectedFlags].join(" ") + (target ? ` ${target}` : "");
    setArgs(prev => prev !== built ? built : prev);
  }, [selectedFlags, target]);

  const run = async () => {
    if (!target.trim() || scanning) return;
    setScanning(true);
    setResult(null);
    setLog("");
    setExpandedPort(null);
    try {
      const flagList = [...selectedFlags].join(" ").split(/\s+/).filter(Boolean);
      const res = await fetch(`${API}/api/tools/nmap/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, args: flagList }),
      });
      const data = await res.json();
      setLog(data.output || "");
      // Parse ports from output
      const parsed: NmapScanResult = { ...data, ports: parsePorts(data.output) };
      setResult(parsed);
      if (onResult) onResult(parsed);
    } catch (e: any) {
      setLog(`Error: ${e.message}`);
      setResult({ output: "", status: "error", summary: e.message });
    }
    setScanning(false);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const filteredLog = (() => {
    const lines = log.split("\n");
    if (logFilter === "open") return lines.filter(l => l.includes("/tcp") || l.includes("/udp") || l.includes("open")).join("\n");
    if (logFilter === "error") return lines.filter(l => l.toLowerCase().includes("error") || l.toLowerCase().includes("warning") || l.includes("failed")).join("\n");
    return log;
  })();

  const download = (format: "json" | "csv") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify({ ports: openPorts }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nmap_results.json"; a.click();
    } else {
      const csv = "port,protocol,state,service,version\n" + openPorts.map(p => `${p.port},${p.protocol},${p.state},${p.service},${p.version}`).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nmap_results.csv"; a.click();
    }
  };

  const executeNSE = (p: any) => {
    const flagList = [...selectedFlags, `--script=${p.service || "default"}`, "-p", String(p.port)];
    setArgs(flagList.join(" ") + ` ${target}`);
    setSelectedFlags(new Set(flagList.filter(f => f.startsWith("-"))));
  };

  return (
    <div style={styles.wrap}>
      {/* ── Input Nexus + Results Dashboard ── */}
      <div style={styles.topRow}>
        {/* Input Nexus */}
        <div style={styles.nexusCard}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />COMMAND</h3>
          <input
            style={styles.targetInput}
            placeholder="Target IP / hostname / CIDR range..."
            value={target}
            onChange={e => setTarget(e.target.value)}
            spellCheck={false}
          />

          {/* Flag matrix */}
          <div style={styles.flagGrid}>
            {FLAGS.map(f => {
              const active = selectedFlags.has(f.id);
              return (
                <motion.button
                  key={f.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleFlag(f.id)}
                  title={f.desc}
                  style={{
                    ...styles.flagBtn,
                    color: active ? "#00d4ff" : "#555",
                    borderColor: active ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.06)",
                    background: active ? "rgba(0,212,255,0.1)" : "rgba(6,6,14,0.4)",
                  }}
                >
                  {f.label}
                </motion.button>
              );
            })}
          </div>

          {/* Presets */}
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>PRESETS</span>
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {PRESETS.map(p => (
                <motion.button
                  key={p.label}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyPreset(p)}
                  style={{ ...styles.presetBtn, color: p.color, borderColor: `${p.color}30`, background: `${p.color}10` }}
                >
                  {p.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Args field */}
          <input
            style={{ ...styles.argsInput, marginTop: 8 }}
            placeholder="Args & flags..."
            value={args}
            onChange={e => { setArgs(e.target.value); parseFlags(e.target.value); }}
            spellCheck={false}
          />

          {/* Run / Export */}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ ...styles.runBtn, borderColor: scanning ? "rgba(255,71,87,0.3)" : "rgba(0,212,255,0.3)", opacity: scanning ? 0.6 : 1 }}
              onClick={scanning ? undefined : run}
              disabled={scanning}
            >
              {scanning ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", fontSize: 14 }}>◌</motion.span> : "▶"}
              <span style={{ color: scanning ? "#ff4757" : "#00d4ff", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                {scanning ? "SCANNING" : "RUN NMAP"}
              </span>
            </motion.button>
            {ports.length > 0 && (
              <>
                <Btn small label="JSON" color="#00d4ff" onClick={() => download("json")} />
                <Btn small label="CSV" color="#2ed573" onClick={() => download("csv")} />
              </>
            )}
          </div>
        </div>

        {/* Results Dashboard */}
        <div style={styles.resultsCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={styles.sectionTitle}><span style={styles.dot} />RESULTS</h3>
            <span style={{ fontSize: 9, color: "#555", fontFamily: "'JetBrains Mono', monospace" }}>
              {result ? `${openPorts.length} ports open` : "No scan yet"}
              {result?.duration_ms ? ` · ${(result.duration_ms / 1000).toFixed(1)}s` : ""}
            </span>
          </div>

          {openPorts.length === 0 && !scanning && result ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>No open ports found</div>
          ) : openPorts.length === 0 && !result ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#333", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>Enter a target and run a scan</div>
          ) : (
            <div style={{ maxHeight: 210, overflowY: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>PORT</th>
                    <th style={styles.th}>SVC</th>
                    <th style={styles.th}>VERSION</th>
                    <th style={styles.th}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {openPorts.map((p, i) => (
                    <React.Fragment key={`${p.port}-${i}`}>
                      <motion.tr
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ ...styles.tr, background: expandedPort === p.port ? "rgba(0,212,255,0.06)" : "transparent", cursor: "pointer" }}
                        onClick={() => setExpandedPort(expandedPort === p.port ? null : p.port)}
                      >
                        <td style={{ ...styles.td, color: portColor(p.service) }}>
                          <span style={{ fontWeight: 700 }}>{p.port}/{p.protocol}</span>
                        </td>
                        <td style={{ ...styles.td, color: portColor(p.service) }}>{p.service}</td>
                        <td style={{ ...styles.td, color: "#94a3b8", fontSize: 9 }}>{p.version?.slice(0, 40) || "—"}</td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: 3 }}>
                            <Btn tiny label="NSE" color="#a855f7" onClick={(e) => { e.stopPropagation(); executeNSE(p); }} />
                            {p.port === 22 && p.service?.toLowerCase().includes("ssh") && <Btn tiny label="SSH" color="#2ed573" onClick={() => {}} />}
                            <Btn tiny label="FWD" color="#ffa502" onClick={() => {}} />
                          </div>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedPort === p.port && (
                          <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ background: "rgba(0,212,255,0.03)" }}>
                            <td colSpan={4} style={{ padding: "8px 14px", fontSize: 9, color: "#888", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                              <div><b>Port:</b> {p.port}/{p.protocol} · <b>State:</b> {p.state} · <b>Service:</b> {p.service}</div>
                              <div><b>Version:</b> {p.version || "Unknown"}</div>
                              <div style={{ marginTop: 4 }}>
                                <b>Suggested CVEs:</b>{" "}
                                <span style={{ color: "#ffa502" }}>
                                  {p.service?.toLowerCase().includes("ssh") ? "CVE-2024-6387 (regreSSHion), CVE-2023-48795" :
                                   p.service?.toLowerCase().includes("http") ? "CVE-2023-44487 (HTTP/2), CVE-2024-24919" :
                                   "Run NSE for CVE enumeration"}
                                </span>
                              </div>
                              <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                                <Btn tiny label="RUN NSE SCRIPT" color="#a855f7" onClick={() => executeNSE(p)} />
                                <Btn tiny label="PORT FORWARD" color="#ffa502" onClick={() => {}} />
                                <Btn tiny label="INJECT PAYLOAD" color="#ff4757" onClick={() => {}} />
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Three.js Visualization ── */}
      <div style={styles.vizCard}>
        <h3 style={styles.sectionTitle}><span style={styles.dot} />SCAN VISUALIZATION</h3>
        <div style={{ width: "100%", height: 380, borderRadius: 8, overflow: "hidden", background: "rgba(6,6,14,0.8)" }}>
          <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
            <NmapVisual scanning={scanning} ports={openPorts} flags={[...selectedFlags]} />
          </Canvas>
        </div>
      </div>

      {/* ── Live Execution Log ── */}
      <div style={styles.logCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={styles.sectionTitle}><span style={styles.dot} />EXECUTION LOG</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "open", "error"] as const).map(f => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setLogFilter(f)}
                style={{
                  ...styles.filterBtn,
                  color: logFilter === f ? "#00d4ff" : "#555",
                  borderColor: logFilter === f ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)",
                  background: logFilter === f ? "rgba(0,212,255,0.08)" : "rgba(6,6,14,0.4)",
                }}
              >
                {f.toUpperCase()}
              </motion.button>
            ))}
            <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginLeft: 8 }}>
              {log.split("\n").length} lines
            </span>
          </div>
        </div>
        <div ref={logRef} style={styles.logBox}>
          {filteredLog || (
            <span style={{ color: "#333", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
              {scanning ? "Scanning..." : "Run a scan to see live output"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

function Btn({ label, color, onClick, small, tiny }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        color, fontSize: tiny ? 7 : small ? 8 : 10, fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
        background: `${color}10`, border: `1px solid ${color}30`,
        borderRadius: 4, padding: tiny ? "2px 6px" : small ? "3px 8px" : "5px 10px",
        outline: "none", transition: "all 0.15s",
      }}
    >
      {label}
    </motion.button>
  );
}

function parsePorts(output: string): Array<{ port: number; protocol: string; state: string; service: string; version: string }> {
  const results: any[] = [];
  const lines = output.split("\n");
  let inTable = false;
  for (const line of lines) {
    if (line.startsWith("PORT") && line.includes("STATE") && line.includes("SERVICE")) { inTable = true; continue; }
    if (!inTable) continue;
    if (line.trim() === "" || line.startsWith("Nmap done") || line.startsWith("Warning")) { if (line.trim() === "") inTable = false; continue; }
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const portProto = parts[0]; // e.g. "22/tcp"
    const pp = portProto.split("/");
    if (pp.length !== 2) continue;
    const port = parseInt(pp[0]);
    if (isNaN(port)) continue;
    results.push({
      port,
      protocol: pp[1],
      state: parts[1],
      service: parts[2] || "unknown",
      version: parts.slice(3).join(" ") || "",
    });
  }
  return results;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6 },
  topRow: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 6 },
  nexusCard: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "12px 14px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  resultsCard: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "12px 14px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)", overflow: "hidden" },
  vizCard: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "12px 14px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  logCard: { background: "rgba(12,14,28,0.85)", backdropFilter: "blur(20px)", borderRadius: 12, border: "1px solid rgba(0,212,255,0.1)", padding: "12px 14px", boxShadow: "0 4px 40px rgba(0,0,0,0.3)" },
  sectionTitle: { margin: 0, color: "#00d4ff", fontSize: 13, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  dot: { fontSize: 8, color: "#2ed573" },
  targetInput: { width: "100%", padding: "10px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", marginBottom: 8, boxSizing: "border-box" },
  flagGrid: { display: "flex", gap: 3, flexWrap: "wrap" },
  flagBtn: { padding: "3px 7px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  presetBtn: { padding: "4px 10px", borderRadius: 6, fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  argsInput: { width: "100%", padding: "6px 10px", background: "rgba(6,6,14,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, outline: "none", boxSizing: "border-box" },
  runBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 20px", background: "rgba(6,6,14,0.5)", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", flex: 1, outline: "none" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 10 },
  th: { textAlign: "left", padding: "6px 10px", color: "#555", fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s" },
  td: { padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#ccc" },
  filterBtn: { padding: "3px 8px", borderRadius: 4, fontSize: 8, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", outline: "none", transition: "all 0.15s" },
  logBox: { maxHeight: 200, overflowY: "auto", padding: "8px 10px", background: "rgba(6,6,14,0.7)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#888", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};

export { parsePorts };
export default NmapPanel;
