"""
╔══════════════════════════════════════════════════════╗
║  PHASE 2 · Fine Tuner                               ║
║  يجمع بيانات التدريب ويحضّر ملفات Fine-tuning      ║
╚══════════════════════════════════════════════════════╝

المراحل:
  1. جمع بيانات: كل إصلاح ناجح → مثال تدريب
  2. تنظيف البيانات وتصنيفها
  3. تصدير بتنسيق JSONL (Anthropic fine-tuning format)
  4. (مستقبل) رفع للـ Anthropic fine-tuning API

تنسيق بيانات التدريب:
  {"messages": [
    {"role": "user",      "content": "المشكلة + السياق"},
    {"role": "assistant", "content": "الإصلاح الصحيح"}
  ]}
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from core.brain import Brain


class FineTuner:

    MIN_SCORE_FOR_TRAINING = 0.70   # فقط الحلول الجيدة تُستخدم للتدريب
    MIN_SAMPLES_TO_EXPORT  = 20     # حد أدنى للتصدير

    def __init__(self, brain: Brain,
                 db_path: str  = "data/training_data/training.db",
                 export_dir: str = "data/training_data"):
        self.brain      = brain
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS training_samples (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                task        TEXT,
                category    TEXT,
                problem     TEXT,
                context     TEXT,
                solution    TEXT,
                score       REAL,
                verified    INTEGER DEFAULT 0,  -- 1 = PR merged
                added_at    TEXT
            );
            CREATE TABLE IF NOT EXISTS export_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                filename    TEXT,
                count       INTEGER,
                exported_at TEXT
            );
        """)
        self.conn.commit()

    # ── جمع البيانات ─────────────────────────────────────
    def collect_sample(self, task: str, category: str,
                        problem: str, context: str,
                        solution: str, score: float,
                        pr_merged: bool = False):
        """
        أضف مثال تدريب جديد.
        يُضاف فقط إذا كانت الدرجة كافية.
        """
        if score < self.MIN_SCORE_FOR_TRAINING and not pr_merged:
            return  # جودة غير كافية

        # تنظيف وإثراء البيانات قبل الحفظ
        enriched = self._enrich_sample(problem, context, solution)

        self.conn.execute(
            "INSERT INTO training_samples (task,category,problem,context,solution,score,verified,added_at) VALUES (?,?,?,?,?,?,?,?)",
            (task, category, problem[:500], context[:1000],
             enriched[:2000], score, 1 if pr_merged else 0,
             datetime.now().isoformat())
        )
        self.conn.commit()
        print(f"   📝 مثال تدريب جديد: {task} ({score:.0%})")

    def _enrich_sample(self, problem: str, context: str, solution: str) -> str:
        """إثراء الحل ببيانات إضافية مفيدة للتدريب"""
        if len(solution) > 200:
            return solution  # الحل غني بالفعل

        prompt = f"""أنت خبير VRBOT. المشكلة:
{problem}

الحل المقترح:
{solution}

أكمل الحل بتفاصيل أكثر مع كود Python جاهز للتطبيق (أقل من 300 كلمة)."""
        return self.brain.think(prompt, max_tokens=600)

    # ── تصدير بيانات التدريب ────────────────────────────
    def export_jsonl(self, min_score: float = None,
                     verified_only: bool = False) -> str:
        """
        تصدير بيانات التدريب بتنسيق JSONL
        متوافق مع Anthropic fine-tuning API
        """
        threshold = min_score or self.MIN_SCORE_FOR_TRAINING
        q = "SELECT task, category, problem, context, solution, score FROM training_samples WHERE score >= ?"
        p = [threshold]
        if verified_only:
            q += " AND verified=1"

        rows = self.conn.execute(q, p).fetchall()

        if len(rows) < self.MIN_SAMPLES_TO_EXPORT:
            print(f"   ⚠️  فقط {len(rows)} مثال - الحد الأدنى {self.MIN_SAMPLES_TO_EXPORT}")

        # بناء JSONL
        samples = []
        for task, category, problem, context, solution, score in rows:
            user_content = self._build_user_prompt(task, category, problem, context)
            samples.append({
                "messages": [
                    {"role": "user",      "content": user_content},
                    {"role": "assistant", "content": solution}
                ]
            })

        # حفظ الملف
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename  = f"vrbot_training_{timestamp}.jsonl"
        filepath  = self.export_dir / filename

        with open(filepath, "w", encoding="utf-8") as f:
            for sample in samples:
                f.write(json.dumps(sample, ensure_ascii=False) + "\n")

        # سجّل التصدير
        self.conn.execute(
            "INSERT INTO export_history (filename,count,exported_at) VALUES (?,?,?)",
            (filename, len(samples), datetime.now().isoformat())
        )
        self.conn.commit()

        print(f"   ✅ صُدّر {len(samples)} مثال → {filepath}")
        return str(filepath)

    def _build_user_prompt(self, task, category, problem, context) -> str:
        return f"""أنت مطوّر VRBOT متخصص.

المهمة: {task}
فئة المشكلة: {category}
المشكلة:
{problem}

{'السياق:' + chr(10) + context if context else ''}

اكتب الإصلاح المناسب لهذه المشكلة في VRBOT."""

    # ── إحصائيات ────────────────────────────────────────
    def get_stats(self) -> dict:
        total    = self.conn.execute("SELECT COUNT(*) FROM training_samples").fetchone()[0]
        verified = self.conn.execute("SELECT COUNT(*) FROM training_samples WHERE verified=1").fetchone()[0]
        by_cat   = self.conn.execute(
            "SELECT category, COUNT(*) FROM training_samples GROUP BY category"
        ).fetchall()
        exports  = self.conn.execute("SELECT COUNT(*) FROM export_history").fetchone()[0]

        return {
            "total_samples":    total,
            "verified_samples": verified,
            "by_category":      {r[0]: r[1] for r in by_cat},
            "export_count":     exports,
            "ready_to_export":  total >= self.MIN_SAMPLES_TO_EXPORT,
        }

    def auto_export_if_ready(self) -> str | None:
        """تصدير تلقائي عند اكتمال الحد الأدنى"""
        stats = self.get_stats()
        if stats["ready_to_export"]:
            print(f"   🎓 يكفي {stats['total_samples']} مثال - بدء التصدير...")
            return self.export_jsonl()
        return None
