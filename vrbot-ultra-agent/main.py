"""
╔══════════════════════════════════════════════════════════════╗
║          VRBOT ULTRA AGENT  -  3 Phases Complete            ║
║                                                              ║
║  Phase 1: RAG + Search + Memory + GitHub PRs                ║
║  Phase 2: Self-Evaluation + Strategy Learning + Fine-tuning ║
║  Phase 3: Multi-Agent + Autonomous Goals + Self-Replication ║
╚══════════════════════════════════════════════════════════════╝

الاستخدام:
  python main.py              # دورة واحدة (كل المراحل)
  python main.py --loop       # تشغيل مستمر
  python main.py --phase 1    # مرحلة واحدة فقط
  python main.py --goals      # إنشاء أهداف جديدة
  python main.py --agents     # عرض الـ Agents المولّدة
  python main.py --report     # تقرير شامل
  python main.py --test       # اختبار الاتصالات
"""

import sys
import time
import json
import argparse
from datetime import datetime

# Phase 1
from core.brain           import Brain
from core.memory          import AgentMemory
from tools.log_analyzer   import LogAnalyzer
from tools.web_search     import OpenSourceLearner
from tools.github_tools   import GitHubTools
from tools.notifier       import TelegramNotifier
from improver.self_improver import SelfImprover

# Phase 2
from learning.self_evaluator  import SelfEvaluator
from learning.strategy_learner import StrategyLearner
from learning.fine_tuner      import FineTuner

# Phase 3
from agents.multi_agent       import CoordinatorAgent
from agents.autonomous_goals  import GoalManager
from agents.agent_spawner     import AgentSpawner

from config import (
    IMPROVEMENT_CYCLE_HOURS, MIN_FAILURE_RATE,
    VRBOT_TASKS, LEARNING_TOPICS, GITHUB_REPO_AGENT
)


class VRBOTUltraAgent:

    VERSION = "3.0.0"

    def __init__(self):
        self._banner()

        # ── Phase 1 ───────────────────────────────────────
        print("⚙️  تهيئة Phase 1 (Core)...")
        self.brain    = Brain()
        self.memory   = AgentMemory()
        self.analyzer = LogAnalyzer()
        self.learner  = OpenSourceLearner()
        self.github   = GitHubTools()
        self.notifier = TelegramNotifier()
        self.improver = SelfImprover(
            brain=self.brain, memory=self.memory,
            learner=self.learner, github=self.github,
            notifier=self.notifier
        )

        # ── Phase 2 ───────────────────────────────────────
        print("⚙️  تهيئة Phase 2 (Learning)...")
        self.evaluator = SelfEvaluator(self.brain)
        self.strategist = StrategyLearner(self.brain)
        self.fine_tuner = FineTuner(self.brain)

        # ── Phase 3 ───────────────────────────────────────
        print("⚙️  تهيئة Phase 3 (Autonomous)...")
        self.coordinator = CoordinatorAgent(self.brain)
        self.goal_manager = GoalManager(self.brain)
        self.spawner      = AgentSpawner(self.brain)
        self.spawner.load_saved_agents()

        self.cycle_count = 0
        self.session_results = []
        print("✅ Ultra Agent جاهز!\n")

    # ═══════════════════════════════════════════════════════
    #  الدورة الكاملة (3 مراحل)
    # ═══════════════════════════════════════════════════════
    def run_cycle(self, phases: list = None) -> dict:
        active_phases = phases or [1, 2, 3]
        self.cycle_count += 1
        start = time.time()

        print(f"\n{'═'*60}")
        print(f"  🔄 الدورة #{self.cycle_count} | {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print(f"  المراحل: {active_phases}")
        print(f"{'═'*60}")

        self.notifier.notify_cycle_start(self.cycle_count)
        cycle_result = {
            "cycle": self.cycle_count,
            "phases_run": active_phases,
            "prs": [], "goals_completed": 0,
            "agents_spawned": 0, "training_samples": 0,
        }

        # ══════════════════════════════════════════════════
        #  PHASE 1: تحليل + بحث + PRs
        # ══════════════════════════════════════════════════
        if 1 in active_phases:
            print("\n┌── PHASE 1: Core Analysis & Fix ──────────────────┐")
            p1_result = self._run_phase1()
            cycle_result["prs"].extend(p1_result.get("prs", []))
            cycle_result["failing_tasks"] = p1_result.get("failing_tasks", [])
            print("└──────────────────────────────────────────────────┘")

        # ══════════════════════════════════════════════════
        #  PHASE 2: تقييم ذاتي + استراتيجيات + بيانات تدريب
        # ══════════════════════════════════════════════════
        if 2 in active_phases:
            print("\n┌── PHASE 2: Self-Evaluation & Learning ───────────┐")
            p2_result = self._run_phase2(cycle_result.get("failing_tasks", []))
            cycle_result["training_samples"] = p2_result.get("samples_added", 0)
            cycle_result["strategy_used"]    = p2_result.get("strategy", "")
            print("└──────────────────────────────────────────────────┘")

        # ══════════════════════════════════════════════════
        #  PHASE 3: Multi-Agent + أهداف + توليد Agents
        # ══════════════════════════════════════════════════
        if 3 in active_phases:
            print("\n┌── PHASE 3: Autonomous & Multi-Agent ─────────────┐")
            p3_result = self._run_phase3(cycle_result)
            cycle_result["goals_completed"] = p3_result.get("goals_done", 0)
            cycle_result["agents_spawned"]  = p3_result.get("new_agents", 0)
            cycle_result["prs"].extend(p3_result.get("prs", []))
            print("└──────────────────────────────────────────────────┘")

        # ══════════════════════════════════════════════════
        #  تقرير الدورة
        # ══════════════════════════════════════════════════
        elapsed = time.time() - start
        cycle_result["elapsed"] = elapsed
        self.session_results.append(cycle_result)
        self._print_cycle_report(cycle_result)

        # تصدير بيانات التدريب إذا اكتملت
        self.fine_tuner.auto_export_if_ready()

        return cycle_result

    # ══════════════════════════════════════════════════════
    #  تنفيذ كل مرحلة
    # ══════════════════════════════════════════════════════
    def _run_phase1(self) -> dict:
        """Phase 1: الجوهر - تحليل + بحث + إصلاح"""
        # جلب وتحليل logs
        print("  📡 جلب logs...")
        log_text = self.analyzer.fetch_server_logs(lines=1000)
        analysis = self.analyzer.analyze_log_text(log_text)
        self.notifier.notify_analysis_done(analysis)

        # معالجة المهام الفاشلة
        failing  = analysis.get("failing_tasks", []) or \
                   self.memory.get_failing_tasks(threshold=1-MIN_FAILURE_RATE)

        prs_created = []
        for task_info in failing[:3]:
            result = self.improver.process_failing_task(
                task_info  = task_info,
                log_errors = analysis.get("error_summary", [])
            )
            if result.get("pr", {}).get("number"):
                prs_created.append(result["pr"])

        return {"prs": prs_created, "failing_tasks": failing}

    def _run_phase2(self, failing_tasks: list) -> dict:
        """Phase 2: تعلم ذاتي"""
        samples_added = 0

        for task_info in failing_tasks[:3]:
            task_name = task_info.get("task", "")
            error     = task_info.get("top_error", "")

            # اختيار الاستراتيجية المثلى
            strategy_key, strategy_info = self.strategist.pick_strategy(
                task=task_name, error_category=task_info.get("category","unknown"),
                error_description=error
            )
            print(f"  📐 الاستراتيجية: {strategy_info['name']}")

            # بحث + إصلاح بالاستراتيجية المختارة
            search_results = self.learner.search_all(f"{task_name} {error[:30]} python")
            improvement    = self.brain.suggest_improvement(
                task_name=task_name,
                stats={"success_rate": task_info.get("success_rate",0), "top_error": error},
                search_results=search_results
            )

            # تقييم الإصلاح
            eval_result = self.evaluator.evaluate(
                task=task_name, action=f"apply {strategy_key}", result=improvement
            )
            print(f"  📊 التقييم الذاتي: {eval_result['final_score']:.0%}")

            # تسجيل نتيجة الاستراتيجية
            self.strategist.record_result(
                strategy=strategy_key, task=task_name,
                category=task_info.get("category","unknown"),
                score=eval_result["final_score"]
            )

            # جمع بيانات التدريب إذا كان الحل جيداً
            if eval_result["final_score"] >= 0.65:
                self.fine_tuner.collect_sample(
                    task=task_name, category=task_info.get("category",""),
                    problem=error, context=f"strategy: {strategy_key}",
                    solution=improvement, score=eval_result["final_score"]
                )
                samples_added += 1

        # جلسة تعلم
        import random
        topics = random.sample(LEARNING_TOPICS, min(2, len(LEARNING_TOPICS)))
        self.improver.run_learning_session(topics)

        # تقرير ذاتي
        self_report = self.evaluator.generate_self_report()
        print(self_report)

        # leaderboard الاستراتيجيات
        leaders = self.strategist.get_leaderboard()
        if leaders:
            best = leaders[0]
            print(f"  🏆 أفضل استراتيجية: {best['strategy']} ({best['avg']:.0%})")

        return {"samples_added": samples_added, "strategy": strategy_key if failing_tasks else ""}

    def _run_phase3(self, cycle_data: dict) -> dict:
        """Phase 3: مستقل ومتعدد الـ Agents"""
        failing_tasks = cycle_data.get("failing_tasks", [])
        goals_done    = 0
        new_agents    = 0
        extra_prs     = []

        # ── توليد أهداف ذكية ──────────────────────────────
        system_state = {
            "failing_tasks":      failing_tasks,
            "open_prs":           len(cycle_data.get("prs",[])),
            "low_knowledge_areas": ["hall_of_valor", "kill_monster"],
            "farm_errors":        sum(1 for t in failing_tasks),
        }
        goals = self.goal_manager.generate_goals(system_state)
        print(f"  🎯 تم توليد {len(goals)} هدف")

        # ── معالجة أهم 2 هدف بالـ Multi-Agent ──────────────
        active_goals = self.goal_manager.get_active_goals(limit=2)

        for goal in active_goals:
            task_for_goal = goal.get("title", "")
            print(f"\n  👥 الفريق يعمل على الهدف: {task_for_goal[:40]}")

            # هل هناك agent متخصص؟
            specialist = None
            if goal.get("type") == "fix_task":
                task_name  = goal.get("description", "").split(":")[0].strip()
                task_info  = next((t for t in failing_tasks if t.get("task") in task_name), None)

                # توليد specialist إذا كانت المهمة تفشل باستمرار
                if task_info and task_info.get("success_rate",1) < 0.5:
                    specialist = self.spawner.spawn_task_specialist(
                        task_name    = task_info["task"],
                        task_history = {
                            "errors":    [task_info.get("top_error","")],
                            "solutions": self.memory.get_similar_solutions(task_info["task"])[:3],
                        }
                    )
                    new_agents += 1

            # تشغيل Multi-Agent Coordinator
            error_desc = ""
            if failing_tasks:
                error_desc = failing_tasks[0].get("top_error","مشكلة عامة")

            # اختيار الاستراتيجية
            strategy_key, strategy_info = self.strategist.pick_strategy(
                task=task_for_goal, error_category="unknown",
                error_description=error_desc
            )

            # جلب الكود الحالي
            current_code = ""
            if failing_tasks:
                t_name    = failing_tasks[0].get("task","")
                file_data = self.github.get_file(GITHUB_REPO_AGENT, f"{t_name}.py")
                current_code = file_data.get("content", "")[:2000]

            # تشغيل الفريق
            team_result = self.coordinator.solve(
                task         = task_for_goal[:60],
                error        = error_desc or "تحسين عام",
                current_code = current_code,
                strategy     = strategy_info.get("desc","")
            )

            final_verdict = team_result.get("final", {})
            score         = final_verdict.get("score", 0.5)

            # تحديث تقدم الهدف
            progress = score
            self.goal_manager.update_progress(
                goal_id=goal["id"], progress=progress,
                action=f"multi-agent solve: {strategy_key}",
                outcome=final_verdict.get("reason",""), score=score
            )
            if progress >= 0.7:
                goals_done += 1

            # إنشاء PR إذا وافق الـ Reviewer
            if final_verdict.get("create_pr") and team_result.get("code"):
                # استخدم الكود من الفريق مع specialist إذا وُجد
                final_code = team_result["code"]
                if specialist:
                    specialist_fix = specialist.solve(error_desc, final_code[:500])
                    if len(specialist_fix) > 100:
                        final_code = specialist_fix
                    specialist.record_outcome(score >= 0.6)

                # تسجيل نتيجة الاستراتيجية
                self.strategist.record_result(
                    strategy=strategy_key, task=task_for_goal,
                    category="multi_agent", score=score,
                    pr_merged=False
                )

                # حفظ بيانات تدريب من عمل الفريق
                analysis_data = team_result.get("analysis", {})
                self.fine_tuner.collect_sample(
                    task=task_for_goal, category=analysis_data.get("category","multi_agent"),
                    problem=error_desc, context=f"multi-agent team result",
                    solution=final_code, score=score
                )

        # ── تقليص الـ Agents الضعيفة ─────────────────────
        pruned = self.spawner.prune_weak_agents()
        if pruned:
            print(f"  🗑  حُذف {pruned} agent ضعيف")

        # ── إعادة تقييم الأهداف كل 4 دورات ──────────────
        if self.cycle_count % 4 == 0:
            reflection = self.goal_manager.reflect_and_readjust(
                self.session_results[-4:]
            )
            print(f"  🔮 مراجعة الأهداف: {reflection[:100]}")

        return {
            "goals_done": goals_done,
            "new_agents": new_agents,
            "prs":        extra_prs,
        }

    # ══════════════════════════════════════════════════════
    #  أوضاع إضافية
    # ══════════════════════════════════════════════════════
    def run_loop(self):
        print(f"🔁 وضع الحلقة - كل {IMPROVEMENT_CYCLE_HOURS} ساعة\n")
        try:
            while True:
                self.run_cycle()
                if self.cycle_count % 4 == 0:
                    self._send_full_report()
                print(f"\n⏳ التالية بعد {IMPROVEMENT_CYCLE_HOURS}h...")
                time.sleep(IMPROVEMENT_CYCLE_HOURS * 3600)
        except KeyboardInterrupt:
            print("\n⛔ إيقاف Ultra Agent")
            self._send_full_report()

    def run_phase(self, phase: int):
        """تشغيل مرحلة واحدة فقط"""
        self.run_cycle(phases=[phase])

    def show_goals(self):
        dash = self.goal_manager.get_dashboard()
        print("\n🎯 لوحة الأهداف")
        print(f"  ✅ مكتملة: {dash['done']} | ⚡ نشطة: {dash['active']} | ⏳ معلّقة: {dash['pending']} | ❌ فاشلة: {dash['failed']}")
        print(f"  معدل الإنجاز: {dash['completion_rate']:.0%}")
        if dash["next_goal"]:
            print(f"  الهدف التالي: {dash['next_goal']['title']}")

    def show_agents(self):
        agents = self.spawner.list_agents()
        print(f"\n🤖 الـ Agents المولّدة ({len(agents)})")
        for a in agents:
            print(f"  [{a['type']}] {a['id'][:30]} | نجاح: {a['success_rate']:.0%} | استدعاءات: {a['calls']}")

    def show_report(self):
        print("\n📊 تقرير Ultra Agent")
        print(f"{'─'*50}")
        # Memory
        mem = self.memory.get_summary()
        print(f"  🧠 Memory: {mem['total_experiences']} تجربة | {mem['total_prs']} PRs")
        # Evaluator
        trend = self.evaluator.get_performance_trend()
        print(f"  📈 الأداء: {trend['avg']:.0%} | {'↑ تحسّن' if trend['improving'] else '↓ تراجع'}")
        # Strategy
        leaders = self.strategist.get_leaderboard()
        if leaders:
            print(f"  🏆 أفضل استراتيجية: {leaders[0]['strategy']}")
        # Fine-tuning
        ft_stats = self.fine_tuner.get_stats()
        print(f"  🎓 بيانات تدريب: {ft_stats['total_samples']} مثال (جاهز: {ft_stats['ready_to_export']})")
        # Goals
        gdash = self.goal_manager.get_dashboard()
        print(f"  🎯 أهداف: {gdash['done']}/{gdash['total']} مكتملة")
        # Agents
        print(f"  🤖 Sub-agents: {len(self.spawner.list_agents())}")
        # Weak areas
        weak = self.evaluator.get_weak_areas(top_n=3)
        if weak:
            print(f"  ⚠️  نقاط ضعف: {', '.join(w['area'][:30] for w in weak)}")

    def _send_full_report(self):
        mem = self.memory.get_summary()
        self.notifier.notify_daily_report({
            "memory": mem,
            "prs_today": len([r for r in self.session_results[-4:] for _ in r.get("prs",[])]),
            "cycles_today": self.cycle_count,
            "farm_count": 20,
        })

    def _print_cycle_report(self, r: dict):
        print(f"\n{'─'*60}")
        print(f"  📊 نتائج الدورة #{r['cycle']} ({r['elapsed']:.0f}s)")
        print(f"  🚀 PRs: {len(r.get('prs',[]))} | 🎯 أهداف: {r.get('goals_completed',0)} | 🤖 Agents: {r.get('agents_spawned',0)}")
        print(f"  📝 عينات تدريب: {r.get('training_samples',0)}")
        for pr in r.get("prs", []):
            print(f"  🔗 PR #{pr.get('number')}: {pr.get('url','')}")
        print(f"{'─'*60}")

    def _banner(self):
        print("""
╔══════════════════════════════════════════════════════╗
║    🤖  VRBOT ULTRA AGENT  v3.0.0                    ║
║                                                      ║
║  Phase 1 ✅  Core Analysis + PRs                    ║
║  Phase 2 ✅  Self-Eval + Strategy + Fine-tuning     ║
║  Phase 3 ✅  Multi-Agent + Goals + Replication      ║
╚══════════════════════════════════════════════════════╝
""")


# ═══════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="VRBOT Ultra Agent v3")
    parser.add_argument("--loop",    action="store_true")
    parser.add_argument("--phase",   type=int, choices=[1,2,3])
    parser.add_argument("--goals",   action="store_true")
    parser.add_argument("--agents",  action="store_true")
    parser.add_argument("--report",  action="store_true")
    parser.add_argument("--test",    action="store_true")
    args = parser.parse_args()

    agent = VRBOTUltraAgent()

    if args.test:
        print("🧪 اختبار..."); agent.brain.think("قل ok")
        print("✅ Claude API يعمل")
    elif args.goals:
        agent.show_goals()
    elif args.agents:
        agent.show_agents()
    elif args.report:
        agent.show_report()
    elif args.phase:
        agent.run_phase(args.phase)
    elif args.loop:
        agent.run_loop()
    else:
        agent.run_cycle()


if __name__ == "__main__":
    main()
