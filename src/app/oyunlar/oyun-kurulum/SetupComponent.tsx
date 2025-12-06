// THIS IS A GENERALIZED, REUSABLE SETUP PAGE COMPONENT.
// IT IS NOT ACCESSED VIA A URL BUT IMPORTED BY OTHER pages.

'use client';

import React, { useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Sparkles, Loader2, Feather
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
        "backdrop-blur-xl bg-[#0f172a]/80 border border-white/10 rounded-xl md:rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50"></div>
        {children}
    </div>
);

// MOBİL İÇİN KOMPAKT HALE GETİRİLMİŞ KART
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
        
        {/* İçerik Alanı - Mobilde padding azaltıldı (p-3) */}
        <div className="relative h-full bg-[#1e293b] rounded-[10px] md:rounded-[1.3rem] p-3 md:p-6 flex items-center gap-3 md:gap-6 border border-white/5 group-hover:bg-[#1e293b]/90 transition-colors">
            
            {/* İkon Kutusu - Mobilde boyut h-10 w-10 (40px) yapıldı */}
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
                {/* Başlık - Mobilde text-sm yapıldı ve satır yüksekliği düşürüldü */}
                <h3 className="font-bold text-white text-sm md:text-3xl leading-snug truncate group-hover:text-cyan-300 transition-colors pr-1">
                    {title}
                </h3>
            </div>
            
            {/* Ok İşareti - Mobilde küçültüldü */}
            <div className="h-6 w-6 md:h-12 md:w-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-cyan-400 group-hover:bg-cyan-400/20 transition-all shrink-0">
                <ArrowRight className="h-3 w-3 md:h-6 md:w-6 text-slate-400 group-hover:text-cyan-400" />
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
    gamePath: string;
};

export default function OyunKurulum({ gameName, gameIcon: GameIcon, gamePath }: OyunKurulumProps) {
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
    const params = new URLSearchParams({
      courseId: selection.courseId,
      courseName: selection.courseName,
      unitId: selection.unitId,
      unitName: selection.unitName,
      topicId: selection.topicId,
      topicName: selection.topicName,
    });
    return `/oyunlar/${gamePath}/oyun?${params.toString()}`;
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

      // Mobilde grid gap azaltıldı (gap-3)
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
                    
                    <div className="space-y-1 md:space-y-2">
                        <h2 className="text-xl md:text-5xl font-black text-white uppercase tracking-wide">Hazır Mısın?</h2>
                        <p className="text-xs md:text-xl text-slate-300 max-w-md mx-auto">
                            İşte seçtiğin görev detayları:
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-3xl p-4 md:p-8 w-full max-w-2xl backdrop-blur-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8 text-left">
                            <div className="flex items-center md:block gap-2 border-b border-white/5 md:border-0 pb-2 md:pb-0">
                                <span className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[50px]">DERS:</span>
                                <span className="text-sm md:text-2xl font-bold text-white truncate" title={selection.courseName}>{selection.courseName}</span>
                            </div>
                            <div className="flex items-center md:block gap-2 border-b border-white/5 md:border-0 pb-2 md:pb-0">
                                <span className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[50px]">ÜNİTE:</span>
                                <span className="text-sm md:text-2xl font-bold text-white truncate" title={selection.unitName}>{selection.unitName}</span>
                            </div>
                            <div className="flex items-center md:block gap-2">
                                <span className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-widest min-w-[50px]">KONU:</span>
                                <span className="text-sm md:text-2xl font-bold text-white truncate" title={selection.topicName}>{selection.topicName}</span>
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
    // Ana kapsayıcı padding azaltıldı: p-2 (mobil)
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 font-sans text-white">
        
        {/* Header - Kompakt */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
            <button 
                onClick={handleBack}
                className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border