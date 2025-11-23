
"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SelectionGridProps = {
    items: any[];
    selectedId?: string;
    onSelect: (id: string, name: string) => void;
    specialOptions?: { id: string; name: string }[];
    disabled?: boolean;
    isLoading?: boolean;
    titleKey?: string;
    subtitleKey?: string;
    className?: string;
    countKey?: string;
    countLabel?: string;
};

export function SelectionGrid({ items, selectedId, onSelect, specialOptions, disabled = false, isLoading = false, titleKey = 'title', subtitleKey, className, countKey, countLabel = "Soru" }: SelectionGridProps) {
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const allItems = [...(specialOptions || []), ...items];

    if (allItems.length === 0 && !isLoading) {
        return <p className="text-muted-foreground text-center py-8">Bu kategori için içerik bulunmuyor veya önceki adımı tamamlamanız gerekiyor.</p>;
    }

    const colorClasses = [
        'bg-chart-1 hover:bg-chart-1/90',
        'bg-chart-2 hover:bg-chart-2/90',
        'bg-chart-3 hover:bg-chart-3/90',
        'bg-chart-4 hover:bg-chart-4/90',
        'bg-chart-5 hover:bg-chart-5/90',
    ];

    return (
        <div className={cn("w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4", className)}>
            {allItems.map((item, index) => {
                const isSelected = selectedId === item.id;
                const colorClass = colorClasses[index % colorClasses.length];
                const displayName = item[titleKey as keyof typeof item] || item.name;
                const count = countKey ? item[countKey as keyof typeof item] : undefined;
                const subtitle = subtitleKey ? item[subtitleKey as keyof typeof item] : null;

                return (
                    <Button 
                        key={item.id} 
                        variant="default"
                        className={cn(
                            "w-full h-28 sm:h-36 whitespace-normal p-2 justify-center flex flex-col items-center text-center shadow-lg transition-transform duration-200 hover:-translate-y-1 text-primary-foreground relative",
                            colorClass,
                            isSelected && "bg-primary ring-4 ring-offset-2 ring-primary-foreground"
                        )}
                        onClick={() => onSelect(item.id, displayName)}
                        disabled={disabled}
                    >
                        {subtitle && <span className="absolute top-2 left-2 text-xs bg-black/20 text-white px-2 py-0.5 rounded-full">{subtitle}</span>}
                         <div className="flex flex-col">
                            <span className="text-base sm:text-xl font-semibold leading-tight">{displayName}</span>
                             {count !== undefined && (
                                <span className="mt-1 text-xs sm:text-sm font-normal opacity-90">({count} {countLabel})</span>
                            )}
                        </div>
                    </Button>
                )
            })}
        </div>
    );
}
