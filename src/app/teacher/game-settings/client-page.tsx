'use client';

import { useForm, useController, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { saveGameSettings } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
// EKLENEN İKONLAR: UserCog, Swords, MonitorPlay
import { Save, Loader2, Info, ChevronDown, Settings, Sliders, Gamepad2, ArrowLeft, UserCog, Swords, MonitorPlay } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_GAME_SETTINGS, QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";
import Link from 'next/link';
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
                     <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                        <Label htmlFor={name} className="text-slate-300 font-medium">{label}</Label>
                        <div className="flex items-center gap-4">
                            <Slider
                                id={name}
                                value={[field.value]}
                                onValueChange={(val) => field.onChange(val[0])}
                                min={config.min}
                                max={config.max}
                                step={config.step}
                                className="flex-1 cursor-pointer"
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
                                className="w-20 bg-slate-900 border-white/10 text-white text-center font-mono h-9"
                            />
                        </div>
                        {description && <p className="text-xs text-slate-500">{description}</p>}
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
                    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 p-4 shadow-sm hover:bg-slate-900/80 transition-colors">
                        <Label htmlFor={name} className="flex flex-col space-y-1 cursor-pointer">
                            <span className="text-slate-200 font-medium">{label}</span>
                            {description && <span className="font-normal leading-snug text-slate-500 text-xs">{description}</span>}
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
                     <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
                        <Label htmlFor={name} className="text-slate-300">{label}</Label>
                        <Input
                            id={name}
                            type="number"
                            step={config.step}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            className="bg-slate-900 border-white/10 text-white h-10"
                        />
                         {description && <p className="text-xs text-slate-500">{description}</p>}
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
        <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <Label className="text-slate-300 font-medium">{label}</Label>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-10">
                        <span className="truncate pr-2">{selectedLabels || 'Seçim yapın...'}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-slate-900 border-white/10 text-white">
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
                             className="focus:bg-white/10 focus:text-white cursor-pointer"
                        >
                            {option.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
    )
}

function RadioGroupSettings({ control, name, label, description, options }: { control: any, name: string, label: string, description?: string, options: readonly { id: string, name: string }[] }) {
    return (
        <Controller
            name={`${name}.default`}
            control={control}
            render={({ field }) => (
                <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/50 p-4 shadow-sm">
                    <Label className="text-slate-300 font-medium">{label}</Label>
                    <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-3 pt-2"
                    >
                        {options.map(option => (
                            <div key={option.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => field.onChange(option.id)}>
                                <RadioGroupItem value={option.id} id={`${name}-${option.id}`} className="border-white/20 text-indigo-500"/>
                                <Label htmlFor={`${name}-${option.id}`} className="font-normal text-slate-300 cursor-pointer">{option.name}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                    {description && <p className="text-xs text-slate-500 pt-1">{description}</p>}
                </div>
            )}
        />
    )
}

function PointsPerTypeSettings({ control, name, label, description }: { control: any, name: string, label: string, description?: string }) {
    return (
        <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/50 p-4 shadow-sm">
            <Label className="text-slate-300 font-medium">{label}</Label>
            {description && <p className="text-xs text-slate-500 -mt-1 mb-2">{description}</p>}
            <Accordion type="multiple" className="w-full space-y-2">
                {QUESTION_TYPES.map(type => (
                    <AccordionItem key={type.id} value={type.id} className="border border-white/5 rounded-lg bg-slate-900/50 overflow-hidden">
                        <AccordionTrigger className="text-sm font-medium py-3 px-4 hover:no-underline text-slate-300 hover:text-white transition-colors">{type.name}</AccordionTrigger>
                        <AccordionContent className="p-4 bg-black/20">
                            <div className="grid grid-cols-3 gap-3">
                                {DIFFICULTY_LEVELS.map(level => (
                                    <Controller
                                        key={level}
                                        name={`${name}.${type.id}.${level}`}
                                        control={control}
                                        render={({ field }) => (
                                            <div className="space-y-1.5">
                                                <Label htmlFor={`${name}.${type.id}.${level}`} className={cn("text-xs font-bold uppercase", level === 'Kolay' ? 'text-emerald-500' : level === 'Orta' ? 'text-yellow-500' : 'text-red-500')}>{level}</Label>
                                                <Input
                                                    id={`${name}.${type.id}.${level}`}
                                                    type="number"
                                                    {...field}
                                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                                    className="bg-slate-950 border-white/10 text-white h-9 text-center font-mono"
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
        <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <Label htmlFor={`${name}-switch`} className="flex flex-col space-y-1 cursor-pointer">
                    <span className="text-slate-300 font-medium">{label}</span>
                    {description && <span className="font-normal leading-snug text-slate-500 text-xs">{description}</span>}
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
                <div className="pt-4 space-y-3 border-t border-white/5 mt-3">
                    <Label htmlFor={`${name}-slider`} className="flex justify-between text-xs font-medium text-slate-400">
                        <span>Süre Ayarı</span>
                        <span className="text-indigo-400 font-bold">{field.value} saniye</span>
                    </Label>
                    <div className="flex items-center gap-4">
                        <Slider
                            id={`${name}-slider`}
                            value={[field.value]}
                            max={config.max}
                            min={config.min === 0 ? 1 : config.min}
                            step={config.step}
                            onValueChange={(val) => field.onChange(val[0])}
                            className="flex-1 cursor-pointer"
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
                            className="w-20 bg-slate-900 border-white/10 text-white text-center font-mono h-9"
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
        <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <Label htmlFor={`${name}-switch`} className="flex flex-col space-y-1 cursor-pointer">
                    <span className="text-slate-300 font-medium">{label}</span>
                    {description && <span className="font-normal leading-snug text-slate-500 text-xs">{description}</span>}
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
                <div className="pt-4 space-y-3 border-t border-white/5 mt-3">
                    <Label htmlFor={`${name}-input`} className="text-xs font-medium text-slate-400 block">
                        Hedef Puan
                    </Label>
                    <div className="relative">
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
                            className="w-full bg-slate-900 border-white/10 text-white pl-4 h-10 font-mono text-lg font-bold text-indigo-400"
                        />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">PUAN</div>
                    </div>
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
      { key: 'studentSoruCoz', title: "Soru Çözme Alıştırması", description: "Öğrencilerin bağımsız olarak soru çözdüğü alıştırma modunun ayarları.", icon: <Gamepad2 className="h-5 w-5 text-emerald-400"/> },
      { key: 'studentBireysel', title: "Bireysel Yarışma (Öğrenci)", description: "Öğrencilerin misafirlerle yarıştığı mod.", icon: <UserCog className="h-5 w-5 text-blue-400"/> },
      { key: 'studentTakim', title: "Takım Yarışması (Öğrenci)", description: "Öğrencilerin misafir takımlarıyla yarıştığı mod.", icon: <Sliders className="h-5 w-5 text-cyan-400"/> },
      { key: 'studentDuello', title: "Düello (Öğrenci)", description: "Öğrencilerin misafirlerle 1v1 yarıştığı mod.", icon: <Swords className="h-5 w-5 text-red-400"/> },
      { key: 'teacherBireysel', title: "Bireysel Yarışma (Akıllı Tahta)", description: "Öğretmenin sınıfla bireysel olarak yürüttüğü yarışma.", icon: <MonitorPlay className="h-5 w-5 text-purple-400"/> },
      { key: 'teacherTakim', title: "Takım Yarışması (Akıllı Tahta)", description: "Öğretmenin sınıfla takım olarak yürüttüğü yarışma.", icon: <MonitorPlay className="h-5 w-5 text-pink-400"/> },
      { key: 'teacherDuello', title: "Düello (Akıllı Tahta)", description: "Öğretmenin iki öğrenciyi yarıştırdığı mod.", icon: <MonitorPlay className="h-5 w-5 text-orange-400"/> },
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
                <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/50 p-4 shadow-sm">
                    <Label className="text-slate-300 font-medium">{label}</Label>
                    {description && <p className="text-xs text-slate-500 -mt-1 mb-2">{description}</p>}
                    <div className="grid grid-cols-3 gap-3">
                        {DIFFICULTY_LEVELS.map(level => (
                            <Controller
                                key={level}
                                name={`${name}.${level}`}
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-1.5">
                                        <Label htmlFor={`${name}.${level}`} className="text-xs font-bold text-slate-400 uppercase">{level}</Label>
                                        <Input
                                            id={`${name}.${level}`}
                                            type="number"
                                            {...field}
                                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                            className="bg-slate-900 border-white/10 text-white h-9 text-center"
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
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-emerald-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8 pb-24">
                 
                 {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                     <div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-xl border border-white/10">
                                <Settings className="h-8 w-8 text-slate-400" />
                            </div>
                            Oyun Ayarları
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Oyun modlarının kurallarını ve puanlamalarını yapılandırın.</p>
                     </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                        <Link href="/teacher">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Panele Dön
                        </Link>
                    </Button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        {/* Öğrenci Yarışmaları */}
                        <div className="space-y-6">
                              <h2 className="text-xl font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                                <Gamepad2 className="h-5 w-5"/> Öğrenci Yarışmaları
                              </h2>
                              <Accordion type="multiple" className="w-full space-y-4">
                                {settingsMap.filter(s => s.key.startsWith('student')).map(setting => (
                                    <AccordionItem value={setting.key} key={setting.key} className="border-none">
                                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-lg overflow-hidden group hover:border-white/20 transition-all">
                                            <AccordionTrigger className="px-6 py-5 text-left hover:no-underline w-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-slate-950 rounded-lg border border-white/10 shadow-inner">
                                                        {setting.icon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg text-white">{setting.title}</CardTitle>
                                                        <CardDescription className="mt-1 text-slate-400 text-xs font-normal">{setting.description}</CardDescription>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <CardContent className="pt-6 pb-6 bg-slate-950/30 space-y-6 border-t border-white/5">
                                                    {Object.keys(DEFAULT_GAME_SETTINGS[setting.key]).map((field) => (
                                                        renderFieldComponent(setting.key, field)
                                                    ))}
                                                </CardContent>
                                            </AccordionContent>
                                        </Card>
                                    </AccordionItem>
                                ))}
                              </Accordion>
                        </div>

                        {/* Akıllı Tahta Yarışmaları */}
                        <div className="space-y-6">
                              <h2 className="text-xl font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-500/20 pb-2">
                                <MonitorPlay className="h-5 w-5"/> Akıllı Tahta Yarışmaları
                              </h2>
                              <Accordion type="multiple" className="w-full space-y-4">
                                {settingsMap.filter(s => s.key.startsWith('teacher')).map(setting => (
                                     <AccordionItem value={setting.key} key={setting.key} className="border-none">
                                        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-lg overflow-hidden group hover:border-white/20 transition-all">
                                            <AccordionTrigger className="px-6 py-5 text-left hover:no-underline w-full bg-white/5 group-hover:bg-white/10 transition-colors">
                                                <div className="flex items-center gap-4">
                                                     <div className="p-2 bg-slate-950 rounded-lg border border-white/10 shadow-inner">
                                                        {setting.icon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg text-white">{setting.title}</CardTitle>
                                                        <CardDescription className="mt-1 text-slate-400 text-xs font-normal">{setting.description}</CardDescription>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <CardContent className="pt-6 pb-6 bg-slate-950/30 space-y-6 border-t border-white/5">
                                                    {Object.keys(DEFAULT_GAME_SETTINGS[setting.key]).map((field) => (
                                                        renderFieldComponent(setting.key, field)
                                                    ))}
                                                </CardContent>
                                            </AccordionContent>
                                        </Card>
                                    </AccordionItem>
                                ))}
                              </Accordion>
                        </div>
                    </div>
                     <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-white/10 flex justify-center items-center z-50">
                        <Button type="submit" size="lg" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-12 h-14 rounded-2xl shadow-xl shadow-indigo-900/40 text-lg transition-all hover:scale-105 active:scale-95">
                            {isSubmitting ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            Tüm Ayarları Kaydet
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}