
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bug } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { submitErrorReport } from '@/app/actions/report-error';
import { ScrollArea } from './ui/scroll-area';

type ErrorReportDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemToReport?: any; // The question or activity data
};

export function ErrorReportDialog({ isOpen, onOpenChange, itemToReport }: ErrorReportDialogProps) {
  const [report, setReport] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const pathname = usePathname();
  const { user } = useAuth();
  
  useEffect(() => {
    if (isOpen) {
      setReport('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!report.trim()) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Lütfen karşılaştığınız hatayı açıklayın.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: 'Hata',
        description: 'Rapor göndermek için giriş yapmalısınız.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await submitErrorReport({
      message: report,
      pathname: pathname,
      userId: user.uid,
      userName: user.displayName || 'Bilinmiyor',
      itemData: itemToReport ? JSON.stringify(itemToReport, null, 2) : undefined,
    });

    if (result.success) {
      toast({
        title: 'Raporunuz Gönderildi',
        description: 'Geri bildiriminiz için teşekkür ederiz!',
      });
      onOpenChange(false);
      setReport('');
    } else {
      toast({
        title: 'Hata',
        description: result.error || 'Rapor gönderilirken bir sorun oluştu.',
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-destructive" /> Hata Bildir
          </DialogTitle>
          <DialogDescription>
            Karşılaştığınız bir hatayı, sorunu veya önerinizi bize bildirin. Geri bildiriminiz bizim için değerlidir.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {itemToReport && (
            <div>
              <Label>Bildirilen İçerik</Label>
              <ScrollArea className="h-32 mt-2">
                 <pre className="bg-muted p-2 rounded-md whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(itemToReport, null, 2)}
                 </pre>
              </ScrollArea>
            </div>
          )}
          <div>
            <Label htmlFor="error-report-message">Mesajınız</Label>
            <Textarea
              id="error-report-message"
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Lütfen karşılaştığınız sorunu detaylı bir şekilde açıklayın. Hangi sayfadaydınız, ne yapmaya çalışıyordunuz? vb."
              className="min-h-[120px] mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">İptal</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
