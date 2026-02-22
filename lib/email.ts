import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "VRBOT <onboarding@resend.dev>";

export async function sendPaymentConfirmation(to: string, farms: number, amount: string, txnId: string) {
  try {
    await resend.emails.send({
      from: FROM, to, subject: "VRBOT - Payment Confirmed!",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a1a;color:#e0e0e0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:24px">Payment Confirmed!</h1>
          </div>
          <div style="padding:24px">
            <p>Your payment has been processed successfully.</p>
            <div style="background:#141428;border:1px solid #2a2a3a;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0"><strong>Farms:</strong> ${farms}</p>
              <p style="margin:4px 0"><strong>Amount:</strong> $${amount}</p>
              <p style="margin:4px 0"><strong>Transaction:</strong> ${txnId}</p>
            </div>
            <p>Your farm tokens have been added to your account. Visit <a href="https://www.vrbot.me/farms" style="color:#3b82f6">vrbot.me/farms</a> to manage them.</p>
            <p style="color:#888;font-size:12px;margin-top:24px">Thank you for choosing VRBOT!</p>
          </div>
        </div>`,
    });
    console.log("[Email] Payment confirmation sent to", to);
  } catch (e) { console.error("[Email] Payment confirmation failed:", e); }
}

export async function sendWelcomeEmail(to: string) {
  try {
    await resend.emails.send({
      from: FROM, to, subject: "Welcome to VRBOT!",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a1a;color:#e0e0e0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:24px">Welcome to VRBOT!</h1>
          </div>
          <div style="padding:24px">
            <p>Your account has been created successfully.</p>
            <div style="background:#141428;border:1px solid #2a2a3a;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0"><strong>What you can do:</strong></p>
              <ul style="color:#ccc">
                <li>Auto farming 24/7</li>
                <li>Resource collection</li>
                <li>Building & upgrading</li>
                <li>Troop training</li>
                <li>Send & collect gifts</li>
              </ul>
            </div>
            <a href="https://www.vrbot.me/billing" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Get Started</a>
            <p style="color:#888;font-size:12px;margin-top:24px">Need help? Contact us anytime.</p>
          </div>
        </div>`,
    });
    console.log("[Email] Welcome sent to", to);
  } catch (e) { console.error("[Email] Welcome failed:", e); }
}

export async function sendSubscriptionExpiring(to: string, daysLeft: number) {
  try {
    await resend.emails.send({
      from: FROM, to, subject: `VRBOT - Subscription expiring in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a1a;color:#e0e0e0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:24px">Subscription Expiring Soon</h1>
          </div>
          <div style="padding:24px">
            <p>Your VRBOT subscription will expire in <strong style="color:#f59e0b">${daysLeft} day${daysLeft > 1 ? "s" : ""}</strong>.</p>
            <p>To keep your farms running, please renew your subscription.</p>
            <a href="https://www.vrbot.me/billing" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px">Renew Now</a>
            <p style="color:#888;font-size:12px;margin-top:24px">If you've already renewed, please ignore this email.</p>
          </div>
        </div>`,
    });
    console.log("[Email] Expiring notice sent to", to);
  } catch (e) { console.error("[Email] Expiring notice failed:", e); }
}
