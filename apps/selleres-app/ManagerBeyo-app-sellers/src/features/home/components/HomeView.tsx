import {
  GmailIcon,
  PostHandlingIcon,
  HandshakeIconComponent,
} from "@beyo/assets";
import {
  EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID,
  EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
  type EmailMessageDetailsSheetSurfaceProps,
  type EmailTemplatePickerSheetSurfaceProps,
} from "@beyo/emails";
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
  type ImageViewModel,
} from "@beyo/images";
import {
  CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID,
  CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID,
  type CustomerCoordinationEmailInboxSurfaceProps,
  type CustomerCoordinationInboxFilterSheetSurfaceProps,
  CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID,
  type CustomerCoordinationEmailReplySlideSurfaceProps,
  CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID,
  type CustomerCoordinationEmailSlideSurfaceProps,
} from "@beyo/task-customer-coordination";
import { CALENDAR_RANGE_PICKER_SURFACE_ID } from "@beyo/task-creation";

import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_SLIDE_SURFACE_ID,
  preloadPinNotificationsSlideSurface,
  preloadTaskPostHandlingPendingWarningSheetSurface,
  type TaskPostHandlingPendingWarningSheetSurfaceProps,
  type TaskPostHandlingSlideSurfaceProps,
} from "@/features/tasks/surfaces";
import { useSurface } from "@/hooks/use-surface";

import { formatCompactCount } from "../lib/format-compact-count";
import { useHomeViewContext } from "../providers/HomeViewProvider";

export function HomeView(): React.JSX.Element {
  const { coordinationCount, emailUnreadCount, postHandlingCountLabel } =
    useHomeViewContext();
  const surface = useSurface();

  function openMessageDetailsSurface(
    props: EmailMessageDetailsSheetSurfaceProps,
  ): void {
    surface.open(EMAIL_MESSAGE_DETAILS_SHEET_SURFACE_ID, props);
  }

  function openImageViewer(
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ): void {
    if (!images.length) return;

    const viewModels: ImageViewModel[] = images.map((img, index) => ({
      clientId: img.client_id,
      linkClientId: null,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: itemClientId ?? taskId,
      imageUrl: img.image_url,
      localObjectUrl: null,
      displayOrder: index,
      widthPx: null,
      heightPx: null,
      fileSizeBytes: null,
      createdAt: null,
      uploadState: "completed",
      isOptimistic: false,
      isDeleted: false,
      pendingUploadClientId: null,
      uploadError: null,
      annotation: null,
      annotations: [],
    }));

    const initialImage = viewModels[0];
    if (!initialImage) return;

    surface.open(IMAGE_VIEWER_SURFACE_ID, {
      images: viewModels,
      initialImageClientId: initialImage.clientId,
      entityType: "item",
      entityClientId: itemClientId ?? taskId,
      mode: "preview-only",
    });
  }

  function openCustomerCoordinationSurface(): void {
    surface.open(CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID, {
      surfaceOpeners: {
        closeSurface: () =>
          surface.close(CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID),
        openEmailTemplatePicker: (props) => {
          surface.open(
            EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
            props satisfies EmailTemplatePickerSheetSurfaceProps,
          );
        },
        openTaskDetail: (taskId) =>
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
        openImageViewer,
      },
    } satisfies CustomerCoordinationEmailSlideSurfaceProps);
  }

  function openCustomerCoordinationEmailInboxSurface(): void {
    surface.open(CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID, {
      surfaceOpeners: {
        closeSurface: () =>
          surface.close(CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID),
        openImageViewer,
        openMessageDetails: openMessageDetailsSurface,
        openFilterSheet: (props) => {
          surface.open(
            CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID,
            props satisfies CustomerCoordinationInboxFilterSheetSurfaceProps,
          );
        },
        openReplySurface: (props) => {
          surface.open(CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID, {
            ...props,
            surfaceOpeners: {
              ...props.surfaceOpeners,
              closeSurface: () =>
                surface.close(
                  CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID,
                ),
              openEmailTemplatePicker: (pickerProps) => {
                surface.open(
                  EMAIL_TEMPLATE_PICKER_SHEET_SURFACE_ID,
                  pickerProps satisfies EmailTemplatePickerSheetSurfaceProps,
                );
              },
            },
          } satisfies CustomerCoordinationEmailReplySlideSurfaceProps);
        },
      },
    } satisfies CustomerCoordinationEmailInboxSurfaceProps);
  }

  function openTaskPostHandlingSurface(): void {
    surface.open(TASK_POST_HANDLING_SLIDE_SURFACE_ID, {
      defaultTab: "pending",
      surfaceOpeners: {
        closeSurface: () => surface.close(TASK_POST_HANDLING_SLIDE_SURFACE_ID),
        openTaskDetail: (taskId) =>
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
        openTaskActions: (taskId, itemId) => {
          preloadPinNotificationsSlideSurface();
          surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
        },
        openImageViewer,
        openPendingWarning: (props) => {
          surface.open(
            TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
            props satisfies TaskPostHandlingPendingWarningSheetSurfaceProps,
          );
        },
        openCalendarRangePicker: (props) => {
          surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props);
        },
        preloadPendingWarningSheet:
          preloadTaskPostHandlingPendingWarningSheetSurface,
      },
    } satisfies TaskPostHandlingSlideSurfaceProps);
  }

  return (
    <div className="flex h-full flex-col gap-4 px-4 pt-10">
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        data-testid="home-post-handling-box"
        type="button"
        onClick={openTaskPostHandlingSurface}
      >
        <span>Ready for Handling{postHandlingCountLabel}</span>
        <div className="ml-auto flex">
          <PostHandlingIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
      <div className="flex gap-4">
        <button
          className="relative flex flex-1 items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
          type="button"
          onClick={openCustomerCoordinationSurface}
        >
          <span>Coordinate</span>
          <div className="ml-auto flex">
            <HandshakeIconComponent
              aria-hidden="true"
              className="size-8 shrink-0"
            />
          </div>
          {coordinationCount !== null && coordinationCount > 0 && (
            <div className="absolute -right-2 -top-2">
              <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-card">
                {formatCompactCount(coordinationCount)}
              </span>
            </div>
          )}
        </button>

        <button
          className="relative flex flex-1 items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
          type="button"
          onClick={openCustomerCoordinationEmailInboxSurface}
        >
          <span>Follow-up</span>
          <div className="ml-auto flex">
            <GmailIcon aria-hidden="true" className="size-8 shrink-0" />
          </div>
          {emailUnreadCount !== null && emailUnreadCount > 0 && (
            <div className="absolute -right-2 -top-2">
              <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-card">
                {formatCompactCount(emailUnreadCount)}
              </span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
