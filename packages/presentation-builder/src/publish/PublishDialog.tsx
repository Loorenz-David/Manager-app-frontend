import { useEffect, useMemo, useState } from "react";

import { SegmentedControl } from "../components/panels/PanelPrimitives";
import { ChipCheckboxGroup } from "../components/publish/ChipCheckboxGroup";
import { PublishErrorSummary } from "../components/publish/PublishErrorSummary";
import {
  PublishDialogSection,
  PublishDialogShell,
} from "../components/publish/PublishDialogShell";
import { PublishSettingsFields } from "../components/publish/PublishSettingsFields";
import { SchedulePickers } from "../components/publish/SchedulePickers";
import { UserPickerList } from "../components/publish/UserPickerList";
import { usePresentationUsers } from "../api/use-presentation-users";
import {
  initialPublishForm,
  priorityForCategory,
  type PublishFormState,
  type PublishIssueState,
} from "../lib/publish-form";
import type { AppKey, Presentation, RoleKey } from "../types";

const APP_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "worker", label: "Worker" },
  { value: "seller", label: "Seller" },
  { value: "admin", label: "Admin" },
] as const;

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "worker", label: "Worker" },
  { value: "seller", label: "Seller" },
] as const;

type PublishDialogProps = {
  presentation: Presentation;
  isPublishing: boolean;
  onClose: () => void;
  onPublish: (form: PublishFormState) => Promise<PublishIssueState | null>;
};

export function PublishDialog({
  presentation,
  isPublishing,
  onClose,
  onPublish,
}: PublishDialogProps): React.JSX.Element {
  const [form, setForm] = useState(() => initialPublishForm(presentation));
  const [issues, setIssues] = useState<PublishIssueState | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchValue.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  const users = usePresentationUsers({ compact: true, q: query || undefined, limit: 50, offset: 0 });
  const options = useMemo(() => users.data?.users.map((user) => ({
    id: user.client_id,
    label: user.username,
    sublabel: user.role?.name ?? null,
  })) ?? [], [users.data?.users]);
  const needsUsers = form.audienceMode === "selected_users_only" && form.userIds.length === 0;

  const update = <K extends keyof PublishFormState>(key: K, value: PublishFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIssues(null);
  };
  const toggle = <T extends string>(key: "appKeys" | "roleKeys" | "userIds", value: T) => {
    const current = form[key] as readonly string[];
    update(key, (current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]) as PublishFormState[typeof key]);
  };

  return (
    <PublishDialogShell
      onClose={onClose}
      onPublish={() => {
        void onPublish(form).then((nextIssues) => {
          if (nextIssues) setIssues(nextIssues);
          else onClose();
        });
      }}
      publishDisabled={needsUsers}
      isPublishing={isPublishing}
      errorSummary={issues && issues.summary.length > 0
        ? <PublishErrorSummary errors={issues.summary} />
        : undefined}
    >
      <PublishDialogSection title="Audience">
        <div className="space-y-3">
          <SegmentedControl
            options={[
              { value: "all_matching", label: "Everyone matching" },
              { value: "selected_users_only", label: "Selected users only" },
            ]}
            value={form.audienceMode}
            onChange={(audienceMode) => update("audienceMode", audienceMode)}
            ariaLabel="Audience mode"
            testId="presentation-publish-audience-mode"
          />
          <ChipCheckboxGroup<AppKey>
            options={APP_OPTIONS}
            selected={form.appKeys}
            onToggle={(value) => toggle("appKeys", value)}
            ariaLabel="Target apps"
            testId="presentation-publish-apps"
            hint="Empty = all apps."
          />
          {form.audienceMode === "all_matching" && (
            <ChipCheckboxGroup<RoleKey>
              options={ROLE_OPTIONS}
              selected={form.roleKeys}
              onToggle={(value) => toggle("roleKeys", value)}
              ariaLabel="Target roles"
              testId="presentation-publish-roles"
              hint="Empty = all roles."
            />
          )}
          <UserPickerList
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            options={options}
            selectedIds={form.userIds}
            onToggle={(value) => toggle("userIds", value)}
            isLoading={users.isPending}
            hint={issues?.fields.userIds ?? (needsUsers
              ? "Required — pick at least one member."
              : form.audienceMode === "selected_users_only"
                ? "Required — pick at least one member."
                : "Optional extra restriction.")}
          />
        </div>
      </PublishDialogSection>
      <PublishDialogSection title="Settings">
        <PublishSettingsFields
          category={form.category}
          onCategoryChange={(category) => update("category", category)}
          presentationType={form.presentationType}
          onPresentationTypeChange={(presentationType) => update("presentationType", presentationType)}
          isDismissible={form.isDismissible}
          onDismissibleChange={(isDismissible) => update("isDismissible", isDismissible)}
          priorityValue={form.priorityValue}
          onPriorityChange={(priorityValue) => update("priorityValue", priorityValue)}
          priorityHint={`Default from category: ${priorityForCategory(form.category)}`}
        />
        {issues?.fields.priority && (
          <p className="mt-1 text-right text-xs text-[#c05a5a]" data-testid="presentation-publish-priority-error">
            {issues.fields.priority}
          </p>
        )}
      </PublishDialogSection>
      <PublishDialogSection title="Schedule">
        <SchedulePickers
          startsAtValue={form.startsAtLocal}
          onStartsAtChange={(startsAtLocal) => update("startsAtLocal", startsAtLocal)}
          startsAtError={issues?.fields.startsAt}
          expiresAtValue={form.expiresAtLocal}
          onExpiresAtChange={(expiresAtLocal) => update("expiresAtLocal", expiresAtLocal)}
          expiresAtError={issues?.fields.expiresAt}
        />
      </PublishDialogSection>
    </PublishDialogShell>
  );
}
