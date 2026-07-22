import { ApiRequestError } from "@beyo/api-client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  recordPresentationViewState,
  useRecordViewState,
} from "../actions/useRecordViewState";
import { consumerPresentationFixture, envelope } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";
import type { PresentationViewAction } from "../types";
import { useActivePresentation } from "./active-presentation";

const API_PATTERN = "*/api/v1/app-update-presentations";

describe("consumer active + view-state loop", () => {
  it("uses app_key and records shown, monotonic progress, and completion with version", async () => {
    let completed = false;
    let lastSlideIndex = 0;
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_PATTERN}/active`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("app_key")).toBe("worker");
        return HttpResponse.json(envelope({
          presentation: completed ? null : {
            ...consumerPresentationFixture,
            view_state: { status: "unseen", last_slide_index: lastSlideIndex },
          },
        }));
      }),
      http.post(`${API_PATTERN}/:id/view-state`, async ({ request }) => {
        const body = await request.json() as {
          version: number;
          action: PresentationViewAction;
          last_slide_index?: number;
        };
        bodies.push(body);
        if (body.version !== consumerPresentationFixture.version) {
          return HttpResponse.json({ error: "Version mismatch.", ok: false }, { status: 422 });
        }
        if (completed && body.action === "dismissed") {
          return HttpResponse.json({ error: "Already completed.", ok: false }, { status: 409 });
        }
        if (body.action === "progressed") {
          lastSlideIndex = Math.max(lastSlideIndex, body.last_slide_index ?? 0);
        }
        if (body.action === "completed") completed = true;
        return HttpResponse.json(envelope({
          view_state: {
            client_id: "aupv_01JVIEW",
            presentation_id: consumerPresentationFixture.client_id,
            status: completed ? "completed" : "shown",
            last_slide_index: lastSlideIndex,
            view_count: 1,
            first_shown_at: "2026-07-22T18:01:00+00:00",
            last_shown_at: "2026-07-22T18:01:00+00:00",
            dismissed_at: null,
            completed_at: completed ? "2026-07-22T18:02:00+00:00" : null,
          },
        }));
      }),
    );
    const { Wrapper } = createTestContext();
    const active = renderHook(() => useActivePresentation("worker"), { wrapper: Wrapper });
    const actions = renderHook(() => useRecordViewState(), { wrapper: Wrapper });
    await waitFor(() => expect(active.result.current.data?.client_id).toBe(consumerPresentationFixture.client_id));

    await act(async () => {
      await actions.result.current.shown({
        presentationClientId: consumerPresentationFixture.client_id,
        version: 2,
        lastSlideIndex: 0,
        isDismissible: true,
      });
      await actions.result.current.progressed({
        presentationClientId: consumerPresentationFixture.client_id,
        version: 2,
        lastSlideIndex: 1,
        isDismissible: true,
      });
      await actions.result.current.progressed({
        presentationClientId: consumerPresentationFixture.client_id,
        version: 2,
        lastSlideIndex: 0,
        isDismissible: true,
      });
      await actions.result.current.completed({
        presentationClientId: consumerPresentationFixture.client_id,
        version: 2,
        lastSlideIndex: 1,
        isDismissible: true,
      });
      await active.result.current.refetch();
    });

    expect(lastSlideIndex).toBe(1);
    await waitFor(() => expect(active.result.current.data).toBeNull());
    expect(bodies).toEqual([
      { version: 2, action: "shown", last_slide_index: 0 },
      { version: 2, action: "progressed", last_slide_index: 1 },
      { version: 2, action: "progressed", last_slide_index: 0 },
      { version: 2, action: "completed", last_slide_index: 1 },
    ]);

    await expect(recordPresentationViewState({
      presentationClientId: consumerPresentationFixture.client_id,
      version: 1,
      action: "shown",
      lastSlideIndex: 0,
      isDismissible: true,
    })).rejects.toMatchObject<Partial<ApiRequestError>>({ status: 422 });
    await expect(recordPresentationViewState({
      presentationClientId: consumerPresentationFixture.client_id,
      version: 2,
      action: "dismissed",
      lastSlideIndex: 1,
      isDismissible: true,
    })).rejects.toMatchObject<Partial<ApiRequestError>>({ status: 409 });
  });

  it("never sends dismissed for a non-dismissible presentation", async () => {
    let requestCount = 0;
    server.use(http.post(`${API_PATTERN}/:id/view-state`, () => {
      requestCount += 1;
      return HttpResponse.json({}, { status: 500 });
    }));
    await expect(recordPresentationViewState({
      presentationClientId: consumerPresentationFixture.client_id,
      version: 2,
      action: "dismissed",
      isDismissible: false,
    })).resolves.toBeNull();
    expect(requestCount).toBe(0);
  });
});
