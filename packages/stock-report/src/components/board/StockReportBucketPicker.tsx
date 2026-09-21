import { BoxSlidePicker } from "@beyo/ui";
import type { BoxSlidePickerOptionType } from "@beyo/ui";

import {
  STOCK_NEED_BUCKET_LABEL,
  type StockNeedBucket,
} from "../../stock-report.types";

export type StockReportBucketPickerProps = {
  /**
   * Which buckets this role is offered. Workers do not triage, so they are
   * given High · Medium · Low and never see Unset (intention §5).
   */
  buckets: readonly StockNeedBucket[];
  value: StockNeedBucket;
  onChange: (bucket: StockNeedBucket) => void;
};

export function StockReportBucketPicker({
  buckets,
  value,
  onChange,
}: StockReportBucketPickerProps): React.JSX.Element {
  const options: BoxSlidePickerOptionType<StockNeedBucket>[] = buckets.map(
    (bucket) => ({
      value: bucket,
      label: STOCK_NEED_BUCKET_LABEL[bucket],
      testId: `stock-report-bucket-${bucket}`,
      // Unset is the resting "no priority chosen" state, not a chosen value, so
      // it must not wear the active fill even while it is the active bucket
      // (design state D3).
      quiet: bucket === "unset",
    }),
  );

  return (
    <BoxSlidePicker
      ariaLabel="Priority bucket"
      dataTestId="stock-report-bucket-picker"
      onValueChange={onChange}
      options={options}
      value={value}
    />
  );
}
