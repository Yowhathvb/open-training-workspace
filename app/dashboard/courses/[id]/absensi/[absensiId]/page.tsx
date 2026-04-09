import AbsensiAttemptClient from './AbsensiAttemptClient';

export default async function AbsensiAttemptPage({
  params,
}: {
  params: Promise<{ id: string; absensiId: string }> | { id: string; absensiId: string };
}) {
  const { id, absensiId } = await Promise.resolve(params);
  return <AbsensiAttemptClient courseId={id} absensiId={absensiId} />;
}

