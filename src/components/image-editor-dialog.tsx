
'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import type { ImageAsset } from "@/lib/types";

export function ImageEditorDialog({
  isOpen,
  onOpenChange,
  image,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  image: Partial<ImageAsset> | null;
  onSave: (data: Partial<ImageAsset>, file?: File) => void;
  isSaving: boolean;
}) {
    const [formData, setFormData] = useState<Partial<ImageAsset>>({});
    const [file, setFile] = useState<File | null>(null);
  
    useEffect(() => {
      if (isOpen) {
        setFormData(image || { title: "" });
        setFile(null);
      }
    }, [image, isOpen]);
  
    const handleSubmit = () => {
      onSave(formData, file || undefined);
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>
                {image?.id ? "Görseli Düzenle" : "Yeni Görsel Yükle"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="image-title">Başlık</Label>
                <Input
                  id="image-title"
                  value={formData.title || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="bg-slate-800 border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-file">Görsel Dosyası {image?.id ? '(Değiştirmek istemiyorsanız boş bırakın)' : ''}</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!image?.id} // Only required for new images
                  className="bg-slate-800 border-white/20 file:text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  İptal
                </Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={isSaving || (!file && !image?.id)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}
