'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    ADVENTURE_STAGES,
    ADVENTURE_ISLANDS,
    TOTAL_ADVENTURE_STAGES,
    CURRENT_CURRICULUM_VERSION,
    getPlayerRank,
    computeAdventureStats,
    toCloudAdventurePayload,
    findMatchingGuestStudent,
    buildAdventureFromQuranProgress,
    summarizeQuranProgressForMatch,
    type AdventurePlayerData,
    type QuranProgressLike
} from '@/lib/elifba-adventure-data';
import { syncAdventureStagesToGuestProgress } from '@/app/teacher/quran-tracker/actions';
import type { UserProfile } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Star,
    Sparkles,
    Lock,
    Unlock,
    Search,
    Users,
    ExternalLink,
    Clock,
    Loader2,
    Crown,
    RefreshCw,
    ArrowRight,
    Download,
    Upload,
    Link2
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
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Uyumlu Diyanet 30 Adım payload okuyucusu
function toCompatibleAdventureData(
    rawAdv: UserProfile['elifbaAdventure'] | undefined,
    fallbackName: string
): AdventurePlayerData {
    const isCompat = rawAdv?.curriculumVersion === CURRENT_CURRICULUM_VERSION;
    if (!isCompat) {
        return {
            name: rawAdv?.name || fallbackName || 'Öğrenci',
            avatar: rawAdv?.avatar || '🦉',
            unlockedStage: 1,
            stageStars: {},
            stageScores: {},
            stageMastered: {},
            badges: [],
            xp: 0,
            streak: 0,
            teacherFreeMode: Boolean(rawAdv?.teacherFreeMode),
            curriculumVersion: CURRENT_CURRICULUM_VERSION
        };
    }
    return {
        name: rawAdv?.name || fallbackName || 'Öğrenci',
        avatar: rawAdv?.avatar || '🦉',
        unlockedStage: Math.min(TOTAL_ADVENTURE_STAGES, Math.max(1, rawAdv?.unlockedStage || 1)),
        stageStars: { ...(rawAdv?.stageStars || {}) },
        stageScores: { ...(rawAdv?.stageScores || {}) },
        stageMastered: { ...(rawAdv?.stageMastered || {}) },
        badges: [...(rawAdv?.badges || [])],
        xp: rawAdv?.xp || 0,
        streak: rawAdv?.streak || 0,
        teacherFreeMode: Boolean(rawAdv?.teacherFreeMode),
        lastStageTitle: rawAdv?.lastStageTitle,
        lastActivityAt: rawAdv?.lastActivityAt,
        curriculumVersion: CURRENT_CURRICULUM_VERSION,
        syncedFromGuestUid: rawAdv?.syncedFromGuestUid,
        syncedFromGuestName: rawAdv?.syncedFromGuestName,
        lastSyncedAt: rawAdv?.lastSyncedAt
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TEKİL ÖĞRENCİ DETAYLI ELİFBA MACERASI KARTI (30 DİYANET ADIMI + EŞİTLEME)
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherStudentAdventureCard({
    student,
    ambianceTheme = 'light',
    guestStudents = [],
    guestProgressMap = {},
    classInfo,
    onStudentUpdated,
    onGuestProgressUpdated
}: {
    student: UserProfile;
    ambianceTheme?: 'light' | 'dark';
    guestStudents?: UserProfile[];
    guestProgressMap?: Record<string, QuranProgressLike>;
    classInfo?: { classId: string; className: string; branch: string };
    onStudentUpdated?: (uid: string, nextAdv: NonNullable<UserProfile['elifbaAdventure']>) => void;
    onGuestProgressUpdated?: () => void;
}) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const autoMatchedGuest = useMemo(
        () => findMatchingGuestStudent(student, guestStudents),
        [student, guestStudents]
    );
    const [selectedGuestUid, setSelectedGuestUid] = useState<string>(autoMatchedGuest?.uid || '');

    useEffect(() => {
        setSelectedGuestUid(autoMatchedGuest?.uid || '');
    }, [autoMatchedGuest?.uid, student.uid]);

    const activeGuest = useMemo(
        () => guestStudents.find(g => g.uid === selectedGuestUid) || null,
        [guestStudents, selectedGuestUid]
    );
    const activeGuestProg = activeGuest ? guestProgressMap[activeGuest.uid] : undefined;
    const guestSummary = useMemo(() => summarizeQuranProgressForMatch(activeGuestProg), [activeGuestProg]);

    const rawAdv = student.elifbaAdventure;
    const compatAdv = useMemo(
        () => toCompatibleAdventureData(rawAdv, student.displayName || 'Öğrenci'),
        [rawAdv, student.displayName]
    );
    const isCompatCloud = rawAdv?.curriculumVersion === CURRENT_CURRICULUM_VERSION;
    const stats = useMemo(() => computeAdventureStats(rawAdv), [rawAdv]);
    const rank = useMemo(() => getPlayerRank(stats.totalStars), [stats.totalStars]);

    const unlockedStage = compatAdv.unlockedStage;
    const currentStageObj =
        ADVENTURE_STAGES.find(s => s.id === unlockedStage) || ADVENTURE_STAGES[0];
    const currentStageMaster = compatAdv.stageMastered[unlockedStage];

    const isDark = ambianceTheme === 'dark';

    // Öğretmenin tek tıkla Diyanet adımını onaylaması / geri alması
    const handleTeacherToggleStage = async (stageId: number) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const baseData = toCompatibleAdventureData(rawAdv, student.displayName || 'Öğrenci');
            const alreadyPassed = baseData.stageMastered[stageId]?.examPassed;
            const stageObj = ADVENTURE_STAGES.find(s => s.id === stageId);

            if (alreadyPassed) {
                delete baseData.stageMastered[stageId];
                delete baseData.stageStars[stageId];
                delete baseData.stageScores[stageId];
                if (stageObj) {
                    baseData.badges = baseData.badges.filter(b => b !== stageObj.badgeId);
                }
            } else {
                baseData.stageMastered[stageId] = {
                    learnDone: true,
                    reinforceDone: true,
                    examPassed: true,
                    bestAccuracy: 100,
                    completedRounds: stageObj?.miniRounds.map(r => r.roundIndex) || [1]
                };
                baseData.stageStars[stageId] = Math.max(3, baseData.stageStars[stageId] || 0);
                baseData.stageScores[stageId] = Math.max(100, baseData.stageScores[stageId] || 0);
                baseData.unlockedStage = Math.min(
                    TOTAL_ADVENTURE_STAGES,
                    Math.max(baseData.unlockedStage, stageId + 1)
                );
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
                description: `${student.displayName} için Diyanet Adım ${stageId} güncellendi.`
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
            const baseData = toCompatibleAdventureData(rawAdv, student.displayName || 'Öğrenci');
            baseData.teacherFreeMode = !baseData.teacherFreeMode;
            const payload = toCloudAdventurePayload(baseData);
            await updateDoc(doc(db, 'users', student.uid), {
                elifbaAdventure: payload
            });
            onStudentUpdated?.(student.uid, payload);
            toast({
                title: payload.teacherFreeMode ? 'Serbest Keşif Açıldı 🔓' : 'Aşamalı Kilit Aktif 🔒',
                description: payload.teacherFreeMode
                    ? `${student.displayName} artık tüm ${TOTAL_ADVENTURE_STAGES} Diyanet adımına serbestçe girebilir.`
                    : `${student.displayName} artık adım adım sınavla ilerleyecek.`
            });
        } catch (e: any) {
            toast({ title: 'Hata', description: e?.message || 'İşlem başarısız.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Sanal Öğrenci Okuma Kaydından -> Kayıtlı Öğrenci Macerasına Eşitle
    const handleSyncGuestToRegistered = async () => {
        if (!activeGuest || isSaving) return;
        setIsSaving(true);
        try {
            const nextAdv = buildAdventureFromQuranProgress(
                rawAdv,
                activeGuestProg,
                activeGuest,
                student.displayName || 'Öğrenci'
            );
            const payload = toCloudAdventurePayload(nextAdv, nextAdv.lastStageTitle);
            await updateDoc(doc(db, 'users', student.uid), {
                elifbaAdventure: payload
            });
            onStudentUpdated?.(student.uid, payload);
            toast({
                title: 'Sanal Kayıttan Eşitlendi ✅',
                description: `${activeGuest.displayName} okuma kayıtları (${guestSummary.completedCount} onaylı adım) ${student.displayName} hesabına aktarıldı.`
            });
        } catch (e: any) {
            toast({
                title: 'Eşitleme Hatası',
                description: e?.message || 'Aktarım sırasında bir hata oluştu.',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Kayıtlı Öğrenci Macerasından -> Sanal Öğrenci Okuma Kaydına Aktar
    const handleSyncRegisteredToGuest = async () => {
        if (!activeGuest || !classInfo || isSaving) return;
        const completedCurriculumIds = ADVENTURE_STAGES.filter(
            st => compatAdv.stageMastered[st.id]?.examPassed
        ).map(st => st.curriculumId);

        if (completedCurriculumIds.length === 0) {
            toast({
                title: 'Aktarılacak Tamamlanmış Adım Yok',
                description: `${student.displayName} henüz macerada tamamlanmış bir adım sınavı geçmemiş.`,
                variant: 'destructive'
            });
            return;
        }

        setIsSaving(true);
        try {
            const res = await syncAdventureStagesToGuestProgress({
                guestStudent: {
                    uid: activeGuest.uid,
                    displayName: activeGuest.displayName,
                    studentNumber: activeGuest.studentNumber
                },
                completedCurriculumIds,
                activeStageId: currentStageObj.curriculumId,
                classInfo
            });

            if (res.success) {
                toast({
                    title: 'Sanal Takip Listesine İşlendi ✅',
                    description: `${student.displayName} macerasında tamamlanan ${completedCurriculumIds.length} adım ${activeGuest.displayName} sanal kaydına aktarıldı.`
                });
                onGuestProgressUpdated?.();
            } else {
                toast({ title: 'Hata', description: res.error, variant: 'destructive' });
            }
        } catch (e: any) {
            toast({
                title: 'Eşitleme Hatası',
                description: e?.message || 'Sanal kayıt güncellenemedi.',
                variant: 'destructive'
            });
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
                            {compatAdv.avatar || '🗺️'}
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 flex-wrap">
                                <span>Diyanet 30 Adım — Elifba Macerası</span>
                                <Badge
                                    className={cn(
                                        'text-[11px] font-black',
                                        isCompatCloud && (stats.completedCount > 0 || compatAdv.xp > 0)
                                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                            : isDark
                                            ? 'bg-white/10 text-slate-300 border-white/15'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                    )}
                                >
                                    {isCompatCloud && stats.totalStars > 0
                                        ? `${rank.icon} ${rank.title}`
                                        : 'Henüz Başlamadı'}
                                </Badge>
                            </CardTitle>
                            <CardDescription
                                className={cn('text-xs font-medium mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}
                            >
                                {isCompatCloud && compatAdv.lastActivityAt ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Son çalışma:{' '}
                                        {formatDistanceToNow(new Date(compatAdv.lastActivityAt), {
                                            addSuffix: true,
                                            locale: tr
                                        })}
                                        {compatAdv.lastStageTitle ? ` (${compatAdv.lastStageTitle})` : ''}
                                    </span>
                                ) : (
                                    'Sanal okuma kayıtlarınızdan bağımsızdır. Öğrenci evden çalıştıkça güncellenir veya aşağıdan eşitleyebilirsiniz.'
                                )}
                            </CardDescription>
                        </div>
                    </div>

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        onClick={handleToggleTeacherFreeMode}
                        className={cn(
                            'rounded-xl text-xs font-black gap-1.5 cursor-pointer shrink-0',
                            compatAdv.teacherFreeMode
                                ? 'bg-amber-500/15 border-amber-400/50 text-amber-600 hover:bg-amber-500/25'
                                : isDark
                                ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        )}
                        title="Bu öğrencinin kilitli adımlara da serbestçe erişmesine izin ver"
                    >
                        {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : compatAdv.teacherFreeMode ? (
                            <Unlock className="w-3.5 h-3.5" />
                        ) : (
                            <Lock className="w-3.5 h-3.5" />
                        )}
                        <span>{compatAdv.teacherFreeMode ? 'Serbest Erişim Açık' : 'Aşamalı Kilitli'}</span>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
                {/* Sanal Öğrenci Okuma Kaydıyla Eşitleme Paneli */}
                {guestStudents.length > 0 && (
                    <div
                        className={cn(
                            'rounded-2xl p-3.5 border space-y-3',
                            isDark
                                ? 'bg-sky-500/10 border-sky-400/25'
                                : 'bg-sky-50/80 border-sky-200'
                        )}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-sky-500 shrink-0" />
                                <div>
                                    <div className="text-xs font-black">
                                        Sanal Öğrenci Okuma Kaydıyla Eşitleme
                                    </div>
                                    <div className="text-[11px] opacity-75">
                                        {activeGuest
                                            ? `Seçili Sanal Kayıt: ${activeGuest.displayName} • Adım ${guestSummary.activeStep}/30 (${guestSummary.completedCount} adım onaylı)`
                                            : 'İsterseniz bir sanal öğrenci seçip okuma ilerlemesini eşitleyebilirsiniz'}
                                    </div>
                                </div>
                            </div>

                            <Select
                                value={selectedGuestUid || undefined}
                                onValueChange={setSelectedGuestUid}
                            >
                                <SelectTrigger
                                    className={cn(
                                        'w-full sm:w-[220px] h-8 rounded-xl text-xs font-bold',
                                        isDark
                                            ? 'bg-slate-900 border-white/15 text-white'
                                            : 'bg-white border-sky-200 text-slate-900'
                                    )}
                                >
                                    <SelectValue placeholder="Sanal öğrenci seç..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {guestStudents.map(gs => {
                                        const gsSum = summarizeQuranProgressForMatch(guestProgressMap[gs.uid]);
                                        return (
                                            <SelectItem key={gs.uid} value={gs.uid} className="text-xs font-semibold">
                                                {gs.displayName} (Adım {gsSum.activeStep}/30)
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {activeGuest && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={isSaving || !activeGuestProg}
                                    onClick={handleSyncGuestToRegistered}
                                    className="h-8 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white cursor-pointer gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Sanal Kayıttan Maceraya Aktar</span>
                                </Button>

                                {classInfo && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={isSaving || stats.completedCount === 0}
                                        onClick={handleSyncRegisteredToGuest}
                                        className={cn(
                                            'h-8 px-3 rounded-xl text-xs font-bold cursor-pointer gap-1.5',
                                            isDark
                                                ? 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                                                : 'border-sky-300 bg-white text-sky-900 hover:bg-sky-100'
                                        )}
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Maceradan Sanal Kayda İşle</span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Özet İstatistik Kutuları */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div
                        className={cn(
                            'rounded-2xl p-3 border',
                            isDark ? 'bg-white/5 border-white/10' : 'bg-emerald-50/70 border-emerald-200'
                        )}
                    >
                        <div className="text-[11px] font-bold opacity-75">Tamamlanan Adım</div>
                        <div className="text-xl font-black text-emerald-600">
                            {stats.completedCount} <span className="text-xs opacity-70">/ {TOTAL_ADVENTURE_STAGES}</span>
                        </div>
                    </div>
                    <div
                        className={cn(
                            'rounded-2xl p-3 border',
                            isDark ? 'bg-white/5 border-white/10' : 'bg-amber-50/70 border-amber-200'
                        )}
                    >
                        <div className="text-[11px] font-bold opacity-75">Toplam Yıldız</div>
                        <div className="text-xl font-black text-amber-500">
                            ⭐ {stats.totalStars} <span className="text-xs opacity-70">/ {stats.maxStars}</span>
                        </div>
                    </div>
                    <div
                        className={cn(
                            'rounded-2xl p-3 border',
                            isDark ? 'bg-white/5 border-white/10' : 'bg-sky-50/70 border-sky-200'
                        )}
                    >
                        <div className="text-[11px] font-bold opacity-75">Bulunduğu Adım</div>
                        <div className="text-sm font-black text-sky-600 truncate mt-0.5">
                            Adım {unlockedStage}: {currentStageObj.shortTitle}
                        </div>
                        <div className="text-[10px] font-bold opacity-70 mt-0.5">
                            {currentStageMaster?.examPassed
                                ? 'Tamamlandı ✅'
                                : currentStageMaster?.reinforceDone
                                ? 'Sınav Aşamasında 🏆'
                                : (currentStageMaster?.completedRounds?.length || 0) > 0
                                ? `Mini Tur ${currentStageMaster?.completedRounds?.length}/${currentStageObj.miniRounds.length}`
                                : currentStageMaster?.learnDone
                                ? 'Pekiştirme Oyununda 🎮'
                                : 'Keşfet & Tekrarda 📖'}
                        </div>
                    </div>
                    <div
                        className={cn(
                            'rounded-2xl p-3 border',
                            isDark ? 'bg-white/5 border-white/10' : 'bg-purple-50/70 border-purple-200'
                        )}
                    >
                        <div className="text-[11px] font-bold opacity-75">Macera XP / Rozet</div>
                        <div className="text-xl font-black text-purple-600">
                            💎 {compatAdv.xp || 0} <span className="text-xs opacity-70">• 🏅 {compatAdv.badges.length}</span>
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

                {/* 4 Bölüm / 30 Diyanet Adımı Detay Matrisi (Tıklayarak Hızlı Öğretmen Onayı) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-black uppercase tracking-wider opacity-70">
                            4 Diyanet Bölümü • {TOTAL_ADVENTURE_STAGES} Adım Detayı (Onaylamak / Geri Almak İçin Tıklayın)
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
                                            const m = compatAdv.stageMastered[st.id];
                                            const stars = compatAdv.stageStars[st.id] || 0;
                                            const isPassed = Boolean(m?.examPassed || stars > 0);
                                            const roundsDone = m?.completedRounds?.length || 0;
                                            const isInProgress =
                                                !isPassed &&
                                                Boolean(
                                                    m?.learnDone ||
                                                        m?.reinforceDone ||
                                                        roundsDone > 0 ||
                                                        st.id === unlockedStage
                                                );

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
                                                                    : roundsDone > 0
                                                                    ? `Tur ${roundsDone}/${st.miniRounds.length}`
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
// 2. SINIF BAZLI KAYITLI ÖĞRENCİLER ELİFBA MACERASI PANOSU + SANAL EŞİTLEME
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherClassAdventureTracker({
    students,
    guestStudents = [],
    guestProgressMap = {},
    isLoading,
    className,
    selectedClassId,
    selectedBranch,
    ambianceTheme = 'light',
    onStudentUpdated,
    onGuestProgressUpdated
}: {
    students: UserProfile[];
    guestStudents?: UserProfile[];
    guestProgressMap?: Record<string, QuranProgressLike>;
    isLoading: boolean;
    className?: string;
    selectedClassId: string;
    selectedBranch: string;
    ambianceTheme?: 'light' | 'dark';
    onStudentUpdated: (uid: string, nextAdv: NonNullable<UserProfile['elifbaAdventure']>) => void;
    onGuestProgressUpdated?: () => void;
}) {
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'active' | 'not_started' | 'champions'>('all');
    const [sortBy, setSortBy] = useState<'progress' | 'name'>('progress');
    const [detailStudent, setDetailStudent] = useState<UserProfile | null>(null);
    const [quickSyncUid, setQuickSyncUid] = useState<string | null>(null);

    // Toplu Eşitleme Diyaloğu State
    const [isBulkSyncOpen, setIsBulkSyncOpen] = useState(false);
    const [syncDirection, setSyncDirection] = useState<'guest_to_reg' | 'reg_to_guest'>('guest_to_reg');
    const [manualGuestPairs, setManualGuestPairs] = useState<Record<string, string>>({});
    const [selectedSyncUids, setSelectedSyncUids] = useState<string[]>([]);
    const [isBulkSyncing, setIsBulkSyncing] = useState(false);

    const isDark = ambianceTheme === 'dark';

    // Her kayıtlı öğrenci için eşleşen sanal öğrenci haritası
    const autoGuestPairMap = useMemo(() => {
        const map: Record<string, UserProfile | null> = {};
        students.forEach(s => {
            map[s.uid] = findMatchingGuestStudent(s, guestStudents);
        });
        return map;
    }, [students, guestStudents]);

    const matchedWithProgressCount = useMemo(() => {
        return students.filter(s => {
            const g = autoGuestPairMap[s.uid];
            if (!g) return false;
            const sum = summarizeQuranProgressForMatch(guestProgressMap[g.uid]);
            return sum.completedCount > 0 || sum.activeStep > 1;
        }).length;
    }, [students, autoGuestPairMap, guestProgressMap]);

    // Toplu eşitleme penceresi açıldığında eşleşmeleri ve yönü hazırla
    const handleOpenBulkSync = () => {
        const pairs: Record<string, string> = {};
        const preChecked: string[] = [];

        students.forEach(s => {
            const matched = autoGuestPairMap[s.uid];
            if (matched) {
                pairs[s.uid] = matched.uid;
                const gSum = summarizeQuranProgressForMatch(guestProgressMap[matched.uid]);
                const regStats = computeAdventureStats(s.elifbaAdventure);
                if (syncDirection === 'guest_to_reg' && (gSum.completedCount > 0 || gSum.activeStep > 1)) {
                    preChecked.push(s.uid);
                } else if (syncDirection === 'reg_to_guest' && regStats.completedCount > 0) {
                    preChecked.push(s.uid);
                }
            }
        });

        setManualGuestPairs(pairs);
        setSelectedSyncUids(preChecked);
        setIsBulkSyncOpen(true);
    };

    const handleDirectionChange = (dir: 'guest_to_reg' | 'reg_to_guest') => {
        setSyncDirection(dir);
        const preChecked: string[] = [];
        students.forEach(s => {
            const gUid = manualGuestPairs[s.uid] || autoGuestPairMap[s.uid]?.uid;
            if (!gUid) return;
            const gSum = summarizeQuranProgressForMatch(guestProgressMap[gUid]);
            const regStats = computeAdventureStats(s.elifbaAdventure);
            if (dir === 'guest_to_reg' && (gSum.completedCount > 0 || gSum.activeStep > 1)) {
                preChecked.push(s.uid);
            } else if (dir === 'reg_to_guest' && regStats.completedCount > 0) {
                preChecked.push(s.uid);
            }
        });
        setSelectedSyncUids(preChecked);
    };

    // Tekil Kart Hızlı Eşitleme (Sanal Kayıttan Maceraya Aktar)
    const handleQuickSyncFromGuest = async (student: UserProfile, guest: UserProfile) => {
        if (quickSyncUid) return;
        setQuickSyncUid(student.uid);
        try {
            const guestProg = guestProgressMap[guest.uid];
            const nextAdv = buildAdventureFromQuranProgress(
                student.elifbaAdventure,
                guestProg,
                guest,
                student.displayName || 'Öğrenci'
            );
            const payload = toCloudAdventurePayload(nextAdv, nextAdv.lastStageTitle);
            await updateDoc(doc(db, 'users', student.uid), {
                elifbaAdventure: payload
            });
            onStudentUpdated(student.uid, payload);
            toast({
                title: 'Eşitlendi ✅',
                description: `${guest.displayName} okuma adımları ${student.displayName} macerasına aktarıldı.`
            });
        } catch (e: any) {
            toast({
                title: 'Eşitleme Hatası',
                description: e?.message || 'Firestore kaydı güncellenemedi.',
                variant: 'destructive'
            });
        } finally {
            setQuickSyncUid(null);
        }
    };

    // Toplu Eşitleme İşlemi
    const handleExecuteBulkSync = async () => {
        if (selectedSyncUids.length === 0 || isBulkSyncing) return;
        setIsBulkSyncing(true);
        let successCount = 0;

        try {
            for (const regUid of selectedSyncUids) {
                const regStudent = students.find(s => s.uid === regUid);
                const guestUid = manualGuestPairs[regUid] || autoGuestPairMap[regUid]?.uid;
                const guestStudent = guestStudents.find(g => g.uid === guestUid);
                if (!regStudent || !guestStudent) continue;

                if (syncDirection === 'guest_to_reg') {
                    const guestProg = guestProgressMap[guestStudent.uid];
                    const nextAdv = buildAdventureFromQuranProgress(
                        regStudent.elifbaAdventure,
                        guestProg,
                        guestStudent,
                        regStudent.displayName || 'Öğrenci'
                    );
                    const payload = toCloudAdventurePayload(nextAdv, nextAdv.lastStageTitle);
                    await updateDoc(doc(db, 'users', regStudent.uid), {
                        elifbaAdventure: payload
                    });
                    onStudentUpdated(regStudent.uid, payload);
                    successCount++;
                } else {
                    const compat = toCompatibleAdventureData(
                        regStudent.elifbaAdventure,
                        regStudent.displayName || 'Öğrenci'
                    );
                    const completedIds = ADVENTURE_STAGES.filter(
                        st => compat.stageMastered[st.id]?.examPassed
                    ).map(st => st.curriculumId);
                    const activeStage =
                        ADVENTURE_STAGES.find(st => st.id === compat.unlockedStage) || ADVENTURE_STAGES[0];

                    if (completedIds.length > 0) {
                        const res = await syncAdventureStagesToGuestProgress({
                            guestStudent: {
                                uid: guestStudent.uid,
                                displayName: guestStudent.displayName,
                                studentNumber: guestStudent.studentNumber
                            },
                            completedCurriculumIds: completedIds,
                            activeStageId: activeStage.curriculumId,
                            classInfo: {
                                classId: selectedClassId,
                                className: className || '',
                                branch: selectedBranch
                            }
                        });
                        if (res.success) successCount++;
                    }
                }
            }

            if (syncDirection === 'reg_to_guest' && successCount > 0) {
                onGuestProgressUpdated?.();
            }

            toast({
                title: 'Toplu Eşitleme Tamamlandı ✅',
                description:
                    syncDirection === 'guest_to_reg'
                        ? `${successCount} kayıtlı öğrencinin Elifba Macerası sanal okuma kayıtlarından eşitlendi.`
                        : `${successCount} sanal öğrencinin takip kaydı Elifba Macerası ilerlemesinden güncellendi.`
            });
            setIsBulkSyncOpen(false);
        } catch (e: any) {
            toast({
                title: 'Toplu Eşitleme Hatası',
                description: e?.message || 'Bazı kayıtlar eşitlenemedi.',
                variant: 'destructive'
            });
        } finally {
            setIsBulkSyncing(false);
        }
    };

    // Özet İstatistikler (30 Adım)
    const summary = useMemo(() => {
        const total = students.length;
        let activeCount = 0;
        let championsCount = 0;
        let starsSum = 0;
        let stepSum = 0;

        students.forEach(s => {
            const adv = s.elifbaAdventure;
            const st = computeAdventureStats(adv);
            const isCompat = adv?.curriculumVersion === CURRENT_CURRICULUM_VERSION;
            if (isCompat && adv && (st.completedCount > 0 || (adv.xp || 0) > 0 || (adv.unlockedStage || 1) > 1)) {
                activeCount++;
            }
            if (st.completedCount >= TOTAL_ADVENTURE_STAGES) {
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
            const isCompat = adv?.curriculumVersion === CURRENT_CURRICULUM_VERSION;
            const isActive = Boolean(
                isCompat && adv && (st.completedCount > 0 || (adv.xp || 0) > 0 || (adv.unlockedStage || 1) > 1)
            );

            if (filterMode === 'active') return isActive;
            if (filterMode === 'not_started') return !isActive;
            if (filterMode === 'champions') return st.completedCount >= TOTAL_ADVENTURE_STAGES;
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
                    Kayıtlı öğrencilerin Diyanet 30 Adım Elifba Macerası verileri yükleniyor...
                </span>
            </div>
        );
    }

    if (!selectedClassId || !selectedBranch) {
        return (
            <div
                className={cn(
                    'text-center py-16 px-6 rounded-3xl border max-w-xl mx-auto shadow-lg my-6',
                    isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-900'
                )}
            >
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-3xl shadow-md">
                    🗺️
                </div>
                <h3 className="text-xl font-black">Sınıf ve Şube Seçiniz</h3>
                <p className={cn('text-sm mt-2 max-w-md mx-auto', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    Kayıtlı öğrencilerinizin Diyanet {TOTAL_ADVENTURE_STAGES} Adım Elifba Macerası ilerlemesini görmek ve dilerseniz sanal öğrencilerden eşitlemek için yukarıdan sınıf ve şube seçiniz.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Sınıf Macera Özet Şeridi */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div
                    className={cn(
                        'p-4 rounded-3xl border flex items-center gap-3',
                        isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm'
                    )}
                >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Kayıtlı Öğrenci</div>
                        <div className="text-2xl font-black">{summary.total}</div>
                    </div>
                </div>

                <div
                    className={cn(
                        'p-4 rounded-3xl border flex items-center gap-3',
                        isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm'
                    )}
                >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Aktif Çalışan</div>
                        <div className="text-2xl font-black text-emerald-500">{summary.activeCount}</div>
                    </div>
                </div>

                <div
                    className={cn(
                        'p-4 rounded-3xl border flex items-center gap-3',
                        isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm'
                    )}
                >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Toplam Sınıf Yıldızı</div>
                        <div className="text-2xl font-black text-amber-500">⭐ {summary.starsSum}</div>
                    </div>
                </div>

                <div
                    className={cn(
                        'p-4 rounded-3xl border flex items-center gap-3',
                        isDark ? 'bg-white/6 border-white/10 text-white' : 'bg-white border-slate-200 shadow-sm'
                    )}
                >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold opacity-70">Ortalama / Mezun</div>
                        <div className="text-lg font-black">
                            {summary.avgStep} <span className="text-xs opacity-60">adım</span> • 👑 {summary.championsCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Arama, Filtre & Sanal Öğrencilerden Eşitleme Barı */}
            <div
                className={cn(
                    'p-3.5 rounded-3xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3',
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                )}
            >
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

                    {guestStudents.length > 0 && students.length > 0 && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleOpenBulkSync}
                            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white font-black text-xs shadow-md cursor-pointer gap-1.5"
                            title="Sanal öğrencilerde okuttuğunuz adımları kayıtlı öğrencilerle toplu eşitleyin"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Sanal Öğrencilerden Eşitle</span>
                            {matchedWithProgressCount > 0 && (
                                <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[10px]">
                                    {matchedWithProgressCount}
                                </span>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Öğrenci Kartları */}
            {visibleStudents.length === 0 ? (
                <div
                    className={cn(
                        'text-center py-16 px-6 rounded-3xl border',
                        isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                    )}
                >
                    <p className="font-bold text-sm">
                        {className || 'Bu şubede'} kriterlere uygun kayıtlı öğrenci (`student`) bulunamadı.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleStudents.map(student => {
                        const compatAdv = toCompatibleAdventureData(
                            student.elifbaAdventure,
                            student.displayName || 'Öğrenci'
                        );
                        const isCompat = student.elifbaAdventure?.curriculumVersion === CURRENT_CURRICULUM_VERSION;
                        const st = computeAdventureStats(student.elifbaAdventure);
                        const rank = getPlayerRank(st.totalStars);
                        const currentStage =
                            ADVENTURE_STAGES.find(s => s.id === compatAdv.unlockedStage) || ADVENTURE_STAGES[0];
                        const curMaster = compatAdv.stageMastered[currentStage.id];

                        const matchedGuest = autoGuestPairMap[student.uid];
                        const guestProg = matchedGuest ? guestProgressMap[matchedGuest.uid] : undefined;
                        const guestSummary = summarizeQuranProgressForMatch(guestProg);
                        const hasGuestProgress = Boolean(
                            matchedGuest && guestProg && (guestSummary.completedCount > 0 || guestSummary.activeStep > 1)
                        );

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
                                                {compatAdv.avatar || student.displayName?.charAt(0) || 'Ö'}
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
                                            {st.completedCount}/{TOTAL_ADVENTURE_STAGES}
                                        </Badge>
                                    </div>

                                    {/* İlerleme Çubuğu */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                                            <span className="truncate max-w-[200px]">
                                                {isCompat && (st.completedCount > 0 || compatAdv.xp > 0 || compatAdv.unlockedStage > 1)
                                                    ? `Adım ${currentStage.id}: ${currentStage.shortTitle}`
                                                    : 'Henüz maceraya başlamadı'}
                                            </span>
                                            <span className="text-amber-500 font-black">⭐ {st.totalStars}</span>
                                        </div>
                                        <Progress value={st.percent} className="h-2" />
                                    </div>

                                    {/* Eşleşen Sanal Öğrenci Bilgisi */}
                                    {hasGuestProgress && matchedGuest && (
                                        <div
                                            className={cn(
                                                'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold',
                                                isDark
                                                    ? 'bg-sky-500/10 border-sky-400/25 text-sky-300'
                                                    : 'bg-sky-50 border-sky-200 text-sky-900'
                                            )}
                                        >
                                            <span className="truncate">
                                                🔗 Sanal Kayıt: Adım {guestSummary.activeStep} ({guestSummary.completedCount}✓)
                                            </span>
                                            {compatAdv.lastSyncedAt && (
                                                <span className="text-[10px] opacity-75 shrink-0">Eşitli</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Faz Durumları & Son Çalışma */}
                                    {isCompat && (st.completedCount > 0 || compatAdv.xp > 0 || compatAdv.unlockedStage > 1) ? (
                                        <div className="flex items-center justify-between text-[11px] font-bold flex-wrap gap-1.5">
                                            <div className="flex items-center gap-1">
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-full',
                                                        curMaster?.learnDone
                                                            ? 'bg-sky-500/15 text-sky-600'
                                                            : 'bg-slate-200/70 text-slate-500'
                                                    )}
                                                >
                                                    📖 Tekrar {curMaster?.learnDone ? '✓' : '○'}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-full',
                                                        curMaster?.reinforceDone
                                                            ? 'bg-emerald-500/15 text-emerald-600'
                                                            : 'bg-slate-200/70 text-slate-500'
                                                    )}
                                                >
                                                    🎮 Oyun {curMaster?.reinforceDone ? '✓' : '○'}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'px-2 py-0.5 rounded-full',
                                                        curMaster?.examPassed
                                                            ? 'bg-amber-500/15 text-amber-600'
                                                            : 'bg-slate-200/70 text-slate-500'
                                                    )}
                                                >
                                                    🏆 Sınav {curMaster?.examPassed ? '✓' : '○'}
                                                </span>
                                            </div>
                                            {compatAdv.lastActivityAt && (
                                                <span className="opacity-60 text-[10px]">
                                                    {formatDistanceToNow(new Date(compatAdv.lastActivityAt), {
                                                        addSuffix: true,
                                                        locale: tr
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-[11px] opacity-60 italic">
                                            Evden bağımsız çalışabilir veya eşitle butonuna basarak sanal kaydı aktarabilirsiniz.
                                        </div>
                                    )}
                                </div>

                                {/* Aksiyon Butonları */}
                                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/10">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setDetailStudent(student)}
                                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs h-9 cursor-pointer"
                                    >
                                        30 Adım &amp; Eşitle
                                    </Button>

                                    {hasGuestProgress && matchedGuest && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={quickSyncUid === student.uid}
                                            onClick={() => handleQuickSyncFromGuest(student, matchedGuest)}
                                            variant="outline"
                                            className={cn(
                                                'rounded-xl h-9 px-2.5 text-xs font-black cursor-pointer gap-1 shrink-0',
                                                isDark
                                                    ? 'border-sky-400/35 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                                                    : 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100'
                                            )}
                                            title={`${matchedGuest.displayName} sanal kaydından hızlı eşitle`}
                                        >
                                            {quickSyncUid === student.uid ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            )}
                                            <span>Eşitle</span>
                                        </Button>
                                    )}

                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                        className="rounded-xl h-9 px-2.5 text-xs font-bold shrink-0"
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

            {/* Tekil Detay & Eşitleme Modalı */}
            <Dialog open={Boolean(detailStudent)} onOpenChange={open => !open && setDetailStudent(null)}>
                <DialogContent
                    className={cn(
                        'w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6',
                        isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    )}
                >
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <span>🗺️</span>
                            <span>{detailStudent?.displayName} — Diyanet 30 Adım Macerası</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold">
                            Öğrencinin bağımsız Elifba Macerası ilerlemesini inceleyin, adım onaylayın veya sanal öğrenci kaydıyla eşitleyin.
                        </DialogDescription>
                    </DialogHeader>

                    {detailStudent && (
                        <TeacherStudentAdventureCard
                            student={detailStudent}
                            ambianceTheme={ambianceTheme}
                            guestStudents={guestStudents}
                            guestProgressMap={guestProgressMap}
                            classInfo={{
                                classId: selectedClassId,
                                className: className || '',
                                branch: selectedBranch
                            }}
                            onGuestProgressUpdated={onGuestProgressUpdated}
                            onStudentUpdated={(uid, nextAdv) => {
                                onStudentUpdated(uid, nextAdv);
                                setDetailStudent(prev =>
                                    prev && prev.uid === uid ? { ...prev, elifbaAdventure: nextAdv } : prev
                                );
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Toplu Sanal <-> Kayıtlı Öğrenci Eşitleme Modalı */}
            <Dialog open={isBulkSyncOpen} onOpenChange={setIsBulkSyncOpen}>
                <DialogContent
                    className={cn(
                        'w-[96vw] max-w-3xl max-h-[90vh] flex flex-col rounded-3xl p-4 sm:p-6',
                        isDark ? 'bg-slate-950 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                    )}
                >
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl font-black flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-sky-500" />
                            <span>Sanal Öğrenci Okuma Kaydı ↔ Kayıtlı Öğrenci Eşitleme</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold">
                            Okutmayı sanal öğrenciler üzerinden yaparken, istediğiniz zaman tek tuşla kayıtlı öğrencilerin Diyanet 30 Adım Macerası ile eşitleme yapabilirsiniz.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Eşitleme Yönü Seçici */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
                        <button
                            type="button"
                            onClick={() => handleDirectionChange('guest_to_reg')}
                            className={cn(
                                'p-3 rounded-2xl border-2 text-left transition-all cursor-pointer',
                                syncDirection === 'guest_to_reg'
                                    ? 'border-sky-500 bg-sky-500/15'
                                    : isDark
                                    ? 'border-white/10 bg-white/5'
                                    : 'border-slate-200 bg-slate-50'
                            )}
                        >
                            <div className="flex items-center gap-1.5 text-xs font-black">
                                <Download className="w-4 h-4 text-sky-500" />
                                <span>Sanal Kayıttan ➔ Kayıtlı Maceraya</span>
                            </div>
                            <p className="text-[11px] opacity-75 mt-1">
                                Öğretmen panelinde sanal öğrencilerde onayladığınız Diyanet adımlarını öğrencinin macerasında açar ve tamamlandı işaretler.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDirectionChange('reg_to_guest')}
                            className={cn(
                                'p-3 rounded-2xl border-2 text-left transition-all cursor-pointer',
                                syncDirection === 'reg_to_guest'
                                    ? 'border-emerald-500 bg-emerald-500/15'
                                    : isDark
                                    ? 'border-white/10 bg-white/5'
                                    : 'border-slate-200 bg-slate-50'
                            )}
                        >
                            <div className="flex items-center gap-1.5 text-xs font-black">
                                <Upload className="w-4 h-4 text-emerald-500" />
                                <span>Kayıtlı Maceradan ➔ Sanal Kayda</span>
                            </div>
                            <p className="text-[11px] opacity-75 mt-1">
                                Öğrencinin kendi hesabında geçip bitirdiği adımları sanal Kur&apos;an takip çizelgenize aktarır.
                            </p>
                        </button>
                    </div>

                    {/* Öğrenci Eşleştirme Listesi */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 max-h-[45vh]">
                        {students.map(s => {
                            const selectedGuestId = manualGuestPairs[s.uid] || autoGuestPairMap[s.uid]?.uid || '';
                            const guestObj = guestStudents.find(g => g.uid === selectedGuestId);
                            const gSum = summarizeQuranProgressForMatch(
                                guestObj ? guestProgressMap[guestObj.uid] : undefined
                            );
                            const rStats = computeAdventureStats(s.elifbaAdventure);
                            const rStep = toCompatibleAdventureData(
                                s.elifbaAdventure,
                                s.displayName || 'Öğrenci'
                            ).unlockedStage;
                            const isChecked = selectedSyncUids.includes(s.uid);

                            return (
                                <div
                                    key={s.uid}
                                    className={cn(
                                        'p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all',
                                        isChecked
                                            ? isDark
                                                ? 'border-sky-500/40 bg-sky-500/10'
                                                : 'border-sky-300 bg-sky-50/70'
                                            : isDark
                                            ? 'border-white/10 bg-white/4'
                                            : 'border-slate-200 bg-slate-50/50'
                                    )}
                                >
                                    <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            disabled={!guestObj}
                                            onChange={e => {
                                                const next = e.target.checked;
                                                setSelectedSyncUids(prev =>
                                                    next
                                                        ? Array.from(new Set([...prev, s.uid]))
                                                        : prev.filter(id => id !== s.uid)
                                                );
                                            }}
                                            className="w-4 h-4 rounded accent-sky-600 shrink-0 cursor-pointer"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-black text-xs sm:text-sm truncate">
                                                {s.displayName}
                                            </div>
                                            <div className="text-[11px] opacity-75">
                                                Macera: Adım {rStep}/30 ({rStats.completedCount} tamamlandı)
                                            </div>
                                        </div>
                                    </label>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <ArrowRight className="w-4 h-4 opacity-50 hidden sm:block" />
                                        <Select
                                            value={selectedGuestId || undefined}
                                            onValueChange={val => {
                                                setManualGuestPairs(prev => ({ ...prev, [s.uid]: val }));
                                                setSelectedSyncUids(prev =>
                                                    Array.from(new Set([...prev, s.uid]))
                                                );
                                            }}
                                        >
                                            <SelectTrigger
                                                className={cn(
                                                    'w-[210px] h-8 rounded-xl text-xs font-bold',
                                                    isDark
                                                        ? 'bg-slate-900 border-white/15 text-white'
                                                        : 'bg-white border-slate-300 text-slate-900'
                                                )}
                                            >
                                                <SelectValue placeholder="Sanal öğrenci eşleştir..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {guestStudents.map(gs => {
                                                    const gsS = summarizeQuranProgressForMatch(
                                                        guestProgressMap[gs.uid]
                                                    );
                                                    return (
                                                        <SelectItem
                                                            key={gs.uid}
                                                            value={gs.uid}
                                                            className="text-xs font-semibold"
                                                        >
                                                            {gs.displayName} (Adım {gsS.activeStep} • {gsS.completedCount}✓)
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>

                                        {guestObj && (
                                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                                Sanal: {gSum.completedCount}✓
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter className="pt-2 border-t border-slate-200 dark:border-white/10 flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBulkSyncOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Vazgeç
                        </Button>
                        <Button
                            type="button"
                            disabled={selectedSyncUids.length === 0 || isBulkSyncing}
                            onClick={handleExecuteBulkSync}
                            className="rounded-xl text-xs font-black bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white cursor-pointer gap-1.5"
                        >
                            {isBulkSyncing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            <span>Seçili {selectedSyncUids.length} Öğrenciyi Eşitle</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
