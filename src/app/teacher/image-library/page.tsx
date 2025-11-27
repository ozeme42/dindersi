
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
import type { VideoAsset } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import Image from "next/image";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Alert, AlertTitle } from "@/components/ui/alert";


function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive" className="whitespace-pre-wrap">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>İndeks Gerekli!</AlertTitle>
            <p>Veritabanı sorgusu için bir indeks oluşturulması gerekiyor. Lütfen aşağıdaki bağlantıya tıklayarak indeksi oluşturun ve ardından sayfayı yenileyin.</p>
            <div className="mt-2 text-sm">
                {parts.map((part, index) => 
                    urlRegex.test(part) ? 
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">{part}</a> : 
                    <span key={index}>{part}</span>
                )}
            </div>
        </Alert>
    );
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getImages();
    if (result.success) {
      setImages(result.data || []);
    } else {
      setError(result.error || 'Bir hata oluştu.');
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
        const filePath = `images/${user.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        const recordResult = await addImageRecord({
            title: file.name,
            description: "",
            url: downloadURL,
            storagePath: filePath, // Store path for deletion
            teacherId: user.uid,
        });

        if (recordResult.success) {
            toast({ title: "Başarılı!", description: "Görsel yüklendi ve kütüphaneye eklendi." });
            await fetchImages();
        } else {
            throw new Error(recordResult.error);
        }

    } catch (error: any) {
        console.error("Upload error:", error);
        toast({ title: "Yükleme Hatası", description: error.message, variant: "destructive" });
    } finally {
        setIsUploading(false);
        // Reset file input
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const handleDeleteImage = async (image: VideoAsset) => {
    const result = await deleteImage(image);
    if (result.success) {
      toast({ title: "Başarılı", description: "Görsel silindi." });
      fetchImages();
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  };
  
  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <ErrorWithLink message={error} />
      </div>
    );
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
                Ders içeriklerinde kullanmak üzere görsellerinizi buraya yükleyin ve yönetin.
              </CardDescription>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                Yeni Görsel Yükle
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
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
                <p className="mt-1 text-sm">"Yeni Görsel Yükle" butonuna tıklayarak başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group relative overflow-hidden">
                  <div className="aspect-square bg-muted">
                    <Image
                      src={image.url}
                      alt={image.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                     <p className="text-sm font-semibold line-clamp-2">{image.title}</p>
                     <p className="text-xs opacity-80">{formatDistanceToNow(new Date(image.createdAt), { addSuffix: true, locale: tr })}</p>
                  </div>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  "{image.title}" adlı görseli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteImage(image)}>Evet, Sil</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
