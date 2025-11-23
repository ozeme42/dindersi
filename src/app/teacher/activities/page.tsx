
import { getActivitiesPageData } from './actions';
import { ActivitiesClientPage } from './client-page';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage() {
  const data = await getActivitiesPageData();
  
  // Convert non-plain objects to plain objects
  const serializedData = JSON.parse(JSON.stringify(data));
  
  return <ActivitiesClientPage data={serializedData} />;
}
