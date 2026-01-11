'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, UserProgress } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ClipboardCheck, GraduationCap, PlayCircle, Target, ArrowLeft, X, Loader2, Trophy, BrainCircuit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- TİP TANIMLARI ---
type EnrichedCourse = Course & {
    className?: string; // Sınıf adı eklendi
    lessonProgress?: number;
    questionBankProgress?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    passedTests?: number;
    totalQuestionBankTests?: number;
};

// --- ARKA PLAN EFEKTLERİ ---
const CyberBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.05 }}/>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
    </div>
);

// --- ÖZEL İLERLEME ÇUBUĞU (NEON EFEKTLİ) ---
const CyberProgress = ({ value, colorClass, label, subLabel, icon: Icon }: { value: number, colorClass: string, label: string, subLabel: string, icon: any }) => (
    <div className="space-y-2 group/progress">
        <div className="flex justify-between items-end">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover/progress:text-slate-300 transition-colors">
                <Icon className="w-3.5 h-3.5 opacity-70" />
                {label}
            </div>
            <span className={cn("text-xs font-black", colorClass.replace('bg-', 'text-'))}>{value}%</span>
        </div>
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
            <div 
                className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] relative", colorClass)} 
                style={{ width: `${value}%` }} 
            >
                {/* Işıltı Efekti */}
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 blur-[1px]" />
            </div>
        </div>
        <p className="text-[10px] text-slate-500 text-right font-mono font-medium tracking-tight group-hover/progress:text-slate-400 transition-colors">{subLabel}</p>
    </div>
);

// --- DERS KARTI BİLEŞENİ ---
const CourseCardWithProgress = ({ course }: { course: EnrichedCourse }) => (
    <div className="group relative h-full">
        {/* Hover Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-[2.5rem] opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
        
        <Card className="relative h-full bg-[#0f172a] border-slate-800 group-hover:translate-y-[-6px] transition-transform duration-300 rounded-[2.2rem] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header: İkon ve Sınıf */}
            <div className="h-32 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0f172a] flex items-center justify-between p-6 relative overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                
                <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 relative z-10">
                    <BrainCircuit className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                </div>

                <div className="flex flex-col items-end gap-1 relative z-10">
                    <Badge variant="outline" className="bg-slate-950/50 backdrop-blur border-slate-700 text-slate-400 text-[10px]">
                        <GraduationCap className="w-3 h-3 mr-1" />
                        {course.className}
                    </Badge>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6">
                {/* Başlık */}
                <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-tight">
                        {course.title}
                    </h3>
                </div>

                {/* İlerleme Barları */}
                <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                    <CyberProgress 
                        value={course.questionBankProgress || 0} 
                        colorClass="bg-amber-500" 
                        label="Soru Bankası"
                        subLabel={`${course.passedTests || 0}/${course.totalQuestionBankTests || 0} Test Başarılı`}
                        icon={Target}
                    />
                    <CyberProgress 
                        value={course.lessonProgress || 0} 
                        colorClass="bg-cyan-500" 
                        label="Konu Anlatımı"
                        subLabel={`${course.completedTopicsCount || 0}/${course.topicsCount || 0} Konu Tamamlandı`}
                        icon={BookOpen}
                    />
                </div>

                {/* Butonlar */}
                <div className="mt-auto grid grid-cols-2 gap-3">
                     <Button asChild variant="outline" className="w-full bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-600 h-12 rounded-xl text-xs font-bold uppercase tracking-wider">
                        <Link href={`/student/ders/${course.id}`}>
                            <PlayCircle className="h-4 w-4 mr-2" /> Ders
                        </Link>
                    </Button>
                    
                    <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 h-12 rounded-xl shadow-lg shadow-violet-900/40 text-xs font-bold uppercase tracking-wider relative overflow-hidden group/btn">
                        <Link href={`/student/soru-bankasi/${course.id}`}>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            <ClipboardCheck className="h-4 w-4 mr-2 relative z-10" /> 
                            <span className="relative z-10">Test Çöz</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </Card>
    </div>
);

// --- YÜKLEME SKELETON ---
const LoadingSkeleton = () => (
    <div className="rounded-[2.2rem] bg-[#0f172a] border border-slate-800 p-6 space-y-6 h-[400px] flex flex-col">
        <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl bg-slate-800" />
            <Skeleton className="h-6 w-32 bg-slate-800" />
        </div>
        <div className="space-y-4 flex-1">
            <Skeleton className="h-4 w-full bg-slate-800 rounded-full" />
            <Skeleton className="h-20 w-full bg-slate-800 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl bg-slate-800" />
            <Skeleton className="h-12 rounded-xl bg-slate-800" />
        </div>
    </div>
);

// --- ANA SAYFA BİLEŞENİ ---
export default function SoruBankasiPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
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
            <CyberBackground />

            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                
                {/* Başlık Alanı */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl mb-2">
                            SORU <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">BANKASI</span>
                        </h1>
                        <p className="text-slate-400 text-sm md:text-lg font-medium">Bilgilerini test et, rozetleri topla ve ustalığını kanıtla.</p>
                    </div>
                    
                    <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white bg-white/5 backdrop-blur-sm px-6 h-12 rounded-xl">
                        <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4"/> Panele Dön</Link>
                    </Button>
                </div>
                
                {/* İçerik */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} />)}
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
                        <h3 className="text-xl font-bold text-white mb-2">Henüz İçerik Yok</h3>
                        <p className="text-slate-400 max-w-sm">
                            Şu anda sana atanmış bir ders veya test bulunmuyor.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}