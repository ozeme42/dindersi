import { getLessonBySlug } from '@/lib/data';
import { notFound } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function LessonDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const lesson = getLessonBySlug(params.slug);

  if (!lesson) {
    notFound();
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/lessons">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Lessons
          </Link>
        </Button>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="aspect-video w-full mb-6">
            <iframe
              className="w-full h-full rounded-lg shadow-lg"
              src={lesson.videoUrl}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <h1 className="font-headline text-3xl font-bold mb-4">
            {lesson.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {lesson.content}
          </p>
        </div>
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <h2 className="font-headline text-2xl font-semibold mb-4">
              Quiz
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {lesson.quiz.map((q, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>{q.question}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      {q.options.map((option) => (
                        <Button
                          key={option}
                          variant="outline"
                          className="justify-start"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Button className="w-full mt-6">
              <Check className="mr-2 h-4 w-4" />
              Mark as Completed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
