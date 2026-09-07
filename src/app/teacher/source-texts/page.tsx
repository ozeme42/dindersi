'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, BookOpen } from 'lucide-react';

function SourceTextsRedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (!params.has('tab')) {
            params.set('tab', 'source');
        }
        router.replace(`/teacher/ozetler?${params.toString()}`);
    }, [router, searchParams]);

    return (
        <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 font-sans">
            <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-500/20 shadow-2xl mb-4">
                <BookOpen className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Ders Kitabı & Özet Stüdyosu'na Yönlendiriliyorsunuz...</h2>
            <p className="text-slate-400 text-sm max-w-md mb-4">
                Kaynak metin ve özet yönetimi tek bir güçlü merkezde birleştirildi.
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
    );
}

export default function SourceTextsRedirectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
        }>
            <SourceTextsRedirectContent />
        </Suspense>
    );
}
