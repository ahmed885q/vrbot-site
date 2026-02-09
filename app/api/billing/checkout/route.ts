export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getPayPalAccessToken } from '@/lib/paypal';

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vrbot-site.vercel.app';
const FARM_PRICE = 2.00; // $2 per farm

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { farms = 1, email } = body;

    // Validate
    if (farms < 1 || farms > 500) {
      return NextResponse.json(
        { error: 'عدد المزارع يجب أن يكون بين 1 و 500' },
        { status: 400 }
      );
    }

    const totalAmount = (farms * FARM_PRICE).toFixed(2);
    const accessToken = await getPayPalAccessToken();

    // Create PayPal Order
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `vrbot-farms-${Date.now()}`,
            description: `VRBOT - ${farms} مزرعة (Viking Rise Bot)`,
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
                description: `رخصة ${farms} مزرعة - شهر واحد`,
                quantity: String(farms),
                unit_amount: {
                  currency_code: 'USD',
                  value: FARM_PRICE.toFixed(2),
                },
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
              return_url: `${APP_URL}/api/billing/paypal-success?farms=${farms}&email=${encodeURIComponent(email || '')}`,
              cancel_url: `${APP_URL}/pricing?canceled=1`,
            },
          },
        },
        application_context: {
          brand_name: 'VRBOT',
          locale: 'ar-SA',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('PayPal order error:', errText);
      return NextResponse.json(
        { error: 'فشل في إنشاء طلب الدفع' },
        { status: 500 }
      );
    }

    const orderData = await orderRes.json();

    // Find approval URL
    const approvalLink = orderData.links?.find(
      (link: any) => link.rel === 'approve' || link.rel === 'payer-action'
    );

    if (!approvalLink) {
      return NextResponse.json(
        { error: 'لم يتم العثور على رابط الدفع' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: approvalLink.href,
      orderId: orderData.id,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في عملية الدفع' },
      { status: 500 }
    );
  }
}
