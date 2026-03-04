/**
 * Password reset email template
 */

import { baseTemplate, emailButton, escapeHtml, alertBox } from './base-template';

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expirationMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export function passwordResetEmailTemplate({
  name,
  resetUrl,
  expirationMinutes = 60,
  ipAddress,
  userAgent
}: PasswordResetEmailProps): string {
  const safeName = escapeHtml(name.trim() || 'there');

  const expirationTime = expirationMinutes >= 60
    ? `${Math.floor(expirationMinutes / 60)} hour${Math.floor(expirationMinutes / 60) > 1 ? 's' : ''}`
    : `${expirationMinutes} minutes`;

  const content = `
    <h2 style="margin:0 0 8px 0;font-size:28px;font-weight:700;color:#111827;letter-spacing:-0.025em;">
      Password Reset Request 🔐
    </h2>

    <p style="margin:16px 0;font-size:16px;line-height:24px;color:#4b5563;">
      Hi ${safeName}, we received a request to reset the password for your Juice Index account.
    </p>

    <p style="margin:16px 0;font-size:16px;line-height:24px;color:#4b5563;">
      If you requested this password reset, click the button below to create a new password:
    </p>

    ${emailButton('Reset Your Password', resetUrl)}

    ${alertBox(
      `This link will expire in <strong>${expirationTime}</strong>. If the link has expired, you can request a new password reset from the login page.`,
      'warning'
    )}

    <div style="margin:32px 0;padding:20px;background:#f9fafb;border-radius:8px;">
      <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#111827;">
        Didn't request this?
      </h3>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:20px;color:#4b5563;">
        If you didn't request a password reset, you can safely ignore this email. Your password won't be changed unless you click the link above and create a new one.
      </p>
      <p style="margin:0;font-size:14px;line-height:20px;color:#4b5563;">
        For security, we recommend:
      </p>
      <ul style="margin:8px 0 0 0;padding-left:20px;font-size:14px;line-height:20px;color:#4b5563;">
        <li>Ensuring your account uses a strong, unique password</li>
        <li>Enabling two-factor authentication if available</li>
        <li>Reviewing your recent account activity</li>
      </ul>
    </div>

    ${ipAddress || userAgent ? `
      <div style="margin:32px 0;padding:16px;background:#fef3f2;border:1px solid #fee2e2;border-radius:8px;">
        <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#991b1b;">
          Request Details
        </h4>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="font-size:13px;color:#7f1d1d;">
          ${ipAddress ? `
            <tr>
              <td style="padding:4px 0;">IP Address:</td>
              <td style="padding:4px 0 4px 12px;font-family:monospace;">${escapeHtml(ipAddress)}</td>
            </tr>
          ` : ''}
          ${userAgent ? `
            <tr>
              <td style="padding:4px 0;vertical-align:top;">Device:</td>
              <td style="padding:4px 0 4px 12px;">${escapeHtml(userAgent)}</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding:4px 0;">Time:</td>
            <td style="padding:4px 0 4px 12px;">${new Date().toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}</td>
          </tr>
        </table>
      </div>
    ` : ''}

    <p style="margin:24px 0 0 0;font-size:14px;line-height:20px;color:#6b7280;">
      Or copy and paste this link into your browser:
      <br>
      <span style="font-family:monospace;font-size:12px;color:#9ca3af;word-break:break-all;">
        ${resetUrl}
      </span>
    </p>

    <p style="margin:24px 0 0 0;font-size:14px;line-height:20px;color:#6b7280;">
      For security tips and best practices, visit our
      <a href="https://juiceindex.io/security" style="color:#6ada1b;text-decoration:underline;">Security Center</a>.
    </p>
  `;

  return baseTemplate({
    previewText: 'Reset your Juice Index password',
    content
  });
}