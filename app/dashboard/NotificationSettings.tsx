"use client";

import { useState, useEffect } from "react";

type Lang = "ar" | "en";

const t: Record<Lang, Record<string, string>> = {
  ar: {
    notifications: "إشعارات",
    pushNotifications: "إشعارات الدفع",
    enablePush: "تفعيل إشعارات الدفع",
    disablePush: "تعطيل إشعارات الدفع",
    subscribed: "مشترك",
    notSubscribed: "غير مشترك",
    testNotification: "إرسال إشعار اختبار",
    subscriptionStatus: "حالة الاشتراك",
    enableNotifications: "السماح بالإشعارات",
    browserNotSupported: "المتصفح لا يدعم الإشعارات",
    permissionDenied: "تم رفض إذن الإشعارات",
    testSent: "تم إرسال إشعار الاختبار",
    error: "خطأ",
  },
  en: {
    notifications: "Notifications",
    pushNotifications: "Push Notifications",
    enablePush: "Enable Push Notifications",
    disablePush: "Disable Push Notifications",
    subscribed: "Subscribed",
    notSubscribed: "Not Subscribed",
    testNotification: "Send Test Notification",
    subscriptionStatus: "Subscription Status",
    enableNotifications: "Enable Notifications",
    browserNotSupported: "Browser does not support notifications",
    permissionDenied: "Notification permission denied",
    testSent: "Test notification sent",
    error: "Error",
  },
};

export default function NotificationSettings({
  userId,
  lang = "ar",
}: {
  userId: string;
  lang?: Lang;
}) {
  const isRtl = lang === "ar";
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // Check if service workers and push notifications are supported
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }

    // Check current subscription status
    checkSubscriptionStatus();
  }, [userId]);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error("Failed to check subscription:", e);
    }
  };

  const handleToggleSubscription = async () => {
    if (!supported) {
      setMessage(t[lang].browserNotSupported);
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/notifications/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
          setIsSubscribed(false);
          setMessage(t[lang].disablePush);
        }
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMessage(t[lang].permissionDenied);
          setLoading(false);
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setMessage(t[lang].error);
          setLoading(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        });

        setIsSubscribed(true);
        setMessage(t[lang].enablePush);
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      console.error("Subscription error:", e);
      setMessage(t[lang].error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      setMessage(t[lang].notSubscribed);
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Trigger a test notification via the server
        await fetch("/api/notifications/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });

        setMessage(t[lang].testSent);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (e) {
      console.error("Test notification error:", e);
      setMessage(t[lang].error);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    container: {
      padding: "20px",
      background: "rgba(255,255,255,0.04)",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    title: {
      fontSize: "18px",
      fontWeight: 700,
      color: "#e2e8f0",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    } as React.CSSProperties,
    statusSection: {
      marginBottom: "16px",
      padding: "12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: "8px",
      border: "1px solid rgba(255,255,255,0.06)",
    } as React.CSSProperties,
    statusLabel: {
      fontSize: "12px",
      color: "#94a3b8",
      marginBottom: "4px",
    } as React.CSSProperties,
    statusValue: {
      fontSize: "13px",
      fontWeight: 600,
      color: isSubscribed ? "#10b981" : "#ef4444",
    } as React.CSSProperties,
    btnGroup: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    btn: {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(59,130,246,0.1)",
      color: "#3b82f6",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.15s",
      disabled: {
        opacity: 0.5,
        cursor: "not-allowed",
      },
    } as React.CSSProperties,
    message: {
      marginTop: "12px",
      fontSize: "12px",
      color: "#10b981",
      padding: "8px 12px",
      background: "rgba(16,185,129,0.1)",
      borderRadius: "6px",
      border: "1px solid rgba(16,185,129,0.2)",
    } as React.CSSProperties,
  };

  if (!supported) {
    return (
      <div style={s.container} dir={isRtl ? "rtl" : "ltr"}>
        <div style={s.title}>
          <span>🔔</span> {t[lang].notifications}
        </div>
        <div style={s.statusSection}>
          <div style={s.statusLabel}>{t[lang].error}</div>
          <div style={s.statusValue}>{t[lang].browserNotSupported}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container} dir={isRtl ? "rtl" : "ltr"}>
      <div style={s.title}>
        <span>🔔</span> {t[lang].notifications}
      </div>

      <div style={s.statusSection}>
        <div style={s.statusLabel}>{t[lang].subscriptionStatus}</div>
        <div style={s.statusValue}>
          {isSubscribed ? t[lang].subscribed : t[lang].notSubscribed}
        </div>
      </div>

      <div style={s.btnGroup}>
        <button
          style={s.btn}
          onClick={handleToggleSubscription}
          disabled={loading}
        >
          {isSubscribed ? "🔕 " : "🔔 "}
          {isSubscribed ? t[lang].disablePush : t[lang].enablePush}
        </button>
        {isSubscribed && (
          <button
            style={s.btn}
            onClick={handleTestNotification}
            disabled={loading}
          >
            📬 {t[lang].testNotification}
          </button>
        )}
      </div>

      {message && <div style={s.message}>{message}</div>}
    </div>
  );
}

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
