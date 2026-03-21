"""
╔══════════════════════════════════════════════════════╗
║  PHASE 2 · Strategy Learner                         ║
║  يتعلم أي استراتيجية تنجح مع أي نوع مشكلة         ║
╚══════════════════════════════════════════════════════╝

الاستراتيجيات المتاحة:
  • direct_fix        → إصلاح مباشر في الكود
  • coordinate_update → تحديث الإحداثيات
  • timeout_retry     → زيادة المهلة + retry
  • detection_switch  → تغيير طريقة الكشف (template→YOLO→AI)
  • logic_refactor    → إعادة هيكلة المنطق
  • add_fallback       → إضافة خطة بديلة
  • increase_wait      → زيادة أوقات الانتظار
  • screen_verify     → إضافة التحقق من الشاشة
"""

import json
import sqlite3
import random
from datetime import datetime
from pathlib import Path
from core.brain import Brain


# ── تعريف الاستراتيجيات ──────────────────────────────
STRATEGY_CATALOG = {
    "direct_fix": {
        "name":     "إصلاح مباشر",
        "desc":     "تعديل الكود المسبب للخطأ مباشرة",
        "best_for": ["logic", "syntax", "import"],
        "prompt_hint": "ركّز على تحديد السطر المسبب للخطأ وتصحيحه"
    },
    "coordinate_update": {
        "name":     "تحديث إحداثيات",
        "desc":     "إعادة ضبط إحداثيات النقر والعناصر",
        "best_for": ["coordinate_miss", "tap_fail", "wrong_position"],
        "prompt_hint": "قدّم إحداثيات بديلة مع هامش خطأ ±15px وآلية تحقق"
    },
    "timeout_retry": {
        "name":     "زيادة المهلة والمحاولة",
        "desc":     "تمديد timeouts وإضافة retry loops",
        "best_for": ["timeout", "network_error", "slow_response"],
        "prompt_hint": "أضف exponential backoff وحد أقصى للمحاولات"
    },
    "detection_switch": {
        "name":     "تغيير طريقة الكشف",
        "desc":     "الانتقال من Template Matching → YOLO → AI",
        "best_for": ["detection_fail", "template_fail", "element_not_found"],
        "prompt_hint": "استخدم hybrid_find() مع cascade: template→yolo→claude_vision"
    },
    "logic_refactor": {
        "name":     "إعادة هيكلة المنطق",
        "desc":     "إعادة كتابة منطق المهمة بالكامل",
        "best_for": ["logic", "state_error", "wrong_flow"],
        "prompt_hint": "ارسم flowchart ذهنياً ثم أعد الكتابة خطوة بخطوة"
    },
    "add_fallback": {
        "name":     "إضافة خطة بديلة",
        "desc":     "إضافة fallback عند فشل المسار الرئيسي",
        "best_for": ["unknown", "intermittent", "random_fail"],
        "prompt_hint": "أضف try/except شامل مع إجراء تعافٍ واضح"
    },
    "increase_wait": {
        "name":     "زيادة أوقات الانتظار",
        "desc":     "إضافة sleeps استراتيجية بين الخطوات",
        "best_for": ["race_condition", "animation", "loading"],
        "prompt_hint": "أضف time.sleep() بعد كل tap مع انتظار تحميل العناصر"
    },
    "screen_verify": {
        "name":     "التحقق من الشاشة",
        "desc":     "إضافة فحص الشاشة قبل وبعد كل خطوة",
        "best_for": ["wrong_state", "navigation_error", "unexpected_screen"],
        "prompt_hint": "استخدم verify_state() للتحقق من الشاشة الصحيحة قبل المتابعة"
    },
}


class StrategyLearner:

    def __init__(self, brain: Brain, db_path: str = "data/strategies/strategies.db"):
        self.brain = brain
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn  = sqlite3.connect(db_path, check_same_thread=False)
        self._init_db()
        self._load_scores()

    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS strategy_results (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                strategy    TEXT NOT NULL,
                task        TEXT NOT NULL,
                category    TEXT,
                score       REAL DEFAULT 0.0,
                pr_merged   INTEGER DEFAULT 0,
                timestamp   TEXT
            );
            CREATE TABLE IF NOT EXISTS strategy_scores (
                strategy    TEXT NOT NULL,
                category    TEXT NOT NULL,
                wins        INTEGER DEFAULT 0,
                losses      INTEGER DEFAULT 0,
                avg_score   REAL    DEFAULT 0.5,
                PRIMARY KEY (strategy, category)
            );
        """)
        self.conn.commit()

    def _load_scores(self):
        """تحميل الدرجات من DB إلى الذاكرة"""
        rows = self.conn.execute(
            "SELECT strategy, category, wins, losses, avg_score FROM strategy_scores"
        ).fetchall()
        self._scores = {}
        for strategy, category, wins, losses, avg in rows:
            key = f"{strategy}:{category}"
            self._scores[key] = {"wins": wins, "losses": losses, "avg": avg}

    # ── اختيار الاستراتيجية ──────────────────────────────
    def pick_strategy(self, task: str, error_category: str,
                      error_description: str) -> tuple[str, dict]:
        """
        يختار أفضل استراتيجية بناءً على:
        1. السجل التاريخي (exploitation)
        2. الاستكشاف أحياناً (exploration)
        3. تطابق الفئة مع best_for
        """
        # Epsilon-greedy: 20% استكشاف، 80% استغلال
        explore = random.random() < 0.20

        if explore:
            # اختر عشوائياً
            strategy = random.choice(list(STRATEGY_CATALOG.keys()))
            print(f"   🎲 استكشاف استراتيجية جديدة: {strategy}")
        else:
            strategy = self._best_known_strategy(error_category)
            print(f"   🎯 أفضل استراتيجية معروفة: {strategy}")

        return strategy, STRATEGY_CATALOG[strategy]

    def _best_known_strategy(self, category: str) -> str:
        """أعلى استراتيجية تقييماً لهذه الفئة"""
        candidates = {}

        for s_key, s_info in STRATEGY_CATALOG.items():
            # هل هذه الاستراتيجية مناسبة للفئة؟
            relevance = 1.0 if category in s_info["best_for"] else 0.5

            # ما هو سجلها التاريخي؟
            db_key   = f"{s_key}:{category}"
            hist     = self._scores.get(db_key, {"avg": 0.5, "wins": 0})
            hist_avg = hist["avg"]

            # UCB1 formula: avg + sqrt(2 * ln(total) / count)
            import math
            total = sum(v.get("wins",0) + v.get("losses",0)
                        for v in self._scores.values()) or 1
            count = hist.get("wins",0) + hist.get("losses",0) or 1
            ucb   = hist_avg + math.sqrt(2 * math.log(total) / count)

            candidates[s_key] = relevance * ucb

        return max(candidates, key=candidates.get)

    # ── تسجيل النتيجة ────────────────────────────────────
    def record_result(self, strategy: str, task: str,
                      category: str, score: float, pr_merged: bool = False):
        """سجّل نتيجة استخدام استراتيجية"""
        self.conn.execute(
            "INSERT INTO strategy_results VALUES (NULL,?,?,?,?,?,?)",
            (strategy, task, category, score,
             1 if pr_merged else 0, datetime.now().isoformat())
        )

        # تحديث الدرجات
        key = f"{strategy}:{category}"
        if key not in self._scores:
            self._scores[key] = {"wins": 0, "losses": 0, "avg": 0.5}

        s = self._scores[key]
        is_win  = score >= 0.6
        s["wins"]   += 1 if is_win else 0
        s["losses"] += 0 if is_win else 1
        count        = s["wins"] + s["losses"]
        s["avg"]     = (s["avg"] * (count-1) + score) / count

        self.conn.execute("""
            INSERT INTO strategy_scores (strategy,category,wins,losses,avg_score)
            VALUES (?,?,?,?,?)
            ON CONFLICT(strategy,category) DO UPDATE SET
              wins=excluded.wins, losses=excluded.losses, avg_score=excluded.avg_score
        """, (strategy, category, s["wins"], s["losses"], s["avg"]))
        self.conn.commit()

    # ── تعلم استراتيجية جديدة ────────────────────────────
    def discover_new_strategy(self, problem_pattern: str,
                               successful_solutions: list) -> dict:
        """
        إذا لم تنجح أي استراتيجية → يسأل Claude لاكتشاف واحدة جديدة
        """
        solutions_text = "\n".join([
            f"- {s.get('solution','')[:100]} (نجاح: {s.get('score',0):.0%})"
            for s in successful_solutions[:5]
        ])

        prompt = f"""بناءً على هذا النمط من المشاكل في VRBOT:
{problem_pattern}

والحلول الناجحة السابقة:
{solutions_text}

اقترح استراتيجية جديدة عامة يمكن تطبيقها على مشاكل مشابهة.
أجب بـ JSON:
{{
  "key": "snake_case_name",
  "name": "اسم الاستراتيجية",
  "desc": "وصف مختصر",
  "best_for": ["category1", "category2"],
  "prompt_hint": "تلميح للـ AI عند تطبيق هذه الاستراتيجية"
}}"""

        raw = self.brain.think(prompt, max_tokens=500)
        try:
            clean    = raw.strip().replace("```json","").replace("```","")
            new_strat = json.loads(clean)

            # أضف للـ catalog
            key = new_strat.get("key", f"discovered_{len(STRATEGY_CATALOG)}")
            STRATEGY_CATALOG[key] = {
                "name":        new_strat.get("name", key),
                "desc":        new_strat.get("desc", ""),
                "best_for":    new_strat.get("best_for", []),
                "prompt_hint": new_strat.get("prompt_hint", ""),
                "discovered":  True,
                "discovered_at": datetime.now().isoformat(),
            }
            print(f"   💡 اكتُشفت استراتيجية جديدة: {key}")
            return new_strat
        except Exception:
            return {}

    # ── تقرير الاستراتيجيات ──────────────────────────────
    def get_leaderboard(self) -> list:
        """ترتيب الاستراتيجيات حسب الأداء"""
        rows = self.conn.execute("""
            SELECT strategy, SUM(wins) as w, SUM(losses) as l,
                   AVG(avg_score) as avg
            FROM strategy_scores
            GROUP BY strategy
            ORDER BY avg DESC
        """).fetchall()
        return [{"strategy": r[0], "wins": r[1], "losses": r[2], "avg": r[3]}
                for r in rows]
