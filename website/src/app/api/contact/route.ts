import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        'Supabase environment variables not configured. Inquiry not saved.'
      );
      return NextResponse.json({ success: true, saved: false });
    }

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

    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
