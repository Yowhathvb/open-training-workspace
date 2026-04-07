import KuisCreateClient from './KuisCreateClient';

export default async function KuisNewPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await Promise.resolve(params);
  return <KuisCreateClient courseId={id} />;
}

