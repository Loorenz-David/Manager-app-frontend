export { cn } from "./utils";

export { durations, easings, transitions, tabVariants } from "./animation";

export { notify } from "./notify";

export {
  CLIENT_ID_PREFIXES,
  CLIENT_ID_REGEX,
  ClientIdSchema,
  generateClientId,
} from "./client-id";
export type { ClientIdEntity, ClientIdPrefix } from "./client-id";

export { ApiEnvelopeSchema, ApiErrorSchema } from "./types/api";
export type { ApiResponse } from "./types/api";

export {
  DATE_ONLY_REGEX,
  DateOnlySchema,
  AddressSchema,
  DecimalStringSchema,
} from "./types/common";
export type {
  Branded,
  UserId,
  TaskId,
  TaskStepId,
  TaskNoteId,
  ItemId,
  ItemImageId,
  ItemIssueId,
  ItemUpholsteryId,
  CustomerId,
  CaseId,
  CaseConversationId,
  CaseConversationMessageId,
  CaseParticipantId,
  CaseLinkId,
  WorkingSectionId,
  UpholsteryId,
  UpholsteryInventoryId,
  UpholsteryRequirementId,
  WorkspaceId,
  DateOnly,
  Address,
  DecimalString,
} from "./types/common";

export type {
  CountryIso2,
  PhoneCountry,
  PhoneInputResolution,
  ManagedPhoneInputChangeMeta,
} from "./types/phone";

export type {
  StepStatus,
  StepConfig,
  StepStatusMap,
} from "./types/staged-form";

export { resolveRangeSelection } from "./date/resolve-range-selection";
export type { RangeSelectionResolution } from "./date/resolve-range-selection";
export { daysUntil } from "./date/days-until";
export { formatShortDate } from "./date/format-short-date";
export { isoWeek } from "./date/iso-week";

export { clampNumber } from "./number/clamp-number";
export { formatNumberDisplay } from "./number/format-number-display";
export { parseNumberDraft } from "./number/parse-number-draft";
export type { ParsedNumberDraft } from "./number/parse-number-draft";
export { sanitizeNumberInput } from "./number/sanitize-number-input";
export { stepNumber } from "./number/step-number";

export {
  DEFAULT_PHONE_COUNTRY_ISO2,
  PHONE_COUNTRIES,
  getPhoneCountryByIso2,
} from "./phone/countries";
export { getCountryFlagEmoji } from "./phone/flag";
export {
  formatPhoneDisplay,
  sanitizePhoneDraft,
} from "./phone/format-phone-display";
export { normalizePhoneDraft } from "./phone/normalize-phone";
export { parseE164Value } from "./phone/parse-e164";
export {
  resolveInitialPhoneState,
  resolvePhoneChange,
} from "./phone/phone-input-state";
export {
  readLastPhoneCountryIso2,
  writeLastPhoneCountryIso2,
  LAST_PHONE_COUNTRY_STORAGE_KEY,
} from "./phone/storage";

export { useTickingElapsed } from "./hooks/use-ticking-elapsed";

export { isSameImagePath } from "./url/is-same-image-path";
