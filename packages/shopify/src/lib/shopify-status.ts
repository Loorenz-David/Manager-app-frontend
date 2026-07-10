import type { StatePillVariant } from "@beyo/ui";

import type {
  ShopifyIntegrationEventSeverity,
  ShopifyIntegrationEventType,
  ShopifyIntegrationStatus,
  ShopifyScopesStatus,
  ShopifyWebhookIntakeStatus,
  ShopifyWebhookSubscriptionStatus,
  ShopifyWebhooksStatus,
} from "../types";

const STATUS_LABELS: Record<ShopifyIntegrationStatus, string> = {
  pending_install: "Pending install",
  active: "Active",
  needs_reauth: "Needs reauth",
  scopes_outdated: "Scopes outdated",
  webhooks_outdated: "Webhooks outdated",
  disabled: "Disabled",
  uninstalled: "Uninstalled",
  error: "Error",
};

export function shopifyIntegrationStatusVariant(
  status: ShopifyIntegrationStatus,
): StatePillVariant {
  switch (status) {
    case "active":
      return "success";
    case "pending_install":
    case "disabled":
    case "uninstalled":
      return "neutral";
    case "needs_reauth":
    case "scopes_outdated":
    case "webhooks_outdated":
      return "warning";
    case "error":
      return "danger";
  }
}

export function shopifyIntegrationStatusLabel(
  status: ShopifyIntegrationStatus,
): string {
  return STATUS_LABELS[status];
}

const SCOPES_STATUS_LABELS: Record<ShopifyScopesStatus, string> = {
  outdated: "Outdated",
  up_to_date: "Up to date",
};

export function shopifyScopesStatusVariant(
  status: ShopifyScopesStatus,
): StatePillVariant {
  switch (status) {
    case "outdated":
      return "warning";
    case "up_to_date":
      return "success";
  }
}

export function shopifyScopesStatusLabel(status: ShopifyScopesStatus): string {
  return SCOPES_STATUS_LABELS[status];
}

const WEBHOOK_SUBSCRIPTION_STATUS_LABELS: Record<
  ShopifyWebhookSubscriptionStatus,
  string
> = {
  pending: "Pending",
  active: "Active",
  failed: "Failed",
  disabled: "Disabled",
  removed: "Removed",
};

export function shopifyWebhookSubscriptionStatusVariant(
  status: ShopifyWebhookSubscriptionStatus,
): StatePillVariant {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "neutral";
    case "failed":
      return "danger";
    case "disabled":
    case "removed":
      return "neutral";
  }
}

export function shopifyWebhookSubscriptionStatusLabel(
  status: ShopifyWebhookSubscriptionStatus,
): string {
  return WEBHOOK_SUBSCRIPTION_STATUS_LABELS[status];
}

const WEBHOOK_INTAKE_STATUS_LABELS: Record<ShopifyWebhookIntakeStatus, string> =
  {
    received: "Received",
    processing: "Processing",
    processed: "Processed",
    failed: "Failed",
    ignored: "Ignored",
  };

export function shopifyWebhookIntakeStatusVariant(
  status: ShopifyWebhookIntakeStatus,
): StatePillVariant {
  switch (status) {
    case "processed":
      return "success";
    case "processing":
    case "received":
    case "ignored":
      return "neutral";
    case "failed":
      return "danger";
  }
}

export function shopifyWebhookIntakeStatusLabel(
  status: ShopifyWebhookIntakeStatus,
): string {
  return WEBHOOK_INTAKE_STATUS_LABELS[status];
}

const EVENT_SEVERITY_LABELS: Record<ShopifyIntegrationEventSeverity, string> = {
  info: "Info",
  warning: "Warning",
  error: "Error",
};

export function shopifyIntegrationEventSeverityVariant(
  severity: ShopifyIntegrationEventSeverity,
): StatePillVariant {
  switch (severity) {
    case "info":
      return "neutral";
    case "warning":
      return "warning";
    case "error":
      return "danger";
  }
}

export function shopifyIntegrationEventSeverityLabel(
  severity: ShopifyIntegrationEventSeverity,
): string {
  return EVENT_SEVERITY_LABELS[severity];
}

const EVENT_TYPE_LABELS: Record<ShopifyIntegrationEventType, string> = {
  webhook_sync: "Webhook sync",
  webhook_received: "Webhook received",
  webhook_processed: "Webhook processed",
  disconnect: "Disconnected",
};

export function shopifyIntegrationEventTypeLabel(
  eventType: ShopifyIntegrationEventType,
): string {
  return EVENT_TYPE_LABELS[eventType];
}

export function hasShopifyHealthWarning(
  scopesStatus: ShopifyScopesStatus,
  webhooksStatus: ShopifyWebhooksStatus,
): boolean {
  return scopesStatus === "outdated" || webhooksStatus !== "synced";
}
