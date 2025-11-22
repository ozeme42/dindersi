import { course } from '@/lib/data';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, PlayCircle } from 'lucide-react';
import { getPlaceholderImage } from '@/lib/placeholder-images';

export default function LessonsPage() {
  const getImageId = (slug: string) => {
    if (slug.includes('calculus')) return 'calculus';
    if (slug.includes('differentiation')) return 'differentiation';
    if (slug.includes('integration')) return 'integration';
    if (slug.includes('physics')) return 'physics';
    return 'calculus';
  };
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8">
      {course.lessons.map((lesson) => {
        const image = getPlaceholderImage(getImageId(lesson.slug));
        return (
          <Link href={`/lessons/${lesson.slug}`} key={lesson.id} className="group">
            <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary">
              <CardHeader className="p-0">
                <div className="relative">
                  <Image
                    src={image?.imageUrl || ''}
                    alt={lesson.title}
                    width={600}
                    height={400}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={image?.imageHint || ''}
                  />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                   <div className="absolute bottom-4 left-4">
                        <h3 className="font-headline text-lg font-semibold text-white">{lesson.title}</h3>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardDescription>{lesson.description}</CardDescription>
              </CardContent>
              <CardFooter className="p-4 flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{lesson.duration} min</span>
                </div>
                <Badge variant="outline">View Lesson</Badge>
              </CardFooter>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
