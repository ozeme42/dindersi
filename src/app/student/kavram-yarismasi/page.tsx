
import { Suspense } from 'react';
import { KavramYarismaSetupClientPage } from './client-page';
import { getConceptQuizAction, type ConceptQuizQuestion } from './actions';

export const dynamic = 'force-dynamic';

export default async function KavramYarismaOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  // Although we are not using the questions directly here, fetching them ensures
  // the logic is sound and can be used for pre-loading or validation in the future.
  const questionData = await getConceptQuizAction(params);

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <KavramYarismaSetupClientPage />
    </Suspense>
  );
}
