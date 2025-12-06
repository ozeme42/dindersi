
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, UserProgress } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ClipboardCheck, GraduationCap, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
const CyberProgress = ({ value, colorClass, label, subLabel }: { value: number, colorClass: string, label: string, subLabel: string }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <span className={cn("text-xs font-bold", colorClass.replace('bg-', 'text-'))}>{value}%</span>
        </div>
        <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
            <div 
                className={cn("h-full rounded-full transition-all duration-500 shadow-[0_0_10px_currentColor]", colorClass)} 
                style={{ width: `${value}%` }} 
            />
        </div>
        <p className="text-[10px] text-slate-500 text-right font-mono">{subLabel}</p>
    </div>
);

// --- DERS KARTI BİLEŞENİ (GÜNCELLENMİŞ OKUNABİLİR TASARIM) ---
const CourseCardWithProgress = ({ course }: { course: CourseWithAllProgress }) => (
    <div className="group relative flex flex-col rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-md overflow-hidden hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-1">
        
        {/* Arka Plan Efekti */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/20 transition-colors" />

        <div className="p-5 flex-grow space-y-6 relative z-10">
            {/* Başlık ve İkon */}
            <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 shadow-lg group-hover:scale-105 transition-transform shrink-0">
                    <BookOpen className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                    {/* Başlık Rengi Beyaz Yapıldı - Okunabilirlik İçin */}
                    <h3 className="text-lg font-black text-white leading-tight group-hover:text-cyan-400 transition-colors drop-shadow-sm">
                        {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                        <GraduationCap className="w-3 h-3" />
                        {course.className}
                    </p>
                </div>
            </div>

            {/* İlerleme Barları */}
            <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                <CyberProgress 
                    value={course.lessonProgress || 0} 
                    colorClass="bg-cyan-500" 
                    label="Konu Anlatımı"
                    subLabel={`${course.completedTopicsCount || 0}/${course.topicsCount || 0} Konu`}
                />
                <CyberProgress 
                    value={course.questionBankProgress || 0} 
                    colorClass="bg-amber-500" 
                    label="Soru Bankası"
                    subLabel={`${course.passedTests || 0}/${course.totalQuestionBankTests || 0} Test`}
                />
            </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="p-4 pt-0 mt-auto grid grid-cols-2 gap-3 relative z-10">
            {/* SOL BUTON: Renkler ve Kontrast Düzeltildi */}
            <Button asChild variant="outline" className="w-full bg-slate-800 text-white border-white/10 hover:bg-cyan-950 hover:text-cyan-400 hover:border-cyan-500/50 h-auto py-3 flex flex-col gap-1 rounded-xl transition-all">
                <Link href={`/student/ders/${course.id}`}>
                    <PlayCircle className="h-5 w-5 mb-0.5" />
                    <span className="text-[11px] font-extrabold tracking-wide">DERS</span>
                </Link>
            </Button>
            
            {/* SAĞ BUTON: Gradient */}
            <Button asChild className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 h-auto py-3 flex flex-col gap-1 rounded-xl shadow-lg shadow-indigo-900/20 transition-all">
                <Link href={`/student/soru-bankasi/${course.id}`}>
                    <ClipboardCheck className="h-5 w-5 mb-0.5" />
                    <span className="text-[11px] font-extrabold tracking-wide">TEST ÇÖZ</span>
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
                const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
                
                const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
                const studentClassId = studentClass?.id;

                const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

                let filteredCourses: Course[] = [];
                if (studentClassId) {
                    const isFirstClass = studentClassId === firstClassId;
                    filteredCourses = allCourses.filter(course =>
                        !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
                    );
                } else {
                    filteredCourses = allCourses.filter(course => !course.classId && !course.isTeacherOnly);
                }

                const coursesData = await Promise.all(filteredCourses.map(async (course) => {
                    const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
                    const qbStats = getCourseQuestionBankStats(course.id, user.uid);
                    
                    const [progressSnap, questionBankStats] = await Promise.all([
                        getDoc(progressRef),
                        qbStats
                    ]);

                    const completedTopics = progressSnap.exists() ? (progressSnap.data() as UserProgress).completedTopics || [] : [];
                    
                    const unitsRef = collection(db, 'courses', course.id, 'units');
                    const unitsSnap = await getDocs(unitsRef);
                    let totalTopics = 0;
                    for (const unitDoc of unitsSnap.docs) {
                        const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                        totalTopics += topicsSnap.size;
                    }
                    
                    const lessonProgress = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;
                    
                    return {
                        ...course,
                        className: studentClass?.name || 'Genel',
                        lessonProgress,
                        completedTopicsCount: completedTopics.length,
                        topicsCount: totalTopics,
                        questionBankProgress: questionBankStats.completionPercentage,
                        passedTests: questionBankStats.passedTests,
                        totalQuestionBankTests: questionBankStats.totalTests,
                    };
                }));

                // Sort courses to put "Din Kültürü ve Ahlak Bilgisi" first
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
        fetchCoursesAndProgress();
    }, [user]);

    return (
        <div className="min-h-screen bg-slate-950 pb-24 md:pb-12 overflow-x-hidden relative">
            
            {/* Arka Plan Işıkları */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                
                {/* Başlık Alanı */}
                <div className="mb-8 md:mb-12 relative">
                    <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-transparent rounded-full hidden md:block" />
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        Dersler <span className="text-slate-500">&</span> Soru Bankası
                    </h1>
                </div>
                
                {/* Yükleniyor veya İçerik */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-3xl border border-white/5 bg-slate-900/50 p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-2xl bg-slate-800" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32 bg-slate-800" />
                                        <Skeleton className="h-3 w-20 bg-slate-800" />
                                    </div>
                                </div>
                                <Skeleton className="h-24 w-full rounded-xl bg-slate-800" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Skeleton className="h-12 rounded-xl bg-slate-800" />
                                    <Skeleton className="h-12 rounded-xl bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <CourseCardWithProgress key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-slate-900/50 border border-dashed border-white/10">
                        <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                             <BookOpen className="h-8 w-8 text-slate-500" />
                        </div>
                        <p className="text-slate-400">Henüz sana atanmış bir ders bulunmuyor.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
