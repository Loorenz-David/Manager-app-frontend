import { z } from "zod";

import { CustomerFieldsSchema } from "@beyo/customers";
import { DateOnlySchema } from "@beyo/lib";
import type { ItemCategoryPickerOption } from "@beyo/item-categories";
import { ItemIssuesFieldsSchema } from "@beyo/item-issues";
import {
  ItemDetailsFieldsSchema,
  type ItemLookupResult,
} from "@beyo/items";
import { ShopifyProductSyncInventoryAdjustmentSchema } from "@beyo/shopify";
import type { TaskNoteComposerValue } from "@beyo/task-notes";
import {
  TASK_FULFILLMENT_METHOD,
  TASK_RETURN_SOURCE,
} from "@beyo/tasks";
import {
  ItemUpholsteryFieldsSchema,
  type UpholsteryPickerOption,
} from "@beyo/upholstery";
import {
  WorkingSectionAssignmentSchema,
  WorkingSectionPickerFieldsSchema,
  type WorkingSectionAssignment,
  type WorkingSectionMember,
  type WorkingSectionOption,
  type WorkingSectionPickerOption,
} from "@beyo/working-sections";

function addSeatLocationIssue(
  item: {
    major_category?: string;
    item_position?: string | undefined;
    item_zone?: string | undefined;
  },
  ctx: z.RefinementCtx,
): void {
  if (
    item.major_category === "seat" &&
    !item.item_position?.trim() &&
    !item.item_zone?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a zone or position for seat items.",
      path: ["item", "item_position"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a zone or position for seat items.",
      path: ["item", "item_zone"],
    });
  }
}

function addItemIdentityIssue(
  item: { article_number?: string; sku?: string },
  ctx: z.RefinementCtx,
): void {
  if (!item.article_number?.trim() && !item.sku?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter an article number or SKU.",
      path: ["item", "article_number"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter an article number or SKU.",
      path: ["item", "sku"],
    });
  }
}

export const TASK_CREATION_FORM_TYPE = [
  "return",
  "pre_order",
  "internal",
] as const;
export type TaskCreationFormType = (typeof TASK_CREATION_FORM_TYPE)[number];

export const SkuReservationSchema = z.object({
  client_id: z.string(),
  task_type: z.enum(TASK_CREATION_FORM_TYPE),
  reserved_scalar: z.number().int().nonnegative(),
  sku: z.string().min(1),
});
export type SkuReservation = z.infer<typeof SkuReservationSchema>;

export const SHOPIFY_CUSTOMER_MATCH_TYPE = ["sku", "barcode"] as const;
export type ShopifyCustomerMatchType =
  (typeof SHOPIFY_CUSTOMER_MATCH_TYPE)[number];

const ShopifyCustomerLookupCoordinatesSchema = z.object({
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

const ShopifyCustomerLookupAddressSchema = z
  .object({
    street_address: z.string().nullable().optional(),
    post_code: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    coordinates: ShopifyCustomerLookupCoordinatesSchema.nullable().optional(),
  })
  .nullable()
  .optional();

export const ShopifyCustomerLookupResultSchema = z.object({
  shop_integration_id: z.string().nullable().optional(),
  shop_domain: z.string().nullable().optional(),
  match_type: z.enum(SHOPIFY_CUSTOMER_MATCH_TYPE).nullable().optional(),
  matched_value: z.string().nullable().optional(),
  order_id: z.string().nullable().optional(),
  order_name: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  primary_phone_number: z.string().nullable().optional(),
  primary_email: z.string().nullable().optional(),
  address: ShopifyCustomerLookupAddressSchema,
});
export type ShopifyCustomerLookupResult = z.infer<
  typeof ShopifyCustomerLookupResultSchema
>;

export const ShopifyLookupFailedShopSchema = z.object({
  shop_integration_id: z.string().nullable().optional(),
  shop_domain: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
});
export type ShopifyLookupFailedShop = z.infer<
  typeof ShopifyLookupFailedShopSchema
>;

export type ShopifyCustomerLookupParams = {
  sku?: string;
  article_number?: string;
};

const ReturnCustomerFieldsSchema = z.object({
  display_name: z.string().max(255).optional(),
  customer_type: CustomerFieldsSchema.shape.customer_type.optional(),
  primary_email: CustomerFieldsSchema.shape.primary_email.optional(),
  primary_phone_number: z.string().optional(),
  address: CustomerFieldsSchema.shape.address.optional(),
});

export const ReturnFormSchema = z
  .object({
    assortment: z.string().optional(),
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    customer: ReturnCustomerFieldsSchema,
    return_source: z.enum(TASK_RETURN_SOURCE).optional(),
    fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
    scheduled_start_at: DateOnlySchema.nullable().optional(),
    scheduled_end_at: DateOnlySchema.nullable().optional(),
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    addItemIdentityIssue(data.item, ctx);
    addSeatLocationIssue(data.item, ctx);

    if (data.return_source === "store_return") {
      return;
    }

    if (!data.customer.display_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name is required.",
        path: ["customer", "display_name"],
      });
    }

    if (!data.customer.customer_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a customer type.",
        path: ["customer", "customer_type"],
      });
    }

    if (!data.customer.primary_email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required.",
        path: ["customer", "primary_email"],
      });
    }

    if (!data.customer.primary_phone_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required.",
        path: ["customer", "primary_phone_number"],
      });
    }
  });
export type ReturnFormValues = z.input<typeof ReturnFormSchema>;

export const PreOrderFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    customer: CustomerFieldsSchema,
    return_source: z.enum(TASK_RETURN_SOURCE).optional(),
    fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
    scheduled_start_at: DateOnlySchema.nullable().optional(),
    scheduled_end_at: DateOnlySchema.nullable().optional(),
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
    // Shopify pre-order product section (HANDOFF_TO_FRONTEND_task_preorder_
    // shopify_product_20260727): full product price, one shop, at least one
    // inventory location. Sent as `shopify_preorder` on POST /api/v1/tasks.
    // Collected per piece; the price sent is `item.quantity × this`
    // (see `lib/pre-order-price`).
    product_unit_price: z
      .number()
      .gt(0, "Enter the price per piece.")
      .nullable(),
    shopIntegrationIds: z.array(z.string()),
    inventoryAdjustments: z.array(ShopifyProductSyncInventoryAdjustmentSchema),
  })
  .superRefine((data, ctx) => {
    addItemIdentityIssue(data.item, ctx);
    // No seat position/zone requirement here, deliberately: a pre-ordered item
    // is not in the building yet, so it has nowhere to be. Return and internal
    // tasks still require it.

    if (data.product_unit_price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the price per piece.",
        path: ["product_unit_price"],
      });
    }

    if (!data.item.sku?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A SKU is required for the Shopify product.",
        path: ["item", "sku"],
      });
    }

    const shopIntegrationId = data.shopIntegrationIds[0];
    if (!shopIntegrationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a Shopify shop.",
        path: ["shopIntegrationIds"],
      });
    } else if (
      !data.inventoryAdjustments.some(
        (entry) => entry.shopIntegrationId === shopIntegrationId,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one inventory location.",
        path: ["inventoryAdjustments"],
      });
    }

    if (!data.customer.primary_email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email is required.",
        path: ["customer", "primary_email"],
      });
    }

    if (!data.customer.primary_phone_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is required.",
        path: ["customer", "primary_phone_number"],
      });
    }
  });
export type PreOrderFormValues = z.input<typeof PreOrderFormSchema>;

export const WorkerItemIssueSelectionDraftSchema = z
  .record(z.string(), z.number().int().min(0).max(3))
  .default({});
export type WorkerItemIssueSelectionDraft = z.input<
  typeof WorkerItemIssueSelectionDraftSchema
>;

export const InternalFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_upholstery: ItemUpholsteryFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    working_section_assignments:
      WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
    ready_by_at: DateOnlySchema.nullable().optional(),
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    addItemIdentityIssue(data.item, ctx);
    if (!data.item.major_category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category type.",
        path: ["item", "major_category"],
      });
    } else if (!data.item.item_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category.",
        path: ["item", "item_category_id"],
      });
    }

    addSeatLocationIssue(data.item, ctx);
  });
export type InternalFormValues = z.input<typeof InternalFormSchema>;

export const WorkerInternalFormSchema = z
  .object({
    item: ItemDetailsFieldsSchema,
    item_issues: ItemIssuesFieldsSchema.shape.item_issues,
    item_issue_selection_draft: WorkerItemIssueSelectionDraftSchema,
    needs_photo_assignment:
      WorkingSectionPickerFieldsSchema.shape.needs_photo_assignment,
    needs_cleaning_assignment:
      WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment,
    oiling_treatment_assignment: z
      .array(WorkingSectionAssignmentSchema)
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.item.article_number?.trim() && !data.item.sku?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an article number or SKU.",
        path: ["item", "article_number"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an article number or SKU.",
        path: ["item", "sku"],
      });
    }

    if (data.item.major_category && data.item.major_category !== "wood") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "This lookup returned a non-wood item. This form only supports wood items.",
        path: ["item", "item_category_id"],
      });
    }

    if (!data.item.item_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category.",
        path: ["item", "item_category_id"],
      });
    }
  });
export type WorkerInternalFormValues = z.input<typeof WorkerInternalFormSchema>;

export type {
  ItemCategoryPickerOption,
  ItemLookupResult,
  TaskNoteComposerValue,
  UpholsteryPickerOption,
  WorkingSectionAssignment,
  WorkingSectionMember,
  WorkingSectionOption,
  WorkingSectionPickerOption,
};
