import { ResultScreen } from '../components/result/ResultScreen';
import { useKioskContext } from '../providers/KioskProvider';

export function ResultSurfacePage(): React.JSX.Element | null {
  const { result } = useKioskContext();
  return result ? <ResultScreen {...result} /> : null;
}
