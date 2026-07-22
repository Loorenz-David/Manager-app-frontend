import { act, render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ActivePresentationProvider } from "./ActivePresentationProvider";
import { activePresentationKeys } from "./api/active-presentation";
import type { PresentationSurfaceProps } from "./surfaces/presentation-surface-props";
import { consumerPresentationFixture, envelope } from "./test/fixtures";
import { server } from "./test/server";
import { createTestContext } from "./test/test-utils";

const API_PATTERN = "*/api/v1/app-update-presentations";

describe("ActivePresentationProvider", () => {
  it("owns one presentation, dedupes invalidation, then opens the next after terminal close", async () => {
    const second = {
      ...consumerPresentationFixture,
      client_id: "aup_01JCONSUMER2",
      logical_client_id: "aup_01JCONSUMER2",
      title: "Second announcement",
    };
    let firstCompleted = false;
    let getCount = 0;
    const actions: string[] = [];
    server.use(
      http.get(`${API_PATTERN}/active`, () => {
        getCount += 1;
        return HttpResponse.json(envelope({
          presentation: firstCompleted ? second : consumerPresentationFixture,
        }));
      }),
      http.post(`${API_PATTERN}/:id/view-state`, async ({ params, request }) => {
        const body = await request.json() as { action: string; last_slide_index?: number };
        actions.push(`${String(params.id)}:${body.action}:${body.last_slide_index ?? "-"}`);
        if (params.id === consumerPresentationFixture.client_id && body.action === "completed") {
          firstCompleted = true;
        }
        return HttpResponse.json(envelope({
          view_state: {
            client_id: "aupv_01JPROVIDER",
            presentation_id: String(params.id),
            status: body.action === "completed" ? "completed" : "shown",
            last_slide_index: body.last_slide_index ?? 0,
          },
        }));
      }),
    );
    const opened: PresentationSurfaceProps[] = [];
    const openPresentationModal = vi.fn((props: PresentationSurfaceProps) => opened.push(props));
    const { queryClient, Wrapper } = createTestContext();
    render(
      <ActivePresentationProvider
        appKey="worker"
        navigate={vi.fn()}
        surfaceOpeners={{ openPresentationModal }}
      >
        <div>host app</div>
      </ActivePresentationProvider>,
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(openPresentationModal).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(actions).toContain("aup_01JCONSUMER:shown:0"));

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: activePresentationKeys.active("worker") });
    });
    await waitFor(() => expect(getCount).toBeGreaterThanOrEqual(2));
    expect(openPresentationModal).toHaveBeenCalledTimes(1);

    await act(async () => {
      await opened[0]!.onProgress(1);
      await opened[0]!.onComplete(1);
      await opened[0]!.onClosed();
    });
    await waitFor(() => expect(openPresentationModal).toHaveBeenCalledTimes(2));
    expect(opened[1]!.presentation.client_id).toBe(second.client_id);
    expect(actions).toContain("aup_01JCONSUMER:progressed:1");
    expect(actions).toContain("aup_01JCONSUMER:completed:1");
  });
});

