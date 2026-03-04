/**
 * Welcome email template
 */

import { baseTemplate, emailButton, escapeHtml } from './base-template';

export interface WelcomeEmailProps {
  name: string;
  dashboardUrl?: string;
}

export function welcomeEmailTemplate({
  name,
  dashboardUrl = 'https://juiceindex.io/dashboard'
}: WelcomeEmailProps): string {
  const safeName = escapeHtml(name.trim() || 'there');

  const content = `
    <h2 style="margin:0 0 8px 0;font-size:28px;font-weight:700;color:#111827;letter-spacing:-0.025em;">
      Welcome to Juice Index, ${safeName}! 🎉
    </h2>

    <p style="margin:16px 0;font-size:16px;line-height:24px;color:#4b5563;">
      We're thrilled to have you on board! Your account is all set up and ready to go.
    </p>

    <p style="margin:16px 0;font-size:16px;line-height:24px;color:#4b5563;">
      With Juice Index, you can:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
      <tr>
        <td style="padding:8px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:top;padding-right:12px;width:24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="24" height="24" style="background:#6ada1b;border-radius:50%;">
                  <tr>
                    <td align="center" valign="middle" style="font-size:14px;line-height:24px;color:#000;font-weight:bold;">
                      ✓
                    </td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:16px;line-height:24px;color:#4b5563;">
                  <strong>Query powerful data</strong> - Access comprehensive market and financial data
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:top;padding-right:12px;width:24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="24" height="24" style="background:#6ada1b;border-radius:50%;">
                  <tr>
                    <td align="center" valign="middle" style="font-size:14px;line-height:24px;color:#000;font-weight:bold;">
                      ✓
                    </td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:16px;line-height:24px;color:#4b5563;">
                  <strong>Build custom charts</strong> - Visualize trends and patterns with ease
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:top;padding-right:12px;width:24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="24" height="24" style="background:#6ada1b;border-radius:50%;">
                  <tr>
                    <td align="center" valign="middle" style="font-size:14px;line-height:24px;color:#000;font-weight:bold;">
                      ✓
                    </td>
                  </tr>
                </table>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:16px;line-height:24px;color:#4b5563;">
                  <strong>Share insights</strong> - Collaborate with your team on data analysis
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${emailButton('Go to Your Dashboard', dashboardUrl)}

    <p style="margin:24px 0 0 0;font-size:14px;line-height:20px;color:#6b7280;">
      Need help getting started? Check out our
      <a href="https://juiceindex.io/docs" style="color:#6ada1b;text-decoration:underline;">documentation</a>
      or reply to this email anytime.
    </p>
  `;

  return baseTemplate({
    previewText: 'Welcome to Juice Index! Your account is ready.',
    content
  });
}