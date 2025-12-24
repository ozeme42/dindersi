
'use server';

import { Suspense } from 'react';
import KavramYarismaOyunClientPage from '@/app/oyunlar/kavram-yarismasi/oyun/client-page';
import { getConceptQuizAction } from '@/app/oyunlar/kavram-yarismasi/actions';
import { Loader2 } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function KavramYarismaOyunPage({ params, searchParams }: { 
    params: { topicId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
  
  const topicId = params.topicId;

  if (!topicId) {
      // This should technically not be reached with the new file-based routing
      return notFound();
  }

  // Veriyi sunucuda çek
  const { questions, error } = await getConceptQuizAction({ topicId });
  
  // İstemci bileşenine context olarak gönderilecek veriyi oluştur
  const context = {
    courseName: typeof searchParams.courseName === 'string' ? searchParams.courseName : 'Bilinmeyen Ders',
    topicName: typeof searchParams.topicName === 'string' ? searchParams.topicName : 'Bilinmeyen Konu',
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
      <KavramYarismaOyunClientPage 
        initialQuestions={questions} 
        initialError={error} 
        context={context} 
      />
    </Suspense>
  );
}
