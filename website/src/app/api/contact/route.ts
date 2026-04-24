import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface ContactPayload {
  name: string;
  company: string;
  email: string;
  phone?: string;
  licenses: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactPayload = await request.json();
    const { name, company, email, licenses } = body;

    if (!name || !company || !email || !licenses) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    // ── Save to Supabase ──────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('corporate_inquiries').insert([
        {
          name: body.name,
          company: body.company,
          email: body.email,
          phone: body.phone || null,
          licenses: body.licenses,
          message: body.message || null,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        console.error('Supabase insert error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to save inquiry.' },
          { status: 500 }
        );
      }
    } else {
      console.warn('Supabase not configured — inquiry not saved to database.');
    }

    // ── Send email notification via Resend ────────────────────────────────
    const resendApiKey = process.env.RESEND_API_KEY;
    const notificationEmails = process.env.NOTIFICATION_EMAIL?.split(',').map(e => e.trim()).filter(Boolean);

    if (resendApiKey && notificationEmails?.length) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        // Until you have a custom domain, Resend provides onboarding@resend.dev for testing.
        // Replace with your own domain once set up: e.g. notifications@executivemeditator.com
        from: 'The Executive Meditator <onboarding@resend.dev>',
        to: notificationEmails,
        replyTo: email,
        subject: `New Corporate Inquiry — ${company}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #F8F5F0; border-radius: 4px;">
            <h2 style="color: #1B2B4B; font-size: 24px; margin-bottom: 8px;">New Corporate Inquiry</h2>
            <p style="color: #4A5568; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #E8E0D5; padding-bottom: 16px;">
              Someone submitted the corporate inquiry form on the Executive Meditator website.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Name</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Company</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;">${company}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;"><a href="mailto:${email}" style="color: #1B2B4B;">${email}</a></td>
              </tr>
              ${body.phone ? `
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Phone</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;">${body.phone}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Licenses</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px;">${licenses}</td>
              </tr>
              ${body.message ? `
              <tr>
                <td style="padding: 10px 0; color: #B89A50; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; vertical-align: top;">Message</td>
                <td style="padding: 10px 0; color: #1B2B4B; font-size: 15px; line-height: 1.6;">${body.message}</td>
              </tr>` : ''}
            </table>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8E0D5;">
              <p style="color: #4A5568; font-size: 13px; margin: 0;">
                Reply directly to this email to respond to ${name}.
              </p>
              <p style="color: #B89A50; font-size: 12px; margin-top: 8px; font-style: italic;">
                Profits · Productivity · Peace
              </p>
            </div>
          </div>
        `,
      });
    } else {
      console.warn('Resend not configured — email notification not sent.');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
