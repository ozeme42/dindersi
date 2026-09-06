'use client';

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, PartyPopper, Repeat, Save, CheckCircle2, 
    Home, Trophy, Star, ArrowLeft, XOctagon, LogIn, 
    Gamepad2, Layers, LayoutDashboard, ListTodo, Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Confetti from "react-dom-confetti";

type GameEndScreenProps = {
    score: number;
    onSave?: () => void | Promise<any>;
    isSaving?: boolean;
    scoreSaved?: boolean;
    onRestart?: () => void | Promise<any>;
    backUrl?: string;
    passThreshold?: number;
    isSuccess?: boolean;
    successThreshold?: number;
    isMission?: boolean;
    customMessage?: string;
    onPlayAgain?: () => void | Promise<any>;
};

export function GameEndScreen({ 
    score, 
    onSave = () => {}, 
    isSaving = false, 
    onRestart = () => {}, 
    backUrl, 
    scoreSaved,
    passThreshold,
    isSuccess,
    successThreshold,
    isMission,
    customMessage,
    onPlayAgain
}: GameEndScreenProps) {
    const handleRestartAction = onPlayAgain || onRestart;
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher' || user?.role === 'superadmin';
    const mode = searchParams?.get('mode');
    const isMissionMode = isMission ?? (mode === 'mission');

    const threshold = successThreshold ?? passThreshold ?? 50;
    const isPassed = isSuccess !== undefined ? isSuccess : (score >= threshold);

    const [showConfetti, setShowConfetti] = useState(false);

    // --- AKILLI ROTA ÇÖZÜMLEME ---
    const pathParts = pathname ? pathname.split('/').filter(Boolean) : [];
    let detectedGameSlug = '';
    if (pathParts[0] === 'oyunlar' && pathParts[1] && pathParts[1] !== 'oyun') {
        detectedGameSlug = pathParts[1];
    }
    const gameSlug = detectedGameSlug || searchParams?.get('gameSlug') || searchParams?.get('game') || '';

    // Hedef URL'ler
    const topicSelectionUrl = gameSlug ? `/oyunlar/${gameSlug}` : '/oyunlar';
    const allGamesUrl = '/oyunlar';
    const studentHubUrl = '/student';
    const missionsUrl = '/student/gorevler';
    const teacherHubUrl = '/teacher';
    const loginRedirectUrl = `/login?redirect=${encodeURIComponent(topicSelectionUrl)}`;

    useEffect(() => {
        if (isMissionMode) {
            if (isPassed) setShowConfetti(true);
        } else if (isPassed && score > 0) {
            setShowConfetti(true);
        }
    }, [isPassed, isMissionMode, score]);

    // --- Ders Akışı ile Haberleşme ---
    useEffect(() => {
        if (typeof window !== 'undefined' && window.parent) {
            window.parent.postMessage({
                type: 'ACTIVITY_COMPLETED',
                score: score,
                passed: isPassed
            }, '*');
        }
    }, [score, isPassed]);

    // --- Başlık ve Açıklama Metinleri ---
    let title = '';
    let message = '';

    if (!user) {
        title = score > 0 ? "Harika Bir Oyun!" : "Oyun Tamamlandı";
        message = score > 0 
            ? `${score} puan kazandın! Skorunu profiline kaydedip sıralamada yükselmek için giriş yapabilirsin.` 
            : `Alıştırmayı tamamladın. Sisteme giriş yaparak XP kazanabilir ve rozetler açabilirsin!`;
    } else if (!isMissionMode) {
        title = isPassed ? "Tebrikler!" : "Oyun Tamamlandı";
        message = isPassed 
            ? "Harika bir iş çıkardın, konu hakkındaki bilgilerin gayet iyi görünüyor." 
            : "Biraz daha pratik yaparak daha yüksek puanlar alabilirsin.";
    } else {
        // GÖREV MODU
        title = isPassed ? "GÖREV BAŞARILI! 🏆" : "GÖREV BAŞARISIZ";
        if (threshold === 1000) {
            message = isPassed
                ? "Tebrikler! 1.000 XP barajını aşarak Milyoner görevini başarıyla tamamladın."
                : "Maalesef 1.000 XP barajına ulaşamadın. Görevi tamamlamak için büyük ödüle ulaşmalısın.";
        } else {
            message = isPassed
                ? `Tebrikler! %${threshold} başarı barajını aşarak görevi tamamladın.`
                : `Maalesef barajın altında kaldın. Görevi geçmek için en az %${threshold} başarı sağlamalısın.`;
        }
    }

    if (customMessage) {
        message = customMessage;
    }

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-3 md:p-6 pb-24 md:pb-6 relative overflow-hidden font-sans">
            <Confetti active={showConfetti} config={{ angle: 90, spread: 360, startVelocity: 40, elementCount: 80 }} />
            
            {/* Arka Plan Deseni */}
            <div className="absolute inset-0 z-0 opacity-[0.03]" 
                style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
            />

            {/* Arka Plan Dekoratif Işıklar */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[100px] -translate-y-1/2",
                    isMissionMode && !isPassed ? "bg-red-100/50" : "bg-indigo-100/50"
                )} />
                <div className={cn(
                    "absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[80px] translate-y-1/3",
                    isMissionMode && !isPassed ? "bg-rose-100/40" : "bg-purple-100/40"
                )} />
            </div>

            {/* Ana Kart */}
            <div className="relative z-10 w-full max-w-md animate-in zoom-in slide-in-from-bottom-4 duration-500">
                <Card className="w-full bg-white border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden rounded-3xl">
                    
                    {/* Üst Kullanıcı Rol Rozeti */}
                    <div className="flex justify-center pt-5 pb-1">
                        {!user ? (
                            <span className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1.5 shadow-sm">
                                <Gamepad2 className="w-3.5 h-3.5 text-amber-600" />
                                MİSAFİR MODU
                            </span>
                        ) : isMissionMode ? (
                            <span className={cn(
                                "px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider border flex items-center gap-1.5 shadow-sm",
                                isPassed 
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/80" 
                                    : "bg-rose-50 text-rose-800 border-rose-200/80"
                            )}>
                                <ListTodo className="w-3.5 h-3.5" />
                                GÖREV MODU
                            </span>
                        ) : isStudent ? (
                            <span className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200/80 flex items-center gap-1.5 shadow-sm">
                                <Star className="w-3.5 h-3.5 text-indigo-600 fill-indigo-500" />
                                ÖĞRENCİ MODU
                            </span>
                        ) : (
                            <span className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider bg-purple-50 text-purple-800 border border-purple-200/80 flex items-center gap-1.5 shadow-sm">
                                👨‍🏫 ÖĞRETMEN MODU
                            </span>
                        )}
                    </div>

                    {/* Durum İkonu ve Başlık */}
                    <div className="flex flex-col items-center text-center px-6 pt-3 pb-4">
                        <div className="relative mb-4 group">
                            <div className={cn("absolute inset-0 blur-2xl rounded-full opacity-25 transition-colors duration-500", 
                                isPassed ? "bg-emerald-400" : "bg-rose-400"
                            )} />
                            
                            <div className={cn("relative p-4 rounded-2xl shadow-sm transform transition-transform group-hover:scale-105 duration-300",
                                isPassed ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                            )}>
                                {isPassed ? (
                                    <Trophy className="h-9 w-9 text-amber-500 drop-shadow-sm" />
                                ) : (
                                    <XOctagon className="h-9 w-9 text-rose-500" />
                                )}
                            </div>

                            {isPassed && (
                                <div className="absolute -top-2.5 -right-2.5 animate-bounce delay-100">
                                    <PartyPopper className="h-5 w-5 text-yellow-500" />
                                </div>
                            )}
                        </div>
                        
                        <h2 className={cn("text-2xl font-black tracking-tight mb-1.5", 
                            isMissionMode && !isPassed ? "text-rose-600" : "text-slate-900"
                        )}>
                            {title}
                        </h2>
                        <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed max-w-[320px]">
                            {message}
                        </p>
                    </div>

                    {/* Skor Kartı */}
                    <div className="px-6 pb-4">
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center relative">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                TOPLAM PUAN
                            </span>
                            
                            <div className="flex items-center gap-2">
                                <span className={cn("text-5xl font-black tracking-tighter", 
                                    isPassed ? "text-slate-800" : "text-slate-700"
                                )}>
                                    {score}
                                </span>
                            </div>
                            
                            <div className="mt-2 flex items-center gap-2">
                                <div className={cn("text-xs font-bold px-3 py-0.5 rounded-full border flex items-center gap-1.5", 
                                    isPassed 
                                        ? "bg-emerald-100/60 text-emerald-700 border-emerald-200" 
                                        : "bg-rose-100/60 text-rose-700 border-rose-200"
                                )}>
                                    {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XOctagon className="w-3.5 h-3.5" />}
                                    {isMissionMode ? (isPassed ? "GÖREV BAŞARILI" : "GÖREV BAŞARISIZ") : (isPassed ? "BAŞARILI" : "TEKRAR DENE")}
                                </div>

                                {isStudent && score > 0 && (
                                    <div className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-indigo-500" />
                                        +{score} XP
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 1. DURUM: MİSAFİR KULLANICI CTA VE BUTONLARI */}
                    {!user && (
                        <>
                            {/* Giriş Yap & Skorunu Kaydet Kartı */}
                            <div className="mx-6 mb-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 shadow-sm flex flex-col items-center text-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm text-slate-800">Skorunu Profiline Kaydetmek İster misin?</h4>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed max-w-[280px]">
                                        Giriş yap veya ücretsiz kaydol; puanların profiline işlensin, XP kazan ve sıralamada yüksel!
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => router.push(loginRedirectUrl)}
                                    className="w-full h-10 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-1"
                                >
                                    <LogIn className="w-3.5 h-3.5" />
                                    Giriş Yap / Kaydol
                                </Button>
                            </div>

                            {/* Misafir Navigasyon Butonları */}
                            <div className="p-6 pt-0 space-y-2.5 bg-slate-50/50 border-t border-slate-100">
                                <Button 
                                    onClick={handleRestartAction}
                                    className="w-full h-11 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                                >
                                    <Repeat className="mr-2 h-4 w-4" />
                                    Tekrar Oyna
                                </Button>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        onClick={() => router.push(topicSelectionUrl)}
                                        variant="outline"
                                        className="h-10 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <Layers className="h-3.5 w-3.5 text-slate-500" />
                                        Konu Değiştir
                                    </Button>

                                    <Button 
                                        onClick={() => router.push(allGamesUrl)}
                                        variant="outline"
                                        className="h-10 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <Gamepad2 className="h-3.5 w-3.5 text-slate-500" />
                                        Tüm Oyunlar
                                    </Button>
                                </div>

                                <Button 
                                    onClick={() => router.push('/')}
                                    variant="ghost"
                                    className="w-full h-8 text-slate-400 hover:text-slate-700 text-xs font-medium rounded-xl flex items-center justify-center gap-1"
                                >
                                    <Home className="h-3 w-3" />
                                    Ana Sayfaya Dön
                                </Button>
                            </div>
                        </>
                    )}

                    {/* 2. DURUM: ÖĞRENCİ GÖREV MODU */}
                    {user && isMissionMode && (
                        <div className="p-6 pt-0 space-y-2.5 bg-slate-50/50 border-t border-slate-100">
                            {/* Görev Başarısız */}
                            {!isPassed && (
                                <>
                                    <Button 
                                        onClick={handleRestartAction}
                                        className="w-full h-12 text-base font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-200 transition-all"
                                    >
                                        <Repeat className="mr-2 h-4 w-4" />
                                        Görevi Tekrar Dene
                                    </Button>

                                    {isStudent && score > 0 && (
                                        <Button 
                                            onClick={onSave}
                                            disabled={isSaving || scoreSaved}
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 text-xs font-semibold rounded-xl border transition-all",
                                                scoreSaved 
                                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default" 
                                                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                                            )}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    Kaydediliyor...
                                                </>
                                            ) : scoreSaved ? (
                                                <>
                                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                                                    Puan Kaydedildi (Görev Tamamlanmadı)
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                                    Puanı Kaydet (Görev Tamamlanmadı)
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <Button 
                                            onClick={() => router.push(missionsUrl)}
                                            variant="outline"
                                            className="h-10 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5"
                                        >
                                            <ListTodo className="h-3.5 w-3.5 text-slate-500" />
                                            Görevlerime Dön
                                        </Button>
                                        <Button 
                                            onClick={() => router.push(studentHubUrl)}
                                            variant="outline"
                                            className="h-10 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5"
                                        >
                                            <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                                            Öğrenci Paneli
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Görev Başarılı */}
                            {isPassed && (
                                <>
                                    {/* Kaydetme Butonu ya da Kaydedildi Bildirimi */}
                                    {scoreSaved ? (
                                        <div className="w-full h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            Görev Puanı Başarıyla Kaydedildi! 🎉
                                        </div>
                                    ) : (
                                        <Button 
                                            onClick={onSave}
                                            disabled={isSaving}
                                            className="w-full h-12 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition-all"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Kaydediliyor...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Görev Puanını Kaydet (+{score} XP)
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {/* Görev Navigasyon Butonları */}
                                    <Button 
                                        onClick={() => router.push(missionsUrl)}
                                        className="w-full h-11 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <ListTodo className="h-4 w-4" />
                                        Görevlerime Dön
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            onClick={handleRestartAction}
                                            variant="outline"
                                            className="h-10 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5"
                                        >
                                            <Repeat className="h-3.5 w-3.5 text-slate-500" />
                                            Tekrar Oyna
                                        </Button>
                                        <Button 
                                            onClick={() => router.push(studentHubUrl)}
                                            variant="outline"
                                            className="h-10 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs flex items-center justify-center gap-1.5"
                                        >
                                            <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                                            Öğrenci Paneli
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* 3. DURUM: ÖĞRENCİ NORMAL MOD (SERBEST ALIŞTIRMA) */}
                    {user && !isMissionMode && isStudent && (
                        <div className="p-6 pt-0 space-y-2.5 bg-slate-50/50 border-t border-slate-100">
                            {/* Puan Kaydetme Aksiyonu */}
                            {scoreSaved ? (
                                <div className="w-full h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm animate-in fade-in">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Puanın Profiline Kaydedildi! (+{score} XP)
                                </div>
                            ) : score > 0 ? (
                                <Button 
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className="w-full h-12 text-base font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Puanı Profilime Kaydet (+{score} XP)
                                        </>
                                    )}
                                </Button>
                            ) : null}

                            {/* Navigasyon Grid'i */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={handleRestartAction} 
                                    variant="outline" 
                                    className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-1.5"
                                >
                                    <Repeat className="h-3.5 w-3.5 text-slate-500" />
                                    Tekrar Oyna
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push(topicSelectionUrl)}
                                    variant="outline" 
                                    className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-1.5"
                                >
                                    <Layers className="h-3.5 w-3.5 text-slate-500" />
                                    Konu Değiştir
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={() => router.push(studentHubUrl)}
                                    className="h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <LayoutDashboard className="h-3.5 w-3.5" />
                                    Öğrenci Paneli
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push(allGamesUrl)}
                                    variant="outline" 
                                    className="h-10 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5"
                                >
                                    <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                                    Tüm Oyunlar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 4. DURUM: ÖĞRETMEN VEYA DİĞER ROLLER */}
                    {user && !isStudent && (
                        <div className="p-6 pt-0 space-y-2.5 bg-slate-50/50 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={handleRestartAction} 
                                    className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-1.5"
                                >
                                    <Repeat className="h-3.5 w-3.5" />
                                    Tekrar Oyna
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push(topicSelectionUrl)}
                                    variant="outline" 
                                    className="h-11 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-1.5"
                                >
                                    <Layers className="h-3.5 w-3.5 text-slate-500" />
                                    Konu Değiştir
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    onClick={() => router.push(teacherHubUrl)}
                                    className="h-10 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <LayoutDashboard className="h-3.5 w-3.5" />
                                    Öğretmen Paneli
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push(allGamesUrl)}
                                    variant="outline" 
                                    className="h-10 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5"
                                >
                                    <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                                    Tüm Oyunlar
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}