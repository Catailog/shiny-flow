import { HomePage } from '@/features/home/components/HomePage';

import { isCloudMode } from '@/lib/mode';

export default function Page() {
  return <HomePage isCloudMode={isCloudMode} />;
}
