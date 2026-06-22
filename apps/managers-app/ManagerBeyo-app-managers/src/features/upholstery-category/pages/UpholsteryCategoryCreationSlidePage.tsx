import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  ContentCard,
  FieldLabelRow,
  SwitchCheckbox,
  TextInput,
} from "@/components/primitives";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { ApiRequestError } from "@/lib/api-client";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import { useCreateUpholsteryCategory } from "../actions/use-create-upholstery-category";
import {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
} from "../surfaces";
import {
  CreateUpholsteryCategoryFormSchema,
  type CreateUpholsteryCategoryFormValues,
} from "../types";

function defaultValues(): CreateUpholsteryCategoryFormValues {
  return {
    name: "",
    image_url: null,
    favorite: false,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export function UpholsteryCategoryCreationSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const createUpholsteryCategory = useCreateUpholsteryCategory();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(true);

  useEffect(() => {
    header?.setTitle("New category");
    header?.setActions(null);
  }, [header]);

  const form = useForm<CreateUpholsteryCategoryFormValues>({
    resolver: zodResolver(CreateUpholsteryCategoryFormSchema),
    defaultValues: defaultValues(),
  });

  const imageUrl = useWatch({ control: form.control, name: "image_url" });

  useEffect(() => {
    setIsImagePreviewVisible(true);
  }, [imageUrl]);

  function handleSubmit(values: CreateUpholsteryCategoryFormValues): void {
    setSubmitError(null);

    createUpholsteryCategory.mutate(
      {
        name: values.name.trim(),
        image_url: normalizeOptionalText(values.image_url),
        favorite: values.favorite,
      },
      {
        onSuccess: () => {
          useSurfaceStore
            .getState()
            .close(UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID);
        },
        onError: (error) => {
          setSubmitError(
            error instanceof ApiRequestError
              ? error.message
              : "Could not create category. Please try again.",
          );
        },
      },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-none">
        <form
          className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+8rem)] pt-4"
          noValidate
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <ContentCard>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <FieldLabelRow
                    htmlFor="upholstery-category-name"
                    label="Name"
                  />
                  <TextInput
                    ref={field.ref}
                    id="upholstery-category-name"
                    invalid={Boolean(fieldState.error)}
                    value={field.value}
                    wrapperClassName="bg-card"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />
          </ContentCard>

          <ContentCard>
            <Controller
              control={form.control}
              name="image_url"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1.5">
                  <FieldLabelRow
                    htmlFor="upholstery-category-image-url"
                    label="Image URL"
                    optional
                  />
                  <TextInput
                    ref={field.ref}
                    id="upholstery-category-image-url"
                    invalid={Boolean(fieldState.error)}
                    value={field.value ?? ""}
                    wrapperClassName="bg-card"
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                  />
                  {fieldState.error ? (
                    <p className="text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />

            {imageUrl && isImagePreviewVisible ? (
              <img
                alt=""
                className="mt-1 h-44 w-full rounded-xl object-cover"
                src={imageUrl}
                onError={() => setIsImagePreviewVisible(false)}
              />
            ) : null}
          </ContentCard>

          <ContentCard>
            <div className="flex items-center justify-between gap-4">
              <FieldLabelRow label="Favorite" optional />
              <Controller
                control={form.control}
                name="favorite"
                render={({ field }) => (
                  <SwitchCheckbox
                    checked={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />
            </div>
          </ContentCard>

          {submitError ? (
            <p className="px-1 text-sm text-destructive">{submitError}</p>
          ) : null}
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={() => header?.requestClose()}
          >
            Close & Back
          </button>
          <button
            className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-50"
            disabled={createUpholsteryCategory.isPending}
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
