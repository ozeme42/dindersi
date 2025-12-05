'use client';

import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownUp, BrainCircuit, ClipboardCheck, Coins, Crosshair, FolderKanban, Gamepad2, Layers, Lightbulb, Link2, MonitorPlay, MousePointerClick, Pencil, Puzzle, Search, Shuffle, Skull, Trophy } from 'lucide-react';
import Link from 'next/link';

const activityTypes = [
  { href: '/student/milyoner-yarismasi', label: 'Milyoner', icon: Trophy, colorClass: "from-purple-500 to-purple-800 border-purple-500/50 text-purple-100 hover:shadow-purple-500/40" },
  { href: '/student/yazi-tura', label: 'Yazı Tura', icon: Coins, colorClass: "from-amber-500 to-amber-800 border-amber-500/50 text-amber-100 hover:shadow-amber-500/40" },
  { href: '/student/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, colorClass: "from-pink-500 to-pink-800 border-pink-500/50 text-pink-100 hover:shadow-pink-500/40" },
  { href: '/student/kelime-avi', label: 'Kelime Avı', icon: Search, colorClass: "from-teal-500 to-teal-800 border-teal-500/50 text-teal-100 hover:shadow-teal-500/40" },
  { href: '/student/kavram-avi', label: 'Kavram Avı', icon: Crosshair, colorClass: "from-cyan-500 to-cyan-800 border-cyan-500/50 text-cyan-100 hover:shadow-cyan-500/40" },
  { href: '/student/eslestirme', label: 'Eşleştirme', icon: Puzzle, colorClass: "from-indigo-500 to-indigo-800 border-indigo-500/50 text-indigo-100 hover:shadow-indigo-500/40" },
  { href: '/student/cumle-olusturma', label: 'Cümle Oluşturma', icon: Shuffle, colorClass: "from-orange-500 to-orange-800 border-orange-500/50 text-orange-100 hover:shadow-orange-500/40" },
  { href: '/student/olay-siralama', label: 'Olay Sıralama', icon: ArrowDownUp, colorClass: "from-sky-500 to-sky-800 border-sky-500/50 text-sky-100 hover:shadow-sky-500/40" },
  { href: '/student/adam-asmaca', label: 'Adam Asmaca', icon: Skull, colorClass: "from-slate-500 to-slate-800 border-slate-500/50 text-slate-100 hover:shadow-slate-500/40" },
  { href: '/student/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, colorClass: "from-rose-500 to-rose-800 border-rose-500/50 text-rose-100 hover:shadow-rose-500/40" },
  { href: '/student/kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban, colorClass: "from-lime-500 to-lime-800 border-lime-500/50 text-lime-100 hover:shadow-lime-500/40" },
  { href: '/student/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, colorClass: "from-red-500 to-red-800 border-red-500/50 text-red-100 hover:shadow-red-500/40" },
  { href: '/student/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, colorClass: "from-yellow-500 to-yellow-800 border-yellow-500/50 text-yellow-100 hover:shadow-yellow-500/40" },
  { href: '/student/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, colorClass: "from-green-500 to-green-800 border-green-500/50 text-green-100 hover:shadow-green-500/40" },
  { href: '/student/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, colorClass: "from-blue-500 to-blue-800 border-blue-500/50 text-blue-100 hover:shadow-blue-500/40" },
  { href: '/student/deneme', label: 'Deneme Sınavı', icon: ClipboardCheck, colorClass: "from-indigo-500 to-indigo-800 border-indigo-500/50 text-indigo-100 hover:shadow-indigo-500/40" },
];


export default function TeacherActivitiesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      <AppHeader />
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
        <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-3xl">
                    <Gamepad2 className="w-8 h-8 text-primary" />
                    Etkinlik Merkezi (Test Alanı)
                </CardTitle>
                <CardDescription>
                    Öğrencilerin oynayabileceği tüm bireysel etkinlikleri buradan test edebilirsiniz. Her oyunun kurulum ekranına yönlendirileceksiniz.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
                    {activityTypes.map((activity) => {
                        const Icon = activity.icon;
                        return (
                        <Link
                            key={activity.href}
                            href={activity.href}
                            className={cn(
                                "relative overflow-hidden rounded-2xl p-4 h-28 sm:h-36 flex flex-col items-center justify-center gap-2 text-center transition-all duration-300 border bg-gradient-to-br shadow-lg hover:scale-105 hover:-translate-y-1",
                                activity.colorClass
                            )}
                        >
                            <Icon className="h-10 w-10 sm:h-12 sm:w-12 opacity-80" />
                            <span className="font-bold text-sm sm:text-base">{activity.label}</span>
                        </Link>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
