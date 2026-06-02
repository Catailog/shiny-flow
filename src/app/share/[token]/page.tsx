import { notFound } from 'next/navigation';

import { ShareViewer } from '@/features/home/components/ShareViewer';

import { getFlowByShareToken } from '@/lib/db/flows';

type Props = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const flow = await getFlowByShareToken(token);
  if (!flow) notFound();

  return <ShareViewer name={flow.name} data={flow.data} />;
}
