
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type BulkImageUploadDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (urls: {title: string, url: string}[]) => Promise<void>;
};

export function BulkImageUploadDialog({ isOpen, onOpenChange, onSave }: BulkImageUploadDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [textInput, setTextInput] = useState('');
    const { toast } = useToast();

    const handleSave = async () => {
        const lines = textInput.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
            toast({ title: 'Hata', description: 'Lütfen en az bir görsel URL\'si girin.', variant: 'destructive' });
            return;
        }

        const urlsToSave = lines.map(line => {
            const parts = line.split(',');
            if (parts.length > 1) {
                const url = parts.pop()!.trim();
                const title = parts.join(',').trim();
                return { title, url };
            }
            // Fallback for just URL
            const urlParts = line.split('/');
            const fileName = urlParts.pop()?.split('?')[0] || `gorsel-${Date.now()}`;
            const title = decodeURIComponent(fileName).replace(/[-_]/g, ' ');
            return { title, url: line };
        });

        setIsSaving(true);
        await onSave(urlsToSave);
        setIsSaving(false);
        handleClose();
    };

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setTextInput('');
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Upload className="text-cyan-400"/> Toplu Görsel Yükle</DialogTitle>
                    <DialogDescription className="text-slate-400">Her satıra bir görsel URL'si yapıştırarak birden fazla görseli aynı anda arşive ekleyin.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-blue-200 space-y-1">
                        <p className="font-bold">Formatlar:</p>
                        <ul className="list-disc list-inside text-xs">
                            <li>Sadece URL: <code className="bg-black/20 p-1 rounded">https://.../resim.jpg</code></li>
                            <li>Başlık ve URL (virgülle ayrılmış): <code className="bg-black/20 p-1 rounded">Benim Harika Resmim, https://.../resim.jpg</code></li>
                        </ul>
                    </div>
                    <Textarea 
                        id="bulk-urls"
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        className="min-h-[300px] font-mono text-xs bg-slate-950 border-white/10 text-white focus-visible:ring-cyan-500/50"
                        placeholder="https://example.com/image1.png&#10;Harika Bir Manzara, https://example.com/image2.jpg&#10;https://example.com/image3.webp"
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving || !textInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                        Görselleri Ekle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
