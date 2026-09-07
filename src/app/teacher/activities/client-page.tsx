"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Gamepad2, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, MousePointerClick, Trophy, Link2, Pencil, BookOpen, Coins, 
  ClipboardCheck, Wind, Star, Milestone, Lock, Rocket, Target, 
  Grid3x3, Swords, Castle, Users, Check, ChevronRight, 
  ChevronLeft, Sparkles, X, Play, FolderOpen, BookMarked,
  GraduationCap, Book, Layers3, Flame, Compass
} from 'lucide-react';
import type { EnrichedClass } from './actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// --- HAREKETLİ VE KOZİK KOYU ARKA PLAN ---
const CosmicDarkBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#070b14]">
    {/* Parlayan Renkli Orblar */}
    <div className="absolute top-[-10%] left-[-10%] w-[650px] h-[650px] bg-cyan-600/15 rounded-full blur-[140px] animate-pulse-slow" />
    <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] animate-pulse-slow delay-1000" />
    <div className="absolute bottom-[-10%] left-[30%] w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[130px] animate-pulse-slow delay-2000" />
    <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-slow delay-700" />
    
    {/* Şık Arka Plan Izgarası */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />

    {/* Uçuşan İkon Silüetleri */}
    <div className="absolute top-28 left-8 opacity-[0.03] rotate-12 text-cyan-300">
      <Gamepad2 className="w-36 h-36" />
    </div>
    <div className="absolute bottom-32 right-12 opacity-[0.03] -rotate-12 text-purple-300">
      <Trophy className="w-44 h-44" />
    </div>
  </div>
);

// --- 26 OYUN TANIMI ---
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
  purple:  { bg: "from-purple-600 via-indigo-700 to-purple-900", border: "border-purple-400/50 hover:border-purple-300", glow: "shadow-[0_8px_25px_rgba(168,85,247,0.3)]", text: "text-purple-300", iconBg: "bg-purple-500/25 text-purple-200 border-purple-400/40" },
  amber:   { bg: "from-amber-500 via-orange-600 to-amber-800", border: "border-amber-400/50 hover:border-amber-300", glow: "shadow-[0_8px_25px_rgba(245,158,11,0.3)]", text: "text-amber-300", iconBg: "bg-amber-500/25 text-amber-200 border-amber-400/40" },
  fuchsia: { bg: "from-fuchsia-600 via-pink-600 to-purple-900", border: "border-fuchsia-400/50 hover:border-fuchsia-300", glow: "shadow-[0_8px_25px_rgba(217,70,239,0.3)]", text: "text-fuchsia-300", iconBg: "bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-400/40" },
  pink:    { bg: "from-pink-600 via-rose-600 to-pink-900", border: "border-pink-400/50 hover:border-pink-300", glow: "shadow-[0_8px_25px_rgba(244,63,94,0.3)]", text: "text-pink-300", iconBg: "bg-pink-500/25 text-pink-200 border-pink-400/40" },
  indigo:  { bg: "from-indigo-600 via-blue-700 to-indigo-950", border: "border-indigo-400/50 hover:border-indigo-300", glow: "shadow-[0_8px_25px_rgba(99,102,241,0.3)]", text: "text-indigo-300", iconBg: "bg-indigo-500/25 text-indigo-200 border-indigo-400/40" },
  emerald: { bg: "from-emerald-600 via-teal-700 to-emerald-950", border: "border-emerald-400/50 hover:border-emerald-300", glow: "shadow-[0_8px_25px_rgba(16,185,129,0.3)]", text: "text-emerald-300", iconBg: "bg-emerald-500/25 text-emerald-200 border-emerald-400/40" },
  blue:    { bg: "from-blue-600 via-cyan-700 to-blue-950", border: "border-blue-400/50 hover:border-blue-300", glow: "shadow-[0_8px_25px_rgba(59,130,246,0.3)]", text: "text-blue-300", iconBg: "bg-blue-500/25 text-blue-200 border-blue-400/40" },
  orange:  { bg: "from-orange-600 via-red-600 to-orange-950", border: "border-orange-400/50 hover:border-orange-300", glow: "shadow-[0_8px_25px_rgba(249,115,22,0.3)]", text: "text-orange-300", iconBg: "bg-orange-500/25 text-orange-200 border-orange-400/40" },
  lime:    { bg: "from-lime-600 via-emerald-700 to-lime-950", border: "border-lime-400/50 hover:border-lime-300", glow: "shadow-[0_8px_25px_rgba(132,204,22,0.3)]", text: "text-lime-300", iconBg: "bg-lime-500/25 text-lime-200 border-lime-400/40" },
  cyan:    { bg: "from-cyan-600 via-blue-600 to-cyan-950", border: "border-cyan-400/50 hover:border-cyan-300", glow: "shadow-[0_8px_25px_rgba(6,182,212,0.3)]", text: "text-cyan-300", iconBg: "bg-cyan-500/25 text-cyan-200 border-cyan-400/40" },
  violet:  { bg: "from-violet-600 via-purple-700 to-violet-950", border: "border-violet-400/50 hover:border-violet-300", glow: "shadow-[0_8px_25px_rgba(139,92,246,0.3)]", text: "text-violet-300", iconBg: "bg-violet-500/25 text-violet-200 border-violet-400/40" },
  teal:    { bg: "from-teal-600 via-emerald-700 to-teal-950", border: "border-teal-400/50 hover:border-teal-300", glow: "shadow-[0_8px_25px_rgba(20,184,166,0.3)]", text: "text-teal-300", iconBg: "bg-teal-500/25 text-teal-200 border-teal-400/40" },
  rose:    { bg: "from-rose-600 via-red-700 to-rose-950", border: "border-rose-400/50 hover:border-rose-300", glow: "shadow-[0_8px_25px_rgba(244,63,94,0.3)]", text: "text-rose-300", iconBg: "bg-rose-500/25 text-rose-200 border-rose-400/40" },
  red:     { bg: "from-red-600 via-rose-700 to-red-950", border: "border-red-400/50 hover:border-red-300", glow: "shadow-[0_8px_25px_rgba(239,68,68,0.3)]", text: "text-red-300", iconBg: "bg-red-500/25 text-red-200 border-red-400/40" },
  yellow:  { bg: "from-amber-600 via-yellow-600 to-amber-900", border: "border-amber-400/50 hover:border-amber-300", glow: "shadow-[0_8px_25px_rgba(234,179,8,0.3)]", text: "text-yellow-300", iconBg: "bg-amber-500/25 text-yellow-200 border-amber-400/40" },
  green:   { bg: "from-green-600 via-emerald-700 to-green-950", border: "border-green-400/50 hover:border-green-300", glow: "shadow-[0_8px_25px_rgba(34,197,94,0.3)]", text: "text-green-300", iconBg: "bg-green-500/25 text-green-200 border-green-400/40" },
  sky:     { bg: "from-sky-600 via-blue-600 to-sky-950", border: "border-sky-400/50 hover:border-sky-300", glow: "shadow-[0_8px_25px_rgba(14,165,233,0.3)]", text: "text-sky-300", iconBg: "bg-sky-500/25 text-sky-200 border-sky-400/40" },
  slate:   { bg: "from-slate-700 via-slate-800 to-slate-950", border: "border-slate-500/50 hover:border-slate-400", glow: "shadow-[0_8px_25px_rgba(100,116,139,0.3)]", text: "text-slate-300", iconBg: "bg-slate-600/25 text-slate-200 border-slate-500/40" },
  zinc:    { bg: "from-zinc-700 via-neutral-800 to-zinc-950", border: "border-zinc-500/50 hover:border-zinc-400", glow: "shadow-[0_8px_25px_rgba(113,113,122,0.3)]", text: "text-zinc-300", iconBg: "bg-zinc-600/25 text-zinc-200 border-zinc-500/40" },
};

// Sınıflara Özel Canlı Neon Renkler
const classBadgeThemes: Record<string, { active: string; idle: string; border: string }> = {
  '5': { 
    active: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border-cyan-300 ring-2 ring-cyan-400/60',
    idle: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60 hover:border-cyan-400',
    border: 'border-cyan-500/40'
  },
  '6': { 
    active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-300 ring-2 ring-emerald-400/60',
    idle: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400',
    border: 'border-emerald-500/40'
  },
  '7': { 
    active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] border-violet-300 ring-2 ring-violet-400/60',
    idle: 'bg-violet-950/40 text-violet-300 border-violet-500/30 hover:bg-violet-900/60 hover:border-violet-400',
    border: 'border-violet-500/40'
  },
  '8': { 
    active: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border-amber-300 ring-2 ring-amber-400/60',
    idle: 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/60 hover:border-amber-400',
    border: 'border-amber-500/40'
  },
};

const courseGradients = [
  { active: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400', idle: 'bg-purple-950/40 text-purple-200 border-purple-500/30 hover:bg-purple-900/50' },
  { active: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)] border-teal-400', idle: 'bg-teal-950/40 text-teal-200 border-teal-500/30 hover:bg-teal-900/50' },
  { active: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border-rose-400', idle: 'bg-rose-950/40 text-rose-200 border-rose-500/30 hover:bg-rose-900/50' },
  { active: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-400', idle: 'bg-amber-950/40 text-amber-200 border-amber-500/30 hover:bg-amber-900/50' },
];

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

  // 1. Düzleştirilmiş konular listesi
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
  const gradeKey = selectedClass?.name.replace(/[^0-9]/g, '') || '5';
  const currentGradeTheme = classBadgeThemes[gradeKey] || classBadgeThemes['5'];

  return (
    <div className="min-h-screen pb-20 bg-[#070b14] text-white relative selection:bg-cyan-500 selection:text-white">
      
      {/* Hareketli Koyu Kozmik Arka Plan */}
      <CosmicDarkBackground />

      {/* --- SAĞA VE SOLA YASLI ŞIK STICKY ÜST KONTROL BAR --- */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c1222]/90 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            
            {/* SOLA YASLI: Logo, Başlık ve Hızlı Durum */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-10 h-10 rounded-2xl bg-slate-900 border border-white/20 flex items-center justify-center text-cyan-400">
                  <Gamepad2 className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300">
                    ETKİNLİK MERKEZİ
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <Flame className="w-3 h-3 text-cyan-400" /> 26 OYUN
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <span className="text-cyan-400 font-bold">{selectedClass?.name}</span>
                  <span>•</span>
                  <span className="text-purple-300 font-medium">{selectedCourse?.title}</span>
                </div>
              </div>
            </div>

            {/* SAĞA YASLI: Önceki/Sonraki Atlama & Hızlı Arama */}
            <div className="flex items-center gap-2.5">
              
              {/* Sıralı Konu Atlama */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                <button
                  onClick={handlePrevTopic}
                  disabled={!prevTopic}
                  title={prevTopic ? `Önceki: ${prevTopic.title}` : 'İlk konu'}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:inline">Önceki</span>
                </button>
                <div className="w-[1px] h-4 bg-white/10" />
                <button
                  onClick={handleNextTopic}
                  disabled={!nextTopic}
                  title={nextTopic ? `Sonraki: ${nextTopic.title}` : 'Son konu'}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                >
                  <span className="hidden md:inline">Sonraki</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                </button>
              </div>

              {/* Canlı Arama Inputu */}
              <div className="relative w-44 sm:w-60">
                <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hızlı konu ara..."
                  className="pl-8 pr-7 h-8 text-xs rounded-xl bg-slate-900/90 border-white/15 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500 focus-visible:border-cyan-400 shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- ANA İÇERİK ALANI --- */}
      <main className="container mx-auto px-4 sm:px-6 pt-5 relative z-10 space-y-4">

        {/* --- ARAMA SONUÇLARI PENCERESİ (Yalnızca arama yazıldığında açılır) --- */}
        {searchQuery.trim().length > 0 && (
          <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/95 backdrop-blur-2xl p-4 shadow-[0_10px_40px_rgba(6,182,212,0.25)] animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Search className="w-4 h-4" />
                <span>"{searchQuery}" araması için {searchResults.length} konu bulundu:</span>
              </div>
              <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/10">
                Kapat
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {searchResults.map((item) => (
                  <button
                    key={`${item.classId}-${item.courseId}-${item.unitId}-${item.topicId}`}
                    onClick={() => handleSelectFromSearch(item)}
                    className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all flex flex-col gap-1.5 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black bg-cyan-500 text-slate-950 px-2 py-0.5 rounded shadow-xs">
                        {item.className}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 truncate">
                        {item.courseTitle}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.topicTitle}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {item.unitTitle}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                Aradığınız kavramla eşleşen bir konu bulunamadı.
              </div>
            )}
          </div>
        )}

        {/* --- KOMPAKT, RENKLİ VE SAĞA-SOLA YASLI SEÇİM KOKPİTİ --- */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl p-3.5 shadow-2xl space-y-2.5">
          
          {/* 1. SATIR: SINIFLAR (SOLDA) & DERSLER (SAĞA AKAN) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            
            {/* SOL: Sınıf Seçimi */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 px-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" /> Sınıf:
              </span>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                {data.map((schoolClass) => {
                  const isSelected = schoolClass.id === selectedClassId;
                  const gradeNum = schoolClass.name.replace(/[^0-9]/g, '');
                  const theme = classBadgeThemes[gradeNum] || classBadgeThemes['5'];

                  return (
                    <button
                      key={schoolClass.id}
                      onClick={() => handleSelectClass(schoolClass)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border",
                        isSelected
                          ? theme.active
                          : theme.idle
                      )}
                    >
                      <span>{schoolClass.name}</span>
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SAĞ: Ders Seçimi */}
            {courses.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 lg:justify-end">
                <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 px-1 flex-shrink-0 flex items-center gap-1">
                  <Book className="w-3.5 h-3.5 text-purple-400" /> Ders:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                  {courses.map((course, idx) => {
                    const isSelected = course.id === selectedCourseId;
                    const theme = courseGradients[idx % courseGradients.length];

                    return (
                      <button
                        key={course.id}
                        onClick={() => handleSelectCourse(course)}
                        className={cn(
                          "h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 flex-shrink-0",
                          isSelected
                            ? theme.active
                            : theme.idle
                        )}
                      >
                        <span>{course.title}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. SATIR: ÜNİTELER (SAĞA SOLA YASLI YATAY ÇUBUK) */}
          {units.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-2 border-t border-white/10">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 px-1 flex-shrink-0 flex items-center gap-1">
                <Layers3 className="w-3.5 h-3.5 text-teal-400" /> Ünite:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 py-0.5">
                {units.map((unit) => {
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 flex-shrink-0",
                        isSelected
                          ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.4)] ring-1 ring-teal-300"
                          : "bg-slate-950/60 text-slate-300 border-white/10 hover:border-teal-500/50 hover:bg-teal-950/30"
                      )}
                    >
                      <span className="truncate max-w-[280px] sm:max-w-[340px]">{unit.title}</span>
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. SATIR: KONULAR (SOLDA TÜM ÜNİTE + KONULAR, SAĞDA HIZLI ATLAMALAR) */}
          {selectedUnit && (
            <div className="flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar pt-2 border-t border-white/10">
              
              {/* SOLDA: Konu Listesi ve Tüm Ünite Butonu */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 py-0.5">
                <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 px-1 flex-shrink-0 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> Konu:
                </span>

                {/* 1. TÜM ÜNİTE PARLAK BUTONU */}
                <button
                  onClick={() => {
                    setSelectedTopicId('all');
                    updateUrl(selectedClass?.id || '', selectedCourse?.id || '', selectedUnit.id, 'all', selectedCourse?.title || '', selectedUnit.title, 'Tüm Konular');
                  }}
                  className={cn(
                    "h-8 px-3 rounded-lg text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 border flex-shrink-0",
                    isAllUnitSelected
                      ? "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-2 ring-amber-300"
                      : "bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50 hover:border-amber-400"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>★ TÜM ÜNİTEYİ OYNA</span>
                  {isAllUnitSelected && <Check className="w-3.5 h-3.5 ml-0.5 text-slate-950 stroke-[3]" />}
                </button>

                {/* 2. TEKİL KONU BUTONLARI */}
                {topics.map((topic) => {
                  const isSelected = selectedTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic.id, topic.title)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border flex-shrink-0",
                        isSelected
                          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] ring-1 ring-cyan-300"
                          : "bg-slate-950/60 text-slate-300 border-white/10 hover:border-indigo-400/50 hover:bg-indigo-950/30"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isSelected ? "bg-cyan-300 shadow-[0_0_6px_#67e8f9]" : "bg-slate-500")} />
                      <span className="truncate max-w-[260px] sm:max-w-[320px]">{topic.title}</span>
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0 text-cyan-300" />}
                    </button>
                  );
                })}
              </div>

              {/* SAĞDA: Önceki/Sonraki Butonları */}
              <div className="flex items-center gap-1 flex-shrink-0 pl-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevTopic}
                  disabled={!prevTopic}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/15"
                  title={prevTopic ? `Önceki: ${prevTopic.title}` : 'İlk konu'}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5 text-cyan-400" />
                  <span className="hidden sm:inline">Önceki</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNextTopic}
                  disabled={!nextTopic}
                  className="h-8 px-2.5 rounded-lg text-xs font-bold bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/15"
                  title={nextTopic ? `Sonraki: ${nextTopic.title}` : 'Son konu'}
                >
                  <span className="hidden sm:inline">Sonraki</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-cyan-400" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* --- AKTİF KONU BİLGİSİ VE OYUN KATEGORİ SEÇİCİ (SAĞA SOLA YASLI) --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 shadow-lg">
          
          {/* SOL: Aktif Başlık & Breadcrumb */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Seçili İçerik:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="font-black px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {selectedClass?.name}
              </span>
              <span className="text-slate-500 font-bold">›</span>
              <span className="font-bold text-purple-300">{selectedCourse?.title}</span>
              <span className="text-slate-500 font-bold">›</span>
              <span className="font-black text-white truncate max-w-[280px]">
                {isAllUnitSelected ? (
                  <span className="text-amber-400 font-black">
                    {selectedUnit?.title} (Tüm Ünite Modu)
                  </span>
                ) : (
                  selectedTopic?.title || 'Seçili Konu'
                )}
              </span>
            </div>
          </div>

          {/* SAĞ: Kategori Filtre Butonları (Tümü / Takım / Bireysel) */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setGameCategory('all')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all",
                gameCategory === 'all'
                  ? "bg-white/15 text-white border border-white/20 shadow-xs"
                  : "text-slate-400 hover:text-white"
              )}
            >
              Tümü ({activityTypes.length})
            </button>
            <button
              onClick={() => setGameCategory('team')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                gameCategory === 'team'
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Users className="w-3 h-3" /> Takım ({activityTypes.filter(g => g.isTeam).length})
            </button>
            <button
              onClick={() => setGameCategory('solo')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                gameCategory === 'solo'
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Target className="w-3 h-3" /> Bireysel ({activityTypes.filter(g => !g.isTeam).length})
            </button>
          </div>
        </div>

        {/* --- 26 ADET 3D KOYU PARLAK OYUN KARTLARI VİTRİNİ --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map((activity) => {
            const Icon = activity.icon;
            const style = colorStyles[activity.color] || colorStyles.indigo;
            const gameUrl = buildGameUrl(activity);

            return (
              <Link
                key={activity.href}
                href={gameUrl}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 flex flex-col justify-between p-4 bg-gradient-to-br text-white shadow-xl backdrop-blur-md",
                  style.bg,
                  style.border,
                  style.glow
                )}
              >
                {/* Arka plan dekoratif silüet icon */}
                <Icon className="w-32 h-32 absolute -right-6 -bottom-6 text-white/10 group-hover:text-white/20 transition-all duration-500 group-hover:rotate-12 pointer-events-none" />

                {/* Kart Üst Kısım: İkon ve Rozetler */}
                <div className="flex items-start justify-between gap-2 mb-3.5 relative z-10">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-md shadow-md border", style.iconBg)}>
                    <Icon className="w-5 h-5 text-white drop-shadow-sm" />
                  </div>

                  <div className="flex items-center gap-1">
                    {activity.isTeam && (
                      <span className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Users className="w-2.5 h-2.5" /> TAKIM
                      </span>
                    )}
                    {activity.badge && (
                      <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm">
                        {activity.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Kart Orta Kısım: Başlık ve Açıklama */}
                <div className="relative z-10 mb-3.5">
                  <h3 className="font-black text-base sm:text-lg text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors drop-shadow-sm">
                    {activity.label}
                  </h3>
                  <p className="text-[11px] text-white/80 font-medium line-clamp-2 mt-1 leading-snug">
                    {activity.description}
                  </p>
                </div>

                {/* Kart Alt Kısım: Başlat Butonu */}
                <div className="relative z-10 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs font-bold">
                  <span className="text-[11px] text-white/90">
                    {activity.isTeam ? "Sınıf Düellosu" : "Bireysel Mod"}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white text-slate-950 group-hover:bg-amber-300 transition-all px-3 py-1 rounded-full text-[11px] font-black shadow-md group-hover:shadow-[0_0_15px_rgba(252,211,77,0.6)]">
                    <span>BAŞLAT</span>
                    <Play className="w-2.5 h-2.5 fill-current" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-16">
            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">Aramanıza uygun oyun bulunamadı.</p>
            <Button variant="outline" size="sm" onClick={() => { setGameCategory('all'); setGameFilterQuery(""); }} className="mt-3 text-xs bg-white/5 border-white/10 text-white">
              Filtreleri Temizle
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
