'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    Play, Plus, ArrowLeft, ArrowRight, Check, X, Sparkles, BookOpen, 
    Clock, Users, Trophy, Trash2, Edit3, HelpCircle, FileText, 
    CheckCircle2, RotateCcw, Maximize, Minimize, Pause, Eye, EyeOff,
    ListChecks, Wand2, Search, Filter, AlertCircle, Copy, 
    ChevronLeft, ChevronRight, CheckSquare, Layers, Loader2,
    FileQuestion, MessageSquareText, ShieldAlert, Sparkle,
    Menu, Volume2, VolumeX, Sun, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import Link from 'next/link';

import { 
    getClassTests, 
    getClassTestById, 
    saveClassTest, 
    deleteClassTest, 
    getBankQuestionsForTest, 
    generateAiQuestionsForTest,
    type ClassTest, 
    type ClassTestQuestion, 
    type ClassTestSummary 
} from './actions';
import { getCurriculumForSelection, type ClassGroup } from '@/components/actions/get-curriculum-for-selection';

export default function SmartboardTopluTestPage() {
    const { toast } = useToast();

    // View state: 'list' | 'editor' | 'presenter'
    const [viewMode, setViewMode] = useState<'list' | 'editor' | 'presenter'>('list');

    // Tests list state
    const [tests, setTests] = useState<ClassTestSummary[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(true);

    // Active test being edited or presented
    const [activeTest, setActiveTest] = useState<ClassTest | null>(null);

    // Curriculum state for question bank dialog
    const [curriculumData, setCurriculumData] = useState<ClassGroup[]>([]);
    const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);

    // --- PRESENTATION STATES ---
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number>(60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isAutoNext, setIsAutoNext] = useState(false);
    const [isTestFinished, setIsTestFinished] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false); // Sınıfça Birlikte Çözüm / Analiz Modu
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [presenterTheme, setPresenterTheme] = useState<'light' | 'dark'>('light');
    const [isMuted, setIsMuted] = useState(false);
    const [scoreCount, setScoreCount] = useState(0);
    const [showNavMenu, setShowNavMenu] = useState(false);
    const [showCurrentAnswer, setShowCurrentAnswer] = useState(false);

    // --- EDITOR MODALS ---
    const [showAiModal, setShowAiModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);

    // AI Generation states
    const [aiSourceType, setAiSourceType] = useState<'text' | 'prompt'>('prompt');
    const [aiSourceText, setAiSourceText] = useState('');
    const [aiCustomPrompt, setAiCustomPrompt] = useState('');
    const [aiTopicName, setAiTopicName] = useState('');
    const [aiClassName, setAiClassName] = useState('5. Sınıf');
    const [aiMcqCount, setAiMcqCount] = useState(10);
    const [aiOpenEndedCount, setAiOpenEndedCount] = useState(3);
    const [aiDifficulty, setAiDifficulty] = useState<'Kolay' | 'Orta' | 'Zor' | 'Karışık'>('Orta');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [generatedAiQuestions, setGeneratedAiQuestions] = useState<ClassTestQuestion[]>([]);
    const [selectedAiQuestionIds, setSelectedAiQuestionIds] = useState<Set<string>>(new Set());

    // Bank Selection states
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
    const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
    const [bankQuestions, setBankQuestions] = useState<ClassTestQuestion[]>([]);
    const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<Set<string>>(new Set());
    const [isLoadingBankQuestions, setIsLoadingBankQuestions] = useState(false);

    // Manual Question state
    const [manualType, setManualType] = useState<'mcq' | 'open_ended'>('mcq');
    const [manualText, setManualText] = useState('');
    const [manualOptions, setManualOptions] = useState<string[]>(['', '', '', '']);
    const [manualCorrectIndex, setManualCorrectIndex] = useState(0);
    const [manualModelAnswer, setManualModelAnswer] = useState('');
    const [manualExplanation, setManualExplanation] = useState('');
    const [manualDifficulty, setManualDifficulty] = useState<'Kolay' | 'Orta' | 'Zor'>('Orta');

    // Load tests on mount
    const loadTests = useCallback(async () => {
        setIsLoadingTests(true);
        const res = await getClassTests();
        if (res.success) {
            setTests(res.tests);
        } else {
            toast({ title: 'Hata', description: res.error || 'Testler yüklenemedi.', variant: 'destructive' });
        }
        setIsLoadingTests(false);
    }, [toast]);

    useEffect(() => {
        loadTests();
    }, [loadTests]);

    // Load curriculum for modal pickers
    const loadCurriculum = useCallback(async () => {
        if (curriculumData.length > 0 || isCurriculumLoading) return;
        setIsCurriculumLoading(true);
        try {
            const res = await getCurriculumForSelection('questions', true);
            if (res.classGroups) {
                setCurriculumData(res.classGroups);
            }
        } catch (e) {
            console.warn("Curriculum fetch warning:", e);
        } finally {
            setIsCurriculumLoading(false);
        }
    }, [curriculumData.length, isCurriculumLoading]);

    // --- FULLSCREEN HANDLERS ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // --- TIMER EFFECT ---
    useEffect(() => {
        let interval: any = null;
        if (viewMode === 'presenter' && isTimerRunning && !isTestFinished && !isReviewMode && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        // Play gentle beep/ding
                        try {
                            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                            audio.volume = 0.4;
                            audio.play().catch(() => {});
                        } catch {}

                        if (isAutoNext && activeTest && currentQuestionIndex < activeTest.questions.length - 1) {
                            setCurrentQuestionIndex(i => i + 1);
                            return activeTest.defaultDurationSeconds || 60;
                        } else {
                            setIsTimerRunning(false);
                            return 0;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [viewMode, isTimerRunning, isTestFinished, isReviewMode, timeLeft, isAutoNext, activeTest, currentQuestionIndex]);

    const playSound = useCallback((type: 'ding' | 'correct' | 'click') => {
        if (isMuted) return;
        try {
            let url = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3";
            if (type === 'ding') url = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
            if (type === 'correct') url = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
            const audio = new Audio(url);
            audio.volume = 0.35;
            audio.play().catch(() => {});
        } catch {}
    }, [isMuted]);

    // Keyboard navigation (Arrow keys, space, F for fullscreen, M for menu)
    useEffect(() => {
        if (viewMode !== 'presenter' || isTestFinished) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault();
                if (activeTest && currentQuestionIndex < activeTest.questions.length - 1) {
                    handleGoToQuestion(currentQuestionIndex + 1);
                } else if (activeTest && currentQuestionIndex === activeTest.questions.length - 1 && !isReviewMode) {
                    handleFinishTest();
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                if (currentQuestionIndex > 0) {
                    handleGoToQuestion(currentQuestionIndex - 1);
                }
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            } else if (e.key === 'm' || e.key === 'M') {
                setShowNavMenu(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, activeTest, currentQuestionIndex, isTestFinished, isReviewMode]);

    // Update timer when changing question
    const handleGoToQuestion = (index: number) => {
        if (!activeTest) return;
        setCurrentQuestionIndex(index);
        setShowCurrentAnswer(false);
        playSound('click');
        if (activeTest.defaultDurationSeconds > 0) {
            setTimeLeft(activeTest.defaultDurationSeconds);
            setIsTimerRunning(true);
        }
    };

    // Start a Test
    const handleStartTest = async (testId: string) => {
        const res = await getClassTestById(testId);
        if (res.success && res.test) {
            setActiveTest(res.test);
            setCurrentQuestionIndex(0);
            setTimeLeft(res.test.defaultDurationSeconds > 0 ? res.test.defaultDurationSeconds : 0);
            setIsTimerRunning(res.test.defaultDurationSeconds > 0);
            setIsTestFinished(false);
            setIsReviewMode(false);
            setShowCurrentAnswer(false);
            setScoreCount(0);
            setViewMode('presenter');
        } else {
            toast({ title: 'Hata', description: 'Test yüklenemedi.', variant: 'destructive' });
        }
    };

    // Finish Test and Show Answer Key
    const handleFinishTest = () => {
        setIsTestFinished(true);
        setIsTimerRunning(false);
        try {
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
    };

    // Start Review Mode (Birlikte Çözüm)
    const handleStartReview = () => {
        setIsReviewMode(true);
        setCurrentQuestionIndex(0);
    };

    // Create New Test
    const handleCreateNewTest = () => {
        const newTest: ClassTest = {
            id: `test-${Date.now()}`,
            title: 'Yeni Sınıf Testi',
            description: '',
            className: '5. Sınıf',
            courseName: 'Din Kültürü ve Ahlak Bilgisi',
            defaultDurationSeconds: 60,
            questions: [],
            createdAt: new Date().toISOString()
        };
        setActiveTest(newTest);
        setViewMode('editor');
    };

    // Edit Existing Test
    const handleEditTest = async (testId: string) => {
        const res = await getClassTestById(testId);
        if (res.success && res.test) {
            setActiveTest(res.test);
            setViewMode('editor');
        } else {
            toast({ title: 'Hata', description: 'Test detayları açılamadı.', variant: 'destructive' });
        }
    };

    // Delete Test
    const handleDeleteTest = async (testId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Bu testi silmek istediğinize emin misiniz?')) return;
        const res = await deleteClassTest(testId);
        if (res.success) {
            toast({ title: 'Silindi', description: 'Test başarıyla silindi.' });
            loadTests();
        } else {
            toast({ title: 'Hata', description: res.error, variant: 'destructive' });
        }
    };

    // Save Active Test
    const handleSaveTest = async () => {
        if (!activeTest) return;
        if (!activeTest.title.trim()) {
            toast({ title: 'Uyarı', description: 'Lütfen test için bir başlık girin.', variant: 'destructive' });
            return;
        }
        if (activeTest.questions.length === 0) {
            toast({ title: 'Uyarı', description: 'Test en az bir soru içermelidir.', variant: 'destructive' });
            return;
        }

        const res = await saveClassTest(activeTest);
        if (res.success) {
            toast({ title: 'Başarılı! 🎉', description: 'Test başarıyla kaydedildi.' });
            loadTests();
            setViewMode('list');
        } else {
            toast({ title: 'Hata', description: res.error || 'Kaydedilemedi.', variant: 'destructive' });
        }
    };

    // --- QUESTION BANK DIALOG LOGIC ---
    const allCourses = useMemo(() => {
        return curriculumData.flatMap(cg => cg.courses);
    }, [curriculumData]);

    const activeCourse = useMemo(() => {
        return allCourses.find(c => c.id === selectedCourseId);
    }, [allCourses, selectedCourseId]);

    const units = useMemo(() => {
        return activeCourse?.units || [];
    }, [activeCourse]);

    const activeUnit = useMemo(() => {
        return units.find(u => u.id === selectedUnitId);
    }, [units, selectedUnitId]);

    const topics = useMemo(() => {
        return activeUnit?.topics || [];
    }, [activeUnit]);

    const handleOpenBankModal = () => {
        loadCurriculum();
        setShowBankModal(true);
        setSelectedBankQuestionIds(new Set());
    };

    const handleFetchBankQuestions = async () => {
        setIsLoadingBankQuestions(true);
        const res = await getBankQuestionsForTest({
            courseId: selectedCourseId,
            unitId: selectedUnitId,
            topicId: selectedTopicId,
            count: 30
        });
        if (res.success) {
            setBankQuestions(res.questions);
        } else {
            toast({ title: 'Soru Bulunamadı', description: res.error || 'Kriterlere uygun soru bulunamadı.', variant: 'destructive' });
        }
        setIsLoadingBankQuestions(false);
    };

    const handleAddSelectedBankQuestions = () => {
        if (!activeTest) return;
        const selected = bankQuestions.filter(q => selectedBankQuestionIds.has(q.id));
        setActiveTest({
            ...activeTest,
            questions: [...activeTest.questions, ...selected]
        });
        setShowBankModal(false);
        toast({ title: 'Eklendi', description: `${selected.length} soru teste eklendi.` });
    };

    // --- AI GENERATION DIALOG LOGIC ---
    const handleGenerateAi = async () => {
        if (aiSourceType === 'text' && !aiSourceText.trim()) {
            toast({ title: 'Uyarı', description: 'Lütfen kaynak metni girin.', variant: 'destructive' });
            return;
        }
        if (aiSourceType === 'prompt' && !aiCustomPrompt.trim() && !aiTopicName.trim()) {
            toast({ title: 'Uyarı', description: 'Lütfen bir konu veya talimat girin.', variant: 'destructive' });
            return;
        }

        setIsGeneratingAi(true);
        setGeneratedAiQuestions([]);
        const res = await generateAiQuestionsForTest({
            sourceText: aiSourceType === 'text' ? aiSourceText : undefined,
            customPrompt: aiSourceType === 'prompt' ? aiCustomPrompt : undefined,
            topicName: aiTopicName || undefined,
            className: aiClassName,
            mcqCount: aiMcqCount,
            openEndedCount: aiOpenEndedCount,
            difficulty: aiDifficulty
        });

        if (res.success && res.questions.length > 0) {
            setGeneratedAiQuestions(res.questions);
            setSelectedAiQuestionIds(new Set(res.questions.map(q => q.id)));
        } else {
            toast({ title: 'Üretim Başarısız', description: res.error || 'Yapay zeka soruları üretemedi.', variant: 'destructive' });
        }
        setIsGeneratingAi(false);
    };

    const handleAddSelectedAiQuestions = () => {
        if (!activeTest) return;
        const selected = generatedAiQuestions.filter(q => selectedAiQuestionIds.has(q.id));
        setActiveTest({
            ...activeTest,
            questions: [...activeTest.questions, ...selected]
        });
        setShowAiModal(false);
        toast({ title: 'Eklendi', description: `${selected.length} yapay zeka sorusu teste eklendi.` });
    };

    // --- MANUAL QUESTION LOGIC ---
    const handleAddManualQuestion = () => {
        if (!activeTest) return;
        if (!manualText.trim()) {
            toast({ title: 'Uyarı', description: 'Lütfen soru metnini yazın.', variant: 'destructive' });
            return;
        }

        let newQ: ClassTestQuestion;
        if (manualType === 'mcq') {
            const validOptions = manualOptions.map(o => o.trim());
            if (validOptions.some(o => !o)) {
                toast({ title: 'Uyarı', description: 'Lütfen tüm 4 seçeneği doldurun.', variant: 'destructive' });
                return;
            }
            newQ = {
                id: `manual-mcq-${Date.now()}`,
                type: 'mcq',
                text: manualText.trim(),
                options: validOptions,
                correctAnswer: validOptions[manualCorrectIndex],
                explanation: manualExplanation.trim(),
                difficulty: manualDifficulty,
                source: 'manual'
            };
        } else {
            if (!manualModelAnswer.trim()) {
                toast({ title: 'Uyarı', description: 'Lütfen öğretmen için bir Model Cevap / Puanlama Kriteri yazın.', variant: 'destructive' });
                return;
            }
            newQ = {
                id: `manual-open-${Date.now()}`,
                type: 'open_ended',
                text: manualText.trim(),
                correctAnswer: manualModelAnswer.trim(),
                explanation: manualExplanation.trim(),
                difficulty: manualDifficulty,
                source: 'manual'
            };
        }

        setActiveTest({
            ...activeTest,
            questions: [...activeTest.questions, newQ]
        });
        setShowManualModal(false);
        // Reset manual form
        setManualText('');
        setManualOptions(['', '', '', '']);
        setManualCorrectIndex(0);
        setManualModelAnswer('');
        setManualExplanation('');
        toast({ title: 'Soru Eklendi', description: 'Sorunuz başarıyla teste eklendi.' });
    };

    // Remove Question from Active Test
    const handleRemoveQuestion = (index: number) => {
        if (!activeTest) return;
        const updated = [...activeTest.questions];
        updated.splice(index, 1);
        setActiveTest({ ...activeTest, questions: updated });
    };

    // Reorder Question
    const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
        if (!activeTest) return;
        const updated = [...activeTest.questions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= updated.length) return;
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setActiveTest({ ...activeTest, questions: updated });
    };

    // Helper for MCQ correct option letter
    const getOptionLetter = (options?: string[], correctAnswer?: string): string => {
        if (!options || !correctAnswer) return '-';
        const idx = options.findIndex(o => o.trim() === correctAnswer.trim());
        return idx !== -1 ? ['A', 'B', 'C', 'D', 'E'][idx] : 'A';
    };

    // Option style presets matching the user's Wordwall smartboard screenshot
    const OPTION_STYLES = [
        {
            bg: 'bg-[#008de4]',
            hoverBg: 'hover:bg-[#007cc9]',
            shadow: 'shadow-[0_8px_0_#0069ab]',
            name: 'blue'
        },
        {
            bg: 'bg-[#d92231]',
            hoverBg: 'hover:bg-[#c41b29]',
            shadow: 'shadow-[0_8px_0_#9e121e]',
            name: 'red'
        },
        {
            bg: 'bg-[#ff7b00]',
            hoverBg: 'hover:bg-[#e66f00]',
            shadow: 'shadow-[0_8px_0_#c75e00]',
            name: 'orange'
        },
        {
            bg: 'bg-[#1ca34d]',
            hoverBg: 'hover:bg-[#189144]',
            shadow: 'shadow-[0_8px_0_#126e33]',
            name: 'green'
        },
        {
            bg: 'bg-[#8b5cf6]',
            hoverBg: 'hover:bg-[#7c3aed]',
            shadow: 'shadow-[0_8px_0_#6d28d9]',
            name: 'purple'
        }
    ];

    const handleOptionClick = (opt: string, isCorrect: boolean) => {
        if (isReviewMode || showCurrentAnswer) {
            if (isCorrect) {
                playSound('correct');
                try {
                    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                } catch {}
            }
        } else {
            // Smartboard interaction: reveal answer on click
            setShowCurrentAnswer(true);
            if (isCorrect) {
                setScoreCount(c => c + 1);
                playSound('correct');
                try {
                    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
                } catch {}
            }
        }
    };

    // =========================================================================
    // RENDER: PRESENTER (Akıllı Tahta / Kağıt-Kalem Sınav Modu)
    // =========================================================================
    if (viewMode === 'presenter' && activeTest) {
        const currentQ = activeTest.questions[currentQuestionIndex];
        const totalQuestions = activeTest.questions.length;

        return (
            <div className={cn(
                "fixed inset-0 z-50 flex flex-col justify-between select-none overflow-hidden font-sans transition-colors duration-200",
                presenterTheme === 'light' ? "bg-white text-slate-900" : "bg-[#0b101b] text-white"
            )}>
                {/* ─── ÜST BAR: SAYAÇ & SKOR (KULLANICININ WORDWALL EKRANI) ─── */}
                <header className="px-6 py-4 flex items-center justify-between z-10 shrink-0 select-none">
                    {/* Sol Sayaç: 0:26 */}
                    <div 
                        onClick={() => setIsTimerRunning(r => !r)}
                        className="flex items-center gap-2 cursor-pointer group"
                        title={isTimerRunning ? "Sayacı Duraklat" : "Sayacı Başlat"}
                    >
                        <span className={cn(
                            "text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight transition-colors",
                            presenterTheme === 'light' ? "text-slate-900 group-hover:text-indigo-600" : "text-white group-hover:text-indigo-400",
                            timeLeft <= 10 && activeTest.defaultDurationSeconds > 0 && "text-rose-600 animate-pulse"
                        )}>
                            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                        </span>
                        {!isTimerRunning && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-amber-400 text-amber-600 font-bold hidden sm:inline-flex">
                                Duraklatıldı
                            </Badge>
                        )}
                    </div>

                    {/* Sağ Skor: ✔ 0 */}
                    <div 
                        onClick={() => {
                            setScoreCount(c => c + 1);
                            playSound('correct');
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setScoreCount(c => Math.max(0, c - 1));
                        }}
                        className={cn(
                            "flex items-center gap-1.5 text-3xl sm:text-4xl md:text-5xl font-black cursor-pointer select-none group transition-transform active:scale-95",
                            presenterTheme === 'light' ? "text-slate-900" : "text-white"
                        )}
                        title="Doğru Sayacı (Artırmak için tıkla, azaltmak için sağ tıkla)"
                    >
                        <span className="text-emerald-600 font-black group-hover:scale-110 transition-transform">✔</span>
                        <span>{scoreCount}</span>
                    </div>
                </header>

                {/* ─── ANA ALAN: DEV SORU & 4 RENKLİ 3D ŞIKLAR ─── */}
                <main className="flex-1 flex flex-col justify-between items-center px-4 sm:px-8 py-2 max-w-7xl mx-auto w-full overflow-hidden">
                    {/* TOPLU CEVAP ANAHTARI GÖRÜNÜMÜ */}
                    {isTestFinished && !isReviewMode ? (
                        <div className="w-full max-w-5xl my-auto animate-in zoom-in-95 duration-300">
                            <Card className={cn(
                                "border-2 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl",
                                presenterTheme === 'light' 
                                    ? "bg-white/95 border-slate-200 shadow-slate-300/50 text-slate-900" 
                                    : "bg-slate-900/95 border-emerald-500/40 text-white"
                            )}>
                                <CardHeader className="text-center pb-6 border-b border-slate-200 dark:border-white/10">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 mb-3 shadow-inner">
                                        <Trophy className="w-8 h-8 animate-bounce" />
                                    </div>
                                    <CardTitle className="text-3xl md:text-4xl font-black">
                                        Sınav Tamamlandı! 🎉
                                    </CardTitle>
                                    <CardDescription className={cn(
                                        "text-base md:text-lg font-medium mt-1",
                                        presenterTheme === 'light' ? "text-slate-600" : "text-slate-300"
                                    )}>
                                        Aşağıdaki <span className="text-emerald-600 font-black">Toplu Cevap Anahtarı</span> ile öğrencilerin kağıtlarını kontrol etmesini sağlayın.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-6 md:p-8 max-h-[50vh] overflow-y-auto">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                                        {activeTest.questions.map((q, idx) => {
                                            const isMcq = q.type === 'mcq';
                                            const letter = isMcq ? getOptionLetter(q.options, q.correctAnswer) : 'AÇIK UÇLU';
                                            return (
                                                <div 
                                                    key={q.id}
                                                    onClick={() => {
                                                        setIsReviewMode(true);
                                                        setCurrentQuestionIndex(idx);
                                                    }}
                                                    className={cn(
                                                        "group cursor-pointer rounded-2xl p-4 flex flex-col items-center justify-center transition-all hover:scale-105 shadow-md border-2",
                                                        presenterTheme === 'light'
                                                            ? "bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-emerald-500 text-slate-800"
                                                            : "bg-slate-800/80 hover:bg-slate-800 border-white/10 hover:border-emerald-400 text-white"
                                                    )}
                                                >
                                                    <span className="text-xs font-bold opacity-60 mb-1">
                                                        {idx + 1}. Soru
                                                    </span>
                                                    {isMcq ? (
                                                        <span className="text-3xl md:text-4xl font-black text-emerald-600 group-hover:scale-110 transition-transform">
                                                            {letter}
                                                        </span>
                                                    ) : (
                                                        <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider mt-1">
                                                            Açık Uçlu
                                                        </Badge>
                                                    )}
                                                    <span className="text-[11px] opacity-70 mt-2 line-clamp-1 text-center font-semibold">
                                                        {isMcq ? q.correctAnswer : 'Model Cevap'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>

                                <CardFooter className={cn(
                                    "p-6 border-t flex flex-wrap gap-4 justify-between items-center",
                                    presenterTheme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-white/10"
                                )}>
                                    <div className="text-sm font-semibold opacity-70">
                                        Toplam <span className="font-black opacity-100">{activeTest.questions.length}</span> Soru • 
                                        <span className="text-blue-600 font-bold ml-1">
                                            {activeTest.questions.filter(q => q.type === 'mcq').length} Çoktan Seçmeli
                                        </span> • 
                                        <span className="text-amber-600 font-bold ml-1">
                                            {activeTest.questions.filter(q => q.type === 'open_ended').length} Açık Uçlu
                                        </span>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button 
                                            variant="outline"
                                            onClick={() => {
                                                setIsTestFinished(false);
                                                setIsReviewMode(false);
                                                setCurrentQuestionIndex(0);
                                                setScoreCount(0);
                                                setTimeLeft(activeTest.defaultDurationSeconds || 60);
                                                setIsTimerRunning(activeTest.defaultDurationSeconds > 0);
                                            }}
                                            className="rounded-xl font-bold"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" /> Yeniden Başlat
                                        </Button>
                                        <Button 
                                            onClick={handleStartReview}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-indigo-500/25 text-base"
                                        >
                                            <Sparkles className="w-5 h-5 mr-2" /> Soruları Birlikte Çöz & Analiz Et
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    ) : (
                        /* TEK SORU ODAK EKRANI (USER'S WORDWALL SCREENSHOT DESIGN) */
                        <div className="w-full flex-1 flex flex-col justify-between items-center max-w-6xl mx-auto py-2">
                            {/* DEV SORU METNİ - EKRANIN ODAK NOKTASI */}
                            <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-4 text-center my-auto min-h-[160px] sm:min-h-[200px]">
                                <h2 className={cn(
                                    "font-black tracking-tight leading-snug select-text",
                                    presenterTheme === 'light' ? "text-slate-900" : "text-white",
                                    currentQ.text.length > 140 
                                        ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl" 
                                        : currentQ.text.length > 80 
                                            ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl" 
                                            : "text-3xl sm:text-5xl md:text-6xl lg:text-7xl"
                                )}>
                                    {currentQ.text}
                                </h2>

                                {/* Çözüm Açıklaması veya İpucu (Review modunda veya cevap açıldığında) */}
                                {(isReviewMode || showCurrentAnswer) && currentQ.explanation && (
                                    <div className={cn(
                                        "mt-4 px-6 py-2.5 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2",
                                        presenterTheme === 'light' 
                                            ? "bg-amber-50 border-amber-300 text-amber-900 shadow-sm" 
                                            : "bg-amber-950/50 border-amber-500/40 text-amber-200"
                                    )}>
                                        <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                                        <span className="font-bold text-sm sm:text-base text-left">
                                            {currentQ.explanation}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* SEÇENEKLER (4 RENKLİ 3D BUTON) VEYA AÇIK UÇLU GÖSTERGESİ */}
                            {currentQ.type === 'mcq' ? (
                                <div className={cn(
                                    "w-full max-w-6xl mx-auto grid gap-4 sm:gap-6 pb-2",
                                    (currentQ.options || []).length === 4 
                                        ? "grid-cols-2 md:grid-cols-4" 
                                        : (currentQ.options || []).length === 3 
                                            ? "grid-cols-1 sm:grid-cols-3" 
                                            : (currentQ.options || []).length === 5 
                                                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5" 
                                                : "grid-cols-2"
                                )}>
                                    {(currentQ.options || []).map((opt, oIdx) => {
                                        const theme = OPTION_STYLES[oIdx % OPTION_STYLES.length];
                                        const isCorrectOption = opt.trim() === currentQ.correctAnswer.trim();
                                        const isRevealed = isReviewMode || showCurrentAnswer;

                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => handleOptionClick(opt, isCorrectOption)}
                                                className={cn(
                                                    "relative flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl md:rounded-3xl cursor-pointer select-none transition-all duration-150 transform",
                                                    theme.bg,
                                                    theme.hoverBg,
                                                    theme.shadow,
                                                    "min-h-[140px] sm:min-h-[170px] md:min-h-[200px] lg:min-h-[220px]",
                                                    "hover:brightness-105 active:translate-y-1",
                                                    isRevealed && isCorrectOption && "ring-8 ring-emerald-400 ring-offset-4 ring-offset-white scale-105 z-10 animate-pulse",
                                                    isRevealed && !isCorrectOption && "opacity-35 grayscale-[35%] scale-[0.98]"
                                                )}
                                            >
                                                {/* Doğru Cevap Rozeti */}
                                                {isRevealed && isCorrectOption && (
                                                    <div className="absolute -top-3 -right-3 bg-white text-emerald-600 rounded-full p-2 shadow-2xl border-2 border-emerald-500 animate-bounce">
                                                        <Check className="w-6 h-6 stroke-[4]" />
                                                    </div>
                                                )}

                                                <span className={cn(
                                                    "font-black text-white leading-snug break-words hyphens-auto w-full",
                                                    opt.length > 30 
                                                        ? "text-lg sm:text-xl md:text-2xl" 
                                                        : opt.length > 15 
                                                            ? "text-xl sm:text-2xl md:text-3xl" 
                                                            : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                                                )}>
                                                    {opt}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* AÇIK UÇLU GÖSTERİMİ */
                                <div className="w-full max-w-4xl mx-auto pb-4">
                                    {!(isReviewMode || showCurrentAnswer) ? (
                                        <div className={cn(
                                            "p-8 md:p-12 rounded-3xl border-3 border-dashed flex flex-col items-center justify-center text-center gap-4 transition-all",
                                            presenterTheme === 'light' 
                                                ? "bg-slate-50 border-slate-300 text-slate-800" 
                                                : "bg-slate-900/60 border-slate-700 text-slate-200"
                                        )}>
                                            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                                                <MessageSquareText className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl md:text-3xl font-black text-amber-600">
                                                Açık Uçlu Soru
                                            </h3>
                                            <p className={cn(
                                                "max-w-xl text-lg md:text-xl font-bold leading-relaxed",
                                                presenterTheme === 'light' ? "text-slate-700" : "text-slate-300"
                                            )}>
                                                ✏️ Bu sorunun cevabını kağıdınıza veya defterinize kendi cümlelerinizle yazınız.
                                            </p>
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowCurrentAnswer(true)}
                                                className="mt-2 rounded-xl font-bold border-2 border-amber-500/40 text-amber-700 hover:bg-amber-50"
                                            >
                                                <Eye className="w-5 h-5 mr-2" /> Model Cevabı Tahtada Aç
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            "p-8 md:p-10 rounded-3xl border-3 shadow-xl animate-in fade-in duration-200",
                                            presenterTheme === 'light' 
                                                ? "bg-emerald-50 border-emerald-400 text-slate-900" 
                                                : "bg-emerald-950/60 border-emerald-500/50 text-white"
                                        )}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3 text-emerald-600">
                                                    <CheckCircle2 className="w-8 h-8" />
                                                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider">
                                                        Model Cevap & Değerlendirme Kriteri
                                                    </h3>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowCurrentAnswer(false)}
                                                    className="text-slate-500 hover:text-slate-800"
                                                >
                                                    <EyeOff className="w-4 h-4 mr-1" /> Gizle
                                                </Button>
                                            </div>
                                            <div className={cn(
                                                "text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-line p-6 rounded-2xl border-2",
                                                presenterTheme === 'light' 
                                                    ? "bg-white border-emerald-200 text-slate-900 shadow-sm" 
                                                    : "bg-slate-950/80 border-emerald-500/30 text-slate-100"
                                            )}>
                                                {currentQ.correctAnswer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </main>

                {/* ─── ALT KONTROL & GEZİNTİ BARI (KULLANICININ WORDWALL EKRANI) ─── */}
                <footer className={cn(
                    "px-6 py-4 flex items-center justify-between z-10 shrink-0 select-none border-t",
                    presenterTheme === 'light' ? "border-slate-200 bg-white" : "border-slate-800 bg-[#0b101b]"
                )}>
                    {/* Sol Menü Butonu [ ☰ ] */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowNavMenu(true)}
                            className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 flex items-center justify-center transition-all shadow-sm active:scale-95",
                                presenterTheme === 'light'
                                    ? "bg-white border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-50"
                                    : "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                            )}
                            title="Sınav Menüsü ve Seçenekler (M tuşu)"
                        >
                            <Menu className="w-7 h-7 md:w-8 md:h-8 stroke-[2.5]" />
                        </button>

                        {isReviewMode && (
                            <Badge className="bg-emerald-500/20 text-emerald-700 border border-emerald-500/40 font-bold text-xs hidden sm:inline-flex">
                                🔍 Birlikte Çözüm Modu
                            </Badge>
                        )}
                    </div>

                    {/* Orta Gezinti: ◀ 1 / 10 ▶ */}
                    <div className="flex items-center gap-4 sm:gap-8">
                        <button
                            onClick={() => handleGoToQuestion(Math.max(0, currentQuestionIndex - 1))}
                            disabled={currentQuestionIndex === 0}
                            className={cn(
                                "p-2 rounded-xl transition-all active:scale-90",
                                presenterTheme === 'light' ? "text-slate-700 hover:text-black" : "text-slate-300 hover:text-white",
                                currentQuestionIndex === 0 ? "opacity-20 cursor-not-allowed" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                            title="Önceki Soru (Sol Ok)"
                        >
                            <span className="text-3xl sm:text-4xl md:text-5xl font-black leading-none select-none">◁</span>
                        </button>

                        <div className={cn(
                            "text-2xl sm:text-3xl md:text-4xl font-black tracking-wider select-none",
                            presenterTheme === 'light' ? "text-slate-800" : "text-white"
                        )}>
                            {currentQuestionIndex + 1} / {totalQuestions}
                        </div>

                        <button
                            onClick={() => {
                                if (currentQuestionIndex < totalQuestions - 1) {
                                    handleGoToQuestion(currentQuestionIndex + 1);
                                } else {
                                    handleFinishTest();
                                }
                            }}
                            className={cn(
                                "p-2 rounded-xl transition-all active:scale-90",
                                presenterTheme === 'light' ? "text-slate-700 hover:text-black" : "text-slate-300 hover:text-white",
                                "hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                            title={currentQuestionIndex < totalQuestions - 1 ? "Sonraki Soru (Sağ Ok)" : "Testi Bitir"}
                        >
                            <span className="text-3xl sm:text-4xl md:text-5xl font-black leading-none select-none">▷</span>
                        </button>
                    </div>

                    {/* Sağ Butonlar: Ses & Tam Ekran */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-2.5 rounded-xl transition-all active:scale-95",
                                presenterTheme === 'light' 
                                    ? "text-slate-700 hover:text-black hover:bg-slate-100" 
                                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                            )}
                            title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                        >
                            {isMuted ? <VolumeX className="w-7 h-7 md:w-8 md:h-8" /> : <Volume2 className="w-7 h-7 md:w-8 md:h-8" />}
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className={cn(
                                "p-2.5 rounded-xl transition-all active:scale-95",
                                presenterTheme === 'light' 
                                    ? "text-slate-700 hover:text-black hover:bg-slate-100" 
                                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                            )}
                            title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap (F tuşu)"}
                        >
                            {isFullscreen ? <Minimize className="w-7 h-7 md:w-8 md:h-8" /> : <Maximize className="w-7 h-7 md:w-8 md:h-8" />}
                        </button>
                    </div>
                </footer>

                {/* SINAV MENÜSÜ DİYALOĞU */}
                <Dialog open={showNavMenu} onOpenChange={setShowNavMenu}>
                    <DialogContent className={cn(
                        "max-w-xl border-2 rounded-3xl p-6 shadow-2xl",
                        presenterTheme === 'light' ? "bg-white text-slate-900 border-slate-200" : "bg-slate-900 text-white border-slate-800"
                    )}>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black flex items-center gap-2">
                                <Menu className="w-6 h-6 text-indigo-600" /> Sınav Menüsü & Kontroller
                            </DialogTitle>
                            <DialogDescription className="font-medium opacity-80">
                                {activeTest.title} ({activeTest.className} - {activeTest.courseName})
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    handleFinishTest();
                                    setShowNavMenu(false);
                                }}
                                className="h-14 font-bold border-2 border-emerald-500/40 hover:bg-emerald-50 text-emerald-700 dark:hover:bg-emerald-950/50 rounded-2xl flex items-center gap-3 justify-start px-4 text-base"
                            >
                                <ListChecks className="w-6 h-6 text-emerald-600 shrink-0" />
                                <div className="text-left">
                                    <div className="font-black">Toplu Cevap Anahtarı</div>
                                    <div className="text-xs opacity-80 font-normal">Sınavı bitir ve anahtarı aç</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsReviewMode(!isReviewMode);
                                    setShowNavMenu(false);
                                }}
                                className={cn(
                                    "h-14 font-bold border-2 rounded-2xl flex items-center gap-3 justify-start px-4 text-base",
                                    isReviewMode 
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50" 
                                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                )}
                            >
                                <Sparkles className="w-6 h-6 text-indigo-600 shrink-0" />
                                <div className="text-left">
                                    <div className="font-black">{isReviewMode ? "Birlikte Çözümü Kapat" : "Birlikte Çözüm Modu"}</div>
                                    <div className="text-xs opacity-70 font-normal">Doğru cevapları analiz et</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCurrentAnswer(!showCurrentAnswer);
                                    setShowNavMenu(false);
                                }}
                                className="h-14 font-bold border-2 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 rounded-2xl flex items-center gap-3 justify-start px-4 text-base"
                            >
                                {showCurrentAnswer ? <EyeOff className="w-6 h-6 text-amber-600 shrink-0" /> : <Eye className="w-6 h-6 text-amber-600 shrink-0" />}
                                <div className="text-left">
                                    <div className="font-black">{showCurrentAnswer ? "Bu Sorunun Cevabını Gizle" : "Bu Sorunun Cevabını Göster"}</div>
                                    <div className="text-xs opacity-70 font-normal">Tek tıkla cevabı tahtada aç</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setTimeLeft(activeTest.defaultDurationSeconds || 60);
                                    setIsTimerRunning(true);
                                    setShowNavMenu(false);
                                }}
                                className="h-14 font-bold border-2 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 rounded-2xl flex items-center gap-3 justify-start px-4 text-base"
                            >
                                <RotateCcw className="w-6 h-6 text-blue-600 shrink-0" />
                                <div className="text-left">
                                    <div className="font-black">Sayacı Sıfırla</div>
                                    <div className="text-xs opacity-70 font-normal">Bu soru için süreyi baştan başlat</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setPresenterTheme(presenterTheme === 'light' ? 'dark' : 'light');
                                }}
                                className="h-14 font-bold border-2 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 rounded-2xl flex items-center gap-3 justify-start px-4 text-base"
                            >
                                {presenterTheme === 'light' ? <Moon className="w-6 h-6 text-purple-600 shrink-0" /> : <Sun className="w-6 h-6 text-amber-500 shrink-0" />}
                                <div className="text-left">
                                    <div className="font-black">{presenterTheme === 'light' ? "Koyu Gece Teması" : "Beyaz Tahta Teması"}</div>
                                    <div className="text-xs opacity-70 font-normal">Görünümü değiştir</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (confirm('Sınav modundan çıkmak istiyor musunuz?')) {
                                        setShowNavMenu(false);
                                        setViewMode('list');
                                    }
                                }}
                                className="h-14 font-bold border-2 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center gap-3 justify-start px-4 text-base"
                            >
                                <ArrowLeft className="w-6 h-6 text-rose-600 shrink-0" />
                                <div className="text-left">
                                    <div className="font-black">Sınavdan Çık</div>
                                    <div className="text-xs text-rose-500 font-normal">Test listesine geri dön</div>
                                </div>
                            </Button>
                        </div>

                        {/* Hızlı Soru Listesi */}
                        <div className="mt-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                            <h4 className="font-black text-sm uppercase tracking-wider mb-2 opacity-80">Sorulara Git</h4>
                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                {activeTest.questions.map((q, qIdx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            handleGoToQuestion(qIdx);
                                            setShowNavMenu(false);
                                        }}
                                        className={cn(
                                            "w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center transition-all border-2",
                                            qIdx === currentQuestionIndex
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-105"
                                                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        )}
                                    >
                                        {qIdx + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // =========================================================================
    // RENDER: TEST STÜDYOSU (Oluşturucu & Düzenleyici)
    // =========================================================================
    if (viewMode === 'editor' && activeTest) {
        return (
            <div className="min-h-screen bg-[#0b1120] text-slate-100 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Üst Başlık & Butonlar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                    if (confirm('Değişiklikleri kaydetmeden çıkmak istiyor musunuz?')) {
                                        setViewMode('list');
                                    }
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5 mr-1" /> Listeye Dön
                            </Button>
                            <h1 className="text-2xl md:text-3xl font-black text-white">
                                Sınıf Testi Stüdyosu
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={handleSaveTest}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl px-6 h-12 shadow-lg shadow-emerald-950/40 text-base"
                            >
                                <Check className="w-5 h-5 mr-2" /> Testi Kaydet
                            </Button>
                        </div>
                    </div>

                    {/* Test Genel Bilgileri */}
                    <Card className="bg-slate-900/60 border-slate-800 rounded-2xl mb-8">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-indigo-300">Test Genel Bilgileri</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-slate-300 font-bold mb-1.5 block">Test Başlığı</Label>
                                <Input 
                                    value={activeTest.title}
                                    onChange={(e) => setActiveTest({ ...activeTest, title: e.target.value })}
                                    placeholder="Örn: 5. Sınıf 1. Ünite Değerlendirme Testi"
                                    className="bg-slate-950 border-slate-800 text-white font-bold text-lg h-12 rounded-xl"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-slate-300 font-bold mb-1.5 block">Sınıf Seviyesi</Label>
                                    <Select 
                                        value={activeTest.className || '5. Sınıf'}
                                        onValueChange={(val) => setActiveTest({ ...activeTest, className: val })}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-11 rounded-xl text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="5. Sınıf">5. Sınıf</SelectItem>
                                            <SelectItem value="6. Sınıf">6. Sınıf</SelectItem>
                                            <SelectItem value="7. Sınıf">7. Sınıf</SelectItem>
                                            <SelectItem value="8. Sınıf">8. Sınıf (LGS)</SelectItem>
                                            <SelectItem value="9. Sınıf">9. Sınıf</SelectItem>
                                            <SelectItem value="10. Sınıf">10. Sınıf</SelectItem>
                                            <SelectItem value="11. Sınıf">11. Sınıf</SelectItem>
                                            <SelectItem value="12. Sınıf">12. Sınıf</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-slate-300 font-bold mb-1.5 block">Ders Adı</Label>
                                    <Input 
                                        value={activeTest.courseName || 'Din Kültürü ve Ahlak Bilgisi'}
                                        onChange={(e) => setActiveTest({ ...activeTest, courseName: e.target.value })}
                                        className="bg-slate-950 border-slate-800 h-11 rounded-xl text-white"
                                    />
                                </div>

                                <div>
                                    <Label className="text-slate-300 font-bold mb-1.5 block">Soru Başına Süre</Label>
                                    <Select 
                                        value={String(activeTest.defaultDurationSeconds)}
                                        onValueChange={(val) => setActiveTest({ ...activeTest, defaultDurationSeconds: parseInt(val) })}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-11 rounded-xl text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="0">Süre Yok (Manuel Geçiş)</SelectItem>
                                            <SelectItem value="30">30 Saniye</SelectItem>
                                            <SelectItem value="45">45 Saniye</SelectItem>
                                            <SelectItem value="60">60 Saniye (Standart)</SelectItem>
                                            <SelectItem value="90">90 Saniye</SelectItem>
                                            <SelectItem value="120">120 Saniye (2 Dakika)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-slate-300 font-bold mb-1.5 block">Açıklama / Notlar (İsteğe Bağlı)</Label>
                                <Input 
                                    value={activeTest.description || ''}
                                    onChange={(e) => setActiveTest({ ...activeTest, description: e.target.value })}
                                    placeholder="Öğrenciler kağıda sadece şıkları yazacaktır vb."
                                    className="bg-slate-950 border-slate-800 rounded-xl text-white text-sm"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Soru Ekleme Butonları */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-white">Test Soruları</h2>
                            <Badge className="bg-indigo-600 text-white font-bold ml-2">
                                {activeTest.questions.length} Soru
                            </Badge>
                            <span className="text-xs text-slate-400 ml-1">
                                ({activeTest.questions.filter(q => q.type === 'mcq').length} Çoktan Seçmeli, {activeTest.questions.filter(q => q.type === 'open_ended').length} Açık Uçlu)
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button 
                                onClick={handleOpenBankModal}
                                variant="outline"
                                className="bg-blue-950/40 border-blue-500/40 text-blue-300 hover:bg-blue-900/60 rounded-xl font-bold h-11"
                            >
                                <Search className="w-4 h-4 mr-2 text-blue-400" /> Soru Bankasından Seç
                            </Button>

                            <Button 
                                onClick={() => {
                                    setShowAiModal(true);
                                    setGeneratedAiQuestions([]);
                                }}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl h-11 shadow-md shadow-indigo-900/30"
                            >
                                <Sparkles className="w-4 h-4 mr-2" /> AI ile Soru Üret
                            </Button>

                            <Button 
                                onClick={() => setShowManualModal(true)}
                                variant="outline"
                                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 rounded-xl font-bold h-11"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Manuel Soru Ekle
                            </Button>
                        </div>
                    </div>

                    {/* Soru Listesi */}
                    {activeTest.questions.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 flex flex-col items-center justify-center">
                            <FileQuestion className="w-12 h-12 text-slate-600 mb-3" />
                            <h3 className="text-lg font-bold text-slate-400">Henüz Soru Eklenmedi</h3>
                            <p className="text-sm text-slate-500 max-w-sm mt-1">
                                Yukarıdaki butonları kullanarak Soru Bankasından ekleyebilir, Yapay Zeka ile üretebilir veya elle yazabilirsiniz.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeTest.questions.map((q, idx) => (
                                <Card key={q.id} className="bg-slate-900/70 border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
                                    <div className="p-5 flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-black text-sm shrink-0">
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <Badge className={cn(
                                                    "text-[10px] font-bold uppercase",
                                                    q.type === 'mcq' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                                )}>
                                                    {q.type === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'}
                                                </Badge>
                                                {q.source && (
                                                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-800">
                                                        {q.source === 'ai' ? '🤖 AI Üretimi' : q.source === 'bank' ? '📚 Soru Bankası' : '✍️ Manuel'}
                                                    </Badge>
                                                )}
                                                {q.difficulty && (
                                                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800">
                                                        {q.difficulty}
                                                    </Badge>
                                                )}
                                            </div>

                                            <p className="text-white font-bold text-base leading-snug mb-3">
                                                {q.text}
                                            </p>

                                            {/* Çoktan Seçmeli Şıkları */}
                                            {q.type === 'mcq' && q.options && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                    {q.options.map((opt, oIdx) => {
                                                        const letter = ['A', 'B', 'C', 'D', 'E'][oIdx];
                                                        const isCorrect = opt.trim() === q.correctAnswer.trim();
                                                        return (
                                                            <div 
                                                                key={oIdx} 
                                                                className={cn(
                                                                    "text-xs px-3 py-2 rounded-lg border flex items-center gap-2 font-medium",
                                                                    isCorrect ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-bold" : "bg-slate-950/40 border-slate-800/80 text-slate-300"
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    "w-5 h-5 rounded flex items-center justify-center font-black text-[10px]",
                                                                    isCorrect ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-400"
                                                                )}>
                                                                    {letter}
                                                                </span>
                                                                <span className="truncate">{opt}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Açık Uçlu Model Cevap */}
                                            {q.type === 'open_ended' && (
                                                <div className="mt-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs font-medium">
                                                    <span className="font-bold block text-emerald-400 mb-0.5">Model Cevap / Puanlama Kriteri:</span>
                                                    <p className="line-clamp-2">{q.correctAnswer}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Aksiyon Butonları */}
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleMoveQuestion(idx, 'up')}
                                                disabled={idx === 0}
                                                className="h-8 w-8 text-slate-400 hover:text-white"
                                            >
                                                ▲
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleMoveQuestion(idx, 'down')}
                                                disabled={idx === activeTest.questions.length - 1}
                                                className="h-8 w-8 text-slate-400 hover:text-white"
                                            >
                                                ▼
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveQuestion(idx)}
                                                className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── MODAL 1: AI İLE SORU ÜRET ─── */}
                <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
                    <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-black text-indigo-300">
                                <Sparkles className="w-5 h-5 text-indigo-400" /> Yapay Zeka ile Soru Üret
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Kaynak metin yapıştırarak veya istediğiniz konuda yönerge vererek sınav soruları ürettirin.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
                            <Tabs value={aiSourceType} onValueChange={(v: any) => setAiSourceType(v)}>
                                <TabsList className="grid grid-cols-2 bg-slate-950 border border-slate-800 rounded-xl p-1">
                                    <TabsTrigger value="prompt" className="data-[state=active]:bg-indigo-600 rounded-lg font-bold">
                                        Özel Yönerge / Konu ile
                                    </TabsTrigger>
                                    <TabsTrigger value="text" className="data-[state=active]:bg-indigo-600 rounded-lg font-bold">
                                        Kaynak Metin ile
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="prompt" className="space-y-3 mt-3">
                                    <div>
                                        <Label className="text-xs font-bold text-slate-300">Konu Adı</Label>
                                        <Input 
                                            value={aiTopicName}
                                            onChange={(e) => setAiTopicName(e.target.value)}
                                            placeholder="Örn: 5. Sınıf Ramazan ve Oruç, Hz. İbrahim'in Hayatı"
                                            className="bg-slate-950 border-slate-800 mt-1 text-white"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-bold text-slate-300">Özel İstek / Talimat (İsteğe Bağlı)</Label>
                                        <Textarea 
                                            value={aiCustomPrompt}
                                            onChange={(e) => setAiCustomPrompt(e.target.value)}
                                            placeholder="Örn: LGS tarzı, ayet meali analizine dayalı ve kavramları sorgulayan sorular olsun."
                                            className="bg-slate-950 border-slate-800 mt-1 text-white min-h-[80px]"
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="text" className="space-y-3 mt-3">
                                    <div>
                                        <Label className="text-xs font-bold text-slate-300">Kaynak Metin (Kitap Paragrafı, Ayet/Hadis, Ders Özeti)</Label>
                                        <Textarea 
                                            value={aiSourceText}
                                            onChange={(e) => setAiSourceText(e.target.value)}
                                            placeholder="Kitaptan aldığınız metni veya konuyu buraya yapıştırın. Yapay zeka doğrudan bu metindeki bilgilere dayalı soru üretecektir."
                                            className="bg-slate-950 border-slate-800 mt-1 text-white min-h-[120px]"
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold text-slate-300">Çoktan Seçmeli (Test)</Label>
                                        <span className="text-xs font-black text-blue-400">{aiMcqCount} Soru</span>
                                    </div>
                                    <Input 
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={aiMcqCount}
                                        onChange={(e) => setAiMcqCount(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                                        className="h-10 bg-slate-950 border-slate-800 text-white font-bold text-center rounded-xl"
                                    />
                                    <div className="flex gap-1 flex-wrap">
                                        {[0, 3, 5, 10, 15, 20].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setAiMcqCount(n)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors",
                                                    aiMcqCount === n 
                                                        ? "bg-blue-600 border-blue-400 text-white" 
                                                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                                                )}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs font-bold text-slate-300">Açık Uçlu (Klasik)</Label>
                                        <span className="text-xs font-black text-amber-400">{aiOpenEndedCount} Soru</span>
                                    </div>
                                    <Input 
                                        type="number"
                                        min={0}
                                        max={20}
                                        value={aiOpenEndedCount}
                                        onChange={(e) => setAiOpenEndedCount(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                                        className="h-10 bg-slate-950 border-slate-800 text-white font-bold text-center rounded-xl"
                                    />
                                    <div className="flex gap-1 flex-wrap">
                                        {[0, 2, 3, 5, 8, 10].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setAiOpenEndedCount(n)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors",
                                                    aiOpenEndedCount === n 
                                                        ? "bg-amber-600 border-amber-400 text-white" 
                                                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                                                )}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-300">Zorluk Seviyesi</Label>
                                    <Select value={aiDifficulty} onValueChange={(v: any) => setAiDifficulty(v)}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 h-10 rounded-xl text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="Kolay">Kolay Seviye</SelectItem>
                                            <SelectItem value="Orta">Orta (Standart)</SelectItem>
                                            <SelectItem value="Zor">Zor / Muhakeme</SelectItem>
                                            <SelectItem value="Karışık">Karışık Zorluk</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                                        <span>Hedef Toplam:</span>
                                        <Badge className="bg-indigo-600/30 text-indigo-200 border-indigo-500/40 text-xs font-black">
                                            {aiMcqCount + aiOpenEndedCount} Soru
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={handleGenerateAi}
                                disabled={isGeneratingAi}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-11 shadow-md mt-2"
                            >
                                {isGeneratingAi ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yapay Zeka Soruları Hazırlıyor...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mr-2" /> Soruları Üret
                                    </>
                                )}
                            </Button>

                            {/* ÜRETİLEN SORULARI ÖNİZLEME */}
                            {generatedAiQuestions.length > 0 && (
                                <div className="space-y-3 pt-3 border-t border-slate-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-emerald-400">
                                            ✓ {generatedAiQuestions.length} soru üretildi. Teste eklemek istediklerinizi seçin:
                                        </span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                                if (selectedAiQuestionIds.size === generatedAiQuestions.length) {
                                                    setSelectedAiQuestionIds(new Set());
                                                } else {
                                                    setSelectedAiQuestionIds(new Set(generatedAiQuestions.map(q => q.id)));
                                                }
                                            }}
                                            className="text-xs text-slate-400 hover:text-white h-7"
                                        >
                                            Tümünü Seç / Kaldır
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {generatedAiQuestions.map(q => {
                                            const isSelected = selectedAiQuestionIds.has(q.id);
                                            return (
                                                <div 
                                                    key={q.id}
                                                    onClick={() => {
                                                        const next = new Set(selectedAiQuestionIds);
                                                        if (next.has(q.id)) next.delete(q.id);
                                                        else next.add(q.id);
                                                        setSelectedAiQuestionIds(next);
                                                    }}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5",
                                                        isSelected ? "bg-indigo-950/60 border-indigo-500/60 text-white" : "bg-slate-950/40 border-slate-800 text-slate-400 opacity-70"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0",
                                                        isSelected ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-700"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <Badge className="text-[9px] py-0 px-1 bg-white/10 text-slate-300">
                                                                {q.type === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu'}
                                                            </Badge>
                                                        </div>
                                                        <p className="font-medium text-slate-200">{q.text}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-3 border-t border-slate-800">
                            <Button variant="ghost" onClick={() => setShowAiModal(false)} className="text-slate-400">
                                İptal
                            </Button>
                            <Button 
                                onClick={handleAddSelectedAiQuestions}
                                disabled={selectedAiQuestionIds.size === 0}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                            >
                                Seçilen ({selectedAiQuestionIds.size}) Soruyu Teste Ekle
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ─── MODAL 2: SORU BANKASINDAN SEÇ ─── */}
                <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
                    <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-white max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-black text-blue-300">
                                <Search className="w-5 h-5 text-blue-400" /> Soru Bankasından Seç
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Sistemdeki zengin soru arşivinden sınıf, ders ve konu filtreleriyle soruları seçip testinize dahil edin.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 flex-1 overflow-y-auto pr-1">
                            {/* Filtreler */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs font-bold text-slate-400 mb-1 block">Ders</Label>
                                    <Select value={selectedCourseId} onValueChange={(val) => { setSelectedCourseId(val); setSelectedUnitId('all'); setSelectedTopicId('all'); }}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
                                            <SelectValue placeholder="Ders Seçin" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="all">Tüm Dersler</SelectItem>
                                            {allCourses.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.title} ({c.className})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs font-bold text-slate-400 mb-1 block">Ünite</Label>
                                    <Select value={selectedUnitId} onValueChange={(val) => { setSelectedUnitId(val); setSelectedTopicId('all'); }} disabled={selectedCourseId === 'all'}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
                                            <SelectValue placeholder="Ünite Seçin" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="all">Tüm Üniteler</SelectItem>
                                            {units.map((u: any) => (
                                                <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs font-bold text-slate-400 mb-1 block">Konu</Label>
                                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId} disabled={selectedUnitId === 'all'}>
                                        <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
                                            <SelectValue placeholder="Konu Seçin" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="all">Tüm Konular</SelectItem>
                                            {topics.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button 
                                onClick={handleFetchBankQuestions}
                                disabled={isLoadingBankQuestions}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 rounded-xl"
                            >
                                {isLoadingBankQuestions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                Soruları Getir
                            </Button>

                            {/* Soru Listesi */}
                            {bankQuestions.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center text-xs text-slate-400">
                                        <span>{bankQuestions.length} soru listelendi:</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                                if (selectedBankQuestionIds.size === bankQuestions.length) setSelectedBankQuestionIds(new Set());
                                                else setSelectedBankQuestionIds(new Set(bankQuestions.map(q => q.id)));
                                            }}
                                            className="text-xs text-blue-400 h-6"
                                        >
                                            Tümünü Seç / Bırak
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {bankQuestions.map(q => {
                                            const isSelected = selectedBankQuestionIds.has(q.id);
                                            return (
                                                <div 
                                                    key={q.id}
                                                    onClick={() => {
                                                        const next = new Set(selectedBankQuestionIds);
                                                        if (next.has(q.id)) next.delete(q.id);
                                                        else next.add(q.id);
                                                        setSelectedBankQuestionIds(next);
                                                    }}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5",
                                                        isSelected ? "bg-blue-950/60 border-blue-500/60 text-white" : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0",
                                                        isSelected ? "bg-blue-600 border-blue-400 text-white" : "border-slate-700"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-200 text-sm mb-1">{q.text}</p>
                                                        {q.options && (
                                                            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                                                                {q.options.map((opt, i) => (
                                                                    <span key={i} className={cn(opt === q.correctAnswer && "text-emerald-400 font-bold")}>
                                                                        {['A', 'B', 'C', 'D'][i]}) {opt}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-3 border-t border-slate-800">
                            <Button variant="ghost" onClick={() => setShowBankModal(false)} className="text-slate-400">
                                Kapat
                            </Button>
                            <Button 
                                onClick={handleAddSelectedBankQuestions}
                                disabled={selectedBankQuestionIds.size === 0}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                            >
                                Seçilen ({selectedBankQuestionIds.size}) Soruyu Teste Ekle
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ─── MODAL 3: MANUEL SORU EKLE ─── */}
                <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
                    <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-white">Manuel Soru Ekle</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Kendi aklınızdaki soruyu veya okul zümre sınavı sorusunu girin.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            {/* Tip Seçimi */}
                            <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setManualType('mcq')}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg font-bold text-xs transition-all",
                                        manualType === 'mcq' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Çoktan Seçmeli (4 Şık)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManualType('open_ended')}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg font-bold text-xs transition-all",
                                        manualType === 'open_ended' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Açık Uçlu (Klasik)
                                </button>
                            </div>

                            <div>
                                <Label className="text-xs font-bold text-slate-300 mb-1 block">Soru Metni</Label>
                                <Textarea 
                                    value={manualText}
                                    onChange={(e) => setManualText(e.target.value)}
                                    placeholder="Soruyu buraya yazınız..."
                                    className="bg-slate-950 border-slate-800 text-white min-h-[90px]"
                                />
                            </div>

                            {manualType === 'mcq' ? (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-300 block">Şıklar ve Doğru Cevap (Doğru şıkkı işaretleyin)</Label>
                                    {['A', 'B', 'C', 'D'].map((letter, idx) => (
                                        <div key={letter} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setManualCorrectIndex(idx)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center border shrink-0 transition-all",
                                                    manualCorrectIndex === idx ? "bg-emerald-500 border-emerald-400 text-slate-950" : "bg-slate-800 border-slate-700 text-slate-400"
                                                )}
                                            >
                                                {letter}
                                            </button>
                                            <Input 
                                                value={manualOptions[idx]}
                                                onChange={(e) => {
                                                    const updated = [...manualOptions];
                                                    updated[idx] = e.target.value;
                                                    setManualOptions(updated);
                                                }}
                                                placeholder={`${letter} Seçeneği...`}
                                                className="bg-slate-950 border-slate-800 text-white h-9 text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <Label className="text-xs font-bold text-slate-300 mb-1 block">Model Cevap / Puanlama Kriteri</Label>
                                    <Textarea 
                                        value={manualModelAnswer}
                                        onChange={(e) => setManualModelAnswer(e.target.value)}
                                        placeholder="Öğretmenin çözüm aşamasında ekrana yansıtacağı ideal cevap ve anahtar kelimeler..."
                                        className="bg-slate-950 border-slate-800 text-white min-h-[80px]"
                                    />
                                </div>
                            )}

                            <div>
                                <Label className="text-xs font-bold text-slate-300 mb-1 block">Çözüm Notu / Açıklama (İsteğe Bağlı)</Label>
                                <Input 
                                    value={manualExplanation}
                                    onChange={(e) => setManualExplanation(e.target.value)}
                                    placeholder="Sorunun çözüm gerekçesi veya ipucu..."
                                    className="bg-slate-950 border-slate-800 text-white h-9 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowManualModal(false)} className="text-slate-400">
                                İptal
                            </Button>
                            <Button onClick={handleAddManualQuestion} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                                Soruyu Ekle
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // =========================================================================
    // RENDER: TEST LİSTESİ & YÖNETİMİ
    // =========================================================================
    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-800/80">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/teacher/smartboard">
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white -ml-3">
                                    <ArrowLeft className="w-5 h-5 mr-1" /> Akıllı Tahta Menüsü
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                            <FileText className="w-10 h-10 text-indigo-400" /> Sınıf Testi & Toplu Soru Çözümü
                        </h1>
                        <p className="text-slate-400 text-base md:text-lg font-medium mt-2 max-w-2xl">
                            Soruları akıllı tahtaya sırayla yansıtın, öğrenciler kağıda yazsın; sonunda toplu cevap anahtarı yansıtıp birlikte analiz edin.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={handleCreateNewTest}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl px-6 h-14 text-base shadow-xl shadow-indigo-900/30 hover:scale-105 transition-all"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Yeni Test Oluştur
                        </Button>
                    </div>
                </div>

                {/* Test Kartları Listesi */}
                {isLoadingTests ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
                        <span className="font-bold">Testler yükleniyor...</span>
                    </div>
                ) : tests.length === 0 ? (
                    <div className="text-center p-16 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                        <FileQuestion className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-slate-200">Kayıtlı Test Bulunmuyor</h3>
                        <p className="text-slate-400 max-w-md mx-auto mt-2 mb-6">
                            Yapay zeka desteği veya soru bankasıyla sınıfınız için ilk toplu çözümlü testinizi hemen hazırlayın.
                        </p>
                        <Button onClick={handleCreateNewTest} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-12 px-6">
                            <Plus className="w-4 h-4 mr-2" /> İlk Testi Oluştur
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tests.map(test => (
                            <Card 
                                key={test.id}
                                className="group relative bg-slate-900/70 border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-950/50 hover:-translate-y-1"
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-3 mb-4">
                                        <Badge className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-bold px-3 py-1">
                                            {test.className || 'Genel'}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleEditTest(test.id)}
                                                className="h-8 w-8 text-slate-400 hover:text-white rounded-lg"
                                                title="Düzenle"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={(e) => handleDeleteTest(test.id, e)}
                                                className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg"
                                                title="Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors leading-snug mb-2">
                                        {test.title}
                                    </h3>

                                    {test.description && (
                                        <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                                            {test.description}
                                        </p>
                                    )}

                                    {/* Soru Detay İstatistikleri */}
                                    <div className="grid grid-cols-3 gap-2 py-3 px-3.5 rounded-2xl bg-slate-950/60 border border-white/5 mb-6 text-center">
                                        <div>
                                            <span className="text-[11px] font-bold text-slate-500 block uppercase">Toplam</span>
                                            <span className="text-lg font-black text-white">{test.questionCount} Soru</span>
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-bold text-blue-400 block uppercase">Çoktan Seçmeli</span>
                                            <span className="text-lg font-black text-blue-300">{test.mcqCount}</span>
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-bold text-amber-400 block uppercase">Açık Uçlu</span>
                                            <span className="text-lg font-black text-amber-300">{test.openEndedCount}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={() => handleStartTest(test.id)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl h-12 shadow-lg shadow-indigo-950/40 group-hover:scale-[1.02] transition-all text-base"
                                >
                                    <Play className="w-5 h-5 mr-2 fill-current" /> Akıllı Tahtada Başlat
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
