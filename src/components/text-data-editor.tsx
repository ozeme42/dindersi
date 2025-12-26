'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText } from 'lucide-react';

type TextDataEditorProps = {
    fileName: string;
    initialContent: string;
    saveAction: (content: string) => Promise<{ success: boolean, error?: string }>;
};

export function TextDataEditor({ fileName, initialContent, saveAction }: TextDataEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveAction(content);
        if (result.success) {
            toast({ title: 'Başarılı', description: 'Dosya başarıyla kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    return (
        <div className="w-full h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-400"/>
                    {fileName}
                </h3>
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Dosyayı Kaydet
                </Button>
            </div>
            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Metin veya HTML içeriğini buraya girin..."
                className="w-full h-full flex-grow font-mono text-xs bg-slate-900 border-white/10 text-white focus:border-cyan-500/50 resize-none"
            />
        </div>
    );
}
