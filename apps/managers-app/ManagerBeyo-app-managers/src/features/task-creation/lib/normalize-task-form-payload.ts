import type { InternalFormValues, ReturnFormValues } from "../types";

type BaseIds = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
};

function toOptionalString(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildCustomerFields(customer: ReturnFormValues["customer"]) {
  const address = customer.address;

  return {
    customer_display_name: customer.display_name.trim(),
    primary_phone_number: toOptionalString(customer.primary_phone_number),
    primary_email: toOptionalString(customer.primary_email),
    customer_address: {
      line1: toOptionalString(address?.street) ?? "",
      city: toOptionalString(address?.city),
      postal_code: toOptionalString(address?.postal_code),
      country: toOptionalString(address?.country),
    },
  };
}

function buildItemFields(
  item: ReturnFormValues["item"],
  itemClientId: string,
  forceInclude: boolean,
) {
  const hasAnyItemData = Boolean(
    toOptionalString(item.article_number) ??
    toOptionalString(item.sku) ??
    toOptionalString(item.designer) ??
    item.item_category_id ??
    (item.item_position != null ? String(item.item_position) : undefined) ??
    item.item_currency ??
    item.major_category ??
    (item.quantity != null && item.quantity !== 1 ? String(item.quantity) : ""),
  );

  if (!forceInclude && !hasAnyItemData) {
    return undefined;
  }

  return {
    client_id: itemClientId,
    article_number: toOptionalString(item.article_number),
    sku: toOptionalString(item.sku),
    item_category_id: item.item_category_id || undefined,
    quantity: item.quantity ?? 1,
    designer: toOptionalString(item.designer),
    item_position:
      item.item_position != null ? String(item.item_position) : undefined,
    item_currency: item.item_currency || undefined,
  };
}

function buildIssueFields(issues: ReturnFormValues["item_issues"]) {
  if (!issues || issues.length === 0) {
    return undefined;
  }

  return issues.map((entry) => ({
    issue_type_id: entry.issue_id,
    issue_severity_id: entry.issue_severity_id || undefined,
  }));
}

function buildUpholsteryFields(
  upholstery: ReturnFormValues["item_upholstery"],
) {
  if (!upholstery.upholstery_client_id) {
    return undefined;
  }

  return {
    upholstery_id: upholstery.upholstery_client_id,
    source: "internal" as const,
    amount_meters: upholstery.upholstery_amount_meters ?? undefined,
  };
}

function buildAdditionalDetails(additionalDetails: string | undefined) {
  const trimmed = additionalDetails?.trim();
  return trimmed ? { text: trimmed } : undefined;
}

export function normalizeReturnFormPayload(
  values: ReturnFormValues,
  ids: BaseIds,
  taskType: "return" | "pre_order" = "return",
): Record<string, unknown> {
  const issueFields = buildIssueFields(values.item_issues);
  const upholsteryFields = buildUpholsteryFields(values.item_upholstery);
  const itemFields = buildItemFields(
    values.item,
    ids.itemClientId,
    Boolean(issueFields) || Boolean(upholsteryFields),
  );
  const steps = (values.working_section_assignments ?? []).map(
    (assignment) => ({
      working_section_id: assignment.working_section_id,
      worker_id: assignment.assigned_worker_id || undefined,
    }),
  );

  return {
    client_id: ids.taskClientId,
    task_type: taskType,
    state: "pending",
    priority: "normal",
    return_source: values.return_source || undefined,
    fulfillment_method: values.fulfillment_method || undefined,
    scheduled_start_at: values.scheduled_start_at || undefined,
    scheduled_end_at: values.scheduled_end_at || undefined,
    ready_by_at: values.ready_by_at || undefined,
    additional_details: buildAdditionalDetails(values.additional_details),
    ...buildCustomerFields(values.customer),
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
  };
}

export function normalizeInternalFormPayload(
  values: InternalFormValues,
  ids: BaseIds,
): Record<string, unknown> {
  const issueFields = buildIssueFields(values.item_issues);
  const upholsteryFields = buildUpholsteryFields(values.item_upholstery);
  const itemFields = buildItemFields(
    values.item,
    ids.itemClientId,
    Boolean(issueFields) || Boolean(upholsteryFields),
  );

  const steps = (values.working_section_assignments ?? []).map(
    (assignment) => ({
      working_section_id: assignment.working_section_id,
      worker_id: assignment.assigned_worker_id || undefined,
    }),
  );

  return {
    client_id: ids.taskClientId,
    task_type: "internal",
    state: "pending",
    priority: "normal",
    ready_by_at: values.ready_by_at || undefined,
    additional_details: buildAdditionalDetails(values.additional_details),
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
  };
}
