"""
Brain - واجهة Claude API
==========================
عقل الـ Agent الرئيسي
"""

import anthropic
import json
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL


class Brain:
    """
    Claude API wrapper مع دعم:
    - التفكير العادي
    - توليد كود Python
    - تحليل logs
    - اقتراح إصلاحات
    """

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        self.model  = CLAUDE_MODEL

        self.system_prompt = """أنت خبير تطوير متخصص في:
1. Python automation وـ ADB لـ Android
2. Computer Vision (OpenCV, YOLO, Template Matching)
3. تطوير بوتات الألعاب المحمولة
4. تحليل أخطاء الكود وإصلاحها

مشروعك الحالي هو VRBOT:
- بوت أتمتة لعبة Viking Rise
- يستخدم LDPlayer + ADB
- ملفات رئيسية: vrbot_core.py, vrbot_config.py
- مهام: task_gather, task_hunt, task_niflung, task_kill_monster
- النظام: Python + FastAPI + Supabase + Next.js

عند كتابة كود:
- استخدم Python 3.10+
- اتبع نمط الكود الموجود في VRBOT
- أضف تعليقات بالعربية والإنجليزية
- تعامل مع الأخطاء دائماً
- لا تكسر الـ API الموجودة

أجب دائماً بشكل دقيق وعملي."""

    def think(self, prompt: str, max_tokens: int = 2000) -> str:
        """تفكير عام"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    def write_code(self, task_description: str, context_code: str = "") -> str:
        """كتابة كود Python"""
        prompt = f"""اكتب كود Python لـ VRBOT لتنفيذ المهمة التالية:

المهمة: {task_description}

{'الكود الحالي للمرجع:' if context_code else ''}
{context_code}

المتطلبات:
- اكتب فقط الكود القابل للتنفيذ
- لا تضع ```python``` blocks
- الكود يجب أن يكون متوافقاً مع VRBOT
- أضف error handling كاملاً
"""
        return self.think(prompt, max_tokens=3000)

    def analyze_failure(self, task_name: str, error_log: str, 
                         context: str = "") -> dict:
        """تحليل سبب فشل مهمة"""
        prompt = f"""حلّل هذا الخطأ في VRBOT:

المهمة: {task_name}
الخطأ:
{error_log}

{'سياق إضافي:' + context if context else ''}

أجب بـ JSON بالتنسيق التالي فقط (بدون أي نص إضافي):
{{
  "root_cause": "السبب الجذري للخطأ",
  "category": "coordinate|detection|timeout|network|logic|unknown",
  "severity": "low|medium|high|critical",
  "fix_description": "وصف الإصلاح المقترح",
  "code_fix": "الكود المقترح للإصلاح (إذا وجد)",
  "confidence": 0.0
}}"""
        raw = self.think(prompt, max_tokens=1500)
        try:
            # تنظيف الرد قبل parse
            cleaned = raw.strip()
            if "```" in cleaned:
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            return json.loads(cleaned)
        except Exception:
            return {
                "root_cause": raw[:200],
                "category": "unknown",
                "severity": "medium",
                "fix_description": raw,
                "code_fix": "",
                "confidence": 0.3
            }

    def suggest_improvement(self, task_name: str, stats: dict,
                             search_results: list) -> str:
        """اقتراح تحسين بناءً على إحصائيات وبحث"""
        sources_text = "\n".join([
            f"- {r.get('title','')}: {r.get('snippet','')[:200]}"
            for r in search_results[:5]
        ])

        prompt = f"""بناءً على أداء {task_name} في VRBOT:

إحصائيات:
- معدل النجاح: {stats.get('success_rate', 0):.1%}
- متوسط وقت التنفيذ: {stats.get('avg_time', 0):.1f}s
- أكثر الأخطاء شيوعاً: {stats.get('top_error', 'غير محدد')}

ما وجدته في المصادر المفتوحة:
{sources_text}

اقترح تحسيناً محدداً وعملياً للكود. اكتب الاقتراح ثم الكود المحسّن."""
        return self.think(prompt, max_tokens=2500)

    def generate_pr_description(self, changes: list, analysis: dict) -> dict:
        """توليد وصف PR احترافي"""
        prompt = f"""اكتب وصف GitHub Pull Request للتغييرات التالية في VRBOT:

التغييرات: {json.dumps(changes, ensure_ascii=False)}
التحليل: {json.dumps(analysis, ensure_ascii=False)}

أجب بـ JSON فقط:
{{
  "title": "عنوان PR موجز",
  "body": "وصف كامل بالـ markdown",
  "labels": ["bug", "enhancement", "auto-fix"]
}}"""
        raw = self.think(prompt, max_tokens=1000)
        try:
            cleaned = raw.strip().replace("```json", "").replace("```", "")
            return json.loads(cleaned)
        except Exception:
            return {
                "title": f"Auto-fix: {analysis.get('category','improvement')}",
                "body": f"## التغييرات\n{chr(10).join(changes)}\n\n## التحليل\n{analysis.get('fix_description','')}",
                "labels": ["auto-fix"]
            }
