import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

const APPLE_MAIL_DARK =
  "background:#1a1a2e;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;border-radius:12px;max-width:600px;margin:0 auto;border:1px solid rgba(0,212,255,0.15)";

interface EmailComposerProps {
  onGenerateWithAI: (prompt: string) => Promise<string>;
  onSave: (subject: string, body: string) => void;
  subject: string;
  body: string;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  tone: string;
  template: string;
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  onGenerateWithAI,
  onSave,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  tone,
  template,
}) => {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await onGenerateWithAI(aiPrompt);
      if (result) {
        const lines = result.split("\n");
        let subj = "";
        let bdy = result;
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const match = lines[i].match(/^Subject:\s*(.+)/i);
          if (match) {
            subj = match[1].trim();
            bdy = lines.slice(i + 1).join("\n").trim();
            break;
          }
        }
        if (subj) onSubjectChange(subj);
        if (bdy) onBodyChange(bdy);
      }
    } finally {
      setGenerating(false);
    }
  };

  const insertVariable = (v: string) => {
    if (editorRef.current) {
      const ta = editorRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = body;
      const newText = text.substring(0, start) + v + text.substring(end);
      onBodyChange(newText);
    } else {
      onBodyChange(body + v);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.title}><span style={styles.dot} />Email Composer</h3>
        <div style={styles.modeToggle}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ ...styles.modeBtn, background: mode === "edit" ? "rgba(0,212,255,0.15)" : "rgba(6,6,14,0.4)", color: mode === "edit" ? "#00d4ff" : "#555", borderColor: mode === "edit" ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.06)" }}
            onClick={() => setMode("edit")}
          >
            ✏️ Edit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ ...styles.modeBtn, background: mode === "preview" ? "rgba(46,213,115,0.15)" : "rgba(6,6,14,0.4)", color: mode === "preview" ? "#2ed573" : "#555", borderColor: mode === "preview" ? "rgba(46,213,115,0.3)" : "rgba(255,255,255,0.06)" }}
            onClick={() => setMode("preview")}
          >
            👁 Preview
          </motion.button>
        </div>
      </div>

      <div style={styles.fieldRow}>
        <span style={styles.fieldLabel}>Subject:</span>
        <input
          style={styles.subjectInput}
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Enter email subject..."
        />
      </div>

      <div style={styles.varRow}>
        <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Insert:</span>
        {["{company}", "{job_title}", "{industry}", "{product}", "{tracking_link}"].map((v) => (
          <motion.button
            key={v}
            whileHover={{ scale: 1.05, background: "rgba(0,212,255,0.1)" }}
            whileTap={{ scale: 0.95 }}
            style={styles.varBtn}
            onClick={() => insertVariable(v)}
          >
            {v}
          </motion.button>
        ))}
      </div>

      <div style={styles.aiRow}>
        <input
          style={{ ...styles.subjectInput, flex: 1 }}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder='e.g. "Create a phishing email for PayPal account verification"'
        />
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ ...styles.aiBtn, opacity: generating ? 0.6 : 1 }}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block" }}>◌</motion.span>
          ) : "🧠"}
          <span style={{ color: "#a855f7", fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>CHATZ GENERATE</span>
        </motion.button>
      </div>

      {mode === "edit" ? (
        <textarea
          ref={editorRef}
          style={styles.editor}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Write or paste HTML email body here...&#10;&#10;Use {company}, {job_title}, {industry}, {tracking_link} as variables.&#10;Or ask Chatz to generate one for you above."
          spellCheck={false}
        />
      ) : (
        <div style={styles.preview}>
          <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#555", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>Preview — how recipients will see this email</span>
            <span style={{ color: "#2ed573", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{tone}</span>
            <span style={{ color: "#00d4ff", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{template}</span>
          </div>
          <div style={{ padding: 0, flex: 1, overflow: "auto" }}>
            <iframe
              style={{ width: "100%", height: "100%", border: "none", background: "#1a1a2e" }}
              srcDoc={`<html><body style="${APPLE_MAIL_DARK}"><div style="font-size:11px;color:#666;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px">Subject: ${subject.replace(/</g,'&lt;')}</div>${body}</div></body></html>`}
              title="Email Preview"
            />
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ ...styles.saveBtn }}
          onClick={() => onSave(subject, body)}
        >
          💾 Save Draft
        </motion.button>
        <span style={{ color: "#333", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
          {body.length} chars | {body.split("\n").length} lines
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 8 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, color: "#00d4ff", fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  dot: { fontSize: 8, color: "#2ed573" },
  modeToggle: { display: "flex", gap: 4 },
  modeBtn: { padding: "5px 14px", borderRadius: 8, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", border: "1px solid", cursor: "pointer", transition: "all 0.15s", outline: "none" },
  fieldRow: { display: "flex", alignItems: "center", gap: 8 },
  fieldLabel: { color: "#888", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, minWidth: 60 },
  subjectInput: {
    flex: 1, padding: "8px 12px", background: "rgba(6,6,14,0.6)", border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 8, color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: "none",
  },
  varRow: { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" },
  varBtn: {
    padding: "3px 8px", background: "rgba(6,6,14,0.5)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6, color: "#888", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", outline: "none",
  },
  aiRow: { display: "flex", gap: 8 },
  aiBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
    background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)",
    borderRadius: 8, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", outline: "none",
  },
  editor: {
    width: "100%", minHeight: 340, padding: 16, background: "rgba(6,6,14,0.7)",
    border: "1px solid rgba(0,212,255,0.12)", borderRadius: 10,
    color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
    lineHeight: 1.6, resize: "vertical", outline: "none", tabSize: 2,
  },
  preview: {
    minHeight: 340, background: "rgba(6,6,14,0.7)", border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column",
  },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  saveBtn: {
    padding: "6px 16px", background: "rgba(46,213,115,0.1)", border: "1px solid rgba(46,213,115,0.2)",
    borderRadius: 8, color: "#2ed573", fontSize: 10, fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace", cursor: "pointer", outline: "none",
  },
};

export default EmailComposer;
