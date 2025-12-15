'use client';

import React, { useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Sparkles, Loader2, Feather, LayoutGrid, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCoursesForSetup } from './actions';
import { Gamepad2 } from 'lucide-react';

// --- TİP TANIMLARI ---
type Topic = { id: string; title: string; };
type Unit = { id: string; title: string; topics: Topic[]; };
type Course = { id: string; title: string; className: string; units: Unit[]; color?: string; icon?: any };

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

// --- ESKİ MOBİL BİLEŞENLER (ORİJİNAL HALİ) ---
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
  { id: 1, name: "Ders", icon: Book },
  { id: 2, name: "Ünite", icon: Library },
  { id: 3, name: "Konu", icon: ListTodo },
  { id: 4, name: "Başlat", icon: Sparkles },
];

type OyunKurulumProps = {
    gameName?: string;
    gamePath?: string;
    gameIcon?: React.ElementType;
}

export default function OyunKurulum({ gameName: gameNameProp, gamePath: gamePathProp, gameIcon: GameIconProp }: OyunKurulumProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const gameName = gameNameProp || searchParams.get('gameName') || "Etkinlik Kurulumu";
  const gamePath = gamePathProp || searchParams.get('gamePath') || "";
  const GameIcon = GameIconProp || Gamepad2;

  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    courseColor: "from-slate-700 to-slate-800", 
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  // --- OYUN OTOMATİK BAŞLATMA MANTIĞI ---
  useEffect(() => {
      const autoStart = searchParams.get('autoStart');
      const currentGamePath = gamePathProp || searchParams.get('gamePath') || "";

      if (autoStart === 'true' && currentGamePath) {
          const params = new URLSearchParams(searchParams.toString());
          const targetUrl = `/oyunlar/${currentGamePath}/oyun?${params.toString()}`;
          router.replace(targetUrl);
          return; 
      }
  }, [searchParams, gamePathProp, router]);

  useEffect(() => {
    if (searchParams.get('autoStart') === 'true') return;

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
  }, [user, searchParams]);

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
      const backUrl = gamePath === 'yazilacaklar' || gamePath === 'ozetler' ? '/student' : '/oyunlar';
      if (currentStep > 1) setCurrentStep(currentStep - 1);
      else router.push(backUrl);
  };

  const getGameUrl = () => {
    const isGame = !['yazilacaklar', 'ozetler'].includes(gamePath);
    const params = new URLSearchParams({
      gameName,
      gamePath,
      courseId: selection.courseId,
      courseName: selection.courseName,
      unitId: selection.unitId,
      unitName: selection.unitName,
      topicId: selection.topicId,
      topicName: selection.topicName,
      autoStart: 'true'
    });
    if(isGame) {
      return `/oyunlar/${gamePath}/oyun?${params.toString()}`;
    } else {
      return `/student/${gamePath}/${selection.courseId}/${selection.unitId}/${selection.topicId}`;
    }
  }

  // --- RENDER MANTIKLARI ---

  // 1. MASAÜSTÜ İÇİN ÖZET SIDEBAR
  const DesktopSelectionSummary = () => (
      <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10 space-y-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
               <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg", selection.courseColor || "from-slate-700 to-slate-800")}>
                    <GameIcon className="h-8 w-8 text-white" />
               </div>
               <div>
                   <h2 className="text-xl font-bold text-white">{gameName}</h2>
                   <p className="text-sm text-slate-400">Etkinlik Kurulumu</p>
               </div>
          </div>
          
          <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => currentStep > 1 && setCurrentStep(1)}>
                  <span className="text-xs font-bold text-slate-500 uppercase">DERS</span>
                  <span className={cn("text-sm font-medium", selection.courseName ? "text-white group-hover:text-cyan-400" : "text-slate-600")}>
                      {selection.courseName || "Seçilmedi"}
                  </span>
              </div>
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => currentStep > 2 && setCurrentStep(2)}>
                  <span className="text-xs font-bold text-slate-500 uppercase">ÜNİTE</span>
                  <span className={cn("text-sm font-medium", selection.unitName ? "text-white group-hover:text-cyan-400" : "text-slate-600")}>
                      {selection.unitName || "Seçilmedi"}
                  </span>
              </div>
               <div className="flex justify-between items-center group cursor-pointer" onClick={() => currentStep > 3 && setCurrentStep(3)}>
                  <span className="text-xs font-bold text-slate-500 uppercase">KONU</span>
                  <span className={cn("text-sm font-medium", selection.topicName ? "text-white group-hover:text-cyan-400" : "text-slate-600")}>
                      {selection.topicName || "Seçilmedi"}
                  </span>
              </div>
          </div>
      </div>
  );

  // 2. MASAÜSTÜ İÇİN İÇERİK (Grid Yapısı)
  const renderDesktopContent = () => {
    if (isLoading) return <div className="flex flex-col items-center justify-center h-full min-h-[400px]"><Loader2 className="h-16 w-16 text-cyan-500 animate-spin mb-4"/><p className="text-slate-400 animate-pulse">Veriler yükleniyor...</p></div>;

    switch(currentStep) {
        case 1:
            return (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-2">Ders Seç</h2>
                    <p className="text-slate-400 mb-8">Hangi ders için etkinlik yapmak istersin?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCourses.map((course) => (
                            <button key={course.id} onClick={() => handleSelectCourse(course)} className="group relative flex flex-col items-start p-6 rounded-3xl border border-white/5 hover:border-white/20 bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden text-left">
                                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br transition-opacity duration-500", course.color)}></div>
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br shadow-inner", course.color)}>{React.createElement(course.icon || Book, { className: "h-6 w-6 text-white" })}</div>
                                <h3 className="text-xl font-bold text-white mb-1">{course.title}</h3>
                                <p className="text-sm text-slate-400 font-medium bg-white/5 px-2 py-0.5 rounded-full">{course.className}</p>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 2:
            return (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-2">Ünite Seç</h2>
                    <p className="text-slate-400 mb-8">{selection.courseName} dersi için bir ünite seç.</p>
                    <div className="space-y-3">
                        <button onClick={() => handleSelectUnit('all', 'Tüm Üniteler')} className="w-full flex items-center p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-200 transition-all group">
                            <Sparkles className="h-6 w-6 mr-4 group-hover:rotate-12 transition-transform" /><span className="font-bold text-lg">Karışık (Tüm Üniteler)</span><ArrowRight className="ml-auto h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                        </button>
                        {units.map((unit, idx) => (
                            <button key={unit.id} onClick={() => handleSelectUnit(unit.id, unit.title)} className="w-full flex items-center p-4 rounded-2xl border border-white/5 bg-slate-800/30 hover:bg-slate-700/50 hover:border-white/10 text-left transition-all group" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br text-white shadow-sm font-bold text-sm", selection.courseColor)}>{idx + 1}</div>
                                <span className="font-medium text-slate-200 group-hover:text-white text-lg">{unit.title}</span><ArrowRight className="ml-auto h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all"/>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 3:
            return (
                 <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-2">Konu Seç</h2>
                    <p className="text-slate-400 mb-8">{selection.unitName} ünitesi için konu belirle.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => handleSelectTopic('all', 'Tüm Konular')} className="flex flex-col p-6 rounded-3xl border border-dashed border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-200 transition-all group hover:scale-[1.02]">
                            <Sparkles className="h-8 w-8 mb-4 group-hover:animate-pulse" /><span className="font-bold text-xl">Tüm Konular</span><span className="text-sm opacity-60 mt-1">Bu ünitedeki her şeyden sorumlu ol.</span>
                        </button>
                        {topics.map((topic, idx) => (
                            <button key={topic.id} onClick={() => handleSelectTopic(topic.id, topic.title)} className="flex flex-col p-6 rounded-3xl border border-white/5 bg-slate-800/30 hover:bg-slate-700/50 hover:border-white/10 text-left transition-all hover:scale-[1.02] group">
                                <ListTodo className={cn("h-8 w-8 mb-4 opacity-50 group-hover:opacity-100 group-hover:text-cyan-400 transition-all")} /><span className="font-bold text-xl text-slate-200 group-hover:text-white mb-1">{topic.title}</span><span className="text-sm text-slate-500">Konu #{idx + 1}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 4:
            return (
                <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500 text-center py-10">
                    <div className="relative mb-8"><div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 rounded-full animate-pulse"></div><div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 rounded-[2rem] shadow-2xl relative z-10 transform -rotate-3 hover:rotate-0 transition-transform duration-500"><Gamepad2 className="h-24 w-24 text-white" /></div></div>
                    <h2 className="text-5xl font-black text-white mb-4 tracking-tight">Hazır Mısın?</h2>
                    <p className="text-xl text-slate-400 mb-10 max-w-lg">Seçimlerini tamamladın. Şimdi <span className="text-green-400 font-bold">{selection.topicName}</span> konusunda kendini test etme zamanı.</p>
                    <Link href={getGameUrl()} className="w-full max-w-md group"><button className="relative w-full py-6 bg-white text-black font-black text-2xl uppercase tracking-widest rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]"><span className="relative z-10 flex items-center justify-center gap-3">BAŞLA <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform"/></span><div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div><span className="absolute inset-0 z-10 flex items-center justify-center gap-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">BAŞLA <ArrowRight className="h-6 w-6"/></span></button></Link>
                </div>
            );
    }
  };

  // 3. MOBİL İÇİN İÇERİK (Eski Kart Yapısı)
  const renderMobileContent = () => {
      if (isLoading) return <div className="flex flex-col items-center justify-center h-48 gap-4"><Loader2 className="h-10 w-10 text-cyan-400 animate-spin"/><p className="text-sm font-bold text-cyan-200">İçerik Yükleniyor...</p></div>;

      switch(currentStep) {
          case 1:
            return (
                <div className="grid grid-cols-1 gap-3">
                    {filteredCourses.map((course, idx) => (
                        <SelectionCard key={course.id} title={course.title} subtitle={course.className} icon={course.icon || Book} color={course.color || getGradient(idx)} onClick={() => handleSelectCourse(course)} delay={idx * 50} />
                    ))}
                </div>
            );
          case 2:
            return (
                <div className="grid grid-cols-1 gap-3">
                    <SelectionCard key="all-units" title="Tüm Üniteler (Karma)" icon={Sparkles} color="from-yellow-600 to-amber-500" onClick={() => handleSelectUnit('all', 'Tüm Üniteler')} delay={0} />
                    {units.map((unit, idx) => (
                        <SelectionCard key={unit.id} title={unit.title} icon={Library} color={selection.courseColor} onClick={() => handleSelectUnit(unit.id, unit.title)} delay={(idx + 1) * 50} />
                    ))}
                </div>
            );
          case 3:
            return (
                <div className="grid grid-cols-1 gap-3">
                    <SelectionCard key="all-topics" title="Tüm Konular (Karma)" icon={Sparkles} color="from-yellow-600 to-amber-500" onClick={() => handleSelectTopic('all', 'Tüm Konular')} delay={0} />
                    {topics.map((topic, idx) => (
                        <SelectionCard key={topic.id} title={topic.title} icon={ListTodo} color={selection.courseColor} onClick={() => handleSelectTopic(topic.id, topic.title)} delay={(idx + 1) * 50} />
                    ))}
                </div>
            );
          case 4:
            return (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-2 animate-in zoom-in-95 duration-500">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 rounded-full"></div>
                        <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-3 rounded-2xl shadow-2xl relative z-10 transform rotate-3"><PartyPopper className="h-8 w-8 text-white" /></div>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-wide">Hazır Mısın?</h2>
                        <p className="text-xs text-slate-300 max-w-md mx-auto">İşte seçtiğin görev detayları:</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full max-w-2xl backdrop-blur-md">
                        <div className="grid grid-cols-1 gap-3 text-left">
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">DERS</span><span className="text-sm font-bold text-white truncate text-right">{selection.courseName}</span></div>
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">ÜNİTE</span><span className="text-sm font-bold text-white truncate text-right">{selection.unitName}</span></div>
                            <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">KONU</span><span className="text-sm font-bold text-white truncate text-right">{selection.topicName}</span></div>
                        </div>
                    </div>
                    <Link href={getGameUrl()} className="w-full max-w-md pt-2">
                        <button className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-xl shadow-green-900/30 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3">
                            <Gamepad2 className="h-5 w-5" /> Başla
                        </button>
                    </Link>
                </div>
            );
      }
  }

  // --- ANA RENDER ---
  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 pb-24 md:pb-10 font-sans text-white">
        
        {/* Header (Ortak) */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
            <button onClick={handleBack} className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border-white/10 transition-all group shrink-0">
                <ArrowLeft className="h-5 w-5 md:h-8 md:w-8 text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div className="text-center mx-2 overflow-hidden flex-1">
                <div className="flex items-center justify-center gap-2">
                    <div className="hidden md:block p-2 bg-blue-500/20 rounded-xl"><GameIcon className="h-8 w-8 text-blue-400" /></div>
                    <h1 className="text-lg md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">
                        {gameName}
                    </h1>
                </div>
            </div>
            <div className="w-9 md:w-20 shrink-0"></div>
        </div>

        {/* --- MOBİL GÖRÜNÜM (ESKİ TASARIM) --- */}
        <div className="md:hidden">
            <div className="max-w-4xl mx-auto mb-4 px-1">
                <div className="relative flex justify-between items-center">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                    <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out" style={{ width: `${((currentStep - 1) / 3) * 100}%` }}></div>
                    {steps.map((step) => {
                        const isActive = currentStep >= step.id;
                        const isCurrent = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex flex-col items-center gap-1">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 font-black text-xs shadow-xl", isActive ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-500")}>
                                    {isActive ? <Check className="h-3 w-3" /> : step.id}
                                </div>
                                <span className={cn("text-[9px] font-bold uppercase tracking-wider transition-colors duration-300", isCurrent ? "text-blue-400" : isActive ? "text-white" : "text-slate-600")}>{step.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <GlassCard className="max-w-5xl mx-auto min-h-[calc(100vh-240px)] flex flex-col">
                <div className="p-3 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        {steps.find(s => s.id === currentStep)?.name} Seçimi
                    </h2>
                    {currentStep < 4 && <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{currentStep} / 4</div>}
                </div>
                <div className="flex-grow p-2 overflow-y-auto">
                    {renderMobileContent()}
                </div>
                {currentStep < 4 && (
                    <div className="p-3 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-[10px] font-medium">
                        <span className="truncate mr-4">{currentStep === 1 && "Bir ders seç."}{currentStep === 2 && "Bir ünite seç."}{currentStep === 3 && "Bir konu seç."}</span>
                        <div className="flex gap-1 shrink-0"><div className="h-1 w-1 rounded-full bg-slate-600 animate-bounce"></div><div className="h-1 w-1 rounded-full bg-slate-600 animate-bounce delay-100"></div><div className="h-1 w-1 rounded-full bg-slate-600 animate-bounce delay-200"></div></div>
                    </div>
                )}
            </GlassCard>
        </div>

        {/* --- MASAÜSTÜ GÖRÜNÜM (YENİ SPLIT VIEW TASARIM) --- */}
        <div className="hidden md:flex gap-8 max-w-7xl mx-auto min-h-screen">
            {/* Sidebar */}
            <aside className="w-80 lg:w-96 flex-shrink-0 animate-in slide-in-from-left-4 duration-700">
                 <div className="sticky top-28">
                    <DesktopSelectionSummary />
                    <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                         <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> İpucu</h4>
                         <p className="text-sm text-slate-400 leading-relaxed">Konu seçimini ne kadar daraltırsan, sorular o kadar spesifik olur. Genel tekrar için "Tüm Üniteler" seçeneğini kullanabilirsin.</p>
                    </div>
                 </div>
            </aside>

            {/* Content Area */}
            <section className="flex-grow bg-slate-900/30 rounded-[2.5rem] border border-white/5 p-10 relative overflow-hidden min-h-[600px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
                
                <div className="flex items-center space-x-2 text-base font-medium text-slate-400 mb-6">
                    <span className={cn(currentStep >= 1 ? "text-cyan-400 font-bold" : "")}>Ders</span><ChevronRight className="h-4 w-4" />
                    <span className={cn(currentStep >= 2 ? "text-cyan-400 font-bold" : "")}>Ünite</span><ChevronRight className="h-4 w-4" />
                    <span className={cn(currentStep >= 3 ? "text-cyan-400 font-bold" : "")}>Konu</span><ChevronRight className="h-4 w-4" />
                    <span className={cn(currentStep === 4 ? "text-cyan-400 font-bold" : "")}>Başla</span>
                </div>
                
                {renderDesktopContent()}
            </section>
        </div>

    </div>
  );
}