import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface ProgressCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function ProgressCard({
  title,
  value,
  description,
  icon: Icon,
}: ProgressCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="font-headline">{title}</CardDescription>
        <CardTitle className="text-4xl text-primary font-headline">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
