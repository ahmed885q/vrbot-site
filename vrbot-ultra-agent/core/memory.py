"""
Memory - نظام الذاكرة
======================
يحفظ كل تجربة ويسترجع الأنماط
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from config import MEMORY_DB


class AgentMemory:

    def __init__(self):
        Path(MEMORY_DB).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(MEMORY_DB, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS experiences (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                task      TEXT    NOT NULL,
                problem   TEXT,
                solution  TEXT,
                score     REAL    DEFAULT 0.0,
                timestamp TEXT    NOT NULL,
                tags      TEXT    DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS patterns (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_type  TEXT NOT NULL,
                description   TEXT,
                solution      TEXT,
                success_count INTEGER DEFAULT 0,
                fail_count    INTEGER DEFAULT 0,
                last_seen     TEXT
            );

            CREATE TABLE IF NOT EXISTS pr_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                pr_number   INTEGER,
                title       TEXT,
                branch      TEXT,
                status      TEXT DEFAULT 'open',
                merged_at   TEXT,
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_stats (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                date         TEXT NOT NULL,
                task_name    TEXT NOT NULL,
                total_runs   INTEGER DEFAULT 0,
                success_runs INTEGER DEFAULT 0,
                avg_time_sec REAL    DEFAULT 0.0,
                top_error    TEXT    DEFAULT ''
            );
        """)
        self.conn.commit()

    # ── تجارب ──────────────────────────────────────────────
    def save_experience(self, task: str, problem: str,
                        solution: str, score: float, tags: list = None):
        self.conn.execute(
            "INSERT INTO experiences (task,problem,solution,score,timestamp,tags) VALUES (?,?,?,?,?,?)",
            (task, problem, solution, score,
             datetime.now().isoformat(), json.dumps(tags or []))
        )
        self.conn.commit()

    def get_similar_solutions(self, task: str, limit: int = 5) -> list:
        cursor = self.conn.execute(
            """SELECT problem, solution, score FROM experiences
               WHERE task LIKE ? AND score > 0.5
               ORDER BY score DESC LIMIT ?""",
            (f"%{task.split('_')[0] if '_' in task else task}%", limit)
        )
        return [{"problem": r[0], "solution": r[1], "score": r[2]}
                for r in cursor.fetchall()]

    # ── إحصائيات يومية ─────────────────────────────────────
    def update_daily_stats(self, task_name: str, success: bool,
                           duration: float, error: str = ""):
        today = datetime.now().strftime("%Y-%m-%d")
        existing = self.conn.execute(
            "SELECT id, total_runs, success_runs, avg_time_sec FROM daily_stats WHERE date=? AND task_name=?",
            (today, task_name)
        ).fetchone()

        if existing:
            rid, total, succ, avg_t = existing
            new_total = total + 1
            new_succ  = succ + (1 if success else 0)
            new_avg   = (avg_t * total + duration) / new_total
            self.conn.execute(
                "UPDATE daily_stats SET total_runs=?, success_runs=?, avg_time_sec=?, top_error=? WHERE id=?",
                (new_total, new_succ, new_avg, error or "", rid)
            )
        else:
            self.conn.execute(
                "INSERT INTO daily_stats VALUES (NULL,?,?,1,?,?,?)",
                (today, task_name, 1 if success else 0, duration, error or "")
            )
        self.conn.commit()

    def get_task_stats(self, task_name: str, days: int = 7) -> dict:
        cursor = self.conn.execute(
            """SELECT SUM(total_runs), SUM(success_runs), AVG(avg_time_sec), top_error
               FROM daily_stats
               WHERE task_name=?
               ORDER BY date DESC LIMIT ?""",
            (task_name, days)
        )
        row = cursor.fetchone()
        if not row or not row[0]:
            return {"success_rate": 0, "avg_time": 0, "top_error": ""}
        total, succ, avg_t, err = row
        return {
            "success_rate": succ / total if total else 0,
            "avg_time":     avg_t or 0,
            "top_error":    err or ""
        }

    def get_failing_tasks(self, threshold: float = 0.7) -> list:
        """إرجاع المهام التي معدل نجاحها أقل من threshold"""
        today = datetime.now().strftime("%Y-%m-%d")
        cursor = self.conn.execute(
            """SELECT task_name,
                      CAST(success_runs AS REAL)/total_runs as rate,
                      top_error
               FROM daily_stats
               WHERE date=? AND total_runs > 2
                 AND CAST(success_runs AS REAL)/total_runs < ?""",
            (today, threshold)
        )
        return [{"task": r[0], "success_rate": r[1], "top_error": r[2]}
                for r in cursor.fetchall()]

    # ── PR History ──────────────────────────────────────────
    def save_pr(self, pr_number: int, title: str, branch: str):
        self.conn.execute(
            "INSERT INTO pr_history (pr_number,title,branch,created_at) VALUES (?,?,?,?)",
            (pr_number, title, branch, datetime.now().isoformat())
        )
        self.conn.commit()

    def get_recent_prs(self, limit: int = 10) -> list:
        cursor = self.conn.execute(
            "SELECT pr_number, title, branch, status, created_at FROM pr_history ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        return [{"number": r[0], "title": r[1], "branch": r[2],
                 "status": r[3], "created_at": r[4]}
                for r in cursor.fetchall()]

    # ── patterns ───────────────────────────────────────────
    def record_pattern(self, pattern_type: str, description: str,
                       solution: str, success: bool):
        existing = self.conn.execute(
            "SELECT id, success_count, fail_count FROM patterns WHERE pattern_type=? AND description=?",
            (pattern_type, description[:100])
        ).fetchone()

        if existing:
            rid, sc, fc = existing
            self.conn.execute(
                "UPDATE patterns SET success_count=?, fail_count=?, last_seen=? WHERE id=?",
                (sc + (1 if success else 0), fc + (0 if success else 1),
                 datetime.now().isoformat(), rid)
            )
        else:
            self.conn.execute(
                "INSERT INTO patterns (pattern_type,description,solution,success_count,fail_count,last_seen) VALUES (?,?,?,?,?,?)",
                (pattern_type, description[:100], solution,
                 1 if success else 0, 0 if success else 1,
                 datetime.now().isoformat())
            )
        self.conn.commit()

    def get_summary(self) -> dict:
        """ملخص شامل للذاكرة"""
        exp_count  = self.conn.execute("SELECT COUNT(*) FROM experiences").fetchone()[0]
        pr_count   = self.conn.execute("SELECT COUNT(*) FROM pr_history").fetchone()[0]
        pat_count  = self.conn.execute("SELECT COUNT(*) FROM patterns").fetchone()[0]
        today_runs = self.conn.execute(
            "SELECT SUM(total_runs), SUM(success_runs) FROM daily_stats WHERE date=?",
            (datetime.now().strftime("%Y-%m-%d"),)
        ).fetchone()

        return {
            "total_experiences": exp_count,
            "total_prs":         pr_count,
            "total_patterns":    pat_count,
            "today_runs":        today_runs[0] or 0,
            "today_success":     today_runs[1] or 0,
        }
