
import { Suspense } from 'react';
import { MilyonerClientPage } from '../client-page';
import { getMilyonerQuestionsAction } from '../actions';

export const dynamic = 'force-dynamic';

// This is a server-side wrapper component
export default async function MilyonerOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  const questionData = await getMilyonerQuestionsAction(params);

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>}>
      <MilyonerClientPage initialQuestions={questionData.questions} initialError={questionData.error} />
    </Suspense>
  );
}
