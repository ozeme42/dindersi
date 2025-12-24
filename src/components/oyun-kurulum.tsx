
'use client';

import React, { useState, useEffect, useCallback } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    Sparkles, Loader2, Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCurriculumForSelection, type ClassGroup as EnrichedClassGroup } from '@/components/actions/get-curriculum-for-selection';

// --- TİP TANIMLARI ---
type Topic = EnrichedClassGroup['courses'][0]['units'][0]['topics'][0];
type Unit = EnrichedClassGroup['courses'][0]['units'][0];
type Course = EnrichedClassGroup['courses'][0];

const ICONS = [Book, Sparkles, Book, Gamepad2];
const getGradient = (index: number) => {
    const gradients = [
        "from-blue-600 to-cyan-500",
        "from-violet-600 to-purple-500",
        "from-emerald-600 to-teal-500",
        "from-rose-600 to-pink-500",
        "from-amber-600 to-orange-500"
    ];
    return gradients[index % gradients.length];
};

// --- UI COMPONENTS ---

const GlassPanel = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#0f172a]/80 border border-white/10 rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
         {/* Dekoratif üst çizgi */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50"></div>
        {children}
    </div>
);

const SelectionCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    onClick, 
    delay = 0, 
    color = "from-slate-700 to-slate-800",
    isActive = false,
    hasContent = true,
}: { 
    title: string, 
    subtitle?: string, 
    icon: any, 
    onClick: () => void, 
    delay?: number,
    color?: string,
    isActive?: boolean,
    hasContent?: boolean
}) => (
    <button 
        onClick={onClick}
        disabled={!hasContent}
        className={cn(
            "group relative w-full overflow-hidden rounded-xl p-[1px] transition-all duration-300 text-left h-full",
            hasContent ? "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10" : "opacity-40 cursor-not-allowed",
            "animate-in slide-in-from-bottom-4 fade-in fill-mode-forwards"
        )}
        style={{ animationDelay: `${delay}ms` }}
    >
        {/* Arkaplan Gradyanı (Border Effect) */}
        <div className={cn(
            "absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", 
            color
        )}></div>
        
        {/* Kart İçeriği */}
        <div className="relative h-full bg-[#1e293b] rounded-[10px] p-3 md:p-6 flex items-center gap-3 md:gap-6 border border-white/5 group-hover:bg-[#1e293b]/95 transition-colors">
            
            {/* İkon Kutusu */}
            <div className={cn(
                "h-12 w-12 md:h-16 md:w-16 rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br text-white transition-transform group-hover:scale-110 duration-300 border border-white/10",
                color
            )}>
                <Icon className="h-6 w-6 md:h-8 md:w-8 drop-shadow-md" />
            </div>
            
            {/* Metin Alanı */}
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 mb-1.5">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">{subtitle}</span>
                    </div>
                )}
                <h3 className="font-bold text-slate-100 text-base md:text-lg lg:text-xl leading-snug group-hover:text-white transition-colors">
                    {title}
                </h3>
                 {!hasContent && <span className="text-[10px] text-red-400/70 font-semibold mt-1">İçerik Yok</span>}
            </div>
            
            {/* Sağ Ok */}
            <div className="h-6 w-6 md:h-10 md:w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0 ml-2">
                <ArrowRight className="h-3 w-3 md:h-5 md:w-5 text-slate-500 group-hover:text-white" />
            </div>
        </div>
    </button>
);

// --- MAIN PAGE COMPONENT ---
const steps = [
  { id: 1, name: "Ders Seçimi", icon: Book },
  { id: 2, name: "Ünite Seçimi", icon: Library },
  { id: 3, name: "Konu Seçimi", icon: ListTodo },
];

type OyunKurulumProps = {
    pageTitle?: string;
    gameName?: string;
    gamePath?: string;
    gameIcon?: React.ElementType;
    targetPath?: string;
    dataType: 'games' | 'yazilacaklar' | 'ozetler';
    isStatic?: boolean;
}

export function OyunKurulum({ pageTitle, gameName, gamePath, gameIcon: PageIcon = Gamepad2, targetPath, dataType, isStatic = false }: OyunKurulumProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allClassGroups, setAllClassGroups] = useState<EnrichedClassGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const finalGameName = gameName || searchParams.get('gameName') || pageTitle || "Etkinlik Kurulumu";
  const finalGamePath = gamePath || searchParams.get('gamePath') || "";

  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    courseColor: "from-slate-700 to-slate-800", 
    unitId: "",
    unitName: "",
    topicName: ""
  });

  const getBackUrl = () => {
    if (targetPath?.startsWith('student')) return '/student';
    if(targetPath === 'oyunlar') return '/oyunlar';
    return '/';
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
    } else {
        router.push(getBackUrl());
    }
  };


  const fetchManifest = useCallback(async () => {
    setIsLoading(true);
    try {
      const isForStudent = !isStatic && !!user;
      const res = await getCurriculumForSelection(dataType, isStatic, isForStudent ? user?.uid : undefined);
      if (res.error) throw new Error(res.error);

      // Sınıf gruplarını alıp derslere ikon ve renk ataması yap
      const classGroupsWithData = (res.classGroups || []).map((group, groupIndex) => ({
          ...group,
          courses: group.courses.map((course: any, courseIndex: number) => ({
              ...course,
              icon: ICONS[(groupIndex + courseIndex) % ICONS.length],
              color: getGradient(groupIndex + courseIndex),
              className: group.name, // Ders kartında sınıf adını göstermek için
          }))
      }));

      // Tüm dersleri tek bir listede topla (sınıf filtresi olmadan başlangıç için)
      const allCourses = classGroupsWithData.flatMap(group => group.courses);
      
      setAllClassGroups(classGroupsWithData);
      setCourses(allCourses); // Başlangıçta tüm dersleri göster
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, dataType, isStatic]);

  useEffect(() => {
      fetchManifest();
  }, [fetchManifest]);

  const handleSelectCourse = (course: Course) => {
    setSelection({ 
        ...selection, 
        courseId: course.id, 
        courseName: course.title, 
        courseColor: (course as any).color || "from-slate-700 to-slate-800",
        unitId: '', unitName: '',
    });
    
    setIsLoading(true);
    setTimeout(() => {
        setUnits((course as any).units || []);
        setIsLoading(false);
        setCurrentStep(2);
    }, 300);
  };

  const handleSelectUnit = (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicName: '' });
    
    if (dataType === 'games' && unitId === 'all') {
        const params = new URLSearchParams({
            courseId: selection.courseId,
            courseName: selection.courseName,
            unitId: 'all',
            unitName: 'Tüm Üniteler',
            topicId: 'all',
            topicName: 'Tüm Konular',
        });
        if (isStatic) params.append('isStatic', 'true');
        const url = `/oyunlar/${finalGamePath}/oyun?${params.toString()}`;
        router.push(url);
        return;
    }
    
    if (dataType === 'ozetler' && unitId !== 'all') {
         const selectedUnit = units.find(u => u.id === unitId);
         if (selectedUnit && (selectedUnit as any).hasUnitOzet) {
            const urlPath = isStatic ? `ozetler` : `student/ozetler`;
            router.push(`/${urlPath}/${selection.courseId}/${unitId}`);
            return;
         }
    }

    setIsLoading(true);
    setTimeout(() => {
        const selectedUnit = units.find(u => u.id === unitId);
        const availableTopics = (selectedUnit?.topics || []).filter(topic => {
            if (dataType === 'yazilacaklar') return (topic as any).hasYazilacaklarContent;
            if (dataType === 'ozetler') return (topic as any).hasOzetContent;
            return true;
        });
        setTopics(availableTopics);
        setIsLoading(false);
        setCurrentStep(3);
    }, 300);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
      setSelection({...selection, topicName});
      
      const pathPrefix = isStatic ? '' : '/student';
      let basePath = targetPath;
      if (!basePath) {
          basePath = 'oyunlar'; // default to games if not specified
      }
      
      const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        unitId: selection.unitId,
        unitName: selection.unitName,
        topicId: topicId,
        topicName: topicName,
      });

      if (isStatic) {
          params.append('isStatic', 'true');
      }
      
      let finalUrl = `/${basePath}/${finalGamePath}/oyun?${params.toString()}`;
      
      if(dataType === 'yazilacaklar') {
          finalUrl = `${pathPrefix}/yazilacaklar/${selection.courseId}/${selection.unitId}/${topicId}`;
      }
      if(dataType === 'ozetler') {
           finalUrl = `${pathPrefix}/ozetler/${selection.courseId}/${selection.unitId}/${topicId}`;
      }

      router.push(finalUrl);
  };

  const renderStepContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center h-48 md:h-96 gap-4 animate-pulse">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 md:h-20 md:w-20 text-cyan-400 animate-spin" />
                    <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full"></div>
                  </div>
                  <p className="text-sm md:text-2xl font-bold text-cyan-200">İçerikler Yükleniyor...</p>
              </div>
          );
      }
      
      switch(currentStep) {
          case 1:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {courses.length > 0 ? courses.map((course, idx) => (
                        <SelectionCard 
                            key={course.id}
                            title={course.title}
                            subtitle={(course as any).className}
                            icon={(course as any).icon || Book}
                            color={(course as any).color || getGradient(idx)}
                            onClick={() => handleSelectCourse(course as Course)}
                            delay={idx * 50}
                        />
                    )) : <p className="col-span-full text-center text-slate-500 py-10">Bu bölüm için uygun ders bulunmuyor.</p>}
                </div>
            );
          case 2:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {dataType === 'games' && (
                        <SelectionCard 
                            key="all-units"
                            title="Tüm Üniteler (Karma)"
                            subtitle="Genel Tekrar"
                            icon={Sparkles}
                            color="from-yellow-600 to-amber-500"
                            onClick={() => handleSelectUnit('all', 'Tüm Üniteler')}
                            delay={0}
                        />
                    )}
                    {units.map((unit, idx) => (
                        <SelectionCard 
                            key={unit.id}
                            title={unit.title}
                            subtitle={selection.courseName}
                            icon={Library}
                            color={selection.courseColor}
                            onClick={() => handleSelectUnit(unit.id, unit.title)}
                            delay={(idx + (dataType === 'games' ? 1 : 0)) * 50}
                            hasContent={dataType === 'ozetler' ? ((unit as any).hasUnitOzet || (unit.topics.length > 0)) : true}
                        />
                    ))}
                </div>
            );
          case 3:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {dataType === 'games' && (
                          <SelectionCard 
                            key="all-topics"
                            title="Tüm Konular (Karma)"
                            subtitle="Ünite Tekrarı"
                            icon={Sparkles}
                            color="from-yellow-600 to-amber-500"
                            onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                            delay={0}
                        />
                    )}
                    {topics.map((topic, idx) => (
                        <SelectionCard 
                            key={topic.id}
                            title={topic.title}
                            subtitle={selection.unitName}
                            icon={ListTodo}
                            color={selection.courseColor}
                            onClick={() => handleSelectTopic(topic.id, topic.title)}
                            delay={(idx + 1) * 50}
                        />
                    ))}
                </div>
            );
          default:
            return null;
      }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 pb-24 md:pb-10 font-sans text-white">
        
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
            <button 
                onClick={handleBack}
                className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border-white/10 transition-all group shrink-0"
            >
                <ArrowLeft className="h-5 w-5 md:h-8 md:w-8 text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div className="text-center mx-2 overflow-hidden flex-1">
                <div className="flex items-center justify-center gap-2">
                    <div className="hidden md:block p-2 bg-blue-500/20 rounded-xl">
                        <PageIcon className="h-8 w-8 text-blue-400" />
                    </div>
                    <h1 className="text-lg md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">
                        {finalGameName}
                    </h1>
                </div>
            </div>
            <div className="w-9 md:w-20 shrink-0"></div>
        </div>

        <div className="max-w-4xl mx-auto mb-4 md:mb-12 px-1">
            <div className="relative flex justify-between items-center">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1">
                            <div className={cn("w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-500 z-10 font-black text-xs md:text-xl shadow-xl", isActive ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-500")}>
                                {isActive && !isCurrent ? <Check className="h-3 w-3 md:h-6 md:w-6" /> : step.id}
                            </div>
                            <span className={cn("text-[9px] md:text-sm font-bold uppercase tracking-wider transition-colors duration-300", isCurrent ? "text-blue-400" : isActive ? "text-white" : "text-slate-600")}>{step.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        <GlassPanel className="max-w-5xl mx-auto min-h-[calc(100vh-240px)] flex flex-col">
            <div className="p-3 md:p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-3">
                    {React.createElement(steps[currentStep-1].icon, { className: "h-5 w-5 text-cyan-400" })}
                    {steps[currentStep-1].name}
                </h2>
                
                <div className="px-2 py-0.5 md:px-4 md:py-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] md:text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                    ADIM {currentStep} / {steps.length}
                </div>
            </div>

            <div className="flex-grow p-2 md:p-8 lg:p-12 overflow-y-auto">
                {renderStepContent()}
            </div>

            <div className="p-3 md:p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-[10px] md:text-sm font-medium">
                <span className="truncate mr-4">
                    {currentStep === 1 && "Bir ders seçerek başla."}
                    {currentStep === 2 && `${selection.courseName} > Bir ünite seç.`}
                    {currentStep === 3 && `${selection.unitName} > Bir konu seç.`}
                </span>
                <div className="flex gap-1 md:gap-2 shrink-0">
                    <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce"></div>
                    <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce [animation-delay:100ms]"></div>
                    <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce [animation-delay:200ms]"></div>
                </div>
            </div>
        </GlassPanel>

    </div>
  );
}
