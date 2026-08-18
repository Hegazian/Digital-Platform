"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTeacherStatusEmail = exports.sendVerificationEmail = exports.sendWelcomeEmail = exports.sendEmail = void 0;
const resend_1 = require("resend");
const resendApiKey = process.env.RESEND_API_KEY;
const isRealResendKey = resendApiKey && resendApiKey.startsWith('re_') && resendApiKey !== 're_test_key';
const resend = isRealResendKey ? new resend_1.Resend(resendApiKey) : null;
/**
 * Core internal email dispatcher supporting both live Resend delivery
 * and real-time terminal console logging during local development.
 */
const sendEmail = async ({ to, subject, html }) => {
    // Always log to console in development/testing mode for instant visibility
    console.log('\n==================================================');
    console.log('📧 [EMAIL DISPATCH NOTIFICATION]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------');
    console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('==================================================\n');
    if (process.env.NODE_ENV === 'test') {
        return { id: 'test_email_id' };
    }
    if (resend) {
        try {
            const data = await resend.emails.send({
                from: 'EduPlatform <noreply@eduplatform.com>',
                to,
                subject,
                html,
            });
            console.log(`✅ Live email sent via Resend to ${to} (ID: ${data.data?.id})`);
            return data;
        }
        catch (error) {
            console.error('⚠️ Resend email dispatch failed:', error);
        }
    }
    else {
        console.log('ℹ️ Resend API key not configured or using test key. Email logged to console above.');
    }
    return { id: `mock_email_${Date.now()}` };
};
exports.sendEmail = sendEmail;
/**
 * Sends welcome email to newly registered users.
 */
const sendWelcomeEmail = async (email, name) => {
    return await (0, exports.sendEmail)({
        to: email,
        subject: 'Welcome to EduPlatform! | مرحباً بك في منصة إديوبلاتفورم',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2>Welcome to EduPlatform, ${name}!</h2>
        <p>Your account has been successfully created. You can now log in and explore our secondary school curriculum in <strong>Programming, Math, and Physics</strong>.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <h2>مرحباً بك في إديوبلاتفورم يا ${name}!</h2>
        <p>تم إنشاء حسابك بنجاح. يمكنك الآن تسجيل الدخول واستكشاف مناهج الثانوية العامة في البرمجة والرياضيات والفيزياء.</p>
      </div>
    `,
    });
};
exports.sendWelcomeEmail = sendWelcomeEmail;
/**
 * Sends verification email to users.
 */
const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    return await (0, exports.sendEmail)({
        to: email,
        subject: 'Verify your EduPlatform Account | تأكيد حسابك في إديوبلاتفورم',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2>Verify Email Address</h2>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="background-color: #4338ca; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
      </div>
    `,
    });
};
exports.sendVerificationEmail = sendVerificationEmail;
/**
 * Sends status update email to teachers when an Admin approves or rejects their application.
 */
const sendTeacherStatusEmail = async (email, name, status) => {
    const isApproved = status === 'APPROVED';
    return await (0, exports.sendEmail)({
        to: email,
        subject: `Teacher Application ${status} | تحديث طلب المعلم`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2>Hello ${name},</h2>
        <p>Your teacher application for EduPlatform has been <strong>${status}</strong> by the Admin.</p>
        ${isApproved
            ? '<p style="color: #059669; font-weight: bold;">Congratulations! You can now create courses, add sections, and upload encrypted video lessons.</p>'
            : '<p style="color: #dc2626;">Unfortunately, your application was not approved at this time.</p>'}
      </div>
    `,
    });
};
exports.sendTeacherStatusEmail = sendTeacherStatusEmail;
