
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
  Loader2,
  Image as ImageIcon,
  Trash2,
  Copy,
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
import { getImages, addImageRecord, deleteImage } from "./actions";
import type { ImageAsset } from "@/lib/types";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


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
    const file = event.target.files?.[0];
    if (file) {
        setFileToUpload(file);
    }
  };
  
  const handleUpload = async () => {
    if (!fileToUpload || !user) {
        toast({ title: "Hata", description: "Lütfen bir dosya seçin.", variant: "destructive"});
        return;
    }

    setIsUploading(true);

    const storageRef = ref(storage, `images/${user.uid}/${Date.now()}-${fileToUpload.name}`);

    try {
        const snapshot = await uploadBytes(storageRef, fileToUpload);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const record: Omit<ImageAsset, 'id' | 'createdAt'> = {
            teacherId: user.uid,
            url: downloadURL,
            fullPath: snapshot.ref.fullPath,
            name: fileToUpload.name,
            size: fileToUpload.size,
            contentType: fileToUpload.type,
        };

        const dbResult = await addImageRecord(record);

        if (dbResult.success) {
            toast({ title: "Başarılı", description: "Görsel başarıyla yüklendi ve kaydedildi." });
            fetchImages(); // Refresh the list
            setFileToUpload(null);
        } else {
            throw new Error(dbResult.error);
        }

    } catch (error: any) {
        console.error("Error uploading image or saving record:", error);
        toast({ title: "Yükleme Hatası", description: error.message || "Görsel yüklenirken bir sorun oluştu.", variant: "destructive" });
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
    toast({ title: "Kopyalandı", description: "Görsel URL'si panoya kopyalandı."});
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
                Derslerde ve sunumlarda kullanmak üzere görsellerinizi yükleyin ve yönetin.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border-2 border-dashed rounded-lg">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input type="file" accept="image/*" onChange={handleFileChange} className="flex-grow" />
              <Button onClick={handleUpload} disabled={isUploading || !fileToUpload}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                Yükle
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Henüz görsel eklenmemiş.</h3>
                <p className="mt-1 text-sm">Yukarıdaki alanı kullanarak ilk görselinizi yükleyin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-square w-full relative">
                       <Image
                         src={image.url}
                         alt={image.name}
                         fill
                         className="object-cover transition-transform group-hover:scale-105"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                       <div className="absolute bottom-2 left-2 right-2 text-white text-xs">
                          <p className="font-bold truncate">{image.name}</p>
                          <p className="opacity-80">
                             {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true, locale: tr })}
                          </p>
                       </div>
                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button size="icon" className="h-7 w-7 bg-white/20 hover:bg-white/30 backdrop-blur-sm" onClick={() => copyToClipboard(image.url)}>
                            <Copy className="h-4 w-4"/>
                          </Button>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4"/></Button>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
