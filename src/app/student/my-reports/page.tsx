

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Bug, FileText, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, MessageSquare, Send } from 'lucide-react';
import type { ErrorReport, ErrorReportConversationItem } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { addStudentReplyToReport } from './actions';

function ReportConversationDialog({ report, isOpen, onOpenChange, onReplySent }: {
    report: ErrorReport | null,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onReplySent: () => void,
}) {
    const [replyMessage, setReplyMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setReplyMessage('');
        }
    }, [isOpen]);

    if (!report) return null;

    const handleReplySubmit = async () => {
        if (!replyMessage.trim()) return;
        setIsSubmitting(true);
        const result = await addStudentReplyToReport({
            reportId: report.id,
            message: replyMessage,
            sender: 'student',
        });

        if (result.success) {
            setReplyMessage('');
            onReplySent();
        }
        setIsSubmitting(false);
    };

    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Rapor Görüşmesi</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-grow px-6">
                    <div className="space-y-4">
                        {(report.conversation || []).map((msg, index) => (
                             <div key={index} className={cn("flex items-end gap-2", msg.sender === 'student' ? 'justify-end' : 'justify-start')}>
                                <div className={cn("p-3 rounded-lg max-w-sm", msg.sender === 'student' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                                    <p className="text-xs opacity-70 mt-1 text-right">
                                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: tr }) : 'şimdi'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                     <div className="flex items-center gap-2">
                        <Textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Cevabınızı yazın..."
                            className="min-h-[40px]"
                        />
                        <Button onClick={handleReplySubmit} disabled={isSubmitting || !replyMessage.trim()} size="icon">
                             {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
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
        <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
            <CardHeader className="p-4">
                 <div className="flex justify-between items-start">
                    <div>
                        <Badge className={cn("text-white mb-2", currentStatus.color)}>
                            {currentStatus.icon}
                            <span className="ml-1">{currentStatus.label}</span>
                        </Badge>
                        <CardTitle className="text-base line-clamp-2">{report.conversation?.[0]?.message}</CardTitle>
                    </div>
                    {report.studentHasUnreadMessages && (
                        <Badge variant="destructive" className="animate-pulse">Yeni Cevap</Badge>
                    )}
                 </div>
            </CardHeader>
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
                <p><span className="font-semibold">Sayfa:</span> {report.pathname}</p>
                <p><span className="font-semibold">Son Mesaj:</span> {lastMessage ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true, locale: tr }) : 'Bilinmiyor'}</p>
                 {report.studentHasUnreadMessages && (
                    <div className="pt-3 mt-3 border-t bg-primary/5 p-3 rounded-md">
                        <p className="font-semibold text-primary flex items-center gap-1.5"><MessageSquare className="h-4 w-4"/> Yeni Cevap:</p>
                        <p className="text-foreground whitespace-pre-wrap mt-1 truncate">{lastMessage.message}</p>
                        <p className="text-xs text-primary/80 mt-2 font-medium">Ayrıntıları görmek ve cevap yazmak için tıkla.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function MyReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const [reports, setReports] = useState<ErrorReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            toast({ title: "Giriş Gerekli", description: "Raporlarınızı görmek için lütfen giriş yapın.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const q = query(
            collection(db, 'errorReports'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const fetchedReports: ErrorReport[] = [];
            const unreadReportIds: string[] = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                let conversation: ErrorReportConversationItem[] = [];
                if (Array.isArray(data.conversation)) {
                    conversation = data.conversation.map(msg => ({
                        ...msg,
                        createdAt: msg.createdAt, // Already a string
                    }));
                } else {
                     conversation = [
                        { sender: 'student', message: data.message, createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() },
                        ...(data.response ? [{ sender: 'teacher', message: data.response, createdAt: new Date().toISOString() }] : [])
                    ];
                }

                const reportData = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                    conversation: conversation,
                } as ErrorReport;

                fetchedReports.push(reportData);
                
                if (reportData.studentHasUnreadMessages) {
                    unreadReportIds.push(reportData.id);
                }
            });
            setReports(fetchedReports);
            setIsLoading(false);
            
            // Mark unread reports as read in a batch
            if (unreadReportIds.length > 0) {
                const batch = writeBatch(db);
                unreadReportIds.forEach(reportId => {
                    const reportRef = doc(db, 'errorReports', reportId);
                    batch.update(reportRef, { studentHasUnreadMessages: false });
                });
                await batch.commit();
            }

        }, (error) => {
            console.error("Error fetching user's error reports:", error);
            if (error.code === 'failed-precondition') {
                toast({ title: 'Hata', description: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${error.message}`, variant: 'destructive', duration: 10000 });
            } else {
                toast({ title: 'Hata', description: 'Hata raporları alınırken bir veritabanı hatası oluştu.', variant: 'destructive'});
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, toast]);
    
    const handleRefreshData = () => {
         const reportToUpdate = reports.find(r => r.id === selectedReport?.id);
         setSelectedReport(reportToUpdate || null);
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                 <Button asChild variant="outline" size="sm">
                    <Link href="/student/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Profile Dön
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Bug className="h-8 w-8"/> Hata Raporlarım</h1>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                </div>
            ) : reports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.map(report => (
                        <ReportCard key={report.id} report={report} onSelect={() => setSelectedReport(report)} />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                    <FileText className="mx-auto h-12 w-12"/>
                    <h3 className="mt-4 text-lg font-semibold">Henüz hiç rapor göndermedin.</h3>
                    <p className="mt-1 text-sm">Bir hata veya sorunla karşılaşırsan bize bildirebilirsin.</p>
                </Card>
            )}

            <ReportConversationDialog 
                isOpen={!!selectedReport}
                onOpenChange={(open) => !open && setSelectedReport(null)}
                report={selectedReport}
                onReplySent={handleRefreshData}
            />
        </div>
    );
}
