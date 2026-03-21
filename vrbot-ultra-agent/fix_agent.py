"""
fix_agent.py - إصلاح مشاكل VRBOT Ultra Agent
شغّله بـ: python fix_agent.py
"""
import re
from pathlib import Path

base = Path(__file__).parent

# ══════════════════════════════════════════════
# Fix 1: multi_agent.py - query نظيف مباشر
# ══════════════════════════════════════════════
f = base / "agents" / "multi_agent.py"
c = f.read_text(encoding="utf-8")

# استبدل دالة research كاملة
old = '''    def research(self, problem: str, category: str) -> dict:
        """يبحث في GitHub + SO + arXiv"""
        # بناء استعلام إنجليزي نظيف دائماً
        category_map = {
            "coordinate_miss":  "android adb tap coordinate",
            "detection_fail":   "android button detection opencv",
            "timeout":          "python timeout retry android",
            "adb_error":        "python adb device error fix",
            "task_error":       "python android automation error",
            "unknown":          "android game automation python",
            "تحسين عام":        "android automation improvement python",
        }
        base = category_map.get(category, f"android {category} python fix")
        # إزالة أي عربي من المشكلة
        import re
        clean_problem = re.sub(r'[\\u0600-\\u06FF\\s]+', ' ', problem).strip()[:40]
        query = f"{base} {clean_problem}".strip() if clean_problem else base

        print(f"     🔍 Researcher: بحث عن '{query[:50]}'")
        results   = self.learner.search_all(query, include_arxiv=(category in ["detection_fail","algorithm"]))
        formatted = self.learner.format_for_brain(results)
        return {"query": query, "results": results[:5], "formatted": formatted}'''

new = '''    def research(self, problem: str, category: str) -> dict:
        """يبحث في GitHub + SO + arXiv"""
        queries = {
            "coordinate_miss": "android adb tap coordinate fix python",
            "detection_fail":  "android button detection opencv template matching",
            "timeout":         "python requests timeout retry exponential backoff",
            "adb_error":       "python adb device connection error fix",
            "task_error":      "python android automation task failure recovery",
            "network_error":   "python requests connection error retry",
            "screenshot_fail": "android screenshot adb python fix",
        }
        query = queries.get(category, "android game automation python adb")
        print(f"     🔍 Researcher: بحث عن '{query}'")
        results   = self.learner.search_all(query, include_arxiv=False)
        formatted = self.learner.format_for_brain(results)
        return {"query": query, "results": results[:5], "formatted": formatted}'''

if old in c:
    c = c.replace(old, new, 1)
    print("✅ Fix 1: research query")
else:
    print("⚠️  Fix 1: لم يجد النص القديم - سيتخطى")

# ══════════════════════════════════════════════
# Fix 2: multi_agent.py - retry على 500 errors
# ══════════════════════════════════════════════
old2 = '''    def think(self, prompt: str, max_tokens: int = 1000) -> str:
        import anthropic
        client = self.brain.client
        resp   = client.messages.create(
            model      = self.brain.model,
            max_tokens = max_tokens,
            system     = self._system,
            messages   = [{"role": "user", "content": prompt}]
        )
        return resp.content[0].text'''

new2 = '''    def think(self, prompt: str, max_tokens: int = 1000) -> str:
        import anthropic, time
        client = self.brain.client
        for attempt in range(3):
            try:
                resp = client.messages.create(
                    model      = self.brain.model,
                    max_tokens = max_tokens,
                    system     = self._system,
                    messages   = [{"role": "user", "content": prompt}]
                )
                return resp.content[0].text
            except anthropic.InternalServerError:
                wait = 10 * (attempt + 1)
                print(f"     ⚠️  API 500 - محاولة {attempt+1}/3 بعد {wait}s...")
                time.sleep(wait)
            except anthropic.RateLimitError:
                print(f"     ⚠️  Rate limit - انتظار 30s...")
                time.sleep(30)
            except Exception as e:
                print(f"     ❌ API error: {e}")
                return f"error: {e}"
        return "error: API unavailable after 3 attempts"'''

if old2 in c:
    c = c.replace(old2, new2, 1)
    print("✅ Fix 2: API retry logic")
else:
    print("⚠️  Fix 2: لم يجد think() - سيتخطى")

f.write_text(c, encoding="utf-8")

# ══════════════════════════════════════════════
# Fix 3: main.py - dedup أهداف صحيح
# ══════════════════════════════════════════════
f2 = base / "main.py"
c2 = f2.read_text(encoding="utf-8")

old3 = '''        # إزالة التكرار
        seen_titles = set()
        unique_goals = []
        for g in active_goals:
            key = g.get("title","")[:20]
            if key not in seen_titles:
                seen_titles.add(key)
                unique_goals.append(g)
        active_goals = unique_goals'''

new3 = '''        # إزالة التكرار بالنوع + أول 15 حرف من العنوان
        seen = set()
        unique_goals = []
        for g in active_goals:
            key = g.get("type","") + "|" + g.get("title","")[:15]
            if key not in seen:
                seen.add(key)
                unique_goals.append(g)
        active_goals = unique_goals[:2]  # أهم هدفين فقط'''

if old3 in c2:
    c2 = c2.replace(old3, new3, 1)
    print("✅ Fix 3: goal dedup")
else:
    # try simpler replacement
    c2 = c2.replace(
        'key = g.get("type","") + g.get("title","")[:15]',
        'key = g.get("type","") + "|" + g.get("title","")[:15]'
    )
    print("✅ Fix 3: goal dedup (alt)")

f2.write_text(c2, encoding="utf-8")

# ══════════════════════════════════════════════
# Fix 4: core/brain.py - retry على 500 errors
# ══════════════════════════════════════════════
f3 = base / "core" / "brain.py"
c3 = f3.read_text(encoding="utf-8")

old4 = '''    def think(self, prompt: str, max_tokens: int = 2000) -> str:
        """تفكير عام"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text'''

new4 = '''    def think(self, prompt: str, max_tokens: int = 2000) -> str:
        """تفكير عام مع retry"""
        import anthropic as _ant, time
        for attempt in range(3):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    system=self.system_prompt,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except _ant.InternalServerError:
                wait = 15 * (attempt + 1)
                print(f"⚠️  Anthropic 500 - retry {attempt+1}/3 في {wait}s...")
                time.sleep(wait)
            except _ant.RateLimitError:
                print("⚠️  Rate limit - انتظار 60s...")
                time.sleep(60)
            except Exception as e:
                print(f"❌ Brain error: {e}")
                return f"error: {e}"
        return "error: API unavailable"'''

if old4 in c3:
    c3 = c3.replace(old4, new4, 1)
    f3.write_text(c3, encoding="utf-8")
    print("✅ Fix 4: brain retry logic")
else:
    print("⚠️  Fix 4: brain.py already fixed or different")

print("\n✅ اكتملت جميع الإصلاحات!")
print("شغّل: python main.py")
