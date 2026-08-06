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

import { getSkuTemplateByTaskType } from "./api/get-sku-template-by-task-type";
import { buildPreOrderFormDefaultValues } from "./lib/pre-order-form-default-values";
import { buildReturnFormDefaultValues } from "./lib/return-form-default-values";
import {
  TaskCreationFormProvider,
  useTaskCreationFormContext,
} from "./providers/TaskCreationFormProvider";
import { PreOrderFormSchema, ReturnFormSchema } from "./types";

const PREVIEW_ENDPOINT =
  "http://localhost/api/v1/sku-templates/by-task-type/pre_order";
const RETURN_PREVIEW_ENDPOINT =
  "http://localhost/api/v1/sku-templates/by-task-type/return";

const template = {
  client_id: "skt_01K0TESTTEMPLATE",
  task_type: "pre_order",
  prefix: "PRE",
  separator: "-",
  pad_width: 0,
  last_scalar: 6,
  next_scalar: 7,
  next_sku_preview: "PRE-7",
} as const;

const returnTemplate = {
  ...template,
  client_id: "skt_01K0TESTRETURNTEMPLATE",
  task_type: "return",
  prefix: "RET",
  next_sku_preview: "RET-7",
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

function PreviewProbe(): React.JSX.Element {
  const { skuPreview, isSkuPreviewLoading, hasSkuTemplate } =
    useTaskCreationFormContext();

  return (
    <output data-testid="preview-probe">
      {JSON.stringify({ skuPreview, isSkuPreviewLoading, hasSkuTemplate })}
    </output>
  );
}

function renderPreviewProvider(
  taskType: "pre_order" | "return" = "pre_order",
): ReturnType<typeof render> {
  const queryClient = createQueryClient();

  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TaskCreationFormProvider taskType={taskType}>
          <PreviewProbe />
        </TaskCreationFormProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

function buildSubmittableValues(
  overrides: Partial<ReturnType<typeof buildPreOrderFormDefaultValues>> = {},
) {
  const defaults = buildPreOrderFormDefaultValues(true);

  return {
    ...defaults,
    ...overrides,
    item: { ...defaults.item, ...overrides.item },
    customer: {
      ...defaults.customer,
      display_name: "Ada",
      customer_type: "private" as const,
      primary_email: "ada@example.com",
      primary_phone_number: "+46700000000",
      ...overrides.customer,
    },
    product_unit_price: 100,
    shopIntegrationIds: ["shop-1"],
    inventoryQuantities: [
      { shopIntegrationId: "shop-1", locationId: "loc-1", quantity: 1 },
    ],
  };
}

describe("pre-order SKU preview", () => {
  it("reads the template without writing anything", async () => {
    const methods: string[] = [];

    server.use(
      http.get(PREVIEW_ENDPOINT, ({ request }) => {
        methods.push(request.method);
        return HttpResponse.json({ ok: true, data: template, warnings: [] });
      }),
    );

    await expect(getSkuTemplateByTaskType("pre_order")).resolves.toEqual(
      template,
    );
    expect(methods).toEqual(["GET"]);
  });

  it("opens the form immediately instead of gating on the preview", async () => {
    let releaseResponse = (): void => {};

    server.use(
      http.get(PREVIEW_ENDPOINT, async () => {
        await new Promise<void>((resolve) => {
          releaseResponse = resolve;
        });

        return HttpResponse.json({ ok: true, data: template, warnings: [] });
      }),
    );

    renderPreviewProvider();

    // The reserve call this replaced burned a number, so the form used to sit
    // behind a skeleton until it resolved. A plain read earns no such gate.
    expect(screen.getByTestId("preview-probe")).toHaveTextContent(
      '"skuPreview":null',
    );
    expect(screen.queryByTestId("surface-skeleton")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(releaseResponse).toBeTypeOf("function");
    });
    releaseResponse();

    await waitFor(() => {
      expect(screen.getByTestId("preview-probe")).toHaveTextContent(
        '"skuPreview":"PRE-7"',
      );
    });
    expect(screen.getByTestId("preview-probe")).toHaveTextContent(
      '"hasSkuTemplate":true',
    );
  });

  it("reports no template when the workspace has none", async () => {
    server.use(
      http.get(PREVIEW_ENDPOINT, () =>
        HttpResponse.json(
          { error: "SKU template not found.", ok: false },
          { status: 404 },
        ),
      ),
    );

    renderPreviewProvider();

    await waitFor(() => {
      expect(screen.getByTestId("preview-probe")).toHaveTextContent(
        '"hasSkuTemplate":false',
      );
    });
    expect(screen.getByTestId("preview-probe")).toHaveTextContent(
      '"skuPreview":null',
    );
  });

  it("starts the SKU field empty so the backend assigns the real one", () => {
    expect(buildPreOrderFormDefaultValues(true).item.sku).toBe("");
    expect(buildPreOrderFormDefaultValues(false).item.sku).toBe("");
    expect(buildPreOrderFormDefaultValues(true).has_sku_template).toBe(true);
  });

  it("accepts an item with no typed identity when a template exists", () => {
    const result = PreOrderFormSchema.safeParse(
      buildSubmittableValues({ has_sku_template: true }),
    );

    expect(result.success).toBe(true);
  });

  it("still demands an article number or SKU without a template", () => {
    const result = PreOrderFormSchema.safeParse(
      buildSubmittableValues({ has_sku_template: false }),
    );

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "item.article_number",
      ),
    ).toBe(true);
  });

  it("accepts a manual SKU as an override", () => {
    const result = PreOrderFormSchema.safeParse(
      buildSubmittableValues({
        has_sku_template: true,
        item: {
          ...buildPreOrderFormDefaultValues(true).item,
          sku: "MANUAL-SKU",
        },
      }),
    );

    expect(result.success).toBe(true);
  });
});

function buildSubmittableReturnValues(
  overrides: Partial<ReturnType<typeof buildReturnFormDefaultValues>> = {},
) {
  const defaults = buildReturnFormDefaultValues(false);

  return {
    ...defaults,
    ...overrides,
    item: { ...defaults.item, ...overrides.item },
    return_source: overrides.return_source ?? ("after_purchase" as const),
    customer: {
      ...defaults.customer,
      display_name: "Ada",
      customer_type: "private" as const,
      primary_email: "ada@example.com",
      primary_phone_number: "+46700000000",
      ...overrides.customer,
    },
  };
}

describe("return SKU preview", () => {
  it("keys the preview by the return task type, not a hardcoded default", async () => {
    server.use(
      http.get(RETURN_PREVIEW_ENDPOINT, () =>
        HttpResponse.json({ ok: true, data: returnTemplate, warnings: [] }),
      ),
    );

    renderPreviewProvider("return");

    await waitFor(() => {
      expect(screen.getByTestId("preview-probe")).toHaveTextContent(
        '"skuPreview":"RET-7"',
      );
    });
    expect(screen.getByTestId("preview-probe")).toHaveTextContent(
      '"hasSkuTemplate":true',
    );
  });

  it("allows a blank identity for after_purchase when a template exists", () => {
    const result = ReturnFormSchema.safeParse(
      buildSubmittableReturnValues({
        has_sku_template: true,
        return_source: "after_purchase",
      }),
    );

    expect(result.success).toBe(true);
  });

  it("still requires an identity for after_purchase without a template", () => {
    const result = ReturnFormSchema.safeParse(
      buildSubmittableReturnValues({
        has_sku_template: false,
        return_source: "after_purchase",
      }),
    );

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "item.article_number",
      ),
    ).toBe(true);
  });

  it("keeps requiring an identity for before_purchase even with a template", () => {
    const result = ReturnFormSchema.safeParse(
      buildSubmittableReturnValues({
        has_sku_template: true,
        return_source: "before_purchase",
      }),
    );

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "item.article_number",
      ),
    ).toBe(true);
  });

  it("keeps requiring an identity for store_return even with a template", () => {
    const result = ReturnFormSchema.safeParse(
      buildSubmittableReturnValues({
        has_sku_template: true,
        return_source: "store_return",
      }),
    );

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path.join(".") === "item.article_number",
      ),
    ).toBe(true);
  });

  it("accepts a manual SKU override for after_purchase regardless of the template", () => {
    const result = ReturnFormSchema.safeParse(
      buildSubmittableReturnValues({
        has_sku_template: true,
        return_source: "after_purchase",
        item: {
          ...buildReturnFormDefaultValues(true).item,
          sku: "MANUAL-SKU",
        },
      }),
    );

    expect(result.success).toBe(true);
  });
});
