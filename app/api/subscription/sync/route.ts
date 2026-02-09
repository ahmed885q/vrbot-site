import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }

export async function POST(req: Request) {
  const { subscriptionId, userId } = await req.json()

  // بعض نسخ stripe ترجع Response، وبعضها ترجع Subscription مباشرة
  const res = await getStripe().subscriptions.retrieve(subscriptionId as string)
  const sub = (res as any).data ?? res

  const currentPeriodEnd =
    typeof (sub as any).current_period_end === 'number'
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null

  const plan =
    (sub as any).status === 'active' || (sub as any).status === 'trialing' ? 'pro' : 'free'

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        plan,
        status: (sub as any).status ?? null,
        stripe_customer_id:
          typeof (sub as any).customer === 'string' ? (sub as any).customer : (sub as any).customer?.id ?? null,
        stripe_subscription_id: (sub as any).id ?? subscriptionId,
        price_id: (sub as any).items?.data?.[0]?.price?.id ?? null,
        current_period_end: currentPeriodEnd,
      },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, currentPeriodEnd })
}
