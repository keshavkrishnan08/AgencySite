import { NextResponse } from 'next/server';
import { guard, LIMITS } from '@/lib/ratelimit';
import { z } from 'zod';
import { chatWithChart } from '@/lib/ai';
import { getEntitlement } from '@/lib/entitlement';
import { resolveChart } from '@/lib/charts';
import { supabaseAdminOrNull } from '@/lib/supabase/server';
import { cached } from '@/lib/db';
import { transitBrief, transitReport } from '@/lib/astro/transits';

export const runtime = 'nodejs';
export const maxDuration = 120;

const Body = z.object({ message: z.string().trim().min(1).max(2000) });

/**
 * Chat with your chart — the retention feature and the upsell.
 *
 * An unpaid visitor gets ONE real answer per day. Locking chat outright puts
 * the paywall before the value; letting them feel it work once puts the
 * paywall immediately after it, which is where it converts.
 */
export async function POST(request: Request) {
  const ent = await getEntitlement();

  let message: string;
  try {
    message = Body.parse(await request.json()).message;
  } catch {
    return NextResponse.json({ error: 'Say a little more.' }, { status: 400 });
  }

  const chart = await resolveChart(ent.userId);
  if (!chart) return NextResponse.json({ error: 'No chart found.' }, { status: 404 });

  // Spend the allowance only once we know there is a chart to answer about —
  // otherwise a visitor with no chart burns their one free answer on a 404.
  if (!ent.isPaid) {
    const spent = guard(request, 'chatFree', ent.userId, 'That was your free answer for today.');
    // 402, not 429: the client shows the inline upsell, not a rate-limit error.
    if (spent) {
      return NextResponse.json(
        { error: 'That was your free answer for today.', freeAnswerSpent: true },
        { status: 402 },
      );
    }
  }

  // Transcript is an optimisation, not a precondition: an anonymous visitor has
  // no user id to key it by, and the store may be unreachable. Neither is a
  // reason to refuse to answer the question.
  const admin = ent.userId ? supabaseAdminOrNull() : null;

  // Last 20 turns keeps the thread coherent without unbounded context growth.
  const { data: prior } = await cached<{ role: string; content: string }[]>(() =>
    admin
      ?.from('chat_messages')
      .select('role, content')
      .eq('user_id', ent.userId!)
      .order('created_at', { ascending: false })
      .limit(20) ?? Promise.resolve({ data: null }),
  );

  const history = (prior ?? [])
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  history.push({ role: 'user', content: message });

  const remember = (role: 'user' | 'assistant', content: string) =>
    cached(() =>
      admin?.from('chat_messages').insert({ user_id: ent.userId!, role, content })
        .then(() => ({ data: null })) ?? Promise.resolve({ data: null }),
    );

  await remember('user', message);

  try {
    const report = transitReport(chart.chart, new Date());
    const reply = await chatWithChart(chart.chart, chart.first_name, history, transitBrief(report));
    await remember('assistant', reply);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error('[chat]', e);
    return NextResponse.json(
      { error: 'Could not reach your chart just now. Try again in a moment.' },
      { status: 503 },
    );
  }
}
