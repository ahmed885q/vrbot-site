#!/usr/bin/env python3
"""Deploy: Session Map — device binding fix for stream + control + ADB consistency"""
import subprocess, sys, time, json, urllib.request, os, shutil

API = "http://127.0.0.1:8888"
DIR = "/root/vrbot-agent/orchestrator"
API_PY = f"{DIR}/api.py"
P24 = f"{DIR}/phase24_modules"
SM = f"{P24}/session_map.py"

def check_module():
    print("\n=== CHECKING SESSION MAP MODULE ===")
    if os.path.exists(SM):
        lines = open(SM).read().count("\n") + 1
        print(f"  [OK] session_map.py: {lines} lines")
    else:
        print(f"  [MISSING] session_map.py")
        sys.exit(1)

def add_import():
    print("\n=== ADDING IMPORT ===")
    with open(API_PY, "r") as f:
        content = f.read()

    if "from phase24_modules.session_map import" in content:
        print("  Already imported, skipping")
        return

    # Insert after live_control_api import
    marker = "from phase24_modules.live_control_api import"
    idx = content.find(marker)
    if idx < 0:
        print("  ERROR: Could not find Phase 24 imports")
        sys.exit(1)
    eol = content.find("\n", idx)

    import_line = "\nfrom phase24_modules.session_map import session_map, DEVICE_TABLE\n"
    content = content[:eol+1] + import_line + content[eol+1:]

    with open(API_PY, "w") as f:
        f.write(content)
    print("  Import added after live_control_api")

def add_endpoints():
    print("\n=== ADDING SESSION MAP ENDPOINTS ===")
    with open(API_PY, "r") as f:
        content = f.read()

    if "/api/v17/session-map/bind" in content:
        print("  Endpoints already exist, skipping")
        return

    endpoints = r'''

# ============================================================
# Session Map — Device Binding Endpoints (fixes stream+control sync)
# ============================================================

@app.post("/api/v17/session-map/bind")
async def v17_sm_bind(req: dict):
    import json
    r = session_map.bind(req.get("farm_id","farm001"), req.get("user","operator"))
    return json.loads(json.dumps(r, default=str))

@app.post("/api/v17/session-map/unbind")
async def v17_sm_unbind(req: dict):
    import json
    r = session_map.unbind(req.get("farm_id","farm001"))
    return json.loads(json.dumps(r, default=str))

@app.get("/api/v17/session-map/device/{farm_id}")
async def v17_sm_device(farm_id: str):
    import json
    return json.loads(json.dumps(session_map.get_device(farm_id), default=str))

@app.get("/api/v17/session-map/stream/{farm_id}")
async def v17_sm_stream(farm_id: str):
    import json
    return json.loads(json.dumps(session_map.get_stream_url(farm_id), default=str))

@app.get("/api/v17/session-map/adb/{farm_id}")
async def v17_sm_adb(farm_id: str):
    import json
    return json.loads(json.dumps(session_map.get_adb_target(farm_id), default=str))

@app.post("/api/v17/session-map/command")
async def v17_sm_command(req: dict):
    import json
    r = session_map.record_command(req.get("farm_id","farm001"))
    return json.loads(json.dumps(r, default=str))

@app.get("/api/v17/session-map/bindings")
async def v17_sm_bindings():
    import json
    return json.loads(json.dumps(session_map.get_all_bindings(), default=str))

@app.get("/api/v17/session-map/devices")
async def v17_sm_devices():
    import json
    return json.loads(json.dumps(session_map.get_device_table(), default=str))

@app.get("/api/v17/session-map/unbound")
async def v17_sm_unbound():
    import json
    return json.loads(json.dumps(session_map.get_unbound_farms(), default=str))

@app.post("/api/v17/session-map/unbind-all")
async def v17_sm_unbind_all(req: dict = {}):
    import json
    r = session_map.unbind_all()
    return json.loads(json.dumps(r, default=str))

@app.get("/api/v17/session-map/log")
async def v17_sm_log():
    import json
    return json.loads(json.dumps(session_map.get_log(), default=str))

@app.get("/api/v17/session-map/stats")
async def v17_sm_stats():
    import json
    return json.loads(json.dumps(session_map.get_stats(), default=str))
'''

    content += endpoints
    with open(API_PY, "w") as f:
        f.write(content)

    ep_count = endpoints.count("async def ")
    print(f"  Added {ep_count} session-map endpoints")

def restart_service():
    print("\n=== RESTARTING SERVICE ===")
    subprocess.run(["systemctl", "restart", "vrbot-orchestrator"], check=True)
    time.sleep(4)
    result = subprocess.run(["systemctl", "is-active", "vrbot-orchestrator"], capture_output=True, text=True)
    status = result.stdout.strip()
    print(f"  Service: {status}")
    if status != "active":
        journal = subprocess.run(["journalctl", "-u", "vrbot-orchestrator", "-n", "30", "--no-pager"],
                                  capture_output=True, text=True)
        print(journal.stdout[-2000:])
        sys.exit(1)

def req(method, path, body=None):
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, method=method,
                                headers={"Content-Type": "application/json"} if data else {})
    try:
        resp = urllib.request.urlopen(r, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def test_endpoints():
    print("\n=== TESTING SESSION MAP ENDPOINTS ===")
    passed = failed = 0
    tests = [
        # Bind farm001
        ("POST", "/api/v17/session-map/bind", {"farm_id": "farm001", "user": "ahmed"}),
        # Lookup device
        ("GET", "/api/v17/session-map/device/farm001", None),
        # Lookup stream
        ("GET", "/api/v17/session-map/stream/farm001", None),
        # Lookup ADB target
        ("GET", "/api/v17/session-map/adb/farm001", None),
        # Record command
        ("POST", "/api/v17/session-map/command", {"farm_id": "farm001"}),
        # Bind a second farm
        ("POST", "/api/v17/session-map/bind", {"farm_id": "farm005", "user": "ahmed"}),
        # Get all bindings
        ("GET", "/api/v17/session-map/bindings", None),
        # Get full device table
        ("GET", "/api/v17/session-map/devices", None),
        # Get unbound farms
        ("GET", "/api/v17/session-map/unbound", None),
        # Get log
        ("GET", "/api/v17/session-map/log", None),
        # Get stats
        ("GET", "/api/v17/session-map/stats", None),
        # Unbind farm001
        ("POST", "/api/v17/session-map/unbind", {"farm_id": "farm001"}),
        # Unbind all
        ("POST", "/api/v17/session-map/unbind-all", {}),
    ]

    for method, path, body in tests:
        data = req(method, path, body)
        ok = True
        if isinstance(data, dict) and "error" in data and not isinstance(data["error"], dict):
            ok = False
        if ok:
            passed += 1
            print(f"  PASS {method} {path}")
            # Show key results for verification
            if "device_id" in str(data):
                if isinstance(data, dict):
                    did = data.get("device_id") or (data.get("session", {}) or {}).get("device_id", "")
                    surl = data.get("stream_url") or (data.get("session", {}) or {}).get("stream_url", "")
                    if did:
                        print(f"        -> device: {did}, stream: {surl}")
        else:
            failed += 1
            print(f"  FAIL {method} {path} -> {str(data)[:120]}")

    # Verify binding consistency
    print("\n  --- Binding Consistency Check ---")
    # Bind farm010, then verify stream + adb + device all match
    bind_result = req("POST", "/api/v17/session-map/bind", {"farm_id": "farm010"})
    device_result = req("GET", "/api/v17/session-map/device/farm010")
    stream_result = req("GET", "/api/v17/session-map/stream/farm010")
    adb_result = req("GET", "/api/v17/session-map/adb/farm010")

    session = bind_result.get("session", {})
    d_id = session.get("device_id", "")
    s_url = session.get("stream_url", "")
    s_port = session.get("stream_port", 0)

    all_match = (
        device_result.get("device_id") == d_id and
        stream_result.get("stream_url") == s_url and
        adb_result.get("adb_target") == d_id
    )

    if all_match:
        passed += 1
        print(f"  PASS Consistency: farm010 -> device={d_id}, stream=:{s_port}, adb={d_id}")
    else:
        failed += 1
        print(f"  FAIL Consistency mismatch!")
        print(f"       bind:   device={d_id}, stream={s_url}")
        print(f"       lookup: device={device_result}, stream={stream_result}, adb={adb_result}")

    # Cleanup
    req("POST", "/api/v17/session-map/unbind-all", {})

    print(f"\n  Session Map: {passed} passed / {failed} failed")
    return passed, failed

def regression_test():
    print("\n=== REGRESSION: Phase 24 Dashboard ===")
    data = req("GET", "/api/v17/live/dashboard")
    if isinstance(data, dict) and "error" in data and not isinstance(data["error"], dict):
        print(f"  FAIL /api/v17/live/dashboard -> {str(data)[:100]}")
        return 0, 1
    else:
        print(f"  PASS /api/v17/live/dashboard")
        return 1, 0

if __name__ == "__main__":
    check_module()
    add_import()
    add_endpoints()
    restart_service()
    sm_pass, sm_fail = test_endpoints()
    reg_pass, reg_fail = regression_test()
    total_pass = sm_pass + reg_pass
    total_fail = sm_fail + reg_fail
    print(f"\n{'='*60}")
    print(f"  TOTAL: {total_pass} passed / {total_fail} failed")
    if total_fail == 0:
        print(f"  SESSION MAP DEPLOYED — DEVICE BINDING FIXED")
    else:
        print(f"  WARNING: {total_fail} failures need attention")
    print(f"{'='*60}")
