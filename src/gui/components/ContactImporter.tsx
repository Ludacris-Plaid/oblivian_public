import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  email: string;
  company?: string;
  job_title?: string;
  industry?: string;
  company_size?: string;
}

interface ContactImporterProps {
  contacts: Contact[];
  count: number;
  onImportRaw: (contacts: Contact[]) => void;
  onAddManual: (contact: Contact) => void;
  onRemove: (email: string) => void;
}

const ContactImporter: React.FC<ContactImporterProps> = ({ contacts, count, onImportRaw, onAddManual, onRemove }) => {
  const [showImport, setShowImport] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const lines = text.split("\n").filter(l => l.trim());
    const parsed: Contact[] = [];

    for (const line of lines) {
      const isCSV = line.includes(",");
      if (isCSV) {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const email = cols.find(c => c.includes("@")) || "";
        if (email) {
          parsed.push({
            email,
            company: cols[1] || undefined,
            job_title: cols[2] || undefined,
            industry: cols[3] || undefined,
          });
        }
      } else {
        const email = line.trim();
        if (email.includes("@")) parsed.push({ email });
      }
    }

    if (parsed.length > 0) {
      onImportRaw(parsed);
      setShowImport(false);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleManualAdd = () => {
    if (!manualEmail || !manualEmail.includes("@")) return;
    onAddManual({ email: manualEmail, company: manualCompany || undefined, job_title: manualTitle || undefined });
    setManualEmail(""); setManualCompany(""); setManualTitle(""); setShowManual(false);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.title}><span style={styles.dot} />Contacts</h3>
        <div style={{ display: "flex", gap: 4 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={styles.btn} onClick={() => setShowImport(!showImport)}>
            📁 Import
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={styles.btn} onClick={() => setShowManual(!showManual)}>
            + Add
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={fileRef} type="file" accept=".txt,.csv" onChange={handleFile} style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }} />
              <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>.txt (one per line) or .csv</span>
            </div>
          </motion.div>
        )}
        {showManual && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={styles.addForm}>
              <input style={styles.smallInput} placeholder="Email *" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
              <div style={{ display: "flex", gap: 4 }}>
                <input style={{ ...styles.smallInput, flex: 1 }} placeholder="Company" value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} />
                <input style={{ ...styles.smallInput, flex: 1 }} placeholder="Job Title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={styles.addBtn} onClick={handleManualAdd}>Add Contact</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
        {count} in pool | {contacts.length} showing
      </div>

      <div style={styles.list}>
        {contacts.slice(0, 30).map((c, i) => (
          <motion.div key={c.email + i} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }} style={styles.contactRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#ccc", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                {c.company && <span style={{ color: "#00d4ff", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{c.company}</span>}
                {c.job_title && <span style={{ color: "#a855f7", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{c.job_title}</span>}
                {c.industry && <span style={{ color: "#555", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{c.industry}</span>}
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={{ ...styles.iconBtn, color: "#ff4757" }} onClick={() => onRemove(c.email)}>🗑</motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 6 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, color: "#00d4ff", fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  dot: { fontSize: 8, color: "#2ed573" },
  btn: {
    padding: "4px 12px", fontSize: 9, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 6, color: "#00d4ff", cursor: "pointer", outline: "none",
  },
  addForm: { display: "flex", flexDirection: "column", gap: 6, padding: "8px 0" },
  smallInput: {
    padding: "6px 10px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 6, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, outline: "none",
  },
  addBtn: {
    padding: "6px 14px", background: "rgba(46,213,115,0.1)", border: "1px solid rgba(46,213,115,0.2)",
    borderRadius: 6, color: "#2ed573", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", outline: "none",
  },
  list: { display: "flex", flexDirection: "column", gap: 3, maxHeight: 360, overflowY: "auto" },
  contactRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    padding: "5px 10px", background: "rgba(6,6,14,0.4)", borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.03)",
  },
  iconBtn: { padding: "2px 4px", background: "transparent", border: "none", fontSize: 10, cursor: "pointer", outline: "none", fontFamily: "'JetBrains Mono', monospace" },
};

export default ContactImporter;
