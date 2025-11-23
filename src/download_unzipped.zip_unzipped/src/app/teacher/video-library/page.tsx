
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
  FilePenLine,
  Video,
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
import { getVideos, addOrUpdateVideo, deleteVideo } from "./actions";
import type { VideoAsset } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { tr } from 'date-fns/locale';

function VideoEditorDialog({
  isOpen,
  onOpenChange,
  video,
  onSave,
  isSaving,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  video: Partial<VideoAsset> | null;
  onSave: (data: Partial<VideoAsset>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<Partial<VideoAsset>>({});

  useEffect(() => {
    setFormData(video || { title: "", description: "", url: "" });
  }, [video]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {video?.id ? "Videoyu Düzenle" : "Yeni Video Ekle"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Başlık</Label>
              <Input
                id="video-title"
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                value={formData.url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                required
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-description">Açıklama (İsteğe Bağlı)</Label>
              <Textarea
                id="video-description"
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

export default function VideoLibraryPage() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<VideoAsset> | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchVideos = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await getVideos(user.uid);
    if (result.success) {
      setVideos(result.data || []);
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleOpenDialog = (video: Partial<VideoAsset> | null = null) => {
    setEditingVideo(video);
    setIsEditorOpen(true);
  };

  const handleSaveVideo = async (data: Partial<VideoAsset>) => {
    if (!user) return;
    setIsSaving(true);
    const result = await addOrUpdateVideo({ ...data, teacherId: user.uid });
    if (result.success) {
      toast({ title: "Başarılı", description: "Video kaydedildi." });
      fetchVideos();
      setIsEditorOpen(false);
    } else {
      toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleDeleteVideo = async (videoId: string) => {
    const result = await deleteVideo(videoId);
    if (result.success) {
      toast({ title: "Başarılı", description: "Video silindi." });
      fetchVideos();
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
                <Video className="h-6 w-6 text-primary" />
                Video Arşivi
              </CardTitle>
              <CardDescription>
                Derslerde kullanmak üzere videolarınızı ekleyin ve yönetin.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Yeni Video Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <Video className="mx-auto h-12 w-12"/>
                <h3 className="mt-4 text-lg font-semibold">Henüz video eklenmemiş.</h3>
                <p className="mt-1 text-sm">"Yeni Video Ekle" butonuna tıklayarak başlayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Card key={video.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{video.title}</CardTitle>
                    <CardDescription className="text-xs">
                        {video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: tr }) : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {video.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(video)}
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
                                    "{video.title}" başlıklı videoyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVideo(video.id)}>Evet, Sil</AlertDialogAction>
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
      <VideoEditorDialog
        isOpen={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        video={editingVideo}
        onSave={handleSaveVideo}
        isSaving={isSaving}
      />
    </div>
  );
}
