import { NextResponse } from 'next/server';
import { getEntitlement } from '@/lib/entitlement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read-only entitlement check, polled by the post-checkout screen. */
export async function GET() {
  const ent = await getEntitlement();
  return NextResponse.json(
    {
      isPaid: ent.isPaid,
      status: ent.status,
      oracleCredits: ent.oracleCredits,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
