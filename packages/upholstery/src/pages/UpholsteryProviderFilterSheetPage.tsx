import { useEffect, useMemo, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, useSurfaceStore } from "@beyo/ui";

import {
  EXTERNAL_UPHOLSTERY_PROVIDERS,
  type ExternalUpholsteryProvider,
} from "../types";
import {
  UPHOLSTERY_PROVIDER_FILTER_SHEET_ID,
  type UpholsteryProviderFilterSheetSurfaceProps,
} from "../surfaces";

const PROVIDER_OPTIONS: Array<{
  value: ExternalUpholsteryProvider;
  label: string;
  description: string;
}> = [
  {
    value: "nevotex",
    label: "Nevotex",
    description: "Search Nevotex upholstery catalog.",
  },
  {
    value: "ohlssons_tyger",
    label: "Ohlssons Tyger",
    description: "Search Ohlssons Tyger upholstery catalog.",
  },
  {
    value: "fargotex",
    label: "Fargotex",
    description: "Search Fargotex upholstery catalog.",
  },
  {
    value: "selfmade",
    label: "Selfmade",
    description: "Search Selfmade upholstery catalog.",
  },
];

function normalizeSelection(
  providers: ExternalUpholsteryProvider[] | undefined,
): ExternalUpholsteryProvider[] {
  return (
    providers?.filter((provider) =>
      EXTERNAL_UPHOLSTERY_PROVIDERS.includes(provider),
    ) ?? []
  );
}

export function UpholsteryProviderFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { selectedProviders, onApply } =
    useSurfaceProps<UpholsteryProviderFilterSheetSurfaceProps>();
  const initialProviders = useMemo(
    () => normalizeSelection(selectedProviders),
    [selectedProviders],
  );
  const [providers, setProviders] =
    useState<ExternalUpholsteryProvider[]>(initialProviders);

  useEffect(() => {
    header?.setTitle("External providers");
    header?.setActions(null);
  }, [header]);

  function handleProviderChange(
    nextProviders: ExternalUpholsteryProvider[],
  ): void {
    setProviders(nextProviders);
    onApply?.(nextProviders);
  }

  return (
    <div
      className="flex flex-col px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="upholstery-provider-filter-sheet"
    >
      <BoxPicker
        data-testid="upholstery-provider-filter-options"
        columns={3}
        layout="grid"
        mode="multiple"
        options={PROVIDER_OPTIONS}
        showDescription={false}
        value={providers}
        onValueChange={handleProviderChange}
      />

      <div aria-hidden="true" className="h-16 shrink-0" />

      <button
        className="rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-card"
        type="button"
        onClick={() =>
          useSurfaceStore.getState().close(UPHOLSTERY_PROVIDER_FILTER_SHEET_ID)
        }
      >
        Done
      </button>
    </div>
  );
}
