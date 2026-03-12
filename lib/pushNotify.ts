import webpush from "web-push";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@vrbot.me";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function sendPushToUser(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data,
  });

  const results = await Promise.allSettled(
    subs.map((sub: any) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  // Clean up expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected" && (r.reason as any)?.statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subs[i].endpoint);
    }
  }
}
