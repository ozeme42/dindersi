
import { Suspense } from 'react';
import { MilyonerClientPage } from './client-page';
import { getMilyonerQuestionsAction } from '../actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

// This is now a Server Component that fetches data and passes it to the client component.
export default async function MilyonerOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
      courseId: typeof searchParams.courseId === 'string' ? searchParams.courseId : undefined,
      unitId: typeof searchParams.unitId === 'string' ? searchParams.unitId : undefined,
      topicId: typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined,
  };

  const questionData = await getMilyonerQuestionsAction(params);

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#000022]"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}>
      <MilyonerClientPage initialQuestions={questionData.questions} initialError={questionData.error} />
    </Suspense>
  );
}
