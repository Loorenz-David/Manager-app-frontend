import type { CompositionElement } from "./schemas";

function compareNumber(left: number, right: number): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareClientIds(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left < right ? -1 : 1;
}

export function compareCompositionElements(
  left: CompositionElement,
  right: CompositionElement,
): number {
  return (
    compareNumber(left.layer_index, right.layer_index) ||
    compareNumber(left.sequence_order, right.sequence_order) ||
    compareNumber(left.start_ms, right.start_ms) ||
    compareClientIds(left.client_id, right.client_id)
  );
}

export function sortCompositionElements(
  elements: readonly CompositionElement[],
): CompositionElement[] {
  return elements
    .map((element, originalIndex) => ({ element, originalIndex }))
    .sort(
      (left, right) =>
        compareCompositionElements(left.element, right.element) ||
        compareNumber(left.originalIndex, right.originalIndex),
    )
    .map(({ element }) => element);
}
