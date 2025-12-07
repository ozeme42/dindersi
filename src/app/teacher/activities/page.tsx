
"use client";

import { useState, useEffect } from 'react';
import { ActivitiesClientPage } from './client-page';
import { Loader2 } from 'lucide-react';
import { getActivitiesPageData } from './actions';
import type { EnrichedClass } from './actions';


export default function ActivitiesPage() {
    const [data, setData] = useState<EnrichedClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const result = await getActivitiesPageData();
            setData(result);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return <ActivitiesClientPage data={data} />;
}
