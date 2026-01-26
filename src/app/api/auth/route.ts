import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  
  const correctPassword = process.env.DASHBOARD_PASSWORD || 'warroom2025';
  
  if (password === correctPassword) {
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
