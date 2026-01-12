'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, UserProgress } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, GraduationCap, PlayCircle, Target, ArrowLeft, BrainCircuit, Sparkles, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// --- TİP TANIMLARI ---
type EnrichedCourse = Course & {
    className?: string;
    lessonProgress?: number;
    questionBankProgress?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    passedTests?: number;
    totalQuestionBankTests?: number;
    displayTitle?: string; // Görünen isim için yeni alan
};

// --- ARKA PLAN EFEKTLERİ ---
const CyberBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.03 }}/>
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
    </div>
);

// --- YENİ NESİL KART TASARIMI ---
const ModernCourseCard = ({ course }: { course: EnrichedCourse }) => {
    return (
        <div className="group relative h-full">
            {/* Arka plan parlama efekti */}
            <div className="absolute -inset-0.5 bg-gradient-to-b from-cyan-500/20 to-violet-500/20 rounded-[2rem] opacity-0 group-hover:opacity-100 blur-md transition duration-500" />
            
            <div className="relative h-full flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-900/10">
                
                {/* Üst Dekorasyon */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent blur-3xl rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />

                <div className="p-6 md:p-8 flex-1 flex flex-col gap-6">
                    
                    {/* Header: Sınıf & İkon */}
                    <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 group-hover:border-cyan-500/30">
                            <BrainCircuit className="w-7 h-7 text-cyan-400" />
                        </div>
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 backdrop-blur-md px-3 py-1 text-xs tracking-wide">
                            <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                            {course.className}
                        </Badge>
                    </div>

                    {/* Başlık */}
                    <div>
                        <h3 className="text-2xl font-black text-white leading-tight mb-1 group-hover:text-cyan-300 transition-colors">
                            {/* displayTitle kullanıyoruz */}
                            {course.displayTitle || course.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            {course.totalQuestionBankTests || 0} Test Mevcut
                        </p>
                    </div>

                    {/* İstatistikler (Grid) - KONULAR (SOL), TESTLER (SAĞ) */}
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                        
                        {/* 1. SOL TARAFTA: Konu Anlatımı İlerlemesi */}
                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 group-hover:border-violet-500/20 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-violet-400">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Konular</span>
                            </div>
                            <div className="flex items-end justify-between mb-1">
                                <span className="text-xl font-black text-white">{course.completedTopicsCount || 0}</span>
                                <span className="text-[10px] text-slate-500 mb-1">/ {course.topicsCount || 0}</span>
                            </div>
                            <Progress value={course.lessonProgress || 0} className="h-1.5 bg-slate-800" indicatorClassName="bg-violet-500" />
                        </div>

                        {/* 2. SAĞ TARAFTA: Soru Bankası İlerlemesi */}
                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-cyan-400">
                                <Target className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Testler</span>
                            </div>
                            <div className="flex items-end justify-between mb-1">
                                <span className="text-xl font-black text-white">{course.passedTests || 0}</span>
                                <span className="text-[10px] text-slate-500 mb-1">/ {course.totalQuestionBankTests || 0}</span>
                            </div>
                            <Progress value={course.questionBankProgress || 0} className="h-1.5 bg-slate-800" indicatorClassName="bg-cyan-500" />
                        </div>

                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="grid grid-cols-5 gap-3 pt-2">
                        {/* Ders Butonu (Küçük) */}
                        <Button asChild variant="ghost" className="col-span-2 h-12 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-white/10 font-bold text-xs">
                            <Link href={`/student/ders/${course.id}`}>
                                <PlayCircle className="w-4 h-4 mr-2" />
                                DERS
                            </Link>
                        </Button>

                        {/* Test Çöz Butonu (Büyük - Gradient) */}
                        <Button asChild className="col-span-3 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20 font-bold text-xs tracking-wider relative overflow-hidden group/btn border-0">
                            <Link href={`/student/soru-bankasi/${course.id}`}>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center justify-center">
                                    TEST ÇÖZ <ChevronRight className="w-4 h-4 ml-1" />
                                </span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- YÜKLEME SKELETON ---
const LoadingSkeleton = () => (
    <div className="rounded-[2rem] bg-slate-900/50 border border-white/5 p-8 space-y-6 h-[380px] flex flex-col">
        <div className="flex justify-between">
            <Skeleton className="h-14 w-14 rounded-2xl bg-slate-800" />
            <Skeleton className="h-6 w-24 rounded-full bg-slate-800" />
        </div>
        <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-3/4 bg-slate-800 rounded-lg" />
            <Skeleton className="h-4 w-1/2 bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl bg-slate-800" />
            <Skeleton className="h-24 rounded-2xl bg-slate-800" />
        </div>
        <div className="h-12 w-full rounded-xl bg-slate-800" />
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
                
                const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
                const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

                const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
                
                const filteredCourses = allCourses.filter(course => 
                    !course.isTeacherOnly && ((studentClass && course.classId === studentClass.id) || !course.classId)
                );

                const coursesData = await Promise.all(filteredCourses.map(async (course) => {
                    const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
                    const qbStatsPromise = getCourseQuestionBankStats(course.id, user.uid);
                    
                    const [progressSnap, questionBankStats] = await Promise.all([
                        getDoc(progressRef),
                        qbStatsPromise
                    ]);
                    
                    let completedTopicsCount = 0;
                    if(progressSnap.exists()){
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
                    
                    // --- İSİM DÜZELTME MANTIĞI (GÜÇLENDİRİLMİŞ) ---
                    let originalTitle = course.title || "";
                    let finalTitle = originalTitle;
                    
                    // Tüm harfleri küçültüp kontrol ediyoruz
                    const lower = originalTitle.toLocaleLowerCase('tr');

                    if (lower.includes("dkab") || lower.includes("din kültürü")) {
                        finalTitle = "Din Kültürü ve Ahlak Bilgisi";
                    } 
                    // SİYER, siyer, Siyer hepsini yakalar
                    else if (lower.includes("siyer") || lower.includes("peygamber")) {
                        finalTitle = "Peygamberimizin Hayatı";
                    }

                    return {
                        ...course,
                        displayTitle: finalTitle, // Düzenlenmiş başlığı buraya atıyoruz
                        className: studentClass?.name || 'Genel',
                        lessonProgress,
                        completedTopicsCount: completedTopicsCount,
                        topicsCount: totalTopics,
                        questionBankProgress: questionBankStats.completionPercentage,
                        passedTests: questionBankStats.passedTests,
                        totalQuestionBankTests: questionBankStats.totalTests,
                    };
                }));

                // Sıralama mantığı
                coursesData.sort((a, b) => {
                    const titleA = (a.displayTitle || a.title).toLocaleLowerCase('tr');
                    const titleB = (b.displayTitle || b.title).toLocaleLowerCase('tr');
                    
                    if (titleA.includes('din kültürü')) return -1;
                    if (titleB.includes('din kültürü')) return 1;
                    return titleA.localeCompare(titleB, 'tr');
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

    return (
        <div className="min-h-screen bg-[#020617] pb-24 md:pb-12 overflow-x-hidden relative selection:bg-cyan-500/30 font-sans">
            <CyberBackground />

            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                
                {/* Navbar / Geri Dön Butonu */}
                <div className="flex items-center justify-between mb-8 md:mb-12">
                    <div className="hidden md:block"></div> 
                    
                    <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 -ml-2 md:ml-0">
                        <Link href="/student">
                            <ArrowLeft className="mr-2 h-5 w-5"/> Panele Dön
                        </Link>
                    </Button>
                </div>
                
                {/* İçerik */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} />)}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {courses.map((course) => (
                            <ModernCourseCard key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem] bg-slate-900/50 border border-white/5 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                             <BookOpen className="h-10 w-10 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Aktif Ders Bulunamadı</h3>
                        <p className="text-slate-400 max-w-sm text-sm">
                            Şu anda tanımlanmış bir dersiniz yok.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}