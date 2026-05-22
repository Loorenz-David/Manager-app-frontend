import { describe, expect, it } from 'vitest';

import { imageKeys } from './image-keys';

describe('imageKeys', () => {
  it('scopes list keys by entity type and client id', () => {
    expect(
      imageKeys.list({
        entity_type: 'item',
        entity_client_id: 'item_123',
      }),
    ).toEqual(['images', 'list', { entity_type: 'item', entity_client_id: 'item_123' }]);
  });

  it('keeps detail keys separate from list keys', () => {
    expect(imageKeys.lists()).not.toEqual(imageKeys.details());
  });

  it('nests download url keys under the image detail key', () => {
    expect(imageKeys.downloadUrl('img_123')).toEqual(['images', 'detail', 'img_123', 'download-url']);
  });
});
