
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Lock, PlayCircle, Star, BookOpen } from "lucide-react";
import type { Course, Topic, Unit, QuestionBankProgress } from "@/lib/types";
import { Button } from "./ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Progress } from "@/components/ui/progress";

type SidebarProps = {
    course: Course;
    activeTopic: Topic | null;
    onSelectTopic: (topic: Topic) => void;
    isTopicUnlocked: (topicIndex: number, unitIndex: number) => boolean;
    isTopicCompleted: (topicId: string) => boolean;
    topicProgress: QuestionBankProgress;
    testCounts: { [topicId: string]: { easy: number; medium: number; hard: number; } };
}

export function CourseSidebar({ course, activeTopic, onSelectTopic, isTopicUnlocked, isTopicCompleted, topicProgress, testCounts }: SidebarProps) {
    const getTopicProgress = (topicId: string) => {
        const progress = topicProgress[topicId];
        const counts = testCounts[topicId];
        if (!counts || (counts.easy === 0 && counts.medium === 0 && counts.hard === 0)) {
            return 100; 
        } 
        if (!progress) return 0;
        
        const totalTests = Math.ceil((counts.easy || 0) / 10) + Math.ceil((counts.medium || 0) / 10) + Math.ceil((counts.hard || 0) / 10);
        if (totalTests === 0) return 100;
        
        const passedTests = Object.values(progress.easy || {}).filter(res => res.status === 'passed').length +
                            Object.values(progress.medium || {}).filter(res => res.status === 'passed').length +
                            Object.values(progress.hard || {}).filter(res => res.status === 'passed').length;

        return Math.round((passedTests / totalTests) * 100);
    }
    
    return (
        <aside className="w-full h-full bg-muted/30 border-r">
            <ScrollArea className="h-full py-6">
                <h2 className="text-2xl font-bold font-headline mb-6 px-4 text-primary text-left">{course.title}</h2>
                 <Accordion type="multiple" defaultValue={course.units?.map(u => u.id)} className="w-full">
                    {(course.units || []).map((unit, unitIndex) => (
                        <AccordionItem value={unit.id} key={unit.id} className="border-none px-2">
                             <AccordionTrigger className="px-2 py-3 text-lg font-semibold hover:no-underline rounded-md hover:bg-muted">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <BookOpen className="h-5 w-5 text-primary"/>
                                    </div>
                                    <span className="text-base text-left">{unit.title}</span>
                                </div>
                            </AccordionTrigger>
                             <AccordionContent className="pl-6 pr-2 pt-2 pb-2 border-l-2 ml-4">
                                <div className="space-y-1">
                                {unit.topics.map((topic, topicIndex) => {
                                    const isUnlocked = isTopicUnlocked(topicIndex, unitIndex);
                                    const isCompleted = isTopicCompleted(topic.id);
                                    const isActive = activeTopic?.id === topic.id;
                                    const progress = getTopicProgress(topic.id);
                                    const Icon = isUnlocked ? (isCompleted ? CheckCircle2 : (isActive ? PlayCircle : Circle)) : Lock;

                                    return (
                                        <Button
                                            key={topic.id}
                                            variant="ghost"
                                            onClick={() => isUnlocked && onSelectTopic(topic)}
                                            disabled={!isUnlocked}
                                            className={cn(
                                                "w-full justify-start h-auto py-2 px-3",
                                                !isUnlocked && "text-muted-foreground cursor-not-allowed",
                                                isActive && "bg-primary/10 text-primary font-bold",
                                            )}
                                        >
                                            <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", 
                                                isCompleted ? "text-green-500" : 
                                                isActive ? "text-primary" : 
                                                "text-muted-foreground"
                                            )} />
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-sm leading-tight">{topic.title}</p>
                                                {isUnlocked && (
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <Progress value={progress} className="h-1.5 w-16" />
                                                        <span className="text-xs text-muted-foreground">{progress}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </Button>
                                    )
                                })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </ScrollArea>
        </aside>
    );
}
