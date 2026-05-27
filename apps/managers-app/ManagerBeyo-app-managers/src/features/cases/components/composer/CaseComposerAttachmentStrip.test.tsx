import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildImageViewModel } from "@/features/images/test-utils";

const setDraftAttachmentsStateMock = vi.fn();
const imagesContextValue = {
  deleteImage: vi.fn(),
  hasFailedUploads: false,
  images: [] as ReturnType<typeof buildImageViewModel>[],
  isUploading: false,
  openViewer: vi.fn(),
  retryImageUpload: vi.fn(),
};

vi.mock("../../providers/CaseConversationProvider", () => ({
  useCaseConversationContext: () => ({
    setDraftAttachmentsState: setDraftAttachmentsStateMock,
  }),
}));

vi.mock("@/features/images/providers/EntityImagesProvider", () => ({
  useEntityImagesContext: () => imagesContextValue,
}));

vi.mock("@/features/images/components/ImageAddPictureButton", () => ({
  ImageAddPictureButton: ({ testId }: { testId?: string }) => (
    <div data-testid={testId ?? "mock-add-picture-button"} />
  ),
}));

import { CaseComposerAttachmentStrip } from "./CaseComposerAttachmentStrip";

describe("CaseComposerAttachmentStrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imagesContextValue.deleteImage.mockReset();
    imagesContextValue.openViewer.mockReset();
    imagesContextValue.retryImageUpload.mockReset();
    imagesContextValue.images = [];
    imagesContextValue.hasFailedUploads = false;
    imagesContextValue.isUploading = false;
  });

  it("hides completely when there are no images and the add trigger is disabled", () => {
    render(<CaseComposerAttachmentStrip showAddTrigger={false} />);

    expect(
      screen.queryByTestId("case-composer-attachment-strip"),
    ).not.toBeInTheDocument();
    expect(setDraftAttachmentsStateMock).toHaveBeenCalledWith({
      count: 0,
      hasFailures: false,
      isUploading: false,
    });
  });

  it("keeps the add trigger visible by default when there are no images", () => {
    render(<CaseComposerAttachmentStrip />);

    expect(screen.getByTestId("case-composer-attachment-strip")).toBeVisible();
    expect(screen.getByTestId("case-composer-add-picture-button")).toBeVisible();
  });

  it("renders preview-only tiles without the embedded add trigger when disabled", () => {
    imagesContextValue.images = [
      buildImageViewModel({
        clientId: "img_completed",
        imageUrl: "https://cdn.example.com/completed.webp",
        uploadState: "completed",
      }),
      buildImageViewModel({
        clientId: "img_failed",
        imageUrl: "https://cdn.example.com/failed.webp",
        uploadState: "failed",
      }),
    ];
    imagesContextValue.hasFailedUploads = true;

    render(<CaseComposerAttachmentStrip showAddTrigger={false} />);

    expect(screen.getByTestId("case-composer-attachment-strip")).toBeVisible();
    expect(
      screen.queryByTestId("case-composer-add-picture-button"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Upload failed")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View attachment" }));
    fireEvent.click(
      screen.getByTestId("case-composer-attachment-retry-img_failed"),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Remove attachment" })[0]!);

    expect(imagesContextValue.openViewer).toHaveBeenCalledWith("img_completed");
    expect(imagesContextValue.retryImageUpload).toHaveBeenCalledWith(
      "img_failed",
    );
    expect(imagesContextValue.deleteImage).toHaveBeenCalledWith("img_completed");
  });

  it("hides again after the last attachment is removed", () => {
    imagesContextValue.images = [
      buildImageViewModel({
        clientId: "img_only",
        uploadState: "completed",
      }),
    ];

    const { rerender } = render(
      <CaseComposerAttachmentStrip showAddTrigger={false} />,
    );

    expect(screen.getByTestId("case-composer-attachment-strip")).toBeVisible();

    imagesContextValue.images = [];
    rerender(<CaseComposerAttachmentStrip showAddTrigger={false} />);

    expect(
      screen.queryByTestId("case-composer-attachment-strip"),
    ).not.toBeInTheDocument();
  });
});
