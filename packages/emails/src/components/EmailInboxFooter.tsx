type EmailInboxFooterProps = {
  onClose: () => void;
};

export function EmailInboxFooter({
  onClose,
}: EmailInboxFooterProps): React.JSX.Element {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }}
    >
      <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
        <div className="px-4 pb-4 pt-3">
          <button
            className="w-full rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm"
            type="button"
            onClick={onClose}
          >
            Close &amp; Back
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
