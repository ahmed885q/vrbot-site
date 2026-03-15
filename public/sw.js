// public/sw.js — VRBOT Service Worker (Chat + Farm Alerts)
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { body: event.data.text() } }

  const title = data.title || '⚔️ VRBOT'
  const opts  = {
    body:     data.body || 'رسالة جديدة',
    icon:     data.icon || '/vrbot-icon.png',
    badge:    '/vrbot-badge.png',
    vibrate:  [200, 100, 200],
    tag:      data.tag || data.data?.farm_id || 'vrbot',
    renotify: true,
    data:     data.data || { url: data.url || '/dashboard' },
    actions: [
      { action: 'open',    title: data.data?.farm_id ? 'فتح المزرعة' : 'فتح الشات' },
      { action: 'dismiss', title: 'تجاهل' },
    ]
  }
  event.waitUntil(self.registration.showNotification(title, opts))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const farmId = event.notification.data?.farm_id
  const url = farmId
    ? `/dashboard/live`
    : (event.notification.data?.url || '/dashboard/chat')

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/dashboard') && 'focus' in c) {
          c.focus()
          c.postMessage({ type: 'NAVIGATE', url })
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})