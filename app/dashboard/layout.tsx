import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import DashboardShell from './DashboardShell';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect('/login');
  }

  const displayName = (session.namaLengkap || session.username || session.email || '').trim();
  return (
    <DashboardShell role={session.role} displayName={displayName}>
      {children}
    </DashboardShell>
  );
}