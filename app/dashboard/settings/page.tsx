import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import SiteSettingsForm from './SiteSettingsForm';

export default async function DashboardSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) redirect('/login');
  if (session.role !== 'root') redirect('/dashboard');

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <SiteSettingsForm />
    </div>
  );
}

