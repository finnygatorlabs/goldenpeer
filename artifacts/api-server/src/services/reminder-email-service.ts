import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "SeniorShield <onboarding@resend.dev>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ReminderNotificationEmailParams {
  familyEmail: string;
  familyName: string;
  seniorName: string;
  reminderLabel: string;
  reminderTime: string;
  notificationPreference: string;
}

export async function sendReminderNotificationEmail(
  params: ReminderNotificationEmailParams
): Promise<boolean> {
  try {
    const { familyEmail, familyName, seniorName, reminderLabel, reminderTime, notificationPreference } = params;

    if (notificationPreference === "none") {
      console.log(`[Scheduler Email] Skipping notification for ${familyEmail} (preference: none)`);
      return false;
    }

    const [hours, minutes] = reminderTime.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;

    const subject = `SeniorShield Reminder: ${reminderLabel} at ${formattedTime}`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0F2D52 0%,#1E3A5F 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;">SeniorShield</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Reminder Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Hi ${escapeHtml(familyName || "there")},</p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;">${escapeHtml(seniorName)} has a reminder coming up:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Reminder</p>
                    <p style="margin:0 0 16px;color:#1E293B;font-size:18px;font-weight:bold;">${escapeHtml(reminderLabel)}</p>

                    <p style="margin:0 0 4px;color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Scheduled Time</p>
                    <p style="margin:0;color:#1E293B;font-size:16px;">${formattedTime}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#94A3B8;font-size:12px;text-align:center;">
                SeniorShield &mdash; Helping seniors stay safe and connected
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: familyEmail,
      subject,
      html: htmlContent,
    });

    if (response.error) {
      console.error(`[Scheduler Email] Failed to send to ${familyEmail}:`, response.error);
      return false;
    }

    console.log(`[Scheduler Email] Successfully sent to ${familyEmail}`);
    return true;
  } catch (error) {
    console.error("[Scheduler Email] Error sending reminder notification:", error);
    return false;
  }
}
