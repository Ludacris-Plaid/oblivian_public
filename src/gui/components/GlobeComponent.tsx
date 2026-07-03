import React, { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useTexture, Line } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_URL } from "../config";

interface Node {
  id: string;
  status: "online" | "offline" | "pending" | "active";
  ip?: string;
  country?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  last_heartbeat?: string;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function Earth({ bright }: { bright?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useTexture("/textures/earth-night.jpg");
  const bumpMap = useTexture("/textures/earth-topology.png");

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color={bright ? "#1a3a5e" : "#0a1a2e"}
          emissiveMap={texture}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={bright ? 3.0 : 1.8}
          bumpMap={bumpMap}
          bumpScale={bright ? 0.06 : 0.03}
          roughness={bright ? 0.3 : 0.6}
          metalness={0.0}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function GridLines() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      {[-60, -30, 0, 30, 60].map((lat) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const r = 2.008;
        const y = r * Math.cos(phi);
        const ringR = r * Math.sin(phi);
        return (
          <mesh key={`lat-${lat}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[ringR - 0.001, ringR + 0.001, 128]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.06} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 15) * (Math.PI / 180);
        return (
          <mesh key={`lng-${i}`} rotation={[0, angle, 0]}>
            <ringGeometry args={[1.998, 2.01, 128]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.03} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function NodeMarker({
  node,
  globeRadius,
  onHover,
  onUnhover,
}: {
  node: Node;
  globeRadius: number;
  onHover: (node: Node, screenPos: { x: number; y: number }) => void;
  onUnhover: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { camera, size } = useThree();

  const lat = node.lat ?? 0;
  const lng = node.lng ?? 0;
  const position = useMemo(() => latLngToVector3(lat, lng, globeRadius + 0.015), [lat, lng, globeRadius]);

  const color = node.status === "online" ? "#00ff88" : node.status === "pending" ? "#ffd700" : "#ff4757";
  const isActive = node.status === "online" || node.status === "active";

  useFrame((state) => {
    if (pulseRef.current && isActive) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2.5 + lat) * 0.35;
      pulseRef.current.scale.setScalar(scale);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.25 - Math.sin(state.clock.elapsedTime * 2.5 + lat) * 0.15;
    }
  });

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";

    const vec = new THREE.Vector3();
    vec.copy(position);
    vec.project(camera);
    const x = ((vec.x + 1) / 2) * size.width;
    const y = ((-vec.y + 1) / 2) * size.height;
    onHover(node, { x, y });
  }, [position, camera, size, node, onHover]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
    onUnhover();
  }, [onUnhover]);

  return (
    <group ref={ref} position={position}>
      {isActive && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.2} />
        </mesh>
      )}

      {/* Energy ring pulse */}
      {isActive && <EnergyPulse position={[0, 0, 0]} color={color} />}

      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={hovered ? 1.6 : 1}
      >
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshBasicMaterial color={hovered ? "#ffffff" : color} />
      </mesh>

      {isActive && (
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.0008, 0.0008, 0.24, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} />
        </mesh>
      )}

      {isActive && (
        <Line
          points={[[0, 0, 0], [-position.x, -position.y, -position.z]]}
          color={color}
          transparent
          opacity={0.1}
          lineWidth={1}
        />
      )}
    </group>
  );
}

function DataPacket({ curve, delay }: { curve: THREE.QuadraticBezierCurve3; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime * 0.4 + delay) % 1);
    const point = curve.getPoint(t);
    ref.current.position.copy(point);
    const scale = Math.sin(t * Math.PI) * 0.8 + 0.2;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.9;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.018, 8, 8]} />
      <meshBasicMaterial color="#00ff88" transparent opacity={0} />
    </mesh>
  );
}

function EnergyPulse({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = (state.clock.elapsedTime * 1.5) % 2;
    const scale = 0.02 + t * 0.08;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.4 - t * 0.2);
  });

  return (
    <mesh ref={ref} position={position}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ConnectionArcs({ nodes, globeRadius }: { nodes: Node[]; globeRadius: number }) {
  const onlineNodes = nodes.filter(n => (n.status === "online" || n.status === "active") && n.lat != null && n.lng != null);

  const arcs = useMemo(() => {
    const result: Array<{ start: THREE.Vector3; end: THREE.Vector3; key: string; curve: THREE.QuadraticBezierCurve3 }> = [];
    for (let i = 0; i < onlineNodes.length; i++) {
      for (let j = i + 1; j < onlineNodes.length; j++) {
        const start = latLngToVector3(onlineNodes[i].lat!, onlineNodes[i].lng!, globeRadius + 0.015);
        const end = latLngToVector3(onlineNodes[j].lat!, onlineNodes[j].lng!, globeRadius + 0.015);
        const mid = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(globeRadius + 0.2);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        result.push({ start, end, key: `arc-${i}-${j}`, curve });
      }
    }
    return result;
  }, [onlineNodes, globeRadius]);

  return (
    <>
      {arcs.map((arc, idx) => {
        const points = arc.curve.getPoints(40).map(p => [p.x, p.y, p.z] as [number, number, number]);

        return (
          <group key={arc.key}>
            <Line
              points={points}
              color="#00ff88"
              transparent
              opacity={0.08}
              lineWidth={1}
            />
            {/* Animated data packets along the arc */}
            <DataPacket curve={arc.curve} delay={idx * 0.3} />
            <DataPacket curve={arc.curve} delay={idx * 0.3 + 0.5} />
          </group>
        );
      })}
    </>
  );
}

interface CustomMarker {
  lat: number;
  lng: number;
  color: string;
  label: string;
  icon: string;
}

function CustomGlobeMarker({ marker, globeRadius }: { marker: CustomMarker; globeRadius: number }) {
  const pos = useMemo(() => latLngToVector3(marker.lat, marker.lng, globeRadius + 0.03), [marker.lat, marker.lng, globeRadius]);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      ringRef.current.scale.setScalar(scale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 - Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={pos}>
      <mesh ref={ringRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={marker.color} transparent opacity={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={marker.color} />
      </mesh>
      <Html position={[0, 0.07, 0]} center style={{ pointerEvents: 'none' }}>
        <span style={{ fontSize: 18, filter: `drop-shadow(0 0 4px ${marker.color})` }}>{marker.icon}</span>
      </Html>
    </group>
  );
}

function Scene({
  nodes,
  markers,
  showMap,
  onHoverNode,
  onUnhoverNode,
}: {
  nodes: Node[];
  markers: CustomMarker[];
  showMap?: boolean;
  onHoverNode: (node: Node, pos: { x: number; y: number }) => void;
  onUnhoverNode: () => void;
}) {
  const globeRadius = 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 8, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-10, -5, -5]} intensity={0.5} color="#00d4ff" />

      <Earth bright={showMap} />
      <GridLines />
      <ConnectionArcs nodes={nodes} globeRadius={globeRadius} />

      {nodes.map((node) => (
        <NodeMarker
          key={node.id}
          node={node}
          globeRadius={globeRadius}
          onHover={onHoverNode}
          onUnhover={onUnhoverNode}
        />
      ))}

      {markers.map((m, i) => (
        <CustomGlobeMarker key={`c-${i}`} marker={m} globeRadius={globeRadius} />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
      />
    </>
  );
}

const NODE_GEO: Record<string, { lat: number; lng: number; city: string }> = {
  "node-us-east-1": { lat: 39.0, lng: -77.5, city: "Ashburn, VA" },
  "node-eu-west-1": { lat: 50.1, lng: 8.7, city: "Frankfurt, DE" },
  "node-ap-south-1": { lat: 19.0, lng: 72.8, city: "Mumbai, IN" },
  "node-ap-east-2": { lat: 35.7, lng: 139.7, city: "Tokyo, JP" },
  "node-sa-east-1": { lat: -23.5, lng: -46.6, city: "Sao Paulo, BR" },
  "node-af-south-1": { lat: -33.9, lng: 18.4, city: "Cape Town, ZA" },
};

// Country-to-coordinates for TOR exit + proxy marker placement (avoids IP geolocation inaccuracy)
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Germany': { lat: 51.2, lng: 10.5 }, 'Netherlands': { lat: 52.1, lng: 5.3 },
  'France': { lat: 46.6, lng: 2.2 }, 'Sweden': { lat: 60.1, lng: 18.6 },
  'Switzerland': { lat: 46.8, lng: 8.2 }, 'Japan': { lat: 36.2, lng: 138.3 },
  'Singapore': { lat: 1.4, lng: 103.8 }, 'UK': { lat: 54.0, lng: -2.0 },
  'United Kingdom': { lat: 54.0, lng: -2.0 }, 'Canada': { lat: 56.1, lng: -106.3 },
  'Australia': { lat: -25.3, lng: 133.8 }, 'Brazil': { lat: -14.2, lng: -51.9 },
  'India': { lat: 20.6, lng: 79.0 }, 'United States': { lat: 39.8, lng: -98.6 },
  'US': { lat: 39.8, lng: -98.6 }, 'Russia': { lat: 61.5, lng: 105.3 },
  'Romania': { lat: 45.9, lng: 25.0 }, 'Italy': { lat: 41.9, lng: 12.6 },
  'Spain': { lat: 40.5, lng: -3.7 }, 'Norway': { lat: 60.5, lng: 8.5 },
  'Denmark': { lat: 56.3, lng: 10.3 }, 'Finland': { lat: 64.0, lng: 26.0 },
  'Poland': { lat: 52.2, lng: 19.1 }, 'Austria': { lat: 47.5, lng: 14.5 },
  'Belgium': { lat: 50.5, lng: 4.5 }, 'Ireland': { lat: 53.1, lng: -8.0 },
  'Portugal': { lat: 39.4, lng: -8.2 }, 'Greece': { lat: 39.1, lng: 22.0 },
  'Turkey': { lat: 39.0, lng: 35.0 }, 'Mexico': { lat: 23.6, lng: -102.5 },
  'South Africa': { lat: -30.6, lng: 24.0 }, 'China': { lat: 35.9, lng: 104.2 },
  'South Korea': { lat: 35.9, lng: 127.8 }, 'Hong Kong': { lat: 22.3, lng: 114.2 },
  'Argentina': { lat: -38.4, lng: -63.6 },
};

const GlobeComponent: React.FC<{ nodes?: Node[]; compact?: boolean; onLogout?: () => void }> = ({ nodes = [], compact, onLogout }) => {
  const enrichedNodes = nodes.map(n => ({
    ...n,
    lat: n.lat ?? NODE_GEO[n.id]?.lat ?? null,
    lng: n.lng ?? NODE_GEO[n.id]?.lng ?? null,
    city: n.city || NODE_GEO[n.id]?.city || "Unknown",
  }));

  const onlineCount = enrichedNodes.filter(n => n.status === "online" || n.status === "active").length;
  const pendingCount = enrichedNodes.filter(n => n.status === "pending").length;

  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleHoverNode = useCallback((node: Node, pos: { x: number; y: number }) => {
    setHoveredNode(node);
    setTooltipPos(pos);
  }, []);

  const handleUnhoverNode = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const [showMap, setShowMap] = useState(false);

  const MARKER_ICON = useMemo(() => L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="%2300ff88" stroke="%230cc" stroke-width="1" opacity="0.9"/></svg>'),
    iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -8],
  }), []);

  // Fetch user location + TOR exit location for custom globe markers
  const [markers, setMarkers] = useState<CustomMarker[]>([]);

  useEffect(() => {
    const fetchMarkers = async () => {
      const result: CustomMarker[] = [];
      try {
        const locR = await fetch(API_URL + '/api/ip-lookup?fields=lat,lon,city,country,timezone');
        const locD = await locR.json();
        if (locD.lat && locD.lon) {
          result.push({ lat: locD.lat, lng: locD.lon, color: '#00d4ff', label: locD.city || locD.country || 'You', icon: '📍' });
        }
      } catch {}
      try {
        const [torR, proxyRes] = await Promise.all([
          fetch(API_URL + '/api/tor/check-ip'),
          fetch(API_URL + '/api/rotating-proxy/status'),
        ]);
        const torD = await torR.json();
        const proxyD = await proxyRes.json();

        if (torD.torified) {
          const coords = COUNTRY_COORDS[torD.exit_country];
          if (coords) {
            result.push({ lat: coords.lat, lng: coords.lng, color: '#ff6ec7', label: torD.exit_country, icon: '🔄' });
          }
        } else if (proxyD?.active && proxyD?.current_proxy) {
          const cp = proxyD.current_proxy;
          const coords = COUNTRY_COORDS[cp.country] || COUNTRY_COORDS[proxyD.current_proxy.country];
          if (coords) {
            result.push({ lat: coords.lat, lng: coords.lng, color: '#ffaa00', label: cp.country || 'Proxy', icon: '🔗' });
          }
        }
      } catch {}
      setMarkers(result);
    };
    fetchMarkers();
    const id = setInterval(fetchMarkers, 30000);
    return () => clearInterval(id);
  }, []);

  if (compact) {
    return (
      <div style={{ position: "relative", height: "100%", borderRadius: 8, overflow: "hidden", background: "rgba(12,14,28,0.4)" }}>
        {/* Online/pending + map toggle - under tagline, visible on map */}
        <div style={{ position: "absolute", top: 68, left: 14, display: "flex", gap: 4, zIndex: 10000, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", background: "rgba(6,6,14,0.9)", padding: "3px 10px", borderRadius: 4 }}>{onlineCount} online</span>
          <span style={{ fontSize: 9, color: "#ffd700", fontFamily: "'JetBrains Mono', monospace", background: "rgba(6,6,14,0.9)", padding: "3px 10px", borderRadius: 4 }}>{pendingCount} pending</span>
          <button onClick={() => setShowMap(!showMap)} style={{ fontSize: 9, color: showMap ? "#ffd700" : "#aaa", fontFamily: "'JetBrains Mono', monospace", background: "rgba(6,6,14,0.9)", border: "1px solid rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>{showMap ? '🌐 GLOBE' : '🗺️ MAP'}</button>
        </div>
        {/* Shift+scroll zoom hint — bottom-left of globe */}
        <div style={{ position: "absolute", bottom: 10, left: "45%", zIndex: 10000, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "#00ff8888", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, fontWeight: 600 }}>SHIFT</span>
            <span style={{ color: "#00ff8844", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>+</span>
            <span style={{ color: "#00ff8866", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>SCROLL</span>
            <span style={{ color: "#00ff8844", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>=</span>
            <span style={{ color: "#00ff8888", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>ZOOM</span>
          </div>
        </div>
        {showMap ? (
          <MapContainer center={[20, 0]} zoom={1.5} style={{ width: "100%", height: "100%" }} zoomControl={false} attributionControl={false} scrollWheelZoom={true} dragging={true}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {enrichedNodes.filter(n => n.lat && n.lng).map(n => (
              <Marker key={n.id} position={[n.lat!, n.lng!]} icon={MARKER_ICON}>
                <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{n.id}<br/>{n.city}<br/>{n.status}</span>
                </Tooltip>
              </Marker>
            ))}
            {markers.map((m, i) => (
              <Marker key={`cm-${i}`} position={[m.lat, m.lng]} icon={MARKER_ICON}>
                <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{m.icon} {m.label}<br/>{m.lat.toFixed(2)}, {m.lng.toFixed(2)}</span>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        ) : (
        <Canvas
          camera={{ position: [0, 1.2, 6.5], fov: 40 }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          gl={{ antialias: true, alpha: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
        >
          <Scene markers={markers} nodes={enrichedNodes} showMap={showMap} onHoverNode={handleHoverNode} onUnhoverNode={handleUnhoverNode} />
        </Canvas>
        )}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 5 }} transition={{ duration: 0.15 }}
              style={{ ...styles.tooltip, left: Math.min(tooltipPos.x + 16, window.innerWidth - 260), top: tooltipPos.y - 20 }}>
              <div style={styles.tooltipHeader}><span style={{ ...styles.tooltipDot, backgroundColor: hoveredNode.status === "online" || hoveredNode.status === "active" ? "#00ff88" : hoveredNode.status === "pending" ? "#ffd700" : "#ff4757" }} /><span style={styles.tooltipId}>{hoveredNode.id}</span></div>
              <div style={styles.tooltipGrid}>
                <TooltipRow label="STATUS" value={hoveredNode.status.toUpperCase()} color={hoveredNode.status === "online" || hoveredNode.status === "active" ? "#00ff88" : hoveredNode.status === "pending" ? "#ffd700" : "#ff4757"} />
                <TooltipRow label="IP" value={hoveredNode.ip || "—"} color="#00d4ff" />
                <TooltipRow label="CITY" value={hoveredNode.city || "—"} color="#ccc" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h2 style={styles.title} className="cyan-text"><span style={{ fontSize: 8, color: '#00d4ff', animation: 'pulse 2s infinite' }}>&#9679;</span> Network Topology</h2>
          <div style={styles.badges}>
            <span style={{ ...styles.badge, borderColor: 'rgba(0, 255, 136, 0.3)', color: '#00ff88' }}>{onlineCount} online</span>
            <span style={{ ...styles.badge, borderColor: 'rgba(255, 215, 0, 0.3)', color: '#ffd700' }}>{pendingCount} pending</span>
          </div>
        </div>
      </div>

      <div style={styles.globeContainer}>
        <Canvas
          camera={{ position: [0, 1.2, 6.5], fov: 40 }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
            });
            gl.domElement.addEventListener('webglcontextrestored', () => {
              gl.setClearColor(0x000000, 0);
            });
          }}
        >
          <Scene
            markers={markers}
            nodes={enrichedNodes}
            showMap={showMap}
            onHoverNode={handleHoverNode}
            onUnhoverNode={handleUnhoverNode}
          />
        </Canvas>

        <AnimatePresence>
          {hoveredNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              transition={{ duration: 0.15 }}
              style={{
                ...styles.tooltip,
                left: Math.min(tooltipPos.x + 16, window.innerWidth - 260),
                top: tooltipPos.y - 20,
              }}
            >
              <div style={styles.tooltipHeader}>
                <span style={{
                  ...styles.tooltipDot,
                  backgroundColor: hoveredNode.status === "online" || hoveredNode.status === "active"
                    ? "#00ff88" : hoveredNode.status === "pending" ? "#ffd700" : "#ff4757",
                }} />
                <span style={styles.tooltipId}>{hoveredNode.id}</span>
              </div>
              <div style={styles.tooltipGrid}>
                <TooltipRow label="STATUS" value={hoveredNode.status.toUpperCase()} color={
                  hoveredNode.status === "online" || hoveredNode.status === "active" ? "#00ff88"
                    : hoveredNode.status === "pending" ? "#ffd700" : "#ff4757"
                } />
                <TooltipRow label="IP" value={hoveredNode.ip || "—"} color="#00d4ff" />
                <TooltipRow label="CITY" value={hoveredNode.city || "—"} color="#ccc" />
                <TooltipRow label="COUNTRY" value={hoveredNode.country || "—"} color="#ccc" />
                <TooltipRow label="LAT" value={hoveredNode.lat?.toFixed(2) || "—"} color="#888" />
                <TooltipRow label="LNG" value={hoveredNode.lng?.toFixed(2) || "—"} color="#888" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={styles.hudBottomLeft}>
          <span style={styles.hudLabel}>DRAG</span>
          <span style={styles.hudValue}>Rotate</span>
        </div>

        <div style={styles.hudBottomRight}>
          <span style={styles.hudLabel}>NODES</span>
          <span style={styles.hudValue}>{enrichedNodes.length}</span>
          <span style={styles.hudLabel}>STATUS</span>
          <span style={{ ...styles.hudValue, color: onlineCount > 0 ? '#00ff88' : '#ff4757' }}>
            {onlineCount > 0 ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>

        <div className="scan-line" />
      </div>
    </div>
  );
};

const TooltipRow: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ fontSize: 9, color: '#555', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }}>{label}</span>
    <span style={{ fontSize: 11, color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{value}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.7)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(0, 212, 255, 0.12)',
    overflow: 'hidden',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    textShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    animation: 'textGlowPulse 3s ease-in-out infinite',
  },
  badges: {
    display: 'flex',
    gap: 8,
  },
  badge: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 12,
    border: '1px solid',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
  },
  globeContainer: {
    position: 'relative' as const,
    height: 520,
    background: 'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.04) 0%, transparent 70%)',
  },
  tooltip: {
    position: 'fixed' as const,
    zIndex: 9999,
    background: 'rgba(8, 10, 22, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: 10,
    padding: '12px 16px',
    minWidth: 200,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 212, 255, 0.08)',
    pointerEvents: 'none' as const,
  },
  tooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  tooltipId: {
    fontSize: 13,
    color: '#fff',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
  },
  tooltipGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 5,
  },
  hudBottomLeft: {
    position: 'absolute' as const,
    bottom: 16,
    left: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    background: 'rgba(6, 6, 14, 0.7)',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0, 212, 255, 0.1)',
  },
  hudBottomRight: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    background: 'rgba(6, 6, 14, 0.7)',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(0, 212, 255, 0.1)',
  },
  hudLabel: {
    fontSize: 9,
    color: '#444',
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1,
  },
  hudValue: {
    fontSize: 12,
    color: '#00d4ff',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
  },
};

export default GlobeComponent;
