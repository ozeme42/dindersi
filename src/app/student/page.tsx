
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, getCountFromServer } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, Topic, Unit, QuestionBankStats, Assignment } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Trophy, CheckCircle2, Star, Gamepad2, ListTodo, Rocket, GraduationCap, Library, Sun, Repeat, ShoppingCart, Package, Columns, LayoutTemplate, Bug, Users, FileCog, ClipboardCheck, Award, Crown, Globe, School, Backpack, Map as MapIcon, Target } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";


const StatCard = ({ title, value, subValue, icon, href }: { title: string, value: string | number, subValue?: string, icon: React.ReactNode, color?: string, href: string }) => (
    <Link href={href} className="block group h-full">
        <Card className={cn(
            "h-full text-white flex flex-col items-center justify-center text-center p-4 transition-all duration-300 transform hover:scale-105",
            "bg-primary" // Default color
        )}>
            {React.cloneElement(icon as React.ReactElement, { className: "h-12 w-12 opacity-80" })}
            <p className="text-4xl font-bold mt-2">{value}</p>
            <p className="font-semibold">{title}</p>
            {subValue && <p className="text-xs opacity-90">{subValue}</p>}
        </Card>
    </Link>
);

function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getLiveLeaderboard().then(data => {
            setDailyTop(data.slice(0, 3));
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);
    
    const rankIcons: { [key: number]: React.ReactNode } = {
        0: <Crown className="h-7 w-7 text-yellow-400" />,
        1: <Award className="h-7 w-7 text-gray-400" />,
        2: <Award className="h-7 w-7 text-orange-500" />,
    };

    return (
        <div className="backdrop-blur-md border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden relative bg-gradient-to-b from-slate-800/50 to-slate-900/50">
            <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-400 drop-shadow-lg">Günün Efsaneleri</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="space-y-2 p-4">
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/10" />
                    </div>
                ) : dailyTop.length > 0 ? (
                     <div className="space-y-px">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between py-2 px-4 transition-all bg-black/20 hover:bg-black/40">
                                <div className="flex items-center gap-3 flex-grow min-w-0">
                                    <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                                      {rankIcons[index]}
                                    </div>
                                    <UserAvatar user={student} className="w-9 h-9 flex-shrink-0"/>
                                    <div className="flex-grow">
                                      <p className="font-medium text-sm text-white/90 truncate">{student.displayName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-base text-yellow-300 ml-4 flex-shrink-0">{(student.score || 0).toLocaleString()} Puan</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-white/60 py-8 px-4">Bugün henüz kimse puan kazanmadı.</p>
                )}
            </CardContent>
        </div>
    )
}


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
      passedTests: 0,
      totalQuestionBankTests: 0,
      questionBankProgress: 0,
  });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) {
          setIsLoading(false);
          return;
      };

      setIsLoading(true);
      
      try {
        let completedTopicsTotal = 0;
        let grandTotalTopics = 0;
        let studentClassName: string | undefined;
        let userScore = user.score || 0;
        
        studentClassName = user.class?.split(' - ')[0];

        let coursesData: Course[] = [];

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          getStudentExams(user.uid),
        ]);
        
        // Calculate exam stats
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            const solved = examsSnapshot.data.length - pending;
            setExamStats({ pending, solved });
        }

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));

        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;

        if(user.class) {
            const gradeName = user.class.split(' - ')[0];
            const branchName = user.class;

            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            const sortedGradeStudents = [...studentsInGrade].sort((a,b) => (b.score || 0) - (a.score || 0));
            classRank = sortedGradeStudents.findIndex(s => s.uid === user.uid) + 1;

            const studentsInBranch = allStudents.filter(s => s.class === branchName);
            const sortedBranchStudents = [...studentsInBranch].sort((a,b) => (b.score || 0) - (a.score || 0));
            branchRank = sortedBranchStudents.findIndex(s => s.uid === user.uid) + 1;
        }

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
        
        let passedTests = 0;
        let totalQuestionBankTests = 0;

        coursesData = await Promise.all(filteredCourses.map(async (course) => {
          let totalTopics = 0;
          let completedTopicsCount = 0;
          
          try {
              const unitsRef = collection(db, 'courses', course.id, 'units');
              const unitsSnap = await getDocs(unitsRef);
              
              for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getCountFromServer(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`));
                totalTopics += topicsSnap.data().count;
              }
              
              const progressSnap = await getDoc(doc(db, 'users', user.uid, 'progress', course.id));
              if (progressSnap.exists()) {
                 completedTopicsCount = (progressSnap.data().completedTopics || []).length;
              }
              
          } catch(e) {
              console.error(`Error processing course ${course.id}:`, e)
          }

          completedTopicsTotal += completedTopicsCount;
          grandTotalTopics += totalTopics;
          
          course.progress = totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : 0;
          course.topicsCount = totalTopics;
          course.unitsCount = course.units?.length || 0;
          course.completedTopicsCount = completedTopicsCount;

          // Also get QB stats for this course
          const qbStats = await getCourseQuestionBankStats(course.id, user.uid);
          passedTests += qbStats.passedTests;
          totalQuestionBankTests += qbStats.totalTests;

          return course;
        }));
        
        const coursesStartedCount = coursesData.filter(c => (c.progress || 0) > 0).length;
        const coursesCompletedCount = coursesData.filter(c => c.progress === 100).length;
        
        setCourses(coursesData);
        
        const qbProgressPercentage = totalQuestionBankTests > 0 
            ? Math.round((passedTests / totalQuestionBankTests) * 100)
            : 0;

        setStats({
            score: userScore,
            completedTopics: completedTopicsTotal,
            totalTopics: grandTotalTopics,
            coursesStarted: coursesStartedCount,
            coursesCompleted: coursesCompletedCount,
            totalCourses: coursesData.length,
            generalRank,
            classRank,
            branchRank,
            passedTests,
            totalQuestionBankTests,
            questionBankProgress: qbProgressPercentage,
        });

      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);
  
  if (isLoading) {
    return (
        <div className="flex h-[calc(100vh-theme(height.16))] w-full items-center justify-center bg-[#0f041e]">
            <Loader2 className="h-16 w-16 animate-spin text-white" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <>
    <div className="bg-[#0f041e] min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-transparent z-0"></div>
        <div className="max-w-5xl mx-auto space-y-6 relative z-10 pb-20 md:pb-0">
          {/* Player Header */}
           <div className="flex items-center gap-4">
               <UserAvatar user={user} className="w-20 h-20 text-4xl border-4 border-[#2b1055]"/>
                <div className="flex-grow">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-md">{user?.displayName}</h1>
                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                      <Backpack className="h-4 w-4 text-indigo-300"/>
                      <span className="text-sm font-medium text-indigo-200">{user?.class || "Sınıfsız Gezgin"}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-3xl font-black text-amber-300 drop-shadow-lg">
                        <Star className="h-6 w-6"/>
                        <span>{stats.score.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-amber-100/80 font-semibold">Puan</p>
                </div>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/student/soru-bankasi" className="block group">
                  <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col h-full hover:border-sky-400/50 transition-all">
                      <div className="flex justify-between items-start">
                          <div>
                              <h2 className="text-xl font-bold text-sky-300">Dersler & Soru Bankası</h2>
                              <p className="text-sm text-sky-100/70">Konu çalış, testleri çöz!</p>
                          </div>
                          <BookOpen className="h-8 w-8 text-sky-400" />
                      </div>
                      <div className="flex-grow"/>
                      <div className="mt-6 space-y-3">
                          <div>
                              <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                  <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3"/> Ders İlerlemesi</span>
                                  <span>{lessonProgress}%</span>
                              </div>
                              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{width: `${lessonProgress}%`}}></div>
                              </div>
                          </div>
                           <div>
                              <div className="flex justify-between text-xs font-bold text-sky-100 mb-1 uppercase tracking-wide">
                                  <span className="flex items-center gap-1"><Target className="h-3 w-3"/> Soru Bankası Başarısı</span>
                                  <span>{stats.questionBankProgress}%</span>
                              </div>
                              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full" style={{width: `${stats.questionBankProgress}%`}}></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </Link>
             <Link href="/leaderboard" className="block group">
                <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col h-full hover:border-amber-400/50 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold text-amber-300">Liderlik Tablosu</h2>
                          <p className="text-sm text-amber-100/70">Sıralamanı gör, zirveye oyna!</p>
                        </div>
                        <Trophy className="h-8 w-8 text-amber-400" />
                    </div>
                    <div className="flex-grow"/>
                    <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-3xl font-black text-white">{stats.generalRank > 0 ? `${stats.generalRank}.` : '-'}</p>
                            <p className="text-xs text-white/60 flex items-center justify-center gap-1"><Globe className="h-3 w-3"/> Genel</p>
                        </div>
                         <div>
                            <p className="text-3xl font-black text-white">{stats.classRank > 0 ? `${stats.classRank}.` : '-'}</p>
                            <p className="text-xs text-white/60 flex items-center justify-center gap-1"><School className="h-3 w-3"/> Sınıf</p>
                        </div>
                         <div>
                            <p className="text-3xl font-black text-white">{stats.branchRank > 0 ? `${stats.branchRank}.` : '-'}</p>
                            <p className="text-xs text-white/60 flex items-center justify-center gap-1"><Users className="h-3 w-3"/> Şube</p>
                        </div>
                    </div>
                </div>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <Link href="/student/gunun-gorevi" className="block group">
                  <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-48 hover:border-fuchsia-400/50 transition-all">
                      <Sun className="h-10 w-10 text-fuchsia-400 mb-2"/>
                      <h3 className="text-xl font-bold text-fuchsia-300">Günün Görevi</h3>
                      <p className="text-xs text-fuchsia-100/70">Her gün yeni bir test çöz, puanları topla.</p>
                  </div>
              </Link>
              <Link href="/student/tekrar-et" className="block group">
                  <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col items-center justify-center text-center h-48 hover:border-green-400/50 transition-all">
                      <Repeat className="h-10 w-10 text-green-400 mb-2"/>
                      <h3 className="text-xl font-bold text-green-300">Tekrar Et</h3>
                      <p className="text-xs text-green-100/70">Yanlış yaptığın sorularla kendini geliştir.</p>
                  </div>
              </Link>
          </div>

          <HardestWorkersToday />
      </div>
    </div>
    </div>
    </>
  );
}

export default function StudentPage() {
    return <StudentDashboard/>
}
