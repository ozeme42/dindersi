
'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import type { LessonStep } from '@/lib/types';
import { Button } from './ui/button';
import { X, Expand, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

type LessonPreviewDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    steps: LessonStep[];
};

export function LessonPreviewDialog({ isOpen, onOpenChange, steps }: LessonPreviewDialogProps) {
    const contentStep = steps.find(step => step.type === 'content');
    const htmlContent = contentStep ? (contentStep as any).content : '<p>Önizlenecek içerik bulunamadı.</p>';
    const [isFullscreen, setIsFullscreen] = useState(false);
    const dialogContentRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
        };
        
        const contentEl = dialogContentRef.current;
        if (contentEl) {
            contentEl.addEventListener('fullscreenchange', handleFullscreenChange);
        }

        return () => {
            if (contentEl) {
                contentEl.removeEventListener('fullscreenchange', handleFullscreenChange);
            }
        };
    }, [isOpen]);

    const toggleFullscreen = () => {
        const elem = dialogContentRef.current;
        if (!elem) return;

        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent 
                ref={dialogContentRef}
                className={cn(
                    "w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col p-0",
                    isFullscreen && "max-w-none max-h-none rounded-none"
                )}
            >
                 <div className="flex-shrink-0 p-4 border-b flex justify-between items-center">
                     {/* Hidden for screen readers but present for accessibility */}
                    <div className="sr-only">
                        <DialogTitle>Ders Önizlemesi</DialogTitle>
                        <DialogDescription>
                            İçeriğin öğrenci ekranında nasıl görüneceğini buradan kontrol edebilirsiniz.
                        </DialogDescription>
                    </div>
                     <div className="flex items-center gap-2 ml-auto">
                         <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                         </Button>
                         <DialogClose asChild>
                             <Button variant="ghost" size="icon">
                                 <X className="h-4 w-4" />
                             </Button>
                         </DialogClose>
                     </div>
                 </div>
                 <div 
                    className="lesson-preview-container prose dark:prose-invert max-w-none p-6 flex-grow overflow-auto w-full h-full whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
            </DialogContent>
        </Dialog>
    );
}
