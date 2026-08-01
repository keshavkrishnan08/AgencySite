import { NextResponse } from 'next/server';
import { getEntitlement } from '@/lib/entitlement';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Turn the morning briefing email on or off. */
export async function POST(req: Request) {
  const ent = await getEntitlement();
  if (!ent.userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  let on = true;
  try {
    const body = (await req.json()) as { on?: unknown };
    on = body.on !== false;
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('profiles')
    .update({ daily_email_opt_in: on })
    .eq('id', ent.userId);

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  return NextResponse.json({ on });
}
