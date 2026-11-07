'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Bold, Italic, Underline, Highlighter, List, Undo, Redo, 
    Save, X, Plus, Sparkles, Check, Loader2, HelpCircle, Layers,
    Pencil, Type, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export interface SummaryVisualEditorToolbarProps {
    iframeRef: React.RefObject<HTMLIFrameElement | null>;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: (cleanHtml: string) => Promise<boolean | void> | boolean | void;
    onCancel?: () => void;
    isSaving?: boolean;
    title?: string;
    className?: string;
    showBoxTemplates?: boolean;
}

/**
 * Extracts a clean, sanitized HTML document from the iframe,
 * stripping all temporary editing classes and contenteditable attributes.
 */
export function extractCleanHtmlFromIframe(iframe: HTMLIFrameElement | null): string {
    if (!iframe?.contentDocument) return '';
    try {
        const doc = iframe.contentDocument;
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;

        // 1. Remove edit mode classes
        clone.classList.remove('visual-editing-active');
        const body = clone.querySelector('body');
        if (body) {
            body.classList.remove('visual-editing-active');
        }

        // 2. Remove all contenteditable attributes
        const editables = clone.querySelectorAll('[contenteditable]');
        editables.forEach(el => el.removeAttribute('contenteditable'));

        // 3. Remove runtime overlays and temporary scripts/styles
        const overlay = clone.querySelector('#smartboardFocusOverlay');
        if (overlay) overlay.remove();

        const tempStyles = clone.querySelectorAll('#visualEditModeStyles, #dynamicZoomLiveStyle, #iframeSmartboardDominantStyles');
        tempStyles.forEach(s => s.remove());

        return '<!DOCTYPE html>\n' + clone.outerHTML;
    } catch (e) {
        console.error('Error extracting clean HTML:', e);
        return '';
    }
}

export function SummaryVisualEditorToolbar({
    iframeRef,
    isEditing,
    onToggleEdit,
    onSave,
    onCancel,
    isSaving = false,
    title = 'Özet',
    className,
    showBoxTemplates = true
}: SummaryVisualEditorToolbarProps) {
    const [originalHtml, setOriginalHtml] = useState<string>('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [activeBoxPopover, setActiveBoxPopover] = useState(false);

    // Turn editing on/off inside the iframe
    const applyEditModeToIframe = useCallback((editing: boolean) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;

        try {
            const doc = iframe.contentDocument;
            const body = doc.body;
            if (!body) return;

            if (editing) {
                // Save current snapshot for cancellation
                setOriginalHtml(doc.documentElement.outerHTML);
                setHasUnsavedChanges(false);

                body.classList.add('visual-editing-active');

                // Make notebook-sheet or body contenteditable
                const sheet = doc.querySelector('.notebook-sheet, .fasikul-page, main') as HTMLElement || body;
                sheet.setAttribute('contenteditable', 'true');
                sheet.spellcheck = false;

                // Protect brand bar, footer, and tools from being accidentally edited
                const protectSelectors = ['.sheet-brand-bar', '.footer', '.fasikul-footer', '.toolbar', '.sb-zoom-trigger-btn', '#smartboardFocusOverlay'];
                protectSelectors.forEach(sel => {
                    doc.querySelectorAll(sel).forEach(el => {
                        el.setAttribute('contenteditable', 'false');
                    });
                });

                // Listen for changes
                const onInput = () => setHasUnsavedChanges(true);
                sheet.addEventListener('input', onInput);

                // Prevent links navigating away during edit
                const onClick = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('a, button:not(.btn-edit)')) {
                        e.preventDefault();
                    }
                };
                doc.addEventListener('click', onClick, true);

                // Inject visual editing styles if not already present
                if (!doc.getElementById('visualEditModeStyles')) {
                    const style = doc.createElement('style');
                    style.id = 'visualEditModeStyles';
                    style.textContent = `
                        body.visual-editing-active {
                            cursor: text !important;
                        }
                        body.visual-editing-active .sb-zoom-trigger-btn {
                            display: none !important;
                        }
                        body.visual-editing-active .sheet-brand-bar,
                        body.visual-editing-active .footer,
                        body.visual-editing-active .fasikul-footer,
                        body.visual-editing-active .toolbar {
                            user-select: none !important;
                            -webkit-user-select: none !important;
                            opacity: 0.65;
                        }
                        body.visual-editing-active [contenteditable="true"]:focus,
                        body.visual-editing-active .box:focus-within,
                        body.visual-editing-active .card-box:focus-within {
                            outline: 2.5px solid #6366f1 !important;
                            outline-offset: 3px !important;
                            box-shadow: 0 0 0 5px rgba(99, 102, 241, 0.18) !important;
                        }
                        body.visual-editing-active .box:hover,
                        body.visual-editing-active .card-box:hover,
                        body.visual-editing-active .concept-card:hover,
                        body.visual-editing-active .trap-card:hover {
                            outline: 2px dashed rgba(99, 102, 241, 0.5) !important;
                            outline-offset: 3px !important;
                        }
                    `;
                    doc.head.appendChild(style);
                }
            } else {
                body.classList.remove('visual-editing-active');
                const editables = doc.querySelectorAll('[contenteditable]');
                editables.forEach(el => el.removeAttribute('contenteditable'));
            }
        } catch (err) {
            console.error('Error applying edit mode to iframe:', err);
        }
    }, [iframeRef]);

    useEffect(() => {
        applyEditModeToIframe(isEditing);
    }, [isEditing, applyEditModeToIframe]);

    // Format Commands
    const runCommand = (command: string, value: string = '') => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;
        try {
            iframe.contentWindow?.focus();
            iframe.contentDocument.execCommand(command, false, value);
            setHasUnsavedChanges(true);
        } catch (e) {
            console.error(`Command error (${command}):`, e);
        }
    };

    // Highlight selection with <mark> or yellow background
    const toggleHighlight = () => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;
        try {
            iframe.contentWindow?.focus();
            const doc = iframe.contentDocument;
            const sel = iframe.contentWindow?.getSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
                // If nothing selected, run standard hiliteColor
                doc.execCommand('hiliteColor', false, '#fef08a');
                setHasUnsavedChanges(true);
                return;
            }

            const range = sel.getRangeAt(0);
            const parentMark = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE 
                ? (range.commonAncestorContainer as HTMLElement)
                : range.commonAncestorContainer.parentElement)?.closest('mark');

            if (parentMark) {
                // Remove highlight
                const text = doc.createTextNode(parentMark.textContent || '');
                parentMark.parentNode?.replaceChild(text, parentMark);
            } else {
                // Add highlight
                const mark = doc.createElement('mark');
                mark.className = 'highlight';
                mark.style.backgroundColor = '#fef08a';
                mark.style.color = '#854d0e';
                mark.style.padding = '1px 6px';
                mark.style.borderRadius = '4px';
                mark.style.fontWeight = 'bold';
                mark.appendChild(range.extractContents());
                range.insertNode(mark);
            }
            setHasUnsavedChanges(true);
        } catch (e) {
            console.error('Error toggling highlight:', e);
        }
    };

    // Insert pre-designed box template
    const insertBoxTemplate = (type: 'yellow' | 'pink' | 'cyan' | 'green') => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) return;

        const templates = {
            yellow: `
                <div class="box box-yellow" style="margin-top: 16px; margin-bottom: 20px;">
                    <div class="box-title">📌 Yeni Konu Başlığı</div>
                    <p>Buraya konunun açıklamasını ve önemli ders notlarını doğrudan yazabilirsiniz...</p>
                </div>
            `,
            pink: `
                <div class="box box-pink" style="margin-top: 16px; margin-bottom: 20px;">
                    <div class="box-title">⚠️ Önemli Uyarı / Dikkat</div>
                    <p>Buraya öğrencilerin dikkat etmesi gereken kritik noktayı yazın...</p>
                </div>
            `,
            cyan: `
                <div class="box box-cyan" style="margin-top: 16px; margin-bottom: 20px;">
                    <div class="box-title">📖 Temel Kavram</div>
                    <p><strong>Kavram Adı:</strong> Bu kavramın terim ve dini anlamını buraya yazın.</p>
                </div>
            `,
            green: `
                <div class="box box-green" style="margin-top: 16px; margin-bottom: 20px;">
                    <div class="box-title">🎯 Sınav İpucu & Çözüm Yolu</div>
                    <p>Sınavlarda ve sorularda sıkça çıkan püf noktayı buraya ekleyin...</p>
                </div>
            `
        };

        try {
            iframe.contentWindow?.focus();
            const doc = iframe.contentDocument;
            const htmlToInsert = templates[type];

            // Try inserting at cursor position, or append to sheet
            const sel = iframe.contentWindow?.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                doc.execCommand('insertHTML', false, htmlToInsert);
            } else {
                const sheet = doc.querySelector('.notebook-sheet, .fasikul-page, main') || doc.body;
                const tempDiv = doc.createElement('div');
                tempDiv.innerHTML = htmlToInsert.trim();
                const newBox = tempDiv.firstElementChild;
                if (newBox) {
                    // Insert before footer if exists
                    const footer = sheet.querySelector('.footer, .fasikul-footer');
                    if (footer) {
                        sheet.insertBefore(newBox, footer);
                    } else {
                        sheet.appendChild(newBox);
                    }
                    newBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            setHasUnsavedChanges(true);
            setActiveBoxPopover(false);
        } catch (e) {
            console.error('Error inserting box template:', e);
        }
    };

    // Save action
    const handleSave = async () => {
        const cleanHtml = extractCleanHtmlFromIframe(iframeRef.current);
        if (!cleanHtml) return;

        const result = await onSave(cleanHtml);
        if (result !== false) {
            setHasUnsavedChanges(false);
        }
    };

    // Cancel action
    const handleCancel = () => {
        const iframe = iframeRef.current;
        if (iframe?.contentDocument && originalHtml) {
            iframe.contentDocument.documentElement.innerHTML = originalHtml;
        }
        applyEditModeToIframe(false);
        setHasUnsavedChanges(false);
        if (onCancel) {
            onCancel();
        } else {
            onToggleEdit();
        }
    };

    // Keybindings: Ctrl+S / Cmd+S
    useEffect(() => {
        if (!isEditing) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        const iframeDoc = iframeRef.current?.contentDocument;
        if (iframeDoc) {
            iframeDoc.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (iframeDoc) {
                iframeDoc.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [isEditing, handleSave]);

    if (!isEditing) return null;

    return (
        <div className={cn(
            "w-full bg-slate-900/95 backdrop-blur-md border-b border-indigo-500/30 px-3 sm:px-6 py-2 shadow-xl z-30 transition-all flex items-center justify-between gap-2 flex-wrap",
            className
        )}>
            {/* Sol: Bilgi & Durum */}
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs tracking-wide">
                    <Pencil className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>Görsel Düzenleyici Aktif</span>
                </span>
                <span className="hidden lg:inline text-[11px] text-slate-400 font-medium">
                    Yazıların üzerine tıklayıp doğrudan değiştirebilirsiniz (HTML'e girmeden).
                </span>
            </div>

            {/* Orta: Zengin Metin Araçları */}
            <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-white/10 shadow-inner flex-wrap">
                {/* Kalın */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand('bold')}
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer font-bold"
                    title="Kalın (Ctrl+B)"
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>

                {/* İtalik */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand('italic')}
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer italic"
                    title="İtalik (Ctrl+I)"
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>

                {/* Altı Çizili */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand('underline')}
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer underline"
                    title="Altı Çizili (Ctrl+U)"
                >
                    <Underline className="h-3.5 w-3.5" />
                </Button>

                <div className="w-[1px] h-4 bg-white/20 mx-1" />

                {/* Fosforlu Vurgu */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleHighlight}
                    className="h-7 px-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                    title="Seçili metni sarı fosforlu renkle vurgula"
                >
                    <Highlighter className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Vurgu</span>
                </Button>

                {/* Madde İşareti */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand('insertUnorderedList')}
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    title="Madde Listesi Ekle"
                >
                    <List className="h-3.5 w-3.5" />
                </Button>

                <div className="w-[1px] h-4 bg-white/20 mx-1" />

                {/* Geri Al / Yinele */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand('undo')}
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    title="Geri Al (Ctrl+Z)"
                >
                    <Undo className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand('redo')}
                    className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                    title="Yinele (Ctrl+Y)"
                >
                    <Redo className="h-3.5 w-3.5" />
                </Button>

                {/* Hazır Kutu Ekle */}
                {showBoxTemplates && (
                    <Popover open={activeBoxPopover} onOpenChange={setActiveBoxPopover}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-indigo-300 hover:text-white hover:bg-indigo-600/30 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                                title="Hazır şablon kutusu ekle"
                            >
                                <Plus className="h-3.5 w-3.5 text-indigo-400" />
                                <span>Kutu Ekle</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 bg-slate-900 border-white/10 shadow-2xl rounded-2xl flex flex-col gap-1 z-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                Hazır Bölüm Şablonları:
                            </span>
                            <button
                                type="button"
                                onClick={() => insertBoxTemplate('yellow')}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0" />
                                <span>🟡 Sarı Bilgi Kutusu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => insertBoxTemplate('pink')}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-pink-500/10 text-pink-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 flex-shrink-0" />
                                <span>🔴 Pembe Dikkat Kutusu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => insertBoxTemplate('cyan')}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-sky-500/10 text-sky-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex-shrink-0" />
                                <span>🔵 Mavi Kavram Kartı</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => insertBoxTemplate('green')}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                <span>🟢 Yeşil Sınav İpucu</span>
                            </button>
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            {/* Sağ: Kaydet / Vazgeç Butonları */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-8 px-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Vazgeç</span>
                </Button>

                <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs shadow-md shadow-emerald-950/40 cursor-pointer flex items-center gap-1.5"
                    title="Değişiklikleri Kaydet (Ctrl+S)"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Kaydediliyor...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-3.5 h-3.5" />
                            <span>{hasUnsavedChanges ? "💾 Kaydet *" : "Kaydet"}</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
