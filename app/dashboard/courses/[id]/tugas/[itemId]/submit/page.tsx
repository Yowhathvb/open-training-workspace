import TugasSubmitClient from './TugasSubmitClient';

export default async function TugasSubmitPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }> | { id: string; itemId: string };
}) {
  const { id, itemId } = await Promise.resolve(params);
  return <TugasSubmitClient courseId={id} itemId={itemId} />;
}

