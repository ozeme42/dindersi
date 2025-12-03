

'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Topic } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

function PresentationPageContent() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const unitName = searchParams.get('unitName');

    const [topic, setTopic] = useState<Topic | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

     useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        const fetchTopic = async () => {
            if (!courseId || !unitId || !topicId) {
                setIsLoading(false);
                return;
            }
            try {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    setTopic({ id: topicSnap.id, ...topicSnap.data() } as Topic);
                }
            } catch (error) {
                console.error("Error fetching topic for presentation:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTopic();
    }, [courseId, unitId, topicId]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Sunum yükleniyor...</span>
            </div>
        );
    }
    
    if (!topic) {
        return (
            <div className="flex h-screen items-center justify-center text-muted-foreground">
                Sunum içeriği bulunamadı.
            </div>
        );
    }

    // Teacher presentation doesn't track progress, so we provide dummy functions.
    const noOp = () => {};

    return (
        <main ref={mainContentRef} className="h-screen w-screen p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-start mb-4">
                 <div>
                    <h1 className="text-3xl font-bold font-headline">{topic.title}</h1>
                 </div>
                 <FullscreenToggle elementRef={mainContentRef} />
            </div>
             <LessonContentViewer
                topic={topic}
                courseId={courseId!}
                unitId={unitId!}
                courseTitle={courseName!}
                unitTitle={unitName!}
                onTopicComplete={noOp}
                progress={undefined}
                onProgressUpdate={noOp}
                onMultiAnswer={noOp}
                onAllTfAnswered={noOp}
                isFullscreen={isFullscreen}
            />
        </main>
    );
}


export default function PresentationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <PresentationPageContent />
        </Suspense>
    )
}

    
