"""Tool Engine — manage execution of external security tools via subprocess.
Supports: nmap, hydra, sqlmap, hashcat, responder, wpscan, ffuf, impacket,
          john, searchsploit, nikto, gobuster, enum4linux, smbmap, whatweb.
"""
import asyncio
import json
import time
import shlex
import os
import shutil
from typing import Dict, Optional
from dataclasses import dataclass, field


@dataclass
class ToolSpec:
    name: str
    command: str
    description: str
    category: str
    dangerous: bool = False
    default_timeout: int = 120

TOOLS: Dict[str, ToolSpec] = {
    "nmap": ToolSpec(
        "nmap", "nmap",
        "Network port scanner — OS detection, service enumeration, NSE scripts",
        "scanner", default_timeout=180,
    ),
    "hydra": ToolSpec(
        "hydra", "hydra",
        "Multi-protocol brute-force — SSH, FTP, HTTP, RDP, MySQL, WordPress login, 50+ protocols",
        "brute-force", dangerous=True, default_timeout=300,
    ),
    "sqlmap": ToolSpec(
        "sqlmap", "sqlmap",
        "Automated SQL injection detection & exploitation — DB dumping, os-shell",
        "exploitation", dangerous=True, default_timeout=180,
    ),
    "hashcat": ToolSpec(
        "hashcat", "hashcat",
        "GPU-accelerated password hash cracking — 300+ hash modes, NTLM, MD5, bcrypt",
        "cracking", default_timeout=600,
    ),
    "responder": ToolSpec(
        "responder", "responder",
        "LLMNR/NBT-NS/mDNS poisoning — capture NetNTLM hashes, SMB credential relay",
        "poisoning", dangerous=True, default_timeout=120,
    ),
    "wpscan": ToolSpec(
        "wpscan", "wpscan",
        "WordPress vulnerability scanner — plugin/theme enumeration, user discovery, backup scanning",
        "scanner", default_timeout=180,
    ),
    "ffuf": ToolSpec(
        "ffuf", "ffuf",
        "Fast web fuzzer — directory discovery, subdomain enumeration, parameter fuzzing, virtual host discovery",
        "scanner", default_timeout=120,
    ),
    "impacket": ToolSpec(
        "impacket", "secretsdump.py",
        "Windows credential dumping — SAM, LSA Secrets, NTDS.dit, cached domain credentials",
        "exploitation", dangerous=True, default_timeout=180,
    ),
    "john": ToolSpec(
        "john", "john",
        "Password cracker — 500+ hash formats, wordlist + rules, incremental mode, GPU support",
        "cracking", default_timeout=300,
    ),
    "searchsploit": ToolSpec(
        "searchsploit", "searchsploit",
        "Exploit-DB search — look up CVEs, exploits, shellcode by keyword or CVE ID",
        "scanner", default_timeout=60,
    ),
    "nikto": ToolSpec(
        "nikto", "nikto",
        "Web server vulnerability scanner — 6700+ checks for dangerous files, outdated software, CGI issues, server misconfigurations",
        "scanner", default_timeout=180,
    ),
    "gobuster": ToolSpec(
        "gobuster", "gobuster",
        "Directory/subdomain/VHost brute-forcing — DNS subdomain enumeration, file busting with wordlists",
        "scanner", default_timeout=120,
    ),
    "enum4linux": ToolSpec(
        "enum4linux", "enum4linux",
        "Windows/SMB enumeration — users, shares, OS info, password policies, RID cycling",
        "exploitation", dangerous=True, default_timeout=120,
    ),
    "smbmap": ToolSpec(
        "smbmap", "smbmap",
        "SMB enumeration + file browsing — share access, download/upload, execute commands",
        "exploitation", dangerous=True, default_timeout=120,
    ),
    "whatweb": ToolSpec(
        "whatweb", "whatweb",
        "Web fingerprinting — CMS detection, JS libraries, web server versions, analytics, security headers",
        "scanner", default_timeout=60,
    ),
}


class ToolEngine:
    def __init__(self):
        self.running: Dict[int, asyncio.subprocess.Process] = {}
        self.history: list = []
        self._id_counter = 0

    def get_tools(self) -> list:
        return [
            {
                "name": t.name,
                "description": t.description,
                "category": t.category,
                "dangerous": t.dangerous,
                "available": shutil.which(shlex.split(t.command)[0]) is not None or os.path.exists(shlex.split(t.command)[0]),
            }
            for t in TOOLS.values()
        ]

    def _next_id(self) -> int:
        self._id_counter += 1
        return self._id_counter

    async def run(
        self,
        tool_name: str,
        args: list,
        target: str = "",
        triggered_by: str = "user",
        timeout: int = 0,
        memory=None,
    ) -> dict:
        spec = TOOLS.get(tool_name)
        if not spec:
            return {"status": "error", "message": f"Unknown tool: {tool_name}"}

        cmd_args = [str(a) for a in args if a]

        # nmap needs --unprivileged in Docker/containers (no raw socket access)
        if tool_name == "nmap":
            has_priv = any(a in ("--privileged", "--unprivileged") for a in cmd_args)
            if not has_priv:
                cmd_args.insert(0, "--unprivileged")
            # Strip root-required flags (-O, -A, -sC for OS/service detection needs root)
            root_flags = {"-O", "-A", "-sC", "-sV", "-O"}
            cmd_args = [a for a in cmd_args if a not in root_flags]

        cmd_parts = shlex.split(spec.command) + cmd_args
        tmt = timeout or spec.default_timeout
        execution_id = self._next_id()

        result = {
            "id": execution_id,
            "tool": tool_name,
            "target": target,
            "args": " ".join(str(a) for a in args),
            "status": "running",
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_ms": 0,
            "output": "",
            "summary": "",
            "triggered_by": triggered_by,
        }

        try:
            started = time.time()
            proc = await asyncio.create_subprocess_exec(
                *cmd_parts,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            self.running[execution_id] = proc

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=tmt
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                result["status"] = "timeout"
                result["output"] = f"Timeout after {tmt}s"
                result["duration_ms"] = int((time.time() - started) * 1000)
                return result

            duration = int((time.time() - started) * 1000)
            out_text = (stdout or b"").decode(errors="replace")[:50000]
            err_text = (stderr or b"").decode(errors="replace")[:5000]

            result["duration_ms"] = duration
            result["output"] = out_text
            if err_text:
                result["output"] += f"\n\n[STDERR]\n{err_text}"

            if proc.returncode == 0:
                result["status"] = "completed"
                summary = self._summarize(tool_name, out_text)
                result["summary"] = summary
                if tool_name == "nmap":
                    result["ports"] = self._parse_nmap_ports(out_text)
                elif tool_name == "hydra":
                    result["credentials"] = self._parse_hydra_creds(out_text)
            else:
                result["status"] = "failed"
                result["summary"] = f"Exit code {proc.returncode}"

            self.history.append(result)
            if len(self.history) > 200:
                self.history = self.history[-200:]

            if memory:
                await memory.set(f"tool_last_{tool_name}", {
                    "id": execution_id, "status": result["status"],
                    "summary": result["summary"][:200],
                    "at": result["started_at"],
                })

        except FileNotFoundError:
            result["status"] = "failed"
            result["output"] = f"Tool '{spec.command}' not found"
            result["summary"] = "Binary not found"
        except Exception as e:
            result["status"] = "failed"
            result["output"] = str(e)
            result["summary"] = f"Error: {str(e)[:100]}"
        finally:
            self.running.pop(execution_id, None)

        return result

    def _summarize(self, tool: str, output: str) -> str:
        lines = output.strip().split("\n")
        if tool == "nmap":
            ports = [l for l in lines if "/tcp" in l or "/udp" in l]
            return f"{len(ports)} ports found" if ports else "Scan complete, no open ports listed"
        elif tool == "hydra":
            for l in lines:
                if "login:" in l.lower() or "password:" in l.lower():
                    return l.strip()[:200]
            return "Brute-force complete"
        elif tool == "sqlmap":
            for l in lines:
                if "vulnerable" in l.lower() or "parameter" in l.lower() or "back-end" in l.lower():
                    return l.strip()[:200]
            return "Scan complete"
        elif tool == "hashcat":
            for l in lines:
                if "recovered" in l.lower() or "cracked" in l.lower() or "1/1" in l:
                    return l.strip()[:200]
            return "Cracking session complete"
        elif tool == "responder":
            found = [l for l in lines if "vulnerabilit" in l.lower() or "identified" in l.lower() or "warning" in l.lower()]
            return f"{len(found)} issues found" if found else "WPScan complete"
        elif tool == "nikto":
            vulns = [l for l in lines if "+ " in l and ("OSVDB" in l or "CVE" in l or "MS10" in l or "outdated" in l.lower())]
            return f"{len(vulns)} vulnerabilities found" if vulns else "Nikto scan complete"
        elif tool == "gobuster":
            found = [l for l in lines if "Status: 200" in l or "Status: 301" in l or "Status: 302" in l or "Found:" in l]
            return f"{len(found)} items found" if found else "Gobuster scan complete"
        elif tool == "enum4linux":
            for l in lines:
                if "users" in l.lower() or "shares" in l.lower() or "password" in l.lower():
                    return l.strip()[:200]
            return "Enum4linux complete"
        elif tool == "smbmap":
            for l in lines:
                if "READ" in l or "WRITE" in l or "NO ACCESS" in l or "Disk" in l:
                    return l.strip()[:200]
            return "SMBMap scan complete"
        elif tool == "whatweb":
            sites = [l for l in lines if "http" in l.lower() and ("[" in l or "]" in l)]
            return f"{len(sites)} technologies identified" if sites else "WhatWeb scan complete"
        elif tool == "ffuf":
            found = [l for l in lines if "Status: 200" in l or "Status: 301" in l or "Status: 302" in l]
            return f"{len(found)} paths found (200/301/302)" if found else "Ffuf scan complete"
        elif tool == "impacket":
            for l in lines:
                if "cleartext" in l.lower() or "ntlm" in l.lower() or "sam" in l.lower():
                    return l.strip()[:200]
            return "Impacket dump complete"
        elif tool == "john":
            for l in lines:
                if "(" in l and ")" in l and ":" not in l.split(" (")[0]:
                    return l.strip()[:200]
            return "John cracking complete"
        elif tool == "searchsploit":
            exploits = [l for l in lines if "|" in l]
            return f"{len(exploits)} exploits found" if exploits else "Searchsploit complete"
        return f"Output: {len(output)} chars"

    def _parse_nmap_ports(self, output: str) -> list:
        ports = []
        in_table = False
        for line in output.split("\n"):
            if line.startswith("PORT") and "STATE" in line and "SERVICE" in line:
                in_table = True
                continue
            if not in_table:
                continue
            if line.strip() == "" or line.startswith("Nmap done") or line.startswith("Warning"):
                if line.strip() == "":
                    in_table = False
                continue
            parts = line.strip().split()
            if len(parts) < 3:
                continue
            pp = parts[0].split("/")
            if len(pp) != 2:
                continue
            try:
                port = int(pp[0])
            except ValueError:
                continue
            ports.append({
                "port": port, "protocol": pp[1], "state": parts[1],
                "service": parts[2] if len(parts) > 2 else "unknown",
                "version": " ".join(parts[3:]) if len(parts) > 3 else "",
            })
        return ports

    def _parse_hydra_creds(self, output: str) -> list:
        creds = []
        for line in output.split("\n"):
            m = re.search(r"host:\s+\S+\s+login:\s+(\S+)\s+password:\s+(.+)", line, re.I)
            if m:
                creds.append({"user": m.group(1), "pass": m.group(2).strip()})
        return creds

    def get_result(self, execution_id: int) -> Optional[dict]:
        for r in reversed(self.history):
            if r["id"] == execution_id:
                return r
        return None

    def get_history(self, tool: Optional[str] = None, limit: int = 30) -> list:
        items = self.history if not tool else [h for h in self.history if h["tool"] == tool]
        return items[-limit:]

    def get_status(self) -> dict:
        return {
            "tools": self.get_tools(),
            "running": [
                {"id": eid, "tool": r["tool"], "started": r["started_at"]}
                for eid, proc in self.running.items()
                for r in [self.get_result(eid)] if r
            ],
            "total_runs": len(self.history),
        }

    async def cancel(self, execution_id: int) -> bool:
        proc = self.running.pop(execution_id, None)
        if proc:
            proc.kill()
            await proc.wait()
            return True
        return False


tool_engine = ToolEngine()
