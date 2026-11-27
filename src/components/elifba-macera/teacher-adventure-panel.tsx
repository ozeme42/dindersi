'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    ADVENTURE_STAGES,
    ADVENTURE_ISLANDS,
    getPlayerRank,
    computeAdventureStats,
    toCloudAdventurePayload,
    type AdventurePlayerData
} from '@/lib/elifba-adventure-data';
import type { UserProfile } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Star,
    Trophy,
    Sparkles,
    CheckCircle2,
    Lock,
    Unlock,
    BookOpen,
    Gamepad2,
    Search,
    Users,
    Award,
    ExternalLink,
    Clock,
    ShieldCheck,
    Loader2,
    Crown,
    X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// 1. TEKİL ÖĞRENCİ DETAYLI ELİFBA MACERASI KARTI (24 ADIM + ÖĞRETMEN ONAYI)
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherStudentAdventureCard({
    student,
    ambianceTheme = 'light',
    onStudentUpdated
}: {
    student: UserProfile;
    ambianceTheme?: 'light' | 'dark';
    onStudentUpdated?: (uid: string, nextAdv: NonNullable<UserProfile['elifbaAdventure']>) => void;
}) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const rawAdv = student.elifbaAdventure;
    const stats = useMemo(() => computeAdventureStats(rawAdv), [rawAdv]);
    const rank = useMemo(() => getPlayerRank(stats.totalStars), [stats.totalStars]);

    const unlockedStage = rawAdv?.unlockedStage || 1;
    const currentStageObj = ADVENTURE_STAGES.find(s => s.id === unlockedStage) || ADVENTURE_STAGES[0];
    const currentStageMaster = rawAdv?.stageMastered?.[unlockedStage];

    const isDark = ambianceTheme === 'dark';

    // Öğretmenin tek tıkla adım onaylaması / kilidi açması (Firestore rules isTeacher izniyle)
    const handleTeacherToggleStage = async (stageId: number) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const baseData: AdventurePlayerData = {
                name: rawAdv?.name || student.displayName || 'Öğrenci',
                avatar: rawAdv?.avatar || '🦉',
                unlockedStage: rawAdv?.unlockedStage || 1,
                stageStars: { ...(rawAdv?.stageStars || {}) },
                stageScores: { ...(rawAdv?.stageScores || {}) },
                stageMastered: { ...(rawAdv?.stageMastered || {}) },
                badges: [...(rawAdv?.badges || [])],
                xp: rawAdv?.xp || 0,
                streak: rawAdv?.streak || 0,
                teacherFreeMode: Boolean(rawAdv?.teacherFreeMode),
                lastStageTitle: rawAdv?.lastStageTitle,
                lastActivityAt: rawAdv?.lastActivityAt
            };

            const alreadyPassed = baseData.stageMastered[stageId]?.examPassed;
            const stageObj = ADVENTURE_STAGES.find(s => s.id === stageId);

            if (alreadyPassed) {
                // Onayı kaldır (geriye alma)
                delete baseData.stageMastered[stageId];
                delete baseData.stageStars[stageId];
                delete baseData.stageScores[stageId];
                if (stageObj) {
                    baseData.badges = baseData.badges.filter(b => b !== stageObj.badgeId);
                }
            } else {
                // Öğretmen tarafından sınıfta başarılı sayılarak onayla + sıradakini aç
                baseData.stageMastered[stageId] = {
                    learnDone: true,
                    reinforceDone: true,
                    examPassed: true,
                    bestAccuracy: 100
                };
                baseData.stageStars[stageId] = Math.max(3, baseData.stageStars[stageId] || 0);
                baseData.stageScores[stageId] = Math.max(100, baseData.stageScores[stageId] || 0);
                baseData.unlockedStage = Math.min(24, Math.max(baseData.unlockedStage, stageId + 1));
                if (stageObj && !baseData.badges.includes(stageObj.badgeId)) {
                    baseData.badges.push(stageObj.badgeId);
                }
            }

            const payload = toCloudAdventurePayload(
                baseData,
                stageObj ? `Adım ${stageObj.id}: ${stageObj.shortTitle} (Öğretmen)` : undefined
            );

            await updateDoc(doc(db, 'users', student.uid), {
                elifbaAdventure: payload
            });

            onStudentUpdated?.(student.uid, payload);
            toast({
                title: alreadyPassed ? 'Adım Onayı Kaldırıldı' : 'Adım Onaylandı ✅',
                description: `${student.displayName} için Adım ${stageId} güncellendi.`
            });
        } catch (e: any) {
            console.error('Teacher adventure update error:', e);
            toast({
                title: 'Güncelleme Hatası',
                description: e?.message || 'Firestore kaydı güncellenemedi.',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleTeacherFreeMode = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const baseData: AdventurePlayerData = {
                name: rawAdv?.name || student.displayName || 'Öğrenci',
                avatar: rawAdv?.avatar || '🦉',
                unlockedStage: rawAdv?.unlockedStage || 1,
                stageStars: { ...(rawAdv?.stageStars || {}) },
                stageScores: { ...(rawAdv?.stageScores || {}) },
                stageMastered: { ...(rawAdv?.stageMastered || {}) },
                badges: [...(rawAdv?.badges || [])],
                xp: rawAdv?.xp || 0,
                streak: rawAdv?.streak || 0,
                teacherFreeMode: !Boolean(rawAdv?.teacherFreeMode),
                lastStageTitle: rawAdv?.lastStageTitle,
                lastActivityAt: rawAdv?.lastActivityAt
            };
            const payload = toCloudAdventurePayload(baseData);
            await updateDoc(doc(db, 'users', student.uid), {
                elifbaAdventure: payload
            });
            onStudentUpdated?.(student.uid, payload);
            toast({
                title: payload.teacherFreeMode ? 'Serbest Keşif Açıldı 🔓' : 'Aşamalı Kilit Aktif 🔒',
                description: payload.teacherFreeMode
                    ? `${student.displayName} artık tüm 24 adıma serbestçe girebilir.`
                    : `${student.displayName} artık adım adım sınavla ilerleyecek.`
            });
        } catch (e: any) {
            toast({ title: 'Hata', description: e?.message || 'İşlem başarısız.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card
            className={cn(
                'overflow-hidden border transition-all',
                isDark
                    ? 'bg-slate-900/90 border-white/10 text-white'
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            )}
        >
            <CardHeader className={cn('pb-4 border-b', isDark ? 'border-white/10' : 'border-slate-100')}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                            {rawAdv?.avatar || '🗺️'}
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 flex-wrap">
                                <span>Büyük Elifba Macerası (24 Adım)</span>
                                <Badge
                                    className={cn(
                                        'text-[11px] font-black',
                                        rawAdv
                                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                            : isDark
                                            ? 'bg-white/10 text-slate-300 border-white/15'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                    )}
                                >
                                    {rawAdv ? `${rank.icon} ${rank.title}` : 'Henüz Başlamadı'}
                                </Badge>
                            </CardTitle>
                            <CardDescription className={cn('text-xs font-medium mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                                {rawAdv?.lastActivityAt ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Son çalışma:{' '}
                                        {formatDistanceToNow(new Date(rawAdv.lastActivityAt), { addSuffix: true, locale: tr })}
                                        {rawAdv.lastStageTitle ? ` (${rawAdv.lastStageTitle})` : ''}
                                    </span>
                                ) : (
                                    'Öğrenci hesabıyla /elifba/macera üzerinden çalıştıkça burası otomatik güncellenir.'
                                )}
                            </CardDescription>
                        </div>
                    </div>

                    {/* Öğretmen Serbest Modu Anahtarı */}
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        onClick={handleToggleTeacherFreeMode}
                        className={cn(
                            'rounded-xl text-xs font-black gap-1.5 cursor-pointer shrink-0',
                            rawAdv?.teacherFreeMode
                                ? 'bg-amber-500/15 border-amber-400/50 text-amber-600 hover:bg-amber-500/25'
                                : isDark
                                ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        )}
                        title="Bu öğrencinin kilitli adımlara da serbestçe erişmesine izin ver"
                    >
                        {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : rawAdv?.teacherFreeMode ? (
                            <Unlock className="w-3.5 h-3.5" />
                        ) : (
                            <Lock className="w-3.5 h-3.5" />
                        )}
                        <span>{rawAdv?.teacherFreeMode ? 'Serbest Erişim Açık' : 'Aşamalı Kilitli'}</span>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
                {/* Özet İstatistik Kutuları */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className={cn('rounded-2xl p-3 border', isDark ? 'bg-white/5 border-white/10' : 'bg-emerald-50/70 border-emerald-200')}>
                        <div className="text-[11px] font-bold opacity-75">Tamamlanan Adım</div>
                        <div className="text-xl font-black text-emerald-600">
                            {stats.completedCount} <span className="text-xs opacity-70">/ 24</span>
                        </div>
                    </div>
                    <div className={cn('rounded-2xl p-3 border', isDark ? 'bg-white/5 border-white/10' : 'bg-amber-50/70 border-amber-200')}>
                        <div className="text-[11px] font-bold opacity-75">Toplam Yıldız</div>
                        <div className="text-xl font-black text-amber-500">
                            ⭐ {stats.totalStars} <span className="text-xs opacity-70">/ {stats.maxStars}</span>
                        </div>
                    </div>
                    <div className={cn('rounded-2xl p-3 border', isDark ? 'bg-white/5 border-white/10' : 'bg-sky-50/70 border-sky-200')}>
                        <div className="text-[11px] font-bold opacity-75">Bulunduğu Adım</div>
                        <div className="text-sm font-black text-sky-600 truncate mt-0.5">
                            Adım {unlockedStage}: {currentStageObj.shortTitle}
                        </div>
                        <div className="text-[10px] font-bold opacity-70 mt-0.5">
                            {currentStageMaster?.examPassed
                                ? 'Tamamlandı ✅'
                                : currentStageMaster?.reinforceDone
                                ? 'Sınav Aşamasında 🏆'
                                : currentStageMaster?.learnDone
                                ? 'Pekiştirme Oyununda 🎮'
                                : 'Keşfet & Tekrarda 📖'}
                        </div>
                    </div>
                    <div className={cn('rounded-2xl p-3 border', isDark ? 'bg-white/5 border-white/10' : 'bg-purple-50/70 border-purple-200')}>
                        <div className="text-[11px] font-bold opacity-75">Macera XP / Rozet</div>
                        <div className="text-xl font-black text-purple-600">
                            💎 {rawAdv?.xp || 0} <span className="text-xs opacity-70">• 🏅 {rawAdv?.badges?.length || 0}</span>
                        </div>
                    </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span>Genel Macera İlerlemesi</span>
                        <span className="text-emerald-600 font-black">%{stats.percent}</span>
                    </div>
                    <Progress value={stats.percent} className="h-2.5" />
                </div>

                {/* 5 Diyar / 24 Adım Detay Matrisi (Tıklayarak Hızlı Öğretmen Onayı) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-black uppercase tracking-wider opacity-70">
                            5 Diyar • 24 Adım Detayı (Onaylamak/Geri Almak İçin Adıma Tıklayın)
                        </span>
                    </div>

                    <div className="space-y-3">
                        {ADVENTURE_ISLANDS.map(island => {
                            const stages = ADVENTURE_STAGES.filter(s => s.islandId === island.id);
                            return (
                                <div
                                    key={island.id}
                                    className={cn(
                                        'rounded-2xl p-3 border',
                                        isDark ? 'bg-white/4 border-white/10' : 'bg-slate-50/70 border-slate-200/80'
                                    )}
                                >
                                    <div className="text-xs font-black mb-2 flex items-center gap-1.5">
                                        <span>{island.icon}</span>
                                        <span>{island.name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {stages.map(st => {
                                            const m = rawAdv?.stageMastered?.[st.id];
                                            const stars = rawAdv?.stageStars?.[st.id] || 0;
                                            const isPassed = Boolean(m?.examPassed || stars > 0);
                                            const isInProgress = !isPassed && Boolean(m?.learnDone || m?.reinforceDone || st.id === unlockedStage);

                                            return (
                                                <button
                                                    key={st.id}
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={() => handleTeacherToggleStage(st.id)}
                                                    title={`Adım ${st.id}: ${st.title} — Onaylamak veya durumu değiştirmek için tıklayın`}
                                                    className={cn(
                                                        'p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 hover:scale-[1.02]',
                                                        isPassed
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                                            : isInProgress
                                                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                                                            : isDark
                                                            ? 'bg-slate-950/60 border-white/10 text-slate-400'
                                                            : 'bg-white border-slate-200 text-slate-500'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-1 w-full">
                                                        <span className="text-[11px] font-black">#{st.id}</span>
                                                        <span className="text-[10px] font-black">
                                                            {isPassed
                                                                ? `${'⭐'.repeat(Math.min(3, stars || 1))}`
                                                                : isInProgress
                                                                ? m?.reinforceDone
                                                                    ? '🎮 Oyun ✓'
                                                                    : m?.learnDone
                                                                    ? '📖 Tekrar ✓'
                                                                    : '▶️ Aktif'
                                                                : '🔒'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] font-bold truncate w-full">
                                                        {st.shortTitle}
                                                    </div>
                                                    {isPassed && m?.bestAccuracy ? (
                                                        <div className="text-[9px] font-extrabold opacity-80">
                                                            Sınav: %{m.bestAccuracy}
                                                        </div>
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SINIF BAZLI KAYITLI ÖĞRENCİLER ELİFBA MACERASI TAKİP PANOSU
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherClassAdventureTracker({
    students,
    isLoading,
    className,
    selectedClassId,
    selectedBranch,
    ambianceTheme = 'light',
    onStudentUpdated
}: {
    students: UserProfile[];
    isLoading: boolean;
    className?: string;
    selectedClassId: string;
    selectedBranch: string;
    ambianceTheme?: 'light' | 'dark';
    onStudentUpdated: (uid: string, nextAdv: NonNullable<UserProfile['elifbaAdventure']>) => void;
}) {
    const [search, setSearch] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'active' | 'not_started' | 'champions'>('all');
    const [sortBy, setSortBy] = useState<'progress' | 'name'>('progress');
    const [detailStudent, setDetailStudent] = useState<UserProfile | null>(null);

    const isDark = ambianceTheme === 'dark';

    // Özet İstatistikler
    const summary = useMemo(() => {
        const total = students.length;
        let activeCount = 0;
        let championsCount = 0;
        let starsSum = 0;
        let stepSum = 0;

        students.forEach(s => {
            const adv = s.elifbaAdventure;
            const st = computeAdventureStats(adv);
            if (adv && (st.completedCount > 0 || (adv.xp || 0) > 0 || (adv.unlockedStage || 1) > 1)) {
                activeCount++;
            }
            if (st.completedCount >= 24) {
                championsCount++;
            }
            starsSum += st.totalStars;
            stepSum += st.completedCount;
        });

        return {
            total,
            activeCount,
            championsCount,
            starsSum,
            avgStep: total > 0 ? (stepSum / total).toFixed(1) : '0'
        };
    }, [students]);

    // Filtrelenmiş ve Sıralanmış Öğrenciler
    const visibleStudents = useMemo(() => {
        const q = search.trim().toLocaleLowerCase('tr');
        const list = students.filter(s => {
            if (
                q &&
                !(s.displayName || '').toLocaleLowerCase('tr').includes(q) &&
                !(s.studentNumber || '').includes(q) &&
                !(s.class || '').toLocaleLowerCase('tr').includes(q)
            ) {
                return false;
            }
            const adv = s.elifbaAdventure;
            const st = computeAdventureStats(adv);
            const isActive = Boolean(adv && (st.completedCount > 0 || (adv.xp || 0) > 0 || (adv.unlockedStage || 1) > 1));

            if (filterMode === 'active') return isActive;
            if (filterMode === 'not_started') return !isActive;
            if (filterMode === 'champions') return st.completedCount >= 24;
            return true;
        });

        list.sort((a, b) => {
            if (sortBy === 'progress') {
                const stA = computeAdventureStats(a.elifbaAdventure);
                const stB = computeAdventureStats(b.elifbaAdventure);
                if (stB.completedCount !== stA.completedCount) return stB.completedCount - stA.completedCount;
                if (stB.totalStars !== stA.totalStars) return stB.totalStars - stA.totalStars;
                return (b.elifbaAdventure?.xp || 0) - (a.elifbaAdventure?.xp || 0);
            }
            return (a.displayName || '').localeCompare(b.displayName || '', 'tr', { sensitivity: 'base' });
        });

        return list;
    }, [students, search, filterMode, sortBy]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <span className={cn('text-sm font-bold', isDark ? 'text-slate-300' : 'text-slate-600')}>
                    Kayıtlı öğrencilerin Elifba Macerası verileri yükleniyor...
                </span>
            </div>
        );
    }

    if (!selectedClassId || !selectedBranch) {
        return (
            <div className={cn(
                'text-center py-16 px-6 rounded-3xl border max-w-xl mx-auto shadow-lg my-6',
                isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-900'
            )}>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-3xl shadow-md">
                    🗺️
                </div>
                <h3 className="text-xl font-black">Sınıf ve Şube Seçiniz</h3>
                <p className={cn('text-sm mt-2 max-w-md mx-auto', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    Kayıtlı öğrencilerinizin Büyük Elifba Macerası (24 Adım) ilerlemesini ve sınav yıldızlarını takip etmek için yukarıdan sınıf ve şube seçiniz.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Sınıf Macera Özet Şeridi */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={cn('p-4 rounded-3xl border flex items-center gap-3', isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Kayıtlı Öğrenci</div>
                        <div className="text-2xl font-black">{summary.total}</div>
                    </div>
                </div>

                <div className={cn('p-4 rounded-3xl border flex items-center gap-3', isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Aktif Çalışan</div>
                        <div className="text-2xl font-black text-emerald-500">{summary.activeCount}</div>
                    </div>
                </div>

                <div className={cn('p-4 rounded-3xl border flex items-center gap-3', isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Toplam Sınıf Yıldızı</div>
                        <div className="text-2xl font-black text-amber-500">⭐ {summary.starsSum}</div>
                    </div>
                </div>

                <div className={cn('p-4 rounded-3xl border flex items-center gap-3', isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm')}>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Ortalama / Finalist</div>
                        <div className="text-lg font-black">
                            {summary.avgStep} <span className="text-xs opacity-60">adım</span> • 👑 {summary.championsCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Arama & Filtre Barı */}
            <div className={cn(
                'p-3.5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-3',
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            )}>
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                    <Input
                        placeholder="Kayıtlı öğrenci ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={cn(
                            'h-9 pl-9 text-xs rounded-xl',
                            isDark ? 'bg-white/8 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        )}
                    />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    {([
                        { id: 'all', label: `Tümü (${summary.total})` },
                        { id: 'active', label: `Aktif (${summary.activeCount})` },
                        { id: 'not_started', label: `Başlamayan (${summary.total - summary.activeCount})` },
                        { id: 'champions', label: `👑 Final (${summary.championsCount})` }
                    ] as const).map(f => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilterMode(f.id)}
                            className={cn(
                                'px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer',
                                filterMode === f.id
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                    : isDark
                                    ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={() => setSortBy(s => (s === 'progress' ? 'name' : 'progress'))}
                        className={cn(
                            'px-3 py-1.5 rounded-xl font-bold border cursor-pointer',
                            isDark ? 'bg-sky-500/15 border-sky-400/30 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-800'
                        )}
                    >
                        Sırala: {sortBy === 'progress' ? 'İlerlemeye Göre' : 'İsme Göre'}
                    </button>
                </div>
            </div>

            {/* Öğrenci Kartları */}
            {visibleStudents.length === 0 ? (
                <div className={cn(
                    'text-center py-16 px-6 rounded-3xl border',
                    isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                )}>
                    <p className="font-bold text-sm">
                        {className || 'Bu şubede'} kriterlere uygun kayıtlı öğrenci (`student`) bulunamadı.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleStudents.map(student => {
                        const adv = student.elifbaAdventure;
                        const st = computeAdventureStats(adv);
                        const rank = getPlayerRank(st.totalStars);
                        const currentStage = ADVENTURE_STAGES.find(s => s.id === (adv?.unlockedStage || 1)) || ADVENTURE_STAGES[0];
                        const curMaster = adv?.stageMastered?.[currentStage.id];

                        return (
                            <Card
                                key={student.uid}
                                className={cn(
                                    'rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-lg',
                                    isDark
                                        ? 'bg-white/5 border-white/10 text-white hover:border-emerald-400/40'
                                        : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-300 shadow-sm'
                                )}
                            >
                                <div className="space-y-3">
                                    {/* Üst Satır: Avatar + İsim + Rütbe */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl shadow shrink-0">
                                                {adv?.avatar || student.displayName?.charAt(0) || 'Ö'}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-sm sm:text-base truncate">
                                                    {student.displayName}
                                                </h3>
                                                <div className="text-[11px] font-bold opacity-70 truncate">
                                                    {student.class || '-'} • {rank.icon} {rank.title}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge
                                            className={cn(
                                                'text-[11px] font-black shrink-0',
                                                st.completedCount > 0
                                                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                                    : isDark
                                                    ? 'bg-white/10 text-slate-300 border-white/15'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                            )}
                                        >
                                            {st.completedCount}/24
                                        </Badge>
                                    </div>

                                    {/* İlerleme Çubuğu */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                                            <span className="truncate max-w-[200px]">
                                                {adv
                                                    ? `Adım ${currentStage.id}: ${currentStage.shortTitle}`
                                                    : 'Henüz maceraya başlamadı'}
                                            </span>
                                            <span className="text-amber-500 font-black">⭐ {st.totalStars}</span>
                                        </div>
                                        <Progress value={st.percent} className="h-2" />
                                    </div>

                                    {/* Faz Durumları & Son Çalışma */}
                                    {adv ? (
                                        <div className="flex items-center justify-between text-[11px] font-bold flex-wrap gap-1.5">
                                            <div className="flex items-center gap-1">
                                                <span className={cn('px-2 py-0.5 rounded-full', curMaster?.learnDone ? 'bg-sky-500/15 text-sky-600' : 'bg-slate-200/70 text-slate-500')}>
                                                    📖 Tekrar {curMaster?.learnDone ? '✓' : '○'}
                                                </span>
                                                <span className={cn('px-2 py-0.5 rounded-full', curMaster?.reinforceDone ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-200/70 text-slate-500')}>
                                                    🎮 Oyun {curMaster?.reinforceDone ? '✓' : '○'}
                                                </span>
                                                <span className={cn('px-2 py-0.5 rounded-full', curMaster?.examPassed ? 'bg-amber-500/15 text-amber-600' : 'bg-slate-200/70 text-slate-500')}>
                                                    🏆 Sınav {curMaster?.examPassed ? '✓' : '○'}
                                                </span>
                                            </div>
                                            {adv.lastActivityAt && (
                                                <span className="opacity-60 text-[10px]">
                                                    {formatDistanceToNow(new Date(adv.lastActivityAt), { addSuffix: true, locale: tr })}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] opacity-60 italic">
                                            Öğrenci hesabından Elifba Macerasına girdiğinde ilerlemesi burada canlı görünür.
                                        </div>
                                    )}
                                </div>

                                {/* Aksiyon Butonları */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setDetailStudent(student)}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs h-9 cursor-pointer"
                                    >
                                        24 Adım Detayı &amp; Onay
                                    </Button>
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="rounded-xl h-9 px-2.5 text-xs font-bold"
                                        title="Öğrenci Tam Profilini Aç"
                                    >
                                        <Link href={`/teacher/students/${student.uid}`}>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Detay Modalı */}
            <Dialog open={Boolean(detailStudent)} onOpenChange={open => !open && setDetailStudent(null)}>
                <DialogContent className={cn(
                    'w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6',
                    isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                )}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <span>🗺️</span>
                            <span>{detailStudent?.displayName} — Elifba Macerası Raporu</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold">
                            Öğrencinin evden ve sınıftan yaptığı tüm aşamaları görüntüleyin veya doğrudan öğretmen onayı verin.
                        </DialogDescription>
                    </DialogHeader>

                    {detailStudent && (
                        <TeacherStudentAdventureCard
                            student={detailStudent}
                            ambianceTheme={ambianceTheme}
                            onStudentUpdated={(uid, nextAdv) => {
                                onStudentUpdated(uid, nextAdv);
                                setDetailStudent(prev => (prev && prev.uid === uid ? { ...prev, elifbaAdventure: nextAdv } : prev));
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
