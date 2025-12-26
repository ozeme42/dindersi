// This file is obsolete and will be removed.
// The new unified editor is located at /teacher/veri-editoru
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ObsoleteStaticDataEditorPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/teacher/veri-editoru');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-950">
            <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
            <p className="ml-4 text-white">Yönlendiriliyor...</p>
        </div>
    );
}
