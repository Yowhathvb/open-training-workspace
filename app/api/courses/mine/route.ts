import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

import { requireSession } from '@/lib/auth/api';
import { getFirestoreDb } from '@/lib/firebase-server';

export const runtime = 'nodejs';

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);

    const firestore = getFirestoreDb();
    const q = query(
      collection(firestore, 'courses'),
      where('createdBy', '==', session.userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((doc) => {
      const course = doc.data() as any;
      return {
        id: doc.id,
        title: normalizeString(course?.title),
        courseKey: normalizeString(course?.courseKey),
        createdAt: course?.createdAt || null,
        status: course?.status || 'pending',
      };
    });

    return NextResponse.json({ ok: true, courses: results });
  } catch (error: any) {
    const status = error?.message === 'ENV_NOT_CONFIGURED' ? 503 : (error?.status || 500);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status });
  }
}