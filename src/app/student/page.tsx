
'use client';

import React, { useState, useEffect, type ReactNode, Suspense, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Milestone, BrainCircuit, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Coins, Link2, Pencil, Wind, Settings } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function StatCard({ title, value, icon, href, colorClass, description }: { title: string, value: string | number, icon: ReactNode, href: string, colorClass: string, description: string }) {
    return (
        <Link href={href} className="block group h-full">
            <Card className={cn(
                "h-full text-white flex flex-col items-center justify-center text-center p-4 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border-2 border-transparent hover:border-white/50",
                colorClass
            )}>
                 {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 mb-2" })}
                <p className="text-xl font-bold">{title}</p>
                <p className="text-4xl font-black">{value}</p>
                <p className="text-xs opacity-80 mt-1">{description}</p>
            </Card>
        </Link>
    )
};

const QuickActionButton = ({ href, icon: Icon, label, colorClass }: { href: string; icon: React.ElementType, label: string; colorClass: string }) => (
    <Link href={href} className="block group">
        <div className="flex flex-col items-center gap-2">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1 shadow-lg", colorClass)}>
                <Icon className="h-8 w-8 text-white" />
            </div>
            <p className="text-xs font-semibold text-center text-white/80">{label}</p>
        </div>
    </Link>
);


function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
      score: 0,
      completedTopics: 0,
      totalTopics: 0,
      coursesStarted: 0,
      coursesCompleted: 0,
      totalCourses: 0,
      generalRank: 0,
      classRank: 0,
      branchRank: 0,
      questionBankProgress: 0,
  });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY, currentTarget } = e;
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        const x = (clientX - left - width / 2) / (width / 2);
        const y = (clientY - top - height / 2) / (height / 2);
        setMousePosition({ x, y });
    };

    const resetMouseMove = () => {
        setMousePosition({ x: 0, y: 0 });
    }

   const fetchData = useCallback(async () => {
      if (!user?.uid) {
          setIsLoading(false);
          return;
      };

      setIsLoading(true);
      
      try {
        let studentClassName: string | undefined = user.class?.split(' - ')[0];

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsResult] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "in", ["student", "guest"]))),
          getStudentExams(user.uid),
        ]);
        
        if (examsResult.success && examsResult.data) {
            setExamStats({
                pending: examsResult.data.filter(a => !a.solvedEvent).length,
                solved: examsResult.data.length - examsResult.data.filter(a => !a.solvedEvent).length
            });
        }

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        if (studentClassName) {
            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(studentClassName!));
            const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === user.uid) + 1;
        }

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);

        let coursesData = studentVisibleCourses;
        if (studentClassName) {
            const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            const studentClass = allClasses.find(c => c.name === studentClassName);
            if (studentClass) {
                coursesData = studentVisibleCourses.filter(course => course.classId === studentClass.id || !course.classId);
            } else {
                 coursesData = studentVisibleCourses.filter(course => !course.classId);
            }
        } else {
             coursesData = studentVisibleCourses.filter(course => !course.classId);
        }

        let completedTopicsTotal = 0;
        let grandTotalTopics = 0;

        const progressPromises = coursesData.map(async course => {
            const progressRef = doc(db, 'users', user.uid, 'progress', course.id);
            const progressSnap = await getDoc(progressRef);
            const completedTopics = progressSnap.exists() ? (progressSnap.data()?.completedTopics || []).length : 0;
            completedTopicsTotal += completedTopics;

            const unitsSnap = await getDocs(collection(db, 'courses', course.id, 'units'));
            let totalTopics = 0;
            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.size;
            }
            grandTotalTopics += totalTopics;
        });

        await Promise.all(progressPromises);
        
        let totalQuestionBankPassedTests = 0;
        let totalQuestionBankTests = 0;

        const qbStatsPromises = coursesData.map(course => getCourseQuestionBankStats(course.id, user.uid));
        const qbStatsResults = await Promise.all(qbStatsPromises);
        qbStatsResults.forEach(stat => {
            totalQuestionBankPassedTests += stat.passedTests;
            totalQuestionBankTests += stat.totalTests;
        });

        const qbProgressPercentage = totalQuestionBankTests > 0 ? Math.round((totalQuestionBankPassedTests / totalQuestionBankTests) * 100) : 0;

        setStats({
            score: user.score || 0,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: 0, // Simplified for now
            coursesCompleted: 0, // Simplified for now
            totalCourses: coursesData.length,
            generalRank,
            classRank,
            branchRank: 0, // Simplified
            questionBankProgress: qbProgressPercentage,
        });

      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  
    useEffect(() => {
        fetchData();
    }, [user]);
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#2b1055]">
            <Loader2 className="h-16 w-16 animate-spin text-white" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  const quickActions = [
      { href: '/student/yazilacaklar', icon: Columns, label: 'Yazılacaklar', colorClass: "bg-sky-500 hover:bg-sky-600" },
      { href: '/student/ozetler', icon: LayoutTemplate, label: 'Özetler', colorClass: "bg-orange-500 hover:bg-orange-600" },
      { href: '/student/shop', icon: ShoppingCart, label: 'Dükkan', colorClass: "bg-green-600 hover:bg-green-700" },
      { href: '/student/deneme', icon: FileCog, label: 'Denemeler', colorClass: "bg-violet-600 hover:bg-violet-700" },
      { href: '/student/tekrar-et', icon: Repeat, label: 'Tekrar Testi', colorClass: "bg-rose-500 hover:bg-rose-600" },
  ]
  

  return (
    <div 
        className="min-h-screen w-full relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={resetMouseMove}
    >
        <Image src="https://firebasestorage.googleapis.com/v0/b/tamuyum.appspot.com/o/background.jpg?alt=media&token=e934a36f-7d1c-43f1-b850-8631551608d5" alt="Arka Plan" layout="fill" objectFit="cover" className="absolute top-0 left-0 z-0" style={{ transform: `translate(${-mousePosition.x * 5}px, ${-mousePosition.y * 5}px)` }}/>
        <Image src="https://firebasestorage.googleapis.com/v0/b/tamuyum.appspot.com/o/moon.png?alt=media&token=e50f38b8-6a3f-4e44-b5df-45a8523c938c" alt="Ay" layout="fill" objectFit="cover" className="absolute top-0 left-0 z-20" style={{ transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)` }}/>
        <Image src="https://firebasestorage.googleapis.com/v0/b/tamuyum.appspot.com/o/mountains_behind.png?alt=media&token=f031252d-9867-4228-a379-65b3531b7f03" alt="Dağlar" layout="fill" objectFit="cover" className="absolute top-0 left-0 z-10" />
        <Image src="https://firebasestorage.googleapis.com/v0/b/tamuyum.appspot.com/o/mountains_front.png?alt=media&token=80ae3671-50e9-4a41-a1e6-fd97a9f8f2b3" alt="Ön Dağlar" layout="fill" objectFit="cover" className="absolute top-0 left-0 z-30" />

        <main className="relative z-40 p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Sol Sütun - Karakter ve İlerleme */}
                <div className="lg:col-span-1 flex flex-col items-center gap-6">
                    <Card className="w-full bg-slate-900/50 backdrop-blur-xl border-slate-700/50 shadow-2xl animate-pop-in">
                        <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse"/>
                                <UserAvatar user={user} className="w-32 h-32 text-4xl border-4 border-primary/50 shadow-lg"/>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-white font-headline">{user?.displayName}</h2>
                                <p className="text-muted-foreground text-blue-300">{user?.class}</p>
                            </div>
                            <div className="flex items-center gap-2 text-3xl font-bold text-yellow-400">
                                <Star className="h-7 w-7 fill-yellow-400"/>
                                <span>{stats.score.toLocaleString()} Puan</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="w-full bg-slate-900/50 backdrop-blur-xl border-slate-700/50 shadow-2xl animate-pop-in" style={{animationDelay: '0.1s'}}>
                        <CardHeader>
                            <CardTitle className="text-white">Genel İlerleme</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <div className="flex justify-between text-xs font-semibold text-blue-200 mb-1">
                                    <span>Ders İlerlemesi</span>
                                    <span>{lessonProgress}%</span>
                                </div>
                                <Progress value={lessonProgress} className="h-3 bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-cyan-400" />
                                <p className="text-xs text-blue-300/70 text-right mt-1">({stats.completedTopics}/{stats.totalTopics} Konu)</p>
                            </div>
                             <div>
                                <div className="flex justify-between text-xs font-semibold text-blue-200 mb-1">
                                    <span>Soru Bankası Başarısı</span>
                                    <span>{stats.questionBankProgress}%</span>
                                </div>
                                <Progress value={stats.questionBankProgress} className="h-3 bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sağ Sütun - Ana Eylemler */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8 animate-pop-in" style={{animationDelay: '0.2s'}}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Genel Sıralama" value={stats.generalRank > 0 ? `${stats.generalRank}.` : '-'} icon={<Globe/>} href="/leaderboard" colorClass="bg-gradient-to-br from-blue-500 to-cyan-500" description="Türkiye genelindeki yerin."/>
                        <StatCard title="Sınıf Sıralaması" value={stats.classRank > 0 ? `${stats.classRank}.` : '-'} icon={<School/>} href="/leaderboard" colorClass="bg-gradient-to-br from-purple-500 to-indigo-500" description="Sınıf düzeyindeki sıralaman."/>
                        <StatCard title="Çözülen Deneme" value={examStats.solved} icon={<ClipboardCheck />} href="/student/deneme" colorClass="bg-gradient-to-br from-orange-500 to-amber-500" description={`${examStats.pending} yeni deneme bekliyor.`} />
                    </div>

                    <Card className="w-full bg-slate-900/50 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                         <CardHeader>
                            <CardTitle className="text-white">Oyun Modları</CardTitle>
                             <CardDescription className="text-blue-300">Kendini sına, rekabet et ve zirveye oyna!</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-6">
                            <Link href="/student/activities" className="block group">
                                <div className="h-48 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-green-600/80 to-teal-600/80 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border-2 border-transparent hover:border-white/50">
                                    <Gamepad2 className="h-12 w-12"/>
                                    <h3 className="font-headline text-2xl mt-4">Bireysel Etkinlikler</h3>
                                </div>
                            </Link>
                             <Link href="/student/yarismalar" className="block group">
                                <div className="h-48 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-rose-600/80 to-red-600/80 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border-2 border-transparent hover:border-white/50">
                                    <Users className="h-12 w-12"/>
                                    <h3 className="font-headline text-2xl mt-4">Çok Oyunculu Arena</h3>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                    
                    <Card className="w-full bg-slate-900/50 backdrop-blur-xl border-slate-700/50 shadow-2xl">
                        <CardHeader><CardTitle className="text-white">Hızlı Erişim</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                            {quickActions.map(action => <QuickActionButton key={action.href} {...action} />)}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    </div>
  );
}

export default function StudentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#2b1055]"><Loader2 className="h-16 w-16 animate-spin text-white" /></div>}>
            <StudentDashboard />
        </Suspense>
    );
}

