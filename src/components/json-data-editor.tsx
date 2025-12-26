'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileJson } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type JsonDataEditorProps = {
    fileName: string;
    initialData: any;
    saveAction: (data: any) => Promise<{ success: boolean, error?: string }>;
};

export function JsonDataEditor({ fileName, initialData, saveAction }: JsonDataEditorProps) {
    const [jsonString, setJsonString] = useState(JSON.stringify(initialData, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        try {
            const parsedData = JSON.parse(jsonString);
            setError(null);
            setIsSaving(true);
            const result = await saveAction(parsedData);
            if (result.success) {
                toast({ title: 'Başarılı', description: 'Dosya başarıyla kaydedildi.' });
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            setError(`Geçersiz JSON formatı: ${e.message}`);
            toast({ title: 'Kayıt Hatası', description: 'JSON formatı geçersiz olduğu için dosya kaydedilemedi.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-purple-400"/>
                    {fileName}
                </h3>
                 <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Dosyayı Kaydet
                </Button>
            </div>
             {error && (
                <Alert variant="destructive">
                    <AlertTitle>JSON Format Hatası</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Textarea
                value={jsonString}
                onChange={(e) => setJsonString(e.target.value)}
                placeholder="JSON verisini buraya girin..."
                className="w-full h-full flex-grow font-mono text-xs bg-slate-900 border-white/10 text-white focus:border-purple-500/50 resize-none"
            />
        </div>
    );
}
