'use client';

import { cn } from "@/lib/utils";
import { Check, Loader2, Sparkles, Star, Trophy } from "lucide-react";

interface SelectionGridProps<T> {
  items: T[];
  selectedId?: string;
  onSelect: (id: string, name: string) => void;
  titleKey: keyof T;
  isLoading?: boolean;
  disabled?: boolean;
  specialOptions?: { id: string; name: string }[];
  // Konu ID'sine göre başarı yüzdesi: { "topic_1": 85, "topic_2": 40 }
  progressMap?: Record<string, number>;
}

const colorThemes = [
  {
    base: "border-indigo-500/40 bg-indigo-500/10 text-indigo-100 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]",
    selected: "bg-gradient-to-br from-indigo-600/60 to-blue-600/60 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] text-white",
    icon: "bg-indigo-500 border-indigo-400",
    bar: "bg-indigo-400"
  },
  {
    base: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    selected: "bg-gradient-to-br from-emerald-600/60 to-teal-600/60 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-white",
    icon: "bg-emerald-500 border-emerald-400",
    bar: "bg-emerald-400"
  },
  {
    base: "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    selected: "bg-gradient-to-br from-amber-600/60 to-orange-600/60 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-white",
    icon: "bg-amber-500 border-amber-400",
    bar: "bg-amber-400"
  },
  {
    base: "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
    selected: "bg-gradient-to-br from-rose-600/60 to-red-600/60 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)] text-white",
    icon: "bg-rose-500 border-rose-400",
    bar: "bg-rose-400"
  }
];

export function SelectionGrid<T extends { id: string; [key: string]: any }>({
  items,
  selectedId,
  onSelect,
  titleKey,
  isLoading,
  disabled,
  specialOptions = [],
  progressMap = {}
}: SelectionGridProps<T>) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-slate-800/40 border border-white/5" />
        ))}
      </div>
    );
  }

  const allItems = [
    ...specialOptions.map(opt => ({ ...opt, isSpecial: true } as any)),
    ...items
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {allItems.map((item, index) => {
        const isSelected = selectedId === item.id;
        const displayName = String(item[titleKey] || item.name);
        const progress = progressMap[item.id] || 0;
        const isCompleted = progress >= 100;
        
        const theme = colorThemes[index % colorThemes.length];
        const isSpecial = item.isSpecial;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id, displayName)}
            disabled={disabled}
            className={cn(
              "relative group flex flex-col items-center justify-center p-6 min-h-[160px] rounded-2xl border-2 transition-all duration-300 outline-none overflow-hidden backdrop-blur-sm shadow-lg",
              disabled && "opacity-30 cursor-not-allowed grayscale border-white/5 bg-slate-900/40",
              !disabled && isSelected && (isSpecial ? "bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)] text-white" : theme.selected),
              !disabled && !isSelected && (isSpecial ? "border-purple-500/40 bg-purple-500/10 text-purple-200 hover:border-purple-400" : theme.base)
            )}
          >
            {/* İlerleme Bilgisi (Sol Üst) */}
            {!isSpecial && progress > 0 && (
              <div className="absolute top-3 left-3 flex items-center gap-1">
                <div className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-md border",
                  isCompleted ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" : "bg-white/10 border-white/10 text-white/60"
                )}>
                  %{progress}
                </div>
                {isCompleted && <Trophy className="w-3 h-3 text-yellow-500 animate-pulse" />}
              </div>
            )}

            {/* Seçim İkonu (Sağ Üst) */}
            <div className={cn(
              "absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              isSelected ? (isSpecial ? "bg-purple-500 border-purple-400" : theme.icon) : "border-white/10 bg-black/20"
            )}>
              {isSelected ? <Check className="w-4 h-4 text-white stroke-[3] animate-in zoom-in" /> : isCompleted && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
            </div>

            <span className="relative z-10 text-center font-bold text-lg leading-tight break-words w-full drop-shadow-md">
              {displayName}
            </span>

            {/* Dinamik İlerleme Çubuğu (Taban) */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/5 overflow-hidden">
               <div 
                className={cn(
                  "h-full transition-all duration-700 ease-in-out",
                  isSelected ? "bg-white" : (isSpecial ? "bg-purple-400" : theme.bar)
                )}
                style={{ width: isSelected ? '100%' : `${progress}%` }}
               />
            </div>
          </button>
        );
      })}
    </div>
  );
}