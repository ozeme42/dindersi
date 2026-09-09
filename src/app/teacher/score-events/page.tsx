'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Trash2, ArrowLeft, ArrowRight, X, Home, CheckCircle2, AlertCircle, BookOpen, Search } from 'lucide-react';
import { getScoreEvents, deleteScoreEvents, type EnrichedScoreEvent } from './actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
} | null;

const GAME_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    // Soru Bankası / Test
    'soru-bankasi': { label: 'Soru Bankası', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' },
    'Soru Bankası': { label: 'Soru Bankası', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' },
    'test': { label: 'Soru Bankası (Test)', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' },

    // Kim 1000 Puan İster?
    'milyoner-yarismasi': { label: 'Kim 1000 Puan İster?', color: 'bg-amber-950/80 text-amber-300 border-amber-500/30' },
    'Kim 1000 Puan İster?': { label: 'Kim 1000 Puan İster?', color: 'bg-amber-950/80 text-amber-300 border-amber-500/30' },

    // Kelime Avı
    'kelime-avi': { label: 'Kelime Avı', color: 'bg-sky-950/80 text-sky-300 border-sky-500/30' },
    'Kelime Avı': { label: 'Kelime Avı', color: 'bg-sky-950/80 text-sky-300 border-sky-500/30' },
    'Kelime Oyunu': { label: 'Kelime Avı', color: 'bg-sky-950/80 text-sky-300 border-sky-500/30' },

    // İlim Hazinesi
    'ilim-hazinesi': { label: 'İlim Hazinesi', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' },
    'İlim Hazinesi': { label: 'İlim Hazinesi', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' },

    // Hedefi Vur
    'hedefi-vur': { label: 'Hedefi Vur', color: 'bg-rose-950/80 text-rose-300 border-rose-500/30' },
    'Hedefi Vur': { label: 'Hedefi Vur', color: 'bg-rose-950/80 text-rose-300 border-rose-500/30' },

    // Adam Asmaca
    'adam-asmaca': { label: 'Adam Asmaca', color: 'bg-orange-950/80 text-orange-300 border-orange-500/30' },
    'Adam Asmaca': { label: 'Adam Asmaca', color: 'bg-orange-950/80 text-orange-300 border-orange-500/30' },

    // Kavram Avı
    'kavram-avi': { label: 'Kavram Avı', color: 'bg-purple-950/80 text-purple-300 border-purple-500/30' },
    'Kavram Avı': { label: 'Kavram Avı', color: 'bg-purple-950/80 text-purple-300 border-purple-500/30' },

    // Cümle Ustası
    'cumle-ustasi': { label: 'Cümle Ustası', color: 'bg-teal-950/80 text-teal-300 border-teal-500/30' },
    'cumle-olusturma': { label: 'Cümle Ustası', color: 'bg-teal-950/80 text-teal-300 border-teal-500/30' },
    'Cümle Oluşturma': { label: 'Cümle Ustası', color: 'bg-teal-950/80 text-teal-300 border-teal-500/30' },
    'Cümle Ustası': { label: 'Cümle Ustası', color: 'bg-teal-950/80 text-teal-300 border-teal-500/30' },

    // Eşleştirme
    'eslestirme': { label: 'Eşleştirme', color: 'bg-blue-950/80 text-blue-300 border-blue-500/30' },
    'Eşleştirme': { label: 'Eşleştirme', color: 'bg-blue-950/80 text-blue-300 border-blue-500/30' },

    // Doğru Yanlış Zinciri
    'dogru-yanlis-zinciri': { label: 'D/Y Zinciri', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' },
    'Doğru/Yanlış Zinciri': { label: 'D/Y Zinciri', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' },

    // Bil Bakalım
    'bil-bakalim': { label: 'Bil Bakalım', color: 'bg-violet-950/80 text-violet-300 border-violet-500/30' },
    'Bil Bakalım': { label: 'Bil Bakalım', color: 'bg-violet-950/80 text-violet-300 border-violet-500/30' },

    // Siber Şifre Kırıcı
    'siber-sifre-kirici': { label: 'Siber Şifre Kırıcı', color: 'bg-green-950/80 text-green-300 border-green-500/30' },
    'game_siber_sifre_kirici': { label: 'Siber Şifre Kırıcı', color: 'bg-green-950/80 text-green-300 border-green-500/30' },
    'Siber Şifre Kırıcı': { label: 'Siber Şifre Kırıcı', color: 'bg-green-950/80 text-green-300 border-green-500/30' },

    // Gol Kralı
    'gol-krali': { label: 'Gol Kralı', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' },
    'Gol Kralı': { label: 'Gol Kralı', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' },

    // Yazı Tura
    'yazi-tura': { label: 'Yazı Tura', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/30' },
    'Yazı Tura': { label: 'Yazı Tura', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/30' },

    // Kavram Yarışması
    'kavram-yarismasi': { label: 'Kavram Yarışması', color: 'bg-pink-950/80 text-pink-300 border-pink-500/30' },
    'Kavram Yarışması': { label: 'Kavram Yarışması', color: 'bg-pink-950/80 text-pink-300 border-pink-500/30' },

    // Ders & Konu Tamamlama
    'tamamlama': { label: 'Konu Tamamlama', color: 'bg-amber-900/60 text-amber-200 border-amber-500/40' },
    'topic-completion-reward': { label: 'Konu Tamamlama', color: 'bg-amber-900/60 text-amber-200 border-amber-500/40' },
    'Ders Tamamlama': { label: 'Ders Tamamlama', color: 'bg-amber-900/60 text-amber-200 border-amber-500/40' },

    // Diğer Oyunlar
    'acik-uclu': { label: 'Açık Uçlu', color: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/30' },
    'Açık Uçlu Cevaplama': { label: 'Açık Uçlu', color: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/30' },
    'kutu-ac': { label: 'Kutu Aç', color: 'bg-amber-950/80 text-amber-300 border-amber-500/30' },
    'Kutu Aç': { label: 'Kutu Aç', color: 'bg-amber-950/80 text-amber-300 border-amber-500/30' },
    'balon-avcisi': { label: 'Balon Avcısı', color: 'bg-red-950/80 text-red-300 border-red-500/30' },
    'Balon Avcısı': { label: 'Balon Avcısı', color: 'bg-red-950/80 text-red-300 border-red-500/30' },
    'labirent': { label: 'Labirent', color: 'bg-lime-950/80 text-lime-300 border-lime-500/30' },
    'Labirent': { label: 'Labirent', color: 'bg-lime-950/80 text-lime-300 border-lime-500/30' },
    'ozet-kartlari': { label: 'Özet Kartları', color: 'bg-pink-950/80 text-pink-300 border-pink-500/30' },
    'Özet Okuma (Tinder Modu)': { label: 'Özet Kartları', color: 'bg-pink-950/80 text-pink-300 border-pink-500/30' },
    'uzay-savunmasi': { label: 'Uzay Savunması', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' },
    'Uzay Savunması': { label: 'Uzay Savunması', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' },
    'hafiza-kartlari': { label: 'Hafıza Kartları', color: 'bg-purple-950/80 text-purple-300 border-purple-500/30' },
    'Hafıza Kartları': { label: 'Hafıza Kartları', color: 'bg-purple-950/80 text-purple-300 border-purple-500/30' },
    'tornado': { label: 'Tornado', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' },
    'Tornado': { label: 'Tornado', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' },
    'dogru-yol-kosucusu': { label: 'Doğru Yol Koşucusu', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' },
    'Doğru Yol Koşucusu': { label: 'Doğru Yol Koşucusu', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' },
    'carkifelek': { label: 'Çarkıfelek', color: 'bg-orange-950/80 text-orange-300 border-orange-500/30' },
    'Çarkıfelek': { label: 'Çarkıfelek', color: 'bg-orange-950/80 text-orange-300 border-orange-500/30' },

    // Öğretmen & Sistem
    'manual_reward': { label: 'Öğretmen Puanı (+)', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40' },
    'manual_penalty': { label: 'Öğretmen Puanı (-)', color: 'bg-rose-900/60 text-rose-300 border-rose-500/40' },
    'daily_bonus': { label: 'Günlük Bonus', color: 'bg-amber-900/60 text-amber-300 border-amber-500/40' },
    'holiday_reward': { label: 'Tatil Ödülü', color: 'bg-violet-900/60 text-violet-300 border-violet-500/40' },
};

export default function ScoreEventsPage() {
    const [events, setEvents] = useState<EnrichedScoreEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    
    // Filtreler
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [showOnlyExcessiveAttempts, setShowOnlyExcessiveAttempts] = useState(false);
    const [filterGameType, setFilterGameType] = useState<string>('all');
    
    const { toast } = useToast();
    
    // Pagination
    const [pageCursors, setPageCursors] = useState<(SerializableTimestamp | undefined | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Debounce arama
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 400);

        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Veri Çekme
    const fetchData = useCallback(async (cursorToUse: SerializableTimestamp | null | undefined, targetPageIndex: number) => {
        setIsLoading(true);
        try {
            const result = await getScoreEvents({ 
                cursor: cursorToUse || null, 
                direction: 'next',
                searchTerm: debouncedSearchTerm,
                showOnlyExcessiveAttempts,
                filterGameType
            });
    
            if (result.success && result.data) {
                setEvents(result.data);
                
                if (result.lastVisible) {
                    setPageCursors(prev => {
                        const newCursors = [...prev];
                        if (targetPageIndex + 1 >= newCursors.length) {
                             newCursors[targetPageIndex + 1] = result.lastVisible;
                        }
                        return newCursors;
                    });
                }
            } else {
                toast({ title: "Hata", description: result.error || "Veri alınamadı", variant: "destructive" });
                setEvents([]);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast({ title: "Kritik Hata", description: "Veri çekilirken bir sorun oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearchTerm, showOnlyExcessiveAttempts, filterGameType, toast]);

    // Filtre Değişiminde Başa Dön
    useEffect(() => {
        setPageCursors([null]);
        setCurrentPageIndex(0);
        fetchData(null, 0);
    }, [debouncedSearchTerm, showOnlyExcessiveAttempts, filterGameType, fetchData]);

    // Sayfalama
    const handleNextPage = () => {
        const nextIndex = currentPageIndex + 1;
        const nextCursor = pageCursors[nextIndex];
        
        if (nextCursor !== undefined) {
            setCurrentPageIndex(nextIndex);
            fetchData(nextCursor, nextIndex);
        }
    };

    const handlePrevPage = () => {
        if (currentPageIndex > 0) {
            const prevIndex = currentPageIndex - 1;
            const prevCursor = pageCursors[prevIndex];
            
            setCurrentPageIndex(prevIndex);
            fetchData(prevCursor, prevIndex);
        }
    };

    // Seçim ve Silme
    const handleSelect = (id: string) => {
        setSelectedEventIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAllOnPage = (isChecked: boolean) => {
        if (isChecked) setSelectedEventIds(new Set(events.map(e => e.id)));
        else setSelectedEventIds(new Set());
    };

    const handleDeleteSelected = async () => {
        setIsDeleting(true);
        const result = await deleteScoreEvents(Array.from(selectedEventIds));
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Seçilen kayıtlar silindi.' });
            setSelectedEventIds(new Set());
            fetchData(pageCursors[currentPageIndex] || null, currentPageIndex);
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsDeleting(false);
    };

    const isAllOnPageSelected = events.length > 0 && selectedEventIds.size === events.length && events.every(e => selectedEventIds.has(e.id));
    
    const isLastPage = useMemo(() => {
        const itemsPerPage = 20;
        return events.length < itemsPerPage;
    }, [events]);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-purple-400"/> Puan Hareketleri
                    </h1>
                    <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                        <Link href="/teacher"><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                    </Button>
                </div>

                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-black text-white flex items-center gap-2">
                                    Puan Kayıtları
                                </CardTitle>
                                <CardDescription className="text-slate-400 mt-2">
                                    Sistemdeki tüm etkinlik, test ve oyun puanı kazanma/kaybetme hareketleri.
                                </CardDescription>
                            </div>
                            {selectedEventIds.size > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={isDeleting} className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20">
                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                                            {selectedEventIds.size} Kaydı Sil
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-red-400">Emin misiniz?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-400">
                                                Bu işlem geri alınamaz. Seçilen kayıtlar silinecek ve ilgili öğrencilerin puanları otomatik olarak güncellenecektir.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className="bg-red-600 hover:bg-red-500 text-white">Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input 
                                    placeholder="Öğrenci adı, etkinlik veya konu ile ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-950 border-white/10 text-white focus:border-purple-500/50 placeholder:text-slate-500"
                                />
                            </div>
                            
                            {/* ETKİNLİK TÜRÜ FİLTRESİ */}
                            <Select value={filterGameType} onValueChange={setFilterGameType}>
                                <SelectTrigger className="w-[200px] bg-slate-950 border-white/10 text-slate-300">
                                    <SelectValue placeholder="Etkinlik Türü" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-[350px]">
                                    <SelectItem value="all">Tüm Etkinlikler</SelectItem>
                                    <SelectItem value="soru-bankasi">📝 Soru Bankası / Test</SelectItem>
                                    <SelectItem value="milyoner-yarismasi">💰 Kim 1000 Puan İster?</SelectItem>
                                    <SelectItem value="kelime-avi">🔍 Kelime Avı</SelectItem>
                                    <SelectItem value="ilim-hazinesi">💎 İlim Hazinesi</SelectItem>
                                    <SelectItem value="siber-sifre-kirici">💻 Siber Şifre Kırıcı</SelectItem>
                                    <SelectItem value="hedefi-vur">🎯 Hedefi Vur</SelectItem>
                                    <SelectItem value="adam-asmaca">🔤 Adam Asmaca</SelectItem>
                                    <SelectItem value="kavram-avi">⚡ Kavram Avı</SelectItem>
                                    <SelectItem value="cumle-ustasi">✍️ Cümle Ustası</SelectItem>
                                    <SelectItem value="eslestirme">🧩 Eşleştirme</SelectItem>
                                    <SelectItem value="dogru-yanlis-zinciri">⚡ Doğru / Yanlış Zinciri</SelectItem>
                                    <SelectItem value="bil-bakalim">❓ Bil Bakalım</SelectItem>
                                    <SelectItem value="gol-krali">⚽ Gol Kralı</SelectItem>
                                    <SelectItem value="yazi-tura">🪙 Yazı Tura</SelectItem>
                                    <SelectItem value="kavram-yarismasi">🏆 Kavram Yarışması</SelectItem>
                                    <SelectItem value="tamamlama">🎖️ Ders / Konu Tamamlama</SelectItem>
                                    <SelectItem value="acik-uclu">📖 Açık Uçlu</SelectItem>
                                    <SelectItem value="kutu-ac">🎁 Kutu Aç</SelectItem>
                                    <SelectItem value="balon-avcisi">🎈 Balon Avcısı</SelectItem>
                                    <SelectItem value="labirent">🌀 Labirent</SelectItem>
                                    <SelectItem value="ozet-kartlari">🃏 Özet Kartları</SelectItem>
                                    <SelectItem value="uzay-savunmasi">🚀 Uzay Savunması</SelectItem>
                                    <SelectItem value="hafiza-kartlari">🧠 Hafıza Kartları</SelectItem>
                                    <SelectItem value="tornado">🌪️ Tornado</SelectItem>
                                    <SelectItem value="dogru-yol-kosucusu">🏃 Doğru Yol Koşucusu</SelectItem>
                                    <SelectItem value="carkifelek">🎡 Çarkıfelek</SelectItem>
                                    <SelectItem value="manual_reward">⭐ Öğretmen Puanı (Ödül)</SelectItem> 
                                    <SelectItem value="manual_penalty">⚠️ Öğretmen Puanı (Ceza)</SelectItem>
                                    <SelectItem value="daily_bonus">📅 Günlük Bonus</SelectItem>
                                    <SelectItem value="holiday_reward">🎉 Tatil Ödülü</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button 
                                variant={showOnlyExcessiveAttempts ? "default" : "outline"}
                                className={cn("border-white/10 text-slate-300 hover:text-white hover:bg-white/5", showOnlyExcessiveAttempts ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-slate-950 text-slate-300")}
                                onClick={() => setShowOnlyExcessiveAttempts(!showOnlyExcessiveAttempts)}
                            >
                                <X className="h-4 w-4 mr-2"/> Fazla Denemeler (&gt;10)
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="border rounded-md overflow-x-auto">
                            <Table className="text-slate-200">
                                <TableHeader className="bg-slate-800/90">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="w-[50px] border-r border-white/5">
                                            <Checkbox
                                                checked={isAllOnPageSelected}
                                                onCheckedChange={(checked) => handleSelectAllOnPage(checked as boolean)}
                                                className="border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                            />
                                        </TableHead>
                                        <TableHead className="text-slate-300">Öğrenci</TableHead>
                                        <TableHead className="text-slate-300">Puan</TableHead>
                                        <TableHead className="text-slate-300">Durum</TableHead>
                                        <TableHead className="text-slate-300">Etkinlik</TableHead>
                                        <TableHead className="text-slate-300 min-w-[320px]">Konu / Açıklama</TableHead>
                                        <TableHead className="text-right text-slate-300">Tarih</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center text-indigo-400">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                                <span className='mt-2 block'>Kayıtlar yükleniyor...</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : events.length > 0 ? (
                                        events.map((event) => {
                                            const cfg = GAME_TYPE_CONFIG[event.normalizedGameType] || 
                                                        GAME_TYPE_CONFIG[event.gameType] || 
                                                        { label: event.gameType || 'Etkinlik', color: 'bg-slate-800 text-slate-300 border-white/10' };

                                            return (
                                                <TableRow key={event.id} data-state={selectedEventIds.has(event.id) && "selected"} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                    <TableCell className="border-r border-white/5">
                                                        <Checkbox
                                                            checked={selectedEventIds.has(event.id)}
                                                            onCheckedChange={() => handleSelect(event.id)}
                                                            className="border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium text-white group-hover:text-purple-400 transition-colors">
                                                        {event.userName || 'Bilinmeyen Kullanıcı'}
                                                    </TableCell>
                                                    <TableCell className={`font-bold text-lg ${event.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {event.points > 0 ? `+${event.points}` : event.points}
                                                    </TableCell>
                                                    
                                                    {/* DURUM */}
                                                    <TableCell>
                                                        {event.completed === true ? (
                                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Başarılı
                                                            </Badge>
                                                        ) : event.completed === false ? (
                                                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                                                                <AlertCircle className="w-3 h-3 mr-1" /> Başarısız
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-600 text-xs">-</span>
                                                        )}
                                                    </TableCell>

                                                    {/* ETKİNLİK ROZETİ */}
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn("font-bold text-xs px-2.5 py-0.5 border shadow-sm", cfg.color)}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    
                                                    {/* KONU / AÇIKLAMA */}
                                                    <TableCell className="py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-sm text-white leading-snug">
                                                                {event.displayTitle}
                                                                {event.attemptNumber && event.attemptNumber > 1 && (
                                                                    <span className={cn(
                                                                        "text-xs ml-2 font-semibold px-1.5 py-0.5 rounded border inline-block",
                                                                        event.attemptNumber > 10 
                                                                            ? "bg-red-950/80 text-red-300 border-red-500/40 animate-pulse" 
                                                                            : "bg-slate-800/80 text-slate-400 border-white/10"
                                                                    )}>
                                                                        {event.attemptNumber}. deneme
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {event.displaySub && (
                                                                <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                                                                    <BookOpen className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                                                    {event.displaySub}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    
                                                    <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
                                                        {format(new Date(event.timestamp), 'dd.MM.yyyy HH:mm', { locale: tr })}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-slate-500 italic">
                                                Hiç puan hareketi bulunamadı.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end p-4 border-t border-white/5 bg-slate-800/50">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPageIndex === 0 || isLoading}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Önceki
                            </Button>
                            <span className="text-sm font-bold text-slate-400">Sayfa {currentPageIndex + 1}</span>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoading}>
                                Sonraki <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
