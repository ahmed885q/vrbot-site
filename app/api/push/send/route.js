// app/api/push/send/route.js
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function initVapid() {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:admin@vrbot.me',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    return true
  }
  return false
}

export async function POST(request) {
  try {
    if (!initVapid())
      return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 })
    if (request.headers.get('x-webhook-secret') !== process.env.WEBHOOK_SECRET)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { channel_id, user_id, content, username } = await request.json()
    const { data: ch } = await getDB().from('chat_channels').select('name,slug').eq('id', channel_id).single()
    const { data: subs } = await getDB().from('push_subscriptions').select('endpoint,p256dh,auth').neq('user_id', user_id)
    if (!subs?.length) return NextResponse.json({ sent: 0 })
    const payload = JSON.stringify({ title: 'VRBOT Chat', body: (username||'مستخدم')+': '+content.slice(0,100), icon: '/vrbot-icon.png', tag: 'ch-'+channel_id, url: '/dashboard/chat' })
    const results = await Promise.allSettled(subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload).catch(async err => { if (err.statusCode===410) await getDB().from('push_subscriptions').delete().eq('endpoint', s.endpoint); throw err })))
    return NextResponse.json({ sent: results.filter(r => r.status==='fulfilled').length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
