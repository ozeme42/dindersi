

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Trash2, ArrowLeft, ArrowRight, X, Home } from 'lucide-react';
import { getScoreEvents, deleteScoreEvents } from './actions';
import type { ScoreEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';


type EnrichedScoreEvent = ScoreEvent & { 
    userName?: string;
    attemptNumber?: number;
};

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
} | null;

export default function ScoreEventsPage() {
    const [events, setEvents] = useState<EnrichedScoreEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyExcessiveAttempts, setShowOnlyExcessiveAttempts] = useState(false);
    const { toast } = useToast();
    
    // Pagination State
    const [pageCursors, setPageCursors] = useState<(SerializableTimestamp | undefined)[]>([undefined]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const fetchData = useCallback(async (pageIndex: number, direction: 'next' | 'prev' = 'next') => {
        setIsLoading(true);
        const cursor = pageCursors[pageIndex];

        const result = await getScoreEvents({ 
            cursor,
            direction,
            searchTerm, 
            showOnlyExcessiveAttempts,
        });

        if (result.success && result.data) {
            setEvents(result.data);
            if (direction === 'next' && result.lastVisible) {
                // If there's a next page, add its starting cursor to history
                if(pageIndex + 1 >= pageCursors.length) {
                   setPageCursors(prev => [...prev, result.lastVisible]);
                }
            }
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsLoading(false);
    }, [searchTerm, showOnlyExcessiveAttempts, toast]); // pageCursors removed from dependencies
    
     useEffect(() => {
        // Debounce search/filter changes
        const handler = setTimeout(() => {
            setPageCursors([undefined]); // Reset pagination on search
            setCurrentPageIndex(0);
            fetchData(0);
        }, 500); 
        return () => clearTimeout(handler);
    }, [searchTerm, showOnlyExcessiveAttempts, fetchData]);


    const handleSelect = (id: string) => {
        setSelectedEventIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAllOnPage = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedEventIds(new Set(events.map(e => e.id)));
        } else {
            setSelectedEventIds(new Set());
        }
    };

    const handleDeleteSelected = async () => {
        setIsDeleting(true);
        const result = await deleteScoreEvents(Array.from(selectedEventIds));
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Seçilen puan hareketleri silindi ve öğrenci skorları güncellendi.' });
            setSelectedEventIds(new Set());
            fetchData(currentPageIndex); // Refetch current page
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsDeleting(false);
    };

    const handleNextPage = () => {
        if(currentPageIndex < pageCursors.length - 1) {
            const nextPageIndex = currentPageIndex + 1;
            fetchData(nextPageIndex, 'next');
            setCurrentPageIndex(nextPageIndex);
        }
    };

    const handlePrevPage = () => {
        if (currentPageIndex > 0) {
            const prevPageIndex = currentPageIndex - 1;
            fetchData(prevPageIndex, 'prev');
            setCurrentPageIndex(prevPageIndex);
        }
    };
    
    const isAllOnPageSelected = events.length > 0 && selectedEventIds.size === events.length && events.every(e => selectedEventIds.has(e.id));
    
    const isLastPage = useMemo(() => {
        // When we are at the last page, the pageCursors array will have one more item (for the next page)
        // than the current page index. If the number of items on the current page is less than the page size,
        // it means there are no more items to fetch.
        const itemsPerPage = 25; // This should match the limit in the server action
        return events.length < itemsPerPage;
    }, [events]);


    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                 <div className="flex items-center justify-between">
                     <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><DollarSign className="h-8 w-8 text-purple-400"/> Puan Hareketleri</h1>
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
                                <CardDescription className="text-slate-400 mt-2">Sistemdeki tüm puan kazanma ve kaybetme olaylarının kaydı.</CardDescription>
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
                                                Bu işlem geri alınamaz. Seçilen {selectedEventIds.size} puan kaydı kalıcı olarak silinecektir. Bu işlem öğrencilerin toplam puanlarını etkileyecektir.
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
                             <Input 
                                placeholder="Öğrenci adı, etkinlik türü veya açıklamaya göre ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-grow bg-slate-950 border-white/10 text-white focus:border-purple-500/50 placeholder:text-slate-500"
                            />
                            <Button 
                                variant={showOnlyExcessiveAttempts ? "default" : "outline"}
                                className={cn("border-white/10 text-slate-300 hover:text-white hover:bg-white/5", showOnlyExcessiveAttempts ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-slate-950 text-slate-300")}
                                onClick={() => setShowOnlyExcessiveAttempts(!showOnlyExcessiveAttempts)}
                            >
                                <X className="h-4 w-4 mr-2"/> Fazla Denemeleri Göster (&gt;10)
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
                                                aria-label="Tümünü seç"
                                                className="border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                            />
                                        </TableHead>
                                        <TableHead className="text-slate-300">Öğrenci</TableHead>
                                        <TableHead className="text-slate-300">Puan</TableHead>
                                        <TableHead className="text-slate-300">Etkinlik</TableHead>
                                        <TableHead className="text-slate-300 min-w-[300px]">Açıklama</TableHead>
                                        <TableHead className="text-right text-slate-300">Tarih</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-indigo-400">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                                <span className='mt-2 block'>Kayıtlar yükleniyor...</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : events.length > 0 ? (
                                        events.map((event) => (
                                            <TableRow key={event.id} data-state={selectedEventIds.has(event.id) && "selected"} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                <TableCell className="border-r border-white/5">
                                                    <Checkbox
                                                        checked={selectedEventIds.has(event.id)}
                                                        onCheckedChange={() => handleSelect(event.id)}
                                                        aria-label="Kaydı seç"
                                                        className="border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium text-white group-hover:text-purple-400 transition-colors">{event.userName}</TableCell>
                                                <TableCell className={`font-bold text-lg ${event.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {event.points > 0 ? `+${event.points}` : event.points}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className='bg-slate-800 text-slate-400 border-white/10 font-bold'>
                                                        {event.gameType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500">
                                                    {typeof event.context === 'string' ? event.context : JSON.stringify(event.context)}
                                                    {event.attemptNumber && (
                                                        <span className={cn("text-xs ml-2 font-semibold", (event.attemptNumber || 0) > 10 ? "text-red-400 animate-pulse" : "text-slate-500")}>
                                                            ({event.attemptNumber}. deneme)
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-slate-500">
                                                    {format(new Date(event.timestamp), 'dd.MM.yyyy HH:mm', { locale: tr })}
                                                </TableCell>
                                            </TableRow>
                                         ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-slate-500 italic">
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
