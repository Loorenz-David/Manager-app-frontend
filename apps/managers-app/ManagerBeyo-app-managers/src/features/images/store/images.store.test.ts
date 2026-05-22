import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildImageViewModel } from '../test-utils';
import { buildEntityKey, useImagesStore } from './images.store';

describe('images.store', () => {
  const entityKey = buildEntityKey('item', 'item_1');

  beforeEach(() => {
    useImagesStore.setState({ optimisticImages: {} });
  });

  afterEach(() => {
    useImagesStore.setState({ optimisticImages: {} });
  });

  it('inserts optimistic images per entity key', () => {
    useImagesStore.getState().insertOptimisticImage(entityKey, buildImageViewModel());

    expect(useImagesStore.getState().optimisticImages[entityKey]).toHaveLength(1);
  });

  it('patches a matching optimistic image', () => {
    useImagesStore.getState().insertOptimisticImage(entityKey, buildImageViewModel());

    useImagesStore.getState().patchOptimisticImage(entityKey, 'img_1', {
      uploadState: 'failed',
      uploadError: 'Upload failed.',
    });

    expect(useImagesStore.getState().optimisticImages[entityKey]?.[0]).toEqual(
      expect.objectContaining({
        uploadState: 'failed',
        uploadError: 'Upload failed.',
      }),
    );
  });

  it('removes a matching optimistic image', () => {
    useImagesStore.getState().insertOptimisticImage(entityKey, buildImageViewModel());

    useImagesStore.getState().removeOptimisticImage(entityKey, 'img_1');

    expect(useImagesStore.getState().optimisticImages[entityKey]).toEqual([]);
  });
});
