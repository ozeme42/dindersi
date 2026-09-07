"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Gamepad2, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, MousePointerClick, Trophy, Link2, Pencil, BookOpen, Coins, 
  ClipboardCheck, Wind, Star, Milestone, Lock, Rocket, Target, 
  Grid3x3, Swords, Castle, Users, Check, ChevronRight, 
  ChevronLeft, Sparkles, X, Play, FolderOpen
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

  // 1. Tüm konuları düz bir liste olarak hazırla (hızlı canlı arama için)
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

  // --- SEÇİM STATE'LERİ ---
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

  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    const p = searchParams.get('topicId');
    if (p === 'all') return 'all';
    if (p && topics.some(t => t.id === p)) return p;
    return topics.length > 0 ? topics[0].id : (p === 'all' ? 'all' : (topics[0]?.id || 'all'));
  });

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

  // Canlı arama
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!q) return [];
    return allFlatTopics.filter(item => {
      const combined = `${item.className} ${item.courseTitle} ${item.unitTitle} ${item.topicTitle}`.toLocaleLowerCase('tr-TR');
      return combined.includes(q);
    });
  }, [allFlatTopics, searchQuery]);

  // URL senkronizasyonu
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

  const handleSelectUnit = (unit: any) => {
    setSelectedUnitId(unit.id);
    const firstTopic = unit.topics[0];
    const newTopicId = firstTopic ? firstTopic.id : 'all';
    setSelectedTopicId(newTopicId);
    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', unit.id, newTopicId, selectedCourse?.title || '', unit.title, firstTopic ? firstTopic.title : 'Tüm Konular');
  };

  const handleSelectTopic = (topicId: string, topicTitle: string) => {
    setSelectedTopicId(topicId);
    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', selectedUnit?.id || '', topicId, selectedCourse?.title || '', selectedUnit?.title || '', topicTitle);
  };

  const handleSelectFromSearch = (item: FlatTopicItem) => {
    setSelectedClassId(item.classId);
    setSelectedCourseId(item.courseId);
    setSelectedUnitId(item.unitId);
    setSelectedTopicId(item.topicId);
    setSearchQuery("");
    updateUrl(item.classId, item.courseId, item.unitId, item.topicId, item.courseTitle, item.unitTitle, item.topicTitle);
  };

  // Sıralı gezinme
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

  // Oyun filtresi
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
    <div className="min-h-screen pb-16 bg-slate-50/70 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      
      {/* --- KOMPAKT STICKY ÜST KONTROL PANELİ --- */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 space-y-2">
          
          {/* SATIR 1: LOGO + SINIFLAR + DERSLER + ARAMA */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Başlık İkonu */}
              <div className="flex items-center gap-1.5 mr-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <span className="font-black text-sm text-slate-900 dark:text-white hidden md:inline">
                  Etkinlikler
                </span>
              </div>

              {/* 1. Sınıf Hapları */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {data.map((schoolClass) => {
                  const isSelected = schoolClass.id === selectedClassId;
                  return (
                    <button
                      key={schoolClass.id}
                      onClick={() => handleSelectClass(schoolClass)}
                      className={cn(
                        "h-7 px-2.5 rounded-md text-xs font-black transition-all",
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {schoolClass.name}
                    </button>
                  );
                })}
              </div>

              {/* 2. Ders Hapları */}
              {courses.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[50vw] sm:max-w-none">
                  {courses.map((course) => {
                    const isSelected = course.id === selectedCourseId;
                    return (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className={cn(
                          "h-7 px-2.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {course.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Canlı Arama Inputu */}
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-indigo-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu ara..."
                className="pl-7 pr-6 h-7 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* SATIR 2: ÜNİTELER (Kompakt Tek Satır) */}
          {units.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 flex-shrink-0">Ünite:</span>
              {units.map((unit) => {
                const isSelected = unit.id === selectedUnitId;
                return (
                  <button
                    key={unit.id}
                    onClick={() => handleSelectUnit(unit)}
                    className={cn(
                      "h-7 px-2.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 flex items-center gap-1",
                      isSelected
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span>{unit.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SATIR 3: KONULAR & GEZİNME (Kompakt Tek Satır) */}
          {selectedUnit && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1">
                <span className="text-[10px] font-black uppercase text-slate-400 flex-shrink-0">Konu:</span>

                {/* Tüm Üniteyi Oyna Butonu */}
                <button
                  onClick={() => {
                    setSelectedTopicId('all');
                    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', selectedUnit.id, 'all', selectedCourse?.title || '', selectedUnit.title, 'Tüm Konular');
                  }}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-black whitespace-nowrap transition-all flex items-center gap-1 border flex-shrink-0",
                    isAllUnitSelected
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300/80 dark:border-amber-800/60 hover:bg-amber-100"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>★ Tüm Ünite (Genel)</span>
                </button>

                {/* Konu Butonları */}
                {topics.map((topic) => {
                  const isSelected = selectedTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic.id, topic.title)}
                      className={cn(
                        "h-7 px-2.5 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border flex-shrink-0",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-slate-400")} />
                      <span>{topic.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Hızlı Önceki / Sonraki Atlama Butonları */}
              <div className="flex items-center gap-1 flex-shrink-0 pl-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevTopic}
                  disabled={!prevTopic}
                  className="h-7 px-2 rounded-md text-xs font-bold border-slate-200 dark:border-slate-700"
                  title={prevTopic ? `Önceki: ${prevTopic.title}` : 'İlk konu'}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextTopic}
                  disabled={!nextTopic}
                  className="h-7 px-2 rounded-md text-xs font-bold border-slate-200 dark:border-slate-700"
                  title={nextTopic ? `Sonraki: ${nextTopic.title}` : 'Son konu'}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 pt-4 space-y-4">

        {/* --- ARAMA SONUÇLARI TEPESİ (Arama kutusuna yazı yazıldığında açılır) --- */}
        {searchQuery.trim().length > 0 && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-3 shadow-lg animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                "{searchQuery}" araması ({searchResults.length} sonuç)
              </span>
              <Button size="sm" variant="ghost" onClick={() => setSearchQuery("")} className="h-6 text-xs text-slate-400">
                Kapat
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                {searchResults.map((item) => (
                  <button
                    key={`${item.classId}-${item.courseId}-${item.unitId}-${item.topicId}`}
                    onClick={() => handleSelectFromSearch(item)}
                    className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all flex flex-col gap-1 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded">
                        {item.className}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 truncate">
                        {item.courseTitle}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {item.topicTitle}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                Uygun bir konu bulunamadı.
              </div>
            )}
          </div>
        )}

        {/* --- AKTİF KONU VE OYUN FİLTRE ÇUBUĞU (TEK SATIRDA) --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Sol: Aktif Konu Breadcrumb */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge className="bg-indigo-600 text-white font-black text-[11px] px-2 py-0.5 shadow-xs">
              {selectedClass?.name}
            </Badge>
            <span className="text-slate-400 font-bold">›</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">{selectedCourse?.title}</span>
            <span className="text-slate-400 font-bold">›</span>
            <span className="font-black text-slate-900 dark:text-white truncate max-w-[280px]">
              {isAllUnitSelected ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {selectedUnit?.title} (Tüm Ünite)
                </span>
              ) : (
                selectedTopic?.title || 'Seçili Konu'
              )}
            </span>
          </div>

          {/* Sağ: Takım / Bireysel Filtreleri */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            <button
              onClick={() => setGameCategory('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                gameCategory === 'all'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Tümü ({activityTypes.length})
            </button>
            <button
              onClick={() => setGameCategory('team')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                gameCategory === 'team'
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Users className="w-3 h-3" /> Takım ({activityTypes.filter(g => g.isTeam).length})
            </button>
            <button
              onClick={() => setGameCategory('solo')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                gameCategory === 'solo'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Target className="w-3 h-3" /> Bireysel ({activityTypes.filter(g => !g.isTeam).length})
            </button>
          </div>
        </div>

        {/* --- 26 ADET OYUN KARTLARI VİTRİNİ --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {filteredGames.map((activity) => {
            const Icon = activity.icon;
            const style = colorStyles[activity.color] || colorStyles.indigo;
            const gameUrl = buildGameUrl(activity);

            return (
              <Link
                key={activity.href}
                href={gameUrl}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 flex flex-col justify-between p-4 bg-gradient-to-br text-white shadow-md",
                  style.bg,
                  style.border,
                  style.glow
                )}
              >
                {/* Arka plan dekoratif icon */}
                <Icon className="w-28 h-28 absolute -right-5 -bottom-5 text-white/10 group-hover:text-white/15 transition-all duration-500 pointer-events-none" />

                {/* Kart Üst: İkon ve Rozet */}
                <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md shadow-xs border border-white/20", style.iconBg)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex items-center gap-1">
                    {activity.isTeam && (
                      <span className="bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                        <Users className="w-2.5 h-2.5" /> TAKIM
                      </span>
                    )}
                    {activity.badge && (
                      <span className="bg-white/20 border border-white/30 text-white px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                        {activity.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Kart Orta: Başlık ve Açıklama */}
                <div className="relative z-10 mb-3">
                  <h3 className="font-black text-base sm:text-lg text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors drop-shadow-xs">
                    {activity.label}
                  </h3>
                  <p className="text-[11px] text-white/80 font-medium line-clamp-2 mt-0.5">
                    {activity.description}
                  </p>
                </div>

                {/* Kart Alt: Başlat Butonu */}
                <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold">
                  <span className="text-[11px] text-white/90">
                    {activity.isTeam ? "Sınıf Düellosu" : "Bireysel"}
                  </span>
                  <div className="flex items-center gap-1 bg-white text-slate-900 group-hover:bg-amber-300 transition-all px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs">
                    <span>BAŞLAT</span>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm">Aramanıza uygun oyun bulunamadı.</p>
            <Button variant="outline" size="sm" onClick={() => { setGameCategory('all'); setGameFilterQuery(""); }} className="mt-2 text-xs">
              Filtreleri Temizle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
