import {
  selectDismiss,
  selectTrigger,
  useCelebrationStore,
} from "../store/celebration.store";

export function useCelebration() {
  const trigger = useCelebrationStore(selectTrigger);
  const dismiss = useCelebrationStore(selectDismiss);

  return { trigger, dismiss };
}
