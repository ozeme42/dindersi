
'use client';

import { useState, useEffect, useCallback, useRef } from "react";
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
  Expand,
  Download,
  MoreHorizontal,
  Folder,
  ArrowLeft,
  FolderPlus,
  Move,
  AlertTriangle,
  Home,
  Upload
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import type { ImageAsset, Folder } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { saveImageRecord, getImagesAndFolders, createFolder, deleteFolder, moveImageToFolder, deleteImage, saveBulkImageRecords } from './actions';
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription as AlertDialogAlertDescription } from "@/components/ui/alert";
import { BulkImageUploadDialog } from '@/components/bulk-image-upload-dialog';


function ErrorWithLink({ message }: { message: string }) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);

    return (
        <Alert variant="destructive" className="whitespace-pre-wrap">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Hata!</AlertTitle>
            <AlertDialogAlertDescription className="text-red-200">
                {parts.map((part, index) => 
                    urlRegex.test(part) ? 
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold break-all">{part}</a> : 
                    <span key={index}>{part}</span>
                )}
            </AlertDialogAlertDescription>
        </Alert>
    );
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<{id: string, name: string} | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<Partial<ImageAsset> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<ImageAsset | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isFolderCreatorOpen, setIsFolderCreatorOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [movingImageId, setMovingImageId] = useState<string | null>(null);


  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    const result = await getImagesAndFolders(user.uid);
    if (result.success) {
        setImages(result.images || []);
        setFolders(result.folders || []);
    } else {
        setFetchError(result.error || "Bilinmeyen bir hata oluştu.");
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleOpenDialog = (image: Partial<ImageAsset> | null = null) => {
    setEditingImage(image);
    setFile(null);
    setIsEditorOpen(true);
  };

  const handleSaveImage = async () => {
    if (!user) return;
    if (!editingImage?.title || (!file && !editingImage.id)) {
        toast({ title: "Hata", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    
    let imageUrl = editingImage.url;
    let imageStoragePath = editingImage.storagePath;

    try {
        if (file) {
            const storage = getStorage();
            const path = `imageLibrary/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, path);
            
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

        const recordToSave: Partial<ImageAsset> = {
            id: editingImage.id,
            title: editingImage.title || 'İsimsiz Görsel',
            url: imageUrl,
            storagePath: imageStoragePath,
            folderId: currentFolder?.id || null, 
            folderName: currentFolder?.name || null
        };
        
        await saveImageRecord(recordToSave, user.uid);
        
        toast({ title: "Başarılı", description: "Görsel kaydedildi." });
        await fetchLibrary();
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

    if (imageToDelete.storagePath) {
        const storage = getStorage();
        const storageRef = ref(storage, imageToDelete.storagePath);
        try {
            await deleteObject(storageRef);
        } catch (storageError) {
             console.error("Storage deletion failed:", storageError);
             toast({ title: "Depolama Hatası", description: "Görsel depolamadan silinemedi ama veritabanı girişi silinecek.", variant: "destructive"});
        }
    }

    const result = await deleteImage(imageId);
    if (result.success) {
      toast({ title: "Başarılı", description: "Görsel silindi." });
      fetchLibrary();
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Kopyalandı", description: "Görsel URL'i panoya kopyalandı." });
  };

    const handleDownload = (imageUrl: string, imageName: string) => {
        try {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = imageName || 'indirilen-gorsel.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(imageUrl, '_blank');
            toast({ title: "İndirme Başlatılamadı", description: "Görsel yeni sekmede açılıyor. Oradan kaydedebilirsiniz.", variant: "default" });
        }
    };
    
    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;
        setIsSaving(true);
        const result = await createFolder(newFolderName, user.uid);
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Klasör oluşturuldu.' });
            fetchLibrary();
            setIsFolderCreatorOpen(false);
            setNewFolderName('');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const handleDeleteFolder = async (folderId: string) => {
        const result = await deleteFolder(folderId);
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Klasör ve içindeki görseller ana dizine taşındı.' });
            fetchLibrary();
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
    };
    
    const handleMoveImage = async (targetFolderId: string | null) => {
        if (!movingImageId) return;
        
        const targetFolder = folders.find(f => f.id === targetFolderId);
        const folderName = targetFolder ? targetFolder.name : null;

        const result = await moveImageToFolder(movingImageId, targetFolderId, folderName);

        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Görsel taşındı.' });
            fetchLibrary();
        } else {
             toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsMoveDialogOpen(false);
        setMovingImageId(null);
    }
    
     const handleBulkSave = async (files: FileList) => {
        if (!user || files.length === 0) return;

        toast({ title: "Yükleniyor...", description: `${files.length} görsel yükleniyor ve kaydediliyor.` });
        
        const storage = getStorage();
        const uploadPromises = Array.from(files).map(async (file) => {
            const path = `imageLibrary/${user.uid}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            // Dosya adından uzantıyı ve özel karakterleri temizleyerek bir başlık oluştur
            const title = file.name.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' ');
            return { title, url };
        });

        try {
            const uploadedUrls = await Promise.all(uploadPromises);
            const result = await saveBulkImageRecords(uploadedUrls, user.uid, currentFolder?.id || null, currentFolder?.name || null);

            if (result.success) {
                toast({ title: "Başarılı!", description: `${result.count} görsel arşive eklendi.` });
                await fetchLibrary();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Bulk upload error:", error);
            toast({ title: "Toplu Yükleme Hatası", description: error.message || "Görseller yüklenirken bir sorun oluştu.", variant: "destructive" });
        }
    };

    const filteredFolders = folders;
    const filteredImages = images.filter(image => 
        currentFolder ? image.folderId === currentFolder.id : !image.folderId
    );

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
            <div className="flex gap-2">
                 <Button variant="ghost" asChild>
                    <Link href="/teacher"><Home className="mr-2 h-4 w-4"/>Ana Sayfa</Link>
                 </Button>
                 <Button variant="outline" onClick={() => setIsFolderCreatorOpen(true)}>
                    <FolderPlus className="mr-2 h-4 w-4"/> Yeni Klasör
                </Button>
                <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4"/> Toplu Yükle
                </Button>
                <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Yeni Görsel Yükle
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : fetchError ? (
             <ErrorWithLink message={fetchError} />
          ) : (
            <div className="space-y-8">
                 {/* Klasör Alanı */}
                 <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        {currentFolder && (
                            <Button variant="ghost" size="icon" onClick={() => setCurrentFolder(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <Folder className="h-5 w-5 text-amber-500"/>
                        {currentFolder ? `Klasör: ${currentFolder.name}` : 'Klasörler'}
                    </h3>
                     {filteredFolders.length === 0 && !currentFolder ? (
                        <p className="text-sm text-muted-foreground">Henüz klasör oluşturulmamış.</p>
                     ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredFolders.map(folder => (
                                <div key={folder.id} className="relative group">
                                     <Button 
                                        variant="outline" 
                                        className="w-full h-24 flex-col gap-2"
                                        onClick={() => setCurrentFolder({id: folder.id, name: folder.name})}
                                    >
                                        <Folder className="h-8 w-8 text-amber-400"/>
                                        <span className="truncate">{folder.name}</span>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="h-3 w-3"/>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                             <AlertDialogHeader>
                                                <AlertDialogTitle>Klasörü Sil</AlertDialogTitle>
                                                <AlertDialogDescription>"{folder.name}" klasörünü silmek istediğinize emin misiniz? İçindeki görseller ana dizine taşınacaktır.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteFolder(folder.id)}>Evet, Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </div>
                     )}
                 </div>

                 <div className="border-t pt-8">
                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-cyan-500"/>
                        Görseller
                    </h3>
                    {filteredImages.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                            <UploadCloud className="mx-auto h-12 w-12"/>
                            <h3 className="mt-4 text-lg font-semibold">Bu klasörde görsel yok.</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredImages.map((image) => (
                                <Card key={image.id} className="flex flex-col overflow-hidden">
                                    <div className="relative aspect-video w-full bg-slate-800 cursor-pointer" onClick={() => setFullscreenImage(image)}>
                                        <Image src={image.url} alt={image.title || 'Yüklenen görsel'} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Expand className="h-8 w-8 text-white"/>
                                        </div>
                                    </div>
                                    <CardHeader className="flex-grow">
                                        <CardTitle className="line-clamp-2 text-base">{image.title}</CardTitle>
                                    </CardHeader>
                                    <CardFooter className="flex justify-end gap-1 mt-auto bg-muted/50 p-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(image)}><FilePenLine className="mr-2 h-4 w-4"/>Düzenle</Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setMovingImageId(image.id); setIsMoveDialogOpen(true); }}>
                                                    <Move className="mr-2 h-4 w-4"/> Taşı
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => copyToClipboard(image.url)}><Copy className="mr-2 h-4 w-4"/> URL Kopyala</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDownload(image.url, image.title)}><Download className="mr-2 h-4 w-4"/> İndir</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-destructive/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-500 hover:bg-destructive/10 hover:text-red-400 w-full">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                        </div>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                            <AlertDialogDescription>"{image.title}" başlıklı görseli silmek istediğinizden emin misiniz?</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteImage(image.id)}>Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                 </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>
                {editingImage?.id ? "Görseli Düzenle" : "Yeni Görsel Yükle"}
              </DialogTitle>
              <DialogDescription>
                Görsel bilgilerini güncelleyin veya yeni bir dosya yükleyin.
              </DialogDescription>
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
              <Button onClick={handleSaveImage} disabled={isSaving || !editingImage?.title || (!file && !editingImage?.id)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isFolderCreatorOpen} onOpenChange={setIsFolderCreatorOpen}>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Yeni Klasör Oluştur</DialogTitle>
                    <DialogDescription>Görsellerinizi düzenlemek için yeni bir klasör oluşturun.</DialogDescription>
                </DialogHeader>
                <div className="py-4"><Label htmlFor="folder-name">Klasör Adı</Label><Input id="folder-name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} /></div>
                <DialogFooter><DialogClose asChild><Button variant="ghost">İptal</Button></DialogClose><Button onClick={handleCreateFolder} disabled={isSaving || !newFolderName.trim()}>Oluştur</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader><DialogTitle>Görseli Taşı</DialogTitle><DialogDescription>Görseli taşımak istediğiniz klasörü seçin.</DialogDescription></DialogHeader>
                <div className="py-4 space-y-2">
                     <Button variant="outline" className="w-full justify-start" onClick={() => handleMoveImage(null)}>
                        <Folder className="mr-2 h-4 w-4"/> Ana Dizin (Klasörsüz)
                    </Button>
                    {folders.map(folder => (
                        <Button key={folder.id} variant="ghost" className="w-full justify-start" onClick={() => handleMoveImage(folder.id)}>
                            <Folder className="mr-2 h-4 w-4"/> {folder.name}
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>

      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
        <DialogContent ref={fullscreenRef} className="max-w-7xl w-full h-[90vh] bg-black/80 backdrop-blur-md border-0 p-4">
            {fullscreenImage && (
                <div className="relative w-full h-full flex flex-col">
                    <DialogHeader className="flex flex-row justify-between items-center mb-2 text-white p-2 bg-black/30 rounded-t-lg">
                      <DialogTitle className="font-bold">{fullscreenImage.title}</DialogTitle>
                       <DialogDescription>Görsel önizlemesi.</DialogDescription>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(fullscreenImage!.url, fullscreenImage!.title)}><Download className="h-5 w-5"/></Button>
                        <FullscreenToggle elementRef={fullscreenRef} />
                      </div>
                    </DialogHeader>
                    <div className="relative flex-1">
                        <Image src={fullscreenImage.url} alt={fullscreenImage.title} fill className="object-contain" />
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
       <BulkImageUploadDialog
        isOpen={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onSave={handleBulkSave}
      />
    </div>
  );
}
