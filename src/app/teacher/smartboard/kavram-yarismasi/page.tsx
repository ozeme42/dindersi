'use server';

import { Suspense } from 'react';
import KavramYarismaOyunPageWrapper from './oyun/page';
import { getConceptQuizAction, type ConceptQuizQuestion } from '@/app/oyunlar/kavram-yarismasi/actions';

export const dynamic = 'force-dynamic';

export default async function SmartboardKavramYarismasiPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const params = {
    courseId: searchParams.courseId as string | undefined,
    unitId: searchParams.unitId as string | undefined,
    topicId: searchParams.topicId as string | undefined,
  };

  const { questions, error } = await getConceptQuizAction(params);
  
  const context = {
    courseName: searchParams.courseName as string,
    topicName: searchParams.topicName as string,
  }

  return (
    <KavramYarismaOyunPageWrapper questions={questions} error={error} context={context} />
  );
}
