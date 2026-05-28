export const CASE_MESSAGE_EDIT_REQUEST_EVENT = 'case-message-edit-request';

export type CaseMessageEditRequestDetail = {
  messageClientId: string;
  messageSeq: number | null;
  messageText: string;
};

export function dispatchCaseMessageEditRequest(detail: CaseMessageEditRequestDetail): void {
  window.dispatchEvent(
    new CustomEvent<CaseMessageEditRequestDetail>(CASE_MESSAGE_EDIT_REQUEST_EVENT, {
      detail,
    }),
  );
}
