"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
    Gamepad2, ArrowLeft, Search, Crosshair, Shuffle, Lightbulb, 
    Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, 
    ArrowDownUp, Link2, Mic, Pencil, ClipboardCheck, Coins, 
    BrainCircuit, Milestone, Package, Wind, BookOpen, Play, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- MOCK LINK COMPONENT (Fix for next/link error) ---
const Link = ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
        {children}
    </a>
);

// --- THEME CONFIGURATION ---

type GameTheme = 'purple' | 'amber' | 'pink' | 'teal' | 'indigo' | 'cyan' | 'orange' | 'slate' | 'rose' | 'red' | 'yellow' | 'green' | 'gray' | 'violet' | 'blue';

interface ActivityItem {
    href: string;
    label: string;
    icon: any;
    theme: GameTheme;
    difficulty?: number; // 1-3 stars visual
}

// Helper to map original items to themes
const activityTypes: ActivityItem[] = [
  { href: '/student/milyoner-yarismasi', label: 'Milyoner', icon: Trophy, theme: 'purple', difficulty: 3 },
  { href: '/student/yazi-tura', label: 'Yazı Tura', icon: Coins, theme: 'amber', difficulty: 1 },
  { href: '/student/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, theme: 'pink', difficulty: 3 },
  { href: '/student/kelime-avi', label: 'Kelime Avı', icon: Search, theme: 'teal', difficulty: 2 },
  { href: '/student/kutu-ac', label: 'Kutu Aç', icon: Package, theme: 'indigo', difficulty: 1 },
  { href: '/student/kavram-avi', label: 'Kavram Avı', icon: Crosshair, theme: 'cyan', difficulty: 2 },
  { href: '/student/eslestirme', label: 'Eşleştirme', icon: Puzzle, theme: 'blue', difficulty: 1 },
  { href: '/student/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle, theme: 'orange', difficulty: 2 },
  { href: '/student/adam-asmaca', label: 'Adam Asmaca', icon: Skull, theme: 'slate', difficulty: 2 },
  { href: '/student/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, theme: 'rose', difficulty: 2 },
  { href: '/student/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, theme: 'red', difficulty: 1 },
  { href: '/student/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, theme: 'yellow', difficulty: 2 },
  { href: '/student/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, theme: 'green', difficulty: 1 },
  { href: '/student/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, theme: 'gray', difficulty: 3 },
  { href: '/student/ilim-hazinesi', label: 'İlim Hazinesi', icon: BookOpen, theme: 'violet', difficulty: 3 },
  { href: '/student/labirent', label: 'Labirent', icon: Milestone, theme: 'slate', difficulty: 2 },
  { href: '/student/soru-coz', label: 'Soru Çöz', icon: ClipboardCheck, theme: 'violet', difficulty: 2 },
  { href: '/student/tornado', label: 'Tornado', icon: Wind, theme: 'gray', difficulty: 3 },
];

// --- COMPONENTS ---

const getThemeStyles = (theme: GameTheme) => {
    const styles = {
        purple: "from-purple-600 to-indigo-600 border-purple-400 shadow-purple-500/40 text-purple-100",
        amber: "from-amber-400 to-orange-500 border-amber-300 shadow-amber-500/40 text-amber-50",
        pink: "from-pink-500 to-rose-500 border-pink-400 shadow-pink-500/40 text-pink-50",
        teal: "from-teal-500 to-emerald-500 border-teal-400 shadow-teal-500/40 text-teal-50",
        indigo: "from-indigo-500 to-blue-600 border-indigo-400 shadow-indigo-500/40 text-indigo-50",
        cyan: "from-cyan-500 to-sky-500 border-cyan-400 shadow-cyan-500/40 text-cyan-50",
        orange: "from-orange-500 to-red-500 border-orange-400 shadow-orange-500/40 text-orange-50",
        slate: "from-slate-600 to-slate-800 border-slate-400 shadow-slate-500/40 text-slate-100",
        rose: "from-rose-500 to-pink-600 border-rose-400 shadow-rose-500/40 text-rose-50",
        red: "from-red-500 to-rose-600 border-red-400 shadow-red-500/40 text-red-50",
        yellow: "from-yellow-400 to-amber-500 border-yellow-300 shadow-yellow-500/40 text-yellow-50",
        green: "from-green-500 to-emerald-600 border-green-400 shadow-green-500/40 text-green-50",
        gray: "from-gray-500 to-slate-600 border-gray-400 shadow-gray-500/40 text-gray-100",
        violet: "from-violet-600 to-purple-600 border-violet-400 shadow-violet-500/40 text-violet-50",
        blue: "from-blue-500 to-indigo-500 border-blue-400 shadow-blue-500/40 text-blue-50",
    };
    return styles[theme] || styles.indigo;
};

const GameCard = ({ activity }: { activity: ActivityItem }) => {
    const themeClass = getThemeStyles(activity.theme);
    const Icon = activity.icon;

    return (
        <Link href={activity.href} className="group relative w-full h-full">
            <div className={cn(
                "relative h-32 sm:h-40 w-full overflow-hidden rounded-3xl border-b-[6px] transition-all duration-300 transform group-hover:-translate-y-2 group-hover:scale-[1.02]",
                "bg-gradient-to-br shadow-xl group-active:translate-y-0 group-active:border-b-2",
                themeClass
            )}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                
                {/* Shine Effect */}
                <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />

                <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center">
                    {/* Icon Container */}
                    <div className="mb-2 p-2 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6">
                        <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-md" />
                    </div>

                    {/* Label */}
                    <h3 className="font-black text-sm sm:text-lg tracking-tight leading-none text-white drop-shadow-md uppercase">
                        {activity.label}
                    </h3>

                    {/* Play Button Overlay (Visible on Hover) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white text-black font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 transform scale-50 group-hover:scale-100 transition-transform duration-200">
                            <Play className="h-3 w-3 fill-black" /> OYNA
                        </div>
                    </div>

                    {/* Difficulty Stars (Optional Visual) */}
                    {activity.difficulty && (
                        <div className="absolute top-2 right-2 flex gap-0.5 opacity-60">
                            {[...Array(activity.difficulty)].map((_, i) => (
                                <Star key={i} className="h-2 w-2 fill-white text-white" />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};

export const dynamic = 'force-dynamic';

export default function StudentActivitiesPage() {
    // Sort alphabetically for UX
    const sortedActivities = [...activityTypes].sort((a, b) => a.label.localeCompare(b.label, 'tr'));

    return (
        <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-20 md:pb-8 font-sans selection:bg-purple-500/30">
            <div className="max-w-7xl mx-auto">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                            <Gamepad2 className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 uppercase tracking-wide">
                                Arcade Salonu
                            </h1>
                            <p className="text-cyan-200/60 text-sm font-medium">Favori oyununu seç ve puanları topla!</p>
                        </div>
                    </div>
                    
                    <Link href="/student">
                        <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20 rounded-full px-6 gap-2 h-12">
                            <ArrowLeft className="h-4 w-4" /> 
                            <span>Ana Üsse Dön</span>
                        </Button>
                    </Link>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                    {sortedActivities.map((activity) => (
                        <GameCard key={activity.href} activity={activity} />
                    ))}
                </div>

            </div>
        </div>
    );
}
