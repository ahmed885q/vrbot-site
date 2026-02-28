'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Language = 'ar' | 'en' | 'ru' | 'zh';

export default function DownloadPage() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('vrbot-lang') as Language;
    if (saved) setLang(saved);
  }, []);

  const isRtl = lang === 'ar';

  const t = {
    ar: {
      title: 'تحميل VRBOT Agent',
      subtitle: 'ابدأ أتمتة Viking Rise في 3 خطوات بسيطة',
      requirements: 'المتطلبات',
      req1: 'Windows 10 أو أحدث',
      req2: 'LDPlayer 9 (محاكي أندرويد)',
      req3: 'Python 3.10 أو أحدث',
      req4: 'لعبة Viking Rise مثبتة على المحاكي',
      step1_title: 'الخطوة 1: تثبيت المتطلبات',
      step1_desc: 'حمّل وثبّت LDPlayer 9 و Python 3.10+ على جهازك.',
      step1_ldplayer: 'تحميل LDPlayer 9',
      step1_python: 'تحميل Python 3.10',
      step2_title: 'الخطوة 2: تحميل VRBOT Agent',
      step2_desc: 'حمّل ملف البوت وفك الضغط في أي مجلد على جهازك.',
      step2_btn: 'تحميل VRBOT Agent v5.3',
      step2_size: 'حجم الملف: ~19 MB (Installer)',
      security_title: '⚠️ ملاحظة أمنية — Windows SmartScreen',
      security_desc: 'قد يمنع Windows تشغيل الملفات المحملة. لحل المشكلة:',
      security_s1: 'كلك يمين على ملف ZIP قبل فك الضغط',
      security_s2: 'اختر Properties (خصائص)',
      security_s3: 'فعّل ✅ Unblock (إلغاء الحظر) في الأسفل',
      security_s4: 'اضغط Apply ثم OK',
      security_s5: 'الآن فك الضغط وشغّل عادي',
      step3_title: 'الخطوة 3: التشغيل',
      step3_desc: 'شغّل setup.bat مرة واحدة لتثبيت المكتبات، ثم start.bat لبدء البوت.',
      step3_s1: 'شغّل setup.bat (مرة واحدة فقط)',
      step3_s2: 'شغّل start.bat',
      step3_s3: 'أدخل User ID الخاص بك',
      step3_s4: 'اضغط Start Agent',
      user_id_note: 'تجد الـ User ID في لوحة التحكم',
      dashboard_link: 'الذهاب للوحة التحكم',
      need_help: 'تحتاج مساعدة؟',
      help_desc: 'تواصل معنا عبر Discord أو Telegram للدعم الفني.',
      back: 'الرئيسية',
    },
    en: {
      title: 'Download VRBOT Agent',
      subtitle: 'Start automating Viking Rise in 3 simple steps',
      requirements: 'Requirements',
      req1: 'Windows 10 or later',
      req2: 'LDPlayer 9 (Android Emulator)',
      req3: 'Python 3.10 or later',
      req4: 'Viking Rise installed on the emulator',
      step1_title: 'Step 1: Install Prerequisites',
      step1_desc: 'Download and install LDPlayer 9 and Python 3.10+ on your PC.',
      step1_ldplayer: 'Download LDPlayer 9',
      step1_python: 'Download Python 3.10',
      step2_title: 'Step 2: Download VRBOT Agent',
      step2_desc: 'Download the bot package and extract it to any folder.',
      step2_btn: 'Download VRBOT Agent v5.3',
      step2_size: 'File size: ~19 MB (Installer)',
      security_title: '⚠️ Security Note — Windows SmartScreen',
      security_desc: 'Windows may block downloaded files from running. To fix this:',
      security_s1: 'Right-click the ZIP file before extracting',
      security_s2: 'Select Properties',
      security_s3: 'Check ✅ Unblock at the bottom',
      security_s4: 'Click Apply then OK',
      security_s5: 'Now extract and run normally',
      step3_title: 'Step 3: Launch',
      step3_desc: 'Run setup.bat once to install libraries, then start.bat to launch.',
      step3_s1: 'Run setup.bat (one time only)',
      step3_s2: 'Run start.bat',
      step3_s3: 'Enter your User ID',
      step3_s4: 'Click Start Agent',
      user_id_note: 'Find your User ID in the dashboard',
      dashboard_link: 'Go to Dashboard',
      need_help: 'Need Help?',
      help_desc: 'Contact us on Discord or Telegram for technical support.',
      back: 'Home',
    },
    ru: {
      title: 'Скачать VRBOT Agent',
      subtitle: 'Начните автоматизацию Viking Rise за 3 простых шага',
      requirements: 'Требования',
      req1: 'Windows 10 или новее',
      req2: 'LDPlayer 9 (Android эмулятор)',
      req3: 'Python 3.10 или новее',
      req4: 'Viking Rise установлена на эмуляторе',
      step1_title: 'Шаг 1: Установите требования',
      step1_desc: 'Скачайте и установите LDPlayer 9 и Python 3.10+ на ваш ПК.',
      step1_ldplayer: 'Скачать LDPlayer 9',
      step1_python: 'Скачать Python 3.10',
      step2_title: 'Шаг 2: Скачайте VRBOT Agent',
      step2_desc: 'Скачайте архив бота и распакуйте в любую папку.',
      step2_btn: 'Скачать VRBOT Agent v5.3',
      step2_size: 'Размер файла: ~18 МБ',
      security_title: '⚠️ Безопасность — Windows SmartScreen',
      security_desc: 'Windows может заблокировать скачанные файлы. Чтобы исправить:',
      security_s1: 'Нажмите правой кнопкой на ZIP-файл до распаковки',
      security_s2: 'Выберите Свойства (Properties)',
      security_s3: 'Отметьте ✅ Разблокировать (Unblock) внизу',
      security_s4: 'Нажмите Применить и ОК',
      security_s5: 'Теперь распакуйте и запустите',
      step3_title: 'Шаг 3: Запуск',
      step3_desc: 'Запустите setup.bat один раз, затем start.bat для старта.',
      step3_s1: 'Запустите setup.bat (один раз)',
      step3_s2: 'Запустите start.bat',
      step3_s3: 'Введите ваш User ID',
      step3_s4: 'Нажмите Start Agent',
      user_id_note: 'Найдите User ID в панели управления',
      dashboard_link: 'Перейти в панель',
      need_help: 'Нужна помощь?',
      help_desc: 'Свяжитесь с нами в Discord или Telegram для поддержки.',
      back: 'Главная',
    },
    zh: {
      title: '下载 VRBOT Agent',
      subtitle: '3个简单步骤开始自动化Viking Rise',
      requirements: '系统要求',
      req1: 'Windows 10 或更高版本',
      req2: 'LDPlayer 9（安卓模拟器）',
      req3: 'Python 3.10 或更高版本',
      req4: '模拟器上已安装Viking Rise',
      step1_title: '第1步：安装前置条件',
      step1_desc: '在您的电脑上下载并安装LDPlayer 9和Python 3.10+。',
      step1_ldplayer: '下载 LDPlayer 9',
      step1_python: '下载 Python 3.10',
      step2_title: '第2步：下载 VRBOT Agent',
      step2_desc: '下载机器人程序包并解压到任意文件夹。',
      step2_btn: '下载 VRBOT Agent v5.3',
      step2_size: '文件大小：约18 MB',
      security_title: '⚠️ 安全提示 — Windows SmartScreen',
      security_desc: 'Windows 可能会阻止下载的文件运行。解决方法：',
      security_s1: '解压前右键点击ZIP文件',
      security_s2: '选择"属性"(Properties)',
      security_s3: '勾选底部的 ✅ 解除锁定 (Unblock)',
      security_s4: '点击"应用"然后"确定"',
      security_s5: '现在解压并正常运行',
      step3_title: '第3步：启动',
      step3_desc: '运行setup.bat安装库（仅需一次），然后运行start.bat启动。',
      step3_s1: '运行 setup.bat（仅一次）',
      step3_s2: '运行 start.bat',
      step3_s3: '输入您的 User ID',
      step3_s4: '点击 Start Agent',
      user_id_note: '在控制面板中查找您的User ID',
      dashboard_link: '前往控制面板',
      need_help: '需要帮助？',
      help_desc: '通过Discord或Telegram联系我们获取技术支持。',
      back: '首页',
    },
  }[lang];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f1a',
        color: '#ffffff',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <nav
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#a78bfa',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '20px',
            }}
          >
            ← {t.back}
          </Link>
          <span style={{ fontWeight: 800, fontSize: '22px', color: '#a78bfa' }}>
            VRBOT
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 42px)',
              fontWeight: 800,
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px' }}>
            {t.subtitle}
          </p>
        </div>

        {/* Requirements */}
        <div
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: '16px',
            padding: '28px',
            marginBottom: '40px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '16px',
              color: '#a78bfa',
            }}
          >
            {t.requirements}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {[t.req1, t.req2, t.req3, t.req4].map((req, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '15px',
                }}
              >
                <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
                {req}
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                1
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t.step1_title}</h3>
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '16px',
                fontSize: '15px',
              }}
            >
              {t.step1_desc}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href="https://www.ldplayer.net/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#a78bfa',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {t.step1_ldplayer} ↗
              </a>
              <a
                href="https://www.python.org/downloads/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#a78bfa',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {t.step1_python} ↗
              </a>
            </div>
          </div>

          {/* Step 2 — PROTECTED DOWNLOAD */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                2
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t.step2_title}</h3>
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '16px',
                fontSize: '15px',
              }}
            >
              {t.step2_desc}
            </p>
            <a
              href="https://xmanyfpojzkjlwatkrcc.supabase.co/storage/v1/object/sign/downloads/vrbot-setup-v5.3.exe?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81NDNiZjU2MS0wZjUxLTQzYmYtYTc4My0xYWYwMzhjOTc2NGYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb3dubG9hZHMvdnJib3Qtc2V0dXAtdjUuMy5leGUiLCJpYXQiOjE3NzIyNjgwNDgsImV4cCI6MTgwMzgwNDA0OH0.pdlXiT_lYS7f9s97mgmYhpP5J1wvNSBaRSBBUe_jeoc"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '16px',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
              }}
            >
              ⬇ {t.step2_btn}
            </a>
            <p
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '13px',
                marginTop: '10px',
              }}
            >
              {t.step2_size}
            </p>
          </div>

          {/* Security Note — Windows SmartScreen */}
          <div
            style={{
              background: 'rgba(250,204,21,0.06)',
              border: '1px solid rgba(250,204,21,0.25)',
              borderRadius: '16px',
              padding: '24px 28px',
            }}
          >
            <h4
              style={{
                fontSize: '16px',
                fontWeight: 700,
                marginBottom: '10px',
                color: '#facc15',
              }}
            >
              {t.security_title}
            </h4>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '14px',
                marginBottom: '12px',
              }}
            >
              {t.security_desc}
            </p>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '10px',
                padding: '14px 18px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '2',
              }}
            >
              <div style={{ color: '#facc15' }}>1. {t.security_s1}</div>
              <div style={{ color: '#facc15' }}>2. {t.security_s2}</div>
              <div style={{ color: '#22c55e' }}>3. {t.security_s3}</div>
              <div style={{ color: '#facc15' }}>4. {t.security_s4}</div>
              <div style={{ color: '#22c55e' }}>5. {t.security_s5}</div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                3
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t.step3_title}</h3>
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '16px',
                fontSize: '15px',
              }}
            >
              {t.step3_desc}
            </p>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '10px',
                padding: '16px 20px',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '2',
              }}
            >
              <div style={{ color: '#22c55e' }}>{'>'} {t.step3_s1}</div>
              <div style={{ color: '#22c55e' }}>{'>'} {t.step3_s2}</div>
              <div style={{ color: '#facc15' }}>{'>'} {t.step3_s3}</div>
              <div style={{ color: '#a78bfa' }}>{'>'} {t.step3_s4}</div>
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                marginTop: '14px',
              }}
            >
              💡 {t.user_id_note} →{' '}
              <Link
                href="/dashboard"
                style={{ color: '#a78bfa', textDecoration: 'underline' }}
              >
                {t.dashboard_link}
              </Link>
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            {t.need_help}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
            {t.help_desc}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
          © 2026 VRBOT — Viking Rise Automation
        </p>
      </footer>
    </div>
  );
}
