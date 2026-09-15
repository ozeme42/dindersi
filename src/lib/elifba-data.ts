// Generated Elifba and Namaz Dualari Curriculum Data
export interface ElifbaUnitItem {
    index: number;
    audio: string;
    img: string;
    alt: string;
}

export interface ElifbaUnit {
    id: string;
    number: number;
    type: 'cuz' | 'dua';
    title: string;
    shortTitle: string;
    category: 'letters' | 'harekes' | 'rules' | 'med' | 'tanwin' | 'advanced' | 'dualar';
    badgeColor: string;
    description: string;
    notes?: string[];
    meaning?: string;
    pronunciation?: string;
    itemCount: number;
    items: ElifbaUnitItem[];
}

export const ELIFBA_UNITS: ElifbaUnit[] = [
    {
        "id": "cuz1",
        "number": 1,
        "type": "cuz",
        "title": "Ders 1: Harfler",
        "shortTitle": "Ders 1",
        "category": "letters",
        "badgeColor": "from-emerald-500 to-green-600",
        "description": "Kur’an-ı Kerim, Arapça olarak indirilmiş ilahî bir kitaptır. Dolayısıyla Kur’an, Arap alfabesindeki harflerle yazılmıştır. Bu alfabe 28 harften oluşur. Türkçeden farklı olarak metinler sağdan sola doğru yazılır ve okunur. Lamelif ( لا ), aslında ayrı bir harf değildir. Lam ( ل ) ve elif ( ا ) harflerinin bir araya gelmesiyle oluşmuştur. Akciğerlere dolan hava dışarıya ya ses ya da nefes hâlinde çıkar. İrade dışında alıp verilmekte olan nefes, ses tellerini titreştirerek çıkarıldığında ses meydana gelir. Bu ses ağız, boğaz veya dilin belli bir noktasından çıkarılırsa harf meydana gelir. Her dilde harflerin kendine özgü bir çıkış yeri vardır. Harflerin çıkış yerine mahreç denir.",
        "notes": [
            "Kur’an-ı Kerim, Arapça olarak indirilmiş ilahî bir kitaptır. Dolayısıyla Kur’an, Arap alfabesindeki harflerle yazılmıştır. Bu alfabe 28 harften oluşur. Türkçeden farklı olarak metinler sağdan sola doğru yazılır ve okunur.",
            "Lamelif ( لا ), aslında ayrı bir harf değildir. Lam ( ل ) ve elif ( ا ) harflerinin bir araya gelmesiyle oluşmuştur.",
            "Akciğerlere dolan hava dışarıya ya ses ya da nefes hâlinde çıkar. İrade dışında alıp verilmekte olan nefes, ses tellerini titreştirerek çıkarıldığında ses meydana gelir. Bu ses ağız, boğaz veya dilin belli bir noktasından çıkarılırsa harf meydana gelir. Her dilde harflerin kendine özgü bir çıkış yeri vardır. Harflerin çıkış yerine mahreç denir.",
            "Harflerin Mahreçleri (Çıkş Yerleri)",
            "Kur'an'ı doğru okuyabilmek için harfler mahreçlerine uygun olarak telaffuz edilmelidir. Çünkü harfin yanlış yerden çıkarılması, kelimelerin anlamlarının bozulmasına sebep olabilir.",
            "Türkçedeki bazı harflerin sesleri Arapçada olmadığı gibi, Arapçadaki bazı harfler de Türkçede yoktur.",
            "Peltek olarak söylenen ث ve ذ ile boğazdan hırıltılı bir sesle çıkartılan خ bu harflerdendir.",
            "Kur'an harflerinin çıkış yerleri, üç ana bölgede toplanır. Bunlar; boğaz, dil ve dudaktır.",
            "Aşağıda Arapça harfler, çıkış yerleri ve harflerin Türkçedeki karşılıkları listelenmiştir.",
            "ا Boğaz sonu - \"E\" sesi gibidir.",
            "ب Alt ve üst dudak - \"B\" sesi gibidir.",
            "ت Dil ucu ile ön diş dipleri - \"T\" sesi gibidir.",
            "ث Dil ucu ile ön diş uçları - Peltek bir harftir. Türkçe karşılığı yoktur.",
            "ج Dil ortası ve üst damak ortası - Türkçedeki \"C\" sesinden farklıdır.",
            "ح Boğaz ortası - Türkçe karşılığı yoktur.",
            "خ Boğazın ağza en yakın kısmı - Hırıltılı bir harftir. Türkçe karşılığı yoktur.",
            "د Dil ucu ile üst ön diş dipleri - \"D\" sesi gibidir.",
            "ذ Dil ucu ile ön diş uçları - Peltek bir harftir. Türkçe karşılığı yoktur.",
            "ر Dil ucu ile ön dişlerin üstündeki damak - \"R\" sesi gibidir.",
            "ز Dil ucu ile alt ön dişlerin iç yüzeyi - \"Z\" sesi gibidir.",
            "س Dil ucu ile alt ön dişlerin iç yüzeyi - \"S\" sesi gibidir.",
            "ش Dil ortası ve üst damak ortası - \"Ş\" sesinden daha yumuşaktır.",
            "ص Dil ucu ile alt ön dişlerin iç yüzeyi - Kalın \"S\" sesi gibidir (Sa).",
            "ض Dil kenarı ile üst azı dişler - Türkçe karşılığı yoktur.",
            "ط Dil ucu ile üst ön diş dipleri - Kalın \"T\" sesi gibidir (Ta).",
            "ظ Dil ucu ile ön diş uçları - Peltek bir harftir. Türkçe karşılığı yoktur.",
            "ع Boğaz ortası - Türkçe karşılığı yoktur.",
            "غ Boğazın ağza en yakın kısmı - Kalın \"Ğ\" sesi gibidir (ğa).",
            "ف Üst ön diş uçlarıyla alt dudağın içi - \"F\" sesi gibidir.",
            "ق Dil kökü ve üst damak - Türkçe karşılığı yoktur.",
            "ك Dil kökü ve küçük dil önü - \"K\" sesi gibidir.",
            "ل Dilin iki kenarı ve ucu ile üst damak - \"L\" sesi gibidir.",
            "م Alt ve üst dudak - \"M\" sesi gibidir.",
            "ن Dil ucu ile iki üst ön diş etleri - \"N\" sesi gibidir.",
            "و Alt ve üst dudak - Dudaklar ileri uzatılarak çıkarılan \"V\" sesi gibidir.",
            "ه Boğaz sonu - \"H\" sesi gibidir.",
            "ى Dil ortası ve üst damak ortası - \"Y\" sesi gibidir."
        ],
        "itemCount": 29,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1.mp3",
                "img": "/elifba/dosyalar/1.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2.mp3",
                "img": "/elifba/dosyalar/2.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3.mp3",
                "img": "/elifba/dosyalar/3.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4.mp3",
                "img": "/elifba/dosyalar/4.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5.mp3",
                "img": "/elifba/dosyalar/5.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6.mp3",
                "img": "/elifba/dosyalar/6.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7.mp3",
                "img": "/elifba/dosyalar/7.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8.mp3",
                "img": "/elifba/dosyalar/8.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9.mp3",
                "img": "/elifba/dosyalar/9.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10.mp3",
                "img": "/elifba/dosyalar/10.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11.mp3",
                "img": "/elifba/dosyalar/11.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12.mp3",
                "img": "/elifba/dosyalar/12.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13.mp3",
                "img": "/elifba/dosyalar/13.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14.mp3",
                "img": "/elifba/dosyalar/14.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15.mp3",
                "img": "/elifba/dosyalar/15.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16.mp3",
                "img": "/elifba/dosyalar/16.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17.mp3",
                "img": "/elifba/dosyalar/17.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18.mp3",
                "img": "/elifba/dosyalar/18.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19.mp3",
                "img": "/elifba/dosyalar/19.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20.mp3",
                "img": "/elifba/dosyalar/20.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21.mp3",
                "img": "/elifba/dosyalar/21.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22.mp3",
                "img": "/elifba/dosyalar/22.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23.mp3",
                "img": "/elifba/dosyalar/23.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24.mp3",
                "img": "/elifba/dosyalar/24.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25.mp3",
                "img": "/elifba/dosyalar/25.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26.mp3",
                "img": "/elifba/dosyalar/26.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27.mp3",
                "img": "/elifba/dosyalar/27.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28.mp3",
                "img": "/elifba/dosyalar/28.png",
                "alt": "Elif"
            },
            {
                "index": 29,
                "audio": "/elifba/dosyalar/29.mp3",
                "img": "/elifba/dosyalar/29.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz2",
        "number": 2,
        "type": "cuz",
        "title": "Ders 2: Harflerin Harekelerle Okunuşu",
        "shortTitle": "Ders 2",
        "category": "harekes",
        "badgeColor": "from-sky-500 to-blue-600",
        "description": "Ders 2: Harflerin Harekelerle Okunuşu alıştırmaları ve sesli telaffuzları",
        "notes": [],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-1.mp3",
                "img": "/elifba/dosyalar/1-1.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-1.mp3",
                "img": "/elifba/dosyalar/2-1.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-1.mp3",
                "img": "/elifba/dosyalar/3-1.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-1.mp3",
                "img": "/elifba/dosyalar/4-1.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-1.mp3",
                "img": "/elifba/dosyalar/5-1.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-1.mp3",
                "img": "/elifba/dosyalar/6-1.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-1.mp3",
                "img": "/elifba/dosyalar/7-1.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-1.mp3",
                "img": "/elifba/dosyalar/8-1.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-1.mp3",
                "img": "/elifba/dosyalar/9-1.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-1.mp3",
                "img": "/elifba/dosyalar/10-1.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-1.mp3",
                "img": "/elifba/dosyalar/11-1.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-1.mp3",
                "img": "/elifba/dosyalar/12-1.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-1.mp3",
                "img": "/elifba/dosyalar/13-1.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-1.mp3",
                "img": "/elifba/dosyalar/14-1.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-1.mp3",
                "img": "/elifba/dosyalar/15-1.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-1.mp3",
                "img": "/elifba/dosyalar/16-1.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-1.mp3",
                "img": "/elifba/dosyalar/17-1.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-1.mp3",
                "img": "/elifba/dosyalar/18-1.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-1.mp3",
                "img": "/elifba/dosyalar/19-1.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-1.mp3",
                "img": "/elifba/dosyalar/20-1.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-1.mp3",
                "img": "/elifba/dosyalar/21-1.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-1.mp3",
                "img": "/elifba/dosyalar/22-1.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-1.mp3",
                "img": "/elifba/dosyalar/23-1.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-1.mp3",
                "img": "/elifba/dosyalar/24-1.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-1.mp3",
                "img": "/elifba/dosyalar/25-1.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-1.mp3",
                "img": "/elifba/dosyalar/26-1.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-1.mp3",
                "img": "/elifba/dosyalar/27-1.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-1.mp3",
                "img": "/elifba/dosyalar/28-1.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz3",
        "number": 3,
        "type": "cuz",
        "title": "Ders 3: Harflerin Başta, Ortada ve Sondaki Durumları",
        "shortTitle": "Ders 3",
        "category": "letters",
        "badgeColor": "from-emerald-500 to-green-600",
        "description": "Kur’an harfleri, Türkçemizdeki el yazısında olduğu gibi, önceki ve sonraki harfe bitiştirilerek yazılır. Kelime içindeki konumuna göre harflerin yazılış biçimleri değişir. Not: ا د ذ ر ز و harfleri kendinden sonraki harfle bitişmez. Bu harflerin ortada ve sondaki yazılışları aynıdır. İnce ve Kalın Sesli Harfler",
        "notes": [
            "Kur’an harfleri, Türkçemizdeki el yazısında olduğu gibi, önceki ve sonraki harfe bitiştirilerek yazılır. Kelime içindeki konumuna göre harflerin yazılış biçimleri değişir.",
            "Not: ا د ذ ر ز و harfleri kendinden sonraki harfle bitişmez. Bu harflerin ortada ve sondaki yazılışları aynıdır.",
            "İnce ve Kalın Sesli Harfler",
            "Kur'an harfleri, kalın ve ince olmak üzere iki gruba ayrılır. Bu harflerin 18'i ince, 10'u kalın sesle okunur."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-1.mp3",
                "img": "/elifba/dosyalar/1-2.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-1.mp3",
                "img": "/elifba/dosyalar/2-2.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-1.mp3",
                "img": "/elifba/dosyalar/3-2.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-1.mp3",
                "img": "/elifba/dosyalar/4-2.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-1.mp3",
                "img": "/elifba/dosyalar/5-2.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-1.mp3",
                "img": "/elifba/dosyalar/6-2.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-1.mp3",
                "img": "/elifba/dosyalar/7-2.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-1.mp3",
                "img": "/elifba/dosyalar/8-2.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-1.mp3",
                "img": "/elifba/dosyalar/9-2.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-1.mp3",
                "img": "/elifba/dosyalar/10-2.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-1.mp3",
                "img": "/elifba/dosyalar/11-2.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-1.mp3",
                "img": "/elifba/dosyalar/12-2.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-1.mp3",
                "img": "/elifba/dosyalar/13-2.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-1.mp3",
                "img": "/elifba/dosyalar/14-2.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-1.mp3",
                "img": "/elifba/dosyalar/15-2.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-1.mp3",
                "img": "/elifba/dosyalar/16-2.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-1.mp3",
                "img": "/elifba/dosyalar/17-2.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-1.mp3",
                "img": "/elifba/dosyalar/18-2.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-1.mp3",
                "img": "/elifba/dosyalar/19-2.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-1.mp3",
                "img": "/elifba/dosyalar/20-2.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-1.mp3",
                "img": "/elifba/dosyalar/21-2.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-1.mp3",
                "img": "/elifba/dosyalar/22-2.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-1.mp3",
                "img": "/elifba/dosyalar/23-2.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-1.mp3",
                "img": "/elifba/dosyalar/24-2.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-1.mp3",
                "img": "/elifba/dosyalar/25-2.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-1.mp3",
                "img": "/elifba/dosyalar/26-2.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-1.mp3",
                "img": "/elifba/dosyalar/27-2.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-1.mp3",
                "img": "/elifba/dosyalar/28-2.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz4",
        "number": 4,
        "type": "cuz",
        "title": "Ders 4: Üstün 1",
        "shortTitle": "Ders 4",
        "category": "harekes",
        "badgeColor": "from-sky-500 to-blue-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Üstün: Harfin üstüne yazılan yatık bir çizgidir ( َ ). Bu işarete Arapçada fetha denilir. Üstün, ince harflerin 'e', kalın harflerin 'a' sesiyle okunmasını sağlar. Örneğin sin ( س ) harfine üstün işareti konulunca se ( سَ ), sad ( ص ) harfine üstün konulunca sa ( صَ ) şeklinde okunur.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Üstün: Harfin üstüne yazılan yatık bir çizgidir ( َ ). Bu işarete Arapçada fetha denilir. Üstün, ince harflerin 'e', kalın harflerin 'a' sesiyle okunmasını sağlar. Örneğin sin ( س ) harfine üstün işareti konulunca se ( سَ ), sad ( ص ) harfine üstün konulunca sa ( صَ ) şeklinde okunur."
        ],
        "itemCount": 18,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-2.mp3",
                "img": "/elifba/dosyalar/1-3.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-2.mp3",
                "img": "/elifba/dosyalar/2-3.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-2.mp3",
                "img": "/elifba/dosyalar/3-3.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-2.mp3",
                "img": "/elifba/dosyalar/4-3.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-2.mp3",
                "img": "/elifba/dosyalar/5-3.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-2.mp3",
                "img": "/elifba/dosyalar/6-3.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-2.mp3",
                "img": "/elifba/dosyalar/7-3.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-2.mp3",
                "img": "/elifba/dosyalar/8-3.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-2.mp3",
                "img": "/elifba/dosyalar/9-3.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-2.mp3",
                "img": "/elifba/dosyalar/10-3.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-2.mp3",
                "img": "/elifba/dosyalar/11-3.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-2.mp3",
                "img": "/elifba/dosyalar/12-3.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-2.mp3",
                "img": "/elifba/dosyalar/13-3.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-2.mp3",
                "img": "/elifba/dosyalar/14-3.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-2.mp3",
                "img": "/elifba/dosyalar/15-3.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-2.mp3",
                "img": "/elifba/dosyalar/16-3.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-2.mp3",
                "img": "/elifba/dosyalar/17-3.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-2.mp3",
                "img": "/elifba/dosyalar/18-3.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz5",
        "number": 5,
        "type": "cuz",
        "title": "Ders 5: Üstün 2",
        "shortTitle": "Ders 5",
        "category": "harekes",
        "badgeColor": "from-sky-500 to-blue-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz."
        ],
        "itemCount": 14,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-4.mp3",
                "img": "/elifba/dosyalar/1-5.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-4.mp3",
                "img": "/elifba/dosyalar/2-5.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-4.mp3",
                "img": "/elifba/dosyalar/3-5.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-4.mp3",
                "img": "/elifba/dosyalar/4-5.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-4.mp3",
                "img": "/elifba/dosyalar/5-5.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-4.mp3",
                "img": "/elifba/dosyalar/6-5.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-4.mp3",
                "img": "/elifba/dosyalar/7-5.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-4.mp3",
                "img": "/elifba/dosyalar/8-5.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-4.mp3",
                "img": "/elifba/dosyalar/9-5.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-4.mp3",
                "img": "/elifba/dosyalar/10-5.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-4.mp3",
                "img": "/elifba/dosyalar/11-5.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-4.mp3",
                "img": "/elifba/dosyalar/12-5.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-4.mp3",
                "img": "/elifba/dosyalar/13-5.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-4.mp3",
                "img": "/elifba/dosyalar/14-5.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz6",
        "number": 6,
        "type": "cuz",
        "title": "Ders 6: Üstün 3",
        "shortTitle": "Ders 6",
        "category": "harekes",
        "badgeColor": "from-sky-500 to-blue-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz."
        ],
        "itemCount": 14,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-3.mp3",
                "img": "/elifba/dosyalar/1-4.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-3.mp3",
                "img": "/elifba/dosyalar/2-4.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-3.mp3",
                "img": "/elifba/dosyalar/3-4.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-3.mp3",
                "img": "/elifba/dosyalar/4-4.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-3.mp3",
                "img": "/elifba/dosyalar/5-4.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-3.mp3",
                "img": "/elifba/dosyalar/6-4.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-3.mp3",
                "img": "/elifba/dosyalar/7-4.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-3.mp3",
                "img": "/elifba/dosyalar/8-4.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-3.mp3",
                "img": "/elifba/dosyalar/9-4.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-3.mp3",
                "img": "/elifba/dosyalar/10-4.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-3.mp3",
                "img": "/elifba/dosyalar/11-4.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-3.mp3",
                "img": "/elifba/dosyalar/12-4.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-3.mp3",
                "img": "/elifba/dosyalar/13-4.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-3.mp3",
                "img": "/elifba/dosyalar/14-4.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz7",
        "number": 7,
        "type": "cuz",
        "title": "Ders 7: Esre",
        "shortTitle": "Ders 7",
        "category": "harekes",
        "badgeColor": "from-sky-500 to-blue-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Esre: Harfin altına yazılan yatık bir çizgidir ( ِ ). Bu işarete Arapçada kesre denilir. Esre, ince harflerin 'i' sesiyle, kalın harflerin 'ı-i' arası bir sesle okunmasını sağlar.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Esre: Harfin altına yazılan yatık bir çizgidir ( ِ ). Bu işarete Arapçada kesre denilir. Esre, ince harflerin 'i' sesiyle, kalın harflerin 'ı-i' arası bir sesle okunmasını sağlar."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-5.mp3",
                "img": "/elifba/dosyalar/1-6.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-5.mp3",
                "img": "/elifba/dosyalar/2-6.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-5.mp3",
                "img": "/elifba/dosyalar/3-6.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-5.mp3",
                "img": "/elifba/dosyalar/4-6.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-5.mp3",
                "img": "/elifba/dosyalar/5-6.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-5.mp3",
                "img": "/elifba/dosyalar/6-6.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-5.mp3",
                "img": "/elifba/dosyalar/7-6.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-5.mp3",
                "img": "/elifba/dosyalar/8-6.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-5.mp3",
                "img": "/elifba/dosyalar/9-6.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-5.mp3",
                "img": "/elifba/dosyalar/10-6.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-5.mp3",
                "img": "/elifba/dosyalar/11-6.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-5.mp3",
                "img": "/elifba/dosyalar/12-6.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-5.mp3",
                "img": "/elifba/dosyalar/13-6.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-5.mp3",
                "img": "/elifba/dosyalar/14-6.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-3.mp3",
                "img": "/elifba/dosyalar/15-4.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-3.mp3",
                "img": "/elifba/dosyalar/16-4.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-3.mp3",
                "img": "/elifba/dosyalar/17-4.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-3.mp3",
                "img": "/elifba/dosyalar/18-4.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-2.mp3",
                "img": "/elifba/dosyalar/19-3.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-2.mp3",
                "img": "/elifba/dosyalar/20-3.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-2.mp3",
                "img": "/elifba/dosyalar/21-3.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-2.mp3",
                "img": "/elifba/dosyalar/22-3.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-2.mp3",
                "img": "/elifba/dosyalar/23-3.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-2.mp3",
                "img": "/elifba/dosyalar/24-3.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-2.mp3",
                "img": "/elifba/dosyalar/25-3.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-2.mp3",
                "img": "/elifba/dosyalar/26-3.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-2.mp3",
                "img": "/elifba/dosyalar/27-3.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-2.mp3",
                "img": "/elifba/dosyalar/28-3.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz8",
        "number": 8,
        "type": "cuz",
        "title": "Ders 8: Ötre",
        "shortTitle": "Ders 8",
        "category": "harekes",
        "badgeColor": "from-sky-500 to-blue-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Ötre: Harfin üstüne yazılan ve küçük bir vav'a benzeyen işarettir ( ُ ). Bu işarete Arapçada damme denilir. Ötre, ince harflerin 'u-ü' arası bir sesle, kalın harflerin 'u' sesiyle okunmasını sağlar.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Ötre: Harfin üstüne yazılan ve küçük bir vav'a benzeyen işarettir ( ُ ). Bu işarete Arapçada damme denilir. Ötre, ince harflerin 'u-ü' arası bir sesle, kalın harflerin 'u' sesiyle okunmasını sağlar."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-6.mp3",
                "img": "/elifba/dosyalar/1-7.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-6.mp3",
                "img": "/elifba/dosyalar/2-7.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-6.mp3",
                "img": "/elifba/dosyalar/3-7.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-6.mp3",
                "img": "/elifba/dosyalar/4-7.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-6.mp3",
                "img": "/elifba/dosyalar/5-7.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-6.mp3",
                "img": "/elifba/dosyalar/6-7.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-6.mp3",
                "img": "/elifba/dosyalar/7-7.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-6.mp3",
                "img": "/elifba/dosyalar/8-7.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-6.mp3",
                "img": "/elifba/dosyalar/9-7.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-6.mp3",
                "img": "/elifba/dosyalar/10-7.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-6.mp3",
                "img": "/elifba/dosyalar/11-7.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-6.mp3",
                "img": "/elifba/dosyalar/12-7.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-6.mp3",
                "img": "/elifba/dosyalar/13-7.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-6.mp3",
                "img": "/elifba/dosyalar/14-7.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-4.mp3",
                "img": "/elifba/dosyalar/15-5.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-4.mp3",
                "img": "/elifba/dosyalar/16-5.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-4.mp3",
                "img": "/elifba/dosyalar/17-5.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-4.mp3",
                "img": "/elifba/dosyalar/18-5.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-3.mp3",
                "img": "/elifba/dosyalar/19-4.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-3.mp3",
                "img": "/elifba/dosyalar/20-4.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-3.mp3",
                "img": "/elifba/dosyalar/21-4.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-3.mp3",
                "img": "/elifba/dosyalar/22-4.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-3.mp3",
                "img": "/elifba/dosyalar/23-4.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-3.mp3",
                "img": "/elifba/dosyalar/24-4.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-3.mp3",
                "img": "/elifba/dosyalar/25-4.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-3.mp3",
                "img": "/elifba/dosyalar/26-4.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-3.mp3",
                "img": "/elifba/dosyalar/27-4.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-3.mp3",
                "img": "/elifba/dosyalar/28-4.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz9",
        "number": 9,
        "type": "cuz",
        "title": "Ders 9: Harflerin Cezimli Okunuşu",
        "shortTitle": "Ders 9",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Cezim, harfin üzerine küçük bir daire şeklinde yazılan işarettir .( ْ ) Cezim, harflerin harekesiz olarak okunmasını sağlar. Harekeli bir harf cezimli bir harfle birleşince Türkçedeki sessiz harfle biten kapalı hece biçimi oluşur.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Cezim, harfin üzerine küçük bir daire şeklinde yazılan işarettir .( ْ )",
            "Cezim, harflerin harekesiz olarak okunmasını sağlar. Harekeli bir harf cezimli bir harfle birleşince Türkçedeki sessiz harfle biten kapalı hece biçimi oluşur.",
            "Örneğin, üstünlü hemze ile cezimli lam birleşince اَلْ (el) şeklinde okunur."
        ],
        "itemCount": 27,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-7.mp3",
                "img": "/elifba/dosyalar/1-8.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-7.mp3",
                "img": "/elifba/dosyalar/2-8.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-7.mp3",
                "img": "/elifba/dosyalar/3-8.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-7.mp3",
                "img": "/elifba/dosyalar/4-8.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-7.mp3",
                "img": "/elifba/dosyalar/5-8.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-7.mp3",
                "img": "/elifba/dosyalar/6-8.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-7.mp3",
                "img": "/elifba/dosyalar/7-8.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-7.mp3",
                "img": "/elifba/dosyalar/8-8.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-7.mp3",
                "img": "/elifba/dosyalar/9-8.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-7.mp3",
                "img": "/elifba/dosyalar/10-8.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-7.mp3",
                "img": "/elifba/dosyalar/11-8.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-7.mp3",
                "img": "/elifba/dosyalar/12-8.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-7.mp3",
                "img": "/elifba/dosyalar/13-8.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-7.mp3",
                "img": "/elifba/dosyalar/14-8.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-5.mp3",
                "img": "/elifba/dosyalar/15-6.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-5.mp3",
                "img": "/elifba/dosyalar/16-6.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-5.mp3",
                "img": "/elifba/dosyalar/17-6.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-5.mp3",
                "img": "/elifba/dosyalar/18-6.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-4.mp3",
                "img": "/elifba/dosyalar/19-5.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-4.mp3",
                "img": "/elifba/dosyalar/20-5.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-4.mp3",
                "img": "/elifba/dosyalar/21-5.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-4.mp3",
                "img": "/elifba/dosyalar/22-5.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-4.mp3",
                "img": "/elifba/dosyalar/23-5.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-4.mp3",
                "img": "/elifba/dosyalar/24-5.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-4.mp3",
                "img": "/elifba/dosyalar/25-5.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-4.mp3",
                "img": "/elifba/dosyalar/26-5.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-4.mp3",
                "img": "/elifba/dosyalar/27-5.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz10",
        "number": 10,
        "type": "cuz",
        "title": "Ders 10: Cezm",
        "shortTitle": "Ders 10",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Cezim, harfin üzerine küçük bir daire şeklinde yazılan işarettir .( ْ ) Cezim, harflerin harekesiz olarak okunmasını sağlar. Harekeli bir harf cezimli bir harfle birleşince Türkçedeki sessiz harfle biten kapalı hece biçimi oluşur.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Cezim, harfin üzerine küçük bir daire şeklinde yazılan işarettir .( ْ )",
            "Cezim, harflerin harekesiz olarak okunmasını sağlar. Harekeli bir harf cezimli bir harfle birleşince Türkçedeki sessiz harfle biten kapalı hece biçimi oluşur.",
            "Örneğin, üstünlü hemze ile cezimli lam birleşince اَلْ (el) şeklinde okunur."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-8.mp3",
                "img": "/elifba/dosyalar/1-9.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-8.mp3",
                "img": "/elifba/dosyalar/2-9.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-8.mp3",
                "img": "/elifba/dosyalar/3-9.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-8.mp3",
                "img": "/elifba/dosyalar/4-9.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-8.mp3",
                "img": "/elifba/dosyalar/5-9.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-8.mp3",
                "img": "/elifba/dosyalar/6-9.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-8.mp3",
                "img": "/elifba/dosyalar/7-9.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-8.mp3",
                "img": "/elifba/dosyalar/8-9.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-8.mp3",
                "img": "/elifba/dosyalar/9-9.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-8.mp3",
                "img": "/elifba/dosyalar/10-9.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-8.mp3",
                "img": "/elifba/dosyalar/11-9.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-8.mp3",
                "img": "/elifba/dosyalar/12-9.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-8.mp3",
                "img": "/elifba/dosyalar/13-9.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-8.mp3",
                "img": "/elifba/dosyalar/14-9.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-6.mp3",
                "img": "/elifba/dosyalar/15-7.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-6.mp3",
                "img": "/elifba/dosyalar/16-7.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-6.mp3",
                "img": "/elifba/dosyalar/17-7.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-6.mp3",
                "img": "/elifba/dosyalar/18-7.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-5.mp3",
                "img": "/elifba/dosyalar/19-6.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-5.mp3",
                "img": "/elifba/dosyalar/20-6.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-5.mp3",
                "img": "/elifba/dosyalar/21-6.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-5.mp3",
                "img": "/elifba/dosyalar/22-6.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-5.mp3",
                "img": "/elifba/dosyalar/23-6.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-5.mp3",
                "img": "/elifba/dosyalar/24-6.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-5.mp3",
                "img": "/elifba/dosyalar/25-6.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-5.mp3",
                "img": "/elifba/dosyalar/26-6.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-5.mp3",
                "img": "/elifba/dosyalar/27-6.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-4.mp3",
                "img": "/elifba/dosyalar/28-5.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz11",
        "number": 11,
        "type": "cuz",
        "title": "Ders 11: Alıştırmalar 1",
        "shortTitle": "Ders 11",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-9.mp3",
                "img": "/elifba/dosyalar/1-10.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-9.mp3",
                "img": "/elifba/dosyalar/2-10.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-9.mp3",
                "img": "/elifba/dosyalar/3-10.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-9.mp3",
                "img": "/elifba/dosyalar/4-10.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-9.mp3",
                "img": "/elifba/dosyalar/5-10.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-9.mp3",
                "img": "/elifba/dosyalar/6-10.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-9.mp3",
                "img": "/elifba/dosyalar/7-10.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-9.mp3",
                "img": "/elifba/dosyalar/8-10.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-9.mp3",
                "img": "/elifba/dosyalar/9-10.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-9.mp3",
                "img": "/elifba/dosyalar/10-10.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-9.mp3",
                "img": "/elifba/dosyalar/11-10.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-9.mp3",
                "img": "/elifba/dosyalar/12-10.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-9.mp3",
                "img": "/elifba/dosyalar/13-10.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-9.mp3",
                "img": "/elifba/dosyalar/14-10.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-7.mp3",
                "img": "/elifba/dosyalar/15-8.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-7.mp3",
                "img": "/elifba/dosyalar/16-8.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-7.mp3",
                "img": "/elifba/dosyalar/17-8.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-7.mp3",
                "img": "/elifba/dosyalar/18-8.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-6.mp3",
                "img": "/elifba/dosyalar/19-7.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-6.mp3",
                "img": "/elifba/dosyalar/20-7.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-6.mp3",
                "img": "/elifba/dosyalar/21-7.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-6.mp3",
                "img": "/elifba/dosyalar/22-7.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-6.mp3",
                "img": "/elifba/dosyalar/23-7.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-6.mp3",
                "img": "/elifba/dosyalar/24-7.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-6.mp3",
                "img": "/elifba/dosyalar/25-7.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-6.mp3",
                "img": "/elifba/dosyalar/26-7.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-6.mp3",
                "img": "/elifba/dosyalar/27-7.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-5.mp3",
                "img": "/elifba/dosyalar/28-6.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz12",
        "number": 12,
        "type": "cuz",
        "title": "Ders 12: Harflerin Uzatılarak Okunuşu",
        "shortTitle": "Ders 12",
        "category": "med",
        "badgeColor": "from-teal-500 to-emerald-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Med , uzatmak demektir. Kendinden önceki harfin uzatılarak okunmasını sağlayan harflere med harfleri (uzatma harfleri) denir. Med harfleri üçtür: Elif ( ا ), vav ( و ), ya ( ى )",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Med , uzatmak demektir. Kendinden önceki harfin uzatılarak okunmasını sağlayan harflere med harfleri (uzatma harfleri) denir. Med harfleri üçtür: Elif ( ا ), vav ( و ), ya ( ى )"
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-10.mp3",
                "img": "/elifba/dosyalar/1-11.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-10.mp3",
                "img": "/elifba/dosyalar/2-11.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-10.mp3",
                "img": "/elifba/dosyalar/3-11.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-10.mp3",
                "img": "/elifba/dosyalar/4-11.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-10.mp3",
                "img": "/elifba/dosyalar/5-11.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-10.mp3",
                "img": "/elifba/dosyalar/6-11.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-10.mp3",
                "img": "/elifba/dosyalar/7-11.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-10.mp3",
                "img": "/elifba/dosyalar/8-11.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-10.mp3",
                "img": "/elifba/dosyalar/9-11.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-10.mp3",
                "img": "/elifba/dosyalar/10-11.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-10.mp3",
                "img": "/elifba/dosyalar/11-11.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-10.mp3",
                "img": "/elifba/dosyalar/12-11.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-10.mp3",
                "img": "/elifba/dosyalar/13-11.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-10.mp3",
                "img": "/elifba/dosyalar/14-11.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-8.mp3",
                "img": "/elifba/dosyalar/15-9.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-8.mp3",
                "img": "/elifba/dosyalar/16-9.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-8.mp3",
                "img": "/elifba/dosyalar/17-9.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-8.mp3",
                "img": "/elifba/dosyalar/18-9.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-7.mp3",
                "img": "/elifba/dosyalar/19-8.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-7.mp3",
                "img": "/elifba/dosyalar/20-8.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-7.mp3",
                "img": "/elifba/dosyalar/21-8.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-7.mp3",
                "img": "/elifba/dosyalar/22-8.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-7.mp3",
                "img": "/elifba/dosyalar/23-8.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-7.mp3",
                "img": "/elifba/dosyalar/24-8.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-7.mp3",
                "img": "/elifba/dosyalar/25-8.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-7.mp3",
                "img": "/elifba/dosyalar/26-8.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-7.mp3",
                "img": "/elifba/dosyalar/27-8.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-6.mp3",
                "img": "/elifba/dosyalar/28-7.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz13",
        "number": 13,
        "type": "cuz",
        "title": "Ders 13: Med (Uzatma) Harfi: Elif",
        "shortTitle": "Ders 13",
        "category": "med",
        "badgeColor": "from-teal-500 to-emerald-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Elif ( ا ): Kendisinden önceki üstünlü harfin uzatılarak okunmasını sağlar. İnce harfleri 'e-a' arası bir sesle, kalın harfleri 'a' sesiyle uzatır.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Elif ( ا ): Kendisinden önceki üstünlü harfin uzatılarak okunmasını sağlar. İnce harfleri 'e-a' arası bir sesle, kalın harfleri 'a' sesiyle uzatır."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-11.mp3",
                "img": "/elifba/dosyalar/1-12.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-11.mp3",
                "img": "/elifba/dosyalar/2-12.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-11.mp3",
                "img": "/elifba/dosyalar/3-12.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-11.mp3",
                "img": "/elifba/dosyalar/4-12.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-11.mp3",
                "img": "/elifba/dosyalar/5-12.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-11.mp3",
                "img": "/elifba/dosyalar/6-12.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-11.mp3",
                "img": "/elifba/dosyalar/7-12.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-11.mp3",
                "img": "/elifba/dosyalar/8-12.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-11.mp3",
                "img": "/elifba/dosyalar/9-12.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-11.mp3",
                "img": "/elifba/dosyalar/10-12.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-11.mp3",
                "img": "/elifba/dosyalar/11-12.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-11.mp3",
                "img": "/elifba/dosyalar/12-12.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-11.mp3",
                "img": "/elifba/dosyalar/13-12.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-11.mp3",
                "img": "/elifba/dosyalar/14-12.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-9.mp3",
                "img": "/elifba/dosyalar/15-10.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-9.mp3",
                "img": "/elifba/dosyalar/16-10.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-9.mp3",
                "img": "/elifba/dosyalar/17-10.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-9.mp3",
                "img": "/elifba/dosyalar/18-10.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-8.mp3",
                "img": "/elifba/dosyalar/19-9.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-8.mp3",
                "img": "/elifba/dosyalar/20-9.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-8.mp3",
                "img": "/elifba/dosyalar/21-9.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-8.mp3",
                "img": "/elifba/dosyalar/22-9.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-8.mp3",
                "img": "/elifba/dosyalar/23-9.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-8.mp3",
                "img": "/elifba/dosyalar/24-9.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-8.mp3",
                "img": "/elifba/dosyalar/25-9.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-8.mp3",
                "img": "/elifba/dosyalar/26-9.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-8.mp3",
                "img": "/elifba/dosyalar/27-9.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-7.mp3",
                "img": "/elifba/dosyalar/28-8.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz14",
        "number": 14,
        "type": "cuz",
        "title": "Ders 14: Med (Uzatma) Harfi: Yâ",
        "shortTitle": "Ders 14",
        "category": "med",
        "badgeColor": "from-teal-500 to-emerald-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Ya ( ى ): Kendisinden önceki esreli harfin uzatılarak okunmasını sağlar. İnce harfleri \"i\" sesiyle, kalın harfleri \"ı-i\" arası bir sesle uzatır.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Ya ( ى ): Kendisinden önceki esreli harfin uzatılarak okunmasını sağlar. İnce harfleri \"i\" sesiyle, kalın harfleri \"ı-i\" arası bir sesle uzatır."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-12.mp3",
                "img": "/elifba/dosyalar/1-13.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-12.mp3",
                "img": "/elifba/dosyalar/2-13.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-12.mp3",
                "img": "/elifba/dosyalar/3-13.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-12.mp3",
                "img": "/elifba/dosyalar/4-13.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-12.mp3",
                "img": "/elifba/dosyalar/5-13.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-12.mp3",
                "img": "/elifba/dosyalar/6-13.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-12.mp3",
                "img": "/elifba/dosyalar/7-13.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-12.mp3",
                "img": "/elifba/dosyalar/8-13.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-12.mp3",
                "img": "/elifba/dosyalar/9-13.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-12.mp3",
                "img": "/elifba/dosyalar/10-13.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-12.mp3",
                "img": "/elifba/dosyalar/11-13.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-12.mp3",
                "img": "/elifba/dosyalar/12-13.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-12.mp3",
                "img": "/elifba/dosyalar/13-13.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-12.mp3",
                "img": "/elifba/dosyalar/14-13.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-10.mp3",
                "img": "/elifba/dosyalar/15-11.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-10.mp3",
                "img": "/elifba/dosyalar/16-11.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-10.mp3",
                "img": "/elifba/dosyalar/17-11.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-10.mp3",
                "img": "/elifba/dosyalar/18-11.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-9.mp3",
                "img": "/elifba/dosyalar/19-10.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-9.mp3",
                "img": "/elifba/dosyalar/20-10.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-9.mp3",
                "img": "/elifba/dosyalar/21-10.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-9.mp3",
                "img": "/elifba/dosyalar/22-10.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-9.mp3",
                "img": "/elifba/dosyalar/23-10.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-9.mp3",
                "img": "/elifba/dosyalar/24-10.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-9.mp3",
                "img": "/elifba/dosyalar/25-10.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-9.mp3",
                "img": "/elifba/dosyalar/26-10.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-9.mp3",
                "img": "/elifba/dosyalar/27-10.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-8.mp3",
                "img": "/elifba/dosyalar/28-9.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz15",
        "number": 15,
        "type": "cuz",
        "title": "Ders 15: Med (Uzatma) Harfi: Vâv",
        "shortTitle": "Ders 15",
        "category": "med",
        "badgeColor": "from-teal-500 to-emerald-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Vav ( و ): Kendisinden önceki ötreli harfin uzatılarak okunmasını sağlar. İnce harfleri \"u-ü\" arası bir sesle, kalın harfleri \"u\" sesiyle uzatır.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Vav ( و ): Kendisinden önceki ötreli harfin uzatılarak okunmasını sağlar. İnce harfleri \"u-ü\" arası bir sesle, kalın harfleri \"u\" sesiyle uzatır."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-13.mp3",
                "img": "/elifba/dosyalar/1-14.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-13.mp3",
                "img": "/elifba/dosyalar/2-14.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-13.mp3",
                "img": "/elifba/dosyalar/3-14.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-13.mp3",
                "img": "/elifba/dosyalar/4-14.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-13.mp3",
                "img": "/elifba/dosyalar/5-14.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-13.mp3",
                "img": "/elifba/dosyalar/6-14.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-13.mp3",
                "img": "/elifba/dosyalar/7-14.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-13.mp3",
                "img": "/elifba/dosyalar/8-14.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-13.mp3",
                "img": "/elifba/dosyalar/9-14.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-13.mp3",
                "img": "/elifba/dosyalar/10-14.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-13.mp3",
                "img": "/elifba/dosyalar/11-14.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-13.mp3",
                "img": "/elifba/dosyalar/12-14.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-13.mp3",
                "img": "/elifba/dosyalar/13-14.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-13.mp3",
                "img": "/elifba/dosyalar/14-14.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-11.mp3",
                "img": "/elifba/dosyalar/15-12.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-11.mp3",
                "img": "/elifba/dosyalar/16-12.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-11.mp3",
                "img": "/elifba/dosyalar/17-12.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-11.mp3",
                "img": "/elifba/dosyalar/18-12.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-10.mp3",
                "img": "/elifba/dosyalar/19-11.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-10.mp3",
                "img": "/elifba/dosyalar/20-11.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-10.mp3",
                "img": "/elifba/dosyalar/21-11.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-10.mp3",
                "img": "/elifba/dosyalar/22-11.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-10.mp3",
                "img": "/elifba/dosyalar/23-11.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-10.mp3",
                "img": "/elifba/dosyalar/24-11.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-10.mp3",
                "img": "/elifba/dosyalar/25-11.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-10.mp3",
                "img": "/elifba/dosyalar/26-11.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-10.mp3",
                "img": "/elifba/dosyalar/27-11.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-9.mp3",
                "img": "/elifba/dosyalar/28-10.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz16",
        "number": 16,
        "type": "cuz",
        "title": "Ders 16: Alıştırmalar 2",
        "shortTitle": "Ders 16",
        "category": "med",
        "badgeColor": "from-teal-500 to-emerald-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-14.mp3",
                "img": "/elifba/dosyalar/1-15.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-14.mp3",
                "img": "/elifba/dosyalar/2-15.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-14.mp3",
                "img": "/elifba/dosyalar/3-15.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-14.mp3",
                "img": "/elifba/dosyalar/4-15.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-14.mp3",
                "img": "/elifba/dosyalar/5-15.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-14.mp3",
                "img": "/elifba/dosyalar/6-15.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-14.mp3",
                "img": "/elifba/dosyalar/7-15.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-14.mp3",
                "img": "/elifba/dosyalar/8-15.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-14.mp3",
                "img": "/elifba/dosyalar/9-15.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-14.mp3",
                "img": "/elifba/dosyalar/10-15.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-14.mp3",
                "img": "/elifba/dosyalar/11-15.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-14.mp3",
                "img": "/elifba/dosyalar/12-15.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-14.mp3",
                "img": "/elifba/dosyalar/13-15.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-14.mp3",
                "img": "/elifba/dosyalar/14-15.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-12.mp3",
                "img": "/elifba/dosyalar/15-13.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-12.mp3",
                "img": "/elifba/dosyalar/16-13.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-12.mp3",
                "img": "/elifba/dosyalar/17-13.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-12.mp3",
                "img": "/elifba/dosyalar/18-13.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-11.mp3",
                "img": "/elifba/dosyalar/19-12.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-11.mp3",
                "img": "/elifba/dosyalar/20-12.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-11.mp3",
                "img": "/elifba/dosyalar/21-12.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-11.mp3",
                "img": "/elifba/dosyalar/22-12.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-11.mp3",
                "img": "/elifba/dosyalar/23-12.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-11.mp3",
                "img": "/elifba/dosyalar/24-12.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-11.mp3",
                "img": "/elifba/dosyalar/25-12.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-11.mp3",
                "img": "/elifba/dosyalar/26-12.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-11.mp3",
                "img": "/elifba/dosyalar/27-12.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-10.mp3",
                "img": "/elifba/dosyalar/28-11.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz17",
        "number": 17,
        "type": "cuz",
        "title": "Ders 17: Harflerin Şeddeli Okunuşu",
        "shortTitle": "Ders 17",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Şedde, harfin üzerine birleşmiş iki küçük \"u\" harfine benzer şekilde yazılan işarettir ( ّ ). Üzerinde bulunduğu harfin iki defa okunmasını sağlar. Dolayısıyla şeddeli harf, aslında iki harftir. Bunlardan birincisi cezimli, ikincisi harekelidir. Örneğin, اِنَّ şeklinde yazılan kelime اِنْ نَ (inne) diye okunur.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Şedde, harfin üzerine birleşmiş iki küçük \"u\" harfine benzer şekilde yazılan işarettir ( ّ ). Üzerinde bulunduğu harfin iki defa okunmasını sağlar. Dolayısıyla şeddeli harf, aslında iki harftir. Bunlardan birincisi cezimli, ikincisi harekelidir.",
            "Örneğin, اِنَّ şeklinde yazılan kelime اِنْ نَ (inne) diye okunur."
        ],
        "itemCount": 27,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-15.mp3",
                "img": "/elifba/dosyalar/1-16.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-15.mp3",
                "img": "/elifba/dosyalar/2-16.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-15.mp3",
                "img": "/elifba/dosyalar/3-16.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-15.mp3",
                "img": "/elifba/dosyalar/4-16.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-15.mp3",
                "img": "/elifba/dosyalar/5-16.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-15.mp3",
                "img": "/elifba/dosyalar/6-16.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-15.mp3",
                "img": "/elifba/dosyalar/7-16.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-15.mp3",
                "img": "/elifba/dosyalar/8-16.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-15.mp3",
                "img": "/elifba/dosyalar/9-16.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-15.mp3",
                "img": "/elifba/dosyalar/10-16.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-15.mp3",
                "img": "/elifba/dosyalar/11-16.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-15.mp3",
                "img": "/elifba/dosyalar/12-16.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-15.mp3",
                "img": "/elifba/dosyalar/13-16.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-15.mp3",
                "img": "/elifba/dosyalar/14-16.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-13.mp3",
                "img": "/elifba/dosyalar/15-14.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-13.mp3",
                "img": "/elifba/dosyalar/16-14.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-13.mp3",
                "img": "/elifba/dosyalar/17-14.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-13.mp3",
                "img": "/elifba/dosyalar/18-14.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-12.mp3",
                "img": "/elifba/dosyalar/19-13.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-12.mp3",
                "img": "/elifba/dosyalar/20-13.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-12.mp3",
                "img": "/elifba/dosyalar/21-13.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-12.mp3",
                "img": "/elifba/dosyalar/22-13.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-12.mp3",
                "img": "/elifba/dosyalar/23-13.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-12.mp3",
                "img": "/elifba/dosyalar/24-13.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-12.mp3",
                "img": "/elifba/dosyalar/25-13.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-12.mp3",
                "img": "/elifba/dosyalar/26-13.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-12.mp3",
                "img": "/elifba/dosyalar/27-13.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz18",
        "number": 18,
        "type": "cuz",
        "title": "Ders 18: Şedde",
        "shortTitle": "Ders 18",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Şedde, harfin üzerine birleşmiş iki küçük \"u\" harfine benzer şekilde yazılan işarettir ( ّ ). Üzerinde bulunduğu harfin iki defa okunmasını sağlar. Dolayısıyla şeddeli harf, aslında iki harftir. Bunlardan birincisi cezimli, ikincisi harekelidir. Örneğin, اِنَّ şeklinde yazılan kelime اِنْ نَ (inne) diye okunur.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Şedde, harfin üzerine birleşmiş iki küçük \"u\" harfine benzer şekilde yazılan işarettir ( ّ ). Üzerinde bulunduğu harfin iki defa okunmasını sağlar. Dolayısıyla şeddeli harf, aslında iki harftir. Bunlardan birincisi cezimli, ikincisi harekelidir.",
            "Örneğin, اِنَّ şeklinde yazılan kelime اِنْ نَ (inne) diye okunur."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-16.mp3",
                "img": "/elifba/dosyalar/1-17.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-16.mp3",
                "img": "/elifba/dosyalar/2-17.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-16.mp3",
                "img": "/elifba/dosyalar/3-17.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-16.mp3",
                "img": "/elifba/dosyalar/4-17.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-16.mp3",
                "img": "/elifba/dosyalar/5-17.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-16.mp3",
                "img": "/elifba/dosyalar/6-17.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-16.mp3",
                "img": "/elifba/dosyalar/7-17.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-16.mp3",
                "img": "/elifba/dosyalar/8-17.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-16.mp3",
                "img": "/elifba/dosyalar/9-17.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-16.mp3",
                "img": "/elifba/dosyalar/10-17.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-16.mp3",
                "img": "/elifba/dosyalar/11-17.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-16.mp3",
                "img": "/elifba/dosyalar/12-17.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-16.mp3",
                "img": "/elifba/dosyalar/13-17.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-16.mp3",
                "img": "/elifba/dosyalar/14-17.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-14.mp3",
                "img": "/elifba/dosyalar/15-15.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-14.mp3",
                "img": "/elifba/dosyalar/16-15.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-14.mp3",
                "img": "/elifba/dosyalar/17-15.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-14.mp3",
                "img": "/elifba/dosyalar/18-15.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-13.mp3",
                "img": "/elifba/dosyalar/19-14.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-13.mp3",
                "img": "/elifba/dosyalar/20-14.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-13.mp3",
                "img": "/elifba/dosyalar/21-14.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-13.mp3",
                "img": "/elifba/dosyalar/22-14.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-13.mp3",
                "img": "/elifba/dosyalar/23-14.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-13.mp3",
                "img": "/elifba/dosyalar/24-14.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-13.mp3",
                "img": "/elifba/dosyalar/25-14.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-13.mp3",
                "img": "/elifba/dosyalar/26-14.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-13.mp3",
                "img": "/elifba/dosyalar/27-14.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-11.mp3",
                "img": "/elifba/dosyalar/28-12.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz19",
        "number": 19,
        "type": "cuz",
        "title": "Ders 19: Alıştırmalar 3",
        "shortTitle": "Ders 19",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-17.mp3",
                "img": "/elifba/dosyalar/1-18.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-17.mp3",
                "img": "/elifba/dosyalar/2-18.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-17.mp3",
                "img": "/elifba/dosyalar/3-18.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-17.mp3",
                "img": "/elifba/dosyalar/4-18.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-17.mp3",
                "img": "/elifba/dosyalar/5-18.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-17.mp3",
                "img": "/elifba/dosyalar/6-18.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-17.mp3",
                "img": "/elifba/dosyalar/7-18.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-17.mp3",
                "img": "/elifba/dosyalar/8-18.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-17.mp3",
                "img": "/elifba/dosyalar/9-18.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-17.mp3",
                "img": "/elifba/dosyalar/10-18.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-17.mp3",
                "img": "/elifba/dosyalar/11-18.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-17.mp3",
                "img": "/elifba/dosyalar/12-18.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-17.mp3",
                "img": "/elifba/dosyalar/13-18.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-17.mp3",
                "img": "/elifba/dosyalar/14-18.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-15.mp3",
                "img": "/elifba/dosyalar/15-16.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-15.mp3",
                "img": "/elifba/dosyalar/16-16.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-15.mp3",
                "img": "/elifba/dosyalar/17-16.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-15.mp3",
                "img": "/elifba/dosyalar/18-16.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-14.mp3",
                "img": "/elifba/dosyalar/19-15.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-14.mp3",
                "img": "/elifba/dosyalar/20-15.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-14.mp3",
                "img": "/elifba/dosyalar/21-15.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-14.mp3",
                "img": "/elifba/dosyalar/22-15.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-14.mp3",
                "img": "/elifba/dosyalar/23-15.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-14.mp3",
                "img": "/elifba/dosyalar/24-15.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-14.mp3",
                "img": "/elifba/dosyalar/25-15.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-14.mp3",
                "img": "/elifba/dosyalar/26-15.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-14.mp3",
                "img": "/elifba/dosyalar/27-15.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-12.mp3",
                "img": "/elifba/dosyalar/28-13.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz20",
        "number": 20,
        "type": "cuz",
        "title": "Ders 20: İki Üstün",
        "shortTitle": "Ders 20",
        "category": "tanwin",
        "badgeColor": "from-yellow-500 to-amber-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Tenvin, kelimenin sonuna cezimli nun sesi veren iki üstün ( ً ), iki esre ( ٍ ) ve iki ötre ( ٌ ) işaretleridir. Arapçada sadece isimlerin sonunda bulunur. İki üstün: Harfin üzerine yazılır ( ً ). Yuvarlak te ( ة ) ve hemze ( ء ) dışındaki harflerde elif ( ا ) desteği üzerine yazılır. İnce harflerin 'en' sesiyle, kalın harflerin 'an' sesiyle okunmasını sağlar.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Tenvin, kelimenin sonuna cezimli nun sesi veren iki üstün ( ً ), iki esre ( ٍ ) ve iki ötre ( ٌ ) işaretleridir. Arapçada sadece isimlerin sonunda bulunur.",
            "İki üstün: Harfin üzerine yazılır ( ً ). Yuvarlak te ( ة ) ve hemze ( ء ) dışındaki harflerde elif ( ا ) desteği üzerine yazılır. İnce harflerin 'en' sesiyle, kalın harflerin 'an' sesiyle okunmasını sağlar."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-19.mp3",
                "img": "/elifba/dosyalar/1-20.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-19.mp3",
                "img": "/elifba/dosyalar/2-20.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-19.mp3",
                "img": "/elifba/dosyalar/3-20.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-19.mp3",
                "img": "/elifba/dosyalar/4-20.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-19.mp3",
                "img": "/elifba/dosyalar/5-20.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-19.mp3",
                "img": "/elifba/dosyalar/6-20.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-19.mp3",
                "img": "/elifba/dosyalar/7-20.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-19.mp3",
                "img": "/elifba/dosyalar/8-20.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-19.mp3",
                "img": "/elifba/dosyalar/9-20.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-19.mp3",
                "img": "/elifba/dosyalar/10-20.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-19.mp3",
                "img": "/elifba/dosyalar/11-20.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-19.mp3",
                "img": "/elifba/dosyalar/12-20.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-19.mp3",
                "img": "/elifba/dosyalar/13-20.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-19.mp3",
                "img": "/elifba/dosyalar/14-20.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-17.mp3",
                "img": "/elifba/dosyalar/15-18.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-17.mp3",
                "img": "/elifba/dosyalar/16-18.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-17.mp3",
                "img": "/elifba/dosyalar/17-18.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-17.mp3",
                "img": "/elifba/dosyalar/18-18.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-16.mp3",
                "img": "/elifba/dosyalar/19-17.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-16.mp3",
                "img": "/elifba/dosyalar/20-17.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-16.mp3",
                "img": "/elifba/dosyalar/21-17.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-16.mp3",
                "img": "/elifba/dosyalar/22-17.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-16.mp3",
                "img": "/elifba/dosyalar/23-17.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-16.mp3",
                "img": "/elifba/dosyalar/24-17.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-16.mp3",
                "img": "/elifba/dosyalar/25-17.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-16.mp3",
                "img": "/elifba/dosyalar/26-17.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-16.mp3",
                "img": "/elifba/dosyalar/27-17.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-14.mp3",
                "img": "/elifba/dosyalar/28-15.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz21",
        "number": 21,
        "type": "cuz",
        "title": "Ders 21: İki Esre",
        "shortTitle": "Ders 21",
        "category": "tanwin",
        "badgeColor": "from-yellow-500 to-amber-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. İki esre: Harfin altına yazılır ( ٍ ). İnce harflerin 'in' sesiyle, kalın harflerin 'ın-in' arası bir sesle okunmasını sağlar.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "İki esre: Harfin altına yazılır ( ٍ ). İnce harflerin 'in' sesiyle, kalın harflerin 'ın-in' arası bir sesle okunmasını sağlar."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-18.mp3",
                "img": "/elifba/dosyalar/1-19.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-18.mp3",
                "img": "/elifba/dosyalar/2-19.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-18.mp3",
                "img": "/elifba/dosyalar/3-19.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-18.mp3",
                "img": "/elifba/dosyalar/4-19.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-18.mp3",
                "img": "/elifba/dosyalar/5-19.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-18.mp3",
                "img": "/elifba/dosyalar/6-19.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-18.mp3",
                "img": "/elifba/dosyalar/7-19.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-18.mp3",
                "img": "/elifba/dosyalar/8-19.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-18.mp3",
                "img": "/elifba/dosyalar/9-19.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-18.mp3",
                "img": "/elifba/dosyalar/10-19.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-18.mp3",
                "img": "/elifba/dosyalar/11-19.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-18.mp3",
                "img": "/elifba/dosyalar/12-19.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-18.mp3",
                "img": "/elifba/dosyalar/13-19.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-18.mp3",
                "img": "/elifba/dosyalar/14-19.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-16.mp3",
                "img": "/elifba/dosyalar/15-17.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-16.mp3",
                "img": "/elifba/dosyalar/16-17.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-16.mp3",
                "img": "/elifba/dosyalar/17-17.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-16.mp3",
                "img": "/elifba/dosyalar/18-17.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-15.mp3",
                "img": "/elifba/dosyalar/19-16.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-15.mp3",
                "img": "/elifba/dosyalar/20-16.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-15.mp3",
                "img": "/elifba/dosyalar/21-16.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-15.mp3",
                "img": "/elifba/dosyalar/22-16.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-15.mp3",
                "img": "/elifba/dosyalar/23-16.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-15.mp3",
                "img": "/elifba/dosyalar/24-16.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-15.mp3",
                "img": "/elifba/dosyalar/25-16.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-15.mp3",
                "img": "/elifba/dosyalar/26-16.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-15.mp3",
                "img": "/elifba/dosyalar/27-16.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-13.mp3",
                "img": "/elifba/dosyalar/28-14.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz22",
        "number": 22,
        "type": "cuz",
        "title": "Ders 22: İki Ötre",
        "shortTitle": "Ders 22",
        "category": "tanwin",
        "badgeColor": "from-yellow-500 to-amber-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. İki ötre: Harfin üzerine yazılır ( ٌ ). İnce harflerin 'un-ün' arası bir sesle, kalın harflerin 'un' sesiyleokunmasını sağlar.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "İki ötre: Harfin üzerine yazılır ( ٌ ). İnce harflerin 'un-ün' arası bir sesle, kalın harflerin 'un' sesiyleokunmasını sağlar."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-20.mp3",
                "img": "/elifba/dosyalar/1-21.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-20.mp3",
                "img": "/elifba/dosyalar/2-21.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-20.mp3",
                "img": "/elifba/dosyalar/3-21.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-20.mp3",
                "img": "/elifba/dosyalar/4-21.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-20.mp3",
                "img": "/elifba/dosyalar/5-21.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-20.mp3",
                "img": "/elifba/dosyalar/6-21.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-20.mp3",
                "img": "/elifba/dosyalar/7-21.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-20.mp3",
                "img": "/elifba/dosyalar/8-21.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-20.mp3",
                "img": "/elifba/dosyalar/9-21.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-20.mp3",
                "img": "/elifba/dosyalar/10-21.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-20.mp3",
                "img": "/elifba/dosyalar/11-21.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-20.mp3",
                "img": "/elifba/dosyalar/12-21.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-20.mp3",
                "img": "/elifba/dosyalar/13-21.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-20.mp3",
                "img": "/elifba/dosyalar/14-21.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-18.mp3",
                "img": "/elifba/dosyalar/15-19.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-18.mp3",
                "img": "/elifba/dosyalar/16-19.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-18.mp3",
                "img": "/elifba/dosyalar/17-19.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-18.mp3",
                "img": "/elifba/dosyalar/18-19.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-17.mp3",
                "img": "/elifba/dosyalar/19-18.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-17.mp3",
                "img": "/elifba/dosyalar/20-18.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-17.mp3",
                "img": "/elifba/dosyalar/21-18.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-17.mp3",
                "img": "/elifba/dosyalar/22-18.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-17.mp3",
                "img": "/elifba/dosyalar/23-18.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-17.mp3",
                "img": "/elifba/dosyalar/24-18.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-17.mp3",
                "img": "/elifba/dosyalar/25-18.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-17.mp3",
                "img": "/elifba/dosyalar/26-18.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-17.mp3",
                "img": "/elifba/dosyalar/27-18.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-15.mp3",
                "img": "/elifba/dosyalar/28-16.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz23",
        "number": 23,
        "type": "cuz",
        "title": "Ders 23: Çeker",
        "shortTitle": "Ders 23",
        "category": "med",
        "badgeColor": "from-teal-500 to-emerald-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Kur'an yazısında, harfin üstüne konulan uzatma işaretine ( ٰ ) âsar, altına konulan uzatma işaretine çeker denir. Bu işaretler o harfin uzatılacağını gösterir.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Kur'an yazısında, harfin üstüne konulan uzatma işaretine ( ٰ ) âsar, altına konulan uzatma işaretine çeker denir. Bu işaretler o harfin uzatılacağını gösterir."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-21.mp3",
                "img": "/elifba/dosyalar/1-22.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-21.mp3",
                "img": "/elifba/dosyalar/2-22.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-21.mp3",
                "img": "/elifba/dosyalar/3-22.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-21.mp3",
                "img": "/elifba/dosyalar/4-22.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-21.mp3",
                "img": "/elifba/dosyalar/5-22.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-21.mp3",
                "img": "/elifba/dosyalar/6-22.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-21.mp3",
                "img": "/elifba/dosyalar/7-22.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-21.mp3",
                "img": "/elifba/dosyalar/8-22.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-21.mp3",
                "img": "/elifba/dosyalar/9-22.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-21.mp3",
                "img": "/elifba/dosyalar/10-22.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-21.mp3",
                "img": "/elifba/dosyalar/11-22.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-21.mp3",
                "img": "/elifba/dosyalar/12-22.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-21.mp3",
                "img": "/elifba/dosyalar/13-22.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-21.mp3",
                "img": "/elifba/dosyalar/14-22.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-19.mp3",
                "img": "/elifba/dosyalar/15-20.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-19.mp3",
                "img": "/elifba/dosyalar/16-20.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-19.mp3",
                "img": "/elifba/dosyalar/17-20.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-19.mp3",
                "img": "/elifba/dosyalar/18-20.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-18.mp3",
                "img": "/elifba/dosyalar/19-19.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-18.mp3",
                "img": "/elifba/dosyalar/20-19.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-18.mp3",
                "img": "/elifba/dosyalar/21-19.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-18.mp3",
                "img": "/elifba/dosyalar/22-19.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-18.mp3",
                "img": "/elifba/dosyalar/23-19.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-18.mp3",
                "img": "/elifba/dosyalar/24-19.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-18.mp3",
                "img": "/elifba/dosyalar/25-19.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-18.mp3",
                "img": "/elifba/dosyalar/26-19.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-18.mp3",
                "img": "/elifba/dosyalar/27-19.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-16.mp3",
                "img": "/elifba/dosyalar/28-17.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz24",
        "number": 24,
        "type": "cuz",
        "title": "Ders 24: Vav ve Ya Şeklinde Yazılan Elif",
        "shortTitle": "Ders 24",
        "category": "advanced",
        "badgeColor": "from-purple-500 to-indigo-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Kur'an yazısında elif harfi üç şekilde yazılır.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Kur'an yazısında elif harfi üç şekilde yazılır."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-22.mp3",
                "img": "/elifba/dosyalar/1-23.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-22.mp3",
                "img": "/elifba/dosyalar/2-23.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-22.mp3",
                "img": "/elifba/dosyalar/3-23.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-22.mp3",
                "img": "/elifba/dosyalar/4-23.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-22.mp3",
                "img": "/elifba/dosyalar/5-23.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-22.mp3",
                "img": "/elifba/dosyalar/6-23.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-22.mp3",
                "img": "/elifba/dosyalar/7-23.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-22.mp3",
                "img": "/elifba/dosyalar/8-23.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-22.mp3",
                "img": "/elifba/dosyalar/9-23.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-22.mp3",
                "img": "/elifba/dosyalar/10-23.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-22.mp3",
                "img": "/elifba/dosyalar/11-23.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-22.mp3",
                "img": "/elifba/dosyalar/12-23.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-22.mp3",
                "img": "/elifba/dosyalar/13-23.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-22.mp3",
                "img": "/elifba/dosyalar/14-23.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-20.mp3",
                "img": "/elifba/dosyalar/15-21.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-20.mp3",
                "img": "/elifba/dosyalar/16-21.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-20.mp3",
                "img": "/elifba/dosyalar/17-21.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-20.mp3",
                "img": "/elifba/dosyalar/18-21.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-19.mp3",
                "img": "/elifba/dosyalar/19-20.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-19.mp3",
                "img": "/elifba/dosyalar/20-20.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-19.mp3",
                "img": "/elifba/dosyalar/21-20.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-19.mp3",
                "img": "/elifba/dosyalar/22-20.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-19.mp3",
                "img": "/elifba/dosyalar/23-20.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-19.mp3",
                "img": "/elifba/dosyalar/24-20.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-19.mp3",
                "img": "/elifba/dosyalar/25-20.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-19.mp3",
                "img": "/elifba/dosyalar/26-20.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-19.mp3",
                "img": "/elifba/dosyalar/27-20.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-17.mp3",
                "img": "/elifba/dosyalar/28-18.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz25",
        "number": 25,
        "type": "cuz",
        "title": "Ders 25: Zamir",
        "shortTitle": "Ders 25",
        "category": "advanced",
        "badgeColor": "from-purple-500 to-indigo-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Kur'an tilavetinde zamirin ( ه ) özel bir okunuşu vardır. Kendisinden önceki harf harekeli olduğunda zamir uzatılarak okunur. Önceki harf cezimli veya harekesiz olduğunda ise uzatılmaz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Kur'an tilavetinde zamirin ( ه ) özel bir okunuşu vardır. Kendisinden önceki harf harekeli olduğunda zamir uzatılarak okunur. Önceki harf cezimli veya harekesiz olduğunda ise uzatılmaz."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-23.mp3",
                "img": "/elifba/dosyalar/1-24.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-23.mp3",
                "img": "/elifba/dosyalar/2-24.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-23.mp3",
                "img": "/elifba/dosyalar/3-24.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-23.mp3",
                "img": "/elifba/dosyalar/4-24.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-23.mp3",
                "img": "/elifba/dosyalar/5-24.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-23.mp3",
                "img": "/elifba/dosyalar/6-24.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-23.mp3",
                "img": "/elifba/dosyalar/7-24.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-23.mp3",
                "img": "/elifba/dosyalar/8-24.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-23.mp3",
                "img": "/elifba/dosyalar/9-24.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-23.mp3",
                "img": "/elifba/dosyalar/10-24.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-23.mp3",
                "img": "/elifba/dosyalar/11-24.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-23.mp3",
                "img": "/elifba/dosyalar/12-24.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-23.mp3",
                "img": "/elifba/dosyalar/13-24.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-23.mp3",
                "img": "/elifba/dosyalar/14-24.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-21.mp3",
                "img": "/elifba/dosyalar/15-22.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-21.mp3",
                "img": "/elifba/dosyalar/16-22.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-21.mp3",
                "img": "/elifba/dosyalar/17-22.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-21.mp3",
                "img": "/elifba/dosyalar/18-22.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-20.mp3",
                "img": "/elifba/dosyalar/19-21.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-20.mp3",
                "img": "/elifba/dosyalar/20-21.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-20.mp3",
                "img": "/elifba/dosyalar/21-21.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-20.mp3",
                "img": "/elifba/dosyalar/22-21.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-20.mp3",
                "img": "/elifba/dosyalar/23-21.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-20.mp3",
                "img": "/elifba/dosyalar/24-21.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-20.mp3",
                "img": "/elifba/dosyalar/25-21.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-20.mp3",
                "img": "/elifba/dosyalar/26-21.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-20.mp3",
                "img": "/elifba/dosyalar/27-21.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-18.mp3",
                "img": "/elifba/dosyalar/28-19.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz26",
        "number": 26,
        "type": "cuz",
        "title": "Ders 26: El Takısı",
        "shortTitle": "Ders 26",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Elif Lam Takısı Arapçada isimleri belirli (marife) yapma yollarından biri, ismin başına elif lam ( ال ) takısı getirmektir.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Elif Lam Takısı",
            "Arapçada isimleri belirli (marife) yapma yollarından biri, ismin başına elif lam ( ال ) takısı getirmektir.",
            "ا ب ج ح خ ع غ ف ق ك م و ه ى harflerinden biriyle başlayan kelimelerin başına elif lam takısı gelirse lam harfi cezimli olarak okunur.",
            "Örnek: قَمَرٌ اَلْقَمَرُ",
            "ت ث د ذ ر ز س ش ص ض ط ظ ل ن harflerinden biriyle başlayan kelimelerin başına elif lam takısı gelirse lam harfi yazılır, fakat okunmaz. Sonraki harf şeddeli okunur.",
            "Örnek: شَمْسٌ اَلشَّمْسُ"
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-24.mp3",
                "img": "/elifba/dosyalar/1-25.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-24.mp3",
                "img": "/elifba/dosyalar/2-25.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-24.mp3",
                "img": "/elifba/dosyalar/3-25.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-24.mp3",
                "img": "/elifba/dosyalar/4-25.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-24.mp3",
                "img": "/elifba/dosyalar/5-25.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-24.mp3",
                "img": "/elifba/dosyalar/6-25.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-24.mp3",
                "img": "/elifba/dosyalar/7-25.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-24.mp3",
                "img": "/elifba/dosyalar/8-25.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-24.mp3",
                "img": "/elifba/dosyalar/9-25.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-24.mp3",
                "img": "/elifba/dosyalar/10-25.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-24.mp3",
                "img": "/elifba/dosyalar/11-25.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-24.mp3",
                "img": "/elifba/dosyalar/12-25.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-24.mp3",
                "img": "/elifba/dosyalar/13-25.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-24.mp3",
                "img": "/elifba/dosyalar/14-25.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-22.mp3",
                "img": "/elifba/dosyalar/15-23.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-22.mp3",
                "img": "/elifba/dosyalar/16-23.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-22.mp3",
                "img": "/elifba/dosyalar/17-23.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-22.mp3",
                "img": "/elifba/dosyalar/18-23.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-21.mp3",
                "img": "/elifba/dosyalar/19-22.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-21.mp3",
                "img": "/elifba/dosyalar/20-22.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-21.mp3",
                "img": "/elifba/dosyalar/21-22.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-21.mp3",
                "img": "/elifba/dosyalar/22-22.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-21.mp3",
                "img": "/elifba/dosyalar/23-22.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-21.mp3",
                "img": "/elifba/dosyalar/24-22.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-21.mp3",
                "img": "/elifba/dosyalar/25-22.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-21.mp3",
                "img": "/elifba/dosyalar/26-22.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-21.mp3",
                "img": "/elifba/dosyalar/27-22.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-19.mp3",
                "img": "/elifba/dosyalar/28-20.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz27",
        "number": 27,
        "type": "cuz",
        "title": "Ders 27: Okunmayan Elif ve Elif Lâm",
        "shortTitle": "Ders 27",
        "category": "rules",
        "badgeColor": "from-amber-500 to-orange-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz. Okunmayan Elif Elif harfi, bazen yazıldığı hâlde okunmaz. Örneğin, قَالُوا kelimesindeki birinci elif ( ا ), kaf ( ق ) harfinin uzatılmasını sağlar. Fakat kelimenin sonundaki elifin okunuşa herhangi bir etkisi yoktur. Elif lam takısının hemzesi, kendisinden önce harekeli bir harf geldiğinde okunmaz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
            "Okunmayan Elif",
            "Elif harfi, bazen yazıldığı hâlde okunmaz. Örneğin, قَالُوا kelimesindeki birinci elif ( ا ), kaf ( ق ) harfinin uzatılmasını sağlar. Fakat kelimenin sonundaki elifin okunuşa herhangi bir etkisi yoktur. Elif lam takısının hemzesi, kendisinden önce harekeli bir harf geldiğinde okunmaz.",
            "Örnek:",
            "بِالْكِتَابِ    >    اَلْكِتَابُ",
            "يَوْمِ الدّ۪ينِ   >   اَلدّ۪ينِ"
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-25.mp3",
                "img": "/elifba/dosyalar/1-26.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-25.mp3",
                "img": "/elifba/dosyalar/2-26.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-25.mp3",
                "img": "/elifba/dosyalar/3-26.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-25.mp3",
                "img": "/elifba/dosyalar/4-26.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-25.mp3",
                "img": "/elifba/dosyalar/5-26.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-25.mp3",
                "img": "/elifba/dosyalar/6-26.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-25.mp3",
                "img": "/elifba/dosyalar/7-26.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-25.mp3",
                "img": "/elifba/dosyalar/8-26.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-25.mp3",
                "img": "/elifba/dosyalar/9-26.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-25.mp3",
                "img": "/elifba/dosyalar/10-26.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-25.mp3",
                "img": "/elifba/dosyalar/11-26.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-25.mp3",
                "img": "/elifba/dosyalar/12-26.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-25.mp3",
                "img": "/elifba/dosyalar/13-26.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-25.mp3",
                "img": "/elifba/dosyalar/14-26.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-23.mp3",
                "img": "/elifba/dosyalar/15-24.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-23.mp3",
                "img": "/elifba/dosyalar/16-24.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-23.mp3",
                "img": "/elifba/dosyalar/17-24.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-23.mp3",
                "img": "/elifba/dosyalar/18-24.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-22.mp3",
                "img": "/elifba/dosyalar/19-23.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-22.mp3",
                "img": "/elifba/dosyalar/20-23.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-22.mp3",
                "img": "/elifba/dosyalar/21-23.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-22.mp3",
                "img": "/elifba/dosyalar/22-23.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-22.mp3",
                "img": "/elifba/dosyalar/23-23.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-22.mp3",
                "img": "/elifba/dosyalar/24-23.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-22.mp3",
                "img": "/elifba/dosyalar/25-23.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-22.mp3",
                "img": "/elifba/dosyalar/26-23.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-22.mp3",
                "img": "/elifba/dosyalar/27-23.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-20.mp3",
                "img": "/elifba/dosyalar/28-21.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "cuz28",
        "number": 28,
        "type": "cuz",
        "title": "Ders 28: Lafzatullah, Mukattaa Harfleri, Med Harfleri",
        "shortTitle": "Ders 28",
        "category": "advanced",
        "badgeColor": "from-purple-500 to-indigo-600",
        "description": "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz.",
        "notes": [
            "Örneklerin üzerine tıklayarak, telaffuzunu dinleyebilirsiniz."
        ],
        "itemCount": 28,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/1-26.mp3",
                "img": "/elifba/dosyalar/1-27.png",
                "alt": "Elif"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/2-26.mp3",
                "img": "/elifba/dosyalar/2-27.png",
                "alt": "Elif"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/3-26.mp3",
                "img": "/elifba/dosyalar/3-27.png",
                "alt": "Elif"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/4-26.mp3",
                "img": "/elifba/dosyalar/4-27.png",
                "alt": "Elif"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/5-26.mp3",
                "img": "/elifba/dosyalar/5-27.png",
                "alt": "Elif"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/6-26.mp3",
                "img": "/elifba/dosyalar/6-27.png",
                "alt": "Elif"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/7-26.mp3",
                "img": "/elifba/dosyalar/7-27.png",
                "alt": "Elif"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/8-26.mp3",
                "img": "/elifba/dosyalar/8-27.png",
                "alt": "Elif"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/9-26.mp3",
                "img": "/elifba/dosyalar/9-27.png",
                "alt": "Elif"
            },
            {
                "index": 10,
                "audio": "/elifba/dosyalar/10-26.mp3",
                "img": "/elifba/dosyalar/10-27.png",
                "alt": "Elif"
            },
            {
                "index": 11,
                "audio": "/elifba/dosyalar/11-26.mp3",
                "img": "/elifba/dosyalar/11-27.png",
                "alt": "Elif"
            },
            {
                "index": 12,
                "audio": "/elifba/dosyalar/12-26.mp3",
                "img": "/elifba/dosyalar/12-27.png",
                "alt": "Elif"
            },
            {
                "index": 13,
                "audio": "/elifba/dosyalar/13-26.mp3",
                "img": "/elifba/dosyalar/13-27.png",
                "alt": "Elif"
            },
            {
                "index": 14,
                "audio": "/elifba/dosyalar/14-26.mp3",
                "img": "/elifba/dosyalar/14-27.png",
                "alt": "Elif"
            },
            {
                "index": 15,
                "audio": "/elifba/dosyalar/15-24.mp3",
                "img": "/elifba/dosyalar/15-25.png",
                "alt": "Elif"
            },
            {
                "index": 16,
                "audio": "/elifba/dosyalar/16-24.mp3",
                "img": "/elifba/dosyalar/16-25.png",
                "alt": "Elif"
            },
            {
                "index": 17,
                "audio": "/elifba/dosyalar/17-24.mp3",
                "img": "/elifba/dosyalar/17-25.png",
                "alt": "Elif"
            },
            {
                "index": 18,
                "audio": "/elifba/dosyalar/18-24.mp3",
                "img": "/elifba/dosyalar/18-25.png",
                "alt": "Elif"
            },
            {
                "index": 19,
                "audio": "/elifba/dosyalar/19-23.mp3",
                "img": "/elifba/dosyalar/19-24.png",
                "alt": "Elif"
            },
            {
                "index": 20,
                "audio": "/elifba/dosyalar/20-23.mp3",
                "img": "/elifba/dosyalar/20-24.png",
                "alt": "Elif"
            },
            {
                "index": 21,
                "audio": "/elifba/dosyalar/21-23.mp3",
                "img": "/elifba/dosyalar/21-24.png",
                "alt": "Elif"
            },
            {
                "index": 22,
                "audio": "/elifba/dosyalar/22-23.mp3",
                "img": "/elifba/dosyalar/22-24.png",
                "alt": "Elif"
            },
            {
                "index": 23,
                "audio": "/elifba/dosyalar/23-23.mp3",
                "img": "/elifba/dosyalar/23-24.png",
                "alt": "Elif"
            },
            {
                "index": 24,
                "audio": "/elifba/dosyalar/24-23.mp3",
                "img": "/elifba/dosyalar/24-24.png",
                "alt": "Elif"
            },
            {
                "index": 25,
                "audio": "/elifba/dosyalar/25-23.mp3",
                "img": "/elifba/dosyalar/25-24.png",
                "alt": "Elif"
            },
            {
                "index": 26,
                "audio": "/elifba/dosyalar/26-23.mp3",
                "img": "/elifba/dosyalar/26-24.png",
                "alt": "Elif"
            },
            {
                "index": 27,
                "audio": "/elifba/dosyalar/27-23.mp3",
                "img": "/elifba/dosyalar/27-24.png",
                "alt": "Elif"
            },
            {
                "index": 28,
                "audio": "/elifba/dosyalar/28-21.mp3",
                "img": "/elifba/dosyalar/28-22.png",
                "alt": "Elif"
            }
        ]
    },
    {
        "id": "dua1",
        "number": 1,
        "type": "dua",
        "title": "Subhaneke Duası",
        "shortTitle": "Subhaneke",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Allah’ım! Sen her türlü eksiklikten uzaksın. Seni daima böyle över ve sana hamt ederim. Senin adın mübarektir. Senin şanın yücedir. Senin övgün uludur. Senden başka ilah yoktur.",
        "meaning": "Allah’ım! Sen her türlü eksiklikten uzaksın. Seni daima böyle över ve sana hamt ederim. Senin adın mübarektir. Senin şanın yücedir. Senin övgün uludur. Senden başka ilah yoktur.",
        "pronunciation": "  Subhânekellâhumme ve bi hamdik ve tebârakesmuk ve teâlâ cedduk (ve celle senâuk*) ve lâ ilâhe ğayruk   * Ve celle senâük yalnızca cenaze namazlarında kullanılır.",
        "itemCount": 5,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/subhaneke_1.mp3",
                "img": "/elifba/dosyalar/1-28.png",
                "alt": "Subhaneke 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/subhaneke_2.mp3",
                "img": "/elifba/dosyalar/2-28.png",
                "alt": "Subhaneke 2"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/subhaneke_3.mp3",
                "img": "/elifba/dosyalar/3-28.png",
                "alt": "Subhaneke 3"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/subhaneke_4.mp3",
                "img": "/elifba/dosyalar/4-28.png",
                "alt": "Subhaneke 4"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/subhaneke_5.mp3",
                "img": "/elifba/dosyalar/5-28.png",
                "alt": "Subhaneke 5"
            }
        ]
    },
    {
        "id": "dua2",
        "number": 2,
        "type": "dua",
        "title": "Tahiyyat Duası (Ettehiyyâtü)",
        "shortTitle": "Tahiyyat",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Selamet, rahmet ve tüm güzellikler Allah içindir. Ey Peygamber, Allah’ın rahmeti, bereketi ve selamı üzerine olsun. Selam olsun bize ve Allah’ın tüm iyi kullarına… Şahitlik ederim ki Allah’tan başka ilah yoktur; Şahitlik ederim ki Muhammed Allah’ın kulu ve elçisidir.",
        "meaning": "Selamet, rahmet ve tüm güzellikler Allah içindir. Ey Peygamber, Allah’ın rahmeti, bereketi ve selamı üzerine olsun. Selam olsun bize ve Allah’ın tüm iyi kullarına… Şahitlik ederim ki Allah’tan başka ilah yoktur; Şahitlik ederim ki Muhammed Allah’ın kulu ve elçisidir.",
        "pronunciation": "  Ettehiyyâtu lillâhi vessalevâtu vettayibât. Esselâmu aleyke eyyuhen-Nebiyyu ve rahmetullahi ve berakâtuhu. Esselâmu aleynâ ve alâ ibâdillâhis-Sâlihîn. Eşhedu en lâ ilâhe illallâh ve eşhedu enne Muhammeden abduhû ve Rasuluh.",
        "itemCount": 5,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/tahiyyat_1.mp3",
                "img": "/elifba/dosyalar/1-29.png",
                "alt": "tahiyyat 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/tahiyyat_2.mp3",
                "img": "/elifba/dosyalar/2-29.png",
                "alt": "tahiyyat 2"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/tahiyyat_3.mp3",
                "img": "/elifba/dosyalar/3-29.png",
                "alt": "tahiyyat 3"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/tahiyyat_4.mp3",
                "img": "/elifba/dosyalar/4-29.png",
                "alt": "tahiyyat 4"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/tahiyyat_5.mp3",
                "img": "/elifba/dosyalar/5-29.png",
                "alt": "tahiyyat 5"
            }
        ]
    },
    {
        "id": "dua3",
        "number": 3,
        "type": "dua",
        "title": "Allahümme Salli Duası",
        "shortTitle": "Allahümme",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Allah’ım! Hazreti Muhammed’e ve onun ailesine rahmet et. Tıpkı Hazreti İbrahim’e ve ailesine rahmet ettiğin gibi. Şüphesiz sen her türlü övgüye layık olansın ve çok yücesin.",
        "meaning": "Allah’ım! Hazreti Muhammed’e ve onun ailesine rahmet et. Tıpkı Hazreti İbrahim’e ve ailesine rahmet ettiğin gibi. Şüphesiz sen her türlü övgüye layık olansın ve çok yücesin.",
        "pronunciation": "  Allâhumme salli alâ Muhammedin ve alâ âli Muhammed. Kemâ salleyte alâ İbrahime ve alâ âli İbrahim. İnneke hamidun mecîd.",
        "itemCount": 3,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/salli_1.mp3",
                "img": "/elifba/dosyalar/1-30.png",
                "alt": "salli 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/salli_2.mp3",
                "img": "/elifba/dosyalar/2-30.png",
                "alt": "salli 2"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/salli_3.mp3",
                "img": "/elifba/dosyalar/3-30.png",
                "alt": "salli 3"
            }
        ]
    },
    {
        "id": "dua4",
        "number": 4,
        "type": "dua",
        "title": "Allahümme Barik Duası",
        "shortTitle": "Allahümme",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Allah’ım! Hazreti Muhammed’i ve onun ailesini mübarek kıl. Tıpkı Hazreti İbrahim’i ve ailesini mübarek kıldığın gibi. Şüphesiz sen her türlü övgüye layık olansın ve çok yücesin.",
        "meaning": "Allah’ım! Hazreti Muhammed’i ve onun ailesini mübarek kıl. Tıpkı Hazreti İbrahim’i ve ailesini mübarek kıldığın gibi. Şüphesiz sen her türlü övgüye layık olansın ve çok yücesin.",
        "pronunciation": "  Allâhumme barik alâ Muhammedin ve alâ âli Muhammed. Kemâ barekte alâ İbrahîme ve alâ âli İbrahim. İnneke hamidun mecîd.",
        "itemCount": 3,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/barik_1.mp3",
                "img": "/elifba/dosyalar/1-31.png",
                "alt": "barik 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/barik_2.mp3",
                "img": "/elifba/dosyalar/2-31.png",
                "alt": "barik 2"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/barik_3.mp3",
                "img": "/elifba/dosyalar/3-31.png",
                "alt": "barik 3"
            }
        ]
    },
    {
        "id": "dua5",
        "number": 5,
        "type": "dua",
        "title": "Rabbena Atina Duası",
        "shortTitle": "Rabbena",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Ey Rabb’imiz! Bize hem bu dünyada hem de ahirette iyilik ve güzellik ver. Bizi cehennem ateşinin azabından koru.",
        "meaning": "Ey Rabb’imiz! Bize hem bu dünyada hem de ahirette iyilik ve güzellik ver. Bizi cehennem ateşinin azabından koru.",
        "pronunciation": "  Rabbenâ âtina fid&#39;dunyâ haseneten ve fil&#39;âhirati haseneten ve kınâ azâbennâr.",
        "itemCount": 2,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/atina_1.mp3",
                "img": "/elifba/dosyalar/1-32.png",
                "alt": "atina 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/atina_2.mp3",
                "img": "/elifba/dosyalar/2-32.png",
                "alt": "atina 2"
            }
        ]
    },
    {
        "id": "dua6",
        "number": 6,
        "type": "dua",
        "title": "Rabbenağfir Li Duası",
        "shortTitle": "Rabbenağfir",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Ey Rabb’imiz! Hesabın görüleceği günde beni, annemi, babamı ve bütün müminleri bağışla.",
        "meaning": "Ey Rabb’imiz! Hesabın görüleceği günde beni, annemi, babamı ve bütün müminleri bağışla.",
        "pronunciation": "  Rabbenâğfirlî ve li-vâlideyye ve lil-Mu&#39;minine yevme yekûmu&#39;l hisâb.",
        "itemCount": 1,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/rabbenagfirli.mp3",
                "img": "/elifba/dosyalar/1a.png",
                "alt": "rabbenagfirli a"
            }
        ]
    },
    {
        "id": "dua7",
        "number": 7,
        "type": "dua",
        "title": "Kunut Duası 1",
        "shortTitle": "Kunut",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Allah’ım! Biz yalnız senden yardım dileriz, bizi bağışlamanı ve doğru yola iletmeni isteriz. Sana iman ederiz. Tövbe edip sana döneriz. Sana güveniriz. Bütün hayırları senden bilir, seni överiz. Sana şükreder, nankörlük etmeyiz. Sana karşı gelenlerle ilişkimizi keser, onları terk ederiz.",
        "meaning": "Allah’ım! Biz yalnız senden yardım dileriz, bizi bağışlamanı ve doğru yola iletmeni isteriz. Sana iman ederiz. Tövbe edip sana döneriz. Sana güveniriz. Bütün hayırları senden bilir, seni överiz. Sana şükreder, nankörlük etmeyiz. Sana karşı gelenlerle ilişkimizi keser, onları terk ederiz.",
        "pronunciation": "  Allâhumme innâ nesteînuke ve nestağfiruke ve nestehdik. Ve nu&#39;minu bike ve netûbu ileyk. Ve netevekkelu aleyke ve nusni aleykel-hayra kullehu neşkuruke ve lâ nekfuruke ve nahleu ve netruku men yefcuruk.",
        "itemCount": 9,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/kunut_1_1.mp3",
                "img": "/elifba/dosyalar/1-33.png",
                "alt": "kunut_1 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/kunut_1_2.mp3",
                "img": "/elifba/dosyalar/2-33.png",
                "alt": "kunut_1 2"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/kunut_1_3.mp3",
                "img": "/elifba/dosyalar/3-32.png",
                "alt": "kunut_1 3"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/kunut_1_4.mp3",
                "img": "/elifba/dosyalar/4-30.png",
                "alt": "kunut_1 4"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/kunut_1_5.mp3",
                "img": "/elifba/dosyalar/5-30.png",
                "alt": "kunut_1 5"
            },
            {
                "index": 6,
                "audio": "/elifba/dosyalar/kunut_1_6.mp3",
                "img": "/elifba/dosyalar/6-28.png",
                "alt": "kunut_1 6"
            },
            {
                "index": 7,
                "audio": "/elifba/dosyalar/kunut_1_7.mp3",
                "img": "/elifba/dosyalar/7-28.png",
                "alt": "kunut_1 7"
            },
            {
                "index": 8,
                "audio": "/elifba/dosyalar/kunut_1_8.mp3",
                "img": "/elifba/dosyalar/8-28.png",
                "alt": "kunut_1 8"
            },
            {
                "index": 9,
                "audio": "/elifba/dosyalar/kunut_1_9.mp3",
                "img": "/elifba/dosyalar/9-28.png",
                "alt": "kunut_1 9"
            }
        ]
    },
    {
        "id": "dua8",
        "number": 8,
        "type": "dua",
        "title": "Kunut Duası 2",
        "shortTitle": "Kunut",
        "category": "dualar",
        "badgeColor": "from-rose-500 to-pink-600",
        "description": "Allah’ım! Biz ancak sana ibadet ederiz. Yalnız senin için namaz kılar ve sana secde ederiz. Yalnız sana ulaştıracak işlere koşar ve senin rızan için çalışıp çabalarız. Rahmetini umar, azabından korkarız. Şüphe yok ki senin azabın kâfirlere ulaşacaktır.",
        "meaning": "Allah’ım! Biz ancak sana ibadet ederiz. Yalnız senin için namaz kılar ve sana secde ederiz. Yalnız sana ulaştıracak işlere koşar ve senin rızan için çalışıp çabalarız. Rahmetini umar, azabından korkarız. Şüphe yok ki senin azabın kâfirlere ulaşacaktır.",
        "pronunciation": "  Allâhumme iyyâke na&#39;budu ve leke nusalli ve nescudu ve ileyke nes&#39;a ve nahfidu nercû rahmeteke ve nahşâ azâbeke inne azâbeke bilkuffâri mulhık.",
        "itemCount": 5,
        "items": [
            {
                "index": 1,
                "audio": "/elifba/dosyalar/kunut_2_1.mp3",
                "img": "/elifba/dosyalar/1-34.png",
                "alt": "kunut_2 1"
            },
            {
                "index": 2,
                "audio": "/elifba/dosyalar/kunut_2_2.mp3",
                "img": "/elifba/dosyalar/2-34.png",
                "alt": "kunut_2 2"
            },
            {
                "index": 3,
                "audio": "/elifba/dosyalar/kunut_2_3.mp3",
                "img": "/elifba/dosyalar/3-33.png",
                "alt": "kunut_2 3"
            },
            {
                "index": 4,
                "audio": "/elifba/dosyalar/kunut_2_4.mp3",
                "img": "/elifba/dosyalar/4-31.png",
                "alt": "kunut_2 4"
            },
            {
                "index": 5,
                "audio": "/elifba/dosyalar/kunut_2_5.mp3",
                "img": "/elifba/dosyalar/5-31.png",
                "alt": "kunut_2 5"
            }
        ]
    }
];

export const CUZ_LESSONS = ELIFBA_UNITS.filter(u => u.type === 'cuz');
export const NAMAZ_DUALARI = ELIFBA_UNITS.filter(u => u.type === 'dua');

export const ELIFBA_CATEGORY_META = {
    letters: { label: 'Harfler', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    harekes: { label: 'Harekeler', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    rules: { label: 'Kurallar (Cezm/Şedde)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    med: { label: 'Medler & Çeker', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    tanwin: { label: 'Tenvinler', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    advanced: { label: 'Özel Kaideler', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    dualar: { label: 'Namaz Duaları', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
};
