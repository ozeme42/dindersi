
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Upload,
  Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { getImages, addImageRecord, deleteImage } from "./actions";
import type { ImageAsset } from "@/lib/types";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload || !user) return;

    setIsUploading(true);
    const filePath = `images/${user.uid}/${Date.now()}-${fileToUpload.name}`;
    const storageRef = ref(storage, filePath);

    try {
      const snapshot = await uploadBytes(storageRef, fileToUpload);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const result = await addImageRecord({
        teacherId: user.uid,
        url: downloadURL,
        path: filePath,
        name: fileToUpload.name,
        size: fileToUpload.size,
        contentType: fileToUpload.type,
      });

      if (result.success) {
        toast({ title: "Başarılı", description: "Görsel başarıyla yüklendi ve kaydedildi." });
        fetchImages(); // Refresh the list
        setFileToUpload(null);
      } else {
        throw new Error(result.error);
      }

    } catch (error: any) {
      console.error("Upload failed", error);
      toast({ title: "Yükleme Hatası", description: `Görsel yüklenemedi: ${error.message}`, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteImage = async (image: ImageAsset) => {
    const result = await deleteImage(image);
     if (result.success) {
      toast({ title: "Başarılı", description: "Görsel silindi." });
      fetchImages();
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Kopyalandı!", description: "Görsel URL panoya kopyalandı." });
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ImageIcon className="h-6 w-6 text-primary" />
                Görsel Kütüphanesi
              </CardTitle>
              <CardDescription>
                Derslerinizde kullanmak üzere görsellerinizi yönetin.
              </CardDescription>
            </div>
            <div className="flex-shrink-0">
               <div className="flex flex-col sm:flex-row items-center gap-2 p-4 border-2 border-dashed rounded-lg">
                  <Input type="file" accept="image/*" onChange={handleFileChange} className="flex-grow file:mr-2 file:text-primary file:font-semibold" />
                  <Button onClick={handleUpload} disabled={isUploading || !fileToUpload}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                    Yükle
                  </Button>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Henüz görsel yüklenmemiş.</h3>
                <p className="mt-1 text-sm">Yukarıdaki alanı kullanarak başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group relative overflow-hidden">
                  <CardContent className="p-0">
                      <div className="aspect-square w-full bg-muted">
                        <Image
                            src={image.url}
                            alt={image.name}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover"
                            data-ai-hint="library image"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => copyToClipboard(image.url)}>
                            <Copy className="mr-2 h-3 w-3"/> URL'yi Kopyala
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-3 w-3"/> Sil
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Bu görseli kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteImage(image)}>Evet, Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                  </CardContent>
                   <CardFooter className="p-2 text-xs text-muted-foreground truncate">
                        <p className="truncate">{image.name}</p>
                   </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
