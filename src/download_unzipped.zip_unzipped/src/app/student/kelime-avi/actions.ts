
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type WordSearchPuzzle = {
    grid: string[][];
    words: string[];
};

const TURKISH_ALPHABET = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

function generateWordSearch(words: string[], gridSize: number): WordSearchPuzzle {
    const grid: (string | null)[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const placedWords: string[] = [];

    const directions = [
        { x: 1, y: 0 },   // right
        { x: 0, y: 1 },   // down
        { x: 1, y: 1 },   // down-right
        { x: -1, y: 1 },  // down-left
        { x: 1, y: -1 },  // up-right
    ];

    for (const word of words) {
        const uppercaseWord = word.toLocaleUpperCase('tr-TR');
        const attempts = 100;

        for (let i = 0; i < attempts; i++) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const startRow = Math.floor(Math.random() * gridSize);
            const startCol = Math.floor(Math.random() * gridSize);

            const endRow = startRow + (uppercaseWord.length - 1) * dir.y;
            const endCol = startCol + (uppercaseWord.length - 1) * dir.x;

            if (endRow >= 0 && endRow < gridSize && endCol >= 0 && endCol < gridSize) {
                let canPlace = true;
                for (let j = 0; j < uppercaseWord.length; j++) {
                    const r = startRow + j * dir.y;
                    const c = startCol + j * dir.x;
                    if (grid[r][c] !== null && grid[r][c] !== uppercaseWord[j]) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
                    for (let j = 0; j < uppercaseWord.length; j++) {
                        const r = startRow + j * dir.y;
                        const c = startCol + j * dir.x;
                        grid[r][c] = uppercaseWord[j];
                    }
                    placedWords.push(uppercaseWord);
                    break;
                }
            }
        }
    }
    
    const finalGrid = grid.map(row => 
        row.map(cell => 
            cell === null 
                ? TURKISH_ALPHABET.charAt(Math.floor(Math.random() * TURKISH_ALPHABET.length))
                : cell
        )
    ) as string[][];

    return { grid: finalGrid, words: placedWords.sort((a,b) => a.length - b.length) };
}


export async function getWordSearchAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ puzzle: WordSearchPuzzle; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'concept'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }
        
        const querySnapshot = await getDocs(q);
        
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

        const allConceptsRaw = querySnapshot.docs
            .map(doc => (doc.data() as ActivityItem).content.text)
            .filter((text): text is string => 
                !!text && 
                text.trim().length > 2 && 
                text.trim().length <= 10 && 
                !text.includes(' ') &&
                turkishAlphabetRegex.test(text) // Only allow alphabet characters
            );

        // Ensure all concepts are unique to prevent React key errors
        const allConcepts = [...new Set(allConceptsRaw)];

        if (allConcepts.length < 3) {
            return { error: "Kelime Avı için bu konuda uygun en az 3 kelime bulunamadı.", puzzle: { grid: [], words: [] } };
        }
        
        const selectedWords = allConcepts.sort(() => 0.5 - Math.random()).slice(0, 12);
        
        const gridSize = 12;
        const puzzle = generateWordSearch(selectedWords, gridSize);

        if (puzzle.words.length < 3) {
            return { error: "Kelime Avı bulmacası oluşturulamadı. Lütfen daha fazla kelime ekleyin.", puzzle: { grid: [], words: [] } };
        }

        return { puzzle: JSON.parse(JSON.stringify(puzzle)) };
    } catch (error: any) {
        console.error("Error getting word search puzzle:", error);
        return { error: "Kelime Avı görevi alınırken bir hata oluştu.", puzzle: { grid: [], words: [] } };
    }
}


export async function submitWordSearchScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Kelime Avı'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);

        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Kelime Avı',
            context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting word search score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
