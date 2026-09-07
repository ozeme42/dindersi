"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Gamepad2, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, MousePointerClick, Trophy, Link2, Pencil, BookOpen, Coins, 
  ClipboardCheck, Wind, Star, Milestone, Lock, Rocket, Target, 
  Grid3x3, Swords, Castle, Users, Check, ChevronRight, 
  ChevronLeft, Sparkles, X, Play, FolderOpen, BookMarked,
  GraduationCap, Book, Layers3
} from 'lucide-react';
import type { EnrichedClass } from './actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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

  // 1. Tüm konuları düz bir liste olarak hazırla (hızlı canlı arama ve sıralama için)
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

  // --- SEÇİM STATE'LERİ (DİREKT SAYFA ÜZERİNDE KULLANILAN) ---
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const p = searchParams.get('classId');
    if (p && data.some(c => c.id === p)) return p;
    return data.length > 0 ? data[0].id : "";
  });

  const selectedClass = useMemo(() => {
    return data.find(c => c.id === selectedClassId) || data[0] || null;
  }, [data, selectedClassId]);

  const courses = useMemo(() => {
    return selectedClass?.courses || [];
  }, [selectedClass]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    const p = searchParams.get('courseId');
    if (p && courses.some(c => c.id === p)) return p;
    return courses.length > 0 ? courses[0].id : "";
  });

  // Seçili sınıf değiştiğinde varsayılan dersi güncelle
  useEffect(() => {
    if (courses.length > 0 && !courses.some(c => c.id === selectedCourseId)) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId) || courses[0] || null;
  }, [courses, selectedCourseId]);

  const units = useMemo(() => {
    return selectedCourse?.units || [];
  }, [selectedCourse]);

  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    const p = searchParams.get('unitId');
    if (p && units.some(u => u.id === p)) return p;
    return units.length > 0 ? units[0].id : "";
  });

  // Seçili ders değiştiğinde varsayılan üniteyi güncelle
  useEffect(() => {
    if (units.length > 0 && !units.some(u => u.id === selectedUnitId)) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || units[0] || null;
  }, [units, selectedUnitId]);

  const topics = useMemo(() => {
    return selectedUnit?.topics || [];
  }, [selectedUnit]);

  // Seçili konu ID'si: ya bir konu ID'si ya da 'all' (Tüm Ünite)
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    const p = searchParams.get('topicId');
    if (p === 'all') return 'all';
    if (p && topics.some(t => t.id === p)) return p;
    return topics.length > 0 ? topics[0].id : (p === 'all' ? 'all' : (topics[0]?.id || 'all'));
  });

  // Seçili ünite değiştiğinde konuyu güncelle
  useEffect(() => {
    if (selectedTopicId === 'all') return;
    if (topics.length > 0 && !topics.some(t => t.id === selectedTopicId)) {
      setSelectedTopicId(topics[0].id);
    }
  }, [topics, selectedTopicId]);

  const selectedTopic = useMemo(() => {
    if (selectedTopicId === 'all') {
      return {
        id: 'all',
        title: 'Tüm Konular (Genel Etkinlikler)',
        unitId: selectedUnit?.id || '',
      };
    }
    return topics.find(t => t.id === selectedTopicId) || topics[0] || null;
  }, [topics, selectedTopicId, selectedUnit]);

  // Canlı arama kutusu state'i
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrelenmiş canlı arama sonuçları
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return [];
    return allFlatTopics.filter(item => {
      const combined = `${item.className} ${item.courseTitle} ${item.unitTitle} ${item.topicTitle}`.toLocaleLowerCase('tr-TR');
      return combined.includes(q);
    });
  }, [allFlatTopics, searchQuery]);

  // URL Senkronizasyonu
  const updateUrl = useCallback((classId: string, courseId: string, unitId: string, topicId: string, courseName: string, unitName: string, topicName: string) => {
    const params = new URLSearchParams();
    params.set('classId', classId);
    params.set('courseId', courseId);
    params.set('unitId', unitId);
    params.set('topicId', topicId);
    params.set('courseName', courseName);
    params.set('unitName', unitName);
    params.set('topicName', topicName);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, []);

  // Kullanıcı doğrudan bir sınıf tıkladığında
  const handleSelectClass = (cls: EnrichedClass) => {
    setSelectedClassId(cls.id);
    const firstCourse = cls.courses[0];
    if (firstCourse) {
      setSelectedCourseId(firstCourse.id);
      const firstUnit = firstCourse.units[0];
      if (firstUnit) {
        setSelectedUnitId(firstUnit.id);
        const firstTopic = firstUnit.topics[0];
        const newTopicId = firstTopic ? firstTopic.id : 'all';
        setSelectedTopicId(newTopicId);
        updateUrl(cls.id, firstCourse.id, firstUnit.id, newTopicId, firstCourse.title, firstUnit.title, firstTopic ? firstTopic.title : 'Tüm Konular');
      }
    }
  };

  // Kullanıcı doğrudan bir ders tıkladığında
  const handleSelectCourse = (crs: any) => {
    setSelectedCourseId(crs.id);
    const firstUnit = crs.units[0];
    if (firstUnit) {
      setSelectedUnitId(firstUnit.id);
      const firstTopic = firstUnit.topics[0];
      const newTopicId = firstTopic ? firstTopic.id : 'all';
      setSelectedTopicId(newTopicId);
      updateUrl(selectedClass?.id || '', crs.id, firstUnit.id, newTopicId, crs.title, firstUnit.title, firstTopic ? firstTopic.title : 'Tüm Konular');
    }
  };

  // Kullanıcı doğrudan bir ünite tıkladığında
  const handleSelectUnit = (unit: any) => {
    setSelectedUnitId(unit.id);
    const firstTopic = unit.topics[0];
    const newTopicId = firstTopic ? firstTopic.id : 'all';
    setSelectedTopicId(newTopicId);
    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', unit.id, newTopicId, selectedCourse?.title || '', unit.title, firstTopic ? firstTopic.title : 'Tüm Konular');
  };

  // Kullanıcı doğrudan bir konu tıkladığında
  const handleSelectTopic = (topicId: string, topicTitle: string) => {
    setSelectedTopicId(topicId);
    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', selectedUnit?.id || '', topicId, selectedCourse?.title || '', selectedUnit?.title || '', topicTitle);
  };

  // Arama sonucundan tek tıkla seçildiğinde
  const handleSelectFromSearch = (item: FlatTopicItem) => {
    setSelectedClassId(item.classId);
    setSelectedCourseId(item.courseId);
    setSelectedUnitId(item.unitId);
    setSelectedTopicId(item.topicId);
    setSearchQuery("");
    updateUrl(item.classId, item.courseId, item.unitId, item.topicId, item.courseTitle, item.unitTitle, item.topicTitle);
  };

  // Sıralı gezinme (Önceki / Sonraki Konu)
  const currentTopicIndex = useMemo(() => {
    if (!selectedTopic || selectedTopicId === 'all') return -1;
    return topics.findIndex(t => t.id === selectedTopic.id);
  }, [topics, selectedTopic, selectedTopicId]);

  const prevTopic = currentTopicIndex > 0 ? topics[currentTopicIndex - 1] : null;
  const nextTopic = currentTopicIndex >= 0 && currentTopicIndex < topics.length - 1 ? topics[currentTopicIndex + 1] : null;

  const handlePrevTopic = () => {
    if (prevTopic) {
      handleSelectTopic(prevTopic.id, prevTopic.title);
    }
  };

  const handleNextTopic = () => {
    if (nextTopic) {
      handleSelectTopic(nextTopic.id, nextTopic.title);
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
    if (!selectedClass || !selectedCourse || !selectedUnit) return '#';
    const isAll = selectedTopicId === 'all' || !selectedTopic;
    const topicIdVal = isAll ? 'all' : selectedTopic.id;
    const topicNameVal = isAll ? 'Tüm Konular' : selectedTopic.title;

    const params = new URLSearchParams({
      classId: selectedClass.id || '',
      courseId: selectedCourse.id || '',
      unitId: selectedUnit.id || '',
      topicId: topicIdVal,
      courseName: selectedCourse.title || '',
      unitName: selectedUnit.title || '',
      topicName: topicNameVal,
      isStatic: 'false'
    });

    return `${activity.href}/oyun?${params.toString()}`;
  };

  const isAllUnitSelected = selectedTopicId === 'all';

  return (
    <div className="min-h-screen pb-20 bg-slate-50/70 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      
      {/* --- SAYFA ÜST ÇUBUĞU --- */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="container mx-auto px-4 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Başlık ve Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Öğretmen Etkinlik Merkezi
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sınıf, ders, ünite ve konuyu doğrudan aşağıdaki düğmelerden seçin.
                </p>
              </div>
            </div>

            {/* Hızlı Canlı Arama Çubuğu (Direkt Sayfa Üzerinde) */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu veya ünite ara (örn: Zekat, Meddi)..."
                className="pl-9 pr-8 h-9 text-xs sm:text-sm rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-5 space-y-6">

        {/* --- ARAMA SONUÇLARI TEPESİ (Arama kutusuna yazı yazıldığında anında görünür) --- */}
        {searchQuery.trim().length > 0 && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-slate-900 p-4 shadow-xl animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Search className="w-4 h-4" />
                <span>"{searchQuery}" için bulunan konular ({searchResults.length})</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSearchQuery("")} className="h-7 text-xs text-slate-400 hover:text-slate-600">
                Kapat
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {searchResults.map((item) => (
                  <button
                    key={`${item.classId}-${item.courseId}-${item.unitId}-${item.topicId}`}
                    onClick={() => handleSelectFromSearch(item)}
                    className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between gap-1.5 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
                        {item.className}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 truncate">
                        {item.courseTitle}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.topicTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.unitTitle}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 font-medium">
                Aradığınız kelimeye uygun bir konu bulunamadı.
              </div>
            )}
          </div>
        )}

        {/* --- DİREKT SAYFA ÜZERİNDEKİ MÜFREDAT SEÇİCİ (KOKPİT PANELİ) --- */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-6 shadow-md space-y-4">
          
          {/* 1. ADIM: SINIF SEÇİMİ */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>1. Sınıf Seçin</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {data.map((schoolClass) => {
                const isSelected = schoolClass.id === selectedClassId;
                return (
                  <button
                    key={schoolClass.id}
                    onClick={() => handleSelectClass(schoolClass)}
                    className={cn(
                      "h-12 sm:h-14 rounded-2xl font-black text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2.5 border shadow-xs relative overflow-hidden",
                      isSelected
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/50 scale-[1.01]"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300"
                    )}
                  >
                    <span>{schoolClass.name}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ADIM: DERS SEÇİMİ */}
          {courses.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Book className="w-4 h-4 text-purple-500" />
                <span>2. Ders Seçin ({selectedClass?.name})</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {courses.map((course) => {
                  const isSelected = course.id === selectedCourseId;
                  return (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      className={cn(
                        "h-10 px-4 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 border shadow-xs",
                        isSelected
                          ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white border-purple-600 shadow-md shadow-purple-600/25 ring-2 ring-purple-500/40"
                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <span>{course.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. ADIM: ÜNİTE SEÇİMİ */}
          {units.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 mb-2 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Layers3 className="w-4 h-4 text-teal-500" />
                <span>3. Ünite Seçin ({units.length} Ünite)</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {units.map((unit) => {
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit)}
                      className={cn(
                        "h-10 px-4 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 border shadow-xs",
                        isSelected
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-600 shadow-md shadow-teal-600/25 ring-2 ring-teal-500/40"
                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <span className="truncate max-w-[240px] sm:max-w-[320px]">{unit.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. ADIM: KONU SEÇİMİ (Veya Tüm Ünite) */}
          {selectedUnit && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 rounded-b-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Target className="w-4 h-4 text-amber-500" />
                  <span>4. Konu Seçin ({topics.length} Konu)</span>
                </div>

                {/* Sıralı Konu Gezinme Butonları */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrevTopic}
                    disabled={!prevTopic}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold border-slate-300 dark:border-slate-700"
                    title={prevTopic ? `Önceki: ${prevTopic.title}` : 'İlk konu'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Önceki Konu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextTopic}
                    disabled={!nextTopic}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold border-slate-300 dark:border-slate-700"
                    title={nextTopic ? `Sonraki: ${nextTopic.title}` : 'Son konu'}
                  >
                    Sonraki Konu <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Konu Butonları Grid/Listesi */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* 1. SEÇENEK: TÜM ÜNİTEYİ OYNA */}
                <button
                  onClick={() => {
                    setSelectedTopicId('all');
                    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', selectedUnit.id, 'all', selectedCourse?.title || '', selectedUnit.title, 'Tüm Konular');
                  }}
                  className={cn(
                    "h-10 px-4 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 border shadow-xs",
                    isAllUnitSelected
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md shadow-orange-500/30 ring-2 ring-amber-400"
                      : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>★ Tüm Ünite (Genel Etkinlikler)</span>
                  {isAllUnitSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                </button>

                {/* 2. TEKİL KONULAR */}
                {topics.map((topic) => {
                  const isSelected = selectedTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic.id, topic.title)}
                      className={cn(
                        "h-10 px-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-2 border shadow-xs",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/50"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-slate-700"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", isSelected ? "bg-white" : "bg-slate-300 dark:bg-slate-600")} />
                      <span className="truncate max-w-[260px] sm:max-w-[340px]">{topic.title}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* --- SEÇİLİ OLAN ETKİNLİK BAŞLIĞI ÖZETİ --- */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="text-indigo-600 dark:text-indigo-400 font-black">{selectedClass?.name}</span>
              <span>›</span>
              <span>{selectedCourse?.title}</span>
              <span>›</span>
              <span className="truncate max-w-[260px]">{selectedUnit?.title}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAllUnitSelected ? (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span>{selectedUnit?.title}</span>
                  <Badge className="bg-amber-500 text-white text-[11px] font-black">Genel Ünite Modu</Badge>
                </span>
              ) : (
                selectedTopic?.title || 'Seçili Konu'
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Başlatmak istediğiniz oyuna tıklayın:
            </span>
          </div>
        </div>

        {/* --- OYUN FİLTRELERİ VE ARAMA --- */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

        {/* --- 26 OYUN VİTRİNİ --- */}
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
    </div>
  );
}
