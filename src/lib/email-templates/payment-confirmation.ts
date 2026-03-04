/**
 * Payment confirmation email template
 */

import { baseTemplate, emailButton, infoTable, escapeHtml, alertBox } from './base-template';

export interface PaymentConfirmationEmailProps {
  name: string;
  tier: string;
  amountFormatted: string;
  periodEnd: Date;
  billingUrl?: string;
  invoiceUrl?: string;
  isFirstPayment?: boolean;
}

export function paymentConfirmationEmailTemplate({
  name,
  tier,
  amountFormatted,
  periodEnd,
  billingUrl = 'https://juiceindex.io/dashboard/billing',
  invoiceUrl,
  isFirstPayment = false
}: PaymentConfirmationEmailProps): string {
  const safeName = escapeHtml(name.trim() || 'there');
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();

  const renewDate = periodEnd.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = `
    <h2 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.025em;">
      Payment Confirmed! ✅
    </h2>

    <p style="margin:12px 0;font-size:15px;line-height:22px;color:#4b5563;">
      Hi ${safeName}, ${isFirstPayment ? 'welcome aboard! Your' : 'your'} <strong>Juice Index ${tierLabel}</strong> subscription ${isFirstPayment ? 'is now' : 'has been'} active.
    </p>

    ${isFirstPayment ? `
      <div style="margin:16px 0;padding:12px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;">
        <p style="margin:0;font-size:13px;line-height:18px;color:#166534;">
          <strong>🎉 Welcome to ${tierLabel}!</strong> You now have access to all ${tierLabel} features.
        </p>
      </div>
    ` : ''}

    ${infoTable([
      { label: 'Plan', value: `${tierLabel}` },
      { label: 'Amount', value: amountFormatted },
      { label: 'Period', value: tier.toLowerCase().includes('year') ? 'Annual' : 'Monthly' },
      { label: 'Renews', value: renewDate }
    ])}

    <div style="margin:20px 0;">
      <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#111827;">
        ${tierLabel} Features:
      </h3>

      ${tier.toLowerCase() === 'pro' ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">🚀</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Unlimited data queries</span>
            </td>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">👥</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Team collaboration</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">📊</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Advanced charting</span>
            </td>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">📈</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">API access</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">🔄</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Real-time updates</span>
            </td>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">💬</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Priority support</span>
            </td>
          </tr>
        </table>
      ` : `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">📊</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Basic charting tools</span>
            </td>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">💾</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Export capabilities</span>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">📈</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Standard queries</span>
            </td>
            <td style="padding:6px 0;">
              <span style="font-size:14px;">📧</span>
              <span style="margin-left:8px;font-size:14px;color:#4b5563;">Email support</span>
            </td>
          </tr>
        </table>
      `}
    </div>

    ${emailButton('View Billing Details', billingUrl)}

    ${invoiceUrl ? `
      <p style="margin:16px 0;font-size:13px;line-height:18px;color:#6b7280;text-align:center;">
        <a href="${invoiceUrl}" style="color:#6ada1b;text-decoration:underline;">Download Invoice</a>
      </p>
    ` : ''}

    <div style="margin:20px 0;padding:12px;background:#f9fafb;border-radius:6px;">
      <p style="margin:0;font-size:13px;line-height:18px;color:#6b7280;">
        Manage your subscription anytime from your <a href="${billingUrl}" style="color:#6ada1b;text-decoration:underline;">billing dashboard</a>.
      </p>
    </div>
  `;

  return baseTemplate({
    previewText: `Payment confirmed for Juice Index ${tierLabel} - ${amountFormatted}`,
    content
  });
}