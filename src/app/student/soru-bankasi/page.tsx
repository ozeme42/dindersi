
'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy, where } from "firebase/firestore";
import type { Course, SchoolClass, UserProgress, TestResult } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ClipboardCheck, GraduationCap, PlayCircle, Sparkles, Target, Book } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// --- TİP TANIMLAMALARI ---
type CourseWithAllProgress = Course & {
    lessonProgress?: number;
    questionBankProgress?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    passedTests?: number;
    totalQuestionBankTests?: number;
};

// --- ÖZEL İLERLEME ÇUBUĞU (NEON EFEKTLİ) ---
const CyberProgress = ({ value, colorClass, label, subLabel, icon: Icon }: { value: number, colorClass: string, label: string, subLabel: string, icon: any }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-end">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Icon className="w-3.5 h-3.5 opacity-70" />
                {label}
            </div>
            <span className={cn("text-xs font-black", colorClass.replace('bg-', 'text-'))}>{value}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
            <div 
                className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_currentColor] relative", colorClass)} 
                style={{ width: `${value}%` }} 
            >
                {/* Işıltı Efekti */}
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 blur-[1px]" />
            </div>
        </div>
        <p className="text-[10px] text-slate-500 text-right font-mono font-medium tracking-tight">{subLabel}</p>
    </div>
);

// --- DERS KARTI BİLEŞENİ (GÜNCELLENMİŞ) ---
const CourseCardWithProgress = ({ course }: { course: CourseWithAllProgress }) => (
    <div className="group relative flex flex-col rounded-[2rem] bg-slate-900/60 border border-white/10 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-900/20">
        
        {/* Arka Plan Efekti */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-colors duration-500" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />

        <div className="p-6 flex-grow space-y-6 relative z-10">
            {/* Başlık ve İkon */}
            <div className="flex items-start gap-5">
                <div className="p-3.5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <BookOpen className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white leading-tight group-hover:text-cyan-300 transition-colors drop-shadow-md line-clamp-2">
                        {course.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/50 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <GraduationCap className="w-3 h-3" />
                            {course.className}
                        </span>
                    </div>
                </div>
            </div>

            {/* İlerleme Barları */}
            <div className="space-y-5 bg-slate-950/30 p-5 rounded-2xl border border-white/5 shadow-inner">
                <CyberProgress 
                    value={course.lessonProgress || 0} 
                    colorClass="bg-cyan-500" 
                    label="Konu Anlatımı"
                    subLabel={`${course.completedTopicsCount || 0}/${course.topicsCount || 0} Konu Tamamlandı`}
                    icon={BookOpen}
                />
                <CyberProgress 
                    value={course.questionBankProgress || 0} 
                    colorClass="bg-amber-500" 
                    label="Soru Bankası"
                    subLabel={`${course.passedTests || 0}/${course.totalQuestionBankTests || 0} Test Başarılı`}
                    icon={Target}
                />
            </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="p-5 pt-0 mt-auto grid grid-cols-2 gap-3 relative z-10">
            {/* DERS BUTONU */}
            <Button asChild variant="outline" className="w-full bg-slate-800/80 text-slate-200 border-white/10 hover:bg-slate-700 hover:text-white hover:border-white/20 h-auto py-3.5 flex flex-col gap-1 rounded-xl transition-all active:scale-95 group/btn1">
                <Link href={`/student/ders/${course.id}`}>
                    <PlayCircle className="h-5 w-5 mb-0.5 text-cyan-400 group-hover/btn1:scale-110 transition-transform" />
                    <span className="text-[10px] font-extrabold tracking-widest uppercase">DERS ÇALIŞ</span>
                </Link>
            </Button>
            
            {/* TEST BUTONU */}
            <Button asChild className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 h-auto py-3.5 flex flex-col gap-1 rounded-xl shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.02] active:scale-95 group/btn2 relative overflow-hidden">
                <Link href={`/student/soru-bankasi/${course.id}`}>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn2:translate-y-0 transition-transform duration-300" />
                    <ClipboardCheck className="h-5 w-5 mb-0.5 relative z-10" />
                    <span className="text-[10px] font-extrabold tracking-widest uppercase relative z-10">TEST ÇÖZ</span>
                </Link>
            </Button>
        </div>
    </div>
);

// --- ANA SAYFA BİLEŞENİ ---
export default function SoruBankasiPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CourseWithAllProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCoursesAndProgress() {
            if (!user) {
                setIsLoading(false);
                return;
            }

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

                let filteredCourses: Course[] = [];
                const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
                
                filteredCourses = allCourses.filter(course => 
                    !course.isTeacherOnly && (
                        (studentClass && course.classId === studentClass.id) || 
                        !course.classId                                       
                    )
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
                        completedTopicsCount = Object.keys(progressData).filter(topicId => progressData[topicId]?.completionCount > 0).length;
                    }
                    
                    const unitsRef = collection(db, 'courses', course.id, 'units');
                    const unitsSnap = await getDocs(unitsRef);
                    let totalTopics = 0;
                    for (const unitDoc of unitsSnap.docs) {
                        const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                        totalTopics += topicsSnap.size;
                    }
                    
                    const lessonProgress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;
                    
                    return {
                        ...course,
                        className: studentClass?.name || 'Genel',
                        lessonProgress,
                        completedTopicsCount: completedTopicsCount,
                        topicsCount: totalTopics,
                        questionBankProgress: questionBankStats.completionPercentage,
                        passedTests: questionBankStats.passedTests,
                        totalQuestionBankTests: questionBankStats.totalTests,
                    };
                }));

                coursesData.sort((a, b) => {
                    if (a.title.includes('Din Kültürü')) return -1;
                    if (b.title.includes('Din Kültürü')) return 1;
                    return a.title.localeCompare(b.title);
                });

                setCourses(coursesData);
            } catch (error) {
                console.error("Error fetching courses for question bank:", error);
            } finally {
                setIsLoading(false);
            }
        }
        if(user) {
            fetchCoursesAndProgress();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-[#0f172a] pb-24 md:pb-12 overflow-x-hidden relative selection:bg-cyan-500/30">
            
            {/* Arka Plan Işıkları */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                
                {/* Başlık Alanı */}
                <div className="mb-10 md:mb-14 relative text-center md:text-left">
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-xl mb-2">
                        Dersler <span className="text-slate-600">&</span> Soru Bankası
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Derslerini çalış, testlerini çöz ve <span className="text-cyan-400 font-bold">başarıya ulaş!</span>
                    </p>
                </div>
                
                {/* Yükleniyor veya İçerik */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-[2rem] border border-white/5 bg-slate-900/50 p-6 space-y-6">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-14 w-14 rounded-2xl bg-slate-800" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-32 bg-slate-800" />
                                        <Skeleton className="h-3 w-20 bg-slate-800" />
                                    </div>
                                </div>
                                <Skeleton className="h-32 w-full rounded-2xl bg-slate-800" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Skeleton className="h-14 rounded-xl bg-slate-800" />
                                    <Skeleton className="h-14 rounded-xl bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courses.map((course) => (
                            <CourseCardWithProgress key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-16 text-center rounded-[2.5rem] bg-slate-900/50 border-2 border-dashed border-white/5 animate-in zoom-in duration-500">
                        <div className="bg-slate-800/50 p-6 rounded-full mb-6 ring-4 ring-slate-800/30">
                             <BookOpen className="h-12 w-12 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Henüz Ders Yok</h3>
                        <p className="text-slate-400 max-w-sm">
                            Şu anda sana atanmış bir ders veya içerik bulunmuyor. Öğretmeninle iletişime geçebilirsin.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
