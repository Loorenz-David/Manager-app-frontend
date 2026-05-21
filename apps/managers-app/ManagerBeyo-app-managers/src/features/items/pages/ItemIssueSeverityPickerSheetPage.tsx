import { BoxPicker } from '@/components/primitives';
import { TEST_ISSUE_SEVERITIES } from '@/features/items/item-test-data';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

type ItemIssueSeverityPickerProps = {
  issueId: string;
  issueName: string;
  currentSeverityId: string | null | undefined;
  onSelect: (issueId: string, severityId: string) => void;
};

export function ItemIssueSeverityPickerSheetPage() {
  const { issueId, issueName, currentSeverityId, onSelect } =
    useSurfaceProps<ItemIssueSeverityPickerProps>();

  const options = TEST_ISSUE_SEVERITIES.map((severity) => ({
    value: severity.client_id,
    label: severity.name,
    testId: `item-issue-severity-${severity.client_id}-option`,
  }));

  function handleSelect(severityId: string) {
    if (issueId) {
      onSelect?.(issueId, severityId);
    }

    useSurfaceStore.getState().closeTop();
  }

  return (
    <div
      className="flex flex-col gap-4 p-4"
      data-testid="item-issue-severity-picker-sheet"
    >
      <p className="text-base font-semibold text-foreground">
        {issueName ?? 'Select severity'}
      </p>
      <BoxPicker
        mode="single"
        value={currentSeverityId ?? null}
        options={options}
        onValueChange={handleSelect}
        layout="stack"
        visualVariant="pill"
        showIcon={false}
      />
    </div>
  );
}
