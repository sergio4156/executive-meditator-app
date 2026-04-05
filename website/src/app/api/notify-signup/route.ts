import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email } = await request.json();

    const resendApiKey = process.env.RESEND_API_KEY;
    const notificationEmail = process.env.NOTIFICATION_EMAIL;

    if (resendApiKey && notificationEmail) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: 'Executive Meditator <onboarding@resend.dev>',
        to: notificationEmail,
        subject: `New Executive Account — ${fullName}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #F8F5F0; border-radius: 4px;">
            <h2 style="color: #1B2B4B; font-size: 24px; margin-bottom: 8px;">New Executive Sign Up</h2>
            <p style="color: #4A5568; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #E8E0D5; padding-bottom: 16px;">
              Someone just created an account on the Executive Meditator website.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Name</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;"><a href="mailto:${email}" style="color: #1B2B4B;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Status</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;">Pending email verification → Stripe checkout</td>
              </tr>
            </table>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8E0D5;">
              <p style="color: #B89A50; font-size: 12px; margin-top: 8px; font-style: italic;">
                Profits · Productivity · Peace
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notify signup error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
