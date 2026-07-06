import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ContentCard, FieldLabelRow } from "@beyo/ui";

import type { EmailMessageDetailsSheetSurfaceProps } from "../surface-ids";

function AddressList({
  addresses,
}: {
  addresses: string[];
}): React.JSX.Element {
  return <p className="mt-1 break-words text-sm text-foreground">{addresses.join(", ")}</p>;
}

export function EmailMessageDetailsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<EmailMessageDetailsSheetSurfaceProps>();

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  return (
    <div className="px-4 pb-4 pt-3">
      <ContentCard paddingClassName="p-0">
        <div className="flex flex-col gap-4 px-4 py-4">
          <div>
            <FieldLabelRow label="From" />
            <p className="mt-1 break-words text-sm text-foreground">
              {props.fromName ? `${props.fromName} <${props.fromAddress}>` : props.fromAddress}
            </p>
          </div>

          <div>
            <FieldLabelRow label="To" />
            <AddressList addresses={props.toAddresses ?? []} />
          </div>

          {(props.ccAddresses ?? []).length > 0 ? (
            <div>
              <FieldLabelRow label="Cc" />
              <AddressList addresses={props.ccAddresses ?? []} />
            </div>
          ) : null}

          {(props.bccAddresses ?? []).length > 0 ? (
            <div>
              <FieldLabelRow label="Bcc" />
              <AddressList addresses={props.bccAddresses ?? []} />
            </div>
          ) : null}

          <div>
            <FieldLabelRow label="Date" />
            <p className="mt-1 break-words text-sm text-foreground">
              {props.sentOrReceivedAtIso ?? "Unknown"}
            </p>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}
