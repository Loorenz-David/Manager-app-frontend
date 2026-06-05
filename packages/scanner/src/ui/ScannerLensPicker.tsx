import type { ScannerLens } from "../types";

interface ScannerLensPickerProps {
  lenses: ScannerLens[];
  activeLensId: string | null;
  onLensSelect: (lensId: string) => void;
}

export function ScannerLensPicker({
  lenses,
  activeLensId,
  onLensSelect,
}: ScannerLensPickerProps): React.JSX.Element | null {
  if (lenses.length <= 1) {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur-sm">
      {lenses.map((lens) => (
        <button
          key={lens.id}
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium text-white transition-colors ${
            lens.id === activeLensId ? "bg-white/25" : "hover:bg-white/10"
          }`}
          onClick={() => onLensSelect(lens.id)}
        >
          {lens.label}
        </button>
      ))}
    </div>
  );
}
