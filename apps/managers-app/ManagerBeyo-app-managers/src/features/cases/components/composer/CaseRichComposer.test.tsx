import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CaseMessageContent } from "../../message-content";

const emptyComposerContent: CaseMessageContent = { parts: [] };

const controllerValue = {
  cancelEditing: vi.fn(),
  canSendDraft: true,
  caseDetail: {
    case: {
      client_id: "case_1",
    },
  },
  composerContent: emptyComposerContent,
  draftAttachmentCount: 0,
  draftMessageClientId: "ccm_draft_1",
  draftText: "",
  editError: null,
  editingComposerContent: emptyComposerContent,
  editingDraftText: "",
  editingMessageId: null as string | null,
  isSending: false,
  isSubmittingEdit: false,
  sendError: null,
  sendDraft: vi.fn(),
  setComposerContent: vi.fn(),
  setEditingComposerContent: vi.fn(),
  submitEdit: vi.fn(),
  typingIndicatorText: null as string | null,
};

vi.mock("../../providers/CaseConversationProvider", () => ({
  useCaseConversationContext: () => controllerValue,
}));

vi.mock("./CaseComposerDraftImagesProvider", () => ({
  CaseComposerDraftImagesProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("./CaseComposerAttachmentStrip", () => ({
  CaseComposerAttachmentStrip: () => (
    <div data-testid="mock-attachment-strip" />
  ),
}));

vi.mock("./CaseComposerInlineCameraButton", () => ({
  CaseComposerInlineCameraButton: () => (
    <div data-testid="mock-inline-camera-button" />
  ),
}));

vi.mock("./CaseComposerEditor", () => ({
  CaseComposerEditor: () => (
    <div contentEditable data-testid="mock-rich-editor" tabIndex={0} />
  ),
}));

import { CaseRichComposer } from "./CaseRichComposer";

describe("CaseRichComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerValue.editingMessageId = null;
  });

  it("renders the inline camera button in normal compose mode", () => {
    render(<CaseRichComposer />);

    expect(screen.getByTestId("mock-inline-camera-button")).toBeVisible();
  });

  it("hides the inline camera button while editing", () => {
    controllerValue.editingMessageId = "ccm_existing";

    render(<CaseRichComposer />);

    expect(
      screen.queryByTestId("mock-inline-camera-button"),
    ).not.toBeInTheDocument();
  });

  it("blurs the focused editor before sending", () => {
    controllerValue.composerContent = {
      parts: [{ kind: "text", text: "Need help" }],
    };

    render(<CaseRichComposer />);

    const editor = screen.getByTestId("mock-rich-editor");
    editor.focus();

    expect(editor).toHaveFocus();

    fireEvent.click(screen.getByTestId("case-composer-send-button"));

    expect(controllerValue.sendDraft).toHaveBeenCalledTimes(1);
    expect(editor).not.toHaveFocus();
  });
});
