
'use client';

import { useState, useEffect, useCallback } from "react";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "@/app/leaderboard/actions";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, PlusCircle, Trash2, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Alert, AlertTitle } from "@/components/ui/alert";
import type { Announcement } from "@/lib/types";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";


function CreateAnnouncementDialog({ isOpen, onOpenChange, onCreated, category }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void; category: 'general' | 'exam' }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'success'>('info');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setContent('');
            setType('info');
        }
    }, [isOpen]);

    const handleCreate = async () => {
        if (!title || !content) {
            toast({ title: 'Hata', description: 'Başlık ve içerik alanları boş bırakılamaz.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        const result = await createAnnouncement({ title, content, type, category });
        if (result.success) {
            toast({ title: 'Başarılı', description: 'Duyuru yayınlandı.' });
            onCreated();
            onOpenChange(false);
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Duyuru Oluştur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="ann-title">Başlık</Label>
                        <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ann-content">İçerik</Label>
                        <Textarea id="ann-content" value={content} onChange={(e) => setContent(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ann-type">Duyuru Tipi</Label>
                        <Select value={type} onValueChange={(v: 'info' | 'warning' | 'success') => setType(v)}>
                            <SelectTrigger id="ann-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Bilgi</SelectItem>
                                <SelectItem value="success">Başarı/Tebrik</SelectItem>
                                <SelectItem value="warning">Uyarı</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose>
                    <Button onClick={handleCreate} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Yayınla
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function AnnouncementsSection({ category }: { category: 'general' | 'exam' }) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const q = query(
            collection(db, 'announcements'), 
            where('category', '==', category), 
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedAnnouncements: Announcement[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                fetchedAnnouncements.push({
                    id: doc.id,
                    ...data,
                    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                } as Announcement);
            });
            setAnnouncements(fetchedAnnouncements);
            setIsLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching announcements in real-time: ", err);
            setError("Duyurular yüklenirken bir hata oluştu.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [category]);

    const handleDelete = async (id: string) => {
        const result = await deleteAnnouncement(id);
        if (result.success) {
            toast({ title: "Başarılı", description: "Duyuru silindi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: 'destructive' });
        }
    };
    
    if (isLoading) {
        return <div className="h-24 bg-muted rounded-lg animate-pulse" />
    }
    
    if (error) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Duyuru Hatası</AlertTitle>
                <p className="text-sm">{error}</p>
             </Alert>
        )
    }

    const canManage = user?.role === 'teacher' || user?.role === 'superadmin';
    const hasAnnouncements = announcements.length > 0;

    const iconMap = {
        info: <Info className="h-4 w-4" />,
        success: <CheckCircle2 className="h-4 w-4" />,
        warning: <AlertTriangle className="h-4 w-4" />,
    };

    if (!hasAnnouncements && !canManage) {
        return null; // Don't render anything if there are no announcements and user can't add them.
    }

    return (
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
            <Accordion type="single" collapsible className="w-full" defaultValue={hasAnnouncements ? "announcements" : undefined}>
                <AccordionItem value="announcements" className="border-b-0">
                    <AccordionTrigger className="p-6 hover:no-underline">
                         <div className="flex items-center justify-between w-full">
                             <div className="flex items-center gap-2">
                                <Megaphone className="h-6 w-6"/>
                                <span className="text-xl font-semibold">Duyurular</span>
                             </div>
                         </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                        {hasAnnouncements ? (
                            <div className="space-y-4">
                                {announcements.map(ann => (
                                    <Alert key={ann.id} variant={ann.type === 'warning' ? 'destructive' : 'default'}>
                                        {iconMap[ann.type]}
                                        <AlertTitle className="flex justify-between items-start">
                                            <span>{ann.title}</span>
                                            {canManage && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Duyuruyu Sil</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                "{ann.title}" başlıklı duyuruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(ann.id)}>Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </AlertTitle>
                                        <p className="text-sm">{ann.content}</p>
                                    </Alert>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">Şu anda aktif bir duyuru yok.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
             {canManage && 
                <div className="p-6 border-t">
                    <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Yeni {category === 'exam' ? 'Deneme' : 'Genel'} Duyurusu Ekle
                    </Button>
                </div>
            }
             <CreateAnnouncementDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => {}} category={category} />
        </Card>
    );
}
