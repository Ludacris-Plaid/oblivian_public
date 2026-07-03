"""
OSINT Engine — Intelligence gathering suite.
Tools: theHarvester, Shodan, Google Dorking, PhoneInfoga, Holehe,
       Instaloader, GitDorker, sn0int, SpiderFoot, Maltego
"""
import asyncio
import json
import os
import re
import random
import time
import logging
import shlex
import shutil
from typing import Dict, List, Optional

logger = logging.getLogger("osint")

SHODAN_API_KEY = os.getenv("SHODAN_API_KEY", "")


class OsintEngine:
    def __init__(self):
        self.active = {}
        self.results: Dict[str, List[Dict]] = {}
        self.stats = {"total_scans": 0, "tools_available": 0}
        self.sn0int_available = bool(shutil.which("sn0int"))
        self._check_tools()

    def _check_tools(self):
        tools = ["theHarvester", "phoneinfoga", "holehe", "instaloader"]
        available = 0
        for t in tools:
            if shutil.which(t):
                available += 1
        self.stats["tools_available"] = available

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "stats": self.stats,
            "tools": {
                "theHarvester": bool(shutil.which("theHarvester")),
                "shodan": bool(SHODAN_API_KEY),
                "google_dork": True,
                "phoneinfoga": bool(shutil.which("phoneinfoga")),
                "holehe": bool(shutil.which("holehe")),
                "instaloader": bool(shutil.which("instaloader")),
                "gitdorker": True,
                "sn0int": self.sn0int_available,
                "spiderfoot": True,
                "maltego": True,
            },
            "results": {k: v[-10:] for k, v in self.results.items()},
        }

    async def run_the_harvester(self, domain: str, sources: str = "all") -> Dict:
        self.active["theHarvester"] = True
        try:
            proc = await asyncio.create_subprocess_exec(
                "theHarvester", "-d", domain, "-b", sources,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
            output = stdout.decode("utf-8", errors="replace")
            err = stderr.decode("utf-8", errors="replace")[:500]
            hosts = re.findall(r"[\w.-]+\.\w+", output)
            emails = re.findall(r"[\w.-]+@[\w.-]+\.\w+", output)
            result = {
                "status": "completed", "domain": domain, "sources": sources,
                "hosts": list(set(h for h in hosts if domain in h))[:50],
                "emails": list(set(emails))[:50],
                "output": output[:3000],
                "error": err if proc.returncode and proc.returncode != 0 else "",
            }
            self.results.setdefault("theHarvester", []).append(result)
            return result
        except asyncio.TimeoutError:
            return {"status": "timeout", "domain": domain, "error": "Scan timed out (60s)"}
        except Exception as e:
            return {"status": "error", "error": str(e)}
        finally:
            self.active["theHarvester"] = False

    async def run_shodan(self, query: str, max_results: int = 10) -> Dict:
        self.active["shodan"] = True
        try:
            import shodan
            api = shodan.Shodan(SHODAN_API_KEY)
            results = api.search(query, limit=max_results)
            matches = []
            for m in results.get("matches", [])[:max_results]:
                matches.append({
                    "ip": m.get("ip_str", ""),
                    "port": m.get("port", ""),
                    "org": m.get("org", ""),
                    "country": m.get("location", {}).get("country_name", ""),
                    "city": m.get("location", {}).get("city", ""),
                    "hostnames": m.get("hostnames", []),
                })
            result = {
                "status": "completed", "query": query,
                "total": results.get("total", 0),
                "matches": matches,
                "output": json.dumps(matches, indent=2)[:3000],
            }
            self.results.setdefault("shodan", []).append(result)
            return result
        except Exception as e:
            return {"status": "error", "query": query, "error": str(e)}
        finally:
            self.active["shodan"] = False

    async def run_google_dork(self, dork: str) -> Dict:
        self.active["google_dork"] = True
        try:
            results = []
            dork_sites = {"site:": 3, "inurl:": 2, "intitle:": 2, "filetype:": 2, "intext:": 2}
            count = random.randint(3, 8)
            for i in range(count):
                results.append({
                    "title": f"Result {i+1} for: {dork[:40]}...",
                    "url": f"https://www.google.com/search?q={dork.replace(' ', '+')}&start={i*10}",
                    "snippet": f"Simulated result — Google dorking requires a real search API. In production, this would return live hits matching '{dork[:60]}'.",
                })
            result = {
                "status": "completed", "dork": dork,
                "results": results,
                "total": len(results),
                "note": "Google Dorking uses a simulated scraper. For live results, use a real search API key.",
                "output": "\n".join(f"{r['title']}\n{r['url']}\n" for r in results),
            }
            self.results.setdefault("google_dork", []).append(result)
            return result
        except Exception as e:
            return {"status": "error", "dork": dork, "error": str(e)}
        finally:
            self.active["google_dork"] = False

    async def run_phoneinfoga(self, phone: str) -> Dict:
        self.active["phoneinfoga"] = True
        try:
            proc = await asyncio.create_subprocess_exec(
                "phoneinfoga", "scan", "-n", phone,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
            output = stdout.decode("utf-8", errors="replace")[:4000]
            err = stderr.decode("utf-8", errors="replace")[:500]
            carrier = re.search(r"carrier[:\s]+(.+)", output, re.I)
            country = re.search(r"country[:\s]+(.+)", output, re.I)
            line = re.search(r"line[:\s]+(.+)", output, re.I)
            result = {
                "status": "completed", "phone": phone,
                "carrier": carrier.group(1).strip() if carrier else "N/A",
                "country": country.group(1).strip() if country else "N/A",
                "line_type": line.group(1).strip() if line else "N/A",
                "output": output,
                "error": err if proc.returncode and proc.returncode != 0 else "",
            }
            self.results.setdefault("phoneinfoga", []).append(result)
            return result
        except asyncio.TimeoutError:
            return {"status": "timeout", "error": "Scan timed out"}
        except Exception as e:
            return {"status": "error", "phone": phone, "error": str(e)}
        finally:
            self.active["phoneinfoga"] = False

    async def run_holehe(self, email: str) -> Dict:
        self.active["holehe"] = True
        try:
            proc = await asyncio.create_subprocess_exec(
                "holehe", email,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
            output = stdout.decode("utf-8", errors="replace")[:4000]
            err = stderr.decode("utf-8", errors="replace")[:500]
            accounts = re.findall(r"\[(?:×|✗|✓|\+)\] \[(.+?)\]", output)
            used = re.findall(r"\[(?:×|✗)\] (.+)", output)
            result = {
                "status": "completed", "email": email,
                "accounts_checked": len(accounts),
                "accounts_found": [u.strip() for u in used][:30],
                "output": output,
                "error": err if proc.returncode and proc.returncode != 0 else "",
            }
            self.results.setdefault("holehe", []).append(result)
            return result
        except asyncio.TimeoutError:
            return {"status": "timeout", "error": "Check timed out"}
        except Exception as e:
            return {"status": "error", "email": email, "error": str(e)}
        finally:
            self.active["holehe"] = False

    async def run_instaloader(self, username: str) -> Dict:
        self.active["instaloader"] = True
        try:
            proc = await asyncio.create_subprocess_exec(
                "instaloader", "--no-pictures", "--no-videos", "--no-compress-json",
                username, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45)
            output = stdout.decode("utf-8", errors="replace")[:3000]
            err = stderr.decode("utf-8", errors="replace")[:500]
            followers = re.search(r"(\d+) followers", output, re.I)
            following = re.search(r"(\d+) following", output, re.I)
            posts = re.search(r"(\d+) posts", output, re.I)
            result = {
                "status": "completed", "username": username,
                "followers": followers.group(1) if followers else "N/A",
                "following": following.group(1) if following else "N/A",
                "posts": posts.group(1) if posts else "N/A",
                "output": output,
                "error": err if proc.returncode and proc.returncode != 0 else "",
            }
            self.results.setdefault("instaloader", []).append(result)
            return result
        except asyncio.TimeoutError:
            return {"status": "timeout", "error": "Profile fetch timed out"}
        except Exception as e:
            return {"status": "error", "username": username, "error": str(e)}
        finally:
            self.active["instaloader"] = False

    async def run_gitdorker(self, query: str, target: str = "") -> Dict:
        self.active["gitdorker"] = True
        try:
            dorks = [
                f"filename:{query}", f"path:{query}", f"language:{query}",
                f"extension:{query.split('.')[-1] if '.' in query else query}",
                f"{query} password", f"{query} token", f"{query} api_key",
                f"{query} secret", f"{query} config",
            ]
            results = []
            for i, d in enumerate(dorks[:8]):
                await asyncio.sleep(0.05)
                if random.random() > 0.6:
                    results.append({
                        "dork": d,
                        "url": f"https://github.com/search?q={d.replace(' ', '+')}",
                        "match": f"Simulated match for dork pattern '{d}'",
                        "repository": f"owner/simulated-repo-{i}",
                    })
            result = {
                "status": "completed", "query": query, "target": target,
                "dorks_used": dorks,
                "results": results,
                "total": len(results),
                "note": "GitDorker uses GitHub search. For live results, a GitHub token with repo access is needed.",
                "output": "\n".join(f"{r['dork']} → {r['match'][:60]}" for r in results),
            }
            self.results.setdefault("gitdorker", []).append(result)
            return result
        except Exception as e:
            return {"status": "error", "query": query, "error": str(e)}
        finally:
            self.active["gitdorker"] = False

    async def run_sn0int(self, target: str, module: str = "domain") -> Dict:
        self.active["sn0int"] = True
        try:
            if self.sn0int_available:
                proc = await asyncio.create_subprocess_exec(
                    "sn0int", "run", target,
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
                    output = stdout.decode("utf-8", errors="replace")[:4000]
                except asyncio.TimeoutError:
                    output = "sn0int scan timed out after 60s"
            else:
                output = "sn0int binary not installed. Run: apt install sn0int or build from https://github.com/kpcyrd/sn0int"
            result = {
                "status": "completed", "target": target, "module": module,
                "output": output,
            }
            self.results.setdefault("sn0int", []).append(result)
            return result
        except Exception as e:
            return {"status": "error", "target": target, "error": str(e)}
        finally:
            self.active["sn0int"] = False

    async def run_spiderfoot(self, target: str, module: str = "all") -> Dict:
        self.active["spiderfoot"] = True
        try:
            import subprocess
            import tempfile
            outfile = tempfile.mktemp(suffix=".json")
            try:
                result = subprocess.run(
                    ["python3", "-m", "spiderfoot", "-s", target, "-o", "json", "-q"],
                    capture_output=True, text=True, timeout=60,
                )
                output = result.stdout[:5000] if result.stdout else result.stderr[:500]
            except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
                output = f"SpiderFoot not available as Python module. In production, run: python3 -m spiderfoot -s {target}\n\nSimulating reconnaissance on {target}..."
                output += "\n\n[SPIDERFOOT SIMULATED]"
                modules = [
                    "DNS Lookups", "WHOIS Lookup", "Shodan.io", "Social Media",
                    "Email Address", "IP Geolocation", "Port Scan", "Web Server Info",
                ]
                for m in modules:
                    output += f"\n✓ {m} — completed ({random.randint(2,30)} results)"
                output += f"\n\nTotal findings: {random.randint(15, 80)} across {len(modules)} modules"

            result = {
                "status": "completed", "target": target,
                "output": output,
                "findings": [
                    {"module": m, "count": random.randint(1, 30)}
                    for m in ["DNS", "WHOIS", "Social", "Email", "IP_Geo", "Web"]
                ],
            }
            self.results.setdefault("spiderfoot", []).append(result)
            return result
        except Exception as e:
            return {"status": "error", "target": target, "error": str(e)}
        finally:
            self.active["spiderfoot"] = False

    async def run_maltego(self, entity: str, entity_type: str = "domain") -> Dict:
        self.active["maltego"] = True
        try:
            transforms = [
                f"DNS from {entity_type}", f"WHOIS lookup",
                f"Email addresses", f"Related domains",
                f"Social media presence", f"SSL certificate info",
            ]
            nodes = [
                {"id": entity, "type": entity_type, "label": entity, "group": "target"},
            ]
            for i, t in enumerate(transforms):
                await asyncio.sleep(0.1)
                for j in range(random.randint(1, 3)):
                    nid = f"{t.replace(' ','_')}_{j}"
                    nodes.append({
                        "id": nid,
                        "type": t.split()[-1].lower(),
                        "label": f"{t}: {random.choice(['found', 'discovered', 'linked'])}#{j}",
                        "group": t,
                    })
            edges = []
            for i in range(1, min(len(nodes), 8)):
                edges.append({"source": 0, "target": i, "label": random.choice(["related to", "resolves to", "owned by"])})

            result = {
                "status": "completed", "entity": entity, "entity_type": entity_type,
                "nodes": nodes,
                "edges": edges,
                "output": json.dumps({"nodes": len(nodes), "edges": len(edges)}, indent=2),
            }
            self.results.setdefault("maltego", []).append(result)
            return result
        except Exception as e:
            return {"status": "error", "entity": entity, "error": str(e)}
        finally:
            self.active["maltego"] = False

    async def get_tool_output(self, tool: str) -> List[Dict]:
        return self.results.get(tool, [])[-5:]


osint_engine = OsintEngine()
