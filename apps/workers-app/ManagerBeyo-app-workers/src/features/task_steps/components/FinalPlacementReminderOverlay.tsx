import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import { MapPin } from "lucide-react";
import { transitions } from "@beyo/lib";
import {
  selectDismissFinalPlacementReminder,
  selectFinalPlacementReminderItems,
  useFinalPlacementReminderStore,
} from "../lib/final-placement-reminder.store";

const REMINDER_DURATION_MS = 5000;
// The celebration sits at 9999. Keeping this one layer below lets it mount
// before the celebration exits, producing a seamless handoff.
const OVERLAY_Z_INDEX = 9998;

function normalizedAssortment(assortment: string | null): string | null {
  const value = assortment?.trim();
  return value ? value : null;
}

function ReminderContent(): React.JSX.Element {
  const items = useFinalPlacementReminderStore(
    selectFinalPlacementReminderItems,
  );
  const item = items[0];

  if (items.length === 1 && item) {
    const assortment = normalizedAssortment(item.assortment);

    return (
      <div className="flex max-w-md flex-col items-center gap-5 text-center text-white">
        <MapPin aria-hidden="true" className="size-14" strokeWidth={1.75} />
        {assortment ? (
          <>
            <p className="text-xl font-medium">
              Don&apos;t forget to place the item in its final location
            </p>
            <p className="text-4xl font-semibold tracking-tight">
              {assortment}
            </p>
          </>
        ) : (
          <p className="text-xl font-medium">
            Don&apos;t forget to ask where this item should be placed.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center text-white">
      <MapPin aria-hidden="true" className="size-14" strokeWidth={1.75} />
      <p className="text-xl font-medium">
        Don&apos;t forget the final placement for these items
      </p>
      <ul className="flex w-full flex-col gap-2 text-left">
        {items.map((reminderItem, index) => (
          <li
            key={`${reminderItem.itemLabel}-${index}`}
            className="rounded-xl bg-white/10 px-4 py-3"
          >
            <span className="block text-sm text-white/70">
              {reminderItem.itemLabel}
            </span>
            <span className="block text-lg font-semibold">
              {normalizedAssortment(reminderItem.assortment) ??
                "Ask where this item should be placed"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinalPlacementReminderOverlayInner(): React.JSX.Element {
  const items = useFinalPlacementReminderStore(
    selectFinalPlacementReminderItems,
  );
  const dismiss = useFinalPlacementReminderStore(
    selectDismissFinalPlacementReminder,
  );

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const timer = window.setTimeout(dismiss, REMINDER_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, items]);

  return (
    <AnimatePresence>
      {items.length > 0 ? (
        <m.button
          key="final-placement-reminder-overlay"
          animate={{ opacity: 1 }}
          aria-label="Dismiss final placement reminder"
          className="fixed inset-0 flex items-center justify-center overflow-y-auto px-6 py-12"
          data-testid="final-placement-reminder-overlay"
          exit={{ opacity: 0 }}
          // Cover closing surfaces and query-driven list refreshes immediately.
          // Fading the backdrop in from transparent exposes a one-frame flash.
          initial={{ opacity: 1 }}
          onClick={dismiss}
          style={{
            zIndex: OVERLAY_Z_INDEX,
            backgroundColor: "rgba(0,0,0,0.82)",
          }}
          transition={transitions.base}
          type="button"
        >
          <ReminderContent />
        </m.button>
      ) : null}
    </AnimatePresence>
  );
}

export function FinalPlacementReminderOverlay(): React.JSX.Element | null {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(<FinalPlacementReminderOverlayInner />, document.body);
}
