// app/bot/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import BotUI from '@/components/BotUI'

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
      <div className="bot-page">
        <header className="bot-header">
          <h1>🎮 نظام Viking Rise Bot التعليمي</h1>
          <p className="subtitle">نظام متكامل مع أنظمة الحماية والتعلّم</p>
        </header>
        
        <main className="bot-main">
          <div className="auth-required">
            <h2>الوصول مقيد</h2>
            <p>يرجى تسجيل الدخول للوصول إلى نظام البوت.</p>
            <a href="/auth" className="auth-button">
              الذهاب إلى صفحة تسجيل الدخول
            </a>
          </div>
        </main>
        
        <footer className="bot-footer">
          <p className="disclaimer">
            ⚠️ هذا النظام للأغراض التعليمية والبحثية فقط. 
            يجب استخدامه فقط على أنظمة تطوير محلية.
          </p>
          <p className="version"></p>
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
      <div className="bot-page">
        <header className="bot-header">
          <h1>🎮 نظام Viking Rise Bot التعليمي</h1>
          <p className="subtitle">نظام متكامل مع أنظمة الحماية والتعلّم</p>
        </header>
        
        <main className="bot-main">
          <div className="access-locked">
            <h2>وصول البوت مقفل</h2>
            <p>
              انتهت فترة التجربة المجانية الخاصة بك. سيتم تمكين المدفوعات لاحقًا عبر PayPal.
            </p>

            <div className="status-info">
              <h3>الحالة الحالية</h3>
              <p><strong>الخطة:</strong> {String(plan)}</p>
              <p><strong>الحالة:</strong> {String(status)}</p>
              <p>
                <strong>تاريخ الانتهاء:</strong>{' '}
                {periodEnd ? new Date(periodEnd).toLocaleString('ar-SA') : '-'}
              </p>
            </div>

            <div className="action-buttons">
              <a href="/dashboard" className="dashboard-button">
                الذهاب إلى لوحة التحكم
              </a>

              <a
                href="mailto:ahmed85q@hotmail.com?subject=VRBOT%20Access%20Request"
                className="request-button"
              >
                طلب الوصول
              </a>
            </div>
          </div>
        </main>
        
        <footer className="bot-footer">
          <p className="disclaimer">
            ⚠️ هذا النظام للأغراض التعليمية والبحثية فقط. 
            يجب استخدامه فقط على أنظمة تطوير محلية.
          </p>
  
        </footer>
      </div>
    )
  }

  // ✅ UI البوت الحقيقي
  return (
    <div className="bot-page">
      <header className="bot-header">
        <h1>🎮 نظام Viking Rise Bot التعليمي</h1>
        <p className="subtitle">نظام متكامل مع أنظمة الحماية والتعلّم</p>
      </header>
      
      <main className="bot-main">
        <BotUI email={user.email ?? ''} userId={user.id} plan={plan} status={status} />
      </main>
      
      <footer className="bot-footer">
        <p className="disclaimer">
          ⚠️ هذا النظام للأغراض التعليمية والبحثية فقط. 
          يجب استخدامه فقط على أنظمة تطوير محلية.
        </p>
       
      </footer>
    </div>
  )
}