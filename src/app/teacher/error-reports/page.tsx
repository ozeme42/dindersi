

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bug, User, Clock, FileText, CheckCircle2, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { addResponseToReport } from './actions';
import type { ErrorReport } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function ReportDetailDialog({ report, isOpen, onOpenChange, onStatusChange }: {
    report: ErrorReport | null,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onStatusChange: (id: string, status: ErrorReport['status'], response: string) => Promise<void>
}) {
    const [response, setResponse] = useState('');
    const [status, setStatus] = useState<ErrorReport['status']>('new');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (report) {
            setStatus(report.status);
            setResponse(''); // Clear response field for new message
        }
    }, [report]);

    if (!report) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onStatusChange(report.id, status, response);
        setIsSaving(false);
        onOpenChange(false);
    }
    
    let itemDataParsed: any = null;
    if (report.itemData) {
        try {
            itemDataParsed = JSON.parse(report.itemData);
        } catch (e) {
            console.error("Failed to parse itemData JSON:", e);
        }
    }
    
    const statusConfig = {
        new: { label: "Yeni", color: "bg-blue-500" },
        'in-progress': { label: "İnceleniyor", color: "bg-yellow-500" },
        resolved: { label: "Çözüldü", color: "bg-green-500" },
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Hata Raporu Detayı</DialogTitle>
                     <DialogDescription className="flex items-center gap-4 text-xs">
                        <span>{report.userName} tarafından</span>
                        <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: tr })} gönderildi</span>
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow px-6">
                    <div className="space-y-4">
                        {(report.conversation || []).map((msg, index) => (
                             <div key={index} className={cn("flex items-end gap-2", msg.sender === 'teacher' ? 'justify-end' : 'justify-start')}>
                                <div className={cn("p-3 rounded-lg max-w-sm", msg.sender === 'teacher' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">
                                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: tr }) : 'şimdi'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {itemDataParsed && (
                        <Card className="mt-4">
                             <CardHeader className="p-4">
                                <CardTitle className="text-base">İlgili İçerik</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ScrollArea className="h-32">
                                    <pre className="bg-muted p-2 rounded-md whitespace-pre-wrap font-mono text-xs">
                                        {JSON.stringify(itemDataParsed, null, 2)}
                                    </pre>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}
                </ScrollArea>
                <div className="p-6 border-t bg-background space-y-4">
                    <div>
                        <Label htmlFor="response-message">Yeni Cevap Ekle</Label>
                        <Textarea 
                            id="response-message"
                            placeholder="Öğrenciye bir not veya cevap bırakın..."
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                     <div>
                        <Label htmlFor="status-select">Durumu Güncelle</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as ErrorReport['status'])}>
                            <SelectTrigger id="status-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(statusConfig).map(([key, value]) => (
                                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-0">
                    <DialogClose asChild><Button variant="ghost">Kapat</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Gönder ve Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ReportCard({ report, onSelect }: { report: ErrorReport, onSelect: () => void }) {
    const statusConfig = {
        new: { label: "Yeni", color: "bg-blue-500", icon: <AlertCircle className="h-4 w-4"/> },
        'in-progress': { label: "İnceleniyor", color: "bg-yellow-500", icon: <RefreshCw className="h-4 w-4"/> },
        resolved: { label: "Çözüldü", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4"/> },
    };

    const currentStatus = statusConfig[report.status];
    const lastMessage = report.conversation?.[report.conversation.length - 1];

    return (
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onSelect}>
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <div>
                        <Badge className={cn("text-white mb-2", currentStatus.color)}>
                            {currentStatus.icon}
                            <span className="ml-1">{currentStatus.label}</span>
                        </Badge>
                        <CardTitle className="text-base line-clamp-2">{report.conversation?.[0]?.message}</CardTitle>
                        <CardDescription className="mt-2 text-xs">
                             <div className="flex items-center gap-2"><User className="h-3 w-3"/> {report.userName}</div>
                        </CardDescription>
                    </div>
                    {lastMessage?.sender === 'student' && report.status !== 'resolved' && (
                        <Badge variant="destructive" className="animate-pulse">Yeni Cevap</Badge>
                    )}
                </div>
            </CardHeader>
            <CardFooter className="flex justify-between items-center p-3 bg-muted/50 border-t">
                 <p className="text-xs text-muted-foreground">{report.pathname}</p>
                 <p className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3"/>
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: tr })}
                </p>
            </CardFooter>
        </Card>
    );
}

export default function ErrorReportsPage() {
    const [reports, setReports] = useState<ErrorReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | ErrorReport['status']>('active');
    const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, 'errorReports'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedReports: ErrorReport[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                 let conversation: any[] = [];
                if (Array.isArray(data.conversation) && data.conversation.length > 0) {
                    conversation = data.conversation.map((msg: any) => ({
                        ...msg,
                        createdAt: (msg.createdAt instanceof Timestamp ? msg.createdAt.toDate().toISOString() : msg.createdAt),
                    }));
                } else {
                     conversation = [{ sender: 'student', message: data.message, createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() }];
                     if (data.response) conversation.push({ sender: 'teacher' as const, message: data.response, createdAt: new Date().toISOString() });
                }
                fetchedReports.push({
                    id: doc.id,
                    ...data,
                    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
                    conversation: conversation,
                } as ErrorReport);
            });
            setReports(fetchedReports);
            setIsLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching reports in real-time:", err);
            setError("Raporlar yüklenirken bir hata oluştu.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (id: string, status: ErrorReport['status'], response: string) => {
        const result = await addResponseToReport(id, status, response);
        if (result.success) {
            toast({ title: 'Başarılı', description: 'Rapor güncellendi.' });
            // No need to call fetchReports, onSnapshot will handle it.
        } else {
            toast({ title: 'Hata', description: 'Rapor güncellenemedi.', variant: 'destructive' });
        }
    };
    
    const filteredReports = reports.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'active') return r.status === 'new' || r.status === 'in-progress';
        return r.status === filter;
    });

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Bug className="h-8 w-8 text-destructive"/> Hata Raporları</h1>
                <div className="flex items-center gap-2">
                    <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Aktif</Button>
                    <Button variant={filter === 'resolved' ? 'default' : 'outline'} onClick={() => setFilter('resolved')}>Çözüldü</Button>
                    <Button variant={filter === 'all' ? 'secondary' : 'outline'} onClick={() => setFilter('all')}>Arşiv (Tümü)</Button>
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                </div>
            ) : filteredReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredReports.map(report => (
                        <ReportCard key={report.id} report={report} onSelect={() => setSelectedReport(report)} />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Bug className="mx-auto h-12 w-12"/>
                    <h3 className="mt-4 text-lg font-semibold">Gösterilecek Rapor Yok.</h3>
                    <p className="mt-1 text-sm">Bu filtreyle eşleşen bir hata raporu bulunmuyor.</p>
                </Card>
            )}

            <ReportDetailDialog
                isOpen={!!selectedReport}
                onOpenChange={(open) => !open && setSelectedReport(null)}
                report={selectedReport}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
