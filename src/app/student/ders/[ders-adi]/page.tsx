
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function CourseRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params['ders-adi'] as string;
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (courseId) {
            const findFirstUnitAndRedirect = async () => {
                try {
                    let firstUnitId: string | null = null;
                    const res = await fetch('/curriculum/manifest.json');
                    if (res.ok) {
                        const manifest = await res.json();
                        let targetCourse = null;
                        for (const group of manifest.classGroups || []) {
                            const found = group.courses?.find((c: any) => c.id === courseId);
                            if (found) {
                                targetCourse = found;
                                break;
                            }
                        }

                        if (targetCourse && targetCourse.units && targetCourse.units.length > 0) {
                            const sortedUnits = targetCourse.units.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
                            firstUnitId = sortedUnits[0].id;
                        }
                    }

                    // Fallback to Firestore if not found in manifest
                    if (!firstUnitId) {
                        const unitsSnap = await getDocs(query(collection(db, `courses/${courseId}/units`), orderBy("title", "asc")));
                        if (!unitsSnap.empty) {
                            firstUnitId = unitsSnap.docs[0].id;
                        }
                    }

                    if (firstUnitId) {
                        router.replace(`/student/ders/${courseId}/${firstUnitId}`);
                    } else {
                        setError("Bu derste henüz ünite bulunmuyor.");
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
