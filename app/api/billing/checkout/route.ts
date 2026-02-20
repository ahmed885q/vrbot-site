export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';

const FARM_PRICE = 2.00;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const env = process.env.PAYPAL_ENV || 'sandbox';

  console.log('PayPal ENV:', env);
  console.log('PayPal Client ID exists:', !!clientId, 'length:', clientId?.length);
  console.log('PayPal Secret exists:', !!clientSecret, 'length:', clientSecret?.length);

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const baseUrl = env === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('PayPal token error:', JSON.stringify(data));
    throw new Error(`PayPal token error: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { farms = 1, email } = body;

    if (farms < 1 || farms > 500) {
      return NextResponse.json({ error: 'Invalid farm count' }, { status: 400 });
    }

    const totalAmount = (farms * FARM_PRICE).toFixed(2);
    const env = process.env.PAYPAL_ENV || 'sandbox';
    const baseUrl = env === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vrbot-site.vercel.app';

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `vrbot-farms-${Date.now()}`,
            description: `VRBOT - ${farms} Farm License`,
            amount: {
              currency_code: 'USD',
              value: totalAmount,
              breakdown: {
                item_total: { currency_code: 'USD', value: totalAmount },
              },
            },
            items: [
              {
                name: 'VRBOT Farm License',
                description: `${farms} farm(s) - 1 month`,
                quantity: String(farms),
                unit_amount: { currency_code: 'USD', value: FARM_PRICE.toFixed(2) },
                category: 'DIGITAL_GOODS',
              },
            ],
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'VRBOT',
              landing_page: 'LOGIN',
              user_action: 'PAY_NOW',
              return_url: `${appUrl}/api/billing/paypal-success?farms=${farms}&email=${encodeURIComponent(email || '')}`,
              cancel_url: `${appUrl}/billing?canceled=1`,
            },
          },
        },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('PayPal order error:', errText);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const orderData = await orderRes.json();
    const approvalLink = orderData.links?.find(
      (link: { rel: string; href: string }) => link.rel === 'approve' || link.rel === 'payer-action'
    );

    if (!approvalLink) {
      return NextResponse.json({ error: 'No approval link' }, { status: 500 });
    }

    return NextResponse.json({ url: approvalLink.href, orderId: orderData.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
