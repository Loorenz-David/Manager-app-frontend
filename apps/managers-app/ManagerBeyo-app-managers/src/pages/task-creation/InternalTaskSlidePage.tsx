import { useContext, useEffect } from 'react';

import { InternalFormContent, TaskCreationFormProvider } from '@/features/task-creation';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function InternalTaskSlidePage(): React.JSX.Element {
  const header = useContext(SurfaceHeaderContext);

  useEffect(() => {
    header?.setTitle('New internal task');
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <InternalFormContent />
    </TaskCreationFormProvider>
  );
}
