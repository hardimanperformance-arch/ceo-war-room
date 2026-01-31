import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

export async function GET() {
  const sizeBefore = cache.size();
  cache.clear();

  return NextResponse.json({
    message: 'Cache cleared',
    entriesCleared: sizeBefore,
    timestamp: new Date().toISOString(),
  });
}
