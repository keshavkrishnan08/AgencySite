import { NextResponse } from 'next/server';
import { getEntitlement } from '@/lib/entitlement';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Log a decision against today. Free — the journal is the retention hook. */
export async function POST(req: Request) {
  const ent = await getEntitlement();
  if (!ent.userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  let body: unknown;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const text = typeof (body as { body?: unknown })?.body === 'string'
    ? (body as { body: string }).body.trim()
    : '';
  if (!text) return NextResponse.json({ error: 'Write the call you made.' }, { status: 400 });
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Keep it under 2000 characters.' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin()
    .from('decisions')
    .insert({ user_id: ent.userId, body: text, decided_on: today, brief_date: today })
    .select('id, decided_on, body')
    .single();

  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  return NextResponse.json({ decision: data });
}

export async function DELETE(req: Request) {
  const ent = await getEntitlement();
  if (!ent.userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

  // Scoped to the caller: an id alone must never be enough to delete a row.
  const { error } = await supabaseAdmin()
    .from('decisions')
    .delete()
    .eq('id', id)
    .eq('user_id', ent.userId);

  if (error) return NextResponse.json({ error: 'Could not delete.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
