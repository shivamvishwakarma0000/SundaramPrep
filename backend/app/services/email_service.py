import logging
from typing import Optional, List, Dict, Any
from app.config import config

logger = logging.getLogger(__name__)

class EmailService:
    """
    Email notification service abstraction using Resend.
    Sends student welcome emails, Focus Test analytical scorecards,
    and weekly study streak reminders.
    """
    
    def __init__(self):
        self.api_key = config.RESEND_API_KEY
        self.from_email = config.FROM_EMAIL
        self._resend = None
        
        if self.api_key:
            try:
                import resend
                resend.api_key = self.api_key
                self._resend = resend
                logger.info("Resend email service initialized.")
            except Exception as e:
                logger.warning(f"Could not initialize Resend: {e}")

    @property
    def is_configured(self) -> bool:
        return bool(self._resend and self.api_key)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sends email via Resend or logs securely in dev."""
        if not self.is_configured:
            logger.info(f"[DEV EMAIL] To: {to_email} | Subject: {subject} | Body: {text_content or html_content[:80]}...")
            return {
                "sent": True,
                "provider": "simulated_resend",
                "message": "Email logged to console (RESEND_API_KEY unset)"
            }
            
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                params["text"] = text_content
                
            response = self._resend.Emails.send(params)
            return {"sent": True, "provider": "resend", "response": response}
        except Exception as e:
            logger.error(f"Failed to send email via Resend to {to_email}: {e}")
            return {"sent": False, "error": str(e)}

    def send_otp_email(
        self,
        to_email: str,
        otp_code: str,
        purpose: str = "REGISTRATION",
        full_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends mobile-friendly, minimal, high-deliverability 6-digit OTP email.
        """
        titles = {
            "REGISTRATION": ("Verify your email", "Verify your email address to activate your Sundaram Prep account."),
            "FORGOT_PASSWORD": ("Reset your password", "Enter this code to reset your account password."),
            "EMAIL_CHANGE": ("Verify new email", "Enter this code to confirm your new email address.")
        }
        title, subtext = titles.get(purpose, ("Verification Code", "Enter this code to complete your verification."))
        
        subject = f"{otp_code} is your Sundaram Prep verification code"
        
        text_content = f"""SUNDARAM PREP

{title}

Your verification code is:

{otp_code}

This code expires in 10 minutes.

If you did not request this, ignore this email.
"""

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="480" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; width: 100%; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: #4338ca; text-transform: uppercase;">SUNDARAM PREP</span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #0f172a;">{title}</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.4;">{subtext}</p>
            </td>
          </tr>
          
          <!-- OTP Code Box -->
          <tr>
            <td style="padding: 32px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Your verification code is:</p>
              <div style="display: inline-block; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px 28px; letter-spacing: 8px; font-size: 32px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #3730a3;">
                {otp_code}
              </div>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748b;">
                ⏱ This code expires in <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Footer notice -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                If you did not request this, ignore this email. Never share this code with anyone.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #cbd5e1;">
                Sundaram Prep · Practice. Focus. Improve.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        return self.send_email(to_email, subject, html_content, text_content)

    def send_welcome_email(self, to_email: str, full_name: str, target_exam: str):
        subject = "Welcome to Sundaram Prep — Practice. Focus. Improve."
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="background-color: #1e1b4b; padding: 24px; border-radius: 8px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px;">SUNDARAM PREP</h1>
                <p style="color: #a5b4fc; margin-top: 6px; font-size: 14px;">Practice. Focus. Improve.</p>
            </div>
            <div style="padding: 24px 8px; color: #1e293b;">
                <p>Hello <strong>{full_name}</strong>,</p>
                <p>Welcome to your dedicated competitive exam preparation space. Your targeted exam is set to: <strong>{target_exam}</strong>.</p>
                <p>Sundaram Prep is built around the Core Learning Loop:</p>
                <ul style="color: #475569; line-height: 1.6;">
                    <li>High-yield Question Bank verified with official keys</li>
                    <li>Timed Focus Tests with negative marking simulation</li>
                    <li>Algorithmic Weak Topic Detection</li>
                    <li>Sundaram AI on-demand revisions with memory tricks</li>
                </ul>
                <p>Start your first practice session today!</p>
            </div>
        </div>
        """
        return self.send_email(to_email, subject, html, f"Welcome to Sundaram Prep, {full_name}!")

email_service = EmailService()

