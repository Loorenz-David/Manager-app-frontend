import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openMock = vi.fn();
const useImageQueryMock = vi.fn<
  (imageClientId: string | null | undefined) => { data: unknown }
>(() => ({ data: undefined }));

vi.mock("@/hooks/use-surface", () => ({
  useSurface: () => ({
    open: openMock,
  }),
}));

vi.mock("@/features/images/api/use-image", () => ({
  useImageQuery: (imageClientId: string | null | undefined) =>
    useImageQueryMock(imageClientId),
}));

import { IMAGE_VIEWER_SURFACE_ID } from "@/features/images/surfaces";

import { CaseConversationMessageRawSchema } from "../types";
import { CaseMessageImageGrid } from "./CaseMessageImageGrid";

describe("CaseMessageImageGrid", () => {
  beforeEach(() => {
    openMock.mockReset();
    useImageQueryMock.mockReset();
    useImageQueryMock.mockReturnValue({ data: undefined });
  });

  it("renders persisted message images and opens the viewer in preview-only mode", () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: "ccm_img_1",
      message_seq: 10,
      created_at: "2026-05-27T10:00:00Z",
      content: null,
      plain_text: "",
      has_been_edited: false,
      has_been_deleted: false,
      images: [
        {
          client_id: "img_msg_1",
          image_url: "https://cdn.example.com/case-message-1.webp",
          storage_provider: "s3",
          source_type: "uploaded",
          width_px: 1280,
          height_px: 960,
          file_size_bytes: 4096,
          created_at: "2026-05-27T10:00:00Z",
        },
      ],
    });

    render(<CaseMessageImageGrid message={message} />);

    fireEvent.click(
      screen.getByTestId("case-message-image-ccm_img_1-img_msg_1"),
    );

    expect(screen.getByTestId("case-message-image-grid-ccm_img_1")).toBeVisible();
    expect(openMock).toHaveBeenCalledWith(
      IMAGE_VIEWER_SURFACE_ID,
      expect.objectContaining({
        entityClientId: "ccm_img_1",
        entityType: "case_conversation_message",
        initialImageClientId: "img_msg_1",
        mode: "preview-only",
      }),
    );
  });

  it("renders the annotation overlay from a singular backend image_annotation payload", () => {
    const message = CaseConversationMessageRawSchema.parse({
      client_id: "ccm_img_2",
      message_seq: 11,
      created_at: "2026-05-27T10:00:00Z",
      content: [
        {
          type: "text",
          text: "test with image",
          mention: null,
          label_value: null,
          link: null,
        },
      ],
      plain_text: "test with image",
      has_been_edited: false,
      has_been_deleted: false,
      images: [
        {
          client_id: "img_msg_2",
          image_url: "https://cdn.example.com/case-message-2.webp",
          storage_provider: "s3",
          source_type: "uploaded",
          source_reference: "s3_image_url",
          width_px: null,
          height_px: null,
          file_size_bytes: 82822,
          created_at: "2026-05-27T10:00:00Z",
          last_event: {
            client_id: "iev_1",
            event_type: "upload_message_image",
            state: "requested",
            created_at: "2026-05-27T10:00:00Z",
            last_error: null,
          },
          events: [],
          image_annotation: {
            client_id: "ann_msg_1",
            annotation_type: "rectangle",
            data: {
              tool: "rectangle",
              x: 0.1,
              y: 0.1,
              width: 0.4,
              height: 0.3,
              color: "#ff0000",
              strokeWidth: 4,
            },
            accuracy: null,
            created_at: "2026-05-27T10:00:00Z",
          },
        },
      ],
      mentions: [],
    });

    render(<CaseMessageImageGrid message={message} />);

    expect(screen.getByTestId("case-message-image-grid-ccm_img_2")).toBeVisible();
    expect(
      screen.getByTestId("case-message-image-ccm_img_2-img_msg_2"),
    ).toBeVisible();
    expect(
      screen.getByTestId("case-message-image-annotation-ccm_img_2-img_msg_2"),
    ).toBeVisible();
  });

  it("hydrates partial message image snapshots through the image feature query", () => {
    useImageQueryMock.mockReturnValue({
      data: {
        client_id: "img_msg_3",
        image_url: "https://cdn.example.com/case-message-3.webp",
        storage_provider: "s3",
        source_type: "uploaded",
        source_reference: "s3_image_url",
        width_px: 1200,
        height_px: 900,
        file_size_bytes: 12288,
        created_at: "2026-05-27T10:00:00Z",
        last_event: null,
        events: [],
        image_annotation: {
          client_id: "ann_msg_3",
          annotation_type: "rectangle",
          data: {
            tool: "rectangle",
            x: 0.2,
            y: 0.15,
            width: 0.4,
            height: 0.25,
            color: "#00ff00",
            strokeWidth: 4,
          },
          accuracy: null,
          created_at: "2026-05-27T10:00:00Z",
        },
        image_annotations: [],
      },
    });

    const message = CaseConversationMessageRawSchema.parse({
      client_id: "ccm_img_3",
      message_seq: 12,
      created_at: "2026-05-27T10:00:00Z",
      content: null,
      plain_text: "",
      has_been_edited: false,
      has_been_deleted: false,
      images: [
        {
          client_id: "img_msg_3",
          image_url: "https://cdn.example.com/case-message-3.webp",
          storage_provider: "s3",
          source_type: "uploaded",
          width_px: null,
          height_px: null,
          file_size_bytes: 12288,
          created_at: "2026-05-27T10:00:00Z",
        },
      ],
    });

    render(<CaseMessageImageGrid message={message} />);

    expect(useImageQueryMock).toHaveBeenCalledWith("img_msg_3");
    expect(
      screen.getByTestId("case-message-image-annotation-ccm_img_3-img_msg_3"),
    ).toBeVisible();
  });
});
