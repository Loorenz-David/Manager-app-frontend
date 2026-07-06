import { useState } from "react";

import type { ApiRequestError } from "@beyo/api-client";
import { notify } from "@beyo/lib";

import { useSendEmailBatch } from "../actions/use-send-email-batch";
import { useTasksWithCoordinationQuery } from "../api/use-tasks-with-coordination-query";
import type { CustomerCoordinationEmailSlideSurfaceOpeners } from "../surface-ids";
import type {
  SendEmailBatchResponseData,
  TaskListItemWithCoordinationRaw,
} from "../types";
import type { EmailTemplate } from "@beyo/emails";

type UseCustomerCoordinationEmailSlideControllerParams = {
  surfaceOpeners?: CustomerCoordinationEmailSlideSurfaceOpeners;
};

export type CustomerCoordinationEmailSlideController = {
  tasks: TaskListItemWithCoordinationRaw[];
  isInitialLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  isSending: boolean;
  selectedTaskIds: string[];
  selectedTemplate: EmailTemplate | null;
  subject: string;
  textBody: string;
  closeSurface?: () => void;
  openTaskDetail: (taskId: string) => void;
  openImageViewer: (task: TaskListItemWithCoordinationRaw) => void;
  loadMore: () => void;
  refetch: () => Promise<unknown>;
  toggleTaskSelection: (taskId: string) => void;
  applyTemplate: (template: EmailTemplate) => void;
  setSubject: (value: string) => void;
  setTextBody: (value: string) => void;
  sendDisabled: boolean;
  handleSend: () => Promise<{
    response: SendEmailBatchResponseData;
    remainingTaskCount: number;
  } | null>;
};

export function useCustomerCoordinationEmailSlideController({
  surfaceOpeners,
}: UseCustomerCoordinationEmailSlideControllerParams): CustomerCoordinationEmailSlideController {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [subject, setSubject] = useState("");
  const [textBody, setTextBody] = useState("");
  const tasksQuery = useTasksWithCoordinationQuery({
    customer_coordination_states: "pending",
  });
  const sendEmailBatch = useSendEmailBatch();

  const tasks = tasksQuery.query.data?.pages.flatMap((page) => page.items) ?? [];
  const trimmedSubject = subject.trim();
  const trimmedTextBody = textBody.trim();
  const sendDisabled =
    selectedTaskIds.length === 0 ||
    trimmedSubject.length === 0 ||
    trimmedTextBody.length === 0 ||
    sendEmailBatch.isPending;

  function toggleTaskSelection(taskId: string): void {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((currentTaskId) => currentTaskId !== taskId)
        : [...current, taskId],
    );
  }

  function applyTemplate(template: EmailTemplate): void {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setTextBody(template.text_body);
  }

  function toViewerImages(task: TaskListItemWithCoordinationRaw) {
    return task.item_images.flatMap((image) => {
      const clientId =
        typeof image.client_id === "string" ? image.client_id : null;
      const imageUrl =
        typeof image.image_url === "string" ? image.image_url : null;

      return clientId && imageUrl
        ? [{ client_id: clientId, image_url: imageUrl }]
        : [];
    });
  }

  async function handleSend() {
    if (sendDisabled) {
      return null;
    }

    try {
      const response = await sendEmailBatch.sendEmailBatch({
        task_ids: selectedTaskIds,
        subject: trimmedSubject,
        text_body: trimmedTextBody,
        html_body: null,
      });

      const successMessage =
        response.skipped_count > 0
          ? `${response.queued_count} email(s) queued, ${response.skipped_count} skipped`
          : `${response.queued_count} email(s) queued`;

      notify.success(successMessage);
      setSelectedTaskIds([]);

      const refreshed = await tasksQuery.query.refetch();
      const remainingTaskCount =
        refreshed.data?.pages.flatMap((page) => page.items).length ?? 0;

      return { response, remainingTaskCount };
    } catch (error) {
      const apiError = error as ApiRequestError | Error;
      notify.error(
        apiError instanceof Error
          ? apiError.message
          : "The email batch could not be queued.",
      );
      return null;
    }
  }

  return {
    tasks,
    isInitialLoading: tasksQuery.query.isPending,
    isError: tasksQuery.query.isError,
    hasMore: Boolean(tasksQuery.query.hasNextPage),
    isFetchingMore: tasksQuery.query.isFetchingNextPage,
    isSending: sendEmailBatch.isPending,
    selectedTaskIds,
    selectedTemplate,
    subject,
    textBody,
    closeSurface: surfaceOpeners?.closeSurface,
    openTaskDetail: (taskId) => {
      surfaceOpeners?.openTaskDetail?.(taskId);
    },
    openImageViewer: (task) => {
      const images = toViewerImages(task);
      if (!images.length) return;

      surfaceOpeners?.openImageViewer?.(
        task.task.client_id,
        task.primary_item?.client_id ?? null,
        images,
      );
    },
    loadMore: tasksQuery.loadMore,
    refetch: tasksQuery.query.refetch,
    toggleTaskSelection,
    applyTemplate,
    setSubject,
    setTextBody,
    sendDisabled,
    handleSend,
  };
}
