

"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, ArrowLeft, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2, Mic, Pencil, ClipboardCheck, Coins, BrainCircuit, Milestone, Package, Wind, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';


const activityTypes = [
  { href: '/student/milyoner-yarismasi', label: 'Milyoner', icon: Trophy, colorClass: "bg-purple-600 hover:bg-purple-700 text-white" },
  { href: '/student/yazi-tura', label: 'Yazı Tura', icon: Coins, colorClass: "bg-amber-500 hover:bg-amber-600 text-white" },
  { href: '/student/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, colorClass: "bg-pink-500 hover:bg-pink-600 text-white" },
  { href: '/student/kelime-avi', label: 'Kelime Avı', icon: Search, colorClass: "bg-teal-600 hover:bg-teal-700 text-white" },
  { href: '/student/kutu-ac', label: 'Kutu Aç', icon: Package, colorClass: "bg-indigo-500 hover:bg-indigo-600 text-white" },
  { href: '/student/kavram-avi', label: 'Kavram Avı', icon: Crosshair, colorClass: "bg-cyan-600 hover:bg-cyan-700 text-white" },
  { href: '/student/eslestirme', label: 'Eşleştirme', icon: Puzzle, colorClass: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { href: '/student/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle, colorClass: "bg-orange-500 hover:bg-orange-600 text-white" },
  { href: '/student/olay-siralama', label: 'Olay Sıralama', icon: ArrowDownUp, colorClass: "bg-sky-600 hover:bg-sky-700 text-white" },
  { href: '/student/adam-asmaca', label: 'Adam Asmaca', icon: Skull, colorClass: "bg-slate-600 hover:bg-slate-700 text-white" },
  { href: '/student/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, colorClass: "bg-rose-600 hover:bg-rose-700 text-white" },
  { href: '/student/kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban, colorClass: "bg-lime-600 hover:bg-lime-700 text-white" },
  { href: '/student/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, colorClass: "bg-red-500 hover:bg-red-600 text-white" },
  { href: '/student/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, colorClass: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  { href: '/student/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, colorClass: "bg-green-600 hover:bg-green-700 text-white" },
  { href: '/student/ben-kimim', label: 'Ben Kimim?', icon: BrainCircuit, colorClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  { href: '/student/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, colorClass: "bg-gray-500 hover:bg-gray-600 text-white" },
  { href: '/student/ilim-hazinesi', label: 'İlim Hazinesi', icon: BookOpen, colorClass: "bg-violet-600 hover:bg-violet-700 text-white" },
  { href: '/student/labirent', label: 'Labirent', icon: Milestone, colorClass: "bg-gray-700 hover:bg-gray-800 text-white" },
  { href: '/student/soru-coz', label: 'Soru Çöz', icon: ClipboardCheck, colorClass: "bg-violet-500 hover:bg-violet-600 text-white" },
  { href: '/student/tornado', label: 'Tornado', icon: Wind, colorClass: "bg-gray-500 hover:bg-gray-600 text-white" },
];

export const dynamic = 'force-dynamic';

export default function StudentActivitiesPage() {

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                <Gamepad2 className="h-8 w-8 text-cyan-500"/>
                Etkinlikler
            </h1>
            <Button asChild variant="outline">
                <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4"/> Panele Dön</Link>
            </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {activityTypes.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity) => {
                const Icon = activity.icon;
                return (
                    <Button
                        key={activity.href}
                        asChild
                        className={cn(
                            "h-20 text-lg flex flex-col items-center justify-center gap-1 shadow-lg transform transition-transform hover:-translate-y-1 sm:h-32 sm:gap-2",
                            activity.colorClass
                        )}
                    >
                        <Link href={activity.href}>
                            <Icon className="h-6 w-6 sm:h-10 sm:w-10 mb-0 sm:mb-1" />
                            <span className="text-xs sm:text-sm text-center">{activity.label}</span>
                        </Link>
                    </Button>
                );
            })}
        </div>
    </div>
  );
}
