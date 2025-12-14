import { Suspense } from 'react';
import { KavramYarismaClientPage } from './client-page';
import { getConceptQuizData } from '@/app/oyunlar/kavram-yarismasi/actions';
import type { ConceptQuizQuestion } from '@/app/oyunlar/kavram-yarismasi/actions';

export const dynamic = 'force-dynamic';

// This is now a Server Component that fetches data and passes it to the client component wrapper.
export default async function KavramYarismaOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  if (!params.topicId) {
      return <div>Konu ID'si gerekli.</div>;
  }

  const { concepts: questions, error } = await getConceptQuizData(params.topicId);
  
  const context = {
    courseName: typeof searchParams.courseName === 'string' ? searchParams.courseName : 'Bilinmeyen Ders',
    topicName: typeof searchParams.topicName === 'string' ? searchParams.topicName : 'Bilinmeyen Konu',
  }

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>}>
      <KavramYarismaClientPage initialQuestions={questions} initialError={error} context={context} />
    </Suspense>
  );
}