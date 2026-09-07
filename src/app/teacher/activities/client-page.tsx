"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Gamepad2, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, MousePointerClick, Trophy, Link2, Pencil, BookOpen, Coins, 
  ClipboardCheck, Wind, Star, Milestone, Lock, Rocket, Target, 
  Grid3x3, Swords, Castle, Users, Check, ChevronRight, 
  ChevronLeft, Sparkles, X, Play,
  FolderOpen, Compass
} from 'lucide-react';
import type { EnrichedClass } from './actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// --- AKTİVİTE VE OYUN TANIMLARI (26 ADET ETKİNLİK) ---
export interface ActivityGame {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
  isTeam?: boolean;
  description: string;
}

const activityTypes: ActivityGame[] = [
  { href: '/oyunlar/milyoner-yarismasi', label: 'Kim 1000 Puan İster?', icon: Trophy, color: 'purple', badge: 'POPÜLER', description: 'Klasik bilgi yarışması formatı' },
  { href: '/oyunlar/yazi-tura', label: 'Gol Kralı (Yazı Tura)', icon: Coins, color: 'amber', badge: 'YENİ', description: 'Şans ve bilgi mücadelesi' },
  { href: '/oyunlar/carkifelek', label: 'Çarkıfelek', icon: Star, color: 'fuchsia', badge: 'YENİ', isTeam: true, description: 'Çarkı çevir, puanları topla' },
  { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması', icon: Sparkles, color: 'pink', isTeam: true, description: 'Gruplar arası kavram düellosu' },
  { href: '/oyunlar/kutu-ac', label: 'Kutu Aç', icon: FolderOpen, color: 'indigo', isTeam: true, description: 'Şanslı kutuyu seç, soruyu yanıtla' },
  { href: '/oyunlar/siber-sifre-kirici', label: 'Siber Şifre Kırıcı', icon: Lock, color: 'emerald', badge: 'YENİ', description: 'Gizli şifreyi çöz' },
  { href: '/oyunlar/uzay-savunmasi', label: 'Uzay Savunması', icon: Rocket, color: 'blue', badge: 'YENİ', isTeam: true, description: 'Uzay gemini savun' },
  { href: '/oyunlar/fetih-oyunu', label: 'Fetih Oyunu', icon: Castle, color: 'orange', badge: 'YENİ', isTeam: true, description: 'Bölgeleri fethet, kaleyi ele geçir' },
  { href: '/oyunlar/tirmanma-yarisi', label: 'Tırmanma Yarışı', icon: Swords, color: 'lime', badge: 'YENİ', isTeam: true, description: 'Zirveye ilk ulaşan takım kazanır' },
  { href: '/oyunlar/tornado', label: 'Tornado', icon: Wind, color: 'cyan', isTeam: true, description: 'Hızlı tempolu soru fırtınası' },
  { href: '/oyunlar/anagram-duvari', label: 'Anagram Duvarı', icon: Grid3x3, color: 'violet', badge: 'YENİ', isTeam: true, description: 'Harfleri çöz, duvarı aş' },
  { href: '/oyunlar/kelime-avi', label: 'Kelime Avı', icon: Search, color: 'teal', description: 'Tablodaki gizli kavramları bul' },
  { href: '/oyunlar/kavram-avi', label: 'Kavram Avı', icon: Crosshair, color: 'cyan', description: 'Uçan doğru kavramları hedef al' },
  { href: '/oyunlar/eslestirme', label: 'Eşleştirme', icon: Puzzle, color: 'blue', description: 'Kavramları tanımlarla eşleştir' },
  { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle, color: 'orange', description: 'Karışık sözcüklerden cümle kur' },
  { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca', icon: Skull, color: 'rose', description: 'Kelimeleri tahmin et' },
  { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, color: 'emerald', description: 'Kartları çevir, eşleri yakala' },
  { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, color: 'red', description: 'Doğru şıkka isabetli atış yap' },
  { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, color: 'yellow', description: 'İpuçlarından kavramı çıkar' },
  { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, color: 'green', description: 'Kesintisiz doğru cevap serisi' },
  { href: '/oyunlar/dogru-yol-kosucusu', label: 'Doğru Yol Koşucusu', icon: Milestone, color: 'blue', description: 'Engelleri aş, doğru yolda kal' },
  { href: '/oyunlar/balon-avcisi', label: 'Balon Avcısı', icon: Target, color: 'sky', description: 'Doğru balonları patlat' },
  { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, color: 'slate', description: 'Klasik açık uçlu değerlendirme' },
  { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi', icon: BookOpen, color: 'violet', description: 'Bilgi sandığını aç' },
  { href: '/oyunlar/labirent', label: 'Labirent', icon: Puzzle, color: 'zinc', description: 'Soruları bilerek labirenti tamamla' },
  { href: '/oyunlar/soru-coz', label: 'Soru Çöz', icon: ClipboardCheck, color: 'indigo', description: 'Test sorularıyla pekiştir' },
];

const colorStyles: Record<string, { bg: string; border: string; glow: string; text: string; iconBg: string }> = {
  purple:  { bg: "from-purple-600 to-indigo-700", border: "border-purple-400/40 hover:border-purple-300", glow: "shadow-purple-500/25", text: "text-purple-300", iconBg: "bg-purple-500/20 text-purple-200" },
  amber:   { bg: "from-amber-500 to-orange-600", border: "border-amber-400/40 hover:border-amber-300", glow: "shadow-amber-500/25", text: "text-amber-300", iconBg: "bg-amber-500/20 text-amber-200" },
  fuchsia: { bg: "from-fuchsia-600 to-pink-600", border: "border-fuchsia-400/40 hover:border-fuchsia-300", glow: "shadow-fuchsia-500/25", text: "text-fuchsia-300", iconBg: "bg-fuchsia-500/20 text-fuchsia-200" },
  pink:    { bg: "from-pink-600 to-rose-600", border: "border-pink-400/40 hover:border-pink-300", glow: "shadow-pink-500/25", text: "text-pink-300", iconBg: "bg-pink-500/20 text-pink-200" },
  indigo:  { bg: "from-indigo-600 to-blue-700", border: "border-indigo-400/40 hover:border-indigo-300", glow: "shadow-indigo-500/25", text: "text-indigo-300", iconBg: "bg-indigo-500/20 text-indigo-200" },
  emerald: { bg: "from-emerald-600 to-teal-700", border: "border-emerald-400/40 hover:border-emerald-300", glow: "shadow-emerald-500/25", text: "text-emerald-300", iconBg: "bg-emerald-500/20 text-emerald-200" },
  blue:    { bg: "from-blue-600 to-cyan-700", border: "border-blue-400/40 hover:border-blue-300", glow: "shadow-blue-500/25", text: "text-blue-300", iconBg: "bg-blue-500/20 text-blue-200" },
  orange:  { bg: "from-orange-600 to-red-600", border: "border-orange-400/40 hover:border-orange-300", glow: "shadow-orange-500/25", text: "text-orange-300", iconBg: "bg-orange-500/20 text-orange-200" },
  lime:    { bg: "from-lime-600 to-emerald-700", border: "border-lime-400/40 hover:border-lime-300", glow: "shadow-lime-500/25", text: "text-lime-300", iconBg: "bg-lime-500/20 text-lime-200" },
  cyan:    { bg: "from-cyan-600 to-blue-600", border: "border-cyan-400/40 hover:border-cyan-300", glow: "shadow-cyan-500/25", text: "text-cyan-300", iconBg: "bg-cyan-500/20 text-cyan-200" },
  violet:  { bg: "from-violet-600 to-purple-700", border: "border-violet-400/40 hover:border-violet-300", glow: "shadow-violet-500/25", text: "text-violet-300", iconBg: "bg-violet-500/20 text-violet-200" },
  teal:    { bg: "from-teal-600 to-emerald-700", border: "border-teal-400/40 hover:border-teal-300", glow: "shadow-teal-500/25", text: "text-teal-300", iconBg: "bg-teal-500/20 text-teal-200" },
  rose:    { bg: "from-rose-600 to-red-700", border: "border-rose-400/40 hover:border-rose-300", glow: "shadow-rose-500/25", text: "text-rose-300", iconBg: "bg-rose-500/20 text-rose-200" },
  red:     { bg: "from-red-600 to-rose-700", border: "border-red-400/40 hover:border-red-300", glow: "shadow-red-500/25", text: "text-red-300", iconBg: "bg-red-500/20 text-red-200" },
  yellow:  { bg: "from-amber-600 to-yellow-600", border: "border-amber-400/40 hover:border-amber-300", glow: "shadow-amber-500/25", text: "text-yellow-300", iconBg: "bg-amber-500/20 text-yellow-200" },
  green:   { bg: "from-green-600 to-emerald-700", border: "border-green-400/40 hover:border-green-300", glow: "shadow-green-500/25", text: "text-green-300", iconBg: "bg-green-500/20 text-green-200" },
  sky:     { bg: "from-sky-600 to-blue-600", border: "border-sky-400/40 hover:border-sky-300", glow: "shadow-sky-500/25", text: "text-sky-300", iconBg: "bg-sky-500/20 text-sky-200" },
  slate:   { bg: "from-slate-700 to-slate-800", border: "border-slate-500/40 hover:border-slate-400", glow: "shadow-slate-500/25", text: "text-slate-300", iconBg: "bg-slate-500/20 text-slate-200" },
  zinc:    { bg: "from-zinc-700 to-neutral-800", border: "border-zinc-500/40 hover:border-zinc-400", glow: "shadow-zinc-500/25", text: "text-zinc-300", iconBg: "bg-zinc-500/20 text-zinc-200" },
};

// --- DÜZLEŞTİRİLMİŞ MÜFREDAT NESNESİ ---
export interface FlatTopicItem {
  classId: string;
  className: string;
  grade: string;
  courseId: string;
  courseTitle: string;
  unitId: string;
  unitTitle: string;
  topicId: string;
  topicTitle: string;
}

export function ActivitiesClientPage({ data }: { data: EnrichedClass[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Tüm konuları düz bir liste olarak hazırla (hızlı arama ve sıralama için)
  const allFlatTopics = useMemo<FlatTopicItem[]>(() => {
    const list: FlatTopicItem[] = [];
    data.forEach(schoolClass => {
      const grade = (schoolClass as any).grade || schoolClass.name.replace(/[^0-9]/g, '');
      (schoolClass.courses || []).forEach(course => {
        (course.units || []).forEach(unit => {
          (unit.topics || []).forEach(topic => {
            list.push({
              classId: schoolClass.id,
              className: schoolClass.name,
              grade,
              courseId: course.id,
              courseTitle: course.title,
              unitId: unit.id,
              unitTitle: unit.title,
              topicId: topic.id,
              topicTitle: topic.title,
            });
          });
        });
      });
    });
    return list;
  }, [data]);

  // 2. Seçili konu state'i
  const [selectedTopic, setSelectedTopic] = useState<FlatTopicItem | null>(() => {
    const classIdParam = searchParams.get('classId');
    const courseIdParam = searchParams.get('courseId');
    const unitIdParam = searchParams.get('unitId');
    const topicIdParam = searchParams.get('topicId');

    if (topicIdParam && allFlatTopics.length > 0) {
      const found = allFlatTopics.find(t => 
        t.topicId === topicIdParam && 
        (!unitIdParam || t.unitId === unitIdParam)
      );
      if (found) return found;
    }

    if (unitIdParam && allFlatTopics.length > 0) {
      const found = allFlatTopics.find(t => t.unitId === unitIdParam);
      if (found) return found;
    }

    if (courseIdParam && allFlatTopics.length > 0) {
      const found = allFlatTopics.find(t => t.courseId === courseIdParam);
      if (found) return found;
    }

    return allFlatTopics.length > 0 ? allFlatTopics[0] : null;
  });

  // Ünite geneli modu (topicId=all)
  const [isUnitLevel, setIsUnitLevel] = useState<boolean>(() => {
    return searchParams.get('topicId') === 'all';
  });

  // Modal ve arama state'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal içindeki sekmeli gezinti state'leri
  const [browseClassId, setBrowseClassId] = useState<string>(() => {
    return selectedTopic?.classId || (data.length > 0 ? data[0].id : "");
  });

  const selectedBrowseClass = useMemo(() => {
    return data.find(c => c.id === browseClassId) || data[0] || null;
  }, [data, browseClassId]);

  const [browseCourseId, setBrowseCourseId] = useState<string>(() => {
    if (selectedTopic && selectedTopic.classId === browseClassId) {
      return selectedTopic.courseId;
    }
    return selectedBrowseClass?.courses[0]?.id || "";
  });

  // Seçili sınıf değiştiğinde varsayılan dersi güncelle
  useEffect(() => {
    if (selectedBrowseClass && selectedBrowseClass.courses.length > 0) {
      const exists = selectedBrowseClass.courses.some(c => c.id === browseCourseId);
      if (!exists) {
        setBrowseCourseId(selectedBrowseClass.courses[0].id);
      }
    }
  }, [selectedBrowseClass, browseCourseId]);

  // Modal açıldığında arama kutusuna odaklan
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  // Filtrelenmiş arama sonuçları (Canlı Arama)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return [];
    return allFlatTopics.filter(item => {
      const combined = `${item.className} ${item.courseTitle} ${item.unitTitle} ${item.topicTitle}`.toLocaleLowerCase('tr-TR');
      return combined.includes(q);
    });
  }, [allFlatTopics, searchQuery]);

  // URL'yi senkronize et
  const syncUrlWithTopic = useCallback((topic: FlatTopicItem, unitAll: boolean) => {
    const params = new URLSearchParams();
    params.set('classId', topic.classId);
    params.set('courseId', topic.courseId);
    params.set('unitId', topic.unitId);
    params.set('topicId', unitAll ? 'all' : topic.topicId);
    params.set('courseName', topic.courseTitle);
    params.set('unitName', topic.unitTitle);
    params.set('topicName', unitAll ? 'Tüm Konular' : topic.topicTitle);
    
    // Tarayıcı geçmişini temiz güncelle
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, []);

  // Konu seçme fonksiyonu
  const handleSelectTopic = (topic: FlatTopicItem, unitAll: boolean = false) => {
    setSelectedTopic(topic);
    setIsUnitLevel(unitAll);
    setIsModalOpen(false);
    setSearchQuery("");
    syncUrlWithTopic(topic, unitAll);
  };

  // Sıralı gezinme (Önceki / Sonraki Konu)
  const currentTopicIndex = useMemo(() => {
    if (!selectedTopic) return -1;
    return allFlatTopics.findIndex(t => 
      t.courseId === selectedTopic.courseId && 
      t.unitId === selectedTopic.unitId && 
      t.topicId === selectedTopic.topicId
    );
  }, [allFlatTopics, selectedTopic]);

  const prevTopic = currentTopicIndex > 0 ? allFlatTopics[currentTopicIndex - 1] : null;
  const nextTopic = currentTopicIndex >= 0 && currentTopicIndex < allFlatTopics.length - 1 ? allFlatTopics[currentTopicIndex + 1] : null;

  const handlePrevTopic = () => {
    if (prevTopic) {
      handleSelectTopic(prevTopic, false);
    }
  };

  const handleNextTopic = () => {
    if (nextTopic) {
      handleSelectTopic(nextTopic, false);
    }
  };

  // Oyun filtresi (Tümü / Takım / Bireysel) ve oyun içi arama
  const [gameCategory, setGameCategory] = useState<'all' | 'team' | 'solo'>('all');
  const [gameFilterQuery, setGameFilterQuery] = useState("");

  const filteredGames = useMemo(() => {
    return activityTypes.filter(game => {
      if (gameCategory === 'team' && !game.isTeam) return false;
      if (gameCategory === 'solo' && game.isTeam) return false;
      if (gameFilterQuery.trim()) {
        const q = gameFilterQuery.toLocaleLowerCase('tr-TR');
        return game.label.toLocaleLowerCase('tr-TR').includes(q) || game.description.toLocaleLowerCase('tr-TR').includes(q);
      }
      return true;
    });
  }, [gameCategory, gameFilterQuery]);

  // Oyun URL'si oluşturucu
  const buildGameUrl = (activity: ActivityGame) => {
    if (!selectedTopic) return '#';
    const topicIdVal = isUnitLevel ? 'all' : selectedTopic.topicId;
    const topicNameVal = isUnitLevel ? 'Tüm Konular' : selectedTopic.topicTitle;

    const params = new URLSearchParams({
      classId: selectedTopic.classId || '',
      courseId: selectedTopic.courseId || '',
      unitId: selectedTopic.unitId || '',
      topicId: topicIdVal,
      courseName: selectedTopic.courseTitle || '',
      unitName: selectedTopic.unitTitle || '',
      topicName: topicNameVal,
      isStatic: 'false'
    });

    return `${activity.href}/oyun?${params.toString()}`;
  };

  // Seçili dersteki üniteler
  const activeCourseData = useMemo(() => {
    return selectedBrowseClass?.courses.find(c => c.id === browseCourseId) || selectedBrowseClass?.courses[0] || null;
  }, [selectedBrowseClass, browseCourseId]);

  return (
    <div className="min-h-screen pb-16 bg-slate-50/60 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      
      {/* --- ÜST BAŞLIK VE HIZLI KONTROL MERKEZİ --- */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            
            {/* Sayfa Logosu ve Başlık */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Öğretmen Etkinlik Merkezi
                  </h1>
                  <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    26 Oyun
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sınıfta akıllı tahtada veya bireysel kullanımda tek tıkla oyunu başlatın.
                </p>
              </div>
            </div>

            {/* Konu Değiştir Butonu & Hızlı Navigasyon */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevTopic}
                  disabled={!prevTopic}
                  className="h-9 px-2.5 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-semibold gap-1"
                  title={prevTopic ? `Önceki: ${prevTopic.topicTitle}` : 'İlk konu'}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Önceki</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextTopic}
                  disabled={!nextTopic}
                  className="h-9 px-2.5 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-semibold gap-1"
                  title={nextTopic ? `Sonraki: ${nextTopic.topicTitle}` : 'Son konu'}
                >
                  <span className="hidden sm:inline">Sonraki</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Ana Seçim Penceresini Açan Buton */}
              <Button
                onClick={() => setIsModalOpen(true)}
                className="h-9 sm:h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                <span>Konu / Ünite Değiştir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-6">

        {/* --- AKTİF SEÇİLEN KONU KARTI (HERO BANNER) --- */}
        {selectedTopic ? (
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/50 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-indigo-950/40 p-5 md:p-6 shadow-xl mb-8 backdrop-blur-md">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-3xl">
                
                {/* Hiyerarşik Rozetler */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Badge className="bg-indigo-600 text-white text-xs font-black px-2.5 py-0.5 shadow-xs">
                    {selectedTopic.className}
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <Badge variant="outline" className="bg-white/80 dark:bg-slate-800 text-xs font-bold border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300">
                    {selectedTopic.courseTitle}
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <Badge variant="outline" className="bg-white/80 dark:bg-slate-800 text-xs font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 truncate max-w-[280px]">
                    {selectedTopic.unitTitle}
                  </Badge>
                </div>

                {/* Konu Başlığı */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {isUnitLevel ? (
                    <span className="flex items-center gap-2">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-300">
                        {selectedTopic.unitTitle}
                      </span>
                      <span className="text-sm font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30">
                        Tüm Ünite Etkinlikleri
                      </span>
                    </span>
                  ) : (
                    selectedTopic.topicTitle
                  )}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Aşağıdaki etkinliklerden dilediğinize tıklayarak bu konunun sorularıyla doğrudan oyunu başlatabilirsiniz.</span>
                </p>
              </div>

              {/* Konu vs Tüm Ünite Seçim Düğmeleri */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 bg-white/70 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
                <Button
                  size="sm"
                  variant={!isUnitLevel ? "default" : "ghost"}
                  onClick={() => {
                    setIsUnitLevel(false);
                    syncUrlWithTopic(selectedTopic, false);
                  }}
                  className={cn(
                    "rounded-xl font-bold text-xs h-9 transition-all",
                    !isUnitLevel 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Target className="w-3.5 h-3.5 mr-1.5" />
                  Bu Konu ({selectedTopic.topicTitle.length > 18 ? selectedTopic.topicTitle.substring(0, 18) + '...' : selectedTopic.topicTitle})
                </Button>

                <Button
                  size="sm"
                  variant={isUnitLevel ? "default" : "ghost"}
                  onClick={() => {
                    setIsUnitLevel(true);
                    syncUrlWithTopic(selectedTopic, true);
                  }}
                  className={cn(
                    "rounded-xl font-bold text-xs h-9 transition-all",
                    isUnitLevel 
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  Tüm Ünite (Genel)
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center my-8">
            <Compass className="w-12 h-12 mx-auto text-slate-400 mb-3 animate-spin-slow" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-1">Müfredattan Bir Konu Seçin</h3>
            <p className="text-sm text-slate-500 mb-4">Etkinlikleri görüntülemek için sınıf, ders ve konuyu belirleyin.</p>
            <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Konu Seç
            </Button>
          </div>
        )}

        {/* --- OYUN FİLTRE VE ARAMA ÇUBUĞU --- */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-xl border border-slate-300/60 dark:border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setGameCategory('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                gameCategory === 'all'
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <span>Tüm Oyunlar</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black">
                {activityTypes.length}
              </span>
            </button>

            <button
              onClick={() => setGameCategory('team')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                gameCategory === 'team'
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Takım Oyunları</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-black">
                {activityTypes.filter(g => g.isTeam).length}
              </span>
            </button>

            <button
              onClick={() => setGameCategory('solo')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                gameCategory === 'solo'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Bireysel Oyunlar</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-black">
                {activityTypes.filter(g => !g.isTeam).length}
              </span>
            </button>
          </div>

          {/* Hızlı Oyun Arama */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={gameFilterQuery}
              onChange={(e) => setGameFilterQuery(e.target.value)}
              placeholder="Oyun adı ara..."
              className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
            {gameFilterQuery && (
              <button 
                onClick={() => setGameFilterQuery("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* --- 26 ADET OYUN KARTLARI VİTRİNİ --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredGames.map((activity) => {
            const Icon = activity.icon;
            const style = colorStyles[activity.color] || colorStyles.indigo;
            const gameUrl = buildGameUrl(activity);

            return (
              <Link
                key={activity.href}
                href={gameUrl}
                className={cn(
                  "group relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 flex flex-col justify-between p-5 bg-gradient-to-br text-white shadow-lg",
                  style.bg,
                  style.border,
                  style.glow
                )}
              >
                {/* Arka plan dekoratif icon */}
                <Icon className="w-32 h-32 absolute -right-6 -bottom-6 text-white/10 group-hover:text-white/15 transition-all duration-500 group-hover:scale-110 pointer-events-none" />

                {/* Kart Üst Kısım: İkon ve Rozetler */}
                <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md border border-white/20", style.iconBg)}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {activity.isTeam && (
                      <span className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Users className="w-3 h-3" /> TAKIM
                      </span>
                    )}
                    {activity.badge && (
                      <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {activity.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Kart Orta Kısım: Başlık ve Açıklama */}
                <div className="relative z-10 mb-4">
                  <h3 className="font-black text-lg sm:text-xl text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors drop-shadow-xs">
                    {activity.label}
                  </h3>
                  <p className="text-xs text-white/80 font-medium line-clamp-2 mt-1">
                    {activity.description}
                  </p>
                </div>

                {/* Kart Alt Kısım: Başlat Butonu */}
                <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold">
                  <span className="text-white/90 group-hover:text-white transition-colors">
                    {activity.isTeam ? "Sınıf Düellosu" : "Bireysel Mod"}
                  </span>
                  <div className="flex items-center gap-1 bg-white text-slate-900 group-hover:bg-amber-300 transition-all px-3 py-1 rounded-full text-[11px] font-black shadow-sm">
                    <span>BAŞLAT</span>
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-16">
            <Gamepad2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-bold">Aramanıza uygun oyun bulunamadı.</p>
            <Button variant="outline" size="sm" onClick={() => { setGameCategory('all'); setGameFilterQuery(""); }} className="mt-3">
              Filtreleri Temizle
            </Button>
          </div>
        )}
      </div>

      {/* --- MÜFREDAT SEÇİM MODALI (MODERN DIALOG) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
          
          {/* Modal Header */}
          <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Ders, Ünite ve Konu Seçimi
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Aşağıdaki arama çubuğundan konuyu anında bulun veya sınıf sekmelerinden seçin.
                </DialogDescription>
              </div>
            </div>

            {/* Canlı Arama Çubuğu */}
            <div className="relative mt-4">
              <Search className="w-5 h-5 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu, ünite veya kavram ara... (örn: Med Çeşitleri, Zekat, Kader, Tevekkül)"
                className="pl-11 pr-10 h-12 text-sm sm:text-base rounded-2xl bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 shadow-inner focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Modal İçerik Alanı */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">

            {/* DURUM 1: ARAMA MODU (Kullanıcı arama kutusuna yazı yazdığında) */}
            {searchQuery.trim().length > 0 ? (
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="mb-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Arama Sonuçları ({searchResults.length} Konu Bulundu)</span>
                  <span className="text-[11px] text-indigo-500 font-semibold">Tıklayarak konuyu seçin</span>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((item) => {
                      const isCurrent = selectedTopic?.topicId === item.topicId && selectedTopic?.unitId === item.unitId;
                      return (
                        <button
                          key={`${item.classId}-${item.courseId}-${item.unitId}-${item.topicId}`}
                          onClick={() => handleSelectTopic(item, false)}
                          className={cn(
                            "w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 group",
                            isCurrent
                              ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <Badge variant="outline" className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                {item.className}
                              </Badge>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {item.courseTitle}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-xs text-slate-500 dark:text-slate-500 truncate max-w-[250px]">
                                {item.unitTitle}
                              </span>
                            </div>
                            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.topicTitle}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isCurrent && (
                              <span className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                                <Check className="w-3.5 h-3.5" /> Seçili
                              </span>
                            )}
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      "{searchQuery}" için sonuç bulunamadı
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Farklı bir anahtar kelime deneyin veya arama çubuğunu temizleyin.
                    </p>
                  </div>
                )}
              </ScrollArea>
            ) : (

              // DURUM 2: SEKME VE KATEGORİ MODU (Arama yapılmadığında sınıf ve dersler arası gezinti)
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* 1. Sınıf Sekmeleri (5, 6, 7, 8) */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 px-4 sm:px-6 pt-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 custom-scrollbar">
                    {data.map((schoolClass) => {
                      const isSelected = schoolClass.id === browseClassId;
                      return (
                        <button
                          key={schoolClass.id}
                          onClick={() => {
                            setBrowseClassId(schoolClass.id);
                            if (schoolClass.courses.length > 0) {
                              setBrowseCourseId(schoolClass.courses[0].id);
                            }
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 shadow-xs",
                            isSelected
                              ? "bg-indigo-600 text-white shadow-indigo-600/30"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          )}
                        >
                          <span>{schoolClass.name}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                          )}>
                            {schoolClass.courses.length} Ders
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Ders Butonları */}
                {selectedBrowseClass && (
                  <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-2.5">
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap mr-1">Dersler:</span>
                      {selectedBrowseClass.courses.map((course) => {
                        const isCourseSelected = course.id === browseCourseId;
                        return (
                          <button
                            key={course.id}
                            onClick={() => setBrowseCourseId(course.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                              isCourseSelected
                                ? "bg-purple-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            )}
                          >
                            {course.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Üniteler ve Konular Listesi */}
                <ScrollArea className="flex-1 p-4 sm:p-6">
                  {activeCourseData && activeCourseData.units.length > 0 ? (
                    <div className="space-y-4">
                      {activeCourseData.units.map((unit) => {
                        return (
                          <div
                            key={unit.id}
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden shadow-xs"
                          >
                            {/* Ünite Başlığı & "Tüm Üniteyi Oyna" Butonu */}
                            <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                  {unit.title.match(/^\d+/) ? unit.title.match(/^\d+/)?.[0] : "Ü"}
                                </div>
                                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                  {unit.title}
                                </h4>
                              </div>

                              {/* Tüm Ünite İçin Tek Tıkla Etkinlik Başlatma */}
                              {unit.topics && unit.topics.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const firstTopic = unit.topics?.[0];
                                    if (!firstTopic) return;
                                    const item: FlatTopicItem = {
                                      classId: selectedBrowseClass?.id || '',
                                      className: selectedBrowseClass?.name || '',
                                      grade: (selectedBrowseClass as any)?.grade || selectedBrowseClass?.name.replace(/[^0-9]/g, '') || '',
                                      courseId: activeCourseData.id,
                                      courseTitle: activeCourseData.title,
                                      unitId: unit.id,
                                      unitTitle: unit.title,
                                      topicId: firstTopic.id,
                                      topicTitle: firstTopic.title,
                                    };
                                    handleSelectTopic(item, true); // unitAll = true
                                  }}
                                  className="text-xs h-8 rounded-xl font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-600 hover:text-white transition-all whitespace-nowrap self-start sm:self-auto"
                                >
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  ★ Tüm Üniteyi Oyna (Genel)
                                </Button>
                              )}
                            </div>

                            {/* Konu Hapları / Kartları */}
                            <div className="p-3 sm:p-4">
                              {unit.topics && unit.topics.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {unit.topics.map((topic) => {
                                    const isCurrent = selectedTopic?.topicId === topic.id && selectedTopic?.unitId === unit.id;
                                    const item: FlatTopicItem = {
                                      classId: selectedBrowseClass?.id || '',
                                      className: selectedBrowseClass?.name || '',
                                      grade: (selectedBrowseClass as any)?.grade || selectedBrowseClass?.name.replace(/[^0-9]/g, '') || '',
                                      courseId: activeCourseData.id,
                                      courseTitle: activeCourseData.title,
                                      unitId: unit.id,
                                      unitTitle: unit.title,
                                      topicId: topic.id,
                                      topicTitle: topic.title,
                                    };

                                    return (
                                      <button
                                        key={topic.id}
                                        onClick={() => handleSelectTopic(item, false)}
                                        className={cn(
                                          "text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 group",
                                          isCurrent
                                            ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 shadow-xs ring-1 ring-indigo-500"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full flex-shrink-0",
                                            isCurrent ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-400"
                                          )} />
                                          <span className={cn(
                                            "text-xs sm:text-sm font-semibold truncate",
                                            isCurrent ? "font-bold text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"
                                          )}>
                                            {topic.title}
                                          </span>
                                        </div>

                                        {isCurrent && (
                                          <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                            <Check className="w-4 h-4" />
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Bu üniteye ait konu bulunmuyor.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-slate-500 text-sm">Bu ders için ünite verisi bulunamadı.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
