'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment,
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';
import { isDefinitionValidAndClean } from '@/lib/quiz-validation';


export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

const FALLBACK_POOL = [
    'İman', 'İslam', 'Ahlak', 'İbadet', 'Tevhit', 'Nübüvvet', 'Kuran', 'Sünnet', 
    'Adalet', 'Merhamet', 'Sabır', 'Şükür', 'İhlas', 'Takva', 'Furkan', 
    'İhsan', 'Hidayet', 'Sıdk', 'Emanet', 'Fetanet', 'İsmet', 'Tebliğ',
    'Kıyam', 'Rükû', 'Secde', 'Kıraat', 'Zekât', 'Sadaka', 'Hicret', 'Tevekkül'
];

const DEFAULT_CURRICULUM_PAIRS = [
    { term: 'Tevhit', definition: 'Allah’ın bir ve tek olduğuna, eşi ve benzeri bulunmadığına kalpten inanmak.' },
    { term: 'İman', definition: 'Allah’ın varlığına, meleklerine, kitaplarına ve peygamberlerine yürekten inanıp güvenmek.' },
    { term: 'İbadet', definition: 'Yüce Allah’ın rızasını ve sevgisini kazanmak amacıyla yapılan her türlü güzel amel ve kulluk vazifesi.' },
    { term: 'Ahlak', definition: 'İnsanın iyi veya kötü olarak nitelendirilmesine yol açan manevi nitelikleri, huyları ve davranışları.' },
    { term: 'Nübüvvet', definition: 'Peygamberlik müessesesi; Yüce Allah’ın insanlara emir ve yasaklarını bildirmek üzere elçi göndermesi.' },
    { term: 'Kuran', definition: 'Allah tarafından Hz. Muhammed’e vahiy yoluyla indirilen, okunmasıyla ibadet edilen son ilahi kitap.' },
    { term: 'Sünnet', definition: 'Hz. Peygamber’in sözleri, uygulamaları ve sahabilerin güzel davranışlarını onaylaması.' },
    { term: 'Takva', definition: 'Allah’a karşı derin bir sorumluluk bilinciyle günahlardan sakınma ve emirlerine titizlikle uyma hali.' },
    { term: 'Adalet', definition: 'Her hak sahibine hakkını vermek, hak ve hukuka uygun davranarak haksızlıktan kaçınmak.' },
    { term: 'İhlas', definition: 'Yapılan her türlü ibadet ve güzel davranışı sadece ve sadece Allah rızası için yerine getirmek.' }
];

export async function getConceptQuizAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string; unitId?: string; }
): Promise<{ questions: ConceptQuizQuestion[] | null; error?: string }> {
    noStore();
    try {
        const itemsForTopic = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' });

        const pairs: { term: string; definition: string }[] = [];

        for (const item of itemsForTopic || []) {
            if ('type' in item) {
                let t = '';
                let d = '';

                if (item.type === 'definition') {
                    t = String((item as any).content?.term || (item as any).term || '').trim();
                    d = String((item as any).content?.definition || (item as any).definition || '').trim();
                } else if (item.type === 'concept') {
                    t = String((item as any).content?.term || (item as any).content?.text || (item as any).term || '').trim();
                    d = String((item as any).content?.definition || (item as any).content?.meaning || (item as any).definition || '').trim();
                } else if (item.type === 'conceptExplanation') {
                    t = String((item as any).concept || (item as any).term || '').trim();
                    d = String((item as any).definition || '').trim();
                }

                if (t.length >= 2 && t.length <= 40 && isDefinitionValidAndClean(t, d)) {
                    pairs.push({ term: t, definition: d });
                }
            }
        }

        // Eğer konuya ait geçerli tanım bulunamadıysa temel müfredat kavramlarıyla oyunu başlat
        if (pairs.length < 1) {
            pairs.push(...DEFAULT_CURRICULUM_PAIRS);
        }

        // Terim bazında tekilleştirme
        const uniquePairs: { term: string; definition: string }[] = [];
        const seenTerms = new Set<string>();

        for (const pair of pairs) {
            const termKey = pair.term.trim().toLocaleLowerCase('tr-TR');
            if (!seenTerms.has(termKey)) {
                seenTerms.add(termKey);
                uniquePairs.push(pair);
            }
        }

        const allTermsPool = [...new Set([...uniquePairs.map(p => p.term), ...FALLBACK_POOL])];
        const gameQuestions: ConceptQuizQuestion[] = [];

        for (const item of uniquePairs) {
            const correctAnswer = item.term;
            const definition = item.definition;
            const normCorrect = correctAnswer.trim().toLocaleLowerCase('tr-TR');

            // Doğru cevaptan farklı çeldiriciler
            const candidateDistractors = allTermsPool.filter(term => {
                const normTerm = term.trim().toLocaleLowerCase('tr-TR');
                return normTerm !== normCorrect;
            });

            // Karıştır ve 3 adet çeldirici seç
            const shuffledDistractors = candidateDistractors.sort(() => 0.5 - Math.random());
            const selectedDistractors: string[] = [];
            const selectedNorms = new Set<string>();

            for (const d of shuffledDistractors) {
                const normD = d.trim().toLocaleLowerCase('tr-TR');
                if (!selectedNorms.has(normD)) {
                    selectedNorms.add(normD);
                    selectedDistractors.push(d);
                    if (selectedDistractors.length === 3) break;
                }
            }

            // Eksik kalırsa fallback havuzundan tamamla
            let fbIdx = 0;
            while (selectedDistractors.length < 3 && fbIdx < FALLBACK_POOL.length) {
                const candidate = FALLBACK_POOL[fbIdx++];
                const normCandidate = candidate.trim().toLocaleLowerCase('tr-TR');
                if (normCandidate !== normCorrect && !selectedNorms.has(normCandidate)) {
                    selectedNorms.add(normCandidate);
                    selectedDistractors.push(candidate);
                }
            }

            const options = [correctAnswer, ...selectedDistractors].sort(() => 0.5 - Math.random());

            gameQuestions.push({
                definition,
                options,
                correctAnswer
            });
        }
        
        if (gameQuestions.length === 0) {
             return { error: "Oyun için uygun soru oluşturulamadı. Konuda yeterli çeşitlilikte kavram olmayabilir.", questions: null };
        }
        
        const shuffledGameQuestions = gameQuestions.sort(() => 0.5 - Math.random());
        return { questions: JSON.parse(JSON.stringify(shuffledGameQuestions)) };

    } catch (error: any) {
        console.error("Error getting Kavram Yarışması questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: null };
    }
}

export async function submitConceptQuizScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kavram Yarışması'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Kavram Yarışması',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Kavram Yarışması score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
