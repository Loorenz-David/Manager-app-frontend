import { Pencil } from 'lucide-react';

import { DashedInfoSection } from '@/components/primitives';
import { ItemUpholsteryField } from '@/features/items';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskUpholsterySection(): React.JSX.Element | null {
  const { activeUpholstery, openUpholsteryAmountSheet, taskDetail } =
    useTaskDetailContext();

  if (!taskDetail?.item) {
    return null;
  }

  return (
    <DashedInfoSection data-testid="task-detail-upholstery-section">
      <h3 className="text-sm font-semibold text-foreground">Item and upholstery</h3>

      {activeUpholstery.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upholstery linked.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activeUpholstery.map((entry) => (
            <div key={entry.client_id} className="flex flex-col gap-2">
              <ItemUpholsteryField
                description="Linked upholstery"
                disabled
                onChange={() => {}}
                requirementState={entry.activeRequirement?.state ?? null}
                title="Upholstery"
                value={entry.upholstery_id}
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  Amount {entry.activeRequirement?.amount_meters ?? entry.amount_meters ?? '—'} m
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                  onClick={() => openUpholsteryAmountSheet(entry.client_id)}
                >
                  <Pencil className="size-3.5" />
                  Edit amount
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashedInfoSection>
  );
}
