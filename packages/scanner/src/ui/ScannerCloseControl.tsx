import { X } from "lucide-react";

interface ScannerCloseControlProps {
  onClose: () => void;
}

export function ScannerCloseControl({
  onClose,
}: ScannerCloseControlProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label="Close scanner"
      className="absolute bottom-6 right-5 z-30 flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors active:bg-white/20"
      onClick={onClose}
    >
      <X aria-hidden="true" className="size-5" />
    </button>
  );
}
