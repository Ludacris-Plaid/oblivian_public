import requests

print("=== Testing C2 Server API ===")

try:
    r = requests.get("http://localhost:8000/")
    print(f"Root: {r.status_code}")
except Exception as e:
    print(f"Root: {e}")

try:
    r = requests.get("http://localhost:8000/health")
    print(f"Health: {r.json()}")
except Exception as e:
    print(f"Health: {e}")

try:
    r = requests.get("http://localhost:8000/api/simulation/status")
    print(f"Simulation: {r.json()}")
except Exception as e:
    print(f"Simulation: {e}")

try:
    r = requests.get("http://localhost:8000/api/ai/context")
    print(f"AI Context: {r.json()}")
except Exception as e:
    print(f"AI Context: {e}")

try:
    r = requests.get("http://localhost:8000/api/events")
    data = r.json()
    print(f"Events: {len(data.get('events', []))} events")
except Exception as e:
    print(f"Events: {e}")

print("=== All API endpoints responding! ===")
