'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    BookOpen, Brain, HelpCircle, Shuffle, Sparkles, 
    Layers, CheckCircle2, ArrowRight, Loader2, PlayCircle,
    Puzzle, Gamepad2, FileText, Check, ListChecks, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import type { 
    ActivityItem, Question, LessonStep, 
    ConceptExplanationStep, FlashcardStep, 
    AnagramGameStep, SentenceScrambleStep, 
    TrueFalseListStep, McqStep, FitbStep, ActivityLinkStep
} from '@/lib/types';
import { generateLessonContent } from '@/ai/flows/generate-lesson-content';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import { useToast } from '@/hooks/use-toast';

type RegisteredAssetsDrawerProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddSteps: (steps: LessonStep[]) => void;
    onAutoBuild10StepFlow: (steps: LessonStep[]) => void;
    context: {
        courseId?: string;
        unitId?: string;
        topicId?: string;
        topicTitle?: string;
        sourceText?: string;
    };
};

export function RegisteredAssetsDrawer({
    isOpen,
    onOpenChange,
    onAddSteps,
    onAutoBuild10StepFlow,
    context
}: RegisteredAssetsDrawerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isBuildingAutoFlow, setIsBuildingAutoFlow] = useState(false);
    const [concepts, setConcepts] = useState<{ id: string; concept: string; definition: string }[]>([]);
    const [sentences, setSentences] = useState<{ id: string; correctSentence: string; scrambledSentence: string }[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'concepts' | 'sentences' | 'questions'>('overview');

    const { toast } = useToast();

    // Fetch registered assets for the current topic
    useEffect(() => {
        if (!isOpen || !context.topicId) return;

        async function fetchAssets() {
            setIsLoading(true);
            try {
                // 1. Fetch Activity Items (concepts & sentences)
                const actQuery = query(
                    collection(db, 'activityItems'),
                    where('topicId', '==', context.topicId),
                    limit(100)
                );
                const actSnap = await getDocs(actQuery);
                const loadedConcepts: { id: string; concept: string; definition: string }[] = [];
                const loadedSentences: { id: string; correctSentence: string; scrambledSentence: string }[] = [];

                actSnap.docs.forEach(doc => {
                    const data = doc.data() as ActivityItem;
                    if (data.type === 'definition' || data.type === 'concept') {
                        const term = data.content?.term || (data.content as any)?.concept || data.content?.text || (data as any).title || '';
                        const def = data.content?.definition || (data as any).definition || '';
                        if (term && def) {
                            loadedConcepts.push({ id: doc.id, concept: term, definition: def });
                        }
                    } else if (data.type === 'sentence') {
                        const original = data.content?.text || '';
                        if (original) {
                            // Scramble sentence for sentenceScramble
                            const words = original.trim().split(/\s+/);
                            const scrambled = [...words].sort(() => Math.random() - 0.5).join(' ');
                            loadedSentences.push({
                                id: doc.id,
                                correctSentence: original,
                                scrambledSentence: scrambled
                            });
                        }
                    }
                });

                // Fallback to local JSON if no concepts loaded
                if (loadedConcepts.length === 0 && context.topicId) {
                    try {
                        const res = await fetch(`/curriculum/activity-items/${context.topicId}.json?v=${Date.now()}`);
                        if (res.ok) {
                            const localData = await res.json();
                            if (Array.isArray(localData)) {
                                localData.forEach((item: any, idx: number) => {
                                    if (item.type === 'definition' || item.type === 'concept') {
                                        const term = item.content?.term || item.content?.text || item.concept || item.term || item.title || '';
                                        const def = item.content?.definition || item.definition || '';
                                        if (term && def) {
                                            loadedConcepts.push({ id: `local-def-${idx}`, concept: term, definition: def });
                                        }
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("Local fallback in registered-assets-drawer:", e);
                    }
                }

                setConcepts(loadedConcepts);
                setSentences(loadedSentences);

                // 2. Fetch Questions (MCQ, TF, FITB)
                const qQuery = query(
                    collection(db, 'questions'),
                    where('topicId', '==', context.topicId),
                    limit(100)
                );
                const qSnap = await getDocs(qQuery);
                const loadedQuestions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
                setQuestions(loadedQuestions);

            } catch (e: any) {
                console.error("Error loading registered assets:", e);
                toast({
                    title: "Veri Yükleme Uyarısı",
                    description: "Kayıtlı veriler alınırken bir sorun oluştu: " + e.message,
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchAssets();
    }, [isOpen, context.topicId]);

    // 1-Click Conversions:
    const handleConvertConceptsToExplanation = () => {
        if (concepts.length === 0) {
            toast({ 
                title: "Veritabanında Kayıt Yok", 
                description: "Bu konuya ait önceden girilmiş kavram yok. Lütfen 'AI Stüdyosu' butonunu kullanarak kaynak metninizden anında kavram kartı üretin." 
            });
            return;
        }
        const step: ConceptExplanationStep = {
            type: 'conceptExplanation',
            title: `📌 ${context.topicTitle || 'Konu'} Kavramları`,
            items: concepts.map(c => ({ concept: c.concept, definition: c.definition })),
            isPublished: true
        };
        onAddSteps([step]);
        onOpenChange(false);
        toast({ title: "Eklendi", description: `${concepts.length} adet kavram slayt olarak eklendi.` });
    };

    const handleConvertConceptsToFlashcards = () => {
        if (concepts.length === 0) {
            toast({ 
                title: "Veritabanında Kayıt Yok", 
                description: "Bu konuya ait önceden girilmiş kavram yok. Lütfen 'AI Stüdyosu' butonunu kullanarak kaynak metninizden 3D Bilgi Kartı üretin." 
            });
            return;
        }
        const step: FlashcardStep = {
            type: 'flashcard',
            title: `💡 ${context.topicTitle || 'Konu'} Bilgi Kartları`,
            cards: concepts.map(c => ({ term: c.concept, definition: c.definition })),
            isPublished: true
        };
        onAddSteps([step]);
        onOpenChange(false);
        toast({ title: "Eklendi", description: `${concepts.length} adet bilgi kartı eklendi.` });
    };

    const handleConvertConceptsToAnagram = () => {
        if (concepts.length === 0) {
            toast({ 
                title: "Veritabanında Kayıt Yok", 
                description: "Bu konuya ait önceden girilmiş kavram yok. Lütfen 'AI Stüdyosu' ile kaynak metninizden kelime oyunları üretin." 
            });
            return;
        }
        const step: AnagramGameStep = {
            type: 'anagramGame',
            title: `🔤 Kelime Dehası (${context.topicTitle || 'Konu'})`,
            cards: concepts.map(c => {
                const scrambled = c.concept.split('').sort(() => Math.random() - 0.5).join('');
                return {
                    definition: c.definition || `${c.concept} kavramını harfleri doğru sıraya dizerek bulun.`,
                    scrambledWord: scrambled.toLowerCase(),
                    correctAnswer: c.concept
                };
            }),
            isPublished: true
        };
        onAddSteps([step]);
        onOpenChange(false);
        toast({ title: "Eklendi", description: `${concepts.length} adet anagram kartı eklendi.` });
    };

    const handleConvertSentencesToScramble = () => {
        if (sentences.length === 0) {
            toast({ 
                title: "Veritabanında Kayıt Yok", 
                description: "Bu konuya ait önceden girilmiş cümle yok. Lütfen 'AI Stüdyosu' ile kaynak metninizden cümle oyunları üretin." 
            });
            return;
        }
        const steps: SentenceScrambleStep[] = sentences.map((s, idx) => ({
            type: 'sentenceScramble',
            title: `🧩 Cümle Kurma ${idx + 1}`,
            correctSentence: s.correctSentence,
            scrambledSentence: s.scrambledSentence,
            isPublished: true
        }));
        onAddSteps(steps);
        onOpenChange(false);
        toast({ title: "Eklendi", description: `${sentences.length} adet cümle kurma adımı eklendi.` });
    };

    const handleConvertQuestionsToSteps = () => {
        if (questions.length === 0) {
            toast({ 
                title: "Veritabanında Kayıt Yok", 
                description: "Bu konuya ait önceden girilmiş soru yok. Lütfen 'AI Stüdyosu' ile kaynak metninizden soru üretin." 
            });
            return;
        }
        const newSteps: LessonStep[] = [];

        // True/False questions -> Single compact trueFalseList
        const tfQuestions = questions.filter(q => q.type === 'tf');
        if (tfQuestions.length > 0) {
            newSteps.push({
                type: 'trueFalseList',
                title: `✓/✗ Doğru - Yanlış Alıştırması`,
                questions: tfQuestions.map((q: any) => ({
                    statement: q.text || q.question || '',
                    isTrue: q.correctAnswer === 'Doğru' || q.correctAnswer === true || q.isTrue === true
                })),
                isPublished: true
            } as TrueFalseListStep);
        }

        // MCQ Questions -> mcq steps
        const mcqQuestions = questions.filter(q => q.type === 'mcq');
        mcqQuestions.forEach((q: any, i) => {
            newSteps.push({
                type: 'mcq',
                title: `❓ Kontrol Sorusu ${i + 1}`,
                question: q.text || q.question || '',
                options: q.options || [],
                correctAnswer: q.correctAnswer || '',
                isPublished: true
            } as McqStep);
        });

        // FITB Questions -> fitb steps
        const fitbQuestions = questions.filter(q => q.type === 'fitb');
        fitbQuestions.forEach((q: any, i) => {
            newSteps.push({
                type: 'fitb',
                title: `✍️ Boşluk Doldurma ${i + 1}`,
                sentenceWithBlank: q.text || q.sentenceWithBlank || '',
                options: q.options || [],
                correctAnswer: q.correctAnswer || '',
                isPublished: true
            } as FitbStep);
        });

        if (newSteps.length > 0) {
            onAddSteps(newSteps);
            onOpenChange(false);
            toast({ title: "Eklendi", description: `${newSteps.length} değerlendirme adımı eklendi.` });
        }
    };

    // ⚡ 10 ADIMLIK İDEAL DERSİ OTOMATİK KURGULA (Kayıtlı Varlık + AI Hibrit)
    const handleBuild10StepMasterFlow = async () => {
        setIsBuildingAutoFlow(true);
        try {
            const topicTitle = context.topicTitle || 'Ders Konusu';
            const textToAnalyze = context.sourceText?.trim() || topicTitle;
            const generatedFlow: LessonStep[] = [];

            // AI ile Hedefler, Özet ve HTML Slaytı üret
            let aiObjectives: string[] = [
                `${topicTitle} konusunun temel kavramlarını açıklayabileceksiniz.`,
                `Konuyla ilgili temel ilkeleri ve çıkarımları kavrayacaksınız.`
            ];
            let aiSummaryItems: { title: string; content: string }[] = [
                { title: 'Konuya Giriş', content: `<ul><li>${topicTitle} konusuyla ilgili temel bilgiler.</li></ul>` },
                { title: 'Önemli Noktalar', content: `<ul><li>Kavramların doğru anlaşılması ve günlük hayattaki yansımaları.</li></ul>` }
            ];
            let htmlSlideContent = `<div class="p-8 bg-slate-900 rounded-3xl text-white text-center"><h1 class="text-3xl font-black mb-4">${topicTitle}</h1><p class="text-slate-300">İnteraktif ders sunumuna hoş geldiniz.</p></div>`;

            let fallbackConcepts = concepts;
            let fallbackSentences = sentences;
            let fallbackQuestions = questions;

            try {
                const aiResult = await generateLessonContent({
                    topicSummary: textToAnalyze,
                    modules: {
                        learningObjectives: true,
                        summary: true,
                        conceptExplanations: concepts.length === 0,
                        flashcards: concepts.length === 0,
                        anagramQuestions: concepts.length === 0,
                        sentenceScrambleQuestions: sentences.length === 0,
                        trueFalseQuestions: questions.length === 0,
                        multipleChoiceQuestions: questions.length === 0,
                    }
                });

                if (aiResult.learningObjectives && aiResult.learningObjectives.length > 0) {
                    aiObjectives = aiResult.learningObjectives;
                }
                if (aiResult.summary && aiResult.summary.length > 0) {
                    aiSummaryItems = aiResult.summary;
                }

                // AI'dan türetilen kavramlar
                if (fallbackConcepts.length === 0 && aiResult.conceptExplanations) {
                    fallbackConcepts = aiResult.conceptExplanations.map((c, idx) => ({
                        id: `ai_c_${idx}`,
                        concept: c.concept,
                        definition: c.definition
                    }));
                }

                // AI'dan türetilen cümleler
                if (fallbackSentences.length === 0 && aiResult.sentenceScrambleQuestions) {
                    fallbackSentences = aiResult.sentenceScrambleQuestions.map((s, idx) => ({
                        id: `ai_s_${idx}`,
                        correctSentence: s.correctSentence,
                        scrambledSentence: s.scrambledSentence
                    }));
                }

                // AI'dan türetilen sorular
                if (fallbackQuestions.length === 0) {
                    const aiQs: Question[] = [];
                    if (aiResult.trueFalseQuestions) {
                        aiResult.trueFalseQuestions.forEach((tf, idx) => {
                            aiQs.push({
                                id: `ai_tf_${idx}`,
                                type: 'tf',
                                text: tf.statement,
                                correctAnswer: tf.isTrue ? 'Doğru' : 'Yanlış',
                                isTrue: tf.isTrue
                            } as any);
                        });
                    }
                    if (aiResult.multipleChoiceQuestions) {
                        aiResult.multipleChoiceQuestions.forEach((mcq, idx) => {
                            aiQs.push({
                                id: `ai_mcq_${idx}`,
                                type: 'mcq',
                                text: mcq.question,
                                options: mcq.options,
                                correctAnswer: mcq.correctAnswer
                            } as any);
                        });
                    }
                    fallbackQuestions = aiQs;
                }

            } catch (err) {
                console.warn("AI generation fallback for auto flow:", err);
            }

            try {
                const htmlResult = await generateHtmlSlide({ topicSummary: textToAnalyze });
                if (htmlResult && htmlResult.htmlContent) {
                    htmlSlideContent = htmlResult.htmlContent;
                }
            } catch (err) {
                console.warn("HTML slide fallback for auto flow:", err);
            }

            // 1. ÖĞRENME HEDEFLERİ
            generatedFlow.push({
                type: 'objectiveList',
                title: '🎯 Öğrenme Hedefleri',
                items: aiObjectives,
                isPublished: true
            });

            // 2. VİDEO (Şablon veya Bağlantı)
            generatedFlow.push({
                type: 'video',
                title: '🎬 Konu Anlatım Videosu',
                url: '',
                description: 'Konuya giriş ve ilgi çekici anlatım videosu.',
                isPublished: true
            });

            // 3. KAVRAMLAR
            if (fallbackConcepts.length > 0) {
                generatedFlow.push({
                    type: 'conceptExplanation',
                    title: `📌 ${topicTitle} Kavramları`,
                    items: fallbackConcepts.map(c => ({ concept: c.concept, definition: c.definition })),
                    isPublished: true
                });
            }

            // 4. NOTEBOOKLM / ZENGİN HTML SLAYT
            generatedFlow.push({
                type: 'htmlSlide',
                title: '💻 İnteraktif Konu Slaytı',
                htmlContent: htmlSlideContent,
                isPublished: true
            });

            // 5. AI KONU ÖZETİ & BAŞLIKLAR
            generatedFlow.push({
                type: 'accordion',
                title: '📖 Konu Özeti & Başlıklar',
                items: aiSummaryItems.map((s, i) => ({ id: `acc_${i}`, title: s.title, content: s.content })),
                isPublished: true
            });

            // 6. BİLGİ KARTLARI (FLASHCARD)
            if (fallbackConcepts.length > 0) {
                generatedFlow.push({
                    type: 'flashcard',
                    title: '💡 Bilgi & Hafıza Kartları',
                    cards: fallbackConcepts.map(c => ({ term: c.concept, definition: c.definition })),
                    isPublished: true
                });
            }

            // 7. ANAGRAM BULMACA KARTLARI
            if (fallbackConcepts.length > 0) {
                generatedFlow.push({
                    type: 'anagramGame',
                    title: '🔤 Anagram / Kelime Oyunu',
                    cards: fallbackConcepts.map(c => {
                        const scrambled = c.concept.split('').sort(() => Math.random() - 0.5).join('');
                        return {
                            definition: c.definition || `${c.concept} kavramını bulun.`,
                            scrambledWord: scrambled.toLowerCase(),
                            correctAnswer: c.concept
                        };
                    }),
                    isPublished: true
                });
            }

            // 8. CÜMLE KURMA ETKİNLİĞİ
            if (fallbackSentences.length > 0) {
                fallbackSentences.slice(0, 2).forEach((s, idx) => {
                    generatedFlow.push({
                        type: 'sentenceScramble',
                        title: `🧩 Cümle Kurma ${idx + 1}`,
                        correctSentence: s.correctSentence,
                        scrambledSentence: s.scrambledSentence,
                        isPublished: true
                    });
                });
            }

            // 9. İNTERAKTİF MİNİ OYUN (KELİME AVI)
            generatedFlow.push({
                type: 'activityLink',
                title: '🔍 Kelime Avı Oyunu',
                activityType: '/oyunlar/kelime-avi/oyun',
                activityLabel: 'Kelime Avı',
                courseId: context.courseId,
                unitId: context.unitId,
                topicId: context.topicId,
                isPublished: true
            } as ActivityLinkStep);

            // 10. DEĞERLENDİRME SORULARI
            if (fallbackQuestions.length > 0) {
                const tfQ = fallbackQuestions.filter(q => q.type === 'tf');
                if (tfQ.length > 0) {
                    generatedFlow.push({
                        type: 'trueFalseList',
                        title: '✓/✗ Doğru - Yanlış Alıştırması',
                        questions: tfQ.map((q: any) => ({
                            statement: q.text || q.question || '',
                            isTrue: q.correctAnswer === 'Doğru' || q.correctAnswer === true || q.isTrue === true
                        })),
                        isPublished: true
                    });
                }
                const mcqQ = fallbackQuestions.filter(q => q.type === 'mcq');
                if (mcqQ.length > 0) {
                    mcqQ.slice(0, 2).forEach((q: any, i) => {
                        generatedFlow.push({
                            type: 'mcq',
                            title: `❓ Kontrol Sorusu ${i + 1}`,
                            question: q.text || q.question || '',
                            options: q.options || [],
                            correctAnswer: q.correctAnswer || '',
                            isPublished: true
                        });
                    });
                }
            }

            onAutoBuild10StepFlow(generatedFlow);
            onOpenChange(false);
            toast({
                title: "10 Adımlık Ders Kuruldu!",
                description: `${generatedFlow.length} slaytlık kusursuz pedagojik ders akışı başarıyla oluşturuldu.`
            });

        } catch (error: any) {
            toast({
                title: "Hata",
                description: "Ders kurgulanırken bir sorun oluştu: " + error.message,
                variant: "destructive"
            });
        } finally {
            setIsBuildingAutoFlow(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl flex flex-col h-auto max-h-[90vh] bg-slate-950 border border-white/10 text-slate-100 shadow-2xl p-0 overflow-hidden rounded-3xl">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                    Konu Varlıkları & Otomatik Ders Kurgulayıcı
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    {context.topicTitle || 'Seçili Konu'} için sistemde kayıtlı kavramlar, cümleler ve soru bankası.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* ⚡ 10 Adımlık Otomatik Ders Kurgula Butonu */}
                        <Button
                            onClick={handleBuild10StepMasterFlow}
                            disabled={isBuildingAutoFlow || isLoading}
                            className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-xl shadow-orange-950/40 border border-white/10 cursor-pointer"
                        >
                            {isBuildingAutoFlow ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kurgulanıyor...</>
                            ) : (
                                <><Wand2 className="w-4 h-4 mr-2 text-yellow-200" /> ⚡ 10 Adımlık Dersi Otomatik Kur</>
                            )}
                        </Button>
                    </div>

                    {/* Varlık İstatistikleri */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs">
                            <Brain className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-slate-400">Kayıtlı Kavram:</span>
                            <span className="font-bold text-white">{concepts.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs">
                            <Puzzle className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-slate-400">Kayıtlı Cümle:</span>
                            <span className="font-bold text-white">{sentences.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-purple-500/30 text-xs">
                            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-slate-400">Soru Bankası:</span>
                            <span className="font-bold text-white">{questions.length}</span>
                        </div>
                    </div>
                </DialogHeader>

                {/* İçerik ve Hızlı Dönüştürme Kartları */}
                <div className="p-6 overflow-y-auto max-h-[55vh] space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <p className="text-xs">Konu varlıkları taranıyor...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Kavram Kartları Dönüştürme */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                                                <Brain className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-black text-sm text-white">Kavram Kartları</h4>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] bg-indigo-500/20 text-indigo-300 border-indigo-500/40">
                                            {concepts.length} Kavram
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                        Sistemdeki kavram ve tanımları akıllı tahtada tek tek açılan kavram kartı slaytı yapar.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConvertConceptsToExplanation}
                                    disabled={concepts.length === 0}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-9"
                                >
                                    ➔ Kavram Kartı Olarak Ekle
                                </Button>
                            </div>

                            {/* Bilgi Kartları (Flashcards) */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-black text-sm text-white">Bilgi Kartları (Flashcards)</h4>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                            {concepts.length} Kart
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                        Dokunup 3D çevrilen etkileşimli hafıza kartı slaytına dönüştürür.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConvertConceptsToFlashcards}
                                    disabled={concepts.length === 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-9"
                                >
                                    ➔ Bilgi Kartı Olarak Ekle
                                </Button>
                            </div>

                            {/* Anagram Bulmaca Kartları */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-950/40 to-slate-900 border border-fuchsia-500/30 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-300">
                                                <Puzzle className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-black text-sm text-white">Anagram Bulmaca</h4>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40">
                                            {concepts.length} Bulmaca
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                        Kavramların harflerini karıştırarak etkileşimli harf dizme oyun kartına çevirir.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConvertConceptsToAnagram}
                                    disabled={concepts.length === 0}
                                    className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs rounded-xl h-9"
                                >
                                    ➔ Anagram Kartı Olarak Ekle
                                </Button>
                            </div>

                            {/* Cümle Kurma Etkinliği */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
                                                <Shuffle className="w-4 h-4" />
                                            </div>
                                            <h4 className="font-black text-sm text-white">Cümle Kurma</h4>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                                            {sentences.length} Cümle
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                        Sistemdeki cümleleri karışık kelime dizme slaytı olarak akışa aktarır.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConvertSentencesToScramble}
                                    disabled={sentences.length === 0}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl h-9"
                                >
                                    ➔ Cümle Kurma Olarak Ekle
                                </Button>
                            </div>

                            {/* Soru Bankası Aktarımı */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/30 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                                            <HelpCircle className="w-4 h-4" />
                                        </div>
                                        <h4 className="font-black text-sm text-white">Soru Bankası Sorularını Aktar</h4>
                                        <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/40">
                                            {questions.length} Soru
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Kayıtlı D/Y sorularını tek bir D/Y listesine, çoktan seçmelileri ise kontrol testlerine dönüştürür.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleConvertQuestionsToSteps}
                                    disabled={questions.length === 0}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl px-6 h-9 flex-shrink-0"
                                >
                                    ➔ Soruları Slaytlara Aktar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 px-6 border-t border-white/10 bg-slate-900/60 flex items-center justify-between sm:justify-between">
                    <span className="text-xs text-slate-500">
                        * Tüm veriler doğrudan seçili konunuzun veri tabanından anlık çekilir.
                    </span>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
                        Kapat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
