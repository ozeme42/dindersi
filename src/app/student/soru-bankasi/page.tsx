'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, UserProgress } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
    BookOpen, GraduationCap, PlayCircle, Target, ArrowLeft, 
    BookText, Sparkles, ChevronRight, Map, Lock, Zap,
    Star, Trophy, Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- TİP TANIMLARI ---
type EnrichedCourse = Course & {
    className?: string;
    lessonProgress?: number;
    questionBankProgress?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    passedTests?: number;
    totalQuestionBankTests?: number;
    displayTitle?: string;
};

// Kurs temalarını renk paleti ile eşleştir
const COURSE_THEMES = [
    { gradient: "from-sky-500 via-blue-600 to-indigo-700", glow: "rgba(99,102,241,0.5)", border: "border-sky-500/40", accent: "text-sky-300", bg: "bg-sky-500/10", barColor: "bg-sky-400", icon: "📚" },
    { gradient: "from-fuchsia-500 via-purple-600 to-violet-700", glow: "rgba(168,85,247,0.5)", border: "border-fuchsia-500/40", accent: "text-fuchsia-300", bg: "bg-fuchsia-500/10", barColor: "bg-fuchsia-400", icon: "🏫" },
    { gradient: "from-rose-500 via-pink-600 to-fuchsia-700", glow: "rgba(244,63,94,0.5)", border: "border-rose-500/40", accent: "text-rose-300", bg: "bg-rose-500/10", barColor: "bg-rose-400", icon: "🎒" },
    { gradient: "from-emerald-500 via-teal-600 to-cyan-700", glow: "rgba(20,184,166,0.5)", border: "border-emerald-500/40", accent: "text-emerald-300", bg: "bg-emerald-500/10", barColor: "bg-emerald-400", icon: "📐" },
    { gradient: "from-amber-500 via-orange-600 to-red-700", glow: "rgba(249,115,22,0.5)", border: "border-amber-500/40", accent: "text-amber-300", bg: "bg-amber-500/10", barColor: "bg-amber-400", icon: "✏️" },
    { gradient: "from-cyan-500 via-blue-600 to-sky-700", glow: "rgba(6,182,212,0.5)", border: "border-cyan-500/40", accent: "text-cyan-300", bg: "bg-cyan-500/10", barColor: "bg-cyan-400", icon: "🎓" },
];

// --- KURS KARTI ---
const CourseCard = ({ course, index }: { course: EnrichedCourse; index: number }) => {
    const theme = COURSE_THEMES[index % COURSE_THEMES.length];
    const isCompleted = (course.lessonProgress || 0) >= 100 && (course.questionBankProgress || 0) >= 100;
    const isLocked = false; // gelecekte kilit sistemi için

    return (
        <div className={cn(
            "group relative rounded-3xl overflow-hidden border transition-all duration-300 active:scale-[0.97]",
            theme.border,
            isCompleted ? "opacity-80" : ""
        )} style={{ boxShadow: `0 8px 40px ${theme.glow}` }}>

            {/* Degrade Arka Plan */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.15]", theme.gradient)} />
            <div className="absolute inset-0 bg-[#09071a]/80 backdrop-blur-sm" />

            {/* Üst parlak çizgi */}
            <div className={cn("absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent")} />

            {/* Dekoratif arka ikon */}
            <div className="absolute -right-4 -bottom-4 text-[7rem] opacity-[0.06] select-none pointer-events-none">{theme.icon}</div>

            {/* İÇERİK */}
            <div className="relative p-5 space-y-4">

                {/* Üst satır: ikon + rozet */}
                <div className="flex items-start justify-between gap-3">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 shadow-inner", `bg-gradient-to-br ${theme.gradient}`)}>
                        <BookText className="w-7 h-7 text-white drop-shadow-lg" />
                    </div>
                    <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-bold", theme.bg, theme.border, theme.accent)}>
                        <GraduationCap className="w-3 h-3" />
                        {course.className || 'Genel'}
                    </div>
                </div>

                {/* Başlık */}
                <div>
                    <h3 className="text-xl font-black text-white leading-tight">
                        {course.displayTitle || course.title}
                    </h3>
                    <p className={cn("text-xs font-semibold mt-1 flex items-center gap-1", theme.accent)}>
                        <Sparkles className="w-3 h-3" />
                        {course.totalQuestionBankTests || 0} Test Mevcut
                    </p>
                </div>

                {/* İlerleme çubukları */}
                <div className="space-y-3">
                    {/* Ders İlerlemesi */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konular</span>
                            </div>
                            <span className="text-[10px] font-black text-white tabular-nums">
                                {course.completedTopicsCount || 0}<span className="text-slate-600">/{course.topicsCount || 0}</span>
                            </span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                                style={{ width: `${course.lessonProgress || 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Test İlerlemesi */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Testler</span>
                            </div>
                            <span className="text-[10px] font-black text-white tabular-nums">
                                {course.passedTests || 0}<span className="text-slate-600">/{course.totalQuestionBankTests || 0}</span>
                            </span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                                style={{ width: `${course.questionBankProgress || 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Eylem Butonları */}
                <div className="grid grid-cols-5 gap-2.5 pt-1">
                    {/* Ders Butonu */}
                    <Link href={`/student/ders/${course.id}`} className="col-span-2">
                        <div className="h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95">
                            <PlayCircle className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300 font-black text-xs uppercase tracking-wide">Ders</span>
                        </div>
                    </Link>

                    {/* Test Butonu */}
                    <Link href={`/student/soru-bankasi/${course.id}`} className="col-span-3">
                        <div className={cn(
                            "h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 relative overflow-hidden border border-white/20 shadow-lg",
                            `bg-gradient-to-r ${theme.gradient}`
                        )} style={{ boxShadow: `0 4px 20px ${theme.glow}` }}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-white/30" />
                            <span className="relative text-white drop-shadow">Test Çöz</span>
                            <ChevronRight className="relative w-4 h-4 text-white/80" />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Tamamlandı rozeti */}
            {isCompleted && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                    <Star className="w-2.5 h-2.5 fill-white" /> TAM
                </div>
            )}
        </div>
    );
};

// --- YÜKLEME SKELETON ---
const LoadingSkeleton = () => (
    <div className="rounded-3xl bg-slate-900/50 border border-white/5 p-5 space-y-4">
        <div className="flex justify-between">
            <Skeleton className="h-14 w-14 rounded-2xl bg-slate-800" />
            <Skeleton className="h-7 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-6 w-3/4 bg-slate-800 rounded-xl" />
            <Skeleton className="h-4 w-1/2 bg-slate-800 rounded-xl" />
        </div>
        <div className="space-y-3">
            <Skeleton className="h-2 w-full bg-slate-800 rounded-full" />
            <Skeleton className="h-2 w-full bg-slate-800 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl bg-slate-800" />
    </div>
);

// --- ANA SAYFA ---
export default function SoruBankasiPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCoursesAndProgress() {
            if (!user) { setIsLoading(false); return; }
            setIsLoading(true);
            try {
                const studentClassName = user.class?.split(' - ')[0];
                const classesQuery = query(collection(db, "classes"), orderBy("createdAt", "asc"));
                const [classesSnapshot, allCoursesSnapshot] = await Promise.all([
                    getDocs(classesQuery),
                    getDocs(collection(db, "courses"))
                ]);
                const allClasses = classesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
                const allCourses = allCoursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
                const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
                const filteredCourses = allCourses.filter(course =>
                    !course.isTeacherOnly && ((studentClass && course.classId === studentClass.id) || !course.classId)
                );
                const coursesData = await Promise.all(filteredCourses.map(async (course) => {
                    const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
                    const qbStatsPromise = getCourseQuestionBankStats(course.id, user.uid);
                    const [progressSnap, questionBankStats] = await Promise.all([getDoc(progressRef), qbStatsPromise]);
                    let completedTopicsCount = 0;
                    if (progressSnap.exists()) {
                        const progressData = progressSnap.data() as UserProgress;
                        completedTopicsCount = Object.values(progressData).filter(topic => topic.completionCount > 0).length;
                    }
                    const unitsRef = collection(db, 'courses', course.id, 'units');
                    const unitsSnap = await getDocs(unitsRef);
                    let totalTopics = 0;
                    for (const unitDoc of unitsSnap.docs) {
                        const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                        totalTopics += topicsSnap.size;
                    }
                    const lessonProgress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;
                    const lower = (course.title || "").toLocaleLowerCase('tr');
                    let finalTitle = course.title || "";
                    if (lower.includes("dkab") || lower.includes("din kültürü")) finalTitle = "Din Kültürü ve Ahlak Bilgisi";
                    else if (lower.includes("siyer") || lower.includes("peygamber")) finalTitle = "Peygamberimizin Hayatı";
                    return {
                        ...course,
                        displayTitle: finalTitle,
                        className: studentClass?.name || 'Genel',
                        lessonProgress,
                        completedTopicsCount,
                        topicsCount: totalTopics,
                        questionBankProgress: questionBankStats.completionPercentage,
                        passedTests: questionBankStats.passedTests,
                        totalQuestionBankTests: questionBankStats.totalTests,
                    };
                }));
                coursesData.sort((a, b) => {
                    const tA = (a.displayTitle || a.title).toLocaleLowerCase('tr');
                    const tB = (b.displayTitle || b.title).toLocaleLowerCase('tr');
                    if (tA.includes('din kültürü')) return -1;
                    if (tB.includes('din kültürü')) return 1;
                    return tA.localeCompare(tB, 'tr');
                });
                setCourses(coursesData);
            } catch (error) {
                console.error("Hata:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCoursesAndProgress();
    }, [user]);

    const totalTests = courses.reduce((s, c) => s + (c.totalQuestionBankTests || 0), 0);
    const passedTests = courses.reduce((s, c) => s + (c.passedTests || 0), 0);
    const overallProgress = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#09071a] text-white font-sans">

            {/* ══════ ARKA PLAN ══════ */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-900/25 rounded-full blur-[130px]" />
                <div className="absolute top-1/2 -right-20 w-[350px] h-[350px] bg-violet-900/20 rounded-full blur-[110px]" />
                <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] bg-cyan-900/15 rounded-full blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* ══════ YAPIŞIK BAŞLIK ÇUBUĞU ══════ */}
            <header className="sticky top-0 z-40">
                <div className="absolute inset-0 bg-[#09071a]/80 backdrop-blur-2xl border-b border-white/5" />
                <div className="relative max-w-lg mx-auto px-4 py-3 flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0">
                        <Link href="/student"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-0.5">Öğrenci Paneli</p>
                        <h1 className="text-white font-black text-lg leading-none flex items-center gap-2">
                            <Map className="h-5 w-5 text-sky-400" />
                            Macera Haritası
                        </h1>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 shrink-0">
                        <Trophy className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-amber-300 font-black text-sm tabular-nums">{passedTests}/{totalTests}</span>
                    </div>
                </div>
            </header>

            {/* ══════ ANA İÇERİK ══════ */}
            <main className="max-w-lg mx-auto px-4 pt-5 pb-28 space-y-5 relative z-10">

                {/* Genel İlerleme Kartı */}
                {!isLoading && courses.length > 0 && (
                    <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_16px_60px_rgba(14,165,233,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/60 via-blue-900/40 to-indigo-900/60" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.2),transparent_60%)]" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
                        <div className="relative p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-sky-300 text-xs font-black uppercase tracking-widest mb-0.5">Genel İlerleme</p>
                                    <p className="text-white font-black text-2xl tabular-nums">{overallProgress}<span className="text-slate-400 font-bold text-base">%</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-xs font-bold mb-0.5">{courses.length} Ders</p>
                                    <p className="text-white font-black text-sm">{passedTests} / {totalTests} Test</p>
                                </div>
                            </div>
                            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(14,165,233,0.6)] transition-all duration-1000 ease-out"
                                    style={{ width: `${overallProgress}%` }}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* Başlık */}
                <div className="px-1 flex items-center gap-2">
                    <span className="w-1 h-4 bg-sky-400 rounded-full" />
                    <h2 className="text-white font-black text-xs uppercase tracking-[0.2em]">Dersler</h2>
                    {!isLoading && <span className="ml-auto text-slate-600 text-xs font-bold">{courses.length} ders</span>}
                </div>

                {/* Kurs Listesi */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <LoadingSkeleton key={i} />)}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="space-y-4">
                        {courses.map((course, i) => (
                            <CourseCard key={course.id} course={course} index={i} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-3xl bg-slate-900/80 border border-white/8 flex items-center justify-center mb-5 shadow-2xl">
                            <Map className="h-12 w-12 text-slate-600" />
                        </div>
                        <h3 className="text-white font-black text-lg mb-2">Harita Boş</h3>
                        <p className="text-slate-500 text-sm max-w-xs">Şu anda sınıfınıza tanımlı bir ders bulunmuyor.</p>
                    </div>
                )}
            </main>

            <style jsx global>{`
                body { background-color: #09071a; }
            `}</style>
        </div>
    );
}