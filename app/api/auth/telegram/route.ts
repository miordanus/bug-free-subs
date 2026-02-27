import { NextRequest, NextResponse } from "next/server"
import * as crypto from "crypto"

export async function POST(req: NextRequest) {
  let body: { initData?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { initData } = body
  if (!initData || typeof initData !== "string") {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
  }

  // Parse initData as query string
  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) {
    return NextResponse.json({ error: "Missing hash in initData" }, { status: 401 })
  }

  // Remove hash before computing check string
  params.delete("hash")

  // Build data_check_string: sorted key=value lines joined by \n
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()

  // computed_hash = HMAC-SHA256(data_check_string, secret_key) hex
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

  // Timing-safe comparison
  let match = false
  try {
    const hashBuf = Buffer.from(hash, "hex")
    const computedBuf = Buffer.from(computedHash, "hex")
    if (hashBuf.length === computedBuf.length) {
      match = crypto.timingSafeEqual(hashBuf, computedBuf)
    }
  } catch {
    match = false
  }

  if (!match) {
    return NextResponse.json({ error: "Invalid initData" }, { status: 401 })
  }

  // Parse user field from initData
  const userStr = params.get("user")
  if (!userStr) {
    return NextResponse.json({ error: "No user in initData" }, { status: 400 })
  }

  try {
    const user = JSON.parse(userStr) as {
      id: number
      username?: string
      first_name?: string
      last_name?: string
    }
    return NextResponse.json({
      telegram_user_id: user.id,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
    })
  } catch {
    return NextResponse.json({ error: "Invalid user JSON" }, { status: 400 })
  }
}
