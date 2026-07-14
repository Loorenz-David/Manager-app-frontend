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

import { cn } from "@beyo/lib";

import { FloatingKeyboardBar } from "../floating-keyboard-bar";
import {
  AnchoredOptionList,
  OptionList,
  type SearchableSelectOption,
  type SearchableSelectResult,
} from "../option-list";
import { TextInput, type TextInputProps } from "./TextInput";

export type SearchableSelectInputProps<TValue extends string = string> = Omit<
  TextInputProps,
  | "value"
  | "onChange"
  | "onBlur"
  | "onFocus"
  | "onKeyDown"
  | "role"
  | "aria-expanded"
  | "aria-controls"
  | "aria-activedescendant"
  | "aria-autocomplete"
> & {
  options: readonly SearchableSelectOption<TValue>[];
  value: SearchableSelectResult<TValue> | null;
  onValueChange: (value: SearchableSelectResult<TValue> | null) => void;
  forceSelection?: boolean;
  emptyMessage?: string;
  maxVisibleOptions?: number;
};

type SearchableSelectControlsProps<TValue extends string> = {
  inputRef: RefObject<HTMLInputElement | null>;
  isFloating: boolean;
  panelProgress: MotionValue<number> | null;
  isInlineHidden: boolean;
  isPanelOpening: boolean;
  inputProps: Omit<
    SearchableSelectInputProps<TValue>,
    "options" | "value" | "onValueChange" | "forceSelection" | "emptyMessage" | "maxVisibleOptions"
  >;
  queryText: string;
  filteredOptions: readonly SearchableSelectOption<TValue>[];
  activeValue: TValue | null;
  selectedValue: TValue | null;
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
  onSelect: (option: SearchableSelectOption<TValue>, isFloating: boolean) => void;
  onActiveChange: (value: TValue | null) => void;
}

function resultDisplayValue<TValue extends string>(
  result: SearchableSelectResult<TValue> | null,
): string {
  if (result === null) {
    return "";
  }

  return result.type === "option" ? result.option.displayValue : result.text;
}

function areResultsEqual<TValue extends string>(
  first: SearchableSelectResult<TValue> | null,
  second: SearchableSelectResult<TValue> | null,
): boolean {
  if (first === null || second === null) {
    return first === second;
  }

  if (first.type !== second.type) {
    return false;
  }

  if (first.type === "text" && second.type === "text") {
    return first.text === second.text;
  }

  if (first.type === "option" && second.type === "option") {
    return (
      first.option.value === second.option.value &&
      first.option.displayValue === second.option.displayValue
    );
  }

  return false;
}

function SearchableSelectControls<TValue extends string>({
  inputRef,
  isFloating,
  panelProgress,
  isInlineHidden,
  isPanelOpening,
  inputProps,
  queryText,
  filteredOptions,
  activeValue,
  selectedValue,
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
}: SearchableSelectControlsProps<TValue>): React.JSX.Element {
  const onPanelDismissRef = useRef(onPanelDismiss);
  onPanelDismissRef.current = onPanelDismiss;

  useEffect(() => {
    if (!isFloating) {
      return;
    }

    return () => {
      onPanelDismissRef.current();
    };
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
      selectedValue={selectedValue}
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
      <TextInput
        {...inputProps}
        ref={inputRef}
        value={queryText}
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
      />
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
          selectedValue={selectedValue}
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

export function SearchableSelectInput<TValue extends string = string>({
  options,
  value,
  onValueChange,
  forceSelection = false,
  emptyMessage = "No options found",
  maxVisibleOptions,
  ...inputProps
}: SearchableSelectInputProps<TValue>): React.JSX.Element {
  const generatedId = useId();
  const listboxId = `${inputProps.id ?? generatedId}-listbox`;
  const [queryText, setQueryText] = useState(() => resultDisplayValue(value));
  const [activeValue, setActiveValue] = useState<TValue | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lastCommittedResultRef = useRef<SearchableSelectResult<TValue> | null>(
    value,
  );
  const lastNotifiedResultRef = useRef<SearchableSelectResult<TValue> | null>(
    value,
  );
  const pendingInternalResultRef = useRef<
    SearchableSelectResult<TValue> | null | undefined
  >(undefined);
  const inputRefsRef = useRef<Array<RefObject<HTMLInputElement | null>>>([]);
  const skipNextBlurCommitRef = useRef(false);

  useEffect(() => {
    const pendingResult = pendingInternalResultRef.current;
    pendingInternalResultRef.current = undefined;

    if (pendingResult !== undefined && areResultsEqual(pendingResult, value)) {
      return;
    }

    lastCommittedResultRef.current = value;
    lastNotifiedResultRef.current = value;
    setQueryText(resultDisplayValue(value));
    setActiveValue(null);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = queryText.toLowerCase();
    return options.filter((option) =>
      option.displayValue.toLowerCase().includes(normalizedQuery),
    );
  }, [options, queryText]);

  const selectedValue =
    value?.type === "option" ? value.option.value : null;
  const getOptionId = (optionValue: TValue): string =>
    `${listboxId}-option-${encodeURIComponent(optionValue)}`;

  function notify(
    result: SearchableSelectResult<TValue> | null,
    updateLastCommitted: boolean,
  ): void {
    if (updateLastCommitted) {
      lastCommittedResultRef.current = result;
    }

    lastNotifiedResultRef.current = result;
    pendingInternalResultRef.current = result;
    onValueChange(result);
  }

  function closeList(): void {
    setIsOpen(false);
    setActiveValue(null);
  }

  function commitText(text: string): void {
    if (text.length === 0) {
      notify(null, true);
    } else {
      notify({ type: "text", text }, true);
    }
    closeList();
  }

  function commitOption(
    option: SearchableSelectOption<TValue>,
    isFloating: boolean,
  ): void {
    const result: SearchableSelectResult<TValue> = {
      type: "option",
      option,
    };
    setQueryText(option.displayValue);
    notify(result, true);
    closeList();

    if (isFloating) {
      skipNextBlurCommitRef.current = true;
      inputRefsRef.current[1]?.current?.blur();
    }
  }

  function invalidateCommittedValue(nextText: string): void {
    if (
      nextText !== resultDisplayValue(lastCommittedResultRef.current) &&
      lastNotifiedResultRef.current !== null
    ) {
      notify(null, false);
    }
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextText = event.target.value;
    setQueryText(nextText);
    setIsOpen(true);
    setActiveValue(null);
    invalidateCommittedValue(nextText);
  }

  function isKnownInput(element: Element | null): boolean {
    return inputRefsRef.current.some((inputRef) => inputRef.current === element);
  }

  function revertToLastCommitted(reNotify: boolean): void {
    const lastCommittedResult = lastCommittedResultRef.current;
    setQueryText(resultDisplayValue(lastCommittedResult));
    closeList();

    if (
      reNotify ||
      !areResultsEqual(lastNotifiedResultRef.current, lastCommittedResult)
    ) {
      notify(lastCommittedResult, false);
    }
  }

  function handleBlur(currentText: string): void {
    queueMicrotask(() => {
      if (isKnownInput(document.activeElement)) {
        return;
      }

      if (skipNextBlurCommitRef.current) {
        skipNextBlurCommitRef.current = false;
        return;
      }

      const committedText = resultDisplayValue(lastCommittedResultRef.current);
      if (currentText === committedText) {
        closeList();
        return;
      }

      if (forceSelection) {
        revertToLastCommitted(true);
      } else {
        commitText(currentText);
      }
    });
  }

  function moveActive(direction: 1 | -1): void {
    const enabledOptions = filteredOptions.filter((option) => !option.disabled);
    if (enabledOptions.length === 0) {
      return;
    }

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
        const enabledOptions = filteredOptions.filter(
          (option) => !option.disabled,
        );
        const lastEnabled = enabledOptions.at(-1);
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
        } else if (!forceSelection) {
          commitText(queryText);
        }
        break;
      }
      case "Escape":
        event.preventDefault();
        if (queryText !== resultDisplayValue(lastCommittedResultRef.current)) {
          revertToLastCommitted(false);
        } else {
          closeList();
        }
        if (isFloating) {
          skipNextBlurCommitRef.current = true;
          inputRefsRef.current[1]?.current?.blur();
        }
        break;
      case "Tab":
        closeList();
        break;
      default:
        break;
    }
  }

  function handleFocus(): void {
    setIsOpen(true);
  }

  function handleInputBlur(event: FocusEvent<HTMLInputElement>): void {
    handleBlur(event.currentTarget.value);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    handleQueryChange(event);
  }

  function handleInputFocus(): void {
    handleFocus();
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    isFloating: boolean,
  ): void {
    handleKeyDown(event, isFloating);
  }

  function handlePanelDismiss(): void {
    handleBlur(queryText);
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
    if (isFloating) {
      inputRefsRef.current[1] = inputRef;
    } else {
      inputRefsRef.current[0] = inputRef;
    }

    return (
      <SearchableSelectControls
        inputRef={inputRef}
        isFloating={isFloating}
        panelProgress={panelProgress}
        isInlineHidden={isInlineHidden}
        isPanelOpening={isPanelOpening}
        inputProps={inputProps}
        queryText={queryText}
        filteredOptions={filteredOptions}
        activeValue={activeValue}
        selectedValue={selectedValue}
        isOpen={isOpen}
        listboxId={listboxId}
        getOptionId={getOptionId}
        emptyMessage={emptyMessage}
        maxVisibleOptions={maxVisibleOptions}
        onPanelDismiss={handlePanelDismiss}
        onQueryChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        onSelect={commitOption}
        onActiveChange={setActiveValue}
      />
    );
  }

  return <FloatingKeyboardBar variant="panel" renderControls={renderControls} />;
}
