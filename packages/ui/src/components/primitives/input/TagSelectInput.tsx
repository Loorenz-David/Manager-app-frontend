import {
  m,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { X } from "lucide-react";

import { cn } from "@beyo/lib";

import { FloatingKeyboardBar } from "../floating-keyboard-bar";
import {
  AnchoredOptionList,
  OptionList,
  type SearchableSelectOption,
  type SearchableSelectResult,
} from "../option-list";
import { DISABLED_BASE, FOCUS_WITHIN_RING } from "../shared";

export type TagSelectInputProps<TValue extends string = string> = {
  options: readonly SearchableSelectOption<TValue>[];
  value: readonly SearchableSelectResult<TValue>[];
  onValueChange: (value: SearchableSelectResult<TValue>[]) => void;
  forceSelection?: boolean;
  emptyMessage?: string;
  maxVisibleOptions?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
};

type TagSelectControlsProps<TValue extends string> = {
  inputRef: RefObject<HTMLInputElement | null>;
  isFloating: boolean;
  panelProgress: MotionValue<number> | null;
  isInlineHidden: boolean;
  isPanelOpening: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  dataTestId?: string;
  value: readonly SearchableSelectResult<TValue>[];
  queryText: string;
  filteredOptions: readonly SearchableSelectOption<TValue>[];
  activeValue: TValue | null;
  isOpen: boolean;
  listboxId: string;
  getOptionId: (value: TValue) => string;
  emptyMessage: string;
  maxVisibleOptions: number | undefined;
  onPanelDismiss: () => void;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    isFloating: boolean,
  ) => void;
  onSelect: (
    option: SearchableSelectOption<TValue>,
    isFloating: boolean,
  ) => void;
  onActiveChange: (value: TValue | null) => void;
  onRemove: (index: number) => void;
};

function resultLabel<TValue extends string>(
  result: SearchableSelectResult<TValue>,
): string {
  return result.type === "option" ? result.option.displayValue : result.text;
}

function areResultsEqual<TValue extends string>(
  first: readonly SearchableSelectResult<TValue>[],
  second: readonly SearchableSelectResult<TValue>[],
): boolean {
  if (first.length !== second.length) return false;

  return first.every((result, index) => {
    const other = second[index];
    if (!other || result.type !== other.type) return false;
    if (result.type === "text" && other.type === "text") {
      return result.text === other.text;
    }
    if (result.type === "option" && other.type === "option") {
      return (
        result.option.value === other.option.value &&
        result.option.displayValue === other.option.displayValue
      );
    }
    return false;
  });
}

function TagPill<TValue extends string>({
  result,
  index,
  dataTestId,
  onRemove,
  preventFocusSteal,
}: {
  result: SearchableSelectResult<TValue>;
  index: number;
  dataTestId?: string;
  onRemove: (index: number) => void;
  preventFocusSteal: (event: React.MouseEvent<HTMLElement>) => void;
}): React.JSX.Element {
  const label = resultLabel(result);
  return (
    <span className="inline-flex h-8 max-w-full items-center gap-1 rounded-full bg-light-container shadow-sm border border-light-border px-2.5 text-sm text-foreground">
      <span className="max-w-[min(16rem,calc(100vw-8rem))] truncate">
        {label}
      </span>
      <button
        type="button"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
        aria-label={`Remove ${label}`}
        data-testid={dataTestId ? `${dataTestId}-remove-${index}` : undefined}
        onMouseDown={preventFocusSteal}
        onClick={() => onRemove(index)}
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}

function TagSelectControls<TValue extends string>({
  inputRef,
  isFloating,
  panelProgress,
  isInlineHidden,
  isPanelOpening,
  id,
  placeholder,
  disabled,
  dataTestId,
  value,
  queryText,
  filteredOptions,
  activeValue,
  isOpen,
  listboxId,
  getOptionId,
  emptyMessage,
  maxVisibleOptions,
  onPanelDismiss,
  onQueryChange,
  onFocus,
  onBlur,
  onKeyDown,
  onSelect,
  onActiveChange,
  onRemove,
}: TagSelectControlsProps<TValue>): React.JSX.Element {
  const onPanelDismissRef = useRef(onPanelDismiss);
  onPanelDismissRef.current = onPanelDismiss;

  useEffect(() => {
    if (!isFloating) return;
    return () => onPanelDismissRef.current();
  }, [isFloating]);

  const fallbackProgress = useMotionValue(1);
  const listOpacity = useTransform(
    panelProgress ?? fallbackProgress,
    [0, 1],
    [0, 1],
  );

  const list = (
    <OptionList
      options={filteredOptions}
      activeValue={activeValue}
      selectedValue={null}
      onSelect={(option) => onSelect(option, isFloating)}
      onActiveChange={onActiveChange}
      emptyMessage={emptyMessage}
      listboxId={listboxId}
      getOptionId={getOptionId}
      className={isFloating ? "min-h-0 flex-1" : undefined}
    />
  );

  return (
    <div
      className={cn(
        "relative flex flex-col",
        isFloating && "h-full min-h-0 gap-2 p-4",
      )}
    >
      <div
        className={cn(
          "flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-transparent px-2 py-1.5 transition-colors duration-150",
          FOCUS_WITHIN_RING,
          DISABLED_BASE,
        )}
        data-testid={dataTestId}
      >
        {value.map((result, index) => (
          <TagPill
            key={`${result.type}-${result.type === "option" ? result.option.value : result.text}-${index}`}
            result={result}
            index={index}
            dataTestId={dataTestId}
            onRemove={onRemove}
            preventFocusSteal={(event) => event.preventDefault()}
          />
        ))}
        <input
          ref={inputRef}
          id={id}
          value={queryText}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={
            !isInlineHidden && !isPanelOpening && (isFloating || isOpen)
          }
          aria-controls={
            !isInlineHidden && !isPanelOpening && (isFloating || isOpen)
              ? listboxId
              : undefined
          }
          aria-activedescendant={
            isInlineHidden || activeValue === null
              ? undefined
              : getOptionId(activeValue)
          }
          onChange={onQueryChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={(event) => onKeyDown(event, isFloating)}
          className="h-10 min-w-[8rem] flex-1 bg-transparent px-1 text-base text-foreground placeholder:text-border outline-none disabled:cursor-not-allowed"
        />
      </div>
      {isFloating ? (
        <m.div
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          style={{ opacity: listOpacity }}
        >
          {list}
        </m.div>
      ) : !isInlineHidden && !isPanelOpening && isOpen ? (
        <AnchoredOptionList
          options={filteredOptions}
          activeValue={activeValue}
          selectedValue={null}
          onSelect={(option) => onSelect(option, false)}
          onActiveChange={onActiveChange}
          emptyMessage={emptyMessage}
          listboxId={listboxId}
          getOptionId={getOptionId}
          maxVisibleOptions={maxVisibleOptions}
        />
      ) : null}
    </div>
  );
}

export function TagSelectInput<TValue extends string = string>({
  options,
  value,
  onValueChange,
  forceSelection = false,
  emptyMessage = "No options found",
  maxVisibleOptions,
  placeholder,
  disabled,
  id,
  "data-testid": dataTestId,
}: TagSelectInputProps<TValue>): React.JSX.Element {
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;
  const [queryText, setQueryText] = useState("");
  const [activeValue, setActiveValue] = useState<TValue | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pendingInternalValueRef = useRef<
    readonly SearchableSelectResult<TValue>[] | null
  >(null);
  const inputRefsRef = useRef<Array<RefObject<HTMLInputElement | null>>>([]);

  useEffect(() => {
    const pendingValue = pendingInternalValueRef.current;
    pendingInternalValueRef.current = null;
    if (pendingValue && areResultsEqual(pendingValue, value)) return;
    setQueryText("");
    setActiveValue(null);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = queryText.toLowerCase();
    const optionValues = new Set(
      value
        .filter((result) => result.type === "option")
        .map((result) => result.option.value),
    );
    const textLabels = new Set(
      value
        .filter((result) => result.type === "text")
        .map((result) => result.text.toLowerCase()),
    );

    return options.filter(
      (option) =>
        option.displayValue.toLowerCase().includes(normalizedQuery) &&
        !optionValues.has(option.value) &&
        !textLabels.has(option.displayValue.toLowerCase()),
    );
  }, [options, queryText, value]);

  const getOptionId = (optionValue: TValue): string =>
    `${listboxId}-option-${encodeURIComponent(optionValue)}`;

  function notify(nextValue: SearchableSelectResult<TValue>[]): void {
    pendingInternalValueRef.current = nextValue;
    onValueChange(nextValue);
  }

  function closeList(): void {
    setIsOpen(false);
    setActiveValue(null);
  }

  function commitOption(
    option: SearchableSelectOption<TValue>,
    _isFloating: boolean,
  ): void {
    const normalizedDisplayValue = option.displayValue.toLowerCase();
    const isDuplicate = value.some(
      (result) =>
        (result.type === "option" && result.option.value === option.value) ||
        (result.type === "text" &&
          result.text.toLowerCase() === normalizedDisplayValue),
    );
    if (isDuplicate) return;

    notify([...value, { type: "option", option }]);
    setQueryText("");
    setActiveValue(null);
    setIsOpen(true);
  }

  function commitFreeformTag(text: string): void {
    if (forceSelection) return;
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const normalizedText = trimmedText.toLowerCase();
    const isDuplicate = value.some(
      (result) =>
        (result.type === "text" &&
          result.text.toLowerCase() === normalizedText) ||
        (result.type === "option" &&
          result.option.displayValue.toLowerCase() === normalizedText),
    );
    if (isDuplicate) {
      setQueryText("");
      return;
    }

    notify([...value, { type: "text", text: trimmedText }]);
    setQueryText("");
    setActiveValue(null);
    setIsOpen(true);
  }

  function removeTagAt(index: number): void {
    notify(value.filter((_result, resultIndex) => resultIndex !== index));
  }

  function isKnownInput(element: Element | null): boolean {
    return inputRefsRef.current.some(
      (inputRef) => inputRef.current === element,
    );
  }

  function handleBlur(currentText: string): void {
    queueMicrotask(() => {
      if (isKnownInput(document.activeElement)) return;
      if (!forceSelection) commitFreeformTag(currentText);
      setQueryText("");
      closeList();
    });
  }

  function moveActive(direction: 1 | -1): void {
    const enabledOptions = filteredOptions.filter((option) => !option.disabled);
    if (enabledOptions.length === 0) return;

    const currentIndex = enabledOptions.findIndex(
      (option) => option.value === activeValue,
    );
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : enabledOptions.length - 1
        : (currentIndex + direction + enabledOptions.length) %
          enabledOptions.length;
    setActiveValue(enabledOptions[nextIndex]?.value ?? null);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    isFloating: boolean,
  ): void {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setIsOpen(true);
        moveActive(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        setIsOpen(true);
        moveActive(-1);
        break;
      case "Home": {
        const firstEnabled = filteredOptions.find((option) => !option.disabled);
        if (firstEnabled) {
          event.preventDefault();
          setActiveValue(firstEnabled.value);
        }
        break;
      }
      case "End": {
        const lastEnabled = filteredOptions
          .filter((option) => !option.disabled)
          .at(-1);
        if (lastEnabled) {
          event.preventDefault();
          setActiveValue(lastEnabled.value);
        }
        break;
      }
      case "Enter": {
        const activeOption = filteredOptions.find(
          (option) => option.value === activeValue && !option.disabled,
        );
        event.preventDefault();
        if (activeOption) {
          commitOption(activeOption, isFloating);
        } else {
          commitFreeformTag(queryText);
        }
        break;
      }
      case "Backspace":
        if (queryText === "" && value.length > 0) {
          event.preventDefault();
          removeTagAt(value.length - 1);
        }
        break;
      case "Escape":
        event.preventDefault();
        setQueryText("");
        closeList();
        if (isFloating) inputRefsRef.current[1]?.current?.blur();
        break;
      case "Tab":
        closeList();
        break;
      default:
        break;
    }
  }

  function renderControls({
    inputRef,
    isFloating,
    panelProgress,
    isInlineHidden,
    isPanelOpening,
  }: {
    inputRef: RefObject<HTMLInputElement | null>;
    isFloating: boolean;
    panelProgress: MotionValue<number> | null;
    isInlineHidden: boolean;
    isPanelOpening: boolean;
  }): React.JSX.Element {
    inputRefsRef.current[isFloating ? 1 : 0] = inputRef;
    return (
      <TagSelectControls
        inputRef={inputRef}
        isFloating={isFloating}
        panelProgress={panelProgress}
        isInlineHidden={isInlineHidden}
        isPanelOpening={isPanelOpening}
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        dataTestId={dataTestId}
        value={value}
        queryText={queryText}
        filteredOptions={filteredOptions}
        activeValue={activeValue}
        isOpen={isOpen}
        listboxId={listboxId}
        getOptionId={getOptionId}
        emptyMessage={emptyMessage}
        maxVisibleOptions={maxVisibleOptions}
        onPanelDismiss={() => handleBlur(queryText)}
        onQueryChange={(event) => {
          setQueryText(event.target.value);
          setIsOpen(true);
          setActiveValue(null);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => handleBlur(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onSelect={commitOption}
        onActiveChange={setActiveValue}
        onRemove={removeTagAt}
      />
    );
  }

  return (
    <FloatingKeyboardBar variant="panel" renderControls={renderControls} />
  );
}
