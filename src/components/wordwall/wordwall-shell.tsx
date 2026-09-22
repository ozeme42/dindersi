'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { getGameBackUrl } from '@/lib/game-navigation';
import { cn } from '@/lib/utils';
import { WORDWALL_THEMES } from './wordwall-themes';
import { WordwallThemeId, WordwallThemeConfig, WordwallShellProps } from './wordwall-types';
import { 
    ArrowLeft, Volume2, VolumeX, Maximize2, Minimize2, 
    Clock, Heart, Trophy, Sparkles, Palette, HelpCircle
} from 'lucide-react';
import { playSound } from '@/lib/audio-service';

export interface WordwallContextValue {
    theme: WordwallThemeConfig;
    themeId: WordwallThemeId;
    setThemeId: (id: WordwallThemeId) => void;
    soundEnabled: boolean;
    toggleSound: () => void;
    isFullscreen: boolean;
    toggleFullscreen: () => void;
}

export const WordwallContext = React.createContext<WordwallContextValue | null>(null);

export function useWordwall() {
    const ctx = React.useContext(WordwallContext);
    if (!ctx) {
        return {
            theme: WORDWALL_THEMES.gameshow,
            themeId: 'gameshow' as WordwallThemeId,
            setThemeId: () => {},
            soundEnabled: true,
            toggleSound: () => {},
            isFullscreen: false,
            toggleFullscreen: () => {},
        };
    }
    return ctx;
}

export function WordwallShell({
    title,
    subtitle,
    currentQuestionIndex,
    totalQuestions,
    score,
    lives,
    maxLives = 3,
    timeLeft,
    maxTime,
    onTimeUp,
    onBack,
    backUrl,
    children,
    toolbarExtra,
    className,
    contentClassName,
    isFinished = false,
    showTimer = true,
    showProgress = true,
    fitToScreen = false,
    hideFooterOnFullscreen = true,
}: WordwallShellProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);

    // Tema Durumu (localStorage kalıcı)
    const [themeId, setThemeId] = useState<WordwallThemeId>('gameshow');
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);

    // İlk yüklemede kullanıcı tercihlerini oku
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('wordwall_theme') as WordwallThemeId;
            if (savedTheme && WORDWALL_THEMES[savedTheme]) {
                setThemeId(savedTheme);
            }
            const savedSound = localStorage.getItem('wordwall_sound');
            if (savedSound !== null) {
                setSoundEnabled(savedSound === 'true');
            }
        } catch (e) {
            console.warn('Wordwall shell preferences load error:', e);
        }
    }, []);

    // Tam Ekran Dinleyicisi
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Menü dışına tıklanınca tema dropdown'ını kapat
    useEffect(() => {
        if (!isThemeMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.wordwall-theme-dropdown')) {
                setIsThemeMenuOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isThemeMenuOpen]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            const el = containerRef.current || document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(() => {});
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    };

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        try {
            localStorage.setItem('wordwall_sound', String(next));
        } catch (e) {}
        if (next) {
            playSound('pop');
        }
    };

    const handleSelectTheme = (id: WordwallThemeId) => {
        setThemeId(id);
        try {
            localStorage.setItem('wordwall_theme', id);
        } catch (e) {}
        playSound('pop');
    };

    const handleBack = () => {
        if (soundEnabled) playSound('pop');
        if (onBack) {
            onBack();
        } else {
            const target = getGameBackUrl({
                user,
                searchParams,
                defaultBackUrl: backUrl || '/oyunlar',
            });
            router.push(target);
        }
    };

    const theme = WORDWALL_THEMES[themeId] || WORDWALL_THEMES.gameshow;

    // Süre Formatı (Örn: 25 -> 00:25)
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isTimeUrgent = timeLeft !== undefined && timeLeft <= 5 && timeLeft > 0;

    return (
        <WordwallContext.Provider value={{ theme, themeId, setThemeId: handleSelectTheme, soundEnabled, toggleSound, isFullscreen, toggleFullscreen }}>
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full flex flex-col justify-between transition-colors duration-300 select-none",
                    fitToScreen ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-[100dvh] overflow-x-hidden",
                    theme.wrapper,
                    className
                )}
                style={theme.stageOverlay ? { backgroundImage: theme.stageOverlay } : undefined}
            >
            {/* ═══ 1. ÜST DURUM ÇUBUĞU (HEADER) ═══ */}
            <header className={cn(
                "sticky top-0 z-40 w-full px-3 py-2 sm:px-5 sm:py-3 flex items-center justify-between gap-2 md:gap-4 transition-all flex-shrink-0",
                theme.headerBg,
                theme.headerBorder
            )}>
                {/* Sol: Geri Butonu + Oyun & Konu Başlığı */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={handleBack}
                        className={cn(
                            "p-2 sm:p-2.5 rounded-xl border-2 transition-transform active:scale-90 flex-shrink-0 flex items-center justify-center cursor-pointer",
                            theme.buttonIdle
                        )}
                        title="Geri Dön"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xs sm:text-base md:text-lg font-black tracking-tight truncate flex items-center gap-1.5">
                            <span>{title}</span>
                        </h1>
                        {subtitle && (
                            <span className="text-[10px] sm:text-xs opacity-75 font-semibold truncate">
                                {subtitle}
                            </span>
                        )}
                    </div>
                </div>

                {/* Orta: Soru Sayacı & Süre (Masaüstü & Geniş Ekranlar) */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Soru İlerlemesi */}
                    {showProgress && currentQuestionIndex !== undefined && totalQuestions !== undefined && (
                        <div className={cn(
                            "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm",
                            theme.badgeCounter
                        )}>
                            <span className="opacity-75 text-[10px] sm:text-xs">Soru</span>
                            <span className="font-mono text-sm sm:text-base font-black">
                                {currentQuestionIndex + 1} / {totalQuestions}
                            </span>
                        </div>
                    )}

                    {/* Geri Sayım / Kronometre */}
                    {showTimer && timeLeft !== undefined && (
                        <div className={cn(
                            "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border font-mono font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm",
                            isTimeUrgent ? theme.timerWarningBadge : theme.timerBadge
                        )}>
                            <Clock className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isTimeUrgent && "animate-spin")} />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}

                    {/* Canlar (Lives) */}
                    {lives !== undefined && (
                        <div className={cn("flex items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border", theme.livesContainer)}>
                            {Array.from({ length: maxLives }).map((_, i) => (
                                <Heart
                                    key={i}
                                    className={cn(
                                        "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all",
                                        i < lives ? "text-rose-500 fill-rose-500 animate-pulse" : theme.livesHeartInactive
                                    )}
                                />
                            ))}
                        </div>
                    )}

                    {/* Puan / Skor */}
                    {score !== undefined && (
                        <div className={cn(
                            "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm",
                            theme.scoreBadge
                        )}>
                            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                            <span className="font-mono font-black">{score}</span>
                        </div>
                    )}
                </div>

                {/* Sağ: Ses & Tam Ekran Araçları */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {/* Tam ekrandayken hızlı tema / renk değiştirici (alttaki bar gizlendiğinde renk seçebilmek için) */}
                    {isFullscreen && (
                        <div className="relative wordwall-theme-dropdown">
                            <button
                                type="button"
                                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                                className={cn(
                                    "p-2 sm:p-2.5 rounded-xl border-2 transition-transform active:scale-90 flex items-center justify-center cursor-pointer",
                                    isThemeMenuOpen ? theme.buttonSelected : theme.buttonIdle
                                )}
                                title="Temayı / Rengi Değiştir"
                            >
                                <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                            </button>

                            {isThemeMenuOpen && (
                                <div className={cn(
                                    "absolute right-0 top-full mt-2 p-2 rounded-2xl border shadow-2xl z-50 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 backdrop-blur-2xl",
                                    theme.subPanelBg,
                                    theme.cardBorder
                                )}>
                                    <span className="text-[10px] font-black opacity-60 px-2 py-1 uppercase tracking-wider">Temalar</span>
                                    {Object.values(WORDWALL_THEMES).map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => {
                                                handleSelectTheme(t.id);
                                                setIsThemeMenuOpen(false);
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer",
                                                t.id === themeId ? cn(theme.activeThemePill, "shadow-sm") : "opacity-75 hover:opacity-100 hover:bg-white/10"
                                            )}
                                        >
                                            <span>{t.icon}</span>
                                            <span>{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={toggleSound}
                        className={cn(
                            "p-2 sm:p-2.5 rounded-xl border-2 transition-transform active:scale-90 flex items-center justify-center cursor-pointer",
                            theme.buttonIdle
                        )}
                        title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
                    >
                        {soundEnabled ? (
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                        ) : (
                            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={cn(
                            "p-2 sm:p-2.5 rounded-xl border-2 transition-transform active:scale-90 flex items-center justify-center cursor-pointer",
                            theme.buttonIdle
                        )}
                        title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </button>
                </div>
            </header>

            {/* İlerleme Çubuğu */}
            {showProgress && currentQuestionIndex !== undefined && totalQuestions !== undefined && totalQuestions > 0 && (
                <div className={cn("w-full h-1 sm:h-1.5 overflow-hidden flex-shrink-0", theme.progressTrack)}>
                    <div
                        className={cn("h-full transition-all duration-300", theme.progressBar)}
                        style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                    />
                </div>
            )}

            {/* ═══ 2. OYUN ANA SAHNESİ (STAGE) ═══ */}
            <main className={cn(
                "flex-1 flex flex-col items-center justify-center w-full transition-all",
                fitToScreen ? "min-h-0 overflow-hidden max-w-none p-1.5 sm:p-3 md:p-4" : "max-w-5xl mx-auto p-3 sm:p-6 md:p-8",
                contentClassName
            )}>
                {children}
            </main>

            {/* ═══ 3. ALT WORDWALL KONTROL DOCK'U (TEMALAR & ŞABLON DEĞİŞTİRME) ═══ */}
            {!isFinished && (!isFullscreen || !hideFooterOnFullscreen) && (
                <footer className={cn(
                    "w-full px-3 py-2 sm:px-6 sm:py-2.5 transition-all z-30 flex-shrink-0",
                    theme.footerBg,
                    theme.footerBorder
                )}>
                    <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                        {/* Sol: Tema Seçici Çubuğu */}
                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 max-w-full no-scrollbar">
                            <span className="text-[11px] sm:text-xs font-bold opacity-60 flex items-center gap-1 mr-1 flex-shrink-0">
                                <Palette className="w-3.5 h-3.5" /> Tema:
                            </span>

                            {Object.values(WORDWALL_THEMES).map((t) => {
                                const isActive = t.id === themeId;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSelectTheme(t.id)}
                                        className={cn(
                                            "flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all border flex-shrink-0 cursor-pointer",
                                            isActive
                                                ? cn(theme.activeThemePill, "scale-105")
                                                : cn(theme.themePillIdle, "opacity-80 hover:opacity-100")
                                        )}
                                        title={t.description}
                                    >
                                        <span>{t.icon}</span>
                                        <span className="hidden xs:inline">{t.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sağ: Ek Araçlar (varsa) */}
                        {toolbarExtra && (
                            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                                {toolbarExtra}
                            </div>
                        )}
                    </div>
                </footer>
            )}
            </div>
        </WordwallContext.Provider>
    );
}
