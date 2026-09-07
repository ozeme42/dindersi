'use server';

import type { ActivityItem } from "@/lib/types";
import { getStaticQuestionsForGame } from "@/lib/quiz-actions";
import { unstable_noStore as noStore } from 'next/cache';

export type HizliButonQuestion = {
    q: string; // The definition
    a: string; // The correct term
};

export async function getHizliButonQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: HizliButonQuestion[]; error?: string }> {
    noStore();
    try {
        const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
        const pairs: HizliButonQuestion[] = [];

        for (const item of allItems || []) {
            if ('type' in item) {
                if ((item.type === 'definition' || item.type === 'concept') && (item as any).content?.term && (item as any).content?.definition) {
                    pairs.push({
                        q: String((item as any).content.definition).trim(),
                        a: String((item as any).content.term).trim(),
                    });
                } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).text || (item as any).question)) {
                    pairs.push({
                        q: String((item as any).text || (item as any).question).trim(),
                        a: String((item as any).correctAnswer).trim(),
                    });
                }
            }
        }

        if (pairs.length < 1) {
            const defaultPairs: HizliButonQuestion[] = [
                { q: 'Allah’ın bir ve tek olduğuna, eşi ve benzeri bulunmadığına inanmak.', a: 'Tevhit' },
                { q: 'Allah’ın varlığına, birliğine ve Hz. Peygamber’in getirdiklerine kalpten inanmak.', a: 'İman' },
                { q: 'Allah’ın rızasını kazanmak amacıyla yapılan her türlü güzel amel ve kulluk görevi.', a: 'İbadet' },
                { q: 'İnsanın iyi veya kötü olarak nitelendirilmesine yol açan manevi nitelikleri ve davranışları.', a: 'Ahlak' },
                { q: 'Peygamberlik müessesesi; Allah’ın kullarına doğru yolu göstermek için elçi göndermesi.', a: 'Nübüvvet' },
                { q: 'Allah tarafından Hz. Muhammed’e vahiy yoluyla indirilen son ilahi kitap.', a: 'Kuran-ı Kerim' },
                { q: 'Hz. Peygamber’in sözleri, uygulamaları ve sahabilerin davranışlarını onaylaması.', a: 'Sünnet' },
                { q: 'Allah’a karşı derin saygı ve sorumluluk bilinciyle günahlardan sakınma hali.', a: 'Takva' }
            ];
            pairs.push(...defaultPairs);
        }

        const shuffled = [...pairs].sort(() => 0.5 - Math.random());
        return { questions: JSON.parse(JSON.stringify(shuffled.slice(0, 30))) };
    } catch (error: any) {
        console.error("Error getting Hizli Buton data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
