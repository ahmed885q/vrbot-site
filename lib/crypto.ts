// lib/crypto.ts
// تشفير وفك تشفير باسورد اللعبة باستخدام AES-256-GCM

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";

// تشفير النص
export async function encrypt(text: string): Promise<string> {
  if (!text) return "";

  // في حالة عدم وجود ENCRYPTION_KEY نحفظ كـ base64 بسيط
  if (!ENCRYPTION_KEY) {
    return Buffer.from(text).toString("base64");
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoder.encode(text)
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    return Buffer.from(result).toString("base64");
  } catch {
    return Buffer.from(text).toString("base64");
  }
}

// فك التشفير
export async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) return "";

  if (!ENCRYPTION_KEY) {
    try {
      return Buffer.from(encryptedText, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const data = Buffer.from(encryptedText, "base64");
    const iv = data.subarray(0, 12);
    const encrypted = data.subarray(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    try {
      return Buffer.from(encryptedText, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }
}
