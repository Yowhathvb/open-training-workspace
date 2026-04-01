import { NextRequest, NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/api';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    return NextResponse.json({
      ok: true,
      user: session,
    });
  } catch (error: any) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}

