import { NextRequest, NextResponse } from "next/server"

const MAILPIT_API = process.env.MAILPIT_URL ?? "http://localhost:8025"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const subject = formData.get("subject") as string
    const email = formData.get("email") as string
    const message = formData.get("message") as string
    const attachment = formData.get("attachment") as File | null

    const boundary = "b" + Date.now().toString(36)
    let body = `From: ${email}\r\nTo: contact@productradar.tn\r\nSubject: [Contact] ${subject}\r\n`

    if (attachment && attachment.size > 0) {
      const buf = Buffer.from(await attachment.arrayBuffer())
      body += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`
      body += `--${boundary}\r\n`
      body += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`
      body += `From: ${email}\r\n\r\n`
      body += `${message}\r\n`
      body += `--${boundary}\r\n`
      body += `Content-Type: ${attachment.type || "application/octet-stream"}\r\n`
      body += `Content-Disposition: attachment; filename="${attachment.name}"\r\n`
      body += `Content-Transfer-Encoding: base64\r\n\r\n`
      body += buf.toString("base64")
      body += `\r\n--${boundary}--\r\n`
    } else {
      body += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`
      body += `From: ${email}\r\n\r\n${message}\r\n`
    }

    const res = await fetch(`${MAILPIT_API}/api/v1/messages`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ Raw: body }] }),
    })

    if (!res.ok) {
      throw new Error(`Mailpit API error: ${res.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Contact form error:", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
