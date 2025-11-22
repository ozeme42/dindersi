import { Chat } from '@/components/tutor/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

export default function TutorPage() {
  return (
    <div className="flex justify-center items-start h-full">
        <Card className="w-full max-w-3xl">
            <CardHeader className="text-center">
                 <div className='flex justify-center mb-4'>
                    <div className='p-3 bg-primary/10 rounded-full border border-primary/20'>
                        <Bot className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle className="font-headline text-3xl">AI Tutoring Assistant</CardTitle>
                <CardDescription className="text-lg">
                    Stuck on a problem? Ask me anything, and I&apos;ll do my best to help.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Chat />
            </CardContent>
        </Card>
    </div>
  );
}
