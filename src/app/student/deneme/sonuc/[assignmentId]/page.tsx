
'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getExamResultDetails, submitDenemeScoreAction } from '../../actions';
import type { ExamResultDetails, Question } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Award, Loader2, FileText, Clock, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssignmentDetails } from '@/app/teacher/assignments/[assignmentId]/actions';
import type { StudentProgress } from '@/app/teacher/assignments/[assignmentId]/actions';


const IntroCard = ({ assignment, onStart }: { assignment: any; onStart: () => void }) => {
    // ...
};

// 2. SINAV EKRANI
const ExamScreen = ({ onFinish }: { onFinish: (answers: (number | null)[]) => void }) => {
    // ...
};

// 3. SONUÇ EKRANI
const ResultScreen = ({ results, onRestart }: { results: any, onRestart: () => void }) => {
    const { correct, wrong, empty, score } = results;

    let message = "";
    let color = "";

    if (score >= 90) { message = "Mükemmel!"; color = "text-green-600"; }
    else if (score >= 70) { message = "Tebrikler!"; color = "text-blue-600"; }
    else if (score >= 50) { message = "Güzel, Ama Daha İyi Olabilir."; color = "text-yellow-600"; }
    else { message = "Biraz Daha Çalışmalısın."; color = "text-red-600"; }
    
     const [isWrongAnswersOpen, setIsWrongAnswersOpen] = useState(false);
     const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
     const [leaderboard, setLeaderboard] = useState<StudentProgress[]>([]);
     const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
     
     const handleOpenLeaderboard = () => {
        setIsLoadingLeaderboard(true);
        getAssignmentDetails(results.assignmentId).then(result => {
            if (result.success && result.data) {
                const sorted = result.data.studentProgress.sort((a, b) => (b.scoreEvent?.points || 0) - (a.scoreEvent?.points || 0));
                setLeaderboard(sorted);
            }
        }).finally(() => setIsLoadingLeaderboard(false));
        setIsLeaderboardOpen(true);
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center animate-[scaleUp_0.5s_ease-out]">
          
          <div className="mb-6 relative inline-block">
            <Award size={80} className={`mx-auto ${score >= 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
            {score >= 90 && <div className="absolute -top-2 -right-2 text-4xl animate-bounce">🌟</div>}
          </div>

          <h2 className={`text-3xl font-black mb-2 ${color}`}>{message}</h2>
          <p className="text-gray-500 mb-8">Sınav Sonucunuz</p>

          <div className="mb-8 flex justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-slate-100">
                <div className="text-center">
                    <div className="text-4xl font-black text-slate-800">{score}</div>
                    <div className="text-xs font-bold text-gray-400">PUAN</div>
                </div>
                <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle 
                        cx="50" cy="50" r="46" fill="none" stroke={score >= 50 ? "#4f46e5" : "#ef4444"} strokeWidth="8" 
                        strokeDasharray="289" 
                        strokeDashoffset={289 - (289 * score) / 100} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="text-green-600 font-bold text-xl">{correct}</div>
                <div className="text-xs text-green-800 font-bold uppercase">Doğru</div>
            </div>
             <div className="p-4 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100" onClick={() => setIsWrongAnswersOpen(true)}>
                <div className="text-red-600 font-bold text-xl">{wrong}</div>
                <div className="text-xs text-red-800 font-bold uppercase">Yanlış</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-600 font-bold text-xl">{empty}</div>
                <div className="text-xs text-gray-800 font-bold uppercase">Boş</div>
            </div>
          </div>

          <button 
            onClick={onRestart}
            className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg"
          >
            Ana Ekrana Dön
          </button>
          
        </div>
        <WrongAnswersDialog 
            isOpen={isWrongAnswersOpen} 
            onOpenChange={setIsWrongAnswersOpen} 
            questions={results.questions}
            userAnswers={results.userAnswers}
        />
        <style>{`
            @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    );
  };
  
const WrongAnswersDialog = ({ isOpen, onOpenChange, questions, userAnswers }) => {
    const wrongQuestions = questions.filter((q, idx) => userAnswers[idx] !== null && userAnswers[idx] !== q.answer);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Yanlış Cevapların</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-grow px-6">
                    <div className="space-y-6 py-4">
                        {wrongQuestions.length > 0 ? wrongQuestions.map((q, index) => (
                            <Card key={q.id}>
                                <CardHeader>
                                    <CardTitle className="text-base">{index + 1}. {q.text}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                     <p className="text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> <span className="font-semibold">Senin Cevabın:</span> {q.options[userAnswers[questions.indexOf(q)]]}</p>
                                    <p className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> <span className="font-semibold">Doğru Cevap:</span> {q.options[q.answer]}</p>
                                </CardContent>
                            </Card>
                        )) : <p className="text-center text-muted-foreground">Hiç yanlış cevabın yok, tebrikler!</p>}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};


function ExamApp() {
  const [screen, setScreen] = useState('result'); // Start at result for this component
  const [details, setDetails] = useState<ExamResultDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  useEffect(() => {
    if (!assignmentId || !user) {
        // Redirect or show error if crucial info is missing
        if(!user) router.push('/login');
        else router.push('/student/deneme');
        return;
    }

    const fetchResults = async () => {
        setIsLoading(true);
        const result = await getExamResultDetails(assignmentId, user.uid);
        if (result.success && result.data) {
            setDetails(result.data);
        } else {
            setError(result.error || "Sonuçlar yüklenemedi.");
        }
        setIsLoading(false);
    };

    fetchResults();
  }, [assignmentId, user, router]);

  const calculateResults = () => {
    if (!details) return { correct: 0, wrong: 0, empty: 0, score: 0 };
    
    const { questions, studentAnswers } = details;
    let correct = 0;
    let wrong = 0;
    let empty = 0;

    studentAnswers.forEach((ans, idx) => {
        const question = questions[idx];
        if (ans === null) {
            empty++;
        } else {
            let isCorrect = false;
            if (question.type === 'Doğru/Yanlış') {
                isCorrect = (ans === (question.isTrue ? 'Doğru' : 'Yanlış')) || (ans === question.isTrue);
            } else {
                isCorrect = ans === question.correctAnswer;
            }
            if (isCorrect) correct++;
            else wrong++;
        }
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { 
        correct, 
        wrong, 
        empty, 
        score,
        questions: details.questions,
        userAnswers: details.studentAnswers.map(ans => {
            // Find the index of the answer in the options array
            const q = details.questions.find((q, i) => i === details.studentAnswers.indexOf(ans));
            if (q?.options) {
                return q.options.indexOf(String(ans));
            }
            return ans === 'Doğru' ? 0 : ans === 'Yanlış' ? 1 : null;
        }),
        assignmentId: assignmentId
     };
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  }

  const results = calculateResults();
  
  return (
      <ResultScreen 
          results={results} 
          onRestart={() => router.push('/student/deneme')} 
      />
  );
}

export default function Page() {
    return (
         <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <ExamApp />
        </Suspense>
    )
}
