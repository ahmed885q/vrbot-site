'use client';

import { useState, useEffect, useRef } from 'react';

type Language = 'ar' | 'en' | 'ru' | 'zh';

const content: Record<Language, {
  hero_title: string; hero_subtitle: string; hero_desc: string;
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
  faq_title: string;
  faq1_q: string; faq1_a: string;
  faq2_q: string; faq2_a: string;
  faq3_q: string; faq3_a: string;
  cta_final_title: string; cta_final_desc: string; cta_final_btn: string;
  footer_text: string;
}> = {
  ar: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Ø£ØªÙ…ØªØ© Viking Rise Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ',
    hero_desc: 'Ø£Ø¯ÙØ± Ù…Ø²Ø§Ø±Ø¹ÙƒØŒ Ø§Ø¬Ù…Ø¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ØŒ Ø·ÙˆÙ‘Ø± Ù‚Ù„Ø¹ØªÙƒ ÙˆÙ‡Ø§Ø¬Ù… Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ â€” ÙƒÙ„ Ø´ÙŠØ¡ ÙŠØ¹Ù…Ù„ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù„Ù‰ Ù…Ø¯Ø§Ø± Ø§Ù„Ø³Ø§Ø¹Ø© Ø¨Ø°ÙƒØ§Ø¡ Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ù…ØªÙ‚Ø¯Ù….',
    cta_start: 'Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ø§Ù‹',
    cta_pricing: 'Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø³Ø¹Ø§Ø±',
    trusted: 'ÙŠØ«Ù‚ Ø¨Ù‡ Ø£ÙƒØ«Ø± Ù…Ù† 500 Ù„Ø§Ø¹Ø¨ Ø­ÙˆÙ„ Ø§Ù„Ø¹Ø§Ù„Ù…',
    features_title: 'ÙƒÙ„ Ù…Ø§ ØªØ­ØªØ§Ø¬Ù‡ ÙÙŠ Ø¨ÙˆØª ÙˆØ§Ø­Ø¯',
    features_subtitle: '37 Ù…Ù‡Ù…Ø© Ø¢Ù„ÙŠØ© ØªØºØ·ÙŠ ÙƒÙ„ Ø¬Ø§Ù†Ø¨ Ù…Ù† Ø§Ù„Ù„Ø¹Ø¨Ø©',
    f1_title: 'Ø¬Ù…Ø¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯',
    f1_desc: 'Ø¥Ø±Ø³Ø§Ù„ Ù…Ø³ÙŠØ±Ø§Øª Ø¬Ù…Ø¹ ØªÙ„Ù‚Ø§Ø¦ÙŠØ© Ù…Ø¹ Ø¥Ø¯Ø§Ø±Ø© Ø°ÙƒÙŠØ© Ù„Ù„Ù‚ÙˆØ§Øª ÙˆØ§Ù„Ø£ÙˆÙ‚Ø§Øª.',
    f2_title: 'Ø¨Ù†Ø§Ø¡ ÙˆØªØ·ÙˆÙŠØ±',
    f2_desc: 'ØªØ±Ù‚ÙŠØ© Ø§Ù„Ù…Ø¨Ø§Ù†ÙŠ ÙˆØ§Ù„Ø£Ø¨Ø­Ø§Ø« ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù…Ø¹ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ§Øª Ø§Ù„Ø°ÙƒÙŠ.',
    f3_title: 'Ù‚ØªÙ„ Ø§Ù„ÙˆØ­ÙˆØ´',
    f3_desc: 'ØµÙŠØ¯ Niflung ÙˆØ§Ù„ÙˆØ­ÙˆØ´ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ù…Ø¹ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨.',
    f4_title: 'Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø­Ø¸Ø±',
    f4_desc: 'Ù…Ø­Ø§ÙƒØ§Ø© Ø³Ù„ÙˆÙƒ Ø¨Ø´Ø±ÙŠ Ù…ØªÙ‚Ø¯Ù… Ù…Ø¹ ØªØ£Ø®ÙŠØ±Ø§Øª Ø¹Ø´ÙˆØ§Ø¦ÙŠØ© ÙˆØ­Ø±ÙƒØ§Øª Ø·Ø¨ÙŠØ¹ÙŠØ©.',
    f5_title: 'Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ù…Ø¨Ø§Ø´Ø±Ø©',
    f5_desc: 'ØªØ§Ø¨Ø¹ Ø¬Ù…ÙŠØ¹ Ù…Ø²Ø§Ø±Ø¹Ùƒ ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ Ù…Ù† Ø§Ù„Ù…ØªØµÙØ­ Ø£Ùˆ Ø§Ù„Ù‡Ø§ØªÙ.',
    f6_title: 'Ø¯Ø¹Ù… Ø³Ø­Ø§Ø¨ÙŠ',
    f6_desc: 'Ø´ØºÙ‘Ù„ Ø§Ù„Ø¨ÙˆØª Ø¹Ù„Ù‰ Ø³ÙŠØ±ÙØ±Ø§ØªÙ†Ø§ Ø§Ù„Ø³Ø­Ø§Ø¨ÙŠØ© Ø¨Ø¯ÙˆÙ† Ø§Ù„Ø­Ø§Ø¬Ø© Ù„Ø¬Ù‡Ø§Ø² ÙƒÙ…Ø¨ÙŠÙˆØªØ±.',
    stats_farms: 'Ù…Ø²Ø±Ø¹Ø© Ù†Ø´Ø·Ø©',
    stats_tasks: 'Ù…Ù‡Ù…Ø© Ø¢Ù„ÙŠØ©',
    stats_uptime: 'ÙˆÙ‚Øª Ø§Ù„ØªØ´ØºÙŠÙ„',
    stats_languages: 'Ù„ØºØ§Øª Ù…Ø¯Ø¹ÙˆÙ…Ø©',
    how_title: 'Ø§Ø¨Ø¯Ø£ ÙÙŠ 3 Ø®Ø·ÙˆØ§Øª',
    how_subtitle: 'Ø¥Ø¹Ø¯Ø§Ø¯ Ø³Ù‡Ù„ ÙˆØ³Ø±ÙŠØ¹ â€” Ø´ØºÙ‘Ù„ Ø§Ù„Ø¨ÙˆØª Ø®Ù„Ø§Ù„ Ø¯Ù‚Ø§Ø¦Ù‚',
    step1_title: 'Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨Ùƒ',
    step1_desc: 'Ø³Ø¬Ù‘Ù„ Ù…Ø¬Ø§Ù†Ø§Ù‹ ÙˆØ£Ø¶Ù Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ù…Ø²Ø±Ø¹ØªÙƒ Ø§Ù„Ø£ÙˆÙ„Ù‰.',
    step2_title: 'Ø§Ø®ØªØ± Ø§Ù„Ù…Ù‡Ø§Ù…',
    step2_desc: 'Ø­Ø¯Ø¯ Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù„ÙŠ ØªØ¨ÙŠ Ø§Ù„Ø¨ÙˆØª ÙŠØ´ØºÙ‘Ù„Ù‡Ø§ Ù…Ù† 37 Ù…Ù‡Ù…Ø© Ù…ØªØ§Ø­Ø©.',
    step3_title: 'Ø´ØºÙ‘Ù„ ÙˆØ§Ø³ØªØ±Ø®Ù',
    step3_desc: 'Ø§Ù„Ø¨ÙˆØª ÙŠØ´ØªØºÙ„ 24/7 ÙˆØ£Ù†Øª ØªØªØ§Ø¨Ø¹ Ø§Ù„Ù†ØªØ§Ø¦Ø¬ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ….',
    pricing_title: 'Ø®Ø·Ø· Ø¨Ø³ÙŠØ·Ø© ÙˆØ´ÙØ§ÙØ©',
    pricing_subtitle: 'Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ø§Ù‹ â€” ØªØ±Ù‚Ù‘Ù‰ Ù…ØªÙ‰ Ù…Ø§ ØªØ¨ÙŠ',
    pricing_free_title: 'Ù…Ø¬Ø§Ù†ÙŠ',
    pricing_free_desc: 'Ù„Ù„ØªØ¬Ø±Ø¨Ø©',
    pricing_free_f1: 'Ù…Ø²Ø±Ø¹Ø© ÙˆØ§Ø­Ø¯Ø©',
    pricing_free_f2: 'Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©',
    pricing_free_f3: 'ØªØ¬Ø±Ø¨Ø© 7 Ø£ÙŠØ§Ù…',
    pricing_free_cta: 'Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ø§Ù‹',
    pricing_pro_badge: 'Ø§Ù„Ø£ÙƒØ«Ø± Ø·Ù„Ø¨Ø§Ù‹',
    pricing_pro_title: 'Ø§Ø­ØªØ±Ø§ÙÙŠ',
    pricing_pro_desc: 'Ù„Ù„Ø§Ø¹Ø¨ÙŠÙ† Ø§Ù„Ø¬Ø§Ø¯ÙŠÙ†',
    pricing_pro_f1: 'Ù…Ø²Ø§Ø±Ø¹ ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©',
    pricing_pro_f2: 'Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù€ 37 Ù…Ù‡Ù…Ø©',
    pricing_pro_f3: 'Ø­Ù…Ø§ÙŠØ© Ù…ØªÙ‚Ø¯Ù…Ø©',
    pricing_pro_f4: 'Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ù…ØªÙ‚Ø¯Ù…Ø©',
    pricing_pro_f5: 'Ø£ÙˆÙ„ÙˆÙŠØ© Ø§Ù„Ø¯Ø¹Ù…',
    pricing_pro_cta: 'Ø§Ø´ØªØ±Ùƒ Ø§Ù„Ø¢Ù†',
    pricing_per: '/ Ù…Ø²Ø±Ø¹Ø© / Ø´Ù‡Ø±ÙŠØ§Ù‹',
    faq_title: 'Ø£Ø³Ø¦Ù„Ø© Ø´Ø§Ø¦Ø¹Ø©',
    faq1_q: 'Ù‡Ù„ Ø­Ø³Ø§Ø¨ÙŠ Ø¢Ù…Ù† Ù…Ù† Ø§Ù„Ø­Ø¸Ø±ØŸ',
    faq1_a: 'Ù†Ø³ØªØ®Ø¯Ù… ØªÙ‚Ù†ÙŠØ§Øª Ù…Ø­Ø§ÙƒØ§Ø© Ø³Ù„ÙˆÙƒ Ø¨Ø´Ø±ÙŠ Ù…ØªÙ‚Ø¯Ù…Ø© ØªØ´Ù…Ù„ ØªØ£Ø®ÙŠØ±Ø§Øª Ø¹Ø´ÙˆØ§Ø¦ÙŠØ©ØŒ Ø­Ø±ÙƒØ§Øª Ø·Ø¨ÙŠØ¹ÙŠØ©ØŒ ÙˆÙØªØ±Ø§Øª Ø±Ø§Ø­Ø© ØªÙ„Ù‚Ø§Ø¦ÙŠØ© Ù„Ø­Ù…Ø§ÙŠØ© Ø­Ø³Ø§Ø¨Ùƒ.',
    faq2_q: 'ÙƒÙ… Ù…Ø²Ø±Ø¹Ø© Ø£Ù‚Ø¯Ø± Ø£Ø´ØºÙ‘Ù„ØŸ',
    faq2_a: 'Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ù…Ø¬Ø§Ù†ÙŠØ© ØªØ¯Ø¹Ù… Ù…Ø²Ø±Ø¹Ø© ÙˆØ§Ø­Ø¯Ø©. Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ø§Ø­ØªØ±Ø§ÙÙŠØ© ØªØ¯Ø¹Ù… Ø¹Ø¯Ø¯ ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯ Ù…Ù† Ø§Ù„Ù…Ø²Ø§Ø±Ø¹ Ø¨Ù€ $3 Ù„ÙƒÙ„ Ù…Ø²Ø±Ø¹Ø© Ø´Ù‡Ø±ÙŠØ§Ù‹.',
    faq3_q: 'Ù‡Ù„ Ø£Ø­ØªØ§Ø¬ Ø£Ø®Ù„ÙŠ Ø¬Ù‡Ø§Ø²ÙŠ Ø´ØºÙ‘Ø§Ù„ØŸ',
    faq3_a: 'Ø­Ø§Ù„ÙŠØ§Ù‹ Ù†Ø¹Ù…ØŒ Ø§Ù„Ø¨ÙˆØª ÙŠØ­ØªØ§Ø¬ Ø¬Ù‡Ø§Ø² ÙƒÙ…Ø¨ÙŠÙˆØªØ± Ø´ØºÙ‘Ø§Ù„. Ù‚Ø±ÙŠØ¨Ø§Ù‹ Ù†ÙˆÙÙ‘Ø± Ø®ÙŠØ§Ø± Ø³Ø­Ø§Ø¨ÙŠ ÙŠØ´ØªØºÙ„ Ø¨Ø¯ÙˆÙ† Ø¬Ù‡Ø§Ø²Ùƒ.',
    cta_final_title: 'Ø¬Ø§Ù‡Ø² ØªØ¨Ø¯Ø£ØŸ',
    cta_final_desc: 'Ø§Ù†Ø¶Ù… Ù„Ù…Ø¦Ø§Øª Ø§Ù„Ù„Ø§Ø¹Ø¨ÙŠÙ† Ø§Ù„Ù„ÙŠ ÙŠØ³ØªØ®Ø¯Ù…ÙˆÙ† VRBOT Ù„ØªØ·ÙˆÙŠØ± Ø­Ø³Ø§Ø¨Ø§ØªÙ‡Ù… ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹.',
    cta_final_btn: 'Ø§Ø¨Ø¯Ø£ Ø§Ù„Ø¢Ù† Ù…Ø¬Ø§Ù†Ø§Ù‹',
    footer_text: 'Â© 2026 VRBOT. Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ‚ Ù…Ø­ÙÙˆØ¸Ø©.',
  },
  en: {
    hero_title: 'VRBOT',
    hero_subtitle: 'AI-Powered Viking Rise Automation',
    hero_desc: 'Manage farms, gather resources, upgrade your castle and attack enemies â€” everything runs 24/7 with advanced AI automation.',
    cta_start: 'Start Free',
    cta_pricing: 'View Pricing',
    trusted: 'Trusted by 500+ players worldwide',
    features_title: 'Everything You Need in One Bot',
    features_subtitle: '37 automated tasks covering every aspect of the game',
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
    how_subtitle: 'Quick and easy setup â€” get running in minutes',
    step1_title: 'Create Account',
    step1_desc: 'Sign up free and add your first farm details.',
    step2_title: 'Choose Tasks',
    step2_desc: 'Select which tasks to run from 37 available automations.',
    step3_title: 'Run & Relax',
    step3_desc: 'Bot runs 24/7 while you monitor results from the dashboard.',
    pricing_title: 'Simple, Transparent Pricing',
    pricing_subtitle: 'Start free â€” upgrade anytime',
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
    pricing_pro_f2: 'All 37 tasks',
    pricing_pro_f3: 'Advanced protection',
    pricing_pro_f4: 'Advanced dashboard',
    pricing_pro_f5: 'Priority support',
    pricing_pro_cta: 'Subscribe Now',
    pricing_per: '/ farm / month',
    faq_title: 'FAQ',
    faq1_q: 'Is my account safe from bans?',
    faq1_a: 'We use advanced human behavior simulation including random delays, natural movements, and automatic rest periods to protect your account.',
    faq2_q: 'How many farms can I run?',
    faq2_a: 'Free plan supports one farm. Pro: $2/farm/month (LDPlayer local) or $3/farm/month (Cloud servers).',
    faq3_q: 'Do I need to keep my computer running?',
    faq3_a: 'No! Our Cloud option is now live — farms run 24/7 on our servers. You can also run locally â€” no computer needed.',
    cta_final_title: 'Ready to Start?',
    cta_final_desc: 'Join hundreds of players using VRBOT to automate their accounts.',
    cta_final_btn: 'Start Free Now',
    footer_text: 'Â© 2026 VRBOT. All rights reserved.',
  },
  ru: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Ð˜Ð˜-Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ð·Ð°Ñ†Ð¸Ñ Viking Rise',
    hero_desc: 'Ð£Ð¿Ñ€Ð°Ð²Ð»ÑÐ¹Ñ‚Ðµ Ñ„ÐµÑ€Ð¼Ð°Ð¼Ð¸, ÑÐ¾Ð±Ð¸Ñ€Ð°Ð¹Ñ‚Ðµ Ñ€ÐµÑÑƒÑ€ÑÑ‹, ÑƒÐ»ÑƒÑ‡ÑˆÐ°Ð¹Ñ‚Ðµ Ð·Ð°Ð¼Ð¾Ðº Ð¸ Ð°Ñ‚Ð°ÐºÑƒÐ¹Ñ‚Ðµ Ð²Ñ€Ð°Ð³Ð¾Ð² â€” Ð²ÑÑ‘ Ñ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸ 24/7 Ñ Ð¿Ñ€Ð¾Ð´Ð²Ð¸Ð½ÑƒÑ‚Ñ‹Ð¼ Ð˜Ð˜.',
    cta_start: 'ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾',
    cta_pricing: 'Ð¦ÐµÐ½Ñ‹',
    trusted: 'Ð‘Ð¾Ð»ÐµÐµ 500 Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð² Ð¿Ð¾ Ð²ÑÐµÐ¼Ñƒ Ð¼Ð¸Ñ€Ñƒ',
    features_title: 'Ð’ÑÑ‘ Ð² Ð¾Ð´Ð½Ð¾Ð¼ Ð±Ð¾Ñ‚Ðµ',
    features_subtitle: '37 Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ñ… Ð·Ð°Ð´Ð°Ñ‡ Ð´Ð»Ñ ÐºÐ°Ð¶Ð´Ð¾Ð³Ð¾ Ð°ÑÐ¿ÐµÐºÑ‚Ð° Ð¸Ð³Ñ€Ñ‹',
    f1_title: 'Ð¡Ð±Ð¾Ñ€ Ñ€ÐµÑÑƒÑ€ÑÐ¾Ð²',
    f1_desc: 'ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ðµ Ð¼Ð°Ñ€ÑˆÐ¸ Ñ ÑƒÐ¼Ð½Ñ‹Ð¼ ÑƒÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸ÐµÐ¼ Ð²Ð¾Ð¹ÑÐºÐ°Ð¼Ð¸.',
    f2_title: 'Ð¡Ñ‚Ñ€Ð¾Ð¸Ñ‚ÐµÐ»ÑŒÑÑ‚Ð²Ð¾',
    f2_desc: 'ÐÐ²Ñ‚Ð¾ÑƒÐ»ÑƒÑ‡ÑˆÐµÐ½Ð¸Ðµ Ð·Ð´Ð°Ð½Ð¸Ð¹ Ð¸ Ð¸ÑÑÐ»ÐµÐ´Ð¾Ð²Ð°Ð½Ð¸Ð¹ Ñ Ð¿Ñ€Ð¸Ð¾Ñ€Ð¸Ñ‚ÐµÑ‚Ð°Ð¼Ð¸.',
    f3_title: 'ÐžÑ…Ð¾Ñ‚Ð° Ð½Ð° Ð¼Ð¾Ð½ÑÑ‚Ñ€Ð¾Ð²',
    f3_desc: 'ÐÐ²Ñ‚Ð¾Ð¾Ñ…Ð¾Ñ‚Ð° Ð½Ð° ÐÐ¸Ñ„Ð»ÑƒÐ½Ð³Ð¾Ð² Ð¸ Ð¼Ð¾Ð½ÑÑ‚Ñ€Ð¾Ð² Ð½ÑƒÐ¶Ð½Ð¾Ð³Ð¾ ÑƒÑ€Ð¾Ð²Ð½Ñ.',
    f4_title: 'Ð—Ð°Ñ‰Ð¸Ñ‚Ð° Ð¾Ñ‚ Ð±Ð°Ð½Ð°',
    f4_desc: 'Ð¡Ð¸Ð¼ÑƒÐ»ÑÑ†Ð¸Ñ Ð¿Ð¾Ð²ÐµÐ´ÐµÐ½Ð¸Ñ Ñ Ð·Ð°Ð´ÐµÑ€Ð¶ÐºÐ°Ð¼Ð¸ Ð¸ ÐµÑÑ‚ÐµÑÑ‚Ð²ÐµÐ½Ð½Ñ‹Ð¼Ð¸ Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸ÑÐ¼Ð¸.',
    f5_title: 'ÐŸÐ°Ð½ÐµÐ»ÑŒ ÑƒÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ñ',
    f5_desc: 'ÐœÐ¾Ð½Ð¸Ñ‚Ð¾Ñ€Ð¸Ð½Ð³ Ð²ÑÐµÑ… Ñ„ÐµÑ€Ð¼ Ð² Ñ€ÐµÐ°Ð»ÑŒÐ½Ð¾Ð¼ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð¸ Ð¸Ð· Ð±Ñ€Ð°ÑƒÐ·ÐµÑ€Ð°.',
    f6_title: 'ÐžÐ±Ð»Ð°Ñ‡Ð½Ð°Ñ Ð¿Ð¾Ð´Ð´ÐµÑ€Ð¶ÐºÐ°',
    f6_desc: 'Ð—Ð°Ð¿ÑƒÑÐº Ð±Ð¾Ñ‚Ð° Ð½Ð° Ð½Ð°ÑˆÐ¸Ñ… ÑÐµÑ€Ð²ÐµÑ€Ð°Ñ… â€” ÐºÐ¾Ð¼Ð¿ÑŒÑŽÑ‚ÐµÑ€ Ð½Ðµ Ð½ÑƒÐ¶ÐµÐ½.',
    stats_farms: 'ÐÐºÑ‚Ð¸Ð²Ð½Ñ‹Ñ… Ñ„ÐµÑ€Ð¼',
    stats_tasks: 'ÐÐ²Ñ‚Ð¾Ð·Ð°Ð´Ð°Ñ‡',
    stats_uptime: 'ÐÐ¿Ñ‚Ð°Ð¹Ð¼',
    stats_languages: 'Ð¯Ð·Ñ‹ÐºÐ¾Ð²',
    how_title: 'ÐÐ°Ñ‡Ð½Ð¸Ñ‚Ðµ Ð·Ð° 3 ÑˆÐ°Ð³Ð°',
    how_subtitle: 'Ð‘Ñ‹ÑÑ‚Ñ€Ð°Ñ Ð½Ð°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ° â€” Ð·Ð°Ð¿ÑƒÑÐº Ð·Ð° Ð¼Ð¸Ð½ÑƒÑ‚Ñ‹',
    step1_title: 'Ð¡Ð¾Ð·Ð´Ð°Ð¹Ñ‚Ðµ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚',
    step1_desc: 'Ð—Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€ÑƒÐ¹Ñ‚ÐµÑÑŒ Ð¸ Ð´Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ Ð¿ÐµÑ€Ð²ÑƒÑŽ Ñ„ÐµÑ€Ð¼Ñƒ.',
    step2_title: 'Ð’Ñ‹Ð±ÐµÑ€Ð¸Ñ‚Ðµ Ð·Ð°Ð´Ð°Ñ‡Ð¸',
    step2_desc: 'ÐžÑ‚Ð¼ÐµÑ‚ÑŒÑ‚Ðµ Ð½ÑƒÐ¶Ð½Ñ‹Ðµ Ð¸Ð· 37 Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð½Ñ‹Ñ… Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ð·Ð°Ñ†Ð¸Ð¹.',
    step3_title: 'Ð—Ð°Ð¿ÑƒÑÑ‚Ð¸Ñ‚Ðµ Ð¸ Ð¾Ñ‚Ð´Ñ‹Ñ…Ð°Ð¹Ñ‚Ðµ',
    step3_desc: 'Ð‘Ð¾Ñ‚ Ñ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚ 24/7, Ð²Ñ‹ ÑÐ»ÐµÐ´Ð¸Ñ‚Ðµ Ð·Ð° Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ð°Ð¼Ð¸.',
    pricing_title: 'ÐŸÑ€Ð¾ÑÑ‚Ñ‹Ðµ Ð¸ Ð¿Ñ€Ð¾Ð·Ñ€Ð°Ñ‡Ð½Ñ‹Ðµ Ñ†ÐµÐ½Ñ‹',
    pricing_subtitle: 'ÐÐ°Ñ‡Ð½Ð¸Ñ‚Ðµ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾ â€” Ð¾Ð±Ð½Ð¾Ð²Ð¸Ñ‚Ðµ ÐºÐ¾Ð³Ð´Ð° ÑƒÐ³Ð¾Ð´Ð½Ð¾',
    pricing_free_title: 'Ð‘ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾',
    pricing_free_desc: 'Ð”Ð»Ñ Ð¿Ñ€Ð¾Ð±Ñ‹',
    pricing_free_f1: 'ÐžÐ´Ð½Ð° Ñ„ÐµÑ€Ð¼Ð°',
    pricing_free_f2: 'Ð‘Ð°Ð·Ð¾Ð²Ñ‹Ðµ Ð·Ð°Ð´Ð°Ñ‡Ð¸',
    pricing_free_f3: '7 Ð´Ð½ÐµÐ¹ Ð¿Ñ€Ð¾Ð±Ð½Ð¾Ð³Ð¾ Ð¿ÐµÑ€Ð¸Ð¾Ð´Ð°',
    pricing_free_cta: 'ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾',
    pricing_pro_badge: 'ÐŸÐ¾Ð¿ÑƒÐ»ÑÑ€Ð½Ñ‹Ð¹',
    pricing_pro_title: 'ÐŸÑ€Ð¾',
    pricing_pro_desc: 'Ð”Ð»Ñ ÑÐµÑ€ÑŒÑ‘Ð·Ð½Ñ‹Ñ… Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð²',
    pricing_pro_f1: 'Ð‘ÐµÐ·Ð»Ð¸Ð¼Ð¸Ñ‚Ð½Ñ‹Ðµ Ñ„ÐµÑ€Ð¼Ñ‹',
    pricing_pro_f2: 'Ð’ÑÐµ 37 Ð·Ð°Ð´Ð°Ñ‡',
    pricing_pro_f3: 'ÐŸÑ€Ð¾Ð´Ð²Ð¸Ð½ÑƒÑ‚Ð°Ñ Ð·Ð°Ñ‰Ð¸Ñ‚Ð°',
    pricing_pro_f4: 'Ð Ð°ÑÑˆÐ¸Ñ€ÐµÐ½Ð½Ð°Ñ Ð¿Ð°Ð½ÐµÐ»ÑŒ',
    pricing_pro_f5: 'ÐŸÑ€Ð¸Ð¾Ñ€Ð¸Ñ‚ÐµÑ‚Ð½Ð°Ñ Ð¿Ð¾Ð´Ð´ÐµÑ€Ð¶ÐºÐ°',
    pricing_pro_cta: 'ÐŸÐ¾Ð´Ð¿Ð¸ÑÐ°Ñ‚ÑŒÑÑ',
    pricing_per: '/ Ñ„ÐµÑ€Ð¼Ð° / Ð¼ÐµÑÑÑ†',
    faq_title: 'Ð§Ð°ÑÑ‚Ñ‹Ðµ Ð²Ð¾Ð¿Ñ€Ð¾ÑÑ‹',
    faq1_q: 'ÐœÐ¾Ð¹ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚ Ð² Ð±ÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ÑÑ‚Ð¸?',
    faq1_a: 'ÐœÑ‹ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÐµÐ¼ ÑÐ¸Ð¼ÑƒÐ»ÑÑ†Ð¸ÑŽ Ð¿Ð¾Ð²ÐµÐ´ÐµÐ½Ð¸Ñ Ñ Ð·Ð°Ð´ÐµÑ€Ð¶ÐºÐ°Ð¼Ð¸, ÐµÑÑ‚ÐµÑÑ‚Ð²ÐµÐ½Ð½Ñ‹Ð¼Ð¸ Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸ÑÐ¼Ð¸ Ð¸ Ð¿Ð°ÑƒÐ·Ð°Ð¼Ð¸ Ð´Ð»Ñ Ð·Ð°Ñ‰Ð¸Ñ‚Ñ‹.',
    faq2_q: 'Ð¡ÐºÐ¾Ð»ÑŒÐºÐ¾ Ñ„ÐµÑ€Ð¼ Ð¼Ð¾Ð¶Ð½Ð¾ Ð·Ð°Ð¿ÑƒÑÑ‚Ð¸Ñ‚ÑŒ?',
    faq2_a: 'Ð‘ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾ â€” Ð¾Ð´Ð½Ð° Ñ„ÐµÑ€Ð¼Ð°. ÐŸÑ€Ð¾ â€” Ð±ÐµÐ·Ð»Ð¸Ð¼Ð¸Ñ‚ Ð¿Ð¾ $3 Ð·Ð° Ñ„ÐµÑ€Ð¼Ñƒ Ð² Ð¼ÐµÑÑÑ†.',
    faq3_q: 'ÐÑƒÐ¶ÐµÐ½ Ð»Ð¸ Ð²ÐºÐ»ÑŽÑ‡Ñ‘Ð½Ð½Ñ‹Ð¹ ÐºÐ¾Ð¼Ð¿ÑŒÑŽÑ‚ÐµÑ€?',
    faq3_a: 'ÐŸÐ¾ÐºÐ° Ð´Ð°. Ð¡ÐºÐ¾Ñ€Ð¾ Ð±ÑƒÐ´ÐµÑ‚ Ð¾Ð±Ð»Ð°Ñ‡Ð½Ñ‹Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚ Ð±ÐµÐ· ÐºÐ¾Ð¼Ð¿ÑŒÑŽÑ‚ÐµÑ€Ð°.',
    cta_final_title: 'Ð“Ð¾Ñ‚Ð¾Ð²Ñ‹ Ð½Ð°Ñ‡Ð°Ñ‚ÑŒ?',
    cta_final_desc: 'ÐŸÑ€Ð¸ÑÐ¾ÐµÐ´Ð¸Ð½ÑÐ¹Ñ‚ÐµÑÑŒ Ðº ÑÐ¾Ñ‚Ð½ÑÐ¼ Ð¸Ð³Ñ€Ð¾ÐºÐ¾Ð², Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÑŽÑ‰Ð¸Ñ… VRBOT.',
    cta_final_btn: 'ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾',
    footer_text: 'Â© 2026 VRBOT. Ð’ÑÐµ Ð¿Ñ€Ð°Ð²Ð° Ð·Ð°Ñ‰Ð¸Ñ‰ÐµÐ½Ñ‹.',
  },
  zh: {
    hero_title: 'VRBOT',
    hero_subtitle: 'AIé©±åŠ¨çš„ç»´äº¬å´›èµ·è‡ªåŠ¨åŒ–',
    hero_desc: 'ç®¡ç†å†œåœºã€æ”¶é›†èµ„æºã€å‡çº§åŸŽå ¡ã€æ”»å‡»æ•Œäººâ€”â€”ä¸€åˆ‡ç”±å…ˆè¿›AIå…¨å¤©å€™è‡ªåŠ¨è¿è¡Œã€‚',
    cta_start: 'å…è´¹å¼€å§‹',
    cta_pricing: 'æŸ¥çœ‹ä»·æ ¼',
    trusted: 'å…¨çƒ500+çŽ©å®¶ä¿¡èµ–',
    features_title: 'ä¸€ä¸ªæœºå™¨äººæ»¡è¶³æ‰€æœ‰éœ€æ±‚',
    features_subtitle: '37é¡¹è‡ªåŠ¨åŒ–ä»»åŠ¡è¦†ç›–æ¸¸æˆå„ä¸ªæ–¹é¢',
    f1_title: 'èµ„æºé‡‡é›†',
    f1_desc: 'è‡ªåŠ¨æ´¾é£é‡‡é›†é˜Ÿä¼ï¼Œæ™ºèƒ½ç®¡ç†éƒ¨é˜Ÿå’Œæ—¶é—´ã€‚',
    f2_title: 'å»ºé€ å‡çº§',
    f2_desc: 'è‡ªåŠ¨å‡çº§å»ºç­‘å’Œç ”ç©¶ï¼Œæ™ºèƒ½æŽ’åˆ—ä¼˜å…ˆçº§ã€‚',
    f3_title: 'æ€ªç‰©çŒŽæ€',
    f3_desc: 'è‡ªåŠ¨çŒŽæ€å°¼å¼—éš†å’Œæ€ªç‰©ï¼Œé€‰æ‹©åˆé€‚ç­‰çº§ã€‚',
    f4_title: 'é˜²å°ä¿æŠ¤',
    f4_desc: 'é«˜çº§äººç±»è¡Œä¸ºæ¨¡æ‹Ÿï¼Œéšæœºå»¶è¿Ÿå’Œè‡ªç„¶æ“ä½œã€‚',
    f5_title: 'å®žæ—¶é¢æ¿',
    f5_desc: 'é€šè¿‡æµè§ˆå™¨æˆ–æ‰‹æœºå®žæ—¶ç›‘æŽ§æ‰€æœ‰å†œåœºã€‚',
    f6_title: 'äº‘ç«¯æ”¯æŒ',
    f6_desc: 'åœ¨æˆ‘ä»¬çš„äº‘æœåŠ¡å™¨ä¸Šè¿è¡Œï¼Œæ— éœ€ç”µè„‘ã€‚',
    stats_farms: 'æ´»è·ƒå†œåœº',
    stats_tasks: 'è‡ªåŠ¨ä»»åŠ¡',
    stats_uptime: 'è¿è¡Œæ—¶é—´',
    stats_languages: 'æ”¯æŒè¯­è¨€',
    how_title: '3æ­¥å¼€å§‹',
    how_subtitle: 'å¿«é€Ÿç®€å•è®¾ç½®â€”â€”å‡ åˆ†é’Ÿå³å¯è¿è¡Œ',
    step1_title: 'åˆ›å»ºè´¦æˆ·',
    step1_desc: 'å…è´¹æ³¨å†Œå¹¶æ·»åŠ æ‚¨çš„ç¬¬ä¸€ä¸ªå†œåœºã€‚',
    step2_title: 'é€‰æ‹©ä»»åŠ¡',
    step2_desc: 'ä»Ž37é¡¹è‡ªåŠ¨åŒ–ä¸­é€‰æ‹©è¦è¿è¡Œçš„ä»»åŠ¡ã€‚',
    step3_title: 'è¿è¡Œå¹¶æ”¾æ¾',
    step3_desc: 'æœºå™¨äººå…¨å¤©å€™è¿è¡Œï¼Œæ‚¨åœ¨é¢æ¿ç›‘æŽ§ç»“æžœã€‚',
    pricing_title: 'ç®€å•é€æ˜Žçš„å®šä»·',
    pricing_subtitle: 'å…è´¹å¼€å§‹â€”â€”éšæ—¶å‡çº§',
    pricing_free_title: 'å…è´¹',
    pricing_free_desc: 'è¯•ç”¨',
    pricing_free_f1: 'ä¸€ä¸ªå†œåœº',
    pricing_free_f2: 'åŸºæœ¬ä»»åŠ¡',
    pricing_free_f3: '7å¤©è¯•ç”¨',
    pricing_free_cta: 'å…è´¹å¼€å§‹',
    pricing_pro_badge: 'æœ€å—æ¬¢è¿Ž',
    pricing_pro_title: 'ä¸“ä¸šç‰ˆ',
    pricing_pro_desc: 'é€‚åˆè®¤çœŸçŽ©å®¶',
    pricing_pro_f1: 'æ— é™å†œåœº',
    pricing_pro_f2: 'å…¨éƒ¨37é¡¹ä»»åŠ¡',
    pricing_pro_f3: 'é«˜çº§ä¿æŠ¤',
    pricing_pro_f4: 'é«˜çº§é¢æ¿',
    pricing_pro_f5: 'ä¼˜å…ˆæ”¯æŒ',
    pricing_pro_cta: 'ç«‹å³è®¢é˜…',
    pricing_per: '/ å†œåœº / æœˆ',
    faq_title: 'å¸¸è§é—®é¢˜',
    faq1_q: 'æˆ‘çš„è´¦æˆ·å®‰å…¨å—ï¼Ÿ',
    faq1_a: 'æˆ‘ä»¬ä½¿ç”¨é«˜çº§è¡Œä¸ºæ¨¡æ‹ŸæŠ€æœ¯ï¼ŒåŒ…æ‹¬éšæœºå»¶è¿Ÿã€è‡ªç„¶æ“ä½œå’Œè‡ªåŠ¨ä¼‘æ¯æ¥ä¿æŠ¤æ‚¨çš„è´¦æˆ·ã€‚',
    faq2_q: 'å¯ä»¥è¿è¡Œå¤šå°‘å†œåœºï¼Ÿ',
    faq2_a: 'å…è´¹ç‰ˆæ”¯æŒä¸€ä¸ªå†œåœºã€‚ä¸“ä¸šç‰ˆæ¯æœˆ$3/å†œåœºï¼Œæ•°é‡æ— é™ã€‚',
    faq3_q: 'éœ€è¦ä¿æŒç”µè„‘å¼€å¯å—ï¼Ÿ',
    faq3_a: 'ç›®å‰éœ€è¦ã€‚äº‘ç«¯é€‰é¡¹å³å°†æŽ¨å‡ºï¼Œå±Šæ—¶æ— éœ€ç”µè„‘ã€‚',
    cta_final_title: 'å‡†å¤‡å¼€å§‹ï¼Ÿ',
    cta_final_desc: 'åŠ å…¥æ•°ç™¾åä½¿ç”¨VRBOTè‡ªåŠ¨åŒ–è´¦æˆ·çš„çŽ©å®¶ã€‚',
    cta_final_btn: 'ç«‹å³å…è´¹å¼€å§‹',
    footer_text: 'Â© 2026 VRBOT. ä¿ç•™æ‰€æœ‰æƒåˆ©ã€‚',
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
    { title: t.f1_title, desc: t.f1_desc, emoji: 'ðŸŒ¾', color: '#10b981' },
    { title: t.f2_title, desc: t.f2_desc, emoji: 'ðŸ”¨', color: '#f59e0b' },
    { title: t.f3_title, desc: t.f3_desc, emoji: 'ðŸŽ¯', color: '#ef4444' },
    { title: t.f4_title, desc: t.f4_desc, emoji: 'ðŸ›¡ï¸', color: '#8b5cf6' },
    { title: t.f5_title, desc: t.f5_desc, emoji: 'ðŸ“Š', color: '#3b82f6' },
    { title: t.f6_title, desc: t.f6_desc, emoji: 'â˜ï¸', color: '#06b6d4' },
  ];
  const steps = [
    { num: '01', title: t.step1_title, desc: t.step1_desc },
    { num: '02', title: t.step2_title, desc: t.step2_desc },
    { num: '03', title: t.step3_title, desc: t.step3_desc },
  ];

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
          <div className="vr-fu" style={{ fontSize:72, marginBottom:24, animation:'floatBot 4s ease-in-out infinite, fadeUp .7s ease forwards' }}>ðŸ¤–</div>
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
          {[{ val:500, suffix:'+', label:t.stats_farms },{ val:37, suffix:'', label:t.stats_tasks },{ val:99, suffix:'.9%', label:t.stats_uptime },{ val:4, suffix:'', label:t.stats_languages }].map((s,i)=>(
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
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <h2 style={{ fontSize:36, fontWeight:800, color:'#fff', margin:'0 0 12px' }}>{t.pricing_title}</h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', margin:0 }}>{t.pricing_subtitle}</p>
          </div>
          <div className="vr-g2" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:24, alignItems:'start' }}>
            {/* Free */}
            <div style={{ background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:'40px 32px', transition:'all .35s' }}>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', margin:'0 0 8px', fontWeight:500 }}>{t.pricing_free_desc}</p>
              <h3 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', margin:'0 0 4px' }}>{t.pricing_free_title}</h3>
              <div style={{ fontSize:48, fontWeight:900, color:'#fff', margin:'20px 0' }}>$0</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:32 }}>
                {[t.pricing_free_f1, t.pricing_free_f2, t.pricing_free_f3].map((f,i)=>(
                  <span key={i} style={{ color:'rgba(255,255,255,.6)', fontSize:15 }}><span style={{ color:'#8b5cf6', marginInlineEnd:10, fontWeight:700 }}>âœ“</span>{f}</span>
                ))}
              </div>
              <a href="/signup" className="vr-bs" style={{ width:'100%', justifyContent:'center', boxSizing:'border-box' }}>{t.pricing_free_cta}</a>
            </div>
            {/* Pro */}
            <div className="vr-pp" style={{ borderRadius:24, padding:'40px 32px', transition:'all .35s', position:'relative' }}>
              <div style={{ position:'absolute', top:-1, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#7c3aed,#6366f1)', color:'#fff', padding:'6px 20px', borderRadius:'0 0 10px 10px', fontSize:12, fontWeight:700 }}>{t.pricing_pro_badge}</div>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', margin:'0 0 8px', fontWeight:500 }}>{t.pricing_pro_desc}</p>
              <h3 style={{ fontSize:24, fontWeight:800, color:'#f1f5f9', margin:'0 0 4px' }}>{t.pricing_pro_title}</h3>
              <div style={{ margin:'20px 0' }}><div style={{ marginBottom:12 }}><span style={{ fontSize:40, fontWeight:900, color:'#fff' }}>$2</span><span style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginInlineStart:8 }}>{t.pricing_per} (LDPlayer)</span></div><div style={{ paddingTop:12, borderTop:'1px solid rgba(255,255,255,.08)' }}><span style={{ fontSize:32, fontWeight:800, color:'#a78bfa' }}>$3</span><span style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginInlineStart:8 }}>{t.pricing_per} (Cloud ☁️)</span></div></div>
              <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:32 }}>
                {[t.pricing_pro_f1, t.pricing_pro_f2, t.pricing_pro_f3, t.pricing_pro_f4, t.pricing_pro_f5].map((f,i)=>(
                  <span key={i} style={{ color:'rgba(255,255,255,.6)', fontSize:15 }}><span style={{ color:'#8b5cf6', marginInlineEnd:10, fontWeight:700 }}>âœ“</span>{f}</span>
                ))}
              </div>
              <a href="/billing" className="vr-bp" style={{ width:'100%', justifyContent:'center', boxSizing:'border-box' }}>{t.pricing_pro_cta}</a>
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











