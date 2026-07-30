import { AnnouncementsList } from '../components/announcements/AnnouncementsList';
import { ResultScreen } from '../components/result/ResultScreen';
import { SummaryScreen } from '../components/summary/SummaryScreen';
import { useKioskContext } from '../providers/KioskProvider';

export function ResultSurfacePage(): React.JSX.Element | null {
  const { result } = useKioskContext();
  if (!result) return null;

  if (result.screen === 'summary') {
    return <SummaryScreen {...result.props} />;
  }

  const { announcements, ...props } = result.props;
  return (
    <ResultScreen
      {...props}
      announcementsSlot={
        announcements.length > 0 ? (
          <AnnouncementsList items={announcements} />
        ) : undefined
      }
    />
  );
}
