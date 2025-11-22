'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { generateLearningPathAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '../ui/card';

const formSchema = z.object({
  goals: z.string().min(10, 'Please describe your goals in more detail.'),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  learningPreferences: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function Generator() {
  const [learningPath, setLearningPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goals: '',
      skillLevel: 'beginner',
      learningPreferences: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setLearningPath(null);
    const result = await generateLearningPathAction(data);
    setIsLoading(false);

    if (result.success && result.data) {
      setLearningPath(result.data.learningPath);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
    }
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="goals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Learning Goals</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., I want to become a data scientist, or understand the fundamentals of machine learning."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  What do you want to achieve?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="skillLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Skill Level</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your skill level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="learningPreferences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Learning Preferences (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., I prefer hands-on projects, video tutorials, or theoretical reading."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  How do you like to learn?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Path
          </Button>
        </form>
      </Form>

      {learningPath && (
        <Card className="mt-8">
            <CardContent className="p-6">
                <h3 className="font-headline text-2xl font-semibold mb-4">Your Personalized Learning Path</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
                    {learningPath}
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
