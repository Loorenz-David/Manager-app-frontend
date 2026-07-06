import type {
  EmailMessageDetailsSheetSurfaceProps,
  EmailTemplatePickerSheetSurfaceProps,
  EmailsSurfaceOpeners,
} from "@beyo/emails";

import type { CoordinationInboxFilterState } from "./types";

export const CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID =
  "customer-coordination-email-slide";
export const CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID =
  "customer-coordination-email-inbox-slide";
export const CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID =
  "customer-coordination-email-reply-slide";
export const CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID =
  "customer-coordination-email-inbox-filter-sheet";

export type CustomerCoordinationEmailSlideSurfaceOpeners = EmailsSurfaceOpeners & {
  closeSurface?: () => void;
  openTaskDetail?: (taskId: string) => void;
  openImageViewer?: (
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ) => void;
};

export type CustomerCoordinationEmailSlideSurfaceProps = {
  surfaceOpeners?: CustomerCoordinationEmailSlideSurfaceOpeners;
};

export type CustomerCoordinationEmailReplySlideSurfaceOpeners =
  EmailsSurfaceOpeners & {
    closeSurface?: () => void;
    onReplySent?: () => void;
  };

export type CustomerCoordinationEmailReplySlideSurfaceProps = {
  taskId: string;
  threadId: string;
  surfaceOpeners?: CustomerCoordinationEmailReplySlideSurfaceOpeners;
};

export type CustomerCoordinationInboxFilterSheetSurfaceProps = {
  currentFilters: CoordinationInboxFilterState;
  onApply: (filters: CoordinationInboxFilterState) => void;
};

export type CustomerCoordinationEmailInboxSurfaceOpeners = {
  closeSurface?: () => void;
  openImageViewer?: (
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ) => void;
  openMessageDetails?: (
    props: EmailMessageDetailsSheetSurfaceProps,
  ) => void;
  openFilterSheet?: (
    props: CustomerCoordinationInboxFilterSheetSurfaceProps,
  ) => void;
  openReplySurface?: (
    props: CustomerCoordinationEmailReplySlideSurfaceProps,
  ) => void;
};

export type CustomerCoordinationEmailInboxSurfaceProps = {
  surfaceOpeners?: CustomerCoordinationEmailInboxSurfaceOpeners;
};

export type {
  EmailMessageDetailsSheetSurfaceProps,
  EmailTemplatePickerSheetSurfaceProps,
};
