import type { Page, Route } from '@playwright/test';

import { test, expect } from '../../fixtures/app-fixture';

const hasCredentials = Boolean(
  process.env.PLAYWRIGHT_TEST_EMAIL && process.env.PLAYWRIGHT_TEST_PASSWORD,
);

type MockEntityImage = {
  link_client_id: string;
  entity_type: 'item';
  entity_client_id: string;
  display_order: number;
  image: {
    client_id: string;
    image_url: string;
    storage_provider: 's3';
    source_type: 'uploaded';
    source_reference: null;
    width_px: number;
    height_px: number;
    file_size_bytes: number;
    created_at: string;
    last_event: null;
    events: [];
    image_annotation: null;
  };
};

async function installCameraMocks(page: Page) {
  await page.addInitScript(() => {
    const track = { stop() {} };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          active: true,
          getTracks: () => [track],
        }),
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: async () => undefined,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      get: () => 1200,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      get: () => 1200,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        drawImage() {},
      }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: (callback: BlobCallback) => callback(new Blob(['captured'], { type: 'image/png' })),
    });
    URL.createObjectURL = () => 'blob:playwright-image';
    URL.revokeObjectURL = () => {};
    navigator.vibrate = () => true;
  });
}

async function openTestingForms(page: Page) {
  await page.getByTestId('tab-tasks').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByTestId('open-testing-forms-button').click();
  await expect(page.getByTestId('testing-forms-form')).toBeVisible();
}

async function mockImagesRoutes(page: Page) {
  let images: MockEntityImage[] = [];

  await page.route('**/api/v1/images?**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('entity_client_id') !== 'testing-item-images') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          images,
        },
      }),
    });
  });

  await page.route('**/api/v1/images/upload-url', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          upload_url: 'https://storage.example.com/upload',
          pending_upload_client_id: 'pending_upload_1',
          storage_key: 'images/testing-item-images/upload.webp',
          expires_in: 3600,
        },
      }),
    });
  });

  await page.route('https://storage.example.com/upload', async (route: Route) => {
    await route.fulfill({
      status: 200,
      body: '',
    });
  });

  await page.route('**/api/v1/images/confirm-upload', async (route: Route) => {
    const createdAt = '2026-05-22T10:00:00.000Z';
    images = [
      {
        link_client_id: 'link_img_uploaded',
        entity_type: 'item',
        entity_client_id: 'testing-item-images',
        display_order: 0,
        image: {
          client_id: 'img_uploaded',
          image_url: 'https://cdn.example.com/img-uploaded.webp',
          storage_provider: 's3',
          source_type: 'uploaded',
          source_reference: null,
          width_px: 1200,
          height_px: 1200,
          file_size_bytes: 2048,
          created_at: createdAt,
          last_event: null,
          events: [],
          image_annotation: null,
        },
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          image: images[0]!.image,
        },
      }),
    });
  });

  await page.route('**/api/v1/images/links', async (route: Route) => {
    images = [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          unlinked: true,
        },
      }),
    });
  });
}

test.describe('Images item flow', () => {
  test.beforeEach(async ({ page, auth }) => {
    test.skip(!hasCredentials, 'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in .env to run');
    await installCameraMocks(page);
    await mockImagesRoutes(page);
    await auth.signIn();
    await openTestingForms(page);
  });

  test('adds, views, and deletes an image through the mounted images surfaces', async ({ page }) => {
    await page.getByTestId('open-images-testing-harness-button').click();
    await expect(page.getByTestId('testing-images-harness')).toBeVisible();
    await expect(page.getByTestId('testing-images-grid')).toBeVisible();

    await page.getByTestId('image-add-picture-button').click();
    await expect(page.getByTestId('image-camera-page')).toBeVisible();
    await expect(page.getByTestId('camera-capture-button')).toBeEnabled();

    await page.getByTestId('camera-capture-button').click();
    await page.getByTestId('camera-close-button').click();
    await expect(page.getByTestId('image-camera-page')).not.toBeVisible();

    await expect(page.getByTestId('image-preview-tile-button-img_uploaded')).toBeVisible();
    await page.getByTestId('image-preview-tile-button-img_uploaded').click();

    await expect(page.getByTestId('image-fullscreen-viewer')).toBeVisible();
    await expect(page.getByTestId('viewer-slide-img_uploaded')).toBeVisible();

    await page.getByTestId('viewer-metadata-button').click();
    await expect(page.getByTestId('image-metadata-sheet')).toBeVisible();
    await page.getByTestId('metadata-sheet-delete-button').click();

    await expect(page.getByTestId('image-fullscreen-viewer')).not.toBeVisible();
    await expect(page.getByTestId('image-metadata-sheet')).not.toBeVisible();
    await expect(page.getByTestId('image-add-picture-button')).toBeVisible();
  });
});
