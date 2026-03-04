/**
 * Test script for all email templates
 * Run with: npx tsx src/scripts/test-email-templates.ts [your-email@example.com]
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing email module
config({ path: path.join(process.cwd(), '.env.local') });

// Import email functions after env vars are loaded
const {
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendPasswordResetEmail,
  sendSubscriptionCancelledEmail
} = require('../lib/email');

async function testAllEmailTemplates() {
  console.log('🧪 Testing All Email Templates\n');

  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not configured in .env.local');
    process.exit(1);
  }

  console.log('✅ RESEND_API_KEY found');
  console.log(`📧 FROM address: ${process.env.EMAIL_FROM || 'Juice Index <noreply@juiceindex.io>'}\n`);

  // Get test email from command line or use default
  const testEmail = process.argv[2] || 'ai.compute.index@gmail.com';
  const testName = 'John Doe';

  console.log(`📬 Sending test emails to: ${testEmail}`);
  console.log(`👤 Test user name: ${testName}\n`);

  const results = {
    welcome: false,
    payment: false,
    passwordReset: false,
    cancellation: false
  };

  try {
    // Test 1: Welcome Email
    console.log('1️⃣ Testing Welcome Email Template...');
    try {
      const welcomeResult = await sendWelcomeEmail(testEmail, testName);
      console.log('✅ Welcome email sent successfully!');
      console.log('   Response ID:', welcomeResult?.data?.id || 'N/A');
      results.welcome = true;
    } catch (error: any) {
      console.error('❌ Welcome email failed:', error?.error?.message || error?.message || error);
    }
    console.log();

    // Test 2: Payment Confirmation Email (First Payment)
    console.log('2️⃣ Testing Payment Confirmation Email Template (First Payment)...');
    try {
      const paymentResult = await sendPaymentConfirmationEmail({
        to: testEmail,
        name: testName,
        tier: 'pro',
        amountFormatted: '$19.99',
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isFirstPayment: true
      });
      console.log('✅ Payment confirmation email (first payment) sent successfully!');
      console.log('   Response ID:', paymentResult?.data?.id || 'N/A');
      results.payment = true;
    } catch (error: any) {
      console.error('❌ Payment confirmation email failed:', error?.error?.message || error?.message || error);
    }
    console.log();

    // Test 3: Payment Confirmation Email (Renewal)
    console.log('3️⃣ Testing Payment Confirmation Email Template (Renewal)...');
    try {
      const paymentResult = await sendPaymentConfirmationEmail({
        to: testEmail,
        name: testName,
        tier: 'starter',
        amountFormatted: '$9.99',
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isFirstPayment: false
      });
      console.log('✅ Payment confirmation email (renewal) sent successfully!');
      console.log('   Response ID:', paymentResult?.data?.id || 'N/A');
    } catch (error: any) {
      console.error('❌ Payment confirmation renewal email failed:', error?.error?.message || error?.message || error);
    }
    console.log();

    // Test 4: Password Reset Email
    console.log('4️⃣ Testing Password Reset Email Template...');
    try {
      const resetResult = await sendPasswordResetEmail({
        to: testEmail,
        name: testName,
        resetUrl: 'https://juiceindex.io/auth/reset-password?token=abc123def456',
        expirationMinutes: 60,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });
      console.log('✅ Password reset email sent successfully!');
      console.log('   Response ID:', resetResult?.data?.id || 'N/A');
      results.passwordReset = true;
    } catch (error: any) {
      console.error('❌ Password reset email failed:', error?.error?.message || error?.message || error);
    }
    console.log();

    // Test 5: Subscription Cancelled Email
    console.log('5️⃣ Testing Subscription Cancellation Email Template...');
    try {
      const cancelResult = await sendSubscriptionCancelledEmail({
        to: testEmail,
        name: testName,
        tier: 'pro',
        accessEndsDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        reason: 'Too expensive for my current needs'
      });
      console.log('✅ Subscription cancellation email sent successfully!');
      console.log('   Response ID:', cancelResult?.data?.id || 'N/A');
      results.cancellation = true;
    } catch (error: any) {
      console.error('❌ Subscription cancellation email failed:', error?.error?.message || error?.message || error);
    }
    console.log();

    // Summary
    console.log('📊 Test Results Summary:');
    console.log('─'.repeat(40));
    console.log(`Welcome Email:          ${results.welcome ? '✅ Success' : '❌ Failed'}`);
    console.log(`Payment Confirmation:   ${results.payment ? '✅ Success' : '❌ Failed'}`);
    console.log(`Password Reset:         ${results.passwordReset ? '✅ Success' : '❌ Failed'}`);
    console.log(`Subscription Cancelled: ${results.cancellation ? '✅ Success' : '❌ Failed'}`);
    console.log('─'.repeat(40));

    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    if (successCount === totalCount) {
      console.log('\n🎉 All email templates tested successfully!');
    } else {
      console.log(`\n⚠️  ${successCount}/${totalCount} email templates tested successfully.`);
    }

    console.log('\n📌 Notes:');
    console.log('• Check your inbox for the test emails');
    console.log('• View delivery status at: https://resend.com/emails');
    console.log('• In test mode, emails can only be sent to:', testEmail);

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
    process.exit(1);
  }
}

// Run the tests
testAllEmailTemplates().catch(console.error);