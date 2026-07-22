import { useMemo, useState } from "react";

import { SegmentedControl } from "../components/panels/PanelPrimitives";
import { MediaStripe } from "../components/dashboard/MediaStripe";
import { PreviewOverlay } from "../components/preview/PreviewOverlay";
import { ChipCheckboxGroup } from "../components/publish/ChipCheckboxGroup";
import { PublishErrorSummary } from "../components/publish/PublishErrorSummary";
import {
  PublishDialogSection,
  PublishDialogShell,
} from "../components/publish/PublishDialogShell";
import {
  PublishSettingsFields,
  type PublishCategoryChoice,
  type PublishTypeChoice,
} from "../components/publish/PublishSettingsFields";
import { SchedulePickers } from "../components/publish/SchedulePickers";
import { UserPickerList } from "../components/publish/UserPickerList";

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

const MOCK_USERS = [
  { id: "usr_1", label: "Fayoz", sublabel: "manager" },
  { id: "usr_2", label: "Betty", sublabel: "worker" },
  { id: "usr_3", label: "David", sublabel: "admin" },
  { id: "usr_4", label: "Marisol", sublabel: "seller" },
];

const CATEGORY_DEFAULT_PRIORITY: Record<PublishCategoryChoice, number> = {
  alert: 300,
  workflow: 200,
  improvement: 100,
  news: 0,
  none: 0,
};

type Surface = "none" | "dialog" | "preview";

/** DEV-ONLY showcase of the Phase 6 preview + publish kit with mock state. */
export function PublishKitPreview(): React.JSX.Element {
  const [surface, setSurface] = useState<Surface>("dialog");
  const [audienceMode, setAudienceMode] = useState<"all_matching" | "selected_users_only">(
    "all_matching",
  );
  const [apps, setApps] = useState<string[]>(["worker"]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [category, setCategory] = useState<PublishCategoryChoice>("improvement");
  const [presentationType, setPresentationType] = useState<PublishTypeChoice>("slide_page");
  const [isDismissible, setIsDismissible] = useState(true);
  const [priorityValue, setPriorityValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const toggle = (list: string[], set: (next: string[]) => void) => (value: string) =>
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const filteredUsers = useMemo(
    () =>
      MOCK_USERS.filter((user) =>
        user.label.toLowerCase().includes(userSearch.trim().toLowerCase()),
      ),
    [userSearch],
  );

  const needsUsers = audienceMode === "selected_users_only" && userIds.length === 0;

  return (
    <div className="relative h-screen overflow-hidden bg-[#f4f4f4]">
      <div className="flex items-center gap-3 border-b border-[#e7e7e7] bg-white px-4 py-2 text-xs text-[#767676]">
        <span className="font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
          Preview controls
        </span>
        <button
          type="button"
          className="rounded border border-[#dcdcdc] px-2 py-1 hover:bg-[#f4f4f4]"
          onClick={() => setSurface("dialog")}
        >
          Publish dialog
        </button>
        <button
          type="button"
          className="rounded border border-[#dcdcdc] px-2 py-1 hover:bg-[#f4f4f4]"
          onClick={() => setSurface("preview")}
        >
          Preview overlay
        </button>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showErrors}
            onChange={(event) => setShowErrors(event.target.checked)}
          />
          Show publish errors
        </label>
      </div>

      {surface === "preview" && (
        <PreviewOverlay
          onExit={() => setSurface("none")}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((current) => !current)}
          progressFraction={0.42}
          slideCount={3}
          activeSlideIndex={activeSlide}
          onSelectSlide={setActiveSlide}
        >
          <div className="relative h-full w-full">
            <MediaStripe />
            <span className="absolute inset-x-4 top-[30%] text-center text-[23px] font-bold text-white drop-shadow">
              See what’s new
            </span>
          </div>
        </PreviewOverlay>
      )}

      {surface === "dialog" && (
        <PublishDialogShell
          onClose={() => setSurface("none")}
          onPublish={() => setShowErrors(true)}
          publishDisabled={needsUsers}
          errorSummary={
            showErrors ? (
              <PublishErrorSummary
                errors={[
                  "Slide 2 has no content — add media or a text block.",
                  "Expiry must be after the start time.",
                ]}
              />
            ) : undefined
          }
        >
          <PublishDialogSection title="Audience">
            <div className="space-y-3">
              <SegmentedControl
                options={[
                  { value: "all_matching", label: "Everyone matching" },
                  { value: "selected_users_only", label: "Selected users only" },
                ]}
                value={audienceMode}
                onChange={setAudienceMode}
                ariaLabel="Audience mode"
                testId="presentation-publish-audience-mode"
              />
              <ChipCheckboxGroup
                options={APP_OPTIONS}
                selected={apps}
                onToggle={toggle(apps, setApps)}
                ariaLabel="Target apps"
                testId="presentation-publish-apps"
                hint="Empty = all apps."
              />
              {audienceMode === "all_matching" && (
                <ChipCheckboxGroup
                  options={ROLE_OPTIONS}
                  selected={roles}
                  onToggle={toggle(roles, setRoles)}
                  ariaLabel="Target roles"
                  testId="presentation-publish-roles"
                  hint="Empty = all roles."
                />
              )}
              <UserPickerList
                searchValue={userSearch}
                onSearchChange={setUserSearch}
                options={filteredUsers}
                selectedIds={userIds}
                onToggle={toggle(userIds, setUserIds)}
                hint={
                  audienceMode === "selected_users_only"
                    ? "Required — pick at least one member."
                    : "Optional extra restriction."
                }
              />
            </div>
          </PublishDialogSection>
          <PublishDialogSection title="Settings">
            <PublishSettingsFields
              category={category}
              onCategoryChange={setCategory}
              presentationType={presentationType}
              onPresentationTypeChange={setPresentationType}
              isDismissible={isDismissible}
              onDismissibleChange={setIsDismissible}
              priorityValue={priorityValue}
              onPriorityChange={setPriorityValue}
              priorityHint={`Default from category: ${CATEGORY_DEFAULT_PRIORITY[category]}`}
            />
          </PublishDialogSection>
          <PublishDialogSection title="Schedule">
            <SchedulePickers
              startsAtValue={startsAt}
              onStartsAtChange={setStartsAt}
              expiresAtValue={expiresAt}
              onExpiresAtChange={setExpiresAt}
              expiresAtError={showErrors ? "Must be after the start time." : null}
            />
          </PublishDialogSection>
        </PublishDialogShell>
      )}
    </div>
  );
}
