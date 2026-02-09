'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ====== Supported Languages ======
export type Language = 'ar' | 'en' | 'ru' | 'zh';

export const languageNames: Record<Language, string> = {
  ar: 'العربية',
  en: 'English',
  ru: 'Русский',
  zh: '中文',
};

export const languageFlags: Record<Language, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  ru: '🇷🇺',
  zh: '🇨🇳',
};

// Direction: RTL for Arabic, LTR for others
export const languageDir: Record<Language, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
  ru: 'ltr',
  zh: 'ltr',
};

// ====== Translations ======
export const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.farms': 'المزارع',
    'nav.billing': 'الدفع',
    'nav.download': 'تحميل',
    'nav.dashboard': 'لوحة التحكم',
    'nav.settings': 'الإعدادات',
    'nav.login': 'تسجيل الدخول',
    'nav.signup': 'إنشاء حساب',
    'nav.logout': 'تسجيل الخروج',

    // Home Page
    'home.title': 'VRBOT',
    'home.subtitle': 'بوت أتمتة ذكي للعبة Viking Rise',
    'home.description': 'قم بأتمتة الزراعة، البناء، التدريب، وجمع الموارد تلقائياً 24/7',
    'home.startFree': 'ابدأ مجاناً',
    'home.learnMore': 'اعرف المزيد',
    'home.features': 'المميزات',
    'home.pricing': 'الأسعار',

    // Features
    'feature.farming': 'زراعة تلقائية 24/7',
    'feature.building': 'بناء وترقية المباني',
    'feature.resources': 'جمع الموارد',
    'feature.training': 'تدريب القوات',
    'feature.healing': 'علاج الجرحى',
    'feature.gifts': 'إرسال وجمع الهدايا',
    'feature.mail': 'قراءة البريد',
    'feature.rally': 'المشاركة في التجمعات',

    // Farms
    'farms.title': 'إدارة المزارع',
    'farms.subtitle': 'أضف وأدر مزارعك في Viking Rise',
    'farms.add': 'إضافة مزرعة',
    'farms.refresh': 'تحديث',
    'farms.name': 'المزرعة',
    'farms.server': 'السيرفر',
    'farms.power': 'القوة',
    'farms.level': 'المستوى',
    'farms.resources': 'الموارد المجمعة',
    'farms.status': 'الحالة',
    'farms.actions': 'الإجراءات',
    'farms.active': 'نشط',
    'farms.inactive': 'متوقف',
    'farms.paused': 'مؤقت',
    'farms.error': 'خطأ',
    'farms.total': 'إجمالي المزارع',
    'farms.activeFarms': 'مزارع نشطة',
    'farms.collected': 'الموارد المجمعة',
    'farms.subscription': 'الاشتراك',
    'farms.trial': 'تجريبي',
    'farms.pro': 'PRO',
    'farms.notActive': 'غير مفعل',
    'farms.empty': 'لا توجد مزارع. أضف مزرعتك الأولى!',

    // Billing
    'billing.title': 'الدفع والاشتراك',
    'billing.subtitle': 'أضف مزارع جديدة لحسابك عبر PayPal',
    'billing.farmCount': 'عدد المزارع',
    'billing.farm': 'مزرعة',
    'billing.total': 'المبلغ الإجمالي',
    'billing.perMonth': 'شهر',
    'billing.payNow': 'ادفع عبر PayPal',
    'billing.secure': 'دفع آمن عبر PayPal',
    'billing.whatYouGet': 'ماذا تحصل مع كل مزرعة',
    'billing.error': 'حدث خطأ في عملية الدفع',

    // Pricing
    'pricing.free': 'مجاني',
    'pricing.perFarm': 'لكل مزرعة',
    'pricing.monthly': 'شهرياً',
    'pricing.oneWeek': 'مزرعة واحدة لمدة أسبوع',
    'pricing.allFeatures': 'جميع الخيارات متاحة',
    'pricing.noLimit': 'بدون حد أقصى',
    'pricing.example': 'مثال: 100 مزرعة',

    // Common
    'common.start': 'تشغيل',
    'common.pause': 'إيقاف مؤقت',
    'common.stop': 'إيقاف',
    'common.delete': 'حذف',
    'common.details': 'التفاصيل',
    'common.settings': 'الإعدادات',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد',
    'common.save': 'حفظ',
    'common.close': 'إغلاق',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.loading': 'جاري التحميل...',
    'common.language': 'اللغة',

    // Trial
    'trial.free': 'فترة تجريبية مجانية',
    'trial.daysLeft': 'أيام متبقية',
    'trial.upgrade': 'الترقية',
    'trial.expired': 'انتهت الفترة التجريبية',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.farms': 'Farms',
    'nav.billing': 'Billing',
    'nav.download': 'Download',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.logout': 'Logout',

    // Home Page
    'home.title': 'VRBOT',
    'home.subtitle': 'Smart Automation Bot for Viking Rise',
    'home.description': 'Automate farming, building, training, and resource gathering 24/7',
    'home.startFree': 'Start Free',
    'home.learnMore': 'Learn More',
    'home.features': 'Features',
    'home.pricing': 'Pricing',

    // Features
    'feature.farming': '24/7 Auto Farming',
    'feature.building': 'Build & Upgrade',
    'feature.resources': 'Resource Gathering',
    'feature.training': 'Troop Training',
    'feature.healing': 'Heal Wounded',
    'feature.gifts': 'Send & Collect Gifts',
    'feature.mail': 'Read Mail',
    'feature.rally': 'Join Rallies',

    // Farms
    'farms.title': 'Farm Management',
    'farms.subtitle': 'Add and manage your Viking Rise farms',
    'farms.add': 'Add Farm',
    'farms.refresh': 'Refresh',
    'farms.name': 'Farm',
    'farms.server': 'Server',
    'farms.power': 'Power',
    'farms.level': 'Level',
    'farms.resources': 'Resources Collected',
    'farms.status': 'Status',
    'farms.actions': 'Actions',
    'farms.active': 'Active',
    'farms.inactive': 'Inactive',
    'farms.paused': 'Paused',
    'farms.error': 'Error',
    'farms.total': 'Total Farms',
    'farms.activeFarms': 'Active Farms',
    'farms.collected': 'Resources Collected',
    'farms.subscription': 'Subscription',
    'farms.trial': 'Trial',
    'farms.pro': 'PRO',
    'farms.notActive': 'Not Active',
    'farms.empty': 'No farms yet. Add your first farm!',

    // Billing
    'billing.title': 'Billing & Subscription',
    'billing.subtitle': 'Add new farms to your account via PayPal',
    'billing.farmCount': 'Number of Farms',
    'billing.farm': 'Farm',
    'billing.total': 'Total Amount',
    'billing.perMonth': 'month',
    'billing.payNow': 'Pay via PayPal',
    'billing.secure': 'Secure payment via PayPal',
    'billing.whatYouGet': 'What you get with each farm',
    'billing.error': 'Payment error occurred',

    // Pricing
    'pricing.free': 'Free',
    'pricing.perFarm': 'Per Farm',
    'pricing.monthly': 'Monthly',
    'pricing.oneWeek': 'One farm for one week',
    'pricing.allFeatures': 'All features included',
    'pricing.noLimit': 'No limit',
    'pricing.example': 'Example: 100 farms',

    // Common
    'common.start': 'Start',
    'common.pause': 'Pause',
    'common.stop': 'Stop',
    'common.delete': 'Delete',
    'common.details': 'Details',
    'common.settings': 'Settings',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.loading': 'Loading...',
    'common.language': 'Language',

    // Trial
    'trial.free': 'Free Trial',
    'trial.daysLeft': 'days left',
    'trial.upgrade': 'Upgrade',
    'trial.expired': 'Trial Expired',
  },

  ru: {
    // Navigation
    'nav.home': 'Главная',
    'nav.farms': 'Фермы',
    'nav.billing': 'Оплата',
    'nav.download': 'Скачать',
    'nav.dashboard': 'Панель',
    'nav.settings': 'Настройки',
    'nav.login': 'Войти',
    'nav.signup': 'Регистрация',
    'nav.logout': 'Выход',

    // Home Page
    'home.title': 'VRBOT',
    'home.subtitle': 'Умный бот для автоматизации Viking Rise',
    'home.description': 'Автоматизация фермерства, строительства, обучения и сбора ресурсов 24/7',
    'home.startFree': 'Начать бесплатно',
    'home.learnMore': 'Подробнее',
    'home.features': 'Возможности',
    'home.pricing': 'Цены',

    // Features
    'feature.farming': 'Автоматическая ферма 24/7',
    'feature.building': 'Строительство и улучшение',
    'feature.resources': 'Сбор ресурсов',
    'feature.training': 'Тренировка войск',
    'feature.healing': 'Лечение раненых',
    'feature.gifts': 'Отправка и сбор подарков',
    'feature.mail': 'Чтение почты',
    'feature.rally': 'Участие в ралли',

    // Farms
    'farms.title': 'Управление фермами',
    'farms.subtitle': 'Добавляйте и управляйте своими фермами Viking Rise',
    'farms.add': 'Добавить ферму',
    'farms.refresh': 'Обновить',
    'farms.name': 'Ферма',
    'farms.server': 'Сервер',
    'farms.power': 'Сила',
    'farms.level': 'Уровень',
    'farms.resources': 'Собранные ресурсы',
    'farms.status': 'Статус',
    'farms.actions': 'Действия',
    'farms.active': 'Активна',
    'farms.inactive': 'Неактивна',
    'farms.paused': 'Пауза',
    'farms.error': 'Ошибка',
    'farms.total': 'Всего ферм',
    'farms.activeFarms': 'Активные фермы',
    'farms.collected': 'Собранные ресурсы',
    'farms.subscription': 'Подписка',
    'farms.trial': 'Пробный',
    'farms.pro': 'PRO',
    'farms.notActive': 'Не активна',
    'farms.empty': 'Нет ферм. Добавьте первую!',

    // Billing
    'billing.title': 'Оплата и подписка',
    'billing.subtitle': 'Добавьте новые фермы через PayPal',
    'billing.farmCount': 'Количество ферм',
    'billing.farm': 'Ферма',
    'billing.total': 'Итого',
    'billing.perMonth': 'месяц',
    'billing.payNow': 'Оплатить через PayPal',
    'billing.secure': 'Безопасная оплата через PayPal',
    'billing.whatYouGet': 'Что вы получаете с каждой фермой',
    'billing.error': 'Ошибка оплаты',

    // Pricing
    'pricing.free': 'Бесплатно',
    'pricing.perFarm': 'За ферму',
    'pricing.monthly': 'Ежемесячно',
    'pricing.oneWeek': 'Одна ферма на неделю',
    'pricing.allFeatures': 'Все функции включены',
    'pricing.noLimit': 'Без ограничений',
    'pricing.example': 'Пример: 100 ферм',

    // Common
    'common.start': 'Запуск',
    'common.pause': 'Пауза',
    'common.stop': 'Стоп',
    'common.delete': 'Удалить',
    'common.details': 'Детали',
    'common.settings': 'Настройки',
    'common.cancel': 'Отмена',
    'common.confirm': 'Подтвердить',
    'common.save': 'Сохранить',
    'common.close': 'Закрыть',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'common.loading': 'Загрузка...',
    'common.language': 'Язык',

    // Trial
    'trial.free': 'Бесплатный пробный период',
    'trial.daysLeft': 'дней осталось',
    'trial.upgrade': 'Улучшить',
    'trial.expired': 'Пробный период истёк',
  },

  zh: {
    // Navigation
    'nav.home': '首页',
    'nav.farms': '农场',
    'nav.billing': '付款',
    'nav.download': '下载',
    'nav.dashboard': '控制面板',
    'nav.settings': '设置',
    'nav.login': '登录',
    'nav.signup': '注册',
    'nav.logout': '退出',

    // Home Page
    'home.title': 'VRBOT',
    'home.subtitle': 'Viking Rise 智能自动化机器人',
    'home.description': '24/7 自动化农耕、建设、训练和资源收集',
    'home.startFree': '免费开始',
    'home.learnMore': '了解更多',
    'home.features': '功能特色',
    'home.pricing': '价格',

    // Features
    'feature.farming': '24/7 自动农耕',
    'feature.building': '建造和升级建筑',
    'feature.resources': '收集资源',
    'feature.training': '训练部队',
    'feature.healing': '治疗伤员',
    'feature.gifts': '发送和收集礼物',
    'feature.mail': '阅读邮件',
    'feature.rally': '参加集结',

    // Farms
    'farms.title': '农场管理',
    'farms.subtitle': '添加和管理您的 Viking Rise 农场',
    'farms.add': '添加农场',
    'farms.refresh': '刷新',
    'farms.name': '农场',
    'farms.server': '服务器',
    'farms.power': '战力',
    'farms.level': '等级',
    'farms.resources': '已收集资源',
    'farms.status': '状态',
    'farms.actions': '操作',
    'farms.active': '运行中',
    'farms.inactive': '已停止',
    'farms.paused': '已暂停',
    'farms.error': '错误',
    'farms.total': '总农场数',
    'farms.activeFarms': '活跃农场',
    'farms.collected': '已收集资源',
    'farms.subscription': '订阅',
    'farms.trial': '试用',
    'farms.pro': 'PRO',
    'farms.notActive': '未激活',
    'farms.empty': '没有农场。添加您的第一个农场！',

    // Billing
    'billing.title': '付款与订阅',
    'billing.subtitle': '通过 PayPal 添加新农场',
    'billing.farmCount': '农场数量',
    'billing.farm': '农场',
    'billing.total': '总金额',
    'billing.perMonth': '月',
    'billing.payNow': '通过 PayPal 支付',
    'billing.secure': '通过 PayPal 安全支付',
    'billing.whatYouGet': '每个农场包含的功能',
    'billing.error': '支付错误',

    // Pricing
    'pricing.free': '免费',
    'pricing.perFarm': '每个农场',
    'pricing.monthly': '每月',
    'pricing.oneWeek': '一个农场一周',
    'pricing.allFeatures': '所有功能',
    'pricing.noLimit': '无限制',
    'pricing.example': '示例：100个农场',

    // Common
    'common.start': '启动',
    'common.pause': '暂停',
    'common.stop': '停止',
    'common.delete': '删除',
    'common.details': '详情',
    'common.settings': '设置',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.close': '关闭',
    'common.yes': '是',
    'common.no': '否',
    'common.loading': '加载中...',
    'common.language': '语言',

    // Trial
    'trial.free': '免费试用期',
    'trial.daysLeft': '天剩余',
    'trial.upgrade': '升级',
    'trial.expired': '试用期已过期',
  },
};

// ====== Context ======
interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  setLang: () => {},
  t: (key: string) => key,
  dir: 'rtl',
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('ar');

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && translations[saved]) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('vrbot_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = languageDir[newLang];
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = languageDir[lang];
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: languageDir[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
