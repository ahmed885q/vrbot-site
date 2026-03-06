// public/sw.js
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e  => e.waitUntil(clients.claim()))
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}; try { data = event.data.json() } catch { data = { body: event.data.text() } }
  event.waitUntil(self.registration.showNotification(data.title || 'VRBOT Chat', {
    body: data.body || 'Ø±Ø³Ø§Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø©', icon: '/vrbot-icon.png', badge: '/vrbot-badge.png',
    tag: data.tag || 'vrbot-chat', renotify: true, vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard/chat' },
    actions: [{ action: 'open', title: 'ÙØªØ­ Ø§Ù„Ø´Ø§Øª' }, { action: 'dismiss', title: 'ØªØ¬Ø§Ù‡Ù„' }]
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url || '/dashboard/chat'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.includes('/dashboard') && 'focus' in c) { c.focus(); c.postMessage({ type: 'NAVIGATE', url }); return } }
    if (clients.openWindow) return clients.openWindow(url)
  }))
})