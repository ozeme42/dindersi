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
    BookText, Sparkles, ChevronRight, Map, Zap,
    Star, Trophy, Loader2, Sun, Moon, LayoutGrid
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

type Theme = 'dark' | 'light';

const COURSE_THEMES = [
    { gradient: "from-sky-500 via-blue-600 to-indigo-700", glow: "rgba(99,102,241,0.4)", border: "border-sky-500/40", accent: "text-sky-400", bg: "bg-sky-500/10", barColor: "bg-sky-400", icon: "📚" },
    { gradient: "from-fuchsia-500 via-purple-600 to-violet-700", glow: "rgba(168,85,247,0.4)", border: "border-fuchsia-500/40", accent: "text-fuchsia-400", bg: "bg-fuchsia-500/10", barColor: "bg-fuchsia-400", icon: "🏫" },
    { gradient: "from-rose-500 via-pink-600 to-fuchsia-700", glow: "rgba(244,63,94,0.4)", border: "border-rose-500/40", accent: "text-rose-400", bg: "bg-rose-500/10", barColor: "bg-rose-400", icon: "🎒" },
    { gradient: "from-emerald-500 via-teal-600 to-cyan-700", glow: "rgba(20,184,166,0.4)", border: "border-emerald-500/40", accent: "text-emerald-400", bg: "bg-emerald-500/10", barColor: "bg-emerald-400", icon: "📐" },
    { gradient: "from-amber-500 via-orange-600 to-red-700", glow: "rgba(249,115,22,0.4)", border: "border-amber-500/40", accent: "text-amber-400", bg: "bg-amber-500/10", barColor: "bg-amber-400", icon: "✏️" },
    { gradient: "from-cyan-500 via-blue-600 to-sky-700", glow: "rgba(6,182,212,0.4)", border: "border-cyan-500/40", accent: "text-cyan-400", bg: "bg-cyan-500/10", barColor: "bg-cyan-400", icon: "🎓" },
];

// --- KURS KARTI ---
const CourseCard = ({ course, index, theme: t }: { course: EnrichedCourse; index: number; theme: Theme }) => {
    const courseTheme = COURSE_THEMES[index % COURSE_THEMES.length];
    const isCompleted = (course.lessonProgress || 0) >= 100 && (course.questionBankProgress || 0) >= 100;

    const cardBg = t === 'dark' ? 'bg-[#0d0b20]/90' : 'bg-white/90';
    const titleColor = t === 'dark' ? 'text-white' : 'text-slate-900';
    const subColor = t === 'dark' ? 'text-slate-400' : 'text-slate-500';
    const trackBg = t === 'dark' ? 'bg-black/40' : 'bg-slate-200';
    const borderOverlay = t === 'dark' ? 'border-white/5' : 'border-black/5';
    const btnSecondary = t === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200';
    const btnSecondaryText = t === 'dark' ? 'text-slate-300' : 'text-slate-600';

    return (
        <div className={cn(
            "group relative rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
            courseTheme.border, cardBg
        )} style={{ boxShadow: `0 4px 30px ${courseTheme.glow}` }}>
            {/* Top gradient overlay */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.08]", courseTheme.gradient)} />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {/* Decorative icon */}
            <div className="absolute -right-3 -bottom-3 text-[6rem] opacity-[0.05] select-none pointer-events-none">{courseTheme.icon}</div>

            <div className="relative p-5 space-y-4">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                    <div className={cn("w-13 h-13 rounded-2xl flex items-center justify-center border shrink-0 shadow-inner", `bg-gradient-to-br ${courseTheme.gradient}`)}>
                        <BookText className="w-6 h-6 text-white drop-shadow" />
                    </div>
                    <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-bold", courseTheme.bg, courseTheme.border, courseTheme.accent)}>
                        <GraduationCap className="w-3 h-3" />
                        {course.className || 'Genel'}
                    </div>
                </div>

                {/* Title */}
                <div>
                    <h3 className={cn("text-lg font-black leading-tight", titleColor)}>
                        {course.displayTitle || course.title}
                    </h3>
                    <p className={cn("text-xs font-semibold mt-1 flex items-center gap-1", courseTheme.accent)}>
                        <Sparkles className="w-3 h-3" />
                        {course.totalQuestionBankTests || 0} Test Mevcut
                    </p>
                </div>

                {/* Progress bars */}
                <div className="space-y-2.5">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3 h-3 text-violet-400" />
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", subColor)}>Konular</span>
                            </div>
                            <span className={cn("text-[10px] font-black tabular-nums", titleColor)}>
                                {course.completedTopicsCount || 0}<span className={subColor}>/{course.topicsCount || 0}</span>
                            </span>
                        </div>
                        <div className={cn("h-1.5 w-full rounded-full overflow-hidden border", trackBg, borderOverlay)}>
                            <div className="h-full rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)] transition-all duration-1000"
                                style={{ width: `${course.lessonProgress || 0}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-cyan-400" />
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", subColor)}>Testler</span>
                            </div>
                            <span className={cn("text-[10px] font-black tabular-nums", titleColor)}>
                                {course.passedTests || 0}<span className={subColor}>/{course.totalQuestionBankTests || 0}</span>
                            </span>
                        </div>
                        <div className={cn("h-1.5 w-full rounded-full overflow-hidden border", trackBg, borderOverlay)}>
                            <div className="h-full rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)] transition-all duration-1000"
                                style={{ width: `${course.questionBankProgress || 0}%` }} />
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                    <Link href={`/student/ders/${course.id}`} className="col-span-2">
                        <div className={cn("h-11 rounded-2xl border transition-all flex items-center justify-center gap-1.5 active:scale-95", btnSecondary)}>
                            <PlayCircle className={cn("w-3.5 h-3.5", btnSecondaryText)} />
                            <span className={cn("font-black text-[11px] uppercase tracking-wide", btnSecondaryText)}>Ders</span>
                        </div>
                    </Link>
                    <Link href={`/student/soru-bankasi/${course.id}`} className="col-span-3">
                        <div className={cn("h-11 rounded-2xl flex items-center justify-center gap-1.5 font-black text-[11px] uppercase tracking-wider active:scale-95 relative overflow-hidden border border-white/10", `bg-gradient-to-r ${courseTheme.gradient}`)}
                            style={{ boxShadow: `0 4px 15px ${courseTheme.glow}` }}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
                            <span className="relative text-white drop-shadow">Test Çöz</span>
                            <ChevronRight className="relative w-3.5 h-3.5 text-white/80" />
                        </div>
                    </Link>
                </div>
            </div>

            {isCompleted && (
                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    <Star className="w-2.5 h-2.5 fill-white" /> TAM
                </div>
            )}
        </div>
    );
};

// Loading skeleton
const LoadingSkeleton = ({ t }: { t: Theme }) => (
    <div className={cn("rounded-3xl border p-5 space-y-4", t === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200')}>
        <div className="flex justify-between">
            <Skeleton className={cn("h-13 w-13 rounded-2xl", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
            <Skeleton className={cn("h-7 w-24 rounded-full", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
        </div>
        <div className="space-y-2">
            <Skeleton className={cn("h-5 w-3/4 rounded-xl", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
            <Skeleton className={cn("h-3 w-1/2 rounded-xl", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
        </div>
        <div className="space-y-2">
            <Skeleton className={cn("h-1.5 w-full rounded-full", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
            <Skeleton className={cn("h-1.5 w-full rounded-full", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
        </div>
        <Skeleton className={cn("h-11 w-full rounded-2xl", t === 'dark' ? 'bg-slate-800' : 'bg-slate-200')} />
    </div>
);

// --- ANA SAYFA ---
export default function SoruBankasiPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState<Theme>('dark');

    // Persist theme
    useEffect(() => {
        const saved = localStorage.getItem('sb-theme') as Theme | null;
        if (saved) setTheme(saved);
    }, []);
    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('sb-theme', next);
    };

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

    // Theme tokens
    const pageBg = theme === 'dark' ? 'bg-[#09071a]' : 'bg-slate-50';
    const headerBg = theme === 'dark' ? 'bg-[#09071a]/80 border-white/5' : 'bg-white/90 border-slate-200';
    const titleColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
    const subColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
    const sectionLabelColor = theme === 'dark' ? 'text-white' : 'text-slate-700';
    const progressCardBg = theme === 'dark' ? 'bg-gradient-to-br from-sky-900/50 via-blue-900/30 to-indigo-900/50 border-sky-500/20' : 'bg-gradient-to-br from-sky-50 to-indigo-100 border-sky-200';
    const progressTitleColor = theme === 'dark' ? 'text-sky-300' : 'text-sky-600';
    const progressBigNumColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
    const progressTrack = theme === 'dark' ? 'bg-black/40' : 'bg-sky-200';
    const themeToggleBg = theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200';
    const backBtnBg = theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200';
    const sectionAccent = theme === 'dark' ? 'bg-sky-400' : 'bg-sky-500';
    const emptyBoxBg = theme === 'dark' ? 'bg-slate-900/80 border-white/8' : 'bg-white border-slate-200';
    const emptyIconColor = theme === 'dark' ? 'text-slate-600' : 'text-slate-300';

    return (
        <div className={cn("min-h-screen font-sans transition-colors duration-300", pageBg)}>

            {/* ══ ARKA PLAN ══ */}
            {theme === 'dark' && (
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-900/20 rounded-full blur-[130px]" />
                    <div className="absolute top-1/2 -right-20 w-[350px] h-[350px] bg-violet-900/15 rounded-full blur-[110px]" />
                    <div className="absolute bottom-0 -left-20 w-[300px] h-[300px] bg-cyan-900/10 rounded-full blur-[100px]" />
                </div>
            )}

            {/* ══ HEADER ══ */}
            <header className="sticky top-0 z-40">
                <div className={cn("absolute inset-0 backdrop-blur-2xl border-b", headerBg)} />
                <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
                    <Button asChild variant="ghost" size="icon" className={cn("w-10 h-10 rounded-2xl border transition-all shrink-0", backBtnBg)}>
                        <Link href="/student"><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-0.5", subColor)}>Öğrenci Paneli</p>
                        <h1 className={cn("font-black text-lg leading-none flex items-center gap-2", titleColor)}>
                            <Map className="h-5 w-5 text-sky-400" />
                            Macera Haritası
                        </h1>
                    </div>

                    {/* Desktop: stat pills */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5", theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
                            <Trophy className="h-3.5 w-3.5 text-amber-400" />
                            <span className={cn("font-black text-sm tabular-nums", theme === 'dark' ? 'text-amber-300' : 'text-amber-600')}>{passedTests}/{totalTests} Test</span>
                        </div>
                        <div className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5", theme === 'dark' ? 'bg-sky-500/10 border border-sky-500/20' : 'bg-sky-50 border border-sky-200')}>
                            <LayoutGrid className="h-3.5 w-3.5 text-sky-400" />
                            <span className={cn("font-black text-sm", theme === 'dark' ? 'text-sky-300' : 'text-sky-600')}>{courses.length} Ders</span>
                        </div>
                    </div>

                    {/* Mobile: compact stat */}
                    <div className={cn("flex md:hidden items-center gap-1.5 rounded-xl px-3 py-1.5", theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
                        <Trophy className="h-3.5 w-3.5 text-amber-400" />
                        <span className={cn("font-black text-sm tabular-nums", theme === 'dark' ? 'text-amber-300' : 'text-amber-600')}>{passedTests}/{totalTests}</span>
                    </div>

                    {/* Theme toggle */}
                    <button onClick={toggleTheme} className={cn("w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shrink-0", themeToggleBg)}>
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* ══ ANA İÇERİK ══ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-24">

                {/* Overall progress card — Desktop'ta yan panelde gösterilir */}
                {!isLoading && courses.length > 0 && (
                    <section className={cn(
                        "relative rounded-3xl overflow-hidden border mb-8 p-5 md:p-6",
                        progressCardBg
                    )}>
                        {theme === 'dark' && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />}
                        <div className="max-w-3xl">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className={cn("text-xs font-black uppercase tracking-widest mb-0.5", progressTitleColor)}>Genel İlerleme</p>
                                    <p className={cn("font-black text-3xl tabular-nums", progressBigNumColor)}>
                                        {overallProgress}<span className={cn("text-lg font-bold", subColor)}>%</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={cn("text-xs font-bold mb-0.5", subColor)}>{courses.length} Ders · {totalTests} Test</p>
                                    <p className={cn("font-black text-xl tabular-nums", progressBigNumColor)}>{passedTests} <span className={cn("text-sm font-bold", subColor)}>geçildi</span></p>
                                </div>
                            </div>
                            <div className={cn("h-3 w-full rounded-full overflow-hidden", progressTrack)}>
                                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_10px_rgba(14,165,233,0.5)] transition-all duration-1000"
                                    style={{ width: `${overallProgress}%` }} />
                            </div>
                        </div>
                    </section>
                )}

                {/* Section title */}
                <div className="flex items-center gap-2 mb-5 px-1">
                    <span className={cn("w-1 h-4 rounded-full", sectionAccent)} />
                    <h2 className={cn("font-black text-xs uppercase tracking-[0.2em]", sectionLabelColor)}>Dersler</h2>
                    {!isLoading && <span className={cn("ml-auto text-xs font-bold", subColor)}>{courses.length} ders</span>}
                </div>

                {/* Course grid: 1 col mobile, 2 col md, 3 col lg */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => <LoadingSkeleton key={i} t={theme} />)}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {courses.map((course, i) => (
                            <CourseCard key={course.id} course={course} index={i} theme={theme} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className={cn("w-24 h-24 rounded-3xl border flex items-center justify-center mb-5 shadow-xl", emptyBoxBg)}>
                            <Map className={cn("h-12 w-12", emptyIconColor)} />
                        </div>
                        <h3 className={cn("font-black text-lg mb-2", titleColor)}>Harita Boş</h3>
                        <p className={cn("text-sm max-w-xs", subColor)}>Şu anda sınıfınıza tanımlı bir ders bulunmuyor.</p>
                    </div>
                )}
            </main>
        </div>
    );
}