'use client';

import { useState, useEffect, useRef } from 'react';

type Language = 'ar' | 'en' | 'ru' | 'zh';

const content: Record<Language, {
  hero_title: string; hero_subtitle: string; hero_desc: string;
  cta_early: string; cta_pricing: string;
  features_title: string;
  f1_title: string; f1_desc: string; f2_title: string; f2_desc: string;
  f3_title: string; f3_desc: string; f4_title: string; f4_desc: string;
  stats_farms: string; stats_resources: string; stats_uptime: string; stats_languages: string;
  how_title: string;
  step1_title: string; step1_desc: string; step2_title: string; step2_desc: string;
  step3_title: string; step3_desc: string;
  pricing_title: string;
  pricing_free_title: string; pricing_free_price: string;
  pricing_free_f1: string; pricing_free_f2: string; pricing_free_f3: string; pricing_free_cta: string;
  pricing_pro_title: string; pricing_pro_price: string; pricing_pro_per: string;
  pricing_pro_f1: string; pricing_pro_f2: string; pricing_pro_f3: string;
  pricing_pro_f4: string; pricing_pro_f5: string; pricing_pro_cta: string;
  popular: string; footer_text: string;
}> = {
  ar: {
    hero_title: 'VRBOT',
    hero_subtitle: '\u0628\u0648\u062a \u0623\u062a\u0645\u062a\u0629 \u0630\u0643\u064a \u0644\u0640 Viking Rise',
    hero_desc: '\u0623\u062f\u0650\u0631 \u0645\u0632\u0627\u0631\u0639\u0643\u060c \u0627\u062c\u0645\u0639 \u0627\u0644\u0645\u0648\u0627\u0631\u062f\u060c \u0648\u0637\u0648\u0651\u0631 \u062d\u0633\u0627\u0628\u0643 \u2014 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0639\u0644\u0649 \u0645\u062f\u0627\u0631 \u0627\u0644\u0633\u0627\u0639\u0629. \u0628\u062f\u0648\u0646 \u062a\u062f\u062e\u0644 \u064a\u062f\u0648\u064a.',
    cta_early: '\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b', cta_pricing: '\u0639\u0631\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631',
    features_title: '\u0644\u0645\u0627\u0630\u0627 VRBOT\u061f',
    f1_title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0632\u0627\u0631\u0639 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b', f1_desc: '\u062c\u0645\u0639 \u0627\u0644\u0645\u0648\u0627\u0631\u062f\u060c \u0627\u0644\u062a\u0631\u0642\u064a\u0629\u060c \u0648\u0627\u0644\u062d\u0635\u0627\u062f \u0628\u0634\u0643\u0644 \u0645\u0633\u062a\u0645\u0631 \u0628\u062f\u0648\u0646 \u0623\u064a \u062a\u062f\u062e\u0644.',
    f2_title: '\u062d\u0645\u0627\u064a\u0629 \u0630\u0643\u064a\u0629', f2_desc: '\u0646\u0638\u0627\u0645 \u0645\u062d\u0627\u0643\u0627\u0629 \u0633\u0644\u0648\u0643 \u0628\u0634\u0631\u064a \u0645\u062a\u0642\u062f\u0645 \u0644\u062d\u0645\u0627\u064a\u0629 \u062d\u0633\u0627\u0628\u0643 \u0645\u0646 \u0627\u0644\u062d\u0638\u0631.',
    f3_title: '\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0645\u0628\u0627\u0634\u0631\u0629', f3_desc: '\u062a\u0627\u0628\u0639 \u062d\u0627\u0644\u0629 \u0645\u0632\u0627\u0631\u0639\u0643 \u0648\u0645\u0648\u0627\u0631\u062f\u0643 \u0641\u064a \u0627\u0644\u0648\u0642\u062a \u0627\u0644\u062d\u0642\u064a\u0642\u064a \u0645\u0646 \u0623\u064a \u0645\u0643\u0627\u0646.',
    f4_title: '\u0645\u062a\u0639\u062f\u062f \u0627\u0644\u0644\u063a\u0627\u062a', f4_desc: '\u0648\u0627\u062c\u0647\u0629 \u062a\u062f\u0639\u0645 \u0627\u0644\u0639\u0631\u0628\u064a\u0629\u060c \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629\u060c \u0627\u0644\u0631\u0648\u0633\u064a\u0629\u060c \u0648\u0627\u0644\u0635\u064a\u0646\u064a\u0629.',
    stats_farms: '\u0645\u0632\u0631\u0639\u0629 \u0646\u0634\u0637\u0629', stats_resources: '\u0645\u0648\u0627\u0631\u062f \u0645\u064f\u062c\u0645\u0651\u0639\u0629', stats_uptime: '\u0648\u0642\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644', stats_languages: '\u0644\u063a\u0627\u062a \u0645\u062f\u0639\u0648\u0645\u0629',
    how_title: '\u0643\u064a\u0641 \u064a\u0639\u0645\u0644\u061f',
    step1_title: '1. \u0633\u062c\u0651\u0644 \u062d\u0633\u0627\u0628\u0643', step1_desc: '\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628 \u0645\u062c\u0627\u0646\u064a \u0648\u0623\u0636\u0641 \u0645\u0632\u0631\u0639\u062a\u0643 \u0627\u0644\u0623\u0648\u0644\u0649 \u062e\u0644\u0627\u0644 \u062f\u0642\u0627\u0626\u0642.',
    step2_title: '2. \u0641\u0639\u0651\u0644 \u0627\u0644\u0628\u0648\u062a', step2_desc: '\u0627\u062e\u062a\u0631 \u0625\u0639\u062f\u0627\u062f\u0627\u062a\u0643 \u0648\u0634\u063a\u0651\u0644 \u0627\u0644\u0628\u0648\u062a \u0628\u0636\u063a\u0637\u0629 \u0648\u0627\u062d\u062f\u0629.',
    step3_title: '3. \u0627\u0633\u062a\u0645\u062a\u0639 \u0628\u0627\u0644\u0646\u062a\u0627\u0626\u062c', step3_desc: '\u062a\u0627\u0628\u0639 \u062a\u0642\u062f\u0645\u0643 \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645 \u0628\u064a\u0646\u0645\u0627 \u0627\u0644\u0628\u0648\u062a \u064a\u0639\u0645\u0644 \u0644\u0623\u062c\u0644\u0643.',
    pricing_title: '\u062e\u0637\u0637 \u0627\u0644\u0623\u0633\u0639\u0627\u0631',
    pricing_free_title: '\u0645\u062c\u0627\u0646\u064a', pricing_free_price: '$0',
    pricing_free_f1: '\u0645\u0632\u0631\u0639\u0629 \u0648\u0627\u062d\u062f\u0629', pricing_free_f2: '\u062c\u0645\u0639 \u0645\u0648\u0627\u0631\u062f \u0623\u0633\u0627\u0633\u064a', pricing_free_f3: '\u062a\u062c\u0631\u0628\u0629 7 \u0623\u064a\u0627\u0645', pricing_free_cta: '\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b',
    pricing_pro_title: '\u0627\u062d\u062a\u0631\u0627\u0641\u064a', pricing_pro_price: '$2', pricing_pro_per: '/ \u0645\u0632\u0631\u0639\u0629 / \u0634\u0647\u0631\u064a\u0627\u064b',
    pricing_pro_f1: '\u0645\u0632\u0627\u0631\u0639 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f\u0629', pricing_pro_f2: '\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u0622\u0644\u064a\u0629',
    pricing_pro_f3: '\u062d\u0645\u0627\u064a\u0629 \u0645\u062a\u0642\u062f\u0645\u0629 \u0636\u062f \u0627\u0644\u062d\u0638\u0631', pricing_pro_f4: '\u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0645\u062a\u0642\u062f\u0645\u0629',
    pricing_pro_f5: '\u0623\u0648\u0644\u0648\u064a\u0629 \u0627\u0644\u062f\u0639\u0645', pricing_pro_cta: '\u0627\u0634\u062a\u0631\u0643 \u0627\u0644\u0622\u0646',
    popular: '\u0627\u0644\u0623\u0643\u062b\u0631 \u0637\u0644\u0628\u0627\u064b', footer_text: '\u00a9 2026 VRBOT. \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.',
  },
  en: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Smart Automation Bot for Viking Rise',
    hero_desc: 'Manage your farms, collect resources, and grow your account \u2014 automatically 24/7. No manual effort needed.',
    cta_early: 'Start Free', cta_pricing: 'View Pricing',
    features_title: 'Why VRBOT?',
    f1_title: 'Auto Farm Management', f1_desc: 'Collect resources, upgrade, and harvest continuously without any intervention.',
    f2_title: 'Smart Protection', f2_desc: 'Advanced human behavior simulation to keep your account safe from bans.',
    f3_title: 'Live Dashboard', f3_desc: 'Monitor your farms and resources in real-time from anywhere.',
    f4_title: 'Multi-Language', f4_desc: 'Interface supports Arabic, English, Russian, and Chinese.',
    stats_farms: 'Active Farms', stats_resources: 'Resources Collected', stats_uptime: 'Uptime', stats_languages: 'Languages',
    how_title: 'How It Works',
    step1_title: '1. Create Account', step1_desc: 'Sign up free and add your first farm in minutes.',
    step2_title: '2. Activate Bot', step2_desc: 'Choose your settings and start the bot with one click.',
    step3_title: '3. Enjoy Results', step3_desc: 'Track progress from your dashboard while the bot works for you.',
    pricing_title: 'Pricing Plans',
    pricing_free_title: 'Free', pricing_free_price: '$0',
    pricing_free_f1: '1 Farm', pricing_free_f2: 'Basic resource collection', pricing_free_f3: '7-day trial', pricing_free_cta: 'Start Free',
    pricing_pro_title: 'Pro', pricing_pro_price: '$2', pricing_pro_per: '/ farm / month',
    pricing_pro_f1: 'Unlimited farms', pricing_pro_f2: 'All automated tasks',
    pricing_pro_f3: 'Advanced ban protection', pricing_pro_f4: 'Advanced dashboard',
    pricing_pro_f5: 'Priority support', pricing_pro_cta: 'Subscribe Now',
    popular: 'POPULAR', footer_text: '\u00a9 2026 VRBOT. All rights reserved.',
  },
  ru: {
    hero_title: 'VRBOT',
    hero_subtitle: '\u0423\u043c\u043d\u044b\u0439 \u0431\u043e\u0442 \u0434\u043b\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438 Viking Rise',
    hero_desc: '\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0444\u0435\u0440\u043c\u0430\u043c\u0438, \u0441\u043e\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0440\u0435\u0441\u0443\u0440\u0441\u044b \u0438 \u0440\u0430\u0437\u0432\u0438\u0432\u0430\u0439\u0442\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u2014 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438 24/7.',
    cta_early: '\u041d\u0430\u0447\u0430\u0442\u044c \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e', cta_pricing: '\u0422\u0430\u0440\u0438\u0444\u044b',
    features_title: '\u041f\u043e\u0447\u0435\u043c\u0443 VRBOT?',
    f1_title: '\u0410\u0432\u0442\u043e-\u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0444\u0435\u0440\u043c\u0430\u043c\u0438', f1_desc: '\u0421\u0431\u043e\u0440 \u0440\u0435\u0441\u0443\u0440\u0441\u043e\u0432, \u0443\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u044f \u0438 \u0443\u0440\u043e\u0436\u0430\u0439 \u043d\u0435\u043f\u0440\u0435\u0440\u044b\u0432\u043d\u043e.',
    f2_title: '\u0423\u043c\u043d\u0430\u044f \u0437\u0430\u0449\u0438\u0442\u0430', f2_desc: '\u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u0430\u044f \u0438\u043c\u0438\u0442\u0430\u0446\u0438\u044f \u043f\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u0434\u043b\u044f \u0437\u0430\u0449\u0438\u0442\u044b \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430.',
    f3_title: '\u041f\u0430\u043d\u0435\u043b\u044c \u0432 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u043c \u0432\u0440\u0435\u043c\u0435\u043d\u0438', f3_desc: '\u041e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u0439\u0442\u0435 \u0444\u0435\u0440\u043c\u044b \u0438 \u0440\u0435\u0441\u0443\u0440\u0441\u044b \u0438\u0437 \u043b\u044e\u0431\u043e\u0433\u043e \u043c\u0435\u0441\u0442\u0430.',
    f4_title: '\u041c\u043d\u043e\u0433\u043e\u044f\u0437\u044b\u0447\u043d\u043e\u0441\u0442\u044c', f4_desc: '\u0418\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 4 \u044f\u0437\u044b\u043a\u0430.',
    stats_farms: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0444\u0435\u0440\u043c', stats_resources: '\u0421\u043e\u0431\u0440\u0430\u043d\u043e \u0440\u0435\u0441\u0443\u0440\u0441\u043e\u0432', stats_uptime: '\u0412\u0440\u0435\u043c\u044f \u0440\u0430\u0431\u043e\u0442\u044b', stats_languages: '\u042f\u0437\u044b\u043a\u043e\u0432',
    how_title: '\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
    step1_title: '1. \u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442', step1_desc: '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e \u0437\u0430 \u043c\u0438\u043d\u0443\u0442\u044b.',
    step2_title: '2. \u0410\u043a\u0442\u0438\u0432\u0438\u0440\u0443\u0439\u0442\u0435 \u0431\u043e\u0442\u0430', step2_desc: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0438 \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u043e\u0434\u043d\u0438\u043c \u043d\u0430\u0436\u0430\u0442\u0438\u0435\u043c.',
    step3_title: '3. \u041d\u0430\u0441\u043b\u0430\u0436\u0434\u0430\u0439\u0442\u0435\u0441\u044c', step3_desc: '\u0421\u043b\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u043e\u043c \u0438\u0437 \u043f\u0430\u043d\u0435\u043b\u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f.',
    pricing_title: '\u0422\u0430\u0440\u0438\u0444\u043d\u044b\u0435 \u043f\u043b\u0430\u043d\u044b',
    pricing_free_title: '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439', pricing_free_price: '$0',
    pricing_free_f1: '1 \u0444\u0435\u0440\u043c\u0430', pricing_free_f2: '\u0411\u0430\u0437\u043e\u0432\u044b\u0439 \u0441\u0431\u043e\u0440', pricing_free_f3: '7 \u0434\u043d\u0435\u0439 \u043f\u0440\u043e\u0431\u043d\u043e\u0433\u043e', pricing_free_cta: '\u041d\u0430\u0447\u0430\u0442\u044c',
    pricing_pro_title: '\u041f\u0440\u043e', pricing_pro_price: '$2', pricing_pro_per: '/ \u0444\u0435\u0440\u043c\u0430 / \u043c\u0435\u0441\u044f\u0446',
    pricing_pro_f1: '\u0411\u0435\u0437\u043b\u0438\u043c\u0438\u0442\u043d\u044b\u0435 \u0444\u0435\u0440\u043c\u044b', pricing_pro_f2: '\u0412\u0441\u0435 \u0437\u0430\u0434\u0430\u0447\u0438',
    pricing_pro_f3: '\u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u0430\u044f \u0437\u0430\u0449\u0438\u0442\u0430', pricing_pro_f4: '\u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u0430\u044f \u043f\u0430\u043d\u0435\u043b\u044c',
    pricing_pro_f5: '\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430', pricing_pro_cta: '\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f',
    popular: '\u041f\u041e\u041f\u0423\u041b\u042f\u0420\u041d\u042b\u0419', footer_text: '\u00a9 2026 VRBOT. \u0412\u0441\u0435 \u043f\u0440\u0430\u0432\u0430 \u0437\u0430\u0449\u0438\u0449\u0435\u043d\u044b.',
  },
  zh: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Viking Rise \u667a\u80fd\u81ea\u52a8\u5316\u673a\u5668\u4eba',
    hero_desc: '\u7ba1\u7406\u519c\u573a\u3001\u6536\u96c6\u8d44\u6e90\u3001\u5347\u7ea7\u8d26\u53f7 \u2014 \u5168\u5929\u5019\u81ea\u52a8\u8fd0\u884c\u3002',
    cta_early: '\u514d\u8d39\u5f00\u59cb', cta_pricing: '\u67e5\u770b\u4ef7\u683c',
    features_title: '\u4e3a\u4ec0\u4e48\u9009\u62e9 VRBOT\uff1f',
    f1_title: '\u81ea\u52a8\u519c\u573a\u7ba1\u7406', f1_desc: '\u6301\u7eed\u6536\u96c6\u8d44\u6e90\u3001\u5347\u7ea7\u548c\u6536\u83b7\u3002',
    f2_title: '\u667a\u80fd\u4fdd\u62a4', f2_desc: '\u9ad8\u7ea7\u4eba\u7c7b\u884c\u4e3a\u6a21\u62df\u4fdd\u62a4\u8d26\u53f7\u3002',
    f3_title: '\u5b9e\u65f6\u4eea\u8868\u677f', f3_desc: '\u968f\u65f6\u968f\u5730\u76d1\u63a7\u519c\u573a\u548c\u8d44\u6e90\u3002',
    f4_title: '\u591a\u8bed\u8a00\u652f\u6301', f4_desc: '\u754c\u9762\u652f\u63014\u79cd\u8bed\u8a00\u3002',
    stats_farms: '\u6d3b\u8dc3\u519c\u573a', stats_resources: '\u5df2\u6536\u96c6\u8d44\u6e90', stats_uptime: '\u8fd0\u884c\u65f6\u95f4', stats_languages: '\u79cd\u8bed\u8a00',
    how_title: '\u5982\u4f55\u8fd0\u4f5c',
    step1_title: '1. \u521b\u5efa\u8d26\u53f7', step1_desc: '\u514d\u8d39\u6ce8\u518c\uff0c\u51e0\u5206\u949f\u5185\u6dfb\u52a0\u519c\u573a\u3002',
    step2_title: '2. \u6fc0\u6d3b\u673a\u5668\u4eba', step2_desc: '\u9009\u62e9\u8bbe\u7f6e\uff0c\u4e00\u952e\u542f\u52a8\u3002',
    step3_title: '3. \u4eab\u53d7\u6210\u679c', step3_desc: '\u5728\u4eea\u8868\u677f\u4e0a\u8ddf\u8e2a\u8fdb\u5ea6\u3002',
    pricing_title: '\u4ef7\u683c\u65b9\u6848',
    pricing_free_title: '\u514d\u8d39\u7248', pricing_free_price: '$0',
    pricing_free_f1: '1\u4e2a\u519c\u573a', pricing_free_f2: '\u57fa\u7840\u8d44\u6e90\u6536\u96c6', pricing_free_f3: '7\u5929\u8bd5\u7528', pricing_free_cta: '\u514d\u8d39\u5f00\u59cb',
    pricing_pro_title: '\u4e13\u4e1a\u7248', pricing_pro_price: '$2', pricing_pro_per: '/ \u519c\u573a / \u6708',
    pricing_pro_f1: '\u65e0\u9650\u519c\u573a', pricing_pro_f2: '\u6240\u6709\u81ea\u52a8\u5316\u4efb\u52a1',
    pricing_pro_f3: '\u9ad8\u7ea7\u9632\u5c01\u4fdd\u62a4', pricing_pro_f4: '\u9ad8\u7ea7\u4eea\u8868\u677f',
    pricing_pro_f5: '\u4f18\u5148\u652f\u6301', pricing_pro_cta: '\u7acb\u5373\u8ba2\u9605',
    popular: '\u70ed\u95e8', footer_text: '\u00a9 2026 VRBOT. \u4fdd\u7559\u6240\u6709\u6743\u5229\u3002',
  },
};

/* ============ Animated Counter ============ */
function AnimatedCounter({ target, suffix }: { target: string; suffix: string }) {
  const [count, setCount] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const numericPart = target.replace(/[^0-9.]/g, '');
        const num = parseFloat(numericPart);
        const prefix = target.replace(numericPart, '');
        const duration = 2000;
        const steps = 60;
        const increment = num / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= num) {
            current = num;
            clearInterval(timer);
          }
          const formatted = num >= 1000 ? Math.floor(current).toLocaleString() : Number.isInteger(num) ? Math.floor(current).toString() : current.toFixed(1);
          setCount(prefix + formatted);
        }, duration / steps);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} style={{ fontSize: '42px', fontWeight: 900, marginBottom: '6px' }}>
      <span className="vr-gradient-text">{count}</span>
      <span style={{ fontSize: '20px', opacity: 0.5 }}>{suffix}</span>
    </div>
  );
}

/* ============ Reveal on Scroll ============ */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ============ Main Page ============ */
export default function HomePage() {
  const [lang, setLang] = useState<Language>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && content[saved]) setLang(saved);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const t = content[lang];
  const isRtl = lang === 'ar';

  const featureIcons = [
    { icon: '\u2699\uFE0F', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { icon: '\uD83D\uDEE1\uFE0F', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { icon: '\uD83D\uDCCA', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    { icon: '\uD83C\uDF10', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="vr-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap');

        .vr-page {
          font-family: ${lang === 'ar' ? "'Tajawal'" : "'Outfit'"}, sans-serif !important;
          overflow-x: hidden;
        }
        .vr-page *, .vr-page h1, .vr-page h2, .vr-page h3, .vr-page p, .vr-page span, .vr-page a, .vr-page div {
          font-family: ${lang === 'ar' ? "'Tajawal'" : "'Outfit'"}, sans-serif !important;
        }

        .vr-gradient-text {
          background: linear-gradient(135deg, #a78bfa, #818cf8, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .vr-hero-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.3;
          animation: vr-pulse 6s ease-in-out infinite alternate;
        }

        @keyframes vr-pulse {
          0% { opacity: 0.2; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(1.15); }
        }

        @keyframes vr-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }

        @keyframes vr-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .vr-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 36px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .vr-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, transparent, rgba(167,139,250,0.2), transparent);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          opacity: 0;
          transition: opacity 0.4s;
        }
        .vr-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(99,102,241,0.15);
          border-color: rgba(167,139,250,0.3);
        }
        .vr-card:hover::before { opacity: 1; }

        .vr-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          padding: 16px 40px;
          border-radius: 14px;
          text-decoration: none;
          font-size: 17px;
          font-weight: 700;
          box-shadow: 0 4px 30px rgba(124,58,237,0.4);
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }
        .vr-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(124,58,237,0.5);
        }
        .vr-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%;
          animation: vr-shimmer 3s infinite;
        }

        .vr-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          color: #fff;
          padding: 16px 40px;
          border-radius: 14px;
          text-decoration: none;
          font-size: 17px;
          font-weight: 700;
          border: 1.5px solid rgba(255,255,255,0.15);
          transition: all 0.3s;
          backdrop-filter: blur(10px);
        }
        .vr-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(167,139,250,0.5);
          transform: translateY(-2px);
        }

        .vr-step-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin: 0 auto 20px;
          position: relative;
        }
        .vr-step-circle::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #6366f1, #a855f7);
          z-index: -1;
          opacity: 0.5;
          filter: blur(12px);
        }

        .vr-pricing-pro {
          position: relative;
          background: linear-gradient(160deg, rgba(124,58,237,0.12), rgba(99,102,241,0.06));
          border: 2px solid rgba(124,58,237,0.35);
          box-shadow: 0 8px 50px rgba(124,58,237,0.12);
        }
        .vr-pricing-pro:hover {
          border-color: rgba(124,58,237,0.6);
          box-shadow: 0 20px 70px rgba(124,58,237,0.2);
        }

        @keyframes vr-grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
      `}</style>

      {/* ============ HERO ============ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#08071b',
        overflow: 'hidden',
      }}>
        {/* Ambient glow orbs */}
        <div className="vr-hero-glow" style={{ top: '-10%', left: '-5%', background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="vr-hero-glow" style={{ bottom: '-15%', right: '-5%', background: 'radial-gradient(circle, #2563eb, transparent)', animationDelay: '3s' }} />
        <div className="vr-hero-glow" style={{ top: '40%', left: '50%', width: '300px', height: '300px', background: 'radial-gradient(circle, #a855f7, transparent)', animationDelay: '1.5s' }} />

        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          animation: 'vr-grid-move 8s linear infinite',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px 24px', maxWidth: '850px' }}>
          {/* Animated robot icon */}
          <div style={{
            fontSize: '90px', marginBottom: '24px',
            animation: 'vr-float 4s ease-in-out infinite',
            filter: 'drop-shadow(0 0 40px rgba(167,139,250,0.5))',
          }}>
            {'\uD83E\uDD16'}
          </div>

          <h1 style={{
            fontSize: 'clamp(56px, 10vw, 96px)',
            fontWeight: 900, letterSpacing: '8px', marginBottom: '16px', lineHeight: 1,
          }}>
            <span className="vr-gradient-text">{t.hero_title}</span>
          </h1>

          <p style={{
            fontSize: 'clamp(18px, 3vw, 28px)',
            color: '#c4b5fd', fontWeight: 600, marginBottom: '20px',
          }}>
            {t.hero_subtitle}
          </p>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(255,255,255,0.55)', lineHeight: 1.9,
            maxWidth: '600px', margin: '0 auto 44px',
          }}>
            {t.hero_desc}
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/early-access" className="vr-btn-primary">
              {'\uD83D\uDE80'} {t.cta_early}
            </a>
            <a href="#pricing" className="vr-btn-secondary">
              {'\uD83D\uDCB0'} {t.cta_pricing}
            </a>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section style={{
        background: 'linear-gradient(90deg, #0c0a2a, #130f3a, #0c0a2a)',
        padding: '48px 24px',
        display: 'flex', justifyContent: 'center', gap: '64px', flexWrap: 'wrap',
        borderTop: '1px solid rgba(167,139,250,0.1)',
        borderBottom: '1px solid rgba(167,139,250,0.1)',
      }}>
        {[
          { num: '500', suffix: '+', label: t.stats_farms },
          { num: '68', suffix: 'M+', label: t.stats_resources },
          { num: '99.9', suffix: '%', label: t.stats_uptime },
          { num: '4', suffix: '', label: t.stats_languages },
        ].map((stat, i) => (
          <Reveal key={i} delay={i * 100}>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <AnimatedCounter target={stat.num} suffix={stat.suffix} />
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ============ FEATURES ============ */}
      <section style={{ background: '#08071b', padding: '100px 24px' }}>
        <Reveal>
          <h2 style={{
            fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, textAlign: 'center', marginBottom: '64px', color: '#fff',
          }}>
            {'\u26A1'} <span className="vr-gradient-text">{t.features_title}</span>
          </h2>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px', maxWidth: '1100px', margin: '0 auto',
        }}>
          {[
            { title: t.f1_title, desc: t.f1_desc },
            { title: t.f2_title, desc: t.f2_desc },
            { title: t.f3_title, desc: t.f3_desc },
            { title: t.f4_title, desc: t.f4_desc },
          ].map((f, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="vr-card">
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: featureIcons[i].bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', marginBottom: '20px',
                }}>
                  {featureIcons[i].icon}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{f.title}</h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section style={{ background: 'linear-gradient(180deg, #08071b, #0e0d28)', padding: '100px 24px' }}>
        <Reveal>
          <h2 style={{
            fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, textAlign: 'center', marginBottom: '64px', color: '#fff',
          }}>
            {'\uD83C\uDFAF'} <span className="vr-gradient-text">{t.how_title}</span>
          </h2>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '40px', maxWidth: '900px', margin: '0 auto',
        }}>
          {[
            { title: t.step1_title, desc: t.step1_desc, icon: '\uD83D\uDCDD', gradient: 'linear-gradient(135deg, #7c3aed, #6366f1)' },
            { title: t.step2_title, desc: t.step2_desc, icon: '\u26A1', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
            { title: t.step3_title, desc: t.step3_desc, icon: '\uD83C\uDFC6', gradient: 'linear-gradient(135deg, #22c55e, #10b981)' },
          ].map((step, i) => (
            <Reveal key={i} delay={i * 150}>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="vr-step-circle" style={{ background: step.gradient }}>
                  {step.icon}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={{ background: '#08071b', padding: '100px 24px' }}>
        <Reveal>
          <h2 style={{
            fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, textAlign: 'center', marginBottom: '64px', color: '#fff',
          }}>
            {'\uD83D\uDC8E'} <span className="vr-gradient-text">{t.pricing_title}</span>
          </h2>
        </Reveal>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '28px', maxWidth: '750px', margin: '0 auto',
        }}>
          {/* Free */}
          <Reveal delay={0}>
            <div className="vr-card" style={{ textAlign: 'center', padding: '44px 32px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa', marginBottom: '12px' }}>{t.pricing_free_title}</h3>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#fff', marginBottom: '28px' }}>{t.pricing_free_price}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', textAlign: isRtl ? 'right' : 'left' }}>
                {[t.pricing_free_f1, t.pricing_free_f2, t.pricing_free_f3].map((f, i) => (
                  <span key={i} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#22c55e', fontSize: '16px' }}>{'\u2713'}</span> {f}
                  </span>
                ))}
              </div>
              <a href="/signup" className="vr-btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                {t.pricing_free_cta}
              </a>
            </div>
          </Reveal>

          {/* Pro */}
          <Reveal delay={150}>
            <div className="vr-card vr-pricing-pro" style={{ textAlign: 'center', padding: '44px 32px' }}>
              <div style={{
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff',
                padding: '5px 24px', borderRadius: '20px', fontSize: '12px', fontWeight: 800,
                letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                {'\u2B50'} {t.popular}
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#c4b5fd', marginBottom: '12px' }}>{t.pricing_pro_title}</h3>
              <div style={{ fontSize: '52px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{t.pricing_pro_price}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '28px' }}>{t.pricing_pro_per}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', textAlign: isRtl ? 'right' : 'left' }}>
                {[t.pricing_pro_f1, t.pricing_pro_f2, t.pricing_pro_f3, t.pricing_pro_f4, t.pricing_pro_f5].map((f, i) => (
                  <span key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#a78bfa', fontSize: '16px' }}>{'\u2713'}</span> {f}
                  </span>
                ))}
              </div>
              <a href="/billing" className="vr-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                {t.pricing_pro_cta}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{
        background: '#050414',
        padding: '36px 24px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', margin: 0 }}>{t.footer_text}</p>
      </footer>
    </div>
  );
}
