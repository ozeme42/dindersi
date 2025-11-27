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
import { Loader2, Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import { getImages, uploadImage, deleteImage } from "./actions";
import type { ImageAsset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
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

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchImages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await getImages(user.uid);
    if (result.success) {
      setImages(result.data || []);
    } else {
      toast({
        title: "Hata",
        description: "Görseller yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
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
    try {
      const reader = new FileReader();
      reader.readAsDataURL(fileToUpload);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await uploadImage({
          teacherId: user.uid,
          fileName: fileToUpload.name,
          dataUrl: base64,
        });

        if (result.success) {
          toast({ title: "Başarılı", description: "Görsel yüklendi." });
          await fetchImages(); // Refresh the list
          setFileToUpload(null);
          // Clear the file input visually
          const fileInput = document.getElementById('image-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          throw new Error(result.error);
        }
      };
    } catch (error: any) {
      toast({
        title: "Yükleme Hatası",
        description: error.message || "Görsel yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: string, imageUrl: string) => {
    const result = await deleteImage(imageId, imageUrl);
    if (result.success) {
      toast({ title: "Başarılı", description: "Görsel silindi." });
      fetchImages();
    } else {
      toast({
        title: "Silme Hatası",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ImageIcon className="h-6 w-6 text-primary" />
            Görsel Kütüphanesi
          </CardTitle>
          <CardDescription>
            Ders içeriklerinize eklemek için görselleri buradan yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border-2 border-dashed rounded-lg">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input type="file" accept="image/*" onChange={handleFileChange} id="image-upload" className="flex-grow" />
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
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-semibold">
                Henüz görsel yüklenmemiş.
              </h3>
              <p className="mt-1 text-sm">
                Yukarıdaki alandan yeni bir görsel yükleyerek başlayın.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group relative overflow-hidden">
                  <Image
                    src={image.url}
                    alt={image.fileName}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-5 w-5" />
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
                          <AlertDialogAction
                            onClick={() => handleDelete(image.id, image.url)}
                          >
                            Evet, Sil
                          </AlertDialogAction>
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
