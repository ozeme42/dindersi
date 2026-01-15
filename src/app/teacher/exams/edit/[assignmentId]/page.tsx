'use client';

import { Suspense } from 'react';
import CreateExamClientPage from '../../new/page';

export default function EditExamPage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <CreateExamClientPage />
        </Suspense>
    )
}
