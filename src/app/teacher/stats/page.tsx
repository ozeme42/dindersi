
import { getGeneralStats, getStudentProgressReports } from "./actions";
import { GeneralStatsDashboard, StudentProgressReports } from "./client-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users } from 'lucide-react';

export default async function TeacherStatsPage() {
  const generalStats = await getGeneralStats();
  const studentReportsResult = await getStudentProgressReports();

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
       <h1 className="text-3xl font-bold font-headline mb-6">İstatistikler ve Raporlar</h1>
       <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general"><BarChart3 className="mr-2 h-4 w-4"/> Genel İstatistikler</TabsTrigger>
            <TabsTrigger value="progress-reports"><Users className="mr-2 h-4 w-4"/> Öğrenci İlerleme Raporları</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-6">
            <GeneralStatsDashboard {...generalStats} />
          </TabsContent>
          <TabsContent value="progress-reports" className="mt-6">
            <StudentProgressReports studentReports={studentReportsResult.data || []} />
          </TabsContent>
        </Tabs>
    </div>
  )
}
