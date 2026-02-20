// app/bot/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import BotUI from '@/components/BotUI' // تأكد من أن هذا هو المكون المحدث

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRIAL_DAYS = 7

function isExpired(periodEnd: string | null) {
  if (!periodEnd) return true
  return new Date(periodEnd).getTime() < Date.now()
}

export default async function BotPage() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )

  // 1) المستخدم
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>🎮 نظام Viking Rise Bot</h1>
          <p style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          
          </p>
        </header>
        
        <main>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            background: '#fff',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>الوصول مقيد</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              يرجى تسجيل الدخول للوصول إلى نظام البوت.
            </p>
            <a href="/auth" style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 12,
              background: '#111827',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: 14
            }}>
              الذهاب إلى صفحة تسجيل الدخول
            </a>
          </div>
        </main>
        
        <footer style={{ marginTop: 48, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
          <p>
          
          </p>
          <p style={{ marginTop: 8 }}>الإصدار 2.0.0 - نظام Viking Rise المتكامل</p>
        </footer>
      </div>
    )
  }

  // 2) قراءة الاشتراك
  let { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  // 3) إذا ما فيه سجل: أنشئ Trial أسبوع
  if (!sub) {
    const end = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: created } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'trial',
        status: 'trialing',
        current_period_end: end,
      })
      .select('plan,status,current_period_end')
      .single()

    sub = created ?? { plan: 'trial', status: 'trialing', current_period_end: end }
  }

  const plan = sub?.plan ?? 'free'
  const status = sub?.status ?? '-'
  const periodEnd = sub?.current_period_end ?? null

  const allowed =
    (status === 'trialing' || status === 'active') && !isExpired(periodEnd)

  // 4) مقفل بعد انتهاء التجربة
  if (!allowed) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>🎮 نظام Viking Rise Bot</h1>
          <p style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
          
          </p>
        </header>
        
        <main>
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 32,
            background: '#fff',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>وصول البوت مقفل</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              انتهت فترة التجربة المجانية الخاصة بك. سيتم تمكين المدفوعات لاحقًا عبر PayPal.
            </p>

            <div style={{
              border: '1px solid #f1f5f9',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
              background: '#f8fafc'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>الحالة الحالية</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>الخطة:</span>
                  <span>{String(plan)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>الحالة:</span>
                  <span>{String(status)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>تاريخ الانتهاء:</span>
                  <span>{periodEnd ? new Date(periodEnd).toLocaleString('ar-SA') : '-'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/dashboard" style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#111827',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: 14
              }}>
                الذهاب إلى لوحة التحكم
              </a>

              <a
                href="mailto:ahmed85q@hotmail.com?subject=VRBOT%20Access%20Request"
                style={{
                  padding: '12px 24px',
                  borderRadius: 12,
                  background: '#111827',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: 14
                }}
              >
                طلب الوصول
              </a>
            </div>
          </div>
        </main>
        
        <footer style={{ marginTop: 48, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
          <p>
            
          </p>
          <p style={{ marginTop: 8 }}>الإصدار 2.0.0 - نظام Viking Rise المتكامل</p>
        </footer>
      </div>
    )
  }

  // ✅ UI البوت الحقيقي
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>🎮 نظام Viking Rise Bot</h1>
        <p style={{ marginTop: 8, color: '#6b7280', fontSize: 16 }}>
        
        </p>
        
        <div style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 12,
          background: '#f0f9ff',
          border: '1px solid #e0f2fe',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: '#dcfce7',
              color: '#166534',
              fontSize: 12,
              fontWeight: 800
            }}>
              {plan === 'trial' ? 'تجريبي' : plan === 'pro' ? 'محترف' : plan}
            </span>
            <span style={{ fontWeight: 700 }}>{user.email}</span>
          </div>
          
          <div style={{ fontSize: 12, color: '#64748b' }}>
            تاريخ انتهاء الصلاحية: {periodEnd ? new Date(periodEnd).toLocaleDateString('ar-SA') : '-'}
          </div>
        </div>
      </header>
      
      <main>
        <BotUI email={user.email ?? ''} userId={user.id} plan={plan} status={status} />
      </main>
      
      <footer style={{ marginTop: 48, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
        <p>
          
        </p>
        <p style={{ marginTop: 8 }}>الإصدار 2.0.0 - نظام Viking Rise المتكامل مع BotUI</p>
      </footer>
    </div>
  )
}