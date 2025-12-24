
'use server';

import { Suspense } from 'react';
import KavramYarismaClientPage from './client-page';
import { getConceptQuizAction } from '../actions';
import { Loader2 } from 'lucide-react';

export default async function KavramYarismaOyunPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  
  const topicId = typeof searchParams.topicId === 'string' ? searchParams.topicId : undefined;

  if (!topicId) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400">
              Hata: Geçerli bir konu ID'si gerekli.
          </div>
      );
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
      <KavramYarismaClientPage 
        initialQuestions={questions} 
        initialError={error} 
        context={context} 
      />
    </Suspense>
  );
}
