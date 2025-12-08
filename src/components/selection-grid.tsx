'use client';

import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles } from "lucide-react";

interface SelectionGridProps<T> {
  items: T[];
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
  titleKey: keyof T;
  isLoading?: boolean;
  disabled?: boolean;
  specialOptions?: { id: string; name: string }[]; // "Tüm Konular" gibi özel seçenekler için
}

// Renk Temaları Tanımları (Artık varsayılan halleri de renkli)
const colorThemes = [
  // Tema 1: İndigo/Mavi
  {
    // Varsayılan (Seçili Değilken)
    base: "border-indigo-500/40 bg-indigo-500/10 text-indigo-100 hover:border-indigo-400 hover:bg-indigo-500/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]",
    // Seçili
    selected: "bg-gradient-to-br from-indigo-600/40 to-blue-600/40 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] text-white",
    // Dekorasyonlar
    icon: "bg-indigo-500 border-indigo-400",
    bar: "bg-gradient-to-r from-indigo-400 to-blue-500"
  },
  // Tema 2: Zümrüt/Yeşil
  {
    base: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    selected: "bg-gradient-to-br from-emerald-600/40 to-teal-600/40 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-white",
    icon: "bg-emerald-500 border-emerald-400",
    bar: "bg-gradient-to-r from-emerald-400 to-teal-500"
  },
  // Tema 3: Kehribar/Turuncu
  {
    base: "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:bg-amber-500/20 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    selected: "bg-gradient-to-br from-amber-600/40 to-orange-600/40 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-white",
    icon: "bg-amber-500 border-amber-400",
    bar: "bg-gradient-to-r from-amber-400 to-orange-500"
  },
  // Tema 4: Gül/Kırmızı
  {
    base: "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:border-rose-400 hover:bg-rose-500/20 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
    selected: "bg-gradient-to-br from-rose-600/40 to-red-600/40 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)] text-white",
    icon: "bg-rose-500 border-rose-400",
    bar: "bg-gradient-to-r from-rose-400 to-red-500"
  },
  // Tema 5: Fuşya/Pembe
  {
    base: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 hover:border-fuchsia-400 hover:bg-fuchsia-500/20 hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]",
    selected: "bg-gradient-to-br from-fuchsia-600/40 to-pink-600/40 border-fuchsia-400 shadow-[0_0_30px_rgba(217,70,239,0.4)] text-white",
    icon: "bg-fuchsia-500 border-fuchsia-400",
    bar: "bg-gradient-to-r from-fuchsia-400 to-pink-500"
  },
];

export function SelectionGrid<T extends { id: string; [key: string]: any }>({
  items,
  selectedId,
  onSelect,
  titleKey,
  isLoading,
  disabled,
  specialOptions = [],
}: SelectionGridProps<T>) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-800/40 border border-white/5 shadow-inner" />
        ))}
      </div>
    );
  }

  const allItems = [
    ...specialOptions.map(opt => ({ ...opt, isSpecial: true } as any)),
    ...items
  ];

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center w-full bg-slate-900/30 rounded-[2rem] border-2 border-dashed border-white/10">
        <div className="p-4 bg-slate-800/50 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-slate-500 opacity-70" />
        </div>
        <p className="text-slate-400 text-xl font-medium">Seçilecek öge bulunamadı.</p>
        <p className="text-slate-600 text-sm mt-1">Lütfen önceki seçimlerinizi kontrol edin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {allItems.map((item, index) => {
        const isSelected = selectedId === item.id;
        const displayName = String(item[titleKey] || item.name);
        
        // Sıraya göre renk temasını seç (Döngüsel)
        const themeIndex = index % colorThemes.length;
        const theme = colorThemes[themeIndex];
        const isSpecial = item.isSpecial;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id, displayName)}
            disabled={disabled}
            className={cn(
              "relative group flex flex-col items-center justify-center p-6 min-h-[150px] rounded-2xl border-2 transition-all duration-300 outline-none overflow-hidden",
              "backdrop-blur-sm shadow-lg", // Ortak gölge ve blur

              // --- DURUM STİLLERİ ---
              
              // 1. DİSABLED: Gri ve sönük
              disabled && "opacity-30 cursor-not-allowed grayscale border-white/5 bg-slate-900/40",

              // 2. SEÇİLİ: Çok parlak, dolu arka plan (Özel veya Normal)
              !disabled && isSelected && cn(
                 "z-10 scale-[1.02]",
                 isSpecial 
                    ? "bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)] text-white"
                    : theme.selected
              ),

              // 3. NORMAL (SEÇİLİ DEĞİL): Renkli kenarlık ve yazı, şeffaf arka plan
              !disabled && !isSelected && cn(
                 "hover:-translate-y-1 hover:shadow-2xl", // Hover hareketi
                 isSpecial 
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-200 hover:border-purple-400 hover:bg-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : theme.base
              )
            )}
          >
            
            {/* Arka Plan Işıltısı (Seçiliyken veya Hoverda ekstra parıltı) */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-tr opacity-0 transition-opacity duration-500 pointer-events-none",
                 isSelected ? "from-white/10 via-transparent to-transparent opacity-100" : "group-hover:opacity-100 from-white/5 via-transparent to-transparent"
            )} />

            {/* Seçim İkonu (Sağ Üst - Animasyonlu ve Temaya Uygun) */}
            <div className={cn(
                "absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm",
                isSelected 
                    ? cn("scale-100 rotate-0", isSpecial ? "bg-purple-500 border-purple-400" : theme.icon)
                    : "border-white/10 bg-black/20 scale-90 opacity-50 group-hover:opacity-100 group-hover:scale-100 group-hover:border-white/30"
            )}>
                {isSelected && <Check className="w-4 h-4 text-white stroke-[3] animate-in zoom-in duration-200" />}
            </div>

            {/* İsim / İçerik */}
            <span className={cn(
                "relative z-10 text-center font-bold text-lg leading-tight transition-all duration-300 break-words w-full drop-shadow-md",
                // Yazı rengi zaten parent class'tan geliyor (theme.base veya theme.selected)
                isSelected && "scale-105"
            )}>
              {displayName}
            </span>

            {/* Alt Çizgi Dekorasyonu (Animasyonlu ve Temaya Uygun) */}
            <div className={cn(
                "absolute bottom-0 left-0 h-1.5 transition-all duration-500 ease-out",
                isSelected 
                    ? cn("w-full", isSpecial ? "bg-gradient-to-r from-purple-400 to-fuchsia-500" : theme.bar)
                    : "w-0 bg-white/20 group-hover:w-1/2 left-1/2 group-hover:-translate-x-1/2 rounded-full"
            )} />

          </button>
        );
      })}
    </div>
  );
}