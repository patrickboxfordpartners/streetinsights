import { ServerClient } from "postmark";

const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || "hello@boxfordpartners.com";

const postmark = POSTMARK_SERVER_TOKEN ? new ServerClient(POSTMARK_SERVER_TOKEN) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!postmark) {
    console.warn("Postmark not configured. Email would have been sent:", options.subject);
    return { success: false, error: "Email service not configured" };
  }

  try {
    const result = await postmark.sendEmail({
      From: FROM_EMAIL,
      To: options.to,
      Subject: options.subject,
      TextBody: options.text,
      HtmlBody: options.html || `<pre>${options.text}</pre>`,
    });

    console.log("Email sent successfully:", result.MessageID);
    return { success: true };
  } catch (err: any) {
    console.error("Postmark error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function sendTelegram(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.description || `Telegram error ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendDiscord(webhookUrl: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, username: "Street Insights" }),
    });

    if (!response.ok) return { success: false, error: `Discord webhook error ${response.status}` };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendWebhook(url: string, payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MarketSignals/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned ${response.status}` };
    }

    console.log("Webhook sent successfully to:", url);
    return { success: true };
  } catch (err: any) {
    console.error("Webhook send error:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}
