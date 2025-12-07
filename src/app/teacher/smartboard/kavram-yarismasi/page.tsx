
'use server';

import { Suspense } from 'react';
import KavramYarismaOyunPageWrapper from './oyun/page';
import { getConceptQuizAction, type ConceptQuizQuestion } from '@/app/oyunlar/kavram-yarismasi/actions';


export default async function SmartboardKavramYarismasiPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
    courseId: searchParams.courseId as string,
    unitId: searchParams.unitId as string,
    topicId: searchParams.topicId as string,
  };
  
  const { questions, error } = await getConceptQuizAction(params);

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-red-900 text-white p-8">Hata: {error}</div>;
  }
  
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900"><p>Yükleniyor...</p></div>}>
      <KavramYarismaOyunPageWrapper initialQuestions={questions as ConceptQuizQuestion[]} />
    </Suspense>
  );
}

