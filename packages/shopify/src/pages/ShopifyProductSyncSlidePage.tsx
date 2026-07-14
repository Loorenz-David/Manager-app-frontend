import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ShopifyProductSyncForm } from "../components/ShopifyProductSyncForm";
import { ShopifyProductSyncFormProvider } from "../providers/ShopifyProductSyncFormProvider";
import type { ShopifyProductSyncSlideSurfaceProps } from "../surface-ids";
import { useEffect } from "react";
export function ShopifyProductSyncSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<ShopifyProductSyncSlideSurfaceProps>();
  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  function closeAndContinue(callback?: () => void): void {
    header?.requestClose();
    callback?.();
  }

  return (
    <ShopifyProductSyncFormProvider
      itemClientId={props.itemClientId ?? ""}
      itemArticleNumber={props.itemArticleNumber ?? null}
      itemSku={props.itemSku ?? null}
      itemCategoryId={props.itemCategoryId ?? null}
      productCategory={props.productCategory ?? null}
      defaultTitle={props.defaultTitle ?? null}
      taskClientId={props.taskClientId ?? ""}
      mode={props.mode ?? "submit"}
      surfaceOpeners={props.surfaceOpeners ?? {}}
      onCompleted={() => closeAndContinue(props.onCompleted)}
      onSkipped={() => closeAndContinue(props.onSkipped)}
      onKept={() => closeAndContinue(props.onKept)}
    >
      <ShopifyProductSyncForm />
    </ShopifyProductSyncFormProvider>
  );
}
