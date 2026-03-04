/**
 * Base email template with consistent styling and layout
 */

export interface EmailTemplateProps {
  previewText?: string;
  content: string;
}

export function baseTemplate({ previewText, content }: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Juice Index</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Fira Sans','Droid Sans','Helvetica Neue',sans-serif;background-color:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${previewText ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${previewText}</div>` : ''}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 auto;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.1),0 1px 2px 0 rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 20px 40px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Logo -->
                    <img src="https://juiceindex.io/logo.png"
                         alt="Juice Index"
                         width="48"
                         height="48"
                         style="display:block;margin:0 auto;border-radius:12px;"
                         />
                    <h1 style="margin:16px 0 0 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.025em;">
                      Juice Index
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:30px 40px;border-top:1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <p style="margin:0;font-size:14px;line-height:20px;color:#6b7280;">
                      Questions? Reply to this email — we read every message.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="https://juiceindex.io" style="color:#6b7280;font-size:13px;text-decoration:none;">Website</a>
                        </td>
                        <td style="color:#d1d5db;">•</td>
                        <td style="padding:0 8px;">
                          <a href="https://juiceindex.io/dashboard" style="color:#6b7280;font-size:13px;text-decoration:none;">Dashboard</a>
                        </td>
                        <td style="color:#d1d5db;">•</td>
                        <td style="padding:0 8px;">
                          <a href="https://juiceindex.io/help" style="color:#6b7280;font-size:13px;text-decoration:none;">Help Center</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:12px;line-height:16px;color:#9ca3af;">
                      © ${new Date().getFullYear()} Juice Index. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Email Container -->

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Reusable button component
 */
export function emailButton(text: string, href: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const styles = variant === 'primary'
    ? 'background:#6ada1b;color:#000000;'
    : 'background:#ffffff;color:#111827;border:2px solid #e5e7eb;';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px 0;">
      <tr>
        <td align="center">
          <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;${styles}">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Info table component for displaying key-value pairs
 */
export function infoTable(items: Array<{ label: string; value: string }>): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">${item.label}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:14px;text-align:right;">${item.value}</td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
      ${rows}
    </table>
  `;
}

/**
 * Alert/Notice box component
 */
export function alertBox(content: string, type: 'info' | 'success' | 'warning' = 'info'): string {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
  };

  const color = colors[type];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
      <tr>
        <td style="padding:16px;background-color:${color.bg};border-left:4px solid ${color.border};border-radius:4px;">
          <p style="margin:0;font-size:14px;line-height:20px;color:${color.text};">
            ${content}
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Helper to escape HTML in user input
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}