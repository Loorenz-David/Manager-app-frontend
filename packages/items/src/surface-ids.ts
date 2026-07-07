export const ITEM_POSITION_SHEET_SURFACE_ID = "item-position-sheet";

export type ItemPositionSheetSurfaceProps = {
  itemId: string;
  initialPosition: string | null;
  initialZone: string | null;
  openField?: "zone" | "position";
  onSave: (values: {
    item_position: string | null;
    item_zone?: string | null;
  }) => void;
};

export type ItemPositionSurfaceOpeners = {
  openItemPositionSheet?: (props: ItemPositionSheetSurfaceProps) => void;
};
