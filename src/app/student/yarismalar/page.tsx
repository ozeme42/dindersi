import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Users, Swords, Settings, Home } from 'lucide-react';

export default function CompetitionsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline">Çok Oyunculu Yarışmalar</h1>
        <Button asChild variant="outline">
          <Link href="/student"><Home className="mr-2 h-4 w-4" /> Panele Dön</Link>
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Yarışma Türünü Seç</CardTitle>
            <CardDescription className="text-center">Arkadaşlarınla oynamak için bir mod seç.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild size="lg" className="h-24 text-xl w-full">
              <Link href="/student/yarismalar/bireysel">
                <User className="mr-4 h-8 w-8" />
                Bireysel Yarışma
              </Link>
            </Button>
             <Button asChild size="lg" className="h-24 text-xl w-full">
              <Link href="/student/yarismalar/takim">
                <Users className="mr-4 h-8 w-8" />
                Takım Yarışması
              </Link>
            </Button>
             <Button asChild size="lg" className="h-24 text-xl w-full">
              <Link href="/student/yarismalar/duello">
                <Swords className="mr-4 h-8 w-8" />
                Düello
              </Link>
            </Button>
             <Button asChild variant="link" className="w-full">
                <Link href="/student/yarismalar/ayarlar"><Settings className="mr-2 h-4 w-4" /> Misafir Oyuncuları Yönet</Link>
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
