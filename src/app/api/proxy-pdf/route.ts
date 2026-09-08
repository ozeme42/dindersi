import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'URL parametresi gerekli.' }, { status: 400 });
    }

    try {
        let downloadUrl = targetUrl;

        // Google Drive URL ise dosya ID'sini ayıkla ve doğrudan indirme adresine çevir
        if (targetUrl.includes('drive.google.com')) {
            const fileIdMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                                targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                                targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            
            if (fileIdMatch && fileIdMatch[1]) {
                const fileId = fileIdMatch[1];
                downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;
            }
        }

        const response = await fetch(downloadUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return NextResponse.json({ 
                error: 'Dosya indirilemedi. Google Drive dosyasının "Bağlantıya sahip olan herkes" olarak paylaşıldığından emin olun.' 
            }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // HTML döndüyse (Google login/kısıtlama sayfası)
        if (contentType.includes('text/html') || buffer.subarray(0, 4).toString() !== '%PDF') {
            return NextResponse.json({
                error: 'Bu dosya gizli veya erişilemez durumda. Lütfen Google Drive paylaşım ayarlarını "Bağlantıya sahip olan herkes" olarak değiştirin veya bilgisayarınızdaki PDF dosyasını doğrudan "PDF Yükle" ile yükleyin.'
            }, { status: 403 });
        }

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err: any) {
        console.error('PDF proxy error:', err);
        return NextResponse.json({ error: err.message || 'PDF yüklenirken bir hata oluştu.' }, { status: 500 });
    }
}
