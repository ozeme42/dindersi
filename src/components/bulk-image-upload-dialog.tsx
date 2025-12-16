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
import { Loader2, UploadCloud, File, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';

type BulkImageUploadDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (files: FileList) => Promise<void>;
};

export function BulkImageUploadDialog({ isOpen, onOpenChange, onSave }: BulkImageUploadDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFiles(event.target.files);
        }
    };

    const handleSave = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            toast({ title: 'Hata', description: 'Lütfen en az bir dosya seçin.', variant: 'destructive' });
            return;
        }
        
        setIsSaving(true);
        await onSave(selectedFiles);
        setIsSaving(false);
        handleClose();
    };

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setSelectedFiles(null);
        }, 300);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><UploadCloud className="text-cyan-400"/> Toplu Görsel Yükle</DialogTitle>
                    <DialogDescription className="text-slate-400">Bilgisayarınızdan birden fazla görsel seçerek arşive ekleyin.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="image-files">Görsel Dosyaları</Label>
                        <Input
                            id="image-files"
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/gif, image/webp"
                            onChange={handleFileChange}
                            className="bg-slate-800 border-white/20 file:text-white"
                        />
                    </div>
                    {selectedFiles && selectedFiles.length > 0 && (
                         <div className="p-3 bg-slate-950/50 border border-white/10 rounded-lg max-h-48 overflow-y-auto">
                            <p className="text-sm font-bold mb-2">{selectedFiles.length} dosya seçildi:</p>
                            <ul className="space-y-1 text-xs text-slate-400">
                                {Array.from(selectedFiles).map((file, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <File className="h-3 w-3"/>
                                        <span>{file.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={handleClose}>İptal</Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving || !selectedFiles || selectedFiles.length === 0} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                        Yükle ve Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
