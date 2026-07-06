import { useEffect, useState } from "react";

import type { ApiRequestError } from "@beyo/api-client";
import { resolveReplySubject, type EmailTemplate } from "@beyo/emails";
import { notify } from "@beyo/lib";

import { useSendCoordinationReply } from "../actions/use-send-coordination-reply";
import { useThreadMessagesQuery } from "../api/use-thread-messages-query";
import type { CustomerCoordinationEmailReplySlideSurfaceOpeners } from "../surface-ids";

type UseCustomerCoordinationEmailReplySlideControllerParams = {
  taskId: string;
  threadId: string;
  surfaceOpeners?: CustomerCoordinationEmailReplySlideSurfaceOpeners;
};

export type CustomerCoordinationEmailReplySlideController = {
  selectedTemplate: EmailTemplate | null;
  subject: string;
  textBody: string;
  isInitialLoading: boolean;
  isSending: boolean;
  closeSurface?: () => void;
  applyTemplate: (template: EmailTemplate) => void;
  setSubject: (value: string) => void;
  setTextBody: (value: string) => void;
  sendDisabled: boolean;
  handleSend: () => Promise<boolean>;
};

export function useCustomerCoordinationEmailReplySlideController({
  taskId,
  threadId,
  surfaceOpeners,
}: UseCustomerCoordinationEmailReplySlideControllerParams): CustomerCoordinationEmailReplySlideController {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [subject, setSubject] = useState("");
  const [textBody, setTextBody] = useState("");
  const [isSubjectInitialized, setIsSubjectInitialized] = useState(false);
  const threadMessagesQuery = useThreadMessagesQuery(threadId, {
    limit: 200,
    offset: 0,
  });
  const sendCoordinationReply = useSendCoordinationReply();

  useEffect(() => {
    if (isSubjectInitialized || !threadMessagesQuery.isFetched) {
      return;
    }

    const latestMessageSubject =
      threadMessagesQuery.data?.messages.at(-1)?.subject ?? null;
    setSubject(resolveReplySubject(latestMessageSubject));
    setIsSubjectInitialized(true);
  }, [
    isSubjectInitialized,
    threadMessagesQuery.data?.messages,
    threadMessagesQuery.isFetched,
  ]);

  const trimmedSubject = subject.trim();
  const trimmedTextBody = textBody.trim();
  const sendDisabled =
    taskId.length === 0 ||
    threadId.length === 0 ||
    trimmedSubject.length === 0 ||
    trimmedTextBody.length === 0 ||
    threadMessagesQuery.isPending ||
    sendCoordinationReply.isPending;

  function applyTemplate(template: EmailTemplate): void {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setTextBody(template.text_body);
  }

  async function handleSend(): Promise<boolean> {
    if (sendDisabled) {
      return false;
    }

    try {
      await sendCoordinationReply.sendCoordinationReply({
        taskId,
        input: {
          thread_client_id: threadId,
          subject: trimmedSubject,
          text_body: trimmedTextBody,
          html_body: null,
        },
      });

      surfaceOpeners?.onReplySent?.();
      surfaceOpeners?.closeSurface?.();
      return true;
    } catch (error) {
      const apiError = error as ApiRequestError | Error;
      notify.error(
        apiError instanceof Error
          ? apiError.message
          : "The reply could not be queued.",
      );
      return false;
    }
  }

  return {
    selectedTemplate,
    subject,
    textBody,
    isInitialLoading: threadMessagesQuery.isPending,
    isSending: sendCoordinationReply.isPending,
    closeSurface: surfaceOpeners?.closeSurface,
    applyTemplate,
    setSubject,
    setTextBody,
    sendDisabled,
    handleSend,
  };
}
