
"use client";

import { useForm, useController, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { saveGameSettings } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Info, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_GAME_SETTINGS, QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


type SettingsFieldProps = {
    control: any;
    name: string;
    config: any;
    label: string;
    description?: string;
};

function SettingsField({ control, name, config, label, description }: SettingsFieldProps) {
    if (typeof config !== 'object' || config === null) return null;

    if ('min' in config && 'max' in config) {
        return (
            <Controller
                name={`${name}.default`}
                control={control}
                render={({ field }) => (
                     <div className="space-y-2">
                        <Label htmlFor={name}>{label}</Label>
                        <div className="flex items-center gap-4">
                            <Slider
                                id={name}
                                value={[field.value]}
                                onValueChange={(val) => field.onChange(val[0])}
                                min={config.min}
                                max={config.max}
                                step={config.step}
                                className="flex-1"
                            />
                            <Input
                                type="number"
                                value={field.value}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        field.onChange(Math.max(config.min, Math.min(config.max, val)));
                                    }
                                }}
                                className="w-20"
                            />
                        </div>
                        {description && <p className="text-xs text-muted-foreground">{description}</p>}
                    </div>
                )}
            />
        );
    }
    if ('default' in config && typeof config.default === 'boolean') {
            return (
            <Controller
                name={`${name}.default`}
                control={control}
                render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <Label htmlFor={name} className="flex flex-col space-y-1">
                            <span>{label}</span>
                            {description && <span className="font-normal leading-snug text-muted-foreground">{description}</span>}
                        </Label>
                        <Switch id={name} checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                )}
            />
        );
    }
    if ('default' in config && typeof config.default === 'number') {
        return (
            <Controller
                name={`${name}.default`}
                control={control}
                render={({ field }) => (
                     <div className="space-y-2">
                        <Label htmlFor={name}>{label}</Label>
                        <Input
                            id={name}
                            type="number"
                            step={config.step}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                         {description && <p className="text-xs text-muted-foreground">{description}</p>}
                    </div>
                )}
            />
        )
    }

    return null;
}

function MultiSelectSettings({ control, name, label, description, options }: { control: any; name: string; label: string; description?: string, options: readonly { id: string; name: string }[] }) {
    const { field } = useController({ name, control });
    const selectedLabels = options.filter(opt => field.value?.includes(opt.id)).map(opt => opt.name).join(', ');
    
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                        <span className="truncate pr-2">{selectedLabels || 'Seçim yapın...'}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    {options.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.id}
                            checked={field.value?.includes(option.id)}
                             onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                const newValue = checked
                                    ? [...currentValue, option.id]
                                    : currentValue.filter((v: string) => v !== option.id);
                                field.onChange(newValue);
                            }}
                             onSelect={(e) => e.preventDefault()}
                        >
                            {option.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
    )
}

function RadioGroupSettings({ control, name, label, description, options }: { control: any, name: string, label: string, description?: string, options: readonly { id: string, name: string }[] }) {
    return (
        <Controller
            name={`${name}.default`}
            control={control}
            render={({ field }) => (
                <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                    <Label>{label}</Label>
                    <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex gap-4 pt-2"
                    >
                        {options.map(option => (
                            <div key={option.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={option.id} id={`${name}-${option.id}`} />
                                <Label htmlFor={`${name}-${option.id}`} className="font-normal">{option.name}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                    {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
                </div>
            )}
        />
    )
}

function PointsPerTypeSettings({ control, name, label, description }: { control: any, name: string, label: string, description?: string }) {
    return (
        <div className="space-y-2 rounded-lg border p-3 shadow-sm">
            <Label>{label}</Label>
            {description && <p className="text-xs text-muted-foreground -mt-1 mb-2">{description}</p>}
            <Accordion type="multiple" className="w-full">
                {QUESTION_TYPES.map(type => (
                    <AccordionItem key={type.id} value={type.id} className="border-b-0">
                        <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">{type.name}</AccordionTrigger>
                        <AccordionContent>
                            <div className="grid grid-cols-3 gap-2 p-2 bg-muted/50 rounded-md">
                                {DIFFICULTY_LEVELS.map(level => (
                                    <Controller
                                        key={level}
                                        name={`${name}.${type.id}.${level}`}
                                        control={control}
                                        render={({ field }) => (
                                            <div className="space-y-1">
                                                <Label htmlFor={`${name}.${type.id}.${level}`} className="text-xs">{level}</Label>
                                                <Input
                                                    id={`${name}.${type.id}.${level}`}
                                                    type="number"
                                                    {...field}
                                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        )}
                                    />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}

function QuestionTimerSettings({ control, name, config, label, description }: {
    control: any;
    name: string;
    config: any;
    label: string;
    description?: string;
}) {
    const { field } = useController({
        name: `${name}.default`,
        control,
    });

    return (
        <div className="space-y-3 rounded-lg border p-3 shadow-sm">
            <div className="flex items-center justify-between">
                <Label htmlFor={`${name}-switch`} className="flex flex-col space-y-1">
                    <span>{label}</span>
                    {description && <span className="font-normal leading-snug text-muted-foreground">{description}</span>}
                </Label>
                <Switch
                    id={`${name}-switch`}
                    checked={field.value > 0}
                    onCheckedChange={(checked) => {
                        field.onChange(checked ? DEFAULT_GAME_SETTINGS.studentBireysel.questionTimer.default : 0);
                    }}
                />
            </div>
            {field.value > 0 && (
                <div className="pt-2 space-y-2">
                    <Label htmlFor={`${name}-slider`} className="flex justify-between">
                        <span>Süre:</span>
                        <span>{field.value} saniye</span>
                    </Label>
                    <div className="flex items-center gap-4">
                        <Slider
                            id={`${name}-slider`}
                            value={[field.value]}
                            max={config.max}
                            min={config.min === 0 ? 1 : config.min}
                            step={config.step}
                            onValueChange={(val) => field.onChange(val[0])}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                    field.onChange(Math.max(config.min === 0 ? 1 : config.min, Math.min(config.max, val)));
                                }
                            }}
                            className="w-20"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function FinishScoreSettings({ control, name, config, label, description }: {
    control: any;
    name: string;
    config: any;
    label: string;
    description?: string;
}) {
    const { field } = useController({
        name: `${name}.default`,
        control,
    });

    return (
        <div className="space-y-3 rounded-lg border p-3 shadow-sm">
            <div className="flex items-center justify-between">
                <Label htmlFor={`${name}-switch`} className="flex flex-col space-y-1">
                    <span>{label}</span>
                    {description && <span className="font-normal leading-snug text-muted-foreground">{description}</span>}
                </Label>
                <Switch
                    id={`${name}-switch`}
                    checked={field.value > 0}
                    onCheckedChange={(checked) => {
                        field.onChange(checked ? config.default : 0);
                    }}
                />
            </div>
            {field.value > 0 && (
                <div className="pt-2 space-y-2">
                    <Label htmlFor={`${name}-input`} className="flex justify-between">
                        <span>Puan Değeri:</span>
                    </Label>
                    <Input
                        id={`${name}-input`}
                        type="number"
                        value={field.value}
                        step={config.step}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                                field.onChange(Math.max(config.step || 10, val));
                            }
                        }}
                        className="w-full"
                    />
                </div>
            )}
        </div>
    );
}


export function GameSettingsClientPage({ initialSettings }: { initialSettings: typeof DEFAULT_GAME_SETTINGS }) {
    const { toast } = useToast();
    const { control, handleSubmit, formState: { isSubmitting } } = useForm({
        defaultValues: initialSettings,
    });
    
    const onSubmit = async (data: typeof DEFAULT_GAME_SETTINGS) => {
        const result = await saveGameSettings(data);
        if(result.success) {
            toast({ title: "Başarılı", description: "Oyun ayarları kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };
    
    const settingsMap = [
      { key: 'studentSoruCoz', title: "Soru Çözme Alıştırması", description: "Öğrencilerin bağımsız olarak soru çözdüğü alıştırma modunun ayarları." },
      { key: 'studentBireysel', title: "Bireysel Yarışma (Öğrenci)", description: "Öğrencilerin misafirlerle yarıştığı mod." },
      { key: 'studentTakim', title: "Takım Yarışması (Öğrenci)", description: "Öğrencilerin misafir takımlarıyla yarıştığı mod." },
      { key: 'studentDuello', title: "Düello (Öğrenci)", description: "Öğrencilerin misafirlerle 1v1 yarıştığı mod." },
      { key: 'teacherBireysel', title: "Bireysel Yarışma (Akıllı Tahta)", description: "Öğretmenin sınıfla bireysel olarak yürüttüğü yarışma." },
      { key: 'teacherTakim', title: "Takım Yarışması (Akıllı Tahta)", description: "Öğretmenin sınıfla takım olarak yürüttüğü yarışma." },
      { key: 'teacherDuello', title: "Düello (Akıllı Tahta)", description: "Öğretmenin iki öğrenciyi yarıştırdığı mod." },
    ] as const;

    const keyToLabelMap: { [key: string]: string } = {
        questionCount: "Soru Sayısı",
        finishScore: "Bitiş Skoru",
        streakBonus: "Seri Bonusu",
        questionTimer: "Soru Zamanlayıcısı",
        difficulty: "Zorluk Seviyeleri",
        questionTypes: "Soru Tipleri",
        points: "Puan Değerleri",
        penalty: "Ceza Puanları",
        displayModes: "Soru Sunum Modu",
        pullStrength: "Çekme Gücü (Düello)",
    };
     const keyToDescriptionMap: { [key: string]: string } = {
        questionCount: "Yarışmada/alıştırmada kullanılacak toplam soru sayısı.",
        finishScore: "Yarışmayı kazanmak için ulaşılması gereken puan. 0 değeri, bitiş skorunu devre dışı bırakır ve yarışma tüm sorular bitince sona erer.",
        streakBonus: "Art arda doğru cevaplar için bonus puan kazanın.",
        questionTimer: "Her bir soru için yanıtlama süresi (saniye). 0 değeri, zamanlayıcıyı devre dışı bırakır.",
        points: "Doğru cevaplar için soru tipine ve zorluk seviyesine göre verilecek puanlar.",
        penalty: "Yanlış cevap durumunda soru tipine ve zorluk seviyesine göre düşülecek puanlar.",
        displayModes: "Soruların öğrenciye nasıl sunulacağını seçin.",
        difficulty: "Yarışmada/alıştırmada kullanılacak soruların zorluk seviyelerini seçin.",
        questionTypes: "Yarışmada/alıştırmada kullanılacak soru tiplerini seçin.",
        pullStrength: "Düello modunda doğru cevapta halat ne kadar çekilecek.",
    };
    
    const renderFieldComponent = (settingKey: typeof settingsMap[number]['key'], field: string) => {
        const config = DEFAULT_GAME_SETTINGS[settingKey][field as keyof typeof DEFAULT_GAME_SETTINGS[typeof settingKey]];
        if (!config || typeof config !== 'object') return null;

        const label = keyToLabelMap[field] || field;
        const description = keyToDescriptionMap[field];
        const name = `${settingKey}.${field}`;
        
        if (field === 'finishScore') {
            return <FinishScoreSettings key={field} control={control} name={name} config={config} label={label} description={description} />;
        }
        if (field === 'questionTimer') {
            return <QuestionTimerSettings key={field} control={control} name={name} config={config} label={label} description={description} />;
        }
        if (field === 'difficulty') {
            return <MultiSelectSettings key={field} control={control} name={`${name}.default`} label={label} description={description} options={DIFFICULTY_LEVELS.map(d => ({ id: d, name: d }))} />;
        }
        if (field === 'questionTypes') {
            return <MultiSelectSettings key={field} control={control} name={`${name}.default`} label={label} description={description} options={QUESTION_TYPES} />;
        }
        if (field === 'points' || field === 'penalty') {
            return <PointsPerTypeSettings key={field} control={control} name={name} label={label} description={description} />;
        }
        if (field === 'displayModes') {
             const displayModeOptions = Object.values(config).filter(
                (v): v is { id: string, name: string } => typeof v === 'object' && v !== null && 'id' in v && 'name' in v
            );
            return <RadioGroupSettings key={field} control={control} name={name} label={label} description={description} options={displayModeOptions} />;
        }
        if (field === 'pullStrength') {
             return (
                <div className="space-y-2 rounded-lg border p-3 shadow-sm">
                    <Label>{label}</Label>
                    {description && <p className="text-xs text-muted-foreground -mt-1 mb-2">{description}</p>}
                    <div className="grid grid-cols-3 gap-2">
                        {DIFFICULTY_LEVELS.map(level => (
                            <Controller
                                key={level}
                                name={`${name}.${level}`}
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-1">
                                        <Label htmlFor={`${name}.${level}`} className="text-xs">{level}</Label>
                                        <Input
                                            id={`${name}.${level}`}
                                            type="number"
                                            {...field}
                                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        return <SettingsField key={field} control={control} name={name} config={config} label={label} description={description} />;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                     <h2 className="text-2xl font-semibold font-headline border-b pb-2">Öğrenci Yarışmaları</h2>
                     <Accordion type="multiple" className="w-full space-y-8">
                        {settingsMap.filter(s => s.key.startsWith('student')).map(setting => (
                            <AccordionItem value={setting.key} key={setting.key} className="border-none">
                                <Card>
                                    <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                                        <div className="flex-1 text-left">
                                            <CardTitle>{setting.title}</CardTitle>
                                            <CardDescription className="mt-1.5">{setting.description}</CardDescription>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent className="pt-0">
                                            <div className="space-y-6">
                                                {Object.keys(DEFAULT_GAME_SETTINGS[setting.key]).map((field) => (
                                                    renderFieldComponent(setting.key, field)
                                                ))}
                                            </div>
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                     </Accordion>
                </div>
                 <div className="space-y-8">
                     <h2 className="text-2xl font-semibold font-headline border-b pb-2">Akıllı Tahta Yarışmaları</h2>
                     <Accordion type="multiple" className="w-full space-y-8">
                        {settingsMap.filter(s => s.key.startsWith('teacher')).map(setting => (
                             <AccordionItem value={setting.key} key={setting.key} className="border-none">
                                <Card>
                                    <AccordionTrigger className="p-6 text-left hover:no-underline w-full">
                                        <div className="flex-1 text-left">
                                            <CardTitle>{setting.title}</CardTitle>
                                            <CardDescription className="mt-1.5">{setting.description}</CardDescription>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent className="pt-0">
                                           <div className="space-y-6">
                                                {Object.keys(DEFAULT_GAME_SETTINGS[setting.key]).map((field) => (
                                                    renderFieldComponent(setting.key, field)
                                                ))}
                                            </div>
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                     </Accordion>
                </div>
            </div>
             <div className="sticky bottom-0 mt-8 py-4 bg-background/80 backdrop-blur-sm border-t -mx-8 px-8">
                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Tüm Ayarları Kaydet
                </Button>
            </div>
        </form>
    );
}
