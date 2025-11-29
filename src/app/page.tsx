import { getPublicCurriculum } from './actions/getPublicCurriculum';
import { PageContent } from './page-content';

export default async function Home() {
  // Fetch data on the server for the logged-out view
  const { classGroups } = await getPublicCurriculum();

  return <PageContent classGroups={classGroups} />;
}