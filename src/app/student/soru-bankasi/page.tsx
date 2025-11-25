
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import type { Course, SchoolClass, UserProgress } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Loader2, ClipboardCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CourseWithAllProgress = Course & {
    lessonProgress?: number;
    questionBankProgress?: number;
    topicsCount?: number;
    completedTopicsCount?: number;
    passedTests?: number;
    totalQuestionBankTests?: number;
};

const CourseCardWithProgress = ({ course, index }: { course: CourseWithAllProgress, index: number }) => {
    const colorClasses = [
        'bg-blue-600 hover:bg-blue-700',
        'bg-emerald-600 hover:bg-emerald-700',
        'bg-purple-600 hover:bg-purple-700',
        'bg-rose-600 hover:bg-rose-700',
        'bg-amber-600 hover:bg-amber-700',
        'bg-indigo-600 hover:bg-indigo-700',
        'bg-teal-600 hover:bg-teal-700',
        'bg-cyan-600 hover:bg-cyan-700',
        'bg-pink-600 hover:bg-pink-700',
        'bg-orange-600 hover:bg-orange-700',
    ];
    
    const colorClass = colorClasses[index % colorClasses.length];

    return (
    <Card className={cn("hover:shadow-lg transition-shadow flex flex-col text-white transform hover:-translate-y-1 duration-300", colorClass)}>
        <CardHeader>
            <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 rounded-xl">
                    <BookOpen className="h-8 w-8"/>
                </div>
                <div>
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    <p className="text-sm opacity-80">{course.className}</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <div>
                <div className="flex justify-between text-xs font-semibold opacity-80 mb-1">
                    <span>Ders İlerlemesi</span>
                    <span>{course.lessonProgress || 0}%</span>
                </div>
                <Progress value={course.lessonProgress || 0} className="h-2 bg-white/30 [&>div]:bg-green-400" />
                <p className="text-xs opacity-80 text-right mt-1">
                    ({course.completedTopicsCount || 0} / {course.topicsCount || 0} Konu)
                </p>
            </div>
            <div>
                <div className="flex justify-between text-xs font-semibold opacity-80 mb-1">
                    <span>Soru Bankası Başarısı</span>
                    <span>{course.questionBankProgress || 0}%</span>
                </div>
                <Progress value={course.questionBankProgress || 0} className="h-2 bg-white/30 [&>div]:bg-amber-400"/>
                 <p className="text-xs opacity-80 text-right mt-1">
                    ({course.passedTests || 0} / {course.totalQuestionBankTests || 0} Test)
                </p>
            </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
            <Button asChild className="w-full bg-white/20 hover:bg-white/30 text-white">
                <Link href={`/student/ders/${course.id}`}>
                    Derse Devam Et <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
            </Button>
            <Button asChild className="w-full" variant="secondary">
                <Link href={`/student/soru-bankasi/${course.id}`}>
                    Testleri Çöz <ClipboardCheck className="ml-2 h-4 w-4"/>
                </Link>
            </Button>
        </CardFooter>
    </Card>
    );
};

export default function SoruBankasiPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CourseWithAllProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCoursesAndProgress() {
            if (!user) {
                setIsLoading(false);
                return;
            };

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
                
                const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
                
                let filteredCourses: Course[] = [];
                if (studentClassId) {
                    const isFirstClass = studentClassId === firstClassId;
                    filteredCourses = studentVisibleCourses.filter(course =>
                        !course.isTeacherOnly && (course.classId === studentClassId || (!course.classId && isFirstClass))
                    );
                } else {
                    filteredCourses = studentVisibleCourses.filter(course => !course.classId && !course.isTeacherOnly);
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
        <div className="min-h-full bg-gradient-to-br from-primary/10 via-blue-50/50 to-rose-100/50 dark:from-slate-900 dark:via-slate-800 dark:to-rose-950 p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline mb-2">Dersler ve Soru Bankası</h1>
                </div>
                
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course, index) => (
                            <CourseCardWithProgress key={course.id} course={course} index={index} />
                        ))}
                    </div>
                ) : (
                    <Card className="text-center p-12 text-muted-foreground bg-card/80 backdrop-blur-sm">
                        Henüz sana atanmış bir ders bulunmuyor.
                    </Card>
                )}
            </div>
        </div>
    );
}
