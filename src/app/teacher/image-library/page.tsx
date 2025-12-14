
'use client';

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Loader2,
  Trash2,
  FilePenLine,
  Image as ImageIcon,
  UploadCloud,
  Copy,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

import { getImages, deleteImage } from "./actions";

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { ImageAsset } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import Image from 'next/image';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<Partial<ImageAsset> | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await getImages(user.uid);
    if (result.success) {
      setImages(result.data || []);
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleOpenDialog = (image: Partial<ImageAsset> | null = null) => {
    setEditingImage(image);
    setFile(null); // Clear previous file selection
    setIsEditorOpen(true);
  };

  const handleSaveImage = async () => {
    if (!user) return;
    if (!editingImage || (!file && !editingImage.id)) {
        toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    
    let imageUrl = editingImage.url;
    let imageStoragePath = editingImage.storagePath;

    try {
        // 1. If a new file is selected, upload it
        if (file) {
            const storage = getStorage();
            const path = `imageLibrary/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, path);
            
            // Delete old file if it exists and we're uploading a new one
            if (editingImage.id && editingImage.storagePath) {
                try {
                    const oldStorageRef = ref(storage, editingImage.storagePath);
                    await deleteObject(oldStorageRef);
                } catch (e) {
                    console.warn("Could not delete old file, but continuing with save:", e);
                }
            }

            const snapshot = await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(snapshot.ref);
            imageStoragePath = snapshot.ref.fullPath;
        }

        const recordToSave = {
            title: editingImage.title || 'İsimsiz Görsel',
            url: imageUrl,
            storagePath: imageStoragePath,
            teacherId: user.uid,
        };

        // 2. Save/Update Firestore document
        if (editingImage.id) {
            // Update
            const docRef = doc(db, 'imageLibrary', editingImage.id);
            await updateDoc(docRef, recordToSave);
        } else {
            // Create
            await addDoc(collection(db, 'imageLibrary'), {
                ...recordToSave,
                createdAt: serverTimestamp()
            });
        }
        
        toast({ title: "Başarılı", description: "Görsel kaydedildi." });
        await fetchImages();
        setIsEditorOpen(false);

    } catch (error: any) {
        console.error("Görsel kaydetme/yükleme hatası:", error);
        toast({
            title: "Hata",
            description: `İşlem sırasında bir hata oluştu: ${error.message}`,
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };


  const handleDeleteImage = async (imageId: string) => {
    const imageToDelete = images.find(img => img.id === imageId);
    if (!imageToDelete) return;

    try {
        if (imageToDelete.storagePath) {
            const storage = getStorage();
            const storageRef = ref(storage, imageToDelete.storagePath);
            await deleteObject(storageRef);
        }
    } catch (storageError) {
        console.error("Storage deletion failed:", storageError);
        toast({ title: "Depolama Hatası", description: "Görsel depolamadan silinemedi ama veritabanı girişi silinecek.", variant: "destructive"});
    }

    const result = await deleteImage(imageId);
    if (result.success) {
      toast({ title: "Başarılı", description: "Görsel silindi." });
      fetchImages();
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Kopyalandı", description: "Görsel URL'i panoya kopyalandı." });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-primary" />
                Görsel Arşivi
              </CardTitle>
              <CardDescription>
                Derslerde kullanmak üzere görsellerinizi yükleyin ve yönetin.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Görsel Yükle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <UploadCloud className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Henüz görsel yüklenmemiş.</h3>
                <p className="mt-1 text-sm">"Yeni Görsel Yükle" butonuna tıklayarak başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {images.map((image) => (
                <Card key={image.id} className="flex flex-col overflow-hidden">
                    <div className="relative aspect-video w-full bg-slate-800">
                        <Image src={image.url} alt={image.title || 'Yüklenen görsel'} fill className="object-cover" />
                    </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-base">{image.title}</CardTitle>
                    <CardDescription className="text-xs">
                        {image.createdAt ? formatDistanceToNow(new Date(image.createdAt), { addSuffix: true, locale: tr }) : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-1 mt-auto bg-muted/50 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(image.url)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(image)}
                    >
                      <FilePenLine className="mr-2 h-4 w-4" />
                      Düzenle
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive-outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    "{image.title}" başlıklı görseli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteImage(image.id)}>Evet, Sil</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingImage?.id ? "Görseli Düzenle" : "Yeni Görsel Yükle"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="image-title">Başlık</Label>
                <Input
                  id="image-title"
                  value={editingImage?.title || ""}
                  onChange={(e) =>
                    setEditingImage(prev => ({ ...prev, title: e.target.value }))
                  }
                  required
                  className="bg-slate-800 border-white/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-file">Görsel Dosyası {editingImage?.id ? '(Değiştirmek istemiyorsanız boş bırakın)' : ''}</Label>
                <Input
                  id="image-file"
                  type="file"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!editingImage?.id}
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
              <Button onClick={handleSaveImage} disabled={isSaving || (!file && !editingImage?.id)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
