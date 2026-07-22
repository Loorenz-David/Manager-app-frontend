import { z } from "zod";

import type {
  AppKey,
  AudienceMode,
  Presentation,
  PresentationCategory,
  PresentationType,
  ReplaceAudienceInput,
  RoleKey,
  UpdatePresentationMetadataInput,
} from "../types";

export const CATEGORY_DEFAULT_PRIORITY = {
  alert: 300,
  workflow: 200,
  improvement: 100,
  news: 0,
  none: 0,
} as const;

export type PublishCategoryChoice = keyof typeof CATEGORY_DEFAULT_PRIORITY;

export type PublishFormState = {
  audienceMode: AudienceMode;
  appKeys: AppKey[];
  roleKeys: RoleKey[];
  userIds: string[];
  category: PublishCategoryChoice;
  presentationType: PresentationType;
  isDismissible: boolean;
  priorityValue: string;
  startsAtLocal: string;
  expiresAtLocal: string;
};

export type PublishFieldErrors = Partial<
  Record<"userIds" | "priority" | "startsAt" | "expiresAt", string>
>;

export type PublishIssueState = {
  summary: string[];
  fields: PublishFieldErrors;
  raced: boolean;
};

export type PublishPayloads = {
  audience: ReplaceAudienceInput;
  metadata: UpdatePresentationMetadataInput;
};

const PublishFormSchema = z.strictObject({
  audienceMode: z.enum(["all_matching", "selected_users_only"]),
  appKeys: z.array(z.enum(["manager", "worker", "seller", "admin"])),
  roleKeys: z.array(z.enum(["admin", "worker", "manager", "seller"])),
  userIds: z.array(z.string().min(1)),
  category: z.enum(["none", "improvement", "workflow", "news", "alert"]),
  presentationType: z.enum(["slide_page", "modal", "full_screen"]),
  isDismissible: z.boolean(),
  priorityValue: z.string(),
  startsAtLocal: z.string(),
  expiresAtLocal: z.string(),
});

function isoToLocalInput(value: string | null): string {
  if (value === null) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function localInputToUtcIso(value: string): string | null {
  if (value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function priorityForCategory(category: PublishCategoryChoice): number {
  return CATEGORY_DEFAULT_PRIORITY[category];
}

export function initialPublishForm(presentation: Presentation): PublishFormState {
  const category: PublishCategoryChoice = presentation.category ?? "none";
  const derived = priorityForCategory(category);
  return {
    audienceMode: presentation.audience.audience_mode,
    appKeys: [...presentation.audience.app_keys],
    roleKeys: [...presentation.audience.role_keys],
    userIds: [...presentation.audience.user_ids],
    category,
    presentationType: presentation.presentation_type,
    isDismissible: presentation.is_dismissible,
    priorityValue: presentation.display_priority === derived
      ? ""
      : String(presentation.display_priority),
    startsAtLocal: isoToLocalInput(presentation.starts_at),
    expiresAtLocal: isoToLocalInput(presentation.expires_at),
  };
}

function invalidResult(summary: string[], fields: PublishFieldErrors): {
  success: false;
  issues: PublishIssueState;
} {
  return { success: false, issues: { summary, fields, raced: false } };
}

export function buildPublishPayloads(
  presentationId: string,
  form: PublishFormState,
): { success: true; payloads: PublishPayloads } | ReturnType<typeof invalidResult> {
  const parsed = PublishFormSchema.safeParse(form);
  if (!parsed.success) {
    return invalidResult(["Some publish settings are invalid."], {});
  }

  const summary = new Set<string>();
  const fields: PublishFieldErrors = {};
  if (form.audienceMode === "selected_users_only" && form.userIds.length === 0) {
    fields.userIds = "Pick at least one workspace member.";
    summary.add("Selected users only requires at least one member.");
  }

  const trimmedPriority = form.priorityValue.trim();
  const priority = trimmedPriority === ""
    ? priorityForCategory(form.category)
    : Number(trimmedPriority);
  if (!Number.isInteger(priority)) {
    fields.priority = "Priority must be a whole number.";
    summary.add(fields.priority);
  }

  const startsAt = localInputToUtcIso(form.startsAtLocal);
  const expiresAt = localInputToUtcIso(form.expiresAtLocal);
  if (form.startsAtLocal !== "" && startsAt === null) {
    fields.startsAt = "Enter a valid start date and time.";
    summary.add(fields.startsAt);
  }
  if (form.expiresAtLocal !== "" && expiresAt === null) {
    fields.expiresAt = "Enter a valid expiry date and time.";
    summary.add(fields.expiresAt);
  }
  if (expiresAt !== null && startsAt !== null && new Date(expiresAt) <= new Date(startsAt)) {
    fields.expiresAt = "Expiry must be after the start time.";
    summary.add(fields.expiresAt);
  }
  if (summary.size > 0) return invalidResult([...summary], fields);

  return {
    success: true,
    payloads: {
      audience: {
        presentationId,
        audience_mode: form.audienceMode,
        app_keys: form.appKeys,
        role_keys: form.audienceMode === "all_matching" ? form.roleKeys : [],
        workspace_ids: [],
        user_ids: form.userIds,
      },
      metadata: {
        id: presentationId,
        category: form.category === "none" ? null : form.category as PresentationCategory,
        presentation_type: form.presentationType,
        is_dismissible: form.isDismissible,
        display_priority: priority,
        starts_at: startsAt,
        expires_at: expiresAt,
      },
    },
  };
}

type ErrorLike = { status?: unknown; message?: unknown };

function errorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as ErrorLike).status;
  return typeof status === "number" ? status : null;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && typeof (error as ErrorLike).message === "string") {
    return (error as ErrorLike).message as string;
  }
  return "The publish request failed.";
}

export type PublishStep = "flush" | "audience" | "metadata" | "publish";

export function mapPublishFailure(error: unknown, step: PublishStep): PublishIssueState {
  const text = errorText(error);
  const normalized = text.toLowerCase();
  if (errorStatus(error) === 409) {
    return {
      summary: ["This announcement changed in another session. The latest version has been reloaded."],
      fields: {},
      raced: true,
    };
  }

  const fields: PublishFieldErrors = {};
  const summary = new Set<string>();
  const add = (message: string) => summary.add(message);
  if (/no slides|at least one slide/.test(normalized)) add("Add at least one slide before publishing.");
  if (/empty slide|slide.*content|no content/.test(normalized)) add("Every slide needs media or a text block.");
  if (/media/.test(normalized) && /invalid|unsupported|storage|reference/.test(normalized)) {
    add("One or more media files are invalid or unfinished.");
  }
  if (/expire|schedule|starts_at|expires_at/.test(normalized)) {
    fields.expiresAt = "Expiry must be after the start time.";
    add(fields.expiresAt);
  }
  if (/selected.*user|user_ids|at least one user/.test(normalized)) {
    fields.userIds = "Pick at least one active workspace member.";
    add(fields.userIds);
  }
  if (/app.*key|role.*key|unknown key|unrecognized/.test(normalized)) {
    add("One or more audience app or role selections are not recognized.");
  }
  if (summary.size === 0) {
    const prefix = step === "audience"
      ? "Audience could not be saved"
      : step === "metadata"
        ? "Publish settings could not be saved"
        : step === "flush"
          ? "Draft changes could not be saved"
          : "Publishing failed";
    add(`${prefix}: ${text}`);
  }
  return { summary: [...summary], fields, raced: false };
}
