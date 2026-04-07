import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { get, ref } from 'firebase/database';
import type { ReactNode } from 'react';

import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { getRtdb } from '@/lib/firebase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CourseRow = {
  id: string;
  title: string;
  courseKey: string;
  createdBy: string;
  createdAt: string | null;
  status: string;
};

type UserRow = {
  id: string;
  namaLengkap: string;
  username: string;
  email: string;
  createdAt: string | null;
};

type JoinEvent = {
  courseId: string;
  userId: string;
  joinedAt: string | null;
};

function normalizeString(input: unknown) {
  return typeof input === 'string' ? input.trim() : '';
}

function parseIsoDate(input: unknown): Date | null {
  const raw = normalizeString(input);
  if (!raw) return null;
  const asDate = new Date(raw);
  return Number.isNaN(asDate.getTime()) ? null : asDate;
}

function formatRelativeTime(input: unknown, now: Date) {
  const value = parseIsoDate(input);
  if (!value) return '';
  const diffMs = now.getTime() - value.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 45) return 'Baru saja';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 30) return `${diffDays} hari yang lalu`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} bulan yang lalu`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} tahun yang lalu`;
}

function getDisplayName(user: Pick<UserRow, 'namaLengkap' | 'username' | 'email'> | null) {
  if (!user) return '';
  return (
    normalizeString(user.namaLengkap) ||
    normalizeString(user.username) ||
    normalizeString(user.email) ||
    ''
  ).trim();
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  iconBgClassName,
  iconClassName,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  iconBgClassName: string;
  iconClassName: string;
}) {
  return (
    <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-300 text-sm">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subtext ? <p className="text-xs text-purple-300 mt-1">{subtext}</p> : null}
        </div>
        <div className={`p-3 rounded-lg ${iconBgClassName}`}>
          <div className={iconClassName}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function ListCard({
  title,
  children,
  description,
  right,
  span2,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  span2?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${span2 ? 'lg:col-span-2 ' : ''}rounded-lg border border-purple-600 bg-purple-900/30 p-6`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {description ? <p className="text-sm text-purple-200 mt-1">{description}</p> : null}
        </div>
        {right ? <div className="flex-shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Dot() {
  return <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />;
}

function CourseBadge({ status }: { status: string }) {
  const normalized = normalizeString(status).toLowerCase();
  if (normalized === 'approved') return <span className="text-sm font-medium text-green-400">Aktif</span>;
  if (normalized === 'pending') return <span className="text-sm font-medium text-yellow-300">Menunggu</span>;
  if (normalized === 'rejected') return <span className="text-sm font-medium text-red-400">Ditolak</span>;
  return <span className="text-sm font-medium text-purple-200">{status || '—'}</span>;
}

function CourseRowItem({
  course,
  creatorName,
  href,
}: {
  course: CourseRow;
  creatorName?: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between p-4 rounded-lg bg-purple-800/20 hover:bg-purple-800/40 transition">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
        <div>
          <p className="font-semibold text-white">{course.title || 'Tanpa judul'}</p>
          {creatorName ? <p className="text-sm text-purple-300">By {creatorName}</p> : null}
        </div>
      </div>
      <CourseBadge status={course.status} />
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-lg">
      {content}
    </Link>
  );
}

async function loadCourses() {
  const database = getRtdb();
  const snapshot = await get(ref(database, 'courses'));
  const courses: CourseRow[] = [];
  if (!snapshot.exists()) return courses;

  snapshot.forEach((child) => {
    if (!child.key) return;
    const raw = child.val() as any;
    courses.push({
      id: child.key,
      title: normalizeString(raw?.title),
      courseKey: normalizeString(raw?.courseKey),
      createdBy: normalizeString(raw?.createdBy),
      createdAt: raw?.createdAt || null,
      status: normalizeString(raw?.status) || 'pending',
    });
  });

  courses.sort((a, b) => {
    const da = parseIsoDate(a.createdAt)?.getTime() ?? 0;
    const db = parseIsoDate(b.createdAt)?.getTime() ?? 0;
    return db - da;
  });

  return courses;
}

async function loadUsers() {
  const database = getRtdb();
  const snapshot = await get(ref(database, 'users'));
  const users: UserRow[] = [];
  if (!snapshot.exists()) return users;

  snapshot.forEach((child) => {
    if (!child.key) return;
    const raw = child.val() as any;
    users.push({
      id: child.key,
      namaLengkap: normalizeString(raw?.namaLengkap) || normalizeString(raw?.nama),
      username: normalizeString(raw?.username),
      email: normalizeString(raw?.email),
      createdAt: raw?.createdAt || null,
    });
  });

  users.sort((a, b) => {
    const da = parseIsoDate(a.createdAt)?.getTime() ?? 0;
    const db = parseIsoDate(b.createdAt)?.getTime() ?? 0;
    return db - da;
  });

  return users;
}

async function loadJoinEvents() {
  const database = getRtdb();
  const snapshot = await get(ref(database, 'enrollments'));
  const events: JoinEvent[] = [];
  if (!snapshot.exists()) return events;

  snapshot.forEach((courseNode) => {
    const courseId = courseNode.key;
    if (!courseId) return;
    courseNode.forEach((userNode) => {
      const userId = userNode.key;
      if (!userId) return;
      const raw = userNode.val() as any;
      events.push({
        courseId,
        userId,
        joinedAt: raw?.joinedAt || null,
      });
    });
  });

  events.sort((a, b) => {
    const da = parseIsoDate(a.joinedAt)?.getTime() ?? 0;
    const db = parseIsoDate(b.joinedAt)?.getTime() ?? 0;
    return db - da;
  });

  return events;
}

async function loadUserCourseMemberships(userId: string) {
  const database = getRtdb();
  const snapshot = await get(ref(database, `user_courses/${userId}`));
  const memberships = new Map<string, { joinedAt: string | null }>();
  if (!snapshot.exists()) return memberships;

  snapshot.forEach((child) => {
    if (!child.key) return;
    const raw = child.val() as any;
    memberships.set(child.key, { joinedAt: raw?.joinedAt || null });
  });

  return memberships;
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="p-6 md:p-8">
      <div className="rounded-lg border border-purple-600 bg-purple-900/30 p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-purple-200">{message}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect('/login');
  }

  const isGuru = session.role === 'guru';
  const isAdminLike = session.role === 'root' || session.role === 'administrator';
  const isSiswa = !isGuru && !isAdminLike;

  let courses: CourseRow[] = [];
  let users: UserRow[] = [];
  let joinEvents: JoinEvent[] = [];
  let memberships = new Map<string, { joinedAt: string | null }>();

  try {
    const [loadedCourses, loadedUsers] = await Promise.all([loadCourses(), loadUsers()]);
    courses = loadedCourses;
    users = loadedUsers;

    if (isGuru) {
      joinEvents = await loadJoinEvents();
    }

    if (isSiswa) {
      memberships = await loadUserCourseMemberships(session.userId);
    }
  } catch (error: any) {
    if (error?.message === 'ENV_NOT_CONFIGURED') {
      return <DashboardError message="ENV Firebase belum dikonfigurasi. Isi `.env.local` lalu restart dev server." />;
    }
    return <DashboardError message={error?.message || 'Gagal memuat data dashboard.'} />;
  }

  const usersById = new Map(users.map((u) => [u.id, u]));
  const coursesById = new Map(courses.map((c) => [c.id, c]));
  const now = new Date();

  const headerSubtitle = isAdminLike
    ? 'Dashboard OTW Platform'
    : isGuru
      ? 'Dashboard Guru OTW Platform'
      : 'Dashboard Siswa/Mahasiswa OTW Platform';

  const statCards = (() => {
    if (isAdminLike) {
      const totalCourses = courses.length;
      const activeCourses = courses.filter((c) => c.status.toLowerCase() === 'approved').length;
      const totalUsers = users.length;
      const perolehan = totalCourses > 0 ? Math.round((activeCourses / totalCourses) * 100) : 0;

      return (
        <>
          <StatCard
            label="Total Kursus"
            value={totalCourses}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            )}
            iconBgClassName="bg-blue-500/20"
            iconClassName="text-blue-400"
          />
          <StatCard
            label="Total User"
            value={totalUsers}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            )}
            iconBgClassName="bg-green-500/20"
            iconClassName="text-green-400"
          />
          <StatCard
            label="Kursus Aktif"
            value={activeCourses}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            iconBgClassName="bg-purple-500/20"
            iconClassName="text-purple-400"
          />
          <StatCard
            label="Perolehan"
            value={`${perolehan}%`}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
            iconBgClassName="bg-orange-500/20"
            iconClassName="text-orange-400"
          />
        </>
      );
    }

    if (isGuru) {
      const myCourses = courses.filter((c) => c.createdBy === session.userId);
      const active = myCourses.filter((c) => c.status.toLowerCase() === 'approved').length;
      const joined = joinEvents.reduce((acc, ev) => (coursesById.get(ev.courseId)?.createdBy === session.userId ? acc + 1 : acc), 0);

      return (
        <>
          <StatCard
            label="Kursus Dibuat"
            value={myCourses.length}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
              </svg>
            )}
            iconBgClassName="bg-blue-500/20"
            iconClassName="text-blue-400"
          />
          <StatCard
            label="Kursus Aktif"
            value={active}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            iconBgClassName="bg-purple-500/20"
            iconClassName="text-purple-400"
          />
          <StatCard
            label="User Bergabung"
            value={joined}
            icon={(
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
            )}
            iconBgClassName="bg-green-500/20"
            iconClassName="text-green-400"
          />
        </>
      );
    }

    // Siswa/Mahasiswa
    const enrolledCourseIds = new Set(memberships.keys());
    const enrolledCourses = Array.from(enrolledCourseIds)
      .map((id) => coursesById.get(id))
      .filter(Boolean) as CourseRow[];

    const completionAverage = '0%';

    return (
      <>
        <StatCard
          label="Total Kursus Diikuti"
          value={enrolledCourses.length}
          icon={(
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z" />
            </svg>
          )}
          iconBgClassName="bg-blue-500/20"
          iconClassName="text-blue-400"
        />
        <StatCard
          label="Rata-rata Penyelesaian"
          value={completionAverage}
          subtext="Fitur progres belum aktif"
          icon={(
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
          iconBgClassName="bg-orange-500/20"
          iconClassName="text-orange-400"
        />
      </>
    );
  })();

  const mainContent = (() => {
    if (isAdminLike) {
      const latestApproved = courses.filter((c) => c.status.toLowerCase() === 'approved').slice(0, 3);
      const latestUsers = users.slice(0, 4);

      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ListCard title="Kursus Terbaru" span2>
            <div className="space-y-3">
              {latestApproved.length === 0 ? (
                <div className="text-purple-200">Belum ada kursus aktif.</div>
              ) : (
                latestApproved.map((course) => (
                  <CourseRowItem
                    key={course.id}
                    course={course}
                    creatorName={getDisplayName(usersById.get(course.createdBy) || null) || undefined}
                  />
                ))
              )}
            </div>
          </ListCard>

          <ListCard title="Aktivitas" description="Aktivitas terbaru platform">
            <div className="space-y-3">
              {latestUsers.length === 0 ? (
                <div className="text-purple-200">Belum ada aktivitas.</div>
              ) : (
                latestUsers.map((u) => {
                  const name = getDisplayName(u) || 'User';
                  const time = formatRelativeTime(u.createdAt, now);
                  return (
                    <div key={u.id} className="flex gap-3">
                      <Dot />
                      <div className="text-sm">
                        <p className="font-medium text-white">User baru terdaftar: {name}</p>
                        {time ? <p className="text-xs text-purple-300">{time}</p> : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ListCard>
        </div>
      );
    }

    if (isGuru) {
      const myCourses = courses.filter((c) => c.createdBy === session.userId);
      const latestMyCourses = myCourses.slice(0, 3);

      const myCourseIds = new Set(myCourses.map((c) => c.id));
      const myJoinEvents = joinEvents.filter((ev) => myCourseIds.has(ev.courseId)).slice(0, 4);

      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ListCard
            title="Kursus Terbaru"
            span2
            right={
              <Link href="/dashboard/courses" className="text-sm text-purple-200 hover:text-white underline underline-offset-4">
                Kelola kursus
              </Link>
            }
          >
            <div className="space-y-3">
              {latestMyCourses.length === 0 ? (
                <div className="text-purple-200">Belum ada kursus yang dibuat.</div>
              ) : (
                latestMyCourses.map((course) => (
                  <CourseRowItem
                    key={course.id}
                    course={course}
                    creatorName={getDisplayName(usersById.get(course.createdBy) || null) || undefined}
                    href={`/dashboard/courses/${course.id}`}
                  />
                ))
              )}
            </div>
          </ListCard>

          <ListCard title="Aktivitas" description="User terbaru yang bergabung ke kursus Anda">
            <div className="space-y-3">
              {myJoinEvents.length === 0 ? (
                <div className="text-purple-200">Belum ada user yang bergabung.</div>
              ) : (
                myJoinEvents.map((ev) => {
                  const user = usersById.get(ev.userId) || null;
                  const userName = getDisplayName(user) || 'User';
                  const course = coursesById.get(ev.courseId) || null;
                  const courseTitle = course?.title || 'Kursus';
                  const time = formatRelativeTime(ev.joinedAt, now);
                  return (
                    <div key={`${ev.courseId}:${ev.userId}:${ev.joinedAt || ''}`} className="flex gap-3">
                      <Dot />
                      <div className="text-sm">
                        <p className="font-medium text-white">
                          {userName} bergabung ke {courseTitle}
                        </p>
                        {time ? <p className="text-xs text-purple-300">{time}</p> : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ListCard>
        </div>
      );
    }

    // Siswa/Mahasiswa
    const enrolledItems = Array.from(memberships.entries())
      .map(([courseId, m]) => {
        const course = coursesById.get(courseId);
        if (!course) return null;
        return { course, joinedAt: m.joinedAt };
      })
      .filter(Boolean) as { course: CourseRow; joinedAt: string | null }[];

    enrolledItems.sort((a, b) => {
      const da = parseIsoDate(a.joinedAt)?.getTime() ?? 0;
      const db = parseIsoDate(b.joinedAt)?.getTime() ?? 0;
      return db - da;
    });

    const latestEnrolled = enrolledItems.slice(0, 3);
    const enrolledIds = new Set(enrolledItems.map((i) => i.course.id));
    const recommended = courses
      .filter((c) => c.status.toLowerCase() === 'approved' && !enrolledIds.has(c.id))
      .slice(0, 3);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListCard
          title="Kursus Terbaru"
          description="Kursus terakhir yang Anda ikuti"
          right={
            <Link href="/dashboard/my-courses" className="text-sm text-purple-200 hover:text-white underline underline-offset-4">
              Cari kursus
            </Link>
          }
        >
          <div className="space-y-3">
            {latestEnrolled.length === 0 ? (
              <div className="text-purple-200">Belum join kursus.</div>
            ) : (
              latestEnrolled.map(({ course }) => (
                <CourseRowItem
                  key={course.id}
                  course={course}
                  creatorName={getDisplayName(usersById.get(course.createdBy) || null) || undefined}
                  href={`/dashboard/courses/${course.id}`}
                />
              ))
            )}
          </div>
        </ListCard>

        <ListCard title="Rekomendasi Kursus" description="Kursus aktif yang mungkin cocok untuk Anda">
          <div className="space-y-3">
            {recommended.length === 0 ? (
              <div className="text-purple-200">Belum ada rekomendasi.</div>
            ) : (
              recommended.map((course) => (
                <CourseRowItem
                  key={course.id}
                  course={course}
                  creatorName={getDisplayName(usersById.get(course.createdBy) || null) || undefined}
                />
              ))
            )}
          </div>
        </ListCard>
      </div>
    );
  })();

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Selamat Bekerja</h1>
        <p className="text-purple-200">{headerSubtitle}</p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdminLike ? 'lg:grid-cols-4' : isGuru ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-8`}>
        {statCards}
      </div>

      {mainContent}
    </div>
  );
}
