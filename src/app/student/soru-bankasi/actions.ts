'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { QuestionBankTopicProgress } from "@/lib/types";

// This is a placeholder function to satisfy the import in the student dashboard.
// It will need to be implemented properly later.
export async function getCourseQuestionBankStats(courseId: string, userId: string): Promise<{ passedTests: number, totalTests: number }> {
    const questionBankProgressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
    const progressSnap = await getDoc(questionBankProgressRef);

    if (!progressSnap.exists()) {
        return { passedTests: 0, totalTests: 0 };
    }

    const progressData = progressSnap.data() as QuestionBankTopicProgress;
    let passedTests = 0;
    let totalTests = 0;

    Object.values(progressData).forEach(topicProgress => {
        ['easy', 'medium', 'hard'].forEach(difficulty => {
            const difficultyProgress = topicProgress[difficulty as keyof typeof topicProgress];
            if (difficultyProgress) {
                const results = Object.values(difficultyProgress);
                totalTests += results.length;
                passedTests += results.filter(r => r.status === 'passed').length;
            }
        });
    });

    return { passedTests, totalTests };
}
