import { useContext, useEffect } from 'react';

import { PreOrderFormContent, TaskCreationFormProvider } from '@/features/task-creation';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function PreOrderTaskSlidePage(): React.JSX.Element {
  const header = useContext(SurfaceHeaderContext);

  useEffect(() => {
    header?.setTitle('New pre-order');
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <PreOrderFormContent />
    </TaskCreationFormProvider>
  );
}
