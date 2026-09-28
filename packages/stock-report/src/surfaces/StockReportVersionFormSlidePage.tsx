import { useEffect, useMemo, useState } from "react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import {
  useActivateStockReportVersion,
  useCreateStockReportVersion,
  useUpdateStockReportVersion,
} from "../actions/use-stock-report-actions";
import { useStockReportVersionQuery } from "../api/use-stock-report-queries";
import { StockReportSlideHeader } from "../components/StockReportSlideHeader";
import { StockVersionForm } from "../components/versions/StockVersionForm";
import { stockReportRequestFailureMessage } from "../lib/stock-report-request-failure";
import {
  hasStockVersionUpdate,
  needsActivationChoice,
  stockVersionFormPlan,
  toCreateStockVersionBody,
  toStockVersionFormOriginal,
  toUpdateStockVersionBody,
  type StockVersionFormOriginal,
  type StockVersionFormValues,
} from "../lib/version-form";
import { formatVersionDayTitle } from "../lib/version-format";
import {
  STOCK_REPORT_ACTIVATE_SURFACE_ID,
  STOCK_REPORT_BOARD_SURFACE_ID,
  STOCK_REPORT_DRAFTS_SURFACE_ID,
  STOCK_REPORT_SCHEDULE_SURFACE_ID,
  type StockReportActivateSurfaceProps,
  type StockReportScheduleSurfaceProps,
  type StockReportVersionFormSurfaceProps,
} from "../surface-ids";

/**
 * Create a version or edit one (plan §F). The form is pure; this page owns
 * every request and every surface move (§3.3):
 *
 * - a submit that stores a scheduled draft, or promotes one, first opens the
 *   activation sheet and **waits** — the request goes out only from its
 *   `onConfirm`, with the keep choice; a dismissed sheet sends nothing
 *   (OC-16, OC-17);
 * - a promote patches the title (if it changed) and then activates with the
 *   chosen flag in the body (projection R14, v9 §5.17);
 * - while a request is in flight neither a swipe nor the back row can leave
 *   the page half-way (projection R13).
 */
export function StockReportVersionFormSlidePage(): React.JSX.Element {
  const { versionId } = useSurfaceProps<StockReportVersionFormSurfaceProps>();
  const header = useSurfaceHeader();
  const { open, isOpen } = useSurface();
  const [now] = useState(() => Date.now());
  const isEdit = typeof versionId === "string" && versionId.length > 0;
  const version = useStockReportVersionQuery(isEdit ? versionId : null);
  const create = useCreateStockReportVersion();
  const update = useUpdateStockReportVersion(versionId ?? "");
  const activate = useActivateStockReportVersion(versionId ?? "");
  const pending = create.isPending || update.isPending || activate.isPending;
  const [createError, setCreateError] = useState<string | null>(null);
  const title = isEdit ? "Edit version" : "New version";

  const original = useMemo<StockVersionFormOriginal | null>(
    () => (version.data ? toStockVersionFormOriginal(version.data) : null),
    [version.data],
  );
  const placeholderTitle = formatVersionDayTitle(original?.createdAt ?? new Date(now).toISOString(), now);

  useEffect(() => {
    header?.setTitle(title);
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header, title]);

  // The swipe and the surface's own close go through the interceptor; the
  // back row does not, so it is disabled below as well.
  useEffect(() => {
    if (!pending) return;
    header?.setCloseInterceptor(() => {});
    return () => header?.setCloseInterceptor(null);
  }, [header, pending]);

  async function run(values: StockVersionFormValues, keep?: boolean): Promise<void> {
    const plan = stockVersionFormPlan(values, original);
    setCreateError(null);
    try {
      if (plan === "create-draft") {
        await create.mutateAsync(toCreateStockVersionBody(values, placeholderTitle, keep));
        if (!isOpen(STOCK_REPORT_DRAFTS_SURFACE_ID)) open(STOCK_REPORT_DRAFTS_SURFACE_ID, {});
      } else if (plan === "create-active") {
        await create.mutateAsync(toCreateStockVersionBody(values, placeholderTitle));
        open(STOCK_REPORT_BOARD_SURFACE_ID, {});
      } else if (original !== null) {
        const patch = toUpdateStockVersionBody(values, original, plan === "patch" ? keep : undefined);
        if (hasStockVersionUpdate(patch)) await update.mutateAsync(patch);
        if (plan === "patch-then-activate") {
          await activate.mutateAsync({ keepActiveMissing: keep ?? original.keepActiveMissing });
        }
      }
      // The destination (if any) is already on top; the form leaves beneath it.
      header?.requestClose();
    } catch (error) {
      // Update and activate toast their own failure; a create has none, so
      // the form says it where the user is looking.
      if (plan === "create-draft" || plan === "create-active") {
        setCreateError(stockReportRequestFailureMessage(error));
      }
    }
  }

  function submit(values: StockVersionFormValues): void {
    const choice = needsActivationChoice(values, original);
    if (choice === null) {
      void run(values);
      return;
    }
    const props: StockReportActivateSurfaceProps = {
      mode: choice,
      title: values.title.trim() || placeholderTitle,
      scheduledAt: values.scheduledAt,
      // The stored choice; `false` for a new draft (OC-16).
      initialKeep: original?.keepActiveMissing ?? false,
      onConfirm: (keep) => void run(values, keep),
    };
    open(STOCK_REPORT_ACTIVATE_SURFACE_ID, props);
  }

  function openSchedule(current: string | null, apply: (iso: string | null) => void): void {
    const props: StockReportScheduleSurfaceProps = { current, onSelect: apply };
    open(STOCK_REPORT_SCHEDULE_SURFACE_ID, props);
  }

  return (
    <div className="relative h-full min-h-0 flex-1" data-testid="stock-report-version-form-page">
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-none">
        <StockReportSlideHeader
          backDisabled={pending}
          data-testid="stock-report-version-form-back"
          title={title}
          onBack={() => header?.requestClose()}
        />
        <div className="px-4 pb-[calc(var(--safe-bottom,0px)+1.5rem)] pt-2">
          {isEdit && version.isPending ? (
            <div className="flex flex-col gap-3" data-testid="stock-version-form-skeleton">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : null}

          {isEdit && version.isError && original === null ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center" data-testid="stock-version-form-load-error">
              <p className="text-sm font-medium text-muted-foreground">{stockReportRequestFailureMessage(version.error)}</p>
              <button
                className="rounded-full bg-card px-5 py-2 text-sm font-medium text-foreground shadow-sm"
                type="button"
                onClick={() => void version.refetch()}
              >
                Try again
              </button>
            </div>
          ) : null}

          {!isEdit || original !== null ? (
            <StockVersionForm
              errorMessage={createError}
              now={now}
              original={original}
              pending={pending}
              onOpenSchedule={openSchedule}
              onSubmit={submit}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
