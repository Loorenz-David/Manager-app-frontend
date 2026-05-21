import { useContext, useEffect } from 'react';

import { TestingFormsContent } from '@/features/testing_forms';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function TestingFormsSlidePage(): React.JSX.Element {
  const header = useContext(SurfaceHeaderContext);

  useEffect(() => {
    header?.setTitle('Testing forms');
  }, [header]);

  return <TestingFormsContent />;
}
