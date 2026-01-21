import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function BotPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/subscription/status`, {
    cache: 'no-store',
  }).catch(() => null)

  // لو محلي وما عندك NEXT_PUBLIC_APP_URL:
  // استخدم fetch('/api/subscription/status') داخل Client Page
  // لكن هنا Server Component، فالأفضل تضبط NEXT_PUBLIC_APP_URL في env.

  if (!res || !res.ok) {
    redirect('/dashboard?bot=blocked')
  }

  const data = await res.json()

  if (!data?.entitled) {
    redirect('/dashboard?trial=ended')
  }

  // ✅ هنا فقط يظهر البوت للمؤهلين
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>VRBOT</h1>
      <p style={{ marginTop: 10, color: '#64748b' }}>
        You have access ({data.plan} / {data.status})
      </p>

      {/* ضع واجهة البوت هنا */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #e5e7eb', borderRadius: 12 }}>
        Bot UI goes here…
      </div>
    </div>
  )
}
