# ⚔️ VRBOT Live System — تقرير التنفيذ

**التاريخ:** 15 مارس 2026

## الملفات المُنشأة / المُعدّلة

| الملف | الحالة | الوصف |
|-------|--------|-------|
| `public/sw.js` | ✅ تحديث | Service Worker — دعم إشعارات المزارع + الشات |
| `app/api/farms/control/route.ts` | ✅ جديد | API للتحكم بالمزارع (tap/swipe/key/text) |
| `app/api/farms/start/route.ts` | ✅ جديد | API لتشغيل المزرعة |
| `app/api/farms/stop/route.ts` | ✅ جديد | API لإيقاف المزرعة |
| `app/dashboard/live/page.tsx` | ✅ جديد | صفحة البث المباشر للمزارع |
| `app/dashboard/notifications/page.tsx` | ✅ جديد | صفحة إعدادات الإشعارات + سجل التنبيهات |
| `app/dashboard/DashboardClient.tsx` | ✅ تحديث | إضافة روابط Live + الإشعارات |
| `.env.local.example` | ✅ جديد | قالب متغيرات البيئة المطلوبة |
| `supabase/migrations/20260315_notification_tables.sql` | ✅ جديد | Migration لجداول الإشعارات |

## Supabase Tables (يجب تشغيلها يدوياً)

| الجدول | الحالة | الوصف |
|--------|--------|-------|
| `notification_prefs` | ⏳ بانتظار التشغيل | تفضيلات الإشعارات لكل مستخدم |
| `farm_alerts` | ⏳ بانتظار التشغيل | سجل تنبيهات المزارع |

**تشغيل:** انسخ محتوى `supabase/migrations/20260315_notification_tables.sql` في Supabase Dashboard → SQL Editor

## خادم Hetzner (88.99.64.19)

| الخدمة | الحالة | الوصف |
|--------|--------|-------|
| WebSocket Live Stream (port 8889) | ✅ شغّال | `live_stream_server.py` — 4 FPS JPEG |
| Cloud Dashboard (port 3000) | ✅ شغّال | `server.js` — Express + REST APIs |
| Nginx SSL Proxy | ✅ محدّث | `wss://cloud.vrbot.me/ws/` → port 8889 |
| Admin Dashboard v2 | ✅ مُنشر | `https://cloud.vrbot.me/v2?token=vrbot_admin_2026` |

## متغيرات البيئة المطلوبة (Vercel)

```
HETZNER_IP=88.99.64.19
NEXT_PUBLIC_HETZNER_IP=88.99.64.19
VRBOT_API_KEY=vrbot_admin_2026
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<يجب إنشاؤه>
```

## الروابط

- **Admin Dashboard (WebSocket):** `https://cloud.vrbot.me/v2?token=vrbot_admin_2026`
- **Admin Dashboard (HTTP):** `https://cloud.vrbot.me/dashboard?token=vrbot_admin_2026`
- **Client Live Page:** `https://vrbot.me/dashboard/live` (بعد deploy على Vercel)
- **Client Notifications:** `https://vrbot.me/dashboard/notifications` (بعد deploy على Vercel)

## خطوات ما بعد التسليم

1. **أضف متغيرات البيئة** في Vercel Dashboard → Settings → Environment Variables
2. **شغّل SQL Migration** في Supabase Dashboard → SQL Editor
3. **Deploy** عبر `git push` أو Vercel CLI
4. **اختبر** `/dashboard/live` — يجب أن تظهر شاشات المزارع
5. **اختبر** `/dashboard/notifications` — يجب أن تظهر إعدادات التنبيهات
