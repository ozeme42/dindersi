
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  AlertTriangle,
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
import { getImages, addImageRecord, deleteImage } from "./actions";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";
import { Alert, AlertTitle } from "@/components/ui/alert";


function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Split the message by the URL regex. The URL itself will be in the captured groups.
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive" className="whitespace-pre-wrap">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>İndeks Gerekli!</AlertTitle>
            <div className="text-sm">
                {parts.map((part, index) =>
                    urlRegex.test(part) ? (
                        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">
                            {part}
                        </a>
                    ) : (
                        <span key={index}>{part}</span>
                    )
                )}
            </div>
        </Alert>
    );
}


export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    const result = await getImages(user.uid);
    if (result.success) {
      setImages(result.data || []);
    } else {
      setError(result.error || "Görseller alınamadı.");
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setIsUploading(true);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `images/${user.uid}/${Date.now()}-${file.name}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const recordResult = await addImageRecord({
        teacherId: user.uid,
        url: downloadURL,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (recordResult.success) {
        toast({ title: "Başarılı", description: "Görsel yüklendi ve kaydedildi." });
        await fetchImages(); // Refresh the list
      } else {
        throw new Error(recordResult.error);
      }
    } catch (e: any) {
      console.error("Upload error:", e);
      toast({
        title: "Yükleme Hatası",
        description: e.message || "Görsel yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (image: ImageAsset) => {
    const result = await deleteImage(image);
    if (result.success) {
      toast({ title: "Başarılı", description: "Görsel silindi." });
      fetchImages(); // Refresh the list
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
                Ders içeriklerinde kullanmak üzere görsellerinizi yükleyin ve yönetin.
              </CardDescription>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*"
            />
            <Button onClick={handleFileSelect} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isUploading ? 'Yükleniyor...' : 'Yeni Görsel Yükle'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <ErrorWithLink message={error} />
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Henüz görsel eklenmemiş.</h3>
                <p className="mt-1 text-sm">"Yeni Görsel Yükle" butonuna tıklayarak başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group relative overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-110"
                    data-ai-hint="library image"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Bu görsel kalıcı olarak silinecektir. Bu işlem geri alınamaz.
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
