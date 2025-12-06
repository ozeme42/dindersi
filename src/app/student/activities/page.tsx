"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Gamepad2, ArrowLeft, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, 
  Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2, 
  Pencil, ClipboardCheck, Coins, BrainCircuit, Milestone, Package, Wind, BookOpen, Star 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Renk Haritası (Gradient ve Gölgeler için)
const colorMap: Record<string, string> = {
    purple: "from-purple-600 to-purple-900 border-purple-500/50 text-purple-100 hover:shadow-purple-500/40",
    amber: "from-amber-500 to-amber-800 border-amber-500/50 text-amber-100 hover:shadow-amber-500/40",
    pink: "from-pink-500 to-pink-800 border-pink-500/50 text-pink-100 hover:shadow-pink-500/40",
    teal: "from-teal-500 to-teal-800 border-teal-500/50 text-teal-100 hover:shadow-teal-500/40",
    indigo: "from-indigo-500 to-indigo-800 border-indigo-500/50 text-indigo-100 hover:shadow-indigo-500/40",
    cyan: "from-cyan-500 to-cyan-800 border-cyan-500/50 text-cyan-100 hover:shadow-cyan-500/40",
    blue: "from-blue-600 to-blue-900 border-blue-500/50 text-blue-100 hover:shadow-blue-500/40",
    orange: "from-orange-500 to-orange-800 border-orange-500/50 text-orange-100 hover:shadow-orange-500/40",
    sky: "from-sky-500 to-sky-800 border-sky-500/50 text-sky-100 hover:shadow-sky-500/40",
    rose: "from-rose-500 to-rose-800 border-rose-500/50 text-rose-100 hover:shadow-rose-500/40",
    emerald: "from-emerald-500 to-emerald-800 border-emerald-500/50 text-emerald-100 hover:shadow-emerald-500/40",
    lime: "from-lime-500 to-lime-800 border-lime-500/50 text-lime-100 hover:shadow-lime-500/40",
    red: "from-red-500 to-red-800 border-red-500/50 text-red-100 hover:shadow-red-500/40",
    yellow: "from-yellow-500 to-yellow-800 border-yellow-500/50 text-yellow-100 hover:shadow-yellow-500/40",
    green: "from-green-500 to-green-800 border-green-500/50 text-green-100 hover:shadow-green-500/40",
    fuchsia: "from-fuchsia-500 to-fuchsia-800 border-fuchsia-500/50 text-fuchsia-100 hover:shadow-fuchsia-500/40",
    slate: "from-slate-500 to-slate-800 border-slate-500/50 text-slate-100 hover:shadow-slate-500/40",
    violet: "from-violet-500 to-violet-800 border-violet-500/50 text-violet-100 hover:shadow-violet-500/40",
    zinc: "from-zinc-500 to-zinc-800 border-zinc-500/50 text-zinc-100 hover:shadow-zinc-500/40",
};

const activityTypes = [
  { href: '/oyunlar/milyoner-yarismasi', label: 'Milyoner', icon: Trophy, color: 'purple' },
  { href: '/oyunlar/yazi-tura', label: 'Yazı Tura', icon: Coins, color: 'amber' },
  { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, color: 'pink' },
  { href: '/oyunlar/kelime-avi', label: 'Kelime Avı', icon: Search, color: 'teal' },
  { href: '/oyunlar/kutu-ac', label: 'Kutu Aç', icon: Package, color: 'indigo' },
  { href: '/oyunlar/kavram-avi', label: 'Kavram Avı', icon: Crosshair, color: 'cyan' },
  { href: '/oyunlar/eslestirme', label: 'Eşleştirme', icon: Puzzle, color: 'blue' },
  { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle, color: 'orange' },
  { href: '/oyunlar/olay-siralama', label: 'Olay Sıralama', icon: ArrowDownUp, color: 'sky' },
  { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca', icon: Skull, color: 'rose' },
  { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, color: 'emerald' },
  { href: '/oyunlar/kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban, color: 'lime' },
  { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, color: 'red' },
  { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, color: 'yellow' },
  { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, color: 'green' },
  { href: '/oyunlar/ben-kimim', label: 'Ben Kimim?', icon: BrainCircuit, color: 'fuchsia' },
  { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, color: 'slate' },
  { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi', icon: BookOpen, color: 'violet' },
  { href: '/oyunlar/labirent', label: 'Labirent', icon: Milestone, color: 'zinc' },
  { href: '/oyunlar/soru-coz', label: 'Soru Çöz', icon: ClipboardCheck, color: 'indigo' },
  { href: '/oyunlar/tornado', label: 'Tornado', icon: Wind, color: 'cyan' },
];

// Arkaplan Efekti
const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-900/10 rounded-full blur-[120px]" />
    </div>
);

export const dynamic = 'force-dynamic';

export default function StudentActivitiesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
        <GameBackground />
        
        <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-12 relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 backdrop-blur-md">
                        <Gamepad2 className="h-8 w-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                            ETKİNLİK <span className="text-cyan-400">MERKEZİ</span>
                        </h1>
                        <p className="text-slate-400 text-sm">Kendini geliştir, eğlen ve kazan!</p>
                    </div>
                </div>
                
                <Button asChild variant="ghost" className="bg-slate-900/50 hover:bg-slate-800 border border-white/10 text-slate-300 rounded-xl h-12 px-6">
                    <Link href="/student"><ArrowLeft className="mr-2 h-5 w-5"/> Panele Dön</Link>
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                {activityTypes.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity) => {
                    const Icon = activity.icon;
                    const styleClass = colorMap[activity.color] || colorMap['slate'];

                    return (
                        <Link key={activity.href} href={activity.href} className="group block h-full">
                            <div className={cn(
                                "relative overflow-hidden rounded-2xl p-4 h-28 sm:h-36 flex flex-col items-center justify-center gap-2 text-center transition-all duration-300 border bg-gradient-to-br shadow-lg",
                                styleClass,
                                "hover:scale-105 hover:-translate-y-1"
                            )}>
                                {/* Arkaplan Dekoru (Büyük İkon) */}
                                <Icon className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                                
                                {/* Işıltı Efekti */}
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                {/* Ön Yüz */}
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm group-hover:bg-black/30 transition-colors">
                                        <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold leading-tight line-clamp-2 px-1">
                                        {activity.label}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    </div>
  );
}
