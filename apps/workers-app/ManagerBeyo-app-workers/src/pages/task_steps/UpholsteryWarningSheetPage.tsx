import { useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  useListCasesQuery,
  useListCaseTypesQuery,
  type CaseCreationSurfaceOpeners,
  type CaseMessageContent,
  type CaseTypeSelectedDisplay,
  type ParticipantPickerSlideSurfaceProps,
} from "@beyo/cases";
import {
  UpholsteryEntryCard,
  useItemUpholsteryQuery,
  type UpholsteryCardEntry,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";
import type { UpholsteryWarningSheetSurfaceProps } from "@/features/task_steps/surface-ids";

function buildNoFabricMessage(upholsteryName: string): CaseMessageContent {
  return {
    parts: [
      { kind: "text", text: "Can't start this step", marks: { size: "large", bold: true } },
      { kind: "text", text: "\nMissing fabric:\n" },
      { kind: "text", text: upholsteryName, marks: { bold: true, color: "#ef4444" } },
    ],
  };
}

function isNoFabricCase(
  caseName: string | null | undefined,
  label: string | null | undefined,
): boolean {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replaceAll(/\s+/g, "_");

  return (
    normalize(caseName ?? "") === "no_fabric" ||
    normalize(label ?? "") === "no_fabric"
  );
}

export function UpholsteryWarningSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop, open: openSurface } = useSurface();
  const { taskId, itemId } =
    useSurfaceProps<UpholsteryWarningSheetSurfaceProps>();

  const resolvedTaskId =
    taskId ?? ("" as UpholsteryWarningSheetSurfaceProps["taskId"]);
  const resolvedItemId =
    itemId ?? ("" as UpholsteryWarningSheetSurfaceProps["itemId"]);

  useEffect(() => {
    header?.setTitle("Fabric not available");
    header?.setActions(null);
  }, [header]);

  const upholsteryQuery = useItemUpholsteryQuery(resolvedItemId);
  const casesQuery = useListCasesQuery({
    entity_client_id: resolvedTaskId,
    entity_type: "task",
    case_state: "open,resolving",
  });
  const caseTypesQuery = useListCaseTypesQuery({ entity_type: "task" });

  const unavailableEntries = useMemo<UpholsteryCardEntry[]>(() => {
    const requirementsById = new Map<string, UpholsteryRequirementEntry>(
      (upholsteryQuery.data?.requirements ?? []).map((entry) => [
        entry.client_id,
        entry,
      ]),
    );

    return (upholsteryQuery.data?.upholstery ?? [])
      .map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (requirementsById.get(entry.active_requirement_id) ?? null)
          : null,
      }))
      .filter(
        (entry) =>
          entry.activeRequirement !== null &&
          entry.activeRequirement.state !== "available" &&
          entry.activeRequirement.state !== "failed",
      );
  }, [upholsteryQuery.data?.requirements, upholsteryQuery.data?.upholstery]);

  const existingCase = useMemo(
    () =>
      (casesQuery.data ?? []).find((caseItem) =>
        isNoFabricCase(caseItem.case_type?.name, caseItem.type_label),
      ) ?? null,
    [casesQuery.data],
  );

  const initialCaseType = useMemo<CaseTypeSelectedDisplay>(() => {
    const found = (caseTypesQuery.data ?? []).find((caseType) =>
      isNoFabricCase(caseType.name, null),
    );

    if (found) {
      return {
        clientId: found.client_id,
        name: found.name,
        imageUrl: found.image_url ?? null,
        description: found.description ?? null,
      };
    }

    return {
      clientId: "",
      name: "No Fabric",
      imageUrl: null,
      description: null,
    };
  }, [caseTypesQuery.data]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleCaseAction() {
    if (existingCase) {
      openSurface(CASE_CONVERSATION_SURFACE_ID, {
        caseClientId: existingCase.client_id,
      });
      closeSheet();
      return;
    }

    const initialComposerContent = buildNoFabricMessage(
      unavailableEntries[0]?.name ?? "upholstery material",
    );

    const surfaceOpeners: CaseCreationSurfaceOpeners = {
      openCaseTypePicker: (props) =>
        openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
      openParticipantPicker: (props: ParticipantPickerSlideSurfaceProps) =>
        openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
    };

    openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
      entityTypes: ["task"],
      entityClientId: resolvedTaskId,
      surfaceOpeners,
      initialCaseType,
      initialComposerContent,
      onCaseCreated: () => {
        closeSheet();
      },
    });
  }

  const caseActionLabel = existingCase ? "View case" : "Create case";
  const isActionDisabled =
    upholsteryQuery.isPending ||
    casesQuery.isPending ||
    (!existingCase && caseTypesQuery.isPending);

  return (
    <div
      className="flex flex-col gap-5 bg-background px-5 pb-[calc(var(--safe-bottom,0)+1.25rem)] pt-4"
      data-testid="upholstery-warning-sheet"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-yellow-500"
        />
        <p className="text-sm text-foreground">
          The required upholstery is not yet available for this step. You can
          report the missing fabric or close and start anyway.
        </p>
      </div>

      {unavailableEntries.length > 0 ? (
        <div
          className="flex flex-col gap-2"
          data-testid="upholstery-warning-entries"
        >
          {unavailableEntries.map((entry) => (
            <UpholsteryEntryCard key={entry.client_id} entry={entry} />
          ))}
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          className="flex-1 rounded-xl border shadow-sm border-light-border bg-card py-3 text-sm font-semibold text-foreground"
          data-testid="upholstery-warning-close"
          type="button"
          onClick={closeSheet}
        >
          Close
        </button>
        <button
          className="flex-1 rounded-xl bg-primary py-3 shadow-sm text-sm font-semibold text-card disabled:opacity-50"
          data-testid="upholstery-warning-case-action"
          disabled={isActionDisabled}
          type="button"
          onClick={handleCaseAction}
        >
          {caseActionLabel}
        </button>
      </div>
    </div>
  );
}
