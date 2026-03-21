"""
Log Analyzer - محلل سجلات VRBOT
==================================
يقرأ logs ويستخرج الأخطاء والإحصائيات
"""

import re
import json
import requests
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from config import HETZNER_IP, HETZNER_API_KEY, ORCHESTRATOR_PORT, LOGS_DIR


class LogAnalyzer:

    # أنماط الأخطاء الشائعة في VRBOT
    ERROR_PATTERNS = {
        "coordinate_miss":  r"(tap|click|touch).*failed|coordinate.*not found|wrong position",
        "detection_fail":   r"(button|element|screen).*not detected|template.*match.*failed|YOLO.*no result",
        "timeout":          r"timeout|timed out|connection.*refused|request.*failed",
        "adb_error":        r"adb.*error|device.*offline|ADB.*exception",
        "screenshot_fail":  r"screenshot.*failed|image.*capture.*error",
        "task_error":       r"task.*failed|ERROR.*task_|exception.*in task",
        "network_error":    r"network.*error|502|503|connection.*error",
        "farm_error":       r"farm.*error|jx=error|farm.*offline",
    }

    def __init__(self):
        self.logs_dir = Path(LOGS_DIR)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    # ── قراءة logs من السيرفر ──────────────────────────────
    def fetch_server_logs(self, lines: int = 500) -> str:
        """جلب logs من Hetzner مباشرة"""
        try:
            url = f"https://{HETZNER_IP}/api/logs"
            headers = {"X-API-Key": HETZNER_API_KEY}
            params  = {"lines": lines}
            resp = requests.get(url, headers=headers, params=params, timeout=15)
            if resp.status_code == 200:
                return resp.text
            # fallback: orchestrator مباشرة
            url2 = f"http://{HETZNER_IP}:{ORCHESTRATOR_PORT}/logs?lines={lines}"
            resp2 = requests.get(url2, timeout=15)
            return resp2.text if resp2.status_code == 200 else ""
        except Exception as e:
            print(f"⚠️  لم أستطع جلب logs من السيرفر: {e}")
            return ""

    def fetch_farm_stats(self) -> dict:
        """جلب إحصائيات المزارع من orchestrator"""
        try:
            url = f"https://{HETZNER_IP}/api/farms/stats"
            headers = {"X-API-Key": HETZNER_API_KEY}
            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            print(f"⚠️  لم أستطع جلب farm stats: {e}")
        return {}

    # ── تحليل النص ─────────────────────────────────────────
    def analyze_log_text(self, log_text: str) -> dict:
        """تحليل شامل للـ log text"""
        if not log_text:
            return self._empty_analysis()

        lines  = log_text.splitlines()
        errors = self._extract_errors(lines)
        tasks  = self._extract_task_stats(lines)
        farms  = self._extract_farm_stats(lines)

        return {
            "total_lines":    len(lines),
            "error_summary":  errors,
            "task_stats":     tasks,
            "farm_stats":     farms,
            "failing_tasks":  self._get_failing(tasks),
            "critical_errors": [e for e in errors if e.get("severity") == "critical"],
            "analyzed_at":    datetime.now().isoformat(),
        }

    def _extract_errors(self, lines: list) -> list:
        errors = []
        seen   = set()

        for line in lines:
            line_lower = line.lower()
            for category, pattern in self.ERROR_PATTERNS.items():
                if re.search(pattern, line_lower):
                    # استخرج timestamp إذا وجد
                    ts_match = re.search(
                        r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}', line
                    )
                    ts = ts_match.group(0) if ts_match else ""

                    # استخرج اسم المهمة
                    task_match = re.search(r'task_\w+', line_lower)
                    task = task_match.group(0) if task_match else "unknown"

                    key = f"{category}:{line[:60]}"
                    if key not in seen:
                        seen.add(key)
                        errors.append({
                            "category":  category,
                            "task":      task,
                            "message":   line.strip()[:200],
                            "timestamp": ts,
                            "severity":  self._get_severity(category),
                        })

        return errors[:50]   # أول 50 خطأ

    def _extract_task_stats(self, lines: list) -> dict:
        stats = defaultdict(lambda: {"total": 0, "success": 0, "errors": []})

        for line in lines:
            # نجاح المهمة
            success_match = re.search(
                r'task_(\w+).*?(completed|success|✅|done)', line, re.IGNORECASE
            )
            if success_match:
                task = f"task_{success_match.group(1)}"
                stats[task]["total"]   += 1
                stats[task]["success"] += 1

            # فشل المهمة
            fail_match = re.search(
                r'task_(\w+).*?(failed|error|❌|exception)', line, re.IGNORECASE
            )
            if fail_match:
                task = f"task_{fail_match.group(1)}"
                stats[task]["total"] += 1
                stats[task]["errors"].append(line.strip()[:100])

        # حساب معدل النجاح
        result = {}
        for task, data in stats.items():
            rate = data["success"] / data["total"] if data["total"] > 0 else 0
            result[task] = {
                "total":        data["total"],
                "success":      data["success"],
                "success_rate": rate,
                "top_error":    Counter(data["errors"]).most_common(1)[0][0]
                                if data["errors"] else "",
            }
        return result

    def _extract_farm_stats(self, lines: list) -> dict:
        farms = defaultdict(lambda: {"active": 0, "errors": 0})
        for line in lines:
            farm_match = re.search(r'farm_(\d+)', line, re.IGNORECASE)
            if farm_match:
                fid = f"farm_{farm_match.group(1)}"
                if any(k in line.lower() for k in ["error", "failed", "offline"]):
                    farms[fid]["errors"] += 1
                else:
                    farms[fid]["active"] += 1
        return dict(farms)

    def _get_failing(self, task_stats: dict, threshold: float = 0.6) -> list:
        return [
            {"task": t, **s}
            for t, s in task_stats.items()
            if s["total"] > 2 and s["success_rate"] < threshold
        ]

    def _get_severity(self, category: str) -> str:
        critical = {"adb_error", "screenshot_fail", "farm_error"}
        high     = {"timeout", "network_error", "task_error"}
        if category in critical: return "critical"
        if category in high:     return "high"
        return "medium"

    def _empty_analysis(self) -> dict:
        return {
            "total_lines": 0, "error_summary": [],
            "task_stats": {}, "farm_stats": {},
            "failing_tasks": [], "critical_errors": [],
            "analyzed_at": datetime.now().isoformat(),
        }

    # ── قراءة ملفات محلية ──────────────────────────────────
    def read_local_log(self, filename: str) -> str:
        """قراءة log محلي (للاختبار)"""
        path = self.logs_dir / filename
        if path.exists():
            return path.read_text(encoding="utf-8", errors="ignore")
        return ""

    def save_analysis(self, analysis: dict, name: str = ""):
        """حفظ نتيجة التحليل"""
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = f"analysis_{name}_{ts}.json" if name else f"analysis_{ts}.json"
        path  = self.logs_dir / fname
        path.write_text(
            json.dumps(analysis, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"💾 حُفظ التحليل في: {path}")
        return str(path)
