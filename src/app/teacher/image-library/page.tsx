
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  FilePenLine,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getImages, addOrUpdateImage, deleteImage } from "./actions";
import type { ImageAsset } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from 'next/image';
import { Skeleton } from "@/components/ui/skeleton";

function ImageEditorDialog({
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
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setFormData(image || { title: "", description: "", imageUrl: "" });
    setImageFile(null);
  }, [image]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, imageFile || undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {image?.id ? "Görseli Düzenle" : "Yeni Görsel Ekle"}
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-file">Görsel Dosyası</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
                required={!image?.id} // Only require for new images
              />
              {image?.imageUrl && !imageFile && (
                <div className="mt-2 text-sm text-muted-foreground">
                    Mevcut görsel: <a href={image.imageUrl} target="_blank" rel="noopener noreferrer" className="underline">Görüntüle</a>. Değiştirmek için yeni bir dosya seçin.
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-description">Açıklama (İsteğe Bağlı)</Label>
              <Textarea
                id="image-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<Partial<ImageAsset> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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
        let imageUrl = data.imageUrl || '';
        
        if (file) {
            const storage = getStorage();
            const storageRef = ref(storage, `images/${user.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        if (!imageUrl) {
            throw new Error("Görsel URL'si bulunamadı veya oluşturulamadı.");
        }

        const result = await addOrUpdateImage({ 
            ...data, 
            teacherId: user.uid,
            imageUrl: imageUrl 
        });

        if (result.success) {
            toast({ title: "Başarılı", description: "Görsel kaydedildi." });
            fetchImages();
            setIsEditorOpen(false);
        } else {
            throw new Error(result.error);
        }
    } catch(e: any) {
        toast({ title: "Hata", description: e.message || "Görsel kaydedilemedi.", variant: "destructive" });
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

  const filteredImages = useMemo(() => {
    if (!searchTerm) return images;
    const lowercasedTerm = searchTerm.toLowerCase();
    return images.filter(image => 
        (image.title && image.title.toLowerCase().includes(lowercasedTerm)) || 
        (image.description && image.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [images, searchTerm]);

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
                Derslerde ve etkinliklerde kullanmak üzere görsellerinizi yönetin.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Görsel Yükle
            </Button>
          </div>
            <div className="mt-4">
                <Input
                    placeholder="Görsellerde ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Henüz görsel yüklenmemiş.</h3>
                <p className="mt-1 text-sm">"Yeni Görsel Yükle" butonuna tıklayarak başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <Card key={image.id} className="flex flex-col">
                    <div className="w-full aspect-video relative">
                         {image.imageUrl ? <Image src={image.imageUrl} alt={image.title || 'görsel'} fill className="object-cover rounded-t-lg" /> : <Skeleton className="w-full h-full rounded-t-lg"/>}
                    </div>
                  <CardHeader className="pt-4 pb-2">
                    <CardTitle className="line-clamp-2 text-base">{image.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {image.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
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
                            <Button variant="destructive-outline" size="sm">
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
