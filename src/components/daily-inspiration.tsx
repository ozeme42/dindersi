'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, MessageCircle, Heart, Star, ChevronLeft, ChevronRight, Book } from 'lucide-react';
import { cn } from "@/lib/utils";
import { VERSES, HADITHS, DUAS, ESMA } from './daily-inspiration-data';

const INSPIRE_TABS = [
  { key: 'ayet', label: 'Ayet', icon: BookOpen },
  { key: 'hadis', label: 'Hadis', icon: MessageCircle },
  { key: 'dua', label: 'Dua', icon: Heart },
  { key: 'esma', label: 'Esma', icon: Star },
];

export function DailyInspiration() {
  const [inspireTab, setInspireTab] = useState<'ayet'|'hadis'|'dua'|'esma'>('ayet');
  const [dailyIndex, setDailyIndex] = useState(0);
  const [esmaIndex, setEsmaIndex] = useState(0);

  useEffect(() => {
    const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    setDailyIndex(idx);
    setEsmaIndex(idx % ESMA.length);
  }, []);
  
  const dailyVerse = VERSES[dailyIndex % VERSES.length];
  const dailyHadith = HADITHS[dailyIndex % HADITHS.length];
  const dailyDua = DUAS[dailyIndex % DUAS.length];
  const currentEsma = ESMA[esmaIndex];
  
  const goNextEsma = () => setEsmaIndex(i => (i + 1) % ESMA.length);
  const goPrevEsma = () => setEsmaIndex(i => (i - 1 + ESMA.length) % ESMA.length);

  if (!dailyVerse) return null; // Hydration mismatch önlemi

  const renderAyet = () => (
    <div className="text-center flex flex-col h-full animate-in fade-in zoom-in duration-500 w-full">
        <p className="text-emerald-600 font-bold text-[10px] tracking-[0.2em] mb-4">GÜNÜN AYETİ</p>
        <p className="text-slate-700 text-lg font-medium italic leading-relaxed mb-4 flex-1 flex items-center justify-center">"{dailyVerse.text}"</p>
        <p className="text-slate-500 text-xs font-semibold">{dailyVerse.source}</p>
    </div>
  );

  const renderHadis = () => (
    <div className="text-center flex flex-col h-full animate-in fade-in zoom-in duration-500 w-full">
        <p className="text-indigo-600 font-bold text-[10px] tracking-[0.2em] mb-4">GÜNÜN HADİSİ</p>
        <p className="text-slate-700 text-lg font-medium italic leading-relaxed mb-4 flex-1 flex items-center justify-center">"{dailyHadith.text}"</p>
        <p className="text-slate-500 text-xs font-semibold">{dailyHadith.source}</p>
    </div>
  );

  const renderDua = () => (
    <div className="text-center flex flex-col h-full animate-in fade-in zoom-in duration-500 w-full">
        <p className="text-amber-600 font-bold text-[10px] tracking-[0.2em] mb-3">GÜNÜN DUASI</p>
        <div className="flex-1 flex flex-col justify-center mb-3">
            <p className="text-amber-800 text-3xl font-bold leading-relaxed mb-3 font-serif" dir="rtl">{dailyDua.arabic}</p>
            <p className="text-slate-700 text-base font-medium italic leading-relaxed">"{dailyDua.text}"</p>
        </div>
        <p className="text-slate-500 text-xs font-semibold">{dailyDua.name} - {dailyDua.source}</p>
    </div>
  );

  const renderEsma = () => (
    <div className="w-full flex flex-col h-full animate-in fade-in zoom-in duration-500">
        <div className="flex justify-between items-center mb-4 w-full">
            <p className="text-cyan-600 font-bold text-[10px] tracking-[0.2em]">ESMÂÜ'L-HÜSNÂ</p>
            <p className="text-slate-500 text-xs font-bold">{esmaIndex + 1} / 99</p>
        </div>
        <div className="text-center mb-6 flex-1 flex flex-col justify-center">
            {currentEsma && (
                <>
                    <p className="text-cyan-800 text-4xl font-bold mb-2 font-serif" dir="rtl">{currentEsma.arabic}</p>
                    <p className="text-slate-800 text-xl font-bold mb-2">{currentEsma.name}</p>
                    <p className="text-slate-600 text-sm italic">{currentEsma.meaning}</p>
                </>
            )}
        </div>
        <div className="flex items-center justify-between w-full mt-auto">
            <button onClick={goPrevEsma} className="p-2 bg-slate-50 hover:bg-cyan-50 rounded-full transition-colors border border-slate-100">
                <ChevronLeft className="w-5 h-5 text-cyan-600" />
            </button>
            <button onClick={goNextEsma} className="p-2 bg-slate-50 hover:bg-cyan-50 rounded-full transition-colors border border-slate-100">
                <ChevronRight className="w-5 h-5 text-cyan-600" />
            </button>
        </div>
    </div>
  );

  const CardContainer = ({ children, watermarkIcon: Icon, colorClass }: any) => (
    <div className={cn("relative bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col min-h-[260px] w-full", colorClass)}>
        <div className="absolute -left-6 top-4 opacity-[0.03] pointer-events-none">
            <Icon className="w-48 h-48" />
        </div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            {children}
        </div>
    </div>
  );

  return (
    <section className="w-full mt-8 md:mt-0">
        <div className="flex items-center justify-between mb-4 px-1 lg:hidden">
            <h2 className="text-slate-800 font-extrabold text-sm uppercase tracking-[0.15em] flex items-center gap-2">
                <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block" />
                Günün İlhamı
            </h2>
        </div>

        {/* --- MOBİL İÇİN SEKME GÖRÜNÜMÜ --- */}
        <div className="lg:hidden">
            <div className="flex bg-white/60 p-1.5 rounded-[2rem] mb-4 border border-slate-200 backdrop-blur-md shadow-sm">
                {INSPIRE_TABS.map(tab => {
                    const isActive = inspireTab === tab.key;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setInspireTab(tab.key as any)}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center py-2.5 rounded-[1.5rem] transition-all duration-300",
                                isActive ? "bg-emerald-50 border border-emerald-200 shadow-sm" : "border border-transparent hover:bg-slate-50 text-slate-400"
                            )}
                        >
                            <Icon className={cn("w-4 h-4 mb-1", isActive ? "text-emerald-600" : "text-slate-400")} />
                            <span className={cn("text-[10px] uppercase tracking-widest font-bold", isActive ? "text-emerald-700" : "text-slate-500")}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            {inspireTab === 'ayet' && <CardContainer watermarkIcon={Book} colorClass="border-emerald-100 text-emerald-600">{renderAyet()}</CardContainer>}
            {inspireTab === 'hadis' && <CardContainer watermarkIcon={MessageCircle} colorClass="border-indigo-100 text-indigo-600">{renderHadis()}</CardContainer>}
            {inspireTab === 'dua' && <CardContainer watermarkIcon={Heart} colorClass="border-amber-100 text-amber-600">{renderDua()}</CardContainer>}
            {inspireTab === 'esma' && <CardContainer watermarkIcon={Star} colorClass="border-cyan-100 text-cyan-600">{renderEsma()}</CardContainer>}
        </div>

        {/* --- MASAÜSTÜ İÇİN GRID GÖRÜNÜMÜ --- */}
        <div className="hidden lg:block">
            <div className="flex items-center justify-center mb-6">
                <h2 className="text-slate-800 font-extrabold text-base uppercase tracking-[0.15em] flex items-center gap-3">
                    <span className="w-1.5 h-5 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full inline-block shadow-sm" />
                    Günün İlhamı
                </h2>
            </div>
            <div className="grid grid-cols-4 gap-6">
                <CardContainer watermarkIcon={Book} colorClass="border-emerald-100 text-emerald-600 hover:border-emerald-300">{renderAyet()}</CardContainer>
                <CardContainer watermarkIcon={MessageCircle} colorClass="border-indigo-100 text-indigo-600 hover:border-indigo-300">{renderHadis()}</CardContainer>
                <CardContainer watermarkIcon={Heart} colorClass="border-amber-100 text-amber-600 hover:border-amber-300">{renderDua()}</CardContainer>
                <CardContainer watermarkIcon={Star} colorClass="border-cyan-100 text-cyan-600 hover:border-cyan-300">{renderEsma()}</CardContainer>
            </div>
        </div>
    </section>
  );
}
