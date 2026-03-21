"""
╔══════════════════════════════════════════════════════╗
║  PHASE 3 · Autonomous Goals                         ║
║  الـ Agent يضع لنفسه أهدافاً ويتابع تحقيقها        ║
╚══════════════════════════════════════════════════════╝

الـ Agent لا ينتظر أن تخبره بماذا يفعل.
بدلاً من ذلك:
  1. يحلل الوضع الحالي
  2. يحدد أهم الأهداف التي يجب تحقيقها
  3. يضع خطة تنفيذ مع أولويات
  4. يتابع التقدم ويعدّل الأهداف
"""

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from core.brain import Brain


class GoalManager:

    GOAL_TYPES = {
        "fix_task":        {"priority": 10, "desc": "إصلاح مهمة فاشلة"},
        "improve_rate":    {"priority":  8, "desc": "تحسين معدل نجاح مهمة"},
        "learn_topic":     {"priority":  5, "desc": "تعلم موضوع تقني جديد"},
        "refactor_code":   {"priority":  4, "desc": "تحسين جودة الكود"},
        "add_feature":     {"priority":  3, "desc": "إضافة ميزة جديدة"},
        "optimize_speed":  {"priority":  6, "desc": "تحسين سرعة الأداء"},
        "reduce_cost":     {"priority":  7, "desc": "تقليل تكلفة API"},
    }

    def __init__(self, brain: Brain, db_path: str = "data/goals.db"):
        self.brain = brain
        self.conn  = sqlite3.connect(db_path, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS goals (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                type        TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT,
                priority    INTEGER DEFAULT 5,
                status      TEXT DEFAULT 'pending',  -- pending|active|done|failed
                progress    REAL DEFAULT 0.0,
                target      TEXT,   -- JSON: معايير النجاح
                created_at  TEXT,
                updated_at  TEXT,
                due_date    TEXT,
                result      TEXT
            );
            CREATE TABLE IF NOT EXISTS goal_actions (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_id  INTEGER,
                action   TEXT,
                outcome  TEXT,
                score    REAL,
                taken_at TEXT,
                FOREIGN KEY (goal_id) REFERENCES goals(id)
            );
        """)
        self.conn.commit()

    # ── توليد الأهداف التلقائي ────────────────────────────
    def generate_goals(self, system_state: dict) -> list:
        """
        بناءً على الوضع الحالي → يولّد قائمة أهداف ذكية
        """
        failing_tasks = system_state.get("failing_tasks", [])
        open_prs      = system_state.get("open_prs", 0)
        knowledge_gap = system_state.get("low_knowledge_areas", [])
        farm_errors   = system_state.get("farm_errors", 0)

        prompt = f"""أنت مدير تطوير ذكي لـ VRBOT.
بناءً على الوضع الحالي:

مهام فاشلة: {json.dumps(failing_tasks, ensure_ascii=False)}
PRs مفتوحة: {open_prs}
مجالات تحتاج تعلم: {knowledge_gap}
أخطاء المزارع: {farm_errors}

حدّد أهم 5 أهداف يجب تحقيقها الآن، مرتّبة بالأولوية.
أجب بـ JSON:
[
  {{
    "type": "fix_task|improve_rate|learn_topic|refactor_code|add_feature|optimize_speed|reduce_cost",
    "title": "عنوان الهدف",
    "description": "وصف مفصّل",
    "priority": 1-10,
    "target": {{"metric": "success_rate", "value": 0.9}},
    "due_hours": 24
  }}
]"""

        raw = self.brain.think(prompt, max_tokens=1000)
        try:
            clean = raw.strip().replace("```json","").replace("```","")
            goals = json.loads(clean)
            return self._save_goals(goals)
        except Exception as e:
            print(f"⚠️  خطأ في توليد الأهداف: {e}")
            return []

    def _save_goals(self, goals_data: list) -> list:
        saved = []
        now   = datetime.now()
        for g in goals_data:
            due = (now + timedelta(hours=g.get("due_hours", 24))).isoformat()
            rid = self.conn.execute(
                "INSERT INTO goals (type,title,description,priority,target,created_at,updated_at,due_date) VALUES (?,?,?,?,?,?,?,?)",
                (g.get("type","fix_task"), g.get("title",""),
                 g.get("description",""), g.get("priority",5),
                 json.dumps(g.get("target",{})), now.isoformat(),
                 now.isoformat(), due)
            ).lastrowid
            self.conn.commit()
            saved.append({"id": rid, **g})
            print(f"   🎯 هدف جديد [{g.get('priority',5)}]: {g.get('title','')[:50]}")
        return saved

    # ── إدارة الأهداف ─────────────────────────────────────
    def get_active_goals(self, limit: int = 3) -> list:
        """أهم الأهداف النشطة حسب الأولوية"""
        rows = self.conn.execute(
            """SELECT id, type, title, description, priority, progress, target
               FROM goals
               WHERE status IN ('pending','active')
               ORDER BY priority DESC, created_at ASC
               LIMIT ?""",
            (limit,)
        ).fetchall()
        return [
            {"id": r[0], "type": r[1], "title": r[2], "description": r[3],
             "priority": r[4], "progress": r[5], "target": json.loads(r[6] or "{}")}
            for r in rows
        ]

    def update_progress(self, goal_id: int, progress: float,
                         action: str = "", outcome: str = "", score: float = 0.5):
        """تحديث تقدم هدف"""
        status = "done" if progress >= 1.0 else "active"
        self.conn.execute(
            "UPDATE goals SET progress=?, status=?, updated_at=? WHERE id=?",
            (min(progress, 1.0), status, datetime.now().isoformat(), goal_id)
        )
        if action:
            self.conn.execute(
                "INSERT INTO goal_actions (goal_id,action,outcome,score,taken_at) VALUES (?,?,?,?,?)",
                (goal_id, action[:200], outcome[:200], score, datetime.now().isoformat())
            )
        self.conn.commit()

        if status == "done":
            print(f"   🏆 هدف #{goal_id} اكتمل!")

    def mark_failed(self, goal_id: int, reason: str):
        self.conn.execute(
            "UPDATE goals SET status='failed', result=?, updated_at=? WHERE id=?",
            (reason[:200], datetime.now().isoformat(), goal_id)
        )
        self.conn.commit()

    # ── تقرير الأهداف ────────────────────────────────────
    def get_dashboard(self) -> dict:
        total   = self.conn.execute("SELECT COUNT(*) FROM goals").fetchone()[0]
        done    = self.conn.execute("SELECT COUNT(*) FROM goals WHERE status='done'").fetchone()[0]
        active  = self.conn.execute("SELECT COUNT(*) FROM goals WHERE status='active'").fetchone()[0]
        pending = self.conn.execute("SELECT COUNT(*) FROM goals WHERE status='pending'").fetchone()[0]
        failed  = self.conn.execute("SELECT COUNT(*) FROM goals WHERE status='failed'").fetchone()[0]

        # نسبة الإنجاز
        completion_rate = done / total if total else 0

        # الهدف الأعلى أولوية
        next_goal = self.get_active_goals(limit=1)

        return {
            "total":           total,
            "done":            done,
            "active":          active,
            "pending":         pending,
            "failed":          failed,
            "completion_rate": completion_rate,
            "next_goal":       next_goal[0] if next_goal else None,
        }

    def reflect_and_readjust(self, recent_results: list) -> str:
        """
        مراجعة دورية: هل الأهداف لا تزال ملائمة؟
        قد يلغي أهدافاً أو يضيف أخرى.
        """
        dashboard = self.get_dashboard()
        active    = self.get_active_goals(limit=5)

        prompt = f"""راجع هذه الأهداف وقيّم هل ما زالت مناسبة:

الوضع الحالي:
  - مكتملة: {dashboard['done']}/{dashboard['total']}
  - معدل الإنجاز: {dashboard['completion_rate']:.0%}

الأهداف النشطة:
{json.dumps(active, ensure_ascii=False, indent=2)[:600]}

نتائج الفترة الأخيرة:
{json.dumps(recent_results[:3], ensure_ascii=False)[:400]}

هل يجب تعديل أي أهداف؟ اقترح تعديلات موجزة."""

        return self.brain.think(prompt, max_tokens=400)
