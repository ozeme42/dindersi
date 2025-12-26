
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CourseRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params['ders-adi'] as string;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (courseId) {
            const findFirstUnitAndRedirect = async () => {
                try {
                    // Get the first unit of the course to redirect to its map page
                    const unitsRef = collection(db, `courses/${courseId}/units`);
                    const q = query(unitsRef, orderBy("title"), limit(1));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const firstUnitId = querySnapshot.docs[0].id;
                        router.replace(`/student/ders/${courseId}/${firstUnitId}`);
                    } else {
                        // If no units, maybe redirect to a course-specific page or show an error
                         setError("Bu derste henüz ünite bulunmuyor.");
                         // Fallback redirect
                         router.replace(`/student/soru-bankasi`);
                    }
                } catch (err) {
                    console.error("Redirect failed:", err);
                    setError("Yönlendirme sırasında bir hata oluştu.");
                    router.replace('/student/soru-bankasi');
                }
            };

            findFirstUnitAndRedirect();
        }
    }, [courseId, router]);
    
    if (error) {
        return (
             <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400 p-4 text-center">
                {error}
            </div>
        )
    }

    return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
        </div>
    );
}
