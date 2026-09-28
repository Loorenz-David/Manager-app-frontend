import { useEffect, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useActivateStockReportVersion } from "../actions/use-stock-report-actions";
import { useStockReportVersionQuery } from "../api/use-stock-report-queries";
import { ROW_CLASS } from "../components/sheets/StockReportDetailMenuSheetContent";
import { StockReportActivateSheetContent } from "../components/sheets/StockReportActivateSheetContent";
import { formatScheduleLabel } from "../lib/version-format";
import { toStockReportVersionViewModel } from "../stock-report.types";
import type { StockReportActivateSurfaceProps } from "../surface-ids";

type RelayProps = Extract<StockReportActivateSurfaceProps, { onConfirm: unknown }>;
type ActivateProps = Exclude<StockReportActivateSurfaceProps, RelayProps>;

function isRelay(props: Partial<StockReportActivateSurfaceProps>): props is RelayProps {
  return "onConfirm" in props && typeof props.onConfirm === "function";
}

/**
 * One sheet, two callers (plan §G.10). From the version actions sheet it reads
 * the version and activates it itself; from the version form it only relays
 * the choice and closes — the form sends the request (§3.3).
 */
export function StockReportActivateSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<Partial<StockReportActivateSurfaceProps>>();

  useEffect(() => {
    header?.setTitle(props.mode === "schedule" ? "Schedule activation" : "Activate version");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header, props.mode]);

  if (isRelay(props)) return <RelayActivateSheet {...props} />;
  return <DirectActivateSheet versionId={(props as Partial<ActivateProps>).versionId ?? ""} />;
}

function RelayActivateSheet({ mode, title, scheduledAt, initialKeep, onConfirm }: RelayProps): React.JSX.Element {
  const header = useSurfaceHeader();
  const [keep, setKeep] = useState(initialKeep);
  // One clock per opening, like the form that opened it.
  const [now] = useState(() => Date.now());

  return (
    <StockReportActivateSheetContent
      keepActiveMissing={keep}
      mode={mode}
      scheduleLabel={scheduledAt ? formatScheduleLabel(scheduledAt, now) : null}
      title={title}
      onConfirm={() => {
        onConfirm(keep);
        header?.requestClose();
      }}
      onKeepChange={setKeep}
    />
  );
}

/**
 * Activates now. The picker is pre-selected from the draft's stored flag (v9
 * §5.17 "pre-fill the drawer from it") but its value goes only into the
 * request body — manual activation never writes the stored flag, which is the
 * scheduled activation's.
 */
function DirectActivateSheet({ versionId }: { versionId: string }): React.JSX.Element {
  const header = useSurfaceHeader();
  const version = useStockReportVersionQuery(versionId);
  const activate = useActivateStockReportVersion(versionId);
  const [picked, setPicked] = useState<boolean | null>(null);

  if (!version.data) {
    return (
      <div className="flex flex-col gap-2 px-4 pb-4" data-testid="stock-report-activate-skeleton">
        {[0, 1, 2].map((index) => (
          <div key={index} className={`${ROW_CLASS} animate-pulse`} />
        ))}
      </div>
    );
  }

  const keep = picked ?? version.data.scheduled_activation_keeps_active_missing;
  return (
    <StockReportActivateSheetContent
      disabled={activate.isPending}
      keepActiveMissing={keep}
      mode="activate"
      title={toStockReportVersionViewModel(version.data).displayTitle}
      // On success the draft board beneath closes itself and everything above
      // it (§C.4); from the drafts page this close is the one that counts.
      onConfirm={() => activate.mutate({ keepActiveMissing: keep }, { onSuccess: () => header?.requestClose() })}
      onKeepChange={setPicked}
    />
  );
}
