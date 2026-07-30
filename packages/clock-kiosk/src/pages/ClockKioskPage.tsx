import { KeypadScreen } from '../components/keypad/KeypadScreen';
import { useKioskContext } from '../providers/KioskProvider';

export function ClockKioskPage(): React.JSX.Element {
  const { keypad } = useKioskContext();
  return <KeypadScreen {...keypad} />;
}
