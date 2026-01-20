import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json()
    const origin = req.headers.get('origin')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // 🔴 مهم جدًا أن تكون subscription
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!, // 🔗 الـ Price ID اللي ضبطناه في Vercel
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
      metadata: { userId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error', err)
    return NextResponse.json({ error: 'Unable to create session' }, { status: 500 })
  }
}
