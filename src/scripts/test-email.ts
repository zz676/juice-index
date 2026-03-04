/**
 * Test script for Resend email functionality
 * Run with: npx tsx src/scripts/test-email.ts
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing email module
config({ path: path.join(process.cwd(), '.env.local') });

// Now import email functions after env vars are loaded
const { sendWelcomeEmail, sendPaymentConfirmationEmail } = require('../lib/email');

async function testEmails() {
  console.log('🧪 Testing Resend Email System\n');

  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not configured in .env.local');
    process.exit(1);
  }

  console.log('✅ RESEND_API_KEY found');
  console.log(`📧 FROM address: ${process.env.EMAIL_FROM || 'Juice Index <noreply@juiceindex.io>'}\n`);

  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'test@example.com';

  console.log(`📬 Sending test emails to: ${testEmail}\n`);

  try {
    // Test 1: Welcome Email
    console.log('1️⃣ Testing Welcome Email...');
    const welcomeResult = await sendWelcomeEmail(testEmail, 'Test User');
    console.log('✅ Welcome email sent successfully!');
    console.log('   Response:', welcomeResult);
    console.log();

    // Test 2: Payment Confirmation Email
    console.log('2️⃣ Testing Payment Confirmation Email...');
    const paymentResult = await sendPaymentConfirmationEmail({
      to: testEmail,
      name: 'Test User',
      tier: 'pro',
      amountFormatted: '$19.99',
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });
    console.log('✅ Payment confirmation email sent successfully!');
    console.log('   Response:', paymentResult);
    console.log();

    console.log('🎉 All email tests passed successfully!\n');
    console.log('📌 Note: Check your Resend dashboard for delivery status.');
    console.log('   Dashboard: https://resend.com/emails');

  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

// Run the test
testEmails().catch(console.error);