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

// Type Definitions
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
      autoStart: 'true' // <-- BU PARAMETRE OYUNUN DİREKT BAŞLAMASINI SAĞLAR
    });
    if(isGame) {
      return `/oyunlar/${gamePath}/oyun?${params.toString()}`;
    } else {
      return `/student/${gamePath}/${selection.courseId}/${selection.unitId}/${selection.topicId}`;
    }
  }

  // --- MASAÜSTÜ İÇİN YENİ TASARIM BİLEŞENLERİ ---

  const StepIndicator = () => (
      <div className="flex items-center space-x-2 text-sm md:text-base font-medium text-slate-400 mb-6">
          <span className={cn(currentStep >= 1 ? "text-cyan-400 font-bold" : "")}>Ders</span>
          <ChevronRight className="h-4 w-4" />
          <span className={cn(currentStep >= 2 ? "text-cyan-400 font-bold" : "")}>Ünite</span>
          <ChevronRight className="h-4 w-4" />
          <span className={cn(currentStep >= 3 ? "text-cyan-400 font-bold" : "")}>Konu</span>
          <ChevronRight className="h-4 w-4" />
          <span className={cn(currentStep === 4 ? "text-cyan-400 font-bold" : "")}>Başla</span>
      </div>
  );

  const SelectionSummary = () => (
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

  const renderContent = () => {
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <Loader2 className="h-16 w-16 text-cyan-500 animate-spin mb-4"/>
            <p className="text-slate-400 animate-pulse">Veriler yükleniyor...</p>
        </div>
    );

    switch(currentStep) {
        case 1: // DERS SEÇİMİ
            return (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-2">Ders Seç</h2>
                    <p className="text-slate-400 mb-8">Hangi ders için etkinlik yapmak istersin?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCourses.map((course, idx) => (
                            <button 
                                key={course.id}
                                onClick={() => handleSelectCourse(course)}
                                className="group relative flex flex-col items-start p-6 rounded-3xl border border-white/5 hover:border-white/20 bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl overflow-hidden text-left"
                            >
                                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br transition-opacity duration-500", course.color)}></div>
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br shadow-inner", course.color)}>
                                     {React.createElement(course.icon || Book, { className: "h-6 w-6 text-white" })}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{course.title}</h3>
                                <p className="text-sm text-slate-400 font-medium bg-white/5 px-2 py-0.5 rounded-full">{course.className}</p>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 2: // ÜNİTE SEÇİMİ
            return (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-2">Ünite Seç</h2>
                    <p className="text-slate-400 mb-8">{selection.courseName} dersi için bir ünite seç.</p>
                    <div className="space-y-3">
                        <button 
                            onClick={() => handleSelectUnit('all', 'Tüm Üniteler')}
                            className="w-full flex items-center p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-200 transition-all group"
                        >
                            <Sparkles className="h-6 w-6 mr-4 group-hover:rotate-12 transition-transform" />
                            <span className="font-bold text-lg">Karışık (Tüm Üniteler)</span>
                            <ArrowRight className="ml-auto h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                        </button>
                        {units.map((unit, idx) => (
                            <button 
                                key={unit.id}
                                onClick={() => handleSelectUnit(unit.id, unit.title)}
                                className="w-full flex items-center p-4 rounded-2xl border border-white/5 bg-slate-800/30 hover:bg-slate-700/50 hover:border-white/10 text-left transition-all group"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br text-white shadow-sm font-bold text-sm", selection.courseColor)}>
                                    {idx + 1}
                                </div>
                                <span className="font-medium text-slate-200 group-hover:text-white text-lg">{unit.title}</span>
                                <ArrowRight className="ml-auto h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all"/>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 3: // KONU SEÇİMİ
            return (
                 <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <h2 className="text-3xl font-bold text-white mb-2">Konu Seç</h2>
                    <p className="text-slate-400 mb-8">{selection.unitName} ünitesi için konu belirle.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                             onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                             className="flex flex-col p-6 rounded-3xl border border-dashed border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-200 transition-all group hover:scale-[1.02]"
                        >
                            <Sparkles className="h-8 w-8 mb-4 group-hover:animate-pulse" />
                            <span className="font-bold text-xl">Tüm Konular</span>
                            <span className="text-sm opacity-60 mt-1">Bu ünitedeki her şeyden sorumlu ol.</span>
                        </button>
                        {topics.map((topic, idx) => (
                            <button 
                                key={topic.id}
                                onClick={() => handleSelectTopic(topic.id, topic.title)}
                                className="flex flex-col p-6 rounded-3xl border border-white/5 bg-slate-800/30 hover:bg-slate-700/50 hover:border-white/10 text-left transition-all hover:scale-[1.02] group"
                            >
                                <ListTodo className={cn("h-8 w-8 mb-4 opacity-50 group-hover:opacity-100 group-hover:text-cyan-400 transition-all")} />
                                <span className="font-bold text-xl text-slate-200 group-hover:text-white mb-1">{topic.title}</span>
                                <span className="text-sm text-slate-500">Konu #{idx + 1}</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        case 4: // BAŞLAT
            return (
                <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500 text-center py-10">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 rounded-[2rem] shadow-2xl relative z-10 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Gamepad2 className="h-24 w-24 text-white" />
                        </div>
                    </div>
                    
                    <h2 className="text-5xl font-black text-white mb-4 tracking-tight">Hazır Mısın?</h2>
                    <p className="text-xl text-slate-400 mb-10 max-w-lg">
                        Seçimlerini tamamladın. Şimdi <span className="text-green-400 font-bold">{selection.topicName}</span> konusunda kendini test etme zamanı.
                    </p>

                    <Link href={getGameUrl()} className="w-full max-w-md group">
                        <button className="relative w-full py-6 bg-white text-black font-black text-2xl uppercase tracking-widest rounded-2xl overflow-hidden hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                BAŞLA <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform"/>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="absolute inset-0 z-10 flex items-center justify-center gap-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                BAŞLA <ArrowRight className="h-6 w-6"/>
                            </span>
                        </button>
                    </Link>
                </div>
            );
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-cyan-500/30">
        
        {/* Header Navigation */}
        <header className="fixed top-0 left-0 w-full z-50 bg-[#0f172a]/80 backdrop-blur-lg border-b border-white/5 h-20 flex items-center">
            <div className="max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
                <button 
                    onClick={handleBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group px-4 py-2 rounded-full hover:bg-white/5"
                >
                    <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform"/>
                    <span className="font-bold">Geri Dön</span>
                </button>

                <div className="hidden md:flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-white/5">
                    <GameIcon className="h-5 w-5 text-cyan-400" />
                    <span className="font-bold text-slate-200">{gameName}</span>
                </div>

                <div className="w-24"></div> {/* Spacer for center alignment */}
            </div>
        </header>

        {/* Main Layout */}
        <main className="pt-28 pb-10 px-4 md:px-8 max-w-7xl mx-auto min-h-screen flex flex-col md:flex-row gap-8">
            
            {/* Sidebar (Desktop) / Top Summary (Mobile) */}
            <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 animate-in slide-in-from-left-4 duration-700">
                 <div className="sticky top-28">
                    <SelectionSummary />
                    
                    <div className="mt-8 hidden md:block p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                         <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2">
                             <Sparkles className="h-4 w-4" /> İpucu
                         </h4>
                         <p className="text-sm text-slate-400 leading-relaxed">
                             Konu seçimini ne kadar daraltırsan, sorular o kadar spesifik olur. Genel tekrar için "Tüm Üniteler" seçeneğini kullanabilirsin.
                         </p>
                    </div>
                 </div>
            </aside>

            {/* Content Area */}
            <section className="flex-grow bg-slate-900/30 rounded-[2.5rem] border border-white/5 p-6 md:p-10 relative overflow-hidden min-h-[600px]">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
                
                <StepIndicator />
                
                {renderContent()}

            </section>

        </main>
    </div>
  );
}