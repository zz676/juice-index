/**
 * Subscription cancellation email template
 */

import { baseTemplate, emailButton, infoTable, escapeHtml, alertBox } from './base-template';

export interface SubscriptionCancelledEmailProps {
  name: string;
  tier: string;
  accessEndsDate: Date;
  reason?: string;
  feedbackUrl?: string;
  reactivateUrl?: string;
}

export function subscriptionCancelledEmailTemplate({
  name,
  tier,
  accessEndsDate,
  reason,
  feedbackUrl = 'https://juiceindex.io/feedback',
  reactivateUrl = 'https://juiceindex.io/dashboard/billing'
}: SubscriptionCancelledEmailProps): string {
  const safeName = escapeHtml(name.trim() || 'there');
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();

  const endDate = accessEndsDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = `
    <h2 style="margin:0 0 8px 0;font-size:28px;font-weight:700;color:#111827;letter-spacing:-0.025em;">
      Subscription Cancelled
    </h2>

    <p style="margin:16px 0;font-size:16px;line-height:24px;color:#4b5563;">
      Hi ${safeName}, we've successfully cancelled your <strong>Juice Index ${tierLabel}</strong> subscription as requested.
    </p>

    ${alertBox(
      `You'll continue to have full ${tierLabel} access until <strong>${endDate}</strong>. After this date, your account will be downgraded to the free tier.`,
      'info'
    )}

    ${infoTable([
      { label: 'Cancelled Plan', value: `Juice Index ${tierLabel}` },
      { label: 'Access Ends', value: endDate },
      { label: 'Status After', value: 'Free Tier' }
    ])}

    <div style="margin:32px 0;">
      <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">
        What Happens Next?
      </h3>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding:12px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:top;padding-right:12px;color:#6ada1b;">✓</td>
                <td>
                  <p style="margin:0;font-size:15px;line-height:22px;color:#4b5563;">
                    <strong>Until ${endDate}:</strong> Continue using all ${tierLabel} features
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:top;padding-right:12px;color:#6ada1b;">✓</td>
                <td>
                  <p style="margin:0;font-size:15px;line-height:22px;color:#4b5563;">
                    <strong>Your data is safe:</strong> All your saved queries, charts, and settings will be preserved
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:top;padding-right:12px;color:#6ada1b;">✓</td>
                <td>
                  <p style="margin:0;font-size:15px;line-height:22px;color:#4b5563;">
                    <strong>Free tier access:</strong> You'll still be able to use basic features
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:top;padding-right:12px;color:#6ada1b;">✓</td>
                <td>
                  <p style="margin:0;font-size:15px;line-height:22px;color:#4b5563;">
                    <strong>Easy reactivation:</strong> Upgrade again anytime to restore full access
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    ${reason ? `
      <div style="margin:32px 0;padding:16px;background:#fef3f2;border-radius:8px;">
        <p style="margin:0;font-size:14px;line-height:20px;color:#991b1b;">
          <strong>Cancellation reason:</strong> ${escapeHtml(reason)}
        </p>
      </div>
    ` : ''}

    <div style="margin:32px 0;padding:20px;background:#f0fdf4;border-radius:8px;text-align:center;">
      <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#166534;">
        Changed your mind?
      </h3>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:20px;color:#166534;">
        You can reactivate your subscription anytime before ${endDate} to keep your ${tierLabel} benefits without interruption.
      </p>
      ${emailButton('Reactivate Subscription', reactivateUrl, 'secondary')}
    </div>

    <div style="margin:32px 0;padding:20px;background:#f9fafb;border-radius:8px;">
      <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#111827;">
        We'd Love Your Feedback
      </h3>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:20px;color:#4b5563;">
        Your opinion matters to us. Help us improve by sharing what we could have done better.
      </p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td>
            <a href="${feedbackUrl}" style="display:inline-block;padding:8px 16px;font-size:14px;font-weight:500;color:#6ada1b;text-decoration:underline;">
              Share Feedback →
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0 0;font-size:14px;line-height:20px;color:#6b7280;">
      Thank you for being part of Juice Index. We hope to see you again soon!
    </p>
  `;

  return baseTemplate({
    previewText: `Your Juice Index ${tierLabel} subscription has been cancelled`,
    content
  });
}