import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Generator } from '@/components/learning-path/generator';
import { Route } from 'lucide-react';

export default function LearningPathPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
            <div className='flex justify-center mb-4'>
                <div className='p-3 bg-primary/10 rounded-full border border-primary/20'>
                    <Route className="h-8 w-8 text-primary" />
                </div>
            </div>
          <CardTitle className="font-headline text-3xl">Generate Your Learning Path</CardTitle>
          <CardDescription className="text-lg">
            Answer a few questions and our AI will create a personalized learning
            plan just for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Generator />
        </CardContent>
      </Card>
    </div>
  );
}
