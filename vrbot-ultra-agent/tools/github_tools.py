"""
GitHub Tools - أدوات GitHub
==============================
إنشاء branches وـ PRs تلقائياً
"""

import re
import base64
import requests
from datetime import datetime
from config import (
    GITHUB_TOKEN, GITHUB_REPO_AGENT, GITHUB_REPO_SITE, GITHUB_BASE_BRANCH
)


class GitHubTools:

    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept":        "application/vnd.github.v3+json",
            "Content-Type":  "application/json"
        }

    def _req(self, method: str, path: str, **kwargs) -> dict:
        url  = f"{self.BASE_URL}{path}"
        resp = requests.request(method, url, headers=self.headers,
                                timeout=20, **kwargs)
        if resp.status_code >= 400:
            print(f"❌ GitHub API error {resp.status_code}: {resp.text[:300]}")
            return {}
        return resp.json() if resp.text else {}

    # ── معلومات أساسية ──────────────────────────────────────
    def get_latest_sha(self, repo: str, branch: str = None) -> str:
        b    = branch or GITHUB_BASE_BRANCH
        data = self._req("GET", f"/repos/{repo}/git/ref/heads/{b}")
        return data.get("object", {}).get("sha", "")

    def get_file(self, repo: str, path: str, branch: str = None) -> dict:
        """جلب محتوى ملف"""
        b    = branch or GITHUB_BASE_BRANCH
        data = self._req("GET", f"/repos/{repo}/contents/{path}",
                         params={"ref": b})
        if data and data.get("content"):
            content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return {"content": content, "sha": data.get("sha", ""), "path": path}
        return {}

    # ── إنشاء Branch ────────────────────────────────────────
    def create_branch(self, repo: str, branch_name: str,
                      from_branch: str = None) -> bool:
        sha  = self.get_latest_sha(repo, from_branch)
        if not sha:
            print(f"❌ لم أجد SHA لـ {repo}")
            return False

        data = self._req("POST", f"/repos/{repo}/git/refs",
                         json={"ref": f"refs/heads/{branch_name}", "sha": sha})
        if data:
            print(f"✅ تم إنشاء branch: {branch_name}")
            return True
        print(f"⚠️  Branch ربما موجود مسبقاً: {branch_name}")
        return False

    # ── تحديث / إنشاء ملف ──────────────────────────────────
    def upsert_file(self, repo: str, file_path: str, content: str,
                    commit_msg: str, branch: str) -> bool:
        """إنشاء أو تحديث ملف في branch معين"""
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        payload = {
            "message": commit_msg,
            "content": encoded,
            "branch":  branch
        }

        # إذا الملف موجود، نحتاج SHA للتحديث
        existing = self.get_file(repo, file_path, branch)
        if existing.get("sha"):
            payload["sha"] = existing["sha"]

        data = self._req("PUT", f"/repos/{repo}/contents/{file_path}",
                         json=payload)
        success = bool(data.get("content"))
        if success:
            print(f"✅ تم رفع: {file_path}")
        return success

    # ── إنشاء Pull Request ──────────────────────────────────
    def create_pr(self, repo: str, title: str, body: str,
                  head_branch: str, base_branch: str = None,
                  labels: list = None) -> dict:
        base = base_branch or GITHUB_BASE_BRANCH
        data = self._req("POST", f"/repos/{repo}/pulls",
                         json={
                             "title": title,
                             "body":  body,
                             "head":  head_branch,
                             "base":  base
                         })

        if data.get("number"):
            pr_number = data["number"]
            pr_url    = data.get("html_url", "")
            print(f"✅ PR #{pr_number} أُنشئ: {pr_url}")

            # إضافة labels
            if labels:
                self._add_labels(repo, pr_number, labels)

            return {"number": pr_number, "url": pr_url, "title": title}

        print("❌ فشل إنشاء PR")
        return {}

    def _add_labels(self, repo: str, issue_number: int, labels: list):
        # إنشاء labels إذا لم تكن موجودة
        for label in labels:
            self._req("POST", f"/repos/{repo}/labels",
                      json={"name": label, "color": "0075ca"})
        # إضافة labels للـ PR
        self._req("POST", f"/repos/{repo}/issues/{issue_number}/labels",
                  json={"labels": labels})

    # ── الدالة الرئيسية ─────────────────────────────────────
    def create_fix_pr(self, task_name: str, file_path: str,
                      new_content: str, analysis: dict,
                      pr_meta: dict = None, repo: str = None) -> dict:
        """
        الدالة الكاملة: branch → commit → PR
        
        Parameters:
            task_name:   اسم المهمة (مثل task_gather)
            file_path:   مسار الملف في الـ repo
            new_content: محتوى الملف المحسّن
            analysis:    نتيجة تحليل الخطأ
            pr_meta:     عنوان ووصف PR (من Brain)
            repo:        اسم الـ repo (default: vrbot-agent)
        """
        target_repo = repo or GITHUB_REPO_AGENT
        timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
        branch_name = f"agent/fix-{task_name.replace('_','-')}-{timestamp}"
        category    = analysis.get("category", "fix")

        # 1. إنشاء branch
        if not self.create_branch(target_repo, branch_name):
            # إذا فشل branch، حاول مرة أخرى باسم مختلف
            branch_name = f"agent/auto-{category}-{timestamp}"
            if not self.create_branch(target_repo, branch_name):
                return {"error": "فشل إنشاء branch"}

        # 2. رفع الملف المحسّن
        commit_msg = (
            f"fix({task_name}): {analysis.get('fix_description','auto improvement')[:80]}\n\n"
            f"Category: {category}\n"
            f"Confidence: {analysis.get('confidence', 0):.0%}\n"
            f"Auto-generated by VRBOT Developer Agent"
        )
        if not self.upsert_file(target_repo, file_path, new_content,
                                commit_msg, branch_name):
            return {"error": "فشل رفع الملف"}

        # 3. إنشاء PR
        meta  = pr_meta or {}
        title = meta.get("title", f"🤖 Auto-fix: {task_name} ({category})")
        body  = meta.get("body", self._default_pr_body(task_name, analysis))
        labels = meta.get("labels", ["auto-fix", category])

        return self.create_pr(
            repo=target_repo,
            title=title,
            body=body,
            head_branch=branch_name,
            labels=labels
        )

    def _default_pr_body(self, task_name: str, analysis: dict) -> str:
        return f"""## 🤖 Auto-generated Fix

**المهمة:** `{task_name}`
**الفئة:** `{analysis.get('category', 'unknown')}`
**الثقة:** {analysis.get('confidence', 0):.0%}

### 🔍 المشكلة
{analysis.get('root_cause', 'انظر التغييرات')}

### ✅ الإصلاح
{analysis.get('fix_description', 'انظر الكود')}

---
> تم إنشاء هذا الـ PR تلقائياً بواسطة **VRBOT Developer Agent**
> يرجى مراجعة التغييرات قبل الدمج.
"""

    # ── قراءة الـ repo ──────────────────────────────────────
    def list_task_files(self, repo: str = None) -> list:
        """قائمة ملفات المهام في vrbot-agent"""
        target = repo or GITHUB_REPO_AGENT
        data   = self._req("GET", f"/repos/{target}/contents/")
        files  = []
        for item in data if isinstance(data, list) else []:
            if item.get("name", "").startswith("task_") and \
               item.get("name", "").endswith(".py"):
                files.append(item["name"])
        return files

    def get_open_prs(self, repo: str = None) -> list:
        """قائمة PRs المفتوحة"""
        target = repo or GITHUB_REPO_AGENT
        data   = self._req("GET", f"/repos/{target}/pulls",
                           params={"state": "open"})
        if isinstance(data, list):
            return [{"number": p["number"], "title": p["title"],
                     "branch": p["head"]["ref"]}
                    for p in data]
        return []
