# Resend Email Setup

This document describes the email system configuration using Resend for the Juice Index application.

## Overview

The application uses [Resend](https://resend.com) as the email service provider for sending transactional emails such as:
- Welcome emails for new users
- Payment confirmation emails
- Other transactional notifications

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Resend API Configuration
RESEND_API_KEY=your_resend_api_key_here

# Email sender address
# Development: use onboarding@resend.dev (Resend's test domain)
# Production: use your verified domain like noreply@yourdomain.com
EMAIL_FROM=Juice Index <onboarding@resend.dev>
```

### Installation

The Resend SDK is installed via npm:

```bash
npm install resend
```

## Email Service Implementation

The email service is implemented in [src/lib/email.ts](../src/lib/email.ts) and provides the following functions:

### Available Functions

1. **`sendWelcomeEmail(to: string, name: string)`**
   - Sends a welcome email to new users after registration
   - Includes a personalized greeting and link to dashboard

2. **`sendPaymentConfirmationEmail(opts)`**
   - Sends payment confirmation after successful subscription
   - Includes plan details, amount charged, and renewal date

### Email Templates

Both email templates use inline HTML styling for better email client compatibility. The templates feature:
- Responsive design with max-width container
- Branded color scheme (green accent: #6ada1b)
- Clear call-to-action buttons
- Footer with support contact information

## Testing

A test script is available at [src/scripts/test-email.ts](../src/scripts/test-email.ts) to verify email functionality:

```bash
# Test with your email address
npx tsx src/scripts/test-email.ts your-email@example.com
```

### Test Mode Limitations

When using a test API key or unverified domain:
- You can only send emails to the email address registered with your Resend account
- The `from` address must use either:
  - `onboarding@resend.dev` (Resend's test domain)
  - An email address from your verified domain

## Production Setup

For production deployment:

1. **Verify your domain** in the [Resend Dashboard](https://resend.com/domains)
2. **Update EMAIL_FROM** in your production environment to use your verified domain
3. **Use a production API key** with appropriate sending limits
4. **Monitor email delivery** through the Resend dashboard

## Integration Points

The email service is currently integrated at:

1. **User Registration** ([src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts))
   - Sends welcome email after successful signup

2. **Payment Processing** ([src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts))
   - Sends payment confirmation after successful subscription

## Error Handling

The email service includes:
- API key validation check before sending
- Email address validation
- HTML escaping for user input
- Graceful failure with console warnings when email is not configured

## Dashboard & Monitoring

Monitor your email performance at:
- [Resend Dashboard](https://resend.com/emails) - View sent emails, delivery status, and analytics

## Troubleshooting

### Common Issues

1. **"Missing API key" error**
   - Ensure RESEND_API_KEY is set in `.env.local`
   - Restart your development server after adding environment variables

2. **"Domain not verified" error**
   - For production: Verify your domain at resend.com/domains
   - For development: Use `onboarding@resend.dev` as the sender

3. **"Can only send to registered email" error**
   - In test mode, you can only send to the email registered with your Resend account
   - Upgrade to a paid plan and verify your domain to send to any recipient

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)