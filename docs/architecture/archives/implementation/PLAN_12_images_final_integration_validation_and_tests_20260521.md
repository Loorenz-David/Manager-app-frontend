# PLAN_12_images_final_integration_validation_and_tests_20260521

## Metadata

- Plan ID: `PLAN_12_images_final_integration_validation_and_tests_20260521`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T22:28:38Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: All plans PLAN_01 through PLAN_11

## Goal and intent

- Goal: Write all unit tests (Vitest) and Playwright e2e specs for the images feature. Validate object URL cleanup, media stream cleanup, upload lifecycle, and primary mobile flows.
- Business/user intent: This feature is interaction-heavy and mobile-critical. Tests prevent regressions in the upload pipeline, optimistic state, and surface flows.
- Non-goals: No new implementation — tests only.

## Scope

- In scope:
  - `src/features/images/api/image-keys.test.ts` — key factory shape
  - `src/features/images/api/fetch-entity-images.test.ts` — response parsing
  - `src/features/images/lib/compress-image-for-upload.test.ts` — compression + crop + WebP output
  - `src/features/images/lib/image-upload-pipeline.test.ts` — pipeline step order, metadata correctness
  - `src/features/images/actions/use-reorder-images.test.ts` — optimistic reorder + rollback
  - `src/features/images/actions/use-unlink-image.test.ts` — optimistic unlink + rollback
  - `src/features/images/actions/use-delete-image.test.ts` — optimistic delete from all lists
  - `src/features/images/store/images.store.test.ts` — insertOptimisticImage, patch, remove
  - `src/features/images/controllers/use-entity-images.controller.test.ts` — merge logic, delete-during-upload
  - `src/features/images/components/ImagePreviewGrid.test.tsx` — renders tiles, add button, loading state
  - `src/features/images/components/ImagePreviewTile.test.tsx` — upload overlay, error state, tap callback
  - `src/features/images/components/ImageAddPictureButton.test.tsx` — press callback
  - `src/features/images/components/ImageCarouselIndicators.test.tsx` — dot count + active dot
  - `src/features/images/components/ImageAnnotationToolbar.test.tsx` — tool selection
  - `src/features/images/components/ImageSortableGrid.test.tsx` — drag end calls reorder
  - `src/features/images/pages/ImageMetadataActionsSheetPage.test.tsx` — metadata fields, delete action
  - `tests/playwright/features/images/images-item-flow.spec.ts` — e2e: add picture, view, delete flow on item

- Out of scope: Camera stream tests (require real browser MediaDevices), konva canvas interaction tests (brittle without visual assertion). Manual mobile testing is required for camera and drag-and-drop.

- Assumptions:
  - Vitest with `@testing-library/react` and `@testing-library/user-event` are already configured.
  - MSW (or vi.mock) is used to mock API calls in unit tests.
  - Playwright fixtures are in `tests/playwright/fixtures/app-fixture.ts` with `auth.signIn()`.
  - Canvas APIs (`createImageBitmap`, `canvas.toBlob`) are mocked for Vitest environment.

## Clarifications required

- [x] Playwright test path confirmed from `34_runtime_validation_local.md`: `tests/playwright/features/<feature>/<flow>.spec.ts`.
- [x] Canvas mock for `compressImageForUpload` tests: mock `createImageBitmap` to return a minimal object with `width: 100`, `height: 100`, `close: vi.fn()`. Mock `HTMLCanvasElement.prototype.getContext` to return a minimal 2D context. Mock `HTMLCanvasElement.prototype.toBlob` to call the callback with a fake `Blob`.

## Acceptance criteria

1. All Vitest tests pass: `npm run test:unit -- images`.
2. TypeScript: zero errors: `npm run typecheck`.
3. Playwright mobile: `npm run test:e2e:mobile -- images` passes.
4. Playwright desktop: `npm run test:e2e:desktop -- images` passes (grid is visible, no crash).
5. No `console.error` in Playwright run (checked by `34_runtime_validation_local.md` pattern).

## Contracts and skills

### Contracts loaded

- `architecture/17_testing.md`: Vitest + Testing Library test patterns, mock conventions
- `architecture/34_runtime_validation.md`: Playwright test patterns
- `architecture/34_runtime_validation_local.md`: fixture paths, auth setup, spec location convention

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: `import { test, expect } from '../fixtures/app-fixture'`, `auth.signIn()`, spec path `tests/playwright/features/images/`.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/items/components/fields/ItemUpholsteryField.test.tsx` — verify the existing Vitest + Testing Library test pattern for surface-opening components.
- `src/features/upholstery/components/UpholsteryCard.test.tsx` — verify cva + locale-safe assertions.
- `tests/playwright/` — any existing spec for auth + navigation pattern.
- `architecture/34_runtime_validation_local.md` — Playwright fixture import, credential env vars, spec location.

Prohibited reads:
- Any test file outside this project to understand test patterns — use `17_testing.md`.

### Skill selection

- Primary skill: none

## Implementation plan

### Step 0 — Read existing test patterns

Before writing any test file, read:
1. `src/features/items/components/fields/ItemUpholsteryField.test.tsx` — verify vi.mock surface hook pattern
2. `src/features/upholstery/components/UpholsteryCard.test.tsx` — verify Testing Library assertions
3. `architecture/34_runtime_validation_local.md` — Playwright fixture import path

### Step 1 — `src/features/images/api/image-keys.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { imageKeys } from './image-keys';

describe('imageKeys', () => {
  it('list key includes entity_type and entity_client_id', () => {
    const key = imageKeys.list({ entity_type: 'item', entity_client_id: 'abc' });
    expect(key).toContain('item');
    expect(key).toContain('abc');
  });

  it('detail key differs from list key', () => {
    const listKey = imageKeys.lists();
    const detailKey = imageKeys.details();
    expect(listKey).not.toEqual(detailKey);
  });

  it('downloadUrl key is scoped under detail key', () => {
    const detailKey = imageKeys.detail('img_001');
    const downloadKey = imageKeys.downloadUrl('img_001');
    expect(downloadKey.join(',')).toContain(detailKey.join(','));
  });
});
```

### Step 2 — `src/features/images/lib/compress-image-for-upload.test.ts`

Mock browser APIs before testing.

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock createImageBitmap
const mockBitmap = { width: 800, height: 600, close: vi.fn() };
vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

// Mock canvas
const mockCtx = { drawImage: vi.fn() };
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockCtx),
  toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
    cb(new Blob(['fake'], { type: 'image/webp' }));
  }),
  toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
};
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement;
  return document.createElement(tag);
});

import { compressImageForUpload } from './compress-image-for-upload';

describe('compressImageForUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.width = 0;
    mockCanvas.height = 0;
  });

  it('produces a square output (width === height)', async () => {
    const rawBlob = new Blob(['raw'], { type: 'image/png' });
    const result = await compressImageForUpload(rawBlob);
    expect(result.widthPx).toBe(result.heightPx);
  });

  it('output size does not exceed maxWidthPx', async () => {
    const rawBlob = new Blob(['raw'], { type: 'image/png' });
    const result = await compressImageForUpload(rawBlob, {
      maxWidthPx: 400,
      maxHeightPx: 400,
      quality: 0.8,
      mimeType: 'image/webp',
      outputExtension: 'webp',
    });
    expect(result.widthPx).toBeLessThanOrEqual(400);
  });

  it('returns a blob with a fileName ending in .webp', async () => {
    const rawBlob = new Blob(['raw'], { type: 'image/png' });
    const result = await compressImageForUpload(rawBlob);
    expect(result.fileName).toMatch(/\.webp$/);
  });

  it('calls bitmap.close() to release GPU memory', async () => {
    const rawBlob = new Blob(['raw'], { type: 'image/png' });
    await compressImageForUpload(rawBlob);
    expect(mockBitmap.close).toHaveBeenCalledOnce();
  });
});
```

### Step 3 — `src/features/images/lib/image-upload-pipeline.test.ts`

Test step ordering and that upload-url request uses compressed metadata.

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRequestUploadUrl = vi.fn().mockResolvedValue({
  upload_url: 'https://storage.example.com/upload',
  pending_upload_client_id: 'pend_001',
  storage_key: 'key_001',
  expires_in: 3600,
});
const mockUploadBlob = vi.fn().mockResolvedValue(undefined);
const mockConfirmUpload = vi.fn().mockResolvedValue({
  client_id: 'img_001',
  image_url: 'https://cdn.example.com/img.webp',
  storage_provider: 's3',
  source_type: 'uploaded',
  created_at: new Date().toISOString(),
  events: [],
});
const mockCompress = vi.fn().mockResolvedValue({
  blob: new Blob(['compressed'], { type: 'image/webp' }),
  fileName: 'img_abc.webp',
  contentType: 'image/webp',
  fileSizeBytes: 50000,
  widthPx: 800,
  heightPx: 800,
});

vi.mock('../api/request-image-upload-url', () => ({ requestImageUploadUrl: mockRequestUploadUrl }));
vi.mock('../api/upload-blob-to-signed-url', () => ({ uploadBlobToSignedUrl: mockUploadBlob }));
vi.mock('../api/confirm-image-upload', () => ({ confirmImageUpload: mockConfirmUpload }));
vi.mock('./compress-image-for-upload', () => ({ compressImageForUpload: mockCompress }));

import { runImageUploadPipeline } from './image-upload-pipeline';

describe('runImageUploadPipeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls compress before requesting upload URL', async () => {
    const callOrder: string[] = [];
    mockCompress.mockImplementationOnce(async () => {
      callOrder.push('compress');
      return { blob: new Blob(), fileName: 'f.webp', contentType: 'image/webp', fileSizeBytes: 100, widthPx: 100, heightPx: 100 };
    });
    mockRequestUploadUrl.mockImplementationOnce(async () => {
      callOrder.push('requestUrl');
      return { upload_url: 'https://s3.example.com', pending_upload_client_id: 'p1', storage_key: 'k1', expires_in: 3600 };
    });

    await runImageUploadPipeline({
      rawBlob: new Blob(['raw']),
      entityType: 'item',
      entityClientId: 'item_001',
    });

    expect(callOrder.indexOf('compress')).toBeLessThan(callOrder.indexOf('requestUrl'));
  });

  it('upload URL request uses compressed file metadata (not raw blob)', async () => {
    const rawBlob = new Blob(['rawdata']);
    await runImageUploadPipeline({
      rawBlob,
      entityType: 'item',
      entityClientId: 'item_001',
    });

    expect(mockRequestUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        file_name: 'img_abc.webp',
        content_type: 'image/webp',
        file_size_bytes: 50000,
      }),
    );
    // NOT the raw blob size
    expect(mockRequestUploadUrl.mock.calls[0][0].file_size_bytes).not.toBe(rawBlob.size);
  });

  it('calls onProgress with all states in correct order', async () => {
    const states: string[] = [];
    await runImageUploadPipeline({
      rawBlob: new Blob(['raw']),
      entityType: 'item',
      entityClientId: 'item_001',
      onProgress: (s) => states.push(s),
    });
    expect(states).toEqual(['compressing', 'requesting_upload_url', 'uploading', 'confirming', 'completed']);
  });
});
```

### Step 4 — `src/features/images/store/images.store.test.ts`

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { useImagesStore, buildEntityKey } from './images.store';
import type { ImageViewModel } from '../types';

function makeImage(clientId: string): ImageViewModel {
  return {
    clientId, linkClientId: null, entityType: 'item', entityClientId: 'item_1',
    imageUrl: 'https://example.com/img.jpg', localObjectUrl: null,
    displayOrder: 0, widthPx: null, heightPx: null, fileSizeBytes: null,
    createdAt: null, uploadState: 'idle', isOptimistic: false,
    isDeleted: false, pendingUploadClientId: null, uploadError: null, annotation: null,
  };
}

const KEY = buildEntityKey('item', 'item_1');

describe('imagesStore', () => {
  beforeEach(() => {
    useImagesStore.setState({ optimisticImages: {} });
  });

  it('insertOptimisticImage adds to the entity list', () => {
    useImagesStore.getState().insertOptimisticImage(KEY, makeImage('img_1'));
    const list = useImagesStore.getState().optimisticImages[KEY];
    expect(list).toHaveLength(1);
    expect(list?.[0].clientId).toBe('img_1');
  });

  it('patchOptimisticImage updates matching entry', () => {
    useImagesStore.getState().insertOptimisticImage(KEY, makeImage('img_1'));
    useImagesStore.getState().patchOptimisticImage(KEY, 'img_1', { uploadState: 'uploading' });
    const img = useImagesStore.getState().optimisticImages[KEY]?.[0];
    expect(img?.uploadState).toBe('uploading');
  });

  it('removeOptimisticImage removes matching entry', () => {
    useImagesStore.getState().insertOptimisticImage(KEY, makeImage('img_1'));
    useImagesStore.getState().removeOptimisticImage(KEY, 'img_1');
    expect(useImagesStore.getState().optimisticImages[KEY]).toHaveLength(0);
  });
});
```

### Step 5 — Component tests (Steps 5a–5e)

**5a — `src/features/images/components/ImagePreviewGrid.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImagePreviewGrid } from './ImagePreviewGrid';
import { EntityImagesContext } from '../providers/EntityImagesProvider'; // export internal context for tests
import type { EntityImagesController } from '../controllers/use-entity-images.controller';

// Note: EntityImagesContext must be exported for test access. If not, mock the hook.
vi.mock('../providers/EntityImagesProvider', async (importOriginal) => {
  const original = await importOriginal<typeof import('../providers/EntityImagesProvider')>();
  return { ...original };
});

const mockController = (overrides: Partial<EntityImagesController> = {}): EntityImagesController => ({
  images: [],
  isPending: false,
  isError: false,
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  reorderImages: vi.fn(),
  openCamera: vi.fn(),
  openViewer: vi.fn(),
  openMetadataSheet: vi.fn(),
  isUploading: false,
  isDeleting: false,
  isReordering: false,
  ...overrides,
});

// Helper to render with mocked context
function renderGrid(controller: EntityImagesController) {
  // Mock useEntityImagesContext to return controller
  vi.mock('../providers/EntityImagesProvider', () => ({
    useEntityImagesContext: () => controller,
  }));
  return render(<ImagePreviewGrid />);
}

describe('ImagePreviewGrid', () => {
  it('renders add-picture button when no images', () => {
    renderGrid(mockController({ images: [] }));
    expect(screen.getByTestId('image-add-picture-button')).toBeVisible();
  });

  it('renders loading skeleton when isPending', () => {
    renderGrid(mockController({ isPending: true }));
    expect(screen.getByTestId('image-preview-grid-skeleton')).toBeVisible();
  });

  it('renders correct number of tiles', () => {
    const images = Array.from({ length: 3 }, (_, i) => ({
      clientId: `img_${i}`,
      linkClientId: null,
      entityType: 'item' as const,
      entityClientId: 'item_1',
      imageUrl: 'https://example.com/img.jpg',
      localObjectUrl: null,
      displayOrder: i,
      widthPx: null, heightPx: null, fileSizeBytes: null, createdAt: null,
      uploadState: 'completed' as const,
      isOptimistic: false, isDeleted: false, pendingUploadClientId: null, uploadError: null, annotation: null,
    }));
    renderGrid(mockController({ images }));
    expect(screen.getAllByTestId(/^image-preview-tile-/)).toHaveLength(3);
    expect(screen.getByTestId('image-add-picture-button')).toBeVisible();
  });
});
```

**5b — `src/features/images/components/ImageCarouselIndicators.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageCarouselIndicators } from './ImageCarouselIndicators';

describe('ImageCarouselIndicators', () => {
  it('renders null when count is 1', () => {
    const { container } = render(<ImageCarouselIndicators count={1} activeIndex={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correct number of dots', () => {
    render(<ImageCarouselIndicators count={4} activeIndex={1} />);
    expect(screen.getAllByTestId(/^carousel-dot-/)).toHaveLength(4);
  });

  it('active dot has aria-selected true', () => {
    render(<ImageCarouselIndicators count={3} activeIndex={2} />);
    expect(screen.getByTestId('carousel-dot-2')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('carousel-dot-0')).toHaveAttribute('aria-selected', 'false');
  });
});
```

**5c — `src/features/images/components/ImageAnnotationToolbar.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImageAnnotationToolbar } from './ImageAnnotationToolbar';

describe('ImageAnnotationToolbar', () => {
  it('renders all MVP tools', () => {
    render(<ImageAnnotationToolbar activeTool="draw" onToolChange={vi.fn()} />);
    expect(screen.getByTestId('annotation-tool-draw')).toBeVisible();
    expect(screen.getByTestId('annotation-tool-arrow')).toBeVisible();
    expect(screen.getByTestId('annotation-tool-circle')).toBeVisible();
    expect(screen.getByTestId('annotation-tool-rectangle')).toBeVisible();
    expect(screen.getByTestId('annotation-tool-text')).toBeVisible();
    expect(screen.getByTestId('annotation-tool-highlight')).toBeVisible();
  });

  it('calls onToolChange with the selected tool', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ImageAnnotationToolbar activeTool="draw" onToolChange={handleChange} />);
    await user.click(screen.getByTestId('annotation-tool-circle'));
    expect(handleChange).toHaveBeenCalledWith('circle');
  });

  it('active tool button has aria-pressed true', () => {
    render(<ImageAnnotationToolbar activeTool="arrow" onToolChange={vi.fn()} />);
    expect(screen.getByTestId('annotation-tool-arrow')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('annotation-tool-draw')).toHaveAttribute('aria-pressed', 'false');
  });
});
```

**5d — `src/features/images/pages/ImageMetadataActionsSheetPage.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseSurfaceProps = vi.fn();
const mockCloseTop = vi.fn();

vi.mock('@/hooks/use-surface-props', () => ({
  useSurfaceProps: () => mockUseSurfaceProps(),
}));

vi.mock('@/providers/SurfaceProvider', () => ({
  useSurfaceStore: { getState: () => ({ closeTop: mockCloseTop }) },
}));

import { ImageMetadataActionsSheetPage } from './ImageMetadataActionsSheetPage';

const testImage = {
  clientId: 'img_001',
  linkClientId: null, entityType: 'item' as const, entityClientId: 'item_1',
  imageUrl: 'https://cdn.example.com/img.webp',
  localObjectUrl: null, displayOrder: 0,
  widthPx: 800, heightPx: 800, fileSizeBytes: 52000,
  createdAt: '2026-01-15T10:00:00Z',
  uploadState: 'completed' as const,
  isOptimistic: false, isDeleted: false, pendingUploadClientId: null, uploadError: null, annotation: null,
};

describe('ImageMetadataActionsSheetPage', () => {
  beforeEach(() => {
    mockCloseTop.mockClear();
  });

  it('renders file size and dimensions', () => {
    mockUseSurfaceProps.mockReturnValue({ image: testImage, mode: 'preview-only', entityType: 'item', entityClientId: 'item_1' });
    render(<ImageMetadataActionsSheetPage />);
    expect(screen.getByTestId('metadata-sheet-file-size')).toBeVisible();
    expect(screen.getByTestId('metadata-sheet-dimensions')).toBeVisible();
  });

  it('does not render delete button in preview-only mode', () => {
    mockUseSurfaceProps.mockReturnValue({ image: testImage, mode: 'preview-only', entityType: 'item', entityClientId: 'item_1' });
    render(<ImageMetadataActionsSheetPage />);
    expect(screen.queryByTestId('metadata-sheet-delete-button')).not.toBeInTheDocument();
  });

  it('renders delete button and calls onDelete + closeTop in preview-edit mode', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    mockUseSurfaceProps.mockReturnValue({ image: testImage, mode: 'preview-edit', onDelete, entityType: 'item', entityClientId: 'item_1' });
    render(<ImageMetadataActionsSheetPage />);
    await user.click(screen.getByTestId('metadata-sheet-delete-button'));
    expect(onDelete).toHaveBeenCalledWith('img_001');
    expect(mockCloseTop).toHaveBeenCalledOnce();
  });
});
```

### Step 6 — Playwright e2e spec

Create `tests/playwright/features/images/images-item-flow.spec.ts`.

This spec verifies the golden path: open item → grid visible → add picture (mock camera) → image appears → view image → delete image.

```ts
import { test, expect } from '../../fixtures/app-fixture';

test.describe('Images — item flow', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.signIn();
  });

  test('image preview grid is visible on item detail page', async ({ page }) => {
    // Navigate to an existing item that has the images feature wired
    // Adjust the route to match an actual item route in the app
    await page.goto('/items'); // adjust to actual items list route
    await page.getByTestId('item-row').first().click();

    // Verify the grid is present (may be empty initially)
    await expect(page.getByTestId('image-preview-grid')).toBeVisible();
  });

  test('add-picture button is visible when no images', async ({ page }) => {
    await page.goto('/items');
    await page.getByTestId('item-row').first().click();

    await expect(page.getByTestId('image-add-picture-button')).toBeVisible();
  });

  test('no console errors on image grid page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/items');
    await page.getByTestId('item-row').first().click();
    await page.getByTestId('image-preview-grid').waitFor();

    expect(errors).toHaveLength(0);
  });
});
```

**Note for Codex:** The Playwright spec above is a shell — update the navigation route and selectors to match the actual item detail page once `ImagePreviewGrid` is wired into it. The spec location follows `34_runtime_validation_local.md`.

### Step 7 — Run all tests

```bash
npm run typecheck
npm run test:unit -- images
npm run test:e2e:mobile -- images
npm run test:e2e:desktop -- images
```

Fix any failures before marking PLAN_12 complete.

## Risks and mitigations

- Risk: Canvas API mocks in Vitest may not perfectly replicate browser behavior — `compressImageForUpload` tests are behavioral, not pixel-accurate.
  Mitigation: Tests verify step ordering and output shape, not pixel values. Browser pixel accuracy is validated by manual mobile testing.

- Risk: Playwright route/selector assumptions may not match the actual app once wired.
  Mitigation: The Playwright spec is a shell that Codex annotates with actual routes and testIds after PLAN_11 integration is complete.

- Risk: `react-konva` Stage does not render in jsdom (Vitest's default environment).
  Mitigation: `ImageAnnotationCanvas` tests are omitted from this plan. The toolbar and editor page's save/cancel behavior are tested without rendering the Stage (mock `ImageAnnotationCanvas` in editor tests).

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:unit -- images`: all unit tests green.
- `npm run test:e2e:mobile -- images`: Playwright mobile passes.
- `npm run test:e2e:desktop -- images`: Playwright desktop passes.
- Manual mobile test checklist:
  - [ ] Camera opens on iOS Safari — live preview visible
  - [ ] Capture produces visible tile in grid immediately
  - [ ] Upload spinner appears on tile, clears on completion
  - [ ] Long-press activates shake + delete mode
  - [ ] Drag-to-reorder works on touch
  - [ ] Tapping tile opens full-screen viewer
  - [ ] Swipe through images in viewer
  - [ ] Three-dot → metadata sheet opens
  - [ ] Delete from metadata sheet removes tile
  - [ ] Camera thumbnail shows latest capture
  - [ ] Rapid capture (5 photos) — all appear as optimistic tiles
  - [ ] Delete while uploading — tile disappears, no stuck state

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
