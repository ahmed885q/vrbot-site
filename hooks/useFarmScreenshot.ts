// hooks/useFarmScreenshot.ts
// ضع هذا الـ hook في مكان الـ polling الحالي

import { useState, useEffect, useRef, useCallback } from "react";

type ScreenshotState =
  | { status: "loading" }
  | { status: "provisioning"; message: string }
  | { status: "starting"; message: string }
  | { status: "offline"; message: string }
  | { status: "ready"; imageUrl: string }
  | { status: "error"; message: string };

export function useFarmScreenshot(farmId: string | null, enabled = true) {
  const [state, setState] = useState<ScreenshotState>({ status: "loading" });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchScreenshot = useCallback(async () => {
    if (!farmId || !enabled) return;

    try {
      const res = await fetch(`/api/farms/screenshot?farm_id=${encodeURIComponent(farmId)}`, {
        cache: "no-store",
      });

      // ✅ 202 = الفارم مش جاهز بعد — وقّف الـ polling وانتظر Retry-After
      if (res.status === 202) {
        const data = await res.json();
        const retryAfter = parseInt(res.headers.get("Retry-After") || "30", 10);

        setState({ status: data.status, message: data.message });

        // جرب مرة ثانية بعد الوقت المحدد
        clearTimer();
        timerRef.current = setTimeout(fetchScreenshot, retryAfter * 1000);
        return;
      }

      // ✅ 503 = السيرفر مش شغال — وقّف الـ polling لمدة أطول
      if (res.status === 503) {
        setState({ status: "offline", message: "Cloud server unreachable" });
        clearTimer();
        timerRef.current = setTimeout(fetchScreenshot, 60_000);
        return;
      }

      // ✅ أي خطأ ثاني — لا تعيد كل ثانية، انتظر 15 ثانية
      if (!res.ok) {
        setState({ status: "error", message: `Error ${res.status}` });
        clearTimer();
        timerRef.current = setTimeout(fetchScreenshot, 15_000);
        return;
      }

      // ✅ صورة ناجحة
      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);

      // حرر الـ URL القديم لتفادي memory leak
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
      activeUrlRef.current = newUrl;

      setState({ status: "ready", imageUrl: newUrl });

      // Poll كل 3 ثواني بس لما الصورة ناجحة
      clearTimer();
      timerRef.current = setTimeout(fetchScreenshot, 3_000);
    } catch (e) {
      setState({ status: "error", message: "Network error" });
      clearTimer();
      timerRef.current = setTimeout(fetchScreenshot, 15_000);
    }
  }, [farmId, enabled]);

  useEffect(() => {
    if (!enabled || !farmId) {
      clearTimer();
      setState({ status: "loading" });
      return;
    }

    fetchScreenshot();

    return () => {
      clearTimer();
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, [farmId, enabled]);

  return state;
}

// ============================================================
// مثال الاستخدام في الـ LiveView component
// ============================================================

/*
import { useFarmScreenshot } from "@/hooks/useFarmScreenshot";

function FarmLiveView({ farmId, farmStatus }: { farmId: string; farmStatus: string }) {
  // ✅ لا تبدأ الـ polling إلا لو الفارم مش provisioning
  const isReady = farmStatus !== "provisioning" && farmStatus !== "pending";
  const screenshot = useFarmScreenshot(farmId, isReady);

  if (screenshot.status === "provisioning" || screenshot.status === "starting") {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded">
        <div className="text-center text-yellow-400">
          <div className="animate-spin text-2xl mb-2">⚙️</div>
          <p>{screenshot.message}</p>
        </div>
      </div>
    );
  }

  if (screenshot.status === "offline") {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded">
        <p className="text-red-400">🔴 {screenshot.message}</p>
      </div>
    );
  }

  if (screenshot.status === "ready") {
    return <img src={screenshot.imageUrl} alt="Live" className="w-full rounded" />;
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-900 rounded">
      <div className="animate-pulse text-gray-500">جاري التحميل...</div>
    </div>
  );
}
*/
