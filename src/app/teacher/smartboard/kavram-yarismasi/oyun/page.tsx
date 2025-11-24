import { Suspense } from 'react';
import { KavramYarismaClientPage } from './client-page';
import { getConceptQuizAction } from '@/app/teacher/smartboard/kavram-duellosu/actions';

export const dynamic = 'force-dynamic';

export default async function KavramYarismaOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  const questionData = await getConceptQuizAction(params);

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>}>
      <KavramYarismaClientPage initialQuestions={questionData.concepts} initialError={questionData.error} />
    </Suspense>
  );
}
