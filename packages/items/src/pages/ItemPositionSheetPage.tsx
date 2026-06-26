import { useEffect, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { TextInput } from "@beyo/ui";

import type { ItemPositionSheetSurfaceProps } from "../surface-ids";

function parsePosition(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function ItemPositionSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { initialPosition = null, onSave } =
    useSurfaceProps<ItemPositionSheetSurfaceProps>();
  const [position, setPosition] = useState<number | null>(
    parsePosition(initialPosition),
  );

  useEffect(() => {
    header?.setTitle("Edit position");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    setPosition(parsePosition(initialPosition));
  }, [initialPosition]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Position</span>
        <TextInput
          data-testid="item-position-input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={position == null ? "" : String(position)}
          onChange={(event) => {
            const next = event.target.value;

            if (next === "") {
              setPosition(null);
              return;
            }

            if (!/^\d+$/.test(next)) {
              return;
            }

            const parsed = Number.parseInt(next, 10);
            if (!Number.isNaN(parsed)) {
              setPosition(parsed);
            }
          }}
        />
      </div>
      <button
        data-testid="item-position-save-button"
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={!onSave}
        onClick={() => {
          if (!onSave) {
            return;
          }

          onSave(position != null ? String(position) : null);
          header?.requestClose();
        }}
      >
        Save position
      </button>
    </div>
  );
}
