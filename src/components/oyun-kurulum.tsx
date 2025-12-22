
'use client';

import React, { useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Sparkles, Loader2, Feather, LayoutGrid, ChevronRight, Users, Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";

// --- TİP TANIMLARI ---
type Topic = { id: string; title: string; };
type Unit = { id: string; title: string; topics: Topic[]; hasUnitOzet?: boolean };
type Course = { 
    id: string; 
    title: string; 
    className?: string; 
    icon?: any; 
    color?: string;
    units: Unit[]; 
};
type ClassGroup = { name: string; courses: Course[] };

const ICONS = [Book, Sparkles, Feather, LayoutGrid];

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

// --- MOBİL İÇİN KULLANILAN KART BİLEŞENİ ---
const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#0f172a]/80 border-2 border-white/10 rounded-xl md:rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50"></div>
        {children}
    </div>
);

const SelectionCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    onClick, 
    delay = 0, 
    color = "from-slate-700 to-slate-800" 
}: { 
    title: string, 
    subtitle?: string, 
    icon: any, 
    onClick: () => void, 
    delay?: number,
    color?: string
}) => (
    <button 
        onClick={onClick}
        className={cn(
            "group relative w-full overflow-hidden rounded-xl md:rounded-3xl p-[2px] transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl text-left animate-in slide-in-from-bottom-4 fade-in fill-mode-forwards",
        )}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={cn("absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity bg-gradient-to-br", color)}></div>
        
        <div className="relative h-full bg-[#1e293b] rounded-[10px] md:rounded-[1.3rem] p-3 md:p-6 flex items-center gap-3 md:gap-6 border border-white/5 group-hover:bg-[#1e293b]/90 transition-colors">
            
            <div className={cn(
                "h-10 w-10 md:h-20 md:w-20 rounded-lg md:rounded-2xl flex items-center justify-center shadow-inner shrink-0 bg-gradient-to-br",
                color
            )}>
                <Icon className="h-5 w-5 md:h-10 md:w-10 text-white drop-shadow-md" />
            </div>
            
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-block self-start px-2 py-0.5 rounded-full bg-white/10 text-[9px] md:text-xs font-bold text-slate-300 uppercase tracking-wider mb-0.5 md:mb-2 border border-white/10">
                        {subtitle}
                    </div>
                )}
                <h3 className="font-bold text-white text-sm md:text-3xl leading-snug truncate group-hover:text-cyan-300 transition-colors pr-1">
                    {title}
                </h3>
            </div>
            
            <div className="h-6 w-6 md:h-12 md:w-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-cyan-400 group-hover:bg-cyan-400/20 transition-all shrink-0">
                <ArrowRight className="h-3 w-3 md:h-6 md:w-6 text-slate-400 group-hover:text-cyan-400" />
            </div>
        </div>
    </button>
);


const steps = [
  { id: 1, name: "Sınıf", icon: Users },
  { id: 2, name: "Ders", icon: Book },
  { id: 3, name: "Ünite", icon: Library },
  { id: 4, name: "Konu", icon: ListTodo },
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
  
  const [allClassGroups, setAllClassGroups] = useState<ClassGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const finalGameName = gameName || searchParams.get('gameName') || pageTitle || "Etkinlik Kurulumu";
  const finalGamePath = gamePath || searchParams.get('gamePath') || "";
  const finalTargetPath = targetPath || 'oyunlar';

  const [selection, setSelection] = useState({
    className: "",
    courseId: "",
    courseName: "",
    courseColor: "from-slate-700 to-slate-800", 
    unitId: "",
    unitName: "",
  });

  useEffect(() => {
    const fetchManifest = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/curriculum/manifest.json');
            if (!res.ok) {
                throw new Error("Müfredat manifestosu yüklenemedi.");
            }
            const data = await res.json();
            
            const enrichedClassGroups = data.classGroups.map((group: any, groupIndex: number) => ({
                ...group,
                courses: group.courses.map((course: any, courseIndex: number) => ({
                    ...course,
                    icon: ICONS[courseIndex % ICONS.length],
                    color: getGradient(courseIndex),
                    className: group.name,
                }))
            }));
            
            setAllClassGroups(enrichedClassGroups);

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchManifest();
  }, []);

  const handleSelectClass = (group: ClassGroup) => {
    setSelection({ 
        ...selection, 
        className: group.name, 
        courseId: '', courseName: '', unitId: '', unitName: '' 
    });
    setCourses(group.courses);
    setCurrentStep(2);
  };

  const handleSelectCourse = (course: Course) => {
    setSelection({ 
        ...selection, 
        courseId: course.id, 
        courseName: course.title, 
        courseColor: course.color || "from-slate-700 to-slate-800",
        unitId: '', unitName: '',
    });
    
    setIsLoading(true);
    setTimeout(() => {
        setUnits(course.units || []);
        setIsLoading(false);
        setCurrentStep(3);
    }, 300);
  };

  const handleSelectUnit = (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName });
    
    const gamePathFromUrl = finalGamePath;

    if (dataType === 'games' && unitId === 'all' && gamePathFromUrl) {
        const params = new URLSearchParams({
            gameName: finalGameName,
            gamePath: gamePathFromUrl,
            courseId: selection.courseId,
            courseName: selection.courseName,
            unitId: 'all',
            unitName: 'Tüm Üniteler',
            topicId: 'all',
            topicName: 'Tüm Konular',
            isStatic: String(isStatic),
        });
        router.push(`/oyunlar/${gamePathFromUrl}/oyun?${params.toString()}`);
        return;
    }
    
     if (dataType === 'ozetler' && unitId !== 'all') {
         const selectedUnit = units.find(u => u.id === unitId);
         if (selectedUnit && selectedUnit.hasUnitOzet) {
            router.push(`/${finalTargetPath}/${selection.courseId}/${unitId}`);
            return;
         }
    }

    setIsLoading(true);
    setTimeout(() => {
        const selectedUnit = units.find(u => u.id === unitId);
        setTopics(selectedUnit?.topics || []);
        setIsLoading(false);
        setCurrentStep(4);
    }, 300);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
      let url = '';
      const gamePathFromUrl = finalGamePath;
      
      if (dataType === 'games' && gamePathFromUrl) {
          const params = new URLSearchParams({
            gameName: finalGameName,
            gamePath: gamePathFromUrl,
            courseId: selection.courseId,
            courseName: selection.courseName,
            unitId: selection.unitId,
            unitName: selection.unitName,
            topicId: topicId,
            topicName: topicName,
            isStatic: String(isStatic),
          });
          url = `/oyunlar/${gamePathFromUrl}/oyun?${params.toString()}`;
      } else {
          url = `/${finalTargetPath}/${selection.courseId}/${selection.unitId}/${topicId}`;
      }
      router.push(url);
  };

  const handleBack = () => {
      if (currentStep > 1) setCurrentStep(currentStep - 1);
      else router.push(getBackUrl());
  };
  
  const getBackUrl = () => {
    if (user?.role === 'student') return '/student';
    if (user?.role === 'teacher' || user?.role === 'superadmin') return '/teacher/smartboard';
    return '/';
  };

  const formatGroupName = (name: string) => {
    if (!isNaN(parseInt(name))) {
        return `${name}. Sınıf`;
    }
    return name;
  };

  const renderStepContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center h-48 md:h-96 gap-4">
                  <Loader2 className="h-10 w-10 md:h-20 md:w-20 text-cyan-400 animate-spin"/>
                  <p className="text-sm md:text-2xl font-bold text-cyan-200">İçerik Yükleniyor...</p>
              </div>
          );
      }
      
      switch(currentStep) {
          case 1:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {allClassGroups.length > 0 ? allClassGroups.map((group, idx) => (
                        <SelectionCard 
                            key={group.name}
                            title={formatGroupName(group.name)}
                            icon={Users}
                            color={getGradient(idx)}
                            onClick={() => handleSelectClass(group)}
                            delay={idx * 50}
                        />
                    )) : <p className="text-center text-slate-500 py-10">Müfredat içeriği bulunamadı.</p>}
                </div>
            );
          case 2:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {courses.map((course, idx) => (
                        <SelectionCard 
                            key={course.id}
                            title={course.title}
                            icon={course.icon || Book}
                            color={course.color || getGradient(idx)}
                            onClick={() => handleSelectCourse(course)}
                            delay={idx * 50}
                        />
                    ))}
                </div>
            );
          case 3:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {dataType === 'games' && (
                        <SelectionCard 
                            key="all-units"
                            title="Tüm Üniteler (Karma)"
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
                            icon={Library}
                            color={selection.courseColor}
                            onClick={() => handleSelectUnit(unit.id, unit.title)}
                            delay={(idx + 1) * 50}
                        />
                    ))}
                </div>
            );
          case 4:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {dataType === 'games' && (
                         <SelectionCard 
                            key="all-topics"
                            title="Tüm Konular (Karma)"
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
                    <div className="hidden md:block p-2 bg-blue-500/20 rounded-xl"><PageIcon className="h-8 w-8 text-blue-400" /></div>
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

        <GlassCard className="max-w-5xl mx-auto min-h-[calc(100vh-240px)] flex flex-col">
            <div className="p-3 md:p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-2">
                    <span className="md:hidden">{steps.find(s => s.id === currentStep)?.name} Seç</span>
                    
                    <span className="hidden md:flex items-center gap-2">
                         {steps.find(s => s.id === currentStep)?.icon && (
                            <div className="p-1.5 md:p-2 bg-white/5 rounded-lg">
                               {React.createElement(steps.find(s => s.id === currentStep)!.icon, { className: "h-4 w-4 md:h-6 md:w-6 text-cyan-400" })}
                            </div>
                        )}
                        {steps.find(s => s.id === currentStep)?.name} Seçimi
                    </span>
                </h2>
                
                <div className="px-2 py-0.5 md:px-4 md:py-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] md:text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                    Adım {currentStep} / {steps.length}
                </div>
            </div>
            <div className="flex-grow p-2 md:p-8 lg:p-12 overflow-y-auto">
                {renderStepContent()}
            </div>
            <div className="p-3 md:p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-[10px] md:text-sm font-medium">
                <span className="truncate mr-4">
                    {currentStep === 1 && "Bir sınıf seçerek başla."}
                    {currentStep === 2 && `${selection.className} için bir ders seç.`}
                    {currentStep === 3 && `${selection.courseName} dersi için bir ünite seç.`}
                    {currentStep === 4 && `${selection.unitName} ünitesi için bir konu seç.`}
                </span>
                <div className="flex gap-1 md:gap-2 shrink-0">
                    <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce"></div>
                    <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce delay-100"></div>
                    <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce delay-200"></div>
                </div>
            </div>
        </GlassCard>

    </div>
  );
}
