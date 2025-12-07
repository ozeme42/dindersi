import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Topic, YazilacaklarContent, ActivityItem } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { YazilacaklarClientPage } from './YazilacaklarClientPage';

async function getTopicYazilacaklar(topicId: string): Promise<YazilacaklarContent | null> {
    if (!topicId) return null;
    try {
        const definitionsQuery = query(
            collection(db, "activityItems"), 
            where("topicId", "==", topicId), 
            where("type", "==", "definition")
        );
        const definitionsSnapshot = await getDocs(definitionsQuery);
        const conceptDefinitions = definitionsSnapshot.docs.map(doc => {
            const item = doc.data() as ActivityItem;
            return {
                concept: item.content.term || '',
                definition: item.content.definition || ''
            };
        }).filter(item => item.concept && item.definition);

        let notes: string[] = [];
        const allCourses = await getDocs(collection(db, 'courses'));
        let topicDocSnap;
        for (const courseDoc of allCourses.docs) {
            const allUnits = await getDocs(collection(db, `courses/${courseDoc.id}/units`));
            for (const unitDoc of allUnits.docs) {
                const topicRef = doc(db, `courses/${courseDoc.id}/units/${unitDoc.id}/topics`, topicId);
                const tempSnap = await getDoc(topicRef);
                if (tempSnap.exists()) {
                    topicDocSnap = tempSnap;
                    break;
                }
            }
            if (topicDocSnap) break;
        }

        if (topicDocSnap && topicDocSnap.exists()) {
             notes = (topicDocSnap.data() as Topic).writingContent?.notes || [];
        }

        if (conceptDefinitions.length === 0 && notes.length === 0) {
            return null;
        }
        
        return { conceptDefinitions, notes };
    } catch (error) {
        console.error("Error fetching yazilacaklar content:", error);
        return null;
    }
}

async function getTopicTitle(topicId: string): Promise<string | null> {
    try {
         const allCourses = await getDocs(collection(db, 'courses'));
        for (const courseDoc of allCourses.docs) {
            const allUnits = await getDocs(collection(db, `courses/${courseDoc.id}/units`));
            for (const unitDoc of allUnits.docs) {
                const topicRef = doc(db, `courses/${courseDoc.id}/units/${unitDoc.id}/topics`, topicId);
                const tempSnap = await getDoc(topicRef);
                if (tempSnap.exists()) {
                    return (tempSnap.data() as Topic).title;
                }
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

export default async function Page({ params }: { params: { courseId: string; unitId: string; topicId: string; } }) {
    const { topicId } = params;
    
    if (!topicId) {
        notFound();
    }
    
    const [content, topicTitle] = await Promise.all([
        getTopicYazilacaklar(topicId),
        getTopicTitle(topicId)
    ]);
    
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <YazilacaklarClientPage content={content} topicTitle={topicTitle} />
        </Suspense>
    );
}
