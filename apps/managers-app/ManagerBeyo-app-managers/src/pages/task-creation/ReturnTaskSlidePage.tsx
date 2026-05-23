import { useContext, useEffect } from 'react';

import { ReturnFormContent, TaskCreationFormProvider } from '@/features/task-creation';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function ReturnTaskSlidePage(): React.JSX.Element {
  const header = useContext(SurfaceHeaderContext);

  useEffect(() => {
    header?.setTitle('New return');
  }, [header]);

  return (
    <TaskCreationFormProvider>
      <ReturnFormContent />
    </TaskCreationFormProvider>
  );
}
