import { z } from "zod";

export const ShopifyUserReferenceSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
});
export type ShopifyUserReference = z.infer<typeof ShopifyUserReferenceSchema>;

export const ShopifyIntegrationStatusSchema = z.enum([
  "pending_install",
  "active",
  "needs_reauth",
  "scopes_outdated",
  "webhooks_outdated",
  "disabled",
  "uninstalled",
  "error",
]);
export type ShopifyIntegrationStatus = z.infer<
  typeof ShopifyIntegrationStatusSchema
>;

export const ShopifyWebhookSubscriptionStatusSchema = z.enum([
  "pending",
  "active",
  "failed",
  "disabled",
  "removed",
]);
export type ShopifyWebhookSubscriptionStatus = z.infer<
  typeof ShopifyWebhookSubscriptionStatusSchema
>;

export const ShopifyWebhookIntakeStatusSchema = z.enum([
  "received",
  "processing",
  "processed",
  "failed",
  "ignored",
]);
export type ShopifyWebhookIntakeStatus = z.infer<
  typeof ShopifyWebhookIntakeStatusSchema
>;

export const ShopifyIntegrationEventTypeSchema = z.enum([
  "webhook_sync",
  "webhook_received",
  "webhook_processed",
  "disconnect",
]);
export type ShopifyIntegrationEventType = z.infer<
  typeof ShopifyIntegrationEventTypeSchema
>;

export const ShopifyIntegrationEventSeveritySchema = z.enum([
  "info",
  "warning",
  "error",
]);
export type ShopifyIntegrationEventSeverity = z.infer<
  typeof ShopifyIntegrationEventSeveritySchema
>;

export const ShopifyScopesStatusSchema = z.enum([
  "outdated",
  "up_to_date",
]);
export type ShopifyScopesStatus = z.infer<typeof ShopifyScopesStatusSchema>;

export const ShopifyScopeStatusRecordSchema = z.object({
  shop_integration_id: z.string(),
  shop_domain: z.string(),
  requested_scopes: z.array(z.string()),
  granted_scopes: z.array(z.string()),
  missing_scopes: z.array(z.string()),
  has_all_required_scopes: z.boolean(),
  shop_status: ShopifyScopesStatusSchema,
});
export type ShopifyScopeStatusRecord = z.infer<
  typeof ShopifyScopeStatusRecordSchema
>;

export const ShopifyWebhooksStatusSchema = z.enum([
  "has_failures",
  "needs_sync",
  "synced",
]);
export type ShopifyWebhooksStatus = z.infer<typeof ShopifyWebhooksStatusSchema>;

export const ShopifyOAuthErrorCodeSchema = z.enum([
  "invalid_signature",
  "invalid_state",
  "state_shop_mismatch",
  "state_already_consumed",
  "state_expired",
  "access_denied",
  "missing_code",
  "token_exchange_failed",
  "oauth_callback_failed",
]);
export type ShopifyOAuthErrorCode = z.infer<
  typeof ShopifyOAuthErrorCodeSchema
>;

export const ShopifyShopIntegrationSchema = z.object({
  client_id: z.string(),
  workspace_id: z.string(),
  shop_domain: z.string(),
  shop_name: z.string().nullable(),
  provider: z.literal("shopify"),
  status: ShopifyIntegrationStatusSchema,
  access_token_expires_at: z.string().nullable(),
  granted_scopes: z.array(z.string()),
  requested_scopes: z.array(z.string()),
  api_version: z.string(),
  installed_at: z.string().nullable(),
  uninstalled_at: z.string().nullable(),
  last_connected_at: z.string().nullable(),
  last_health_check_at: z.string().nullable(),
  last_health_check_status: z.string().nullable(),
  last_error_code: z.string().nullable(),
  last_error_message: z.string().nullable(),
  scopes_status: ShopifyScopesStatusSchema,
  webhooks_status: ShopifyWebhooksStatusSchema,
  created_by: ShopifyUserReferenceSchema.nullable(),
  updated_by: ShopifyUserReferenceSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  is_deleted: z.boolean(),
});
export type ShopifyShopIntegration = z.infer<
  typeof ShopifyShopIntegrationSchema
>;

export const ShopifyWebhookSubscriptionSchema = z.object({
  client_id: z.string(),
  workspace_id: z.string(),
  shop_integration_id: z.string(),
  topic: z.string(),
  callback_url: z.string(),
  remote_subscription_id: z.string().nullable(),
  payload_format: z.string(),
  required_scopes: z.array(z.string()),
  status: ShopifyWebhookSubscriptionStatusSchema,
  installed_at: z.string().nullable(),
  last_verified_at: z.string().nullable(),
  last_install_attempt_at: z.string().nullable(),
  last_error_code: z.string().nullable(),
  last_error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ShopifyWebhookSubscription = z.infer<
  typeof ShopifyWebhookSubscriptionSchema
>;

export const ShopifyWebhookSubscriptionSummarySchema = z.object({
  total: z.number().int(),
  active: z.number().int(),
  failed: z.number().int(),
  pending: z.number().int(),
  disabled: z.number().int(),
  removed: z.number().int(),
});
export type ShopifyWebhookSubscriptionSummary = z.infer<
  typeof ShopifyWebhookSubscriptionSummarySchema
>;

export const ShopifyWebhookIntakeHistoryRecordSchema = z.object({
  record_type: z.literal("webhook_intake"),
  client_id: z.string(),
  shop_integration_id: z.string(),
  shop_domain: z.string(),
  topic: z.string(),
  webhook_id: z.string(),
  status: ShopifyWebhookIntakeStatusSchema,
  retryable: z.boolean(),
  attempts: z.number().int(),
  received_at: z.string().nullable(),
  processing_started_at: z.string().nullable(),
  processed_at: z.string().nullable(),
  last_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ShopifyWebhookIntakeHistoryRecord = z.infer<
  typeof ShopifyWebhookIntakeHistoryRecordSchema
>;

export const ShopifyIntegrationEventHistoryRecordSchema = z.object({
  record_type: z.literal("integration_event"),
  client_id: z.string(),
  shop_integration_id: z.string(),
  event_type: ShopifyIntegrationEventTypeSchema,
  severity: ShopifyIntegrationEventSeveritySchema,
  message: z.string(),
  metadata_json: z.record(z.string(), z.unknown()).nullable(),
  created_by: ShopifyUserReferenceSchema.nullable(),
  created_at: z.string(),
});
export type ShopifyIntegrationEventHistoryRecord = z.infer<
  typeof ShopifyIntegrationEventHistoryRecordSchema
>;

export const ShopifyWebhookHistoryRecordSchema = z.discriminatedUnion(
  "record_type",
  [
    ShopifyWebhookIntakeHistoryRecordSchema,
    ShopifyIntegrationEventHistoryRecordSchema,
  ],
);
export type ShopifyWebhookHistoryRecord = z.infer<
  typeof ShopifyWebhookHistoryRecordSchema
>;

export const ShopifyPaginationSchema = z.object({
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
});
export type ShopifyPagination = z.infer<typeof ShopifyPaginationSchema>;

export const ShopifyShopsListResponseSchema = z.object({
  shops: z.array(ShopifyShopIntegrationSchema),
  shops_pagination: ShopifyPaginationSchema,
});
export type ShopifyShopsListResponse = z.infer<
  typeof ShopifyShopsListResponseSchema
>;

export const ShopifyShopDetailResponseSchema = z.object({
  shop_integration: ShopifyShopIntegrationSchema,
  webhook_subscription_summary: ShopifyWebhookSubscriptionSummarySchema,
  webhook_subscriptions: z.array(ShopifyWebhookSubscriptionSchema),
});
export type ShopifyShopDetailResponse = z.infer<
  typeof ShopifyShopDetailResponseSchema
>;

export const ShopifyScopeStatusesResponseSchema = z.object({
  scope_statuses: z.array(ShopifyScopeStatusRecordSchema),
});
export type ShopifyScopeStatusesResponse = z.infer<
  typeof ShopifyScopeStatusesResponseSchema
>;

export const ShopifyInstallUrlResponseSchema = z.object({
  install_url: z.string(),
  shop_domain: z.string(),
  expires_at: z.string(),
});
export type ShopifyInstallUrlResponse = z.infer<
  typeof ShopifyInstallUrlResponseSchema
>;

export const ShopifyDisconnectResponseSchema = z.object({
  shop_integration_id: z.string(),
  shop_domain: z.string(),
  status: z.literal("disabled"),
  uninstalled_at: z.string(),
  remove_webhooks_task_id: z.string(),
});
export type ShopifyDisconnectResponse = z.infer<
  typeof ShopifyDisconnectResponseSchema
>;

export const ShopifySyncWebhooksForShopResponseSchema = z.object({
  shop_integration_id: z.string(),
  shop_domain: z.string(),
  sync_status: z.string(),
  sync_webhooks_task_id: z.string(),
});
export type ShopifySyncWebhooksForShopResponse = z.infer<
  typeof ShopifySyncWebhooksForShopResponseSchema
>;

export const ShopifyWebhookHistoryResponseSchema = z.object({
  webhook_history_records: z.array(ShopifyWebhookHistoryRecordSchema),
  webhook_history_records_pagination: ShopifyPaginationSchema,
});
export type ShopifyWebhookHistoryResponse = z.infer<
  typeof ShopifyWebhookHistoryResponseSchema
>;

export const ShopifyProductSyncMetafieldsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export const ProcessShopifyProductItemRequestSchema = z.object({
  client_id: z.string(),
  target_shop_integration_ids: z.array(z.string()).optional(),
  title: z.string(),
  description: z.string().optional(),
  sku: z.string().optional(),
  item_article_number: z.string().optional(),
  metafields: ShopifyProductSyncMetafieldsSchema.optional(),
});
export type ProcessShopifyProductItemRequest = z.infer<typeof ProcessShopifyProductItemRequestSchema>;
export const ProcessShopifyProductsRequestSchema = z.object({ items: z.array(ProcessShopifyProductItemRequestSchema).min(1).max(200) });
export type ProcessShopifyProductsRequest = z.infer<typeof ProcessShopifyProductsRequestSchema>;
export const ProcessShopifyProductsResponseSchema = z.object({ queued: z.boolean(), task_id: z.string(), sync_item_client_ids: z.array(z.string()), target_count: z.number() });
export type ProcessShopifyProductsResponse = z.infer<typeof ProcessShopifyProductsResponseSchema>;
export const ShopifyProductSyncSucceededResultSchema = z.object({ frontend_client_id: z.string(), shop_integration_id: z.string(), sync_item_client_id: z.string(), requested_operation: z.enum(["create", "update"]), shopify_product_id: z.string(), shopify_variant_id: z.string() });
export type ShopifyProductSyncSucceededResult = z.infer<typeof ShopifyProductSyncSucceededResultSchema>;
export const ShopifyProductSyncFailedResultSchema = z.object({ frontend_client_id: z.string(), shop_integration_id: z.string(), sync_item_client_id: z.string(), requested_operation: z.enum(["create", "update"]), error_code: z.string(), error_message: z.string() });
export type ShopifyProductSyncFailedResult = z.infer<typeof ShopifyProductSyncFailedResultSchema>;
export const ShopifyProductsSyncedEventSchema = z.object({ task_id: z.string(), succeeded: z.array(ShopifyProductSyncSucceededResultSchema), failed: z.array(ShopifyProductSyncFailedResultSchema) });
export type ShopifyProductsSyncedEvent = z.infer<typeof ShopifyProductsSyncedEventSchema>;
export const ShopifyProductSyncFormSchema = z.object({ shopIntegrationIds: z.array(z.string()), sku: z.string().optional(), heightCm: z.number().nullable().optional(), widthCm: z.number().nullable().optional(), depthCm: z.number().nullable().optional(), title: z.string().optional(), description: z.string().optional() });
export type ShopifyProductSyncFormValues = z.infer<typeof ShopifyProductSyncFormSchema>;

export type ShopifyOAuthResultParams = {
  success: boolean;
  shop_domain: string | null;
  error_code: ShopifyOAuthErrorCode | null;
};

export type ListShopifyShopsParams = {
  limit?: number;
  offset?: number;
};

export type GetShopifyWebhookHistoryParams = {
  limit?: number;
  offset?: number;
};
