import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'Dosya seçilmedi.' }, { status: 400 });
        }

        // PDF doğrulaması
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            return NextResponse.json({ success: false, error: 'Lütfen geçerli bir PDF dosyası seçin.' }, { status: 400 });
        }

        // 50 MB sınır kontrolü
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'PDF dosya boyutu maksimum 50 MB olabilir.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // public/uploads/pdfs klasörünü garanti et
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Dosya adını güvenli hale getir
        const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\s+/g, '_');
        const uniqueFileName = `${Date.now()}_${sanitizedName}`;
        const filePath = path.join(uploadDir, uniqueFileName);

        await fs.promises.writeFile(filePath, buffer);

        // Sunucudan doğrudan statik olarak sunulan URL
        const fileUrl = `/uploads/pdfs/${uniqueFileName}`;

        return NextResponse.json({
            success: true,
            url: fileUrl,
            fileName: file.name,
            size: file.size
        });
    } catch (error: any) {
        console.error('PDF upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'PDF yüklenirken bir hata oluştu.' },
            { status: 500 }
        );
    }
}
