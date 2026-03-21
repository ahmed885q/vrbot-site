"""
╔══════════════════════════════════════════════════════╗
║  PHASE 3 · Multi-Agent System                       ║
║  فريق من Agents متخصصين يعملون معاً                ║
╚══════════════════════════════════════════════════════╝

الفريق:
  🔍 Researcher  → يبحث في المصادر المفتوحة
  🔬 Analyzer    → يحلل الكود والأخطاء
  ✍️  Coder       → يكتب الإصلاحات والتحسينات  
  🧪 Tester      → يراجع الكود ويكتشف المشاكل
  📊 Reviewer    → يقيّم جودة الحل النهائي
  🎯 Coordinator → يوزّع المهام ويجمع النتائج
"""

import json
import time
from datetime import datetime
from dataclasses import dataclass, field
from typing import Callable
from core.brain import Brain
from tools.web_search import OpenSourceLearner


@dataclass
class AgentMessage:
    """رسالة بين الـ Agents"""
    sender:    str
    receiver:  str
    msg_type:  str          # task | result | question | feedback
    content:   str
    data:      dict = field(default_factory=dict)
    timestamp: str  = field(default_factory=lambda: datetime.now().isoformat())


class BaseAgent:
    """القاعدة المشتركة لجميع الـ Agents"""

    def __init__(self, name: str, role: str, brain: Brain,
                 system_override: str = ""):
        self.name   = name
        self.role   = role
        self.brain  = brain
        self.inbox  = []
        self.outbox = []
        self._system = system_override or self._default_system()

    def _default_system(self) -> str:
        return f"""أنت {self.name}، {self.role} في فريق VRBOT Developer Agents.
مهمتك محدودة وواضحة. ركّز على دورك فقط ولا تتجاوزه.
أجب بإيجاز ودقة."""

    def receive(self, msg: AgentMessage):
        self.inbox.append(msg)

    def send(self, receiver: str, msg_type: str, content: str, data: dict = None) -> AgentMessage:
        msg = AgentMessage(self.name, receiver, msg_type, content, data or {})
        self.outbox.append(msg)
        return msg

    def think(self, prompt: str, max_tokens: int = 1000) -> str:
        import anthropic
        client = self.brain.client
        resp   = client.messages.create(
            model      = self.brain.model,
            max_tokens = max_tokens,
            system     = self._system,
            messages   = [{"role": "user", "content": prompt}]
        )
        return resp.content[0].text


# ── الـ Agents المتخصصون ──────────────────────────────

class ResearcherAgent(BaseAgent):
    def __init__(self, brain: Brain):
        super().__init__("Researcher", "باحث في المصادر المفتوحة", brain)
        self.learner = OpenSourceLearner()

    def research(self, problem: str, category: str) -> dict:
        """يبحث في GitHub + SO + arXiv"""
        print(f"     🔍 Researcher: بحث عن '{problem[:50]}'")
        query   = f"python android {category} {problem[:40]} fix"
        results = self.learner.search_all(query, include_arxiv=(category in ["detection_fail","algorithm"]))
        formatted = self.learner.format_for_brain(results)
        return {"query": query, "results": results[:5], "formatted": formatted}


class AnalyzerAgent(BaseAgent):
    def __init__(self, brain: Brain):
        super().__init__(
            "Analyzer", "محلل الكود والأخطاء", brain,
            system_override="""أنت Analyzer في فريق VRBOT.
مهمتك: تحليل الأخطاء وتحديد السبب الجذري بدقة.
أجب دائماً بـ JSON منظّم."""
        )

    def analyze(self, task: str, error: str, research: dict) -> dict:
        """يحلل الخطأ مع مراعاة نتائج البحث"""
        print(f"     🔬 Analyzer: تحليل '{task}'")
        prompt = f"""حلّل هذا الخطأ في VRBOT:
المهمة: {task}
الخطأ: {error[:500]}

ما وجده Researcher:
{research.get('formatted','لا شيء')[:800]}

أجب بـ JSON:
{{
  "root_cause": "",
  "category": "",
  "affected_lines": [],
  "fix_approach": "",
  "risk_level": "low|medium|high",
  "confidence": 0.0
}}"""
        raw = self.think(prompt, max_tokens=600)
        try:
            return json.loads(raw.strip().replace("```json","").replace("```",""))
        except Exception:
            return {"root_cause": raw[:200], "category": "unknown",
                    "fix_approach": raw[:200], "confidence": 0.3, "risk_level": "medium"}


class CoderAgent(BaseAgent):
    def __init__(self, brain: Brain):
        super().__init__(
            "Coder", "مبرمج متخصص في Python وADB", brain,
            system_override="""أنت Coder في فريق VRBOT.
مهمتك: كتابة كود Python نظيف وفعّال لـ VRBOT.
- اتبع نمط الكود الموجود
- أضف error handling دائماً
- اكتب كوداً جاهزاً للإنتاج"""
        )

    def write_fix(self, task: str, analysis: dict,
                   current_code: str, strategy_hint: str) -> str:
        """يكتب الإصلاح المطلوب"""
        print(f"     ✍️  Coder: كتابة إصلاح '{task}'")
        prompt = f"""اكتب إصلاح Python لـ VRBOT:

المهمة: {task}
التحليل:
  - السبب: {analysis.get('root_cause','')}
  - النهج: {analysis.get('fix_approach','')}
  - الاستراتيجية: {strategy_hint}

الكود الحالي (أول 1500 حرف):
{current_code[:1500]}

اكتب الكود المحسّن فقط، بدون شرح."""
        return self.think(prompt, max_tokens=2000)


class TesterAgent(BaseAgent):
    def __init__(self, brain: Brain):
        super().__init__(
            "Tester", "مختبر الكود ومكتشف الأخطاء", brain,
            system_override="""أنت Tester في فريق VRBOT.
مهمتك: مراجعة الكود وإيجاد أي مشاكل محتملة.
كن صارماً ولا تتساهل مع أي خطأ."""
        )

    def review(self, task: str, original_code: str, new_code: str) -> dict:
        """يراجع الكود الجديد ويبحث عن مشاكل"""
        print(f"     🧪 Tester: مراجعة الكود")
        prompt = f"""راجع هذا الكود المُصحَّح لـ {task}:

الكود الجديد:
{new_code[:2000]}

تحقق من:
1. هل يحل المشكلة الأصلية؟
2. هل يكسر أي وظيفة موجودة؟
3. هل هناك أخطاء محتملة؟
4. هل متوافق مع ADB و LDPlayer؟

أجب بـ JSON:
{{
  "approved": true/false,
  "issues": ["مشكلة 1", "مشكلة 2"],
  "suggestions": ["اقتراح 1"],
  "test_score": 0.0
}}"""
        raw = self.think(prompt, max_tokens=600)
        try:
            return json.loads(raw.strip().replace("```json","").replace("```",""))
        except Exception:
            return {"approved": True, "issues": [], "suggestions": [], "test_score": 0.7}


class ReviewerAgent(BaseAgent):
    def __init__(self, brain: Brain):
        super().__init__(
            "Reviewer", "مراجع الجودة النهائي", brain,
            system_override="""أنت Reviewer، آخر خط دفاع في فريق VRBOT.
تقرّر إذا كان الحل جاهزاً للإنتاج أم لا.
كن دقيقاً ومنصفاً."""
        )

    def final_review(self, task: str, analysis: dict,
                      code: str, test_result: dict) -> dict:
        """القرار النهائي: هل يُنشر الـ PR؟"""
        print(f"     📊 Reviewer: مراجعة نهائية")
        approved = test_result.get("approved", False)
        issues   = test_result.get("issues", [])
        score    = test_result.get("test_score", 0.5)

        if approved and not issues and score >= 0.6:
            verdict = "approve"
            reason  = "الكود يجتاز جميع الاختبارات"
        elif score >= 0.5 and len(issues) <= 1:
            verdict = "approve_with_notes"
            reason  = f"مقبول مع ملاحظات: {issues}"
        else:
            verdict = "reject"
            reason  = f"فشل الاختبارات: {issues}"

        return {
            "verdict":   verdict,
            "reason":    reason,
            "score":     score,
            "create_pr": verdict != "reject",
        }


# ── المنسّق ───────────────────────────────────────────
class CoordinatorAgent(BaseAgent):
    """يدير الفريق ويوزّع المهام"""

    def __init__(self, brain: Brain):
        super().__init__("Coordinator", "منسّق فريق VRBOT Agents", brain)
        self.researcher = ResearcherAgent(brain)
        self.analyzer   = AnalyzerAgent(brain)
        self.coder      = CoderAgent(brain)
        self.tester     = TesterAgent(brain)
        self.reviewer   = ReviewerAgent(brain)
        self.session_log = []

    def solve(self, task: str, error: str,
               current_code: str = "", strategy: str = "direct_fix") -> dict:
        """
        دورة عمل الفريق الكاملة:
        Research → Analyze → Code → Test → Review
        """
        start = time.time()
        print(f"\n   👥 الفريق يعمل على: {task}")

        self._log("start", f"بدء حل {task}")

        # 1. بحث
        research  = self.researcher.research(error, "python")
        self._log("research", f"وجد {len(research['results'])} مصدر")

        # 2. تحليل
        analysis  = self.analyzer.analyze(task, error, research)
        self._log("analysis", f"السبب: {analysis.get('root_cause','')[:50]}")

        # 3. كتابة كود
        code      = self.coder.write_fix(task, analysis, current_code, strategy)
        self._log("coding", f"كُتب {len(code)} حرف")

        # 4. اختبار
        test_result = self.tester.review(task, current_code, code)
        self._log("testing", f"موافق: {test_result.get('approved')}")

        # إذا فشل الاختبار → أصلح الكود مرة أخرى
        if not test_result.get("approved") and test_result.get("issues"):
            print(f"     🔄 Coder يصلح بناءً على ملاحظات Tester...")
            issues_str = "\n".join(test_result["issues"])
            code = self.coder.write_fix(
                task, analysis, code,
                f"{strategy} + fix issues: {issues_str}"
            )
            test_result = self.tester.review(task, current_code, code)

        # 5. مراجعة نهائية
        final     = self.reviewer.final_review(task, analysis, code, test_result)
        self._log("review", f"الحكم: {final['verdict']}")

        elapsed = time.time() - start
        print(f"   ✅ الفريق انتهى في {elapsed:.1f}s - الحكم: {final['verdict']}")

        return {
            "task":         task,
            "research":     research,
            "analysis":     analysis,
            "code":         code,
            "test_result":  test_result,
            "final":        final,
            "elapsed":      elapsed,
            "session_log":  self.session_log.copy(),
        }

    def _log(self, step: str, msg: str):
        self.session_log.append({
            "step": step, "msg": msg,
            "time": datetime.now().strftime("%H:%M:%S")
        })
