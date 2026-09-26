import { BoxSlidePicker } from "@beyo/ui";
import type { BoxSlidePickerOptionType } from "@beyo/ui";

import {
  STOCK_NEED_BUCKET_LABEL,
  type StockReportBoardBucket,
} from "../../stock-report.types";

export type StockReportBucketPickerProps = {
  /**
   * Which buckets this role is offered. Workers do not triage, so they are
   * given High · Medium · Low and never see Unset (intention §5).
   */
  buckets: readonly StockReportBoardBucket[];
  value: StockReportBoardBucket;
  onChange: (bucket: StockReportBoardBucket) => void;
};

export function StockReportBucketPicker({
  buckets,
  value,
  onChange,
}: StockReportBucketPickerProps): React.JSX.Element {
  // Every bucket wears the active fill, Unset included (owner, 2026-09-22).
  // Design state D3 had Unset render as though unselected, on the reasoning
  // that it is a resting state rather than a chosen one; in use that read as
  // "nothing is selected" rather than "Unset is selected", which is wrong —
  // it is a bucket like any other, and the list below it is its contents.
  const options: BoxSlidePickerOptionType<StockReportBoardBucket>[] = buckets.map(
    (bucket) => ({
      value: bucket,
      label: STOCK_NEED_BUCKET_LABEL[bucket],
      testId: `stock-report-bucket-${bucket}`,
    }),
  );

  return (
    <BoxSlidePicker
      ariaLabel="Priority bucket"
      size="sm"
      dataTestId="stock-report-bucket-picker"
      onValueChange={onChange}
      options={options}
      value={value}
    />
  );
}
