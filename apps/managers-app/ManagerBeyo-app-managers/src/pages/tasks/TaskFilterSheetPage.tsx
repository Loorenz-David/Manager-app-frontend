import { useEffect } from 'react';

import { useSurfaceHeader } from '@/hooks/use-surface-header';

export function TaskFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle('Filters');
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Filters coming soon</p>
    </div>
  );
}
