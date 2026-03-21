"""
Notifier - إشعارات Telegram
==============================
يُبلغك بكل تحديث مهم
"""

import requests
from datetime import datetime
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, NOTIFY_ON_PR, NOTIFY_ON_ERROR


class TelegramNotifier:

    BASE_URL = "https://api.telegram.org"

    def __init__(self):
        self.token   = TELEGRAM_BOT_TOKEN
        self.chat_id = TELEGRAM_CHAT_ID
        self.enabled = bool(self.token and self.chat_id)
        if not self.enabled:
            print("⚠️  Telegram غير مفعّل (أضف TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID في .env)")

    def send(self, message: str, parse_mode: str = "HTML") -> bool:
        if not self.enabled:
            print(f"[Telegram Disabled] {message[:100]}")
            return False
        try:
            url  = f"{self.BASE_URL}/bot{self.token}/sendMessage"
            data = {
                "chat_id":    self.chat_id,
                "text":       message,
                "parse_mode": parse_mode
            }
            resp = requests.post(url, json=data, timeout=10)
            return resp.status_code == 200
        except Exception as e:
            print(f"❌ Telegram error: {e}")
            return False

    # ── قوالب الإشعارات ─────────────────────────────────────
    def notify_cycle_start(self, cycle_num: int):
        msg = (
            f"🤖 <b>VRBOT Agent - دورة #{cycle_num}</b>\n"
            f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
            f"🔍 جاري تحليل الـ logs..."
        )
        self.send(msg)

    def notify_analysis_done(self, analysis: dict):
        failing  = analysis.get("failing_tasks", [])
        critical = analysis.get("critical_errors", [])
        errors   = analysis.get("error_summary", [])

        status = "✅ كل شيء يعمل بشكل جيد!"
        if failing or critical:
            status = f"⚠️ وجدت {len(failing)} مهمة فاشلة و{len(critical)} خطأ حرج"

        tasks_text = ""
        for t in failing[:5]:
            rate = t.get("success_rate", 0)
            tasks_text += f"\n  • <code>{t['task']}</code>: {rate:.0%} نجاح"

        msg = (
            f"📊 <b>نتائج التحليل</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"{status}\n"
            f"📋 إجمالي الأخطاء: {len(errors)}\n"
            f"{tasks_text}"
        )
        self.send(msg)

    def notify_pr_created(self, pr: dict, task_name: str, analysis: dict):
        if not NOTIFY_ON_PR:
            return
        msg = (
            f"🚀 <b>PR جديد أُنشئ!</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"📌 <b>المهمة:</b> <code>{task_name}</code>\n"
            f"🔢 <b>رقم PR:</b> #{pr.get('number', '?')}\n"
            f"📝 <b>العنوان:</b> {pr.get('title', '')[:60]}\n"
            f"🔧 <b>الإصلاح:</b> {analysis.get('fix_description', '')[:100]}\n"
            f"💪 <b>الثقة:</b> {analysis.get('confidence', 0):.0%}\n\n"
            f"🔗 <a href='{pr.get('url', '#')}'>افتح PR</a>\n\n"
            f"⚡ يرجى مراجعة وقبول التغييرات"
        )
        self.send(msg)

    def notify_error(self, error_msg: str, context: str = ""):
        if not NOTIFY_ON_ERROR:
            return
        msg = (
            f"❌ <b>خطأ في VRBOT Agent</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"<code>{error_msg[:300]}</code>\n"
            f"{f'<b>السياق:</b> {context[:100]}' if context else ''}"
        )
        self.send(msg)

    def notify_learning_done(self, topics: list, knowledge_count: int):
        topics_text = "\n".join([f"  • {t[:50]}" for t in topics[:5]])
        msg = (
            f"🧠 <b>جلسة تعلم اكتملت</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"📚 المواضيع المُدروسة:\n{topics_text}\n"
            f"💾 معرفة جديدة: {knowledge_count} مصدر"
        )
        self.send(msg)

    def notify_improvement_applied(self, task_name: str,
                                    old_rate: float, improvement: str):
        msg = (
            f"📈 <b>تحسين تلقائي طُبّق</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"🎯 <b>المهمة:</b> <code>{task_name}</code>\n"
            f"📊 <b>معدل النجاح السابق:</b> {old_rate:.0%}\n"
            f"✨ <b>التحسين:</b> {improvement[:150]}"
        )
        self.send(msg)

    def notify_daily_report(self, stats: dict):
        """تقرير يومي شامل"""
        mem    = stats.get("memory", {})
        farms  = stats.get("farm_count", 0)
        prs    = stats.get("prs_today", 0)
        cycles = stats.get("cycles_today", 0)

        msg = (
            f"📅 <b>التقرير اليومي - VRBOT Agent</b>\n"
            f"━━━━━━━━━━━━━━━━\n"
            f"🔄 الدورات المنجزة: {cycles}\n"
            f"🚀 PRs أُنشئت: {prs}\n"
            f"🖥️  المزارع النشطة: {farms}\n"
            f"🏃 إجمالي التشغيل اليوم: {mem.get('today_runs', 0)}\n"
            f"✅ النجاحات: {mem.get('today_success', 0)}\n"
            f"🧠 التجارب المحفوظة: {mem.get('total_experiences', 0)}\n"
            f"📝 إجمالي PRs: {mem.get('total_prs', 0)}"
        )
        self.send(msg)

    def test_connection(self) -> bool:
        """اختبار الاتصال"""
        return self.send("✅ VRBOT Agent متصل وجاهز!")
