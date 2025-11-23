
import { getPublicCurriculum } from './actions/getPublicCurriculum';
import { PageContent } from './page-content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch data on the server for the logged-out view
  const { courseGroups } = await getPublicCurriculum();

  return <PageContent courseGroups={courseGroups} />;
}
