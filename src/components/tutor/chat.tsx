'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, User, Bot, Lightbulb } from 'lucide-react';
import { getTutorAssistanceAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

const formSchema = z.object({
  question: z.string().min(5, 'Please ask a more detailed question.'),
  subject: z.string().min(2, 'Please specify a subject.'),
  studentLevel: z.string().min(2, 'Please specify your level.'),
});

type FormValues = z.infer<typeof formSchema>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hint?: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: '',
      subject: 'Calculus',
      studentLevel: 'Beginner',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    const userMessage: Message = { role: 'user', content: data.question };
    setMessages((prev) => [...prev, userMessage]);
    form.reset({ ...data, question: '' });

    const result = await getTutorAssistanceAction(data);
    setIsLoading(false);

    if (result.success && result.data) {
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.data.answer,
        hint: result.data.hint,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
      setMessages((prev) => prev.slice(0, prev.length -1));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6 overflow-y-auto p-4 rounded-md border bg-muted/50 min-h-[300px] mb-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
             {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 border-2 border-primary/50">
                    <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={18} /></AvatarFallback>
                </Avatar>
             )}
            <div className={`max-w-[75%] rounded-lg p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
              <p className="text-sm">{message.content}</p>
              {message.hint && (
                 <div className='mt-3 pt-3 border-t border-border/50'>
                     <p className='text-xs flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400'><Lightbulb size={14}/> Hint</p>
                     <p className='text-xs text-muted-foreground mt-1'>{message.hint}</p>
                 </div>
              )}
            </div>
             {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                     <AvatarFallback><User size={18}/></AvatarFallback>
                </Avatar>
             )}
          </div>
        ))}
         {messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Ask a question to start the conversation.</p>
          </div>
        )}
      </div>
      
      <Separator className='my-4'/>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Subject e.g. Physics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="studentLevel"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Your Level e.g. Intermediate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      placeholder="Ask your question here..."
                      {...field}
                      rows={3}
                      className="pr-20"
                    />
                    <Button type="submit" size="icon" disabled={isLoading} className="absolute top-1/2 -translate-y-1/2 right-3">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
