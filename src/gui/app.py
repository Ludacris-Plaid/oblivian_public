"""
GUI Application Runner
"""

import subprocess
import threading

def run_gui():
    """Start the React GUI in a separate thread"""
    cmd = ["npm", "run", "start"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc
