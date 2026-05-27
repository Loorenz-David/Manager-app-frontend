import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const controllerValue = {
  cancelEditing: vi.fn(),
  canSendDraft: true,
  caseDetail: {
    case: {
      client_id: "case_1",
    },
  },
  composerContent: { parts: [] },
  draftAttachmentCount: 0,
  draftMessageClientId: "ccm_draft_1",
  draftText: "",
  editError: null,
  editingComposerContent: { parts: [] },
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
  CaseComposerEditor: () => <div data-testid="mock-rich-editor" />,
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
});
