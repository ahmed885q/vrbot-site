"""
Open Source Learner - التعلم من المصادر المفتوحة
==================================================
يبحث في: الويب، GitHub، arXiv، Stack Overflow
"""

import time
import requests
from bs4 import BeautifulSoup
from config import MAX_SEARCH_RESULTS


class OpenSourceLearner:

    HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; VRBOTAgent/1.0)"}

    # ── DuckDuckGo بدون API key ─────────────────────────────
    def search_web(self, query: str, max_results: int = None) -> list:
        """بحث DuckDuckGo عبر API المجانية"""
        n = max_results or MAX_SEARCH_RESULTS
        try:
            url    = "https://api.duckduckgo.com/"
            params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
            resp   = requests.get(url, params=params, headers=self.HEADERS, timeout=10)
            data   = resp.json()

            results = []
            # النتائج الفورية
            if data.get("Abstract"):
                results.append({
                    "title":   data.get("Heading", query),
                    "snippet": data["Abstract"][:500],
                    "url":     data.get("AbstractURL", ""),
                    "source":  "duckduckgo_instant"
                })

            # النتائج ذات الصلة
            for item in data.get("RelatedTopics", [])[:n]:
                if isinstance(item, dict) and item.get("Text"):
                    results.append({
                        "title":   item.get("Text", "")[:100],
                        "snippet": item.get("Text", "")[:400],
                        "url":     item.get("FirstURL", ""),
                        "source":  "duckduckgo"
                    })

            return results[:n]
        except Exception as e:
            print(f"⚠️  Web search error: {e}")
            return []

    # ── GitHub Search ───────────────────────────────────────
    def search_github(self, query: str, language: str = "python",
                      max_results: int = 3) -> list:
        """البحث في GitHub (بدون token = 60 req/hr)"""
        try:
            url    = "https://api.github.com/search/repositories"
            params = {
                "q":        f"{query} language:{language}",
                "sort":     "stars",
                "order":    "desc",
                "per_page": max_results
            }
            resp = requests.get(url, params=params,
                                headers=self.HEADERS, timeout=10)
            if resp.status_code != 200:
                return []

            results = []
            for repo in resp.json().get("items", []):
                results.append({
                    "title":       repo["full_name"],
                    "snippet":     repo.get("description", "")[:300],
                    "url":         repo["html_url"],
                    "stars":       repo["stargazers_count"],
                    "source":      "github",
                    "readme_url":  f"https://raw.githubusercontent.com/{repo['full_name']}/main/README.md"
                })

            # جلب README للأول فقط لتوفير الوقت
            if results:
                readme = self._fetch_readme(results[0]["readme_url"])
                if readme:
                    results[0]["readme"] = readme[:1500]

            return results
        except Exception as e:
            print(f"⚠️  GitHub search error: {e}")
            return []

    def _fetch_readme(self, url: str) -> str:
        try:
            resp = requests.get(url, headers=self.HEADERS, timeout=8)
            return resp.text[:2000] if resp.status_code == 200 else ""
        except Exception:
            return ""

    # ── Stack Overflow ──────────────────────────────────────
    def search_stackoverflow(self, query: str, max_results: int = 3) -> list:
        """البحث في Stack Overflow (مجاني)"""
        try:
            url    = "https://api.stackexchange.com/2.3/search/advanced"
            params = {
                "order":    "desc",
                "sort":     "votes",
                "q":        query,
                "site":     "stackoverflow",
                "pagesize": max_results,
                "filter":   "withbody"
            }
            resp = requests.get(url, params=params, timeout=10)
            data = resp.json()

            results = []
            for item in data.get("items", []):
                body_text = BeautifulSoup(
                    item.get("body", ""), "html.parser"
                ).get_text()[:600]
                results.append({
                    "title":       item["title"],
                    "snippet":     body_text,
                    "url":         item["link"],
                    "score":       item.get("score", 0),
                    "answered":    item.get("is_answered", False),
                    "source":      "stackoverflow"
                })
            return results
        except Exception as e:
            print(f"⚠️  SO search error: {e}")
            return []

    # ── arXiv للأبحاث ───────────────────────────────────────
    def search_arxiv(self, query: str, max_results: int = 2) -> list:
        """البحث في arXiv (مجاني تماماً)"""
        try:
            url    = "https://export.arxiv.org/api/query"
            params = {
                "search_query": f"all:{query}",
                "start":        0,
                "max_results":  max_results,
                "sortBy":       "relevance"
            }
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code != 200:
                return []

            # parse XML بسيط
            soup    = BeautifulSoup(resp.text, "xml")
            entries = soup.find_all("entry")
            results = []
            for entry in entries:
                summary = entry.find("summary")
                title   = entry.find("title")
                link    = entry.find("id")
                results.append({
                    "title":   title.text.strip()    if title   else "",
                    "snippet": summary.text.strip()[:500] if summary else "",
                    "url":     link.text.strip()     if link    else "",
                    "source":  "arxiv"
                })
            return results
        except Exception as e:
            print(f"⚠️  arXiv search error: {e}")
            return []

    # ── PyPI للمكتبات ───────────────────────────────────────
    def search_pypi(self, package_name: str) -> dict:
        """البحث عن مكتبة Python في PyPI"""
        try:
            url  = f"https://pypi.org/pypi/{package_name}/json"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                info = data.get("info", {})
                return {
                    "name":        info.get("name", ""),
                    "version":     info.get("version", ""),
                    "description": info.get("summary", "")[:300],
                    "url":         info.get("project_url", ""),
                    "source":      "pypi"
                }
        except Exception:
            pass
        return {}

    # ── بحث شامل ───────────────────────────────────────────
    def search_all(self, query: str, include_arxiv: bool = False) -> list:
        """بحث موازي في كل المصادر"""
        print(f"   🔍 بحث عن: {query}")
        results = []

        # ويب
        web = self.search_web(query)
        results.extend(web)
        time.sleep(0.5)

        # GitHub
        gh = self.search_github(query)
        results.extend(gh)
        time.sleep(0.5)

        # Stack Overflow
        so = self.search_stackoverflow(query)
        results.extend(so)
        time.sleep(0.5)

        # arXiv للاستفسارات التقنية
        if include_arxiv:
            ax = self.search_arxiv(query)
            results.extend(ax)

        print(f"   ✅ وجدت {len(results)} نتيجة")
        return results

    def format_for_brain(self, results: list) -> str:
        """تنسيق النتائج لتغذية الـ Brain"""
        if not results:
            return "لم أجد نتائج."
        lines = []
        for i, r in enumerate(results[:8], 1):
            lines.append(
                f"{i}. [{r.get('source','web')}] {r.get('title','')}\n"
                f"   {r.get('snippet','')[:300]}\n"
                f"   🔗 {r.get('url','')}"
            )
        return "\n\n".join(lines)
