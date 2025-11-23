
import { Suspense } from 'react';
import { YaziTuraClientPage } from './client-page';
import { getYaziTuraQuestionsAction } from '../actions';

// This is a server-side wrapper component
export default async function YaziTuraOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  const questionData = await getYaziTuraQuestionsAction(params);

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>}>
      <YaziTuraClientPage initialQuestions={questionData.data} initialError={questionData.error} />
    </Suspense>
  );
}
