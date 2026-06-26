export const ITEM_POSITION_SHEET_SURFACE_ID = "item-position-sheet";

export type ItemPositionSheetSurfaceProps = {
  itemId: string;
  initialPosition: string | null;
  onSave: (position: string | null) => void;
};

export type ItemPositionSurfaceOpeners = {
  openItemPositionSheet?: (props: ItemPositionSheetSurfaceProps) => void;
};
