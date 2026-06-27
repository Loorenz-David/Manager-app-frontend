import type {
  InternalFormValues,
  ReturnFormValues,
  WorkerInternalFormValues,
  WorkerItemIssueSelectionDraft,
} from "../types";
import {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
  type TaskNoteComposerValue,
} from "@beyo/task-notes";

type BaseIds = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
  currentUserClientId: string;
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
      (item.quantity != null && item.quantity !== 1
        ? String(item.quantity)
        : ""),
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

export function toWorkerItemIssueFields(
  draft: WorkerItemIssueSelectionDraft,
): ReturnFormValues["item_issues"] {
  return Object.entries(draft ?? {})
    .filter(([, intensity]) => intensity > 0)
    .map(([issueId]) => ({
      issue_id: issueId,
      issue_severity_id: "",
    }));
}

function buildUpholsteryFields(
  upholstery: ReturnFormValues["item_upholstery"],
) {
  if (
    !upholstery.upholstery_client_id &&
    upholstery.upholstery_amount_meters == null
  ) {
    return undefined;
  }

  const upholsteryId = upholstery.upholstery_client_id
    ? { upholstery_id: upholstery.upholstery_client_id }
    : {};

  return {
    ...upholsteryId,
    source: "internal" as const,
    amount_meters: upholstery.upholstery_amount_meters ?? undefined,
  };
}

function buildNotePayload(
  noteContent: TaskNoteComposerValue | null | undefined,
  noteClientId: string,
  currentUserClientId: string,
) {
  if (!hasMeaningfulNoteContent(noteContent) || !noteContent) {
    return undefined;
  }

  return {
    client_id: noteClientId,
    note_type: "user_note" as const,
    content: toTaskNoteContentBlocks(noteContent.content),
    plain_text: noteContent.plainText,
    users_read_list: currentUserClientId ? [currentUserClientId] : [],
  };
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
  const notePayload = buildNotePayload(
    values.note_content,
    ids.noteClientId,
    ids.currentUserClientId,
  );
  const steps = (values.working_section_assignments ?? []).map((assignment) => ({
    working_section_id: assignment.working_section_id,
    worker_id: assignment.assigned_worker_id || undefined,
  }));

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
    ...buildCustomerFields(values.customer),
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
    ...(notePayload ? { notes: [notePayload] } : {}),
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
  const notePayload = buildNotePayload(
    values.note_content,
    ids.noteClientId,
    ids.currentUserClientId,
  );

  const steps = (values.working_section_assignments ?? []).map((assignment) => ({
    working_section_id: assignment.working_section_id,
    worker_id: assignment.assigned_worker_id || undefined,
  }));

  return {
    client_id: ids.taskClientId,
    task_type: "internal",
    state: "pending",
    priority: "normal",
    ready_by_at: values.ready_by_at || undefined,
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
    ...(notePayload ? { notes: [notePayload] } : {}),
  };
}

export function normalizeWorkerInternalFormPayload(
  values: WorkerInternalFormValues,
  ids: BaseIds,
  defaultWoodFixSectionId: string,
): Record<string, unknown> {
  const issueFields = buildIssueFields(values.item_issues);
  const itemFields = buildItemFields(values.item, ids.itemClientId, Boolean(issueFields));

  const dedupedSteps = new Map<
    string,
    { working_section_id: string; worker_id?: string }
  >();

  dedupedSteps.set(defaultWoodFixSectionId, {
    working_section_id: defaultWoodFixSectionId,
  });

  if (values.needs_cleaning_assignment?.working_section_id) {
    dedupedSteps.set(values.needs_cleaning_assignment.working_section_id, {
      working_section_id: values.needs_cleaning_assignment.working_section_id,
      worker_id:
        values.needs_cleaning_assignment.assigned_worker_id || undefined,
    });
  }

  for (const assignment of values.oiling_treatment_assignment ?? []) {
    dedupedSteps.set(assignment.working_section_id, {
      working_section_id: assignment.working_section_id,
      worker_id: assignment.assigned_worker_id || undefined,
    });
  }

  return {
    client_id: ids.taskClientId,
    task_type: "internal",
    state: "pending",
    priority: "normal",
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    steps: Array.from(dedupedSteps.values()),
  };
}
