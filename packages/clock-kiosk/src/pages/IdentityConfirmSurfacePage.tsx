import { IdentityConfirmScreen } from '../components/confirm/IdentityConfirmScreen';
import { useKioskContext } from '../providers/KioskProvider';

export function IdentityConfirmSurfacePage(): React.JSX.Element | null {
  const { confirm } = useKioskContext();
  return confirm ? <IdentityConfirmScreen {...confirm} /> : null;
}
