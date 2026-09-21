import { AlertTriangle, Ban } from "lucide-react";

export type StockMatchPropertyFailure = {
  /** What did not match, in the user's words. */
  label: string;
  /** Why it did not match, in the user's words. */
  explanation: string;
};

type StockMatchWarningSheetCommonProps = {
  /**
   * The identifier resolved to an item that is already registered, so the
   * backend judged that stored item rather than what the form sent
   * (`values_source: "stored"` — intention §8.5). Saying so keeps a user who
   * changed the category or quantity from being misled.
   */
  checkedAgainstStoredItem?: boolean;
  /** Clears the identifier and everything the lookup filled in (§12A A7). */
  onChangeItem: () => void;
};

export type StockMatchWarningSheetContentProps =
  | (StockMatchWarningSheetCommonProps & {
      kind: "blocked";
      /** Ready-made message for the refusal reason. No codes are mapped here. */
      reasonText: string;
    })
  | (StockMatchWarningSheetCommonProps & {
      kind: "warning";
      failures: readonly StockMatchPropertyFailure[];
      /** The user's explicit override, armed for the first create call. */
      onContinue: () => void;
    });

const BUTTON_BASE =
  "flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold";

/**
 * What the compatibility check has to say about the item being added.
 *
 * Two views, one component: a **block**, whose only way out is changing the
 * item, and a **soft warning**, which lists what does not match and asks for an
 * explicit *Continue*.
 *
 * It renders no close affordance on purpose — the sheet is opened locked and
 * the user must choose (§12A A6); its buttons are the visible way out that
 * `33_vaul_drawer.md` requires. All copy arrives ready-made: refusal reasons
 * and property failures are mapped by the logic session, which owns the closed
 * vocabularies.
 */
export function StockMatchWarningSheetContent(
  props: StockMatchWarningSheetContentProps,
): React.JSX.Element {
  const storedNote = props.checkedAgainstStoredItem ? (
    <p
      className="text-xs font-medium text-muted-foreground"
      data-testid="stock-match-stored-note"
    >
      Checked against the item already registered.
    </p>
  ) : null;

  if (props.kind === "blocked") {
    return (
      <div
        className="flex flex-col gap-4 px-4 pb-2"
        data-testid="stock-match-warning-blocked"
      >
        <div className="flex items-start gap-3">
          <Ban
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-destructive"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              This item cannot be added
            </p>
            <p className="text-sm text-muted-foreground">{props.reasonText}</p>
            {storedNote}
          </div>
        </div>

        <button
          className={`${BUTTON_BASE} bg-primary text-card`}
          data-testid="stock-match-change-item"
          type="button"
          onClick={props.onChangeItem}
        >
          Change item
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 px-4 pb-2"
      data-testid="stock-match-warning-warning"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-warning"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm font-semibold text-foreground">
            This item does not fully match
          </p>
          {storedNote}
        </div>
      </div>

      <ul
        className="flex flex-col gap-2"
        data-testid="stock-match-warning-failures"
      >
        {props.failures.map((failure) => (
          <li
            key={failure.label}
            className="rounded-xl border border-border bg-soft-container px-3.5 py-3"
          >
            <p className="text-sm font-semibold text-foreground">
              {failure.label}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {failure.explanation}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <button
          className={`${BUTTON_BASE} border border-border bg-card text-foreground`}
          data-testid="stock-match-change-item"
          type="button"
          onClick={props.onChangeItem}
        >
          Change item
        </button>
        <button
          className={`${BUTTON_BASE} bg-primary text-card`}
          data-testid="stock-match-continue"
          type="button"
          onClick={props.onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
