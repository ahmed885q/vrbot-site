import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  try {
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [
    {
      price: process.env.STRIPE_PRICE_PRO!,
      quantity: 1,
    },
  ],
success_url: `${process.env.NEXT_PUBLIC_APP_URL}/test-success`,
})


    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json(
      { error: 'Stripe checkout failed' },
      { status: 500 }
    )
  }
}
