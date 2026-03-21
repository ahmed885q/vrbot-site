#!/usr/bin/env python3
"""
VRBOT Smart Scheduler v2
========================
- يقرأ مزارع العملاء من Supabase
- يرتبها حسب last_run_at (الأقدم أولاً)
- يشغّل 20 بالتوازي على 20 Redroid container
- يعيد الدورة تلقائياً
"""
import asyncio, subprocess, json, logging, os, sys
from datetime import datetime, timezone, timedelta
import urllib.request

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("/tmp/smart_scheduler_v2.log"),
    ]
)
logger = logging.getLogger("smart_v2")

SUPA_URL   = os.environ.get("SUPABASE_URL", "https://xmanyfpojzkjlwatkrcc.supabase.co")
SUPA_KEY   = os.environ.get("SUPABASE_SERVICE_KEY", "")
AGENT_PATH = "/root/vrbot-agent"
CONTAINERS = [f"172.17.0.{i}:5555" for i in range(2, 22)]  # 20 containers
MAX_CONCURRENT = 20
FARM_RUN_TIME  = 3600  # 1 hour per farm


def supa_request(method, path, data=None):
    h = {"Authorization": f"Bearer {SUPA_KEY}", "apikey": SUPA_KEY,
         "Content-Type": "application/json", "Prefer": "return=representation"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f"{SUPA_URL}{path}", data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        logger.error(f"Supabase error: {e}")
        return []


def get_farms_queue():
    farms = supa_request("GET",
        "/rest/v1/cloud_farms"
        "?select=id,farm_name,game_account,igg_password,last_run_at,status"
        "&status=neq.deleted"
        "&order=last_run_at.asc.nullsfirst"
    )
    logger.info(f"Queue: {len(farms)} farms")
    return farms


def update_farm(farm_id, data):
    supa_request("PATCH", f"/rest/v1/cloud_farms?id=eq.{farm_id}", data)


async def run_farm_on_container(farm, container_index):
    farm_name    = farm.get("farm_name", "unknown")
    game_account = farm.get("game_account", "")
    farm_id      = farm.get("id")
    container    = CONTAINERS[container_index]
    num          = container_index + 1

    logger.info(f"[{num:02d}] Starting: {farm_name} on {container}")

    update_farm(farm_id, {
        "status": "running",
        "last_run_at": datetime.now(timezone.utc).isoformat(),
    })

    try:
        subprocess.run(["adb", "connect", container], capture_output=True, timeout=10)

        cmd = [
            "python3", f"{AGENT_PATH}/vrbot_main.py",
            "--adb-serial", container,
            "--single-run",
            "--tasks", "gather,daily,niflung",
        ]
        if game_account:
            cmd += ["--account", game_account]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=AGENT_PATH,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=FARM_RUN_TIME)
            exit_code = proc.returncode
        except asyncio.TimeoutError:
            proc.kill()
            exit_code = -1
            logger.warning(f"[{num:02d}] {farm_name}: TIMEOUT")

        now = datetime.now(timezone.utc)
        next_run = now + timedelta(hours=11)
        update_farm(farm_id, {
            "status": "running" if exit_code == 0 else "error",
            "last_run_at": now.isoformat(),
            "next_run_at": next_run.isoformat(),
        })

        logger.info(f"[{num:02d}] Done: {farm_name} exit={exit_code}")
        return exit_code == 0

    except Exception as e:
        logger.error(f"[{num:02d}] {farm_name} ERROR: {e}")
        update_farm(farm_id, {"status": "error"})
        return False


async def run_batch(farms_batch):
    tasks = []
    for i, farm in enumerate(farms_batch[:MAX_CONCURRENT]):
        tasks.append(run_farm_on_container(farm, i))
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ok = sum(1 for r in results if r is True)
    logger.info(f"Batch done: {ok}/{len(tasks)} OK")
    return ok


async def main():
    logger.info("=" * 50)
    logger.info("VRBOT Smart Scheduler v2 — Starting")
    logger.info(f"Max farms: 200 | Containers: {MAX_CONCURRENT}")
    logger.info("=" * 50)

    cycle = 0
    while True:
        cycle += 1
        logger.info(f"\n--- Cycle #{cycle} ---")

        farms = get_farms_queue()
        if not farms:
            logger.warning("No farms found — waiting 60s")
            await asyncio.sleep(60)
            continue

        total = len(farms)
        processed = 0
        for batch_start in range(0, total, MAX_CONCURRENT):
            batch = farms[batch_start:batch_start + MAX_CONCURRENT]
            batch_num = batch_start // MAX_CONCURRENT + 1
            total_batches = (total + MAX_CONCURRENT - 1) // MAX_CONCURRENT

            logger.info(f"Batch {batch_num}/{total_batches} ({len(batch)} farms)")
            ok = await run_batch(batch)
            processed += len(batch)
            logger.info(f"Progress: {processed}/{total}")

            if batch_start + MAX_CONCURRENT < total:
                await asyncio.sleep(5)

        logger.info(f"Cycle #{cycle} complete — {total} farms processed")
        logger.info("Restarting immediately for next cycle...")


if __name__ == "__main__":
    asyncio.run(main())
