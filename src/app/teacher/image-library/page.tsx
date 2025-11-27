
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { uploadImage, deleteImage } from './actions';
import Image from 'next/image';
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
} from '@/components/ui/alert-dialog';

type LibraryImage = {
  id: string;
  name: string;
  url: string;
  storagePath: string;
  createdAt: any;
};

export default function ImageLibraryPage() {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchImages = useCallback(() => {
    if (!user) return;

    const q = query(
      collection(db, 'imageLibrary'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedImages = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as LibraryImage)
        );
        setImages(fetchedImages);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching images:', error);
        toast({ title: 'Hata', description: 'Görseller yüklenemedi.', variant: 'destructive' });
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user, toast]);

  useEffect(() => {
    const unsubscribe = fetchImages();
    return () => unsubscribe && unsubscribe();
  }, [fetchImages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload || !user) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(fileToUpload);
    reader.onload = async () => {
      const result = await uploadImage({
        image: reader.result as string,
        name: fileToUpload.name,
        teacherId: user.uid,
      });

      if (result.success) {
        toast({ title: 'Başarılı', description: 'Görsel yüklendi.' });
        setFileToUpload(null);
      } else {
        toast({ title: 'Hata', description: 'Görsel yüklenemedi.', variant: 'destructive' });
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({ title: 'Hata', description: 'Dosya okunurken bir hata oluştu.', variant: 'destructive' });
      setIsUploading(false);
    };
  };

  const handleDelete = async (imageId: string, storagePath: string) => {
    const result = await deleteImage(imageId, storagePath);
    if (result.success) {
      toast({ title: 'Başarılı', description: 'Görsel silindi.' });
    } else {
      toast({ title: 'Hata', description: 'Görsel silinemedi.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Görsel Kütüphanesi
          </CardTitle>
          <CardDescription>
            Ders içeriklerinize eklemek için görsellerinizi yükleyin ve yönetin.
          </CardDescription>
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
            {fileToUpload && <p className="text-sm text-muted-foreground mt-2">Seçilen dosya: {fileToUpload.name}</p>}
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
                <ImageIcon className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Kütüphaneniz boş.</h3>
                <p className="mt-1 text-sm">Yukarıdaki alandan yeni bir görsel yükleyerek başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="group relative overflow-hidden">
                    <Image
                      src={image.url}
                      alt={image.name}
                      width={250}
                      height={250}
                      className="aspect-square w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                         <p className="text-xs font-semibold truncate">{image.name}</p>
                    </div>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Görseli Sil</AlertDialogTitle>
                                <AlertDialogDescription>
                                    "{image.name}" adlı görseli kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(image.id, image.storagePath)}>Evet, Sil</AlertDialogAction>
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
