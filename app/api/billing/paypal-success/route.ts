export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getPayPalAccessToken } from '@/lib/paypal';

const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vrbot-site.vercel.app';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token'); // PayPal order ID
    const farms = searchParams.get('farms') || '1';
    const email = searchParams.get('email') || '';

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/dashboard?error=missing_token`);
    }

    // Capture the payment
    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!captureRes.ok) {
      const errText = await captureRes.text();
      console.error('PayPal capture error:', errText);
      return NextResponse.redirect(`${APP_URL}/dashboard?error=payment_failed`);
    }

    const captureData = await captureRes.json();
    const paymentStatus = captureData.status;

    if (paymentStatus === 'COMPLETED') {
      // Payment successful - activate farms
      const payerEmail = captureData.payer?.email_address || email;
      const transactionId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      const amountPaid = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;

      // Call backend API to activate farms
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://88.99.64.19:3001';
        await fetch(`${API_URL}/api/activate-farms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: payerEmail,
            farms: parseInt(farms),
            transactionId,
            amountPaid,
            paypalOrderId: token,
          }),
        });
      } catch (e) {
        console.error('Backend activation error:', e);
        // Continue anyway - payment was successful
      }

      // Redirect to success page
      return NextResponse.redirect(
        `${APP_URL}/dashboard?checkout=success&farms=${farms}&txn=${transactionId || token}`
      );
    } else {
      return NextResponse.redirect(
        `${APP_URL}/dashboard?error=payment_incomplete&status=${paymentStatus}`
      );
    }
  } catch (err) {
    console.error('PayPal success handler error:', err);
    return NextResponse.redirect(`${APP_URL}/dashboard?error=unknown`);
  }
}
