'use client';

import React, { useState, useEffect } from 'react';
import {
    ADVENTURE_STAGES,
    AVATAR_CHOICES,
    AdventureStage,
    AdventurePlayerData,
    getPlayerRank
} from '@/lib/elifba-adventure-data';
import {
    X,
    BookOpen,
    Gamepad2,
    Trophy,
    CheckCircle2,
    Lock,
    Unlock,
    Printer,
    RotateCcw,
    Volume2,
    VolumeX,
    Sparkles,
    Star,
    ShieldCheck,
    Sliders
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// 1. AŞAMA BAŞLATICI MODAL (3 FAZLI ÖĞRENME YOL HARİTASI)
// ─────────────────────────────────────────────────────────────────────────────

export function StageLauncherModal({
    stage,
    playerData,
    onClose,
    onLaunchPhase
}: {
    stage: AdventureStage | null;
    playerData: AdventurePlayerData;
    onClose: () => void;
    onLaunchPhase: (stageId: number, phase: 'learn' | 'reinforce' | 'exam') => void;
}) {
    if (!stage) return null;

    const progress = playerData.stageMastered[stage.id] || {
        learnDone: false,
        reinforceDone: false,
        examPassed: false,
        bestAccuracy: 0
    };
    const stars = playerData.stageStars[stage.id] || 0;
    const isFree = playerData.teacherFreeMode;

    // En mantıklı başlangıç fazını öner
    const recommendedPhase: 'learn' | 'reinforce' | 'exam' = !progress.learnDone
        ? 'learn'
        : !progress.reinforceDone
        ? 'reinforce'
        : 'exam';

    const difficultyMeta = {
        kolay: { label: 'Kolay Başlangıç', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
        orta: { label: 'Orta Seviye', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
        ileri: { label: 'İleri Düzey', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
        ustalik: { label: 'Ustalık Kapısı', cls: 'bg-purple-100 text-purple-800 border-purple-300' }
    }[stage.difficulty];

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border-4 border-sky-200 shadow-2xl p-6 sm:p-7 max-w-lg w-full relative animate-in fade-in zoom-in-95">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Üst Rozet ve Başlık */}
                <div className="text-center mb-5">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-md mb-3">
                        {stage.badgeIcon}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                            Adım {stage.id} / 24
                        </span>
                        <span className={cn("px-2.5 py-0.5 rounded-full border text-xs font-black", difficultyMeta.cls)}>
                            {difficultyMeta.label}
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        {stage.title}
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                        {stage.desc}
                    </p>
                    {stars > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-black text-amber-800">
                            <span>Kazanılan: {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
                            {progress.bestAccuracy > 0 && <span>• En İyi: %{progress.bestAccuracy}</span>}
                        </div>
                    )}
                </div>

                {/* 3 Fazlı Pedagojik Yol */}
                <div className="space-y-2.5 mb-6">
                    {/* Faz 1 */}
                    <button
                        type="button"
                        onClick={() => onLaunchPhase(stage.id, 'learn')}
                        className={cn(
                            "w-full p-3.5 rounded-2xl border-2 flex items-center gap-3.5 text-left transition-all cursor-pointer",
                            progress.learnDone
                                ? "bg-emerald-50/70 border-emerald-300 hover:bg-emerald-50"
                                : "bg-sky-50/80 border-sky-300 hover:border-sky-500 shadow-sm"
                        )}
                    >
                        <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-lg",
                            progress.learnDone ? "bg-emerald-500 text-white" : "bg-sky-500 text-white"
                        )}>
                            {progress.learnDone ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-slate-900">
                                1. Keşfet &amp; Bol Tekrar ({stage.items.length} Kart)
                            </div>
                            <div className="text-xs font-bold text-slate-500">
                                Her öğeyi dinle, ipucunu gör ve {stage.requiredRepeats} kez sesli tekrar et
                            </div>
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-sky-700">
                            {progress.learnDone ? 'Tekrarla' : 'Başla'}
                        </span>
                    </button>

                    {/* Faz 2 */}
                    <button
                        type="button"
                        disabled={!progress.learnDone && !isFree}
                        onClick={() => onLaunchPhase(stage.id, 'reinforce')}
                        className={cn(
                            "w-full p-3.5 rounded-2xl border-2 flex items-center gap-3.5 text-left transition-all",
                            progress.learnDone || isFree
                                ? progress.reinforceDone
                                    ? "bg-emerald-50/70 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                                    : "bg-teal-50/80 border-teal-300 hover:border-teal-500 shadow-sm cursor-pointer"
                                : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        )}
                    >
                        <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black",
                            progress.reinforceDone
                                ? "bg-emerald-500 text-white"
                                : progress.learnDone || isFree
                                ? "bg-teal-500 text-white"
                                : "bg-slate-200 text-slate-500"
                        )}>
                            {progress.reinforceDone ? (
                                <CheckCircle2 className="w-6 h-6" />
                            ) : progress.learnDone || isFree ? (
                                <Gamepad2 className="w-5 h-5" />
                            ) : (
                                <Lock className="w-5 h-5" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-slate-900">
                                2. Pekiştirme Mini Oyunları
                            </div>
                            <div className="text-xs font-bold text-slate-500">
                                Kart eşleştirme &amp; güvenli sesli tanıma ile hafızana kazı
                            </div>
                        </div>
                        {(progress.learnDone || isFree) && (
                            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-teal-700">
                                {progress.reinforceDone ? 'Oyna' : 'Başla'}
                            </span>
                        )}
                    </button>

                    {/* Faz 3 */}
                    <button
                        type="button"
                        disabled={!progress.reinforceDone && !isFree}
                        onClick={() => onLaunchPhase(stage.id, 'exam')}
                        className={cn(
                            "w-full p-3.5 rounded-2xl border-2 flex items-center gap-3.5 text-left transition-all",
                            progress.reinforceDone || isFree
                                ? progress.examPassed
                                    ? "bg-amber-50/70 border-amber-300 hover:bg-amber-50 cursor-pointer"
                                    : "bg-orange-50/80 border-orange-300 hover:border-orange-500 shadow-sm cursor-pointer"
                                : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        )}
                    >
                        <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black",
                            progress.examPassed
                                ? "bg-amber-500 text-white"
                                : progress.reinforceDone || isFree
                                ? "bg-orange-500 text-white"
                                : "bg-slate-200 text-slate-500"
                        )}>
                            {progress.examPassed ? (
                                <Trophy className="w-5 h-5" />
                            ) : progress.reinforceDone || isFree ? (
                                <Trophy className="w-5 h-5" />
                            ) : (
                                <Lock className="w-5 h-5" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-slate-900">
                                3. Ustalık Sınavı (%{stage.passingScorePercent} Geçiş)
                            </div>
                            <div className="text-xs font-bold text-slate-500">
                                Öğrendiğini kanıtla, yıldızları topla ve sonraki adımı aç!
                            </div>
                        </div>
                        {(progress.reinforceDone || isFree) && (
                            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-orange-700">
                                {progress.examPassed ? 'Sınava Gir' : 'Başla'}
                            </span>
                        )}
                    </button>
                </div>

                {/* Hızlı Devam CTA */}
                <button
                    type="button"
                    onClick={() => onLaunchPhase(stage.id, recommendedPhase)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-base border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg"
                >
                    {recommendedPhase === 'learn'
                        ? '📖 1. Faz: Keşfet & Bol Tekrar İle Başla!'
                        : recommendedPhase === 'reinforce'
                        ? '🎮 2. Faz: Pekiştirme Oyununa Devam Et!'
                        : '🏆 3. Faz: Ustalık Sınavına Başla!'}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OYUNCU PROFİLİ & AVATAR SEÇİCİ MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function ProfileAvatarModal({
    open,
    currentName,
    currentAvatar,
    totalStars,
    onClose,
    onSave
}: {
    open: boolean;
    currentName: string;
    currentAvatar: string;
    totalStars: number;
    onClose: () => void;
    onSave: (name: string, avatar: string) => void;
}) {
    const [name, setName] = useState(currentName);
    const [avatar, setAvatar] = useState(currentAvatar);

    useEffect(() => {
        if (open) {
            setName(currentName);
            setAvatar(currentAvatar);
        }
    }, [open, currentName, currentAvatar]);

    if (!open) return null;

    const rank = getPlayerRank(totalStars);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border-4 border-sky-300 shadow-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in fade-in zoom-in-95">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-5xl mb-2">{avatar}</div>
                <div className={cn("text-xs font-black uppercase tracking-wider mb-1", rank.color)}>
                    {rank.icon} Ünvan: {rank.title}
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">
                    Kaşif Profilin
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-bold mb-4">
                    Sertifikanda ve maceranda görünecek adını ve karakterini seç!
                </p>

                {/* Avatar Seçimi */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {AVATAR_CHOICES.map(av => (
                        <button
                            key={av}
                            type="button"
                            onClick={() => setAvatar(av)}
                            className={cn(
                                "h-12 rounded-2xl text-2xl flex items-center justify-center border-2 transition-all cursor-pointer",
                                avatar === av
                                    ? "bg-sky-50 border-sky-500 ring-2 ring-sky-200 scale-105"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            )}
                        >
                            {av}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onSave(name.trim() || 'Küçük Hafız', avatar)}
                    placeholder="Adını Buraya Yaz..."
                    maxLength={25}
                    className="w-full text-center text-lg font-black text-slate-900 border-3 border-sky-200 focus:border-sky-500 rounded-2xl py-3 px-4 outline-none transition-colors mb-5"
                />

                <button
                    type="button"
                    onClick={() => onSave(name.trim() || 'Küçük Hafız', avatar)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-base border-b-4 border-orange-700 active:border-b-0 transition-all cursor-pointer shadow-lg"
                >
                    🚀 Kaydet ve Devam Et!
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ROZET DOLABI MODALI (TROPHY CABINET)
// ─────────────────────────────────────────────────────────────────────────────

export function BadgesTrophyModal({
    open,
    earnedBadges,
    onClose
}: {
    open: boolean;
    earnedBadges: string[];
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border-4 border-purple-300 shadow-2xl p-6 max-w-2xl w-full text-center relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-4xl mb-1">🏅</div>
                <h2 className="text-xl sm:text-2xl font-black text-purple-950">
                    Rozet &amp; Başarı Koleksiyonu
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-bold mb-4">
                    Ustalık sınavlarını geçtikçe kazandığın rozetler ({earnedBadges.length} / {ADVENTURE_STAGES.length})
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 overflow-y-auto pr-1 py-1 flex-1">
                    {ADVENTURE_STAGES.map(stage => {
                        const isEarned = earnedBadges.includes(stage.badgeId);
                        return (
                            <div
                                key={stage.id}
                                className={cn(
                                    "rounded-2xl p-3 border-2 text-center transition-all flex flex-col items-center justify-center",
                                    isEarned
                                        ? "bg-gradient-to-b from-purple-50 to-white border-purple-300 shadow-sm"
                                        : "bg-slate-50 border-slate-200 opacity-55"
                                )}
                            >
                                <div className="text-3xl mb-1">
                                    {isEarned ? stage.badgeIcon : '🔒'}
                                </div>
                                <div className="text-xs font-black text-purple-950 line-clamp-1">
                                    {stage.badgeName}
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                    {isEarned ? 'Kazanıldı ✨' : `Adım ${stage.id}`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AYARLAR & ÖĞRETMEN SERBEST MODU MODALI
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsModal({
    open,
    soundEnabled,
    teacherFreeMode,
    onToggleSound,
    onToggleTeacherFreeMode,
    onResetProgress,
    onClose
}: {
    open: boolean;
    soundEnabled: boolean;
    teacherFreeMode: boolean;
    onToggleSound: () => void;
    onToggleTeacherFreeMode: () => void;
    onResetProgress: () => void;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-2xl p-6 max-w-md w-full relative animate-in fade-in zoom-in-95">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Macera Ayarları</h2>
                        <p className="text-xs font-bold text-slate-500">Ses, Öğretmen Modu ve İlerleme</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Ses Kontrolü */}
                    <button
                        type="button"
                        onClick={onToggleSound}
                        className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-sky-300 flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            {soundEnabled ? (
                                <Volume2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                                <VolumeX className="w-5 h-5 text-rose-500" />
                            )}
                            <div className="text-left">
                                <div className="text-sm font-black text-slate-900">Ses Efektleri ve Telaffuz</div>
                                <div className="text-xs font-semibold text-slate-500">
                                    {soundEnabled ? 'Tüm sesler açık' : 'Sessiz mod'}
                                </div>
                            </div>
                        </div>
                        <span
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-black",
                                soundEnabled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            )}
                        >
                            {soundEnabled ? 'AÇIK' : 'KAPALI'}
                        </span>
                    </button>

                    {/* Öğretmen Serbest Keşif Modu */}
                    <button
                        type="button"
                        onClick={onToggleTeacherFreeMode}
                        className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-300 flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            {teacherFreeMode ? (
                                <Unlock className="w-5 h-5 text-amber-600" />
                            ) : (
                                <ShieldCheck className="w-5 h-5 text-sky-600" />
                            )}
                            <div className="text-left">
                                <div className="text-sm font-black text-slate-900">Öğretmen / Serbest Keşif Modu</div>
                                <div className="text-xs font-semibold text-slate-500">
                                    {teacherFreeMode
                                        ? 'Tüm 24 adımın kilidi serbestçe açık'
                                        : 'Normal öğrenci modu (Adım adım sınavla açılır)'}
                                </div>
                            </div>
                        </div>
                        <span
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-black shrink-0 ml-2",
                                teacherFreeMode ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-800"
                            )}
                        >
                            {teacherFreeMode ? 'SERBEST' : 'AŞAMALI'}
                        </span>
                    </button>

                    {/* İlerlemeyi Sıfırla */}
                    <button
                        type="button"
                        onClick={onResetProgress}
                        className="w-full p-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex items-center gap-3 text-rose-700 cursor-pointer"
                    >
                        <RotateCcw className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <div className="text-sm font-black">Tüm İlerlemeyi Sıfırla</div>
                            <div className="text-xs font-semibold text-rose-500">
                                Yıldızları, XP ve kilitleri 1. adıma döndürür
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. KİŞİYE ÖZEL YAZDIRILABİLİR BAŞARI SERTİFİKASI
// ─────────────────────────────────────────────────────────────────────────────

export function CertificateModal({
    open,
    playerData,
    totalStars,
    completedStagesCount,
    onClose
}: {
    open: boolean;
    playerData: AdventurePlayerData;
    totalStars: number;
    completedStagesCount: number;
    onClose: () => void;
}) {
    if (!open) return null;

    const rank = getPlayerRank(totalStars);

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-3xl w-full my-auto">
                <div
                    id="printable-certificate-sheet"
                    className="bg-[#fffdf5] rounded-3xl border-[12px] border-double border-amber-700 shadow-2xl p-6 sm:p-10 text-center relative overflow-hidden"
                    style={{
                        backgroundImage:
                            'radial-gradient(#fef3c7 15%, transparent 16%), radial-gradient(#fffbeb 15%, transparent 16%)',
                        backgroundSize: '24px 24px',
                        backgroundPosition: '0 0, 12px 12px'
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="print:hidden absolute top-4 right-4 w-9 h-9 rounded-full bg-amber-100 hover:bg-rose-100 text-amber-800 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-xl sm:text-2xl font-serif text-amber-800 mb-2 font-bold" dir="rtl">
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </div>

                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-900 tracking-tight mb-1">
                        KUR&apos;AN-I KERİM ELİFBASI
                    </h2>
                    <div className="text-sm sm:text-base font-extrabold text-amber-700 tracking-wider mb-5">
                        🌟 ÜSTÜN BAŞARI VE ŞAMPİYONLUK BELGESİ 🌟
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-amber-900 max-w-lg mx-auto mb-3">
                        Bu belge, Büyük Elifba Macerası&apos;ndaki adımları tekrar, pekiştirme ve ustalık sınavlarıyla tamamlayan öğrencimiz:
                    </p>

                    <div className="inline-flex items-center gap-3 bg-white border-3 border-amber-400 rounded-3xl px-7 py-3 my-2 shadow-md shadow-amber-200/50">
                        <span className="text-3xl sm:text-4xl">{playerData.avatar}</span>
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-sky-900">
                            {playerData.name}
                        </h3>
                    </div>

                    <div className="text-xs sm:text-sm md:text-base font-bold text-amber-950 max-w-xl mx-auto my-4 leading-relaxed">
                        Elifba harflerini, harekeleri, med, cezm, şedde ve tenvin kaidelerini başarıyla öğrenerek{' '}
                        <strong className="text-amber-800">&ldquo;{rank.title}&rdquo;</strong> ünvanını almaya hak kazanmıştır.
                        Kur&apos;an yolunda ömür boyu başarılar dileriz.
                    </div>

                    <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap my-5">
                        <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                            💎 Puan: <strong>{playerData.xp}</strong> XP
                        </div>
                        <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                            ⭐ Yıldız: <strong>{totalStars}</strong>
                        </div>
                        <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                            🏁 Adım: <strong>{completedStagesCount} / 24</strong>
                        </div>
                        <div className="bg-white border-2 border-amber-300 rounded-2xl px-4 py-1.5 text-xs sm:text-sm font-extrabold text-sky-900 shadow-sm">
                            📅 {new Date().toLocaleDateString('tr-TR')}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t-2 border-amber-300/60 mt-4 text-left px-2 sm:px-6">
                        <div>
                            <div className="font-extrabold text-amber-900 text-xs sm:text-sm">Din Dersi Atölyesi</div>
                            <div className="text-[10px] sm:text-xs text-amber-700 font-semibold">
                                Büyük Elifba Macerası Akademisi
                            </div>
                        </div>

                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 border-4 border-dashed border-white text-white flex flex-col items-center justify-center shadow-lg font-black text-[10px] sm:text-xs text-center">
                            <span className="text-lg sm:text-xl">👑</span>
                            <span>ONAYLI</span>
                        </div>

                        <div className="text-right">
                            <div className="font-extrabold text-amber-900 text-xs sm:text-sm">Maskot Hüdhüd</div>
                            <div className="text-[10px] sm:text-xs text-amber-700 font-semibold">Tebrikler ✨</div>
                        </div>
                    </div>
                </div>

                <div className="print:hidden flex items-center justify-center gap-3 mt-4">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-full bg-amber-500 hover:bg-amber-400 text-white font-black px-6 py-3 shadow-lg flex items-center gap-2 cursor-pointer border-b-4 border-amber-700 active:border-b-0"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Sertifikayı Yazdır / PDF Kaydet</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-white text-slate-700 font-bold px-6 py-3 cursor-pointer"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
