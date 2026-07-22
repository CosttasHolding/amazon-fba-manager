type SendEmailParams = {
  to: string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "notifications@amazon-fba-manager.com",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Send failed:", err);
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Send error:", err);
    return { success: false, error: String(err) };
  }
}

export function buildAlertEmailHtml(alert: { title: string; message: string; severity: string }): string {
  const colors: Record<string, string> = {
    critical: "#dc2626",
    warning: "#f59e0b",
    info: "#3b82f6",
  };
  const color = colors[alert.severity] || "#6b7280";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, sans-serif; background: #f9fafb; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
    <div style="width: 40px; height: 40px; border-radius: 10px; background: ${color}1a; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
      <span style="font-size: 20px;">${alert.severity === "critical" ? "⚠️" : alert.severity === "warning" ? "⚡" : "ℹ️"}</span>
    </div>
    <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px;">${alert.title}</h2>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0 0 16px;">${alert.message}</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      Amazon FBA Manager · <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://amazon-fba-manager-virid.vercel.app"}" style="color: #3b82f6;">Ir al dashboard</a>
    </p>
  </div>
</body>
</html>`;
}
