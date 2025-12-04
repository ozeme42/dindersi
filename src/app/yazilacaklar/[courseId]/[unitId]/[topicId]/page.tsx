
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Topic, YazilacaklarContent } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { Columns, NotepadText, Sparkles } from "lucide-react";

type YazilacaklarPageProps = {
    params: {
        courseId: string;
        unitId: string;
        topicId: string;
    }
}

async function getTopicYazilacaklar(courseId: string, unitId: string, topicId: string): Promise<{ title: string, content: YazilacaklarContent } | null> {
    try {
        const topicRef = doc(db, `courses/${courseId}/units/${unitId}/topics/${topicId}`);
        const topicSnap = await getDoc(topicRef);

        if (!topicSnap.exists() || !topicSnap.data().writingContent) {
            return null;
        }
        
        const data = topicSnap.data() as Topic;

        return {
            title: data.title,
            content: data.writingContent as YazilacaklarContent,
        }

    } catch (error) {
        console.error("Error fetching 'yazilacaklar' content: ", error);
        return null;
    }
}


export default async function YazilacaklarPage({ params }: YazilacaklarPageProps) {
    const data = await getTopicYazilacaklar(params.courseId, params.unitId, params.topicId);

    const hasNotes = (data?.content.notes?.length || 0) > 0;
    const hasConcepts = (data?.content.conceptDefinitions?.length || 0) > 0;

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/50 dark:via-purple-950/50 dark:to-pink-950/50">
            <AppHeader />
            <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
                 <Card className="bg-card/80 backdrop-blur-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl md:text-3xl">
                            <Columns className="w-8 h-8 text-primary"/>
                            <span>{data ? data.title : 'İçerik Bulunamadı'}</span>
                        </CardTitle>
                        <CardDescription>Defterinize yazmanız için hazırlanan bölüm.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {!data || (!hasNotes && !hasConcepts) ? (
                            <p className="text-center text-muted-foreground py-8">Bu konu için yazılacak içerik bulunamadı.</p>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-8">
                                {hasConcepts && (
                                    <div className="space-y-4">
                                        <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
                                            <Sparkles className="w-5 h-5"/>
                                            <span>Anahtar Kavramlar ve Tanımları</span>
                                        </h2>
                                        <div className="space-y-3">
                                            {data.content.conceptDefinitions.map((item, index) => (
                                                <div key={index} className="p-3 bg-muted/50 rounded-lg">
                                                    <p><strong>{item.concept}:</strong> {item.definition}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {hasNotes && (
                                    <div className="space-y-4">
                                        <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
                                            <NotepadText className="w-5 h-5"/>
                                            <span>Önemli Notlar</span>
                                        </h2>
                                        <ul className="space-y-2 list-disc pl-5">
                                            {data.content.notes.map((note, index) => (
                                                <li key={index}>{note}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
