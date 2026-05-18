'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Map, Lock, CheckCircle2, Play, ArrowRight, ChevronLeft, Loader2, Trophy, BookOpen, Gamepad2, Target, Lightbulb, Puzzle, Search, SortAsc, Link2, Skull, X, Crosshair, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { getStudentCurriculum, getUserTopicProgress, claimTopicRewardAction } from './actions';
import type { Course, Topic, UserProgress } from "@/lib/types";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Confetti from 'react-dom-confetti';

// --- SABİTLER ---
const TOPIC_REWARD = 10000;

// --- YARDIMCI FONKSİYON: FIREBASE VERİSİNİ TEMİZLEME (GÜÇLENDİRİLDİ) ---
const serializeFirebaseData = (data: any): any => {
  if (data === null || data === undefined) return data;
  
  // Eğer objenin toDate fonksiyonu varsa (Aktif Firestore Timestamp objesiyse)
  if (typeof data === 'object' && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  
  // Raw Timestamp formunda ({seconds, nanoseconds}) geldiyse
  if (typeof data === 'object' && 'seconds' in data && 'nanoseconds' in data) {
    return new Date(data.seconds * 1000).toISOString();
  }

  // Standart JS Date objesiyse
  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(serializeFirebaseData);
  }

  if (typeof data === 'object') {
    const newData: any = {};
    Object.keys(data).forEach(key => {
      newData[key] = serializeFirebaseData(data[key]);
    });
    return newData;
  }
  
  return data;
};

// İKONLAR
const TreasureIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 6.8-.7-2.4a2 2 0 0 0-2.4-1.3l-8.2 2.3c-1.1.4-1.8 1.5-1.5 2.6l.6 2.1"/><path d="M5 16a2 2 0 0 1-1.3-2.4l1.4-4.8a2 2 0 0 1 2.4-1.3l12 3.4a2 2 0 0 1 1.3 2.4l-1.4 4.8a2 2 0 0 1-2.4 1.3L5 16z"/><path d="m10 13-1 3.5"/><path d="m13 14 1 3.5"/></svg>
);
const CrosshairIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
);
const MissionBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#020617] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" style={{ opacity: 0.05 }}/>
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
    </div>
);

// --- OYUN LİSTESİ ---
const MISSION_STEPS = [
    { type: 'kelime-avi', label: 'Kelime Avı', desc: 'Gizli kelimeleri bul.', icon: <Search className="w-5 h-5"/>, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    { type: 'eslestirme', label: 'Eşleştirme', desc: 'Kartları eşleştir.', icon: <Puzzle className="w-5 h-5"/>, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
    { type: 'cumle-olusturma', label: 'Cümle Ustası', desc: 'Kelimeleri sırala.', icon: <SortAsc className="w-5 h-5"/>, color: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/10' },
    { type: 'kavram-avi', label: 'Kavram Avı', desc: 'Doğru kavramı vur.', icon: <Target className="w-5 h-5"/>, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
    { type: 'adam-asmaca', label: 'Adam Asmaca', desc: 'Soruların yarısını bil.', icon: <Skull className="w-5 h-5"/>, color: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/10' },
    { type: 'hedefi-vur', label: 'Hedefi Vur', desc: '%50 başarı sağla.', icon: <CrosshairIcon className="w-5 h-5" />, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
    { type: 'ilim-hazinesi', label: 'İlim Hazinesi', desc: 'Tüm sandıkları aç.', icon: <TreasureIcon />, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
    { type: 'bil-bakalim', label: 'Bil Bakalım', desc: 'Tanımları bil.', icon: <Lightbulb className="w-5 h-5"/>, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
    { type: 'dogru-yanlis-zinciri', label: 'D/Y Zinciri', desc: '%70 başarı sağla.', icon: <Link2 className="w-5 h-5"/>, color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
    { type: 'milyoner-yarismasi', label: 'Milyoner', desc: '1000 puanı geç.', icon: <Trophy className="w-5 h-5"/>, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10' },
];

export default function StudentMissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [courses, setCourses] = useState<(Course & { units: any[] })[]>([]);
  const [activeCourse, setActiveCourse] = useState<(Course & { units: any[] }) | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  const [gameData, setGameData] = useState<Record<string, { completed: boolean, score: number }>>({});
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [globalProgress, setGlobalProgress] = useState<UserProgress>({});
  const [isLoading, setIsLoading] = useState(true);

  // --- VERİ ÇEKME FONKSİYONU ---
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
        let classId = null;
        if (user.class) {
            const q = query(collection(db, "classes"), where("name", "==", user.class.split(" - ")[0]));
            const snap = await getDocs(q);
            if (!snap.empty) classId = snap.docs[0].id;
        }

        if (classId) {
            const [coursesDataRaw, progressData] = await Promise.all([
                getStudentCurriculum(classId),
                getUserTopicProgress(user.uid) 
            ]);
            
            const rewardsQuery = query(
                collection(db, 'scoreEvents'),
                where('userId', '==', user.uid),
                where('gameType', '==', 'topic-completion-reward')
            );
            const rewardsSnap = await getDocs(rewardsQuery);
            
            const mergedProgress = { ...(progressData || {}) };

            rewardsSnap.forEach(doc => {
                const data = serializeFirebaseData(doc.data());
                const topicId = data.context; 
                if (topicId) {
                    if (!mergedProgress[topicId]) {
                        mergedProgress[topicId] = { completionCount: 0, completed: false };
                    }
                    mergedProgress[topicId].completed = true;
                    mergedProgress[topicId].completionCount = Math.max(mergedProgress[topicId].completionCount || 0, 1);
                }
            });

            // Gelen veriyi güvenle serileştir
            setCourses(serializeFirebaseData(coursesDataRaw) || []);
            setGlobalProgress(serializeFirebaseData(mergedProgress) || {});
        }
    } catch (e) { 
        console.error("Veri yenileme hatası:", e); 
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
        if(isMounted) {
            setIsLoading(true);
            await refreshData();
            setIsLoading(false);
        }
    }
    init();
    return () => { isMounted = false; };
  }, [refreshData]);

  // KONUYA TIKLAYINCA
  const handleTopicClick = async (topic: Topic) => {
      setSelectedTopic(topic);
      setGameData({}); 
      setRewardClaimed(false);
      setShowConfetti(false);
      
      if (user) {
          try {
            const q = query(
                collection(db, 'scoreEvents'),
                where('userId', '==', user.uid),
                where('context', '==', topic.id),
                where('isMission', '==', true)
            );
            
            const snapshot = await getDocs(q);
            const newData: Record<string, { completed: boolean, score: number }> = {};

            snapshot.docs.forEach(doc => {
                const data = serializeFirebaseData(doc.data());
                const gameType = data.gameType;
                
                const existing = newData[gameType];
                const isCompleted = data.completed === true;
                const points = data.points || 0;

                if (!existing) {
                    newData[gameType] = { completed: isCompleted, score: points };
                } else {
                    if (isCompleted) newData[gameType].completed = true;
                    if (points > existing.score) newData[gameType].score = points;
                }
            });
            setGameData(newData);

            const rewardQuery = query(
                collection(db, 'scoreEvents'),
                where('userId', '==', user.uid),
                where('context', '==', topic.id),
                where('gameType', '==', 'topic-completion-reward')
            );
            const rewardSnap = await getDocs(rewardQuery);
            if (!rewardSnap.empty) {
                setRewardClaimed(true);
                setGlobalProgress(prev => {
                  const safeTopicId = String(topic.id);
                  return {
                    ...prev,
                    [safeTopicId]: {
                        ...(prev[safeTopicId] || {}),
                        completionCount: 1, 
                        completed: true
                    }
                  }
                });
            }

          } catch (e) { console.error(e); }
      }
  }

  const handleStartGame = (gameType: string) => {
    if (!activeCourse || !selectedTopic) return;
    const unit = activeCourse.units.find(u => u.topics.some((t: Topic) => t.id === selectedTopic.id));

    const params = new URLSearchParams({
        classId: user?.class || '',
        className: user?.class || '',
        courseId: activeCourse.id,
        courseName: activeCourse.title,
        unitId: unit?.id || '',
        unitName: unit?.title || '',
        topicId: selectedTopic.id,
        topicName: selectedTopic.title,
        mode: 'mission', 
        threshold: '50' 
    });

    router.push(`/oyunlar/${gameType}/oyun?${params.toString()}`);
  };

  // --- ÖDÜLÜ ALMA ---
  const handleClaimReward = async () => {
      if (!user || !selectedTopic || isClaiming || rewardClaimed) return;

      const allCompleted = MISSION_STEPS.every(s => gameData[s.type]?.completed);
      if (!allCompleted) {
          toast({ title: "Hata", description: "Lütfen önce tüm oyunları tamamlayın.", variant: "destructive" });
          return;
      }

      setIsClaiming(true);
      try {
          const result = await claimTopicRewardAction(
              user.uid, 
              selectedTopic.id, 
              TOPIC_REWARD, 
              selectedTopic.title
          );

          if (result.success) {
              setRewardClaimed(true);
              setShowConfetti(true);
              
              setGlobalProgress(prev => {
                  const safeTopicId = String(selectedTopic.id); 
                  return {
                    ...prev,
                    [safeTopicId]: {
                        ...(prev[safeTopicId] || {}),
                        completionCount: (prev[safeTopicId]?.completionCount || 0) + 1,
                        completed: true
                    }
                  }
              });

              toast({ 
                  title: "Tebrikler! 🎉", 
                  description: `${TOPIC_REWARD.toLocaleString()} XP hesabına eklendi.`,
                  className: "bg-green-600 text-white"
              });
              
              refreshData();
              setTimeout(() => setSelectedTopic(null), 2500);

          } else {
              toast({ title: "Hata", description: result.error || "Ödül alınamadı.", variant: "destructive" });
          }

      } catch (error) {
          console.error("Ödül alma hatası:", error);
          toast({ title: "Hata", description: "Beklenmedik bir hata oluştu.", variant: "destructive" });
      } finally {
          setIsClaiming(false);
      }
  };

  const isTopicCompleted = (topicId: string) => {
    const progress = globalProgress[String(topicId)] || globalProgress[topicId];
    return progress && (progress.completionCount > 0 || progress.completed === true);
  };

  if (isLoading && courses.length === 0) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><Loader2 className="animate-spin h-12 w-12 text-cyan-500"/></div>;

  if (activeCourse) {
    const allTopics = activeCourse.units.flatMap(u => u.topics);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative font-sans">
        <MissionBackground />
        <div className="relative z-10 max-w-6xl mx-auto">
          
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setActiveCourse(null)} className="hover:bg-white/10 text-slate-300">
              <ChevronLeft className="mr-2 h-5 w-5"/> Derslere Dön
            </Button>
            <div className="flex-1">
               <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
                 {activeCourse.title}
               </h2>
            </div>
          </div>

          <div className="space-y-16">
            {activeCourse.units.map((unit) => (
                <div key={unit.id} className="relative">
                    <div className="flex items-center gap-3 mb-8 pl-2">
                        <div className="h-8 w-1.5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"/>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider">{unit.title}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {unit.topics.map((topic: Topic) => {
                            const currentIndex = allTopics.findIndex(t => t.id === topic.id);
                            const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
                            
                            const isPrevCompleted = prevTopic ? isTopicCompleted(prevTopic.id) : false;
                            const isUnlocked = currentIndex === 0 || isPrevCompleted;
                            const isCompleted = isTopicCompleted(topic.id);

                            return (
                                <button 
                                    key={topic.id} 
                                    onClick={() => isUnlocked && handleTopicClick(topic)}
                                    disabled={!isUnlocked}
                                    className={cn(
                                        "group relative text-left h-full transition-all duration-300",
                                        isUnlocked ? "opacity-100 hover:-translate-y-2" : "opacity-60 cursor-not-allowed grayscale"
                                    )}
                                >
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 z-20 bg-slate-950/50 backdrop-blur-[1px] rounded-[1.8rem] flex items-center justify-center border-2 border-slate-800">
                                            <div className="bg-slate-900/90 p-3 rounded-full border border-slate-700 shadow-xl">
                                                <Lock className="w-6 h-6 text-slate-500" />
                                            </div>
                                        </div>
                                    )}

                                    {isUnlocked && <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/40 to-purple-600/40 rounded-[2rem] opacity-0 group-hover:opacity-100 blur transition duration-500" />}
                                    
                                    <Card className={cn(
                                        "relative h-full border-slate-800 transition-all duration-300 rounded-[1.8rem] overflow-hidden flex flex-col",
                                        isUnlocked ? "bg-[#0f172a]/90 backdrop-blur-sm hover:border-indigo-500/50" : "bg-slate-900"
                                    )}>
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Gamepad2 className="w-24 h-24 text-white -rotate-12" />
                                            </div>
                                            
                                            <CardContent className="p-6 flex flex-col h-full relative z-10">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={cn(
                                                        "h-8 px-3 rounded-lg flex items-center justify-center font-bold text-xs transition-colors border",
                                                        isCompleted 
                                                            ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                                            : "bg-slate-800 text-slate-400 border-slate-700"
                                                    )}>
                                                        {isCompleted ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> TAMAMLANDI</span> : `GÖREV ${currentIndex + 1}`}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded text-[10px] font-bold text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                                        <Trophy className="w-3 h-3" /> 
                                                        <span>{TOPIC_REWARD.toLocaleString()} XP</span>
                                                    </div>
                                                </div>
                                                
                                                <h4 className={cn(
                                                    "font-black text-xl mb-3 line-clamp-2 leading-tight transition-colors",
                                                    isUnlocked ? "text-white group-hover:text-indigo-300" : "text-slate-500"
                                                )}>
                                                    {topic.title}
                                                </h4>
                                                
                                                <div className="mt-auto pt-6">
                                                    <div className={cn(
                                                        "w-full h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                                                        isUnlocked 
                                                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg group-hover:shadow-indigo-500/25" 
                                                            : "bg-slate-800 text-slate-600"
                                                    )}>
                                                        {isUnlocked ? (
                                                            <span className="flex items-center gap-2">
                                                                {isCompleted ? "Tekrar Oyna" : "Görevi Başlat"} <Play className="w-3.5 h-3.5 fill-current" />
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <Lock className="w-3.5 h-3.5" /> Kilitli
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                    </Card>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
          </div>
        </div>

        {/* --- OYUN HARİTASI MODALI --- */}
        <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
            <DialogContent className="bg-[#020617]/95 backdrop-blur-xl border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
                <DialogDescription className="sr-only">Görev detayları ve oyun listesi</DialogDescription>
                
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                    <Confetti active={showConfetti} config={{ elementCount: 200, spread: 360, startVelocity: 40 }} />
                </div>

                <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <DialogTitle className="text-2xl font-black flex items-center gap-3 text-white relative z-10">
                        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <Map className="h-6 w-6 text-indigo-400"/>
                        </div>
                        {selectedTopic?.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2 relative z-10">
                        <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
                            <Trophy className="w-3 h-3 mr-1" /> Ödül: {TOPIC_REWARD.toLocaleString()} XP
                        </Badge>
                        <span className="text-slate-400 text-xs font-medium ml-2">Tüm görevleri tamamla!</span>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
                    <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-slate-800 z-0">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent opacity-50" />
                    </div>

                    <div className="space-y-6">
                        {MISSION_STEPS.map((step, index) => {
                            const data = gameData[step.type] || { completed: false, score: 0 };
                            const isPassed = data.completed;
                            let isUnlocked = false;
                            
                            if (index === 0) {
                                isUnlocked = true;
                            } else {
                                const prevStep = MISSION_STEPS[index - 1];
                                const prevData = gameData[prevStep.type] || { completed: false };
                                isUnlocked = prevData.completed;
                            }

                            return (
                                <div key={step.type} className={cn(
                                    "relative z-10 group flex items-center gap-4 p-1 rounded-2xl transition-all duration-300",
                                    isUnlocked ? "opacity-100" : "opacity-50 grayscale pointer-events-none"
                                )}>
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center border-4 shrink-0 shadow-lg transition-transform group-hover:scale-110 z-10 bg-[#020617]",
                                        isPassed ? "border-emerald-500 text-emerald-400 shadow-emerald-500/20" :
                                        isUnlocked ? "border-indigo-500 text-indigo-400 shadow-indigo-500/20 animate-pulse" : 
                                        "border-slate-800 text-slate-600 bg-slate-900"
                                    )}>
                                        {isPassed ? <CheckCircle2 className="h-6 w-6"/> : isUnlocked ? <span className="font-bold text-lg">{index + 1}</span> : <Lock className="h-5 w-5"/>}
                                    </div>

                                    <div className={cn(
                                        "flex-1 flex items-center justify-between p-4 rounded-xl border backdrop-blur-md transition-all",
                                        isPassed ? "bg-emerald-950/20 border-emerald-500/20" :
                                        isUnlocked ? `bg-slate-900/60 ${step.border} shadow-lg hover:bg-slate-800` :
                                        "bg-slate-950 border-slate-800"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-2.5 rounded-xl shadow-inner", step.bg, step.color)}>
                                                {step.icon}
                                            </div>
                                            <div>
                                                <h4 className={cn("font-bold text-sm md:text-base", isPassed ? "text-emerald-400" : "text-slate-200")}>
                                                    {step.label}
                                                </h4>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-xs text-slate-500 font-medium">{step.desc}</p>
                                                    <span className="text-[10px] text-slate-600">
                                                        {isPassed ? "Tamamlandı" : "Görevi Tamamla"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            {data.score > 0 && (
                                                <Badge variant="secondary" className={cn("text-[10px] font-mono", isPassed ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400")}>
                                                    {data.score.toLocaleString()} Puan
                                                </Badge>
                                            )}
                                            
                                            <Button 
                                                size="sm" 
                                                disabled={!isUnlocked}
                                                onClick={() => handleStartGame(step.type)}
                                                className={cn("h-8 px-4 text-xs font-bold rounded-lg transition-all shadow-md", 
                                                isPassed ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30" : 
                                                isUnlocked ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : 
                                                "bg-slate-800 text-slate-500"
                                            )}
                                            >
                                                {isPassed ? "Tekrarla" : isUnlocked ? "Başla" : "Kilitli"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    
                    <div className="mt-8 relative z-10 animate-in slide-in-from-bottom-4 pb-4">
                        <div className={cn(
                            "flex items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all flex-col",
                            MISSION_STEPS.every(s => (gameData[s.type]?.completed)) 
                                ? "border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.1)]" 
                                : "border-slate-800 bg-slate-900/30"
                        )}>
                            <div className={cn("w-16 h-16 mb-3 rounded-full flex items-center justify-center transition-all", 
                                MISSION_STEPS.every(s => (gameData[s.type]?.completed)) ? "bg-yellow-500 text-black animate-bounce shadow-[0_0_20px_rgba(234,179,8,0.5)]" : "bg-slate-800 text-slate-600"
                            )}>
                                <Trophy className="h-8 w-8" />
                            </div>
                            
                            <h4 className={cn("font-black text-lg", MISSION_STEPS.every(s => (gameData[s.type]?.completed)) ? "text-yellow-400" : "text-slate-500")}>
                                BÖLÜM SONU
                            </h4>
                            
                            <p className="text-xs text-slate-500 mt-1 mb-4 text-center">
                                {rewardClaimed 
                                    ? "Bu bölümün ödülünü zaten aldın!" 
                                    : `Tüm görevleri tamamla, ${TOPIC_REWARD.toLocaleString()} XP kazan!`}
                            </p>

                            {MISSION_STEPS.every(s => (gameData[s.type]?.completed)) && (
                                <Button 
                                    onClick={handleClaimReward}
                                    disabled={rewardClaimed || isClaiming}
                                    className={cn(
                                        "w-full h-12 font-bold text-lg shadow-xl transition-all",
                                        rewardClaimed 
                                            ? "bg-green-600/20 text-green-400 border border-green-600/50 cursor-default" 
                                            : "bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black border border-yellow-400"
                                    )}
                                >
                                    {isClaiming ? <Loader2 className="animate-spin" /> : 
                                     rewardClaimed ? <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Ödül Alındı</span> : 
                                     <span className="flex items-center gap-2"><Gift className="w-5 h-5"/> Ödülü Al</span>}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- DERS LİSTESİ ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative overflow-hidden font-sans">
      <MissionBackground />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-16 space-y-6">
          <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full"></div>
              <div className="relative p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl ring-1 ring-indigo-500/50 shadow-2xl">
                <Map className="h-14 w-14 text-indigo-400" />
              </div>
          </div>
          <div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-2xl mb-2">
                GÖREV <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">YOLCULUĞU</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                Bir ders seç, haritayı takip et ve her bölümü tamamlayarak efsanevi ödülleri topla.
              </p>
          </div>
          <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white bg-white/5 backdrop-blur-sm px-6 h-12 rounded-xl">
              <a href="/student"><ChevronLeft className="mr-2 h-4 w-4"/> Panele Dön</a>
          </Button>
        </div>

        {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {courses.map((course) => {
                const totalTopics = course.units.reduce((acc, u) => acc + u.topics.length, 0);
                let completedTopicsInCourse = 0;
                course.units.forEach(u => {
                    u.topics.forEach(t => {
                        if (isTopicCompleted(t.id)) completedTopicsInCourse++;
                    });
                });
                const percent = totalTopics > 0 ? Math.round((completedTopicsInCourse / totalTopics) * 100) : 0;

                return (
                <div 
                    key={course.id} 
                    onClick={() => setActiveCourse(course)}
                    className="group relative cursor-pointer h-full"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
                    <Card className="relative h-full bg-[#0f172a] border-slate-800 group-hover:translate-y-[-6px] transition-transform duration-300 rounded-[2.2rem] overflow-hidden flex flex-col shadow-2xl">
                        <div className="h-40 bg-gradient-to-br from-indigo-900/40 to-slate-900 flex items-center justify-center relative overflow-hidden group-hover:h-36 transition-all duration-300">
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
                            <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/5 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                <BookOpen className="h-12 w-12 text-indigo-300" />
                            </div>
                            <div className="absolute bottom-4 right-4">
                                <Badge className="bg-slate-950/80 backdrop-blur border-slate-700 text-slate-300">
                                    {course.units.length} Ünite
                                </Badge>
                            </div>
                        </div>

                        <div className="p-8 flex-1 flex flex-col">
                            <h3 className="text-3xl font-black text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight mb-6">
                                {course.title}
                            </h3>

                            <div className="mt-auto space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        <span>Tamamlanan</span>
                                        <span>{completedTopicsInCourse}/{totalTopics} Konu</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" 
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white transition-all duration-300 shadow-lg">
                                    Maceraya Başla <ArrowRight className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                )
            })}
            </div>
        ) : (
            <div className="text-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/30 backdrop-blur-sm">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <X className="h-10 w-10 text-slate-500" />
                </div>
                <p className="text-slate-400 text-2xl font-bold">Bu sınıfa ait ders bulunamadı.</p>
                <p className="text-slate-500 mt-2">Öğretmeniniz henüz içerik eklememiş olabilir.</p>
            </div>
        )}
      </div>
    </div>
  );
}