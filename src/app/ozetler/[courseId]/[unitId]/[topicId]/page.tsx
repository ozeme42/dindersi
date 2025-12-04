
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Topic } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { BookOpen } from "lucide-react";

type OzetPageProps = {
    params: {
        courseId: string;
        unitId: string;
        topicId: string;
    }
}

async function getTopicOzet(courseId: string, unitId: string, topicId: string): Promise<Topic | null> {
    try {
        const topicRef = doc(db, `courses/${courseId}/units/${unitId}/topics/${topicId}`);
        const topicSnap = await getDoc(topicRef);

        if (!topicSnap.exists() || !topicSnap.data().htmlContent) {
            return null;
        }

        return { id: topicSnap.id, ...topicSnap.data() } as Topic;
    } catch (error) {
        console.error("Error fetching topic summary: ", error);
        return null;
    }
}


export default async function OzetPage({ params }: OzetPageProps) {
    const topic = await getTopicOzet(params.courseId, params.unitId, params.topicId);

    return (
         <div className="flex flex-col min-h-screen bg-muted/40">
            <AppHeader />
            <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen />
                            {topic ? topic.title : 'Özet Bulunamadı'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topic ? (
                            <div 
                                className="prose dark:prose-invert max-w-none" 
                                dangerouslySetInnerHTML={{ __html: topic.htmlContent || '' }}
                            />
                        ) : (
                            <p>Bu konu için bir özet bulunamadı veya yüklenirken bir hata oluştu.</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
