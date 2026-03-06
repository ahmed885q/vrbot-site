// app/api/push/send/route.js
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
webpush.setVapidDetails('mailto:admin@vrbot.me', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
export async function POST(request) {
  try {
    if (request.headers.get('x-webhook-secret') !== process.env.WEBHOOK_SECRET)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { channel_id, user_id, content, username } = await request.json()
    const { data: ch }   = await admin.from('chat_channels').select('name,slug').eq('id', channel_id).single()
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint,p256dh,auth').neq('user_id', user_id)
    if (!subs?.length) return NextResponse.json({ sent: 0 })
    const payload = JSON.stringify({ title: 'VRBOT Chat â€” #' + (ch?.name || 'Ø¹Ø§Ù…'), body: (username || 'Ù…Ø³ØªØ®Ø¯Ù…') + ': ' + content.slice(0, 100), icon: '/vrbot-icon.png', tag: 'ch-' + channel_id, url: '/dashboard/chat?channel=' + (ch?.slug || '') })
    const results = await Promise.allSettled(subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload).catch(async err => { if (err.statusCode === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint); throw err })))
    return NextResponse.json({ sent: results.filter(r => r.status === 'fulfilled').length })
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}