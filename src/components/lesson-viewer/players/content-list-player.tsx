'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    Sparkles, CheckCircle2, Volume2, VolumeX, Maximize2, X, Target, 
    Crown, Zap, Flame, Star, Gem, Feather 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import type { ContentStep, ObjectiveListStep, AccordionStep } from '@/lib/types';
import { motion } from 'framer-motion';
import { 
    prepareTurkishSpeech, 
    getBestTurkishVoice, 
    getTurkishSpeechParams,
    HighlightedSentence, 
    TypewriterText 
} from '../tts-helper';

const useTeacherMode = () => {
    const { user } = useAuth();
    return user?.role === 'teacher' || user?.role === 'superadmin';
};

export function ContentListPlayer({ 
    step, 
    revealedSentencesCount, 
    isFullscreen, 
    onAnimationStart, 
    onAnimationEnd,
    isSingleCardMode,
    animationSpeed = 'off',
    fontSizeScale = 'normal',
    isTeacher: propIsTeacher,
    presentationTheme = 'clean-light',
    presentationFont = 'playfair',
    isAutoReadEnabled = false
}: { 
    step: ContentStep | ObjectiveListStep | AccordionStep; 
    revealedSentencesCount: number; 
    isFullscreen?: boolean; 
    onAnimationStart?: () => void; 
    onAnimationEnd?: () => void;
    isSingleCardMode?: boolean;
    animationSpeed?: 'off' | 'slow' | 'normal' | 'fast';
    fontSizeScale?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'normal' | 'huge';
    isTeacher?: boolean;
    presentationTheme?: 'cosmic-dark' | 'vibrant-studio' | 'clean-light';
    presentationFont?: 'outfit' | 'poppins' | 'jakarta' | 'playfair';
    isAutoReadEnabled?: boolean;
}) {
    const authIsTeacher = useTeacherMode();
    const isTeacher = typeof propIsTeacher === 'boolean' ? propIsTeacher : authIsTeacher;
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSentence, setModalSentence] = useState<string | null>(null);
    const [manualFocusIndex, setManualFocusIndex] = useState<number | null>(null);
    const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

    // Kilitlenmeyi önleyen güvenli referanslar
    const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const autoReadTimerRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const boundaryFiredRef = useRef<boolean>(false);
    const prevCountRef = useRef<number>(0);
    const prevStepKeyRef = useRef<string>('');
    const prevAutoReadRef = useRef<boolean>(isAutoReadEnabled);

    const fontClass = 
        presentationFont === 'poppins' ? 'font-poppins' :
        presentationFont === 'jakarta' ? 'font-jakarta' :
        presentationFont === 'playfair' ? 'font-playfair' :
        'font-outfit';

    const sentences = useMemo(() => {
        let items: string[] = [];
        if (step.type === 'content') {
            if (typeof step.content !== 'string') return [];
            const doc = new DOMParser().parseFromString(`<div>${step.content}</div>`, 'text/html');
            const listItems = doc.querySelectorAll('li');
            if (listItems.length > 0) {
                items = Array.from(listItems).map(li => li.innerHTML.trim()).filter(Boolean);
            } else {
                const paragraphs = doc.querySelectorAll('p');
                if (paragraphs.length > 0) {
                    const extracted: string[] = [];
                    paragraphs.forEach(p => {
                        const html = p.innerHTML.trim();
                        const matches = html.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [html];
                        extracted.push(...matches.filter(Boolean));
                    });
                    items = extracted.length > 0 ? extracted : [step.content];
                } else {
                    items = step.content.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()) || [step.content];
                }
            }
        } else if (step.type === 'objectiveList') {
            items = (step as ObjectiveListStep).items;
        } else if (step.type === 'accordion') {
            items = (step as AccordionStep).items.map(item => `<strong>${item.title}:</strong> ${item.content}`);
        }
        return items;
    }, [step]);
      
    const visibleSentences = (typeof revealedSentencesCount === 'number' && revealedSentencesCount > 0)
        ? sentences.slice(0, revealedSentencesCount)
        : sentences;

    const activeIndex = manualFocusIndex !== null
        ? Math.min(manualFocusIndex, visibleSentences.length - 1)
        : (visibleSentences.length - 1);

    useEffect(() => {
        setManualFocusIndex(null);
    }, [revealedSentencesCount]);

    // Sesli okumayı tam ve güvenli durdurma
    const stopSpeech = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
                window.speechSynthesis.cancel();
            } catch (_) {}
            if ((window as any).__activeSpeechUtterance) {
                (window as any).__activeSpeechUtterance = null;
            }
        }
        if (fallbackTimerRef.current) {
            clearInterval(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }
        if (autoReadTimerRef.current) {
            clearTimeout(autoReadTimerRef.current);
            autoReadTimerRef.current = null;
        }
        activeUtteranceRef.current = null;
        boundaryFiredRef.current = false;
        setSpeakingIndex(null);
        setCurrentWordIndex(null);
    }, []);

    // Doğal sesleri yükleme
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            const handleVoicesChanged = () => {
                window.speechSynthesis.getVoices();
            };
            window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
            return () => {
                window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            };
        }
    }, []);

    // Sesli Okuma (TTS - Web Speech API, Doğal Türkçe Ses, GC Korumalı & Kilitsiz)
    const handleSpeakSentence = useCallback((e: React.MouseEvent | null | undefined, text: string, idx: number) => {
        e?.stopPropagation?.();
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        if (speakingIndex === idx) {
            stopSpeech();
            return;
        }

        stopSpeech();

        const { spokenText, spokenWordRanges, totalVisualWords } = prepareTurkishSpeech(text);
        if (!spokenText.trim()) return;

        const utterance = new SpeechSynthesisUtterance(spokenText);
        activeUtteranceRef.current = utterance; // V8 Garbage Collection donmasını önleme
        if (typeof window !== 'undefined') {
            (window as any).__activeSpeechUtterance = utterance;
        }

        const bestVoice = getBestTurkishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
            utterance.lang = bestVoice.lang;
        } else {
            utterance.lang = 'tr-TR';
        }

        const { rate, pitch } = getTurkishSpeechParams(bestVoice);
        utterance.rate = rate;
        utterance.pitch = pitch;
        boundaryFiredRef.current = false;

        utterance.onboundary = (event) => {
            boundaryFiredRef.current = true;
            if (fallbackTimerRef.current) {
                clearInterval(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
            }

            if (event.name === 'word' || !event.name || event.name === '') {
                const charIndex = event.charIndex;
                let matchedRange = spokenWordRanges.find(w => charIndex >= w.start && charIndex < w.end);
                if (!matchedRange) {
                    matchedRange = spokenWordRanges.find(w => w.start >= charIndex);
                }
                if (!matchedRange && spokenWordRanges.length > 0) {
                    matchedRange = spokenWordRanges.reduce((prev, curr) => {
                        return Math.abs(curr.start - charIndex) < Math.abs(prev.start - charIndex) ? curr : prev;
                    }, spokenWordRanges[0]);
                }
                if (matchedRange) {
                    setCurrentWordIndex(matchedRange.visualIndex);
                }
            }
        };

        utterance.onstart = () => {
            setSpeakingIndex(idx);
            setCurrentWordIndex(0);

            setTimeout(() => {
                if (!boundaryFiredRef.current && totalVisualWords > 1 && activeUtteranceRef.current === utterance) {
                    let simIndex = 0;
                    fallbackTimerRef.current = setInterval(() => {
                        simIndex++;
                        if (simIndex < totalVisualWords) {
                            setCurrentWordIndex(simIndex);
                        } else {
                            if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
                        }
                    }, 430);
                }
            }, 700);
        };

        utterance.onend = () => {
            if (activeUtteranceRef.current === utterance) {
                activeUtteranceRef.current = null;
            }
            if (typeof window !== 'undefined' && (window as any).__activeSpeechUtterance === utterance) {
                (window as any).__activeSpeechUtterance = null;
            }
            setSpeakingIndex(null);
            setCurrentWordIndex(null);
        };

        utterance.onerror = () => {
            if (activeUtteranceRef.current === utterance) {
                activeUtteranceRef.current = null;
            }
            if (typeof window !== 'undefined' && (window as any).__activeSpeechUtterance === utterance) {
                (window as any).__activeSpeechUtterance = null;
            }
            setSpeakingIndex(null);
            setCurrentWordIndex(null);
        };

        // Tarayıcı ses motorunun sıfırlanması için güvenli 80ms aralık
        setTimeout(() => {
            try {
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
                setSpeakingIndex(idx);
                setCurrentWordIndex(0);
                window.speechSynthesis.speak(utterance);
            } catch (_) {}
        }, 80);
    }, [speakingIndex, stopSpeech]);

    // handleSpeakSentence referansını kararlı tutarak gereksiz tetiklenmeleri önle
    const speakSentenceRef = useRef(handleSpeakSentence);
    useEffect(() => {
        speakSentenceRef.current = handleSpeakSentence;
    }, [handleSpeakSentence]);

    // Slayt adımı değiştiğinde sayaçları ve konuşmayı sıfırla
    const currentStepKey = (step as any)?.id || (step as any)?.title || JSON.stringify((step as any)?.content || '');
    useEffect(() => {
        if (prevStepKeyRef.current !== currentStepKey) {
            prevStepKeyRef.current = currentStepKey;
            prevCountRef.current = 0; // Yeni slaytta 1. kartın okunabilmesi için sıfırla
        }
        return () => {
            stopSpeech();
        };
    }, [currentStepKey, stopSpeech]);

    // Kart açıldığında çalışan effect: Hem slayt ilk açıldığında (1. kart), hem yeni kartlar açıldığında çalışır
    useEffect(() => {
        if (!isTeacher) return;

        const prev = prevCountRef.current;
        prevCountRef.current = revealedSentencesCount;

        if (revealedSentencesCount > prev) {
            const newIdx = revealedSentencesCount - 1;
            const newSentence = sentences[newIdx];
            if (isSingleCardMode) {
                setModalSentence(newSentence || null);
                setIsModalOpen(true);
                onAnimationStart?.();
            }

            if (isAutoReadEnabled && newSentence) {
                if (autoReadTimerRef.current) {
                    clearTimeout(autoReadTimerRef.current);
                }
                // İlk kart (prev === 0) slayt geçiş animasyonunun oturması için 380ms, sonrakiler 220ms bekler
                const delay = prev === 0 ? 380 : 220;
                autoReadTimerRef.current = setTimeout(() => {
                    speakSentenceRef.current(null, newSentence, isSingleCardMode ? 9999 : newIdx);
                }, delay);
            }
        }
    }, [revealedSentencesCount, isTeacher, isSingleCardMode, sentences, onAnimationStart, isAutoReadEnabled]);

    // Araçlar menüsünden otomatik okuma açıldığında hemen o anki kartı oku
    useEffect(() => {
        if (!isTeacher) return;
        const wasOff = !prevAutoReadRef.current && isAutoReadEnabled;
        prevAutoReadRef.current = isAutoReadEnabled;

        if (wasOff && activeIndex >= 0 && sentences[activeIndex]) {
            if (autoReadTimerRef.current) clearTimeout(autoReadTimerRef.current);
            autoReadTimerRef.current = setTimeout(() => {
                speakSentenceRef.current(null, sentences[activeIndex], isSingleCardMode ? 9999 : activeIndex);
            }, 180);
        }
    }, [isAutoReadEnabled, isTeacher, activeIndex, sentences, isSingleCardMode]);

    // 8 Farklı Bento Glass Renk Teması
    const styles = [
        { 
            id: 'sky',
            icon: Sparkles,
            heroCard: 'bg-gradient-to-br from-sky-950/95 via-slate-900/98 to-blue-950/95 border-2 border-sky-400 shadow-[0_0_50px_rgba(14,165,233,0.45)] ring-4 ring-sky-500/25',
            heroTopLine: 'from-transparent via-sky-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-sky-300 via-sky-400 to-blue-600 shadow-[0_0_16px_rgba(14,165,233,0.9)]',
            heroBadge: 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white border-2 border-sky-200/80 shadow-lg shadow-sky-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-sky-500/25 border border-sky-400/60 text-sky-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-sky-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-sky-300 border border-sky-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 border-2 border-sky-300 border-b-[8px] border-b-blue-800 text-white shadow-2xl shadow-sky-500/35 ring-4 ring-sky-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-sky-500/90 via-sky-600/90 to-blue-600/90 border-2 border-sky-200/70 border-b-[6px] border-b-blue-800/80 text-white shadow-xl shadow-sky-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            accentColor: '#0ea5e9'
        },
        { 
            id: 'violet',
            icon: Crown,
            heroCard: 'bg-gradient-to-br from-purple-950/95 via-slate-900/98 to-violet-950/95 border-2 border-purple-400 shadow-[0_0_50px_rgba(168,85,247,0.45)] ring-4 ring-purple-500/25',
            heroTopLine: 'from-transparent via-purple-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-purple-300 via-purple-400 to-violet-600 shadow-[0_0_16px_rgba(168,85,247,0.9)]',
            heroBadge: 'bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600 text-white border-2 border-purple-200/80 shadow-lg shadow-purple-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-purple-500/25 border border-purple-400/60 text-purple-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-purple-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-purple-300 border border-purple-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 border-2 border-purple-300 border-b-[8px] border-b-indigo-800 text-white shadow-2xl shadow-purple-500/35 ring-4 ring-purple-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-purple-500/90 via-violet-600/90 to-indigo-600/90 border-2 border-purple-200/70 border-b-[6px] border-b-indigo-800/80 text-white shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            accentColor: '#a855f7'
        },
        { 
            id: 'emerald',
            icon: Zap,
            heroCard: 'bg-gradient-to-br from-emerald-950/95 via-slate-900/98 to-teal-950/95 border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.45)] ring-4 ring-emerald-500/25',
            heroTopLine: 'from-transparent via-emerald-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-emerald-300 via-emerald-400 to-teal-600 shadow-[0_0_16px_rgba(16,185,129,0.9)]',
            heroBadge: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-green-600 text-white border-2 border-emerald-200/80 shadow-lg shadow-emerald-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-emerald-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-emerald-300 border border-emerald-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 border-2 border-emerald-300 border-b-[8px] border-b-teal-800 text-white shadow-2xl shadow-emerald-500/35 ring-4 ring-emerald-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-emerald-500/90 via-emerald-600/90 to-teal-600/90 border-2 border-emerald-200/70 border-b-[6px] border-b-teal-800/80 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-yellow-200 [&_b]:text-yellow-200',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-yellow-200 [&_b]:text-yellow-200',
            accentColor: '#10b981'
        },
        { 
            id: 'amber',
            icon: Flame,
            heroCard: 'bg-gradient-to-br from-amber-950/95 via-slate-900/98 to-orange-950/90 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.45)] ring-4 ring-amber-500/25',
            heroTopLine: 'from-transparent via-amber-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-600 shadow-[0_0_16px_rgba(245,158,11,0.9)]',
            heroBadge: 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 text-white border-2 border-amber-200/80 shadow-lg shadow-amber-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-amber-500/25 border border-amber-400/60 text-amber-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-amber-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-amber-300 border border-amber-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 border-2 border-amber-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-amber-500/35 ring-4 ring-amber-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-amber-500/90 via-orange-500/90 to-red-500/90 border-2 border-amber-200/70 border-b-[6px] border-b-orange-800/80 text-white shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-yellow-100 [&_b]:text-yellow-100',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-yellow-100 [&_b]:text-yellow-100',
            accentColor: '#f59e0b'
        },
        { 
            id: 'rose',
            icon: Star,
            heroCard: 'bg-gradient-to-br from-rose-950/95 via-slate-900/98 to-pink-950/90 border-2 border-rose-400 shadow-[0_0_50px_rgba(244,63,94,0.45)] ring-4 ring-rose-500/25',
            heroTopLine: 'from-transparent via-rose-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-rose-300 via-rose-400 to-pink-600 shadow-[0_0_16px_rgba(244,63,94,0.9)]',
            heroBadge: 'bg-gradient-to-br from-rose-400 via-pink-500 to-red-600 text-white border-2 border-rose-200/80 shadow-lg shadow-rose-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-rose-500/25 border border-rose-400/60 text-rose-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-rose-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-rose-300 border border-rose-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 border-2 border-rose-300 border-b-[8px] border-b-rose-800 text-white shadow-2xl shadow-rose-500/35 ring-4 ring-rose-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-rose-500/90 via-pink-600/90 to-red-600/90 border-2 border-rose-200/70 border-b-[6px] border-b-rose-800/80 text-white shadow-xl shadow-rose-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            accentColor: '#f43f5e'
        },
        { 
            id: 'cyan',
            icon: Gem,
            heroCard: 'bg-gradient-to-br from-cyan-950/95 via-slate-900/98 to-teal-950/95 border-2 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.45)] ring-4 ring-cyan-500/25',
            heroTopLine: 'from-transparent via-cyan-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-cyan-300 via-cyan-400 to-teal-600 shadow-[0_0_16px_rgba(6,182,212,0.9)]',
            heroBadge: 'bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 text-white border-2 border-cyan-200/80 shadow-lg shadow-cyan-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-cyan-500/25 border border-cyan-400/60 text-cyan-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-cyan-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-cyan-300 border border-cyan-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-600 border-2 border-cyan-300 border-b-[8px] border-b-cyan-800 text-white shadow-2xl shadow-cyan-500/35 ring-4 ring-cyan-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-cyan-500/90 via-teal-600/90 to-blue-600/90 border-2 border-cyan-200/70 border-b-[6px] border-b-cyan-800/80 text-white shadow-xl shadow-cyan-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            accentColor: '#06b6d4'
        },
        { 
            id: 'indigo',
            icon: Feather,
            heroCard: 'bg-gradient-to-br from-indigo-950/95 via-slate-900/98 to-blue-950/95 border-2 border-indigo-400 shadow-[0_0_50px_rgba(99,102,241,0.45)] ring-4 ring-indigo-500/25',
            heroTopLine: 'from-transparent via-indigo-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-indigo-300 via-indigo-400 to-blue-600 shadow-[0_0_16px_rgba(99,102,241,0.9)]',
            heroBadge: 'bg-gradient-to-br from-indigo-400 via-blue-500 to-indigo-700 text-white border-2 border-indigo-200/80 shadow-lg shadow-indigo-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-indigo-500/25 border border-indigo-400/60 text-indigo-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-indigo-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-indigo-300 border border-indigo-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 border-2 border-indigo-300 border-b-[8px] border-b-indigo-900 text-white shadow-2xl shadow-indigo-500/35 ring-4 ring-indigo-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-indigo-500/90 via-indigo-600/90 to-blue-700/90 border-2 border-indigo-200/70 border-b-[6px] border-b-indigo-900/80 text-white shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-amber-200 [&_b]:text-amber-200',
            accentColor: '#6366f1'
        },
        { 
            id: 'orange',
            icon: Sparkles,
            heroCard: 'bg-gradient-to-br from-orange-950/95 via-slate-900/98 to-red-950/90 border-2 border-orange-400 shadow-[0_0_50px_rgba(249,115,22,0.45)] ring-4 ring-orange-500/25',
            heroTopLine: 'from-transparent via-orange-300 to-transparent',
            heroLeftBar: 'bg-gradient-to-b from-orange-300 via-orange-400 to-red-600 shadow-[0_0_16px_rgba(249,115,22,0.9)]',
            heroBadge: 'bg-gradient-to-br from-orange-400 via-amber-500 to-red-500 text-white border-2 border-orange-200/80 shadow-lg shadow-orange-500/50',
            heroText: 'text-white font-black drop-shadow-sm',
            heroTag: 'bg-orange-500/25 border border-orange-400/60 text-orange-200',
            calmCard: 'bg-slate-900/80 hover:bg-slate-900/95 border border-white/10 hover:border-orange-400/50 shadow-lg backdrop-blur-xl',
            calmBadge: 'bg-slate-800 text-orange-300 border border-orange-500/40',
            calmText: 'text-slate-100 font-bold',
            teacherHeroCard: 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 border-2 border-orange-300 border-b-[8px] border-b-orange-800 text-white shadow-2xl shadow-orange-500/35 ring-4 ring-orange-400/30',
            teacherCalmCard: 'bg-gradient-to-br from-orange-500/90 via-red-500/90 to-rose-600/90 border-2 border-orange-200/70 border-b-[6px] border-b-orange-800/80 text-white shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:scale-[1.01]',
            teacherHeroBadge: 'bg-white/25 text-white border-2 border-white/50 shadow-md backdrop-blur-md',
            teacherCalmBadge: 'bg-white/20 text-white border border-white/30 backdrop-blur-md',
            teacherHeroText: 'text-white font-black drop-shadow-sm [&_strong]:text-yellow-100 [&_b]:text-yellow-100',
            teacherCalmText: 'text-white font-bold drop-shadow-sm [&_strong]:text-yellow-100 [&_b]:text-yellow-100',
            accentColor: '#f97316'
        },
    ];

    useEffect(() => {
        if (isTeacher && visibleSentences.length > 0) {
            onAnimationStart?.();
        }
    }, [visibleSentences.length, isTeacher, onAnimationStart]);

    useEffect(() => {
        if (revealedSentencesCount > 1 && scrollRef.current) {
            const el = scrollRef.current;
            const rect = el.getBoundingClientRect();
            if (rect.bottom > (window.innerHeight - 80) || rect.top < 60) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
            }
        }
    }, [revealedSentencesCount]);

    const getSentenceFontSize = (isHero: boolean) => {
        if (isTeacher) {
            switch (fontSizeScale) {
                case 'huge':
                case 'xl':
                    return isHero 
                        ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wide leading-relaxed font-black" 
                        : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-normal leading-relaxed font-bold";
                case 'lg':
                    return isHero 
                        ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wide leading-relaxed font-black" 
                        : "text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-normal leading-relaxed font-bold";
                case 'xs':
                    return isHero 
                        ? "text-lg md:text-xl lg:text-2xl tracking-normal leading-relaxed font-black" 
                        : "text-base md:text-lg lg:text-xl tracking-normal leading-relaxed font-bold";
                case 'sm':
                    return isHero 
                        ? "text-xl md:text-2xl lg:text-3xl tracking-normal leading-relaxed font-black" 
                        : "text-lg md:text-xl lg:text-2xl tracking-normal leading-relaxed font-bold";
                case 'md':
                case 'normal':
                default:
                    return isHero 
                        ? "text-2xl sm:text-3xl md:text-4xl tracking-wide leading-relaxed font-black" 
                        : "text-xl sm:text-2xl md:text-3xl tracking-normal leading-relaxed font-bold";
            }
        } else {
            switch (fontSizeScale) {
                case 'huge':
                case 'xl': return isHero ? "text-xl md:text-2xl font-black" : "text-lg md:text-xl font-bold";
                case 'lg': return isHero ? "text-lg md:text-xl font-black" : "text-base md:text-lg font-bold";
                case 'xs': return isHero ? "text-xs md:text-sm font-bold" : "text-xs";
                case 'sm': return isHero ? "text-sm md:text-base font-bold" : "text-xs md:text-sm";
                case 'md':
                case 'normal':
                default: return isHero ? "text-base md:text-lg font-black" : "text-sm md:text-base font-bold";
            }
        }
    };

    const latestSentence = modalSentence || sentences[activeIndex] || sentences[revealedSentencesCount - 1] || '';

    return (
        <div className="w-full h-full flex flex-col items-center justify-start p-1 sm:p-2 max-w-full">
            {/* ══ SİNEMA / DEV EKRAN ODAK MODALI ══ */}
            {isModalOpen && latestSentence && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-2xl p-4 sm:p-6" 
                    onClick={() => {
                        stopSpeech();
                        setIsModalOpen(false);
                    }}
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="relative w-full max-w-5xl p-8 sm:p-12 md:p-16 rounded-[2.5rem] shadow-[0_0_120px_rgba(129,140,248,0.4)] flex flex-col items-center text-center border-2 border-white/25 overflow-hidden bg-slate-900/95" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-pink-900/40 pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500" />
                        
                        <div className="absolute top-6 right-6 flex items-center gap-2 z-30">
                            <button
                                type="button"
                                onClick={(e) => handleSpeakSentence(e, latestSentence, 9999)}
                                className={cn(
                                    "p-3 rounded-2xl transition-all cursor-pointer backdrop-blur-md",
                                    speakingIndex === 9999
                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 animate-pulse"
                                        : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white"
                                )}
                                title="Seslendir"
                            >
                                {speakingIndex === 9999 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                            </button>
                            <button 
                                onClick={() => {
                                    stopSpeech();
                                    setIsModalOpen(false);
                                }} 
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors cursor-pointer"
                                title="Kapat"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black uppercase tracking-wider mb-6 z-20">
                            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                            <span>Büyük Sahne Odak Modu</span>
                        </div>

                        <div className={cn("text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight py-6 sm:py-10 max-h-[65vh] overflow-y-auto drop-shadow-2xl z-20 tracking-tight scrollbar-thin scrollbar-thumb-white/20", fontClass)}>
                            {speakingIndex === 9999 ? (
                                <HighlightedSentence 
                                    htmlContent={latestSentence} 
                                    activeWordIndex={currentWordIndex} 
                                    isLightBoard={false} 
                                    className={fontClass}
                                    isModal={true}
                                />
                            ) : animationSpeed !== 'off' ? (
                                <TypewriterText 
                                    content={latestSentence} 
                                    className={fontClass}
                                    onComplete={() => onAnimationEnd?.()} 
                                    speed={animationSpeed === 'slow' ? 80 : (animationSpeed === 'fast' ? 15 : 40)} 
                                />
                            ) : (
                                <div className={fontClass} dangerouslySetInnerHTML={{ __html: latestSentence }} />
                            )}
                        </div>
                        
                        <Button 
                            size="lg" 
                            onClick={() => {
                                stopSpeech();
                                setIsModalOpen(false);
                            }} 
                            className="mt-6 h-14 px-10 text-xl font-black rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-xl shadow-purple-950/50 transform transition-transform hover:scale-105 active:scale-95 z-20 cursor-pointer"
                        >
                            Devam Et
                        </Button>
                    </motion.div>
                </div>
            )}
            
            {/* ══ BAŞLIK VE İLERLEME ÇUBUĞU (MODERN EDİTORYAL KART) ══ */}
            {(() => {
                const isLightBoard = presentationTheme === 'clean-light';
                return (
                    <div className={cn(
                        "relative z-20 rounded-2xl md:rounded-3xl border backdrop-blur-xl flex-shrink-0 w-full max-w-full overflow-hidden shadow-xl mb-3 sm:mb-4 transition-all duration-300",
                        isLightBoard 
                            ? "border-2 border-indigo-200/90 bg-white/95 py-3 px-5 sm:px-6 shadow-indigo-100/60" 
                            : "border-white/15 bg-slate-900/90 py-3.5 px-5 sm:px-6 shadow-2xl"
                    )}>
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500" />
                        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-center sm:text-left">
                                <div className={cn(
                                    "p-2.5 rounded-2xl border shadow-inner shrink-0",
                                    isLightBoard ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                                )}>
                                    <Sparkles className="h-5 w-5 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className={cn(
                                        "font-black tracking-tight text-lg sm:text-2xl md:text-3xl",
                                        isLightBoard 
                                            ? "text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-800" 
                                            : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-200 drop-shadow-md"
                                    )}>
                                        {step.title}
                                    </h2>
                                    <p className={cn("text-[11px] sm:text-xs font-medium", isLightBoard ? "text-slate-500" : "text-slate-400")}>
                                        Maddelere tıklayarak odağı değiştirebilir, hoparlör ikonuyla seslendirebilirsiniz.
                                    </p>
                                </div>
                            </div>

                            {sentences.length > 1 && (
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex flex-col items-end">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-black shadow-sm flex items-center gap-1.5",
                                            isLightBoard 
                                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200" 
                                                : "bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 shadow-indigo-950/50"
                                        )}>
                                            <Target className="w-3.5 h-3.5" />
                                            <span>{visibleSentences.length} / {sentences.length} Cümle</span>
                                        </span>
                                        <div className="w-28 sm:w-32 bg-slate-200/80 dark:bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300 rounded-full"
                                                style={{ width: `${(visibleSentences.length / sentences.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
              
            {/* ══ CÜMLE KARTLARI LİSTESİ (TAM GENİŞLİK SAĞA-SOLA YASLI) ══ */}
            <div className={cn(
                "relative w-full flex flex-col items-center", 
                isTeacher ? "pb-16 mt-1" : "pb-8 mt-1"
            )}>
                {visibleSentences.length === 0 ? (
                    <div className="w-full max-w-lg mx-auto p-8 text-center rounded-3xl bg-slate-900/60 border border-white/10 text-slate-300 backdrop-blur-xl shadow-xl">
                        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-pulse" />
                        <p className="text-base font-bold text-white">{step.title || 'İçerik'}</p>
                        <p className="text-xs text-slate-400 mt-1">Bu adımda henüz gösterilecek cümle bulunmuyor.</p>
                    </div>
                ) : (
                <div className="w-full max-w-full flex flex-col gap-2.5 sm:gap-3 md:gap-3.5 transition-all duration-300">
                    {visibleSentences.map((sentence, index) => {
                        const style = styles[index % styles.length]; 
                        const isHero = index === activeIndex;
                        const shouldAnimate = isTeacher && index === visibleSentences.length - 1 && !isSingleCardMode; 
                        const isLightBoard = presentationTheme === 'clean-light';
                        
                        return (
                            <motion.div
                                key={index}
                                ref={isHero ? scrollRef : null}
                                initial={shouldAnimate && animationSpeed !== 'off' ? { opacity: 0, y: 15, scale: 0.98 } : false}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                onClick={() => setManualFocusIndex(index)}
                                className={cn(
                                    "group relative rounded-2xl md:rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-2xl w-full",
                                    isLightBoard
                                        ? (isHero ? style.teacherHeroCard : style.teacherCalmCard)
                                        : (isHero ? style.heroCard : style.calmCard),
                                    isHero 
                                        ? "scale-[1.008] z-20" 
                                        : "hover:scale-[1.004] opacity-95 hover:opacity-100 z-10"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                                    isLightBoard ? "from-white/40 via-white/80 to-white/40" : style.heroTopLine
                                )} />
                                
                                <div className="relative p-3.5 sm:p-5 md:p-6 flex flex-col gap-2 sm:gap-3 w-full">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 md:gap-5 w-full">
                                        <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                                            <div className={cn(
                                                "w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm tracking-tight transition-all duration-300 shadow-md",
                                                isLightBoard 
                                                    ? (isHero ? style.teacherHeroBadge : style.teacherCalmBadge)
                                                    : (isHero ? style.heroBadge : style.calmBadge)
                                            )}>
                                                <span className="font-mono font-extrabold text-xs sm:text-sm">
                                                    #{index + 1}
                                                </span>
                                            </div>

                                            <div className="sm:hidden flex items-center">
                                                {isHero ? (
                                                    <div className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                                                        isLightBoard 
                                                            ? "bg-white text-slate-950 font-black shadow-md" 
                                                            : "bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full animate-ping", isLightBoard ? "bg-emerald-600" : "bg-white")} />
                                                        <span>Şimdi İnceleniyor</span>
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors backdrop-blur-md",
                                                        isLightBoard 
                                                            ? "bg-white/20 text-white border-white/30" 
                                                            : "bg-white/10 text-slate-300 border-white/15"
                                                    )}>
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                        <span>İncelendi</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="sm:hidden flex items-center gap-1 ml-auto">
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleSpeakSentence(e, sentence, index)}
                                                    title={speakingIndex === index ? "Okumayı Durdur" : "Cümleyi Sesli Oku (TTS)"}
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-all cursor-pointer backdrop-blur-md",
                                                        speakingIndex === index 
                                                            ? "bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/50 animate-bounce" 
                                                            : (isLightBoard
                                                                ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                                                                : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10")
                                                    )}
                                                >
                                                    {speakingIndex === index ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModalSentence(sentence);
                                                        setIsModalOpen(true);
                                                    }}
                                                    title="Tam Ekran Sahneye Al"
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-all cursor-pointer backdrop-blur-md",
                                                        isLightBoard
                                                            ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                                                            : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10")
                                                    }
                                                >
                                                    <Maximize2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5">
                                            <div className="hidden sm:flex items-center gap-2">
                                                {isHero ? (
                                                    <div className={cn(
                                                        "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm animate-in fade-in zoom-in-95 duration-200",
                                                        isLightBoard 
                                                            ? "bg-white text-slate-950 font-black shadow-md" 
                                                            : "bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full animate-ping", isLightBoard ? "bg-emerald-600" : "bg-white")} />
                                                        <span>Şimdi İnceleniyor</span>
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors backdrop-blur-md",
                                                        isLightBoard 
                                                            ? "bg-white/20 text-white border-white/30" 
                                                            : "bg-white/10 text-slate-300 border-white/15"
                                                    )}>
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                        <span>İncelendi</span>
                                                    </div>
                                                )}
                                                <span className={cn(
                                                    "text-[11px] font-semibold opacity-70",
                                                    isLightBoard ? "text-white/90" : "text-slate-300"
                                                )}>
                                                    Madde {index + 1} / {visibleSentences.length}
                                                </span>
                                            </div>

                                            <div className={cn(
                                                "z-10 select-text transition-colors duration-200",
                                                fontClass,
                                                getSentenceFontSize(isHero),
                                                isLightBoard 
                                                    ? (isHero ? style.teacherHeroText : style.teacherCalmText)
                                                    : (isHero ? style.heroText : style.calmText)
                                            )}>
                                                {speakingIndex === index ? (
                                                    <HighlightedSentence 
                                                        htmlContent={sentence} 
                                                        activeWordIndex={currentWordIndex} 
                                                        isLightBoard={isLightBoard} 
                                                        className={fontClass} 
                                                    />
                                                ) : shouldAnimate && animationSpeed !== 'off' ? (
                                                    <TypewriterText 
                                                        content={sentence} 
                                                        className={fontClass}
                                                        onComplete={() => onAnimationEnd?.()} 
                                                        speed={animationSpeed === 'slow' ? 80 : (animationSpeed === 'fast' ? 15 : 40)} 
                                                    />
                                                ) : (
                                                    <div className={fontClass} dangerouslySetInnerHTML={{ __html: sentence }} />
                                                )}
                                            </div>

                                            {isHero && (
                                                <div className={cn(
                                                    "mt-0.5 pt-1 border-t flex items-center justify-between text-[10px] sm:text-[11px] font-medium",
                                                    isLightBoard ? "border-white/20 text-white/80" : "border-white/10 text-slate-400"
                                                )}>
                                                    <span className="flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                                                        <span>Aktif Sunum Maddesi</span>
                                                    </span>
                                                    <span className="hidden sm:inline opacity-80">
                                                        Diğer maddelere tıklayarak geçiş yapabilirsiniz
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="hidden sm:flex items-center gap-1 shrink-0 self-center opacity-80 hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={(e) => handleSpeakSentence(e, sentence, index)}
                                                title={speakingIndex === index ? "Okumayı Durdur" : "Cümleyi Sesli Oku (TTS)"}
                                                className={cn(
                                                    "p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer backdrop-blur-md",
                                                    speakingIndex === index 
                                                        ? "bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/50 animate-bounce" 
                                                        : (isLightBoard
                                                            ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                                                            : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10")
                                                )}
                                            >
                                                {speakingIndex === index ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalSentence(sentence);
                                                    setIsModalOpen(true);
                                                }}
                                                title="Tam Ekran Sahneye Al"
                                                className={cn(
                                                    "p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer backdrop-blur-md",
                                                    isLightBoard
                                                        ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                                                        : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10")
                                                }
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                )}
            </div>
        </div>
    );
}
