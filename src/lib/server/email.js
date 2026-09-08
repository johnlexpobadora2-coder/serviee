import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

let resendClient = null;
let smtpTransporter = null;

function getResend() {
	const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
	if (!apiKey) return null;
	if (!resendClient) {
		resendClient = new Resend(apiKey);
	}
	return resendClient;
}

function getSmtpTransporter() {
	const host = env.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
	const port = parseInt(env.SMTP_PORT || process.env.SMTP_PORT || '587', 10);
	const secure = (env.SMTP_SECURE || process.env.SMTP_SECURE) === 'true' || port === 465;
	const user = env.SMTP_USER || process.env.SMTP_USER || '';
	const pass = env.SMTP_PASS || process.env.SMTP_PASS || '';

	if (!user || !pass) return null;

	if (!smtpTransporter) {
		smtpTransporter = nodemailer.createTransport({
			host,
			port,
			secure,
			auth: { user, pass },
			tls: { rejectUnauthorized: false }
		});
	}

	return smtpTransporter;
}

/**
 * Sends a modern, branded OTP email for Serviee using Resend API or SMTP.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit OTP code
 * @param {'registration' | 'forgot_password'} options.type - Purpose of OTP
 * @param {string} [options.name] - User name if available
 */
export async function sendOtpEmail({ to, otp, type = 'registration', name = '' }) {
	const isRegistration = type === 'registration';
	const subject = isRegistration 
		? `Verify Your Serviee Account - OTP: ${otp}`
		: `Reset Your Serviee Password - OTP: ${otp}`;

	const titleText = isRegistration ? 'Verify Your Account' : 'Password Reset Request';
	const greeting = name ? `Hello <strong>${name}</strong>,` : 'Hello,';
	const bodyText = isRegistration
		? 'Thank you for signing up for Serviee! Please use the 6-digit verification code below to complete your registration:'
		: 'We received a request to reset the password for your Serviee account. Use the 6-digit verification code below to proceed:';

	const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px 0; }
    .container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 16px; color: #334155; }
    .description { font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px; }
    .otp-box { background: #f5f3ff; border: 2px dashed #8b5cf6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6d28d9; margin-bottom: 8px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; margin: 0; }
    .expiry { font-size: 13px; color: #e11d48; font-weight: 600; text-align: center; margin-top: 8px; }
    .warning { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 24px 0 16px 0; font-size: 13px; color: #92400e; line-height: 1.5; }
    .footer { border-top: 1px solid #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Serviee</h1>
      <p>${titleText}</p>
    </div>
    <div class="content">
      <div class="greeting">${greeting}</div>
      <div class="description">${bodyText}</div>
      
      <div class="otp-box">
        <div class="otp-label">Your One-Time Verification Code</div>
        <div class="otp-code">${otp}</div>
      </div>
      
      <div class="expiry">⏱️ This code is valid for 10 minutes only.</div>

      <div class="warning">
        <strong>Security Notice:</strong> Never share your verification code with anyone. Serviee employees will never ask for your OTP.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Serviee. All rights reserved.<br>
      This is an automated security message. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
	`.trim();

	const textContent = `
Serviee - ${titleText}

${name ? `Hello ${name},` : 'Hello,'}

${bodyText}

Your 6-digit OTP code is: ${otp}

This code will expire in 10 minutes.
Security notice: Never share this OTP with anyone.

- Serviee Team
	`.trim();

	console.log(`\n======================================================`);
	console.log(`✉️ [OTP EMAIL DISPATCH]`);
	console.log(`To: ${to}`);
	console.log(`Type: ${type.toUpperCase()}`);
	console.log(`🔑 OTP CODE: >>> ${otp} <<<`);
	console.log(`Expires in: 10 minutes`);
	console.log(`======================================================\n`);

	// 1. Try Resend API first (Easiest, only 1 API key required)
	const resend = getResend();
	if (resend) {
		try {
			const resendFrom = env.RESEND_FROM || process.env.RESEND_FROM || 'Serviee <onboarding@resend.dev>';
			const { data, error } = await resend.emails.send({
				from: resendFrom,
				to: [to],
				subject,
				text: textContent,
				html: htmlContent
			});

			if (error) {
				console.error('⚠️ Resend API returned an error:', error);
			} else {
				console.log('✅ Resend API: Email sent successfully! ID:', data?.id);
				return { success: true, messageId: data?.id, provider: 'resend' };
			}
		} catch (err) {
			console.error('⚠️ Resend API exception:', err.message);
		}
	}

	// 2. Try Nodemailer SMTP fallback if configured
	const mailer = getSmtpTransporter();
	if (mailer) {
		try {
			const from = env.SMTP_FROM || process.env.SMTP_FROM || (env.SMTP_USER || process.env.SMTP_USER ? `"Serviee" <${env.SMTP_USER || process.env.SMTP_USER}>` : '"Serviee" <no-reply@serviee.com>');
			const info = await mailer.sendMail({
				from,
				to,
				subject,
				text: textContent,
				html: htmlContent
			});
			console.log('✅ Nodemailer: Email sent successfully! MessageId:', info.messageId);
			return { success: true, messageId: info.messageId, provider: 'smtp' };
		} catch (err) {
			console.error('⚠️ Nodemailer SMTP failed:', err.message);
		}
	}

	// 3. Fallback: Logged to console
	console.log('ℹ️ No active email API configured. OTP is displayed in server console above.');
	return { success: true, fallbackInConsole: true };
}
