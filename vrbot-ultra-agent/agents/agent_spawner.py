"""
╔══════════════════════════════════════════════════════╗
║  PHASE 3 · Agent Spawner (Self-Replication)         ║
║  يولّد Agents متخصصين حسب الحاجة                   ║
╚══════════════════════════════════════════════════════╝

Self-Replication لا تعني نسخ النفس بشكل عشوائي.
تعني: إنشاء Sub-agents متخصصة لمهام محددة.

مثال:
  إذا كان task_kill_monster يفشل دائماً →
  يُولد "KillMonsterSpecialist" agent مخصص له
  هذا الـ agent يركّز 100% على هذه المهمة فقط
"""

import json
import os
from datetime import datetime
from pathlib import Path
from core.brain import Brain


class AgentSpawner:
    """
    ينشئ Sub-agents متخصصين ويديرهم
    """

    SPAWN_TEMPLATES = {
        "task_specialist": """أنت متخصص في مهمة {task_name} في VRBOT.
معلوماتك المتخصصة:
  - الإحداثيات المعروفة: {coordinates}
  - الأخطاء الشائعة: {known_errors}
  - أفضل الحلول السابقة: {best_solutions}
  - دورة التنفيذ: {cycle_info}

ركّز حصرياً على هذه المهمة وحلّها بأفضل طريقة ممكنة.""",

        "error_specialist": """أنت متخصص في تشخيص نوع الخطأ التالي: {error_type}.
تعرف جميع الأسباب الممكنة وأفضل الحلول.
رصيدك: {success_count} حل ناجح من أصل {total_count} محاولة.""",

        "learning_agent": """أنت باحث متخصص في موضوع: {topic}.
مهمتك جمع أحدث المعلومات وتلخيصها لفريق VRBOT.
اهتمامك الأساسي: {focus_areas}""",

        "monitor_agent": """أنت مراقب لـ {component} في VRBOT.
تتابع: {metrics}
وتُبلّغ فوراً عند: {alert_conditions}"""
    }

    def __init__(self, brain: Brain,
                 agents_dir: str = "data/spawned_agents"):
        self.brain      = brain
        self.agents_dir = Path(agents_dir)
        self.agents_dir.mkdir(parents=True, exist_ok=True)
        self._active_agents = {}  # name → config

    # ── توليد Agent جديد ──────────────────────────────────
    def spawn_task_specialist(self, task_name: str,
                               task_history: dict) -> "SpawnedAgent":
        """
        يولّد agent متخصص لمهمة محددة
        مفيد عندما تفشل مهمة باستمرار
        """
        agent_id   = f"specialist_{task_name}_{datetime.now().strftime('%m%d_%H%M')}"

        # بناء system prompt مخصص
        system = self.SPAWN_TEMPLATES["task_specialist"].format(
            task_name   = task_name,
            coordinates = json.dumps(task_history.get("coordinates", {})),
            known_errors = "\n".join(task_history.get("errors", [])[:5]),
            best_solutions = "\n".join(task_history.get("solutions", [])[:3]),
            cycle_info  = task_history.get("cycle", "غير محدد")
        )

        # توليد معرفة تخصصية إضافية
        specialized_knowledge = self._generate_specialist_knowledge(task_name)

        config = {
            "id":       agent_id,
            "type":     "task_specialist",
            "task":     task_name,
            "system":   system + "\n\n" + specialized_knowledge,
            "created":  datetime.now().isoformat(),
            "stats":    {"calls": 0, "successes": 0}
        }

        # حفظ config
        config_path = self.agents_dir / f"{agent_id}.json"
        config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2))

        # إنشاء الـ Agent
        agent = SpawnedAgent(agent_id, config, self.brain)
        self._active_agents[agent_id] = agent

        print(f"   🐣 تم توليد: {agent_id}")
        return agent

    def spawn_error_specialist(self, error_type: str,
                                history: list) -> "SpawnedAgent":
        """Agent متخصص في نوع خطأ معين"""
        agent_id  = f"err_specialist_{error_type}_{datetime.now().strftime('%m%d_%H%M')}"
        successes = sum(1 for h in history if h.get("score", 0) >= 0.6)

        system = self.SPAWN_TEMPLATES["error_specialist"].format(
            error_type    = error_type,
            success_count = successes,
            total_count   = len(history)
        )

        config = {
            "id":      agent_id,
            "type":    "error_specialist",
            "error":   error_type,
            "system":  system,
            "created": datetime.now().isoformat(),
            "stats":   {"calls": 0, "successes": 0}
        }

        agent = SpawnedAgent(agent_id, config, self.brain)
        self._active_agents[agent_id] = agent
        print(f"   🐣 توليد error specialist: {error_type}")
        return agent

    def _generate_specialist_knowledge(self, task_name: str) -> str:
        """يولّد معرفة متخصصة لمهمة معينة عبر Claude"""
        prompt = f"""أنت خبير VRBOT. اكتب ملخص معرفي متخصص لمهمة {task_name}:

1. الإحداثيات الرئيسية المعروفة
2. أكثر الأخطاء شيوعاً وأسبابها
3. أفضل استراتيجية للتنفيذ
4. نقاط الفشل المحتملة
5. نصائح خاصة

اكتب بإيجاز وتركيز عالٍ (200 كلمة كحد أقصى)."""
        return self.brain.think(prompt, max_tokens=400)

    # ── إدارة الـ Agents ──────────────────────────────────
    def get_agent(self, agent_id: str) -> "SpawnedAgent | None":
        return self._active_agents.get(agent_id)

    def get_best_agent_for_task(self, task_name: str) -> "SpawnedAgent | None":
        """إيجاد أفضل agent مخصص لمهمة"""
        candidates = [
            a for a in self._active_agents.values()
            if a.config.get("task") == task_name or
               a.config.get("error") in task_name
        ]
        if not candidates:
            return None
        # أفضل معدل نجاح
        return max(candidates, key=lambda a: a.success_rate)

    def load_saved_agents(self):
        """تحميل الـ Agents المحفوظة عند الإعادة تشغيل"""
        for config_file in self.agents_dir.glob("*.json"):
            try:
                config = json.loads(config_file.read_text(encoding="utf-8"))
                agent  = SpawnedAgent(config["id"], config, self.brain)
                self._active_agents[config["id"]] = agent
            except Exception:
                pass
        print(f"   📂 تم تحميل {len(self._active_agents)} agent محفوظ")

    def list_agents(self) -> list:
        return [
            {
                "id":          a.agent_id,
                "type":        a.config.get("type",""),
                "task":        a.config.get("task", a.config.get("error","")),
                "success_rate": a.success_rate,
                "calls":       a.config["stats"]["calls"],
            }
            for a in self._active_agents.values()
        ]

    def prune_weak_agents(self, min_calls: int = 5,
                           min_rate: float = 0.4):
        """حذف الـ Agents ذات الأداء الضعيف"""
        to_remove = [
            aid for aid, a in self._active_agents.items()
            if a.config["stats"]["calls"] >= min_calls
            and a.success_rate < min_rate
        ]
        for aid in to_remove:
            del self._active_agents[aid]
            path = self.agents_dir / f"{aid}.json"
            if path.exists():
                path.unlink()
            print(f"   🗑  حُذف agent ضعيف: {aid}")
        return len(to_remove)


class SpawnedAgent:
    """Agent فرعي منشأ بـ AgentSpawner"""

    def __init__(self, agent_id: str, config: dict, brain: Brain):
        self.agent_id = agent_id
        self.config   = config
        self.brain    = brain

    @property
    def success_rate(self) -> float:
        stats = self.config.get("stats", {})
        calls = stats.get("calls", 0)
        succs = stats.get("successes", 0)
        return succs / calls if calls > 0 else 0.5

    def solve(self, problem: str, context: str = "") -> str:
        """يحل مشكلة بمعرفته المتخصصة"""
        import anthropic
        client = self.brain.client

        resp = client.messages.create(
            model      = self.brain.model,
            max_tokens = 1500,
            system     = self.config.get("system", ""),
            messages   = [{
                "role": "user",
                "content": f"{problem}\n\n{'السياق: ' + context if context else ''}"
            }]
        )

        self.config["stats"]["calls"] += 1
        return resp.content[0].text

    def record_outcome(self, success: bool):
        if success:
            self.config["stats"]["successes"] += 1
