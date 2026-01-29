# Viking Rais Agent (Monorepo)

هذا المستودع يحتوي:
- `agent-windows/` : Agent المحلي (Node) + MediaMTX + FFmpeg
- `app-desktop/` : تطبيق Desktop (Electron) يعرض Dashboard داخل البرنامج ويشغّل الـ Agent بالخلفية

## تشغيل محلي (Development)

### 1) Electron
```bash
cd app-desktop
npm i
npm run dev
