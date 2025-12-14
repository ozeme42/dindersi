
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from '@/components/user-avatar';
import { Progress } from "@/components/ui/progress";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function GeneralStatsDashboard({ studentsPerClass, signupsByDay, questionsByDifficulty, topStudents }: any) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Sınıflara Göre Öğrenci Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={studentsPerClass} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Öğrenci" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Son 30 Günlük Kayıtlar</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={signupsByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="kayit" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Kayıt" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Soru Bankası Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={questionsByDifficulty} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {questionsByDifficulty.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>En Yüksek Puanlı Öğrenciler</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Öğrenci</TableHead>
                                <TableHead>Sınıf</TableHead>
                                <TableHead className="text-right">Puan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topStudents.map((student: any, index: number) => (
                                <TableRow key={student.uid}>
                                    <TableCell className="font-bold">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={student} className="h-8 w-8"/>
                                            {student.displayName}
                                        </div>
                                    </TableCell>
                                    <TableCell>{student.class}</TableCell>
                                    <TableCell className="text-right font-semibold">{student.score.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

type SortKey = 'name' | 'average' | 'completedScales' | 'successRate';
type SortDirection = 'asc' | 'desc';

export function StudentProgressReports({ studentReports }: { studentReports: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'name', direction: 'asc' });

    const classes = useMemo(() => {
        const classNames = new Set(studentReports.map(s => s.class?.split(' - ')[0]).filter(Boolean));
        return ['all', ...Array.from(classNames)];
    }, [studentReports]);

    const filteredAndSortedReports = useMemo(() => {
        let filtered = studentReports;
        if (selectedClass !== 'all') {
            filtered = filtered.filter(s => s.class?.startsWith(selectedClass));
        }
        if (searchTerm) {
            filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return [...filtered].sort((a, b) => {
            const aValue = sortConfig.key === 'name' ? a.name : a[sortConfig.key];
            const bValue = sortConfig.key === 'name' ? b.name : b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [studentReports, searchTerm, selectedClass, sortConfig]);
    
    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Öğrenci İlerleme Raporları</CardTitle>
                <CardDescription>Tüm öğrencilerin genel ilerleme ve aktivite durumları.</CardDescription>
                <div className="flex gap-4 pt-4">
                    <Input placeholder="Öğrenci ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" />
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sınıf Filtrele" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Tüm Sınıflar' : c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Öğrenci <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                            <TableHead>Ders İlerlemesi</TableHead>
                            <TableHead>Soru Bankası Başarısı</TableHead>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('successRate')}>Genel Soru Başarısı<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedReports.map(report => (
                            <TableRow key={report.id}>
                                <TableCell>
                                    <div className="font-medium">{report.name}</div>
                                    <div className="text-sm text-muted-foreground">{report.class}</div>
                                </TableCell>
                                <TableCell>
                                     <Progress value={report.lessonProgress} className="w-[80%]" />
                                     <span className="text-xs text-muted-foreground">{report.completedTopics}/{report.totalTopics} konu</span>
                                </TableCell>
                                <TableCell>
                                     <Progress value={report.questionBankProgress} className="w-[80%]" indicatorClassName="bg-purple-500"/>
                                     <span className="text-xs text-muted-foreground">{report.passedTests}/{report.totalQuestionBankTests} test</span>
                                </TableCell>
                                <TableCell>
                                    <Progress value={report.successRate} className="w-[80%]" indicatorClassName="bg-amber-500" />
                                    <span className="text-xs text-muted-foreground">{report.totalCorrectAnswers}/{report.totalAnsweredQuestions} doğru</span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
