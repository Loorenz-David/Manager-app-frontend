import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FileClock, Play } from "lucide-react";

import {
  BoxPicker,
  ConfirmActionButton,
  ContentCard,
  DateFieldTrigger,
  FieldErrorPill,
  StatePill,
  TextInput,
  type BoxPickerOptionType,
} from "@beyo/ui";

import {
  STOCK_VERSION_TITLE_MAX,
  buildStockVersionFormSchema,
  initialStockVersionFormValues,
  stockVersionFormPlan,
  type StockVersionFormOriginal,
  type StockVersionFormValues,
} from "../../lib/version-form";
import { formatScheduleLabel, formatVersionDayTitle, sameInstant } from "../../lib/version-format";

export type StockVersionFormProps = {
  /** The stored version being edited; `null` creates one. */
  original: StockVersionFormOriginal | null;
  /** One clock for the placeholder, the overdue pill and the schedule label. */
  now: number;
  pending?: boolean;
  /** A failure the page wants shown above the submit (a create has no toast of its own). */
  errorMessage?: string | null;
  /** Opens the schedule sheet; `apply` writes its choice back into the form. */
  onOpenSchedule: (current: string | null, apply: (iso: string | null) => void) => void;
  onSubmit: (values: StockVersionFormValues) => void;
};

const LABEL_CLASS = "text-sm font-medium text-muted-foreground";
const PRIMARY_BUTTON_CLASS =
  "w-full rounded-xl bg-primary py-3.5 text-md font-semibold text-card disabled:opacity-50";

/**
 * The version form (plan §F.3): state, title, schedule, submit — pure and
 * prop-driven, the page owns every request (§3.3). Editing an active version
 * never offers Draft (owner, 2026-09-27): both options stay, both disabled.
 * Picking Active clears the schedule in form state (projection R2) — the field
 * is hidden and activation clears the schedule itself.
 */
export function StockVersionForm({
  original,
  now,
  pending = false,
  errorMessage,
  onOpenSchedule,
  onSubmit,
}: StockVersionFormProps): React.JSX.Element {
  const resolver = useMemo(() => zodResolver(buildStockVersionFormSchema(original)), [original]);
  const form = useForm<StockVersionFormValues>({
    defaultValues: initialStockVersionFormValues(original),
    resolver,
  });
  const { errors } = form.formState;
  const state = form.watch("state");
  const scheduledAt = form.watch("scheduledAt");

  const lockedActive = original !== null && original.state !== "draft";
  const stateOptions: BoxPickerOptionType<StockVersionFormValues["state"]>[] = [
    { value: "draft", label: "Draft", icon: FileClock, disabled: lockedActive, testId: "stock-version-form-state-draft" },
    { value: "active", label: "Active", icon: Play, disabled: lockedActive, testId: "stock-version-form-state-active" },
  ];
  const placeholderTitle = formatVersionDayTitle(original?.createdAt ?? new Date(now).toISOString(), now);
  // Only the stored schedule can be in the past: the sheet refuses a new one.
  const overdue =
    original !== null &&
    scheduledAt !== null &&
    sameInstant(scheduledAt, original.scheduledAt) &&
    Date.parse(scheduledAt) <= now;
  const plan = stockVersionFormPlan({ state }, original);
  const submit = form.handleSubmit(onSubmit);

  function selectState(next: StockVersionFormValues["state"]): void {
    form.setValue("state", next, { shouldDirty: true });
    if (next === "active") {
      form.setValue("scheduledAt", null, { shouldDirty: true });
      form.clearErrors("scheduledAt");
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      data-testid="stock-version-form"
      onSubmit={(event) => void submit(event)}
    >
      <ContentCard data-testid="stock-version-form-state-field">
        <span className={LABEL_CLASS}>State</span>
        <BoxPicker
          columns={2}
          data-testid="stock-version-form-state"
          mode="single"
          options={stateOptions}
          value={state}
          onValueChange={selectState}
        />
      </ContentCard>

      <ContentCard data-testid="stock-version-form-title-field">
        <div className="flex items-center justify-between gap-2">
          <label className={LABEL_CLASS} htmlFor="stock-version-form-title">
            Title
          </label>
          <FieldErrorPill data-testid="stock-version-form-title-error" message={errors.title?.message} />
        </div>
        <TextInput
          id="stock-version-form-title"
          data-testid="stock-version-form-title"
          invalid={Boolean(errors.title)}
          maxLength={STOCK_VERSION_TITLE_MAX}
          placeholder={placeholderTitle}
          {...form.register("title")}
        />
      </ContentCard>

      {state === "draft" ? (
        <ContentCard data-testid="stock-version-form-schedule-field">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={LABEL_CLASS}>Scheduled activation</span>
              {overdue ? (
                <span data-testid="stock-version-form-overdue">
                  <StatePill label="Overdue" variant="danger" />
                </span>
              ) : null}
            </span>
            <FieldErrorPill data-testid="stock-version-form-schedule-error" message={errors.scheduledAt?.message} />
          </div>
          <DateFieldTrigger
            data-testid="stock-version-form-schedule"
            invalid={Boolean(errors.scheduledAt)}
            placeholder="No scheduled activation"
            value={scheduledAt === null ? undefined : formatScheduleLabel(scheduledAt, now)}
            onPress={() =>
              onOpenSchedule(scheduledAt, (iso) => {
                form.setValue("scheduledAt", iso, { shouldDirty: true });
                form.clearErrors("scheduledAt");
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Activation freezes what Scanner says at that moment; values typed by hand are kept.
          </p>
        </ContentCard>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive"
          data-testid="stock-version-form-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {plan === "create-active" ? (
        // Closes the live version with no sheet after it (OC-16): the one
        // place this form asks twice.
        <ConfirmActionButton
          align="center"
          backgroundColor="var(--color-primary)"
          className="w-full py-3.5 text-md font-semibold"
          confirmLabel="Confirm Tap"
          confirmTextColor="white"
          data-testid="stock-version-form-submit"
          disabled={pending}
          fillColor="var(--color-dark-pearl-green)"
          label="Create active version"
          textColor="var(--color-card)"
          onConfirm={() => void submit()}
        />
      ) : (
        // A promote confirms in the activation sheet (projection R15); a
        // draft needs no confirmation at all.
        <button className={PRIMARY_BUTTON_CLASS} data-testid="stock-version-form-submit" disabled={pending} type="submit">
          {plan === "create-draft" ? "Create draft" : plan === "patch-then-activate" ? "Publish this draft" : "Save changes"}
        </button>
      )}
    </form>
  );
}
