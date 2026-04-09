import KuisAttemptClient from './KuisAttemptClient';

export default async function KuisAttemptPage({
  params,
}: {
  params: Promise<{ id: string; kuisId: string }> | { id: string; kuisId: string };
}) {
  const { id, kuisId } = await Promise.resolve(params);
  return <KuisAttemptClient courseId={id} kuisId={kuisId} />;
}

