'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { doc, updateDoc, addDoc, collection, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { forceStreakCheck } from '@/app/student/actions';
import {
    ADVENTURE_STAGES,
    ADVENTURE_ISLANDS,
    TOTAL_ADVENTURE_STAGES,
    MASCOT_QUOTES,
    AdventureStage,
    AdventurePlayerData,
    getPlayerRank,
    playAdventureTone,
    loadAdventurePlayerData,
    saveAdventurePlayerData,
    toCloudAdventurePayload,
    mergeAdventureProgress
} from '@/lib/elifba-adventure-data';
import {
    LearnPhaseView,
    ReinforcePhaseView,
    ExamPhaseView
} from '@/components/elifba-macera/stage-phases';
import {
    StageLauncherModal,
    ProfileAvatarModal,
    BadgesTrophyModal,
    SettingsModal,
    CertificateModal
} from '@/components/elifba-macera/modals';
import {
    Home,
    ArrowLeft,
    Volume2,
    VolumeX,
    Award,
    Trophy,
    Star,
    Sparkles,
    Lock,
    Check,
    Flame,
    Play,
    Settings,
    GraduationCap,
    Shield,
    Crown,
    MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ActiveScreen =
    | { mode: 'map' }
    | { mode: 'stage'; stageId: number; phase: 'learn' | 'reinforce' | 'exam'; roundIndex?: number };

// S-Eğrisi Kıvrımlı Yol Ofsetleri (Duolingo tarzı organik adım yerleşimi)
const WINDING_OFFSETS_DESKTOP = [0, -56, -84, -56, 0, 56, 84, 56];
const WINDING_OFFSETS_MOBILE = [0, -28, -42, -28, 0, 28, 42, 28];

export default function ElifbaMaceraPage() {
    const { user, loading: authLoading } = useAuth();

    const [playerData, setPlayerData] = useState<AdventurePlayerData>({
        name: 'Küçük Hafız',
        avatar: '🦉',
        unlockedStage: 1,
        stageStars: {},
        stageScores: {},
        stageMastered: {},
        badges: [],
        xp: 0,
        streak: 0,
        teacherFreeMode: false
    });

    const [isLoaded, setIsLoaded] = useState(false);
    const [cloudSyncStatus, setCloudSyncStatus] = useState<'guest' | 'syncing' | 'synced' | 'error'>('guest');
    const [activeIslandFilter, setActiveIslandFilter] = useState<number>(0);
    const [screen, setScreen] = useState<ActiveScreen>({ mode: 'map' });
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    // Modallar ve Uyarı Toast'ı
    const [launcherStage, setLauncherStage] = useState<AdventureStage | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
    const [lockedToast, setLockedToast] = useState<string | null>(null);

    // Maskot Hüdhüd
    const [mascotQuote, setMascotQuote] = useState(
        "Merhaba Kâşif! Her adımda önce Keşfet & Bol Tekrar, sonra Oyun, sonra Ustalık Sınavı ile ilerle! 🐥"
    );
    const [mascotBubbleOpen, setMascotBubbleOpen] = useState(true);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitializedUserRef = useRef<string | null>(null);

    // Firestore Bulut Yazma Yardımcısı (Debounce veya Anında)
    const persistToFirestore = useCallback(
        async (data: AdventurePlayerData, lastStageTitle?: string, immediate: boolean = false) => {
            if (!user?.uid) return;
            const runWrite = async () => {
                try {
                    setCloudSyncStatus('syncing');
                    const payload = toCloudAdventurePayload(data, lastStageTitle);
                    await updateDoc(doc(db, 'users', user.uid), {
                        elifbaAdventure: payload
                    });
                    setCloudSyncStatus('synced');
                } catch (err) {
                    console.warn('Firestore elifbaAdventure sync error:', err);
                    setCloudSyncStatus('error');
                }
            };

            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
            if (immediate) {
                await runWrite();
            } else {
                syncTimerRef.current = setTimeout(runWrite, 500);
            }
        },
        [user?.uid]
    );

    // Viewport takibi
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkWidth = () => setIsMobileViewport(window.innerWidth < 640);
        checkWidth();
        window.addEventListener('resize', checkWidth);
        return () => window.removeEventListener('resize', checkWidth);
    }, []);

    // Kullanıcı ve Bulut Verisi Senkronizasyonu
    useEffect(() => {
        if (authLoading) return;

        const uid = user?.uid;
        if (uid) {
            const cloudData = (user as any)?.elifbaAdventure as Partial<AdventurePlayerData> | undefined;
            const localScoped = loadAdventurePlayerData(uid, user.displayName || 'Öğrenci');
            const merged = mergeAdventureProgress(localScoped, cloudData);

            setPlayerData(merged);
            saveAdventurePlayerData(merged, uid);
            setCloudSyncStatus('synced');
            setIsLoaded(true);

            // Eğer ilk defa girişte bulutta hiç kayıt yoksa, eski sürümse veya öğretmen/yerel ilerleme öndeyse buluta yaz
            if (hasInitializedUserRef.current !== uid) {
                hasInitializedUserRef.current = uid;
                if (
                    !cloudData ||
                    cloudData.curriculumVersion !== merged.curriculumVersion ||
                    merged.xp > (cloudData.xp || 0) ||
                    merged.unlockedStage > (cloudData.unlockedStage || 1)
                ) {
                    persistToFirestore(merged, merged.lastStageTitle, true);
                }
            }
        } else {
            hasInitializedUserRef.current = null;
            const loadedGuest = loadAdventurePlayerData();
            setPlayerData(loadedGuest);
            setCloudSyncStatus('guest');
            setIsLoaded(true);

            if (typeof window !== 'undefined' && !localStorage.getItem('elifbam_adventure_player_name')) {
                setIsProfileModalOpen(true);
            }
        }
    }, [authLoading, user, persistToFirestore]);

    // Güncelleme Yardımcısı (Hem LocalStorage hem Bulut)
    const updatePlayerData = useCallback(
        (
            updater: (prev: AdventurePlayerData) => AdventurePlayerData,
            options?: { stageTitle?: string; immediateCloud?: boolean }
        ) => {
            setPlayerData(prev => {
                const next = updater(prev);
                saveAdventurePlayerData(next, user?.uid);
                if (user?.uid) {
                    persistToFirestore(next, options?.stageTitle, options?.immediateCloud ?? false);
                }
                return next;
            });
        },
        [user?.uid, persistToFirestore]
    );

    // Ses Çalma Yardımcısı
    const playAudio = useCallback(
        (audioUrl: string, customRate: number = 1.0) => {
            if (!soundEnabled || !audioUrl) return;
            try {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
                const audio = new Audio(audioUrl);
                audio.playbackRate = customRate;
                audioRef.current = audio;
                audio.play().catch(() => {
                    // Tarayıcı otomatik oynatma engeli olursa sessizce geç
                });
            } catch {
                // Hata durumunda sessiz geç
            }
        },
        [soundEnabled]
    );

    // Hesaplanan İstatistikler
    const totalStars = useMemo(() => {
        return Object.values(playerData.stageStars).reduce((acc, s) => acc + s, 0);
    }, [playerData.stageStars]);

    const maxPossibleStars = ADVENTURE_STAGES.length * 3; // 90

    const completedStagesCount = useMemo(() => {
        return ADVENTURE_STAGES.filter(st => playerData.stageMastered[st.id]?.examPassed || (playerData.stageStars[st.id] || 0) > 0).length;
    }, [playerData.stageMastered, playerData.stageStars]);

    const rank = useMemo(() => getPlayerRank(totalStars), [totalStars]);

    const visibleIslands = useMemo(() => {
        if (activeIslandFilter === 0) return ADVENTURE_ISLANDS;
        return ADVENTURE_ISLANDS.filter(isl => isl.id === activeIslandFilter);
    }, [activeIslandFilter]);

    // Kilitli Adım Uyarısı
    const showLockedMessage = (stage: AdventureStage) => {
        if (soundEnabled) playAdventureTone('wrong');
        setLockedToast(`🔒 "${stage.shortTitle}" kilidini açmak için önce Adım ${stage.id - 1}'in Ustalık Sınavını (%${ADVENTURE_STAGES[stage.id - 2]?.passingScorePercent || 80}) geçmelisin!`);
        setTimeout(() => setLockedToast(null), 3200);
    };

    // Hüdhüd Etkileşimi
    const handleMascotCheer = () => {
        if (soundEnabled) playAdventureTone('chirp');
        setMascotBubbleOpen(true);
        const q = MASCOT_QUOTES[Math.floor(Math.random() * MASCOT_QUOTES.length)];
        setMascotQuote(q);
    };

    // XP Ekleme
    const handleAddXp = useCallback(
        (amount: number) => {
            updatePlayerData(prev => ({ ...prev, xp: (prev.xp || 0) + amount }));
        },
        [updatePlayerData]
    );

    // Faz 1 Tamamlandı (aktif mini tur için)
    const handleCompleteLearn = useCallback(
        (stageId: number, roundIdx: number = 1) => {
            const stageObj = ADVENTURE_STAGES.find(s => s.id === stageId);
            updatePlayerData(
                prev => {
                    const existing = prev.stageMastered[stageId] || {
                        learnDone: false,
                        reinforceDone: false,
                        examPassed: false,
                        bestAccuracy: 0,
                        completedRounds: []
                    };
                    return {
                        ...prev,
                        xp: (prev.xp || 0) + 15,
                        stageMastered: {
                            ...prev.stageMastered,
                            [stageId]: { ...existing, learnDone: true }
                        }
                    };
                },
                { stageTitle: stageObj ? `Adım ${stageObj.id}: ${stageObj.shortTitle}` : undefined, immediateCloud: true }
            );
            setScreen({ mode: 'stage', stageId, phase: 'reinforce', roundIndex: roundIdx });
        },
        [updatePlayerData]
    );

    // Faz 2 Mini Tur Tamamlandı (tüm turlar bittiğinde reinforceDone true olur)
    const handleCompleteRound = useCallback(
        (stageId: number, roundIdx: number) => {
            const stageObj = ADVENTURE_STAGES.find(s => s.id === stageId);
            const totalRounds = Math.max(1, stageObj?.miniRounds.length || 1);
            updatePlayerData(
                prev => {
                    const existing = prev.stageMastered[stageId] || {
                        learnDone: true,
                        reinforceDone: false,
                        examPassed: false,
                        bestAccuracy: 0,
                        completedRounds: []
                    };
                    const nextRounds = Array.from(
                        new Set([...(existing.completedRounds || []), roundIdx])
                    ).sort((a, b) => a - b);
                    const allDone = existing.reinforceDone || nextRounds.length >= totalRounds;

                    return {
                        ...prev,
                        xp: (prev.xp || 0) + 20,
                        stageMastered: {
                            ...prev.stageMastered,
                            [stageId]: {
                                ...existing,
                                learnDone: true,
                                completedRounds: nextRounds,
                                reinforceDone: allDone
                            }
                        }
                    };
                },
                { stageTitle: stageObj ? `Adım ${stageObj.id}: ${stageObj.shortTitle} (Tur ${roundIdx})` : undefined, immediateCloud: true }
            );
        },
        [updatePlayerData]
    );

    // Faz 3 Ustalık Sınavı Başarısı (+ Kayıtlı Öğrenci Sistem Puanı & Seri Güncellemesi)
    const handleExamPassed = useCallback(
        (stageId: number, stars: number, accuracy: number, xpEarned: number) => {
            const stageObj = ADVENTURE_STAGES.find(s => s.id === stageId);
            const stageLabel = stageObj ? `Adım ${stageObj.id}: ${stageObj.shortTitle}` : `Adım ${stageId}`;

            updatePlayerData(
                prev => {
                    const prevStars = prev.stageStars[stageId] || 0;
                    const existingMaster = prev.stageMastered[stageId] || {
                        learnDone: true,
                        reinforceDone: true,
                        examPassed: false,
                        bestAccuracy: 0
                    };
                    const nextBadges = [...prev.badges];
                    if (stageObj?.badgeId && !nextBadges.includes(stageObj.badgeId)) {
                        nextBadges.push(stageObj.badgeId);
                    }

                    const nextUnlock = Math.min(ADVENTURE_STAGES.length, Math.max(prev.unlockedStage, stageId + 1));

                    return {
                        ...prev,
                        unlockedStage: nextUnlock,
                        xp: (prev.xp || 0) + xpEarned,
                        streak: (prev.streak || 0) + 1,
                        badges: nextBadges,
                        stageStars: {
                            ...prev.stageStars,
                            [stageId]: Math.max(stars, prevStars)
                        },
                        stageScores: {
                            ...prev.stageScores,
                            [stageId]: Math.max(accuracy, prev.stageScores[stageId] || 0)
                        },
                        stageMastered: {
                            ...prev.stageMastered,
                            [stageId]: {
                                learnDone: true,
                                reinforceDone: true,
                                examPassed: true,
                                bestAccuracy: Math.max(accuracy, existingMaster.bestAccuracy || 0)
                            }
                        }
                    };
                },
                { stageTitle: stageLabel, immediateCloud: true }
            );

            // Kayıtlı öğrenci için okul puanını & etkinlik geçmişini Firestore'a işle
            if (user?.uid) {
                const schoolPoints = Math.min(300, Math.max(20, xpEarned));
                (async () => {
                    try {
                        await Promise.all([
                            updateDoc(doc(db, 'users', user.uid), {
                                score: increment(schoolPoints)
                            }),
                            addDoc(collection(db, 'scoreEvents'), {
                                userId: user.uid,
                                points: schoolPoints,
                                gameType: 'Elifba Macerası',
                                context: `${stageLabel} (%${accuracy} Başarı • ${'⭐'.repeat(stars)})`,
                                timestamp: serverTimestamp()
                            })
                        ]);
                        await forceStreakCheck(user.uid);
                    } catch (err) {
                        console.warn('Adventure school XP update error:', err);
                    }
                })();
            }
        },
        [updatePlayerData, user?.uid]
    );

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-50 to-emerald-50 flex items-center justify-center p-6">
                <div className="bg-white px-8 py-6 rounded-3xl border-4 border-sky-200 shadow-xl text-center">
                    <div className="text-4xl mb-2 animate-bounce">🗺️</div>
                    <div className="font-black text-sky-800 text-lg">Büyük Elifba Macerası Hazırlanıyor...</div>
                </div>
            </div>
        );
    }

    const activeStageObj =
        screen.mode === 'stage'
            ? ADVENTURE_STAGES.find(s => s.id === screen.stageId) || ADVENTURE_STAGES[0]
            : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#eef8ff] via-[#f4fdf8] to-[#fffbeb] text-slate-800 font-sans pb-24 relative overflow-x-hidden select-none">
            {/* İnce Geometrik Arka Plan Dokusu */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.035]"
                style={{
                    backgroundImage: `radial-gradient(#0284c7 1.5px, transparent 1.5px), radial-gradient(#059669 1.5px, transparent 1.5px)`,
                    backgroundSize: '36px 36px',
                    backgroundPosition: '0 0, 18px 18px'
                }}
            />

            {/* ══ ÜST CAM EFEKTLİ GAMIFICATION HUD ÇUBUĞU ══ */}
            <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b-2 border-sky-200/80 shadow-sm px-3 sm:px-5 py-2.5">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
                    {/* Sol Kontroller */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {screen.mode !== 'map' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setScreen({ mode: 'map' });
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-black text-xs border-2 border-sky-200 cursor-pointer transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Haritaya Dön</span>
                            </button>
                        ) : (
                            <>
                                {user?.role === 'student' && (
                                    <Link
                                        href="/student"
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-black text-xs border-2 border-indigo-200 transition-all"
                                    >
                                        <span>🎒</span>
                                        <span className="hidden xs:inline">Öğrenci Panelim</span>
                                    </Link>
                                )}
                                <Link
                                    href="/elifba"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs border border-slate-200 transition-all"
                                >
                                    <Home className="w-4 h-4 text-emerald-600" />
                                    <span className="hidden xs:inline">Elifba Portalı</span>
                                </Link>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setSoundEnabled(s => !s)}
                            className={cn(
                                "w-9 h-9 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all",
                                soundEnabled
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                            )}
                            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (soundEnabled) playAdventureTone('click');
                                setIsSettingsModalOpen(true);
                            }}
                            className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all"
                            title="Ayarlar & Öğretmen Modu"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Sağ Oyuncu İstatistik Çubuğu */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                        {/* Kaşif Profili */}
                        <button
                            type="button"
                            onClick={() => {
                                if (soundEnabled) playAdventureTone('click');
                                setIsProfileModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 bg-white hover:bg-sky-50 border-2 border-sky-200 rounded-full px-3 py-1 shadow-sm cursor-pointer transition-all"
                            title="İsmini ve Avatarını Değiştir"
                        >
                            <span className="text-base sm:text-lg">{playerData.avatar}</span>
                            <span className="font-black text-xs sm:text-sm text-sky-950 truncate max-w-[90px] sm:max-w-[140px]">
                                {playerData.name}
                            </span>
                        </button>

                        {/* Seri */}
                        <div
                            className="hidden sm:flex items-center gap-1 bg-orange-50 border-2 border-orange-200 rounded-full px-2.5 py-1 text-xs font-black text-orange-700"
                            title="Başarılı Sınav Serisi"
                        >
                            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                            <span>{playerData.streak}</span>
                        </div>

                        {/* Yıldızlar */}
                        <div className="flex items-center gap-1 bg-amber-50 border-2 border-amber-300 rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-black text-amber-800">
                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-500" />
                            <span>
                                {totalStars}
                                <span className="text-[10px] text-amber-600/80 font-bold">/{maxPossibleStars}</span>
                            </span>
                        </div>

                        {/* XP Elmas */}
                        <div className="flex items-center gap-1 bg-purple-50 border-2 border-purple-200 rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-black text-purple-800">
                            <span>💎</span>
                            <span>{playerData.xp}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Kilitli Aşama Toast Uyarısı */}
            {lockedToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-amber-400 text-xs sm:text-sm font-black text-center animate-in fade-in slide-in-from-top-4">
                    {lockedToast}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* EKRAN 1: KIVRIMLI MACERA YOLU HARİTASI (ADVENTURE MAP)            */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {screen.mode === 'map' && (
                <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-6 space-y-6 relative z-10">
                    {/* Hero Başlık + Kaşif Kontrol Paneli */}
                    <section className="bg-white/95 rounded-[2rem] border-4 border-sky-200 shadow-[0_14px_40px_rgba(2,132,199,0.1)] p-5 sm:p-7 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                            <div className="text-center md:text-left space-y-1.5">
                                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sky-100 to-emerald-100 border border-sky-200 text-sky-900 text-xs font-black">
                                        <span>{rank.icon}</span>
                                        <span>Ünvan: {rank.title}</span>
                                        {playerData.teacherFreeMode && (
                                            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px]">
                                                Öğretmen Serbest Mod
                                            </span>
                                        )}
                                    </div>

                                    {cloudSyncStatus === 'synced' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black">
                                            <span>☁️</span>
                                            <span>Öğrenci Hesabınla Senkronize</span>
                                        </span>
                                    ) : cloudSyncStatus === 'syncing' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-black animate-pulse">
                                            <span>⏳</span>
                                            <span>Kaydediliyor...</span>
                                        </span>
                                    ) : cloudSyncStatus === 'guest' ? (
                                        <Link
                                            href="/login"
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[11px] font-bold transition-colors"
                                            title="İlerlemeni buluta ve öğretmen takibine bağlamak için giriş yap"
                                        >
                                            <span>👤 Misafir Modu • Öğrenci Girişi Yap</span>
                                        </Link>
                                    ) : null}
                                </div>
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                                    🗺️ Büyük Elifba Macerası
                                </h1>
                                <p className="text-xs sm:text-sm font-bold text-slate-500 max-w-lg">
                                    Öğretmen panelindeki <strong className="text-emerald-700">Diyanet {TOTAL_ADVENTURE_STAGES} Adım Müfredatı</strong>! Uzun adımları mini turlarla öğren,{' '}
                                    <strong className="text-sky-700">oyunla pekiştir</strong> ve{' '}
                                    <strong className="text-amber-700">ustalık sınavını</strong> geçerek sonraki adımı aç!
                                </p>

                                {/* İlerleme Çubuğu */}
                                <div className="pt-2 max-w-md mx-auto md:mx-0">
                                    <div className="flex items-center justify-between text-xs font-black text-slate-600 mb-1">
                                        <span>Genel İlerleme</span>
                                        <span className="text-emerald-600">{completedStagesCount} / {TOTAL_ADVENTURE_STAGES} Adım Tamamlandı</span>
                                    </div>
                                    <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500 rounded-full transition-all duration-700"
                                            style={{ width: `${Math.max(4, Math.round((completedStagesCount / TOTAL_ADVENTURE_STAGES) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sağ Hızlı Aksiyon Kutusu */}
                            <div className="flex flex-col gap-2.5 w-full md:w-auto shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (soundEnabled) playAdventureTone('click');
                                        const targetStage =
                                            ADVENTURE_STAGES.find(s => s.id === playerData.unlockedStage) ||
                                            ADVENTURE_STAGES[0];
                                        setLauncherStage(targetStage);
                                    }}
                                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-sm sm:text-base border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Play className="w-5 h-5 fill-white" />
                                    <span>Adım {playerData.unlockedStage}&apos;e Devam Et</span>
                                </button>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (soundEnabled) playAdventureTone('click');
                                            setIsBadgesModalOpen(true);
                                        }}
                                        className="px-3.5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-black text-xs border-2 border-purple-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                    >
                                        <Award className="w-4 h-4 text-purple-600" />
                                        <span>Rozetler ({playerData.badges.length})</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (soundEnabled) playAdventureTone('fanfare');
                                            setIsCertificateModalOpen(true);
                                        }}
                                        className="px-3.5 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-xs border-2 border-amber-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                    >
                                        <GraduationCap className="w-4 h-4 text-amber-600" />
                                        <span>Sertifikam</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5 Diyar Filtre Sekmeleri */}
                    <nav className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => {
                                if (soundEnabled) playAdventureTone('click');
                                setActiveIslandFilter(0);
                            }}
                            className={cn(
                                "px-4 py-2 rounded-2xl text-xs sm:text-sm font-black border-b-3 transition-all cursor-pointer",
                                activeIslandFilter === 0
                                    ? "bg-slate-900 text-white border-slate-950 shadow-md scale-105"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            🗺️ Tüm Yolculuk (1-{TOTAL_ADVENTURE_STAGES})
                        </button>
                        {ADVENTURE_ISLANDS.map(isl => (
                            <button
                                key={isl.id}
                                type="button"
                                onClick={() => {
                                    if (soundEnabled) playAdventureTone('click');
                                    setActiveIslandFilter(isl.id);
                                }}
                                className={cn(
                                    "px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black border-b-3 transition-all cursor-pointer flex items-center gap-1.5",
                                    activeIslandFilter === isl.id
                                        ? `bg-gradient-to-r ${isl.gradient} text-white border-black/25 shadow-md scale-105`
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <span>{isl.icon}</span>
                                <span>{isl.shortName}</span>
                            </button>
                        ))}
                    </nav>

                    {/* 5 DİYARIN KIVRIMLI S-EĞRİSİ HARİTASI */}
                    <div className="space-y-8 pb-8">
                        {visibleIslands.map(island => {
                            const stagesInIsland = ADVENTURE_STAGES.filter(s => s.islandId === island.id);
                            const islandStars = stagesInIsland.reduce(
                                (sum, s) => sum + (playerData.stageStars[s.id] || 0),
                                0
                            );
                            const islandMaxStars = stagesInIsland.length * 3;
                            const offsets = isMobileViewport ? WINDING_OFFSETS_MOBILE : WINDING_OFFSETS_DESKTOP;

                            return (
                                <section
                                    key={island.id}
                                    className="bg-white/80 backdrop-blur-sm rounded-[2.25rem] border-3 border-slate-200/80 shadow-lg overflow-hidden"
                                >
                                    {/* Diyar Başlık Banner'ı */}
                                    <div
                                        className={cn(
                                            "bg-gradient-to-r text-white p-5 sm:p-6 flex items-center justify-between gap-3 flex-wrap relative",
                                            island.gradient
                                        )}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl sm:text-3xl shadow-inner shrink-0">
                                                {island.icon}
                                            </div>
                                            <div>
                                                <h2 className="text-lg sm:text-2xl font-black tracking-tight drop-shadow-sm">
                                                    {island.name}
                                                </h2>
                                                <p className="text-white/90 text-xs sm:text-sm font-bold">
                                                    {island.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-black/20 backdrop-blur-sm border border-white/25 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-black flex items-center gap-1.5">
                                            <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                                            <span>
                                                {islandStars} / {islandMaxStars}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Kıvrımlı İstasyon Yolu */}
                                    <div className="py-8 px-4 flex flex-col items-center relative">
                                        {stagesInIsland.map((stage, idx) => {
                                            const xOffset = offsets[idx % offsets.length];
                                            const isUnlocked =
                                                playerData.teacherFreeMode || stage.id <= playerData.unlockedStage;
                                            const isCurrent = stage.id === playerData.unlockedStage;
                                            const stars = playerData.stageStars[stage.id] || 0;
                                            const master = playerData.stageMastered[stage.id];
                                            const isCompleted = master?.examPassed || stars > 0;

                                            return (
                                                <div
                                                    key={stage.id}
                                                    className="flex flex-col items-center relative"
                                                    style={{
                                                        transform: `translateX(${xOffset}px)`,
                                                        marginBottom: idx < stagesInIsland.length - 1 ? '28px' : '0px'
                                                    }}
                                                >
                                                    {/* Alt Adıma Bağlanan Kesik Yol Çizgisi */}
                                                    {idx < stagesInIsland.length - 1 && (
                                                        <div
                                                            className={cn(
                                                                "w-1.5 h-9 rounded-full absolute -bottom-8 left-1/2 -translate-x-1/2",
                                                                isCompleted ? "bg-emerald-300" : "bg-slate-200 border-x border-dashed border-slate-300"
                                                            )}
                                                        />
                                                    )}

                                                    {/* Aktif Adım Üzerindeki Zıplayan "BAŞLA!" Balonu */}
                                                    {isCurrent && (
                                                        <div className="mb-2 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md border-2 border-white animate-bounce relative z-20">
                                                            BAŞLA! 👇
                                                        </div>
                                                    )}

                                                    {/* Tamamlanan Adım Üstündeki Yıldızlar */}
                                                    {isCompleted && !isCurrent && (
                                                        <div className="mb-1.5 flex items-center gap-0.5 bg-white px-2.5 py-0.5 rounded-full border border-amber-200 shadow-sm text-xs">
                                                            {[1, 2, 3].map(s => (
                                                                <Star
                                                                    key={s}
                                                                    className={cn(
                                                                        "w-3.5 h-3.5",
                                                                        s <= stars
                                                                            ? "fill-amber-400 text-amber-500"
                                                                            : "text-slate-200 fill-slate-100"
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* 3D DOKUNMATİK İSTASYON BUTONU (NODE PEDESTAL) */}
                                                    <div className="relative flex items-center justify-center">
                                                        {isCurrent && (
                                                            <div className="absolute -inset-2.5 rounded-[2rem] bg-amber-400/35 animate-ping pointer-events-none" />
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!isUnlocked) {
                                                                    showLockedMessage(stage);
                                                                    return;
                                                                }
                                                                if (soundEnabled) playAdventureTone('click');
                                                                setLauncherStage(stage);
                                                            }}
                                                            className={cn(
                                                                "w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] border-b-[7px] flex flex-col items-center justify-center relative transition-all cursor-pointer active:border-b-0 active:translate-y-1.5 z-10",
                                                                !isUnlocked
                                                                    ? "bg-slate-200 border-slate-300 text-slate-400 hover:bg-slate-200"
                                                                    : isCurrent
                                                                    ? "bg-gradient-to-b from-amber-400 to-orange-500 border-orange-700 text-white shadow-xl ring-4 ring-white"
                                                                    : isCompleted
                                                                    ? "bg-gradient-to-b from-emerald-400 to-teal-600 border-emerald-800 text-white shadow-lg"
                                                                    : `${island.nodeBg} text-white shadow-md`
                                                            )}
                                                        >
                                                            {!isUnlocked ? (
                                                                <>
                                                                    <Lock className="w-7 h-7 text-slate-400 mb-0.5" />
                                                                    <span className="text-[11px] font-black text-slate-500">
                                                                        Adım {stage.id}
                                                                    </span>
                                                                </>
                                                            ) : stage.isGate ? (
                                                                <>
                                                                    {stage.id === TOTAL_ADVENTURE_STAGES ? (
                                                                        <Crown className="w-8 h-8 drop-shadow mb-0.5" />
                                                                    ) : (
                                                                        <Shield className="w-8 h-8 drop-shadow mb-0.5" />
                                                                    )}
                                                                    <span className="text-[11px] font-black tracking-wide">
                                                                        ADIM {stage.id}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="text-2xl sm:text-3xl leading-none mb-0.5">
                                                                        {stage.badgeIcon}
                                                                    </span>
                                                                    <span className="text-xs font-black tracking-wide">
                                                                        Adım {stage.id}
                                                                    </span>
                                                                </>
                                                            )}

                                                            {/* Tamamlandı Tik Rozeti */}
                                                            {isCompleted && (
                                                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 border-2 border-white text-slate-950 flex items-center justify-center shadow">
                                                                    <Check className="w-4 h-4 stroke-[3]" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Başlık ve 3 Faz Durum Noktaları */}
                                                    <div className="mt-2.5 text-center max-w-[165px]">
                                                        <div
                                                            className={cn(
                                                                "inline-block px-3 py-1 rounded-xl text-xs font-black shadow-sm border",
                                                                isUnlocked
                                                                    ? isCurrent
                                                                        ? "bg-amber-50 border-amber-300 text-amber-950"
                                                                        : "bg-white border-slate-200 text-slate-800"
                                                                    : "bg-slate-100 border-slate-200 text-slate-400"
                                                            )}
                                                        >
                                                            {stage.shortTitle}
                                                        </div>

                                                        {/* 3 Mini Faz Noktası: Keşfet • Pekiştir • Sınav */}
                                                        {isUnlocked && (
                                                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                                                <span
                                                                    title="1. Keşfet & Tekrar"
                                                                    className={cn(
                                                                        "w-2.5 h-2.5 rounded-full",
                                                                        master?.learnDone ? "bg-sky-500" : "bg-slate-200"
                                                                    )}
                                                                />
                                                                <span
                                                                    title="2. Pekiştirme Oyunu"
                                                                    className={cn(
                                                                        "w-2.5 h-2.5 rounded-full",
                                                                        master?.reinforceDone ? "bg-emerald-500" : "bg-slate-200"
                                                                    )}
                                                                />
                                                                <span
                                                                    title="3. Ustalık Sınavı"
                                                                    className={cn(
                                                                        "w-2.5 h-2.5 rounded-full",
                                                                        master?.examPassed ? "bg-amber-500" : "bg-slate-200"
                                                                    )}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </main>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* EKRAN 2: 3 FAZLI AKTİF ÖĞRENME & SINAV ARENASI                    */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {screen.mode === 'stage' && activeStageObj && (() => {
                const activeCompletedRounds =
                    playerData.stageMastered[activeStageObj.id]?.completedRounds || [];
                const defaultRound =
                    activeStageObj.miniRounds.find(
                        mr => !activeCompletedRounds.includes(mr.roundIndex)
                    )?.roundIndex || 1;
                const activeRoundIndex = screen.roundIndex || defaultRound;

                return (
                    <main className="pt-5 relative z-10">
                        {screen.phase === 'learn' && (
                            <LearnPhaseView
                                stage={activeStageObj}
                                roundIndex={activeRoundIndex}
                                completedRounds={activeCompletedRounds}
                                soundEnabled={soundEnabled}
                                teacherFreeMode={playerData.teacherFreeMode}
                                playAudio={playAudio}
                                onAddXp={handleAddXp}
                                onBackToMap={() => setScreen({ mode: 'map' })}
                                onSelectRound={r =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'learn',
                                        roundIndex: r
                                    })
                                }
                                onCompleteLearn={rIdx => handleCompleteLearn(activeStageObj.id, rIdx)}
                                onSkipToExam={() =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'exam'
                                    })
                                }
                                onMascotMessage={msg => {
                                    setMascotQuote(msg);
                                    setMascotBubbleOpen(true);
                                }}
                            />
                        )}

                        {screen.phase === 'reinforce' && (
                            <ReinforcePhaseView
                                stage={activeStageObj}
                                roundIndex={activeRoundIndex}
                                completedRounds={activeCompletedRounds}
                                teacherFreeMode={playerData.teacherFreeMode}
                                soundEnabled={soundEnabled}
                                playAudio={playAudio}
                                onAddXp={handleAddXp}
                                onBackToMap={() => setScreen({ mode: 'map' })}
                                onBackToLearn={() =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'learn',
                                        roundIndex: activeRoundIndex
                                    })
                                }
                                onSelectRound={r =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'reinforce',
                                        roundIndex: r
                                    })
                                }
                                onCompleteRound={rIdx => handleCompleteRound(activeStageObj.id, rIdx)}
                                onNextRound={nextR =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'learn',
                                        roundIndex: nextR
                                    })
                                }
                                onProceedToExam={() =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'exam'
                                    })
                                }
                                onMascotMessage={msg => {
                                    setMascotQuote(msg);
                                    setMascotBubbleOpen(true);
                                }}
                            />
                        )}

                        {screen.phase === 'exam' && (
                            <ExamPhaseView
                                stage={activeStageObj}
                                hasNextStage={activeStageObj.id < ADVENTURE_STAGES.length}
                                soundEnabled={soundEnabled}
                                playAudio={playAudio}
                                onBackToMap={() => setScreen({ mode: 'map' })}
                                onRetryLearn={() =>
                                    setScreen({
                                        mode: 'stage',
                                        stageId: activeStageObj.id,
                                        phase: 'learn',
                                        roundIndex: 1
                                    })
                                }
                                onExamPassed={(stars, acc, xp) =>
                                    handleExamPassed(activeStageObj.id, stars, acc, xp)
                                }
                                onProceedNextStage={() => {
                                    const nextId = Math.min(
                                        ADVENTURE_STAGES.length,
                                        activeStageObj.id + 1
                                    );
                                    setScreen({
                                        mode: 'stage',
                                        stageId: nextId,
                                        phase: 'learn',
                                        roundIndex: 1
                                    });
                                }}
                                onOpenCertificate={() => {
                                    setScreen({ mode: 'map' });
                                    setIsCertificateModalOpen(true);
                                }}
                                onMascotMessage={msg => {
                                    setMascotQuote(msg);
                                    setMascotBubbleOpen(true);
                                }}
                            />
                        )}
                    </main>
                );
            })()}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* SEVİMLİ MASKOT HÜDHÜD (🐥) — DOKUNMATİK DOSTU                      */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end pointer-events-none">
                {mascotBubbleOpen && (
                    <div
                        onClick={() => setMascotBubbleOpen(false)}
                        className="pointer-events-auto cursor-pointer bg-white border-3 border-amber-400 rounded-2xl px-3.5 py-2.5 max-w-[230px] sm:max-w-[260px] shadow-xl text-xs font-extrabold text-amber-950 mb-2 relative animate-in fade-in slide-in-from-bottom-2"
                        title="Gizlemek için tıkla"
                    >
                        <div>{mascotQuote}</div>
                        <div className="text-[10px] text-amber-600/80 font-bold mt-1 text-right">
                            Kapatmak için dokun ✕
                        </div>
                        <div className="absolute -bottom-2 right-6 w-3 h-3 bg-white border-r-3 border-b-3 border-amber-400 transform rotate-45" />
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleMascotCheer}
                    title="Hüdhüd'e dokun!"
                    className="pointer-events-auto cursor-pointer relative transform hover:scale-110 active:scale-95 transition-transform"
                >
                    <svg className="w-14 h-14 sm:w-18 sm:h-18 drop-shadow-lg" viewBox="0 0 100 100">
                        <ellipse cx="50" cy="94" rx="32" ry="6" fill="rgba(0,0,0,0.15)" />
                        <ellipse cx="50" cy="56" rx="34" ry="34" fill="#fbbf24" />
                        <ellipse cx="50" cy="62" rx="26" ry="24" fill="#fef3c7" />
                        <path d="M48 24 C45 10 38 4 36 2 C44 4 52 14 50 24" fill="#f97316" />
                        <path d="M52 24 C55 10 62 4 64 2 C56 4 48 14 50 24" fill="#f59e0b" />
                        <path d="M50 22 C50 6 52 0 50 0 C48 0 50 6 50 22" fill="#fbbf24" />
                        <circle cx="38" cy="46" r="7" fill="#ffffff" />
                        <circle cx="39" cy="46" r="4.5" fill="#1e293b" />
                        <circle cx="41" cy="44" r="2" fill="#ffffff" />
                        <circle cx="62" cy="46" r="7" fill="#ffffff" />
                        <circle cx="61" cy="46" r="4.5" fill="#1e293b" />
                        <circle cx="63" cy="44" r="2" fill="#ffffff" />
                        <circle cx="30" cy="56" r="4" fill="#f87171" opacity="0.6" />
                        <circle cx="70" cy="56" r="4" fill="#f87171" opacity="0.6" />
                        <polygon points="45,52 55,52 50,65" fill="#ea580c" />
                        <path d="M18 52 Q10 65 20 74 Q24 64 24 55 Z" fill="#d97706" />
                        <path d="M82 52 Q90 65 80 74 Q76 64 76 55 Z" fill="#d97706" />
                        <ellipse cx="40" cy="88" rx="5" ry="3" fill="#ea580c" />
                        <ellipse cx="60" cy="88" rx="5" ry="3" fill="#ea580c" />
                    </svg>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-900 text-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-400 whitespace-nowrap shadow-sm">
                        Hüdhüd 🐥
                    </div>
                </button>
            </div>

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* MODALLAR                                                          */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            <StageLauncherModal
                stage={launcherStage}
                playerData={playerData}
                onClose={() => setLauncherStage(null)}
                onLaunchPhase={(stageId, phase, roundIndex) => {
                    setLauncherStage(null);
                    setScreen({ mode: 'stage', stageId, phase, roundIndex });
                }}
            />

            <ProfileAvatarModal
                open={isProfileModalOpen}
                currentName={playerData.name}
                currentAvatar={playerData.avatar}
                totalStars={totalStars}
                onClose={() => setIsProfileModalOpen(false)}
                onSave={(name, avatar) => {
                    if (soundEnabled) playAdventureTone('click');
                    updatePlayerData(prev => ({ ...prev, name, avatar }));
                    setIsProfileModalOpen(false);
                    setMascotQuote(`Harika ${name}! Macera yolculuğuna hazır mısın? 🚀`);
                    setMascotBubbleOpen(true);
                }}
            />

            <BadgesTrophyModal
                open={isBadgesModalOpen}
                earnedBadges={playerData.badges}
                onClose={() => setIsBadgesModalOpen(false)}
            />

            <SettingsModal
                open={isSettingsModalOpen}
                soundEnabled={soundEnabled}
                teacherFreeMode={playerData.teacherFreeMode}
                onToggleSound={() => setSoundEnabled(s => !s)}
                onToggleTeacherFreeMode={() => {
                    if (soundEnabled) playAdventureTone('click');
                    updatePlayerData(prev => ({ ...prev, teacherFreeMode: !prev.teacherFreeMode }));
                }}
                onResetProgress={() => {
                    if (confirm("Tüm yıldızlar, puanlar, rozetler ve ilerleme sıfırlanacak. Emin misiniz?")) {
                        updatePlayerData(prev => ({
                            ...prev,
                            unlockedStage: 1,
                            stageStars: {},
                            stageScores: {},
                            stageMastered: {},
                            badges: [],
                            xp: 0,
                            streak: 0,
                            teacherFreeMode: false
                        }));
                        setIsSettingsModalOpen(false);
                        setScreen({ mode: 'map' });
                    }
                }}
                onClose={() => setIsSettingsModalOpen(false)}
            />

            <CertificateModal
                open={isCertificateModalOpen}
                playerData={playerData}
                totalStars={totalStars}
                completedStagesCount={completedStagesCount}
                onClose={() => setIsCertificateModalOpen(false)}
            />

            {/* Global Titreme & Yazdırma Stilleri */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-7px); }
                    40%, 80% { transform: translateX(7px); }
                }
                .animate-shake {
                    animation: shake 0.38s ease-in-out;
                }
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-certificate-sheet,
                    #printable-certificate-sheet * {
                        visibility: visible !important;
                    }
                    #printable-certificate-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
