import React from "react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "C2", icon: "\uD83C\uDFE0" },
  { id: "ransom", label: "Ransom", icon: "\uD83D\uDD12" },
  { id: "ddos", label: "DDoS", icon: "\uD83C\uDF0A" },
  { id: "keylog", label: "Keylog", icon: "\u2328\uFE0F" },
  { id: "tor", label: "TOR", icon: "\uD83E\uDDE0" },
  { id: "proxy", label: "Chain", icon: "\uD83D\uDD17" },
  { id: "rotating", label: "Proxies", icon: "\uD83D\uDD04" },
  { id: "exfil", label: "Exfil", icon: "\uD83D\uDCE4" },
  { id: "spammer", label: "Spammer", icon: "\uD83D\uDCE7" },
  { id: "osint", label: "OSINT", icon: "\uD83D\uDD0D" },
  { id: "memory", label: "Memory", icon: "\uD83E\uDDE0" },
  { id: "tools", label: "Tools", icon: "\uD83D\uDEE0\uFE0F" },
  { id: "docs", label: "Docs", icon: "\uD83D\uDCD6" },
];

interface TabNavProps {
  active: string;
  onChange: (id: string) => void;
}

const TabNav: React.FC<TabNavProps> = ({ active, onChange }) => (
  <motion.nav
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    style={styles.nav}
  >
    {TABS.map((tab) => {
      const isActive = active === tab.id;
      return (
        <motion.button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            ...styles.tab,
            color: isActive ? "#00d4ff" : "#444",
            borderBottom: isActive ? "2px solid #00d4ff" : "2px solid transparent",
            textShadow: isActive ? "0 0 12px rgba(0, 212, 255, 0.5)" : "none",
          }}
          whileHover={{
            color: "#00d4ff",
            textShadow: "0 0 8px rgba(0, 212, 255, 0.3)",
            scale: 1.04,
          }}
          whileTap={{ scale: 0.97 }}
        >
          <span style={styles.icon}>{tab.icon}</span>
          <span style={styles.label}>{tab.label}</span>
          {isActive && (
            <motion.div
              layoutId="tabIndicator"
              style={styles.indicator}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      );
    })}
  </motion.nav>
);

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    gap: 2,
    margin: "0 20px 8px",
    padding: "6px 12px",
    background: "rgba(12, 14, 28, 0.7)",
    backdropFilter: "blur(16px)",
    borderRadius: 12,
    border: "1px solid rgba(0, 212, 255, 0.1)",
    justifyContent: "center",
    position: "relative",
    zIndex: 20,
  },
  tab: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    borderRadius: "8px 8px 0 0",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
    transition: "color 0.2s, text-shadow 0.2s",
    outline: "none",
  },
  icon: {
    fontSize: 14,
    lineHeight: 1,
  },
  label: {
    letterSpacing: 0.5,
  },
  indicator: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    height: 2,
    background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
    borderRadius: 1,
  },
};

export default TabNav;
