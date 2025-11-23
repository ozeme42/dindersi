

"use client"

import * as React from "react";
import { useState } from "react";
import { Bar, BarChart, Line, LineChart, Pie, PieChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserProfile } from "@/lib/types"
import { format } from "date-fns"
import { StudentProgressReport } from "./actions"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

type GeneralStatsProps = {
  studentsPerClass: { name: string; students: number }[];
  signupsByDay: { date: string; kayit: number }[];
  questionsByDifficulty: { name: string; value: number, fill: string }[];
  topStudents: UserProfile[];
}

const studentsPerClassChartConfig = {
  students: {
    label: "Öğrenci Sayısı",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const signupsChartConfig = {
  kayit: {
    label: "Yeni Kayıt",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const questionsByDifficultyChartConfig = {
  questions: {
    label: "Sorular",
  },
  Kolay: {
    label: "Kolay",
    color: "hsl(var(--chart-1))",
  },
  Orta: {
    label: "Orta",
    color: "hsl(var(--chart-2))",
  },
  Zor: {
    label: "Zor",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function GeneralStatsDashboard({ studentsPerClass, signupsByDay, questionsByDifficulty, topStudents }: GeneralStatsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Sınıflara Göre Öğrenci Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={studentsPerClassChartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={studentsPerClass}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="students" fill="var(--color-students)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>En Yüksek Puanlı 5 Öğrenci</CardTitle>
          <CardDescription>Genel sıralamada lider olan öğrenciler.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Öğrenci</TableHead>
                <TableHead className="text-right">Puan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStudents.map((student) => (
                <TableRow key={student.uid}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Avatar className="h-8 w-8">
                         <AvatarImage src={student.avatar || ''} alt={student.displayName} data-ai-hint="profile picture"/>
                         <AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <span className="font-medium">{student.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{student.score?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Yeni Kayıtlar (Son 30 Gün)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={signupsChartConfig} className="min-h-[300px] w-full">
            <LineChart
              accessibilityLayer
              data={signupsByDay}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => format(new Date(value), "dd/MM")}
              />
               <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
               />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                dataKey="kayit"
                type="monotone"
                stroke="var(--color-kayit)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      
       <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle>Soru Bankası Dağılımı</CardTitle>
          <CardDescription>Soru zorluk seviyelerine göre.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ChartContainer
            config={questionsByDifficultyChartConfig}
            className="mx-auto aspect-square min-h-[250px] w-full max-w-[300px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={questionsByDifficulty}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
              />
               <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}


export function StudentProgressReports({ studentReports }: { studentReports: StudentProgressReport[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<keyof StudentProgressReport | null>('score');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const filteredAndSortedReports = React.useMemo(() => {
        let filtered = studentReports;

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(report =>
                report.displayName?.toLowerCase().includes(lowercasedFilter) ||
                report.class?.toLowerCase().includes(lowercasedFilter)
            );
        }

        if (sortColumn) {
            filtered.sort((a, b) => {
                const aValue = a[sortColumn] || 0;
                const bValue = b[sortColumn] || 0;

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [studentReports, searchTerm, sortColumn, sortDirection]);

    const handleSort = (column: keyof StudentProgressReport) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Öğrenci İlerleme Raporları</CardTitle>
                <CardDescription>Tüm öğrencilerin genel ilerlemesini ve istatistiklerini görüntüleyin.</CardDescription>
                <div className="pt-4">
                    <Input
                        placeholder="Öğrenci adı veya sınıfa göre ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => handleSort('displayName')} className="cursor-pointer">Öğrenci</TableHead>
                            <TableHead onClick={() => handleSort('class')} className="cursor-pointer">Sınıf</TableHead>
                            <TableHead onClick={() => handleSort('score')} className="cursor-pointer text-right">Puan</TableHead>
                            <TableHead onClick={() => handleSort('lessonProgress')} className="cursor-pointer">Ders İlerlemesi</TableHead>
                            <TableHead onClick={() => handleSort('questionBankProgress')} className="cursor-pointer">Soru Bankası</TableHead>
                            <TableHead onClick={() => handleSort('successRate')} className="cursor-pointer">Başarı Düzeyi</TableHead>
                            <TableHead onClick={() => handleSort('activityCount')} className="cursor-pointer text-right">Etkinlik Sayısı</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedReports.map(student => (
                            <TableRow key={student.uid}>
                                <TableCell className="font-medium">{student.displayName}</TableCell>
                                <TableCell>{student.class}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{student.score}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={student.lessonProgress} className="w-24 h-2" />
                                        <span>{student.lessonProgress}%</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{student.completedTopics}/{student.totalTopics} konu</span>
                                </TableCell>
                                <TableCell>
                                     <div className="flex items-center gap-2">
                                        <Progress value={student.questionBankProgress} className="w-24 h-2 [&>div]:bg-purple-500"/>
                                        <span>{student.questionBankProgress}%</span>
                                     </div>
                                     <span className="text-xs text-muted-foreground">{student.passedTests}/{student.totalQuestionBankTests} test</span>
                                </TableCell>
                                 <TableCell>
                                     <div className="flex items-center gap-2">
                                        <Progress value={student.successRate} className="w-24 h-2 [&>div]:bg-amber-500"/>
                                        <span>{student.successRate}%</span>
                                     </div>
                                     <span className="text-xs text-muted-foreground">{student.totalCorrectAnswers}/{student.totalAnsweredQuestions} doğru</span>
                                </TableCell>
                                <TableCell className="text-right">{student.activityCount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
