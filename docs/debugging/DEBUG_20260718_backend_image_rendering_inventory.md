# Backend Image Rendering Inventory — 2026-07-18

**Purpose:** Locate every place in the frontend that renders an image whose `src`
comes from the backend (a URL string, not a static/imported asset). Use this as
the map for building a **single centralized image component** that handles
loading, load-failure fallback, and placeholder consistently.

> All paths are relative to the `frontend/` workspace root. Line numbers are the
> `<img>`/`src=` anchor at the time of writing and may drift.

> **Root cause found + solution planned (2026-07-18):** the flicker is caused by the backend
> presigning a fresh S3 GET URL on every serialization (`X-Amz-Date`/`X-Amz-Signature` churn →
> browser cache miss → re-download → blank frame). See
> `docs/architecture/under_construction/implementation/PLAN_backend_image_stable_rendering_20260718.md`
> (frontend `BackendImage` primitive in `@beyo/ui`) and
> `docs/handoff/to_backend/HANDOFF_TO_BACKEND_presigned_image_url_caching_20260718.md`.

> **RESOLVED (2026-07-18):**
> - **Backend** shipped deterministic *quantised signing* (`stable_presign.py` — floors
>   `X-Amz-Date` to a per-key 6h bucket; byte-stable across workers, no cache). Flicker fixed at
>   the source for the common case.
> - **Frontend** shipped a centralized `BackendImage` primitive
>   (`packages/ui/src/components/primitives/backend-image/`) = one `<img>` with
>   placeholder-on-missing/error (`fallback` prop) + swap-on-decode (no blank frame at the 6h
>   rollover or on genuine replacement). The frontend URL-stabilization cache was **dropped** —
>   redundant now that the backend owns stability.
> - **Every backend-URL site in §3 was migrated** onto `BackendImage` (typecheck clean; 50 UI
>   tests + 6 new `BackendImage` tests pass). The EH/PH gaps below are all now closed via the
>   primitive.
> - **Deliberately NOT migrated:** `ZoomableImage` + `ImageEditorPage` (transform/canvas-coupled
>   full editors, backend already stabilizes their URLs); the two upholstery *creation-slide*
>   URL-preview fields (user-entered URLs with bespoke hide-on-error UX); static-asset icons and
>   the scanner camera `dataUrl` (§4); `Avatar` / `UserPill` (already had correct `onError`
>   fallback — left as-is).

---

## 1. TL;DR — the actual problem

Backend URLs are rendered with **raw `<img>` tags scattered across 3 apps and
~15 packages**. There is **no shared image component**. Only **5 files** attach
an `onError` handler; everything else shows the browser's broken-image glyph when
a URL 404s / fails to load.

Three inconsistent patterns exist today:

| Pattern | Handles missing URL? | Handles load failure? | Where |
|---|---|---|---|
| **A — Primitive w/ fallback** | ✅ | ✅ (`onError` → `ImagePlaceholder`) | `Avatar`, `UserPill` only |
| **B — Conditional + placeholder** | ✅ (`src ? <img> : <ImagePlaceholder>`) | ❌ (broken glyph on 404) | most feature cards |
| **C — Raw `<img>`, no fallback** | ❌ | ❌ (just `bg-muted` behind) | grids, previews, editor |

**Centralization target:** replace all Pattern B/C raw `<img>` with one component
that internally does what `Avatar` already does (fail state + placeholder), plus
optional loading shimmer.

---

## 2. Shared building blocks (the centralization foundation)

These already exist and should inform / become the centralized solution.

| Component | File | Notes |
|---|---|---|
| `Avatar` | [Avatar.tsx:36-77](packages/ui/src/components/primitives/avatar/Avatar.tsx#L36-L77) | **Gold standard.** `didImageFail` state, `onError`, resets on `imageSrc` change, falls back to initials then `ImagePlaceholder`. |
| `UserPill` | [UserPill.tsx:32-70](packages/ui/src/components/primitives/user-pill/UserPill.tsx#L32-L70) | Same fail pattern as Avatar; placeholder fallback. |
| `ImagePlaceholder` | [ImagePlaceholder.tsx](packages/ui/src/components/primitives/image-placeholder/ImagePlaceholder.tsx) | Shared empty-state glyph. **Note:** a duplicate exists in managers-app → [ImagePlaceholder.tsx](apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/image-placeholder/ImagePlaceholder.tsx) — consolidate. |
| `ZoomableImage` | [ZoomableImage.tsx:273](packages/images/src/components/ZoomableImage.tsx#L273) | Fullscreen pan/zoom `<img>`. Raw `src`, **no error handling.** |
| `packages/images` | [packages/images/src/](packages/images/src/) | Owns the images domain (upload/annotate/grids). Natural home for a centralized `<BackendImage>`. |

---

## 3. Backend-URL `<img>` usages (the inventory)

Grouped by domain. **EH** = has `onError` handling. **PH** = has missing-URL placeholder.

### 3a. Images package (core rendering surfaces)

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [ImagePreviewTile.tsx](packages/images/src/components/ImagePreviewTile.tsx#L93) | 93 | `displayUrl` | ❌ | ❌ |
| [ImageThumbnailGrid.tsx](packages/images/src/components/ImageThumbnailGrid.tsx#L54) | 54 | `image.imageUrl` | ❌ | ❌ |
| [ZoomableImage.tsx](packages/images/src/components/ZoomableImage.tsx#L273) | 273 | `src` (prop) | ❌ | ❌ |
| [ImageEditorPage.tsx](packages/images/src/pages/ImageEditorPage.tsx#L705) | 705 | `displayUrl` | ❌ | ❌ |
| [ImageMetadataActionsSheetPage.tsx](packages/images/src/pages/ImageMetadataActionsSheetPage.tsx#L118) | 118 | `displayUrl` | ❌ | ❌ |

### 3b. Cases

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [CaseCard.tsx](packages/cases/src/components/CaseCard.tsx#L115) | 115 | `profilePicture` | ❌ | ❌ |
| [CaseConversationContextBanner.tsx](packages/cases/src/components/CaseConversationContextBanner.tsx#L62) | 62 | `caseTypeImageUrl` | ❌ | ❌ |
| [CaseMessageImageGrid.tsx](packages/cases/src/components/CaseMessageImageGrid.tsx#L242) | 242 | `renderableImage.imageUrl` | ❌ | ❌ |
| [CaseMessageRow.tsx](packages/cases/src/components/CaseMessageRow.tsx#L141) | 141 | `createdBy.profile_picture` | ❌ | ❌ |
| [CaseTypePickerTriggerField.tsx](packages/cases/src/components/CaseTypePickerTriggerField.tsx#L43) | 43 | `selectedCaseType.imageUrl` | ❌ | ❌ |
| [ParticipantPickerSlideContent.tsx](packages/cases/src/components/ParticipantPickerSlideContent.tsx#L203) | 203 | `user.profile_picture` | ❌ | ❌ |
| [CaseComposerAttachmentStrip.tsx](packages/cases/src/components/composer/CaseComposerAttachmentStrip.tsx#L51) | 51 | `displayUrl` (blob or backend) | ❌ | ❌ |
| [CaseTaskInfoCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/components/cases/CaseTaskInfoCard.tsx#L116) | 116 | `imageUrl` | ❌ | ❌ |
| [CaseTaskInfoCard.tsx](apps/selleres-app/ManagerBeyo-app-sellers/src/components/cases/CaseTaskInfoCard.tsx#L116) | 116 | `imageUrl` (sellers dup) | ❌ | ❌ |

### 3c. Tasks / task-working-sections / task steps

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [TaskListCard.tsx](packages/tasks/src/components/TaskListCard.tsx#L150) | 150 | `imageUrl` | ❌ | ❌ |
| [UpholsteryEntryCard.tsx](packages/tasks/src/components/UpholsteryEntryCard.tsx#L49) | 49 | `entry.image_url` | ❌ | ❌ |
| [PinTaskStepStatesSheetPage.tsx](packages/tasks/src/pages/PinTaskStepStatesSheetPage.tsx#L41) | 41 | `props.imageUrl` | ❌ | ❌ |
| [TaskWorkingSectionsStepList.tsx](packages/task-working-sections/src/components/TaskWorkingSectionsStepList.tsx#L67) | 67 | `entry.section.image` | ❌ | ❌ |
| [TaskWorkingSectionsStepList.tsx](packages/task-working-sections/src/components/TaskWorkingSectionsStepList.tsx#L108) | 108 | `entry.assignedMember.profile_picture` | ❌ | ❌ |
| [TaskStepCard.tsx](apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/TaskStepCard.tsx#L52) | 52 | `src` (via `StepThumbnail`) | ❌ | ✅ |
| [BatchSelectableTaskStepCard.tsx](apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/BatchSelectableTaskStepCard.tsx#L73) | 73 | `firstImageUrl` | ❌ | ? |
| [LastActiveStepCard.tsx](apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/LastActiveStepCard.tsx#L68) | 68, 221, 371 | `src` / `firstImageUrl` | ❌ | ? |
| [ReassignmentAcknowledgmentPanel.tsx](apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/ReassignmentAcknowledgmentPanel.tsx#L74) | 74 | `vm.firstImageUrl` | ❌ | ? |
| [WorkingSectionStepsView.tsx](apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/WorkingSectionStepsView.tsx#L170) | 170 | `section.imageUrl` | ❌ | ? |
| [BatchDetailSlidePage.tsx](apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/BatchDetailSlidePage.tsx#L214) | 214 | `sectionImageUrl` | ❌ | ? |
| [PinTaskStepStatesSheetPage.tsx](apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/PinTaskStepStatesSheetPage.tsx#L41) | 41 | `props.imageUrl` | ❌ | ? |
| [StepDependencyWarningSheetPage.tsx](apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/StepDependencyWarningSheetPage.tsx#L104) | 104 | `dependency.imageUrl` | ❌ | ? |

### 3d. Working sections

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [WorkingSectionPickerField.tsx](packages/working-sections/src/components/WorkingSectionPickerField.tsx#L54) | 54 | `section.image` | ❌ | ❌ |
| [WorkingSectionWorkerPickerSheetPage.tsx](packages/working-sections/src/pages/WorkingSectionWorkerPickerSheetPage.tsx#L41) | 41 | `member.profile_picture` | ❌ | ❌ |
| [WorkingSectionCard.tsx](apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/components/WorkingSectionCard.tsx#L36) | 36 | `section.imageUrl` | ❌ | ? |
| [WorkingSectionPickerField.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/components/fields/WorkingSectionPickerField.tsx#L59) | 59 | `section.image` | ❌ | ? |
| [WorkingSectionWorkerPickerSheetPage.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/pages/WorkingSectionWorkerPickerSheetPage.tsx#L41) | 41 | `member.profile_picture` | ❌ | ? |

### 3e. Item categories

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [ItemCategoryDetailLabel.tsx](packages/item-categories/src/components/ItemCategoryDetailLabel.tsx#L33) | 33 | `category.imageUrl` | ❌ | ✅ |
| [ItemCategorySelectionField.tsx](packages/item-categories/src/components/ItemCategorySelectionField.tsx#L151) | 151 | `selectedCategory.image_url` | ❌ | ? |
| [WoodItemCategorySelectionField.tsx](packages/task-creation/src/components/WoodItemCategorySelectionField.tsx#L79) | 79 | `selectedCategory.image_url` | ❌ | ? |

### 3f. Upholstery (package + managers features)

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [ItemUpholsteryField.tsx](packages/upholstery/src/components/ItemUpholsteryField.tsx#L119) | 119 | `thumbnailUrl` | ❌ | ? |
| [UpholsteryCard.tsx](packages/upholstery/src/components/UpholsteryCard.tsx#L87) | 87 | `thumbnailUrl` | ❌ | ? |
| [UpholsteryDnDCard.tsx](packages/upholstery/src/components/UpholsteryDnDCard.tsx#L52) | 52 | `thumbnailUrl` | ❌ | ? |
| [UpholsteryCategoryCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-category/components/UpholsteryCategoryCard.tsx#L39) | 39 | `category.image_url` | ❌ | ? |
| [UpholsteryCategoryCreationSlidePage.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-category/pages/UpholsteryCategoryCreationSlidePage.tsx#L156) | 156 | `imageUrl` | ✅ | ? |
| [InventoryDetailHeader.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/components/InventoryDetailHeader.tsx#L21) | 21 | `detail.imageUrl` | ❌ | ? |
| [InventoryListCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/components/InventoryListCard.tsx#L47) | 47 | `thumbnailUrl` | ❌ | ? |
| [InventoryListHeader.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/components/InventoryListHeader.tsx#L103) | 103 | `selectedCategory.image_url` | ❌ | ? |
| [InventorySearchCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/components/InventorySearchCard.tsx#L47) | 47 | `record.image_url` | ❌ | ? |
| [StoredAmountSheetPage.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/pages/StoredAmountSheetPage.tsx#L68) | 68 | `prefill.imageUrl` | ✅ | ? |
| [UpholsteryInventoryCreationSlidePage.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx#L427) | 427 | `imageUrl` | ✅ | ? |
| [OrderCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/components/OrderCard.tsx#L29) | 29 | `card.imageUrl` | ❌ | ? |
| [OrderingItemCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/components/OrderingItemCard.tsx#L71) | 71 | `imageUrl` | ❌ | ? |
| [ShortageCard.tsx](apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-ordering/components/ShortageCard.tsx#L29) | 29 | `card.imageUrl` | ❌ | ? |

### 3g. Emails / Stats / Box picker

| File | Line | src | EH | PH |
|---|---|---|:--:|:--:|
| [EmailInboxThreadCard.tsx](packages/emails/src/components/EmailInboxThreadCard.tsx#L103) | 103 | `thread.imageUrl` | ❌ | ? |
| [WorkerStatsGranularityCard.tsx](packages/stats/src/components/WorkerStatsGranularityCard.tsx#L50) | 50 | `card.imageUrl` | ❌ | ? |
| [BoxPickerOption.tsx](packages/ui/src/components/primitives/box-picker/BoxPickerOption.tsx#L85) | 85 | `option.image` | ❌ | ? |
| [BoxPickerOption.tsx](apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-picker/BoxPickerOption.tsx#L82) | 82 | `option.image` (managers dup) | ❌ | ? |

---

## 4. NOT backend URLs (excluded, for completeness)

These render `<img>` but the `src` is a static import or a local `blob:`/`data:`
URL, so they are **out of scope** for the backend-image solution:

| File | Line | Why excluded |
|---|---|---|
| [GmailIcon.tsx](packages/assets/src/GmailIcon.tsx#L15) | 15 | `import iconUrl from "../GmailIcon.svg"` — static asset |
| [PostHandlingIcon.tsx](packages/assets/src/PostHandlingIcon.tsx#L15) | 15 | static SVG import |
| [HandshakeIcon.tsx](packages/assets/src/HandshakeIcon.tsx#L15) | 15 | static SVG import |
| [FrozenFrameCanvas.tsx](packages/scanner/src/ui/FrozenFrameCanvas.tsx#L18) | 18 | `dataUrl` — captured camera frame, local |

> `Avatar` / `UserPill` accept a backend URL prop but already handle failure, so
> they belong in §2 (foundation), not the migration list.

---

## 5. Suggested centralization shape (for the solution you build)

A single `<BackendImage>` (candidate home: `packages/images` or `packages/ui`)
that all of §3 migrates onto:

```tsx
<BackendImage
  src={imageUrl}                 // backend URL, may be null/undefined
  alt=""
  className="size-full object-cover"
  fallback={<ImagePlaceholder />} // shown when src missing OR onError fires
  // internal: didImageFail state, reset on src change (see Avatar.tsx:44-49)
  // internal: loading="lazy", decoding="async" defaults
  // optional: loading shimmer while unloaded
/>
```

Migration order suggestion: primitives first (`BoxPickerOption`), then
high-traffic grids (`ImageThumbnailGrid`, `CaseMessageImageGrid`,
`TaskListCard`), then the long tail of cards.

---

## 6. How this list was generated

```bash
# from frontend/ root
grep -rln "<img" --include="*.tsx" apps packages | grep -v node_modules
# then per-file: grep -n "src=" excluding svg imports
grep -rln "onError" ...   # to mark which have failure handling
```

Re-run to refresh if the tree changes.
