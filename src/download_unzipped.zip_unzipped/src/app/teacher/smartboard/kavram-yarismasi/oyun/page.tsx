
import { Suspense } from 'react';
import { KavramYarismaClientPage } from './client-page';
import { getConceptQuizData, type ConceptQuizConcept } from '../actions';

export const dynamic = 'force-dynamic';

// This is now a Server Component that fetches data and passes it to the client component wrapper.
export default async function KavramYarismaOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  const questionData = await getConceptQuizData(params);

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>}>
      <KavramYarismaClientPage initialConcepts={questionData.concepts} initialError={questionData.error} />
    </Suspense>
  );
}
