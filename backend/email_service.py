import os
import logging
import threading
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("email_service")

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465  # SSL — works on Render (port 587 is blocked)
SMTP_USER = os.getenv("SMTP_USER", "libroflow8@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "gdkuniqahwdmenpq")


def send_email(to_email: str, subject: str, message: str, otp: str = None, link: str = None, link_label: str = "Open Dashboard"):
    """
    Sends email via Gmail SMTP SSL (port 465) in a background thread.
    """
    def _send():
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Zero Trust Security <{SMTP_USER}>"
            msg["To"] = to_email

            otp_block = ""
            if otp:
                otp_block = f"""
                <div style="margin:24px 0;text-align:center;">
                    <span style="display:inline-block;padding:14px 32px;font-size:28px;font-weight:bold;
                        letter-spacing:8px;background:#f0f4ff;border:2px dashed #4f46e5;
                        border-radius:8px;color:#1e1b4b;">{otp}</span>
                </div>
                <p style="color:#6b7280;font-size:13px;text-align:center;">
                    Valid for 10 minutes &nbsp;|&nbsp; Do not share this OTP with anyone.
                </p>
                """

            link_block = ""
            if link:
                link_block = f"""
                <div style="margin:24px 0;text-align:center;">
                    <a href="{link}" style="display:inline-block;padding:12px 28px;background:#4f46e5;
                        color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold;">
                        {link_label}
                    </a>
                </div>
                """

            html = f"""
            <html><body style="font-family:Arial,sans-serif;background:#f9fafb;padding:0;margin:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:40px 16px;">
                  <table width="520" cellpadding="0" cellspacing="0"
                    style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                      <td style="background:#4f46e5;padding:24px 32px;">
                        <h2 style="color:#ffffff;margin:0;font-size:20px;">🔒 Zero Trust Security</h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px;">
                        <p style="color:#111827;font-size:15px;margin-top:0;">{message}</p>
                        {otp_block}
                        {link_block}
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                        <p style="color:#9ca3af;font-size:12px;margin:0;">
                          If you did not request this, please ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body></html>
            """

            plain = message
            if otp:
                plain += f"\n\nYour OTP: {otp}\n\nValid for 10 minutes. Do not share it."
            if link:
                plain += f"\n\n{link_label}: {link}"

            msg.attach(MIMEText(plain, "plain"))
            msg.attach(MIMEText(html, "html"))

            # Use SMTP_SSL (port 465) instead of STARTTLS (port 587)
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_USER, to_email, msg.as_string())

            logger.info(f"Email sent to {to_email}")

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")

    threading.Thread(target=_send, daemon=True).start()
