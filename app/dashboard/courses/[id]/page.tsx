import CourseDetailClient from './CourseDetailClient';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await Promise.resolve(params);
  return <CourseDetailClient courseId={id} />;
}
