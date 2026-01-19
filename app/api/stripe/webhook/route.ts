import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// ✅ Supabase admin (Service role) - لا تستخدمه في الواجهة/المتصفح أبدًا
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function toPeriodEnd(periodEndUnix?: number | null) {
  if (!periodEndUnix) return null
  return new Date(periodEndUnix * 1000).toISOString()
}

async function markEventProcessed(eventId: string) {
  // Idempotency: لو الحدث موجود نوقف
  const { error } = await supabaseAdmin
    .from('stripe_events')
    .insert({ id: eventId })

  if (!error) return { ok: true as const }
  // duplicate key -> تمت معالجته سابقًا
  if (String(error.message).toLowerCase().includes('duplicate')) {
    return { ok: false as const, duplicate: true as const }
  }
  return { ok: false as const, duplicate: false as const, error }
}

async function upsertSubscriptionByUserId(params: {
  userId: string
  plan?: 'free' | 'pro'
  status?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
}) {
  const payload = {
    user_id: params.userId,
    plan: params.plan ?? 'pro',
    status: params.status ?? null,
    stripe_customer_id: params.stripe_customer_id ?? null,
    stripe_subscription_id: params.stripe_subscription_id ?? null,
    current_period_end: params.current_period_end ?? null,
    cancel_at_period_end: params.cancel_at_period_end ?? false,
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) throw error
}

async function findUserIdByCustomerId(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error) throw error
  return data?.user_id ?? null
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature/secret' }, { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // ✅ Idempotency
  const marked = await markEventProcessed(event.id)
  if (!marked.ok && marked.duplicate) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (!marked.ok && !marked.duplicate) {
    return NextResponse.json({ error: 'Failed idempotency insert' }, { status: 500 })
  }

  try {
    switch (event.type) {
      // ✅ أهم حدث للربط: يجيب userId من client_reference_id
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.userId
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id

        if (!userId) break

        await upsertSubscriptionByUserId({
          userId,
          plan: 'pro',
          status: 'active',
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
        })
        break
      }

      // ✅ تحديث الاشتراك / إلغاء / تغيير حالة
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (!customerId) break

        const userId = await findUserIdByCustomerId(customerId)
        if (!userId) break

        const status = sub.status
        const periodEnd = toPeriodEnd((sub as any).current_period_end ?? null)
        const cancelAtPeriodEnd = !!sub.cancel_at_period_end

        const isActive = status === 'active' || status === 'trialing'
        await upsertSubscriptionByUserId({
          userId,
          plan: isActive ? 'pro' : 'free',
          status,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          current_period_end: periodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
        })
        break
      }

      // ✅ نجاح الدفع = تأكيد Pro
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (!customerId) break

        const userId = await findUserIdByCustomerId(customerId)
        if (!userId) break

        await upsertSubscriptionByUserId({
          userId,
          plan: 'pro',
          status: 'active',
          stripe_customer_id: customerId,
        })
        break
      }

      // ✅ فشل الدفع = downgrade (اختياري، أو خليه past_due)
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (!customerId) break

        const userId = await findUserIdByCustomerId(customerId)
        if (!userId) break

        await upsertSubscriptionByUserId({
          userId,
          plan: 'free',
          status: 'past_due',
          stripe_customer_id: customerId,
        })
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Webhook handler failed' }, { status: 500 })
  }
}
