

'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, DollarSign, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
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

type EnrichedScoreEvent = ScoreEvent & { 
    userName?: string;
    attemptNumber?: number;
};

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
} | null;

export default function ScoreEventsPage() {
  const [pages, setPages] = useState<EnrichedScoreEvent[][]>([[]]);
  const [lastVisibleCursors, setLastVisibleCursors] = useState<(SerializableTimestamp)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyExcessiveAttempts, setShowOnlyExcessiveAttempts] = useState(false);
  const { toast } = useToast();

  const fetchData = async (pageIndex: number, cursor: SerializableTimestamp | null) => {
    setIsLoading(true);
    const result = await getScoreEvents(cursor);
    if (result.success && result.data) {
        setPages(prev => {
            const newPages = [...prev];
            newPages[pageIndex] = result.data || [];
            return newPages;
        });
        setLastVisibleCursors(prev => {
            const newCursors = [...prev];
            newCursors[pageIndex] = result.lastVisible || null;
            return newCursors;
        });
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchData(0, null);
  }, []);
  
  const handleNextPage = () => {
    const lastCursor = lastVisibleCursors[currentPageIndex];
    if (lastCursor === null && (pages[currentPageIndex]?.length || 0) < 25) return;

    const nextPageIndex = currentPageIndex + 1;
    setCurrentPageIndex(nextPageIndex);
    
    if (!pages[nextPageIndex] || pages[nextPageIndex].length === 0) {
      fetchData(nextPageIndex, lastCursor);
    }
  };

  const handlePrevPage = () => {
      if (currentPageIndex > 0) {
          setCurrentPageIndex(prev => prev - 1);
      }
  };

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
      setSelectedEventIds(new Set(filteredEvents.map(e => e.id)));
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
      setPages([[]]);
      setLastVisibleCursors([null]);
      setCurrentPageIndex(0);
      await fetchData(0, null);
    } else {
      toast({ title: 'Hata', description: result.error, variant: 'destructive' });
    }
    setIsDeleting(false);
  };
  
  const filteredEvents = (pages[currentPageIndex] || []).filter(event => {
    const matchesSearch = 
        event.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.gameType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.context?.toLowerCase().includes(searchTerm.toLowerCase());

    if (showOnlyExcessiveAttempts) {
        return (event.attemptNumber || 0) > 10 && matchesSearch;
    }

    return matchesSearch;
  });

  const isNextButtonDisabled = !lastVisibleCursors[currentPageIndex];

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                Puan Hareketleri
              </CardTitle>
              <CardDescription>Sistemdeki tüm puan kazanma ve kaybetme olaylarının kaydı.</CardDescription>
            </div>
            {selectedEventIds.size > 0 && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                            {selectedEventIds.size} Kaydı Sil
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bu işlem geri alınamaz. Seçilen {selectedEventIds.size} puan kaydı kalıcı olarak silinecektir. Bu işlem öğrencilerin toplam puanlarını etkileyecektir.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>Evet, Sil</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
          </div>
           <div className="pt-4 flex flex-col sm:flex-row gap-2">
                <Input 
                    placeholder="Öğrenci adı, etkinlik türü veya açıklamaya göre ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow"
                />
                 <Button 
                    variant={showOnlyExcessiveAttempts ? "secondary" : "outline"}
                    onClick={() => setShowOnlyExcessiveAttempts(!showOnlyExcessiveAttempts)}
                >
                    Fazla Denemeleri Göster
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                        checked={filteredEvents.length > 0 && selectedEventIds.size === filteredEvents.length}
                        onCheckedChange={handleSelectAllOnPage}
                        aria-label="Tümünü seç"
                    />
                  </TableHead>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead>Puan</TableHead>
                  <TableHead>Etkinlik</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && currentPageIndex === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id} data-state={selectedEventIds.has(event.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                            checked={selectedEventIds.has(event.id)}
                            onCheckedChange={() => handleSelect(event.id)}
                            aria-label="Kaydı seç"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{event.userName}</TableCell>
                      <TableCell className={`font-bold ${event.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {event.points > 0 ? `+${event.points}` : event.points}
                      </TableCell>
                      <TableCell>
                        {event.gameType}
                        {event.attemptNumber && (
                           <span className={cn("text-xs ml-1 font-semibold", (event.attemptNumber || 0) > 10 ? "text-red-500" : "text-muted-foreground")}>
                                ({event.attemptNumber}. deneme)
                            </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{event.context}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Hiç puan hareketi bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Sayfa {currentPageIndex + 1}</span>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={handlePrevPage} disabled={currentPageIndex === 0}>
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    Önceki Sayfa
                </Button>
                <Button variant="outline" onClick={handleNextPage} disabled={isNextButtonDisabled || isLoading}>
                    {isLoading && currentPageIndex >= pages.length - 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Sonraki Sayfa'}
                    {!isLoading && <ArrowRight className="h-4 w-4 ml-2"/>}
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
