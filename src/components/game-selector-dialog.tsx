'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Gamepad2, Search, Sparkles, Trophy, Zap, Target, 
    Compass, Puzzle, Flame, Shield, HelpCircle, Layers, 
    ArrowRight, Rocket, Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityLinkStep } from '@/lib/types';

export type GameCatalogItem = {
    id: string;
    name: string;
    description: string;
    route: string;
    icon: React.ReactNode;
    badge: string;
    color: string;
    dataSource: 'Kavramlar' | 'Sorular' | 'Cümleler' | 'Genel';
};

export const AVAILABLE_GAMES: GameCatalogItem[] = [
    {
        id: 'kelime-avi',
        name: 'Kelime Avı',
        description: 'Konunun kavramlarıyla otomatik harf tablosu oluşturur, gizli kelimeler aranır.',
        route: '/oyunlar/kelime-avi/oyun',
        icon: <Search className="w-5 h-5 text-teal-400" />,
        badge: 'En Popüler',
        color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/40 hover:border-teal-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'carkifelek',
        name: 'Çarkıfelek',
        description: 'Konunun kavramları ve puanlarıyla çark çevirip soruları cevaplama oyunu.',
        route: '/oyunlar/carkifelek/oyun',
        icon: <Zap className="w-5 h-5 text-amber-400" />,
        badge: 'Heyecanlı',
        color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 hover:border-amber-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'balon-avcisi',
        name: 'Balon Avcısı',
        description: 'Ekranda uçuşan kavram balonlarını patlatarak doğru eşleşmeleri bulma.',
        route: '/oyunlar/balon-avcisi/oyun',
        icon: <Target className="w-5 h-5 text-rose-400" />,
        badge: 'Refleks',
        color: 'from-rose-500/20 to-pink-500/20 border-rose-500/40 hover:border-rose-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'eslestirme',
        name: 'Kavram Eşleştirme',
        description: 'Kavramlar ile tanımları sürükleyerek veya tıklayarak eşleştirme oyunu.',
        route: '/oyunlar/eslestirme/oyun',
        icon: <Puzzle className="w-5 h-5 text-indigo-400" />,
        badge: 'Öğretici',
        color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/40 hover:border-indigo-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'hafiza-kartlari',
        name: 'Hafıza Kartları',
        description: 'Gizli kartları çevirerek kavram çiftlerini ve tanımları eşleme.',
        route: '/oyunlar/hafiza-kartlari/oyun',
        icon: <Layers className="w-5 h-5 text-purple-400" />,
        badge: 'Hafıza',
        color: 'from-purple-500/20 to-fuchsia-500/20 border-purple-500/40 hover:border-purple-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'hedefi-vur',
        name: 'Hedefi Vur',
        description: 'Verilen tanıma ait doğru kavram hedefine atış yapma oyunu.',
        route: '/oyunlar/hedefi-vur/oyun',
        icon: <Target className="w-5 h-5 text-yellow-400" />,
        badge: 'Dikkat',
        color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/40 hover:border-yellow-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'tornado',
        name: 'Tornado Fırtınası',
        description: 'Zamanla yarışarak kavramları doğru kutulara yerleştirme fırtınası.',
        route: '/oyunlar/tornado/oyun',
        icon: <Flame className="w-5 h-5 text-orange-400" />,
        badge: 'Hızlı',
        color: 'from-orange-500/20 to-red-500/20 border-orange-500/40 hover:border-orange-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'kutu-ac',
        name: 'Kutu Açmace',
        description: 'Sürpriz numaralı kutuları seçip arkasındaki kavram ve soruları çözme.',
        route: '/oyunlar/kutu-ac/oyun',
        icon: <Trophy className="w-5 h-5 text-emerald-400" />,
        badge: 'Eğlenceli',
        color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 hover:border-emerald-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'kavram-avi',
        name: 'Kavram Avı',
        description: 'Sürekli hareket eden kavramlar arasından doğru olanı yakalama.',
        route: '/oyunlar/kavram-avi/oyun',
        icon: <Compass className="w-5 h-5 text-cyan-400" />,
        badge: 'Dinamik',
        color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 hover:border-cyan-400',
        dataSource: 'Kavramlar'
    },
    {
        id: 'dogru-yol-kosucusu',
        name: 'Doğru Yol Koşucusu',
        description: 'Doğru ve yanlış kapılarından geçerek bitiş çizgisine ulaşma.',
        route: '/oyunlar/dogru-yol-kosucusu/oyun',
        icon: <Zap className="w-5 h-5 text-green-400" />,
        badge: 'Macera',
        color: 'from-green-500/20 to-emerald-500/20 border-green-500/40 hover:border-green-400',
        dataSource: 'Sorular'
    },
    {
        id: 'uzay-savunmasi',
        name: 'Uzay Savunması',
        description: 'Gelen düşman göktaşlarındaki yanlış ifadeleri vurup doğruyu koruma.',
        route: '/oyunlar/uzay-savunmasi/oyun',
        icon: <Rocket className="w-5 h-5 text-sky-400" />,
        badge: 'Uzay',
        color: 'from-sky-500/20 to-indigo-500/20 border-sky-500/40 hover:border-sky-400',
        dataSource: 'Sorular'
    },
    {
        id: 'milyoner-yarismasi',
        name: 'Milyoner Yarışması',
        description: 'Konunun sorularıyla jokerler eşliğinde 1 Milyon puan yarışması.',
        route: '/oyunlar/milyoner-yarismasi/oyun',
        icon: <Trophy className="w-5 h-5 text-amber-300" />,
        badge: 'Yarışma',
        color: 'from-amber-600/20 to-yellow-500/20 border-amber-500/40 hover:border-amber-400',
        dataSource: 'Sorular'
    },
    {
        id: 'cumle-olusturma',
        name: 'Cümle Oluşturma',
        description: 'Karışık verilen kelimeleri doğru sıraya dizerek anlamlı cümle kurma.',
        route: '/oyunlar/cumle-olusturma/oyun',
        icon: <Puzzle className="w-5 h-5 text-indigo-400" />,
        badge: 'Cümle',
        color: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/40 hover:border-indigo-400',
        dataSource: 'Cümleler'
    },
    {
        id: 'fetih-oyunu',
        name: 'Fetih Oyunu',
        description: 'Konunun sorularını doğru cevaplayarak kaleleri fethetme strateji oyunu.',
        route: '/oyunlar/fetih-oyunu/oyun',
        icon: <Flag className="w-5 h-5 text-red-400" />,
        badge: 'Strateji',
        color: 'from-red-500/20 to-orange-500/20 border-red-500/40 hover:border-red-400',
        dataSource: 'Sorular'
    },
];

type GameSelectorDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onGameSelected: (step: ActivityLinkStep) => void;
    context: {
        courseId?: string;
        unitId?: string;
        topicId?: string;
        topicTitle?: string;
    };
};

export function GameSelectorDialog({
    isOpen,
    onOpenChange,
    onGameSelected,
    context
}: GameSelectorDialogProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'Kavramlar' | 'Sorular' | 'Cümleler'>('all');

    const filteredGames = AVAILABLE_GAMES.filter(game => {
        const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              game.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = selectedFilter === 'all' || game.dataSource === selectedFilter;
        return matchesSearch && matchesFilter;
    });

    const handleSelect = (game: GameCatalogItem) => {
        const newStep: ActivityLinkStep = {
            type: 'activityLink',
            title: `🎮 ${game.name} Etkinliği`,
            activityType: game.route,
            activityLabel: game.name,
            courseId: context.courseId,
            unitId: context.unitId,
            topicId: context.topicId,
            isPublished: true
        };

        onGameSelected(newStep);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl flex flex-col h-auto max-h-[90vh] bg-slate-950 border border-white/10 text-slate-100 shadow-2xl p-0 overflow-hidden rounded-3xl">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30 text-amber-400">
                                <Gamepad2 className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                    İnteraktif Oyun & Etkinlik Kataloğu
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    Sunum akışınıza doğrudan gömülü, seçili konunun verileriyle çalışan mini oyun ekleyin.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    {/* Filtre ve Arama */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Oyun ara (Kelime Avı, Çarkıfelek, vb.)..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div className="flex gap-1">
                            {(['all', 'Kavramlar', 'Sorular', 'Cümleler'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setSelectedFilter(filter)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                        selectedFilter === filter
                                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                            : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                                    )}
                                >
                                    {filter === 'all' ? 'Tümü' : filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogHeader>

                {/* Oyun Listesi */}
                <div className="p-6 overflow-y-auto max-h-[55vh] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredGames.map((game) => (
                        <div
                            key={game.id}
                            onClick={() => handleSelect(game)}
                            className={cn(
                                "group relative p-4 rounded-2xl border bg-gradient-to-br transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.02] shadow-md",
                                game.color
                            )}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                                        {game.icon}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-slate-950/60 border-white/10 text-slate-300">
                                        {game.badge}
                                    </Badge>
                                </div>
                                <h4 className="font-black text-sm text-white group-hover:text-amber-300 transition-colors mb-1">
                                    {game.name}
                                </h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                    {game.description}
                                </p>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    Kaynak: {game.dataSource}
                                </span>
                                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Ekle <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="p-4 px-6 border-t border-white/10 bg-slate-900/60 flex items-center justify-between sm:justify-between">
                    <span className="text-xs text-slate-500">
                        Seçilen oyun, konunun ({context.topicTitle || 'Seçili Konu'}) verilerini otomatik bağlayarak slayt olarak eklenir.
                    </span>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
                        Kapat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
