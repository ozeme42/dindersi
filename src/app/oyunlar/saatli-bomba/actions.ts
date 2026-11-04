'use server';

import { unstable_noStore as noStore } from 'next/cache';
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
import { getStaticQuestionsForGame, getQuestionsFromBank } from '@/lib/quiz-actions';
import { isDefinitionValidAndClean } from '@/lib/quiz-actions';

export interface BombQuestion {
    id: string;
    definition: string;
    options: string[];
    correctAnswer: string;
    hint?: string;
}

const CURRICULUM_FALLBACK_CONCEPTS: { term: string; definition: string }[] = [
    { term: 'Tevhid', definition: 'Yüce Allah’ın bir olduğuna, eşi, benzeri ve ortağı bulunmadığına inanmak.' },
    { term: 'İhlas', definition: 'İbadet ve hayırları sadece ve sadece Allah rızası için, samimiyetle yapmak.' },
    { term: 'Şirk', definition: 'Allah’a ortak koşmak veya O’ndan başka varlıklara ilahi özellikler atfetmek.' },
    { term: 'Tevekkül', definition: 'Bir iş için gerekli tüm gayreti gösterdikten sonra sonucunu Allah’a bırakıp güvenmek.' },
    { term: 'Sadaka-i Cariye', definition: 'Kişi vefat ettikten sonra da sevabı devam eden okul, çeşme, cami gibi kalıcı hayırlar.' },
    { term: 'Zekat', definition: 'Dinen zengin sayılan Müslümanların yılda bir kez mallarının belli bir kısmını ihtiyaç sahiplerine vermesi.' },
    { term: 'Nisap', definition: 'Bir Müslümanın dinen zengin sayılması için sahip olması gereken asgari zenginlik ölçüsü.' },
    { term: 'İmsak', definition: 'Oruç tutacak kişinin yeme, içme ve diğer oruç yasaklarına başladığı tan yeri ağarma vakti.' },
    { term: 'İftar', definition: 'Akşam ezanının okunmasıyla orucun açıldığı vakit.' },
    { term: 'Farz', definition: 'Dinen yapılması kesin ve açık delillerle emredilen bağlayıcı hükümler (Namaz, Oruç, Zekat gibi).' },
    { term: 'Vacip', definition: 'Farz kadar kesin olmamakla birlikte yapılması kuvvetle emredilen dini hükümler (Kurban, Vitir namazı gibi).' },
    { term: 'Sünnet', definition: 'Peygamber Efendimiz’in (s.a.v.) farz ve vacip dışında yaptığı, Müslümanlara tavsiye ettiği güzel davranışlar.' },
    { term: 'Kaza', definition: 'Zamanında kılınamayan namazın veya tutulamayan orucun daha sonra yerine getirilmesi.' },
    { term: 'Kader', definition: 'Allah’ın ezelden ebede kadar olacak her şeyi önceden bilip takdir etmesi ve ölçü koyması.' },
    { term: 'Basar', definition: 'Yüce Allah’ın her şeyi, karanlıkta veya gizlide olsa dahi eksiksiz görmesi sıfatı.' },
    { term: 'Semi', definition: 'Yüce Allah’ın fısıltı dahil her türlü sesi ve duayı işitmesi sıfatı.' },
    { term: 'İlim', definition: 'Yüce Allah’ın geçmişi, geleceği, gizliyi ve açığı her yönüyle bilmesi sıfatı.' },
    { term: 'Kudret', definition: 'Yüce Allah’ın her şeye gücünün yetmesi, dilediğini yaratabilmesi sıfatı.' },
    { term: 'Takva', definition: 'Allah’ın emirlerine uyup yasaklarından kaçınarak O’nun sevgisini kaybetmekten sakınmak.' },
    { term: 'Fıtrat', definition: 'İnsanın doğuştan getirdiği, inanmaya ve iyiliğe yatkın olan temiz yaratılış hali.' },
];

export async function getSaatliBombaQuestionsAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string; unitId?: string; }
): Promise<{ questions: BombQuestion[] | null; error?: string }> {
    noStore();
    try {
        const gameQuestions: BombQuestion[] = [];
        const seenAnswers = new Set<string>();

        // 1. Statik aktivitelerden tanımları çek
        let itemsForTopic = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' });
        const pairs: { term: string; definition: string }[] = [];

        for (const item of itemsForTopic || []) {
            if ('type' in item) {
                if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    const t = String((item as any).content.term).trim();
                    const d = String((item as any).content.definition).trim();
                    if (t.length >= 2 && t.length <= 35 && t.split(/\s+/).length <= 3) pairs.push({ term: t, definition: d });
                } else if (item.type === 'concept' && ((item as any).content?.term || (item as any).content?.text) && ((item as any).content?.definition || (item as any).content?.meaning)) {
                    const t = String((item as any).content?.term || (item as any).content?.text).trim();
                    const d = String((item as any).content?.definition || (item as any).content?.meaning).trim();
                    if (t.length >= 2 && t.length <= 35 && t.split(/\s+/).length <= 3) pairs.push({ term: t, definition: d });
                }
            }
        }

        // Havuz terimleri topla
        const allTermsPool = [
            ...pairs.map(p => p.term),
            ...CURRICULUM_FALLBACK_CONCEPTS.map(c => c.term)
        ];

        // Tanımlardan soru üret
        for (const item of pairs) {
            const correctAnswer = item.term.trim();
            const definition = item.definition.trim();

            if (definition.length < 10) continue;
            if (definition.toLowerCase().includes(correctAnswer.toLowerCase())) continue;
            
            const key = correctAnswer.toLowerCase();
            if (seenAnswers.has(key)) continue;
            seenAnswers.add(key);

            let distractors = allTermsPool
                .filter(term => term.toLocaleLowerCase('tr-TR') !== correctAnswer.toLocaleLowerCase('tr-TR'))
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            while (distractors.length < 3) {
                const fb = CURRICULUM_FALLBACK_CONCEPTS[Math.floor(Math.random() * CURRICULUM_FALLBACK_CONCEPTS.length)].term;
                if (!distractors.includes(fb) && fb.toLowerCase() !== correctAnswer.toLowerCase()) {
                    distractors.push(fb);
                }
            }

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

            gameQuestions.push({
                id: `bomb-def-${gameQuestions.length + 1}`,
                definition,
                options,
                correctAnswer
            });
        }

        // 2. Yeterli soru yoksa soru bankasından çoktan seçmeli soruları da dene
        if (gameQuestions.length < 8) {
            try {
                const bankResult = await getQuestionsFromBank({
                    courseId,
                    unitId,
                    topicId,
                    questionCount: 15,
                    questionTypes: ['Çoktan Seçmeli', 'mcq']
                });

                if (bankResult.questions && bankResult.questions.length > 0) {
                    for (const q of bankResult.questions) {
                        if (q.options && q.options.length >= 2 && q.correctAnswer) {
                            const correctOpt = q.correctAnswer.trim();
                            const key = correctOpt.toLowerCase();
                            if (seenAnswers.has(key)) continue;
                            seenAnswers.add(key);

                            let currentOptions = [...q.options];
                            while (currentOptions.length < 4) {
                                const fb = CURRICULUM_FALLBACK_CONCEPTS[Math.floor(Math.random() * CURRICULUM_FALLBACK_CONCEPTS.length)].term;
                                if (!currentOptions.includes(fb)) {
                                    currentOptions.push(fb);
                                }
                            }
                            
                            gameQuestions.push({
                                id: `bomb-bank-${q.id || gameQuestions.length + 1}`,
                                definition: q.text || 'Bu kavramı doğru belirleyiniz.',
                                options: currentOptions.slice(0, 4).sort(() => 0.5 - Math.random()),
                                correctAnswer: correctOpt
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn("Saatli Bomba soru bankası verisi alınırken hata:", err);
            }
        }

        // 3. Hala 5'ten azsa zengin yedek müfredat kavramlarından tamamla
        if (gameQuestions.length < 8) {
            for (const fbItem of CURRICULUM_FALLBACK_CONCEPTS) {
                const key = fbItem.term.toLowerCase();
                if (seenAnswers.has(key)) continue;
                seenAnswers.add(key);

                const distractors = CURRICULUM_FALLBACK_CONCEPTS
                    .filter(c => c.term.toLowerCase() !== key)
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3)
                    .map(c => c.term);

                const options = [fbItem.term, ...distractors].sort(() => 0.5 - Math.random());

                gameQuestions.push({
                    id: `bomb-fallback-${gameQuestions.length + 1}`,
                    definition: fbItem.definition,
                    options,
                    correctAnswer: fbItem.term
                });

                if (gameQuestions.length >= 15) break;
            }
        }

        // 4. ARALIKLI TEKRAR (Spaced Repetition): Her kavramı en az 3 kez sor
        // Akademik olarak zorlanan öğrencilerin kavramları pekiştirmesi için her kavram en az 3 kez gelir.
        const targetRounds = 3; 
        const basePool = gameQuestions.length > 0 ? gameQuestions : CURRICULUM_FALLBACK_CONCEPTS.map((c, i) => ({
            id: `bomb-fb-${i}`,
            definition: c.definition,
            options: [c.term, 'İhlas', 'Zekat', 'Tevhid'],
            correctAnswer: c.term
        }));

        // 4 ila 6 kavram seçerek toplam tur sayısını ideal (12-18) tut
        const uniqueConcepts = basePool.slice(0, Math.min(basePool.length, 6));

        const tripleDeck: BombQuestion[] = [];
        for (let wave = 0; wave < targetRounds; wave++) {
            // Her dalgada kavramların sırası karıştırılır (aynı kavram peş peşe gelmez)
            const waveItems = [...uniqueConcepts].sort(() => 0.5 - Math.random());
            
            for (let i = 0; i < waveItems.length; i++) {
                const item = waveItems[i];
                // Çeldiricileri her dalga için yeniden karıştır
                const distractors = allTermsPool
                    .filter(t => t.toLowerCase() !== item.correctAnswer.toLowerCase())
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3);
                
                while (distractors.length < 3) {
                    const fb = CURRICULUM_FALLBACK_CONCEPTS[Math.floor(Math.random() * CURRICULUM_FALLBACK_CONCEPTS.length)].term;
                    if (!distractors.includes(fb) && fb.toLowerCase() !== item.correctAnswer.toLowerCase()) {
                        distractors.push(fb);
                    }
                }

                const options = [item.correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
                tripleDeck.push({
                    id: `bomb-w${wave + 1}-${i + 1}-${item.id}`,
                    definition: item.definition,
                    options,
                    correctAnswer: item.correctAnswer
                });
            }
        }

        return { questions: JSON.parse(JSON.stringify(tripleDeck)) };

    } catch (error: any) {
        console.error("Error getting Saatli Bomba questions:", error);
        return { error: "Sorular yüklenirken bir sorun oluştu.", questions: null };
    }
}

export async function submitSaatliBombaScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Saatli Bomba'),
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
            gameType: 'Saatli Bomba',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Saatli Bomba score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
