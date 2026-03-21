"""
╔══════════════════════════════════════════════════════╗
║  PHASE 2 · Self Evaluator                           ║
║  الـ Agent يقيّم نفسه بدقة ويعرف نقاط ضعفه        ║
╚══════════════════════════════════════════════════════╝

كيف يعمل:
  1. بعد كل تنفيذ → يقيّم النتيجة من عدة زوايا
  2. يحتفظ بسجل تقييمات تاريخي
  3. يكشف الأنماط: "أنا دائماً أخطئ في X"
  4. يضبط ثقته بنفسه تلقائياً (calibration)
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from core.brain import Brain


class SelfEvaluator:

    # معايير التقييم وأوزانها
    CRITERIA = {
        "correctness":   0.35,   # هل الحل صحيح تقنياً؟
        "completeness":  0.20,   # هل يغطي كل جوانب المشكلة؟
        "efficiency":    0.15,   # هل الكود فعّال؟
        "safety":        0.20,   # هل آمن ولا يكسر شيئاً؟
        "vrbot_compat":  0.10,   # هل متوافق مع بنية VRBOT؟
    }

    def __init__(self, brain: Brain, db_path: str = "data/evaluations.db"):
        self.brain = brain
        self.conn  = sqlite3.connect(db_path, check_same_thread=False)
        self._init_db()
        self._confidence_bias = 0.0   # يتعدّل مع الوقت

    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                task        TEXT,
                action      TEXT,
                scores      TEXT,  -- JSON
                final_score REAL,
                critique    TEXT,
                timestamp   TEXT
            );
            CREATE TABLE IF NOT EXISTS weak_areas (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                area        TEXT UNIQUE,
                fail_count  INTEGER DEFAULT 0,
                avg_score   REAL    DEFAULT 0.5,
                last_seen   TEXT
            );
        """)
        self.conn.commit()

    # ── التقييم الرئيسي ──────────────────────────────────
    def evaluate(self, task: str, action: str, result: str) -> dict:
        """تقييم شامل لنتيجة تنفيذ"""

        prompt = f"""قيّم هذا الحل لمهمة VRBOT بدقة تامة.

المهمة: {task}
الإجراء المتخذ: {action}
النتيجة/الكود: {result[:1500]}

قيّم كل معيار من 0.0 إلى 1.0 وأعطِ نقداً مختصراً.
أجب بـ JSON فقط بهذا التنسيق:
{{
  "correctness":  {{"score": 0.0, "note": ""}},
  "completeness": {{"score": 0.0, "note": ""}},
  "efficiency":   {{"score": 0.0, "note": ""}},
  "safety":       {{"score": 0.0, "note": ""}},
  "vrbot_compat": {{"score": 0.0, "note": ""}},
  "overall_critique": "نقد شامل في جملتين",
  "biggest_weakness": "أكبر نقطة ضعف"
}}"""

        raw = self.brain.think(prompt, max_tokens=800)
        try:
            clean = raw.strip().replace("```json","").replace("```","")
            data  = json.loads(clean)
        except Exception:
            data = {c: {"score": 0.5, "note": ""} for c in self.CRITERIA}
            data["overall_critique"]  = raw[:200]
            data["biggest_weakness"]  = "غير محدد"

        # حساب الدرجة المرجّحة
        final = sum(
            data.get(c, {}).get("score", 0.5) * w
            for c, w in self.CRITERIA.items()
        )
        final = max(0.0, min(1.0, final + self._confidence_bias))

        scores_dict = {c: data.get(c, {}).get("score", 0.5) for c in self.CRITERIA}

        # حفظ في DB
        self.conn.execute(
            "INSERT INTO evaluations (task,action,scores,final_score,critique,timestamp) VALUES (?,?,?,?,?,?)",
            (task, action[:200], json.dumps(scores_dict), final,
             data.get("overall_critique",""), datetime.now().isoformat())
        )
        self.conn.commit()

        # تحديث نقاط الضعف
        weakness = data.get("biggest_weakness", "")
        if weakness:
            self._record_weakness(weakness, final)

        # معايرة الثقة
        self._recalibrate(final)

        return {
            "final_score":  final,
            "scores":       scores_dict,
            "critique":     data.get("overall_critique", ""),
            "weakness":     weakness,
            "calibrated_confidence": self._confidence_bias,
        }

    def _record_weakness(self, area: str, score: float):
        area_key = area[:100]
        existing = self.conn.execute(
            "SELECT id, fail_count, avg_score FROM weak_areas WHERE area=?",
            (area_key,)
        ).fetchone()

        if existing:
            rid, fc, avg = existing
            new_fc  = fc + (1 if score < 0.6 else 0)
            new_avg = (avg * (fc + 1) + score) / (fc + 2)
            self.conn.execute(
                "UPDATE weak_areas SET fail_count=?, avg_score=?, last_seen=? WHERE id=?",
                (new_fc, new_avg, datetime.now().isoformat(), rid)
            )
        else:
            self.conn.execute(
                "INSERT INTO weak_areas (area,fail_count,avg_score,last_seen) VALUES (?,?,?,?)",
                (area_key, 1 if score < 0.6 else 0, score, datetime.now().isoformat())
            )
        self.conn.commit()

    def _recalibrate(self, last_score: float):
        """ضبط الـ bias بناءً على الأداء الأخير"""
        recent = self.conn.execute(
            "SELECT final_score FROM evaluations ORDER BY id DESC LIMIT 10"
        ).fetchall()
        if len(recent) >= 5:
            avg_recent = sum(r[0] for r in recent) / len(recent)
            # إذا كنت أُقيّم نفسي بأعلى من المتوسط الفعلي → خفّض الثقة
            if avg_recent < 0.5:
                self._confidence_bias = max(-0.1, self._confidence_bias - 0.01)
            elif avg_recent > 0.8:
                self._confidence_bias = min(0.05, self._confidence_bias + 0.005)

    # ── تحليل الأنماط ────────────────────────────────────
    def get_weak_areas(self, top_n: int = 5) -> list:
        """أكثر نقاط الضعف تكراراً"""
        rows = self.conn.execute(
            "SELECT area, fail_count, avg_score FROM weak_areas ORDER BY fail_count DESC LIMIT ?",
            (top_n,)
        ).fetchall()
        return [{"area": r[0], "fail_count": r[1], "avg_score": r[2]} for r in rows]

    def get_performance_trend(self, task: str = None, last_n: int = 20) -> dict:
        """اتجاه الأداء عبر الزمن"""
        q = "SELECT final_score, timestamp FROM evaluations"
        p = []
        if task:
            q += " WHERE task LIKE ?"; p.append(f"%{task}%")
        q += " ORDER BY id DESC LIMIT ?"
        p.append(last_n)

        rows = self.conn.execute(q, p).fetchall()
        if not rows:
            return {"trend": "no_data", "avg": 0, "improving": False}

        scores = [r[0] for r in rows]
        avg    = sum(scores) / len(scores)
        # مقارنة النصف الأول بالثاني
        half   = len(scores) // 2
        improving = (sum(scores[:half]) / max(half,1)) > (sum(scores[half:]) / max(len(scores)-half,1)) if half > 0 else False

        return {
            "trend":     "improving" if improving else "declining",
            "avg":        avg,
            "improving":  improving,
            "scores":     scores[:10],
        }

    def generate_self_report(self) -> str:
        """تقرير ذاتي: ماذا أعرف عن نفسي؟"""
        weak   = self.get_weak_areas()
        trend  = self.get_performance_trend()
        total  = self.conn.execute("SELECT COUNT(*) FROM evaluations").fetchone()[0]

        weak_text = "\n".join([f"  - {w['area']}: فشل {w['fail_count']} مرة" for w in weak[:3]])

        return f"""
═══ تقرير التقييم الذاتي ═══
إجمالي التقييمات: {total}
متوسط الأداء: {trend['avg']:.0%}
الاتجاه: {'📈 تحسّن' if trend['improving'] else '📉 تراجع'}
نقاط الضعف الرئيسية:
{weak_text or '  لا توجد بعد'}
معايرة الثقة: {self._confidence_bias:+.3f}
"""
