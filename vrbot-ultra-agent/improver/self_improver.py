"""
Self Improver - محرك التحسين الذاتي
=====================================
يحلل الفشل → يبحث → يكتب الحل → ينشئ PR
"""

from core.brain import Brain
from core.memory import AgentMemory
from tools.web_search import OpenSourceLearner
from tools.github_tools import GitHubTools
from tools.notifier import TelegramNotifier
from config import AUTO_CREATE_PR, GITHUB_REPO_AGENT


class SelfImprover:

    def __init__(self, brain: Brain, memory: AgentMemory,
                 learner: OpenSourceLearner, github: GitHubTools,
                 notifier: TelegramNotifier):
        self.brain    = brain
        self.memory   = memory
        self.learner  = learner
        self.github   = github
        self.notifier = notifier

    def process_failing_task(self, task_info: dict,
                              log_errors: list) -> dict:
        """
        الدورة الكاملة لمعالجة مهمة فاشلة:
        1. تحليل الخطأ
        2. البحث عن حل
        3. كتابة الإصلاح
        4. إنشاء PR
        """
        task_name   = task_info.get("task", "unknown")
        success_rate = task_info.get("success_rate", 0)
        top_error   = task_info.get("top_error", "")

        print(f"\n🔧 معالجة: {task_name} (نجاح {success_rate:.0%})")

        # 1. تحليل الخطأ
        print("   📋 تحليل الخطأ...")
        relevant_errors = [
            e["message"] for e in log_errors
            if task_name in e.get("task", "") or
               task_name.split("_")[1] in e.get("message", "").lower()
        ][:10]

        error_text = "\n".join(relevant_errors) or top_error or "معدل نجاح منخفض"
        analysis   = self.brain.analyze_failure(task_name, error_text)
        print(f"   🎯 السبب: {analysis.get('root_cause','?')[:80]}")
        print(f"   📊 الثقة: {analysis.get('confidence', 0):.0%}")

        # 2. البحث عن حل من المصادر المفتوحة
        print("   🔍 البحث عن حل...")
        search_query = (
            f"python android ADB {analysis.get('category','error')} "
            f"{task_name.replace('_',' ')} fix"
        )
        search_results = self.learner.search_all(search_query)

        # بحث إضافي في GitHub
        gh_query = f"android game automation {analysis.get('category','')}"
        gh_results = self.learner.search_github(gh_query)
        search_results.extend(gh_results)

        # 3. استرجاع حلول مشابهة من الذاكرة
        similar = self.memory.get_similar_solutions(task_name)
        memory_context = ""
        if similar:
            memory_context = "حلول سابقة ناجحة:\n" + "\n".join([
                f"- {s['problem'][:50]}: {s['solution'][:100]}"
                for s in similar[:3]
            ])

        # 4. كتابة الحل
        print("   ✍️  كتابة الإصلاح...")
        formatted_results = self.learner.format_for_brain(search_results)

        # جلب الكود الحالي من GitHub
        current_code = ""
        file_path    = f"{task_name}.py"
        file_data    = self.github.get_file(GITHUB_REPO_AGENT, file_path)
        if file_data.get("content"):
            current_code = file_data["content"][:3000]

        improvement = self.brain.suggest_improvement(
            task_name=task_name,
            stats={"success_rate": success_rate, "top_error": top_error},
            search_results=search_results
        )

        # 5. إنشاء PR (إذا مفعّل)
        pr_result = {}
        if AUTO_CREATE_PR and analysis.get("confidence", 0) > 0.4:
            print("   🚀 إنشاء PR...")

            # دمج الكود الحالي مع الإصلاح
            new_content = self._merge_fix(
                current_code, analysis.get("code_fix", ""), improvement
            )

            pr_meta = self.brain.generate_pr_description(
                changes=[f"تحسين {task_name}"],
                analysis=analysis
            )

            pr_result = self.github.create_fix_pr(
                task_name   = task_name,
                file_path   = file_path,
                new_content = new_content,
                analysis    = analysis,
                pr_meta     = pr_meta
            )

            if pr_result.get("number"):
                # حفظ في الذاكرة
                self.memory.save_pr(
                    pr_result["number"],
                    pr_result.get("title", ""),
                    f"agent/fix-{task_name}"
                )
                # إبلاغ Telegram
                self.notifier.notify_pr_created(pr_result, task_name, analysis)
                print(f"   ✅ PR #{pr_result['number']} أُنشئ!")
        else:
            if not AUTO_CREATE_PR:
                print("   ℹ️  AUTO_CREATE_PR معطّل، لن أنشئ PR")
            else:
                print(f"   ⚠️  الثقة منخفضة ({analysis.get('confidence',0):.0%})، لن أنشئ PR")

        # 6. حفظ التجربة في الذاكرة
        self.memory.save_experience(
            task     = task_name,
            problem  = error_text[:200],
            solution = improvement[:300],
            score    = analysis.get("confidence", 0.5),
            tags     = [analysis.get("category", ""), task_name]
        )

        return {
            "task":       task_name,
            "analysis":   analysis,
            "improvement": improvement,
            "pr":         pr_result,
            "sources_used": len(search_results)
        }

    def _merge_fix(self, current_code: str,
                   code_fix: str, improvement: str) -> str:
        """دمج الإصلاح مع الكود الحالي"""
        if not current_code:
            # إذا لم يكن هناك كود حالي، استخرج الكود من الاقتراح
            import re
            code_blocks = re.findall(
                r'```(?:python)?\n(.*?)```', improvement, re.DOTALL
            )
            return code_blocks[0] if code_blocks else improvement

        if code_fix:
            # أضف التعليق والإصلاح في نهاية الملف
            return (
                current_code + "\n\n"
                "# ═══════════════════════════════════\n"
                "# Auto-fix by VRBOT Developer Agent\n"
                "# ═══════════════════════════════════\n"
                + code_fix
            )

        return current_code

    def run_learning_session(self, topics: list) -> int:
        """جلسة تعلم: قراءة مواضيع جديدة وحفظها"""
        print(f"\n📚 جلسة تعلم: {len(topics)} موضوع")
        total = 0

        for topic in topics:
            results = self.learner.search_all(topic, include_arxiv=True)
            total  += len(results)

            if results:
                # حفظ أفضل نتيجة في الذاكرة
                best = max(results, key=lambda r: len(r.get("snippet", "")))
                self.memory.save_experience(
                    task     = "learning",
                    problem  = topic,
                    solution = best.get("snippet", "")[:300],
                    score    = 0.7,
                    tags     = ["learning", "open-source"]
                )

        print(f"   ✅ حفظت {total} مصدر جديد")
        return total
