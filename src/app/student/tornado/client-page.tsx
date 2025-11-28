"use client";

import { useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Wind, Gamepad2, Star, ChevronRight, Lock, Users 
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { useAuth } from "@/context/auth-context";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";

// --- UI COMPONENTS (Arcade Style) ---

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#1a0b2e]/60 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
        {children}
    </div>
);

const GameButton = ({ children, onClick, active, disabled, className }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "relative w-full group overflow-hidden rounded-2xl p-4 transition-all duration-200 border-b-[4px] active:border-b-0 active:translate-y-[4px]",
            active 
                ? "bg-indigo-600 border-indigo-800 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-[1.02]" 
                : "bg-slate-800 border-slate-950 text-slate-300 hover:bg-slate-700",
            disabled && "opacity-50 cursor-not-allowed filter grayscale",
            className
        )}
    >
        <div className="relative z-10 flex items-center justify-between">
            {children}
            {active && <div className="absolute inset-0 bg-white/10 animate-pulse rounded-2xl" />}
        </div>
    </button>
);


// --- MAIN PAGE ---

const steps = [
  { id: 1, name: "Ders", icon: Book },
  { id: 2, name: "Ünite", icon: Library },
  { id: 3, name: "Konu", icon: ListTodo },
  { id: 4, name: "Başlat", icon: Gamepad2 },
];

export function TornadoSetupClientPage() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Selection State
  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const studentClassName = user.class?.split(' - ')[0];

        const classesQuery = query(collection(db, "classes"), orderBy("createdAt", "asc"));
        const classesSnapshot = await getDocs(classesQuery);
        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        const allCoursesSnapshot = await getDocs(collection(db, "courses"));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        let finalCourses: Course[] = [];

        if (user.role === 'teacher' || user.role === 'superadmin') {
            finalCourses = allCourses.map(course => {
                const courseClass = allClasses.find(c => c.id === course.classId);
                return {
                    ...course,
                    className: courseClass?.name || 'Genel'
                };
            });
        } else {
            const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
            const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
            const studentClassId = studentClass?.id;
            
            if (studentClassId) {
                finalCourses = studentVisibleCourses.filter(course =>
                    course.classId === studentClassId || !course.classId
                );
            } else {
                finalCourses = studentVisibleCourses.filter(course => !course.classId);
            }
        }
        setCourses(finalCourses);
      } catch (error) {
        console.error("Error fetching filtered courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  const handleSelectCourse = async (id: string, name: string) => {
    setSelection({ ...selection, courseId: id, courseName: name, unitId: '', unitName: '', topicId: '', topicName: '' });
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${id}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsLoading(false);
    setCurrentStep(2);
  };

  const handleSelectUnit = async (id: string, name: string) => {
    setSelection({ ...selection, unitId: id, unitName: name, topicId: '', topicName: '' });
    if (id === 'all') {
        setSelection(prev => ({ ...prev, unitId: id, unitName: name, topicId: 'all', topicName: 'Tüm Konular' }));
        setCurrentStep(4);
    } else {
        setIsLoading(true);
        const topicsRef = collection(db, `courses/${selection.courseId}/units/${id}/topics`);
        const q = query(topicsRef, orderBy("title"));
        const topicsSnapshot = await getDocs(q);
        setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
        setIsLoading(false);
        setCurrentStep(3);
    }
  };
  
  const handleSelectTopic = (id: string, name: string) => {
    setSelection({ ...selection, topicId: id, topicName: name });
    setCurrentStep(4);
  };

  const handleBack = () => {
      if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  
  const getGameUrl = (teamCount: number) => {
    const params = new URLSearchParams({
      courseId: selection.courseId,
      courseName: selection.courseName,
      unitId: selection.unitId,
      unitName: selection.unitName,
      topicId: selection.topicId,
      topicName: selection.topicName,
      teamCount: teamCount.toString(),
    });
    return `/student/tornado/oyun?${params.toString()}`;
  }


  // Render Content Based on Step
  const renderStepContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-indigo-300 font-bold">Veriler Yükleniyor...</p>
              </div>
          );
      }

      switch(currentStep) {
          case 1:
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {courses.map((course) => (
                        <GameButton 
                            key={course.id} 
                            onClick={() => handleSelectCourse(course.id, course.title)}
                            active={selection.courseId === course.id}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-2xl">
                                    <BookOpen className="h-6 w-6"/>
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">{course.title}</div>
                                    <div className="text-xs text-slate-400">{course.className}</div>
                                </div>
                            </div>
                            {selection.courseId === course.id && <Check className="h-5 w-5 text-indigo-300" />}
                        </GameButton>
                    ))}
                </div>
            );
          case 2:
            return (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {units.map((unit) => (
                        <GameButton 
                            key={unit.id} 
                            onClick={() => handleSelectUnit(unit.id, unit.title)}
                            active={selection.unitId === unit.id}
                        >
                            <div className="flex items-center gap-3">
                                <Library className="h-5 w-5 text-slate-400" />
                                <span className="font-semibold text-slate-200">{unit.title}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/20" />
                        </GameButton>
                    ))}
                </div>
            );
          case 3:
            return (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {topics.map((topic) => (
                        <GameButton 
                            key={topic.id} 
                            onClick={() => handleSelectTopic(topic.id, topic.title)}
                            active={selection.topicId === topic.id}
                        >
                            <div className="flex items-center gap-3">
                               <ListTodo className="h-5 w-5 text-slate-400" />
                                <span className="font-semibold text-slate-200">{topic.title}</span>
                            </div>
                            {selection.topicId === topic.id ? <Check className="h-5 w-5 text-green-400" /> : <div className="h-4 w-4 rounded-full border border-white/10" />}
                        </GameButton>
                    ))}
                </div>
            );
          case 4:
            return (
                <div className="animate-in zoom-in-95 duration-300">
                    <div className="bg-black/30 rounded-2xl p-6 border border-white/10 text-center space-y-6">
                        <div className="inline-flex p-4 rounded-full bg-green-500/20 ring-4 ring-green-500/10 mb-2">
                            <Wind className="h-12 w-12 text-green-400 animate-pulse" />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Oyuna Hazır Mısın?</h3>
                            <p className="text-slate-400 text-sm">Seçtiğin ayarlarla oyun oluşturulacak. Tek veya çok oyunculu oynamak için takım sayısını seç.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link href={getGameUrl(1)} className="block w-full">
                                <button className="w-full h-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/20 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all flex flex-col items-center justify-center gap-2 group">
                                    <User className="h-6 w-6"/> Tek Kişi
                                </button>
                            </Link>
                            <div className="space-y-2">
                                <Link href={getGameUrl(2)} className="block w-full">
                                     <button className="w-full h-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase rounded-xl shadow-lg shadow-rose-900/20 border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2">
                                        <Users className="h-5 w-5"/> 2 Takım
                                    </button>
                                </Link>
                                <Link href={getGameUrl(3)} className="block w-full">
                                     <button className="w-full h-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase rounded-xl shadow-lg shadow-purple-900/20 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2">
                                        <Users className="h-5 w-5"/> 3 Takım
                                    </button>
                                </Link>
                                <Link href={getGameUrl(4)} className="block w-full">
                                     <button className="w-full h-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-black text-sm uppercase rounded-xl shadow-lg shadow-teal-900/20 border-b-4 border-teal-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2">
                                        <Users className="h-5 w-5"/> 4 Takım
                                    </button>
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            );
      }
  };

  return (
    <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-20 font-sans selection:bg-purple-500/30 text-white flex flex-col items-center">
      
      {/* HEADER */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
          <Link href="/student/activities" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors">
            <ArrowLeft className="h-6 w-6 text-white" />
          </Link>
          <div className="text-center">
              <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 flex items-center gap-2 justify-center">
                  <Wind className="h-6 w-6 text-indigo-400 mb-1" />
                  Tornado
              </h1>
              <div className="flex items-center gap-1 justify-center text-xs font-bold text-indigo-300/60 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Kurulum Modu
              </div>
          </div>
          <div className="w-12"></div> {/* Spacer for center alignment */}
      </div>

      {/* PROGRESS TRACKER */}
      <div className="w-full max-w-2xl mb-8">
          <div className="relative flex justify-between items-center">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -z-10 rounded-full"></div>
              <div 
                className="absolute top-1/2 left-0 h-1 bg-indigo-500 shadow-[0_0_10px_#6366f1] -z-10 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step) => {
                  const isActive = currentStep >= step.id;
                  const isCurrent = currentStep === step.id;
                  
                  return (
                      <div key={step.id} className="flex flex-col items-center gap-2">
                          <div className={cn(
                              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10",
                              isActive 
                                ? "bg-indigo-600 border-indigo-900 text-white shadow-lg shadow-indigo-500/50 scale-110" 
                                : "bg-[#1a0b2e] border-white/10 text-slate-500"
                          )}>
                              <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <span className={cn(
                              "text-[10px] uppercase font-bold tracking-wider transition-colors duration-300 absolute -bottom-6 w-20 text-center",
                              isCurrent ? "text-white" : isActive ? "text-indigo-300" : "text-slate-600"
                          )}>
                              {step.name}
                          </span>
                      </div>
                  );
              })}
          </div>
      </div>

      <GlassCard className="w-full max-w-lg min-h-[400px] flex flex-col">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {steps.find(s => s.id === currentStep)?.name} Seçimi
              </h2>
              <div className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                  ADIM {currentStep}/4
              </div>
          </div>

          <div className="flex-grow p-6">
              {renderStepContent()}
          </div>

          <div className="p-6 pt-0 mt-auto flex justify-between gap-4">
              {currentStep > 1 ? (
                  <button 
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                      <ArrowLeft className="h-4 w-4" /> Geri
                  </button>
              ) : (
                  <div></div>
              )}
              
              <div className="text-xs text-slate-500 flex items-center italic">
                 {currentStep === 1 && !selection.courseId && "Devam etmek için bir ders seçin"}
                 {currentStep === 2 && !selection.unitId && "Bir ünite seçin"}
              </div>
          </div>
      </GlassCard>
    </div>
  );
}
