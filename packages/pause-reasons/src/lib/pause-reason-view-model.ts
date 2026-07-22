import type { PauseReason, PauseReasonPickerOption } from "../types";

export function toPauseReasonPickerOption(
  reason: PauseReason,
): PauseReasonPickerOption {
  return {
    value: reason.client_id,
    label: reason.name,
    image: reason.image_url,
    imageClassName: "size-14",
    slug: reason.slug,
    requires_description: reason.requires_description,
    pause_type: reason.pause_type,
    testId: `pause-reason-option-${reason.slug}`,
  };
}
