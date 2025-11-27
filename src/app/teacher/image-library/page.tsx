
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Upload,
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getImages, addImageRecord, deleteImage, uploadImage } from "./actions";
import type { ImageAsset } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import Image from 'next/image';

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
    if (!fileToUpload || !user) {
      toast({ title: "Hata", description: "Lütfen bir dosya seçin.", variant: "destructive" });
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    const uploadResult = await uploadImage(user.uid, formData);

    if (uploadResult.success && uploadResult.url && uploadResult.path) {
        const recordResult = await addImageRecord({
            teacherId: user.uid,
            url: uploadResult.url,
            storagePath: uploadResult.path,
            name: fileToUpload.name,
            size: fileToUpload.size,
            type: fileToUpload.type,
        });

        if(recordResult.success) {
            toast({ title: "Başarılı", description: "Görsel yüklendi ve kaydedildi." });
            setFileToUpload(null);
            fetchImages();
        } else {
             toast({ title: "Veritabanı Hatası", description: recordResult.error, variant: "destructive" });
        }
    } else {
        toast({ title: "Yükleme Hatası", description: uploadResult.error, variant: "destructive" });
    }

    setIsUploading(false);
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
                Derslerde kullanmak üzere görsellerinizi yönetin.
              </CardDescription>
            </div>
             <div className="mb-6 p-4 border-2 border-dashed rounded-lg">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Input type="file" accept="image/*" onChange={handleFileChange} className="flex-grow" />
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
                <h3 className="mt-4 text-lg font-semibold">Henüz görsel eklenmemiş.</h3>
                <p className="mt-1 text-sm">Yukarıdaki alandan yeni görseller yükleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group relative overflow-hidden">
                    <Image src={image.url} alt={image.name} width={300} height={200} className="w-full h-32 object-cover transition-transform group-hover:scale-105"/>
                    <div className="p-2 text-xs">
                        <p className="font-semibold truncate">{image.name}</p>
                        <p className="text-muted-foreground">{(image.size / 1024).toFixed(1)} KB</p>
                    </div>
                     <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-7 w-7">
                                    <Trash2 className="h-4 w-4"/>
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
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
