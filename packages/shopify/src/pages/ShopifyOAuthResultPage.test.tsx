import type { PropsWithChildren } from "react";

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { shopifyKeys } from "../api/shopify-keys";
import { ShopifyOAuthResultPage } from "./ShopifyOAuthResultPage";

function renderPage(search: string, onBackToSettings?: () => void) {
  window.history.replaceState({}, "", `/${search}`);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: PropsWithChildren): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <ShopifyOAuthResultPage onBackToSettings={onBackToSettings} />
    </Wrapper>,
  );

  return { invalidateQueriesSpy };
}

describe("ShopifyOAuthResultPage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the success state and invalidates the Shopify shops query", async () => {
    const { invalidateQueriesSpy } = renderPage(
      "?success=true&shop_domain=alpha-shop.myshopify.com",
    );

    expect(
      screen.getByRole("heading", { name: "Shopify shop connected" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your Shopify integration is ready to manage from Settings.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("alpha-shop.myshopify.com")).toBeInTheDocument();

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: shopifyKeys.shops(),
      });
    });
  });

  it("renders a known failure message and does not invalidate queries", () => {
    const { invalidateQueriesSpy } = renderPage(
      "?success=false&shop_domain=alpha-shop.myshopify.com&error_code=state_expired",
    );

    expect(
      screen.getByRole("heading", {
        name: "Shopify connection could not be completed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This Shopify connection link expired. Start a new connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it("falls back to the generic failure state for missing or unknown error codes", () => {
    const { rerender } = render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyOAuthResultPage />
      </QueryClientProvider>,
    );

    window.history.replaceState({}, "", "/?success=false");
    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyOAuthResultPage />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(
        "The Shopify connection did not finish successfully. Please try again from Settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/This Shopify connection link expired/i),
    ).not.toBeInTheDocument();

    window.history.replaceState(
      {},
      "",
      "/?success=unexpected&error_code=not_a_real_code",
    );
    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyOAuthResultPage />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByText(/not_a_real_code/i),
    ).not.toBeInTheDocument();
  });

  it("renders the optional callback button only when provided", async () => {
    const user = userEvent.setup();
    const handleBackToSettings = vi.fn();

    const { rerender } = render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyOAuthResultPage onBackToSettings={handleBackToSettings} />
      </QueryClientProvider>,
    );

    const button = screen.getByRole("button", {
      name: "View Shopify integrations",
    });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleBackToSettings).toHaveBeenCalledTimes(1);

    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyOAuthResultPage />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "View Shopify integrations" }),
    ).not.toBeInTheDocument();
  });
});
