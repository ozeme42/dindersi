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

export type ConceptQuizQuestion = {
    definition: string;
    options: string[];
    correctAnswer: string;
};

function normalizeTr(str: string): string {
    if (!str) return '';
    return str
        .toLocaleLowerCase('tr-TR')
        .replace(/[âäá]/g, 'a')
        .replace(/[îïí]/g, 'i')
        .replace(/[ûüú]/g, 'u')
        .replace(/[ôöó]/g, 'o')
        .replace(/[^a-zçğıöşü0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const BANNED_PATTERNS = [
    /ipucu/i,
    /harflerini.*sıral/i,
    /sıralayarak/i,
    /kelimeyi bul/i,
    /doğru sırala/i,
    /boşluğu doldur/i,
    /bu kavramın/i,
    /bu kelime/i,
    /tahmin ediniz/i,
    /hangisidir/i,
    /aşağıdakilerden/i,
    /bulmaca/i,
    /tanımsız/i,
    /tanım yok/i,
    /^tanım$/i,
    /^kavram$/i
];

const GENERIC_CATEGORY_WORDS = new Set([
    'namaz', 'namazı', 'namazlar', 'namazları',
    'savaş', 'savaşı', 'savaşlar', 'savaşları',
    'mescit', 'mescidi', 'mescid', 'cami', 'camii', 'camisi',
    'sure', 'suresi', 'sureler', 'sureleri',
    'ayet', 'ayeti', 'ayetler', 'ayetleri',
    'dua', 'duası', 'dualar', 'duaları',
    'yıl', 'yılı', 'yıllar', 'yılları',
    'gün', 'günü', 'günler', 'günleri',
    'gece', 'gecesi', 'geceler', 'geceleri',
    'olay', 'olayı', 'olaylar', 'olayları',
    'hac', 'haccı',
    'oruç', 'orucu',
    'antlaşma', 'antlaşması',
    'sefer', 'seferi',
    'dönem', 'dönemi',
    'kavram', 'kavramı'
]);

const STOP_WORDS = new Set([
    've', 'ile', 'bir', 'olan', 'için', 'gibi', 'eden', 'adı', 'adına', 'denir', 
    'olarak', 'kadar', 'veya', 'biri', 'göre', 'sonra', 'önce', 'hz', 'sav', 
    'as', 'ra', 'cc', 'oğlu', 'kızı', 'eşi', 'anlamına', 'ait', 'kendi', 'alan'
]);

export function isDefinitionValidAndClean(term: string, definition: string): boolean {
    if (!term || !definition) return false;
    
    const cleanTerm = term.trim();
    const cleanDef = definition.trim();

    // 1. Min tanım uzunluğu (en az 15 karakter olmalı; 'Lakabı', 'Babası', '2.Halife' gibi yetersiz tanımları eler)
    if (cleanDef.length < 15) return false;

    // 2. Yasaklı anagram, yönerge ve ipucu kalıplarını eler
    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(cleanDef)) return false;
    }

    const normTerm = normalizeTr(cleanTerm);
    const normDef = normalizeTr(cleanDef);

    if (!normTerm || !normDef) return false;

    // 3. Tanım ile terim birebir aynı veya tanım terimi doğrudan içeriyorsa eler (cevabı doğrudan ele verenler)
    if (normTerm === normDef || normDef.includes(normTerm)) return false;

    // 4. Anlamlı kelime token'larını ayrıştır (parantez içi dahil)
    const tokens = normTerm
        .split(' ')
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

    if (tokens.length === 0) return false;

    const isMultiWord = tokens.length > 1;

    for (const token of tokens) {
        // Çok kelimeli kavramlarda genel kategori kelimesi (örn: Bayram Namazı'ndaki 'namazı') tek başına sızıntı sayılmaz
        if (isMultiWord && GENERIC_CATEGORY_WORDS.has(token)) {
            continue;
        }

        // Ayırt edici kelime / kök kontrolü
        if (token.length <= 4) {
            const defWords = normDef.split(' ');
            if (defWords.includes(token)) return false;
            const hasStemWithSuffix = defWords.some(dw => dw.startsWith(token) && dw.length <= token.length + 4);
            if (hasStemWithSuffix) return false;
        } else {
            // 5 harf veya daha uzun kelimelerde Türkçe ekleri yakalamak için ilk 5 harflik kök taranır
            const stem = token.substring(0, Math.min(token.length, 5));
            if (normDef.includes(stem)) return false;
        }
    }

    return true;
}

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
