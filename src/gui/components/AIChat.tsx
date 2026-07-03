import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL } from "../config";

interface Message {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  thinking?: string;
  timestamp: string;
}

function extractThinking(raw: string): { thinking: string; clean: string } {
  let thinking = "";
  let clean = raw;
  const xmlThink = raw.match(/<think>([\s\S]*?)<\/think>/i) || raw.match(/<\s*thinking\s*>([\s\S]*?)<\s*\/\s*thinking\s*>/i);
  if (xmlThink) {
    thinking = xmlThink[1].trim();
    clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\s*thinking\s*>[\s\S]*?<\s*\/\s*thinking\s*>/gi, "").trim();
  } else {
    const tpIdx = raw.search(/Thinking Process:/i);
    if (tpIdx >= 0) {
      const afterTp = raw.slice(tpIdx);
      const lines = afterTp.split("\n");
      let thinkLines: string[] = [];
      let respLines: string[] = [];
      let foundResponse = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!foundResponse) {
          const trimmed = line.trim();
          if (i > 2 && trimmed.length > 0 && !trimmed.match(/^(\d+\.|\*|\-|#)/) && trimmed.match(/^[A-Z]/)) {
            foundResponse = true;
            respLines.push(line);
          } else {
            thinkLines.push(line);
          }
        } else {
          respLines.push(line);
        }
      }
      thinking = thinkLines.join("\n").trim();
      clean = respLines.join("\n").trim();
      if (thinking.startsWith("Thinking Process:")) thinking = thinking.replace(/^Thinking Process:\s*/i, "").trim();
    }
  }
  return { thinking, clean };
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "Name's Chatz. I run this shitshow. Wanna pwn some boxes, boss?\n\nTry: 'Max Evasion', 'Deploy ransomware', 'Status check', 'DDoS something'.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeModel, setActiveModel] = useState("loading...");
  const [isFallback, setIsFallback] = useState(false);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [collapsedThinking, setCollapsedThinking] = useState<Set<string>>(new Set());
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [selectingProvider, setSelectingProvider] = useState(false);

  const selectProvider = async (name: string) => {
    setSelectingProvider(true);
    try {
      await fetch(API_URL + '/api/ai/provider/select', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: name }),
      });
      // Force model refresh
      const r = await fetch(API_URL + '/api/ai/model');
      const d = await r.json();
      setActiveModel(d.model || 'unknown');
      setIsFallback(d.is_fallback || false);
    } catch {}
    setSelectingProvider(false);
    setShowProviderMenu(false);
  };

  useEffect(() => {
    const poll = () => {
      fetch(API_URL + '/api/ai/model')
        .then(r => r.json())
        .then(d => {
          setActiveModel(d.model || d.provider || 'unknown');
          setIsFallback(d.is_fallback || false);
          setAllProviders(d.providers || []);
        })
        .catch(() => setActiveModel('offline'));
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  // Load persistent conversation history from Turso cloud memory
  useEffect(() => {
    fetch(API_URL + '/api/memory/conversations?limit=20')
      .then(r => r.json())
      .then(d => {
        if (d.conversations && d.conversations.length > 0) {
          const historyMsgs: Message[] = d.conversations.map((c: any, i: number) => {
            const msg: Message = {
              id: `history-${i}`,
              role: c.role as "ai" | "user",
              content: c.content,
              timestamp: c.timestamp || new Date().toISOString(),
            };
            if (c.role === "ai") {
              const { thinking, clean } = extractThinking(c.content);
              msg.thinking = thinking || undefined;
              msg.content = clean;
            }
            return msg;
          });
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = historyMsgs.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
        }
      })
      .catch(() => {});
  }, []);

  // Auto-collapse new reasoning windows only (never re-collapse expanded ones)
  const seenThinkRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    setCollapsedThinking(prev => {
      const next = new Set(prev);
      messages.forEach(m => {
        if (m.thinking && !seenThinkRef.current.has(m.id)) {
          next.add(m.id);
          seenThinkRef.current.add(m.id);
        }
      });
      return next;
    });
  }, [messages]);

  function renderContent(text: string): React.ReactNode {
  const parts = text.split(/(```[^`]*```|```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3).trim();
      const lang = inner.split('\n')[0].match(/^[a-zA-Z0-9]+$/) ? inner.split('\n')[0] : '';
      const code = lang ? inner.slice(lang.length).trim() : inner.trim();
      return (
        <CodeBlock key={i} language={lang} code={code} />
      );
    }
    return part.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < part.split('\n').length - 1 && <br />}
      </span>
    ));
  });
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{
      margin: '8px 0', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)',
      borderLeft: '3px solid rgba(0,212,255,0.4)', borderRadius: '2px 8px 8px 2px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px 0' }}>
        <span style={{ color: '#00d4ff55', fontSize: 8, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1 }}>
          {language || 'code'}
        </span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={copy}
          style={{ padding: '2px 8px', background: copied ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 4, color: copied ? '#00ff88' : '#00d4ff88', fontSize: 8, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
          {copied ? '✓ COPIED' : '📋 COPY'}
        </motion.button>
      </div>
      <pre style={{
        margin: 0, padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: '#88cccc', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowX: 'auto', maxHeight: 300, overflowY: 'auto',
      }}>
        {code}
      </pre>
    </div>
  );
}

const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: userMsg.content }),
      });

      const result = await response.json();
      let rawContent = result.response || "Processing...";

      const { thinking: thinkText, clean: cleanRaw } = extractThinking(rawContent);
      let cleanContent = cleanRaw;

      if (result.executed_actions && result.executed_actions.length > 0) {
        cleanContent += `\n\n✓ Actions executed: ${result.executed_actions.join(", ")}`;
      }

      if (result.status === "error") {
        cleanContent = `[Error] ${cleanContent}`;
      }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: cleanContent,
        thinking: thinkText || undefined,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `[Network Error] ${err instanceof Error ? err.message : "Unknown"}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMutation = async (strategy: string) => {
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: `Mutation: ${strategy}`,
      timestamp: new Date().toISOString(),
    }]);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/mutate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: strategy }),
      });
      const result = await response.json();

      let content: string;
      let thinkText = "";
      if (result.status === "success") {
        const actionsList = (result.actions || []).map((a: string) => `  → ${a}`).join("\n");
        let notes = result.notes || "";
        const { thinking, clean } = extractThinking(notes);
        thinkText = thinking;
        notes = clean;
        content = `Mutation Executed [${result.mutation_id}]\n${actionsList}\n\nScore: ${result.score}/100 | Confidence: ${result.confidence}%\n\n${notes}`;
      } else {
        content = `[Error] ${result.notes || "Unknown error"}`;
      }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content,
        thinking: thinkText || undefined,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `[Error] ${err instanceof Error ? err.message : "Unknown"}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickCommands = [
    { label: "Max Evasion", strategy: "Set evasion to maximum aggressive mode, rotate all IPs, enable DOH, activate traffic mimicry across all nodes" },
    { label: "Silent Mode", strategy: "Switch to ghost/silent mode: minimal beacon interval, disable harvesting, enable DNS over HTTPS, reduce all network footprint" },
    { label: "Status Check", strategy: "Analyze current C2 state: how many nodes are active, what credentials have been harvested, current evasion posture, and recommend next actions" },
    { label: "Global Rotation", strategy: "Rotate all node IPs, change beacon encryption keys, shuffle C2 endpoints, and update DNS strategy across the entire botnet" },
    { label: "Harvest Now", strategy: "Force immediate credential harvest on all active nodes: browser passwords, SSH keys, git credentials, keyring, clipboard" },
    { label: "Threat Response", strategy: "Analyze recent threats from system logs and automatically mutate all nodes to avoid detected signatures" },
  ];

  return (
    <div style={styles.card}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.brainIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7.58 2 4 5.58 4 10c0 2.25 1 4.25 2.5 5.75V20a1 1 0 001 1h9a1 1 0 001-1v-4.25C19 14.25 20 12.25 20 10c0-4.42-3.58-8-8-8z" stroke="#00ff88" strokeWidth="1.5" fill="none"/>
              <circle cx="12" cy="10" r="3" stroke="#00ff88" strokeWidth="1.5" fill="none"/>
              <path d="M9 17l1.5 1.5L12 17l1.5 1.5L15 17" stroke="#00ff88" strokeWidth="1" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 style={styles.title}>Chatz</h2>
            <p style={styles.sub}>Command & Control Intelligence</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={{ ...styles.statusDot, backgroundColor: isFallback ? '#ffd700' : '#00ff88', boxShadow: isFallback ? '0 0 8px #ffd70066' : '0 0 8px #00ff8866' }} />
          <span style={{ ...styles.statusText, color: isFallback ? '#ffd700' : '#666' }}>{isTyping ? "Processing..." : isFallback ? "Fallback" : "Online"}</span>
          <span style={{ ...styles.modelTag, borderColor: isFallback ? 'rgba(255,215,0,0.2)' : 'rgba(0, 255, 136, 0.06)', color: isFallback ? '#ffd700' : '#334', cursor: 'pointer', position: 'relative' }}
            onClick={() => setShowProviderMenu(!showProviderMenu)}>
            {isFallback ? '⚠ ' : ''}{activeModel}
            {showProviderMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'rgba(12,14,28,0.95)', backdropFilter: 'blur(16px)', borderRadius: 8, border: '1px solid rgba(0,212,255,0.15)', padding: '6px 0', zIndex: 100, minWidth: 180, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ color: '#555', fontSize: 8, padding: '4px 12px', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>Select Provider</div>
                {allProviders.map((p: any) => (
                  <div key={p.name} onClick={() => selectProvider(p.name)}
                    style={{ padding: '6px 12px', cursor: p.online ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: p.online ? '#ccc' : '#444', background: p.name === activeModel.split(':')[0] || activeModel.includes(p.model) ? 'rgba(0,212,255,0.06)' : 'transparent' }}>
                    <span style={{ color: p.online ? '#00ff88' : '#ff4757', fontSize: 8 }}>{p.online ? '●' : '○'}</span>
                    <span style={{ flex: 1 }}>{p.name}</span>
                    {selectingProvider && <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }} style={{ display: 'inline-block', fontSize: 10 }}>⟳</motion.span>}
                  </div>
                ))}
              </div>
            )}
          </span>
        </div>
      </div>

      {/* ── Body: Chat + Quick Commands ── */}
      <div style={styles.body}>
        {/* ── Chat Panel ── */}
        <div style={styles.chatPanel}>
          <div ref={containerRef} style={styles.messagesContainer}>
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    ...styles.message,
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    background: msg.role === "user"
                      ? 'rgba(0, 255, 136, 0.08)'
                      : 'rgba(20, 22, 35, 0.8)',
                    border: msg.role === "user"
                      ? '1px solid rgba(0, 255, 136, 0.2)'
                      : '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div style={{ fontSize: 8, color: msg.role === "user" ? "#00d4ff" : "#ff6ec7", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>
                    {msg.role === "user" ? "You" : "Chatz"}
                  </div>
                  {msg.thinking && (
                    <div style={{ marginBottom: 8 }}>
                      <div
                        onClick={() => {
                          setCollapsedThinking(prev => {
                            const next = new Set(prev);
                            if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
                            return next;
                          });
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 8px", userSelect: "none", borderRadius: 6, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", marginBottom: 6 }}
                      >
                        <span style={{
                          color: "#c084fc", fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                          display: "inline-block", transform: collapsedThinking.has(msg.id) ? "rotate(0deg)" : "rotate(90deg)",
                          transition: "transform 0.2s ease",
                        }}>▶</span>
                        <span style={{ color: "#c084fc", fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1 }}>
                          CHATZ REASONING
                        </span>
                        <span style={{ color: "#666", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>
                          {collapsedThinking.has(msg.id) ? "show" : "hide"}
                        </span>
                      </div>
                      <div style={{
                        overflow: "hidden",
                        maxHeight: collapsedThinking.has(msg.id) ? 0 : 250,
                        opacity: collapsedThinking.has(msg.id) ? 0 : 1,
                        transition: "max-height 0.3s ease, opacity 0.2s ease",
                        background: "rgba(168,85,247,0.06)",
                        borderLeft: "3px solid rgba(168,85,247,0.4)",
                        borderRadius: "0 6px 6px 0",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: "#b0b0d0",
                        fontStyle: "italic",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                        padding: collapsedThinking.has(msg.id) ? "0 12px" : "10px 12px",
                        overflowY: "auto",
                      }}>
                        {msg.thinking}
                      </div>
                    </div>
                  )}
                  <div style={msg.role === "user" ? styles.userMsg : styles.aiMsg}>
                    {renderContent(msg.content)}
                  </div>
                  <div style={{
                    fontSize: 9, marginTop: 6,
                    color: msg.role === "user" ? '#00ff8866' : '#333',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={styles.typingIndicator}
              >
                <span style={styles.typingDot} />
                <span style={styles.typingDot} />
                <span style={styles.typingDot} />
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputRow}>
            <input
              style={styles.input}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command for the AI Brain..."
              disabled={isTyping}
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={styles.sendBtn}
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
            >
              Execute
            </motion.button>
          </div>
        </div>

        {/* ── Quick Commands Sidebar ── */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00ff88" strokeWidth="1.5" fill="none"/>
            </svg>
            Chatz Commands
          </div>
          <div style={styles.sidebarList}>
            {quickCommands.map((cmd, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.02, borderColor: 'rgba(0, 255, 136, 0.25)', background: 'rgba(0, 255, 136, 0.04)' }}
                whileTap={{ scale: 0.98 }}
                style={styles.quickBtn}
                onClick={() => handleMutation(cmd.strategy)}
              >
                <div style={styles.quickBtnInner}>
                  <span style={styles.quickLabel}>{cmd.label}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(12, 14, 28, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 14,
    border: '1px solid rgba(0, 255, 136, 0.12)',
    boxShadow: '0 4px 40px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(0, 255, 136, 0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brainIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(0, 255, 136, 0.06)',
    border: '1px solid rgba(0, 255, 136, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    color: '#00d4ff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    textShadow: '0 0 8px rgba(0, 212, 255, 0.3)',
    animation: 'textGlowPulse 3s ease-in-out infinite',
  },
  sub: {
    margin: 0,
    color: '#444',
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#00ff88',
    boxShadow: '0 0 8px #00ff8866',
    animation: 'pulse 2s infinite',
  },
  statusText: {
    color: '#666',
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
  modelTag: {
    color: '#334',
    fontSize: 9,
    fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(0, 255, 136, 0.04)',
    border: '1px solid rgba(0, 255, 136, 0.06)',
    padding: '2px 8px',
    borderRadius: 4,
    marginLeft: 6,
  },
  body: {
    display: 'flex',
    height: 360,
  },
  chatPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(255, 255, 255, 0.03)',
    minWidth: 0,
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px 16px',
  },
  message: {
    padding: '10px 14px',
    borderRadius: 10,
    maxWidth: '80%',
    color: '#ccc',
  },
  userMsg: {
    fontSize: 13,
    lineHeight: 1.5,
    color: '#e0e0e0',
  },
  aiMsg: {
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    color: '#bbb',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '10px 14px',
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: 6, height: 6, borderRadius: '50%',
    backgroundColor: '#00ff88',
    animation: 'pulse 1s infinite',
    display: 'inline-block',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 16px 12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(6, 6, 14, 0.6)',
    border: '1px solid rgba(0, 255, 136, 0.12)',
    borderRadius: 8,
    color: '#e0e0e0',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    border: 'none',
    borderRadius: 8,
    color: '#0a0a1a',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'nowrap',
  },
  sidebar: {
    width: 200,
    flexShrink: 0,
    padding: '14px 14px 12px',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    color: '#555',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  sidebarList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
  },
  quickBtn: {
    padding: 0,
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  quickBtnInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    gap: 8,
  },
  quickLabel: {
    color: '#888',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    lineHeight: 1.3,
  },
};

export default AIChat;
