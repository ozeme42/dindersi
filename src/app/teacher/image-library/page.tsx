
"use client";

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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

import { getImages, saveImageRecord, deleteImage } from "./actions";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import type { ImageAsset } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import Image from 'next/image';
import { ImageEditorDialog } from "@/components/image-editor-dialog";


export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<Partial<ImageAsset> | null>(null);
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
    setIsEditorOpen(true);
  };

  const handleSaveImage = async (data: Partial<ImageAsset>, file?: File) => {
    if (!user) return;

    setIsSaving(true);
    try {
        let submissionData = { ...data, teacherId: user.uid };

        // Eğer yeni bir dosya yükleniyorsa, önce onu Storage'a yükle.
        if (file) {
            const storage = getStorage();
            const fileName = `${Date.now()}-${file.name}`;
            const path = `imageLibrary/${user.uid}/${fileName}`;
            const storageRef = ref(storage, path);
            
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            submissionData.url = downloadURL;
            submissionData.storagePath = snapshot.ref.fullPath;
        }

        // Yeni görsel ekleniyorsa ve dosya yoksa bu bir hatadır.
        if (!submissionData.id && !submissionData.url) {
            throw new Error("Yeni bir görsel oluşturmak için bir dosya seçmelisiniz.");
        }
        
        const result = await saveImageRecord(submissionData);

        if (result.success) {
            toast({ title: "Başarılı", description: "Görsel kaydedildi." });
            fetchImages();
            setIsEditorOpen(false);
        } else {
            throw new Error(result.error || "Bilinmeyen bir sunucu hatası oluştu.");
        }
    } catch (error: any) {
        console.error("Görsel kaydetme hatası:", error);
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
                            <Button variant="destructive" size="icon" className="w-9 h-9">
                                <Trash2 className="h-4 w-4" />
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
      <ImageEditorDialog
        isOpen={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        image={editingImage}
        onSave={handleSaveImage}
        isSaving={isSaving}
      />
    </div>
  );
}
