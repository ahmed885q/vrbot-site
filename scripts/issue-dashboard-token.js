// scripts/issue-dashboard-token.js
// Generate Dashboard Token (JWT)

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// ====== CONFIG ======
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "DEV_ONLY_CHANGE_ME_SUPER_SECRET_KEY"; // ⚠️ غيّره في الإنتاج

const ORG_ID = process.env.ORG_ID || "clientA";
const EXPIRES_IN = "30d";
// ====================

function genTokenId() {
  return "tok_" + crypto.randomBytes(16).toString("hex");
}

function main() {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    console.error("❌ JWT_SECRET ضعيف أو غير موجود");
    process.exit(1);
  }

  const payload = {
    tid: genTokenId(),
    role: "dashboard", // 🔑 مهم
    orgId: ORG_ID,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: EXPIRES_IN,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        role: "dashboard",
        orgId: ORG_ID,
        token,
        notes: {
          usage: "Paste this token into /dashboard then click Apply",
        },
      },
      null,
      2
    )
  );
}

main();
