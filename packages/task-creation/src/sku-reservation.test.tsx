import { StrictMode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { reserveSkuTemplate } from "./api/reserve-sku-template";
import { TaskCreationFormInitializationGate } from "./components/TaskCreationFormInitializationGate";
import { buildPreOrderFormDefaultValues } from "./lib/pre-order-form-default-values";
import {
  TaskCreationFormProvider,
  useTaskCreationFormContext,
} from "./providers/TaskCreationFormProvider";

const RESERVE_ENDPOINT =
  "http://localhost/api/v1/sku-templates/by-task-type/pre_order/reserve";

const reservation = {
  client_id: "skt_01K0TESTRESERVATION",
  task_type: "pre_order",
  reserved_scalar: 42,
  sku: "PRE_ORDER-0042",
} as const;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function ReservationProbe(): React.JSX.Element {
  const {
    initialItemSku,
    isSkuInitializationPending,
    skuInitializationError,
  } = useTaskCreationFormContext();

  return (
    <output data-testid="reservation-probe">
      {JSON.stringify({
        initialItemSku,
        isSkuInitializationPending,
        hasError: Boolean(skuInitializationError),
      })}
    </output>
  );
}

function renderReservationProvider(): ReturnType<typeof render> {
  const queryClient = createQueryClient();

  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TaskCreationFormProvider taskType="pre_order">
          <TaskCreationFormInitializationGate>
            <ReservationProbe />
          </TaskCreationFormInitializationGate>
        </TaskCreationFormProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe("pre-order SKU reservation", () => {
  it("posts without a body and validates the direct reservation envelope", async () => {
    let requestBody: string | null = "not-observed";

    server.use(
      http.post(RESERVE_ENDPOINT, async ({ request }) => {
        requestBody = await request.text();
        return HttpResponse.json({
          ok: true,
          data: reservation,
          warnings: [],
        });
      }),
    );

    await expect(reserveSkuTemplate("pre_order")).resolves.toEqual(reservation);
    expect(requestBody).toBe("");
  });

  it("reserves exactly once under StrictMode and gates the form until success", async () => {
    let requestCount = 0;
    let releaseResponse = (): void => {};

    server.use(
      http.post(RESERVE_ENDPOINT, async () => {
        requestCount += 1;
        await new Promise<void>((resolve) => {
          releaseResponse = resolve;
        });

        return HttpResponse.json({
          ok: true,
          data: reservation,
          warnings: [],
        });
      }),
    );

    renderReservationProvider();

    expect(screen.getByTestId("surface-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("reservation-probe")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(requestCount).toBe(1);
    });
    releaseResponse();

    await waitFor(() => {
      expect(screen.getByTestId("reservation-probe")).toHaveTextContent(
        '"initialItemSku":"PRE_ORDER-0042"',
      );
    });
    expect(requestCount).toBe(1);
    expect(screen.queryByTestId("surface-skeleton")).not.toBeInTheDocument();
  });

  it("releases the form with an empty SKU when the template is unavailable", async () => {
    let requestCount = 0;

    server.use(
      http.post(RESERVE_ENDPOINT, () => {
        requestCount += 1;
        return HttpResponse.json(
          { error: "SKU template not found.", ok: false },
          { status: 404 },
        );
      }),
    );

    renderReservationProvider();

    await waitFor(() => {
      expect(screen.getByTestId("reservation-probe")).toHaveTextContent(
        '"initialItemSku":""',
      );
    });
    expect(screen.getByTestId("reservation-probe")).toHaveTextContent(
      '"hasError":true',
    );
    expect(requestCount).toBe(1);
  });

  it("uses the reserved SKU as an editable form default and reset value", () => {
    const defaults = buildPreOrderFormDefaultValues(reservation.sku);
    defaults.item.sku = "MANUAL-SKU";

    expect(defaults.item.sku).toBe("MANUAL-SKU");
    expect(
      buildPreOrderFormDefaultValues(reservation.sku).item.sku,
    ).toBe(reservation.sku);
  });
});
