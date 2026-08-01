import { NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/astro/geo';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 2) return NextResponse.json({ places: [] });

  try {
    const places = await searchPlaces(q);
    return NextResponse.json(
      { places },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  } catch {
    return NextResponse.json({ places: [] }, { status: 200 });
  }
}
