import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import PendingCoursesClient from './PendingCoursesClient';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export default async function PendingCoursesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) redirect('/login');
  if (session.role !== 'root' && session.role !== 'administrator') redirect('/dashboard');

  return <PendingCoursesClient />;
}

