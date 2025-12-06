// THIS IS A GENERALIZED, REUSABLE SETUP PAGE COMPONENT.
// IT IS NOT ACCESSED VIA A URL BUT IMPORTED BY OTHER pages.

'use client';

import React, { useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Sparkles, Feather, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCoursesForSetup } from './actions';

// Type Definitions
type Topic = { id: string; title: string; };
type Unit = { id: string; title: string; topics: Topic[]; };
type Course = { id: string; title: string; className: string; units: Unit[]; color?: string; icon?: any };

const ICONS = [Book, Sparkles, Feather];

// --- UI COMPONENTS ---
const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#0f172a]/80 border-2 border-white/10 rounded-xl md:rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50"></div>
        {children}
    </div>
);

// MOBİL İÇİN OPTİMİZE EDİLMİŞ KART
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
        
        {/* Mobilde padding p-3 yapıldı (daha kompakt) */}
        <div className="relative h-full bg-[#1e293b] rounded-[10px] md:rounded-[1.3rem] p-3 md:p-6 flex items-center gap-3 md:gap-6 border border-white/5 group-hover:bg-[#1e293b]/90 transition-colors">
            
            {/* İkon kutusu mobilde küçültüldü: h-11 w-11 */}
            <div className={cn(
                "h-11 w-11 md:h-20 md:w-20 rounded-lg md:rounded-2xl flex items-center justify-center shadow-inner shrink-0 bg-gradient-to-br",
                color
            )}>
                <Icon className="h-5 w-5 md:h-10 md:w-10 text-white drop-shadow-md" />
            </div>
            
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-block self-start px-2 py-0.5 rounded-full bg-white/10 text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-wider mb-0.5 md:mb-2 border border-white/10">
                        {subtitle}
                    </div>
                )}
                {/* Başlık fontu mobilde okunabilir ama yer kaplamayan şekilde ayarlandı */}
                <h3 className="font-bold text-white text-[15px] md:text-3xl leading-snug truncate group-hover:text-cyan-300 transition-colors pr-1">
                    {title}
                </h3>
            </div>
            
            {/* Ok işareti küçültüldü */}
            <div className="h-7 w-7 md:h-12 md:w-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-cyan-400 group-hover:bg-cyan-400/20 transition-all shrink-0">
                <ArrowRight className="h-3.5 w-3.5 md:h-6 md:w-6 text-slate-400 group-hover:text-cyan-400" />
            </div>
        </div>
    </button>
);


// --- MAIN PAGE COMPONENT ---
const steps = [
  { id: 1, name: "Ders", icon: Book },
  { id: 2, name: "Ünite", icon: Library },
  { id: 3, name: "Konu", icon: ListTodo },
  { id: 4, name: "Başlat", icon: Sparkles },
];

const getGradient = (index: number) => {
    const gradients = [
        "from-blue-600 to-cyan-500",
        "from-indigo-600 to-purple-500",
        "from-emerald-600 to-teal-500",
        "from-rose-600 to-pink-500",
        "from-amber-600 to-orange-500"
    ];
    return gradients[index % gradients.length];
};

type OyunKurulumProps = {
    gameName: string;
    gameIcon: React.ElementType;
    gamePath: string; // e.g., 'acik-uclu-cevapla'
    isGame?: boolean;
};

export default function OyunKurulum({ gameName, gameIcon: GameIcon, gamePath, isGame = true }: OyunKurulumProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    courseColor: "", 
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        const courseData = await getCoursesForSetup();
        const enrichedCourses = courseData.map((c, i) => ({
            ...c,
            icon: ICONS[i % ICONS.length],
            color: getGradient(i)
        }));
        setAllCourses(enrichedCourses);
        
        const userClass = user?.class?.split(' - ')[0];
        if (userClass) {
            setFilteredCourses(enrichedCourses.filter(c => c.className?.startsWith(userClass) || !c.className || c.className === 'Genel'));
        } else {
            setFilteredCourses(enrichedCourses); 
        }

        setIsLoading(false);
    };
    if (user) {
        fetchInitialData();
    }
  }, [user]);

  const handleSelectCourse = (course: Course) => {
    setSelection({ 
        ...selection, 
        courseId: course.id, 
        courseName: course.title, 
        courseColor: course.color || "from-slate-700 to-slate-800",
        unitId: '', unitName: '', topicId: '', topicName: '' 
    });
    
    setIsLoading(true);
    setTimeout(() => {
        setUnits(course.units);
        setIsLoading(false);
        setCurrentStep(2);
    }, 300);
  };

  const handleSelectUnit = (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicId: '', topicName: '' });
    
    if (unitId === 'all') {
      setSelection(prev => ({ ...prev, unitId, unitName, topicId: 'all', topicName: 'Tüm Konular' }));
      setTopics([]);
      setCurrentStep(4);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
        const selectedCourse = allCourses.find(c => c.id === selection.courseId);
        const selectedUnit = selectedCourse?.units.find(u => u.id === unitId);
        setTopics(selectedUnit?.topics || []);
        setIsLoading(false);
        setCurrentStep(3);
    }, 300);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection({ ...selection, topicId, topicName });
    setCurrentStep(4);
  };

  const handleBack = () => {
      if (currentStep > 1) setCurrentStep(currentStep - 1);
      else router.push('/student');
  };

  const getGameUrl = () => {
    if(isGame) {
      const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        unitId: selection.unitId,
        unitName: selection.unitName,
        topicId: selection.topicId,
        topicName: selection.topicName,
      });
      return `/oyunlar/${gamePath}/oyun?${params.toString()}`;
    } else {
      return `/student/${gamePath}/${selection.courseId}/${selection.unitId}/${selection.topicId}`;
    }
  }

  const renderStepContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center h-48 md:h-96 gap-4">
                  <Loader2 className="h-10 w-10 md:h-20 md:w-20 text-cyan-400 animate-spin"/>
                  <p className="text-sm md:text-2xl font-bold text-cyan-200">İçerik Yükleniyor...</p>
              </div>
          );
      }

      // Grid gap azaltıldı: gap-3
      switch(currentStep) {
          case 1:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    {filteredCourses.map((course, idx) => (
                        <SelectionCard 
                            key={course.id}
                            title={course.title}
                            subtitle={course.className}
                            icon={course.icon || Book}
                            color={course.color || getGradient(idx)}
                            onClick={() => handleSelectCourse(course)}
                            delay={idx * 50}
                        />
                    ))}
                </div>
            );
          case 2:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    <SelectionCard 
                        key="all-units"
                        title="Tüm Üniteler (Karma)"
                        icon={Sparkles}
                        color="from-yellow-600 to-amber-500"
                        onClick={() => handleSelectUnit('all', 'Tüm Üniteler')}
                        delay={0}
                    />
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
          case 3:
            return (
                <div className="grid grid-cols-1 gap-3 md:gap-6">
                    <SelectionCard 
                        key="all-topics"
                        title="Tüm Konular (Karma)"
                        icon={Sparkles}
                        color="from-yellow-600 to-amber-500"
                        onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                        delay={0}
                    />
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
          case 4:
            return (
                <div className="flex flex-col items-center justify-center text-center space-y-4 md:space-y-8 py-2 md:py-8 animate-in zoom-in-95 duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 rounded-full"></div>
                        <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl relative z-10 transform rotate-3">
                            <PartyPopper className="h-8 w-8 md:h-20 md:w-20 text-white" />
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <h2 className="text-xl md:text-5xl font-black text-white uppercase tracking-wide">Hazır Mısın?</h2>
                        <p className="text-xs md:text-xl text-slate-300 max-w-md mx-auto">
                            İşte seçtiğin görev detayları:
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-3xl p-4 md:p-8 w-full max-w-2xl backdrop-blur-md">
                        {/* Mobilde liste görünümü, dikey çizgiler kaldırıldı, border eklendi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 text-left">
                            <div className="flex items-center md:block justify-between md:justify-start gap-2 border-b border-white/5 md:border-0 pb-2 md:pb-0">
                                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">DERS</span>
                                <span className="text-sm md:text-2xl font-bold text-white truncate text-right md:text-left" title={selection.courseName}>{selection.courseName}</span>
                            </div>
                            <div className="flex items-center md:block justify-between md:justify-start gap-2 border-b border-white/5 md:border-0 pb-2 md:pb-0">
                                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">ÜNİTE</span>
                                <span className="text-sm md:text-2xl font-bold text-white truncate text-right md:text-left" title={selection.unitName}>{selection.unitName}</span>
                            </div>
                            <div className="flex items-center md:block justify-between md:justify-start gap-2">
                                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest shrink-0">KONU</span>
                                <span className="text-sm md:text-2xl font-bold text-white truncate text-right md:text-left" title={selection.topicName}>{selection.topicName}</span>
                            </div>
                        </div>
                    </div>

                    <Link href={getGameUrl()} className="w-full max-w-md pt-2">
                        <button className="w-full py-3 md:py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-lg md:text-2xl uppercase tracking-widest rounded-xl md:rounded-2xl shadow-xl shadow-green-900/30 border-b-4 md:border-b-8 border-emerald-800 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3">
                            <GameIcon className="h-5 w-5 md:h-8 md:w-8" /> Başla
                        </button>
                    </Link>
                </div>
            );
      }
  };

  return (
    // Ana padding düşürüldü: p-2
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 pb-24 md:pb-10 font-sans text-white">
        
        {/* Header - Daha sıkı yerleşim */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
            <button 
                onClick={handleBack}
                className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border-white/10 transition-all group shrink-0"
            >
                <ArrowLeft className="h-5 w-5 md:h-8 md:w-8 text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div className="text-center mx-2 overflow-hidden flex-1">
                <div className="flex items-center justify-center gap-2">
                    {/* Mobilde ikonu gizle (yer tasarrufu) */}
                    <div className="hidden md:block p-2 bg-blue-500/20 rounded-xl">
                        <GameIcon className="h-8 w-8 text-blue-400" />
                    </div>
                    {/* Başlık mobilde daha küçük */}
                    <h1 className="text-lg md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">
                        {gameName}
                    </h1>
                </div>
            </div>
            {/* Dengeleyici boş div */}
            <div className="w-9 md:w-20 shrink-0"></div>
        </div>

        {/* Progress Bar - Kompakt */}
        <div className="max-w-4xl mx-auto mb-4 md:mb-12 px-1">
            <div className="relative flex justify-between items-center">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1">
                            <div className={cn(
                                "w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-500 z-10 font-black text-xs md:text-xl shadow-xl",
                                isActive 
                                    ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50" 
                                    : "bg-slate-900 border-slate-700 text-slate-500"
                            )}>
                                {isActive ? <Check className="h-3 w-3 md:h-6 md:w-6" /> : step.id}
                            </div>
                            <span className={cn(
                                "text-[9px] md:text-sm font-bold uppercase tracking-wider transition-colors duration-300",
                                isCurrent ? "text-blue-400" : isActive ? "text-white" : "text-slate-600"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        <GlassCard className="max-w-5xl mx-auto min-h-[calc(100vh-240px)] md:min-h-[500px] flex flex-col">
            <div className="p-3 md:p-8 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-2">
                    {/* Mobilde ikonu gizledim, sadece yazı */}
                    <span className="md:hidden">{steps.find(s => s.id === currentStep)?.name} Seçimi</span>
                    
                    <span className="hidden md:flex items-center gap-2">
                         {steps.find(s => s.id === currentStep)?.icon && (
                            <div className="p-1.5 md:p-2 bg-white/5 rounded-lg">
                               {React.createElement(steps.find(s => s.id === currentStep)!.icon, { className: "h-4 w-4 md:h-6 md:w-6 text-cyan-400" })}
                            </div>
                        )}
                        {steps.find(s => s.id === currentStep)?.name} Seçimi
                    </span>
                </h2>
                
                {currentStep < 4 && (
                    <div className="px-2 py-0.5 md:px-4 md:py-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] md:text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                        {currentStep} / 4
                    </div>
                )}
            </div>

            <div className="flex-grow p-2 md:p-8 lg:p-12 overflow-y-auto">
                {renderStepContent()}
            </div>

            {currentStep < 4 && (
                <div className="p-3 md:p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-[10px] md:text-sm font-medium">
                    <span className="truncate mr-4">
                        {currentStep === 1 && "Bir ders seç."}
                        {currentStep === 2 && "Bir ünite seç."}
                        {currentStep === 3 && "Bir konu seç."}
                    </span>
                    <div className="flex gap-1 md:gap-2 shrink-0">
                        <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce"></div>
                        <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce delay-100"></div>
                        <div className="h-1 w-1 md:h-2 md:w-2 rounded-full bg-slate-600 animate-bounce delay-200"></div>
                    </div>
                </div>
            )}
        </GlassCard>

    </div>
  );
}
