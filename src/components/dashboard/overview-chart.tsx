'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { course, userProgress } from '@/lib/data';

const chartData = course.lessons
  .filter((lesson) => userProgress.completedLessons.includes(lesson.id))
  .map((lesson) => ({
    name: lesson.title.split(' ').slice(0, 2).join(' '),
    score: userProgress.scores[lesson.id] || 0,
  }));
  
const chartConfig = {
  score: {
    label: 'Score',
    color: 'hsl(var(--primary))',
  },
}

export function OverviewChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 10)}
        />
        <YAxis />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
         <Legend content={<ChartLegendContent />} />
        <Bar dataKey="score" fill="var(--color-score)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
