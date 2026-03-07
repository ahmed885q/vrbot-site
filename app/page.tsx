'use client';

import { useState, useEffect, useRef } from 'react';

import SplashScreen from './components/SplashScreen';
type Language = 'ar' | 'en' | 'ru' | 'zh';

const content: Record<Language, {
  hero_title: string; hero_subtitle: string; herho_desc: string;
  cta_start: string; cta_pricing: string;
  trusted: string;
  features_title: string; features_subtitle: string;
  f1_title: string; f1_desc: string;
  f2_title: string; f2_desc: string;
  f3_title: string; f3_desc: string;
  f4_title: string; f4_desc: string;
  f5_title: string; f5_desc: string;
  f6_title: string; f6_desc: string;
  stats_farms: string; stats_tasks: string; stats_uptime: string; stats_languages: string;
  how_title: string; how_subtitle: string;
  step1_title: string; step1_desc: string;
  step2_title: string; step2_desc: string;
  step3_title: string; step3_desc: string;
  pricing_title: string; pricing_subtitle: string;
  pricing_free_title: string; pricing_free_desc: string;
  pricing_free_f1: string; pricing_free_f2: string; pricing_free_f3: string;
  pricing_free_cta: string;
  pricing_pro_badge: string;
  pricing_pro_title: string; pricing_pro_desc: string;
  pricing_pro_f1: string; pricing_pro_f2: string; pricing_pro_f3: string;
  pricing_pro_f4: string; pricing_pro_f5: string;
  pricing_pro_cta: string;
  pricing_per: string;
  pricing_ldp_title: string; pricing_ldp_desc: string;
  pricing_cloud_title: string; pricing_cloud_desc: string;
  faq_title: string;
  faq1_q: string; faq1_a: string;
  faq2_q: string; faq2_a: string;
  faq3_q: string; faq3_a: string;
  cta_final_title: string; cta_final_desc: string; cta_final_btn: string;
  footer_text: string;
}> = {
  ar: {
    hero_title: 'VRBOT',
    hero_subtitle: 'أتمتة Viking Rise بالذكاء الاصطناعي',
    hero_desc: 'أدِر مزارعك، اجمع الموارد، طوّر قلعتك وهاجم الأعداء — كل شيء يعمل تلقائياً على مدار الساعة بذكاء اصطناعي متقدم.',
    cta_start: 'ابدأ مجاناً',
    cta_pricing: 'عرض الأسعار',
    trusted: 'يثق به أكثر من 500 لاعب حول العالم',
    features_title: 'كل ما تحتاجه في بوت واحد',
    features_subtitle: '52 مهمة آلية تغطي كل جانب من اللعبة',
    f1_title: 'جمع الموارد',
    f1_desc: 'إرسال مسيرات جمع تلقائية مع إدارة ذكية للقوات والأوقات.',
    f2_title: 'بناء وتطوير',
    f2_desc: 'ترقية المباني والأبحاث تلقائياً مع تحديد الأولويات الذكي.',
    f3_title: 'قتل الوحوش',
    f3_desc: 'صيد Niflung والوحوش تلقائياً مع اختيار المستوى المناسب.',
    f4_title: 'حماية من الحظر',
    f4_desc: 'محاكاة سلوك بشري متقدم مع تأخيرات عشوائية وحركات طبيعية.',
    f5_title: 'لوحة تحكم مباشرة',
    f5_desc: 'تابع جميع مزارعك في الوقت الحقيقي من المتصفح أو الهاتف.',
    f6_title: 'دعم سحابي',
    f6_desc: 'شغّل البوت على سيرفراتنا السحابية بدون الحاجة لجهاز كمبيوتر.',
    stats_farms: 'مزرعة نشطة',
    stats_tasks: 'مهمة آلية',
    stats_uptime: 'وقت التشغيل',
    stats_languages: 'لغات مدعومة',
    how_title: 'ابدأ في 3 خطوات',
    how_subtitle: 'إعداد سهل وسريع — شغّل البوت خلال دقائق',
    step1_title: 'أنشئ حسابك',
    step1_desc: 'سجّل مجاناً وأضف معلومات مزرعتك الأولى.',
    step2_title: 'اختر المهام',
    step2_desc: 'حدد المهام اللي تبي البوت يشغّلها من 52 مهمة متاحة.',
    step3_title: 'شغّل واسترخِ',
    step3_desc: 'البوت يشتغل 24/7 وأنت تتابع النتائج من لوحة التحكم.',
    pricing_title: 'خطط بسيطة وشفافة',
    pricing_subtitle: 'ابدأ مجاناً — ترقّى متى ما تبي',
    pricing_free_title: 'مجاني',
    pricing_free_desc: 'للتجربة',
    pricing_free_f1: 'مزرعة واحدة',
    pricing_free_f2: 'المهام الأساسية',
    pricing_free_f3: 'تجربة 7 أيام',
    pricing_free_cta: 'ابدأ مجاناً',
    pricing_pro_badge: 'الأكثر طلباً',
    pricing_pro_title: 'احترافي',
    pricing_pro_desc: 'للاعبين الجادين',
    pricing_pro_f1: 'مزارع غير محدودة',
    pricing_pro_f2: 'جميع الـ 52 مهمة',
    pricing_pro_f3: 'حماية متقدمة',
    pricing_pro_f4: 'لوحة تحكم متقدمة',
    pricing_pro_f5: 'أولوية الدعم',
    pricing_pro_cta: 'اشترك الآن',
    pricing_per: '/ مزرعة / شهرياً',
    pricing_ldp_title: 'LDPlayer',
    pricing_ldp_desc: 'للتشغيل المحلي',
    pricing_cloud_title: 'سحابي ☁️',
    pricing_cloud_desc: 'بدون جهاز كمبيوتر',
    faq_title: 'أسئلة شائعة',
    faq1_q: 'هل حسابي آمن من الحظر؟',
    faq1_a: 'نستخدم تقنيات محاكاة سلوك بشري متقدمة تشمل تأخيرات عشوائية، حركات طبيعية، وفترات راحة تلقائية لحماية حسابك.',
    faq2_q: 'كم مزرعة أقدر أشغّل؟',
    faq2_a: 'الخطة المجانية تدعم مزرعة واحدة. الخطة الاحترافية تدعم عدد غير محدود من المزارع بـ $3 لكل مزرعة شهرياً.',
    faq3_q: 'هل أحتاج أخلي جهازي شغّال؟',
    faq3_a: 'حالياً نعم، البوت يحتاج جهاز كمبيوتر شغّال. قريباً نوفّر خيار سحابي يشتغل بدون جهازك.',
    cta_final_title: 'جاهز تبدأ؟',
    cta_final_desc: 'انضم لمئات اللاعبين اللي يستخدمون VRBOT لتطوير حساباتهم تلقائياً.',
    cta_final_btn: 'ابدأ الآن مجاناً',
    footer_text: '© 2026 VRBOT. جميع الحقوق محفوظة.',
  },
  en: {
    hero_title: 'VRBOT',
    hero_subtitle: 'AI-Powered Viking Rise Automation',
    hero_desc: 'Manage farms, gather resources, upgrade your castle and attack enemies — everything runs 24/7 with advanced AI automation.',
    cta_start: 'Start Free',
    cta_pricing: 'View Pricing',
    trusted: 'Trusted by 500+ players worldwide',
    features_title: 'Everything You Need in One Bot',
    features_subtitle: '52 automated tasks covering every aspect of the game',
    f1_title: 'Resource Gathering',
    f1_desc: 'Automated gathering marches with smart troop and timing management.',
    f2_title: 'Build & Upgrade',
    f2_desc: 'Auto-upgrade buildings and research with smart priority selection.',
    f3_title: 'Monster Hunting',
    f3_desc: 'Auto-hunt Niflung and monsters with appropriate level selection.',
    f4_title: 'Ban Protection',
    f4_desc: 'Advanced human behavior simulation with random delays and natural movements.',
    f5_title: 'Live Dashboard',
    f5_desc: 'Monitor all your farms in real-time from browser or mobile.',
    f6_title: 'Cloud Support',
    f6_desc: 'Run the bot on our cloud servers — now live! No computer needed, zero setup.',
    stats_farms: 'Active Farms',
    stats_tasks: 'Auto Tasks',
    stats_uptime: 'Uptime',
    stats_languages: 'Languages',
    how_title: 'Start in 3 Steps',
    how_subtitle: 'Quick and easy setup — get running in minutes',
    step1_title: 'Create Account',
    step1_desc: 'Sign up free and add your first farm details.',
    step2_title: 'Choose Tasks',
    step2_desc: 'Select which tasks to run from 52 available automations.',
    step3_title: 'Run & Relax',
    step3_desc: 'Bot runs 24/7 while you monitor results from the dashboard.',
    pricing_title: 'Simple, Transparent Pricing',
    pricing_subtitle: 'Start free — upgrade anytime',
    pricing_free_title: 'Free',
    pricing_free_desc: 'To try it out',
    pricing_free_f1: 'One farm',
    pricing_free_f2: 'Basic tasks',
    pricing_free_f3: '7-day trial',
    pricing_free_cta: 'Start Free',
    pricing_pro_badge: 'Most Popular',
    pricing_pro_title: 'Pro',
    pricing_pro_desc: 'For serious players',
    pricing_pro_f1: 'Unlimited farms',
    pricing_pro_f2: 'All 52 tasks',
    pricing_pro_f3: 'Advanced protection',
    pricing_pro_f4: 'Advanced dashboard',
    pricing_pro_f5: 'Priority support',
    pricing_pro_cta: 'Subscribe Now',
    pricing_per: '/ farm / month',
    pricing_ldp_title: 'LDPlayer',
    pricing_ldp_desc: 'Run locally on your PC',
    pricing_cloud_title: 'Cloud ☁️',
    pricing_cloud_desc: 'No computer needed',
    faq_title: 'FAQ',
    faq1_q: 'Is my account safe from bans?',
    faq1_a: 'We use advanced human behavior simulation including random delays, natural movements, and automatic rest periods to protect your account.',
    faq2_q: 'How many farms can I run?',
    faq2_a: 'Free plan supports one farm. Pro: $2/farm/month (LDPlayer local) or $3/farm/month (Cloud servers).',
    faq3_q: 'Do I need to keep my computer running?',
    faq3_a: 'No! Our Cloud option is now live — farms run 24/7 on our servers. You can also run locally — no computer needed.',
    cta_final_title: 'Ready to Start?',
    cta_final_desc: 'Join hundreds of players using VRBOT to automate their accounts.',
    cta_final_btn: 'Start Free Now',
    footer_text: '© 2026 VRBOT. All rights reserved.',
  },
  ru: {
    hero_title: 'VRBOT',
    hero_subtitle: 'ИИ-автоматизация Viking Rise',
    hero_desc: 'Управляйте фермами, собирайте ресурсы, улучшайте замок и атакуйте врагов — всё работает автоматически 24/7 с продвинутым ИИ.',
    cta_start: 'Начать бесплатно',
    cta_pricing: 'Цены',
    trusted: 'Более 500 игроков по всему миру',
    features_title: 'Всё в одном боте',
    features_subtitle: '52 автоматических задач для каждого аспекта игры',
    f1_title: 'Сбор ресурсов',
    f1_desc: 'Автоматические марши с умным управлением войсками.',
    f2_title: 'Строительство',
    f2_desc: 'Автоулучшение зданий и исследований с приоритетами.',
    f3_title: 'Охота на монстров',
    f3_desc: 'Автоохота на Нифлунгов и монстров нужного уровня.',
    f4_title: 'Защита от бана',
    f4_desc: 'Симуляция поведения с задержками и естественными движениями.',
    f5_title: 'Панель управления',
    f5_desc: 'Мониторинг всех ферм в реальном времени из браузера.',
    f6_title: 'Облачная поддержка',
    f6_desc: 'Запуск бота на наших серверах — компьютер не нужен.',
    stats_farms: 'Активных ферм',
    stats_tasks: 'Автозадач',
    stats_uptime: 'Аптайм',
    stats_languages: 'Языков',
    how_title: 'Начните за 3 шага',
    how_subtitle: 'Быстрая настройка — запуск за минуты',
    step1_title: 'Создайте аккаунт',
    step1_desc: 'Зарегистрируйтесь и добавьте первую ферму.',
    step2_title: 'Выберите задачи',
    step2_desc: 'Отметьте нужные из 52 доступных автоматизаций.',
    step3_title: 'Запустите и отдыхайте',
    step3_desc: 'Бот работает 24/7, вы следите за результатами.',
    pricing_title: 'Простые и прозрачные цены',
    pricing_subtitle: 'Начните бесплатно — обновите когда угодно',
    pricing_free_title: 'Бесплатно',
    pricing_free_desc: 'Для пробы',
    pricing_free_f1: 'Одна ферма',
    pricing_free_f2: 'Базовые задачи',
    pricing_free_f3: '7 дней пробного периода',
    pricing_free_cta: 'Начать бесплатно',
    pricing_pro_badge: 'Популярный',
    pricing_pro_title: 'Про',
    pricing_pro_desc: 'Для серьёзных игроков',
    pricing_pro_f1: 'Безлимитные фермы',
    pricing_pro_f2: 'Все 52 задач',
    pricing_pro_f3: 'Продвинутая защита',
    pricing_pro_f4: 'Расширенная панель',
    pricing_pro_f5: 'Приоритетная поддержка',
    pricing_pro_cta: 'Подписаться',
    pricing_per: '/ ферма / месяц',
    pricing_ldp_title: 'LDPlayer',
    pricing_ldp_desc: 'Локальный запуск',
    pricing_cloud_title: 'Облако ☁️',
    pricing_cloud_desc: 'Без компьютера',
    faq_title: 'Частые вопросы',
    faq1_q: 'Мой аккаунт в безопасности?',
    faq1_a: 'Мы используем симуляцию поведения с задержками, естественными движениями и паузами для защиты.',
    faq2_q: 'Сколько ферм можно запустить?',
    faq2_a: 'Бесплатно — одна ферма. Про — безлимит по $3 за ферму в месяц.',
    faq3_q: 'Нужен ли включённый компьютер?',
    faq3_a: 'Пока да. Скоро будет облачный вариант без компьютера.',
    cta_final_title: 'Готовы начать?',
    cta_final_desc: 'Присоединяйтесь к сотням игроков, использующих VRBOT.',
    cta_final_btn: 'Начать бесплатно',
    footer_text: '© 2026 VRBOT. Все права защищены.',
  },
  zh: {
    hero_title: 'VRBOT',
    hero_subtitle: 'AI驱动的维京崛起自动化',
    hero_desc: '管理农场、收集资源、升级城堡、攻击敌人——一切由先进AI全天候自动运行。',
    cta_start: '免费开始',
    cta_pricing: '查看价格',
    trusted: '全球500+玩家信赖',
    features_title: '一个机器人满足所有需求',
    features_subtitle: '52项自动化任务覆盖游戏各个方面',
    f1_title: '资源采集',
    f1_desc: '自动派遣采集队伍，智能管理部队和时间。',
    f2_title: '建造升级',
    f2_desc: '自动升级建筑和研究，智能排列优先级。',
    f3_title: '怪物猎杀',
    f3_desc: '自动猎杀尼弗隆和怪物，选择合适等级。',
    f4_title: '防封保护',
    f4_desc: '高级人类行为模拟，随机延迟和自然操作。',
    f5_title: '实时面板',
    f5_desc: '通过浏览器或手机实时监控所有农场。',
    f6_title: '云端支持',
    f6_desc: '在我们的云服务器上运行，无需电脑。',
    stats_farms: '活跃农场',
    stats_tasks: '自动任务',
    stats_uptime: '运行时间',
    stats_languages: '支持语言',
    how_title: '3步开始',
    how_subtitle: '快速简单设置——几分钟即可运行',
    step1_title: '创建账户',
    step1_desc: '免费注册并添加您的第一个农场。',
    step2_title: '选择任务',
    step2_desc: '从52项自动化中选择要运行的任务。',
    step3_title: '运行并放松',
    step3_desc: '机器人全天候运行，您在面板监控结果。',
    pricing_title: '简单透明的定价',
    pricing_subtitle: '免费开始——随时升级',
    pricing_free_title: '免费',
    pricing_free_desc: '试用',
    pricing_free_f1: '一个农场',
    pricing_free_f2: '基本任务',
    pricing_free_f3: '7天试用',
    pricing_free_cta: '免费开始',
    pricing_pro_badge: '最受欢迎',
    pricing_pro_title: '专业版',
    pricing_pro_desc: '适合认真玩家',
    pricing_pro_f1: '无限农场',
    pricing_pro_f2: '全部52项任务',
    pricing_pro_f3: '高级保护',
    pricing_pro_f4: '高级面板',
    pricing_pro_f5: '优先支持',
    pricing_pro_cta: '立即订阅',
    pricing_per: '/ 农场 / 月',
    pricing_ldp_title: 'LDPlayer',
    pricing_ldp_desc: '本地运行',
    pricing_cloud_title: '云端 ☁️',
    pricing_cloud_desc: '无需电脑',
    faq_title: '常见问题',
    faq1_q: '我的账户安全吗？',
    faq1_a: '我们使用高级行为模拟技术，包括随机延迟、自然操作和自动休息来保护您的账户。',
    faq2_q: '可以运行多少农场？',
    faq2_a: '免费版支持一个农场。专业版每月$3/农场，数量无限。',
    faq3_q: '需要保持电脑开启吗？',
    faq3_a: '目前需要。云端选项即将推出，届时无需电脑。',
    cta_final_title: '准备开始？',
    cta_final_desc: '加入数百名使用VRBOT自动化账户的玩家。',
    cta_final_btn: '立即免费开始',
    footer_text: '© 2026 VRBOT. 保留所有权利。',
  },
};

function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const startTime = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{
      background: open ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${open ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 16, padding: '20px 24px', cursor: 'pointer', transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>{q}</span>
        <span style={{ color: '#8b5cf6', fontSize: 22, fontWeight: 300, transform: open ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.3s', flexShrink: 0 }}>+</span>
      </div>
      <div style={{ maxHeight: open ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease, opacity 0.3s', opacity: open ? 1 : 0 }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, marginTop: 12, marginBottom: 0 }}>{a}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [lang, setLang] = useState<Language>('en');

  const [showSplash, setShowSplash] = useState(true);
const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && content[saved]) setLang(saved);
    setMounted(true);
    const check = setInterval(() => {
      const l = localStorage.getItem('vrbot_lang') as Language;
      if (l && l !== lang && content[l]) setLang(l);
    }, 500);
    return () => clearInterval(check);
  }, [lang]);
  if (!mounted) return null;
  const t = content[lang];
  const isRtl = lang === 'ar';
  const fontFamily = lang === 'ar' ? "'Tajawal', sans-serif" : lang === 'zh' ? "'Noto Sans SC', sans-serif" : "'Inter', sans-serif";
  const features = [
    { title: t.f1_title, desc: t.f1_desc, emoji: '🌍¾', color: '#10b981' },
    { title: t.f2_title, desc: t.f2_desc, emoji: '🔨', color: '#f59e0b' },
    { title: t.f3_title, desc: t.f3_desc, emoji: '🎯', color: '#ef4444' },
    { title: t.f4_title, desc: t.f4_desc, emoji: '🛡️', color: '#8b5cf6' },
    { title: t.f5_title, desc: t.f5_desc, emoji: '📊', color: '#3b82f6' },
    { title: t.f6_title, desc: t.f6_desc, emoji: 'â˜ï¸', color: '#06b6d4' },
  ];
  const steps = [
    { num: '01', title: t.step1_title, desc: t.step1_desc },
    { num: '02', title: t.step2_title, desc: t.step2_desc },
    { num: '03', title: t.step3_title, desc: t.step3_desc },
  ];

  if (showSplash) return <SplashScreen onEnter={() => setShowSplash(false)} />;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily, background: '#09090b', color: '#fafafa', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        @keyframes heroGlow { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.6;transform:scale(1.12)} }
        @keyframes floatBot { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-14px) rotate(1deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(139,92,246,.35)} 70%{box-shadow:0 0 0 14px rgba(139,92,246,0)} 100%{box-shadow:0 0 0 0 rgba(139,92,246,0)} }
        .vr-fu{animation:fadeUp .7s ease forwards;opacity:0}
        .vr-d1{animation-delay:.1s}.vr-d2{animation-delay:.2s}.vr-d3{animation-delay:.3s}.vr-d4{animation-delay:.4s}
        .vr-fc{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:32px 28px;transition:all .35s cubic-bezier(.4,0,.2,1);cursor:default}
        .vr-fc:hover{transform:translateY(-6px);border-color:rgba(139,92,246,.3);box-shadow:0 20px 50px rgba(0,0,0,.4);background:rgba(139,92,246,.04)}
        .vr-bp{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 24px rgba(124,58,237,.35);transition:all .25s;border:none;cursor:pointer}
        .vr-bp:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(124,58,237,.5)}
        .vr-bs{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#e2e8f0;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;border:1.5px solid rgba(255,255,255,.15);transition:all .25s;cursor:pointer}
        .vr-bs:hover{background:rgba(255,255,255,.05);border-color:rgba(139,92,246,.4);transform:translateY(-2px)}
        .vr-pp{border:2px solid rgba(139,92,246,.4);background:linear-gradient(170deg,rgba(139,92,246,.08),rgba(59,130,246,.04));box-shadow:0 0 80px rgba(139,92,246,.08)}
        .vr-pp:hover{border-color:rgba(139,92,246,.6);box-shadow:0 0 100px rgba(139,92,246,.12)}
        @media(max-width:768px){.vr-g3{grid-template-columns:1fr!important}.vr-g2{grid-template-columns:1fr!important}.vr-g4{grid-template-columns:repeat(2,1fr)!important}.vr-hb{flex-direction:column!important;align-items:stretch!important}.vr-ht{font-size:48px!important}}
      `}</style>

      {/* HERO */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'120px 24px 80px' }}>
        <div style={{ position:'absolute', top:'-20%', left:'10%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.15),transparent 70%)', animation:'heroGlow 10s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-10%', right:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)', animation:'heroGlow 8s ease-in-out infinite 2s', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)', backgroundSize:'80px 80px', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, textAlign:'center', maxWidth:800 }}>
          <div className="vr-fu" style={{ fontSize:72, marginBottom:24, animation:'floatBot 4s ease-in-out infinite, fadeUp .7s ease forwards' }}>🤖</div>
          <h1 className="vr-fu vr-d1 vr-ht" style={{ fontSize:72, fontWeight:900, color:'#fff', letterSpacing: isRtl ? 0 : 4, margin:'0 0 16px', lineHeight:1.1 }}>{t.hero_title}</h1>
          <p className="vr-fu vr-d2" style={{ fontSize:22, fontWeight:600, background:'linear-gradient(135deg,#a78bfa,#818cf8,#60a5fa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:'0 0 20px' }}>{t.hero_subtitle}</p>
          <p className="vr-fu vr-d3" style={{ fontSize:17, color:'rgba(255,255,255,.5)', lineHeight:1.7, maxWidth:600, margin:'0 auto 40px' }}>{t.hero_desc}</p>
          <div className="vr-fu vr-d4 vr-hb" style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <a href="/signup" className="vr-bp">{t.cta_start}</a>
            <a href="#pricing" className="vr-bs">{t.cta_pricing}</a>
          </div>
          <p className="vr-fu vr-d4" style={{ marginTop:48, fontSize:14, color:'rgba(255,255,255,.3)', letterSpacing:.5 }}>{t.trusted}</p>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding:'0 24px 80px' }}>
        <div className="vr-g4" style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:'rgba(255,255,255,.06)', borderRadius:20, overflow:'hidden' }}>
          {[{ val:500, suffix:'+', label:t.stats_farms },{ val:52, suffix:'', label:t.stats_tasks },{ val:99, suffix:'.9%', label:t.stats_uptime },{ val:4, suffix:'', label:t.stats_languages }].map((s,i)=>(
            <div key={i} style={{ background:'#09090b', padding:'36px 20px', textAlign:'center' }}>
              <div style={{ fontSize:36, fontWeight:800, color:'#fff', marginBottom:6 }}><CountUp end={s.val} suffix={s.suffix}/></div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontSize:36, fontWeight:800, color:'#fff', margin:'0 0 12px' }}>{t.features_title}</h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', margin:0 }}>{t.features_subtitle}</p>
          </div>
          <div className="vr-g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {features.map((f,i)=>(
              <div key={i} className="vr-fc">
                <div style={{ width:52, height:52, borderRadius:14, background:`${f.color}15`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, fontSize:26 }}>{f.emoji}</div>
                <h3 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:'0 0 10px' }}>{f.title}</h3>
                <p style={{ fontSize:14, color:'rgba(255,255,255,.45)', lineHeight:1.7, margin:0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding:'80px 24px', background:'linear-gradient(180deg,transparent,rgba(139,92,246,.03),transparent)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontSize:36, fontWeight:800, color:'#fff', margin:'0 0 12px' }}>{t.how_title}</h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', margin:0 }}>{t.how_subtitle}</p>
          </div>
          <div className="vr-g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:32 }}>
            {steps.map((s,i)=>(
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,rgba(139,92,246,.15),rgba(99,102,241,.1))', border:'2px solid rgba(139,92,246,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:24, fontWeight:800, color:'#a78bfa', animation:`pulseRing 3s infinite ${i*.8}s` }}>{s.num}</div>
                <h3 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:'0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize:14, color:'rgba(255,255,255,.45)', lineHeight:1.7, margin:0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontSize:36, fontWeight:800, color:'#fff', margin:'0 0 12px' }}>{t.pricing_title}</h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', margin:0 }}>{t.pricing_subtitle}</p>
          </div>
          <div className="vr-g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, alignItems:'start' }}>
            {/* Free */}
            <div style={{ background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:'40px 28px', transition:'all .35s' }}>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', margin:'0 0 8px', fontWeight:500 }}>{t.pricing_free_desc}</p>
              <h3 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', margin:'0 0 4px' }}>{t.pricing_free_title}</h3>
              <div style={{ fontSize:48, fontWeight:900, color:'#fff', margin:'20px 0' }}>$0</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:32 }}>
                {[t.pricing_free_f1, t.pricing_free_f2, t.pricing_free_f3].map((f,i)=>(
                  <span key={i} style={{ color:'rgba(255,255,255,.6)', fontSize:15 }}><span style={{ color:'#8b5cf6', marginInlineEnd:10, fontWeight:700 }}>✓</span>{f}</span>
                ))}
              </div>
              <a href="/signup" className="vr-bs" style={{ width:'100%', justifyContent:'center', boxSizing:'border-box' }}>{t.pricing_free_cta}</a>
            </div>
            {/* LDPlayer */}
            <div style={{ background:'rgba(255,255,255,.025)', border:'2px solid rgba(124,58,237,0.3)', borderRadius:24, padding:'40px 28px', transition:'all .35s', position:'relative' }}>
              <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#7c3aed,#6366f1)', color:'#fff', padding:'6px 20px', borderRadius:'0 0 10px 10px', fontSize:12, fontWeight:700 }}>{t.pricing_pro_badge}</div>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', margin:'0 0 8px', fontWeight:500 }}>{t.pricing_ldp_desc}</p>
              <h3 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', margin:'0 0 4px' }}>{t.pricing_ldp_title}</h3>
              <div style={{ margin:'20px 0' }}>
                <span style={{ fontSize:48, fontWeight:900, color:'#fff' }}>$2</span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginInlineStart:8 }}>{t.pricing_per}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:32 }}>
                {[t.pricing_pro_f1, t.pricing_pro_f2, t.pricing_pro_f3, t.pricing_pro_f4, t.pricing_pro_f5].map((f,i)=>(
                  <span key={i} style={{ color:'rgba(255,255,255,.6)', fontSize:15 }}><span style={{ color:'#8b5cf6', marginInlineEnd:10, fontWeight:700 }}>✓</span>{f}</span>
                ))}
              </div>
              <a href="/billing?plan=ldplayer" className="vr-bp" style={{ width:'100%', justifyContent:'center', boxSizing:'border-box' }}>{t.pricing_pro_cta}</a>
            </div>
            {/* Cloud */}
            <div className="vr-pp" style={{ borderRadius:24, padding:'40px 28px', transition:'all .35s', position:'relative' }}>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', margin:'0 0 8px', fontWeight:500 }}>{t.pricing_cloud_desc}</p>
              <h3 style={{ fontSize:24, fontWeight:800, color:'#c4b5fd', margin:'0 0 4px' }}>{t.pricing_cloud_title}</h3>
              <div style={{ margin:'20px 0' }}>
                <span style={{ fontSize:48, fontWeight:900, color:'#fff' }}>$3</span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginInlineStart:8 }}>{t.pricing_per}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:32 }}>
                {[t.pricing_pro_f1, t.pricing_pro_f2, t.pricing_pro_f3, t.pricing_pro_f4, t.pricing_pro_f5].map((f,i)=>(
                  <span key={i} style={{ color:'rgba(255,255,255,.6)', fontSize:15 }}><span style={{ color:'#8b5cf6', marginInlineEnd:10, fontWeight:700 }}>✓</span>{f}</span>
                ))}
              </div>
              <a href="/billing?plan=cloud" className="vr-bp" style={{ width:'100%', justifyContent:'center', boxSizing:'border-box' }}>{t.pricing_pro_cta}</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <h2 style={{ fontSize:36, fontWeight:800, color:'#fff', textAlign:'center', margin:'0 0 48px' }}>{t.faq_title}</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <FAQ q={t.faq1_q} a={t.faq1_a}/><FAQ q={t.faq2_q} a={t.faq2_a}/><FAQ q={t.faq3_q} a={t.faq3_a}/>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'80px 24px', textAlign:'center', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,rgba(139,92,246,.08),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontSize:36, fontWeight:800, color:'#fff', margin:'0 0 16px' }}>{t.cta_final_title}</h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.45)', margin:'0 0 36px', lineHeight:1.7 }}>{t.cta_final_desc}</p>
          <a href="/signup" className="vr-bp" style={{ fontSize:18, padding:'18px 48px' }}>{t.cta_final_btn}</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding:'32px 24px', textAlign:'center', borderTop:'1px solid rgba(255,255,255,.05)' }}>
        <p style={{ color:'rgba(255,255,255,.25)', fontSize:13, margin:0 }}>{t.footer_text}</p>
      </footer>
    </div>
  );
}











