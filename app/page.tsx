'use client';

import { useState, useEffect } from 'react';

type Language = 'ar' | 'en' | 'ru' | 'zh';

const content: Record<Language, {
  hero_title: string;
  hero_subtitle: string;
  hero_desc: string;
  cta_early: string;
  cta_pricing: string;
  features_title: string;
  f1_title: string;
  f1_desc: string;
  f2_title: string;
  f2_desc: string;
  f3_title: string;
  f3_desc: string;
  f4_title: string;
  f4_desc: string;
  stats_farms: string;
  stats_resources: string;
  stats_uptime: string;
  stats_languages: string;
  how_title: string;
  step1_title: string;
  step1_desc: string;
  step2_title: string;
  step2_desc: string;
  step3_title: string;
  step3_desc: string;
  pricing_title: string;
  pricing_free_title: string;
  pricing_free_price: string;
  pricing_free_f1: string;
  pricing_free_f2: string;
  pricing_free_f3: string;
  pricing_free_cta: string;
  pricing_pro_title: string;
  pricing_pro_price: string;
  pricing_pro_f1: string;
  pricing_pro_f2: string;
  pricing_pro_f3: string;
  pricing_pro_f4: string;
  pricing_pro_cta: string;
  footer_text: string;
}> = {
  ar: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Ø¨ÙˆØª Ø£ØªÙ…ØªØ© Ø°ÙƒÙŠ Ù„Ù€ Viking Rise',
    hero_desc: 'Ø£Ø¯ÙØ± Ù…Ø²Ø§Ø±Ø¹ÙƒØŒ Ø§Ø¬Ù…Ø¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ØŒ ÙˆØ·ÙˆÙ‘Ø± Ø­Ø³Ø§Ø¨Ùƒ â€” ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¹Ù„Ù‰ Ù…Ø¯Ø§Ø± Ø§Ù„Ø³Ø§Ø¹Ø©. Ø¨Ø¯ÙˆÙ† ØªØ¯Ø®Ù„ ÙŠØ¯ÙˆÙŠ.',
    cta_early: 'ðŸš€ Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ø§Ù‹',
    cta_pricing: 'ðŸ’° Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø³Ø¹Ø§Ø±',
    features_title: 'âš¡ Ù„Ù…Ø§Ø°Ø§ VRBOTØŸ',
    f1_title: 'ðŸŒ¾ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø²Ø§Ø±Ø¹ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹',
    f1_desc: 'Ø¬Ù…Ø¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯ØŒ Ø§Ù„ØªØ±Ù‚ÙŠØ©ØŒ ÙˆØ§Ù„Ø­ØµØ§Ø¯ Ø¨Ø´ÙƒÙ„ Ù…Ø³ØªÙ…Ø± Ø¨Ø¯ÙˆÙ† Ø£ÙŠ ØªØ¯Ø®Ù„.',
    f2_title: 'ðŸ›¡ï¸ Ø­Ù…Ø§ÙŠØ© Ø°ÙƒÙŠØ©',
    f2_desc: 'Ù†Ø¸Ø§Ù… Ù…Ø­Ø§ÙƒØ§Ø© Ø³Ù„ÙˆÙƒ Ø¨Ø´Ø±ÙŠ Ù…ØªÙ‚Ø¯Ù… Ù„Ø­Ù…Ø§ÙŠØ© Ø­Ø³Ø§Ø¨Ùƒ Ù…Ù† Ø§Ù„Ø­Ø¸Ø±.',
    f3_title: 'ðŸ“Š Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ù…Ø¨Ø§Ø´Ø±Ø©',
    f3_desc: 'ØªØ§Ø¨Ø¹ Ø­Ø§Ù„Ø© Ù…Ø²Ø§Ø±Ø¹Ùƒ ÙˆÙ…ÙˆØ§Ø±Ø¯Ùƒ ÙÙŠ Ø§Ù„ÙˆÙ‚Øª Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ Ù…Ù† Ø£ÙŠ Ù…ÙƒØ§Ù†.',
    f4_title: 'ðŸŒ Ù…ØªØ¹Ø¯Ø¯ Ø§Ù„Ù„ØºØ§Øª',
    f4_desc: 'ÙˆØ§Ø¬Ù‡Ø© ØªØ¯Ø¹Ù… Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©ØŒ Ø§Ù„Ø±ÙˆØ³ÙŠØ©ØŒ ÙˆØ§Ù„ØµÙŠÙ†ÙŠØ©.',
    stats_farms: 'Ù…Ø²Ø±Ø¹Ø© Ù†Ø´Ø·Ø©',
    stats_resources: 'Ù…ÙˆØ§Ø±Ø¯ Ù…ÙØ¬Ù…Ù‘Ø¹Ø©',
    stats_uptime: 'ÙˆÙ‚Øª Ø§Ù„ØªØ´ØºÙŠÙ„',
    stats_languages: 'Ù„ØºØ§Øª Ù…Ø¯Ø¹ÙˆÙ…Ø©',
    how_title: 'ðŸŽ¯ ÙƒÙŠÙ ÙŠØ¹Ù…Ù„ØŸ',
    step1_title: '1. Ø³Ø¬Ù‘Ù„ Ø­Ø³Ø§Ø¨Ùƒ',
    step1_desc: 'Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨ Ù…Ø¬Ø§Ù†ÙŠ ÙˆØ£Ø¶Ù Ù…Ø²Ø±Ø¹ØªÙƒ Ø§Ù„Ø£ÙˆÙ„Ù‰ Ø®Ù„Ø§Ù„ Ø¯Ù‚Ø§Ø¦Ù‚.',
    step2_title: '2. ÙØ¹Ù‘Ù„ Ø§Ù„Ø¨ÙˆØª',
    step2_desc: 'Ø§Ø®ØªØ± Ø¥Ø¹Ø¯Ø§Ø¯Ø§ØªÙƒ ÙˆØ´ØºÙ‘Ù„ Ø§Ù„Ø¨ÙˆØª Ø¨Ø¶ØºØ·Ø© ÙˆØ§Ø­Ø¯Ø©.',
    step3_title: '3. Ø§Ø³ØªÙ…ØªØ¹ Ø¨Ø§Ù„Ù†ØªØ§Ø¦Ø¬',
    step3_desc: 'ØªØ§Ø¨Ø¹ ØªÙ‚Ø¯Ù…Ùƒ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ… Ø¨ÙŠÙ†Ù…Ø§ Ø§Ù„Ø¨ÙˆØª ÙŠØ¹Ù…Ù„ Ù„Ø£Ø¬Ù„Ùƒ.',
    pricing_title: 'ðŸ’Ž Ø®Ø·Ø· Ø§Ù„Ø£Ø³Ø¹Ø§Ø±',
    pricing_free_title: 'Ù…Ø¬Ø§Ù†ÙŠ',
    pricing_free_price: '$0',
    pricing_free_f1: 'âœ“ Ù…Ø²Ø±Ø¹Ø© ÙˆØ§Ø­Ø¯Ø©',
    pricing_free_f2: 'âœ“ Ø¬Ù…Ø¹ Ù…ÙˆØ§Ø±Ø¯ Ø£Ø³Ø§Ø³ÙŠ',
    pricing_free_f3: 'âœ“ ØªØ¬Ø±Ø¨Ø© 7 Ø£ÙŠØ§Ù…',
    pricing_free_cta: 'Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ø§Ù‹',
    pricing_pro_title: 'Ø§Ø­ØªØ±Ø§ÙÙŠ',
    pricing_pro_price: '$2',
    pricing_pro_f1: 'âœ“ Ù…Ø²Ø§Ø±Ø¹ ØºÙŠØ± Ù…Ø­Ø¯ÙˆØ¯Ø©',
    pricing_pro_f2: 'âœ“ Ø­Ù…Ø§ÙŠØ© Ù…ØªÙ‚Ø¯Ù…Ø©',
    pricing_pro_f3: 'âœ“ Ø£ÙˆÙ„ÙˆÙŠØ© Ø§Ù„Ø¯Ø¹Ù…',
    pricing_pro_f4: 'âœ“ Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ù…ØªÙ‚Ø¯Ù…Ø©',
    pricing_pro_cta: 'Ø§Ø´ØªØ±Ùƒ Ø§Ù„Ø¢Ù†',
    footer_text: 'Â© 2026 VRBOT. Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ‚ Ù…Ø­ÙÙˆØ¸Ø©.',
  },
  en: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Smart Automation Bot for Viking Rise',
    hero_desc: 'Manage your farms, collect resources, and grow your account â€” automatically 24/7. No manual effort needed.',
    cta_early: 'ðŸš€ Start Free',
    cta_pricing: 'ðŸ’° View Pricing',
    features_title: 'âš¡ Why VRBOT?',
    f1_title: 'ðŸŒ¾ Auto Farm Management',
    f1_desc: 'Collect resources, upgrade, and harvest continuously without any intervention.',
    f2_title: 'ðŸ›¡ï¸ Smart Protection',
    f2_desc: 'Advanced human behavior simulation to keep your account safe from bans.',
    f3_title: 'ðŸ“Š Live Dashboard',
    f3_desc: 'Monitor your farms and resources in real-time from anywhere.',
    f4_title: 'ðŸŒ Multi-Language',
    f4_desc: 'Interface supports Arabic, English, Russian, and Chinese.',
    stats_farms: 'Active Farms',
    stats_resources: 'Resources Collected',
    stats_uptime: 'Uptime',
    stats_languages: 'Languages',
    how_title: 'ðŸŽ¯ How It Works',
    step1_title: '1. Create Account',
    step1_desc: 'Sign up free and add your first farm in minutes.',
    step2_title: '2. Activate Bot',
    step2_desc: 'Choose your settings and start the bot with one click.',
    step3_title: '3. Enjoy Results',
    step3_desc: 'Track progress from your dashboard while the bot works for you.',
    pricing_title: 'ðŸ’Ž Pricing Plans',
    pricing_free_title: 'Free',
    pricing_free_price: '$0',
    pricing_free_f1: 'âœ“ 1 Farm',
    pricing_free_f2: 'âœ“ Basic resource collection',
    pricing_free_f3: 'âœ“ 7-day trial',
    pricing_free_cta: 'Start Free',
    pricing_pro_title: 'Pro',
    pricing_pro_price: '$2',
    pricing_pro_f1: 'âœ“ Unlimited farms',
    pricing_pro_f2: 'âœ“ Advanced protection',
    pricing_pro_f3: 'âœ“ Priority support',
    pricing_pro_f4: 'âœ“ Advanced dashboard',
    pricing_pro_cta: 'Subscribe Now',
    footer_text: 'Â© 2026 VRBOT. All rights reserved.',
  },
  ru: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Ð£Ð¼Ð½Ñ‹Ð¹ Ð±Ð¾Ñ‚ Ð´Ð»Ñ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ð·Ð°Ñ†Ð¸Ð¸ Viking Rise',
    hero_desc: 'Ð£Ð¿Ñ€Ð°Ð²Ð»ÑÐ¹Ñ‚Ðµ Ñ„ÐµÑ€Ð¼Ð°Ð¼Ð¸, ÑÐ¾Ð±Ð¸Ñ€Ð°Ð¹Ñ‚Ðµ Ñ€ÐµÑÑƒÑ€ÑÑ‹ Ð¸ Ñ€Ð°Ð·Ð²Ð¸Ð²Ð°Ð¹Ñ‚Ðµ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚ â€” Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸ 24/7. Ð‘ÐµÐ· Ñ€ÑƒÑ‡Ð½Ð¾Ð³Ð¾ Ñ‚Ñ€ÑƒÐ´Ð°.',
    cta_early: 'ðŸš€ ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾',
    cta_pricing: 'ðŸ’° Ð¢Ð°Ñ€Ð¸Ñ„Ñ‹',
    features_title: 'âš¡ ÐŸÐ¾Ñ‡ÐµÐ¼Ñƒ VRBOT?',
    f1_title: 'ðŸŒ¾ ÐÐ²Ñ‚Ð¾-ÑƒÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ Ñ„ÐµÑ€Ð¼Ð°Ð¼Ð¸',
    f1_desc: 'Ð¡Ð±Ð¾Ñ€ Ñ€ÐµÑÑƒÑ€ÑÐ¾Ð², ÑƒÐ»ÑƒÑ‡ÑˆÐµÐ½Ð¸Ñ Ð¸ ÑƒÑ€Ð¾Ð¶Ð°Ð¹ Ð½ÐµÐ¿Ñ€ÐµÑ€Ñ‹Ð²Ð½Ð¾ Ð±ÐµÐ· Ð²Ð¼ÐµÑˆÐ°Ñ‚ÐµÐ»ÑŒÑÑ‚Ð²Ð°.',
    f2_title: 'ðŸ›¡ï¸ Ð£Ð¼Ð½Ð°Ñ Ð·Ð°Ñ‰Ð¸Ñ‚Ð°',
    f2_desc: 'ÐŸÑ€Ð¾Ð´Ð²Ð¸Ð½ÑƒÑ‚Ð°Ñ Ð¸Ð¼Ð¸Ñ‚Ð°Ñ†Ð¸Ñ Ð¿Ð¾Ð²ÐµÐ´ÐµÐ½Ð¸Ñ Ð´Ð»Ñ Ð·Ð°Ñ‰Ð¸Ñ‚Ñ‹ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚Ð° Ð¾Ñ‚ Ð±Ð°Ð½Ð°.',
    f3_title: 'ðŸ“Š ÐŸÐ°Ð½ÐµÐ»ÑŒ Ð² Ñ€ÐµÐ°Ð»ÑŒÐ½Ð¾Ð¼ Ð²Ñ€ÐµÐ¼ÐµÐ½Ð¸',
    f3_desc: 'ÐžÑ‚ÑÐ»ÐµÐ¶Ð¸Ð²Ð°Ð¹Ñ‚Ðµ ÑÐ²Ð¾Ð¸ Ñ„ÐµÑ€Ð¼Ñ‹ Ð¸ Ñ€ÐµÑÑƒÑ€ÑÑ‹ Ð¸Ð· Ð»ÑŽÐ±Ð¾Ð³Ð¾ Ð¼ÐµÑÑ‚Ð°.',
    f4_title: 'ðŸŒ ÐœÐ½Ð¾Ð³Ð¾ÑÐ·Ñ‹Ñ‡Ð½Ð¾ÑÑ‚ÑŒ',
    f4_desc: 'Ð˜Ð½Ñ‚ÐµÑ€Ñ„ÐµÐ¹Ñ Ð¿Ð¾Ð´Ð´ÐµÑ€Ð¶Ð¸Ð²Ð°ÐµÑ‚ Ð°Ñ€Ð°Ð±ÑÐºÐ¸Ð¹, Ð°Ð½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ð¹, Ñ€ÑƒÑÑÐºÐ¸Ð¹ Ð¸ ÐºÐ¸Ñ‚Ð°Ð¹ÑÐºÐ¸Ð¹.',
    stats_farms: 'ÐÐºÑ‚Ð¸Ð²Ð½Ñ‹Ñ… Ñ„ÐµÑ€Ð¼',
    stats_resources: 'Ð¡Ð¾Ð±Ñ€Ð°Ð½Ð¾ Ñ€ÐµÑÑƒÑ€ÑÐ¾Ð²',
    stats_uptime: 'Ð’Ñ€ÐµÐ¼Ñ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹',
    stats_languages: 'Ð¯Ð·Ñ‹ÐºÐ¾Ð²',
    how_title: 'ðŸŽ¯ ÐšÐ°Ðº ÑÑ‚Ð¾ Ñ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚',
    step1_title: '1. Ð¡Ð¾Ð·Ð´Ð°Ð¹Ñ‚Ðµ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚',
    step1_desc: 'Ð—Ð°Ñ€ÐµÐ³Ð¸ÑÑ‚Ñ€Ð¸Ñ€ÑƒÐ¹Ñ‚ÐµÑÑŒ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾ Ð¸ Ð´Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ Ð¿ÐµÑ€Ð²ÑƒÑŽ Ñ„ÐµÑ€Ð¼Ñƒ Ð·Ð° Ð¼Ð¸Ð½ÑƒÑ‚Ñ‹.',
    step2_title: '2. ÐÐºÑ‚Ð¸Ð²Ð¸Ñ€ÑƒÐ¹Ñ‚Ðµ Ð±Ð¾Ñ‚Ð°',
    step2_desc: 'Ð’Ñ‹Ð±ÐµÑ€Ð¸Ñ‚Ðµ Ð½Ð°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸ Ð¸ Ð·Ð°Ð¿ÑƒÑÑ‚Ð¸Ñ‚Ðµ Ð±Ð¾Ñ‚Ð° Ð¾Ð´Ð½Ð¸Ð¼ Ð½Ð°Ð¶Ð°Ñ‚Ð¸ÐµÐ¼.',
    step3_title: '3. ÐÐ°ÑÐ»Ð°Ð¶Ð´Ð°Ð¹Ñ‚ÐµÑÑŒ Ñ€ÐµÐ·ÑƒÐ»ÑŒÑ‚Ð°Ñ‚Ð°Ð¼Ð¸',
    step3_desc: 'Ð¡Ð»ÐµÐ´Ð¸Ñ‚Ðµ Ð·Ð° Ð¿Ñ€Ð¾Ð³Ñ€ÐµÑÑÐ¾Ð¼ Ð¸Ð· Ð¿Ð°Ð½ÐµÐ»Ð¸ ÑƒÐ¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¸Ñ, Ð¿Ð¾ÐºÐ° Ð±Ð¾Ñ‚ Ñ€Ð°Ð±Ð¾Ñ‚Ð°ÐµÑ‚ Ð·Ð° Ð²Ð°Ñ.',
    pricing_title: 'ðŸ’Ž Ð¢Ð°Ñ€Ð¸Ñ„Ð½Ñ‹Ðµ Ð¿Ð»Ð°Ð½Ñ‹',
    pricing_free_title: 'Ð‘ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ñ‹Ð¹',
    pricing_free_price: '$0',
    pricing_free_f1: 'âœ“ 1 Ñ„ÐµÑ€Ð¼Ð°',
    pricing_free_f2: 'âœ“ Ð‘Ð°Ð·Ð¾Ð²Ñ‹Ð¹ ÑÐ±Ð¾Ñ€ Ñ€ÐµÑÑƒÑ€ÑÐ¾Ð²',
    pricing_free_f3: 'âœ“ 7 Ð´Ð½ÐµÐ¹ Ð¿Ñ€Ð¾Ð±Ð½Ð¾Ð³Ð¾ Ð¿ÐµÑ€Ð¸Ð¾Ð´Ð°',
    pricing_free_cta: 'ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾',
    pricing_pro_title: 'ÐŸÑ€Ð¾',
    pricing_pro_price: '$2',
    pricing_pro_f1: 'âœ“ Ð‘ÐµÐ·Ð»Ð¸Ð¼Ð¸Ñ‚Ð½Ñ‹Ðµ Ñ„ÐµÑ€Ð¼Ñ‹',
    pricing_pro_f2: 'âœ“ ÐŸÑ€Ð¾Ð´Ð²Ð¸Ð½ÑƒÑ‚Ð°Ñ Ð·Ð°Ñ‰Ð¸Ñ‚Ð°',
    pricing_pro_f3: 'âœ“ ÐŸÑ€Ð¸Ð¾Ñ€Ð¸Ñ‚ÐµÑ‚Ð½Ð°Ñ Ð¿Ð¾Ð´Ð´ÐµÑ€Ð¶ÐºÐ°',
    pricing_pro_f4: 'âœ“ ÐŸÑ€Ð¾Ð´Ð²Ð¸Ð½ÑƒÑ‚Ð°Ñ Ð¿Ð°Ð½ÐµÐ»ÑŒ',
    pricing_pro_cta: 'ÐŸÐ¾Ð´Ð¿Ð¸ÑÐ°Ñ‚ÑŒÑÑ',
    footer_text: 'Â© 2026 VRBOT. Ð’ÑÐµ Ð¿Ñ€Ð°Ð²Ð° Ð·Ð°Ñ‰Ð¸Ñ‰ÐµÐ½Ñ‹.',
  },
  zh: {
    hero_title: 'VRBOT',
    hero_subtitle: 'Viking Rise æ™ºèƒ½è‡ªåŠ¨åŒ–æœºå™¨äºº',
    hero_desc: 'ç®¡ç†å†œåœºã€æ”¶é›†èµ„æºã€å‡çº§è´¦å·â€”â€”å…¨å¤©å€™è‡ªåŠ¨è¿è¡Œï¼Œæ— éœ€æ‰‹åŠ¨æ“ä½œã€‚',
    cta_early: 'ðŸš€ å…è´¹å¼€å§‹',
    cta_pricing: 'ðŸ’° æŸ¥çœ‹ä»·æ ¼',
    features_title: 'âš¡ ä¸ºä»€ä¹ˆé€‰æ‹© VRBOTï¼Ÿ',
    f1_title: 'ðŸŒ¾ è‡ªåŠ¨å†œåœºç®¡ç†',
    f1_desc: 'æŒç»­æ”¶é›†èµ„æºã€å‡çº§å’Œæ”¶èŽ·ï¼Œæ— éœ€ä»»ä½•å¹²é¢„ã€‚',
    f2_title: 'ðŸ›¡ï¸ æ™ºèƒ½ä¿æŠ¤',
    f2_desc: 'é«˜çº§äººç±»è¡Œä¸ºæ¨¡æ‹Ÿï¼Œä¿æŠ¤æ‚¨çš„è´¦å·å…å—å°ç¦ã€‚',
    f3_title: 'ðŸ“Š å®žæ—¶ä»ªè¡¨æ¿',
    f3_desc: 'éšæ—¶éšåœ°å®žæ—¶ç›‘æŽ§æ‚¨çš„å†œåœºå’Œèµ„æºã€‚',
    f4_title: 'ðŸŒ å¤šè¯­è¨€æ”¯æŒ',
    f4_desc: 'ç•Œé¢æ”¯æŒé˜¿æ‹‰ä¼¯è¯­ã€è‹±è¯­ã€ä¿„è¯­å’Œä¸­æ–‡ã€‚',
    stats_farms: 'æ´»è·ƒå†œåœº',
    stats_resources: 'å·²æ”¶é›†èµ„æº',
    stats_uptime: 'è¿è¡Œæ—¶é—´',
    stats_languages: 'ç§è¯­è¨€',
    how_title: 'ðŸŽ¯ å¦‚ä½•è¿ä½œ',
    step1_title: '1. åˆ›å»ºè´¦å·',
    step1_desc: 'å…è´¹æ³¨å†Œï¼Œå‡ åˆ†é’Ÿå†…æ·»åŠ æ‚¨çš„ç¬¬ä¸€ä¸ªå†œåœºã€‚',
    step2_title: '2. æ¿€æ´»æœºå™¨äºº',
    step2_desc: 'é€‰æ‹©è®¾ç½®ï¼Œä¸€é”®å¯åŠ¨æœºå™¨äººã€‚',
    step3_title: '3. äº«å—æˆæžœ',
    step3_desc: 'åœ¨ä»ªè¡¨æ¿ä¸Šè·Ÿè¸ªè¿›åº¦ï¼Œæœºå™¨äººä¸ºæ‚¨å·¥ä½œã€‚',
    pricing_title: 'ðŸ’Ž ä»·æ ¼æ–¹æ¡ˆ',
    pricing_free_title: 'å…è´¹ç‰ˆ',
    pricing_free_price: '$0',
    pricing_free_f1: 'âœ“ 1ä¸ªå†œåœº',
    pricing_free_f2: 'âœ“ åŸºç¡€èµ„æºæ”¶é›†',
    pricing_free_f3: 'âœ“ 7å¤©è¯•ç”¨',
    pricing_free_cta: 'å…è´¹å¼€å§‹',
    pricing_pro_title: 'ä¸“ä¸šç‰ˆ',
    pricing_pro_price: '$2',
    pricing_pro_f1: 'âœ“ æ— é™å†œåœº',
    pricing_pro_f2: 'âœ“ é«˜çº§ä¿æŠ¤',
    pricing_pro_f3: 'âœ“ ä¼˜å…ˆæ”¯æŒ',
    pricing_pro_f4: 'âœ“ é«˜çº§ä»ªè¡¨æ¿',
    pricing_pro_cta: 'ç«‹å³è®¢é˜…',
    footer_text: 'Â© 2026 VRBOT. ä¿ç•™æ‰€æœ‰æƒåˆ©ã€‚',
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Language;
    if (saved && content[saved]) {
      setLang(saved);
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const t = content[lang];
  const isRtl = lang === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: lang === 'ar' ? "'Noto Sans Arabic', 'Segoe UI', sans-serif" : lang === 'zh' ? "'Noto Sans SC', 'PingFang SC', sans-serif" : lang === 'ru' ? "'Noto Sans', 'Segoe UI', sans-serif" : "'Noto Sans', 'Segoe UI', sans-serif" }}>
      
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background particles */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 48, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(0, 212, 255, 0.08) 0%, transparent 50%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '40px 24px',
          maxWidth: '800px',
        }}>
          {/* Logo with glow */}
          <div style={{
            fontSize: '80px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 0 30px rgba(120, 119, 198, 0.6))',
            animation: 'float 3s ease-in-out infinite',
          }}>
            ðŸ¤–
          </div>
          
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '6px',
            marginBottom: '12px',
            textShadow: '0 0 40px rgba(120, 119, 198, 0.4)',
          }}>
            {t.hero_title}
          </h1>
          
          <p style={{
            fontSize: 'clamp(18px, 3vw, 26px)',
            color: '#c4b5fd',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            {t.hero_subtitle}
          </p>
          
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.8,
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}>
            {t.hero_desc}
          </p>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <a href="/early-access" style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#ffffff',
              padding: '16px 36px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '17px',
              fontWeight: 700,
              boxShadow: '0 4px 24px rgba(124, 58, 237, 0.4)',
              transition: 'all 0.3s',
              display: 'inline-block',
            }}>
              {t.cta_early}
            </a>
            <a href="/pricing" style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              padding: '16px 36px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '17px',
              fontWeight: 700,
              border: '2px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
              display: 'inline-block',
            }}>
              {t.cta_pricing}
            </a>
          </div>
        </div>
        
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </section>

      {/* Stats Bar */}
      <section style={{
        background: 'linear-gradient(90deg, #1e1b4b, #312e81)',
        padding: '32px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: '48px',
        flexWrap: 'wrap',
      }}>
        {[
          { num: '500+', label: t.stats_farms },
          { num: '68M+', label: t.stats_resources },
          { num: '99.9%', label: t.stats_uptime },
          { num: '4', label: t.stats_languages },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#a78bfa',
              marginBottom: '4px',
            }}>{stat.num}</div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{
        background: '#0f0e1a',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '56px',
        }}>
          {t.features_title}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
          {[
            { title: t.f1_title, desc: t.f1_desc, gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03))' },
            { title: t.f2_title, desc: t.f2_desc, gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))' },
            { title: t.f3_title, desc: t.f3_desc, gradient: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.03))' },
            { title: t.f4_title, desc: t.f4_desc, gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.03))' },
          ].map((f, i) => (
            <div key={i} style={{
              background: f.gradient,
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '32px',
              transition: 'transform 0.3s, box-shadow 0.3s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '12px',
              }}>{f.title}</h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.7,
              }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        background: 'linear-gradient(180deg, #0f0e1a, #1a1833)',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '56px',
        }}>
          {t.how_title}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '32px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {[
            { title: t.step1_title, desc: t.step1_desc, icon: 'ðŸ“' },
            { title: t.step2_title, desc: t.step2_desc, icon: 'âš¡' },
            { title: t.step3_title, desc: t.step3_desc, icon: 'ðŸ†' },
          ].map((step, i) => (
            <div key={i} style={{
              textAlign: 'center',
              padding: '32px 24px',
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 20px',
                boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3)',
              }}>
                {step.icon}
              </div>
              <h3 style={{
                fontSize: '19px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '10px',
              }}>{step.title}</h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.7,
              }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        background: '#0f0e1a',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '56px',
        }}>
          {t.pricing_title}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '28px',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          {/* Free Plan */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '40px 32px',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>
              {t.pricing_free_title}
            </h3>
            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '24px',
            }}>
              {t.pricing_free_price}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '32px',
              textAlign: isRtl ? 'right' : 'left',
            }}>
              {[t.pricing_free_f1, t.pricing_free_f2, t.pricing_free_f3].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/signup" style={{
              display: 'block',
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              {t.pricing_free_cta}
            </a>
          </div>
          
          {/* Pro Plan */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(124,58,237,0.15), rgba(168,85,247,0.08))',
            border: '2px solid rgba(124,58,237,0.4)',
            borderRadius: '20px',
            padding: '40px 32px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 8px 40px rgba(124,58,237,0.15)',
          }}>
            <div style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff',
              padding: '4px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
            }}>â­ POPULAR</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px' }}>
              {t.pricing_pro_title}
            </h3>
            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#ffffff',
              marginBottom: '4px',
            }}>
              {t.pricing_pro_price}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>
              {lang === 'ar' ? '/ Ø´Ù‡Ø±ÙŠØ§Ù‹' : lang === 'ru' ? '/ Ð¼ÐµÑÑÑ†' : lang === 'zh' ? '/ æœˆ' : '/ month'}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '32px',
              textAlign: isRtl ? 'right' : 'left',
            }}>
              {[t.pricing_pro_f1, t.pricing_pro_f2, t.pricing_pro_f3, t.pricing_pro_f4].map((f, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px' }}>{f}</span>
              ))}
            </div>
            <a href="/billing" style={{
              display: 'block',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
            }}>
              {t.pricing_pro_cta}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#080714',
        padding: '32px 24px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '14px',
        }}>
          {t.footer_text}
        </p>
      </footer>
    </div>
  );
}
