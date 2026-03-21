"""
VRBOT Developer Agent - Configuration
=====================================
عدّل هذا الملف بمعلوماتك قبل التشغيل
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ═══════════════════════════════════════
#  🤖 LLM Settings
# ═══════════════════════════════════════
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL       = "claude-opus-4-5"

# ═══════════════════════════════════════
#  🐙 GitHub Settings
# ═══════════════════════════════════════
GITHUB_TOKEN       = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO_AGENT  = "ahmed885q/vrbot-agent"   # repo الـ agent
GITHUB_REPO_SITE   = "ahmed885q/vrbot-site"    # repo الـ site
GITHUB_BASE_BRANCH = "main"

# ═══════════════════════════════════════
#  📬 Telegram Settings
# ═══════════════════════════════════════
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "")

# ═══════════════════════════════════════
#  🖥️ Hetzner / VRBOT Server
# ═══════════════════════════════════════
HETZNER_IP         = os.getenv("HETZNER_IP", "cloud.vrbot.me")
HETZNER_API_KEY    = os.getenv("VRBOT_ADMIN_KEY", "vrbot_admin_2026")
ORCHESTRATOR_PORT  = 8888
SCREENSHOT_PORT    = 8890

# ═══════════════════════════════════════
#  📁 Paths
# ═══════════════════════════════════════
LOGS_DIR           = "data/logs"
KNOWLEDGE_DIR      = "data/knowledge"
CHECKPOINTS_DIR    = "data/checkpoints"
MEMORY_DB          = "data/memory.db"

# ═══════════════════════════════════════
#  ⚙️ Agent Behavior
# ═══════════════════════════════════════
IMPROVEMENT_CYCLE_HOURS = 6          # كل كم ساعة يحلل الـ Agent
MIN_FAILURE_RATE        = 0.3        # إذا فشل 30%+ يبحث عن حل
MAX_SEARCH_RESULTS      = 5
AUTO_CREATE_PR          = True       # إنشاء PR تلقائياً
NOTIFY_ON_PR            = True       # إبلاغك على Telegram
NOTIFY_ON_ERROR         = True

# ═══════════════════════════════════════
#  🎯 VRBOT Tasks to Monitor
# ═══════════════════════════════════════
VRBOT_TASKS = [
    "task_gather",
    "task_hunt",
    "task_niflung",
    "task_kill_monster",
    "task_hall_of_valor",
    "task_alliance",
    "task_daily_quest",
]

# Topics to learn from open sources
LEARNING_TOPICS = [
    "android adb automation python",
    "computer vision button detection opencv",
    "mobile game automation techniques",
    "python screenshot analysis",
    "LDPlayer ADB commands optimization",
    "YOLO object detection mobile games",
]
